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
import { fetchSchedule, fetchOverdue, updateTask, updateErrand, fetchCalendarEvents } from "../../lib/api";
import type { Task, Errand, CalendarEvent, SectionData } from "../../lib/types";
import ItemCard from "../../components/ItemCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import DayPicker from "../../components/DayPicker";
import { syncCalendar } from "../../lib/calendar";

type ScheduleItem = (Task | Errand) & { _kind: "task" | "errand" };
type CalendarItem = CalendarEvent & { _kind: "calendar" };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ScheduleScreen() {
  const [selected, setSelected] = useState(today());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [overdueItems, setOverdueItems] = useState<ScheduleItem[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await syncCalendar();
      
      const [schedule, overdue, calEvents] = await Promise.all([
        fetchSchedule(selected),
        selected === today() ? fetchOverdue() : Promise.resolve({ tasks: [], errands: [] }),
        fetchCalendarEvents(selected),
      ]);

      const dayItems: ScheduleItem[] = [
        ...schedule.tasks.map((t) => ({ ...t, _kind: "task" as const })),
        ...schedule.errands.map((e) => ({ ...e, _kind: "errand" as const })),
      ];
      const oItems: ScheduleItem[] = [
        ...overdue.tasks.map((t) => ({ ...t, _kind: "task" as const })),
        ...overdue.errands.map((e) => ({ ...e, _kind: "errand" as const })),
      ];
      const calItems: CalendarItem[] = calEvents.map((c) => ({ ...c, _kind: "calendar" as const }));

      setItems(dayItems);
      setOverdueItems(oItems);
      setCalendarItems(calItems);
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

  const sections: SectionData<ScheduleItem | CalendarItem>[] = [];
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
  if (calendarItems.length > 0) {
    sections.push({ title: "Calendar", data: calendarItems });
  }
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
        renderItem={({ item }) => {
          if (item._kind === "calendar") {
            const cal = item as CalendarItem;
            const startTime = new Date(cal.start_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            const endTime = new Date(cal.end_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <ItemCard
                title={cal.title}
                status="active"
                subtitle={cal.location || cal.calendar_name}
                dueDate={cal.is_all_day ? "All day" : `${startTime} - ${endTime}`}
                showCheckbox={false}
              />
            );
          }
          
          const schedItem = item as ScheduleItem;
          return (
            <ItemCard
              title={schedItem.title}
              status={schedItem.status}
              subtitle={
                schedItem._kind === "task"
                  ? `Task${(schedItem as Task).quests?.title ? " · " + (schedItem as Task).quests!.title : ""}`
                  : "Errand"
              }
              dueDate={schedItem.due_date}
              showCheckbox
              onToggleDone={() => toggle(schedItem)}
            />
          );
        }}
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
