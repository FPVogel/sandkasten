"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { InfrastructureAsset } from "@/lib/scenarios/infrastructure";

const ICONS: Record<InfrastructureAsset["kind"], string> = {
  airbase: "✈", runway: "═", hospital: "✚", port: "⚓", radar: "◉", power: "⚡",
};

export function InfrastructureLayer({ map, assets, onContextTarget }: { map: maplibregl.Map; assets: InfrastructureAsset[]; onContextTarget?: (asset: InfrastructureAsset) => void }) {
  const markersRef = useRef<maplibregl.Marker[]>([]);
  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = assets.map((asset) => {
      const el = document.createElement("button");
      el.className = `infrastructure-marker infrastructure-${asset.status}`;
      el.type = "button";
      el.title = `${asset.name} · ${asset.kind} · ${asset.status} · ${asset.integrity}%`;
      el.innerHTML = `<span>${ICONS[asset.kind]}</span><small>${asset.name}</small>`;
      el.addEventListener("contextmenu", (event) => { event.preventDefault(); event.stopPropagation(); onContextTarget?.(asset); });
      return new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([asset.position.lng, asset.position.lat]).addTo(map);
    });
    return () => { markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; };
  }, [map, assets, onContextTarget]);
  return null;
}
