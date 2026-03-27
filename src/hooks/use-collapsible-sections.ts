import { useState, useCallback } from "react";

/**
 * Hook to manage collapsible section state with session persistence.
 * @param namespace - unique key prefix per dashboard (e.g. "fighter-analytics")
 */
export function useCollapsibleSections(namespace: string) {
  const storageKey = `collapsible-${namespace}`;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggle = useCallback((sectionId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const isCollapsed = useCallback((sectionId: string) => !!collapsed[sectionId], [collapsed]);

  return { toggle, isCollapsed };
}
