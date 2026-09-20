"use client";

import { useMemo, useState } from "react";
import type { Contact, UnitOrders } from "@/lib/simulation/gameState";
import type { Unit } from "@/types/game";

type TakTab = "team" | "chat" | "mission" | "packages" | "alerts" | "video";
interface ChatMessage { id: number; channel: string; sender: string; text: string; time: string }

function download(name: string, content: string, type = "application/json") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function cotEvent(unit: Unit, now: number) {
  const start = new Date(now).toISOString();
  const stale = new Date(now + 5 * 60_000).toISOString();
  return `<event version="2.0" uid="${unit.id}" type="a-f-G" time="${start}" start="${start}" stale="${stale}" how="m-g"><point lat="${unit.position.lat}" lon="${unit.position.lng}" hae="${unit.altitude ?? 0}" ce="10" le="10"/><detail><contact callsign="${unit.name}"/><track course="${unit.heading}" speed="${(unit.speed * 0.514444).toFixed(2)}"/><remarks>${unit.mission ?? "Unassigned"}</remarks></detail></event>`;
}

export function TakWorkspace({ units, contacts, orders, simTime }: { units: Unit[]; contacts: Contact[]; orders: Map<string, UnitOrders>; simTime: number }) {
  const [tab, setTab] = useState<TakTab>("team");
  const [channel, setChannel] = useState("Operations");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, channel: "Operations", sender: "WATCH", text: "COP initialized. All stations report.", time: "06:00Z" }]);
  const [alerts, setAlerts] = useState<{ id: number; kind: string; text: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const routes = useMemo(() => units.map((unit) => ({ unit, waypoints: orders.get(unit.id)?.waypoints ?? [] })).filter((item) => item.waypoints.length), [units, orders]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((items) => [...items, { id: Date.now(), channel, sender: "COMMAND", text: draft.trim(), time: new Date(simTime).toISOString().slice(11, 16) + "Z" }]);
    setDraft("");
  };
  const issueAlert = (kind: string) => setAlerts((items) => [{ id: Date.now(), kind, text: `${kind} initiated by COMMAND at ${new Date(simTime).toISOString().slice(11, 19)}Z` }, ...items]);
  const exportMission = () => download("sandkasten-mission.json", JSON.stringify({ format: "OpenTAK-compatible-mission-snapshot", generated: new Date(simTime).toISOString(), units, contacts, routes }, null, 2));

  return <div className="tak-workspace">
    <div className="tak-tabs">{(["team", "chat", "mission", "packages", "alerts", "video"] as TakTab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item}</button>)}</div>

    {tab === "team" && <div className="space-y-2">
      <div className="tak-metric-row"><span>CONNECTED CLIENTS</span><b>{units.length}</b><span>RADAR TRACKS</span><b>{contacts.length}</b></div>
      {units.map((unit) => <div key={unit.id} className="tak-row"><span className="tak-online"/><div><b>{unit.name}</b><small>{unit.position.lat.toFixed(4)}, {unit.position.lng.toFixed(4)} · {unit.speed} KT · {unit.mission}</small></div><button onClick={() => download(`${unit.id}.cot.xml`, cotEvent(unit, simTime), "application/xml")}>CoT</button></div>)}
    </div>}

    {tab === "chat" && <div><div className="flex gap-1 mb-2">{["Operations", "Air", "Maritime"].map((item) => <button key={item} onClick={() => setChannel(item)} className={`tak-channel ${channel === item ? "active" : ""}`}>#{item}</button>)}</div><div className="tak-chat-log">{messages.filter((item) => item.channel === channel).map((item) => <div key={item.id}><small>{item.time} · {item.sender}</small><p>{item.text}</p></div>)}</div><div className="flex gap-1 mt-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder={`Message #${channel}`} /><button onClick={send}>SEND</button></div></div>}

    {tab === "mission" && <div className="space-y-3"><div className="tak-status"><span className="tak-online"/>MISSION API · LOCAL COP</div><p className="text-xs text-slate-400">Synchronizes team positions, sensor tracks, routes, and scenario objects as a single mission snapshot.</p><div className="tak-metric-row"><span>OBJECTS</span><b>{units.length + contacts.length}</b><span>ROUTES</span><b>{routes.length}</b></div><button className="tak-primary" onClick={() => { setSyncing(true); window.setTimeout(() => setSyncing(false), 700); }}>{syncing ? "SYNCING…" : "SYNC MISSION"}</button></div>}

    {tab === "packages" && <div className="space-y-2"><div className="tak-row"><div><b>Current COP package</b><small>Units, contacts, routes, infrastructure references</small></div><button onClick={exportMission}>DOWNLOAD</button></div><div className="tak-row"><div><b>Cursor-on-Target feed</b><small>TAK CoT XML · one event per owned asset</small></div><button onClick={() => download("sandkasten-cot.xml", `<events>${units.map((unit) => cotEvent(unit, simTime)).join("")}</events>`, "application/xml")}>DOWNLOAD</button></div></div>}

    {tab === "alerts" && <div><div className="grid grid-cols-2 gap-2 mb-3"><button className="tak-alert" onClick={() => issueAlert("EMERGENCY")}>⚠ EMERGENCY</button><button className="tak-alert" onClick={() => issueAlert("CASEVAC")}>✚ CASEVAC</button></div>{alerts.length === 0 ? <p className="text-xs text-slate-500">No active alerts.</p> : alerts.map((alert) => <div className="tak-row" key={alert.id}><div><b>{alert.kind}</b><small>{alert.text}</small></div><button onClick={() => setAlerts((items) => items.filter((item) => item.id !== alert.id))}>CLEAR</button></div>)}</div>}

    {tab === "video" && <div className="grid grid-cols-2 gap-2">{["UAV ISR 01", "SHIP EO/IR", "AIRFIELD CCTV", "HELO DOWNLINK"].map((name, index) => <div className="tak-video" key={name}><div><span>NO SIGNAL</span><i>◉</i></div><b>{name}</b><small>{index < 2 ? "STREAM STANDBY" : "SOURCE OFFLINE"}</small></div>)}</div>}
  </div>;
}
