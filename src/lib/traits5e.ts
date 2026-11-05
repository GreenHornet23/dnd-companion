/**
 * Tratti e competenze fissi di razze/specie e classi della 5ª edizione (2014) e 5.5e (2024).
 * Sono riassunti brevi per averli sempre sotto mano sulla scheda: il testo completo resta quello del tuo manuale.
 * Formato delle liste testuali: una riga per voce, campi separati da "|".
 */
import type { Ability } from "./types";

export interface Trait { name: string; text: string; level?: number }

/** Incantesimi concessi da razza o sottoclasse. `level` = livello del personaggio da cui sono disponibili, `lvl` = livello dell'incantesimo (0 = trucchetto) */
export interface SpellGrant { level: number; spells: { name: string; lvl: number }[]; note?: string }

/** Formato: "1:Bless@1,Cure Wounds@1; 3:Lesser Restoration@2" (livello del personaggio: incantesimo@livello-incantesimo) */
export const grants = (src: string): SpellGrant[] =>
  src.split(";").map((part) => {
    const [lvl, list] = part.split(":");
    return { level: +lvl.trim(), spells: list.split(",").map((x) => { const [n, l] = x.trim().split("@"); return { name: n.trim(), lvl: +(l ?? 0) }; }) };
  });

export const parse = (src: string): Trait[] =>
  src.trim().split("\n").map((l) => {
    const p = l.split("|");
    const hasLvl = /^\d+$/.test(p[0]);
    return hasLvl ? { level: +p[0], name: p[1], text: p.slice(2).join("|") } : { name: p[0], text: p.slice(1).join("|") };
  });

// ───────────────────────── Razze 2014 ─────────────────────────
export interface RaceTraits {
  size: string;
  darkvision?: number;
  languages: string;
  /** abilità con competenza fissa (chiavi di SKILLS) */
  skills?: string[];
  /** PF aggiuntivi per livello */
  hpPerLevel?: number;
  /** velocità diversa da quella di base della razza */
  speed?: number;
  traits: Trait[];
  /** incantesimi concessi dalla razza/specie */
  spells?: SpellGrant[];
  subraces?: Record<string, SubraceTraits>;
}
export interface SubraceTraits {
  asi: Partial<Record<Ability, number>>;
  speed?: number;
  darkvision?: number;
  hpPerLevel?: number;
  languages?: string;
  traits: Trait[];
  spells?: SpellGrant[];
}

export const RACE_TRAITS_2014: Record<string, RaceTraits> = {
  Umano: {
    size: "Media", languages: "Comune + una a scelta",
    traits: parse(`
Versatile|+1 a tutte le caratteristiche. Variante (se il tuo DM la permette): +1 a due caratteristiche, una abilità e un talento a scelta.`),
  },
  Elfo: {
    size: "Media", darkvision: 60, languages: "Comune, Elfico", skills: ["perception"],
    traits: parse(`
Scurovisione|Vedi al buio entro 18 m come con luce fioca.
Sensi Acuti|Competenza in Percezione.
Retaggio Fatato|Vantaggio ai TS contro charme; la magia non ti addormenta.
Trance|Meditazione di 4 ore al posto del sonno.`),
    subraces: {
      "Alto Elfo": { asi: { int: 1 }, languages: "una lingua a scelta in più", traits: parse(`
Addestramento nelle Armi Elfiche|Competenza con spada lunga, spada corta, arco corto e arco lungo.
Trucchetto|Conosci un trucchetto da mago (Intelligenza come caratteristica).`) },
      "Elfo dei Boschi": { asi: { wis: 1 }, speed: 35, traits: parse(`
Addestramento nelle Armi Elfiche|Competenza con spada lunga, spada corta, arco corto e arco lungo.
Piede Veloce|Velocità base 35 ft (10,5 m).
Maschera della Natura|Puoi nasconderti anche con coperture naturali leggere.`) },
      "Elfo Oscuro (Drow)": { asi: { cha: 1 }, darkvision: 120, traits: parse(`
Scurovisione Superiore|Scurovisione fino a 36 m.
Sensibilità alla Luce Solare|Svantaggio ad attacchi e Percezione basata sulla vista in piena luce solare.
Magia Drow|Luci Danzanti; Luminescenza Fatata dal 3° livello; Oscurità dal 5° (Carisma).
Addestramento nelle Armi Drow|Competenza con stocco, spada corta e balestra a mano.`), spells: grants("1:Dancing Lights@0; 3:Faerie Fire@1; 5:Darkness@2") },
    },
  },
  Nano: {
    size: "Media", darkvision: 60, languages: "Comune, Nanico",
    traits: parse(`
Scurovisione|Vedi al buio entro 18 m come con luce fioca.
Resilienza Nanica|Vantaggio ai TS contro veleno e resistenza ai danni da veleno.
Addestramento da Combattimento Nanico|Competenza con ascia da battaglia, ascia, martello leggero, martello da guerra.
Competenza negli Strumenti|Uno a scelta fra strumenti da fabbro, da birraio, da muratore.
Conoscenza della Pietra|Doppia competenza nelle prove di Storia sull'origine di opere in pietra.
Velocità|La velocità non cala con l'armatura pesante.`),
    subraces: {
      "Nano delle Colline": { asi: { wis: 1 }, hpPerLevel: 1, traits: parse(`
Robustezza Nanica|+1 punto ferita massimo per ogni livello.`) },
      "Nano di Montagna": { asi: { str: 2 }, traits: parse(`
Addestramento nelle Armature Nanico|Competenza con armature leggere e medie.`) },
    },
  },
  Halfling: {
    size: "Piccola", languages: "Comune, Halfling",
    traits: parse(`
Fortunato|Quando ottieni 1 su un d20 (attacco, prova, TS) puoi ritirare il dado.
Coraggioso|Vantaggio ai TS contro la condizione spaventato.
Agilità Halfling|Puoi muoverti attraverso lo spazio di creature più grandi.`),
    subraces: {
      "Halfling Piedelesto": { asi: { cha: 1 }, traits: parse(`
Naturalmente Furtivo|Puoi nasconderti dietro una creatura almeno di una taglia più grande.`) },
      "Halfling Tozzo": { asi: { con: 1 }, traits: parse(`
Resilienza dei Tozzi|Vantaggio ai TS contro veleno e resistenza ai danni da veleno.`) },
    },
  },
  Dragonide: {
    size: "Media", languages: "Comune, Draconico",
    traits: parse(`
Discendenza Draconica|Scegli un drago: determina il tipo di danno del soffio e la resistenza.
Arma a Soffio|Azione: esalazione di energia; danni e area dipendono dalla discendenza. Si ricarica con un riposo.
Resistenza ai Danni|Resistenza al tipo di danno della tua discendenza.`),
  },
  Gnomo: {
    size: "Piccola", darkvision: 60, languages: "Comune, Gnomesco",
    traits: parse(`
Scurovisione|Vedi al buio entro 18 m come con luce fioca.
Astuzia Gnomesca|Vantaggio ai TS su Intelligenza, Saggezza e Carisma contro la magia.`),
    subraces: {
      "Gnomo delle Foreste": { asi: { dex: 1 }, traits: parse(`
Illusionista Nato|Conosci il trucchetto Illusione Minore (Intelligenza).
Parlare con le Piccole Bestie|Comunichi idee semplici con bestie piccole o più piccole.`), spells: grants("1:Minor Illusion@0") },
      "Gnomo delle Rocce": { asi: { con: 1 }, traits: parse(`
Conoscenza da Artefice|Doppia competenza nelle prove di Storia su oggetti magici, alchemici o tecnologici.
Truccatore|Competenza con gli strumenti da artigiano (da meccanico); puoi costruire piccoli congegni.`) },
    },
  },
  Mezzelfo: {
    size: "Media", darkvision: 60, languages: "Comune, Elfico, una a scelta",
    traits: parse(`
Scurovisione|Vedi al buio entro 18 m come con luce fioca.
Retaggio Fatato|Vantaggio ai TS contro charme; la magia non ti addormenta.
Versatilità nelle Abilità|Competenza in due abilità a tua scelta.`),
  },
  Mezzorco: {
    size: "Media", darkvision: 60, languages: "Comune, Orchesco", skills: ["intimidation"],
    traits: parse(`
Scurovisione|Vedi al buio entro 18 m come con luce fioca.
Minaccioso|Competenza in Intimidire.
Inesorabile Tenacia|Una volta per riposo lungo, a 0 PF ne resti con 1.
Attacchi Selvaggi|Con un colpo critico in mischia tiri un dado di danno dell'arma in più.`),
  },
  Tiefling: {
    size: "Media", darkvision: 60, languages: "Comune, Infernale",
    traits: parse(`
Scurovisione|Vedi al buio entro 18 m come con luce fioca.
Resistenza Infernale|Resistenza ai danni da fuoco.
Retaggio Infernale|Taumaturgia; Richiamo Infernale dal 3° livello; Oscurità dal 5° (Carisma).`),
    spells: grants("1:Thaumaturgy@0; 3:Hellish Rebuke@2; 5:Darkness@2"),
  },
};

// ───────────────────────── Specie 2024 ─────────────────────────
export const SPECIES_TRAITS_2024: Record<string, RaceTraits> = {
  Aasimar: { size: "Media o Piccola", darkvision: 60, languages: "Comune + 2 a scelta", traits: parse(`
Mani Guaritrici (Healing Hands)|Azione: ripristini PF pari a d4 per il tuo bonus di competenza; 1 volta per riposo lungo.
Portatore di Luce (Light Bearer)|Conosci il trucchetto Luce.
Resistenza Celestiale (Celestial Resistance)|Resistenza ai danni necrotici e radiosi.
Rivelazione Celestiale (Celestial Revelation)|Dal 3° livello: trasformazione (ali, alone o veli di ombra) per 1 minuto.`) },
  Dragonide: { size: "Media", darkvision: 60, languages: "Comune + 2 a scelta", traits: parse(`
Discendenza Draconica (Draconic Ancestry)|Scegli un drago: determina il tipo di danno.
Arma a Soffio (Breath Weapon)|Invece di un attacco: esalazione in un cono di 4,5 m; si ricarica con riposi.
Resistenza ai Danni (Damage Resistance)|Resistenza al tipo di danno della tua discendenza.
Volo Draconico (Draconic Flight)|Dal 5° livello: ali spettrali per volare per 10 minuti.`) },
  Nano: { size: "Media", darkvision: 120, languages: "Comune + 2 a scelta", hpPerLevel: 1, traits: parse(`
Resilienza Nanica (Dwarven Resilience)|Resistenza ai danni da veleno e vantaggio ai TS contro avvelenato.
Robustezza Nanica (Dwarven Toughness)|+1 punto ferita massimo per ogni livello.
Conoscenza della Pietra (Stonecunning)|Percezione tellurica a distanza ravvicinata.`) },
  Elfo: { size: "Media", darkvision: 60, languages: "Comune + 2 a scelta", traits: parse(`
Lignaggio Elfico (Elven Lineage)|Scegli Alto Elfo, Drow o Elfo dei Boschi (campo «Sottorazza»): trucchetto e incantesimi dal 3° e 5° livello.
Retaggio Fatato (Fey Ancestry)|Vantaggio ai TS contro charme.
Sensi Acuti (Keen Senses)|Competenza in Intuizione, Percezione o Sopravvivenza (a scelta).
Trance|Riposo lungo in 4 ore di meditazione.`) },
  Gnomo: { size: "Piccola", darkvision: 60, languages: "Comune + 2 a scelta", traits: parse(`
Astuzia Gnomesca (Gnomish Cunning)|Vantaggio ai TS su Intelligenza, Saggezza e Carisma.
Lignaggio Gnomesco (Gnomish Lineage)|Scegli Gnomo delle Foreste o delle Rocce: trucchetti e capacità associate.`) },
  Golia: { size: "Media", speed: 35, languages: "Comune + 2 a scelta", traits: parse(`
Discendenza Gigante (Giant Ancestry)|Scegli un beneficio da gigante (Brina, Fuoco, Colle, Pietra, Tempesta, Nuvola); usi pari al bonus di competenza.
Forma Grande (Large Form)|Dal 5° livello: diventi Grande per 10 minuti.
Corporatura Possente (Powerful Build)|Vantaggio per liberarti dalla presa; capacità di carico come una taglia più grande.`) },
  Halfling: { size: "Piccola", languages: "Comune + 2 a scelta", traits: parse(`
Coraggioso (Brave)|Vantaggio ai TS contro spaventato.
Agilità Halfling (Halfling Nimbleness)|Puoi muoverti attraverso lo spazio di creature più grandi.
Fortuna (Luck)|Quando ottieni 1 su un d20 devi ritirare il dado.
Naturalmente Furtivo (Naturally Stealthy)|Puoi nasconderti anche dietro una creatura più grande di te.`) },
  Umano: { size: "Media o Piccola", languages: "Comune + 2 a scelta", traits: parse(`
Ingegnoso (Resourceful)|Ottieni Ispirazione Eroica dopo ogni riposo lungo.
Abile (Skillful)|Competenza in una abilità a scelta.
Versatile (Versatile)|Ottieni un talento di origine a tua scelta.`) },
  Orco: { size: "Media", darkvision: 120, languages: "Comune + 2 a scelta", traits: parse(`
Scarica di Adrenalina (Adrenaline Rush)|Scatto come azione bonus con PF temporanei; usi pari al bonus di competenza.
Tenacia Implacabile (Relentless Endurance)|Una volta per riposo lungo, a 0 PF ne resti con 1.`) },
  Tiefling: { size: "Media o Piccola", darkvision: 60, languages: "Comune + 2 a scelta", traits: parse(`
Retaggio Ultraterreno (Fiendish Legacy)|Scegli Abissale, Ctonio o Infernale: resistenza e incantesimi dal 3° e 5° livello.
Presenza Ultraterrena (Otherworldly Presence)|Conosci il trucchetto Taumaturgia.`) },
};


// Lignaggi/retaggi/ascendenze 2024 (si scelgono nel campo «Sottorazza»; non danno bonus alle caratteristiche)
const LIN = (traits: string, spells?: string): SubraceTraits => ({ asi: {}, traits: parse(traits), spells: spells ? grants(spells) : undefined });
SPECIES_TRAITS_2024.Elfo.subraces = {
  "Alto Elfo (High Elf)": LIN("Lignaggio Alto Elfo|Trucchetto Prestidigitazione (sostituibile a ogni riposo lungo con un trucchetto da mago); dal 3° livello Individuazione del Magico, dal 5° Passo Velato.", "1:Prestidigitation@0; 3:Detect Magic@1; 5:Misty Step@2"),
  "Drow": LIN("Lignaggio Drow|Scurovisione fino a 36 m; trucchetto Luci Danzanti; dal 3° livello Fiamme Fatate, dal 5° Oscurità.", "1:Dancing Lights@0; 3:Faerie Fire@1; 5:Darkness@2"),
  "Elfo dei Boschi (Wood Elf)": LIN("Lignaggio Elfo dei Boschi|Velocità 35 ft; trucchetto Druidismo; dal 3° livello Passo Veloce (Longstrider), dal 5° Passare Senza Tracce.", "1:Druidcraft@0; 3:Longstrider@1; 5:Pass without Trace@2"),
};
SPECIES_TRAITS_2024.Elfo.subraces["Drow"].darkvision = 120;
SPECIES_TRAITS_2024.Elfo.subraces["Elfo dei Boschi (Wood Elf)"].speed = 35;
SPECIES_TRAITS_2024.Gnomo.subraces = {
  "Gnomo delle Foreste (Forest Gnome)": LIN("Lignaggio delle Foreste|Trucchetto Illusione Minore; Parlare con gli Animali un numero di volte pari al bonus di competenza per riposo lungo.", "1:Minor Illusion@0; 1:Speak with Animals@1"),
  "Gnomo delle Rocce (Rock Gnome)": LIN("Lignaggio delle Rocce|Trucchetti Riparare e Prestidigitazione; puoi costruire piccoli congegni meccanici.", "1:Mending@0; 1:Prestidigitation@0"),
};
SPECIES_TRAITS_2024.Tiefling.subraces = {
  "Abissale (Abyssal)": LIN("Retaggio Abissale|Resistenza al veleno; trucchetto Spruzzo Velenoso; dal 3° livello Raggio di Malattia, dal 5° Blocca Persone.", "1:Poison Spray@0; 3:Ray of Sickness@1; 5:Hold Person@2"),
  "Ctonio (Chthonic)": LIN("Retaggio Ctonio|Resistenza al necrotico; trucchetto Tocco Gelido; dal 3° livello Falsa Vita, dal 5° Raggio di Indebolimento.", "1:Chill Touch@0; 3:False Life@1; 5:Ray of Enfeeblement@2"),
  "Infernale (Infernal)": LIN("Retaggio Infernale|Resistenza al fuoco; trucchetto Dardo di Fuoco; dal 3° livello Rimprovero Infernale, dal 5° Oscurità.", "1:Fire Bolt@0; 3:Hellish Rebuke@1; 5:Darkness@2"),
};
SPECIES_TRAITS_2024.Tiefling.spells = grants("1:Thaumaturgy@0");
SPECIES_TRAITS_2024.Aasimar.spells = grants("1:Light@0");

// ───────────────────────── Classi ─────────────────────────
export interface ClassTraits {
  armor: string;
  weapons: string;
  tools: string;
  features: Trait[];
}

const ASI = "Aumento dei Punteggi Caratteristica|+2 a una caratteristica, +1 a due, oppure un talento.";
const sub = (l: number, what: string) => `${l}|Privilegio di ${what}|Capacità della tua sottoclasse: vedi il manuale.`;

export const CLASS_TRAITS_2014: Record<string, ClassTraits> = {
  Barbaro: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Ira|Bonus ai danni in mischia e resistenza ai danni fisici; usi limitati per riposo lungo.
1|Difesa senza Armatura|Senza armatura CA = 10 + Des + Cos.
2|Attacco Irruento|Vantaggio ai tuoi attacchi, ma anche i nemici lo hanno contro di te.
2|Percezione del Pericolo|Vantaggio ai TS su Destrezza contro effetti visibili.
${sub(3, "Sentiero Primordiale")}
4|${ASI}
5|Attacco Extra|Due attacchi con l'azione Attacco.
5|Movimento Veloce|+3 m di velocità senza armatura pesante.
${sub(6, "Sentiero Primordiale")}
7|Istinto Ferino|Vantaggio all'iniziativa; puoi agire nel primo turno anche se sorpreso entrando in Ira.
8|${ASI}
9|Critico Brutale|Un dado di danno in più sui colpi critici in mischia (aumenta ai livelli 13 e 17).
${sub(10, "Sentiero Primordiale")}
11|Ira Implacabile|Con 0 PF in Ira, TS su Costituzione per restare in piedi.
12|${ASI}
${sub(14, "Sentiero Primordiale")}
15|Ira Persistente|L'Ira termina solo se vuoi o se perdi i sensi.
16|${ASI}
18|Forza Indomita|Le prove di Forza hanno come minimo il tuo punteggio di Forza.
19|${ASI}
20|Campione Primordiale|Forza e Costituzione +4 (massimo 24).`) },
  Bardo: { armor: "Armature leggere", weapons: "Armi semplici, balestre a mano, spade lunghe, stocchi, spade corte", tools: "Tre strumenti musicali a scelta", features: parse(`
1|Incantesimi|Incantatore con Carisma; conosci un elenco di incantesimi e trucchetti.
1|Ispirazione Bardica|Concedi un dado (d6, poi cresce) che un alleato aggiunge a una prova, attacco o TS.
2|Factotum (Jack of All Trades)|Aggiungi metà bonus di competenza alle prove senza competenza.
2|Canto di Riposo|Dadi extra di PF recuperati dagli alleati durante un riposo breve.
${sub(3, "Collegio Bardico")}
3|Maestria (Expertise)|Doppia competenza in due abilità (anche al 10°).
4|${ASI}
5|Fonte di Ispirazione|L'Ispirazione Bardica torna con un riposo breve.
6|Controfascinazione|Vantaggio ai TS contro spaventato e charme per gli alleati vicini.
8|${ASI}
10|Segreti Magici|Impari incantesimi da qualsiasi lista di classe.
12|${ASI}
16|${ASI}
19|${ASI}
20|Ispirazione Superiore|Recuperi un uso di Ispirazione Bardica se all'iniziativa ne hai zero.`) },
  Chierico: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici", tools: "—", features: parse(`
1|Incantesimi|Incantatore con Saggezza; prepari incantesimi ogni giorno.
${sub(1, "Dominio Divino")}
2|Incanalare Divinità|Effetto divino a uso limitato per riposo (Scacciare Non Morti e effetti del dominio).
4|${ASI}
5|Distruggere Non Morti|I non morti di basso GS sconfitti dal Scacciare Non Morti sono distrutti.
8|${ASI}
10|Intervento Divino|Chiedi aiuto al tuo dio; successo con una percentuale pari al livello.
12|${ASI}
16|${ASI}
19|${ASI}`) },
  Druido: { armor: "Armature leggere e medie, scudi (non metallici)", weapons: "Randelli, pugnali, dardi, giavellotti, mazze, bastoni ferrati, scimitarre, falcetti, fionde, lance", tools: "Kit da erborista", features: parse(`
1|Druidico|Conosci la lingua segreta dei druidi.
1|Incantesimi|Incantatore con Saggezza; prepari incantesimi ogni giorno.
2|Forma Selvatica|Ti trasformi in una bestia che hai già visto (limiti per GS e velocità di volo/nuoto).
${sub(2, "Circolo Druidico")}
4|${ASI}
8|${ASI}
12|${ASI}
16|${ASI}
18|Corpo Senza Tempo|Invecchi molto più lentamente.
18|Incantesimi Bestiali|Lanci incantesimi anche in Forma Selvatica.
19|${ASI}
20|Arcidruido|Forma Selvatica illimitata e meno componenti per gli incantesimi.`) },
  Guerriero: { armor: "Tutte le armature, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Stile di Combattimento|Scegli uno stile (es. Arcieria, Difesa, Duellare, Combattere con Armi Grandi).
1|Recuperare Energie (Second Wind)|Azione bonus: recuperi 1d10 + livello PF; una volta per riposo breve.
2|Azione Impetuosa (Action Surge)|Un'azione aggiuntiva; una volta per riposo breve.
${sub(3, "Archetipo Marziale")}
4|${ASI}
5|Attacco Extra|Due attacchi con l'azione Attacco (tre all'11°, quattro al 20°).
6|${ASI}
8|${ASI}
9|Indomito (Indomitable)|Ripeti un TS fallito; usi crescenti ai livelli 13 e 17.
12|${ASI}
14|${ASI}
16|${ASI}
19|${ASI}`) },
  Monaco: { armor: "—", weapons: "Armi semplici, spade corte", tools: "Un tipo di strumenti da artigiano o uno strumento musicale", features: parse(`
1|Difesa senza Armatura|Senza armatura né scudo CA = 10 + Des + Sag.
1|Arti Marziali|Usi Destrezza per gli attacchi disarmati e delle armi da monaco; dado di danno crescente.
2|Ki|Punti ki per Raffica di Colpi, Difesa Paziente e Passo del Vento.
2|Movimento senza Armatura|Bonus di velocità senza armatura (cresce con il livello).
${sub(3, "Tradizione Monastica")}
3|Deviare Proiettili|Reazione: riduci i danni da attacchi a distanza e puoi rilanciarli.
4|Caduta Rallentata|Riduci i danni da caduta.
4|${ASI}
5|Attacco Extra|Due attacchi con l'azione Attacco.
5|Colpo Stordente|Spendi ki per stordire il bersaglio.
6|Colpi Potenziati dal Ki|I colpi disarmati contano come magici.
7|Eludere|Nessun danno sui TS Destrezza riusciti, metà se falliti.
7|Mente Tranquilla|Termini charme o paura su di te.
8|${ASI}
10|Purezza del Corpo|Immune a malattie e veleno.
12|${ASI}
13|Lingua del Sole e della Luna|Comprendi e ti fai capire da qualsiasi creatura.
14|Anima di Diamante|Competenza in tutti i TS.
15|Corpo Senza Tempo|Non invecchi più e non hai bisogno di cibo e acqua.
16|${ASI}
18|Corpo Vuoto|Diventi invisibile o astrale spendendo ki.
19|${ASI}
20|Perfetto Sé|Recuperi ki all'iniziativa se ne hai zero.`) },
  Paladino: { armor: "Tutte le armature, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Percezione Divina|Percepisci celestiali, immondi e non morti vicini.
1|Imposizione delle Mani|Riserva di PF da guarire (5 × livello).
2|Stile di Combattimento|Scegli uno stile (Difesa, Duellare, Armi Grandi, Protezione).
2|Incantesimi|Incantatore con Carisma; prepari incantesimi ogni giorno.
2|Punizione Divina|Spendi slot per danni radiosi extra su un colpo.
3|Salute Divina|Immune alle malattie.
${sub(3, "Giuramento Sacro")}
4|${ASI}
5|Attacco Extra|Due attacchi con l'azione Attacco.
6|Aura di Protezione|Tu e gli alleati vicini aggiungete il tuo bonus di Carisma ai TS.
8|${ASI}
10|Aura di Coraggio|Tu e gli alleati vicini non potete essere spaventati.
11|Punizione Divina Migliorata|+1d8 danni radiosi a ogni colpo in mischia.
12|${ASI}
14|Tocco Purificatore|Termini un incantesimo su di te o su un alleato.
16|${ASI}
18|Aure Migliorate|Il raggio delle tue aure aumenta.
19|${ASI}`) },
  Ranger: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Nemico Prescelto|Vantaggio a tracciare e ricordare informazioni su un tipo di creature, più lingua.
1|Esploratore Nato|Bonus in un tipo di terreno prescelto (viaggio, foraggiamento, tracce).
2|Stile di Combattimento|Scegli uno stile (Arcieria, Difesa, Duellare, Due Armi).
2|Incantesimi|Incantatore con Saggezza; incantesimi conosciuti.
${sub(3, "Archetipo del Ranger")}
3|Consapevolezza Primordiale|Spendi slot per percepire certe creature entro 1,5 km.
4|${ASI}
5|Attacco Extra|Due attacchi con l'azione Attacco.
8|${ASI}
8|Andatura Terrestre|Il terreno difficile non rallenta; vantaggio contro piante ostili.
10|Nascondersi in Piena Vista|Ti mimetizzi per ottenere un bonus a Furtività.
12|${ASI}
14|Svanire|Puoi nasconderti come azione bonus e non puoi essere tracciato senza magia.
16|${ASI}
18|Sensi Ferini|Percepisci creature invisibili e attacchi senza svantaggio.
19|${ASI}
20|Sterminatore di Nemici|Aggiungi Sag al tiro per colpire o ai danni contro un tuo nemico prescelto.`) },
  Ladro: { armor: "Armature leggere", weapons: "Armi semplici, balestre a mano, spade lunghe, stocchi, spade corte", tools: "Arnesi da scasso", features: parse(`
1|Maestria (Expertise)|Doppia competenza in due abilità o negli arnesi da scasso (anche al 6°).
1|Attacco Furtivo|Danni extra (1d6 ogni due livelli) con vantaggio o alleato adiacente al bersaglio.
1|Gergo dei Ladri|Lingua segreta dei ladri.
2|Azione Scaltra|Azione bonus per Scattare, Disimpegnarsi o Nascondersi.
${sub(3, "Archetipo Ladresco")}
4|${ASI}
5|Schivata Prodigiosa|Reazione: dimezzi i danni di un attacco che vedi.
7|Eludere|Nessun danno sui TS Destrezza riusciti, metà se falliti.
8|${ASI}
10|${ASI}
11|Talento Affidabile|Le tue competenze trattano un risultato inferiore a 10 come 10.
12|${ASI}
14|Percezione Cieca|Percepisci creature entro 3 m anche senza vederle.
15|Mente Sfuggente|Competenza nei TS su Saggezza.
16|${ASI}
18|Elusivo|Nessun attacco contro di te ha vantaggio finché non sei incapacitato.
19|${ASI}
20|Colpo di Fortuna|Trasformi un fallimento in un successo una volta per riposo.`) },
  Stregone: { armor: "—", weapons: "Pugnali, dardi, fionde, bastoni ferrati, balestre leggere", tools: "—", features: parse(`
1|Incantesimi|Incantatore con Carisma; incantesimi conosciuti.
${sub(1, "Origine Stregonesca")}
2|Fonte di Magia|Punti stregoneria: converti slot in punti e viceversa.
3|Metamagia|Modifichi gli incantesimi (due opzioni; altre ai livelli 10 e 17).
4|${ASI}
8|${ASI}
12|${ASI}
16|${ASI}
19|${ASI}
20|Ripristino Stregonesco|Recuperi 4 punti stregoneria con un riposo breve.`) },
  Warlock: { armor: "Armature leggere", weapons: "Armi semplici", tools: "—", features: parse(`
${sub(1, "Patrono Ultraterreno")}
1|Magia del Patto|Slot di pochi incantesimi ma di livello alto, che tornano con un riposo breve.
2|Suppliche Occulte|Opzioni magiche permanenti (due, ne ottieni altre salendo di livello).
3|Dono del Patto|Scegli Lama, Catena o Tomo.
4|${ASI}
8|${ASI}
11|Arcanum Mistico (6° livello)|Un incantesimo di 6° livello una volta per riposo lungo.
12|${ASI}
13|Arcanum Mistico (7° livello)|Un incantesimo di 7° livello una volta per riposo lungo.
15|Arcanum Mistico (8° livello)|Un incantesimo di 8° livello una volta per riposo lungo.
16|${ASI}
17|Arcanum Mistico (9° livello)|Un incantesimo di 9° livello una volta per riposo lungo.
19|${ASI}
20|Maestro Occulto|Recuperi tutti gli slot del Patto con 1 minuto di preghiera.`) },
  Mago: { armor: "—", weapons: "Pugnali, dardi, fionde, bastoni ferrati, balestre leggere", tools: "—", features: parse(`
1|Incantesimi|Incantatore con Intelligenza; libro degli incantesimi e incantesimi preparati.
1|Recupero Arcano|Recuperi slot con un riposo breve (una volta al giorno).
${sub(2, "Tradizione Arcana")}
4|${ASI}
8|${ASI}
12|${ASI}
16|${ASI}
18|Padronanza degli Incantesimi|Lanci un incantesimo di 1° e uno di 2° livello senza spendere slot.
19|${ASI}
20|Incantesimi Firma|Due incantesimi di 3° livello sempre preparati, lanciabili una volta senza slot.`) },
  Artefice: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici", tools: "Arnesi da scasso, strumenti da meccanico e uno strumento da artigiano a scelta", features: parse(`
1|Magia Ingegnosa|Imbevi un piccolo oggetto di una proprietà magica minore.
1|Incantesimi|Incantatore con Intelligenza; prepari incantesimi ogni giorno.
2|Infondere Oggetti|Crei oggetti magici temporanei (infusioni note).
3|Strumento Giusto al Momento Giusto|Crei strumenti da artigiano in pochi istanti.
${sub(3, "Specializzazione dell'Artefice")}
4|${ASI}
6|Maestria negli Strumenti|Doppia competenza per gli strumenti in cui sei competente.
7|Lampo di Genio|Reazione: aggiungi Int a una prova o TS di un alleato.
8|${ASI}
10|Adepto degli Oggetti Magici|Più oggetti sintonizzati e più infusioni.
11|Oggetto Contenitore di Incantesimi|Un oggetto contiene un incantesimo con usi multipli.
12|${ASI}
14|Esperto di Oggetti Magici|Altri oggetti sintonizzati e infusioni.
16|${ASI}
18|Maestro degli Oggetti Magici|Più oggetti sintonizzati e infusioni.
19|${ASI}
20|Anima dell'Artefice|Bonus ai TS e ritorno in piedi a 1 PF.`) },
};

const A24 = "Aumento dei Punteggi Caratteristica (Ability Score Improvement)|Un talento (o +2 a una caratteristica, +1 a due).";
const EB = "Dono Epico (Epic Boon)|Un talento epico.";
const sub24 = (l: number) => `${l}|Privilegio di Sottoclasse|Capacità della tua sottoclasse: vedi il manuale.`;

export const CLASS_TRAITS_2024: Record<string, ClassTraits> = {
  Barbaro: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Ira (Rage)|Bonus ai danni e resistenza ai danni fisici; usi limitati per riposo lungo.
1|Difesa senza Armatura (Unarmored Defense)|Senza armatura CA = 10 + Des + Cos.
1|Maestria nelle Armi (Weapon Mastery)|Sfrutti le proprietà di maestria di due armi.
2|Percezione del Pericolo (Danger Sense)|Vantaggio ai TS su Destrezza contro effetti visibili.
2|Attacco Irruento (Reckless Attack)|Vantaggio ai tuoi attacchi, ma anche i nemici lo hanno contro di te.
3|Sottoclasse Barbaro|Scegli un Sentiero Primordiale.
3|Conoscenza Primordiale (Primal Knowledge)|Competenza in un'abilità del Barbaro; usi abilità di Forza durante l'Ira.
4|${A24}
5|Attacco Extra (Extra Attack)|Due attacchi con l'azione Attacco.
5|Movimento Veloce (Fast Movement)|+3 m di velocità senza armatura pesante.
${sub24(6)}
7|Istinto Ferino (Feral Instinct)|Vantaggio all'iniziativa.
7|Balzo Istintivo (Instinctive Pounce)|Muoviti di metà velocità quando entri in Ira.
8|${A24}
9|Colpo Brutale (Brutal Strike)|Rinunci al vantaggio dell'Attacco Irruento per effetti e danni extra.
${sub24(10)}
11|Ira Implacabile (Relentless Rage)|A 0 PF in Ira, TS Cos per restare in piedi.
12|${A24}
13|Colpo Brutale Migliorato (Improved Brutal Strike)|Altri effetti del Colpo Brutale.
${sub24(14)}
15|Ira Persistente (Persistent Rage)|L'Ira si ripristina con l'iniziativa; dura finché non la interrompi.
16|${A24}
17|Colpo Brutale Migliorato (livello 17)|Effetti più potenti.
18|Forza Indomita (Indomitable Might)|Le prove di Forza hanno come minimo il tuo punteggio di Forza.
19|${EB}
20|Campione Primordiale (Primal Champion)|Forza e Costituzione +4 (massimo 25).`) },
  Bardo: { armor: "Armature leggere", weapons: "Armi semplici", tools: "Tre strumenti musicali", features: parse(`
1|Ispirazione Bardica (Bardic Inspiration)|Concedi un dado (d6, poi cresce) agli alleati; usi pari a Carisma.
1|Incantesimi (Spellcasting)|Incantatore con Carisma.
2|Maestria (Expertise)|Doppia competenza in due abilità (anche al 9°).
2|Factotum (Jack of All Trades)|Aggiungi metà bonus di competenza alle prove senza competenza.
3|Sottoclasse Bardo|Scegli un Collegio Bardico.
4|${A24}
5|Fonte di Ispirazione (Font of Inspiration)|L'Ispirazione Bardica torna anche con un riposo breve.
${sub24(6)}
7|Controfascinazione (Countercharm)|Reazione che protegge da charme e paura.
8|${A24}
10|Segreti Magici (Magical Secrets)|Impari incantesimi da qualsiasi lista di classe.
12|${A24}
${sub24(14)}
16|${A24}
18|Ispirazione Superiore (Superior Inspiration)|Recuperi usi di Ispirazione Bardica all'iniziativa.
19|${EB}
20|Parole di Creazione (Words of Creation)|Conosci Parola del Potere: Guarigione e Parola del Potere: Uccisione.`) },
  Chierico: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici", tools: "—", features: parse(`
1|Incantesimi (Spellcasting)|Incantatore con Saggezza; prepari incantesimi ogni giorno.
1|Ordine Divino (Divine Order)|Scegli Protettore (armature pesanti e armi da guerra) o Taumaturgo (un trucchetto in più e bonus a Arcano e Religione).
2|Incanalare Divinità (Channel Divinity)|Effetti divini a uso limitato (Scintilla Divina, Scacciare Non Morti).
3|Sottoclasse Chierico|Scegli un Dominio Divino.
4|${A24}
5|Incenerire i Non Morti (Sear Undead)|Scacciare Non Morti infligge anche danni radiosi.
${sub24(6)}
7|Colpi Benedetti (Blessed Strikes)|Danni extra radiosi o necrotici con armi o trucchetti.
8|${A24}
10|Intervento Divino (Divine Intervention)|Lanci un incantesimo di Chierico senza slot (una volta per riposo lungo).
12|${A24}
14|Colpi Benedetti Migliorati (Improved Blessed Strikes)|Danni extra aumentati.
16|${A24}
17|Privilegio di Sottoclasse|Capacità della tua sottoclasse: vedi il manuale.
19|${EB}
20|Intervento Divino Superiore (Greater Divine Intervention)|Lanci Desiderio tramite Intervento Divino.`) },
  Druido: { armor: "Armature leggere, scudi", weapons: "Armi semplici", tools: "—", features: parse(`
1|Incantesimi (Spellcasting)|Incantatore con Saggezza; prepari incantesimi ogni giorno.
1|Druidico (Druidic)|Lingua segreta dei druidi; conosci Parlare con gli Animali.
1|Ordine Primordiale (Primal Order)|Scegli Guardiano (armature medie e armi da guerra) o Mistico (trucchetto in più, bonus a Arcano e Natura).
2|Forma Selvatica (Wild Shape)|Ti trasformi in una bestia; usi limitati per riposo.
2|Compagno Selvatico (Wild Companion)|Spendi un uso di Forma Selvatica per evocare un famiglio.
3|Sottoclasse Druido|Scegli un Circolo Druidico.
4|${A24}
5|Risveglio Selvatico (Wild Resurgence)|Scambi slot e usi di Forma Selvatica.
${sub24(6)}
7|Furia Elementale (Elemental Fury)|Danni extra elementali o potenziamento dei trucchetti.
8|${A24}
${sub24(10)}
12|${A24}
${sub24(14)}
15|Furia Elementale Migliorata (Improved Elemental Fury)|Effetti elementali più potenti.
16|${A24}
18|Incantesimi Bestiali (Beast Spells)|Lanci incantesimi in Forma Selvatica.
19|${EB}
20|Arcidruido (Archdruid)|Usi illimitati di Forma Selvatica, e recuperi usi con l'iniziativa.`) },
  Guerriero: { armor: "Tutte le armature, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Stile di Combattimento (Fighting Style)|Un talento di stile di combattimento a scelta.
1|Recuperare Energie (Second Wind)|Azione bonus: recuperi 1d10 + livello PF; usi limitati.
1|Maestria nelle Armi (Weapon Mastery)|Sfrutti le proprietà di maestria di tre armi.
2|Azione Impetuosa (Action Surge)|Un'azione aggiuntiva; una volta per riposo breve.
2|Mente Tattica (Tactical Mind)|Spendi Recuperare Energie per aggiungere 1d10 a una prova fallita.
3|Sottoclasse Guerriero|Scegli un archetipo marziale.
4|${A24}
5|Attacco Extra (Extra Attack)|Due attacchi con l'azione Attacco.
5|Spostamento Tattico (Tactical Shift)|Muoviti senza provocare quando usi Recuperare Energie.
6|${A24}
${sub24(7)}
8|${A24}
9|Indomito (Indomitable)|Ripeti un TS fallito aggiungendo il livello da Guerriero.
9|Maestro Tattico (Tactical Master)|Cambi la maestria di un'arma al momento dell'attacco.
${sub24(10)}
11|Attacco Extra (2 attacchi extra)|Tre attacchi con l'azione Attacco.
12|${A24}
13|Studio degli Attacchi (Studied Attacks)|Vantaggio al bersaglio che hai mancato.
14|${A24}
${sub24(15)}
16|${A24}
${sub24(18)}
19|${EB}
20|Attacco Extra (3 attacchi extra)|Quattro attacchi con l'azione Attacco.`) },
  Monaco: { armor: "—", weapons: "Armi semplici e da guerra con proprietà Leggera", tools: "—", features: parse(`
1|Arti Marziali (Martial Arts)|Usi Destrezza per gli attacchi disarmati e delle armi da monaco; dado di danno crescente.
1|Difesa senza Armatura (Unarmored Defense)|Senza armatura né scudo CA = 10 + Des + Sag.
2|Concentrazione del Monaco (Monk's Focus)|Punti di Concentrazione per Raffica di Colpi, Difesa Paziente e Passo del Vento.
2|Movimento senza Armatura (Unarmored Movement)|Bonus di velocità senza armatura (cresce con il livello).
2|Metabolismo Straordinario (Uncanny Metabolism)|All'iniziativa recuperi punti e PF; una volta per riposo lungo.
3|Deviare Attacchi (Deflect Attacks)|Reazione: riduci i danni di un attacco.
3|Sottoclasse Monaco|Scegli una Tradizione Monastica.
4|${A24}
4|Caduta Rallentata (Slow Fall)|Riduci i danni da caduta.
5|Attacco Extra (Extra Attack)|Due attacchi con l'azione Attacco.
5|Colpo Stordente (Stunning Strike)|Spendi un punto per stordire il bersaglio.
6|Colpi Potenziati (Empowered Strikes)|I colpi disarmati possono infliggere danni di forza.
${sub24(6)}
7|Eludere (Evasion)|Nessun danno sui TS Destrezza riusciti, metà se falliti.
8|${A24}
9|Movimento Acrobatico (Acrobatic Movement)|Corri su superfici verticali e liquidi.
10|Concentrazione Accresciuta (Heightened Focus)|Raffica di Colpi, Difesa Paziente e Passo del Vento migliorati.
10|Autoguarigione (Self-Restoration)|Termini condizioni e non puoi essere affamato o assetato.
${sub24(11)}
12|${A24}
13|Deviare Energia (Deflect Energy)|Deviare Attacchi vale per tutti i tipi di danno.
14|Sopravvissuto Disciplinato (Disciplined Survivor)|Competenza in tutti i TS e ripetizione dei TS.
15|Concentrazione Perfetta (Perfect Focus)|Recuperi punti di Concentrazione all'iniziativa.
16|${A24}
${sub24(17)}
18|Difesa Superiore (Superior Defense)|Spendi punti per resistere quasi a tutti i danni.
19|${EB}
20|Corpo e Mente (Body and Mind)|Destrezza e Saggezza +4 (massimo 25).`) },
  Paladino: { armor: "Tutte le armature, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Imposizione delle Mani (Lay On Hands)|Riserva di PF da guarire (5 × livello).
1|Incantesimi (Spellcasting)|Incantatore con Carisma; prepari incantesimi ogni giorno.
1|Maestria nelle Armi (Weapon Mastery)|Sfrutti le proprietà di maestria di due armi.
2|Stile di Combattimento (Fighting Style)|Un talento di stile di combattimento a scelta.
2|Punizione del Paladino (Paladin's Smite)|Conosci Punizione Divina sempre preparato; usi gratuiti per riposo lungo.
3|Incanalare Divinità (Channel Divinity)|Effetti divini a uso limitato (Senso Divino).
3|Sottoclasse Paladino|Scegli un Giuramento Sacro.
4|${A24}
5|Attacco Extra (Extra Attack)|Due attacchi con l'azione Attacco.
5|Destriero Fedele (Faithful Steed)|Conosci Trova Destriero e puoi lanciarlo gratis una volta per riposo lungo.
6|Aura di Protezione (Aura of Protection)|Tu e gli alleati vicini aggiungete il tuo bonus di Carisma ai TS.
${sub24(7)}
8|${A24}
9|Scacciare i Nemici (Abjure Foes)|Spaventi i nemici vicini usando Incanalare Divinità.
10|Aura di Coraggio (Aura of Courage)|Tu e gli alleati vicini non potete essere spaventati.
11|Colpi Radiosi (Radiant Strikes)|Gli attacchi in mischia infliggono 1d8 radiosi extra.
12|${A24}
14|Tocco Ristoratore (Restoring Touch)|Termini condizioni con Imposizione delle Mani.
${sub24(15)}
16|${A24}
18|Aura Espansa (Aura Expansion)|Il raggio delle tue aure aumenta.
19|${EB}
${sub24(20)}`) },
  Ranger: { armor: "Armature leggere e medie, scudi", weapons: "Armi semplici e da guerra", tools: "—", features: parse(`
1|Incantesimi (Spellcasting)|Incantatore con Saggezza; prepari incantesimi ogni giorno.
1|Nemico Prescelto (Favored Enemy)|Conosci Marchio del Cacciatore sempre preparato; usi gratuiti per riposo lungo.
1|Maestria nelle Armi (Weapon Mastery)|Sfrutti le proprietà di maestria di due armi.
2|Esploratore Abile (Deft Explorer)|Maestria in un'abilità e due lingue a scelta.
2|Stile di Combattimento (Fighting Style)|Un talento di stile di combattimento a scelta.
3|Sottoclasse Ranger|Scegli un Archetipo del Ranger.
4|${A24}
5|Attacco Extra (Extra Attack)|Due attacchi con l'azione Attacco.
6|Vagabondo (Roving)|+3 m di velocità e velocità di scalata e nuoto.
${sub24(7)}
8|${A24}
9|Maestria (Expertise)|Doppia competenza in due abilità.
10|Instancabile (Tireless)|Punti ferita temporanei e riduzione dell'affaticamento.
${sub24(11)}
12|${A24}
13|Cacciatore Implacabile (Relentless Hunter)|Il danno non interrompe la concentrazione su Marchio del Cacciatore.
14|Velo della Natura (Nature's Veil)|Diventi invisibile come azione bonus.
${sub24(15)}
16|${A24}
17|Cacciatore Preciso (Precise Hunter)|Vantaggio contro il bersaglio del Marchio del Cacciatore.
18|Sensi Ferini (Feral Senses)|Percepisci creature invisibili vicine.
19|${EB}
20|Sterminatore di Nemici (Foe Slayer)|Il dado del Marchio del Cacciatore diventa d10.`) },
  Ladro: { armor: "Armature leggere", weapons: "Armi semplici e da guerra con proprietà Accurata o Leggera", tools: "Arnesi da scasso", features: parse(`
1|Maestria (Expertise)|Doppia competenza in due abilità (anche al 6°).
1|Attacco Furtivo (Sneak Attack)|Danni extra (1d6 ogni due livelli) con vantaggio o alleato adiacente al bersaglio.
1|Gergo dei Ladri (Thieves' Cant)|Lingua segreta dei ladri più un'altra a scelta.
1|Maestria nelle Armi (Weapon Mastery)|Sfrutti le proprietà di maestria di due armi.
2|Azione Scaltra (Cunning Action)|Azione bonus per Scattare, Disimpegnarsi o Nascondersi.
3|Sottoclasse Ladro|Scegli un Archetipo Ladresco.
3|Mira Stabile (Steady Aim)|Azione bonus: vantaggio al prossimo attacco se non ti sei mosso.
4|${A24}
5|Colpo Astuto (Cunning Strike)|Rinunci a dadi di Attacco Furtivo per effetti aggiuntivi.
5|Schivata Prodigiosa (Uncanny Dodge)|Reazione: dimezzi i danni di un attacco che vedi.
7|Eludere (Evasion)|Nessun danno sui TS Destrezza riusciti, metà se falliti.
7|Talento Affidabile (Reliable Talent)|Le tue competenze trattano un risultato inferiore a 10 come 10.
8|${A24}
${sub24(9)}
10|${A24}
11|Colpo Astuto Migliorato (Improved Cunning Strike)|Due effetti di Colpo Astuto insieme.
12|${A24}
${sub24(13)}
14|Colpi Subdoli (Devious Strikes)|Nuovi effetti per il Colpo Astuto.
15|Mente Sfuggente (Slippery Mind)|Competenza nei TS su Saggezza e Carisma.
16|${A24}
${sub24(17)}
18|Elusivo (Elusive)|Nessun attacco contro di te ha vantaggio finché non sei incapacitato.
19|${EB}
20|Colpo di Fortuna (Stroke of Luck)|Trasformi un fallimento in un successo una volta per riposo.`) },
  Stregone: { armor: "—", weapons: "Armi semplici", tools: "—", features: parse(`
1|Incantesimi (Spellcasting)|Incantatore con Carisma; incantesimi preparati.
1|Magia Innata (Innate Sorcery)|Azione bonus: per 1 minuto i tuoi incantesimi hanno CD maggiore e vantaggio ai tiri per colpire.
2|Fonte di Magia (Font of Magic)|Punti stregoneria: converti slot in punti e viceversa.
2|Metamagia (Metamagic)|Modifichi gli incantesimi (due opzioni; altre ai livelli 10 e 17).
3|Sottoclasse Stregone|Scegli un'Origine Stregonesca.
4|${A24}
5|Ripristino Stregonesco (Sorcerous Restoration)|Recuperi punti stregoneria con un riposo breve.
${sub24(6)}
7|Incarnazione Stregonesca (Sorcery Incarnate)|Usi Metamagia anche senza punti, con Magia Innata attiva.
8|${A24}
12|${A24}
${sub24(14)}
16|${A24}
${sub24(18)}
19|${EB}
20|Apoteosi Arcana (Arcane Apotheosis)|Metamagia gratuita con Magia Innata attiva.`) },
  Warlock: { armor: "Armature leggere", weapons: "Armi semplici", tools: "—", features: parse(`
1|Suppliche Occulte (Eldritch Invocations)|Opzioni magiche permanenti (una al 1°, altre salendo di livello).
1|Magia del Patto (Pact Magic)|Slot di pochi incantesimi ma di livello alto, che tornano con un riposo breve.
2|Astuzia Magica (Magical Cunning)|Recuperi slot del Patto con un riposo di un minuto (una volta per riposo lungo).
3|Sottoclasse Warlock|Scegli un Patrono Ultraterreno.
4|${A24}
${sub24(6)}
8|${A24}
9|Contatto con il Patrono (Contact Patron)|Conosci Contattare Altri Piani sempre preparato.
${sub24(10)}
11|Arcanum Mistico (6° livello)|Un incantesimo di 6° livello una volta per riposo lungo.
12|${A24}
13|Arcanum Mistico (7° livello)|Un incantesimo di 7° livello una volta per riposo lungo.
${sub24(14)}
15|Arcanum Mistico (8° livello)|Un incantesimo di 8° livello una volta per riposo lungo.
16|${A24}
17|Arcanum Mistico (9° livello)|Un incantesimo di 9° livello una volta per riposo lungo.
19|${EB}
20|Maestro Occulto (Eldritch Master)|Recuperi tutti gli slot del Patto con 1 minuto di preghiera.`) },
  Mago: { armor: "—", weapons: "Armi semplici", tools: "—", features: parse(`
1|Incantesimi (Spellcasting)|Incantatore con Intelligenza; libro degli incantesimi e incantesimi preparati.
1|Adepto dei Rituali (Ritual Adept)|Lanci rituali direttamente dal libro degli incantesimi.
1|Recupero Arcano (Arcane Recovery)|Recuperi slot con un riposo breve (una volta al giorno).
2|Erudito (Scholar)|Maestria in un'abilità (Arcano, Storia, Indagare, Medicina, Natura o Religione).
3|Sottoclasse Mago|Scegli una Tradizione Arcana.
4|${A24}
5|Memorizzare Incantesimo (Memorize Spell)|Cambi un incantesimo preparato con un riposo breve.
${sub24(6)}
8|${A24}
${sub24(10)}
12|${A24}
${sub24(14)}
16|${A24}
18|Padronanza degli Incantesimi (Spell Mastery)|Lanci un incantesimo di 1° e uno di 2° livello senza spendere slot.
19|${EB}
20|Incantesimi Firma (Signature Spells)|Due incantesimi di 3° livello sempre preparati, lanciabili una volta senza slot.`) },
};
const X = (cls: string, rows: string) => { CLASS_TRAITS_2014[cls].features.push(...parse(rows)); };
const S = (...lv: number[]) => lv.map((l) => sub(l, "sottoclasse")).join("\n");
X("Bardo", `${S(6, 14)}
5|Ispirazione Bardica (d8)|Il dado di Ispirazione Bardica diventa d8.
10|Ispirazione Bardica (d10)|Il dado diventa d10.
10|Maestria (2ª)|Doppia competenza in altre due abilità.
14|Segreti Magici (2º)|Altri due incantesimi da qualsiasi lista.
15|Ispirazione Bardica (d12)|Il dado diventa d12.
18|Segreti Magici (3º)|Altri due incantesimi da qualsiasi lista.`);
X("Chierico", `${S(2, 6, 8, 17)}
6|Incanalare Divinità (2/riposo)|Due usi per riposo.
18|Incanalare Divinità (3/riposo)|Tre usi per riposo.`);
X("Druido", S(6, 10, 14));
X("Guerriero", S(7, 10, 15, 18));
X("Monaco", S(6, 11, 17));
X("Paladino", S(7, 15, 20));
X("Ranger", S(7, 11, 15));
X("Ladro", S(9, 13, 17));
X("Stregone", `${S(6, 14, 18)}
10|Metamagia (2ª)|Due opzioni di Metamagia in più.
17|Metamagia (3ª)|Altre due opzioni di Metamagia.`);
X("Warlock", S(6, 10, 14));
X("Mago", S(6, 10, 14));
X("Artefice", S(5, 9, 15));

// L'Artefice non è nel Manuale del Giocatore 2024: si usano i privilegi del regolamento 2014
CLASS_TRAITS_2024.Artefice = CLASS_TRAITS_2014.Artefice;

// ───────────────────────── Talenti ─────────────────────────
export interface Feat {
  name: string;
  text: string;
  edition: "2014" | "2024" | "both";
  /** bonus fissi alla caratteristica */
  asi?: Partial<Record<Ability, number>>;
  /** bonus all'iniziativa: numero fisso, oppure "prof" = bonus di competenza */
  initiative?: number | "prof";
  speed?: number;
  /** PF aggiuntivi per livello */
  hpPerLevel?: number;
}

export const FEATS: Feat[] = [
  { name: "Allerta (Alert)", edition: "both", initiative: 5, text: "2014: +5 all'iniziativa e non puoi essere sorpreso. 2024: aggiungi il bonus di competenza all'iniziativa e puoi scambiarla con un alleato." },
  { name: "Atleta (Athlete)", edition: "2014", text: "+1 a Forza o Destrezza; alzarsi da proni costa poco movimento; salti più facili." },
  { name: "Attore (Actor)", edition: "2014", asi: { cha: 1 }, text: "+1 Carisma; vantaggio per impersonare altri." },
  { name: "Duro a Morire (Durable)", edition: "2014", asi: { con: 1 }, text: "+1 Costituzione; minimo ai dadi vita usati per recuperare PF." },
  { name: "Maestro delle Armature Pesanti (Heavy Armor Master)", edition: "2014", asi: { str: 1 }, text: "+1 Forza; -3 ai danni fisici non magici subiti con armatura pesante." },
  { name: "Mente Acuta (Keen Mind)", edition: "2014", asi: { int: 1 }, text: "+1 Intelligenza; ricordi sempre direzione, ore e passato." },
  { name: "Linguista (Linguist)", edition: "2014", asi: { int: 1 }, text: "+1 Intelligenza; tre lingue e cifrari." },
  { name: "Mobile (Mobile)", edition: "2014", speed: 10, text: "+3 m di velocità; lo Scatto non provoca attacchi di opportunità." },
  { name: "Robusto (Tough)", edition: "both", hpPerLevel: 2, text: "+2 PF massimi per ogni livello." },
  { name: "Veloce (Speedy)", edition: "2024", speed: 10, text: "+3 m di velocità; ignori il terreno difficile con Scatto e Disimpegno." },
  { name: "Fortunato (Lucky)", edition: "both", text: "Punti fortuna per ripetere o forzare tiri di d20." },
  { name: "Resistente (Resilient)", edition: "2014", text: "+1 a una caratteristica e competenza nei suoi TS." },
  { name: "Osservatore (Observant)", edition: "2014", text: "+1 Intelligenza o Saggezza; +5 a Percezione e Indagare passive; leggi il labiale." },
  { name: "Tiratore Scelto (Sharpshooter)", edition: "2014", text: "Niente svantaggio da gittata lunga; -5 al colpire per +10 ai danni a distanza." },
  { name: "Maestro delle Armi Grandi (Great Weapon Master)", edition: "2014", text: "Attacco bonus dopo critici/uccisioni; -5 al colpire per +10 ai danni." },
  { name: "Maestro di Spada e Scudo (Shield Master)", edition: "2014", text: "Spinta con lo scudo; aggiungi la CA dello scudo ai TS su Destrezza." },
  { name: "Mago da Guerra (War Caster)", edition: "2014", text: "Vantaggio ai TS di concentrazione; incantesimi come attacchi di opportunità." },
  { name: "Iniziato alla Magia (Magic Initiate)", edition: "both", text: "Due trucchetti e un incantesimo di 1° livello di una classe a scelta." },
  { name: "Esperto (Skilled)", edition: "both", text: "Competenza in tre abilità o strumenti a scelta." },
  { name: "Duellante Difensivo (Defensive Duelist)", edition: "2014", text: "Reazione: bonus alla CA pari alla competenza con arma accurata." },
  { name: "Combattente Montato (Mounted Combatant)", edition: "2014", text: "Vantaggio contro bersagli più piccoli della tua cavalcatura." },
  { name: "Guaritore (Healer)", edition: "both", text: "Cura con il kit da guaritore." },
  { name: "Rissoso (Tavern Brawler)", edition: "both", text: "Bonus negli attacchi disarmati e nelle lotte." },
  { name: "Aggressore Selvaggio (Savage Attacker)", edition: "both", text: "Ritira i dadi di danno di un'arma una volta per turno." },
  { name: "Musicista (Musician)", edition: "2024", text: "Competenza negli strumenti e canzoni che danno ispirazione eroica." },
  { name: "Artigiano (Crafter)", edition: "2024", text: "Competenza negli strumenti da artigiano e sconti sugli oggetti." },
  { name: "Esperto in Armature Leggere (Lightly Armored)", edition: "2014", text: "+1 Forza o Destrezza; competenza nelle armature leggere." },
  { name: "Esperto in Armature Medie (Moderately Armored)", edition: "2014", text: "+1 Forza o Destrezza; armature medie e scudi." },
  { name: "Esperto in Armature Pesanti (Heavily Armored)", edition: "2014", asi: { str: 1 }, text: "+1 Forza; competenza nelle armature pesanti." },
  { name: "Carica (Charger)", edition: "2014", text: "Dopo lo Scatto: attacco bonus con +5 ai danni o spinta di 3 m." },
  { name: "Esperto di Balestre (Crossbow Expert)", edition: "2014", text: "Ignori la ricarica, nessuno svantaggio con nemici adiacenti, attacco bonus con la balestra a mano." },
  { name: "Combattente con Due Armi (Dual Wielder)", edition: "2014", text: "+1 CA con due armi in mano; due armi non accurate; estrai due armi insieme." },
  { name: "Esploratore di Sotterranei (Dungeon Delver)", edition: "2014", text: "Vantaggio per trovare porte segrete e contro trappole; resistenza ai danni delle trappole." },
  { name: "Adepto Elementale (Elemental Adept)", edition: "2014", text: "Ignori la resistenza a un tipo di danno elementale; i dadi 1 contano come 2." },
  { name: "Lottatore (Grappler)", edition: "2014", text: "Vantaggio agli attacchi contro chi stai afferrando; puoi immobilizzare." },
  { name: "Capo Ispiratore (Inspiring Leader)", edition: "2014", text: "Discorso di 10 minuti: PF temporanei a sei creature." },
  { name: "Adepto Marziale (Martial Adept)", edition: "2014", text: "Due manovre del Maestro di Battaglia e un dado di superiorità d6." },
  { name: "Maestro delle Armature Medie (Medium Armor Master)", edition: "2014", text: "Nessuno svantaggio alla Furtività con armature medie; massimo +3 di Destrezza alla CA." },
  { name: "Ammazzamaghi (Mage Slayer)", edition: "2014", text: "Reazione per colpire chi lancia vicino a te; vantaggio ai TS contro incantesimi di creature adiacenti." },
  { name: "Maestro delle Armi Inastate (Polearm Master)", edition: "2014", text: "Attacco bonus con l'asta del bastone; attacco di opportunità quando i nemici ti entrano nella portata." },
  { name: "Incantatore Rituale (Ritual Caster)", edition: "2014", text: "Libro dei rituali: lanci incantesimi rituali di una classe." },
  { name: "Sentinella (Sentinel)", edition: "2014", text: "Gli attacchi di opportunità azzerano la velocità del bersaglio; reagisci agli attacchi ai tuoi alleati." },
  { name: "Furtivo (Skulker)", edition: "2014", text: "Puoi nasconderti con scarsa visibilità; mancare con attacchi a distanza non rivela la posizione." },

];


/** Talenti del Manuale del Giocatore 2024 (di origine, generali, stili di combattimento, doni epici). Effetti fissi solo dove sono certi; per le scelte (+1 a una caratteristica) usa i punteggi a mano. */
const F24 = (name: string, text: string, extra: Partial<Feat> = {}): Feat => ({ name, text, edition: "2024", ...extra });
export const FEATS_2024: Feat[] = [
  // Origine
  F24("Allerta (Alert)", "Aggiungi il bonus di competenza all'iniziativa e puoi scambiarla con un alleato.", { initiative: "prof" }),
  F24("Artigiano (Crafter)", "Competenza in tre strumenti da artigiano, sconti sugli oggetti non magici, costruzione rapida."),
  F24("Guaritore (Healer)", "Usa il kit da guaritore per curare; rilancia i dadi di cura 1."),
  F24("Fortunato (Lucky)", "Punti fortuna (pari al bonus di competenza) per vantaggio o svantaggio sui d20."),
  F24("Iniziato alla Magia (Magic Initiate)", "Due trucchetti e un incantesimo di 1° livello da una lista (Chierico, Druido o Mago)."),
  F24("Musicista (Musician)", "Competenza in tre strumenti musicali; canti che danno Ispirazione Eroica."),
  F24("Aggressore Selvaggio (Savage Attacker)", "Una volta per turno ritiri i dadi di danno di un'arma e scegli il risultato."),
  F24("Esperto (Skilled)", "Competenza in tre abilità o strumenti a scelta."),
  F24("Rissoso (Tavern Brawler)", "Colpi senz'armi migliorati (d4), danni alle armi improvvisate e spinta."),
  F24("Robusto (Tough)", "+2 PF massimi per ogni livello.", { hpPerLevel: 2 }),
  // Generali (livello 4+)
  F24("Aumento dei Punteggi Caratteristica (Ability Score Improvement)", "+2 a una caratteristica o +1 a due (massimo 20): modifica i punteggi a mano."),
  F24("Attore (Actor)", "+1 Carisma; vantaggio a Inganno e Rappresentazione per impersonare; imiti voci e suoni.", { asi: { cha: 1 } }),
  F24("Atleta (Athlete)", "+1 Forza o Destrezza; velocità di scalata, alzarsi da proni e salti migliorati."),
  F24("Carica (Charger)", "+1 Forza o Destrezza; dopo lo Scatto: attacco con danno extra o spinta."),
  F24("Cuoco (Chef)", "+1 Costituzione o Saggezza; competenza negli strumenti da cuoco; pasti che curano e danno PF temporanei."),
  F24("Esperto di Balestre (Crossbow Expert)", "+1 Destrezza; ignori la ricarica, nessuno svantaggio da vicino, attacco bonus.", { asi: { dex: 1 } }),
  F24("Schiacciatore (Crusher)", "+1 Forza o Costituzione; spostamento sui colpi contundenti, critici che danno vantaggio agli alleati."),
  F24("Duellante Difensivo (Defensive Duelist)", "+1 Destrezza; reazione: bonus alla CA con arma accurata in mano.", { asi: { dex: 1 } }),
  F24("Combattente con Due Armi (Dual Wielder)", "+1 Forza o Destrezza; due armi non pesanti, estrai due armi insieme."),
  F24("Duro a Morire (Durable)", "+1 Costituzione; recuperi PF extra con i dadi vita.", { asi: { con: 1 } }),
  F24("Adepto Elementale (Elemental Adept)", "+1 Int/Sag/Car; ignori la resistenza a un tipo di danno elementale."),
  F24("Toccato dalle Fate (Fey-Touched)", "+1 Int/Sag/Car; Passo Velato e un incantesimo di divinazione o ammaliamento di 1° livello."),
  F24("Lottatore (Grappler)", "+1 Forza o Destrezza; attacchi per afferrare più efficaci, movimento con l'afferrato."),
  F24("Maestro delle Armi Grandi (Great Weapon Master)", "+1 Forza; bonus ai danni pari alla competenza con armi pesanti; attacco bonus dopo critici/uccisioni.", { asi: { str: 1 } }),
  F24("Esperto in Armature Pesanti (Heavily Armored)", "Competenza nelle armature pesanti; +1 Forza o Costituzione."),
  F24("Maestro delle Armature Pesanti (Heavy Armor Master)", "+1 Forza o Costituzione; riduci i danni fisici non magici subiti."),
  F24("Capo Ispiratore (Inspiring Leader)", "+1 Saggezza o Carisma; discorso che dà PF temporanei agli alleati."),
  F24("Mente Acuta (Keen Mind)", "+1 Intelligenza; competenza in un'abilità (Arcano, Indagare, ecc.); ricordi sempre.", { asi: { int: 1 } }),
  F24("Esperto in Armature Leggere (Lightly Armored)", "+1 Forza o Destrezza; competenza con armature leggere e scudi."),
  F24("Ammazzamaghi (Mage Slayer)", "+1 Forza o Destrezza; reazione contro chi lancia incantesimi vicino a te."),
  F24("Addestramento con le Armi Marziali (Martial Weapon Training)", "+1 Forza o Destrezza; competenza con un'arma da guerra a scelta."),
  F24("Maestro delle Armature Medie (Medium Armor Master)", "+1 Forza o Destrezza; massimo +3 Destrezza alla CA con armatura media."),
  F24("Esperto in Armature Medie (Moderately Armored)", "+1 Forza o Destrezza; competenza con armature medie e scudi."),
  F24("Combattente Montato (Mounted Combatant)", "+1 Forza, Destrezza o Saggezza; vantaggio contro bersagli più piccoli della cavalcatura."),
  F24("Osservatore (Observant)", "+1 Intelligenza o Saggezza; competenza in un'abilità; Cercare come azione bonus."),
  F24("Perforatore (Piercer)", "+1 Forza o Destrezza; ritiri un dado di danno perforante; critici con dado extra."),
  F24("Avvelenatore (Poisoner)", "+1 Destrezza o Intelligenza; veleni potenti; competenza con il kit da avvelenatore."),
  F24("Maestro delle Armi Inastate (Polearm Master)", "+1 Forza o Destrezza; attacco bonus con l'asta; attacchi di opportunità all'avvicinarsi."),
  F24("Resistente (Resilient)", "+1 a una caratteristica e competenza nei suoi tiri salvezza."),
  F24("Incantatore Rituale (Ritual Caster)", "+1 Int/Sag/Car; lanci rituali con un libro dei rituali."),
  F24("Sentinella (Sentinel)", "+1 Forza o Destrezza; gli attacchi di opportunità azzerano la velocità del bersaglio."),
  F24("Toccato dall'Ombra (Shadow-Touched)", "+1 Int/Sag/Car; Invisibilità e un incantesimo di illusione o necromanzia di 1° livello."),
  F24("Tiratore Scelto (Sharpshooter)", "+1 Destrezza; ignori la copertura parziale/tre quarti e lo svantaggio a lunga gittata.", { asi: { dex: 1 } }),
  F24("Maestro di Spada e Scudo (Shield Master)", "+1 Forza; spinta con lo scudo, CA dello scudo ai TS di Destrezza.", { asi: { str: 1 } }),
  F24("Esperto di Abilità (Skill Expert)", "+1 a una caratteristica; una competenza e una maestria."),
  F24("Furtivo (Skulker)", "+1 Destrezza; vedi nel buio, attacchi dall'ombra senza rivelarti.", { asi: { dex: 1 } }),
  F24("Tagliente (Slasher)", "+1 Forza o Destrezza; riduci la velocità del bersaglio con danni taglienti."),
  F24("Veloce (Speedy)", "+1 Destrezza o Costituzione; +10 ft di velocità; ignori il terreno difficile con Scatto.", { speed: 10 }),
  F24("Cecchino di Incantesimi (Spell Sniper)", "+1 Int/Sag/Car; gittata doppia, ignori la copertura; un trucchetto aggiuntivo."),
  F24("Telecinetico (Telekinetic)", "+1 Int/Sag/Car; Mano Magica invisibile; spinta telecinetica."),
  F24("Telepatico (Telepathic)", "+1 Int/Sag/Car; telepatia entro 18 m; Individuazione dei Pensieri."),
  F24("Mago da Guerra (War Caster)", "+1 Int/Sag/Car; vantaggio alla concentrazione, incantesimi come attacchi di opportunità."),
  F24("Maestro d'Armi (Weapon Master)", "+1 Forza o Destrezza; competenza con un'arma e le sue maestrie."),
  // Stili di combattimento
  F24("Stile: Tiro con l'Arco (Archery)", "+2 ai tiri per colpire con armi a distanza."),
  F24("Stile: Combattere alla Cieca (Blind Fighting)", "Vista cieca entro 3 m."),
  F24("Stile: Difesa (Defense)", "+1 alla CA con un'armatura indossata."),
  F24("Stile: Duello (Dueling)", "+2 ai danni con un'arma a una mano e l'altra mano libera."),
  F24("Stile: Combattere con Armi Grandi (Great Weapon Fighting)", "I dadi di danno 1-2 con armi a due mani contano 3."),
  F24("Stile: Intercettazione (Interception)", "Riduci i danni a un alleato vicino con una reazione."),
  F24("Stile: Protezione (Protection)", "Svantaggio agli attacchi contro un alleato vicino (con scudo)."),
  F24("Stile: Armi da Lancio (Thrown Weapon Fighting)", "Estrai armi da lancio e +2 ai danni."),
  F24("Stile: Due Armi (Two-Weapon Fighting)", "Aggiungi il modificatore ai danni dell'attacco bonus."),
  F24("Stile: Lotta Senz'Armi (Unarmed Fighting)", "Danni senz'armi d6/d8 e danni a chi afferri."),
  // Doni epici (livello 19+)
  F24("Dono dell'Abilità in Combattimento (Boon of Combat Prowess)", "Trasformi un attacco mancato in un colpo."),
  F24("Dono del Viaggio Dimensionale (Boon of Dimensional Travel)", "Teletrasporto breve dopo aver attaccato o lanciato."),
  F24("Dono della Resistenza all'Energia (Boon of Energy Resistance)", "Resistenze a più tipi di danno."),
  F24("Dono del Destino (Boon of Fate)", "Alteri i tiri di d20 di creature vicine."),
  F24("Dono della Fortezza (Boon of Fortitude)", "+40 PF massimi."),
  F24("Dono dell'Offesa Irresistibile (Boon of Irresistible Offense)", "Ignori le resistenze ai danni fisici; i critici fanno danni extra."),
  F24("Dono del Recupero (Boon of Recovery)", "Cura te stesso come azione bonus (riserva di dadi)."),
  F24("Dono delle Abilità (Boon of Skill)", "Competenza in tutte le abilità."),
  F24("Dono della Velocità (Boon of Speed)", "+30 ft di velocità, Disimpegno come azione bonus."),
  F24("Dono del Richiamo degli Incantesimi (Boon of Spell Recall)", "Recuperi slot incantesimo."),
  F24("Dono dello Spirito Notturno (Boon of the Night Spirit)", "Diventi invisibile nell'ombra, resistenze."),
  F24("Dono della Vista Pura (Boon of Truesight)", "Vista pura entro 18 m."),
];

export const featsFor = (ruleset: string): Feat[] =>
  ruleset === "5e2024" ? [...FEATS_2024, ...FEATS.filter((f) => f.edition === "both" && !FEATS_2024.some((x) => x.name === f.name))] : FEATS.filter((f) => f.edition === "both" || f.edition === "2014");
export const findFeat = (name: string, ruleset?: string) => (ruleset ? featsFor(ruleset).find((f) => f.name === name) : undefined) ?? FEATS.find((f) => f.name === name) ?? FEATS_2024.find((f) => f.name === name);
