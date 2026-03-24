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
  fetchQuests,
  fetchProjects,
  createQuest,
  updateQuest,
} from "../../lib/api";
import type { Quest, Project, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";

export default function QuestsScreen() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [q, p] = await Promise.all([fetchQuests(), fetchProjects()]);
      setQuests(q);
      setProjects(p);
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

  const sections: SectionData<Quest>[] = (() => {
    const groups: Record<string, Quest[]> = {};
    for (const q of quests) {
      const projTitle = q.projects?.title ?? "No Project";
      if (!groups[projTitle]) groups[projTitle] = [];
      groups[projTitle].push(q);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  const projectOptions = projects
    .filter((p) => p.status === "active" || p.status === "planned")
    .map((p) => ({ label: p.title, value: p.id }));

  const fields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Quest name", required: true },
    { key: "description", label: "Description", placeholder: "Optional description" },
    ...(projectOptions.length > 0
      ? [
          {
            key: "project_id",
            label: "Project",
            placeholder: "",
            required: true,
            type: "picker" as const,
            options: projectOptions,
          },
        ]
      : []),
    {
      key: "target_date",
      label: "Target date",
      placeholder: "YYYY-MM-DD (optional)",
      type: "date" as const,
    },
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    await createQuest({
      title: values.title,
      description: values.description || undefined,
      project_id: values.project_id,
      target_date: values.target_date || undefined,
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
            subtitle={
              item.projects?.missions?.title
                ? `${item.projects.missions.title}`
                : undefined
            }
            dueDate={item.target_date ?? undefined}
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

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        title="New Quest"
        fields={fields}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 100 },
});
