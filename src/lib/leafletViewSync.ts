/**
 * Map react-globe.gl POV altitude (used by bboxFromPointOfView) ↔ Leaflet zoom
 * so ADSB feed bbox stays consistent when switching 2D/3D.
 */
export function leafletZoomToGlobeCameraAltitude(zoom: number): number {
  const z = Math.max(1, Math.min(19, zoom));
  return Math.max(0.06, Math.min(2.92, 3.08 - z * 0.157));
}

export function globeAltitudeToLeafletZoom(alt: number): number {
  const a = Number.isFinite(alt) ? Math.max(0.06, Math.min(2.92, alt)) : 0.4;
  const z = Math.round((3.08 - a) / 0.157);
  return Math.max(2, Math.min(18, z));
}
