import type { Character, Npc } from "./types";

export const PORTRAIT_STYLES = [
  { id: "painting", label: "Pittura fantasy a olio" },
  { id: "ink", label: "Inchiostro e acquerello" },
  { id: "token", label: "Token circolare per mappa" },
  { id: "comic", label: "Illustrazione da manuale" },
  { id: "realistic", label: "Realistico cinematografico" },
];

const SLOT_LABEL: Record<string, string> = {
  mainHand: "in mano principale", offHand: "nell'altra mano", head: "in testa", body: "indossa",
  hands: "ai guanti", feet: "ai piedi", neck: "al collo", cloak: "mantello", ring: "anello", other: "porta",
};

/** Equipaggiamento attualmente in uso, in forma testuale. */
export function equippedSummary(c: Character): string[] {
  return c.inventory
    .filter((i) => i.equipped)
    .map((i) => `${i.name} (${SLOT_LABEL[i.slot] ?? "porta"})`);
}

export function buildCharacterPrompt(c: Character, description: string, styleId: string): string {
  const style = PORTRAIT_STYLES.find((s) => s.id === styleId)?.label ?? PORTRAIT_STYLES[0].label;
  const gear = equippedSummary(c);
  const lines = [
    `Ritratto di ${c.name}, ${c.race} ${c.className} di livello ${c.level}.`,
    description.trim() || c.appearance.trim(),
    gear.length ? `Equipaggiamento visibile: ${gear.join(", ")}.` : "",
    `Stile: ${style}. Personaggio ben riconoscibile, sfondo coerente, nessun testo nell'immagine.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildNpcPrompt(n: Npc, description: string, styleId: string): string {
  const style = PORTRAIT_STYLES.find((s) => s.id === styleId)?.label ?? PORTRAIT_STYLES[0].label;
  return [
    `Ritratto di ${n.name}${n.race ? `, ${n.race}` : ""}${n.role ? `, ${n.role}` : ""}.`,
    description.trim() || n.description.trim(),
    `Stile: ${style}. Nessun testo nell'immagine.`,
  ].filter(Boolean).join("\n");
}
