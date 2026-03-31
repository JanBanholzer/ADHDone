import { useCallback, useState } from "react";
import {
  View,
  SectionList,
  Pressable,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors, Spacing } from "../../constants/theme";
import {
  fetchTasks,
  fetchErrands,
  createTask,
  createErrand,
  updateTask,
  updateErrand,
  deleteTask,
  deleteErrand,
  fetchQuests,
  fetchMissions,
} from "../../lib/api";
import type { Task, Errand, Quest, Mission, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";
import InactiveToggle from "../../components/InactiveToggle";
import EntityDetailModal, { ChildItem } from "../../components/EntityDetailModal";

type Mode = "tasks" | "errands";

export default function TasksScreen() {
  const [mode, setMode] = useState<Mode>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, e, q, m] = await Promise.all([
        fetchTasks(),
        fetchErrands(),
        fetchQuests(),
        fetchMissions(),
      ]);
      setTasks(t);
      setErrands(e);
      setQuests(q);
      setMissions(m);
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

  const toggleTask = async (task: Task) => {
    const next = task.status === "done" ? "planned" : "done";
    await updateTask(task.id, { status: next });
    load();
  };

  const toggleErrand = async (errand: Errand) => {
    const next = errand.status === "done" ? "planned" : "done";
    await updateErrand(errand.id, { status: next });
    load();
  };

  const visibleTasks = showInactive ? tasks : tasks.filter((t) => t.status === "planned");
  const visibleErrands = showInactive ? errands : errands.filter((e) => e.status === "planned");
  const plannedTaskCount = tasks.filter((t) => t.status === "planned").length;
  const plannedErrandCount = errands.filter((e) => e.status === "planned").length;

  // Group tasks by mission (handles quest-parented and mission-direct tasks)
  const taskSections: SectionData<Task>[] = (() => {
    const groups: Record<string, Task[]> = {};
    for (const t of visibleTasks) {
      const missionTitle =
        t.missions?.title ??
        t.quests?.projects?.missions?.title ??
        t.quests?.missions?.title ??
        "No Mission";
      if (!groups[missionTitle]) groups[missionTitle] = [];
      groups[missionTitle].push(t);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  // Errand sections (flat under one header)
  const errandSections: SectionData<Errand>[] =
    visibleErrands.length > 0 ? [{ title: "Errands", data: visibleErrands }] : [];

  const questOptions = quests
    .filter((q) => q.status === "active" || q.status === "planned")
    .map((q) => ({ label: q.title, value: q.id }));

  const missionOptions = missions
    .filter((m) => m.status === "active")
    .map((m) => ({ label: m.title, value: m.id }));

  const taskFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "What needs to be done?", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    { key: "due_date", label: "Due date", placeholder: "YYYY-MM-DD", required: true, type: "date" },
    ...(questOptions.length > 0
      ? [
          {
            key: "quest_id",
            label: "Quest (or pick a mission below)",
            placeholder: "",
            optional: true,
            type: "picker" as const,
            options: questOptions,
          },
        ]
      : []),
    ...(missionOptions.length > 0
      ? [
          {
            key: "mission_id",
            label: "Mission (skip quest — direct)",
            placeholder: "",
            optional: true,
            type: "picker" as const,
            options: missionOptions,
          },
        ]
      : []),
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
  ];

  const errandFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "What needs to be done?", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    { key: "due_date", label: "Due date", placeholder: "YYYY-MM-DD", required: true, type: "date" },
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    if (mode === "tasks") {
      const qid = values.quest_id?.trim() || "";
      const mid = values.mission_id?.trim() || "";
      if (!qid && !mid) {
        throw new Error("Pick a quest or a mission to attach this task to.");
      }
      if (qid && mid) {
        throw new Error("Choose either a quest or a mission, not both.");
      }
      if (qid) {
        await createTask({
          title: values.title,
          quest_id: qid,
          description: values.description || undefined,
          due_date: values.due_date,
          notes: values.notes || undefined,
        });
      } else {
        await createTask({
          title: values.title,
          mission_id: mid,
          description: values.description || undefined,
          due_date: values.due_date,
          notes: values.notes || undefined,
        });
      }
    } else {
      await createErrand({
        title: values.title,
        description: values.description || undefined,
        due_date: values.due_date,
        notes: values.notes || undefined,
      });
    }
    load();
  };

  return (
    <View style={styles.container}>
      <InactiveToggle
        showInactive={showInactive}
        onToggle={() => setShowInactive((prev) => !prev)}
      />
      <View style={styles.segmentRow}>
        {(["tasks", "errands"] as Mode[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.segment, mode === m && styles.segmentActive]}
            onPress={() => setMode(m)}
          >
            <Text
              style={[
                styles.segmentText,
                mode === m && styles.segmentTextActive,
              ]}
            >
              {m === "tasks"
                ? `Tasks (${plannedTaskCount})`
                : `Errands (${plannedErrandCount})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "tasks" ? (
        <SectionList
          sections={taskSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} />
          )}
          renderItem={({ item }) => (
            <ItemCard
              title={item.title}
              status={item.status}
              subtitle={item.quests?.title ?? (item.missions ? `${item.missions.title} · direct` : undefined)}
              dueDate={item.due_date}
              showCheckbox
              onToggleDone={() => toggleTask(item)}
              onPress={() => setSelectedTask(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title="No tasks yet"
              subtitle="Tap + to create one"
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <SectionList
          sections={errandSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} />
          )}
          renderItem={({ item }) => (
            <ItemCard
              title={item.title}
              status={item.status}
              dueDate={item.due_date}
              showCheckbox
              onToggleDone={() => toggleErrand(item)}
              onPress={() => setSelectedErrand(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bag-outline"
              title="No errands yet"
              subtitle="Tap + to create one"
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <Fab onPress={() => setModalVisible(true)} />

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        title={mode === "tasks" ? "New Task" : "New Errand"}
        fields={mode === "tasks" ? taskFields : errandFields}
      />

      <EntityDetailModal
        visible={!!selectedTask}
        kindLabel="Task"
        title={selectedTask?.title ?? ""}
        description={selectedTask?.description}
        notes={selectedTask?.notes}
        childrenLabel="Quest"
        children={
          selectedTask?.quests
            ? ([{ id: selectedTask.quests.id, title: selectedTask.quests.title, status: "active" }] as ChildItem[])
            : []
        }
        onClose={() => setSelectedTask(null)}
        onSave={async (payload) => {
          if (!selectedTask) return;
          await updateTask(selectedTask.id, payload);
          await load();
          setSelectedTask(null);
        }}
        onDelete={async () => {
          if (!selectedTask) return;
          await deleteTask(selectedTask.id);
          await load();
          setSelectedTask(null);
        }}
      />

      <EntityDetailModal
        visible={!!selectedErrand}
        kindLabel="Errand"
        title={selectedErrand?.title ?? ""}
        description={selectedErrand?.description}
        notes={selectedErrand?.notes}
        onClose={() => setSelectedErrand(null)}
        onSave={async (payload) => {
          if (!selectedErrand) return;
          await updateErrand(selectedErrand.id, payload);
          await load();
          setSelectedErrand(null);
        }}
        onDelete={async () => {
          if (!selectedErrand) return;
          await deleteErrand(selectedErrand.id);
          await load();
          setSelectedErrand(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  segmentRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: Colors.accent },
  segmentText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  list: { paddingBottom: 100 },
});
