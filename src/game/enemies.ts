import type { EnemyKind } from "./types";
export const ENEMIES: Record<EnemyKind, { name: string; hp: number; damage: number; range: number; movement: number; interval: number; counter: string; xp: number }> = {
  skeleton: { name: "Dungeon Skeleton", hp: 8, damage: 3, range: 1, movement: 1, interval: 1, counter: "A steady melee chaser. Funnel it into a doorway or kite it.", xp: 4 },
  archer: { name: "Goblin Archer", hp: 6, damage: 2, range: 3, movement: 1, interval: 1, counter: "Keeps its distance. Break line of sight or close in.", xp: 4 },
  brute: { name: "Stone Brute", hp: 16, damage: 6, range: 1, movement: 1, interval: 2, counter: "Moves every turn; attacks every other turn. Time your Shield Block.", xp: 8 },
  slime: { name: "Slime", hp: 12, damage: 2, range: 1, movement: 1, interval: 2, counter: "Splits into two 4 HP mini-slimes. Area attacks excel.", xp: 6 },
  mini: { name: "Mini-Slime", hp: 4, damage: 1, range: 1, movement: 1, interval: 2, counter: "Small but dangerous in a group.", xp: 1 },
  ghost: { name: "Ethereal Ghost", hp: 6, damage: 4, range: 1, movement: 1, interval: 1, counter: "Ignores walls. Only MAGIC tags or enchanted melee can hurt it.", xp: 5 },
  imp: { name: "Fire Imp", hp: 6, damage: 4, range: 3, movement: 3, interval: 2, counter: "Immune to fire. Cold deals double damage.", xp: 5 },
};