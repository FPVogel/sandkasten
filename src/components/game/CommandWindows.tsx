"use client";

import type { ReactNode } from "react";
import type { InfrastructureAsset } from "@/lib/scenarios/infrastructure";
import type { Contact } from "@/lib/simulation/gameState";

export type WorkspaceWindow = "assets" | "targets" | "weapons" | "intel" | "combat" | "news" | "ai";

export function CommandWindow({ title, eyebrow, onClose, children, className = "" }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; className?: string }) {
  return (
    <section className={`command-window ${className}`} aria-label={title}>
      <header className="command-window-header">
        <div><span>{eyebrow ?? "WORKSPACE"}</span><strong>{title}</strong></div>
        <button onClick={onClose} aria-label={`Close ${title}`}>×</button>
      </header>
      <div className="command-window-body">{children}</div>
    </section>
  );
}

export const WEAPONS = [
  { id: "tomahawk", name: "BGM-109E Tomahawk", type: "LAND ATTACK", range: "900 nm", effect: 58 },
  { id: "slam-er", name: "AGM-84H SLAM-ER", type: "PRECISION STRIKE", range: "150 nm", effect: 44 },
  { id: "jsow", name: "AGM-154C JSOW", type: "STANDOFF", range: "70 nm", effect: 34 },
] as const;

export function TargetCard({ asset, selected, onSelect }: { asset: InfrastructureAsset; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`target-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className={`target-status status-${asset.status}`} />
      <span><strong>{asset.name}</strong><small>{asset.kind.toUpperCase()} · {asset.side} · OSM {asset.osmId}</small></span>
      <b>{asset.integrity}%</b>
    </button>
  );
}

export function RadarTargetCard({ contact, selected, simTime, onSelect }: { contact: Contact; selected: boolean; simTime: number; onSelect: () => void }) {
  const age = Math.max(0, Math.floor((simTime - contact.lastUpdateTime) / 1000));
  const label = contact.platformName ?? `Radar track ${contact.id.slice(-4)}`;
  return (
    <button className={`target-card ${selected ? "selected" : ""}`} onClick={onSelect} data-testid="radar-target-card">
      <span className={`radar-ping radar-ping-${contact.classification}`} />
      <span>
        <strong>{label}</strong>
        <small>{contact.classification.toUpperCase()} · {contact.sensorType.toUpperCase()} · ±{contact.positionUncertainty.toFixed(1)} KM · {age}S OLD</small>
      </span>
      <b>{contact.estimatedSpeed ? `${Math.round(contact.estimatedSpeed)} KT` : "—"}</b>
    </button>
  );
}
