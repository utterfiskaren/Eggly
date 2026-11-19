import type { Metadata } from "next";
import { TIER_RANK, speciesById } from "@eggly/content";
import { MatteKarta } from "@/components/game/MatteKarta";
import { requireChild } from "@/lib/child";
import { collection, loadWorld } from "@/lib/world";

export const metadata: Metadata = { title: "Matteön" };

export default async function Page() {
  const me = await requireChild();
  const [w, owned] = await Promise.all([loadWorld(me), collection(me)]);
  // Kompisen som står på kartan: den finaste klämmisen barnet har.
  const best = [...owned].sort((a, b) => (TIER_RANK[speciesById(b.squishyId)?.tier ?? 0] - TIER_RANK[speciesById(a.squishyId)?.tier ?? 0]))[0];
  return <MatteKarta w={w} mascot={best ? { id: best.squishyId, treats: best.treats } : null} />;
}
