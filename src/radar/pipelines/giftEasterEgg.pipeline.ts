"use client";

import { useCallback, useRef, useState } from "react";

/** Gift modal + triple-tap title easter egg — isolated from flight data. */
export function useGiftEasterEggPipeline(input?: { onSecretOpen?: () => void }) {
  const [giftOpen, setGiftOpen] = useState(false);
  const titleClicks = useRef(0);
  const titleClickTimer = useRef<number>(0);

  const onTitleTap = useCallback(() => {
    titleClicks.current += 1;
    window.clearTimeout(titleClickTimer.current);
    titleClickTimer.current = window.setTimeout(() => {
      titleClicks.current = 0;
    }, 600);
    if (titleClicks.current >= 3) {
      titleClicks.current = 0;
      input?.onSecretOpen?.();
      setGiftOpen(true);
    }
  }, [input?.onSecretOpen]);

  return { giftOpen, setGiftOpen, onTitleTap };
}
