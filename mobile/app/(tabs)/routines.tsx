import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "../../constants/theme";
import type {
  Mission,
  Routine,
  RoutineApplyAs,
  RoutineItem,
  RoutineScheduleType,
} from "../../lib/types";
import {
  applyRoutine,
  createRoutine,
  createRoutineItem,
  deleteRoutine,
  deleteRoutineItem,
  fetchMissions,
  fetchRoutineItems,
  fetchRoutines,
  updateRoutine,
} from "../../lib/api";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";
import EntityDetailModal, { ChildItem } from "../../components/EntityDetailModal";
import { usePersistedLocalOrder } from "../../lib/localSortOrder";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const SCHEDULE_LABELS: Record<RoutineScheduleType, string> = {
  manual: "Manual",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const SCHEDULE_COLORS: Record<RoutineScheduleType, string> = {
  manual: Colors.muted,
  weekly: Colors.accent,
  monthly: Colors.warning,
  quarterly: Colors.success,
  yearly: Colors.danger,
};

const APPLY_AS_LABELS: Record<RoutineApplyAs, string> = {
  quest: "Quest",
  task: "Tasks",
};

// ── Routine card ─────────────────────────────────────────────────────────────

interface CardProps {
  routine: Routine;
  missionName: string | undefined;
  stepCount: number;
  onPress: () => void;
  onApply: () => void;
  onAddStep: () => void;
  onDrag?: () => void;
}

function RoutineCard({
  routine,
  missionName,
  stepCount,
  onPress,
  onApply,
  onAddStep,
  onDrag,
}: CardProps) {
  const scheduleColor = SCHEDULE_COLORS[routine.schedule_type];
  const isAI = routine.ai_prompt.trim().length > 0;

  return (
    <View
      style={[
        styles.card,
        !routine.enabled && styles.cardDimmed,
      ]}
    >
      {onDrag ? (
        <Pressable
          onLongPress={onDrag}
          delayLongPress={180}
          hitSlop={10}
          style={({ pressed }) => [
            styles.dragHandle,
            pressed && styles.dragHandlePressed,
          ]}
        >
          <Ionicons
            name="reorder-three"
            size={22}
            color={Colors.textTertiary}
          />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardMain,
          onDrag ? styles.cardMainAfterHandle : styles.cardMainPaddedLeft,
          pressed && styles.cardPressed,
        ]}
      >
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {routine.title}
        </Text>

        <View style={styles.cardMeta}>
          <View
            style={[styles.scheduleBadge, { borderColor: scheduleColor }]}
          >
            <Text style={[styles.scheduleBadgeText, { color: scheduleColor }]}>
              {SCHEDULE_LABELS[routine.schedule_type]}
            </Text>
          </View>
          <Text style={styles.stepCount}>{APPLY_AS_LABELS[routine.apply_as]}</Text>

          {routine.schedule_anchor ? (
            <Text style={styles.anchorText} numberOfLines={1}>
              {routine.schedule_anchor}
            </Text>
          ) : null}

          {isAI ? (
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color={Colors.textInverse} />
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          ) : (
            <Text style={styles.stepCount}>
              {stepCount} step{stepCount !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {missionName ? (
          <Text style={styles.missionLine} numberOfLines={1}>
            → {missionName}
          </Text>
        ) : (
          <Text style={[styles.missionLine, styles.noMission]}>
            No mission set
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        {routine.enabled && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onApply();
            }}
            hitSlop={10}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
          >
            <Ionicons
              name="play-circle-outline"
              size={28}
              color={Colors.accent}
            />
          </Pressable>
        )}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onAddStep();
          }}
          hitSlop={10}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnPressed,
          ]}
        >
          <Ionicons
            name="add-circle-outline"
            size={28}
            color={Colors.textTertiary}
          />
        </Pressable>
      </View>
      </Pressable>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function RoutinesScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [itemsByRoutine, setItemsByRoutine] = useState<
    Record<string, RoutineItem[]>
  >({});
  const [refreshing, setRefreshing] = useState(false);

  const [addRoutineVisible, setAddRoutineVisible] = useState(false);
  const [addStepRoutineId, setAddStepRoutineId] = useState<string | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, m] = await Promise.all([fetchRoutines(), fetchMissions()]);
      setRoutines(r);
      setMissions(m.filter((x) => x.status === "active"));

      const pairs = await Promise.all(
        r.map(async (rt) => [rt.id, await fetchRoutineItems(rt.id)] as const)
      );
      const map: Record<string, RoutineItem[]> = {};
      for (const [id, items] of pairs) map[id] = items;
      setItemsByRoutine(map);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const missionOptions = useMemo(
    () => missions.map((m) => ({ label: m.title, value: m.id })),
    [missions]
  );

  const missionTitle = useCallback(
    (id: string | null) =>
      id ? missions.find((m) => m.id === id)?.title : undefined,
    [missions]
  );

  // ── Apply: creates a quest (+ tasks if template-based) ──────────────────
  const applyNow = async (routine: Routine) => {
    if (!routine.target_mission_id) {
      Alert.alert(
        "No mission set",
        "Open the routine and choose a target mission before applying."
      );
      return;
    }
    try {
      await applyRoutine(routine.id, today());
      const isAI = routine.apply_as === "quest" && routine.ai_prompt.trim().length > 0;
      const stepCount = itemsByRoutine[routine.id]?.length ?? 0;
      Alert.alert(
        routine.apply_as === "task" ? "Tasks created" : "Quest created",
        routine.apply_as === "task"
          ? `Created ${stepCount} mission task${stepCount !== 1 ? "s" : ""}.`
          : isAI
          ? `Quest created. OpenClaw will generate the tasks using the AI prompt when it next runs.`
          : `Quest created with ${stepCount} task${stepCount !== 1 ? "s" : ""}.`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  // ── Fields ───────────────────────────────────────────────────────────────
  const routineFields: FieldDef[] = [
    {
      key: "title",
      label: "Name",
      placeholder: "Title",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      placeholder: "Optional",
    },
    {
      key: "apply_as",
      label: "Creates",
      placeholder: "",
      type: "picker",
      options: [
        { label: "Quest (with sub-tasks)", value: "quest" },
        { label: "Simple recurring mission tasks", value: "task" },
      ],
    },
    {
      key: "schedule_type",
      label: "Recurrence",
      placeholder: "",
      type: "picker",
      options: [
        { label: "Manual (on demand)", value: "manual" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Yearly", value: "yearly" },
      ],
    },
    {
      key: "schedule_anchor",
      label: "Trigger window",
      placeholder: "e.g. last week of month, 2 weeks before end of quarter",
    },
    ...(missionOptions.length > 0
      ? [
          {
            key: "target_mission_id",
            label: "Target mission",
            placeholder: "",
            type: "picker" as const,
            options: missionOptions,
          },
        ]
      : []),
    {
      key: "quest_title_template",
      label: "Quest title template",
      placeholder: "E.g. Gehaltsabrechnung {month} {year}",
    },
    {
      key: "ai_prompt",
      label: "AI prompt",
      placeholder:
        "OpenClaw: Create the following tasks:",
      multiline: true,
    },
  ];

  const stepFields: FieldDef[] = [
    {
      key: "title",
      label: "Step title",
      placeholder: "Belege sammeln",
      required: true,
    },
    { key: "notes", label: "Notes", placeholder: "Optional" },
    {
      key: "estimate_minutes",
      label: "Estimate (minutes)",
      placeholder: "30",
      type: "number",
    },
  ];

  // ── Submit handlers ───────────────────────────────────────────────────────
  const submitRoutine = async (values: Record<string, string>) => {
    await createRoutine({
      title: values.title,
      description: values.description || undefined,
      apply_as: (values.apply_as as RoutineApplyAs) || "quest",
      schedule_type:
        (values.schedule_type as RoutineScheduleType) || "manual",
      schedule_anchor: values.schedule_anchor || undefined,
      quest_title_template: values.quest_title_template || undefined,
      ai_prompt: values.ai_prompt || undefined,
      target_mission_id: values.target_mission_id || null,
    });
    setAddRoutineVisible(false);
    load();
  };

  const submitStep = async (values: Record<string, string>) => {
    if (!addStepRoutineId) return;
    await createRoutineItem({
      routine_id: addStepRoutineId,
      title: values.title,
      notes: values.notes || undefined,
      estimate_minutes: values.estimate_minutes
        ? Number(values.estimate_minutes)
        : undefined,
    });
    setAddStepRoutineId(null);
    load();
  };

  // Steps shown in detail modal as child items
  const selectedSteps: ChildItem[] = useMemo(() => {
    if (!selectedRoutine) return [];
    return (itemsByRoutine[selectedRoutine.id] ?? []).map((it) => ({
      id: it.id,
      title: it.title,
      status: "planned",
    }));
  }, [selectedRoutine, itemsByRoutine]);

  // Detail modal "notes" shows read-only schedule + AI/step summary
  const { ordered: orderedRoutines, onDragEnd: onRoutinesDragEnd } =
    usePersistedLocalOrder("localSortOrder:routines", routines);

  const detailNotes = useMemo(() => {
    if (!selectedRoutine) return undefined;
    const lines: string[] = [
      `Creates: ${APPLY_AS_LABELS[selectedRoutine.apply_as]}`,
      `Schedule: ${SCHEDULE_LABELS[selectedRoutine.schedule_type]}${
        selectedRoutine.schedule_anchor
          ? ` · ${selectedRoutine.schedule_anchor}`
          : ""
      }`,
    ];
    if (selectedRoutine.quest_title_template)
      lines.push(`Quest template: "${selectedRoutine.quest_title_template}"`);
    if (selectedRoutine.ai_prompt)
      lines.push(`AI prompt:\n${selectedRoutine.ai_prompt}`);
    const mName = missionTitle(selectedRoutine.target_mission_id);
    lines.push(mName ? `Mission: ${mName}` : "⚠ No mission set — create a new routine with a target mission");
    return lines.join("\n\n");
  }, [selectedRoutine, missionTitle]);

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={orderedRoutines}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => onRoutinesDragEnd(data)}
        activationDistance={12}
        renderItem={({ item, drag }) => (
          <ScaleDecorator>
            <RoutineCard
              routine={item}
              missionName={missionTitle(item.target_mission_id)}
              stepCount={itemsByRoutine[item.id]?.length ?? 0}
              onPress={() => setSelectedRoutine(item)}
              onApply={() => applyNow(item)}
              onAddStep={() => setAddStepRoutineId(item.id)}
              onDrag={drag}
            />
          </ScaleDecorator>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="repeat-outline"
            title="No routines yet"
            subtitle="Tap + to create one"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      />

      <Fab onPress={() => setAddRoutineVisible(true)} />

      {/* New routine */}
      <AddItemModal
        visible={addRoutineVisible}
        onClose={() => setAddRoutineVisible(false)}
        onSubmit={submitRoutine}
        title="New Routine"
        fields={routineFields}
      />

      {/* New step */}
      <AddItemModal
        visible={!!addStepRoutineId}
        onClose={() => setAddStepRoutineId(null)}
        onSubmit={submitStep}
        title="Add Step"
        fields={stepFields}
      />

      {/* Detail / edit */}
      <EntityDetailModal
        visible={!!selectedRoutine}
        kindLabel="Routine"
        title={selectedRoutine?.title ?? ""}
        description={selectedRoutine?.description}
        notes={detailNotes}
        childrenLabel={
          selectedRoutine?.ai_prompt ? "Steps (AI hints)" : "Steps"
        }
        children={selectedSteps}
        onClose={() => setSelectedRoutine(null)}
        onSave={async (payload) => {
          if (!selectedRoutine) return;
          await updateRoutine(selectedRoutine.id, {
            title: payload.title,
            description: payload.description ?? "",
          });
          await load();
          setSelectedRoutine(null);
        }}
        onDelete={async () => {
          if (!selectedRoutine) return;
          await deleteRoutine(selectedRoutine.id);
          await load();
          setSelectedRoutine(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingTop: Spacing.sm, paddingBottom: 100 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dragHandle: {
    paddingLeft: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.xs,
    justifyContent: "center",
  },
  dragHandlePressed: { opacity: 0.6 },
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  cardMainAfterHandle: { paddingLeft: 0 },
  cardMainPaddedLeft: { paddingLeft: Spacing.lg },
  cardPressed: { backgroundColor: Colors.cardPressed },
  cardDimmed: { opacity: 0.5 },
  cardBody: { flex: 1, marginRight: Spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: "600", color: Colors.text },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: "wrap",
  },
  scheduleBadge: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scheduleBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  anchorText: { fontSize: 12, color: Colors.textTertiary, flexShrink: 1 },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.textInverse },
  stepCount: { fontSize: 12, color: Colors.textTertiary },
  missionLine: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  noMission: { color: Colors.warning, fontStyle: "italic" },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actionBtn: { padding: 2 },
  actionBtnPressed: { opacity: 0.55 },
});
