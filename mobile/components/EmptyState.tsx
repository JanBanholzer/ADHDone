import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "../constants/theme";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyState({
  icon = "layers-outline",
  title,
  subtitle,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={Colors.textTertiary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: 80,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
});
