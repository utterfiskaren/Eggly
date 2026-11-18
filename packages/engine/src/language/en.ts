import { textTemplate } from "./build";
import type { TextItem, TextTemplate } from "./types";

/** Frågemallar för engelska, version 1. Handskrivna ordlistor och grammatikuppgifter; testerna kontrollerar facit. */

type Pair = readonly [sv: string, en: string];

/** Ordförråd åt båda hållen. Fel alternativ hämtas från samma lista, så de hör till samma tema. */
function vocab(theme: string, pairs: readonly Pair[]): Omit<TextItem, "key">[] {
  const svWords = pairs.map((p) => p[0]);
  const enWords = pairs.map((p) => p[1]);
  return pairs.flatMap(([sv, en]) => [
    {
      prompt: `Vad heter «${sv}» på engelska?`, answer: en, wrong: enWords.filter((w) => w !== en),
      hint1: `Ordet hör till temat ${theme}.`,
      hint2: `Det engelska ordet börjar på «${en[0]}» och har ${en.length} bokstäver.`,
    },
    {
      prompt: `Vad betyder «${en}» på svenska?`, answer: sv, wrong: svWords.filter((w) => w !== sv),
      hint1: `Ordet hör till temat ${theme}.`,
      hint2: `Det svenska ordet börjar på «${sv[0]}».`,
    },
  ]);
}

const FARGER: Pair[] = [
  ["röd", "red"], ["blå", "blue"], ["gul", "yellow"], ["grön", "green"], ["svart", "black"], ["vit", "white"],
  ["rosa", "pink"], ["lila", "purple"], ["brun", "brown"], ["grå", "grey"], ["guld", "gold"],
];
const SIFFROR: Pair[] = [
  ["ett", "one"], ["två", "two"], ["tre", "three"], ["fyra", "four"], ["fem", "five"], ["sex", "six"], ["sju", "seven"],
  ["åtta", "eight"], ["nio", "nine"], ["tio", "ten"], ["elva", "eleven"], ["tolv", "twelve"], ["tretton", "thirteen"],
  ["fjorton", "fourteen"], ["femton", "fifteen"], ["sexton", "sixteen"], ["sjutton", "seventeen"], ["arton", "eighteen"],
  ["nitton", "nineteen"], ["tjugo", "twenty"], ["trettio", "thirty"], ["fyrtio", "forty"], ["femtio", "fifty"], ["hundra", "hundred"],
];
const DJUR: Pair[] = [
  ["katt", "cat"], ["hund", "dog"], ["fisk", "fish"], ["fågel", "bird"], ["häst", "horse"], ["ko", "cow"], ["gris", "pig"],
  ["får", "sheep"], ["anka", "duck"], ["mus", "mouse"], ["groda", "frog"], ["kanin", "rabbit"], ["lejon", "lion"],
  ["apa", "monkey"], ["björn", "bear"], ["räv", "fox"], ["varg", "wolf"], ["orm", "snake"], ["spindel", "spider"],
  ["fjäril", "butterfly"], ["haj", "shark"], ["igelkott", "hedgehog"], ["ekorre", "squirrel"],
];
const FAMILJ: Pair[] = [
  ["mamma", "mum"], ["pappa", "dad"], ["syster", "sister"], ["bror", "brother"], ["bebis", "baby"], ["barn", "child"],
  ["familj", "family"], ["vän", "friend"], ["dotter", "daughter"], ["föräldrar", "parents"], ["kusin", "cousin"],
  ["mormor/farmor", "grandmother"], ["morfar/farfar", "grandfather"], ["moster/faster", "aunt"], ["morbror/farbror", "uncle"],
];
const KROPP: Pair[] = [
  ["huvud", "head"], ["fot", "foot"], ["öga", "eye"], ["öra", "ear"], ["näsa", "nose"], ["mun", "mouth"], ["tand", "tooth"],
  ["hår", "hair"], ["ben", "leg"], ["mage", "stomach"], ["rygg", "back"], ["hals", "neck"], ["knä", "knee"], ["tå", "toe"],
  ["axel", "shoulder"], ["tunga", "tongue"], ["hjärta", "heart"], ["ansikte", "face"], ["armbåge", "elbow"],
];
const MAT: Pair[] = [
  ["bröd", "bread"], ["mjölk", "milk"], ["ost", "cheese"], ["äpple", "apple"], ["banan", "banana"], ["vatten", "water"],
  ["ägg", "egg"], ["korv", "sausage"], ["glass", "ice cream"], ["kaka", "cake"], ["potatis", "potato"], ["morot", "carrot"],
  ["tomat", "tomato"], ["smör", "butter"], ["socker", "sugar"], ["apelsin", "orange"], ["jordgubbe", "strawberry"],
  ["päron", "pear"], ["kyckling", "chicken"], ["ris", "rice"], ["soppa", "soup"], ["frukost", "breakfast"], ["middag", "dinner"],
];
const KLADER: Pair[] = [
  ["byxor", "trousers"], ["tröja", "sweater"], ["skor", "shoes"], ["strumpor", "socks"], ["hatt", "hat"], ["keps", "cap"],
  ["jacka", "jacket"], ["kjol", "skirt"], ["klänning", "dress"], ["skjorta", "shirt"], ["handskar", "gloves"],
  ["halsduk", "scarf"], ["stövlar", "boots"], ["kappa", "coat"], ["bälte", "belt"], ["vantar", "mittens"],
];
const SKOLA: Pair[] = [
  ["skola", "school"], ["lärare", "teacher"], ["bok", "book"], ["penna", "pencil"], ["klass", "class"], ["stol", "chair"],
  ["skrivbord", "desk"], ["tavla", "board"], ["väska", "bag"], ["linjal", "ruler"], ["rast", "break"], ["läxa", "homework"],
  ["elev", "pupil"], ["klassrum", "classroom"], ["papper", "paper"], ["sax", "scissors"], ["lim", "glue"], ["fråga", "question"],
  ["svar", "answer"],
];
const NATUR: Pair[] = [
  ["sol", "sun"], ["regn", "rain"], ["snö", "snow"], ["vind", "wind"], ["moln", "cloud"], ["träd", "tree"], ["blomma", "flower"],
  ["gräs", "grass"], ["berg", "mountain"], ["sjö", "lake"], ["hav", "sea"], ["skog", "forest"], ["flod", "river"], ["strand", "beach"],
  ["himmel", "sky"], ["måne", "moon"], ["stjärna", "star"], ["åska", "thunder"], ["blixt", "lightning"], ["dimma", "fog"],
  ["is", "ice"], ["ö", "island"], ["äng", "meadow"],
];
const DAGAR: Pair[] = [
  ["måndag", "Monday"], ["tisdag", "Tuesday"], ["onsdag", "Wednesday"], ["torsdag", "Thursday"], ["fredag", "Friday"],
  ["lördag", "Saturday"], ["söndag", "Sunday"],
];
const MANADER: Pair[] = [
  ["januari", "January"], ["februari", "February"], ["mars", "March"], ["maj", "May"], ["juni", "June"], ["juli", "July"],
  ["augusti", "August"], ["oktober", "October"],
];
const VERB: Pair[] = [
  ["gå", "walk"], ["springa", "run"], ["äta", "eat"], ["dricka", "drink"], ["sova", "sleep"], ["läsa", "read"], ["skriva", "write"],
  ["leka", "play"], ["simma", "swim"], ["hoppa", "jump"], ["sjunga", "sing"], ["dansa", "dance"], ["rita", "draw"],
  ["titta", "look"], ["lyssna", "listen"], ["hjälpa", "help"], ["öppna", "open"], ["stänga", "close"], ["köpa", "buy"],
  ["ge", "give"], ["ta", "take"], ["komma", "come"], ["höra", "hear"], ["tvätta", "wash"],
];
const ADJEKTIV: Pair[] = [
  ["stor", "big"], ["liten", "small"], ["snabb", "fast"], ["långsam", "slow"], ["glad", "happy"], ["ledsen", "sad"],
  ["gammal", "old"], ["ung", "young"], ["kall", "cold"], ["varm", "warm"], ["snäll", "kind"], ["arg", "angry"], ["trött", "tired"],
  ["hungrig", "hungry"], ["rolig", "fun"], ["tråkig", "boring"], ["svår", "difficult"], ["lätt", "easy"], ["stark", "strong"],
  ["svag", "weak"], ["vacker", "beautiful"], ["ful", "ugly"], ["ren", "clean"], ["smutsig", "dirty"],
];

const themed = (skillId: string, theme: string, pairs: readonly Pair[]) => textTemplate({ skillId, lang: "en", items: vocab(theme, pairs) });

// Dagar och månader har var sin lista med alternativ. Dagarna kommer först, månaderna sist.
const tid = textTemplate({ skillId: "en.ord.tid", lang: "en", items: [...vocab("veckodagar", DAGAR), ...vocab("månader", MANADER)] });

// ── Motsatser på engelska: [ord, motsats] ───────────────────────
const OPP: Pair[] = [
  ["big", "small"], ["hot", "cold"], ["fast", "slow"], ["happy", "sad"], ["old", "young"], ["easy", "difficult"],
  ["strong", "weak"], ["clean", "dirty"], ["beautiful", "ugly"], ["quiet", "loud"], ["full", "empty"], ["up", "down"],
  ["open", "closed"], ["light", "dark"], ["long", "short"], ["high", "low"], ["thick", "thin"], ["rich", "poor"],
  ["early", "late"], ["wet", "dry"], ["good", "bad"], ["day", "night"],
];
const SV_OF: Record<string, string> = {
  big: "stor", small: "liten", hot: "het", cold: "kall", fast: "snabb", slow: "långsam", happy: "glad", sad: "ledsen", old: "gammal",
  young: "ung", easy: "lätt", difficult: "svår", strong: "stark", weak: "svag", clean: "ren", dirty: "smutsig", beautiful: "vacker",
  ugly: "ful", quiet: "tyst", loud: "högljudd", full: "full", empty: "tom", up: "upp", down: "ner", open: "öppen", closed: "stängd",
  light: "ljus", dark: "mörk", long: "lång", short: "kort", high: "hög", low: "låg", thick: "tjock", thin: "tunn", rich: "rik",
  poor: "fattig", early: "tidig", late: "sen", wet: "blöt", dry: "torr", good: "bra", bad: "dålig", day: "dag", night: "natt",
};
const motsatser = textTemplate({
  skillId: "en.ord.motsatser", lang: "en",
  items: OPP.flatMap(([a, b]) => [[a, b], [b, a]] as const).map(([word, opp]) => {
    // Alternativ av samma slag: ord som inte är motsatsen och inte ordet självt.
    const pool = [...new Set(OPP.flat())].filter((w) => w !== word && w !== opp);
    return {
      prompt: `What is the opposite of «${word}»?`, sub: `(Vad är motsatsen till «${SV_OF[word]}»?)`, answer: opp, wrong: pool,
      hint1: "Motsatsen betyder tvärtom. Tänk på det svenska ordet.",
      hint2: SV_OF[opp] === opp ? "Det svenska ordet är nästan likadant." : `På svenska heter det «${SV_OF[opp]}».`,
    };
  }),
});

// ── A eller an: [ord, a/an] ─────────────────────────────────────
const AAN: [string, "a" | "an", string][] = [
  ["apple", "an", "äpple"], ["dog", "a", "hund"], ["egg", "an", "ägg"], ["cat", "a", "katt"], ["orange", "an", "apelsin"],
  ["banana", "a", "banan"], ["umbrella", "an", "paraply"], ["book", "a", "bok"], ["elephant", "an", "elefant"],
  ["school", "a", "skola"], ["ice cream", "an", "glass"], ["pizza", "a", "pizza"], ["owl", "an", "uggla"], ["car", "a", "bil"],
  ["eye", "an", "öga"], ["hat", "a", "hatt"], ["uncle", "an", "farbror"], ["hour", "an", "timme"], ["unicorn", "a", "enhörning"],
  ["university", "a", "universitet"],
];
const aan = textTemplate({
  skillId: "en.gram.aan", lang: "en",
  items: AAN.map(([word, ans, sv]) => ({
    prompt: `I have ___ ${word}.`, sub: `(Jag har ett ${sv}.)`, answer: ans, wrong: [ans === "a" ? "an" : "a"],
    hint1: "Titta på det första ljudet i ordet efter luckan. Är det en vokal eller en konsonant?",
    hint2: "Det är ljudet som räknas, inte bokstaven. Säg ordet högt.",
    solution: `Rätt svar är «${ans}». Ordet «${word}» börjar med ett ${ans === "an" ? "vokalljud" : "konsonantljud"}.`,
  })),
});

// ── Pronomen: [mening med lucka, svar, översättning, fel...] ────
const PRON: [string, string, string, string[]][] = [
  ["___ am eight years old.", "I", "Jag är åtta år.", ["You", "He", "They"]],
  ["___ is my sister.", "She", "Hon är min syster.", ["He", "It", "We"]],
  ["___ is my brother.", "He", "Han är min bror.", ["She", "It", "They"]],
  ["___ is a dog.", "It", "Den är en hund.", ["He", "We", "They"]],
  ["___ are my friends.", "They", "De är mina vänner.", ["We", "I", "He"]],
  ["___ are in the same class.", "We", "Vi går i samma klass.", ["They", "She", "It"]],
  ["___ is my mum.", "She", "Hon är min mamma.", ["He", "I", "We"]],
  ["___ is my dad.", "He", "Han är min pappa.", ["She", "I", "They"]],
  ["___ are my parents.", "They", "De är mina föräldrar.", ["I", "She", "We"]],
  ["___ is a book.", "It", "Det är en bok.", ["She", "He", "We"]],
];
const pronomen = textTemplate({
  skillId: "en.gram.pronomen", lang: "en",
  items: PRON.map(([prompt, answer, sv, wrong]) => ({
    prompt, sub: `(${sv})`, answer, wrong,
    hint1: "Läs den svenska meningen. Vem eller vad handlar den om?",
    hint2: "Börja med vilket svenskt ord som står där luckan är i den svenska meningen.",
  })),
});

// ── To be: [mening, svar] ───────────────────────────────────────
const TOBE: [string, "am" | "is" | "are"][] = [
  ["I ___ happy.", "am"], ["She ___ tired.", "is"], ["We ___ friends.", "are"], ["The cat ___ black.", "is"],
  ["They ___ at school.", "are"], ["You ___ my friend.", "are"], ["It ___ a dog.", "is"], ["My brothers ___ funny.", "are"],
  ["He ___ my teacher.", "is"], ["I ___ not hungry.", "am"], ["My mum and dad ___ at home.", "are"],
  ["The children ___ in the garden.", "are"],
];
const tobe = textTemplate({
  skillId: "en.gram.tobe", lang: "en",
  items: TOBE.map(([prompt, answer]) => ({
    prompt, answer, wrong: (["am", "is", "are"] as const).filter((w) => w !== answer),
    hint1: "Vem eller vilka handlar meningen om? En person eller flera?",
    hint2: "Ett ord som hör till jag, ett till han, hon och den, och ett till vi, ni och de.",
  })),
});

// ── To have: [mening, svar] ─────────────────────────────────────
const HAVE: [string, "have" | "has"][] = [
  ["I ___ a dog.", "have"], ["She ___ a red bike.", "has"], ["They ___ two cats.", "have"], ["He ___ blue eyes.", "has"],
  ["We ___ a big garden.", "have"], ["My sister ___ a pen.", "has"], ["You ___ a nice hat.", "have"], ["The dog ___ a ball.", "has"],
  ["My friends ___ new shoes.", "have"], ["It ___ four legs.", "has"],
];
const have = textTemplate({
  skillId: "en.gram.have", lang: "en",
  items: HAVE.map(([prompt, answer]) => ({
    prompt, answer, wrong: [answer === "have" ? "has" : "have", "having", "haves"],
    hint1: "Vem eller vad handlar meningen om? Är det en enda (han, hon, den) eller flera?",
    hint2: "Efter he, she och it används ett särskilt ord. Efter I, you, we och they används det andra.",
  })),
});

// ── Plural: [singular, plural, fel, fel] ────────────────────────
const PLURAL: [string, string, string, string][] = [
  ["cat", "cats", "cates", "catss"], ["dog", "dogs", "doges", "dogss"], ["house", "houses", "housees", "housse"],
  ["box", "boxes", "boxs", "boxies"], ["bus", "buses", "buss", "busies"], ["baby", "babies", "babys", "babyes"],
  ["dress", "dresses", "dresss", "dressies"], ["party", "parties", "partys", "partyes"], ["child", "children", "childs", "childes"],
  ["man", "men", "mans", "manes"], ["woman", "women", "womans", "womanes"], ["foot", "feet", "foots", "feets"],
  ["tooth", "teeth", "tooths", "teeths"], ["mouse", "mice", "mouses", "mices"], ["sheep", "sheep", "sheeps", "sheepes"],
  ["watch", "watches", "watchs", "watchies"], ["potato", "potatoes", "potatos", "potatoss"], ["tomato", "tomatoes", "tomatos", "tomatoss"],
  ["knife", "knives", "knifes", "knifs"], ["wolf", "wolves", "wolfs", "wolfes"], ["strawberry", "strawberries", "strawberrys", "strawberryes"],
];
const plural = textTemplate({
  skillId: "en.gram.plural", lang: "en",
  items: PLURAL.map(([sing, plur, w1, w2]) => ({
    prompt: `one ${sing}, two ___`, answer: plur, wrong: [w1, w2],
    hint1: "De flesta ord får ett -s. Ord som slutar på s, x, ch eller sh får -es.",
    hint2: "Några ord är oregelbundna och ändrar form helt. Tänk på hur det låter när du säger det högt.",
  })),
});

// ── Presens: [mening, svar, fel, fel, fel] ──────────────────────
const PRESENS: [string, string, string[]][] = [
  ["Every day I ___ milk. (like)", "like", ["likes", "liking", "liked"]],
  ["She ___ football every day. (play)", "plays", ["play", "playing", "played"]],
  ["They ___ apples every day. (eat)", "eat", ["eats", "eating", "ate"]],
  ["He ___ to school every day. (walk)", "walks", ["walk", "walking", "walked"]],
  ["The dog ___ a lot every day. (sleep)", "sleeps", ["sleep", "sleeping", "slept"]],
  ["We ___ English every day. (speak)", "speak", ["speaks", "speaking", "spoke"]],
  ["My mum ___ in a shop every day. (work)", "works", ["work", "working", "worked"]],
  ["The bird ___ in the tree every morning. (sing)", "sings", ["sing", "singing", "sang"]],
  ["My brother ___ a lot every day. (talk)", "talks", ["talk", "talking", "talked"]],
  ["It ___ every day in autumn. (rain)", "rains", ["rain", "raining", "rained"]],
  ["She ___ TV every day after school. (watch)", "watches", ["watchs", "watching", "watched"]],
  ["He ___ his teeth every morning. (brush)", "brushes", ["brushs", "brushing", "brushed"]],
  ["Every day she ___ to school. (go)", "goes", ["gos", "going", "went"]],
  ["He ___ his homework every day. (do)", "does", ["do", "doing", "did"]],
  ["My cat ___ fish every day. (like)", "likes", ["like", "liking", "liked"]],
];
const presens = textTemplate({
  skillId: "en.gram.presens", lang: "en",
  items: PRESENS.map(([prompt, answer, wrong]) => ({
    prompt, answer, wrong,
    hint1: "Det står «every day», så det händer ofta. Verbet ska stå i presens.",
    hint2: "Efter he, she och it får verbet en särskild ändelse. Efter I, you, we och they får det ingen.",
  })),
});

// ── Preteritum: [mening, svar, fel, fel, fel] ───────────────────
const PRET: [string, string, string[]][] = [
  ["Yesterday I ___ football. (play)", "played", ["play", "plays", "playing"]],
  ["Yesterday she ___ a cake. (bake)", "baked", ["bake", "bakes", "bakeed"]],
  ["Yesterday we ___ to the park. (walk)", "walked", ["walk", "walks", "walking"]],
  ["Yesterday he ___ over the box. (jump)", "jumped", ["jump", "jumps", "jumping"]],
  ["Yesterday I ___ my mum. (help)", "helped", ["help", "helps", "helping"]],
  ["Yesterday I ___ to school. (go)", "went", ["goed", "gone", "go"]],
  ["Yesterday I ___ a big dog. (see)", "saw", ["seed", "seen", "sawed"]],
  ["Yesterday we ___ pizza. (eat)", "ate", ["eated", "eaten", "eats"]],
  ["Yesterday she ___ very fast. (run)", "ran", ["runned", "run", "runs"]],
  ["Yesterday I ___ a good time. (have)", "had", ["haved", "has", "haven"]],
  ["Yesterday he ___ a new bike. (buy)", "bought", ["buyed", "boughted", "buys"]],
  ["Yesterday she ___ my pen. (take)", "took", ["taked", "taken", "taking"]],
  ["Yesterday we ___ in the sea. (swim)", "swam", ["swimmed", "swum", "swims"]],
  ["Yesterday I ___ a letter. (write)", "wrote", ["writed", "written", "writes"]],
  ["Yesterday they ___ some water. (drink)", "drank", ["drinked", "drunk", "drinks"]],
  ["Yesterday he ___ home late. (come)", "came", ["comed", "comes", "coming"]],
  ["Yesterday I ___ a cake. (make)", "made", ["maked", "makes", "making"]],
  ["Yesterday she ___ me a present. (give)", "gave", ["gived", "given", "gives"]],
  ["Yesterday the baby ___ all day. (sleep)", "slept", ["sleeped", "sleeps", "sleeping"]],
];
const preteritum = textTemplate({
  skillId: "en.gram.preteritum", lang: "en",
  items: PRET.map(([prompt, answer, wrong]) => ({
    prompt, answer, wrong,
    hint1: "Det står «yesterday», så det har redan hänt. Verbet ska stå i dåtid.",
    hint2: "Många verb får -ed i dåtid. Några är oregelbundna och ändrar form helt.",
  })),
});

// ── Prepositioner: [mening med lucka, översättning, svar, fel...] ──
const PREP: [string, string, string, string[]][] = [
  ["The cat is ___ the box.", "Katten är i lådan.", "in", ["on", "under", "behind"]],
  ["The book is ___ the table.", "Boken ligger på bordet.", "on", ["in", "under", "behind"]],
  ["The ball is ___ the chair.", "Bollen ligger under stolen.", "under", ["on", "in", "behind"]],
  ["I live ___ Sweden.", "Jag bor i Sverige.", "in", ["on", "at", "to"]],
  ["We eat lunch ___ twelve o'clock.", "Vi äter lunch klockan tolv.", "at", ["on", "in", "to"]],
  ["My birthday is ___ July.", "Min födelsedag är i juli.", "in", ["on", "at", "to"]],
  ["School starts ___ Monday.", "Skolan börjar på måndag.", "on", ["in", "at", "by"]],
  ["I go to school ___ bus.", "Jag åker till skolan med buss.", "by", ["with", "on", "in"]],
  ["He gives a present ___ his mum.", "Han ger en present till sin mamma.", "to", ["at", "in", "on"]],
  ["The dog is ___ the house.", "Hunden är bakom huset.", "behind", ["in", "on", "under"]],
  ["The bird flies ___ the house.", "Fågeln flyger över huset.", "over", ["under", "in", "at"]],
  ["She walks ___ the park.", "Hon går genom parken.", "through", ["on", "in", "to"]],
  ["She sits ___ me.", "Hon sitter bredvid mig.", "next to", ["under", "in", "on"]],
];
const prep = textTemplate({
  skillId: "en.gram.prepositioner", lang: "en",
  items: PREP.map(([prompt, sv, answer, wrong]) => ({
    prompt, sub: `(${sv})`, answer, wrong,
    hint1: "Läs den svenska meningen. Handlar det om var något är, när något händer eller hur man åker?",
    hint2: "Tänk på hur du skulle säga det på svenska och vilket litet ord som passar i luckan.",
  })),
});

export const englishTemplates: TextTemplate[] = [
  themed("en.ord.farger", "färger", FARGER),
  themed("en.ord.siffror", "siffror", SIFFROR),
  themed("en.ord.djur", "djur", DJUR),
  themed("en.ord.familj", "familjen", FAMILJ),
  themed("en.ord.kropp", "kroppen", KROPP),
  themed("en.ord.mat", "mat och dryck", MAT),
  themed("en.ord.klader", "kläder", KLADER),
  themed("en.ord.skola", "skolan", SKOLA),
  themed("en.ord.natur", "natur och väder", NATUR),
  tid,
  themed("en.ord.verb", "vanliga verb", VERB),
  themed("en.ord.adjektiv", "egenskapsord", ADJEKTIV),
  motsatser, aan, pronomen, tobe, have, plural, presens, preteritum, prep,
];
