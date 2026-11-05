# Mapping Social Vulnerability

Independent front-end portfolio project by Cathy Shapiro. The homepage introduces the project goals, stack, and two interactive maps.

- **Tennessee comparison** (/#/tennessee) joins 2022 SVI and CDC 2021–2023 stroke mortality records by county FIPS. All 95 counties have boundaries and published rates. Gibson and Warren open as an example. County comparisons describe differences and cannot establish a cause.
- **U.S. SVI explorer** (/#/national) displays national SVI rankings with linked county and population charts.
- **Deployment** uses a Node build stage and Nginx serving the Vite output on Railway’s assigned port. The Tennessee view uses bundled data. The national view first queries OneMap and falls back to a local snapshot.
## National explorer

Interactive demo built on CDC/ATSDR GRASP data products: a county-level
choropleth of the **Social Vulnerability Index 2022** with linked D3 charts.

- **Map** — OpenLayers choropleth of all 3,144 U.S. counties, colored by
  overall SVI or any of the four themes (Socioeconomic Status, Household
  Characteristics, Racial & Ethnic Minority Status, Housing Type &
  Transportation). Hover for a tooltip, click to select.
- **Selected county card** — D3 bar breakdown of the county's percentile on
  every theme; click a row to map that theme.
- **Distribution chart** — D3 population-weighted histogram: how many people
  live at each vulnerability level, colored with the same ramp as the map so
  it doubles as the legend. The selected county is marked.
- **Live data** — attributes are queried from the GRASP OneMap ArcGIS REST
  service in the browser (`src/config.ts`); if the service is unreachable the
  app falls back to a bundled SVI 2022 snapshot, and the badge in the header
  shows which source is active. County boundaries are U.S. Census Bureau
  cartographic boundaries via the `us-atlas` TopoJSON package, so the map
  itself needs no tile server and works offline.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build: `npm run build`, then `npm run preview`.

## Stack

React 19 + TypeScript + Vite · OpenLayers 10 (map) · D3 7 (charts) ·
topojson-client + us-atlas (boundaries)

## Data sources and notices

This is an independent portfolio project by Cathy Shapiro. Use of these data and links does not imply endorsement by CDC, ATSDR, HHS, or the U.S. Government.

- CDC/ATSDR, Geospatial Research, Analysis, and Services Program. [CDC/ATSDR Social Vulnerability Index 2022, U.S. database](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html).
- CDC, Division for Heart Disease and Stroke Prevention. [Stroke Mortality Data Among US Adults (35+) by State/Territory and County, 2021–2023](https://data.cdc.gov/d/cpdh-8cna). The [bundled Tennessee county subset](src/data/tn-stroke-2021-2023.json) is available under the [Open Database License (ODbL 1.0)](https://opendatacommons.org/licenses/odbl/1-0/). It includes the overall sex and race/ethnicity records.
- County boundaries come from the U.S. Census Bureau via US Atlas. The [US Atlas copyright and permission notice](public/data/us-atlas-LICENSE.txt) accompanies the distributed map data.
