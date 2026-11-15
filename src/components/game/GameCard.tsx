import { ArrowUpRight, Flame, Link2, LockKeyhole, Shield, Snowflake, Sword, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARDS, type CardId } from "@/game/cards";
import { cn } from "@/lib/utils";
import illustrations from "@/assets/card-illustrations.jpg";

export function GameCard({ id, selected, reason, onClick, onPreview, compact = false }: {
  id: CardId; selected?: boolean; reason?: string | undefined; onClick?: () => void; onPreview?: (id?: CardId) => void; compact?: boolean;
}) {
  const c = CARDS[id];
  const Icon = c.tag === "Melee" ? Sword : c.tag === "Ranged" ? ArrowUpRight : c.element === "Cold" ? Snowflake : c.tag === "Spell" ? Flame : Shield;
  return (
    <Button variant="ghost" onClick={onClick} onPointerEnter={() => onPreview?.(id)} onPointerLeave={() => onPreview?.()} onFocus={() => onPreview?.(id)} onBlur={() => onPreview?.()} aria-label={`${c.name}, ${c.cost} AP${reason ? `, ${reason}` : ""}`} aria-pressed={selected} title={reason ?? `${c.name}: ${c.text} · ${c.tags.join(" / ")}`} className={cn("game-card", `card-${c.tag.toLowerCase()}`, selected && "card-selected", reason && "card-unavailable", compact && "card-compact")}>
      <div className="card-title"><span className="card-cost">{c.cost}</span><span>{c.name}</span></div>
      <div className="card-art"><img src={illustrations} alt="" draggable={false} className={`card-image art-${c.art}`} /></div>
      <div className="card-copy">{c.follow && <span className="follow-label"><Link2 size={10} />After {c.follow}</span>}<p>{c.text}</p></div>
      <div className="card-footer"><span title={c.tags.join(" / ")}><Icon size={11} />{c.tags.map(tag => tag.charAt(0) + tag.slice(1).toLowerCase()).join(" · ")}</span>{c.gear ? <span><LockKeyhole size={10} />Retain</span> : c.consumable ? <span>Exhaust</span> : c.follow ? <Zap size={11} /> : null}</div>
    </Button>
  );
}