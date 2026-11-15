export type CardTag = "Melee" | "Ranged" | "Spell" | "Utility";
export type CardId = "sword" | "heavy" | "knife" | "longshot" | "spark" | "frost" | "guard" | "sidestep" | "pommel" | "quick" | "potion" | "cleave" | "lunge" | "finisher" | "momentum" | "pinning" | "volley" | "ricochet" | "fireball" | "ice" | "echo" | "enchant" | "adrenaline" | "scry" | "magic" | "kick" | "bridge" | "waterwalk" | "arcane" | "tower" | "warhammer";
export type MechanicalTag = "MELEE" | "RANGED" | "FIRE" | "COLD" | "MAGIC" | "DEFENSE" | "UTILITY";
export interface CardDef {
  id: CardId; name: string; cost: number; tag: CardTag; text: string;
  damage?: number; range?: number; follow?: CardTag; gear?: boolean;
  consumable?: boolean; element?: "Fire" | "Cold"; art: number;
  target: "enemy" | "tile" | "self"; tags: MechanicalTag[];
}
export const CARDS: Record<CardId, CardDef> = {
  sword: { id: "sword", name: "Sword Strike", cost: 1, tag: "Melee", tags: ["MELEE"], text: "Deal 3 damage to an adjacent enemy.", damage: 3, range: 1, gear: true, art: 0, target: "enemy" },
  heavy: { id: "heavy", name: "Heavy Swing", cost: 2, tag: "Melee", tags: ["MELEE"], text: "Deal 7 damage. Push 1 tile. Wall impact: +2 damage.", damage: 7, range: 1, art: 1, target: "enemy" },
  knife: { id: "knife", name: "Throwing Knife", cost: 1, tag: "Ranged", tags: ["RANGED"], text: "Deal 2 damage. Range 4. Requires line of sight.", damage: 2, range: 4, art: 2, target: "enemy" },
  longshot: { id: "longshot", name: "Longshot", cost: 2, tag: "Ranged", tags: ["RANGED"], text: "Deal 5 damage. Range 6. Requires line of sight.", damage: 5, range: 6, art: 2, target: "enemy" },
  spark: { id: "spark", name: "Spark", cost: 1, tag: "Spell", tags: ["FIRE", "MAGIC"], text: "Deal 2 fire damage. Burn: 1 damage for 2 turns. Range 3.", damage: 2, range: 3, element: "Fire", art: 3, target: "enemy" },
  frost: { id: "frost", name: "Frost Shard", cost: 1, tag: "Spell", tags: ["COLD", "MAGIC"], text: "Deal 2 cold damage. Slow: −1 movement next turn. Range 3.", damage: 2, range: 3, element: "Cold", art: 3, target: "enemy" },
  guard: { id: "guard", name: "Shield Block", cost: 1, tag: "Utility", tags: ["DEFENSE"], text: "Reduce the next incoming attack by 50%. Toughness: +25% per rank, up to 100%.", art: 4, target: "self" },
  sidestep: { id: "sidestep", name: "Sidestep", cost: 0, tag: "Utility", tags: ["UTILITY"], text: "Move to an adjacent empty tile without spending AP.", art: 4, target: "tile" },
  pommel: { id: "pommel", name: "Pommel Strike", cost: 0, tag: "Melee", tags: ["MELEE"], follow: "Melee", text: "Deal 2 damage. Push 1 tile. Wall impact: +2 damage.", damage: 2, range: 1, art: 0, target: "enemy" },
  quick: { id: "quick", name: "Quick Draw", cost: 0, tag: "Ranged", tags: ["RANGED"], follow: "Ranged", text: "Deal 2 damage. Range 4. Requires line of sight.", damage: 2, range: 4, art: 2, target: "enemy" },
  potion: { id: "potion", name: "Drink Potion", cost: 0, tag: "Utility", tags: ["UTILITY"], consumable: true, text: "Restore 15 HP. Removed from your deck after use.", art: 5, target: "self" },
  cleave: { id: "cleave", name: "Cleave", cost: 2, tag: "Melee", tags: ["MELEE"], text: "Deal 4 damage to every adjacent enemy.", damage: 4, range: 1, art: 1, target: "self" },
  lunge: { id: "lunge", name: "Lunge", cost: 1, tag: "Melee", tags: ["MELEE"], text: "Move 1 tile toward an enemy, then deal 3 damage. Range 2.", damage: 3, range: 2, art: 0, target: "enemy" },
  finisher: { id: "finisher", name: "Finisher", cost: 2, tag: "Melee", tags: ["MELEE"], text: "Deal 3 damage +2 for each card already played this turn.", damage: 3, range: 1, art: 1, target: "enemy" },
  momentum: { id: "momentum", name: "Momentum", cost: 0, tag: "Utility", tags: ["UTILITY"], follow: "Melee", text: "Move to an adjacent empty tile and draw 1 card.", art: 4, target: "tile" },
  pinning: { id: "pinning", name: "Pinning Shot", cost: 1, tag: "Ranged", tags: ["RANGED"], text: "Deal 2 damage. Root: no movement next turn. Range 5.", damage: 2, range: 5, art: 2, target: "enemy" },
  volley: { id: "volley", name: "Volley", cost: 2, tag: "Ranged", tags: ["RANGED"], text: "Deal 2 damage to up to 3 visible enemies. Range 4.", damage: 2, range: 4, art: 2, target: "self" },
  ricochet: { id: "ricochet", name: "Ricochet", cost: 0, tag: "Ranged", tags: ["RANGED"], follow: "Ranged", text: "Deal 3 damage to a different enemy within 3 tiles of your last target.", damage: 3, range: 3, art: 2, target: "enemy" },
  fireball: { id: "fireball", name: "Fireball", cost: 2, tag: "Spell", tags: ["FIRE", "MAGIC", "RANGED"], text: "Deal 4 fire damage in a 3×3 area. Evaporate water. Range 3.", damage: 4, range: 3, element: "Fire", art: 3, target: "tile" },
  ice: { id: "ice", name: "Ice Bridge", cost: 1, tag: "Spell", tags: ["COLD", "MAGIC"], text: "Freeze a line of 3 water tiles for 3 turns. Range 4.", range: 4, element: "Cold", art: 3, target: "tile" },
  echo: { id: "echo", name: "Echo", cost: 0, tag: "Spell", tags: ["MAGIC"], follow: "Spell", text: "Repeat your previous spell at half damage, rounded up.", art: 3, target: "self" },
  enchant: { id: "enchant", name: "Enchant Blade", cost: 1, tag: "Utility", tags: ["UTILITY", "MAGIC"], text: "Melee attacks become magic and deal +1 damage this turn.", art: 0, target: "self" },
  adrenaline: { id: "adrenaline", name: "Adrenaline", cost: 0, tag: "Utility", tags: ["UTILITY"], consumable: true, text: "Gain 2 AP. Removed from your deck after use.", art: 5, target: "self" },
  scry: { id: "scry", name: "Foresight (Scry)", cost: 0, tag: "Utility", tags: ["UTILITY", "MAGIC"], text: "Reveal your next 3 draws. Reorder or discard each one.", art: 3, target: "self" },
  magic: { id: "magic", name: "Magic Sword", cost: 1, tag: "Melee", tags: ["MELEE", "MAGIC"], text: "Deal 4 magic damage to an adjacent enemy. Can wound ghosts.", damage: 4, range: 1, gear: true, art: 0, target: "enemy" },
  kick: { id: "kick", name: "Spinning Kick", cost: 1, tag: "Melee", tags: ["MELEE"], text: "Deal 3 damage to every adjacent enemy.", damage: 3, range: 1, art: 1, target: "self" },
  bridge: { id: "bridge", name: "Bridge Builder", cost: 1, tag: "Utility", tags: ["UTILITY"], text: "Turn an adjacent deep-water tile into a permanent bridge. Single-use.", range: 1, consumable: true, art: 4, target: "tile" },
  waterwalk: { id: "waterwalk", name: "Water Walking", cost: 0, tag: "Utility", tags: ["UTILITY", "MAGIC"], text: "Walk on deep water for 3 turns. Single-use.", consumable: true, art: 4, target: "self" },
  arcane: { id: "arcane", name: "Arcane Bolt", cost: 1, tag: "Spell", tags: ["MAGIC", "RANGED"], text: "Deal 3 magic damage. Range 4. Requires line of sight.", damage: 3, range: 4, art: 3, target: "enemy" },
  tower: { id: "tower", name: "Tower Shield", cost: 1, tag: "Utility", tags: ["DEFENSE"], text: "Gain 6 Block until your next turn. Retained equipment.", gear: true, art: 4, target: "self" },
  warhammer: { id: "warhammer", name: "Warhammer", cost: 2, tag: "Melee", tags: ["MELEE"], text: "Deal 6 damage to an adjacent enemy. Retained heavy weapon.", damage: 6, range: 1, gear: true, art: 1, target: "enemy" },
};
export const STARTER: CardId[] = ["sword", "heavy", "knife", "knife", "longshot", "spark", "frost", "guard", "sidestep", "pommel", "quick", "potion"];
export const REWARDS: CardId[] = ["cleave", "lunge", "finisher", "momentum", "pinning", "volley", "ricochet", "fireball", "ice", "echo", "enchant", "adrenaline", "scry", "potion", "magic", "kick", "bridge", "waterwalk", "arcane", "tower", "warhammer"];