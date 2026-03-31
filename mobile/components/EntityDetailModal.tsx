import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Radius } from "../constants/theme";

export interface ChildItem {
  id: string;
  title: string;
  status: string;
}

const ACTIVE_STATUSES = new Set(["active", "planned"]);

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status);
}

function sortChildren(items: ChildItem[]): ChildItem[] {
  return [...items].sort((a, b) => {
    const aActive = isActive(a.status) ? 0 : 1;
    const bActive = isActive(b.status) ? 0 : 1;
    return aActive - bActive;
  });
}

interface Props {
  visible: boolean;
  kindLabel: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  childrenLabel?: string;
  children?: ChildItem[];
  childrenLoading?: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; description?: string; notes?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function EntityDetailModal({
  visible,
  kindLabel,
  title,
  description,
  notes,
  childrenLabel,
  children,
  childrenLoading,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title ?? "");
  const [descriptionDraft, setDescriptionDraft] = useState(description ?? "");
  const [notesDraft, setNotesDraft] = useState(notes ?? "");

  useEffect(() => {
    if (visible) {
      setEditing(false);
      setTitleDraft(title ?? "");
      setDescriptionDraft(description ?? "");
      setNotesDraft(notes ?? "");
    }
  }, [visible, title, description, notes]);

  const save = async () => {
    if (!titleDraft.trim()) {
      Alert.alert("Required", "Title is required");
      return;
    }
    await onSave({
      title: titleDraft.trim(),
      description: descriptionDraft.trim() || undefined,
      notes: notesDraft.trim() || undefined,
    });
    setEditing(false);
  };

  const remove = () => {
    Alert.alert("Delete item", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete() },
    ]);
  };

  const sortedChildren = children ? sortChildren(children) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{kindLabel}</Text>
            {editing ? (
              <Pressable onPress={save}>
                <Text style={styles.actionText}>Save</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
            )}
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {editing ? (
              <>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  placeholderTextColor={Colors.textTertiary}
                />
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={descriptionDraft}
                  onChangeText={setDescriptionDraft}
                  multiline
                  placeholderTextColor={Colors.textTertiary}
                />
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  multiline
                  placeholderTextColor={Colors.textTertiary}
                />
              </>
            ) : (
              <>
                <Text style={styles.entityTitle}>{title}</Text>
                {!!description?.trim() && (
                  <>
                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.value}>{description.trim()}</Text>
                  </>
                )}
                {!!notes?.trim() && (
                  <>
                    <Text style={styles.label}>Notes</Text>
                    <Text style={styles.value}>{notes.trim()}</Text>
                  </>
                )}

                {/* Child items */}
                {childrenLabel !== undefined && (
                  <View style={styles.childSection}>
                    <Text style={styles.label}>{childrenLabel}</Text>
                    {childrenLoading ? (
                      <Text style={styles.loadingText}>Loading…</Text>
                    ) : sortedChildren.length === 0 ? (
                      <Text style={styles.emptyText}>None</Text>
                    ) : (
                      sortedChildren.map((child, idx) => {
                        const active = isActive(child.status);
                        const last = idx === sortedChildren.length - 1;
                        const prevActive = idx > 0 && isActive(sortedChildren[idx - 1].status);
                        const showDivider = !active && idx > 0 && prevActive;
                        return (
                          <View key={child.id}>
                            {showDivider && <View style={styles.divider} />}
                            <View
                              style={[
                                styles.childRow,
                                !last && styles.childRowBorder,
                                !active && styles.childRowInactive,
                              ]}
                            >
                              <Ionicons
                                name={active ? "ellipse" : "ellipse-outline"}
                                size={8}
                                color={active ? Colors.accent : Colors.textTertiary}
                                style={styles.childDot}
                              />
                              <Text
                                style={[
                                  styles.childTitle,
                                  !active && styles.childTitleInactive,
                                ]}
                                numberOfLines={2}
                              >
                                {child.title}
                              </Text>
                              <Text style={styles.childStatus}>{child.status}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.deleteButton} onPress={remove}>
              <Text style={styles.deleteText}>Delete</Text>
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
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  closeText: { color: Colors.textSecondary, fontSize: 16 },
  actionText: { color: Colors.accent, fontSize: 16, fontWeight: "600" },
  headerTitle: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  scroll: { flexGrow: 0 },
  body: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xl },
  entityTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: Spacing.xs },
  label: {
    color: Colors.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  value: { color: Colors.text, fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.bg,
    marginTop: Spacing.xs,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  childSection: { marginTop: Spacing.sm },
  loadingText: { color: Colors.textTertiary, fontSize: 14, marginTop: Spacing.xs },
  emptyText: { color: Colors.textTertiary, fontSize: 14, fontStyle: "italic", marginTop: Spacing.xs },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.xs,
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  childRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  childRowInactive: { opacity: 0.5 },
  childDot: { marginTop: 1 },
  childTitle: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: "500" },
  childTitleInactive: { color: Colors.textSecondary },
  childStatus: { fontSize: 12, color: Colors.textTertiary },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  deleteButton: {
    backgroundColor: "#B42318",
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  deleteText: { color: Colors.textInverse, fontWeight: "700" },
});
