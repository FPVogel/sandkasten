import type { Position } from "@/types/game";

export type InfrastructureKind = "airbase" | "runway" | "hospital" | "port" | "radar" | "power";

export interface InfrastructureAsset {
  id: string;
  name: string;
  kind: InfrastructureKind;
  position: Position;
  osmId: string;
  integrity: number;
  status: "operational" | "degraded" | "disabled" | "destroyed";
  side: "Iran" | "Civilian";
}

/** Scenario snapshot of real OpenStreetMap features around the Strait of
 * Hormuz. OSM identifiers are retained so a future scenario refresh can merge
 * newer geometry without changing simulation IDs. */
export const hormuzInfrastructure: InfrastructureAsset[] = [
  { id: "infra-bandar-air", name: "Bandar Abbas International Airport", kind: "airbase", position: { lng: 56.3778, lat: 27.2183 }, osmId: "way/40594717", integrity: 100, status: "operational", side: "Civilian" },
  { id: "infra-bandar-runway", name: "Bandar Abbas RWY 03R/21L", kind: "runway", position: { lng: 56.3680, lat: 27.2120 }, osmId: "way/40594711", integrity: 100, status: "operational", side: "Iran" },
  { id: "infra-lengeh-air", name: "Bandar Lengeh Airport", kind: "airbase", position: { lng: 54.8248, lat: 26.5320 }, osmId: "way/42044060", integrity: 100, status: "operational", side: "Civilian" },
  { id: "infra-qeshm-air", name: "Qeshm International Airport", kind: "airbase", position: { lng: 55.9024, lat: 26.7546 }, osmId: "way/40910722", integrity: 100, status: "operational", side: "Civilian" },
  { id: "infra-shahid-hosp", name: "Shahid Mohammadi Hospital", kind: "hospital", position: { lng: 56.2842, lat: 27.1858 }, osmId: "node/6887469285", integrity: 100, status: "operational", side: "Civilian" },
  { id: "infra-rajaee-port", name: "Shahid Rajaee Port", kind: "port", position: { lng: 56.0690, lat: 27.1050 }, osmId: "way/126454776", integrity: 100, status: "operational", side: "Iran" },
  { id: "infra-hormuz-radar", name: "Hormuz Coastal Radar", kind: "radar", position: { lng: 56.4620, lat: 27.0570 }, osmId: "node/derived-hormuz-radar", integrity: 100, status: "operational", side: "Iran" },
  { id: "infra-bandar-power", name: "Bandar Abbas Power Station", kind: "power", position: { lng: 56.1620, lat: 27.1380 }, osmId: "way/derived-bandar-power", integrity: 100, status: "operational", side: "Civilian" },
];

export function applyInfrastructureHit(asset: InfrastructureAsset, damage: number): InfrastructureAsset {
  const integrity = Math.max(0, asset.integrity - damage);
  const status = integrity === 0 ? "destroyed" : integrity < 35 ? "disabled" : integrity < 70 ? "degraded" : "operational";
  return { ...asset, integrity, status };
}
