import { textTemplate } from "./build";
import type { TextTemplate } from "./types";

/** Frågemallar för svenska, version 1. Allt facit är handskrivet i listorna nedan och kontrolleras av testerna. */

// ── Stavning med dubbelteckning: [rätt, fel, fel] ───────────────
const DUBBEL: [string, string, string][] = [
  ["katt", "kat", "kaat"], ["hatt", "hat", "haat"], ["mamma", "mama", "mmama"], ["pappa", "papa", "ppapa"],
  ["bubbla", "bubla", "buubla"], ["sommar", "somar", "soomar"], ["tummen", "tumen", "tuumen"], ["kanna", "kana", "kaanna"],
  ["tappa", "tapa", "taapa"], ["gammal", "gamal", "gaammal"], ["kudde", "kude", "kuude"], ["mellan", "melan", "mellaan"],
  ["nummer", "numer", "nuumer"], ["åtta", "åta", "ååta"], ["mössa", "mösa", "möösa"], ["klättra", "klätra", "kläättra"],
  ["snabbt", "snabt", "snaabt"], ["stannar", "stanar", "staannar"], ["ballong", "balong", "baallong"],
  ["dammsuga", "damsuga", "dammsuuga"], ["tillsammans", "tilsammans", "tillsamans"],
];

const dubbel = textTemplate({
  skillId: "sv.stav.dubbel", lang: "sv",
  items: DUBBEL.map(([right, w1, w2]) => ({
    prompt: "Vilket ord är rätt stavat?", answer: right, wrong: [w1, w2],
    hint1: "Hör du en kort vokal? Då kommer ofta två likadana konsonanter efter den.",
    hint2: "Läs alla orden långsamt. Vilket ser ut som ett ord du har sett i en bok?",
  })),
});

// ── sj-, tj- och andra svåra ljud: [rätt, fel, fel] ─────────────
const LJUD: [string, string, string][] = [
  ["sjö", "sö", "schö"], ["sked", "sjed", "stjed"], ["kjol", "tjol", "skjol"], ["tjock", "kjock", "stjock"],
  ["djur", "jur", "gjur"], ["skjorta", "sjorta", "stjorta"], ["stjärna", "sjärna", "skjärna"], ["kyrka", "tjyrka", "kjyrka"],
  ["tjuv", "kjuv", "stjuv"], ["choklad", "sjoklad", "tjoklad"], ["skinn", "sjinn", "stjinn"], ["göra", "jöra", "djöra"],
  ["hjärta", "järta", "hjerta"], ["gjorde", "jorde", "djorde"],
];

const ljud = textTemplate({
  skillId: "sv.stav.ljud", lang: "sv",
  items: LJUD.map(([right, w1, w2]) => ({
    prompt: "Vilket ord är rätt stavat?", answer: right, wrong: [w1, w2],
    hint1: "Samma ljud kan skrivas på flera sätt. Vilken stavning har du sett förut?",
    hint2: "Ta bort det alternativ som ser mest konstigt ut. Två är kvar.",
  })),
});

// ── Punkt eller frågetecken ─────────────────────────────────────
const SLUT: [string, "." | "?"][] = [
  ["Var bor du", "?"], ["Jag heter Alva", "."], ["Vad gör du", "?"], ["Det regnar idag", "."],
  ["Har du en katt", "?"], ["Min bror är sju år", "."], ["Vem har tagit min penna", "?"],
  ["Vi åker till stranden på lördag", "."], ["Hur mycket är klockan", "?"], ["Hunden sover i korgen", "."],
  ["När kommer bussen", "?"], ["Hon målar en stor bild", "."],
];

const slut = textTemplate({
  skillId: "sv.skrivtecken.slut", lang: "sv",
  items: SLUT.map(([sentence, mark]) => ({
    prompt: "Vilket tecken ska stå sist?", sub: `«${sentence}»`, answer: mark,
    wrong: [".", "?", "!", ","].filter((m) => m !== mark),
    hint1: "Fråga du något eller berättar du något?",
    hint2: "Frågeord som vad, var, vem, när och hur brukar stå först i en fråga. Ibland börjar frågan med ett verb, som «Har du…».",
    solution: mark === "?" ? "Det är en fråga, så den slutar med ett frågetecken." : "Det är ett påstående, så det slutar med en punkt.",
  })),
});

// ── Stor bokstav: [rätt mening, fel, fel] ───────────────────────
const STOR: [string, string, string][] = [
  ["Ronja bor i Uppsala.", "ronja bor i Uppsala.", "Ronja bor i uppsala."],
  ["Min hund heter Bamse.", "Min hund heter bamse.", "min hund heter Bamse."],
  ["Idag är det fredag.", "idag är det fredag.", "Idag är det Fredag."],
  ["På måndag har vi gympa.", "på måndag har vi gympa.", "På Måndag har vi gympa."],
  ["Anton och Sara leker ute.", "Anton och sara leker ute.", "anton och Sara leker ute."],
  ["Hon kommer från Sverige.", "Hon kommer från sverige.", "Hon Kommer från Sverige."],
  ["Vi åker till Stockholm i juli.", "Vi åker till stockholm i juli.", "Vi åker till Stockholm i Juli."],
  ["Skolan ligger vid Storgatan.", "Skolan ligger vid storgatan.", "skolan ligger vid Storgatan."],
  ["I augusti fyller Elsa åtta år.", "I Augusti fyller Elsa åtta år.", "I augusti fyller elsa åtta år."],
];

const stor = textTemplate({
  skillId: "sv.skrivtecken.storbokstav", lang: "sv",
  items: STOR.map(([right, w1, w2]) => ({
    prompt: "Vilken mening är rätt skriven?", answer: right, wrong: [w1, w2],
    hint1: "Stor bokstav ska det vara i början av en mening och på namn på personer, djur och platser.",
    hint2: "Veckodagar och månader skrivs med liten bokstav i svenskan.",
  })),
});

// ── Sammansatta ord: [del 1, del 2, ord] ────────────────────────
const SAMMANSATTA: [string, string, string][] = [
  ["sol", "ros", "solros"], ["snö", "boll", "snöboll"], ["fot", "boll", "fotboll"], ["hand", "sko", "handsko"],
  ["regn", "båge", "regnbåge"], ["bok", "hylla", "bokhylla"], ["hus", "djur", "husdjur"], ["jul", "gran", "julgran"],
  ["tand", "borste", "tandborste"], ["cykel", "hjälm", "cykelhjälm"], ["bad", "rum", "badrum"], ["sov", "rum", "sovrum"],
  ["mjölk", "paket", "mjölkpaket"], ["tvätt", "maskin", "tvättmaskin"], ["födelse", "dag", "födelsedag"],
];

const sammansatta = textTemplate({
  skillId: "sv.ord.sammansatta", lang: "sv",
  items: SAMMANSATTA.map(([a, b, whole]) => {
    const wrong = [b + a, a + "s" + b, a.slice(0, -1) + b].filter((w) => w !== whole);
    // Fyller på med en dubbling om något alternativ föll bort.
    while (new Set(wrong).size < 3) wrong.push(a + a.slice(-1) + b + wrong.length);
    return {
      prompt: `Vilket ord får du om du sätter ihop «${a}» och «${b}»?`, answer: whole, wrong,
      hint1: "Det första ordet står först och det andra sist. Ibland får man ta med en bokstav emellan.",
      hint2: "Läs alternativen högt. Vilket låter som ett riktigt ord?",
      solution: `«${a}» + «${b}» = «${whole}».`,
    };
  }),
});

// ── Motsatser: [ord, motsats] ───────────────────────────────────
const MOTSATSER: [string, string][] = [
  ["stor", "liten"], ["varm", "kall"], ["glad", "ledsen"], ["snabb", "långsam"], ["ung", "gammal"], ["hård", "mjuk"],
  ["tung", "lätt"], ["ren", "smutsig"], ["tjock", "tunn"], ["hög", "låg"], ["lång", "kort"], ["rik", "fattig"],
  ["full", "tom"], ["öppen", "stängd"], ["svag", "stark"],
];

const motsatser = textTemplate({
  skillId: "sv.ord.motsatser", lang: "sv",
  items: MOTSATSER.flatMap(([a, b]) => [[a, b], [b, a]] as const).map(([word, opp]) => {
    const pool = [...new Set(MOTSATSER.flat())].filter((w) => w !== word && w !== opp);
    return {
      prompt: `Vad är motsatsen till «${word}»?`, answer: opp, wrong: pool,
      hint1: "Motsatsen betyder tvärtom. Tänk dig något som är precis tvärtom.",
      hint2: `Motsatsen börjar på bokstaven «${opp[0]}».`,
    };
  }),
});

// ── Synonymer: [ord, synonym, tre ord som inte passar] ──────────
const SYNONYMER: [string, string, string[]][] = [
  ["glad", "lycklig", ["ledsen", "trött", "hungrig"]], ["vacker", "fin", ["ful", "smutsig", "tyst"]],
  ["prata", "tala", ["springa", "äta", "sova"]], ["tänka", "fundera", ["äta", "springa", "sjunga"]],
  ["hus", "bostad", ["bil", "träd", "boll"]], ["börja", "starta", ["sluta", "stanna", "vila"]],
  ["gåva", "present", ["tårta", "ljus", "hatt"]], ["arg", "ilsken", ["snäll", "glad", "ledsen"]],
  ["trött", "sömnig", ["pigg", "stark", "glad"]], ["modig", "djärv", ["feg", "rädd", "ledsen"]],
  ["stor", "enorm", ["liten", "tung", "kall"]], ["rädd", "skrämd", ["modig", "trött", "stark"]],
];

const synonymer = textTemplate({
  skillId: "sv.ord.synonymer", lang: "sv",
  items: SYNONYMER.map(([word, syn, wrong]) => ({
    prompt: `Vilket ord betyder nästan samma sak som «${word}»?`, answer: syn, wrong,
    hint1: "Ordet ska kunna stå i stället för det andra utan att meningen ändrar sig.",
    hint2: `Det rätta ordet har ${syn.length} bokstäver.`,
  })),
});

// ── Plural: [singular, plural, fel, fel] ────────────────────────
const PLURAL: [string, string, string, string][] = [
  ["bil", "bilar", "bilor", "biler"], ["hund", "hundar", "hundor", "hunder"], ["flicka", "flickor", "flickar", "flickan"],
  ["pojke", "pojkar", "pojkor", "pojkes"], ["katt", "katter", "kattar", "kattor"], ["lampa", "lampor", "lampar", "lampan"],
  ["stol", "stolar", "stolor", "stoler"], ["apa", "apor", "apar", "apon"], ["fisk", "fiskar", "fiskor", "fisker"],
  ["bild", "bilder", "bildar", "bildor"], ["barn", "barn", "barna", "barnar"], ["äpple", "äpplen", "äpplar", "äpplor"],
  ["bok", "böcker", "boks", "bokar"], ["hand", "händer", "handar", "hander"], ["stad", "städer", "stadar", "stader"],
  ["ko", "kor", "kos", "koar"], ["man", "män", "manar", "mannar"], ["fot", "fötter", "fotar", "fötten"],
  ["tand", "tänder", "tandar", "tändar"], ["bonde", "bönder", "bondar", "bonder"],
];

const plural = textTemplate({
  skillId: "sv.gram.plural", lang: "sv",
  items: PLURAL.map(([sing, plur, w1, w2]) => ({
    prompt: `Hur skriver du flera «${sing}»?`, answer: plur, wrong: [w1, w2],
    hint1: "Svenskan har flera olika pluraländelser, till exempel -ar, -or, -er och ingen ändelse alls.",
    hint2: "Säg «två …» högt och lyssna efter vilket alternativ som låter rätt.",
  })),
});

// ── Ordklasser ──────────────────────────────────────────────────
type Cls = "substantiv" | "verb" | "adjektiv";
const ORDKLASS: [Cls, string, string, [string, string]][] = [
  ["substantiv", "Hunden springer fort.", "Hunden", ["springer", "fort"]],
  ["substantiv", "Bilen är röd.", "Bilen", ["är", "röd"]],
  ["substantiv", "Flickan läser snabbt.", "Flickan", ["läser", "snabbt"]],
  ["substantiv", "Solen skiner starkt.", "Solen", ["skiner", "starkt"]],
  ["substantiv", "Barnen leker glatt.", "Barnen", ["leker", "glatt"]],
  ["verb", "Pojken skrattar högt.", "skrattar", ["Pojken", "högt"]],
  ["verb", "Fågeln flyger över sjön.", "flyger", ["Fågeln", "sjön"]],
  ["verb", "Vi äter middag nu.", "äter", ["Vi", "nu"]],
  ["verb", "Mamma bakar en kaka.", "bakar", ["Mamma", "kaka"]],
  ["verb", "Hästen galopperar snabbt.", "galopperar", ["Hästen", "snabbt"]],
  ["verb", "Eleverna skriver ett prov.", "skriver", ["Eleverna", "prov"]],
  ["adjektiv", "Den stora hunden skäller.", "stora", ["hunden", "skäller"]],
  ["adjektiv", "Himlen är blå.", "blå", ["Himlen", "är"]],
  ["adjektiv", "Vi har en rolig lärare.", "rolig", ["lärare", "har"]],
  ["adjektiv", "Hon bär en röd jacka.", "röd", ["jacka", "bär"]],
  ["adjektiv", "Det kalla vattnet rinner.", "kalla", ["vattnet", "rinner"]],
  ["adjektiv", "Maten var god.", "god", ["Maten", "var"]],
];
const CLS_NAME: Record<Cls, string> = { substantiv: "ett substantiv", verb: "ett verb", adjektiv: "ett adjektiv" };
const CLS_HINT: Record<Cls, [string, string]> = {
  substantiv: ["Ett substantiv är ett namn på en sak, ett djur, en människa eller en plats.", "Du kan sätta «en» eller «ett» framför ett substantiv."],
  verb: ["Ett verb säger vad någon gör eller vad som händer.", "Du kan sätta «att» framför ett verb: att springa, att äta."],
  adjektiv: ["Ett adjektiv säger hur något eller någon är, till exempel stor, snabb eller glad.", "Du kan sätta «mycket» framför ett adjektiv."],
};

const ordklass = textTemplate({
  skillId: "sv.gram.ordklass", lang: "sv",
  items: ORDKLASS.map(([cls, sentence, answer, wrong]) => ({
    prompt: `Vilket ord är ${CLS_NAME[cls]}?`, sub: `«${sentence}»`, answer, wrong,
    hint1: CLS_HINT[cls][0], hint2: CLS_HINT[cls][1],
  })),
});

// ── Verb i dåtid: [grundform, dåtid, presens, supinum] ──────────
const TEMPUS: [string, string, string, string][] = [
  ["hoppa", "hoppade", "hoppar", "hoppat"], ["titta", "tittade", "tittar", "tittat"], ["dansa", "dansade", "dansar", "dansat"],
  ["baka", "bakade", "bakar", "bakat"], ["skratta", "skrattade", "skrattar", "skrattat"], ["bo", "bodde", "bor", "bott"],
  ["äta", "åt", "äter", "ätit"], ["sova", "sov", "sover", "sovit"], ["gå", "gick", "går", "gått"], ["ta", "tog", "tar", "tagit"],
  ["ge", "gav", "ger", "gett"], ["se", "såg", "ser", "sett"], ["komma", "kom", "kommer", "kommit"], ["läsa", "läste", "läser", "läst"],
  ["köra", "körde", "kör", "kört"], ["skriva", "skrev", "skriver", "skrivit"], ["springa", "sprang", "springer", "sprungit"],
  ["dricka", "drack", "dricker", "druckit"], ["ha", "hade", "har", "haft"], ["vara", "var", "är", "varit"],
];

const tempus = textTemplate({
  skillId: "sv.gram.tempus", lang: "sv",
  items: TEMPUS.map(([inf, pret, pres, sup]) => ({
    prompt: "Igår ___ jag.", sub: `(verbet «${inf}»)`, answer: pret, wrong: [pres, sup],
    hint1: "Det står «igår», så det har redan hänt. Verbet ska stå i dåtid.",
    hint2: "Nutid säger vad som händer nu. Dåtid säger vad som hände förut.",
    solution: `Igår ${pret} jag. («${inf}» i dåtid heter «${pret}».)`,
  })),
});

export const swedishTemplates: TextTemplate[] = [
  dubbel, ljud, slut, stor, sammansatta, motsatser, synonymer, plural, tempus, ordklass,
];
