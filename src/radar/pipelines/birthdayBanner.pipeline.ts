"use client";

import { useMemo } from "react";
import { BIRTHDAY_ISO } from "@/radar/constants";

function daysUntilNextBirthday(iso: string): number | null {
  const born = new Date(iso);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  const y = now.getFullYear();
  let next = new Date(y, born.getMonth(), born.getDate(), 23, 59, 59);
  if (next < now) next = new Date(y + 1, born.getMonth(), born.getDate(), 23, 59, 59);
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86400000));
}

export function useBirthdayBannerPipeline() {
  return useMemo(() => {
    if (!BIRTHDAY_ISO) return { birthdayDays: null as number | null };
    return { birthdayDays: daysUntilNextBirthday(BIRTHDAY_ISO) };
  }, []);
}
