import tiles from "@/assets/dungeon/tiles.png.asset.json";
import skeleton0 from "@/assets/dungeon/skeleton-0.png.asset.json";
import skeleton1 from "@/assets/dungeon/skeleton-1.png.asset.json";
import archer0 from "@/assets/dungeon/archer-0.png.asset.json";
import archer1 from "@/assets/dungeon/archer-1.png.asset.json";
import slime0 from "@/assets/dungeon/slime-0.png.asset.json";
import slime1 from "@/assets/dungeon/slime-1.png.asset.json";
import ghost0 from "@/assets/dungeon/ghost-0.png.asset.json";
import ghost1 from "@/assets/dungeon/ghost-1.png.asset.json";
import imp0 from "@/assets/dungeon/imp-0.png.asset.json";
import imp1 from "@/assets/dungeon/imp-1.png.asset.json";
import hero from "@/assets/adventurer.png";
import brute0 from "@/assets/stone-brute-0.png";
import brute1 from "@/assets/stone-brute-1.png";
export const ART = {
  tiles: tiles.url, hero,
  skeleton: [skeleton0.url, skeleton1.url], archer: [archer0.url, archer1.url],
  slime: [slime0.url, slime1.url], mini: [slime0.url, slime1.url],
  ghost: [ghost0.url, ghost1.url], imp: [imp0.url, imp1.url],
  brute: [brute0, brute1],
};