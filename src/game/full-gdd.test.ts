import { describe, expect, it } from "vitest";
import RNG from "rot-js/lib/rng";
import { CARDS, REWARDS, STARTER, type CardId } from "./cards";
import { generateDungeon, reachableTiles, verifyDungeon } from "./dungeon";
import { ENEMIES } from "./enemies";
import { cardReason, createGame, effectiveDamage, reduceGame, tileAt, walkable } from "./engine";
import type { EnemyKind, GameState } from "./types";

function arena() {
  const s = createGame(124);
  s.tiles.forEach(t => { t.kind = t.x === 0 || t.y === 0 || t.x === s.width - 1 || t.y === s.height - 1 ? "wall" : "floor"; delete t.loot; });
  s.player = { x: 10, y: 10 }; s.enemies = []; s.hand = s.hand.filter(c => c.id === "sword");
  s.draw = s.deck.filter(c => !s.hand.some(v => v.uid === c.uid)); s.discard = [];
  return s;
}
function add(s: GameState, id: CardId) {
  const c = { id, uid: s.nextUid++ }; s.deck.push(c); s.hand.push(c); return c;
}
function enemy(s: GameState, kind: EnemyKind, x = 11, y = 10, id = 900) {
  const e = { kind, id, x, y, hp: ENEMIES[kind].hp, maxHp: ENEMIES[kind].hp, burn: 0, slow: 0, root: 0, awake: true };
  s.enemies.push(e); return e;
}
function play(s: GameState, id: CardId, x = 11, y = 10) {
  const c = s.hand.find(c => c.id === id) ?? add(s, id);
  s = reduceGame(s, { type: "select", uid: c.uid });
  return CARDS[id].target === "self" ? s : reduceGame(s, { type: "tile", point: { x, y } });
}
function end(s: GameState) { return reduceGame(reduceGame(s, { type: "end" }), { type: "enemies" }); }

describe("Full GDD rules", () => {
  it("starts with exactly 100 HP, 3 AP and a hand of 5 including retained Sword", () => {
    const s = createGame(); expect([s.hp, s.maxHp, s.ap, s.maxAp, s.hand.length]).toEqual([100, 100, 3, 3, 5]);
  });
  it("keeps the player phase at 0 AP for a valid Melee follow-up", () => {
    let s = arena(); s.ap = 1; enemy(s, "brute"); add(s, "pommel"); s = play(s, "sword");
    expect(s.ap).toBe(0); expect(s.phase).toBe("player"); s = play(s, "pommel");
    expect(s.enemies[0]?.hp).toBe(11); expect(s.phase).toBe("enemy");
  });
  it("auto-ends at 0 AP if the only follow-up has no legal target", () => {
    let s = arena(); s.ap = 1; add(s, "pommel"); s = reduceGame(s, { type: "move", dx: 0, dy: 1 }); expect(s.phase).toBe("enemy");
  });
  it("allows Adrenaline at 0 AP without allowing negative-AP movement", () => {
    let s = arena(); s.ap = 0; add(s, "adrenaline"); s = reduceGame(s, { type: "move", dx: 1, dy: 0 }); expect(s.ap).toBe(0); expect(s.player.x).toBe(10);
    s = play(s, "adrenaline"); expect(s.ap).toBe(2); expect(s.phase).toBe("player");
  });
  it("discards unplayed standard cards at player turn end", () => {
    const s = arena(); const c = add(s, "heavy"); const n = reduceGame(s, { type: "end" }); expect(n.hand.map(c => c.id)).toEqual(["sword"]); expect(n.discard.some(v => v.uid === c.uid)).toBe(true);
  });
  it("Spinning Kick costs 1 AP and hits every cardinal adjacent enemy for 3", () => {
    let s = arena(); enemy(s, "brute"); enemy(s, "skeleton", 10, 11, 901); enemy(s, "skeleton", 12, 10, 902); s = play(s, "kick"); expect(s.ap).toBe(2); expect(s.enemies.map(e => e.hp)).toEqual([13, 5, 8]);
  });
  it("Magic Sword is retained and deals exactly 4 damage to a Ghost", () => {
    let s = arena(); enemy(s, "ghost"); s = play(s, "magic"); expect(s.enemies[0]?.hp).toBe(2); expect(s.ap).toBe(2); s = end(s); expect(s.hand.filter(c => c.id === "magic")).toHaveLength(1);
  });
  it("Fireball costs 2 AP, deals 4 damage, and has range 3", () => {
    let s = arena(); enemy(s, "brute", 13, 10); s = play(s, "fireball", 13, 10); expect(s.enemies[0]?.hp).toBe(12); expect(s.ap).toBe(1);
    const c = add(s, "fireball"); s.ap = 3; s = reduceGame(s, { type: "select", uid: c.uid }); s = reduceGame(s, { type: "tile", point: { x: 14, y: 10 } }); expect(s.ap).toBe(3);
  });
  it("Fireball turns deep water into permanently walkable dry ground", () => {
    let s = arena(); const t = tileAt(s, { x: 11, y: 10 }); if (!t) throw Error("missing tile"); t.kind = "water"; s = play(s, "fireball"); expect(tileAt(s, t)?.kind).toBe("floor"); expect(walkable(s, t)).toBe(true);
  });
  it("Bridge Builder costs 1 AP and exhausts after creating a permanent bridge", () => {
    let s = arena(); const t = tileAt(s, { x: 11, y: 10 }); if (!t) throw Error("missing tile"); t.kind = "water"; s = play(s, "bridge"); expect(s.ap).toBe(2); expect(tileAt(s, t)?.kind).toBe("bridge"); expect(s.deck.some(c => c.id === "bridge")).toBe(false); expect(s.exhausted.at(-1)?.id).toBe("bridge");
    for (let i = 0; i < 4; i++) s = end(s); expect(tileAt(s, t)?.kind).toBe("bridge");
  });
  it("Ice Bridge freezes 3 water tiles for exactly 3 enemy turns", () => {
    let s = arena(); for (const x of [11, 12, 13]) { const t = tileAt(s, { x, y: 10 }); if (t) t.kind = "water"; }
    s = play(s, "ice"); expect([11, 12, 13].map(x => tileAt(s, { x, y: 10 })?.iceTurns)).toEqual([3, 3, 3]);
    s = end(s); s = end(s); expect(tileAt(s, { x: 11, y: 10 })?.kind).toBe("ice"); s = end(s); expect(tileAt(s, { x: 11, y: 10 })?.kind).toBe("water");
  });
  it("Water Walking crosses water and expires after 3 turns off water", () => {
    let s = arena(); const t = tileAt(s, { x: 11, y: 10 }); if (t) t.kind = "water"; s = play(s, "waterwalk"); s = reduceGame(s, { type: "move", dx: 1, dy: 0 }); expect(s.player.x).toBe(11); s = reduceGame(s, { type: "move", dx: 1, dy: 0 }); for (let i = 0; i < 3; i++) s = end(s); expect(s.waterWalking).toBe(0);
  });
  it("Scry 3 can reorder AND discard without losing or duplicating cards", () => {
    let s = arena(); s.draw = [{ uid: 80, id: "heavy" }, { uid: 81, id: "frost" }, { uid: 82, id: "knife" }]; s = play(s, "scry"); expect(s.pendingScry).toEqual([80, 81, 82]);
    s = reduceGame(s, { type: "scry", uid: 82 }); s = reduceGame(s, { type: "scry", uid: 80, discard: true }); s = reduceGame(s, { type: "scry", uid: 81 }); expect(s.draw.map(c => c.uid)).toEqual([82, 81]); expect(s.knownDraws).toEqual([82, 81]); expect(s.discard.some(c => c.uid === 80)).toBe(true); expect(s.pendingScry).toHaveLength(0);
  });
  it("Toughness scales next-hit reduction from 50% to 75% to 100%, consuming it once", () => {
    for (const [rank, hp] of [[0, 91], [1, 92], [2, 94]]) {
      let s = arena(); s.skills.toughness = rank ?? 0; s.turn = 2; enemy(s, "brute"); enemy(s, "brute", 10, 11, 901); s = play(s, "guard"); s = end(s); expect(s.hp).toBe(hp);
    }
  });
  it("Strength buffs Fire, Wisdom buffs Magic melee, Dexterity buffs Ranged", () => {
    const s = arena(); s.skills = { strength: 1, wisdom: 1, dexterity: 1, toughness: 0 }; const e = enemy(s, "brute"); expect(effectiveDamage(s, "spark", e)).toBe(4); expect(effectiveDamage(s, "magic", e)).toBe(6); expect(effectiveDamage(s, "knife", e)).toBe(3);
  });
  it("Dexterity rank 2 grants one free cardinal movement but interactions still cost 1 AP", () => {
    let s = arena(); s.skillPoints = 2; s = reduceGame(s, { type: "skill", skill: "dexterity" }); s = reduceGame(s, { type: "skill", skill: "dexterity" }); expect(s.maxAp).toBe(5); s = reduceGame(s, { type: "move", dx: 1, dy: 0 }); expect(s.ap).toBe(5); expect(s.freeMoves).toBe(0); const t = tileAt(s, { x: 12, y: 10 }); if (t) t.kind = "door"; s = reduceGame(s, { type: "move", dx: 1, dy: 0 }); expect(s.ap).toBe(4);
  });
  it("skill branches unlock heavy gear, retained defense, and Scry", () => {
    let s = arena(); s.skillPoints = 3; s = reduceGame(s, { type: "skill", skill: "strength" }); s = reduceGame(s, { type: "skill", skill: "toughness" }); s = reduceGame(s, { type: "skill", skill: "wisdom" }); expect(s.hand.map(c => c.id)).toEqual(expect.arrayContaining(["warhammer", "tower"])); expect(s.deck.some(c => c.id === "scry")).toBe(true);
  });
  it("Stone Brute moves on cooldown turns but only attacks every other turn", () => {
    let s = arena(); enemy(s, "brute", 12, 10); s = end(s); expect(s.enemies[0]?.x).toBe(11); expect(s.hp).toBe(100); s = end(s); expect(s.hp).toBe(94); s = end(s); expect(s.hp).toBe(94);
  });
  it("Archer movement never exceeds its 1-tile budget including retreat", () => {
    let s = arena(); enemy(s, "archer", 14, 10); s = end(s); expect(s.enemies[0]?.x).toBe(13); expect(s.hp).toBe(98);
    s = arena(); enemy(s, "archer", 11, 10); s = end(s); expect(s.enemies[0]?.x).toBe(12); expect(s.hp).toBe(98);
  });
  it("uses the exact Skeleton, Archer, Brute and Ghost attributes from the GDD", () => {
    expect([ENEMIES.skeleton.hp, ENEMIES.skeleton.damage, ENEMIES.skeleton.movement, ENEMIES.skeleton.range, ENEMIES.skeleton.interval]).toEqual([8, 3, 1, 1, 1]);
    expect([ENEMIES.archer.hp, ENEMIES.archer.damage, ENEMIES.archer.movement, ENEMIES.archer.range, ENEMIES.archer.interval]).toEqual([6, 2, 1, 3, 1]);
    expect([ENEMIES.brute.hp, ENEMIES.brute.damage, ENEMIES.brute.movement, ENEMIES.brute.range, ENEMIES.brute.interval]).toEqual([16, 6, 1, 1, 2]);
    expect([ENEMIES.ghost.hp, ENEMIES.ghost.damage, ENEMIES.ghost.movement, ENEMIES.ghost.range, ENEMIES.ghost.interval]).toEqual([6, 4, 1, 1, 1]);
  });
  it("offers every nonstarter card through one complete reward rotation", () => {
    let s = arena(); const offered = new Set<CardId>(); s.pendingRewards = 8; enemy(s, "skeleton").hp = 3; s = play(s, "sword");
    while (s.rewards.length) { s.rewards.forEach(id => offered.add(id)); s = reduceGame(s, { type: "reward" }); }
    for (const id of Object.keys(CARDS) as CardId[]) expect(STARTER.includes(id) || offered.has(id)).toBe(true);
    expect(offered.size).toBe(REWARDS.length);
  });
  it("all five invented enemies plus Stone Brute appear during a three-floor run", () => {
    const kinds = new Set([1, 2, 3].flatMap(floor => generateDungeon(78241, floor).enemies.map(e => e.kind))); expect([...kinds]).toEqual(expect.arrayContaining(["skeleton", "archer", "slime", "ghost", "imp", "brute"]));
  });
  it("retained equipment can be purged with a deck edit", () => {
    let s = arena(); const c = s.hand[0]; if (!c) throw Error("missing sword"); s.deckEdits = 1; s = reduceGame(s, { type: "remove", uid: c.uid }); expect(s.deck.some(v => v.uid === c.uid)).toBe(false); expect(s.deckEdits).toBe(0);
  });
});
describe("Verified paired floor generation", () => {
  for (const seed of [1, 124, 78241, 500, 9012, 999999, 17, 42]) it(`pairs required hazards and counters for seed ${seed}`, () => {
    for (const floor of [1, 2, 3]) {
      const d = generateDungeon(seed, floor); expect(verifyDungeon(d)).toBe(true);
      const chest = d.tiles.find(t => t.loot); expect(chest?.loot).toEqual(["fireball", "bridge", "waterwalk"]);
      const before = reachableTiles(d.tiles, d.player), after = reachableTiles(d.tiles, d.player, true), stairs = d.tiles.find(t => t.kind === "stairs");
      expect(before.has(`${chest?.x},${chest?.y}`)).toBe(true); expect(before.has(`${stairs?.x},${stairs?.y}`)).toBe(false); expect(after.has(`${stairs?.x},${stairs?.y}`)).toBe(true);
      if (floor > 1) { const magic = d.tiles.find(t => t.kind === "enchant"); expect(before.has(`${magic?.x},${magic?.y}`)).toBe(true); }
    }
  });
  it("restores the ROT RNG state and reproduces identical seeded floors", () => {
    const before = RNG.getState(); const d = generateDungeon(42, 2); expect(RNG.getState()).toEqual(before); expect(generateDungeon(42, 2)).toEqual(d);
  });
  it("opening the paired supply chest costs 1 AP and makes counters available immediately", () => {
    let s = createGame(); const chest = s.tiles.find(t => t.loot); if (!chest) throw Error("missing supplies"); s = reduceGame(s, { type: "move", dx: chest.x - s.player.x, dy: chest.y - s.player.y }); expect(s.ap).toBe(2); expect(s.hand.map(c => c.id)).toEqual(expect.arrayContaining(["fireball", "bridge", "waterwalk"])); expect(s.rewards).toHaveLength(0);
  });
  it("closed doors and pillars block projectile targeting", () => {
    for (const kind of ["door", "pillar"] as const) { const s = arena(); const t = tileAt(s, { x: 12, y: 10 }); if (t) t.kind = kind; enemy(s, "brute", 13, 10); const c = add(s, "knife"); expect(cardReason(s, c.uid)).toBeDefined(); }
  });
});