/** Catalogo di edizioni e manuali per gli slot PDF. I PDF li carica l'utente: l'app non include contenuti protetti. */
export interface Book {
  id: string;
  title: string;
  kind: "core" | "supplement" | "setting";
  /** true = slot creato di default alla creazione della campagna */
  defaultOn?: boolean;
}
export interface Edition {
  id: string;
  name: string;
  year: string;
  /** Ruleset con calcoli automatici nella scheda */
  ruleset: "5e2014" | "5e2024" | "generic";
  books: Book[];
}

const b = (id: string, title: string, kind: Book["kind"] = "supplement", defaultOn = false): Book => ({
  id, title, kind, defaultOn,
});

export const EDITIONS: Edition[] = [
  {
    id: "od&d", name: "D&D Originale (OD&D)", year: "1974", ruleset: "generic",
    books: [
      b("odd-mm", "Men & Magic", "core", true),
      b("odd-mt", "Monsters & Treasure", "core", true),
      b("odd-uwa", "The Underworld & Wilderness Adventures", "core", true),
      b("odd-greyhawk", "Supplement I: Greyhawk"),
      b("odd-blackmoor", "Supplement II: Blackmoor"),
      b("odd-eldritch", "Supplement III: Eldritch Wizardry"),
      b("odd-gods", "Supplement IV: Gods, Demi-Gods & Heroes"),
    ],
  },
  {
    id: "basic-holmes", name: "D&D Basic Set (Holmes)", year: "1977", ruleset: "generic",
    books: [b("holmes-basic", "Basic Set (Holmes)", "core", true)],
  },
  {
    id: "ad&d1", name: "AD&D 1ª edizione", year: "1977–1979", ruleset: "generic",
    books: [
      b("ad1-phb", "Player's Handbook", "core", true),
      b("ad1-dmg", "Dungeon Master's Guide", "core", true),
      b("ad1-mm", "Monster Manual", "core", true),
      b("ad1-ua", "Unearthed Arcana"),
      b("ad1-mm2", "Monster Manual II"),
      b("ad1-ff", "Fiend Folio"),
      b("ad1-dsg", "Dungeoneer's Survival Guide"),
      b("ad1-wsg", "Wilderness Survival Guide"),
      b("ad1-oa", "Oriental Adventures"),
    ],
  },
  {
    id: "bx", name: "D&D Basic/Expert (B/X)", year: "1981", ruleset: "generic",
    books: [b("bx-basic", "Basic Rulebook (Moldvay)", "core", true), b("bx-expert", "Expert Rulebook (Cook)", "core", true)],
  },
  {
    id: "becmi", name: "D&D BECMI", year: "1983", ruleset: "generic",
    books: [
      b("becmi-basic", "Basic Rules (Mentzer)", "core", true),
      b("becmi-expert", "Expert Rules", "core", true),
      b("becmi-companion", "Companion Rules"),
      b("becmi-master", "Master Rules"),
      b("becmi-immortals", "Immortals Rules"),
      b("becmi-cc", "Creature Catalog"),
    ],
  },
  {
    id: "ad&d2", name: "AD&D 2ª edizione", year: "1989 (rev. 1995)", ruleset: "generic",
    books: [
      b("ad2-phb", "Player's Handbook", "core", true),
      b("ad2-dmg", "Dungeon Master's Guide", "core", true),
      b("ad2-mc", "Monstrous Compendium / Monstrous Manual", "core", true),
      b("ad2-cfh", "The Complete Fighter's Handbook"),
      b("ad2-cth", "The Complete Thief's Handbook"),
      b("ad2-cph", "The Complete Priest's Handbook"),
      b("ad2-cwh", "The Complete Wizard's Handbook"),
      b("ad2-tom", "Tome of Magic"),
      b("ad2-aeg", "Arms and Equipment Guide"),
      b("ad2-cat", "Combat & Tactics (Player's Option)"),
    ],
  },
  {
    id: "rc", name: "D&D Rules Cyclopedia", year: "1991", ruleset: "generic",
    books: [b("rc-main", "Rules Cyclopedia", "core", true)],
  },
  {
    id: "3e", name: "D&D 3ª edizione", year: "2000", ruleset: "generic",
    books: [
      b("3e-phb", "Player's Handbook", "core", true),
      b("3e-dmg", "Dungeon Master's Guide", "core", true),
      b("3e-mm", "Monster Manual", "core", true),
    ],
  },
  {
    id: "3.5", name: "D&D 3.5", year: "2003", ruleset: "generic",
    books: [
      b("35-phb", "Player's Handbook", "core", true),
      b("35-dmg", "Dungeon Master's Guide", "core", true),
      b("35-mm", "Monster Manual", "core", true),
      b("35-ph2", "Player's Handbook II"),
      b("35-cw", "Complete Warrior"),
      b("35-ca", "Complete Arcane"),
      b("35-cd", "Complete Divine"),
      b("35-ch", "Complete Adventurer"),
      b("35-spc", "Spell Compendium"),
      b("35-mm2", "Monster Manual II"),
      b("35-ph", "Eberron Campaign Setting", "setting"),
    ],
  },
  {
    id: "4e", name: "D&D 4ª edizione", year: "2008", ruleset: "generic",
    books: [
      b("4e-phb", "Player's Handbook", "core", true),
      b("4e-dmg", "Dungeon Master's Guide", "core", true),
      b("4e-mm", "Monster Manual", "core", true),
      b("4e-phb2", "Player's Handbook 2"),
      b("4e-phb3", "Player's Handbook 3"),
      b("4e-ess", "Essentials (Heroes of the Fallen Lands / Forgotten Kingdoms)"),
    ],
  },
  {
    id: "5e2014", name: "D&D 5ª edizione (2014)", year: "2014", ruleset: "5e2014",
    books: [
      b("5e-phb", "Player's Handbook (2014)", "core", true),
      b("5e-dmg", "Dungeon Master's Guide (2014)", "core", true),
      b("5e-mm", "Monster Manual (2014)", "core", true),
      b("5e-vgtm", "Volo's Guide to Monsters"),
      b("5e-xgte", "Xanathar's Guide to Everything"),
      b("5e-mtof", "Mordenkainen's Tome of Foes"),
      b("5e-tcoe", "Tasha's Cauldron of Everything"),
      b("5e-ftod", "Fizban's Treasury of Dragons"),
      b("5e-mpmotm", "Mordenkainen Presents: Monsters of the Multiverse"),
      b("5e-bpgotg", "Bigby Presents: Glory of the Giants"),
      b("5e-scag", "Sword Coast Adventurer's Guide", "setting"),
      b("5e-egtw", "Explorer's Guide to Wildemount", "setting"),
      b("5e-ergtlw", "Eberron: Rising from the Last War", "setting"),
      b("5e-ggtr", "Guildmasters' Guide to Ravnica", "setting"),
      b("5e-moot", "Mythic Odysseys of Theros", "setting"),
    ],
  },
  {
    id: "5e2024", name: "D&D 5.5e (revisione 2024)", year: "2024", ruleset: "5e2024",
    books: [
      b("24-phb", "Player's Handbook (2024)", "core", true),
      b("24-dmg", "Dungeon Master's Guide (2024)", "core", true),
      b("24-mm", "Monster Manual (2024)", "core", true),
      // Gli ampliamenti 2014 restano usabili col regolamento 2024
      b("5e-xgte", "Xanathar's Guide to Everything (2014)"),
      b("5e-tcoe", "Tasha's Cauldron of Everything (2014)"),
      b("5e-ftod", "Fizban's Treasury of Dragons (2014)"),
      b("5e-bpgotg", "Bigby Presents: Glory of the Giants"),
      b("24-hof", "Heroes of Faerûn", "setting"),
      b("24-aif", "Adventures in Faerûn", "setting"),
      b("24-eberron", "Eberron: Forge of the Artificer", "setting"),
      b("24-ravenloft", "Ravenloft: The Horrors Within", "setting"),
      b("24-arcana", "Arcana Unleashed"),
      b("24-astarion", "Astarion's Book of Hungers"),
      b("24-lorwyn", "Lorwyn: First Light", "setting"),
    ],
  },
];

export const getEdition = (id: string) => EDITIONS.find((e) => e.id === id) ?? EDITIONS[EDITIONS.length - 2];
