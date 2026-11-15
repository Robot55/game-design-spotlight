# Game Design Document (GDD): 2D Grid-Based Roguelike Deckbuilder

## 1. Core Concept & Vision

### 1.1 High-Concept Pitch
A tactical, top-down 2D grid-based roguelike deckbuilder that merges the spatial dungeon-crawling positioning of classic roguelikes (*Pixel Dungeon*, *Shiren the Wanderer*) with the deep deck customization and combo engine of *Slay the Spire*.

### 1.2 Design Pillars
1. **Unified Spatial & Deck Tactics:** There is no separate "combat screen" vs. "exploration screen." Every step down a corridor, every door opened, and every spell cast happens on the same 2D tile grid using a unified Action Point (AP) and card-hand economy.
2. **Cards as Inventory, Gear, and Abilities:** Rather than managing static equipment slots, clutter-filled inventory bags, and separate skill hotbars, **everything is a card**. Persistent weapons (*Sword Strike*), defensive maneuvers (*Shield Block*), active spells (*Fireball*), and one-shot consumables (*Drink Potion*) all flow through a single cohesive deck cycle.
3. **Deterministic Tactical Clarity:** Combat eschews frustrating accuracy rolls, random damage ranges, and opaque armor formulas. Numbers are flat and deterministic—allowing players to calculate exact lethal sequences, line-of-sight angles, and kiting distances.
4. **Guaranteed-Solvable Emergent Dungeons:** Procedural floors present hard environmental hazards and specialized monsters, but the dungeon generator pairs every obstacle with a discoverable tactical or elemental solution on the same floor.

---

## 2. Core Gameplay Loop & Seamless Turn Mechanics

### 2.1 The Seamless Turn Cycle
Exploration and combat operate on a single continuous turn loop:

```
+-------------------------------------------------------------------+
| 1. TURN START                                                     |
| - Restore Player AP to Max AP (Base: 3 AP).                       |
| - Guarantee all Retained Equipment cards are in Hand.             |
| - Draw cards from Draw Pile until Hand reaches Hand Size (5).     |
|   (If Draw Pile is empty, shuffle Discard Pile into Draw Pile.)   |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 2. PLAYER ACTION PHASE                                            |
| - Move 1 tile on the grid (Base Cost: 1 AP).                      |
| - Interact with adjacent Doors, Chests, or Stairs (Cost: 1 AP).   |
| - Play Cards from Hand onto valid Grid Targets (Cost: X AP).      |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 3. TURN END (Automatic at 0 AP or Manual via "END TURN" Button)   |
| - Unplayed Standard cards move from Hand to Discard Pile.         |
| - Retained Equipment cards stay ready for the next turn.          |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 4. ENEMY TURN PHASE                                               |
| - Active enemies move along the grid (up to their Movement Speed) |
|   and execute deterministic attacks if in range and off cooldown. |
+-------------------------------------------------------------------+
```

### 2.2 Action Points (AP / Energy)
* **Base Pool:** Players begin each turn with **3 AP** (expandable via the Dexterity skill branch or temporary AP-granting cards).
* **Universal Currency:**
  * **Movement:** Moving 1 cardinal tile (North, South, East, West) costs **1 AP**.
  * **Interaction:** Opening a closed door or looting a treasure chest costs **1 AP**.
  * **Card Plays:** Each card displays its AP cost in its top-left badge (ranging from `0 AP` to `3+ AP`). Certain utility/adrenaline cards cost `0 AP` and actively **generate bonus AP** when played.
* **Frictionless Auto-End Turn:** When the player's AP reaches `0` (and no playable `0 AP` cards remain in hand), the turn automatically ends without requiring an extra button click, keeping dungeon traversal snappy and responsive. Players can also click the **END TURN** button at any time to bank positioning and pass the turn early.

### 2.3 Spatial Tactics on the 2D Grid
Positioning is just as important as card selection:
* **Chokepoints & Corridors:** 1-tile and 2-tile wide tunnels allow players to funnel swarms of melee enemies into single-file lines or Area-of-Effect (AoE) blast zones.
* **Line of Sight (LoS):** Walls, pillars, and closed doors block ranged attacks and spells. Players can step behind a pillar after casting a spell to break an enemy archer's line of sight.
* **Distance & Kiting:** Because enemies have explicit **Movement Speed** (tiles per turn) and **Attack Frequency** (e.g., attacking every turn vs. every other turn), players can weave in, strike, and step back out of threat range.
* **Enemy Pulling:** Opening a door or entering an enemy's aggro radius wakes them up; careless movement can pull multiple rooms at once.

---

## 3. Deckbuilding & Card Mechanics

Players begin every run with an identical, balanced **Universal Starter Deck** and organically specialize their deck through dungeon loot, card upgrades, and skill tree unlocks.

### 3.1 Card Persistence Archetypes
To bridge traditional roguelike equipment with deckbuilding, cards belong to one of three persistence categories:

| Archetype | Deck Lifecycle Behavior | Role in Gameplay | Examples |
| :--- | :--- | :--- | :--- |
| **Equipped / Retained (`RETAINED_EQUIPMENT`)** | Never gets stranded in the discard pile. Either remains in hand across turns or is guaranteed to be drawn at the start of every turn. | Represents permanent weapons and core gear. Guarantees the player always has a baseline offensive or defensive option regardless of draw RNG. | *Sword Strike*, *Magic Sword*, *Tower Shield* |
| **Standard Action / Ability (`STANDARD`)** | Drawn randomly from the Draw Pile. Moves to the Discard Pile when played or when the turn ends. | Represents special martial maneuvers, spells, and tactical tricks that cycle through the deck. | *Spinning Kick*, *Fireball*, *Shield Block*, *Arcane Bolt* |
| **Consumable (`SINGLE_USE_CONSUMABLE`)** | Moves permanently to the **Exhaust Pile** once played (removed for the rest of the run/encounter). | Represents high-impact potions, scrolls, and terraforming tools saved for emergencies or environmental puzzles. | *Drink Potion*, *Bridge Kit*, *Scroll of Water Walking* |

### 3.2 Card Tags & Synergies
Every card carries one or more mechanical or elemental **Tags** that interact with enemy vulnerabilities, environmental tiles, and Skill Tree modifiers:
* **`MELEE`:** Close-quarters physical strikes (adjacent tiles). Buffed by the **Strength** branch.
* **`RANGED`:** Projectiles and agility skills targeting distant tiles within Line of Sight. Buffed by the **Dexterity** branch.
* **`FIRE`:** Elemental heat attacks. Deals high damage and **evaporates `DEEP_WATER` tiles into walkable `DRY_GROUND`**. Buffed by **Strength** and **Wisdom**.
* **`COLD`:** Elemental frost attacks and crowd control. Buffed by **Wisdom**.
* **`MAGIC`:** Arcane damage capable of harming ethereal enemies (such as **Ghosts**) that are completely immune to mundane physical attacks.
* **`DEFENSE`:** Damage mitigation and block cards. Buffed by **Toughness**.
* **`UTILITY`:** Deck manipulation (*Scry*, card draw, AP generation) and environmental traversal (*Water Walking*, *Bridge Building*).

### 3.3 Representative MVP Card Catalogue

| Card Name | Cost | Persistence | Tags | Target / Range | Effect Summary |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Sword Strike** | `1 AP` | `RETAINED_EQUIPMENT` | `MELEE` | Single Tile (Range 1) | Deal **3** damage to an adjacent enemy. Guaranteed in hand every turn. |
| **Shield Block** | `1 AP` | `STANDARD` | `DEFENSE` | Self | Mitigate **50%–100%** of the damage from the next incoming enemy attack. |
| **Fireball** | `2 AP` | `STANDARD` | `FIRE`, `MAGIC`, `RANGED` | Single Tile / AoE (Range 3) | Deal **4** Fire damage. If cast on `DEEP_WATER`, evaporates it into walkable `DRY_GROUND`. |
| **Spinning Kick** | `1 AP` | `STANDARD` | `MELEE` | Self AoE (Radius 1) | Deal **3** damage to all adjacent enemies surrounding the player. |
| **Drink Potion** | `0 AP` | `SINGLE_USE_CONSUMABLE` | `UTILITY` | Self | Restore **15 HP**. Single-use (Exhausts on play). |
| **Magic Sword** | `1 AP` | `RETAINED_EQUIPMENT` | `MELEE`, `MAGIC` | Single Tile (Range 1) | Deal **4** Magic damage. Can damage ethereal enemies (*Ghosts*). |
| **Foresight (Scry)** | `0 AP` | `STANDARD` | `UTILITY`, `MAGIC` | Self | **Scry 3**: Inspect the top 3 cards of your Draw Pile and reorder or discard them. |
| **Bridge Builder** | `1 AP` | `SINGLE_USE_CONSUMABLE` | `UTILITY` | Single Tile (Range 1) | Transform an adjacent `DEEP_WATER` tile into a permanent walkable `BRIDGE`. |

### 3.4 Emergent Deck Loops
When the **Draw Pile** empties, the **Discard Pile** is immediately shuffled to form a new Draw Pile. Because players can permanently purge ("trash") cards upon leveling up and play single-use consumables that exhaust themselves, shrinking the deck down to a razor-thin rotation (or even an infinite/near-infinite combo loop with AP-generating cards) is an intentional, rewarded mastery strategy.

---

## 4. Progression, XP & The 4-Branch Skill Tree

Rather than bloating stats with passive percentages every level, character progression focuses on **deck curation** and **build-defining specialization**.

### 4.1 Loot & Experience (XP) Curve
* **Dungeon Loot:** Defeating enemies and opening chests (1 AP) rewards new cards to add to the deck.
* **XP Thresholds:** Defeating enemies grants deterministic XP based on enemy tier. Leveling follows a clean stepped progression curve:
  * **Level 1 $\rightarrow$ Level 2:** `10 XP`
  * **Level 2 $\rightarrow$ Level 3:** `20 XP`
  * **Level 3 $\rightarrow$ Level 4:** `30 XP`
  * **Level $N$ $\rightarrow$ Level $N+1$:** $N \times 10\text{ XP}$
* **Level-Up Rewards — Deck Curation:** Each level-up grants **Skill Points** and **Deck Management Actions**, allowing the player to:
  1. **Trash (Purge) a Card:** Permanently remove an unwanted basic card from the deck to increase draw consistency.
  2. **Pin a Card (Innate):** Mark a specific card in the deck so it is guaranteed to appear in the opening hand on Turn 1 of every floor.

### 4.2 The 4-Branch Skill Tree
All players begin at the center origin node of a 4-way compass skill tree and branch outward into four distinct archetypes (or hybridize across branches):

```
                           [ NORTH: STRENGTH ]
                    +Flat Melee & Fire Damage, Heavy Gear
                                    |
                                    |
  [ WEST: WISDOM / INT ] -----------+----------- [ EAST: DEXTERITY & SPEED ]
   Scry, Shuffle Control,           |             +Max AP, Reduced Move Cost,
   Elemental Spell Mastery          |             Ranged & Agility Buffs
                                    |
                                    |
                     [ SOUTH: TOUGHNESS / CONSTITUTION ]
                      +Max HP, 50-100% Damage Mitigation,
                      Guaranteed Defensive Cards
```

1. **North Branch — Strength (Physical & Fire Offense):**
   * Increases flat damage dealt by all `MELEE` and `FIRE` tagged cards.
   * Unlocks heavy weapon `RETAINED_EQUIPMENT` cards and cleave effects.
2. **East Branch — Dexterity & Speed (Action Economy & Mobility):**
   * Increases maximum `AP` per turn (e.g., from `3 AP` $\rightarrow$ `4 AP` $\rightarrow$ `5 AP`).
   * Reduces the AP cost of grid movement or grants free movement steps per turn.
   * Enhances `RANGED` and multi-hit agility cards.
3. **South Branch — Toughness / Constitution (Survivability & Mitigation):**
   * Increases maximum `HP` (and heals by the gained amount).
   * Unlocks and upgrades damage-mitigation mechanics, granting persistent or guaranteed defensive cards (such as *Shield Block* scaling from **50%** up to **100%** damage reduction on the next incoming attack).
4. **West Branch — Wisdom / Intelligence (Deck Meta & Arcane Mastery):**
   * Grants **Scry** capabilities (previewing the exact order of upcoming cards at the top of the Draw Pile and reordering/discarding them).
   * Unlocks shuffle manipulation mechanics and boosts `MAGIC`, `FIRE`, and `COLD` elemental spells.

---

## 5. Entities, Enemies & Deterministic Combat (MVP Scope)

Combat uses transparent, deterministic integers so every turn reads like a tactical puzzle.

### 5.1 Player Attributes
* **Health Points (`HP`):** Base `100 / 100 HP`. Run ends immediately in defeat if `HP` reaches `0`.
* **Action Points (`AP`):** Base `3 / 3 AP` refreshed at the start of every turn.
* **Experience (`XP` & `Level`):** Tracks progress toward the next deck curation and skill tree unlock.

### 5.2 Enemy Attributes & Archetypes
Every enemy on the floor is governed by five transparent parameters (no hidden RNG):
* **Total HP:** Exact health remaining.
* **Attack Strength:** Flat damage dealt per hit.
* **Attack Speed (Frequency):** How often the enemy can strike (`Every Turn` vs. `Every Other Turn`).
* **Attack Range:** `1` for Melee combatants; `2+` tiles (requiring Line of Sight) for Ranged enemies.
* **Movement Speed:** Maximum number of grid tiles the enemy can move per turn during the Enemy Phase.

| Enemy Archetype | HP | Attack Strength | Attack Speed | Range | Move Speed | Special Rules & Tactical Profile |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Dungeon Skeleton** | `8 HP` | `3 DMG` | Every Turn (`1`) | Melee (`1`) | `1 Tile` | Standard melee chaser. Can be kited or funneled into doorways. |
| **Dark Archer / Rogue** | `6 HP` | `2 DMG` | Every Turn (`1`) | Ranged (`3`) | `1 Tile` | Ranged attacker. Uses Line of Sight; players can duck behind walls/pillars to force it to approach. |
| **Stone Brute** | `16 HP` | `6 DMG` | Every 2 Turns (`2`) | Melee (`1`) | `1 Tile` | Hits hard but only attacks every other turn, allowing players to step in, strike, and step back or time a *Shield Block*. |
| **Ethereal Ghost** | `6 HP` | `4 DMG` | Every Turn (`1`) | Melee (`1`) | `1 Tile` | **Requires `MAGIC` Tag:** Immune to mundane `MELEE`/`RANGED` attacks; requires a *Magic Sword* or elemental/arcane spell to damage. |

*(Note: For the MVP, enemies do not display floating telegraphed intent icons; players read enemy threat directly from their position, range, and attack rhythm.)*

---

## 6. Procedural Generation & Challenge-Solution Pairing

Each floor is procedurally generated as a network of rectangular stone rooms linked by narrow corridors, populated with monsters, chests, and environmental hazards.

### 6.1 The Challenge-Solution Guarantee
To make utility and elemental cards feel essential to dungeon exploration—without ever creating an impossible "soft-lock" due to bad RNG—the dungeon generator uses a **Challenge-Solution Pairing System**:

1. **Environmental Hazard Pairing (Deep Water):**
   * *The Challenge:* The generator places an impassable pool or trench of **Deep Water** across a corridor blocking access to a key room or the floor exit.
   * *The Guaranteed Solution:* The generator guarantees that at least one valid counter-card spawns in a chest or loot drop in the same room or an earlier, accessible room on that floor:
     * **Fireball (`FIRE`):** Evaporates the water tile into dry, walkable ground.
     * **Water Walking (`UTILITY`):** Grants a status allowing the player to walk across water tiles.
     * **Bridge Builder (`UTILITY`):** Places permanent wooden bridge tiles over the water.
2. **Specialized Enemy Pairing (Ethereal Ghosts):**
   * *The Challenge:* The generator spawns a **Ghost** (immune to non-magic damage) guarding a room or corridor.
   * *The Guaranteed Solution:* The generator guarantees that a **Magic Sword** or an elemental/arcane spell card spawns in an accessible location before the player is forced to confront the Ghost.
3. **Pathfinding Verification:** Every generated floor is automatically verified by an internal pathfinding pass before the floor begins, ensuring that the player can always reach the required solution items and the floor exit stairs.

---

## 7. Visual Direction, Camera & User Interface (HUD)

### 7.1 Perspective & World Rendering
* **Tilted Top-Down 2D View:** Uses rich, atmospheric 2D pixel-art tilesets and character sprites with a slightly tilted top-down perspective (non-orthographic) that gives depth and verticality to dungeon walls, chests, and characters.
* **Dynamic Y-Axis Depth & Occlusion Fade:** Multi-tile tall objects (such as dungeon walls, archways, and pillars) dynamically sort in front of or behind characters based on their vertical grid position. Whenever the player or an enemy walks directly behind a tall wall or pillar, that wall smoothly fades to semi-transparent so tactical visibility is never obstructed.
* **In-World Feedback:** Active combatants can display contextual indicators (such as a floating `3 AP` badge above the player character and crisp hit flashes/damage numbers on impact).

### 7.2 HUD & User Interface Layout
The UI is anchored cleanly around the edges of the screen (`parallax = 0`) to leave the center viewport unobstructed for grid tactics:

```
+-----------------------------------------------------------------------+
| [♥ 84/100 HP]       [ 3/3 AP ]       [ Lv 4: 12/40 XP ]       Floor 3 |
+-----------------------------------------------------------------------+
|                                                                       |
|                                                                       |
|                         2D DUNGEON VIEWPORT                           |
|                   (Rooms, Corridors, Chests, Enemies)                 |
|                                                                       |
|                                  [3 AP]                               |
|                                 (Player)                              |
|                                                                       |
|                                                          +----------+ |
|                                                          | END TURN | |
|  +------+      +-------+ +-------+ +-------+ +-------+   +----------+ |
|  |  25  |      |1 Sword| |1 Shld | |2 Fire | |0 Drink|      +------+  |
|  |      |      | Strike| | Block | |  ball | | Potion|      |  4   |  |
|  +------+      +-------+ +-------+ +-------+ +-------+      +------+  |
|  Draw Pile              ACTIVE CARD HAND                  Discard Pile|
+-----------------------------------------------------------------------+
```

1. **Top Status Bar:**
   * **Health Bar (Red):** Displays current and maximum HP (`84/100 HP`) with a heart icon.
   * **Action Points Bar (Blue):** Displays remaining and maximum AP (`3/3 AP`).
   * **Experience & Level Bar (Green):** Displays current character level and XP progress toward the next level (`Lv 4: 12/40 XP`).
   * **Floor Indicator (Top Right):** Displays the current dungeon depth (`Floor 3`).
2. **Bottom Center — Active Card Hand:**
   * Displays the player's currently held cards in a slightly fanned arcade layout.
   * Each card clearly shows its **AP Cost Badge** (top-left corner), **Card Title**, **Illustration**, **Archetype Banner** (*Attack*, *Skill*), and **Rules Text** (*"Deal 4 damage..."*, *"Single-use"*).
   * Hovering or holding a card enlarges it, displays detailed tag tooltips, and highlights valid target tiles and attack range on the 2D dungeon grid.
3. **Bottom Left — Draw Pile Icon:**
   * Displays the exact count of cards remaining in the Draw Pile (e.g., `25`).
   * Clicking opens a modal showing all cards currently remaining in the Draw Pile (displayed in randomized/shuffled order so exact draw sequence remains hidden, except for cards revealed via **Scry**).
4. **Bottom Right — Discard Pile Icon & End Turn Button:**
   * **Discard Pile:** Displays the count of discarded cards (e.g., `4`). Clicking opens a modal showing the exact contents and order of the Discard Pile (and a toggle to inspect the Exhaust Pile).
   * **END TURN Button:** Prominent hexagonal button above the Discard Pile allowing the player to end their turn manually at any time.
