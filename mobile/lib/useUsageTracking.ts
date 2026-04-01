import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

type UsageEntry = { count: number; lastAt: number };
type UsageMap = Record<string, UsageEntry>;

const STORAGE_KEY_PREFIX = "usageCount:";

/** Returns a stable comparator: most-used first, ties broken by most-recent. */
function byUsage(map: UsageMap) {
  return (a: string, b: string) => {
    const ea = map[a] ?? { count: 0, lastAt: 0 };
    const eb = map[b] ?? { count: 0, lastAt: 0 };
    if (eb.count !== ea.count) return eb.count - ea.count;
    return eb.lastAt - ea.lastAt;
  };
}

/**
 * Tracks how often items are opened and provides a sort function.
 *
 * @param namespace  Unique key suffix (e.g. "quests", "projects")
 */
export function useUsageTracking(namespace: string) {
  const storageKey = STORAGE_KEY_PREFIX + namespace;
  const [usageMap, setUsageMap] = useState<UsageMap>({});
  const mapRef = useRef<UsageMap>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as UsageMap;
          mapRef.current = parsed;
          setUsageMap(parsed);
        }
      } catch {
        // ignore read errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  /** Call this whenever an item is opened. */
  const recordUsage = useCallback(
    async (id: string) => {
      const prev = mapRef.current[id] ?? { count: 0, lastAt: 0 };
      const updated: UsageEntry = { count: prev.count + 1, lastAt: Date.now() };
      const next = { ...mapRef.current, [id]: updated };
      mapRef.current = next;
      setUsageMap(next);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore write errors
      }
    },
    [storageKey]
  );

  /**
   * Sort an array of items by usage frequency (most used first).
   * Items with no recorded usage keep their original relative order at the end.
   */
  const sortByUsage = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      return [...items].sort((a, b) => byUsage(mapRef.current)(a.id, b.id));
    },
    []
  );

  /**
   * Sort an array of section objects `{ title, data }` by the highest usage
   * count of any item in each section (most active section first).
   */
  const sortSectionsByUsage = useCallback(
    <T extends { id: string }>(
      sections: Array<{ title: string; data: T[] }>
    ): Array<{ title: string; data: T[] }> => {
      const cmp = byUsage(mapRef.current);
      return [...sections].sort((sA, sB) => {
        const topA = sA.data
          .map((i) => i.id)
          .sort(cmp)[0];
        const topB = sB.data
          .map((i) => i.id)
          .sort(cmp)[0];
        if (!topA && !topB) return 0;
        if (!topA) return 1;
        if (!topB) return -1;
        return cmp(topA, topB);
      });
    },
    []
  );

  return { usageMap, recordUsage, sortByUsage, sortSectionsByUsage };
}
