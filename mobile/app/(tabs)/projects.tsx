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
  fetchProjects,
  fetchMissions,
  createProject,
  updateProject,
  deleteProject,
  fetchQuestsByProject,
  createQuest,
} from "../../lib/api";
import type { Project, Mission, Quest, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";
import InactiveToggle from "../../components/InactiveToggle";
import EntityDetailModal, { ChildItem } from "../../components/EntityDetailModal";
import { useUsageTracking } from "../../lib/useUsageTracking";

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [childQuests, setChildQuests] = useState<ChildItem[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [addQuestFor, setAddQuestFor] = useState<Project | null>(null);
  const { recordUsage, sortByUsage, sortSectionsByUsage } = useUsageTracking("projects");

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([fetchProjects(), fetchMissions()]);
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

  const visibleProjects = showInactive
    ? projects
    : projects.filter((p) => p.status === "active" || p.status === "planned");

  const sections: SectionData<Project>[] = (() => {
    const groups: Record<string, Project[]> = {};
    for (const p of visibleProjects) {
      const missionTitle = p.missions?.title ?? "No Mission";
      if (!groups[missionTitle]) groups[missionTitle] = [];
      groups[missionTitle].push(p);
    }
    const raw = Object.entries(groups).map(([title, data]) => ({
      title,
      data: sortByUsage(data),
    }));
    return sortSectionsByUsage(raw);
  })();

  const openProject = async (project: Project) => {
    recordUsage(project.id);
    setSelectedProject(project);
    setChildQuests([]);
    setChildrenLoading(true);
    try {
      const quests: Quest[] = await fetchQuestsByProject(project.id);
      setChildQuests(
        quests.map((q) => ({ id: q.id, title: q.title, status: q.status }))
      );
    } catch {
      // non-fatal
    } finally {
      setChildrenLoading(false);
    }
  };

  const missionOptions = missions
    .filter((m) => m.status === "active")
    .map((m) => ({ label: m.title, value: m.id }));

  const projectFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Project name", required: true },
    ...(missionOptions.length > 0
      ? [{ key: "mission_id", label: "Mission", placeholder: "", required: true, type: "picker" as const, options: missionOptions }]
      : []),
    { key: "target_date", label: "Target date", placeholder: "YYYY-MM-DD (optional)", type: "date" as const },
    { key: "description", label: "Description", placeholder: "Optional" },
  ];

  const questFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Quest name", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    { key: "target_date", label: "Target date", placeholder: "YYYY-MM-DD (optional)", type: "date" as const },
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
            dueDate={item.target_date ?? undefined}
            subtitle={item.description || undefined}
            onPress={() => openProject(item)}
            onAdd={() => setAddQuestFor(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="No projects yet"
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

      {/* Add new project */}
      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (values) => {
          await createProject({
            title: values.title,
            mission_id: values.mission_id,
            target_date: values.target_date || undefined,
            description: values.description || undefined,
          });
          load();
        }}
        title="New Project"
        fields={projectFields}
      />

      {/* Add quest directly under a project */}
      <AddItemModal
        visible={!!addQuestFor}
        onClose={() => setAddQuestFor(null)}
        onSubmit={async (values) => {
          if (!addQuestFor) return;
          await createQuest({
            title: values.title,
            project_id: addQuestFor.id,
            description: values.description || undefined,
            target_date: values.target_date || undefined,
          });
          load();
        }}
        title="New Quest"
        fields={questFields}
      />

      <EntityDetailModal
        visible={!!selectedProject}
        kindLabel="Project"
        title={selectedProject?.title ?? ""}
        status={selectedProject?.status}
        description={selectedProject?.description}
        childrenLabel="Quests"
        children={childQuests}
        childrenLoading={childrenLoading}
        onClose={() => setSelectedProject(null)}
        onSave={async (payload) => {
          if (!selectedProject) return;
          await updateProject(selectedProject.id, payload);
          await load();
          setSelectedProject(null);
        }}
        onDelete={async () => {
          if (!selectedProject) return;
          await deleteProject(selectedProject.id);
          await load();
          setSelectedProject(null);
        }}
        onComplete={async () => {
          if (!selectedProject) return;
          await updateProject(selectedProject.id, { status: "completed" });
          await load();
          setSelectedProject(null);
        }}
        completeLabel="Mark Complete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 100 },
});
