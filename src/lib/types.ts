export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface Entity {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  editionId: string;
  /** Manuali/espansioni selezionati per questa campagna (id del catalogo o "custom") */
  bookIds: string[];
  /** Server di sincronizzazione del party (id campagna = id sul server). Contiene la chiave segreta: non va esportata. */
  sync?: { url: string; key: string };
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  name: string;
  qty: number;
  equipped: boolean;
  slot: "mainHand" | "offHand" | "head" | "body" | "hands" | "feet" | "neck" | "cloak" | "ring" | "other";
  notes: string;
}

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 = trucchetto
  prepared: boolean;
  notes: string;
  /** Dati presi dal manuale PDF (facoltativi) */
  school?: string;
  casting?: string;
  range?: string;
  components?: string;
  duration?: string;
  text?: string;
  source?: string;
}

export interface Character extends Entity {
  name: string;
  player: string;
  race: string;
  className: string;
  /** Sottoclasse: per Guerriero/Ladro "Cavaliere Mistico"/"Ladro Arcano" abilita gli slot da terzo di incantatore */
  subclass: string;
  level: number;
  background: string;
  alignment: string;
  abilities: Record<Ability, number>;
  applyRacialBonus: boolean;
  /** 5.5e (2024): gli aumenti di caratteristica arrivano dal background */
  bgBonus?: Partial<Record<Ability, number>>;
  skillProf: Record<string, 0 | 1 | 2>;
  saveProfOverride?: Ability[];
  hpMax: number;
  hpCurrent: number;
  hpTemp: number;
  acBonus: number;
  speedOverride?: number;
  coins: { pp: number; gp: number; ep: number; sp: number; cp: number };
  inventory: Item[];
  spells: Spell[];
  /** slot usati per livello (indice 0 = livello 1) */
  slotsUsed: number[];
  backstory: string;
  personality: string;
  notes: string;
  appearance: string;
  portraits: { id: string; assetId: string; prompt: string; createdAt: number }[];
}

export interface LogEntry extends Entity {
  characterId?: string;
  title: string;
  body: string;
  sessionNo?: number;
  date: string; // data reale ISO yyyy-mm-dd
  inGameDate: string;
}

export interface Objective {
  id: string;
  text: string;
  done: boolean;
}

export interface Quest extends Entity {
  title: string;
  description: string;
  status: "rumor" | "active" | "completed" | "failed";
  giver: string;
  reward: string;
  location: string;
  objectives: Objective[];
}

export interface Npc extends Entity {
  name: string;
  role: string;
  race: string;
  location: string;
  attitude: "ally" | "neutral" | "hostile" | "unknown";
  description: string;
  notes: string;
  portraitAssetId?: string;
}

export type GridTheme = "dungeon" | "cave" | "overland";

/** Mappa disegnata a celle (dungeon, caverna o mappa del mondo). Ogni riga è una stringa di codici tile. */
export interface GridMap {
  theme: GridTheme;
  w: number;
  h: number;
  rows: string[];
  seed?: number;
}

export interface MapDoc extends Entity {
  name: string;
  /** Mappa importata come immagine */
  assetId?: string;
  /** Mappa disegnata/generata nell'app (se presente ha la precedenza sull'immagine) */
  grid?: GridMap;
}

export interface MapPin extends Entity {
  mapId: string;
  x: number; // 0..1
  y: number; // 0..1
  title: string;
  note: string;
  kind: "city" | "dungeon" | "poi" | "quest" | "danger" | "note";
}

export interface Note extends Entity {
  title: string;
  body: string;
}

/** Metadati di un file binario (PDF, immagini). Il blob sta in IndexedDB, la copia condivisa sul server del party. */
export interface Asset extends Entity {
  name: string;
  mime: string;
  size: number;
  /** true = il file è stato caricato sul server del party */
  synced?: boolean;
}

/** Slot in cui caricare il PDF di un manuale */
export interface BookSlot extends Entity {
  bookId: string; // id del catalogo oppure "custom:<n>"
  title: string;
  /** PDF condiviso col party (solo se shared) */
  assetId?: string;
  /** false/assente = ognuno carica la propria copia, che resta sul suo dispositivo */
  shared?: boolean;
}

export interface CollectionMap {
  characters: Character;
  logs: LogEntry;
  quests: Quest;
  npcs: Npc;
  maps: MapDoc;
  pins: MapPin;
  notes: Note;
  assets: Asset;
  books: BookSlot;
}
export type CollectionName = keyof CollectionMap;
export const COLLECTIONS: CollectionName[] = [
  "characters", "logs", "quests", "npcs", "maps", "pins", "notes", "assets", "books",
];

export type CampaignData = { [K in CollectionName]: CollectionMap[K][] };
export const emptyData = (): CampaignData => ({
  characters: [], logs: [], quests: [], npcs: [], maps: [], pins: [], notes: [], assets: [], books: [],
});
