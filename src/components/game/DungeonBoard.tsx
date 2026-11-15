import { useEffect, useRef, useState } from "react";
import { ART } from "@/game/art";
import { CARDS, type CardId } from "@/game/cards";
import { adjacent, distance } from "@/game/dungeon";
import { canTarget, playerWalkable, tileAt, visible } from "@/game/engine";
import type { GameAction } from "@/game/engine";
import type { GameState, Point, Tile } from "@/game/types";

const ATLAS: Record<string, number> = { wall: 8, door: 12, "open-door": 13, chest: 24, "open-chest": 25, stairs: 14, water: 16, ice: 19, bridge: 22, pillar: 26, rubble: 23, shrine: 28, enchant: 31 };
function atlasIndex(t: Tile) { return t.kind === "floor" ? t.variant : t.kind === "corridor" ? 4 + t.variant : t.kind === "wall" ? (t.variant === 2 ? 10 : t.variant === 3 ? 11 : 8) : ATLAS[t.kind] ?? 0; }
export function DungeonBoard({ game, dispatch, onInspect, preview }: { game: GameState; dispatch: (a: GameAction) => void; onInspect: (id: number) => void; preview?: CardId | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef({ width: 0, height: 0, tile: 42, left: 0, top: 0 });
  const gameRef = useRef(game); gameRef.current = game;
  const previewRef = useRef(preview); previewRef.current = preview;
  const [hover, setHover] = useState<Point>();
  const hoverRef = useRef(hover); hoverRef.current = hover;
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let animation = 0;
    const images: Record<string, HTMLImageElement> = {};
    const urls = { tiles: ART.tiles, hero: ART.hero, ...Object.fromEntries(["skeleton", "archer", "brute", "slime", "mini", "ghost", "imp"].flatMap(k => ART[k as "skeleton"].map((url, i) => [`${k}${i}`, url]))) };
    for (const [key, url] of Object.entries(urls)) { const image = new Image(); image.src = url; images[key] = image; }
    const computed = getComputedStyle(canvas);
    const color = (name: string) => computed.getPropertyValue(`--${name}`).trim();
    const palette = { void: color("dungeon-void"), fog: color("dungeon-fog"), player: color("primary"), gold: color("gold"), hit: color("destructive"), health: color("health"), ap: color("ap"), text: color("foreground"), target: color("target-fill"), move: color("move-fill"), shadow: color("sprite-shadow") };
    const fades = new Map<string, number>();
    let w = 0, h = 0;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect; if (!rect) return;
      w = rect.width; h = rect.height;
      const dpr = Math.min(devicePixelRatio, 2); canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    observer.observe(canvas);
    const render = (time: number) => {
      const s = gameRef.current;
      const size = w < 500 ? 38 : 43, row = size * 0.84;
      const left = s.player.x - Math.floor(w / size / 2), top = s.player.y - Math.floor(h / row / 2);
      const ox = (w - (Math.floor(w / size) + 1) * size) / 2, oy = (h - (Math.floor(h / row) + 1) * row) / 2;
      frameRef.current = { width: ox, height: oy, tile: size, left, top };
      ctx.fillStyle = palette.void; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
      const selected = s.hand.find(c => c.uid === s.selected);
      const targeting = selected?.id ?? previewRef.current;
      for (let y = 0; y < Math.ceil(h / row) + 1; y++) for (let x = 0; x < Math.ceil(w / size) + 1; x++) {
        const p = { x: x + left, y: y + top }, t = tileAt(s, p);
        if (!t?.seen) continue;
        const px = ox + x * size, py = oy + y * row;
        const index = atlasIndex(t); const image = images["tiles"];
        if (image?.complete && image.naturalWidth) ctx.drawImage(image, index % 8 * 64, Math.floor(index / 8) * 64, 64, 64, px, py, size, row);
        const isVisible = visible(s, p);
        if (!isVisible) { ctx.fillStyle = palette.fog; ctx.fillRect(px, py, size, row); }
        if (targeting && CARDS[targeting].target !== "self" && canTarget(s, targeting, p)) { ctx.fillStyle = palette.target; ctx.fillRect(px + 1, py + 1, size - 2, row - 2); ctx.strokeStyle = palette.gold; ctx.lineWidth = 1; ctx.strokeRect(px + 2, py + 2, size - 4, row - 4); }
        else if (!targeting && s.phase === "player" && distance(s.player, p) === 1 && isVisible && (playerWalkable(s, p) || ["door", "chest"].includes(t.kind))) { ctx.fillStyle = palette.move; ctx.fillRect(px + 1, py + 1, size - 2, row - 2); }
        if (hoverRef.current && distance(hoverRef.current, p) === 0) { ctx.strokeStyle = palette.text; ctx.lineWidth = 1; ctx.strokeRect(px + 2, py + 2, size - 4, row - 4); }
        if (t.kind === "stairs" || t.loot) { ctx.strokeStyle = palette.gold; ctx.strokeRect(px + 2, py + 2, size - 4, row - 4); }
      }
      const actors = [...s.enemies.filter(e => visible(s, e)).map(e => ({ ...e, hero: false })), { ...s.player, id: -1, hero: true, kind: "skeleton" as const, hp: s.hp, maxHp: s.maxHp, burn: 0, slow: 0, root: 0, awake: true }];
      const objects = s.tiles.filter(t => t.seen && ["wall", "pillar", "door", "chest"].includes(t.kind));
      const layers = [...actors.map(actor => ({ y: actor.y, actor, object: undefined })), ...objects.map(object => ({ y: object.y + 0.15, actor: undefined, object }))].sort((a, b) => a.y - b.y);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      for (const layer of layers) {
        if (layer.object) {
          const t = layer.object, image = images.tiles;
          const px = ox + (t.x - left) * size, py = oy + (t.y - top) * row;
          if (px < -size || px > w || py < -size || py > h + size || !image?.complete || !image.naturalWidth) continue;
          const obscures = actors.some(a => Math.abs(a.x - t.x) < 1 && a.y < t.y && a.y >= t.y - 1);
          const key = `${t.x},${t.y}`, target = obscures ? 0.28 : 1;
          const alpha = reduced ? target : (fades.get(key) ?? 1) + (target - (fades.get(key) ?? 1)) * 0.18; fades.set(key, alpha);
          ctx.globalAlpha = alpha;
          const index = atlasIndex(t), tall = t.kind === "wall" || t.kind === "pillar" ? size * 1.25 : size * 0.8;
          ctx.drawImage(image, index % 8 * 64, Math.floor(index / 8) * 64, 64, 64, px, py + row - tall, size, tall);
          ctx.globalAlpha = 1; continue;
        }
        const e = layer.actor; if (!e) continue;
        const px = ox + (e.x - left) * size, py = oy + (e.y - top) * row;
        const image = images[e.hero ? "hero" : `${e.kind}${reduced ? 0 : Math.floor(time / 450) % 2}`];
        ctx.fillStyle = palette.shadow; ctx.beginPath(); ctx.ellipse(px + size / 2, py + size * 0.81, size * 0.32, size * 0.13, 0, 0, Math.PI * 2); ctx.fill();
        if (e.hero) { ctx.strokeStyle = palette.player; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px + size / 2, py + row * 0.82, size * 0.38, size * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (image?.complete && image.naturalWidth) {
          const height = size * (e.kind === "mini" && !e.hero ? 0.65 : e.kind === "slime" && !e.hero ? 0.82 : 1.24);
          const width = Math.min(size * 1.06, height * image.naturalWidth / image.naturalHeight);
          ctx.drawImage(image, px + (size - width) / 2, py + row * 0.88 - height, width, height);
        }
        if (!e.hero) {
          ctx.fillStyle = palette.void; ctx.fillRect(px + 7, py + row - 4, size - 14, 4); ctx.fillStyle = palette.health; ctx.fillRect(px + 7, py + row - 4, (size - 14) * e.hp / e.maxHp, 3);
          if (e.burn || e.slow || e.root) { ctx.font = "10px sans-serif"; ctx.fillStyle = palette.gold; ctx.fillText(e.burn ? "◆" : e.root ? "×" : "❄", px + size - 4, py + 8); }
        }
      }
      const heroX = ox + (s.player.x - left) * size + size / 2, heroY = oy + (s.player.y - top) * row - size * 0.7;
      ctx.fillStyle = palette.void; ctx.fillRect(heroX - 19, heroY - 13, 38, 18);
      ctx.fillStyle = palette.ap; ctx.textAlign = "center"; ctx.font = "bold 11px 'DM Sans', sans-serif"; ctx.fillText(`${s.ap} AP`, heroX, heroY);
      // Explored minimap.
      const mw = s.width * 2.5, mh = s.height * 2.5, mx = w - mw - 16, my = 16;
      ctx.fillStyle = palette.void; ctx.globalAlpha = 0.88; ctx.fillRect(mx - 6, my - 6, mw + 12, mh + 12); ctx.globalAlpha = 1;
      for (const t of s.tiles) if (t.seen && t.kind !== "wall") { ctx.fillStyle = t.kind === "stairs" ? palette.gold : palette.player; ctx.globalAlpha = 0.3; ctx.fillRect(mx + t.x * 2.5, my + t.y * 2.5, 2.2, 2.2); }
      ctx.globalAlpha = 1; ctx.fillStyle = palette.gold; ctx.fillRect(mx + s.player.x * 2.5, my + s.player.y * 2.5, 3, 3);
      animation = requestAnimationFrame(render);
    };
    animation = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animation); observer.disconnect(); };
  }, []);
  function pointAt(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect(), f = frameRef.current;
    return { x: Math.floor((event.clientX - rect.left - f.width) / f.tile) + f.left, y: Math.floor((event.clientY - rect.top - f.height) / (f.tile * 0.84)) + f.top };
  }
  const selected = game.hand.find(c => c.uid === game.selected);
  return <div className="dungeon-stage"><canvas ref={canvasRef} aria-label="Dungeon map" role="application" tabIndex={0} onPointerMove={e => { const p = pointAt(e); setHover(p); const enemy = game.enemies.find(v => distance(v, p) === 0 && visible(game, v)); if (enemy) onInspect(enemy.id); }} onPointerLeave={() => setHover(undefined)} onPointerDown={e => dispatch({ type: "tile", point: pointAt(e) })} /><div className="map-coordinates">{String(game.player.x).padStart(2, "0")} : {String(game.player.y).padStart(2, "0")}</div>{selected && <div className="target-notice">{CARDS[selected.id].name}<span>Choose a target</span></div>}</div>;
}