import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string) {
  const subscribeToQuery = useCallback(
    (onStoreChange: () => void) => subscribe(query, onStoreChange),
    [query],
  )
  const getQuerySnapshot = useCallback(() => getSnapshot(query), [query])

  return useSyncExternalStore(
    subscribeToQuery,
    getQuerySnapshot,
    getServerSnapshot,
  )
}

function subscribe(query: string, onStoreChange: () => void) {
  const mediaQueryList = window.matchMedia(query)

  mediaQueryList.addEventListener("change", onStoreChange)

  return () => mediaQueryList.removeEventListener("change", onStoreChange)
}

function getSnapshot(query: string) {
  return window.matchMedia(query).matches
}

function getServerSnapshot() {
  return false
}
