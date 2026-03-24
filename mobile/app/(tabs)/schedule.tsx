import { useCallback, useState, useEffect } from "react";
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  Alert,
  Text,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors, Spacing } from "../../constants/theme";
import { fetchSchedule, fetchOverdue, updateTask, updateErrand } from "../../lib/api";
import type { Task, Errand, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import DayPicker from "../../components/DayPicker";

type ScheduleItem = (Task | Errand) & { _kind: "task" | "errand" };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ScheduleScreen() {
  const [selected, setSelected] = useState(today());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [overdueItems, setOverdueItems] = useState<ScheduleItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [schedule, overdue] = await Promise.all([
        fetchSchedule(selected),
        selected === today() ? fetchOverdue() : Promise.resolve({ tasks: [], errands: [] }),
      ]);

      const dayItems: ScheduleItem[] = [
        ...schedule.tasks.map((t) => ({ ...t, _kind: "task" as const })),
        ...schedule.errands.map((e) => ({ ...e, _kind: "errand" as const })),
      ];
      const oItems: ScheduleItem[] = [
        ...overdue.tasks.map((t) => ({ ...t, _kind: "task" as const })),
        ...overdue.errands.map((e) => ({ ...e, _kind: "errand" as const })),
      ];

      setItems(dayItems);
      setOverdueItems(oItems);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }, [selected]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [selected]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggle = async (item: ScheduleItem) => {
    const next = item.status === "done" ? "planned" : "done";
    if (item._kind === "task") {
      await updateTask(item.id, { status: next });
    } else {
      await updateErrand(item.id, { status: next });
    }
    load();
  };

  const sections: SectionData<ScheduleItem>[] = [];
  if (overdueItems.length > 0 && selected === today()) {
    sections.push({ title: "Overdue", data: overdueItems });
  }
  const dateLabel =
    selected === today()
      ? "Today"
      : new Date(selected + "T12:00:00Z").toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
  if (items.length > 0) {
    sections.push({ title: dateLabel, data: items });
  }

  return (
    <View style={styles.container}>
      <DayPicker selected={selected} onSelect={setSelected} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id + item._kind}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} />
        )}
        renderItem={({ item }) => (
          <ItemCard
            title={item.title}
            status={item.status}
            subtitle={
              item._kind === "task"
                ? `Task${(item as Task).quests?.title ? " · " + (item as Task).quests!.title : ""}`
                : "Errand"
            }
            dueDate={item.due_date}
            showCheckbox
            onToggleDone={() => toggle(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nothing scheduled"
            subtitle={`No tasks or errands for ${dateLabel.toLowerCase()}`}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 40 },
});
