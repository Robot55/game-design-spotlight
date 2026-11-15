import type { CardId, CardTag } from "./cards";

export interface Point { x: number; y: number }
export type TileKind = "wall" | "floor" | "corridor" | "door" | "open-door" | "chest" | "open-chest" | "stairs" | "water" | "ice" | "rubble" | "shrine" | "enchant";
export interface Tile extends Point { kind: TileKind; variant: number; seen: boolean; iceTurns?: number }
export type EnemyKind = "skeleton" | "archer" | "slime" | "mini" | "ghost" | "imp";
export interface Enemy extends Point { id: number; kind: EnemyKind; hp: number; maxHp: number; burn: number; slow: number; root: number; awake: boolean }
export interface CardInstance { uid: number; id: CardId }
export type Skill = "strength" | "dexterity" | "toughness" | "wisdom";
export interface LogEntry { id: number; text: string; tone: "normal" | "hit" | "good" | "enemy" }
export interface GameState {
  seed: number; floor: number; width: number; height: number; tiles: Tile[]; enemies: Enemy[];
  player: Point; hp: number; maxHp: number; ap: number; maxAp: number; block: number;
  xp: number; level: number; skillPoints: number; skills: Record<Skill, number>; deckEdits: number;
  pinned?: number | undefined; turn: number; phase: "player" | "enemy" | "dead" | "won";
  hand: CardInstance[]; draw: CardInstance[]; discard: CardInstance[]; exhausted: CardInstance[];
  deck: CardInstance[]; nextUid: number; lastTag?: CardTag | undefined; lastSpell?: { id: CardId; target: Point } | undefined;
  lastTarget?: Point | undefined; cardsPlayed: number; enchanted: boolean; selected?: number | undefined;
  rewards: CardId[]; pendingRewards: number; pendingScry: number[];
  kills: number; chests: number; log: LogEntry[]; notice: string;
}