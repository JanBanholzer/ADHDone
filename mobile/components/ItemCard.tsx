import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius } from "../constants/theme";
import StatusBadge from "./StatusBadge";

interface Props {
  title: string;
  status: string;
  subtitle?: string;
  dueDate?: string;
  onPress?: () => void;
  onToggleDone?: () => void;
  showCheckbox?: boolean;
}

export default function ItemCard({
  title,
  status,
  subtitle,
  dueDate,
  onPress,
  onToggleDone,
  showCheckbox = false,
}: Props) {
  const isDone = status === "done" || status === "completed" || status === "accomplished";
  const isTerminal = isDone || status === "skipped" || status === "aborted";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isTerminal && styles.cardDimmed,
      ]}
      onPress={onPress}
    >
      {showCheckbox && (
        <Pressable onPress={onToggleDone} hitSlop={12} style={styles.checkbox}>
          <Ionicons
            name={isDone ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={isDone ? Colors.success : Colors.textTertiary}
          />
        </Pressable>
      )}
      <View style={styles.content}>
        <Text
          style={[styles.title, isTerminal && styles.titleDone]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <View style={styles.meta}>
          <StatusBadge status={status} />
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {dueDate ? <Text style={styles.date}>{dueDate}</Text> : null}
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={Colors.textTertiary}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: { backgroundColor: Colors.cardPressed },
  cardDimmed: { opacity: 0.55 },
  checkbox: { marginRight: Spacing.md },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: Colors.text },
  titleDone: { textDecorationLine: "line-through", color: Colors.textSecondary },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  subtitle: { fontSize: 12, color: Colors.textTertiary, flexShrink: 1 },
  date: { fontSize: 12, color: Colors.textTertiary },
  chevron: { marginLeft: Spacing.sm },
});
