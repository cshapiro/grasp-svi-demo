import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke, Text } from "ol/style";
import { transformExtent } from "ol/proj";
import { defaults as defaultControls, ScaleLine } from "ol/control";
import type Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import "ol/ol.css";

import type { SviDataset, ThemeKey } from "../lib/sviData";
import { SEQ_RAMP, MISSING_FILL, SELECT_ACCENT, classIndex } from "../lib/colors";

interface Props {
  tennessee?: boolean;
  inBand?: ReadonlySet<string>;
  secondFips?: string;
  dataset: SviDataset;
  theme: ThemeKey;
  selectedFips: string | null;
  onSelect: (fips: string | null) => void;
}

/** Conterminous US in lon/lat; Alaska & Hawaii stay reachable by zooming out. */
const CONUS_EXTENT_LONLAT: [number, number, number, number] = [-126, 23.5, -66, 50.5];

const COUNTY_STROKE = new Stroke({ color: "rgba(11,11,11,0.12)", width: 0.4 });

/** One cached Style per choropleth class — style functions run per feature per frame. */
const CLASS_STYLES = SEQ_RAMP.map(
  (hex) => new Style({ fill: new Fill({ color: hex }), stroke: COUNTY_STROKE }),
);
const MISSING_STYLE = new Style({
  fill: new Fill({ color: MISSING_FILL }),
  stroke: COUNTY_STROKE,
});
const DIM_STYLE = new Style({ fill: new Fill({ color: "#e7e9e5" }), stroke: COUNTY_STROKE });
const STATE_STYLE = new Style({
  stroke: new Stroke({ color: "#fcfcfb", width: 1.2 }),
});
const HOVER_STYLE = new Style({
  stroke: new Stroke({ color: "#0b0b0b", width: 1.6 }),
  fill: new Fill({ color: "rgba(11,11,11,0.06)" }),
});
const SELECT_STYLE = new Style({
  stroke: new Stroke({ color: SELECT_ACCENT, width: 2.5 }),
});

export default function SviMap({ dataset, theme, selectedFips, onSelect, tennessee = false, inBand, secondFips }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const countyLayerRef = useRef<VectorLayer | null>(null);
  const countySourceRef = useRef<VectorSource | null>(null);
  const hoverSourceRef = useRef<VectorSource | null>(null);
  const selectSourceRef = useRef<VectorSource | null>(null);
  /** Live values read by the style function & event handlers without re-creating the map. */
  const liveRef = useRef({ dataset, theme, onSelect, inBand, selectedFips, secondFips });
  useEffect(() => {
    liveRef.current = { dataset, theme, onSelect, inBand, selectedFips, secondFips };
  }, [dataset, theme, onSelect, inBand, selectedFips, secondFips]);

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !tooltip) return;

    const countySource = new VectorSource();
    const hoverSource = new VectorSource();
    const selectSource = new VectorSource();
    countySourceRef.current = countySource;
    hoverSourceRef.current = hoverSource;
    selectSourceRef.current = selectSource;

    const countyStyle = (feature: FeatureLike): Style => {
      const { dataset: ds, theme: th } = liveRef.current;
      const rec = ds.byFips.get(String(feature.getId()));
      if (liveRef.current.inBand && !liveRef.current.inBand.has(String(feature.getId()))) return DIM_STYLE;
      const v = rec ? rec[th] : null;
      return v == null ? MISSING_STYLE : CLASS_STYLES[classIndex(v)];
    };

    const countyLayer = new VectorLayer({ source: countySource, style: countyStyle });
    countyLayerRef.current = countyLayer;
    const stateLayer = new VectorLayer({ source: new VectorSource(), style: STATE_STYLE });
    const hoverLayer = new VectorLayer({ source: hoverSource, style: HOVER_STYLE });
    const selectLayer = new VectorLayer({ source: selectSource, style: feature => {
      if (!tennessee) return SELECT_STYLE;
      const id = String(feature.getId());
      const first = id === liveRef.current.selectedFips;
      const name = liveRef.current.dataset.byFips.get(id)?.county.replace(/ County$/, "") ?? "";
      const color = first ? "#983d14" : "#563595";
      return new Style({
        stroke: new Stroke({ color, width: 3 }),
        text: new Text({
          text: (first ? "● A " : "◆ B ") + name,
          offsetY: first ? 14 : -14, overflow: true, font: "bold 13px system-ui",
          fill: new Fill({ color }), stroke: new Stroke({ color: "white", width: 4 })
        })
      });
    } });

    const extent3857 = transformExtent(tennessee ? [-90.45, 34.91, -81.55, 36.72] : CONUS_EXTENT_LONLAT, "EPSG:4326", "EPSG:3857");
    const map = new Map({
      target: container,
      layers: [countyLayer, stateLayer, selectLayer, hoverLayer],
      controls: defaultControls({ attribution: false }).extend([new ScaleLine()]),
      view: new View({ center: [0, 0], zoom: 4, minZoom: 2.8, maxZoom: 11 }),
    });
    map.getView().fit(extent3857, { padding: [8, 8, 8, 8] });
    mapRef.current = map;

    // Boundaries: US Atlas TopoJSON (US Census Bureau cartographic boundaries).
    const geojson = new GeoJSON();
    fetch(`${import.meta.env.BASE_URL}data/counties-10m.json`)
      .then((r) => r.json())
      .then((topo: Topology) => {
        const counties = topojson.feature(
          topo,
          topo.objects.counties as GeometryCollection,
        );
        const features = geojson.readFeatures(counties, {
          featureProjection: "EPSG:3857",
        }) as Feature[];
        countySource.addFeatures(tennessee ? features.filter(f => String(f.getId()).startsWith("47")) : features);
        for (const id of [liveRef.current.selectedFips, liveRef.current.secondFips]) {
          const feature = id && countySource.getFeatureById(id);
          if (feature) selectSource.addFeature(feature as Feature);
        }
        if (tennessee) return;

        // Interior state borders only (shared edges), drawn once, over the fills.
        const mesh = topojson.mesh(
          topo,
          topo.objects.states as GeometryCollection,
          (a, b) => a !== b,
        );
        const meshFeatures = geojson.readFeatures(
          { type: "Feature", geometry: mesh, properties: {} },
          { featureProjection: "EPSG:3857" },
        ) as Feature[];
        stateLayer.getSource()!.addFeatures(meshFeatures);
      });

    const featureAt = (evt: MapBrowserEvent): Feature | undefined =>
      map.forEachFeatureAtPixel(evt.pixel, (f) => f as Feature, {
        layerFilter: (l) => l === countyLayer,
      });

    map.on("pointermove", (evt) => {
      if (evt.dragging) return;
      const feature = featureAt(evt);
      const { dataset: ds, theme: th } = liveRef.current;
      hoverSource.clear();
      if (feature) {
        hoverSource.addFeature(feature);
        const rec = ds.byFips.get(String(feature.getId()));
        const v = rec ? rec[th] : null;
        tooltip.style.display = "block";
        tooltip.style.left = `${evt.pixel[0] + 14}px`;
        tooltip.style.top = `${evt.pixel[1] + 14}px`;
        tooltip.innerHTML = rec
          ? `<strong>${rec.county}, ${rec.st}</strong><br/>` +
            (v == null ? "Not ranked" : `Percentile: <strong>${v.toFixed(2)}</strong>`)
          : `<strong>${feature.get("name") ?? "Unknown"}</strong><br/>No SVI record`;
      } else {
        tooltip.style.display = "none";
      }
      container.style.cursor = feature ? "pointer" : "";
    });

    map.on("click", (evt) => {
      const feature = featureAt(evt);
      liveRef.current.onSelect(feature ? String(feature.getId()) : null);
    });

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [tennessee]);

  // Repaint fills when the theme or dataset changes (style fn reads liveRef).
  // Also drop any hover tooltip, whose text belongs to the previous theme.
  useEffect(() => {
    countyLayerRef.current?.changed();
    hoverSourceRef.current?.clear();
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }, [theme, dataset, inBand]);

  // Outline the selected county.
  useEffect(() => {
    const src = selectSourceRef.current;
    const counties = countySourceRef.current;
    if (!src || !counties) return;
    src.clear();
    for (const id of [selectedFips, secondFips]) {
      const f = id && counties.getFeatureById(id);
      if (f) src.addFeature(f as Feature);
    }
  }, [selectedFips, secondFips, dataset]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      <div ref={tooltipRef} className="map-tooltip" role="status" />
    </div>
  );
}

