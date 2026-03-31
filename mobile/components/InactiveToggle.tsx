import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "../constants/theme";

interface Props {
  showInactive: boolean;
  onToggle: () => void;
}

export default function InactiveToggle({ showInactive, onToggle }: Props) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <Ionicons
        name={showInactive ? "checkbox" : "square-outline"}
        size={20}
        color={showInactive ? Colors.accent : Colors.textSecondary}
      />
      <Text style={styles.text}>Show inactive</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  text: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
