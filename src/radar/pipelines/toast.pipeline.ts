"use client";

import { useCallback, useRef, useState } from "react";
import { pickLoveQuip, type LoveQuipKind } from "@/lib/loveQuips";
import type { ToastHue, ToastItem } from "@/radar/types";

export type ToastPushPayload = { tag: string; line: string; hue: ToastHue };

/** Toasts + themed love lines on interactions. */
export function useToastPipeline() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sideSeq = useRef(0);

  const push = useCallback((payload: ToastPushPayload) => {
    const id = Date.now() + Math.random();
    const side = sideSeq.current++ % 2 === 0 ? "left" : "right";
    setToasts((t) => [...t, { id, ...payload, side }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 6800);
  }, []);

  const pushLove = useCallback(
    (kind: LoveQuipKind, detail?: string) => {
      push(pickLoveQuip(kind, detail));
    },
    [push],
  );

  return { toasts, push, pushLove };
}
