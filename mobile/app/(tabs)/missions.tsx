import { useCallback, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors, Spacing } from "../../constants/theme";
import { fetchMissions, createMission, updateMission } from "../../lib/api";
import type { Mission } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import EmptyState from "../../components/EmptyState";
import Fab from "../../components/Fab";
import AddItemModal, { FieldDef } from "../../components/AddItemModal";

export default function MissionsScreen() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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

  const fields: FieldDef[] = [
    {
      key: "title",
      label: "Title",
      placeholder: "Mission name",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      placeholder: "What is this mission about?",
    },
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    await createMission({
      title: values.title,
      description: values.description || undefined,
    });
    load();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard
            title={item.title}
            status={item.status}
            subtitle={item.description || undefined}
          />
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

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        title="New Mission"
        fields={fields}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 100 },
});
