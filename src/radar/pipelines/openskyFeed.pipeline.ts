"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAdsbLolStates } from "@/radar/fetchAdsbLol";
import { snapFeedBBox, type BBox } from "@/lib/opensky";

function bboxKey(b: BBox): string {
  return `${b.lamin},${b.lomin},${b.lamax},${b.lomax}`;
}

/** Live traffic via [ADSB.lol](https://adsb.lol) API (proxied). */
export function useOpenSkyFeedPipeline(bbox: BBox) {
  const snapped = useMemo(() => snapFeedBBox(bbox), [bbox.lamin, bbox.lomin, bbox.lamax, bbox.lomax]);

  const q = useQuery({
    queryKey: ["adsb-lol", bboxKey(snapped)],
    queryFn: () => fetchAdsbLolStates(snapped),
    staleTime: 12_000,
    gcTime: 120_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
    retryDelay: 3_000,
  });

  return {
    rawAircraft: q.data ?? [],
    dataUpdatedAt: q.dataUpdatedAt,
    isFetching: q.isFetching,
    /** True only until first successful fetch (not background refetch). */
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
  };
}
