import { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useFocusEffect } from "expo-router";
import { Colors, Spacing } from "../../constants/theme";
import {
  fetchMissions,
  createMission,
  updateMission,
  deleteMission,
  fetchProjectsByMission,
  createProject,
} from "../../lib/api";
import type { Mission, Project } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";
import InactiveToggle from "../../components/InactiveToggle";
import EntityDetailModal, { ChildItem } from "../../components/EntityDetailModal";
import { usePersistedLocalOrder } from "../../lib/localSortOrder";

export default function MissionsScreen() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [childProjects, setChildProjects] = useState<ChildItem[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [addProjectFor, setAddProjectFor] = useState<Mission | null>(null);

  const load = useCallback(async () => {
    try {
      setMissions(await fetchMissions());
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

  const openMission = async (mission: Mission) => {
    setSelectedMission(mission);
    setChildProjects([]);
    setChildrenLoading(true);
    try {
      const projects: Project[] = await fetchProjectsByMission(mission.id);
      setChildProjects(
        projects.map((p) => ({ id: p.id, title: p.title, status: p.status }))
      );
    } catch {
      // non-fatal
    } finally {
      setChildrenLoading(false);
    }
  };

  const missionFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Mission name", required: true },
    { key: "description", label: "Description", placeholder: "What is this mission about?" },
  ];

  const projectFields: FieldDef[] = [
    { key: "title", label: "Title", placeholder: "Project name", required: true },
    { key: "description", label: "Description", placeholder: "Optional" },
    { key: "target_date", label: "Target date", placeholder: "YYYY-MM-DD (optional)", type: "date" },
  ];

  const visibleMissions = showInactive
    ? missions
    : missions.filter((m) => m.status === "active");

  const { ordered: orderedMissions, onDragEnd: onMissionsDragEnd } =
    usePersistedLocalOrder("localSortOrder:missions", visibleMissions);

  return (
    <View style={styles.container}>
      <InactiveToggle
        showInactive={showInactive}
        onToggle={() => setShowInactive((prev) => !prev)}
      />
      <DraggableFlatList
        data={orderedMissions}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => onMissionsDragEnd(data)}
        activationDistance={12}
        renderItem={({ item, drag }) => (
          <ScaleDecorator>
            <ItemCard
              title={item.title}
              status={item.status}
              subtitle={item.description || undefined}
              onPress={() => openMission(item)}
              onAdd={() => setAddProjectFor(item)}
              onDrag={drag}
            />
          </ScaleDecorator>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title="No missions yet"
            subtitle="Tap + to define your first mission"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={{ height: Spacing.md }} />}
      />

      <Fab onPress={() => setModalVisible(true)} />

      {/* Add new mission */}
      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (values) => {
          await createMission({
            title: values.title,
            description: values.description || undefined,
          });
          load();
        }}
        title="New Mission"
        fields={missionFields}
      />

      {/* Add project directly under a mission */}
      <AddItemModal
        visible={!!addProjectFor}
        onClose={() => setAddProjectFor(null)}
        onSubmit={async (values) => {
          if (!addProjectFor) return;
          await createProject({
            title: values.title,
            mission_id: addProjectFor.id,
            description: values.description || undefined,
            target_date: values.target_date || undefined,
          });
          load();
        }}
        title="New Project"
        fields={projectFields}
      />

      <EntityDetailModal
        visible={!!selectedMission}
        kindLabel="Mission"
        title={selectedMission?.title ?? ""}
        description={selectedMission?.description}
        childrenLabel="Projects"
        children={childProjects}
        childrenLoading={childrenLoading}
        onClose={() => setSelectedMission(null)}
        onSave={async (payload) => {
          if (!selectedMission) return;
          await updateMission(selectedMission.id, payload);
          await load();
          setSelectedMission(null);
        }}
        onDelete={async () => {
          if (!selectedMission) return;
          await deleteMission(selectedMission.id);
          await load();
          setSelectedMission(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 100 },
});
