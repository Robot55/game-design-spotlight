import { describe, expect, it } from "vitest";
import { CARDS, STARTER, type CardId } from "./cards";
import { createGame, cardReason, effectiveDamage, lineOfSight, reduceGame, walkable } from "./engine";
import { adjacent, generateDungeon } from "./dungeon";
import { ENEMIES } from "./enemies";
import type { Enemy, EnemyKind, GameState } from "./types";

function arena(): GameState {
  const s = createGame(124);
  s.tiles.forEach(t => { t.kind = t.x === 0 || t.y === 0 || t.x === s.width - 1 || t.y === s.height - 1 ? "wall" : "floor"; t.seen = true; });
  s.player = { x: 10, y: 10 }; s.enemies = []; s.rewards = []; s.pendingRewards = 0;
  return s;
}
function enemy(kind: EnemyKind, x = 11, y = 10): Enemy {
  return { kind, id: 900, x, y, hp: ENEMIES[kind].hp, maxHp: ENEMIES[kind].hp, burn: 0, slow: 0, root: 0, awake: true };
}
function give(s: GameState, id: CardId) {
  const existing = s.deck.find(c => c.id === id && !s.hand.some(v => v.uid === c.uid));
  const c = existing ?? { id, uid: s.nextUid++ };
  if (!existing) s.deck.push(c);
  s.draw = s.draw.filter(v => v.uid !== c.uid); s.discard = s.discard.filter(v => v.uid !== c.uid); s.hand.push(c); return c;
}
function play(s: GameState, id: CardId, x = 11, y = 10) {
  const c = s.hand.find(c => c.id === id) ?? give(s, id);
  const selected = reduceGame(s, { type: "select", uid: c.uid });
  return CARDS[id].target === "self" ? selected : reduceGame(selected, { type: "tile", point: { x, y } });
}
describe("Documented core rules", () => {
  it("starts at 3 AP with the 12-card deck and gear + 4 draws", () => {
    const s = createGame(); expect(s.ap).toBe(3); expect(STARTER).toHaveLength(12); expect(s.deck).toHaveLength(12); expect(s.hand).toHaveLength(5); expect(s.hand.filter(c => CARDS[c.id].gear).map(c => c.id)).toEqual(["sword"]);
  });
  it("movement costs exactly 1 AP and 0 AP automatically triggers enemy phase", () => {
    let s = arena(); s = reduceGame(s, { type: "move", dx: 0, dy: 1 }); expect(s.ap).toBe(2); expect(s.player.y).toBe(11);
    s = reduceGame(s, { type: "move", dx: 0, dy: 1 }); s = reduceGame(s, { type: "move", dx: 0, dy: 1 }); expect(s.ap).toBe(0); expect(s.phase).toBe("enemy");
    s = reduceGame(s, { type: "enemies" }); expect(s.ap).toBe(3); expect(s.turn).toBe(2);
  });
  it("a door costs 1 AP to open without moving into it", () => {
    const s = arena(); const t = s.tiles[10 * s.width + 11]; if (!t) throw Error("tile missing"); t.kind = "door";
    const next = reduceGame(s, { type: "move", dx: 1, dy: 0 }); expect(next.ap).toBe(2); expect(next.player.x).toBe(10); expect(next.tiles[10 * s.width + 11]?.kind).toBe("open-door");
  });
  it("Sword deals 3 damage for 1 AP and stays in hand across turns", () => {
    const s = arena(); s.enemies = [enemy("slime")]; const next = play(s, "sword"); expect(next.enemies[0]?.hp).toBe(9); expect(next.ap).toBe(2); expect(next.hand.some(c => c.id === "sword")).toBe(true);
    const turn = reduceGame(reduceGame(next, { type: "end" }), { type: "enemies" }); expect(turn.hand.filter(c => c.id === "sword")).toHaveLength(1);
  });
  it("Heavy Swing deals 7 damage for 2 AP and adds 2 on wall impact", () => {
    const s = arena(); s.enemies = [enemy("slime")]; const wall = s.tiles[10 * s.width + 12]; if (!wall) throw Error("tile missing"); wall.kind = "wall";
    const n = play(s, "heavy"); expect(n.ap).toBe(1); expect(n.enemies[0]?.hp).toBe(3);
  });
  it("0 AP melee follow-up requires the previous card to be Melee", () => {
    const s = arena(); s.enemies = [enemy("slime")]; const pommel = s.hand.find(c => c.id === "pommel"); if (!pommel) throw Error("opener missing"); expect(cardReason(s, pommel.uid)).toBeDefined();
    let n = play(s, "sword"); expect(cardReason(n, pommel.uid)).toBeUndefined(); n = play(n, "pommel"); expect(n.ap).toBe(2); expect(n.enemies[0]?.hp).toBe(7); expect(n.enemies[0]?.x).toBe(12);
  });
  it("switching to Utility breaks the melee follow-up chain", () => {
    let s = arena(); s.enemies = [enemy("slime")]; s = play(s, "sword"); s = play(s, "guard"); const c = s.hand.find(c => c.id === "pommel"); if (!c) throw Error("card missing"); expect(cardReason(s, c.uid)).toBeDefined();
  });
  it("Knife → Quick Draw deals 4 damage at range for 1 AP", () => {
    let s = arena(); s.enemies = [enemy("slime", 14, 10)]; s = play(s, "knife", 14, 10); s = play(s, "quick", 14, 10); expect(s.enemies[0]?.hp).toBe(8); expect(s.ap).toBe(2);
  });
  it("walls block line of sight for ranged attacks", () => {
    const s = arena(); const t = s.tiles[10 * s.width + 12]; if (!t) throw Error("tile missing"); t.kind = "wall"; expect(lineOfSight(s, s.player, { x: 14, y: 10 })).toBe(false);
  });
  it("Healing Potion restores 8 HP and exhausts from the run", () => {
    const s = arena(); s.hp = 15; const n = play(s, "potion"); expect(n.hp).toBe(23); expect(n.ap).toBe(3); expect(n.exhausted.some(c => c.id === "potion")).toBe(true); expect(n.deck.some(c => c.id === "potion")).toBe(false);
  });
  it("Guard blocks 4 damage until next turn", () => {
    let s = arena(); s.enemies = [enemy("imp", 12, 10)]; s.turn = 2; s = play(s, "guard"); expect(s.block).toBe(4); s = reduceGame(reduceGame(s, { type: "end" }), { type: "enemies" }); expect(s.hp).toBe(30); expect(s.block).toBe(0);
  });
  it("ghosts reject ordinary physical damage but accept spells and enchanted melee", () => {
    const s = arena(); const e = enemy("ghost"); expect(effectiveDamage(s, "sword", e)).toBe(0); expect(effectiveDamage(s, "spark", e)).toBe(2); s.enchanted = true; expect(effectiveDamage(s, "sword", e)).toBe(4);
  });
  it("Fire Imps are immune to fire and take double cold damage", () => {
    const s = arena(); const e = enemy("imp"); expect(effectiveDamage(s, "spark", e)).toBe(0); expect(effectiveDamage(s, "frost", e)).toBe(4);
  });
  it("Slimes have 12 HP and split into exactly two 4 HP mini-slimes", () => {
    let s = arena(); const e = enemy("slime"); expect(e.hp).toBe(12); e.hp = 3; s.enemies = [e]; s = play(s, "sword"); expect(s.enemies).toHaveLength(2); expect(s.enemies.map(e => e.hp)).toEqual([4, 4]); expect(s.enemies.every(e => e.kind === "mini")).toBe(true);
  });
  it("levels require 10 XP, then 20 XP, and grant skill and deck edits", () => {
    let s = arena(); s.xp = 9; const e = enemy("skeleton"); e.hp = 3; s.enemies = [e]; s = play(s, "sword"); expect(s.level).toBe(2); expect(s.xp).toBe(3); expect(s.skillPoints).toBe(1); expect(s.deckEdits).toBe(1);
    s.rewards = []; s.pendingRewards = 0; s.xp = 19; const e2 = enemy("skeleton"); e2.hp = 3; s.enemies = [e2]; s = play(s, "sword"); expect(s.level).toBe(3); expect(s.xp).toBe(3);
  });
  it("draw pile reshuffles discard without duplicating gear or exhausting unplayed cards", () => {
    let s = arena(); s.draw = []; s.discard = s.deck.filter(c => !CARDS[c.id].gear && !s.hand.some(v => v.uid === c.uid)); s = reduceGame(reduceGame(s, { type: "end" }), { type: "enemies" });
    expect(s.hand).toHaveLength(5); expect(s.exhausted).toHaveLength(0); expect(new Set([...s.hand, ...s.draw, ...s.discard].map(c => c.uid)).size).toBe(12);
  });
  it("Finisher adds 2 damage for each previously played card", () => { const s = arena(); s.cardsPlayed = 3; expect(effectiveDamage(s, "finisher", enemy("slime"))).toBe(9); });
  it("Scry permits a chosen order even with fewer than 3 draws", () => {
    let s = arena(); s.draw = [{ id: "heavy", uid: 81 }, { id: "frost", uid: 82 }]; s.pendingScry = [81, 82]; s = reduceGame(s, { type: "scry", uid: 82 }); s = reduceGame(s, { type: "scry", uid: 81 }); expect(s.draw.map(c => c.uid)).toEqual([82, 81]);
  });
  it("3 floors make a complete run, and restart resets run state", () => {
    let s = arena(); s.floor = 3; const t = s.tiles[10 * s.width + 11]; if (!t) throw Error("tile missing"); t.kind = "stairs"; s = reduceGame(s, { type: "move", dx: 1, dy: 0 }); expect(s.phase).toBe("won"); s = reduceGame(s, { type: "restart", seed: 552 }); expect(s.floor).toBe(1); expect(s.hp).toBe(30); expect(s.kills).toBe(0); expect(s.seed).toBe(552);
  });
});
describe("Random dungeon solvability", () => {
  for (const seed of [1, 78241, 124, 500, 9012]) it(`connects stairs and offers magic solutions for seed ${seed}`, () => {
    for (const floor of [1, 2, 3]) {
      const d = generateDungeon(seed, floor); const s = { ...arena(), ...d }; const seen = new Set<string>(); const q = [d.player];
      while (q.length) { const p = q.shift(); if (!p) break; const k = `${p.x},${p.y}`; if (seen.has(k)) continue; seen.add(k); for (const n of adjacent(p)) { const t = s.tiles[n.y * s.width + n.x]; if (t && n.x >= 0 && n.y >= 0 && n.x < s.width && n.y < s.height && (walkable(s, n) || t.kind === "door" || t.kind === "chest")) { if (!seen.has(`${n.x},${n.y}`)) q.push(n); } } }
      const stairs = d.tiles.find(t => t.kind === "stairs"); expect(stairs).toBeDefined(); expect(seen.has(`${stairs?.x},${stairs?.y}`)).toBe(true);
      expect(d.enemies.every(e => ENEMIES[e.kind] !== undefined)).toBe(true);
      if (d.enemies.some(e => e.kind === "ghost")) { const magic = d.tiles.find(t => t.kind === "enchant"); expect(magic).toBeDefined(); expect(seen.has(`${magic?.x},${magic?.y}`)).toBe(true); }
    }
  });
});