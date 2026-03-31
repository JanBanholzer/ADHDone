import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius } from "../constants/theme";
import StatusBadge from "./StatusBadge";

interface Props {
  title: string;
  status: string;
  subtitle?: string;
  dueDate?: string;
  onPress?: () => void;
  onAdd?: () => void;
  onToggleDone?: () => void;
  showCheckbox?: boolean;
  /** Long-press the handle to reorder (local sort only). */
  onDrag?: () => void;
}

export default function ItemCard({
  title,
  status,
  subtitle,
  dueDate,
  onPress,
  onAdd,
  onToggleDone,
  showCheckbox = false,
  onDrag,
}: Props) {
  const isDone = status === "done" || status === "completed" || status === "accomplished";
  const isTerminal = isDone || status === "skipped" || status === "aborted";
  const confirmToggleDone = () => {
    if (isDone) {
      onToggleDone?.();
      return;
    }

    Alert.alert("Mark as done?", "This will mark this item as completed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Mark done", onPress: () => onToggleDone?.() },
    ]);
  };

  return (
    <View
      style={[
        styles.card,
        isTerminal && styles.cardDimmed,
      ]}
    >
      {onDrag ? (
        <Pressable
          onLongPress={onDrag}
          delayLongPress={180}
          hitSlop={10}
          style={({ pressed }) => [
            styles.dragHandle,
            pressed && styles.dragHandlePressed,
          ]}
        >
          <Ionicons
            name="reorder-three"
            size={22}
            color={Colors.textTertiary}
          />
        </Pressable>
      ) : null}
      <Pressable
        style={({ pressed }) => [
          styles.cardInner,
          onDrag ? styles.cardInnerTightLeft : styles.cardInnerPaddedLeft,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
      >
      {showCheckbox && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            confirmToggleDone();
          }}
          hitSlop={12}
          style={styles.checkbox}
        >
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
      {onAdd && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Ionicons name="add" size={18} color={Colors.accent} />
        </Pressable>
      )}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={Colors.textTertiary}
        style={styles.chevron}
      />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dragHandle: {
    paddingLeft: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.xs,
    justifyContent: "center",
  },
  dragHandlePressed: { opacity: 0.6 },
  cardInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  cardInnerPaddedLeft: { paddingLeft: Spacing.lg },
  cardInnerTightLeft: { paddingLeft: 0 },
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
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  addButtonPressed: { backgroundColor: Colors.accentLight },
  chevron: { marginLeft: Spacing.sm },
});
