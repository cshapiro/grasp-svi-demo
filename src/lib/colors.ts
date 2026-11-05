/**
 * Choropleth color scale: 7-class quantized sequential blue ramp
 * (light -> dark = low -> high vulnerability percentile).
 */
export const SEQ_RAMP = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
] as const;

/** Fill for counties with no ranking in the selected theme. */
export const MISSING_FILL = "#e1e0d9";

/** Accent used for the selected county (categorical slot 2 orange). */
export const SELECT_ACCENT = "#eb6834";

export const N_CLASSES = SEQ_RAMP.length;

/** Class index (0..6) for a percentile in [0, 1]. */
export function classIndex(v: number): number {
  return Math.max(0, Math.min(N_CLASSES - 1, Math.floor(v * N_CLASSES)));
}

/** Fill color for a percentile (or missing). */
export function fillFor(v: number | null): string {
  return v == null ? MISSING_FILL : SEQ_RAMP[classIndex(v)];
}

/** Ink color that stays readable on a given ramp class (dark text on light classes). */
export function inkOn(v: number): string {
  return classIndex(v) >= 3 ? "#ffffff" : "#0b0b0b";
}
