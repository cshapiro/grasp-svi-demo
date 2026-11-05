import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { THEMES, type CountySvi, type ThemeKey } from "../lib/sviData";
import { fillFor } from "../lib/colors";

interface Props {
  county: CountySvi | null;
  theme: ThemeKey;
  onThemeSelect: (t: ThemeKey) => void;
}

const W = 340;
const ROW = 30;
const MARGIN = { top: 4, right: 44, bottom: 18, left: 128 };

/** Theme-by-theme percentile breakdown for the selected county. */
export default function CountyDetail({ county, theme, onThemeSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const H = MARGIN.top + ROW * THEMES.length + MARGIN.bottom;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    if (!county) return;

    const x = d3
      .scaleLinear()
      .domain([0, 1])
      .range([MARGIN.left, W - MARGIN.right]);

    const rows = THEMES.map((t) => ({ ...t, value: county[t.key] }));

    // Hairline grid at quartiles.
    svg
      .append("g")
      .selectAll("line")
      .data([0, 0.25, 0.5, 0.75, 1])
      .join("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", MARGIN.top)
      .attr("y2", H - MARGIN.bottom)
      .attr("stroke", (d) => (d === 0 ? "#c3c2b7" : "#e1e0d9"));

    const g = svg
      .selectAll("g.row")
      .data(rows)
      .join("g")
      .attr("class", "row")
      .attr("transform", (_d, i) => `translate(0,${MARGIN.top + i * ROW})`)
      .style("cursor", "pointer")
      .on("click", (_e, d) => onThemeSelect(d.key));

    g.append("rect") // row hit target
      .attr("x", 0)
      .attr("width", W)
      .attr("height", ROW)
      .attr("fill", "transparent");

    g.append("text")
      .attr("x", MARGIN.left - 8)
      .attr("y", ROW / 2 + 3.5)
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("font-weight", (d) => (d.key === theme ? 700 : 400))
      .attr("fill", (d) => (d.key === theme ? "#0b0b0b" : "#52514e"))
      .text((d) => d.short);

    // Bars: thin, rounded data-end, anchored at 0.
    g.filter((d) => d.value != null)
      .append("path")
      .attr("d", (d) => {
        const y0 = ROW / 2 - 6;
        const x0 = x(0);
        const x1 = Math.max(x(d.value as number), x0 + 2);
        const r = Math.min(4, (x1 - x0) / 2);
        return `M${x0},${y0} L${x1 - r},${y0} Q${x1},${y0} ${x1},${y0 + 4} L${x1},${y0 + 8} Q${x1},${y0 + 12} ${x1 - r},${y0 + 12} L${x0},${y0 + 12} Z`;
      })
      .attr("fill", (d) => fillFor(d.value));

    g.append("text")
      .attr("x", (d) => (d.value == null ? x(0) + 4 : x(d.value) + 6))
      .attr("y", ROW / 2 + 3.5)
      .attr("font-size", 11)
      .attr("font-variant-numeric", "tabular-nums")
      .attr("fill", (d) => (d.value == null ? "#898781" : "#0b0b0b"))
      .attr("font-weight", (d) => (d.key === theme ? 700 : 400))
      .text((d) => (d.value == null ? "n/a" : (d.value as number).toFixed(2)));

    svg
      .append("text")
      .attr("x", (MARGIN.left + W - MARGIN.right) / 2)
      .attr("y", H - 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "#898781")
      .text("National percentile rank by theme — click a row to map it");
  }, [county, theme, onThemeSelect, H]);

  if (!county) {
    return (
      <p className="detail-hint">
        Click a county on the map to see its theme-by-theme breakdown.
      </p>
    );
  }

  return (
    <div>
      <div className="detail-head">
        <h3>
          {county.county}, {county.st}
        </h3>
        <span className="detail-pop">
          Pop. {county.pop.toLocaleString()} · FIPS {county.fips}
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`SVI theme percentiles for ${county.county}`}
      />
    </div>
  );
}
