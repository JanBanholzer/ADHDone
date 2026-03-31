import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Keep prior order for known ids; append any new ids at the end. */
export function mergeOrderIds(
  storedIds: string[] | null,
  currentIds: string[]
): string[] {
  if (!storedIds?.length) return [...currentIds];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of storedIds) {
    if (currentIds.includes(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of currentIds) {
    if (!seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  return out;
}

export function orderItemsByIds<T extends { id: string }>(
  items: T[],
  orderIds: string[]
): T[] {
  const map = new Map(items.map((i) => [i.id, i] as const));
  const out: T[] = [];
  for (const id of orderIds) {
    const x = map.get(id);
    if (x) out.push(x);
  }
  return out;
}

export function usePersistedLocalOrder<T extends { id: string }>(
  storageKey: string,
  items: T[]
) {
  const [storedIds, setStoredIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!cancelled) {
          setStoredIds(raw ? (JSON.parse(raw) as string[]) : null);
        }
      } catch {
        if (!cancelled) setStoredIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const currentIds = useMemo(() => items.map((i) => i.id), [items]);

  const mergedIds = useMemo(
    () => mergeOrderIds(storedIds, currentIds),
    [storedIds, currentIds]
  );

  const ordered = useMemo(
    () => orderItemsByIds(items, mergedIds),
    [items, mergedIds]
  );

  const onDragEnd = useCallback(
    async (data: T[]) => {
      const ids = data.map((i) => i.id);
      setStoredIds(ids);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        // ignore persistence errors
      }
    },
    [storageKey]
  );

  return { ordered, onDragEnd };
}
