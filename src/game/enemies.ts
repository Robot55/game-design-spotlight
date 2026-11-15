import type { EnemyKind } from "./types";
export const ENEMIES: Record<EnemyKind, { name: string; hp: number; damage: number; range: number; movement: number; interval: number; counter: string; xp: number }> = {
  skeleton: { name: "Skeleton", hp: 8, damage: 3, range: 1, movement: 2, interval: 1, counter: "Slow it with cold, or strike hard in melee.", xp: 4 },
  archer: { name: "Goblin Archer", hp: 5, damage: 2, range: 4, movement: 2, interval: 1, counter: "Keeps its distance. Close in or use Longshot.", xp: 4 },
  slime: { name: "Slime", hp: 12, damage: 2, range: 1, movement: 1, interval: 2, counter: "Splits into two 4 HP mini-slimes. Area attacks excel.", xp: 6 },
  mini: { name: "Mini-Slime", hp: 4, damage: 1, range: 1, movement: 1, interval: 2, counter: "Small but dangerous in a group.", xp: 1 },
  ghost: { name: "Ghost", hp: 6, damage: 3, range: 1, movement: 2, interval: 1, counter: "Ignores walls. Only spells or enchanted melee can hurt it.", xp: 5 },
  imp: { name: "Fire Imp", hp: 6, damage: 4, range: 3, movement: 3, interval: 2, counter: "Immune to fire. Cold deals double damage.", xp: 5 },
};