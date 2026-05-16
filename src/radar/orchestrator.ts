"use client";

import { useCallback, useMemo } from "react";
import { pointInBBox, type Aircraft } from "@/lib/opensky";
import { HER } from "@/radar/constants";
import { pickLoveQuip } from "@/lib/loveQuips";
import { useAirportLabelsPipeline } from "@/radar/pipelines/airportLabels.pipeline";
import { useBirthdayBannerPipeline } from "@/radar/pipelines/birthdayBanner.pipeline";
import { useFollowModePipeline } from "@/radar/pipelines/followMode.pipeline";
import { useFlightContextPipeline } from "@/radar/pipelines/flightContext.pipeline";
import { useGeolocationTrackPipeline } from "@/radar/pipelines/geolocationTrack.pipeline";
import { useGiftEasterEggPipeline } from "@/radar/pipelines/giftEasterEgg.pipeline";
import { useGlobeCameraPipeline } from "@/radar/pipelines/globeCamera.pipeline";
import { useMetarStationPipeline } from "@/radar/pipelines/metarStation.pipeline";
import { useOpenSkyFeedPipeline } from "@/radar/pipelines/openskyFeed.pipeline";
import { useSearchCommandPipeline } from "@/radar/pipelines/searchCommand.pipeline";
import { useSelectionPipeline } from "@/radar/pipelines/selection.pipeline";
import { useSmoothFleetPipeline } from "@/radar/pipelines/smoothFleet.pipeline";
import { useToastPipeline } from "@/radar/pipelines/toast.pipeline";
import { useTrailHistoryPipeline } from "@/radar/pipelines/trailHistory.pipeline";
import { useViewBoundsPipeline } from "@/radar/pipelines/viewBounds.pipeline";
import { useWatchlistPipeline } from "@/radar/pipelines/watchlist.pipeline";

/**
 * Single wiring layer: viewBounds → openSky feed → smooth fleet →
 * selection / trails / search / watch / metar / follow / camera / gift / birthday.
 * UI reads only this hook — no feature logic in components.
 */
export function useRadarApp() {
  const toast = useToastPipeline();
  const view = useViewBoundsPipeline();
  const feed = useOpenSkyFeedPipeline(view.feedBBox);
  const smoothed = useSmoothFleetPipeline(feed.rawAircraft, feed.dataUpdatedAt);

  const fleetInViewport = useMemo(
    () => smoothed.filter((a) => pointInBBox(a.lat, a.lng, view.viewportBBox)),
    [smoothed, view.viewportBBox],
  );

  const selection = useSelectionPipeline(smoothed);
  const flightContext = useFlightContextPipeline(selection.selected);
  const camera = useGlobeCameraPipeline();
  const follow = useFollowModePipeline();
  const metar = useMetarStationPipeline();

  const locate = useGeolocationTrackPipeline({
    snapPovTo: camera.snapPovTo,
    syncFeedForPov: view.syncBboxFromGlobeAlt,
    onStart: () => {
      follow.resetFollow();
      toast.pushLove("locate_me_on");
    },
    onStop: () => toast.pushLove("locate_me_off"),
    onGeoError: (msg) => {
      const q = pickLoveQuip("locate_me_fail");
      toast.push({ tag: q.tag, line: `${q.line} — ${msg}`, hue: q.hue });
    },
  });
  const birthday = useBirthdayBannerPipeline();

  const gift = useGiftEasterEggPipeline({
    onSecretOpen: () => toast.pushLove("gift_open"),
  });

  const flyToAircraft = useCallback(
    (a: Aircraft) => {
      locate.cancelLocateMe();
      toast.pushLove("plane_lock");
      selection.selectByIcao(a.icao24);
      camera.nudgeTo(a.lat, a.lng, 0.38);
    },
    [locate.cancelLocateMe, toast.pushLove, selection.selectByIcao, camera.nudgeTo],
  );

  const search = useSearchCommandPipeline({
    fleetAll: smoothed,
    fleetViewport: fleetInViewport,
    onFlyTo: flyToAircraft,
    onPaletteOpen: () => toast.pushLove("palette_open"),
  });

  const watch = useWatchlistPipeline({
    fleet: fleetInViewport,
    onWatchSpotted: (label) => toast.pushLove("watch_spotted", label),
  });

  const trail = useTrailHistoryPipeline({
    fleet: smoothed,
    selectedIcao: selection.selectedIcao,
    dataUpdatedAt: feed.dataUpdatedAt,
  });
  const airportLabels = useAirportLabelsPipeline(view.pov);

  const onGlobePick = useCallback(
    (a: Aircraft | null) => {
      if (!a) {
        toast.pushLove("sky_clear");
        selection.clearSelection();
      } else {
        toast.pushLove("plane_lock");
        selection.selectByIcao(a.icao24);
      }
    },
    [toast.pushLove, selection.clearSelection, selection.selectByIcao],
  );

  const onAirportPick = useCallback(
    (icao: string) => {
      metar.setMetarStation(icao);
      toast.pushLove("airport", icao);
    },
    [metar.setMetarStation, toast.pushLove],
  );

  const clearSheet = useCallback(() => {
    toast.pushLove("close_sheet");
    follow.resetFollow();
    selection.clearSelection();
  }, [toast.pushLove, follow.resetFollow, selection.clearSelection]);

  const toggleWatchForSelection = useCallback(() => {
    const icao = selection.selectedIcao;
    if (!icao) return;
    const added = watch.toggleIcao(icao);
    if (typeof added !== "boolean") return;
    toast.pushLove(added ? "watch_on" : "watch_off");
  }, [watch.toggleIcao, selection.selectedIcao, toast.pushLove]);

  const toggleFollow = useCallback(() => {
    follow.setFollow((prev) => {
      const next = !prev;
      if (next) locate.cancelLocateMe();
      queueMicrotask(() => toast.pushLove(next ? "follow_on" : "follow_off"));
      return next;
    });
  }, [follow.setFollow, toast.pushLove, locate.cancelLocateMe]);

  const refreshFeed = useCallback(() => {
    toast.pushLove("refresh");
    void feed.refetch();
  }, [toast.pushLove, feed.refetch]);

  const flyToFirstMatch = useCallback(() => {
    const hit = search.filtered[0];
    if (hit) flyToAircraft(hit);
  }, [search.filtered, flyToAircraft]);

  const onMetarBubbleTap = useCallback(() => {
    toast.pushLove("metar_click");
  }, [toast.pushLove]);

  return {
    HER,
    toast,
    view,
    feed,
    smoothed,
    selection,
    flightContext,
    follow,
    metar,
    birthday,
    gift,
    search: { ...search, flyToFirstMatch },
    watch,
    trail,
    airportLabels,
    camera: camera.camera,
    locatingMe: locate.locatingMe,
    lastGeoFix: locate.lastGeoFix,
    toggleLocateMe: locate.toggleLocateMe,
    flyToAircraft,
    onGlobePick,
    onAirportPick,
    clearSheet,
    toggleWatchForSelection,
    toggleFollow,
    refreshFeed,
    onMetarBubbleTap,
  };
}
