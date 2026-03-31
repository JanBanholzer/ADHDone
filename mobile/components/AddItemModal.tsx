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
  /** When true the picker starts unselected and a chip can be deselected by tapping again. */
  optional?: boolean;
  type?: "text" | "date" | "number" | "picker";
  multiline?: boolean;
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
        if (f.options && !f.optional) defaults[f.key] = f.options[0]?.value ?? "";
        if (f.options && f.optional) defaults[f.key] = "";
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
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerSpacer} />
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
                        onPress={() =>
                          f.optional && values[f.key] === opt.value
                            ? set(f.key, "")
                            : set(f.key, opt.value)
                        }
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
                    style={[styles.input, f.multiline && styles.inputMultiline]}
                    value={values[f.key] ?? ""}
                    onChangeText={(v) => set(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType={f.type === "number" ? "numeric" : "default"}
                    autoCapitalize={f.type === "date" ? "none" : "sentences"}
                    multiline={f.multiline}
                    textAlignVertical={f.multiline ? "top" : "auto"}
                  />
                </View>
              )
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>
                {submitting ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
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
    maxHeight: "72%",
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
  headerSpacer: { width: 52 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginHorizontal: Spacing.sm,
  },
  body: { padding: Spacing.lg },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
  },
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
  inputMultiline: {
    minHeight: 90,
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
