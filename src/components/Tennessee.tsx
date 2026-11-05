import { useMemo, useRef, useState } from "react";
import { pointer, scaleLinear } from "d3";
import snapshot from "../data/svi-county-2022.json";
import mortality from "../data/tn-stroke-2021-2023.json";
import { THEMES, type SviDataset } from "../lib/sviData";
import SviMap from "./SviMap";

const counties = snapshot.filter(c => c.st === "TN").sort((a,b) => a.county.localeCompare(b.county));
const dataset: SviDataset = { counties, byFips: new Map(counties.map(c => [c.fips, c])), source: "snapshot" };
const rates = new Map(mortality.map(r => [r.locationid, Number.parseFloat(r.data_value)]));
const x = scaleLinear([0,100], [48,492]);
const y = scaleLinear([0, Math.max(...Array.from(rates.values()).filter(Number.isFinite))], [202,18]).nice();
const example: [string,string] = ["47053","47177"];
const exampleBand: [number,number] = [77,80];
const pct = (v: number | null) => v == null ? "Unranked" : (100*v).toFixed(2);
function rate(id: string) {
  const value = rates.get(id);
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export default function Tennessee() {
  const [pins,setPins] = useState<[string,string]>(example);
  const [slot,setSlot] = useState<0|1>(0);
  const [band,setBand] = useState<[number,number]>(exampleBand);
  const drag = useRef<number|null>(null);
  const matched = useMemo(() => new Set(counties.filter(c => c.overall != null && c.overall*100 >= band[0] && c.overall*100 <= band[1]).map(c=>c.fips)), [band]);
  function pin(id: string|null, target = slot) {
    if (!id || !dataset.byFips.has(id)) return;
    const next: [string,string] = [...pins];
    if (next[1-target] === id) next[1-target] = next[target];
    next[target] = id;
    setPins(next);
  }
  const rows = pins.map(id => dataset.byFips.get(id)!);
  function position(e: React.PointerEvent<SVGSVGElement>) {
    return Math.max(0,Math.min(100,Math.round(x.invert(pointer(e.nativeEvent,e.currentTarget)[0]))));
  }
  const a = rate(pins[0]), b = rate(pins[1]);
  return <main className="tn">
    <header><h1>Tennessee stroke mortality</h1><p>How do stroke death rates vary among counties with similar social vulnerability?</p></header>
    <div className="tn-grid">
      <section><h2>County vulnerability</h2>
        <SviMap tennessee dataset={dataset} theme="overall" selectedFips={pins[0]} secondFips={pins[1]} inBand={matched} onSelect={pin} />
        <p className="note">Darker blue indicates higher national SVI. Gray counties fall outside the selected band. Outlines mark the comparison pair.</p>
      </section>
      <section><h2>Stroke deaths and vulnerability</h2>
        <p className="note">2021–2023 · Age-adjusted deaths per 100,000 adults aged 35+</p>
        <svg className="scatter" viewBox="0 0 510 240" aria-label="Tennessee county stroke mortality versus national SVI percentile. Adjust the percentile band with the fields below."
          onPointerDown={e=>{drag.current=position(e); e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(drag.current!==null){const end=position(e); if(end!==drag.current)setBand([Math.min(end,drag.current),Math.max(end,drag.current)]);}}}
          onPointerCancel={()=>{drag.current=null;}}
          onPointerUp={e=>{const start=drag.current; drag.current=null; if(start===null)return; const end=position(e);
            if(Math.abs(end-start)>0){setBand([Math.min(end,start),Math.max(end,start)]);return;}
            const [px,py]=pointer(e.nativeEvent,e.currentTarget);
            const nearest=counties.map(c=>({id:c.fips,d:c.overall===null||rate(c.fips)===null?Infinity:Math.hypot(x(c.overall*100)-px,y(rate(c.fips)!)-py)})).sort((u,v)=>u.d-v.d)[0];
            if(nearest.d<=10)pin(nearest.id);
          }}>
          <rect x={x(band[0])} width={x(band[1])-x(band[0])} y="14" height="188" fill="#dceee9"/>
          {y.ticks(5).map(v=><g key={v}><line x1="48" x2="492" y1={y(v)} y2={y(v)} stroke="#d3dad8"/><text x="40" y={y(v)+4} textAnchor="end">{v}</text></g>)}
          {[0,25,50,75,100].map(v=><text key={v} x={x(v)} y="220" textAnchor="middle">{v}</text>)}
          <text x="270" y="238" textAnchor="middle">National SVI percentile · 2022</text>
          {[...counties].sort((u,v)=>Number(pins.includes(u.fips))-Number(pins.includes(v.fips))).map(c=>{
            const r=rate(c.fips); if(c.overall===null||r===null)return null;
            const index = pins.indexOf(c.fips);
            const cx = x(c.overall*100), cy = y(r);
            const color = index === 0 ? "#983d14" : "#563595";
            return <g key={c.fips} transform={`translate(${cx},${cy})`}>
              <title>{c.county} · {pct(c.overall)} percentile · {r} deaths per 100,000</title>
              {index === 1 ? <path d="M0,-6 L6,0 0,6 -6,0 Z" fill={color}/> :
                <circle r={index === 0 ? 5 : 3.4} fill={index === 0 ? color : matched.has(c.fips) ? "#145d66" : "#98a8ad"}/>}
              {index >= 0 && <text x={cx > 380 ? -8 : 8} y={index === 0 ? 13 : -7} textAnchor={cx > 380 ? "end" : "start"} style={{fill:color, fontWeight:700, paintOrder:"stroke", stroke:"white", strokeWidth:3}}>{index === 0 ? "A" : "B"} · {c.county.replace(/ County$/, "")}</text>}
            </g>;
          })}
        </svg>
        <div className="band"><strong>Percentile band</strong>{band.map((v,i)=><label key={i}>{i?"Max":"Min"} <input type="number" min={i?band[0]:0} max={i?100:band[1]} value={v} onChange={e=>{
          const n=e.target.valueAsNumber; if(Number.isFinite(n))setBand(i?[band[0],Math.max(band[0],Math.min(100,n))]:[Math.min(band[1],Math.max(0,n)),band[1]]);
        }}/></label>)}<button onClick={()=>setBand([0,100])}>Show all</button></div>
        <p className="note" aria-live="polite">{matched.size} of 95 counties in band. Drag across the plot to change the band.</p>
      </section>
    </div>
    <section className="compare"><h2>Compare two counties</h2>
      <div className="band"><label>Map and chart clicks update <select value={slot} onChange={e=>setSlot(Number(e.target.value) as 0|1)}><option value="0">County A</option><option value="1">County B</option></select></label><button onClick={()=>{setPins(example);setBand(exampleBand);setSlot(0);}}>Restore Gibson–Warren example</button></div>
      <p className="gaps" aria-live="polite">
        <span>National SVI gap <strong>{rows[0].overall !== null && rows[1].overall !== null ? Math.abs((rows[0].overall-rows[1].overall)*100).toFixed(2) + " percentile points" : "Unavailable"}</strong></span>
        <span>Stroke mortality gap <strong>{a !== null && b !== null ? Math.abs(a-b).toFixed(1) + " deaths per 100,000" : "Unavailable"}</strong></span>
      </p>
      <table><thead><tr><th scope="col">Measure</th>{rows.map((c,i)=><th key={i} scope="col"><label><span aria-hidden="true" style={{color:i ? "#563595" : "#983d14"}}>{i ? "◆" : "●"}</span> County {i?"B":"A"} <select value={c.fips} onChange={e=>pin(e.target.value,i as 0|1)}>{counties.map(n=><option key={n.fips} value={n.fips}>{n.county}</option>)}</select></label></th>)}</tr></thead>
      <tbody><tr><th scope="row">Stroke deaths per 100,000</th>{pins.map(id=><td key={id}><strong>{rate(id)?.toFixed(1) ?? "Unavailable"}</strong></td>)}</tr>
      {THEMES.map(t=><tr key={t.key}><th scope="row">{t.label} percentile</th>{rows.map(c=><td key={c.fips}>{pct(c[t.key])}</td>)}</tr>)}</tbody></table>
    </section>
    <footer>County estimates describe places. Differences alone do not establish causes or statistical significance. SVI percentiles use the national 2022 reference. Stroke rates are spatially smoothed, age-adjusted three-year averages for 2021–2023, all races and sexes combined. Boundaries from U.S. Census via US Atlas.<p><a href="https://www.atsdr.cdc.gov/place-health/php/svi/">CDC/ATSDR Social Vulnerability Index</a> · <a href="https://data.cdc.gov/d/cpdh-8cna">CDC stroke mortality data</a> · <a href="https://www.cdc.gov/heart-disease-stroke-atlas/statistical-methods/index.html">Atlas methods</a></p></footer>
  </main>;
}
