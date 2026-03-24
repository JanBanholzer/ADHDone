import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Colors, Spacing, Radius } from "../constants/theme";

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: "text" | "date" | "number" | "picker";
  options?: { label: string; value: string }[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  title: string;
  fields: FieldDef[];
}

export default function AddItemModal({
  visible,
  onClose,
  onSubmit,
  title,
  fields,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const defaults: Record<string, string> = {};
      fields.forEach((f) => {
        if (f.type === "date") defaults[f.key] = new Date().toISOString().slice(0, 10);
        if (f.options) defaults[f.key] = f.options[0]?.value ?? "";
      });
      setValues(defaults);
    }
  }, [visible]);

  const set = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        Alert.alert("Required", `${f.label} is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleSubmit} disabled={submitting}>
              <Text
                style={[styles.save, submitting && { opacity: 0.4 }]}
              >
                {submitting ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {fields.map((f) =>
              f.type === "picker" && f.options ? (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pickerRow}
                  >
                    {f.options.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => set(f.key, opt.value)}
                        style={[
                          styles.chip,
                          values[f.key] === opt.value && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            values[f.key] === opt.value && styles.chipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={values[f.key] ?? ""}
                    onChangeText={(v) => set(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType={f.type === "number" ? "numeric" : "default"}
                    autoCapitalize={f.type === "date" ? "none" : "sentences"}
                  />
                </View>
              )
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  cancel: { fontSize: 16, color: Colors.textSecondary },
  title: { fontSize: 17, fontWeight: "700", color: Colors.text },
  save: { fontSize: 16, fontWeight: "600", color: Colors.accent },
  body: { padding: Spacing.lg },
  fieldGroup: { marginBottom: Spacing.xl },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.bg,
  },
  pickerRow: { flexDirection: "row" },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  chipText: { fontSize: 14, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent, fontWeight: "600" },
});
