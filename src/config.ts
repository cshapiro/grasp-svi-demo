/**
 * CDC/ATSDR GRASP OneMap — SVI 2022 service configuration.
 *
 * The app queries the live ArcGIS REST service in the browser; if the
 * service is unreachable it falls back to the bundled 2022 snapshot
 * (src/data/svi-county-2022.json) so the demo always works.
 */
export const SVI_SERVICE_ROOT =
  "https://onemap.cdc.gov/onemapservices/rest/services/SVI/CDC_ATSDR_Social_Vulnerability_Index_2022_USA/MapServer";

/** Pattern used to find the county-level layer in the service's layer list. */
export const COUNTY_LAYER_PATTERN = /county/i;

/** Fields requested from the service (official SVI 2022 column names). */
export const SVI_OUT_FIELDS = [
  "FIPS",
  "COUNTY",
  "STATE",
  "ST_ABBR",
  "E_TOTPOP",
  "RPL_THEMES",
  "RPL_THEME1",
  "RPL_THEME2",
  "RPL_THEME3",
  "RPL_THEME4",
] as const;

/** Milliseconds before giving up on the live service and using the snapshot. */
export const LIVE_FETCH_TIMEOUT_MS = 12_000;
