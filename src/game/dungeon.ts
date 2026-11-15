import Digger from "rot-js/lib/map/digger";
import RNG from "rot-js/lib/rng";
import { ENEMIES } from "./enemies";
import type { Enemy, EnemyKind, Point, Tile } from "./types";

export const WIDTH = 35;
export const HEIGHT = 25;
export const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const adjacent = (p: Point): Point[] => [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }];
export function reachableTiles(tiles: Tile[], player: Point, allowWater = false) {
  const reached = new Set<string>();
  const queue = [player];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (!p) continue;
    const key = `${p.x},${p.y}`; if (reached.has(key)) continue;
    reached.add(key);
    for (const next of adjacent(p)) {
      const t = next.x >= 0 && next.y >= 0 && next.x < WIDTH && next.y < HEIGHT ? tiles[next.y * WIDTH + next.x] : undefined;
      if (t && !["wall", "pillar", "rubble"].includes(t.kind) && (allowWater || t.kind !== "water") && !reached.has(`${next.x},${next.y}`)) queue.push(next);
    }
  }
  return reached;
}
export function verifyDungeon(d: { tiles: Tile[]; player: Point; enemies: Enemy[] }) {
  const before = reachableTiles(d.tiles, d.player);
  const after = reachableTiles(d.tiles, d.player, true);
  const stairs = d.tiles.find(t => t.kind === "stairs");
  const solution = d.tiles.find(t => t.loot?.includes("fireball"));
  const magic = d.tiles.find(t => t.kind === "enchant");
  return !!stairs && !!solution && before.has(`${solution.x},${solution.y}`) && after.has(`${stairs.x},${stairs.y}`)
    && !before.has(`${stairs.x},${stairs.y}`) && (!d.enemies.some(e => e.kind === "ghost") || (!!magic && before.has(`${magic.x},${magic.y}`)));
}
export function generateDungeon(seed: number, floor: number) {
  const saved = RNG.getState();
  try {
  for (let generation = 0; generation < 20; generation++) {
  RNG.setSeed(seed + floor * 7919 + generation * 104729);
  let tiles: Tile[] = [];
  let generator = new Digger(WIDTH, HEIGHT);
  for (let attempt = 0; attempt < 8; attempt++) {
    generator = new Digger(WIDTH, HEIGHT, { roomWidth: [5, 8], roomHeight: [4, 6], corridorLength: [2, 5], dugPercentage: 0.34, timeLimit: 1000 });
    tiles = Array.from({ length: WIDTH * HEIGHT }, (_, i) => ({ x: i % WIDTH, y: Math.floor(i / WIDTH), kind: "wall", variant: RNG.getUniformInt(0, 3), seen: false }));
    generator.create((x, y, wall) => {
      const tile = tiles[y * WIDTH + x];
      if (tile && wall === 0) tile.kind = "corridor";
    });
    if (generator.getRooms().length >= 4) break;
  }
  const rooms = generator.getRooms();
  for (const room of rooms) {
    for (let y = room.getTop(); y <= room.getBottom(); y++) for (let x = room.getLeft(); x <= room.getRight(); x++) {
      const tile = tiles[y * WIDTH + x]; if (tile) tile.kind = "floor";
    }
    room.getDoors((x, y) => { const tile = tiles[y * WIDTH + x]; if (tile) tile.kind = "door"; });
  }
  const center = rooms[0]?.getCenter() ?? [17, 12];
  const player = { x: center[0] ?? 17, y: center[1] ?? 12 };
  const available = tiles.filter(t => t.kind === "floor" && distance(t, player) > 2);
  const occupied = new Set<string>();
  const reserve = (p: Point) => occupied.add(`${p.x},${p.y}`);
  const pick = (minimum: number) => {
    const choices = available.filter(t => distance(t, player) >= minimum && !occupied.has(`${t.x},${t.y}`));
    const p = RNG.getItem(choices);
    if (p) reserve(p);
    return p ?? undefined;
  };
  const farthest = [...available].sort((a, b) => distance(b, player) - distance(a, player))[0];
  if (farthest) {
    farthest.kind = "stairs"; reserve(farthest);
    // A required water threshold protects the exit, not an optional decorative alcove.
    for (const p of adjacent(farthest)) {
      const t = tiles[p.y * WIDTH + p.x];
      if (t && ["floor", "corridor", "door"].includes(t.kind)) { t.kind = "water"; reserve(t); }
    }
  }
  const startSlots = adjacent(player).map(p => tiles[p.y * WIDTH + p.x]).filter((t): t is Tile => !!t && t.kind === "floor");
  const solution = startSlots[0];
  if (solution) { solution.kind = "chest"; solution.loot = ["fireball", "bridge", "waterwalk"]; reserve(solution); }
  const enemies: Enemy[] = [];
  const spawn = (kind: EnemyKind, tile: Point | undefined) => {
    if (!tile) return;
    reserve(tile);
    const hp = ENEMIES[kind].hp;
    enemies.push({ id: floor * 100 + enemies.length, kind, x: tile.x, y: tile.y, hp, maxHp: hp, burn: 0, slow: 0, root: 0, awake: false });
  };
  const firstRoom = rooms[0];
  const nearby = available.filter(t => firstRoom && t.x >= firstRoom.getLeft() && t.x <= firstRoom.getRight() && t.y >= firstRoom.getTop() && t.y <= firstRoom.getBottom() && t.kind === "floor" && !occupied.has(`${t.x},${t.y}`)).sort((a, b) => distance(a, player) - distance(b, player))[0];
  spawn("skeleton", nearby ?? pick(3));
  const kinds: EnemyKind[] = floor === 1 ? ["archer", "slime", "brute", "archer"] : floor === 2 ? ["ghost", "imp", "slime", "archer", "brute", "imp"] : ["ghost", "imp", "slime", "archer", "ghost", "brute", "imp"];
  for (const kind of kinds) spawn(kind, pick(7));
  for (let i = 0; i < 3; i++) { const t = pick(4); if (t) t.kind = "chest"; }
  const shrine = pick(5); if (shrine) shrine.kind = "shrine";
  // Magic solution is placed in the accessible starting room on every ghost floor.
  if (enemies.some(e => e.kind === "ghost")) {
    const t = startSlots.find(t => t.kind === "floor");
    if (t) t.kind = "enchant";
  }
  // Only keep pillars when the paired solutions and exit remain reachable.
  for (let i = 0; i < 2; i++) {
    const t = pick(6); if (!t || t.kind !== "floor") continue;
    t.kind = "pillar";
    if (!verifyDungeon({ tiles, player, enemies })) t.kind = "floor";
  }
  const dungeon = { tiles, enemies, player, width: WIDTH, height: HEIGHT };
  if (verifyDungeon(dungeon)) return dungeon;
  }
  throw new Error("Could not generate a verified challenge-solution floor.");
  } finally { RNG.setState(saved); }
}