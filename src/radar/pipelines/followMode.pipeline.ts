"use client";

import { useCallback, useState } from "react";

/** Chase camera toggle — only UI flag; orchestrator gates globe follow on selected aircraft. */
export function useFollowModePipeline() {
  const [follow, setFollow] = useState(false);

  const reset = useCallback(() => setFollow(false), []);

  return { follow, setFollow, resetFollow: reset };
}
