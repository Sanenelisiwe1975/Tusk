import { useMemo, useState } from "react";
import { useEntries } from "./useEntries";

export function useReplay() {
  const { data = [] } = useEntries();

  const [timestamp, setTimestamp] = useState(Date.now());
  
  const visibleEntries = useMemo(
    () => data.filter((e) => e.createdAt <= timestamp), [data, timestamp]
  );


  return {
    timestamp,
    setTimestamp,
    visibleEntries
  };

}