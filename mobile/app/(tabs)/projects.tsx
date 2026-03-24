import { useCallback, useState } from "react";
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors, Spacing } from "../../constants/theme";
import {
  fetchProjects,
  fetchMissions,
  createProject,
} from "../../lib/api";
import type { Project, Mission, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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

  const sections: SectionData<Project>[] = (() => {
    const groups: Record<string, Project[]> = {};
    for (const p of projects) {
      const missionTitle = p.missions?.title ?? "No Mission";
      if (!groups[missionTitle]) groups[missionTitle] = [];
      groups[missionTitle].push(p);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  const missionOptions = missions
    .filter((m) => m.status === "active")
    .map((m) => ({ label: m.title, value: m.id }));

  const fields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Project name", required: true },
    ...(missionOptions.length > 0
      ? [
          {
            key: "mission_id",
            label: "Mission",
            placeholder: "",
            required: true,
            type: "picker" as const,
            options: missionOptions,
          },
        ]
      : []),
    {
      key: "target_date",
      label: "Target date",
      placeholder: "YYYY-MM-DD (optional)",
      type: "date" as const,
    },
    { key: "description", label: "Description", placeholder: "Optional" },
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    await createProject({
      title: values.title,
      mission_id: values.mission_id,
      target_date: values.target_date || undefined,
      description: values.description || undefined,
    });
    load();
  };

  return (
    <View style={styles.container}>
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

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        title="New Project"
        fields={fields}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 100 },
});
