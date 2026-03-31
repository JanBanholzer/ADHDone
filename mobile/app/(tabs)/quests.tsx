import { useCallback, useState } from "react";
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors } from "../../constants/theme";
import {
  fetchQuests,
  fetchProjects,
  fetchMissions,
  createQuest,
  updateQuest,
  deleteQuest,
  fetchTasks,
  createTask,
} from "../../lib/api";
import type { Quest, Project, Mission, Task, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";
import InactiveToggle from "../../components/InactiveToggle";
import EntityDetailModal, { ChildItem } from "../../components/EntityDetailModal";

export default function QuestsScreen() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [childTasks, setChildTasks] = useState<ChildItem[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [addTaskFor, setAddTaskFor] = useState<Quest | null>(null);

  const load = useCallback(async () => {
    try {
      const [q, p, m] = await Promise.all([
        fetchQuests(),
        fetchProjects(),
        fetchMissions(),
      ]);
      setQuests(q);
      setProjects(p);
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

  const visibleQuests = showInactive
    ? quests
    : quests.filter((q) => q.status === "active" || q.status === "planned");

  const sections: SectionData<Quest>[] = (() => {
    const groups: Record<string, Quest[]> = {};
    for (const q of visibleQuests) {
      const sectionTitle = q.project_id
        ? q.projects?.title ?? "Project"
        : q.missions?.title
          ? `${q.missions.title} · mission`
          : "Mission";
      if (!groups[sectionTitle]) groups[sectionTitle] = [];
      groups[sectionTitle].push(q);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  const openQuest = async (quest: Quest) => {
    setSelectedQuest(quest);
    setChildTasks([]);
    setChildrenLoading(true);
    try {
      const tasks: Task[] = await fetchTasks({ questId: quest.id });
      setChildTasks(
        tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))
      );
    } catch {
      // non-fatal
    } finally {
      setChildrenLoading(false);
    }
  };

  const projectOptions = projects
    .filter((p) => p.status === "active" || p.status === "planned")
    .map((p) => ({ label: p.title, value: p.id }));

  const missionOptions = missions
    .filter((m) => m.status === "active")
    .map((m) => ({ label: m.title, value: m.id }));

  const questFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Quest name", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    ...(projectOptions.length > 0
      ? [{ key: "project_id", label: "Project (or pick a mission below)", placeholder: "", optional: true, type: "picker" as const, options: projectOptions }]
      : []),
    ...(missionOptions.length > 0
      ? [{ key: "mission_id", label: "Mission (skip project — direct)", placeholder: "", optional: true, type: "picker" as const, options: missionOptions }]
      : []),
    { key: "target_date", label: "Target date", placeholder: "YYYY-MM-DD (optional)", type: "date" as const },
  ];

  const taskFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "What needs to be done?", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    { key: "due_date", label: "Due date", placeholder: "YYYY-MM-DD", required: true, type: "date" as const },
    { key: "notes", label: "Notes", placeholder: "Optional notes" },
  ];

  return (
    <View style={styles.container}>
      <InactiveToggle
        showInactive={showInactive}
        onToggle={() => setShowInactive((prev) => !prev)}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} />
        )}
        renderItem={({ item }) => (
          <ItemCard
            title={item.title}
            status={item.status}
            subtitle={
              item.project_id
                ? item.projects?.missions?.title
                : item.missions?.title
            }
            dueDate={item.target_date ?? undefined}
            onPress={() => openQuest(item)}
            onAdd={() => setAddTaskFor(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="compass-outline"
            title="No quests yet"
            subtitle="Tap + to create one"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />

      <Fab onPress={() => setModalVisible(true)} />

      {/* Add new quest */}
      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (values) => {
          const pid = values.project_id?.trim() || "";
          const mid = values.mission_id?.trim() || "";
          if (!pid && !mid) {
            Alert.alert("Attach quest", "Pick a project or a mission (mission-only).");
            return;
          }
          if (pid && mid) {
            Alert.alert("Attach quest", "Choose either a project or a mission, not both.");
            return;
          }
          if (pid) {
            await createQuest({
              title: values.title,
              description: values.description || undefined,
              project_id: pid,
              target_date: values.target_date || undefined,
            });
          } else {
            await createQuest({
              title: values.title,
              description: values.description || undefined,
              mission_id: mid,
              target_date: values.target_date || undefined,
            });
          }
          load();
        }}
        title="New Quest"
        fields={questFields}
      />

      {/* Add task directly under a quest */}
      <AddItemModal
        visible={!!addTaskFor}
        onClose={() => setAddTaskFor(null)}
        onSubmit={async (values) => {
          if (!addTaskFor) return;
          await createTask({
            title: values.title,
            quest_id: addTaskFor.id,
            due_date: values.due_date,
            description: values.description || undefined,
            notes: values.notes || undefined,
          });
          load();
        }}
        title="New Task"
        fields={taskFields}
      />

      <EntityDetailModal
        visible={!!selectedQuest}
        kindLabel="Quest"
        title={selectedQuest?.title ?? ""}
        description={selectedQuest?.description}
        childrenLabel="Tasks"
        children={childTasks}
        childrenLoading={childrenLoading}
        onClose={() => setSelectedQuest(null)}
        onSave={async (payload) => {
          if (!selectedQuest) return;
          await updateQuest(selectedQuest.id, payload);
          await load();
          setSelectedQuest(null);
        }}
        onDelete={async () => {
          if (!selectedQuest) return;
          await deleteQuest(selectedQuest.id);
          await load();
          setSelectedQuest(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 100 },
});
