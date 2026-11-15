import Digger from "rot-js/lib/map/digger";
import RNG from "rot-js/lib/rng";
import { ENEMIES } from "./enemies";
import type { Enemy, EnemyKind, Point, Tile } from "./types";

export const WIDTH = 35;
export const HEIGHT = 25;
export const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const adjacent = (p: Point): Point[] => [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }];
export function generateDungeon(seed: number, floor: number) {
  const saved = RNG.getState();
  RNG.setSeed(seed + floor * 7919);
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
    return p;
  };
  const farthest = [...available].sort((a, b) => distance(b, player) - distance(a, player))[0];
  if (farthest) { farthest.kind = "stairs"; reserve(farthest); }
  const enemies: Enemy[] = [];
  const spawn = (kind: EnemyKind, tile: Point | undefined) => {
    if (!tile) return;
    reserve(tile);
    const hp = ENEMIES[kind].hp;
    enemies.push({ id: floor * 100 + enemies.length, kind, x: tile.x, y: tile.y, hp, maxHp: hp, burn: 0, slow: 0, root: 0, awake: false });
  };
  const firstRoom = rooms[0];
  const nearby = available.filter(t => firstRoom && t.x >= firstRoom.getLeft() && t.x <= firstRoom.getRight() && t.y >= firstRoom.getTop() && t.y <= firstRoom.getBottom() && t.kind === "floor").sort((a, b) => distance(a, player) - distance(b, player))[0];
  spawn("skeleton", nearby ?? pick(3));
  const kinds: EnemyKind[] = floor === 1 ? ["archer", "slime", "skeleton", "archer"] : floor === 2 ? ["ghost", "imp", "slime", "archer", "skeleton", "imp"] : ["ghost", "imp", "slime", "archer", "ghost", "skeleton", "imp"];
  for (const kind of kinds) spawn(kind, pick(7));
  for (let i = 0; i < 3; i++) { const t = pick(4); if (t) t.kind = "chest"; }
  const shrine = pick(5); if (shrine) shrine.kind = "shrine";
  // Magic solution is placed in the accessible starting room on every ghost floor.
  if (enemies.some(e => e.kind === "ghost")) {
    const t = adjacent(player).map(p => tiles[p.y * WIDTH + p.x]).find(t => t?.kind === "floor");
    if (t) t.kind = "enchant";
  }
  // Optional water alcoves never replace a corridor, door, stair, or the guaranteed route.
  const water = pick(9); if (water) water.kind = "water";
  RNG.setState(saved);
  return { tiles, enemies, player, width: WIDTH, height: HEIGHT };
}