import { useEffect, useReducer, useState } from "react";
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, BookOpen, ChevronDown, ChevronRight, CircleHelp, Crosshair, Diamond, Flame, Heart, Layers, Leaf, Pin, RotateCcw, Shield, Skull, Sparkles, Sword, Trash2, Trophy, Wind, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CARDS } from "@/game/cards";
import { ART } from "@/game/art";
import { ENEMIES } from "@/game/enemies";
import { cardReason, createGame, enemyIntent, reduceGame, visible } from "@/game/engine";
import type { Skill } from "@/game/types";
import { cn } from "@/lib/utils";
import { DungeonBoard } from "./DungeonBoard";
import { GameCard } from "./GameCard";

type Panel = "deck" | "draw" | "discard" | "skills" | "restart" | "controls" | undefined;
const SKILLS: { id: Skill; name: string; icon: typeof Sword; effect: string }[] = [
  { id: "strength", name: "Strength", icon: Sword, effect: "+1 melee damage" },
  { id: "dexterity", name: "Dexterity", icon: Wind, effect: "+1 AP each turn" },
  { id: "toughness", name: "Toughness", icon: Shield, effect: "+6 maximum HP and heal 6" },
  { id: "wisdom", name: "Wisdom", icon: Sparkles, effect: "+1 spell damage" },
];
export default function GameScreen() {
  const [game, dispatch] = useReducer(reduceGame, undefined, () => createGame());
  const [panel, setPanel] = useState<Panel>();
  const [inspected, setInspected] = useState<number>();
  const [runNumber, setRunNumber] = useState(1);
  return <RunView game={game} dispatch={dispatch} panel={panel} setPanel={setPanel} inspected={inspected} setInspected={setInspected} runNumber={runNumber} restart={() => { setPanel(undefined); setRunNumber(v => v + 1); dispatch({ type: "restart", seed: Math.floor(Math.random() * 999999) }); }} />;
}
function RunView({ game, dispatch, panel, setPanel, inspected, setInspected, runNumber, restart }: {
  game: ReturnType<typeof createGame>; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]>;
  panel: Panel; setPanel: (panel: Panel) => void; inspected?: number; setInspected: (id: number) => void;
  runNumber: number; restart: () => void;
}) {
  const rewardOpen = game.rewards.length > 0 && game.phase !== "dead" && game.phase !== "won";
  const busy = game.phase !== "player" || rewardOpen || game.pendingScry.length > 0;
  useEffect(() => {
    if (game.phase !== "enemy" || rewardOpen || panel || game.pendingScry.length) return;
    const timer = setTimeout(() => dispatch({ type: "enemies" }), 520);
    return () => clearTimeout(timer);
  }, [game.phase, rewardOpen, panel, game.pendingScry.length, dispatch]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (panel || busy || event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName))) return;
      const directions: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
      const dir = directions[event.key];
      if (dir) { event.preventDefault(); dispatch({ type: "move", dx: dir[0], dy: dir[1] }); }
      else if (event.key === " ") { event.preventDefault(); dispatch({ type: "end" }); }
      else if (event.key === "Escape") dispatch({ type: "select" });
      else if (/^[1-9]$/.test(event.key)) { const c = game.hand[Number(event.key) - 1]; if (c) dispatch({ type: "select", uid: c.uid }); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [game.hand, panel, busy, dispatch]);
  const nearby = game.enemies.filter(e => visible(game, e));
  const enemy = nearby.find(e => e.id === inspected) ?? nearby[0];
  const def = enemy ? ENEMIES[enemy.kind] : undefined;
  const list = panel === "draw" ? game.draw : panel === "discard" ? game.discard : game.deck;
  const selected = game.hand.find(c => c.uid === game.selected);
  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand"><div className="brand-mark"><Layers /></div><div><h1>DEEPDRAW<span className="brand-dot">.</span></h1><p>THE FORGOTTEN CRYPT</p></div><span className="prototype-label">PLAYTEST 01</span></div>
        <nav className="header-tools"><Button variant="ghost" size="icon" title="Controls" aria-label="Controls" onClick={() => setPanel("controls")}><CircleHelp /></Button><Button variant="ghost" onClick={() => setPanel("deck")}><BookOpen /><span>Deck</span><span className="nav-count">{game.deck.length}</span></Button><Button variant="ghost" size="icon" title="New run" aria-label="New run" onClick={() => setPanel("restart")}><RotateCcw /></Button></nav>
      </header>
      <section className="run-bar">
        <div className="floor-heading"><span className="floor-symbol"><ArrowDownToLine /></span><div><span className="eyebrow">FLOOR {String(game.floor).padStart(2, "0")} / 03</span><h2>{game.floor === 1 ? "The Forgotten Crypt" : game.floor === 2 ? "The Haunted Halls" : "The Ember Vault"}</h2></div></div>
        <div className="player-vitals"><div className="hp-stat"><Heart /><div><span className="stat-label">HEALTH</span><span className="stat-value">{game.hp}<small> / {game.maxHp}</small></span><div className="health-meter"><progress value={game.hp} max={game.maxHp} /></div></div></div><div className="ap-stat"><Zap /><div><span className="stat-label">ACTION POINTS</span><div className="ap-pips">{Array.from({ length: Math.max(game.maxAp, game.ap) }, (_, i) => <span key={i} className={cn("ap-pip", i < game.ap && "ap-filled")} />)}<b>{game.ap}<small> / {game.maxAp}</small></b></div></div></div><Button variant="ghost" className="level-stat" onClick={() => setPanel("skills")} title="Specializations"><Sparkles /><div><span className="stat-label">LEVEL {game.level}</span><span className="xp-label">{game.xp} / {game.level * 10} XP</span></div>{game.skillPoints > 0 && <span className="upgrade-dot">{game.skillPoints}</span>}</Button></div>
      </section>
      <div className="game-layout">
        <section className="exploration-area">
          <div className="map-topline"><span><span className={cn("status-dot", game.phase === "enemy" && "enemy-dot")} />{game.phase === "enemy" ? "ENEMY TURN" : game.phase === "dead" ? "FALLEN" : game.phase === "won" ? "ESCAPED" : "YOUR TURN"}</span><span>TURN {String(game.turn).padStart(2, "0")}<span className="topline-divider">/</span>SEED {game.seed}</span></div>
          <DungeonBoard game={game} dispatch={dispatch} onInspect={setInspected} />
          <div className="map-bottomline"><span><Crosshair size={13} />{selected ? `Targeting ${CARDS[selected.id].name}` : nearby.length ? `${nearby.length} ${nearby.length === 1 ? "enemy" : "enemies"} in sight` : "The halls are quiet"}</span><span>{game.block > 0 && <span className="block-status"><Shield size={13} />{game.block} BLOCK</span>}{game.enchanted && <span className="magic-status"><Sparkles size={13} />ENCHANTED</span>}<span className="map-depth"><Layers size={13} />{game.tiles.filter(t => t.seen && t.kind !== "wall").length} tiles explored</span></span></div>
        </section>
        <aside className="game-sidebar">
          <div className="sidebar-heading"><span className="eyebrow">IN YOUR PATH</span><span className="small-count">{nearby.length}</span></div>
          {enemy && def ? <div className="enemy-inspector"><div className="enemy-portrait"><img src={ART[enemy.kind][0]} alt={def.name} /><span className="enemy-portrait-grid" /></div><div className="enemy-name"><h3>{def.name}</h3><span>{enemy.hp}<small> / {enemy.maxHp} HP</small></span></div><div className="enemy-intent"><Sword size={14} /><span>{enemyIntent(game, enemy)}</span><span>next turn</span></div><div className="enemy-stats"><span><Sword />{def.damage}<small>DAMAGE</small></span><span><Crosshair />{def.range}<small>RANGE</small></span><span><Wind />{def.movement}<small>MOVE</small></span></div><p className="enemy-counter">{def.counter}</p>{(enemy.burn > 0 || enemy.slow > 0 || enemy.root > 0) && <div className="enemy-effects">{enemy.burn > 0 && <span><Flame size={12} />Burn {enemy.burn}</span>}{enemy.slow > 0 && <span>Slowed</span>}{enemy.root > 0 && <span>Rooted</span>}</div>}<div className="enemy-selector">{nearby.map(e => <Button key={e.id} variant="ghost" size="icon" title={ENEMIES[e.kind].name} aria-label={`Inspect ${ENEMIES[e.kind].name}`} onClick={() => setInspected(e.id)} className={cn(e.id === enemy.id && "enemy-active")}><img src={ART[e.kind][0]} alt="" /></Button>)}</div></div> : <div className="quiet-state"><Leaf /><h3>Uncharted halls</h3><span>The descent continues.</span></div>}
          <div className="journal-heading"><span className="eyebrow">RUN JOURNAL</span><span className="journal-line" /></div>
          <div className="journal" aria-live="polite">{game.log.slice(0, 5).map((entry, i) => <div className={cn("journal-entry", `journal-${entry.tone}`, i === 0 && "journal-new")} key={entry.id}><span className="journal-tick" /><p>{entry.text}</p></div>)}</div>
          <div className="run-progress"><span><Skull size={14} />{game.kills} defeated</span><span><Diamond size={13} />{game.chests} chests</span></div>
        </aside>
      </div>
      <section className="hand-section">
        <div className="hand-heading"><div><span className="eyebrow">YOUR HAND</span><span className="hand-size">{game.hand.length} CARDS</span></div><div className="chain-indicator">{game.lastTag ? <><LinkChain />{game.lastTag} chain <b>×{game.cardsPlayed}</b></> : <><span className="chain-empty" />NO ACTIVE CHAIN</>}</div></div>
        <div className="hand-layout"><Button variant="ghost" className="pile-button" onClick={() => setPanel("draw")} title="Inspect draw pile"><span className="pile-icon"><Layers /><b>{game.draw.length}</b></span><span>DRAW PILE</span><small>{game.deck.length} in deck</small></Button><div className="hand-cards">{game.hand.map(c => <GameCard key={c.uid} id={c.id} selected={game.selected === c.uid} reason={cardReason(game, c.uid)} onClick={() => dispatch({ type: "select", uid: c.uid })} />)}</div><Button variant="ghost" className="pile-button discard-pile" onClick={() => setPanel("discard")} title="Inspect discard pile"><span className="pile-icon"><Layers /><b>{game.discard.length}</b></span><span>DISCARD</span><small>{game.exhausted.length} exhausted</small></Button></div>
        <div className="turn-controls"><div className="turn-message" role="status">{selected ? <><Crosshair size={14} />{CARDS[selected.id].name} ready<Button variant="ghost" size="icon" aria-label="Cancel selected card" title="Cancel selected card" onClick={() => dispatch({ type: "select" })}><X /></Button></> : game.notice ? game.notice : <span>Every step is a choice.</span>}</div><div className="movement-controls">{[{ icon: ArrowLeft, dx: -1, dy: 0, name: "Move left" }, { icon: ArrowUp, dx: 0, dy: -1, name: "Move up" }, { icon: ArrowDown, dx: 0, dy: 1, name: "Move down" }, { icon: ArrowRight, dx: 1, dy: 0, name: "Move right" }].map(({ icon: Icon, dx, dy, name }) => <Button key={name} variant="outline" size="icon" disabled={busy} title={name} aria-label={name} onClick={() => dispatch({ type: "move", dx, dy })}><Icon /></Button>)}</div><Button className="end-turn" disabled={busy} onClick={() => dispatch({ type: "end" })}>{game.phase === "enemy" ? "Enemies acting…" : "End turn"}<ChevronRight /></Button></div>
      </section>
      <footer className="game-footer"><span><span className="status-dot" />PROTOTYPE / IN DEVELOPMENT</span><span>RUN {String(runNumber).padStart(2, "0")}<span className="footer-separator">·</span>NO RUN SAVED</span></footer>

      <Dialog open={!!panel} onOpenChange={open => { if (!open) setPanel(undefined); }}><DialogContent className={cn("game-dialog", ["deck", "draw", "discard"].includes(panel ?? "") && "deck-dialog")}><DialogTitle className="dialog-heading">{panel === "skills" ? "Choose your path" : panel === "restart" ? "Begin a new descent?" : panel === "controls" ? "Controls" : panel === "draw" ? "Draw pile" : panel === "discard" ? "Discard pile" : "Your deck"}</DialogTitle><DialogDescription className="dialog-subheading">{panel === "skills" ? `${game.skillPoints} skill ${game.skillPoints === 1 ? "point" : "points"} available · Level ${game.level}` : panel === "restart" ? "Your current run will be lost." : panel === "controls" ? "The Forgotten Crypt · playtest controls" : `${list.length} cards${panel === "draw" ? " · order hidden" : ""}${game.deckEdits ? ` · ${game.deckEdits} deck edit available` : ""}`}</DialogDescription>
        {panel === "restart" ? <div className="dialog-actions"><Button variant="outline" onClick={() => setPanel(undefined)}>Keep playing</Button><Button onClick={restart}><RotateCcw />New run</Button></div> : panel === "skills" ? <div className="skill-choices">{SKILLS.map(skill => <Button variant="outline" key={skill.id} disabled={game.skillPoints < 1} onClick={() => dispatch({ type: "skill", skill: skill.id })} className={`skill-choice skill-${skill.id}`}><skill.icon /><span><b>{skill.name}</b><small>{skill.effect}</small></span><span className="skill-rank">{game.skills[skill.id]}<ChevronRight /></span></Button>)}</div> : panel === "controls" ? <dl className="control-list"><div><dt>Move / attack adjacent enemy</dt><dd>W A S D / Arrow keys</dd></div><div><dt>Select card</dt><dd>1–9 / click card</dd></div><div><dt>Target / move / open</dt><dd>Click a tile</dd></div><div><dt>End turn early</dt><dd>Space</dd></div><div><dt>Cancel targeting</dt><dd>Esc</dd></div></dl> : <><div className="deck-tabs">{(["deck", "draw", "discard"] as const).map(tab => <Button variant="ghost" className={cn(panel === tab && "tab-active")} key={tab} onClick={() => setPanel(tab)}>{tab === "deck" ? "Deck" : tab === "draw" ? "Draw" : "Discard"}<span>{tab === "deck" ? game.deck.length : tab === "draw" ? game.draw.length : game.discard.length}</span></Button>)}<Button variant="ghost" onClick={() => setPanel("skills")}><Sparkles />Skills{game.skillPoints > 0 && <b>{game.skillPoints}</b>}</Button></div><div className="deck-card-grid">{[...list].sort((a, b) => CARDS[a.id].name.localeCompare(CARDS[b.id].name)).map(c => <div className="deck-card-item" key={c.uid}><GameCard id={c.id} compact />{panel === "deck" && !CARDS[c.id].gear && <div className="deck-edits"><Button variant="ghost" size="icon" title="Pin for next floor’s opening hand (1 deck edit)" aria-label={`Pin ${CARDS[c.id].name}`} disabled={!game.deckEdits || game.pinned === c.uid} onClick={() => dispatch({ type: "pin", uid: c.uid })} className={cn(game.pinned === c.uid && "pinned-card")}><Pin /></Button><Button variant="ghost" size="icon" title="Remove from deck (1 deck edit)" aria-label={`Remove ${CARDS[c.id].name}`} disabled={!game.deckEdits} onClick={() => dispatch({ type: "remove", uid: c.uid })}><Trash2 /></Button></div>}</div>)}{!list.length && <p className="empty-pile">No cards here.</p>}</div></>}
      </DialogContent></Dialog>
      <Dialog open={rewardOpen}><DialogContent className="game-dialog reward-dialog" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}><span className="reward-symbol"><Diamond /></span><DialogTitle className="dialog-heading">A little stronger</DialogTitle><DialogDescription className="dialog-subheading">Choose one card to add to your deck.</DialogDescription><div className="reward-cards">{game.rewards.map(id => <GameCard key={id} id={id} onClick={() => dispatch({ type: "reward", id })} />)}</div><Button variant="ghost" onClick={() => dispatch({ type: "reward" })}>Skip reward<ChevronRight /></Button></DialogContent></Dialog>
      <Dialog open={game.pendingScry.length > 0}><DialogContent className="game-dialog reward-dialog" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}><DialogTitle className="dialog-heading">Scry</DialogTitle><DialogDescription className="dialog-subheading">Choose your next draw, then the cards after it.</DialogDescription><div className="reward-cards">{game.pendingScry.map(uid => { const c = game.draw.find(c => c.uid === uid); return c ? <GameCard key={uid} id={c.id} onClick={() => dispatch({ type: "scry", uid })} /> : null; })}</div></DialogContent></Dialog>
      <Dialog open={game.phase === "dead" || game.phase === "won"}><DialogContent className="game-dialog outcome-dialog" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>{game.phase === "won" ? <Trophy className="outcome-icon" /> : <Skull className="outcome-icon" />}<DialogTitle className="dialog-heading">{game.phase === "won" ? "Out of the deep" : "The crypt claims another"}</DialogTitle><DialogDescription className="dialog-subheading">{game.phase === "won" ? "You escaped all three floors." : `You fell on floor ${game.floor}. The next run is a new chance.`}</DialogDescription><div className="outcome-stats"><span><b>{game.kills}</b>ENEMIES</span><span><b>{game.turn}</b>TURNS</span><span><b>{game.level}</b>LEVEL</span></div><Button onClick={restart}><RotateCcw />Another descent</Button></DialogContent></Dialog>
    </main>
  );
}
function LinkChain() { return <Zap size={12} />; }