import { useEffect, useState } from "react";
import SviMap from "./components/SviMap";
import Histogram from "./components/Histogram";
import CountyDetail from "./components/CountyDetail";
import { loadSvi, THEMES, type SviDataset, type ThemeKey } from "./lib/sviData";

import Tennessee from "./components/Tennessee";

import Home from "./components/Home";

export default function App() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    function navigate() {
      setRoute(window.location.hash);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  return <>
    <nav className="views" aria-label="Project navigation">
      <a href="#/">Project overview</a>
      <a href="#/tennessee">Tennessee comparison</a>
      <a href="#/national">U.S. SVI explorer</a>
    </nav>
    {route === "#/tennessee" ? <Tennessee /> : route === "#/national" ? <National /> : <Home />}
  </>;
}

function National() {
  const [dataset, setDataset] = useState<SviDataset | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("overall");
  const [selectedFips, setSelectedFips] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSvi().then((ds) => {
      if (!cancelled) setDataset(ds);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTheme = THEMES.find((t) => t.key === theme)!;
  const selected = selectedFips ? (dataset?.byFips.get(selectedFips) ?? null) : null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>SVI County Explorer</h1>
          <p className="subtitle">
            Place &amp; health: social vulnerability across 3,144 U.S. counties —
            CDC/ATSDR Social Vulnerability Index 2022
          </p>
        </div>
        {dataset && (
          <span
            className={`badge badge-${dataset.source}`}
            title={
              dataset.source === "live"
                ? "Data queried live from the GRASP OneMap ArcGIS REST service"
                : "OneMap service unreachable — using the bundled SVI 2022 snapshot"
            }
          >
            {dataset.source === "live" ? "● Live: GRASP OneMap" : "○ Bundled snapshot (2022)"}
          </span>
        )}
      </header>

      <nav className="theme-bar" aria-label="SVI theme">
        {THEMES.map((t) => (
          <button
            key={t.key}
            className={t.key === theme ? "theme-btn active" : "theme-btn"}
            onClick={() => setTheme(t.key)}
          >
            {t.short}
          </button>
        ))}
      </nav>

      <main className="layout">
        <section className="map-panel" aria-label="Choropleth map">
          {dataset ? (
            <SviMap
              dataset={dataset}
              theme={theme}
              selectedFips={selectedFips}
              onSelect={setSelectedFips}
            />
          ) : (
            <div className="loading">Loading SVI data…</div>
          )}
          <div className="map-caption">
            Darker = higher <strong>{activeTheme.label.toLowerCase()}</strong> percentile ·
            gray = not ranked
          </div>
        </section>

        <aside className="side-panel">
          <div className="card">
            <h2>Selected county</h2>
            <CountyDetail county={selected} theme={theme} onThemeSelect={setTheme} />
          </div>
          <div className="card">
            <h2>Distribution — {activeTheme.short}</h2>
            {dataset && (
              <Histogram dataset={dataset} theme={theme} selectedFips={selectedFips} />
            )}
          </div>
        </aside>
      </main>

      <footer className="app-footer">
        <a href="https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html">CDC/ATSDR Social Vulnerability Index 2022, U.S. database</a>. U.S. Census county boundaries via US Atlas. <a href="/data/us-atlas-LICENSE.txt">US Atlas license notice</a>. This is an independent portfolio project by Cathy Shapiro. Use of these data and links does not imply endorsement by CDC, ATSDR, HHS, or the U.S. Government.
      </footer>
    </div>
  );
}

