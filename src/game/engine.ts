import AStar from "rot-js/lib/path/astar";
import RNG from "rot-js/lib/rng";
import { CARDS, REWARDS, STARTER, type CardId } from "./cards";
import { adjacent, distance, generateDungeon } from "./dungeon";
import { ENEMIES } from "./enemies";
import type { CardInstance, Enemy, GameState, Point, Skill } from "./types";

export type GameAction =
  | { type: "select"; uid?: number }
  | { type: "tile"; point: Point }
  | { type: "move"; dx: number; dy: number }
  | { type: "end" } | { type: "enemies" }
  | { type: "reward"; id?: CardId }
  | { type: "skill"; skill: Skill }
  | { type: "remove"; uid: number } | { type: "pin"; uid: number }
  | { type: "scry"; uid: number };

export const tileAt = (s: GameState, p: Point) => p.x >= 0 && p.y >= 0 && p.x < s.width && p.y < s.height ? s.tiles[p.y * s.width + p.x] : undefined;
export const walkable = (s: GameState, p: Point) => {
  const t = tileAt(s, p);
  return !!t && !["wall", "door", "chest", "water", "rubble"].includes(t.kind);
};
export function lineOfSight(s: GameState, a: Point, b: Point) {
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
  let err = dx - dy;
  while (x !== b.x || y !== b.y) {
    const e = 2 * err;
    if (e > -dy) { err -= dy; x += sx; }
    if (e < dx) { err += dx; y += sy; }
    if (x === b.x && y === b.y) break;
    const t = tileAt(s, { x, y });
    if (!t || ["wall", "door", "rubble"].includes(t.kind)) return false;
  }
  return true;
}
export const visible = (s: GameState, p: Point) => distance(s.player, p) <= 8 && lineOfSight(s, s.player, p);
function reveal(s: GameState) {
  for (const t of s.tiles) if (visible(s, t)) t.seen = true;
  for (const e of s.enemies) if (visible(s, e) && distance(s.player, e) <= 7) e.awake = true;
}
function log(s: GameState, text: string, tone: "normal" | "hit" | "good" | "enemy" = "normal") {
  s.log.unshift({ id: (s.log[0]?.id ?? 0) + 1, text, tone });
  s.log = s.log.slice(0, 30); s.notice = text;
}
function shuffle<T>(s: GameState, list: T[]): T[] {
  const rng = RNG.clone().setSeed(s.seed + s.turn * 313 + s.nextUid * 17 + s.kills * 101 + s.draw.length);
  return rng.shuffle(list);
}
function drawCards(s: GameState, count: number) {
  for (let i = 0; i < count; i++) {
    if (!s.draw.length && s.discard.length) { s.draw = shuffle(s, s.discard); s.discard = []; }
    const c = s.draw.shift(); if (c) s.hand.push(c);
  }
}
function startHand(s: GameState, opening = false) {
  s.hand = s.deck.filter(c => CARDS[c.id].gear);
  if (opening && s.pinned !== undefined) {
    const index = s.draw.findIndex(c => c.uid === s.pinned);
    const c = index >= 0 ? s.draw.splice(index, 1)[0] : undefined;
    if (c) s.hand.push(c);
  }
  drawCards(s, 5 - s.hand.length);
}
export function createGame(seed = 78241): GameState {
  const dungeon = generateDungeon(seed, 1);
  const deck = STARTER.map((id, uid) => ({ id, uid }));
  const s: GameState = {
    ...dungeon, seed, floor: 1, hp: 30, maxHp: 30, ap: 3, maxAp: 3, block: 0, xp: 0, level: 1,
    skillPoints: 0, deckEdits: 0, skills: { strength: 0, dexterity: 0, toughness: 0, wisdom: 0 },
    turn: 1, phase: "player", hand: [], draw: [], discard: [], exhausted: [], deck, nextUid: 12,
    cardsPlayed: 0, enchanted: false, rewards: [], pendingRewards: 0, pendingScry: [], kills: 0, chests: 0,
    log: [], notice: "The descent begins.",
  };
  s.draw = shuffle(s, deck.filter(c => !CARDS[c.id].gear));
  // The first turn demonstrates both 1 AP melee and its 0 AP follow-up.
  const opener: CardId[] = ["pommel", "knife", "quick", "guard"];
  const opening = opener.map(id => s.draw.find(c => c.id === id)).filter((c): c is CardInstance => !!c);
  s.draw = [...opening, ...s.draw.filter(c => !opening.some(o => o.uid === c.uid))];
  startHand(s, true); reveal(s); log(s, "You enter the Forgotten Crypt.");
  return s;
}
function offerReward(s: GameState) {
  if (s.pendingRewards > 0 && !s.rewards.length) s.rewards = shuffle(s, REWARDS).slice(0, 3);
}
function gainXP(s: GameState, amount: number) {
  s.xp += amount;
  while (s.xp >= s.level * 10) {
    s.xp -= s.level * 10; s.level++; s.skillPoints++; s.deckEdits++;
    log(s, `Level ${s.level}. A new specialization awaits.`, "good");
  }
}
export function effectiveDamage(s: GameState, id: CardId, e: Enemy, multiplier = 1) {
  const c = CARDS[id];
  if (e.kind === "ghost" && c.tag !== "Spell" && !(c.tag === "Melee" && s.enchanted)) return 0;
  if (e.kind === "imp" && c.element === "Fire") return 0;
  let damage = c.damage ?? 0;
  if (id === "finisher") damage += 2 * s.cardsPlayed;
  if (c.tag === "Melee") damage += s.skills.strength + (s.enchanted ? 1 : 0);
  if (c.tag === "Spell") damage += s.skills.wisdom;
  damage = Math.ceil(damage * multiplier);
  if (e.kind === "imp" && c.element === "Cold") damage *= 2;
  return damage;
}
function kill(s: GameState, e: Enemy) {
  s.enemies = s.enemies.filter(v => v.id !== e.id); s.kills++;
  log(s, `${ENEMIES[e.kind].name} defeated. +${ENEMIES[e.kind].xp} XP`, "good");
  gainXP(s, ENEMIES[e.kind].xp);
  if (e.kind !== "mini") s.pendingRewards++;
  if (e.kind === "slime") {
    const spots = [e, ...adjacent(e)].filter(p => walkable(s, p) && distance(s.player, p) > 0 && !s.enemies.some(v => distance(v, p) === 0)).slice(0, 2);
    spots.forEach((p, index) => s.enemies.push({ id: s.nextUid++ + 1000 + index, kind: "mini", x: p.x, y: p.y, hp: 4, maxHp: 4, burn: 0, slow: 0, root: 0, awake: true }));
    log(s, "The slime splits into two smaller slimes.", "enemy");
  }
}
function hit(s: GameState, e: Enemy, id: CardId, multiplier = 1) {
  const damage = effectiveDamage(s, id, e, multiplier);
  e.hp -= damage; e.awake = true;
  log(s, damage ? `${CARDS[id].name} hits ${ENEMIES[e.kind].name} for ${damage}.` : `${ENEMIES[e.kind].name} is immune to ${CARDS[id].name}.`, damage ? "hit" : "enemy");
  if (damage > 0) {
    if (id === "spark") e.burn = 2;
    if (id === "frost") e.slow = 1;
    if (id === "pinning") e.root = 1;
    if ((id === "heavy" || id === "pommel") && e.hp > 0) {
      const dx = Math.sign(e.x - s.player.x), dy = Math.sign(e.y - s.player.y);
      const p = { x: e.x + dx, y: e.y + dy };
      if (walkable(s, p) && !s.enemies.some(v => v.id !== e.id && distance(v, p) === 0)) { e.x = p.x; e.y = p.y; }
      else { e.hp -= 2; log(s, "Wall impact! +2 damage.", "hit"); }
    }
  }
  if (e.hp <= 0) kill(s, e);
}
export function cardReason(s: GameState, uid: number): string | undefined {
  const instance = s.hand.find(c => c.uid === uid);
  if (!instance) return "Card is not in your hand.";
  const c = CARDS[instance.id];
  if (s.phase !== "player") return "Enemies are acting.";
  if (c.cost > s.ap) return `Needs ${c.cost} AP.`;
  if (c.follow && s.lastTag !== c.follow) return `Play a ${c.follow.toLowerCase()} card first.`;
  if (c.id === "echo" && !s.lastSpell) return "Play a spell first.";
  if (c.id === "potion" && s.hp === s.maxHp) return "Health is already full.";
  return undefined;
}
export function canTarget(s: GameState, id: CardId, p: Point): boolean {
  const c = CARDS[id];
  if (c.id === "sidestep" || c.id === "momentum") return distance(s.player, p) === 1 && walkable(s, p) && !s.enemies.some(e => distance(e, p) === 0);
  if (c.id === "ricochet") return !!s.lastTarget && distance(s.lastTarget, p) > 0 && distance(s.lastTarget, p) <= 3 && lineOfSight(s, s.lastTarget, p) && s.enemies.some(e => distance(e, p) === 0) && visible(s, p);
  if (c.target === "self") return true;
  if (!tileAt(s, p) || !visible(s, p) || distance(s.player, p) > (c.range ?? 1) || !lineOfSight(s, s.player, p)) return false;
  if (id === "lunge" && distance(s.player, p) > 1) return adjacent(s.player).some(a => distance(a, p) === 1 && walkable(s, a) && !s.enemies.some(e => distance(e, a) === 0));
  if (id === "heavy" && tileAt(s, p)?.kind === "rubble") return true;
  if (c.target === "enemy") return s.enemies.some(e => distance(e, p) === 0);
  return tileAt(s, p)?.kind !== "wall";
}
function spell(s: GameState, id: CardId, p: Point, multiplier = 1) {
  if (id === "fireball") {
    for (const e of [...s.enemies]) if (Math.abs(e.x - p.x) <= 1 && Math.abs(e.y - p.y) <= 1) hit(s, e, id, multiplier);
    for (const t of s.tiles) if (Math.abs(t.x - p.x) <= 1 && Math.abs(t.y - p.y) <= 1 && ["water", "ice"].includes(t.kind)) { t.kind = "floor"; delete t.iceTurns; }
  } else if (id === "ice") {
    const horizontal = Math.abs(p.x - s.player.x) >= Math.abs(p.y - s.player.y);
    for (let i = 0; i < 3; i++) {
      const t = tileAt(s, { x: p.x + (horizontal ? i : 0), y: p.y + (horizontal ? 0 : i) });
      if (t?.kind === "water") { t.kind = "ice"; t.iceTurns = 4; }
      for (const e of s.enemies) if (t && distance(e, t) === 0) e.slow = 1;
    }
    log(s, "Water freezes into a temporary bridge.", "good");
  } else { const e = s.enemies.find(e => distance(e, p) === 0); if (e) hit(s, e, id, multiplier); }
}
function play(s: GameState, uid: number, p: Point) {
  const instance = s.hand.find(c => c.uid === uid);
  if (!instance) return;
  const reason = cardReason(s, uid); if (reason) { s.notice = reason; return; }
  const c = CARDS[instance.id];
  if (!canTarget(s, c.id, p)) { s.notice = "No valid target there."; return; }
  if (c.id === "lunge" && distance(s.player, p) > 1) {
    const step = adjacent(s.player).find(a => distance(a, p) === 1 && walkable(s, a) && !s.enemies.some(e => distance(e, a) === 0));
    if (step) s.player = step;
  }
  if (c.tag === "Spell" && c.id !== "echo") { spell(s, c.id, p); s.lastSpell = { id: c.id, target: { ...p } }; }
  else if (c.id === "echo" && s.lastSpell) spell(s, s.lastSpell.id, s.lastSpell.target, 0.5);
  else if (c.id === "cleave" || c.id === "volley") {
    const targets = s.enemies.filter(e => distance(s.player, e) <= (c.range ?? 1) && lineOfSight(s, s.player, e));
    for (const e of c.id === "volley" ? targets.slice(0, 3) : targets) hit(s, e, c.id);
    if (!targets.length) log(s, `${c.name}: no enemies in range.`);
  } else if (c.target === "enemy") {
    const e = s.enemies.find(e => distance(e, p) === 0);
    if (e) hit(s, e, c.id);
    else if (c.id === "heavy") { const t = tileAt(s, p); if (t?.kind === "rubble") { t.kind = "floor"; log(s, "Heavy Swing clears the rubble."); } }
  } else if (c.id === "guard") { s.block += 4; log(s, "Guard grants 4 Block.", "good"); }
  else if (c.id === "potion") { const heal = Math.min(8, s.maxHp - s.hp); s.hp += heal; log(s, `Healing Potion restores ${heal} HP. Exhausted.`, "good"); }
  else if (c.id === "sidestep" || c.id === "momentum") { s.player = { ...p }; if (c.id === "momentum") drawCards(s, 1); log(s, c.id === "momentum" ? "Momentum: repositioned and drew a card." : "Sidestep: a free step.", "good"); }
  else if (c.id === "enchant") { s.enchanted = true; log(s, "Your blade is enchanted for this turn.", "good"); }
  else if (c.id === "adrenaline") { s.ap += 2; log(s, "Adrenaline grants 2 AP.", "good"); }
  else if (c.id === "scry") { s.pendingScry = s.draw.slice(0, 3).map(c => c.uid); log(s, "Scry reveals your upcoming cards."); }
  if (!c.gear) { s.hand = s.hand.filter(v => v.uid !== uid); if (c.consumable) { s.exhausted.push(instance); s.deck = s.deck.filter(v => v.uid !== uid); } else s.discard.push(instance); }
  s.lastTag = c.tag; s.lastTarget = { ...p }; s.cardsPlayed++; s.ap -= c.cost; s.selected = undefined;
  reveal(s); if (s.ap <= 0) s.phase = "enemy";
  offerReward(s);
}
function descend(s: GameState) {
  if (s.floor === 3) { s.phase = "won"; log(s, "You escaped the Forgotten Crypt.", "good"); return; }
  s.floor++;
  Object.assign(s, generateDungeon(s.seed, s.floor));
  s.hp = Math.min(s.maxHp, s.hp + 6); s.ap = s.maxAp; s.phase = "player"; s.block = 0; s.enchanted = false; s.lastTag = undefined; s.lastSpell = undefined; s.cardsPlayed = 0; s.selected = undefined;
  s.discard.push(...s.hand.filter(c => !CARDS[c.id].gear)); s.draw.push(...s.discard); s.discard = []; s.draw = shuffle(s, s.draw);
  startHand(s, true); reveal(s); log(s, `Floor ${s.floor}. You recover 6 HP on the descent.`, "good");
}
function move(s: GameState, p: Point) {
  const t = tileAt(s, p);
  if (!t || distance(s.player, p) !== 1) { s.notice = "That tile is too far away."; return; }
  const enemy = s.enemies.find(e => distance(e, p) === 0);
  if (enemy) { const sword = s.hand.find(c => c.id === "sword"); if (sword) play(s, sword.uid, p); return; }
  if (t.kind === "wall" || t.kind === "water" || t.kind === "rubble") { s.notice = t.kind === "water" ? "Deep water. Freeze or evaporate it." : t.kind === "rubble" ? "Heavy Swing can clear this rubble." : "Stone blocks your path."; return; }
  if (t.kind === "door") { t.kind = "open-door"; log(s, "You open the door. −1 AP"); }
  else if (t.kind === "chest") { t.kind = "open-chest"; s.chests++; s.pendingRewards++; log(s, "Chest opened. Choose a card for your deck.", "good"); offerReward(s); }
  else {
    s.player = { ...p };
    if (t.kind === "shrine") { s.hp = Math.min(s.maxHp, s.hp + 8); t.kind = "floor"; log(s, "The shrine restores 8 HP.", "good"); }
    else if (t.kind === "enchant") { const c: CardInstance = { id: "enchant", uid: s.nextUid++ }; s.deck.push(c); s.hand.push(c); t.kind = "floor"; log(s, "You found Enchant Blade. Magic can wound the ghosts.", "good"); }
    else s.notice = "";
  }
  s.ap--; s.selected = undefined; reveal(s);
  if (t.kind === "stairs") { descend(s); return; }
  if (s.ap <= 0) s.phase = "enemy";
}
function hurt(s: GameState, amount: number, name: string) {
  const blocked = Math.min(s.block, amount); s.block -= blocked; s.hp = Math.max(0, s.hp - (amount - blocked));
  log(s, `${name} attacks for ${amount}${blocked ? ` (${blocked} blocked)` : ""}.`, "enemy");
  if (s.hp <= 0) { s.phase = "dead"; log(s, "Your journey ends in the crypt.", "enemy"); }
}
export function enemyIntent(s: GameState, e: Enemy) {
  const def = ENEMIES[e.kind];
  if (!e.awake) return "Unaware";
  if (s.turn % def.interval !== 0) return "Recovering";
  if (distance(s.player, e) <= def.range && lineOfSight(s, e, s.player)) return `Attack ${def.damage}`;
  return e.root ? "Rooted" : "Approaching";
}
function enemiesAct(s: GameState) {
  s.selected = undefined;
  for (const original of [...s.enemies]) {
    const e = s.enemies.find(e => e.id === original.id); if (!e || !e.awake || s.phase === "dead") continue;
    if (e.burn > 0) { e.hp--; e.burn--; log(s, `${ENEMIES[e.kind].name} burns for 1.`, "hit"); if (e.hp <= 0) { kill(s, e); continue; } }
    const def = ENEMIES[e.kind];
    if (s.turn % def.interval === 0) {
      const canAttack = () => distance(s.player, e) <= def.range && lineOfSight(s, e, s.player);
      if (canAttack()) hurt(s, def.damage, def.name);
      else {
        const mp = e.root ? 0 : Math.max(0, def.movement - (e.slow ? 1 : 0));
        const path: Point[] = [];
        const astar = new AStar(s.player.x, s.player.y, (x, y) => (e.kind === "ghost" ? !!tileAt(s, { x, y }) : walkable(s, { x, y })) && !s.enemies.some(v => v.id !== e.id && v.x === x && v.y === y), { topology: 4 });
        astar.compute(e.x, e.y, (x, y) => path.push({ x, y }));
        for (const p of path.slice(1, mp + 1)) { if (distance(p, s.player) === 0 || canAttack()) break; e.x = p.x; e.y = p.y; }
        if (canAttack()) hurt(s, def.damage, def.name);
      }
      if (e.kind === "archer" && distance(s.player, e) < 3 && !e.root) {
        for (let i = 0; i < Math.max(0, 2 - e.slow); i++) {
          const retreat = adjacent(e).filter(p => walkable(s, p) && distance(p, s.player) > distance(e, s.player) && !s.enemies.some(v => v.id !== e.id && distance(v, p) === 0)).sort((a, b) => distance(b, s.player) - distance(a, s.player))[0];
          if (retreat) { e.x = retreat.x; e.y = retreat.y; }
        }
      }
    }
    e.slow = 0; e.root = 0;
  }
  for (const t of s.tiles) if (t.kind === "ice" && t.iceTurns !== undefined) { t.iceTurns--; if (t.iceTurns <= 0 && distance(t, s.player) !== 0 && !s.enemies.some(e => distance(e, t) === 0)) t.kind = "water"; }
  if (s.phase === "dead") return;
  s.discard.push(...s.hand.filter(c => !CARDS[c.id].gear));
  s.turn++; s.ap = s.maxAp; s.block = 0; s.enchanted = false; s.lastTag = undefined; s.lastSpell = undefined; s.lastTarget = undefined; s.cardsPlayed = 0; s.phase = "player";
  startHand(s); reveal(s); offerReward(s);
}
export function reduceGame(state: GameState, action: GameAction): GameState {
  const s = structuredClone(state);
  if (action.type === "enemies") { if (s.phase === "enemy") enemiesAct(s); return s; }
  if (action.type === "reward") {
    if (!s.rewards.length) return state;
    if (action.id && s.rewards.includes(action.id)) { const c = { id: action.id, uid: s.nextUid++ }; s.deck.push(c); s.discard.push(c); log(s, `${CARDS[action.id].name} added to your deck.`, "good"); }
    s.pendingRewards = Math.max(0, s.pendingRewards - 1); s.rewards = []; offerReward(s); return s;
  }
  if (action.type === "skill") {
    if (s.skillPoints < 1) return state;
    s.skillPoints--; s.skills[action.skill]++;
    if (action.skill === "dexterity") { s.maxAp++; s.ap++; }
    if (action.skill === "toughness") { s.maxHp += 6; s.hp += 6; }
    log(s, `${action.skill.charAt(0).toUpperCase() + action.skill.slice(1)} improved.`, "good"); return s;
  }
  if (action.type === "remove" || action.type === "pin") {
    const c = s.deck.find(c => c.uid === action.uid);
    if (!c || CARDS[c.id].gear || s.deckEdits < 1) return state;
    s.deckEdits--;
    if (action.type === "pin") { s.pinned = c.uid; log(s, `${CARDS[c.id].name} pinned for each floor’s opening hand.`, "good"); }
    else { s.deck = s.deck.filter(v => v.uid !== c.uid); s.hand = s.hand.filter(v => v.uid !== c.uid); s.draw = s.draw.filter(v => v.uid !== c.uid); s.discard = s.discard.filter(v => v.uid !== c.uid); if (s.pinned === c.uid) s.pinned = undefined; log(s, `${CARDS[c.id].name} removed from your deck.`, "good"); }
    return s;
  }
  if (action.type === "scry") {
    if (!s.pendingScry.includes(action.uid)) return state;
    const c = s.draw.find(v => v.uid === action.uid); if (!c) return state;
    const chosen = s.pendingScry.length;
    s.draw = s.draw.filter(v => v.uid !== c.uid);
    const insert = Math.min(3 - chosen, s.draw.length); s.draw.splice(insert, 0, c);
    s.pendingScry = s.pendingScry.filter(uid => uid !== c.uid); return s;
  }
  if (s.phase !== "player" || s.rewards.length || s.pendingScry.length) return state;
  if (action.type === "end") { s.phase = "enemy"; s.selected = undefined; return s; }
  if (action.type === "select") {
    if (action.uid === undefined || s.selected === action.uid) { s.selected = undefined; return s; }
    const c = s.hand.find(c => c.uid === action.uid); if (!c) return state;
    const reason = cardReason(s, c.uid); if (reason) { s.notice = reason; return s; }
    if (CARDS[c.id].target === "self") play(s, c.uid, s.player);
    else { s.selected = c.uid; s.notice = ""; }
  }
  if (action.type === "move") move(s, { x: s.player.x + action.dx, y: s.player.y + action.dy });
  if (action.type === "tile") { if (s.selected !== undefined) play(s, s.selected, action.point); else move(s, action.point); }
  return s;
}