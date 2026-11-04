/**
 * Sottoclassi della 5e (2014: Manuale del Giocatore) e 5.5e (2024): privilegi per livello e incantesimi sempre preparati.
 * Sono riassunti a memoria per consultazione rapida: per i dettagli e le eccezioni vale il tuo manuale.
 * Le sottoclassi dei supplementari (Xanathar, Tasha…) non sono incluse: puoi scriverne il nome a mano.
 */
import { grants, parse, type SpellGrant, type Trait } from "./traits5e";

export interface SubclassInfo {
  features: Trait[];
  /** incantesimi sempre preparati (livello = livello di classe) */
  spells?: SpellGrant[];
  note?: string;
}

const sc = (features: string, spells?: string, note?: string): SubclassInfo => ({ features: parse(features), spells: spells ? grants(spells) : undefined, note });
/** Sottoclasse 2024: solo nomi dei privilegi ai livelli giusti, il testo si legge sul manuale */
const sc24 = (src: string, note?: string): SubclassInfo => ({
  features: src.split(";").flatMap((part) => {
    const [lvl, names] = part.split(":");
    return names.split(",").map((n) => ({ level: +lvl.trim(), name: n.trim(), text: "Privilegio di sottoclasse 2024: il testo completo è sul tuo manuale." }));
  }),
  note: note ?? "Elenco dei privilegi dal Manuale del Giocatore 2024 a memoria: controlla livelli e dettagli sul manuale.",
});

type Table = Record<string, Record<string, SubclassInfo>>;

// ───────────────────────── 2014 ─────────────────────────
export const SUBCLASSES_2014: Table = {
  Barbaro: {
    "Sentiero del Berserker (Path of the Berserker)": sc(`
3|Frenesia (Frenzy)|Durante l'ira puoi fare un attacco in mischia extra come azione bonus; a fine ira subisci un livello di sfinimento.
6|Furia Cieca (Mindless Rage)|Durante l'ira non puoi essere affascinato né spaventato.
10|Presenza Intimidatoria (Intimidating Presence)|Azione: spaventi una creatura entro 9 m (TS Saggezza).
14|Rappresaglia (Retaliation)|Reazione: attacco in mischia contro chi ti ha danneggiato entro 1,5 m.`),
    "Sentiero del Combattente Totemico (Path of the Totem Warrior)": sc(`
3|Cercatore Spirituale (Spirit Seeker)|Puoi lanciare Parlare con gli Animali e Percezione delle Bestie come rituali.
3|Spirito Totemico (Totem Spirit)|Scegli Orso (resistenza a quasi tutti i danni in ira), Aquila (scatto come azione bonus) o Lupo (vantaggio agli alleati).
6|Aspetto della Bestia (Aspect of the Beast)|Un potere passivo legato al tuo animale (Orso, Aquila o Lupo).
10|Camminatore Spirituale (Spirit Walker)|Puoi lanciare Comunione con la Natura come rituale.
14|Sintonia Totemica (Totemic Attunement)|Un potere legato al tuo animale totemico (Orso, Aquila o Lupo).`),
  },
  Bardo: {
    "Collegio della Sapienza (College of Lore)": sc(`
3|Competenze Bonus (Bonus Proficiencies)|Competenza in tre abilità a scelta.
3|Parole Taglienti (Cutting Words)|Reazione: spendi un'Ispirazione Bardica per sottrarre il dado a un tiro di una creatura entro 18 m.
6|Segreti Magici Aggiuntivi (Additional Magical Secrets)|Impari due incantesimi di qualsiasi classe.
14|Competenza Ineguagliabile (Peerless Skill)|Aggiungi un'Ispirazione Bardica a una tua prova di caratteristica.`),
    "Collegio del Valore (College of Valor)": sc(`
3|Competenze Bonus (Bonus Proficiencies)|Competenza in armature medie, scudi e armi da guerra.
3|Ispirazione di Combattimento (Combat Inspiration)|Gli alleati usano il dado di Ispirazione Bardica per danni o CA.
6|Attacco Extra (Extra Attack)|Due attacchi con l'azione di Attacco.
14|Magia di Battaglia (Battle Magic)|Dopo aver lanciato un incantesimo, attacco con un'arma come azione bonus.`),
  },
  Chierico: {
    "Dominio della Conoscenza (Knowledge Domain)": sc(`
1|Benedizioni della Conoscenza (Blessings of Knowledge)|Impari due lingue; competenza (doppia) in due fra Arcano, Storia, Natura, Religione.
2|Incanalare Divinità: Conoscenza delle Ere (Knowledge of the Ages)|Competenza temporanea in un'abilità o strumento.
6|Incanalare Divinità: Leggere i Pensieri (Read Thoughts)|Leggi i pensieri di una creatura e puoi lanciare Suggestione su di essa.
8|Lancio Potenziato (Potent Spellcasting)|Aggiungi il modificatore di Saggezza ai danni dei trucchetti da chierico.
17|Visioni del Passato (Visions of the Past)|Visioni su un oggetto o un luogo.`, "1:Command@1,Identify@1; 3:Augury@2,Suggestion@2; 5:Nondetection@3,Speak with Dead@3; 7:Arcane Eye@4,Confusion@4; 9:Legend Lore@5,Scrying@5"),
    "Dominio della Vita (Life Domain)": sc(`
1|Competenza con le Armature Pesanti|Ottieni la competenza con le armature pesanti.
1|Discepolo della Vita (Disciple of Life)|Le tue cure restituiscono 2 + livello dell'incantesimo PF in più.
2|Incanalare Divinità: Preservare la Vita (Preserve Life)|Ripristini PF pari a 5 × livello da distribuire fra creature entro 9 m.
6|Guaritore Benedetto (Blessed Healer)|Quando curi un altro, curi anche te stesso di 2 + livello dell'incantesimo.
8|Colpo Divino (Divine Strike)|+1d8 danni radiosi una volta per turno con un'arma (2d8 al 14°).
17|Guarigione Suprema (Supreme Healing)|I dadi di cura sono sempre al massimo.`, "1:Bless@1,Cure Wounds@1; 3:Lesser Restoration@2,Spiritual Weapon@2; 5:Beacon of Hope@3,Revivify@3; 7:Death Ward@4,Guardian of Faith@4; 9:Mass Cure Wounds@5,Raise Dead@5"),
    "Dominio della Luce (Light Domain)": sc(`
1|Trucchetto Bonus|Conosci il trucchetto Luce.
1|Lampo Protettivo (Warding Flare)|Reazione: imponi svantaggio all'attacco di una creatura che vedi (Saggezza volte per riposo lungo).
2|Incanalare Divinità: Radiosità dell'Alba (Radiance of the Dawn)|Dissipi l'oscurità magica e danneggi le creature ostili entro 9 m.
6|Lampo Potenziato (Improved Flare)|Il Lampo Protettivo può proteggere anche gli alleati.
8|Lancio Potenziato (Potent Spellcasting)|Aggiungi Saggezza ai danni dei trucchetti da chierico.
17|Corona di Luce (Corona of Light)|Azione: emetti luce solare e i nemici hanno svantaggio ai TS contro incantesimi di fuoco o radiosi.`, "1:Burning Hands@1,Faerie Fire@1; 3:Flaming Sphere@2,Scorching Ray@2; 5:Daylight@3,Fireball@3; 7:Guardian of Faith@4,Wall of Fire@4; 9:Flame Strike@5,Scrying@5"),
    "Dominio della Natura (Nature Domain)": sc(`
1|Accolito della Natura (Acolyte of Nature)|Un trucchetto da druido e competenza in Addestrare Animali, Natura o Sopravvivenza.
1|Competenza con le Armature Pesanti|Ottieni la competenza con le armature pesanti.
2|Incanalare Divinità: Charme su Animali e Piante|Affascini bestie e piante entro 9 m.
6|Smorzare gli Elementi (Dampen Elements)|Reazione: resistenza ad acido, freddo, fuoco, fulmine o tuono.
8|Colpo Divino (Divine Strike)|+1d8 danni da freddo, fuoco o fulmine con un'arma (2d8 al 14°).
17|Maestro della Natura (Master of Nature)|Comandi bestie e piante affascinate.`, "1:Animal Friendship@1,Speak with Animals@1; 3:Barkskin@2,Spike Growth@2; 5:Plant Growth@3,Wind Wall@3; 7:Dominate Beast@4,Grasping Vine@4; 9:Insect Plague@5,Tree Stride@5"),
    "Dominio della Tempesta (Tempest Domain)": sc(`
1|Competenze Bonus|Competenza con le armi da guerra e le armature pesanti.
1|Ira della Tempesta (Wrath of the Storm)|Reazione: danni da fulmine o tuono a chi ti colpisce in mischia (Saggezza volte per riposo lungo).
2|Incanalare Divinità: Ira Distruttiva (Destructive Wrath)|Massimizzi i danni da fulmine o tuono.
6|Colpo di Fulmine (Thunderbolt Strike)|I danni da fulmine spingono i bersagli Grandi o più piccoli di 3 m.
8|Colpo Divino (Divine Strike)|+1d8 danni da tuono con un'arma (2d8 al 14°).
17|Nato dalla Tempesta (Stormborn)|Velocità di volo uguale alla velocità a terra all'aperto.`, "1:Fog Cloud@1,Thunderwave@1; 3:Gust of Wind@2,Shatter@2; 5:Call Lightning@3,Sleet Storm@3; 7:Control Water@4,Ice Storm@4; 9:Destructive Wave@5,Insect Plague@5"),
    "Dominio dell'Inganno (Trickery Domain)": sc(`
1|Benedizione dell'Inganno (Blessing of the Trickster)|Concedi vantaggio alla Furtività a una creatura consenziente.
2|Incanalare Divinità: Invocare Duplicità (Invoke Duplicity)|Crei un'illusione di te stesso per 1 minuto.
6|Incanalare Divinità: Mantello d'Ombre (Cloak of Shadows)|Diventi invisibile fino alla fine del tuo prossimo turno.
8|Colpo Divino (Divine Strike)|+1d8 danni da veleno con un'arma (2d8 al 14°).
17|Duplicità Migliorata (Improved Duplicity)|Puoi creare fino a quattro duplicati.`, "1:Charm Person@1,Disguise Self@1; 3:Mirror Image@2,Pass without Trace@2; 5:Blink@3,Dispel Magic@3; 7:Dimension Door@4,Polymorph@4; 9:Dominate Person@5,Modify Memory@5"),
    "Dominio della Guerra (War Domain)": sc(`
1|Competenze Bonus|Competenza con le armi da guerra e le armature pesanti.
1|Sacerdote di Guerra (War Priest)|Azione bonus: un attacco con arma (Saggezza volte per riposo lungo).
2|Incanalare Divinità: Attacco Guidato (Guided Strike)|+10 a un tiro per colpire.
6|Incanalare Divinità: Benedizione del Dio della Guerra|Reazione: +10 al tiro per colpire di un alleato.
8|Colpo Divino (Divine Strike)|+1d8 danni dello stesso tipo dell'arma (2d8 al 14°).
17|Avatar della Battaglia (Avatar of Battle)|Resistenza ai danni fisici non magici.`, "1:Divine Favor@1,Shield of Faith@1; 3:Magic Weapon@2,Spiritual Weapon@2; 5:Crusader's Mantle@3,Spirit Guardians@3; 7:Freedom of Movement@4,Stoneskin@4; 9:Flame Strike@5,Hold Monster@5"),
  },
  Druido: {
    "Circolo della Terra (Circle of the Land)": sc(`
2|Trucchetto Bonus|Un trucchetto da druido in più.
2|Recupero Naturale (Natural Recovery)|Recuperi slot incantesimo con un riposo breve (una volta per riposo lungo).
3|Incantesimi del Circolo (Circle Spells)|Scegli un terreno (Artico, Costa, Deserto, Foresta, Prateria, Montagna, Palude, Sottosuolo): incantesimi sempre preparati ai livelli 3, 5, 7 e 9.
6|Passo della Terra (Land's Stride)|Ignori il terreno difficile non magico e le piante non magiche.
10|Protezione della Natura (Nature's Ward)|Immune a veleno e malattie; non puoi essere affascinato o spaventato da elementali e fatati.
14|Santuario della Natura (Nature's Sanctuary)|Bestie e piante hanno difficoltà ad attaccarti.`, undefined, "Gli incantesimi del Circolo dipendono dal terreno scelto: vedi il manuale."),
    "Circolo della Luna (Circle of the Moon)": sc(`
2|Forma Selvatica da Combattimento (Combat Wild Shape)|Forma Selvatica come azione bonus; spendi slot per curarti mentre sei trasformato.
2|Forme del Circolo (Circle Forms)|Puoi assumere forme con GS fino a 1 (livello/3 dal 6°).
6|Attacchi Primordiali (Primal Strike)|Gli attacchi in forma bestiale contano come magici.
10|Forma Selvatica Elementale (Elemental Wild Shape)|Spendi due usi per diventare un elementale.
14|Mille Forme (Thousand Forms)|Puoi lanciare Alterare Se Stessi a volontà.`),
  },
  Guerriero: {
    "Campione (Champion)": sc(`
3|Critico Migliorato (Improved Critical)|I tuoi attacchi con arma sono critici con 19-20.
7|Atleta Straordinario (Remarkable Athlete)|Aggiungi metà bonus di competenza alle prove di Forza, Destrezza e Costituzione senza competenza; salto più lungo.
10|Stile di Combattimento Aggiuntivo|Scegli un secondo Stile di Combattimento.
15|Critico Superiore (Superior Critical)|Critico con 18-20.
18|Sopravvissuto (Survivor)|Rigenerazione: recuperi PF a inizio turno se sei sotto la metà dei PF.`),
    "Maestro di Battaglia (Battle Master)": sc(`
3|Superiorità in Combattimento (Combat Superiority)|Tre manovre e quattro dadi di superiorità (d8).
3|Studente della Guerra (Student of War)|Competenza con un tipo di strumenti da artigiano.
7|Conosci il Tuo Nemico (Know Your Enemy)|Studi un nemico per scoprirne le capacità; due manovre e un dado in più.
10|Superiorità in Combattimento Migliorata|I dadi di superiorità diventano d10; altre due manovre.
15|Inarrestabile (Relentless)|Recuperi un dado di superiorità a inizio combattimento se ne hai finiti.
18|Superiorità Suprema|I dadi diventano d12.`),
    "Cavaliere Mistico (Eldritch Knight)": sc(`
3|Incantesimi (Spellcasting)|Lanci incantesimi da mago con Intelligenza (terzo di incantatore).
3|Legame con l'Arma (Weapon Bond)|Leghi due armi che non possono esserti disarmate e che richiami a te.
7|Magia di Guerra (War Magic)|Dopo un trucchetto puoi attaccare come azione bonus.
10|Colpo Mistico (Eldritch Strike)|Svantaggio ai TS del bersaglio colpito contro il tuo prossimo incantesimo.
15|Carica Arcana (Arcane Charge)|Ti teletrasporti di 9 m quando usi Azione Impetuosa.
18|Magia di Guerra Migliorata|Dopo aver lanciato un incantesimo puoi attaccare come azione bonus.`),
  },
  Monaco: {
    "Via della Mano Aperta (Way of the Open Hand)": sc(`
3|Tecnica della Mano Aperta (Open Hand Technique)|Raffica di Colpi: spingi, butti a terra o impedisci le reazioni.
6|Integrità del Corpo (Wholeness of Body)|Azione: recuperi PF pari a 3 × livello da monaco (una volta per riposo lungo).
11|Tranquillità (Tranquility)|Ottieni un effetto di Santuario dopo ogni riposo lungo.
17|Palmo Vibrante (Quivering Palm)|Vibrazioni letali con 3 punti ki.`),
    "Via dell'Ombra (Way of Shadow)": sc(`
3|Arti dell'Ombra (Shadow Arts)|Spendi ki per Oscurità, Scurovisione, Passare Senza Tracce, Silenzio; ottieni Illusione Minore.
6|Passo d'Ombra (Shadow Step)|Ti teletrasporti di 18 m fra zone di penombra o buio.
11|Mantello d'Ombra (Cloak of Shadows)|Diventi invisibile in penombra o buio.
17|Opportunista (Opportunist)|Attacco in reazione a chi viene colpito da un tuo alleato.`),
    "Via dei Quattro Elementi (Way of the Four Elements)": sc(`
3|Discepolo degli Elementi (Disciple of the Elements)|Conosci una disciplina elementale e Sintonia Elementale; usi ki per lanciare le discipline.
6|Discipline Elementali Aggiuntive|Impari una disciplina in più.
11|Discipline Elementali Aggiuntive|Impari una disciplina in più.
17|Discipline Elementali Aggiuntive|Impari una disciplina in più.`),
  },
  Paladino: {
    "Giuramento di Devozione (Oath of Devotion)": sc(`
3|Incanalare Divinità: Arma Sacra (Sacred Weapon)|+Carisma ai tiri per colpire e luce per 1 minuto.
3|Incanalare Divinità: Scacciare l'Empio (Turn the Unholy)|Scacci immondi e non morti.
7|Aura di Devozione (Aura of Devotion)|Tu e gli alleati vicini non potete essere affascinati.
15|Purezza dello Spirito (Purity of Spirit)|Sei sempre sotto l'effetto di Protezione dal Bene e dal Male.
20|Aura Radiosa (Holy Nimbus)|Emetti luce solare che danneggia i nemici vicini.`, "3:Protection from Evil and Good@1,Sanctuary@1; 5:Lesser Restoration@2,Zone of Truth@2; 9:Beacon of Hope@3,Dispel Magic@3; 13:Freedom of Movement@4,Guardian of Faith@4; 17:Commune@5,Flame Strike@5"),
    "Giuramento degli Antichi (Oath of the Ancients)": sc(`
3|Incanalare Divinità: Ira della Natura (Nature's Wrath)|Vegetali spettrali trattengono un nemico.
3|Incanalare Divinità: Scacciare gli Infedeli (Turn the Faithless)|Scacci fatati e immondi.
7|Aura di Guardia (Aura of Warding)|Tu e gli alleati vicini avete resistenza ai danni degli incantesimi.
15|Sentinella Immortale (Undying Sentinel)|A 0 PF resti a 1 PF; non invecchi.
20|Campione Antico (Elder Champion)|Ti trasformi in una forza primordiale con vantaggi.`, "3:Ensnaring Strike@1,Speak with Animals@1; 5:Misty Step@2,Moonbeam@2; 9:Plant Growth@3,Protection from Energy@3; 13:Ice Storm@4,Stoneskin@4; 17:Commune with Nature@5,Tree Stride@5"),
    "Giuramento di Vendetta (Oath of Vengeance)": sc(`
3|Incanalare Divinità: Abiurare il Nemico (Abjure Enemy)|Spaventi una creatura e ne riduci la velocità.
3|Incanalare Divinità: Voto di Inimicizia (Vow of Enmity)|Vantaggio agli attacchi contro un nemico per 1 minuto.
7|Vendicatore Implacabile (Relentless Avenger)|Dopo un attacco di opportunità puoi muoverti.
15|Anima della Vendetta (Soul of Vengeance)|Reazione: attacco in mischia contro chi è sotto Voto di Inimicizia.
20|Angelo Vendicatore (Avenging Angel)|Ali e aura di terrore.`, "3:Bane@1,Hunter's Mark@1; 5:Hold Person@2,Misty Step@2; 9:Haste@3,Protection from Energy@3; 13:Banishment@4,Dimension Door@4; 17:Hold Monster@5,Scrying@5"),
  },
  Ranger: {
    "Cacciatore (Hunter)": sc(`
3|Preda del Cacciatore (Hunter's Prey)|Scegli: Uccisore di Colossi, Uccisore di Giganti o Sterminatore di Orde.
7|Tattiche Difensive (Defensive Tactics)|Scegli: Fuga dalla Orda, Difesa contro Più Nemici o Difesa dell'Acciaio.
11|Multiattacco (Multiattack)|Scegli: Raffica o Attacco Vorticoso.
15|Difesa del Cacciatore Superiore|Scegli: Schivata Prodigiosa, Resistere alla Marea o Evasione.`),
    "Signore delle Bestie (Beast Master)": sc(`
3|Compagno del Ranger (Ranger's Companion)|Una bestia compagna (GS 1/4 o meno) che agisce con il tuo comando.
7|Addestramento Eccezionale (Exceptional Training)|Il compagno può usare Scatto, Disimpegno, Schivata o Aiuto come azione bonus.
11|Furia Bestiale (Bestial Fury)|Il compagno attacca due volte.
15|Condividere Incantesimi (Share Spells)|Gli incantesimi su di te si applicano anche al compagno.`),
  },
  Ladro: {
    "Ladro (Thief)": sc(`
3|Mani Svelte (Fast Hands)|Azione bonus: Rapidità di Mano, uso di oggetti o attrezzi da scasso.
3|Lavoro al Secondo Piano (Second-Story Work)|Scalare non costa movimento extra; salti più lunghi.
9|Furtività Suprema (Supreme Sneak)|Vantaggio alla Furtività se ti muovi di meno della metà della velocità.
13|Usare Oggetti Magici (Use Magic Device)|Ignori i requisiti di classe, razza e livello degli oggetti magici.
17|Riflessi da Ladro (Thief's Reflexes)|Due turni nel primo round di combattimento.`),
    "Assassino (Assassin)": sc(`
3|Competenze Bonus (Bonus Proficiencies)|Kit da travestimento e kit da avvelenatore.
3|Assassinare (Assassinate)|Vantaggio contro chi non ha ancora agito; i colpi sui sorpresi sono critici.
9|Esperto Infiltratore (Infiltration Expertise)|Crei identità false.
13|Impostore (Impostor)|Imiti la parlata, la scrittura e il comportamento di altri.
17|Colpo Mortale (Death Strike)|Un colpo su un bersaglio sorpreso: danni doppi se fallisce il TS Costituzione.`),
    "Furfante Arcano (Arcane Trickster)": sc(`
3|Incantesimi (Spellcasting)|Lanci incantesimi da mago con Intelligenza (terzo di incantatore).
3|Mano Magica Superiore (Mage Hand Legerdemain)|Mano Magica invisibile che può rubare e usare strumenti.
9|Imboscata Magica (Magical Ambush)|Se sei nascosto, i bersagli hanno svantaggio al TS contro i tuoi incantesimi.
13|Truffatore Versatile (Versatile Trickster)|Usi Mano Magica per dare vantaggio ai tuoi attacchi.
17|Ladro di Incantesimi (Spell Thief)|Rubi un incantesimo lanciato su di te.`),
  },
  Stregone: {
    "Discendenza Draconica (Draconic Bloodline)": sc(`
1|Antenato Drago (Dragon Ancestor)|Scegli un tipo di drago: determina il tipo di danno e raddoppi la competenza nelle prove di Carisma con i draghi.
1|Resilienza Draconica (Draconic Resilience)|+1 PF massimi per livello; CA 13 + Destrezza senza armatura.
6|Affinità Elementale (Elemental Affinity)|+Carisma ai danni del tipo del tuo drago; resistenza spendendo 1 punto stregoneria.
14|Ali di Drago (Dragon Wings)|Ali che ti danno velocità di volo.
18|Presenza Draconica (Draconic Presence)|Aura di soggezione o paura con 5 punti stregoneria.`),
    "Magia Selvaggia (Wild Magic)": sc(`
1|Ondata di Magia Selvaggia (Wild Magic Surge)|Dopo aver lanciato un incantesimo il DM può farti tirare sulla tabella (d20).
1|Maree del Caos (Tides of Chaos)|Vantaggio a un tiro; poi una Ondata è più probabile.
6|Piegare la Fortuna (Bend Luck)|Spendi 2 punti stregoneria: ±1d4 al tiro di una creatura.
14|Caos Controllato (Controlled Chaos)|Tiri due volte sulla tabella e scegli.
18|Bombardamento di Incantesimi (Spell Bombardment)|Un dado di danno massimo si ritira una volta.`),
  },
  Warlock: {
    "Signore Fatato (The Archfey)": sc(`
1|Presenza Fatata (Fey Presence)|Affascini o spaventi le creature in un cubo di 3 m.
6|Fuga Nebbiosa (Misty Escape)|Reazione: ti teletrasporti e diventi invisibile.
10|Difese Seducenti (Beguiling Defenses)|Immune a charme; rimandi il charme a chi ci prova.
14|Delirio Oscuro (Dark Delirium)|Immergi una creatura in un'illusione.`, undefined, "Il Signore Fatato ha una lista di incantesimi estesa (scelta): vedi il manuale."),
    "Immondo (The Fiend)": sc(`
1|Benedizione dell'Oscuro (Dark One's Blessing)|PF temporanei quando riduci una creatura ostile a 0 PF (Carisma + livello).
6|Fortuna dell'Oscuro (Dark One's Own Luck)|Aggiungi 1d10 a una prova o TS.
10|Resilienza Immonda (Fiendish Resilience)|Scegli un tipo di danno a cui resistere.
14|Scagliare all'Inferno (Hurl Through Hell)|Mandi un bersaglio all'inferno per un round.`, undefined, "L'Immondo ha una lista di incantesimi estesa (scelta): vedi il manuale."),
    "Grande Antico (The Great Old One)": sc(`
1|Risveglio della Mente (Awakened Mind)|Comunichi telepaticamente entro 9 m.
6|Barriera Entropica (Entropic Ward)|Imponi svantaggio a un attacco; se manca, ottieni vantaggio.
10|Scudo di Pensieri (Thought Shield)|Pensieri protetti e resistenza ai danni psichici.
14|Creare Servitore (Create Thrall)|Incanti una creatura umanoide.`, undefined, "Il Grande Antico ha una lista di incantesimi estesa (scelta): vedi il manuale."),
  },
  Mago: {
    "Scuola di Abiurazione (School of Abjuration)": sc(`
2|Studioso dell'Abiurazione (Abjuration Savant)|Copiare incantesimi di abiurazione costa metà.
2|Custode Arcano (Arcane Ward)|Barriera con PF pari a 2 × livello + Intelligenza che assorbe danni.
6|Abiurazione Proiettata (Projected Ward)|Proteggi un alleato con la barriera.
10|Abiurazione Migliorata (Improved Abjuration)|Bonus di competenza alle prove per dissolvere e controincantesimi.
14|Resistenza agli Incantesimi (Spell Resistance)|Vantaggio ai TS contro incantesimi, resistenza ai loro danni.`),
    "Scuola di Invocazione (School of Conjuration)": sc(`
2|Studioso dell'Invocazione (Conjuration Savant)|Copiare incantesimi di invocazione costa metà.
2|Invocazione Minore (Minor Conjuration)|Crei un oggetto inanimato.
6|Trasposizione Benigna (Benign Transposition)|Ti teletrasporti o scambi posto con un alleato.
10|Invocazione Concentrata (Focused Conjuration)|La concentrazione non si interrompe per i danni.
14|Invocazioni Durature (Durable Summons)|Le creature evocate ottengono 30 PF temporanei.`),
    "Scuola di Divinazione (School of Divination)": sc(`
2|Studioso della Divinazione (Divination Savant)|Copiare incantesimi di divinazione costa metà.
2|Portento (Portent)|Dopo un riposo lungo tiri due d20 e li usi al posto di altri tiri (tre al 14°).
6|Esperto di Divinazione (Expert Divination)|Recuperi slot quando lanci divinazioni.
10|Il Terzo Occhio (The Third Eye)|Scurovisione, vista eterea, lettura, vedere invisibile.
14|Portento Superiore (Greater Portent)|Tre dadi di Portento.`),
    "Scuola di Ammaliamento (School of Enchantment)": sc(`
2|Studioso dell'Ammaliamento (Enchantment Savant)|Copiare incantesimi di ammaliamento costa metà.
2|Sguardo Ipnotico (Hypnotic Gaze)|Affascini una creatura incapacitandola.
6|Charme Istintivo (Instinctive Charm)|Reazione: reindirizzi un attacco.
10|Dividere l'Incantesimo (Split Enchantment)|Un incantesimo di ammaliamento di 1 bersaglio colpisce un secondo.
14|Modificare i Ricordi Alterati (Alter Memories)|Fai dimenticare l'incantesimo.`),
    "Scuola di Evocazione (School of Evocation)": sc(`
2|Studioso dell'Evocazione (Evocation Savant)|Copiare incantesimi di evocazione costa metà.
2|Scolpire Incantesimi (Sculpt Spells)|Gli alleati superano automaticamente i TS e non subiscono danni dai tuoi incantesimi di evocazione.
6|Trucchetto Potente (Potent Cantrip)|Anche se superano il TS, i bersagli subiscono metà danni dai tuoi trucchetti.
10|Evocazione Potenziata (Empowered Evocation)|Aggiungi Intelligenza ai danni di un incantesimo di evocazione.
14|Sovraccarico (Overchannel)|Danni massimi per un incantesimo di 1°-5° livello (con danno a te dopo il primo uso).`),
    "Scuola di Illusione (School of Illusion)": sc(`
2|Studioso dell'Illusione (Illusion Savant)|Copiare incantesimi di illusione costa metà.
2|Illusioni Migliorate (Improved Minor Illusion)|Impari Illusione Minore e puoi creare sia suono sia immagine.
6|Illusioni Malleabili (Malleable Illusions)|Cambi la natura di un'illusione già in corso.
10|Sé Illusorio (Illusory Self)|Reazione: un attacco contro di te colpisce un duplicato.
14|Realtà Illusoria (Illusory Reality)|Un oggetto di un'illusione diventa reale per 1 minuto.`),
    "Scuola di Necromanzia (School of Necromancy)": sc(`
2|Studioso della Necromanzia (Necromancy Savant)|Copiare incantesimi di necromanzia costa metà.
2|Raccolto Funesto (Grim Harvest)|Recuperi PF quando uccidi con un incantesimo.
6|Servitori Non Morti (Undead Thralls)|Animare Morti: una creatura in più; i tuoi non morti hanno più PF e danni.
10|Immunità alla Non Morte (Inured to Undeath)|Resistenza ai danni necrotici; i tuoi PF massimi non calano.
14|Comandare i Non Morti (Command Undead)|Prendi il controllo di un non morto.`),
    "Scuola di Trasmutazione (School of Transmutation)": sc(`
2|Studioso della Trasmutazione (Transmutation Savant)|Copiare incantesimi di trasmutazione costa metà.
2|Alchimista Minore (Minor Alchemy)|Cambi temporaneamente il materiale di un oggetto.
6|Pietra del Trasmutatore (Transmuter's Stone)|Crei una pietra che concede un beneficio.
10|Mutaforma (Shapechanger)|Puoi lanciare Metamorfosi su di te senza slot.
14|Maestro Trasmutatore (Master Transmuter)|Consumi la pietra per effetti potenti (resurrezione, giovinezza…).`),
  },
};

// ───────────────────────── 2024 ─────────────────────────
export const SUBCLASSES_2024: Table = {
  Barbaro: {
    "Sentiero del Berserker (Path of the Berserker)": sc24("3:Frenzy (Frenesia); 6:Mindless Rage; 10:Retaliation; 14:Intimidating Presence"),
    "Sentiero del Cuore Selvaggio (Path of the Wild Heart)": sc24("3:Animal Speaker,Rage of the Wilds; 6:Aspect of the Wilds; 10:Nature Speaker; 14:Power of the Wilds"),
    "Sentiero dell'Albero del Mondo (Path of the World Tree)": sc24("3:Vitality of the Tree; 6:Branches of the Tree; 10:Battering Roots; 14:Travel along the Tree"),
    "Sentiero del Fanatico (Path of the Zealot)": sc24("3:Divine Fury,Warrior of the Gods; 6:Fanatical Focus; 10:Zealous Presence; 14:Rage of the Gods"),
  },
  Bardo: {
    "Collegio della Danza (College of Dance)": sc24("3:Dazzling Footwork; 6:Inspiring Movement,Tandem Footwork; 14:Leading Evasion"),
    "Collegio dell'Incanto (College of Glamour)": sc24("3:Beguiling Magic,Mantle of Inspiration; 6:Mantle of Majesty; 14:Unbreakable Majesty"),
    "Collegio della Sapienza (College of Lore)": sc24("3:Bonus Proficiencies,Cutting Words; 6:Magical Discoveries; 14:Peerless Skill"),
    "Collegio del Valore (College of Valor)": sc24("3:Combat Inspiration,Martial Training; 6:Extra Attack; 14:Battle Magic"),
  },
  Chierico: {
    "Dominio della Vita (Life Domain)": sc24("3:Disciple of Life,Preserve Life; 6:Blessed Healer; 17:Supreme Healing"),
    "Dominio della Luce (Light Domain)": sc24("3:Radiance of the Dawn,Warding Flare; 6:Improved Warding Flare; 17:Corona of Light"),
    "Dominio dell'Inganno (Trickery Domain)": sc24("3:Blessing of the Trickster,Invoke Duplicity; 6:Trickster's Transposition; 17:Improved Duplicity"),
    "Dominio della Guerra (War Domain)": sc24("3:Guided Strike,War God's Blessing; 6:War Priest; 17:Avatar of Battle"),
  },
  Druido: {
    "Circolo della Terra (Circle of the Land)": sc24("3:Land's Aid,Circle Spells; 6:Natural Recovery; 10:Nature's Ward; 14:Nature's Sanctuary"),
    "Circolo della Luna (Circle of the Moon)": sc24("3:Circle Forms,Circle of the Moon Spells; 6:Improved Circle Forms; 10:Moonlight Step; 14:Lunar Form"),
    "Circolo del Mare (Circle of the Sea)": sc24("3:Wrath of the Sea,Circle of the Sea Spells; 6:Aquatic Affinity; 10:Stormborn; 14:Oceanic Gift"),
    "Circolo delle Stelle (Circle of the Stars)": sc24("3:Star Map,Starry Form; 6:Cosmic Omen; 10:Twinkling Constellations; 14:Full of Stars"),
  },
  Guerriero: {
    "Maestro di Battaglia (Battle Master)": sc24("3:Combat Superiority,Student of War; 7:Know Your Enemy; 10:Improved Combat Superiority; 15:Relentless; 18:Ultimate Combat Superiority"),
    "Campione (Champion)": sc24("3:Improved Critical,Remarkable Athlete; 7:Additional Fighting Style; 10:Heroic Warrior; 15:Superior Critical; 18:Survivor"),
    "Cavaliere Mistico (Eldritch Knight)": sc24("3:Spellcasting,War Bond; 7:War Magic; 10:Eldritch Strike; 15:Arcane Charge; 18:Improved War Magic"),
    "Guerriero Psionico (Psi Warrior)": sc24("3:Psionic Power; 7:Telekinetic Adept; 10:Guarded Mind; 15:Bulwark of Force; 18:Telekinetic Master"),
  },
  Monaco: {
    "Guerriero della Misericordia (Warrior of Mercy)": sc24("3:Implements of Mercy,Hand of Harm,Hand of Healing; 6:Physician's Touch; 11:Flurry of Healing and Harm; 17:Hand of Ultimate Mercy"),
    "Guerriero dell'Ombra (Warrior of Shadow)": sc24("3:Shadow Arts; 6:Shadow Step; 11:Improved Shadow Step; 17:Cloak of Shadows"),
    "Guerriero degli Elementi (Warrior of the Elements)": sc24("3:Elemental Attunement,Manipulate Elements; 6:Elemental Burst; 11:Stride of the Elements; 17:Elemental Epitome"),
    "Guerriero della Mano Aperta (Warrior of the Open Hand)": sc24("3:Open Hand Technique; 6:Wholeness of Body; 11:Fleet Step; 17:Quivering Palm"),
  },
  Paladino: {
    "Giuramento della Gloria (Oath of Glory)": sc24("3:Peerless Athlete,Inspiring Smite; 7:Aura of Alacrity; 15:Glorious Defense; 20:Living Legend"),
    "Giuramento di Devozione (Oath of Devotion)": sc24("3:Sacred Weapon; 7:Aura of Devotion; 15:Smite of Protection; 20:Holy Nimbus"),
    "Giuramento degli Antichi (Oath of the Ancients)": sc24("3:Nature's Wrath; 7:Aura of Warding; 15:Undying Sentinel; 20:Elder Champion"),
    "Giuramento di Vendetta (Oath of Vengeance)": sc24("3:Vow of Enmity; 7:Relentless Avenger; 15:Soul of Vengeance; 20:Avenging Angel"),
  },
  Ranger: {
    "Signore delle Bestie (Beast Master)": sc24("3:Primal Companion; 7:Exceptional Training; 11:Bestial Fury; 15:Share Spells"),
    "Viandante Fatato (Fey Wanderer)": sc24("3:Dreadful Strikes,Otherworldly Glamour; 7:Beguiling Twist; 11:Fey Reinforcements; 15:Misty Wanderer"),
    "Cacciatore delle Tenebre (Gloom Stalker)": sc24("3:Dread Ambusher,Umbral Sight; 7:Iron Mind; 11:Stalker's Flurry; 15:Shadowy Dodge"),
    "Cacciatore (Hunter)": sc24("3:Hunter's Lore,Hunter's Prey; 7:Defensive Tactics; 11:Superior Hunter's Prey; 15:Superior Hunter's Defense"),
  },
  Ladro: {
    "Furfante Arcano (Arcane Trickster)": sc24("3:Spellcasting,Mage Hand Legerdemain; 9:Magical Ambush; 13:Versatile Trickster; 17:Spell Thief"),
    "Assassino (Assassin)": sc24("3:Assassinate,Assassin's Tools; 9:Infiltration Expertise; 13:Envenom Weapons; 17:Death Strike"),
    "Lama dell'Anima (Soulknife)": sc24("3:Psionic Power,Psychic Blades; 9:Soul Blades; 13:Psychic Veil; 17:Rend Mind"),
    "Ladro (Thief)": sc24("3:Fast Hands,Second-Story Work; 9:Supreme Sneak; 13:Use Magic Device; 17:Thief's Reflexes"),
  },
  Stregone: {
    "Stregoneria Aberrante (Aberrant Sorcery)": sc24("3:Telepathic Speech,Psionic Spells; 6:Psionic Sorcery,Psychic Defenses; 14:Revelation in Flesh; 18:Warping Implosion"),
    "Stregoneria Meccanica (Clockwork Sorcery)": sc24("3:Restore Balance,Clockwork Spells; 6:Bastion of Law; 14:Trance of Order; 18:Clockwork Cavalcade"),
    "Stregoneria Draconica (Draconic Sorcery)": sc24("3:Draconic Resilience,Draconic Spells; 6:Elemental Affinity; 14:Dragon Wings; 18:Dragon Companion"),
    "Magia Selvaggia (Wild Magic Sorcery)": sc24("3:Wild Magic Surge,Tides of Chaos; 6:Bend Luck; 14:Controlled Chaos; 18:Tamed Surge"),
  },
  Warlock: {
    "Patrono Signore Fatato (Archfey Patron)": sc24("3:Steps of the Fey,Archfey Spells; 6:Misty Escape; 10:Beguiling Defenses; 14:Bewitching Magic"),
    "Patrono Celestiale (Celestial Patron)": sc24("3:Healing Light,Celestial Spells; 6:Radiant Soul; 10:Celestial Resilience; 14:Searing Vengeance"),
    "Patrono Immondo (Fiend Patron)": sc24("3:Dark One's Blessing,Fiend Spells; 6:Dark One's Own Luck; 10:Fiendish Resilience; 14:Hurl Through Hell"),
    "Patrono Grande Antico (Great Old One Patron)": sc24("3:Psychic Spells,Awakened Mind; 6:Clairvoyant Combatant; 10:Eldritch Hex,Thought Shield; 14:Create Thrall"),
  },
  Mago: {
    "Abiuratore (Abjurer)": sc24("3:Abjuration Savant,Arcane Ward; 6:Projected Ward; 10:Spell Breaker; 14:Spell Resistance"),
    "Divinatore (Diviner)": sc24("3:Divination Savant,Portent; 6:Expert Divination; 10:The Third Eye; 14:Greater Portent"),
    "Evocatore (Evoker)": sc24("3:Evocation Savant,Potent Cantrip; 6:Sculpt Spells; 10:Empowered Evocation; 14:Overchannel"),
    "Illusionista (Illusionist)": sc24("3:Illusion Savant,Improved Illusions; 6:Phantasmal Creatures; 10:Illusory Self; 14:Illusory Reality"),
  },
};

const norm = (t: string) => t.trim().toLowerCase();

/** Nomi delle sottoclassi disponibili per una classe */
export function subclassOptions(className: string, ruleset: string): string[] {
  const t = ruleset === "5e2024" ? SUBCLASSES_2024 : SUBCLASSES_2014;
  const key = Object.keys(t).find((k) => norm(k) === norm(className));
  return key ? Object.keys(t[key]) : [];
}

/** Cerca la sottoclasse scritta dall'utente (nome italiano o inglese, anche parziale) */
export function findSubclass(className: string, text: string, ruleset: string): SubclassInfo | undefined {
  const t = ruleset === "5e2024" ? SUBCLASSES_2024 : SUBCLASSES_2014;
  const ck = Object.keys(t).find((k) => norm(k) === norm(className));
  if (!ck || !text.trim()) return undefined;
  const q = norm(text);
  const entries = Object.entries(t[ck]);
  const parts = (k: string) => {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(k);
    return m ? [norm(k), norm(m[1]), norm(m[2])] : [norm(k)];
  };
  const exact = entries.find(([k]) => parts(k).includes(q));
  if (exact) return exact[1];
  return entries.find(([k]) => q.length >= 4 && parts(k).some((p) => p.includes(q) || q.includes(p)))?.[1];
}
