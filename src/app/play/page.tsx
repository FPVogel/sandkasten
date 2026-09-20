"use client";

import { useState, useCallback, useEffect } from "react";
import { MapWrapper } from "@/components/map/MapWrapper";
import { DetailPanel } from "@/components/map/DetailPanel";
import { TimeControls } from "@/components/game/TimeControls";
import { ContactList } from "@/components/game/ContactList";
import { OrderPanel } from "@/components/game/OrderPanel";
import { MessageLog } from "@/components/game/MessageLog";
import { CombatLog } from "@/components/game/CombatLog";
import { MediaFeed } from "@/components/game/infowar/MediaFeed";
import { HelpPanel } from "@/components/game/help/HelpPanel";
import { demoScenarioConfig } from "@/lib/scenarios/demoConfig";
import { useSimulation } from "@/lib/simulation/useSimulation";
import { useInfoWar } from "@/lib/infowar/useInfoWar";
import { formatMeasurement } from "@/components/map/MeasurementLayer";
import { CommandWindow, TargetCard, WEAPONS, type WorkspaceWindow } from "@/components/game/CommandWindows";
import { applyInfrastructureHit, hormuzInfrastructure, type InfrastructureAsset } from "@/lib/scenarios/infrastructure";

export default function PlayPage() {
  const {
    gameState,
    eventState,
    combatState,
    autopauseEvent,
    autopausePrefsRef,
    togglePause,
    setSpeed,
    addWaypoint,
    clearWaypoints,
    setThrottle,
    setAltitude,
    setWeaponsControl,
    toggleRadar,
    markMessageRead,
    resetSimulation,
    setAutopausePrefs,
  } = useSimulation(demoScenarioConfig);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [pinnedRingIds, setPinnedRingIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"forces" | "messages" | "combat" | "media">("forces");
  const [showHelp, setShowHelp] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const [showSensorCoverage, setShowSensorCoverage] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ lng: number; lat: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ lng: number; lat: number } | null>(null);
  const [showAutopauseSettings, setShowAutopauseSettings] = useState(false);
  const [basemap, setBasemap] = useState<"street" | "satellite">("street");
  const [infrastructure, setInfrastructure] = useState(hormuzInfrastructure);
  const [openWindows, setOpenWindows] = useState<Set<WorkspaceWindow>>(new Set(["assets"]));
  const [targetId, setTargetId] = useState<string | null>(null);
  const [weaponId, setWeaponId] = useState<string>(WEAPONS[0].id);
  const [strikeReport, setStrikeReport] = useState("RIGHT-CLICK THE MAP OR AN INFRASTRUCTURE ICON TO BUILD A TARGET SET");

  const { infoWarState, toggleEnabled, markPostRead, resetInfoWar } = useInfoWar(
    gameState,
    combatState,
    eventState,
    demoScenarioConfig.infowar
  );

  const unreadMediaCount = infoWarState.posts.filter(
    (p) => !p.read && p.simTime <= gameState.simTime
  ).length;

  const handleReset = useCallback(() => {
    resetSimulation();
    resetInfoWar();
    setInfrastructure(hormuzInfrastructure);
    setTargetId(null);
    setStrikeReport("RIGHT-CLICK THE MAP OR AN INFRASTRUCTURE ICON TO BUILD A TARGET SET");
  }, [resetSimulation, resetInfoWar]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePause();
      }
      if ((e.key === "h" || e.key === "H" || e.key === "?") && e.target === document.body) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
      if ((e.key === "g" || e.key === "G") && e.target === document.body) {
        e.preventDefault();
        setGodMode((prev) => !prev);
      }
      if ((e.key === "s" || e.key === "S") && e.target === document.body) {
        e.preventDefault();
        setShowSensorCoverage((prev) => !prev);
      }
      if ((e.key === "m" || e.key === "M") && e.target === document.body) {
        e.preventDefault();
        setMeasureMode((prev) => {
          if (prev) { setMeasureStart(null); setMeasureEnd(null); }
          return !prev;
        });
      }
      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false);
        } else if (selectedUnitId) {
          setSelectedUnitId(null);
          setIsPlacingWaypoint(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePause, showHelp, selectedUnitId]);

  // Auto-switch sidebar tab when autopause triggers
  useEffect(() => {
    if (autopauseEvent?.suggestedTab) {
      setSidebarTab(autopauseEvent.suggestedTab);
    }
  }, [autopauseEvent]);

  const liveScenario = {
    ...demoScenarioConfig.scenario,
    sides: gameState.sides,
  };

  const allUnits = gameState.sides.flatMap((s) => s.units);
  const selectedUnit = selectedUnitId ? allUnits.find((u) => u.id === selectedUnitId) : null;
  const selectedOrders = selectedUnitId ? gameState.orders.get(selectedUnitId) : undefined;
  const friendlyUnits = allUnits.filter((u) => u.side === gameState.scenario.playerSide);

  const messages = eventState?.messages ?? [];
  const unreadCount = messages.filter((m) => !m.read).length;

  // Scenario result overlay
  const scenarioResult = eventState?.scenarioResult;

  const toggleWindow = (window: WorkspaceWindow) => setOpenWindows((previous) => {
    const next = new Set(previous);
    next.has(window) ? next.delete(window) : next.add(window);
    return next;
  });
  const closeWindow = (window: WorkspaceWindow) => setOpenWindows((previous) => {
    const next = new Set(previous); next.delete(window); return next;
  });
  const openTargetWorkflow = (asset?: InfrastructureAsset) => {
    if (asset) setTargetId(asset.id);
    setOpenWindows((previous) => new Set([...previous, "targets", "weapons"]));
    setStrikeReport(asset ? `TARGET NOMINATED // ${asset.name}` : "POSSIBLE TARGETS SORTED BY PROXIMITY AND EFFECT");
  };
  const authorizeStrike = () => {
    const weapon = WEAPONS.find((item) => item.id === weaponId);
    const target = infrastructure.find((item) => item.id === targetId);
    if (!weapon || !target) return;
    setInfrastructure((assets) => assets.map((asset) => asset.id === target.id ? applyInfrastructureHit(asset, weapon.effect) : asset));
    setStrikeReport(`BDA RECEIVED // ${weapon.name} impact at ${target.name} // network effects recalculated`);
  };

  const handleUnitSelect = useCallback(
    (unitId: string | null, shiftKey?: boolean) => {
      if (unitId && shiftKey) {
        setPinnedRingIds((prev) => {
          const next = new Set(prev);
          next.has(unitId) ? next.delete(unitId) : next.add(unitId);
          return next;
        });
      }
      setSelectedUnitId(unitId);
      setIsPlacingWaypoint(false);
    },
    []
  );

  const handleMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      if (measureMode) {
        if (!measureStart || measureEnd) {
          // Start new measurement
          setMeasureStart(lngLat);
          setMeasureEnd(null);
        } else {
          // Complete measurement
          setMeasureEnd(lngLat);
        }
        return true;
      }
      if (isPlacingWaypoint && selectedUnitId) {
        addWaypoint(selectedUnitId, lngLat);
        return true;
      }
    },
    [measureMode, measureStart, measureEnd, isPlacingWaypoint, selectedUnitId, addWaypoint]
  );

  return (
    <div className={`h-screen w-screen flex flex-col bg-[var(--color-tactical-dark)] ${theme === "light" ? "theme-light" : ""}`}>
      {/* Header with time controls */}
      <div className="h-14 flex items-center px-5 border-b border-[var(--color-tactical-border)] bg-[var(--color-tactical-panel)] shrink-0">
        <a
          href="/"
          className="text-[var(--color-terminal-green)] text-lg font-bold tracking-widest mr-8"
          style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
        >
          SANDKASTEN
        </a>

        <TimeControls
          simTime={gameState.simTime}
          isPaused={gameState.isPaused}
          speed={gameState.speed}
          autopauseReason={autopauseEvent?.reason}
          onTogglePause={togglePause}
          onSetSpeed={setSpeed}
          onReset={handleReset}
        />

        {/* Score display */}
        <div className="ml-6 text-base text-[var(--color-tactical-text-dim)]">
          {Object.entries(gameState.score).map(([side, score]) => (
            <span key={side} className="mr-3">
              {side}: <span className="text-[var(--color-tactical-text)]">{score}</span>
            </span>
          ))}
        </div>

        <button
          onClick={() => setShowSensorCoverage((s) => !s)}
          aria-label="Toggle sensor coverage"
          className={`ml-auto text-sm border px-3 py-1.5 rounded cursor-pointer tracking-wider font-bold ${
            showSensorCoverage
              ? "text-[var(--color-terminal-green)] border-[var(--color-terminal-green)]"
              : "text-[var(--color-tactical-text-dim)] border-[var(--color-tactical-border)] hover:text-[var(--color-tactical-text)]"
          }`}
        >
          SENSORS
        </button>
        <button
          onClick={() => {
            setMeasureMode((prev) => {
              if (prev) { setMeasureStart(null); setMeasureEnd(null); }
              return !prev;
            });
          }}
          aria-label="Toggle measurement"
          className={`ml-2 text-sm border px-3 py-1.5 rounded cursor-pointer tracking-wider font-bold ${
            measureMode
              ? "text-[var(--color-terminal-amber)] border-[var(--color-terminal-amber)]"
              : "text-[var(--color-tactical-text-dim)] border-[var(--color-tactical-border)] hover:text-[var(--color-tactical-text)]"
          }`}
        >
          MEASURE
        </button>
        <button
          onClick={() => setGodMode((g) => !g)}
          aria-label="Toggle god mode"
          className={`ml-2 text-sm border px-3 py-1.5 rounded cursor-pointer tracking-wider font-bold ${
            godMode
              ? "text-[var(--color-terminal-green)] border-[var(--color-terminal-green)]"
              : "text-[var(--color-tactical-text-dim)] border-[var(--color-tactical-border)] hover:text-[var(--color-tactical-text)]"
          }`}
        >
          GOD
        </button>
        <div className="relative ml-2">
          <button
            onClick={() => setShowAutopauseSettings((s) => !s)}
            aria-label="Autopause settings"
            className={`text-sm border px-3 py-1.5 rounded cursor-pointer tracking-wider font-bold ${
              autopausePrefsRef.current.enabled
                ? "text-[var(--color-terminal-amber)] border-[var(--color-terminal-amber)]"
                : "text-[var(--color-tactical-text-dim)] border-[var(--color-tactical-border)] hover:text-[var(--color-tactical-text)]"
            }`}
          >
            AUTO
          </button>
          {showAutopauseSettings && (
            <div
              data-testid="autopause-settings"
              className="absolute right-0 top-full mt-1 z-50 bg-[var(--color-tactical-panel)] border border-[var(--color-tactical-border)] rounded p-3 w-64"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-tactical-text)] font-bold tracking-wider">AUTOPAUSE</span>
                <button
                  onClick={() => {
                    const prefs = { ...autopausePrefsRef.current, enabled: !autopausePrefsRef.current.enabled };
                    setAutopausePrefs(prefs);
                  }}
                  data-testid="autopause-toggle-enabled"
                  className={`text-xs px-2 py-1 rounded cursor-pointer ${
                    autopausePrefsRef.current.enabled
                      ? "bg-[var(--color-terminal-amber)] text-[var(--color-tactical-dark)] font-bold"
                      : "text-[var(--color-tactical-text-dim)] border border-[var(--color-tactical-border)]"
                  }`}
                >
                  {autopausePrefsRef.current.enabled ? "ON" : "OFF"}
                </button>
              </div>
              {(["newContact", "friendlyDamaged", "friendlyDestroyed", "weaponIncoming", "scenarioMessage"] as const).map((key) => {
                const labels: Record<string, string> = {
                  newContact: "New contact detected",
                  friendlyDamaged: "Friendly unit damaged",
                  friendlyDestroyed: "Friendly unit destroyed",
                  weaponIncoming: "Incoming weapon",
                  scenarioMessage: "Intel message",
                };
                return (
                  <label key={key} className="flex items-center gap-2 text-sm text-[var(--color-tactical-text)] py-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autopausePrefsRef.current.triggers[key]}
                      onChange={() => {
                        const prefs = {
                          ...autopausePrefsRef.current,
                          triggers: {
                            ...autopausePrefsRef.current.triggers,
                            [key]: !autopausePrefsRef.current.triggers[key],
                          },
                        };
                        setAutopausePrefs(prefs);
                      }}
                      data-testid={`autopause-trigger-${key}`}
                      className="accent-[var(--color-terminal-amber)]"
                    />
                    {labels[key]}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowHelp(true)}
          aria-label="Open help"
          className="ml-2 text-sm text-[var(--color-tactical-text-dim)] hover:text-[var(--color-terminal-green)] border border-[var(--color-tactical-border)] px-3 py-1.5 rounded cursor-pointer tracking-wider font-bold"
        >
          ?
        </button>
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          className="ml-2 text-sm text-[var(--color-tactical-text-dim)] hover:text-[var(--color-tactical-text)] border border-[var(--color-tactical-border)] px-3 py-1.5 rounded cursor-pointer tracking-wider"
        >
          {theme === "dark" ? "LIGHT" : "DARK"}
        </button>
      </div>

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      <div className="flex-1 flex">
        <nav className="workspace-rail" aria-label="Operational workspaces">
          {([
            ["assets", "◇", "Assets"], ["targets", "⌖", "Targets"], ["weapons", "△", "Weapons"],
            ["intel", "▤", "Intel"], ["combat", "⚡", "Combat"], ["news", "◫", "News"], ["ai", "◎", "NPC AI"],
          ] as [WorkspaceWindow, string, string][]).map(([id, icon, label]) => (
            <button key={id} onClick={() => toggleWindow(id)} className={`workspace-tool ${openWindows.has(id) ? "active" : ""}`} aria-label={`Toggle ${label} window`}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        {/* Sidebar */}
        <div className="w-80 bg-[var(--color-tactical-panel)] border-r border-[var(--color-tactical-border)] flex flex-col text-base shrink-0 overflow-hidden">
          {/* Tab switcher */}
          <div data-testid="sidebar-tabs" className="flex border-b border-[var(--color-tactical-border)] shrink-0 overflow-visible">
            <button
              onClick={() => setSidebarTab("forces")}
              data-testid="sidebar-tab-forces"
              data-active={sidebarTab === "forces" ? "true" : "false"}
              className={`flex-1 py-2 text-base uppercase tracking-wider cursor-pointer ${
                sidebarTab === "forces"
                  ? "text-[var(--color-terminal-green)] border-b border-[var(--color-terminal-green)]"
                  : "text-[var(--color-tactical-text-dim)]"
              }`}
            >
              Forces
            </button>
            <button
              onClick={() => setSidebarTab("messages")}
              data-testid="sidebar-tab-messages"
              data-active={sidebarTab === "messages" ? "true" : "false"}
              className={`flex-1 py-2 text-base uppercase tracking-wider cursor-pointer ${
                sidebarTab === "messages"
                  ? "text-[var(--color-terminal-amber)] border-b border-[var(--color-terminal-amber)]"
                  : "text-[var(--color-tactical-text-dim)]"
              }`}
            >
              Intel
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center bg-[var(--color-terminal-amber)] text-[var(--color-tactical-dark)] text-[10px] rounded-full w-5 h-5 font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarTab("combat")}
              data-testid="sidebar-tab-combat"
              data-active={sidebarTab === "combat" ? "true" : "false"}
              className={`flex-1 py-2 text-base uppercase tracking-wider cursor-pointer ${
                sidebarTab === "combat"
                  ? "text-[var(--color-terminal-red)] border-b border-[var(--color-terminal-red)]"
                  : "text-[var(--color-tactical-text-dim)]"
              }`}
            >
              Combat
              {(combatState?.weaponsInFlight.length ?? 0) > 0 && (
                <span
                  data-testid="weapons-in-flight-badge"
                  className="ml-1 inline-flex items-center justify-center bg-[var(--color-terminal-red)] text-[var(--color-tactical-dark)] text-[10px] rounded-full w-5 h-5 font-bold"
                >
                  {combatState?.weaponsInFlight.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSidebarTab("media")}
              data-testid="sidebar-tab-media"
              data-active={sidebarTab === "media" ? "true" : "false"}
              className={`flex-1 py-2 text-base uppercase tracking-wider cursor-pointer ${
                sidebarTab === "media"
                  ? "text-[var(--color-terminal-blue)] border-b border-[var(--color-terminal-blue)]"
                  : "text-[var(--color-tactical-text-dim)]"
              }`}
            >
              Media
              {unreadMediaCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center bg-[var(--color-terminal-blue)] text-[var(--color-tactical-dark)] text-[10px] rounded-full w-5 h-5 font-bold">
                  {unreadMediaCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "forces" && (
              <>
                {/* Friendly units */}
                <div className="p-2 border-b border-[var(--color-tactical-border)]">
                  <div className="text-[var(--color-tactical-text-dim)] uppercase tracking-wider mb-2">
                    Forces ({friendlyUnits.length})
                  </div>
                  {friendlyUnits.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleUnitSelect(u.id)}
                      className={`w-full text-left px-2 py-1 rounded truncate cursor-pointer ${
                        selectedUnitId === u.id
                          ? "text-[var(--color-terminal-green)] bg-[var(--color-tactical-border)]"
                          : "text-[var(--color-tactical-text)] hover:bg-[var(--color-tactical-border)]"
                      }`}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>

                {/* Orders for selected unit */}
                {selectedUnit && selectedOrders && selectedUnit.side === gameState.scenario.playerSide && (
                  <div className="p-2 border-b border-[var(--color-tactical-border)]">
                    <OrderPanel
                      unit={selectedUnit}
                      orders={selectedOrders}
                      isPlacingWaypoint={isPlacingWaypoint}
                      onToggleWaypointMode={() => setIsPlacingWaypoint((p) => !p)}
                      onClearWaypoints={() => clearWaypoints(selectedUnit.id)}
                      onSetThrottle={(t) => setThrottle(selectedUnit.id, t)}
                      onSetAltitude={(altitude) => setAltitude(selectedUnit.id, altitude)}
                      onSetWeaponsControl={(control) => setWeaponsControl(selectedUnit.id, control)}
                      onToggleRadar={() => toggleRadar(selectedUnit.id)}
                    />
                  </div>
                )}

                {/* Contact list */}
                <div className="p-2">
                  <div className="text-[var(--color-tactical-text-dim)] uppercase tracking-wider mb-2">
                    Contacts ({gameState.contacts.length})
                  </div>
                  <ContactList
                    contacts={gameState.contacts}
                    simTime={gameState.simTime}
                  />
                </div>
              </>
            )}

            {sidebarTab === "messages" && (
              <div className="p-2">
                <MessageLog
                  messages={messages}
                  simTime={gameState.simTime}
                  onMarkRead={markMessageRead}
                />
              </div>
            )}

            {sidebarTab === "combat" && (
              <div className="p-2">
                {(combatState?.weaponsInFlight.length ?? 0) > 0 && (
                  <div className="mb-2 pb-2 border-b border-[var(--color-tactical-border)]">
                    <div className="text-[var(--color-terminal-red)] text-sm uppercase tracking-wider mb-1">
                      <span data-testid="weapons-in-flight-count">
                        Weapons in Flight ({combatState?.weaponsInFlight.length})
                      </span>
                    </div>
                    {combatState?.weaponsInFlight.map((w) => (
                      <div key={w.id} className="text-sm text-[var(--color-tactical-text)] mb-0.5">
                        <span className="text-[var(--color-terminal-amber)]">{">>"}</span>{" "}
                        {w.name} → {w.targetId.split("-").slice(0, 2).join("-")}
                      </div>
                    ))}
                  </div>
                )}
                <CombatLog
                  events={combatState?.combatLog ?? []}
                  simTime={gameState.simTime}
                  playerSide={gameState.scenario.playerSide}
                />
              </div>
            )}

            {sidebarTab === "media" && (
              <MediaFeed
                infoWarState={infoWarState}
                simTime={gameState.simTime}
                onToggleEnabled={toggleEnabled}
                onMarkRead={markPostRead}
              />
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapWrapper
            scenario={liveScenario}
            selectedUnitId={selectedUnitId}
            pinnedRingIds={pinnedRingIds}
            theme={theme}
            basemap={basemap}
            onUnitSelect={handleUnitSelect}
            contacts={gameState.contacts}
            orders={gameState.orders}
            fogOfWar={!godMode}
            weaponsInFlight={combatState?.weaponsInFlight}
            showSensorCoverage={showSensorCoverage}
            measureStart={measureStart}
            measureEnd={measureEnd}
            onMapClick={handleMapClick}
            infrastructure={infrastructure}
            onInfrastructureTarget={openTargetWorkflow}
            onContextMenu={() => openTargetWorkflow()}
          />

          <div className="absolute top-3 right-3 z-20 flex bg-[#0b1420e8] border border-[#40566d] rounded p-1">
            <button onClick={() => setBasemap("street")} className={`px-3 py-1.5 text-xs cursor-pointer ${basemap === "street" ? "bg-[#29465f] text-white" : "text-slate-400"}`}>OSM MAP</button>
            <button onClick={() => setBasemap("satellite")} className={`px-3 py-1.5 text-xs cursor-pointer ${basemap === "satellite" ? "bg-[#29465f] text-white" : "text-slate-400"}`}>SATELLITE · NO KEY</button>
          </div>

          {openWindows.has("targets") && <CommandWindow title="Possible Targets" eyebrow="TARGET DEVELOPMENT" onClose={() => closeWindow("targets")} className="top-16 left-4">
            <div className="text-[10px] text-slate-400 mb-2">{strikeReport}</div>
            {infrastructure.map((asset) => <TargetCard key={asset.id} asset={asset} selected={targetId === asset.id} onSelect={() => { setTargetId(asset.id); setStrikeReport(`TARGET SELECTED // LEFT-CLICK A WEAPON, THEN AUTHORIZE`); }} />)}
          </CommandWindow>}

          {openWindows.has("weapons") && <CommandWindow title="Select Weapon" eyebrow="EFFECTS CHAIN" onClose={() => closeWindow("weapons")} className="top-16 left-[370px]">
            <div className="mb-3 text-[10px] text-slate-400">WORKFLOW 01 SELECT ASSET · 02 RIGHT-CLICK TARGET · 03 LEFT-CLICK EFFECT</div>
            {WEAPONS.map((weapon) => <button key={weapon.id} onClick={() => setWeaponId(weapon.id)} className={`target-card ${weaponId === weapon.id ? "selected" : ""}`}><span className="target-status"/><span><strong>{weapon.name}</strong><small>{weapon.type} · RANGE {weapon.range}</small></span><b>{weapon.effect}</b></button>)}
            <button disabled={!targetId} onClick={authorizeStrike} className="w-full mt-3 py-2 bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold tracking-[.12em] cursor-pointer">AUTHORIZE STRIKE</button>
            <p className="text-[10px] text-slate-500 mt-2">Civilian sites remain visible for deconfliction. Damage updates integrity, operational state, and map symbology.</p>
          </CommandWindow>}

          {openWindows.has("news") && <CommandWindow title="News & Information Environment" eyebrow="SEPARATE LIVE WINDOW" onClose={() => closeWindow("news")} className="top-16 right-4 w-[390px]">
            <MediaFeed infoWarState={infoWarState} simTime={gameState.simTime} onToggleEnabled={toggleEnabled} onMarkRead={markPostRead} />
          </CommandWindow>}

          {openWindows.has("ai") && <CommandWindow title="NPC AI Activity" eyebrow="AUTONOMOUS ACTORS" onClose={() => closeWindow("ai")} className="bottom-12 right-4">
            <div className="space-y-3 text-xs"><div className="flex justify-between"><span>IRGCN Coastal Defense</span><b className="text-amber-400">ADAPTING</b></div><div className="h-1 bg-slate-700"><div className="h-full w-3/4 bg-amber-500"/></div><p className="text-slate-400">Re-evaluating patrol routes, sensor coverage, runway availability, and force preservation after every infrastructure effect.</p><div className="grid grid-cols-2 gap-2 text-[10px]"><span>ROE <b>WEAPONS FREE</b></span><span>POSTURE <b>DISPERSED</b></span><span>OODA <b>42 SEC</b></span><span>CONFIDENCE <b>0.78</b></span></div></div>
          </CommandWindow>}

          {selectedUnit && (
            <DetailPanel
              unit={selectedUnit}
              onClose={() => setSelectedUnitId(null)}
            />
          )}

          {/* Waypoint placement indicator */}
          {isPlacingWaypoint && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-[var(--color-terminal-green)] text-[var(--color-tactical-dark)] px-4 py-1 rounded text-sm font-bold">
              CLICK MAP TO PLACE WAYPOINT
            </div>
          )}

          {/* Measurement mode indicator and result */}
          {measureMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-[var(--color-terminal-amber)] text-[var(--color-tactical-dark)] px-4 py-1 rounded text-sm font-bold">
              {measureStart && measureEnd
                ? formatMeasurement(measureStart, measureEnd)
                : measureStart
                  ? "CLICK END POINT"
                  : "CLICK START POINT"}
            </div>
          )}

          {/* Scenario result overlay */}
          {scenarioResult && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
              <div className="bg-[var(--color-tactical-panel)] border border-[var(--color-tactical-border)] rounded-lg p-8 max-w-md text-center">
                <div
                  className={`text-2xl font-bold tracking-widest mb-4 ${
                    scenarioResult.result === "victory"
                      ? "text-[var(--color-terminal-green)]"
                      : scenarioResult.result === "defeat"
                        ? "text-[var(--color-terminal-red)]"
                        : "text-[var(--color-terminal-amber)]"
                  }`}
                  style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                >
                  {scenarioResult.result.toUpperCase()}
                </div>
                <p className="text-[var(--color-tactical-text)] text-sm mb-6">
                  {scenarioResult.message}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-[var(--color-terminal-green)] text-[var(--color-tactical-dark)] rounded text-sm font-bold tracking-wider cursor-pointer"
                  >
                    PLAY AGAIN
                  </button>
                  <a
                    href="/"
                    className="px-4 py-2 border border-[var(--color-tactical-border)] text-[var(--color-tactical-text)] rounded text-sm tracking-wider"
                  >
                    MAIN MENU
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
