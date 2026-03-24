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
  fetchQuests,
  fetchMissions,
} from "../../lib/api";
import type { Task, Errand, Quest, Mission, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";

type Mode = "tasks" | "errands";

export default function TasksScreen() {
  const [mode, setMode] = useState<Mode>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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

  // Group tasks by mission
  const taskSections: SectionData<Task>[] = (() => {
    const groups: Record<string, Task[]> = {};
    for (const t of tasks) {
      const missionTitle =
        t.quests?.projects?.missions?.title ?? "No Mission";
      if (!groups[missionTitle]) groups[missionTitle] = [];
      groups[missionTitle].push(t);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  // Errand sections (flat under one header)
  const errandSections: SectionData<Errand>[] =
    errands.length > 0 ? [{ title: "Errands", data: errands }] : [];

  const questOptions = quests
    .filter((q) => q.status === "active" || q.status === "planned")
    .map((q) => ({ label: q.title, value: q.id }));

  const taskFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "What needs to be done?", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    { key: "due_date", label: "Due date", placeholder: "YYYY-MM-DD", required: true, type: "date" },
    ...(questOptions.length > 0
      ? [
          {
            key: "quest_id",
            label: "Quest",
            placeholder: "",
            required: true,
            type: "picker" as const,
            options: questOptions,
          },
        ]
      : []),
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
    { key: "estimate_minutes", label: "Estimate (min)", placeholder: "e.g. 30", type: "number" as const },
  ];

  const errandFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "What needs to be done?", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    { key: "due_date", label: "Due date", placeholder: "YYYY-MM-DD", required: true, type: "date" },
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
    { key: "estimate_minutes", label: "Estimate (min)", placeholder: "e.g. 30", type: "number" as const },
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    if (mode === "tasks") {
      await createTask({
        title: values.title,
        quest_id: values.quest_id,
        description: values.description || undefined,
        due_date: values.due_date,
        notes: values.notes || undefined,
        estimate_minutes: values.estimate_minutes
          ? parseInt(values.estimate_minutes)
          : undefined,
      });
    } else {
      await createErrand({
        title: values.title,
        description: values.description || undefined,
        due_date: values.due_date,
        notes: values.notes || undefined,
        estimate_minutes: values.estimate_minutes
          ? parseInt(values.estimate_minutes)
          : undefined,
      });
    }
    load();
  };

  return (
    <View style={styles.container}>
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
              {m === "tasks" ? "Tasks" : "Errands"}
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
              subtitle={item.quests?.title}
              dueDate={item.due_date}
              showCheckbox
              onToggleDone={() => toggleTask(item)}
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
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: Colors.accent },
  segmentText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  list: { paddingBottom: 100 },
});
