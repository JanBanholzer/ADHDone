import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Radius } from "../constants/theme";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> =
  {
    active: { bg: Colors.accentLight, fg: Colors.accent, label: "Active" },
    planned: { bg: Colors.warningLight, fg: Colors.warning, label: "Planned" },
    done: { bg: Colors.successLight, fg: Colors.success, label: "Done" },
    completed: { bg: Colors.successLight, fg: Colors.success, label: "Complete" },
    accomplished: {
      bg: Colors.successLight,
      fg: Colors.success,
      label: "Accomplished",
    },
    skipped: { bg: Colors.mutedLight, fg: Colors.muted, label: "Skipped" },
    aborted: { bg: Colors.dangerLight, fg: Colors.danger, label: "Aborted" },
  };

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.planned;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.label, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
});
