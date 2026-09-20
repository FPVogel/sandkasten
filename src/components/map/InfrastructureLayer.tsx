"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { InfrastructureAsset } from "@/lib/scenarios/infrastructure";

const SOURCE = "scenario-infrastructure";
const HALO_LAYER = "scenario-infrastructure-halo";
const POINT_LAYER = "scenario-infrastructure-points";
const LABEL_LAYER = "scenario-infrastructure-labels";

const SYMBOLS: Record<InfrastructureAsset["kind"], string> = {
  airbase: "AIR", runway: "RWY", hospital: "MED", port: "PRT", radar: "RAD", power: "PWR",
};

function toGeoJSON(assets: InfrastructureAsset[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: assets.map((asset) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [asset.position.lng, asset.position.lat] },
      properties: { ...asset, symbol: SYMBOLS[asset.kind] },
    })),
  };
}

export function InfrastructureLayer({ map, assets, onContextTarget }: { map: maplibregl.Map; assets: InfrastructureAsset[]; onContextTarget?: (asset: InfrastructureAsset) => void }) {
  const assetsRef = useRef(assets);
  const onContextTargetRef = useRef(onContextTarget);
  assetsRef.current = assets;
  onContextTargetRef.current = onContextTarget;

  useEffect(() => {
    const installLayers = () => {
      if (!map.isStyleLoaded()) return;
      const data = toGeoJSON(assetsRef.current);
      const source = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(data);
      else map.addSource(SOURCE, { type: "geojson", data });

      if (!map.getLayer(HALO_LAYER)) map.addLayer({
        id: HALO_LAYER, type: "circle", source: SOURCE,
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 9, 10, 15, 16], "circle-color": "#07111d", "circle-opacity": 0.82, "circle-stroke-width": 1, "circle-stroke-color": ["match", ["get", "status"], "operational", "#8ba3ba", "degraded", "#f59e0b", "#ef4444"] },
      });
      if (!map.getLayer(POINT_LAYER)) map.addLayer({
        id: POINT_LAYER, type: "symbol", source: SOURCE,
        layout: { "text-field": ["get", "symbol"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 7, 9, 10, 15, 13], "text-font": ["Open Sans Bold"] },
        paint: { "text-color": ["match", ["get", "status"], "operational", "#dbeafe", "degraded", "#f59e0b", "#ef4444"] },
      });
      if (!map.getLayer(LABEL_LAYER)) map.addLayer({
        id: LABEL_LAYER, type: "symbol", source: SOURCE, minzoom: 8,
        layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.7], "text-anchor": "top", "text-allow-overlap": false },
        paint: { "text-color": "#e2e8f0", "text-halo-color": "#07111d", "text-halo-width": 1.5 },
      });
    };
    const handleContextMenu = (event: maplibregl.MapLayerMouseEvent) => {
      event.preventDefault();
      const feature = event.features?.[0];
      const asset = assetsRef.current.find((item) => item.id === feature?.properties?.id);
      if (asset) onContextTargetRef.current?.(asset);
    };
    const showPointer = () => { map.getCanvas().style.cursor = "crosshair"; };
    const clearPointer = () => { map.getCanvas().style.cursor = ""; };

    installLayers();
    map.on("styledata", installLayers);
    map.on("contextmenu", HALO_LAYER, handleContextMenu);
    map.on("mouseenter", HALO_LAYER, showPointer);
    map.on("mouseleave", HALO_LAYER, clearPointer);
    return () => {
      map.off("styledata", installLayers);
      map.off("contextmenu", HALO_LAYER, handleContextMenu);
      map.off("mouseenter", HALO_LAYER, showPointer);
      map.off("mouseleave", HALO_LAYER, clearPointer);
      for (const layer of [LABEL_LAYER, POINT_LAYER, HALO_LAYER]) if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
  }, [map]);

  useEffect(() => {
    (map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(toGeoJSON(assets));
  }, [map, assets]);

  return null;
}
