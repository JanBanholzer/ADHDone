import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/theme";

interface Props {
  count: number;
}

export default function CountBadge({ count }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger,
  },
  text: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "700",
  },
});
