import {
  SVI_SERVICE_ROOT,
  COUNTY_LAYER_PATTERN,
  SVI_OUT_FIELDS,
  LIVE_FETCH_TIMEOUT_MS,
} from "../config";
import snapshot from "../data/svi-county-2022.json";

/** One county's SVI record. Percentiles are 0–1; null = not ranked (-999 in the raw data). */
export interface CountySvi {
  fips: string;
  county: string;
  st: string;
  state: string;
  pop: number;
  overall: number | null;
  t1: number | null;
  t2: number | null;
  t3: number | null;
  t4: number | null;
}

export type ThemeKey = "overall" | "t1" | "t2" | "t3" | "t4";

export interface SviTheme {
  key: ThemeKey;
  label: string;
  short: string;
}

/** Official SVI 2022 theme names. */
export const THEMES: SviTheme[] = [
  { key: "overall", label: "Overall Social Vulnerability", short: "Overall" },
  { key: "t1", label: "Socioeconomic Status", short: "Socioeconomic" },
  { key: "t2", label: "Household Characteristics", short: "Household" },
  { key: "t3", label: "Racial & Ethnic Minority Status", short: "Minority Status" },
  { key: "t4", label: "Housing Type & Transportation", short: "Housing / Transport" },
];

export type DataSource = "live" | "snapshot";

export interface SviDataset {
  counties: CountySvi[];
  byFips: Map<string, CountySvi>;
  source: DataSource;
}

function buildDataset(counties: CountySvi[], source: DataSource): SviDataset {
  const byFips = new Map<string, CountySvi>();
  for (const c of counties) byFips.set(c.fips, c);
  return { counties, byFips, source };
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/** -999 is the SVI convention for "not ranked". */
function pctl(v: unknown): number | null {
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

/**
 * Load county SVI attributes from the live GRASP OneMap ArcGIS service.
 * 1. Read the MapServer's layer list and find the county layer.
 * 2. Page through /query (attributes only, no geometry) until complete.
 */
async function loadLive(signal: AbortSignal): Promise<CountySvi[]> {
  const root = (await fetchJson(`${SVI_SERVICE_ROOT}?f=json`, signal)) as {
    layers?: { id: number; name: string }[];
  };
  const layer = root.layers?.find((l) => COUNTY_LAYER_PATTERN.test(l.name));
  if (!layer) throw new Error("No county layer found in SVI service");

  const counties: CountySvi[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: SVI_OUT_FIELDS.join(","),
      returnGeometry: "false",
      orderByFields: "FIPS",
      resultOffset: String(offset),
      resultRecordCount: "2000",
      f: "json",
    });
    const page = (await fetchJson(
      `${SVI_SERVICE_ROOT}/${layer.id}/query?${params}`,
      signal,
    )) as {
      error?: { message?: string };
      features?: { attributes: Record<string, unknown> }[];
      exceededTransferLimit?: boolean;
    };
    if (page.error) throw new Error(page.error.message ?? "ArcGIS query error");
    const feats = page.features ?? [];
    for (const f of feats) {
      const a = f.attributes;
      counties.push({
        fips: String(a.FIPS ?? "").padStart(5, "0"),
        county: String(a.COUNTY ?? ""),
        st: String(a.ST_ABBR ?? ""),
        state: String(a.STATE ?? ""),
        pop: Number(a.E_TOTPOP) || 0,
        overall: pctl(a.RPL_THEMES),
        t1: pctl(a.RPL_THEME1),
        t2: pctl(a.RPL_THEME2),
        t3: pctl(a.RPL_THEME3),
        t4: pctl(a.RPL_THEME4),
      });
    }
    offset += feats.length;
    if (!page.exceededTransferLimit || feats.length === 0) break;
  }
  if (counties.length < 3000) {
    throw new Error(`Live service returned only ${counties.length} counties`);
  }
  return counties;
}

/** Load SVI data: live OneMap service first, bundled snapshot as fallback. */
export async function loadSvi(): Promise<SviDataset> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LIVE_FETCH_TIMEOUT_MS);
  try {
    const counties = await loadLive(ctrl.signal);
    return buildDataset(counties, "live");
  } catch {
    return buildDataset(snapshot as CountySvi[], "snapshot");
  } finally {
    clearTimeout(timer);
  }
}

