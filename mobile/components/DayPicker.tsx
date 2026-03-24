import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Colors, Spacing, Radius } from "../constants/theme";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface Props {
  selected: string;
  onSelect: (date: string) => void;
}

export default function DayPicker({ selected, onSelect }: Props) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((d) => {
        const key = fmt(d);
        const isSelected = key === selected;
        const isToday = key === fmt(today);
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={[styles.day, isSelected && styles.daySelected]}
          >
            <Text
              style={[styles.dayName, isSelected && styles.dayNameSelected]}
            >
              {DAY_NAMES[d.getDay()]}
            </Text>
            <Text
              style={[styles.dayNum, isSelected && styles.dayNumSelected]}
            >
              {d.getDate()}
            </Text>
            {isToday && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  day: {
    width: 52,
    height: 72,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },
  daySelected: { backgroundColor: Colors.accent },
  dayName: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  dayNameSelected: { color: Colors.textInverse },
  dayNum: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  dayNumSelected: { color: Colors.textInverse },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 4,
  },
  dotSelected: { backgroundColor: Colors.textInverse },
});
