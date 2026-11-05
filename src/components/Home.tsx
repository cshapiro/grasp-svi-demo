export default function Home() {
  return <main className="portfolio">
    <header className="homeHero">
      <div><p className="byline">Cathy Shapiro · Front-end development</p>
      <h1>Mapping social vulnerability</h1>
      <p>Two Tennessee counties rank less than a third of a percentile point apart in social vulnerability. Why do their reported stroke death rates look so different?</p>
      <a className="mapLink" href="#/tennessee">Explore the Tennessee comparison →</a></div>
      <figure><img src="/tennessee.svg" alt="Tennessee county boundaries with Gibson highlighted in rust and Warren in purple"/><figcaption>Gibson and Warren counties, Tennessee</figcaption></figure>
    </header>
    <section><h2>Project goals</h2><p>Help an analyst find counties with similar vulnerability, compare their health outcomes, and decide where to investigate next. The Tennessee view links all 95 counties across a map, scatterplot, and keyboard-accessible comparison table. The national view puts each county’s vulnerability in context.</p></section>
    <div className="homeViews">
      <a href="#/tennessee"><h2>Tennessee stroke comparison ↗</h2><p>Compare 2022 national SVI percentiles with 2021–2023 age-adjusted stroke mortality among adults 35 and older.</p></a>
      <a href="#/national"><h2>U.S. vulnerability explorer ↗</h2><p>Explore four SVI themes, inspect a county, and see how population is distributed across vulnerability levels.</p></a>
    </div>
    <section><h2>How it’s built</h2><dl>
      <dt>React + TypeScript</dt><dd>Keep the selected counties and percentile band synchronized across views.</dd>
      <dt>OpenLayers + D3</dt><dd>Draw interactive county boundaries and link them to chart selections.</dd>
      <dt>TopoJSON + county FIPS</dt><dd>Join Census boundaries with CDC records using five-digit county identifiers.</dd>
      <dt>Vite + Railway</dt><dd>Build static assets and serve the application from a web server. Tennessee data is bundled for a reproducible demo.</dd>
    </dl></section>
    <footer>
      <p>This is an independent portfolio project by Cathy Shapiro. Use of these data and links does not imply endorsement by CDC, ATSDR, HHS, or the U.S. Government.</p>
      <p><a href="https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html">CDC/ATSDR Social Vulnerability Index 2022, U.S. database</a> · <a href="https://data.cdc.gov/d/cpdh-8cna">CDC stroke mortality data</a>, Tennessee county subset, under the <a href="https://opendatacommons.org/licenses/odbl/1-0/">Open Database License (ODbL 1.0)</a>.</p>
      <p><a href="/data/us-atlas-LICENSE.txt">US Atlas license notice</a> · <a href="https://github.com/cshapiro/grasp-svi-demo">GitHub repository</a></p>
    </footer>
  </main>;
}

