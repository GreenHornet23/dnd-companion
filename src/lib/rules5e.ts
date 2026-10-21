import type { Ability, Character } from "./types";

export const ABILITIES: { key: Ability; label: string; short: string }[] = [
  { key: "str", label: "Forza", short: "FOR" },
  { key: "dex", label: "Destrezza", short: "DES" },
  { key: "con", label: "Costituzione", short: "COS" },
  { key: "int", label: "Intelligenza", short: "INT" },
  { key: "wis", label: "Saggezza", short: "SAG" },
  { key: "cha", label: "Carisma", short: "CAR" },
];

export const SKILLS: { key: string; label: string; ability: Ability }[] = [
  { key: "acrobatics", label: "Acrobazia", ability: "dex" },
  { key: "animal", label: "Addestrare Animali", ability: "wis" },
  { key: "arcana", label: "Arcano", ability: "int" },
  { key: "athletics", label: "Atletica", ability: "str" },
  { key: "deception", label: "Inganno", ability: "cha" },
  { key: "history", label: "Storia", ability: "int" },
  { key: "insight", label: "Intuizione", ability: "wis" },
  { key: "intimidation", label: "Intimidire", ability: "cha" },
  { key: "investigation", label: "Indagare", ability: "int" },
  { key: "medicine", label: "Medicina", ability: "wis" },
  { key: "nature", label: "Natura", ability: "int" },
  { key: "perception", label: "Percezione", ability: "wis" },
  { key: "performance", label: "Intrattenere", ability: "cha" },
  { key: "persuasion", label: "Persuasione", ability: "cha" },
  { key: "religion", label: "Religione", ability: "int" },
  { key: "sleight", label: "Rapidità di Mano", ability: "dex" },
  { key: "stealth", label: "Furtività", ability: "dex" },
  { key: "survival", label: "Sopravvivenza", ability: "wis" },
];

export type CasterType = "full" | "half" | "halfUp" | "third" | "pact" | "none";

export interface ClassInfo {
  name: string;
  hitDie: number;
  saves: Ability[];
  caster: CasterType;
  castAbility?: Ability;
}

export const CLASSES: ClassInfo[] = [
  { name: "Barbaro", hitDie: 12, saves: ["str", "con"], caster: "none" },
  { name: "Bardo", hitDie: 8, saves: ["dex", "cha"], caster: "full", castAbility: "cha" },
  { name: "Chierico", hitDie: 8, saves: ["wis", "cha"], caster: "full", castAbility: "wis" },
  { name: "Druido", hitDie: 8, saves: ["int", "wis"], caster: "full", castAbility: "wis" },
  { name: "Guerriero", hitDie: 10, saves: ["str", "con"], caster: "none" },
  { name: "Monaco", hitDie: 8, saves: ["str", "dex"], caster: "none" },
  { name: "Paladino", hitDie: 10, saves: ["wis", "cha"], caster: "half", castAbility: "cha" },
  { name: "Ranger", hitDie: 10, saves: ["str", "dex"], caster: "half", castAbility: "wis" },
  { name: "Ladro", hitDie: 8, saves: ["dex", "int"], caster: "none" },
  { name: "Stregone", hitDie: 6, saves: ["con", "cha"], caster: "full", castAbility: "cha" },
  { name: "Warlock", hitDie: 8, saves: ["wis", "cha"], caster: "pact", castAbility: "cha" },
  { name: "Mago", hitDie: 6, saves: ["int", "wis"], caster: "full", castAbility: "int" },
  { name: "Artefice", hitDie: 8, saves: ["con", "int"], caster: "halfUp", castAbility: "int" },
];

export const THIRD_CASTER_SUBCLASSES = ["Cavaliere Mistico", "Eldritch Knight", "Ladro Arcano", "Arcane Trickster"];

export interface RaceInfo {
  name: string;
  speed: number;
  /** Bonus fissi del regolamento 2014 (non si applicano al 2024, dove i bonus vengono dal background) */
  asi2014: Partial<Record<Ability, number>>;
  note?: string;
}

export const RACES: RaceInfo[] = [
  { name: "Umano", speed: 30, asi2014: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } },
  { name: "Elfo", speed: 30, asi2014: { dex: 2 } },
  { name: "Nano", speed: 25, asi2014: { con: 2 } },
  { name: "Halfling", speed: 25, asi2014: { dex: 2 } },
  { name: "Dragonide", speed: 30, asi2014: { str: 2, cha: 1 } },
  { name: "Gnomo", speed: 25, asi2014: { int: 2 } },
  { name: "Mezzelfo", speed: 30, asi2014: { cha: 2 }, note: "+1 a due caratteristiche a scelta: aggiungili al punteggio base." },
  { name: "Mezzorco", speed: 30, asi2014: { str: 2, con: 1 } },
  { name: "Tiefling", speed: 30, asi2014: { cha: 2, int: 1 } },
];

/** Specie del Player's Handbook 2024: nessun bonus fisso (arrivano dal background), velocità aggiornate */
export const SPECIES_2024: RaceInfo[] = [
  { name: "Aasimar", speed: 30, asi2014: {} },
  { name: "Dragonide", speed: 30, asi2014: {} },
  { name: "Nano", speed: 30, asi2014: {} },
  { name: "Elfo", speed: 30, asi2014: {} },
  { name: "Gnomo", speed: 30, asi2014: {} },
  { name: "Golia", speed: 35, asi2014: {} },
  { name: "Halfling", speed: 30, asi2014: {} },
  { name: "Umano", speed: 30, asi2014: {} },
  { name: "Orco", speed: 30, asi2014: {} },
  { name: "Tiefling", speed: 30, asi2014: {} },
];

export const racesFor = (ruleset: string): RaceInfo[] => (ruleset === "5e2024" ? SPECIES_2024 : RACES);

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
export const profBonus = (level: number) => Math.ceil(Math.max(1, level) / 4) + 1;

export const findClass = (name: string) => CLASSES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
export const findRace = (name: string, ruleset = "5e2014") =>
  racesFor(ruleset).find((r) => r.name.toLowerCase() === name.trim().toLowerCase());

export function effectiveAbilities(c: Character, ruleset: string): Record<Ability, number> {
  const out = { ...c.abilities };
  if (ruleset === "5e2014" && c.applyRacialBonus) {
    const race = findRace(c.race, ruleset);
    if (race) for (const k of Object.keys(race.asi2014) as Ability[]) out[k] += race.asi2014[k] ?? 0;
  }
  if (ruleset === "5e2024" && c.bgBonus) {
    for (const k of Object.keys(c.bgBonus) as Ability[]) out[k] += c.bgBonus[k] ?? 0;
  }
  return out;
}

const FULL: number[][] = [
  [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
// Mezzo incantatore "classico" (Paladino/Ranger 2014): primi slot al 2° livello
const HALF: number[][] = [
  [], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3],
  [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];
// Mezzo incantatore con arrotondamento per eccesso (Artefice; Paladino/Ranger 2024): slot dal 1° livello
const HALF_UP: number[][] = [
  [], [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3],
  [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];
const THIRD: number[][] = [
  [], [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
];
// Warlock: [numero slot, livello slot]
const PACT: [number, number][] = [
  [0, 0], [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
];

export interface SpellcastingInfo {
  type: CasterType;
  ability?: Ability;
  /** slot per livello (indice 0 = 1° livello) */
  slots: number[];
  pact?: { count: number; level: number };
}

export function spellcastingFor(c: Character, ruleset: string): SpellcastingInfo {
  const cls = findClass(c.className);
  const lvl = Math.min(20, Math.max(1, Math.floor(c.level) || 1));
  if (!cls) return { type: "none", slots: [] };
  let type: CasterType = cls.caster;
  let ability = cls.castAbility;
  if (
    type === "none" &&
    (cls.name === "Guerriero" || cls.name === "Ladro") &&
    THIRD_CASTER_SUBCLASSES.some((s) => s.toLowerCase() === c.subclass.trim().toLowerCase())
  ) {
    type = "third";
    ability = "int";
  }
  if (type === "half" && ruleset === "5e2024") type = "halfUp";
  switch (type) {
    case "full": return { type, ability, slots: FULL[lvl] };
    case "half": return { type, ability, slots: HALF[lvl] };
    case "halfUp": return { type, ability, slots: HALF_UP[lvl] };
    case "third": return { type, ability, slots: THIRD[lvl] };
    case "pact": {
      const [count, level] = PACT[lvl];
      return { type, ability, slots: [], pact: { count, level } };
    }
    default: return { type: "none", slots: [] };
  }
}

export interface Derived {
  abilities: Record<Ability, number>;
  mods: Record<Ability, number>;
  prof: number;
  saves: Record<Ability, { prof: boolean; value: number }>;
  skills: { key: string; label: string; ability: Ability; level: 0 | 1 | 2; value: number }[];
  initiative: number;
  speed: number;
  passivePerception: number;
  hitDie: number | null;
  spell?: { dc: number; attack: number; abilityLabel: string; info: SpellcastingInfo };
}

export function derive(c: Character, ruleset: string): Derived {
  const abilities = effectiveAbilities(c, ruleset);
  const mods = Object.fromEntries(ABILITIES.map((a) => [a.key, mod(abilities[a.key])])) as Record<Ability, number>;
  const prof = profBonus(c.level);
  const cls = findClass(c.className);
  const saveSet = new Set<Ability>(c.saveProfOverride ?? cls?.saves ?? []);
  const saves = Object.fromEntries(
    ABILITIES.map((a) => [a.key, { prof: saveSet.has(a.key), value: mods[a.key] + (saveSet.has(a.key) ? prof : 0) }]),
  ) as Derived["saves"];
  const skills = SKILLS.map((s) => {
    const level = c.skillProf[s.key] ?? 0;
    return { ...s, level, value: mods[s.ability] + level * prof };
  });
  const race = findRace(c.race, ruleset);
  const info = spellcastingFor(c, ruleset);
  const abil = ABILITIES.find((a) => a.key === info.ability);
  return {
    abilities, mods, prof, saves, skills,
    initiative: mods.dex,
    speed: c.speedOverride ?? race?.speed ?? 30,
    passivePerception: 10 + (skills.find((s) => s.key === "perception")?.value ?? 0),
    hitDie: cls?.hitDie ?? null,
    spell:
      info.type !== "none" && info.ability
        ? { dc: 8 + prof + mods[info.ability], attack: prof + mods[info.ability], abilityLabel: abil?.label ?? "", info }
        : undefined,
  };
}

export const newCharacter = (id: string, now: number): Character => ({
  id, updatedAt: now,
  name: "Nuovo personaggio", player: "", race: "Umano", className: "Guerriero", subclass: "", level: 1,
  background: "", alignment: "",
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  applyRacialBonus: true, skillProf: {},
  hpMax: 10, hpCurrent: 10, hpTemp: 0, acBonus: 0,
  coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  inventory: [], spells: [], slotsUsed: [],
  backstory: "", personality: "", notes: "", appearance: "", portraits: [],
});
