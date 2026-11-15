import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameScreen = lazy(() => import("@/components/game/GameScreen"));
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deepdraw — The Forgotten Crypt" },
      { name: "description", content: "A playable tactical roguelike deckbuilder. Explore the crypt, chain cards, and survive a three-floor dungeon run." },
      { property: "og:title", content: "Deepdraw — The Forgotten Crypt" },
      { property: "og:description", content: "Every step is a choice. Explore a randomized dungeon, build your deck, and escape the Forgotten Crypt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function Index() {
  return <ClientOnly fallback={<Loading />}><Suspense fallback={<Loading />}><GameScreen /></Suspense></ClientOnly>;
}
function Loading() { return <div className="game-loading"><span className="loading-mark">D.</span><span>Entering the crypt…</span></div>; }
