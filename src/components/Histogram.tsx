import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { SviDataset, ThemeKey } from "../lib/sviData";
import { SEQ_RAMP, N_CLASSES, classIndex, SELECT_ACCENT } from "../lib/colors";

interface Props {
  dataset: SviDataset;
  theme: ThemeKey;
  selectedFips: string | null;
}

const W = 340;
const H = 190;
const MARGIN = { top: 14, right: 10, bottom: 34, left: 40 };

/**
 * Distribution of all county percentiles for the selected theme.
 * Bars are colored by the same quantized ramp as the map, so the
 * histogram doubles as the choropleth legend.
 */
export default function Histogram({ dataset, theme, selectedFips }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // SVI scores are percentile ranks, so a count-of-counties histogram is flat
    // by construction. Weighting by population answers the real question:
    // how many PEOPLE live at each vulnerability level?
    const ranked = dataset.counties.filter((c) => c[theme] != null);

    const x = d3
      .scaleLinear()
      .domain([0, 1])
      .range([MARGIN.left, W - MARGIN.right]);

    const binner = d3
      .bin<(typeof ranked)[number], number>()
      .value((c) => c[theme] as number)
      .domain([0, 1])
      .thresholds(d3.range(0, 1, 1 / 28));
    const bins = binner(ranked).map((b) => ({
      x0: b.x0 ?? 0,
      x1: b.x1 ?? 0,
      counties: b.length,
      pop: d3.sum(b, (c) => c.pop),
    }));

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (b) => b.pop) ?? 1])
      .nice()
      .range([H - MARGIN.bottom, MARGIN.top]);

    // Axes (recessive chrome).
    const axes = svg.append("g").attr("class", "axes");
    axes
      .append("g")
      .attr("transform", `translate(0,${H - MARGIN.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(3))
      .call((g) => g.select(".domain").attr("stroke", "#c3c2b7"));
    axes
      .append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(3)
          .tickFormat((d) => `${(d.valueOf() / 1e6).toFixed(0)}M`),
      )
      .call((g) => g.select(".domain").remove());
    axes.selectAll("text").attr("fill", "#898781").attr("font-size", 10);
    axes.selectAll("line").attr("stroke", "#c3c2b7");

    svg
      .append("text")
      .attr("x", (MARGIN.left + W - MARGIN.right) / 2)
      .attr("y", H - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#52514e")
      .attr("font-size", 10.5)
      .text("Population by vulnerability percentile (0 = lowest, 1 = highest)");

    // Bars — colored by bin midpoint on the map's ramp; 4px rounded tops.
    const barsG = svg.append("g");
    const bars = barsG
      .selectAll("path")
      .data(bins)
      .join("path")
      .attr("d", (b) => {
        const x0 = x(b.x0) + 1;
        const x1 = x(b.x1) - 1;
        const yTop = y(b.pop);
        const yBase = y(0);
        const w = Math.max(1, x1 - x0);
        const r = Math.min(4, w / 2, Math.max(0, yBase - yTop));
        return `M${x0},${yBase} L${x0},${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} L${x1 - r},${yTop} Q${x1},${yTop} ${x1},${yTop + r} L${x1},${yBase} Z`;
      })
      .attr("fill", (b) => SEQ_RAMP[classIndex((b.x0 + b.x1) / 2)]);

    // Hover tooltip per bar.
    const tip = svg.append("g").style("display", "none").style("pointer-events", "none");
    const tipBg = tip
      .append("rect")
      .attr("rx", 4)
      .attr("fill", "#0b0b0b")
      .attr("opacity", 0.92);
    const tipText = tip.append("text").attr("fill", "#fff").attr("font-size", 10.5);
    bars
      .on("mousemove", function (_event, b) {
        d3.select(this).attr("stroke", "#0b0b0b").attr("stroke-width", 1);
        const cx = (x(b.x0) + x(b.x1)) / 2;
        tipText.text(
          `${b.x0.toFixed(2)}–${b.x1.toFixed(2)}: ${(b.pop / 1e6).toFixed(1)}M people · ${b.counties} counties`,
        );
        const tw = (tipText.node()?.getComputedTextLength() ?? 80) + 12;
        const tx = Math.min(Math.max(cx - tw / 2, 2), W - tw - 2);
        const ty = Math.max(2, y(b.pop) - 24);
        tipBg.attr("x", tx).attr("y", ty).attr("width", tw).attr("height", 17);
        tipText.attr("x", tx + 6).attr("y", ty + 12.5);
        tip.style("display", null);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke", null);
        tip.style("display", "none");
      });

    // Marker for the selected county.
    const sel = selectedFips ? dataset.byFips.get(selectedFips) : undefined;
    const sv = sel ? sel[theme] : null;
    if (sel && sv != null) {
      const mx = x(sv);
      svg
        .append("line")
        .attr("x1", mx)
        .attr("x2", mx)
        .attr("y1", MARGIN.top - 2)
        .attr("y2", H - MARGIN.bottom)
        .attr("stroke", SELECT_ACCENT)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3");
      svg
        .append("text")
        .attr("x", Math.min(mx + 5, W - 90))
        .attr("y", MARGIN.top + 8)
        .attr("fill", "#b84714")
        .attr("font-size", 10.5)
        .attr("font-weight", 600)
        .text(`${sel.county.replace(/ County$/, "")} ${sv.toFixed(2)}`);
    }

    // Quantized ramp swatches under the x-axis = the map legend classes.
    const legend = svg.append("g").attr("transform", `translate(0,${H - MARGIN.bottom + 14})`);
    const step = (x(1) - x(0)) / N_CLASSES;
    legend
      .selectAll("rect")
      .data(SEQ_RAMP)
      .join("rect")
      .attr("x", (_d, i) => x(0) + i * step + 1)
      .attr("width", step - 2)
      .attr("y", 0)
      .attr("height", 5)
      .attr("rx", 1.5)
      .attr("fill", (d) => d);
  }, [dataset, theme, selectedFips]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Distribution of county vulnerability percentiles"
    />
  );
}
