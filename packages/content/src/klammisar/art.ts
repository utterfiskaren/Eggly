// @ts-nocheck
/**
 * Klämmisarnas utseende, flyttat oförändrat från Eggly 1 (Ronjas-mattespel, index.html, 2026-11-15).
 * Arter, nivåer, former, ansikten, kläder (treats), kamouflage och ägg. Allt ritas som SVG-text.
 * Ändra inte id:n: de finns sparade i barnens samlingar.
 * Koden är en ren kopia: inga tillstånd från det gamla spelet följer med (bara ritning och slump).
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* ---------- klämmisarna: nio nivåer, olika många i varje (egna figurer, ritade i SVG) ---------- */
/* Rangordning: Legendary är sista och svåraste, Epic näst sist. Id:n ändras inte (sparningar och ägg), bara ordningen. */
const TORDER = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 8], RANK = [];
TORDER.forEach((t, r) => { RANK[t] = r; });
const byRank = a => a.map((_, t) => a[RANK[t]]);
const TIERS = [
  { id: 'brons', name: 'Brons', egg: ['#f6d7b4', '#c98a55', '#a86a38'], stat: '#c98a55' },
  { id: 'silver', name: 'Silver', egg: ['#f7f9fc', '#b4bfce', '#8996a8'], stat: '#9aa7b8' },
  { id: 'guld', name: 'Guld', egg: ['#fff3b0', '#f2b92c', '#d29412'], stat: '#ecb022' },
  { id: 'platinum', name: 'Platinum', egg: ['#f4feff', '#a9e4f4', '#6cc3dd'], stat: '#62bfdb' },
  { id: 'rainbow', name: 'Rainbow', egg: ['#ffc3d8', '#fff0a8', '#a8d8ff'], stat: '#ff7fb0' },
  { id: 'princess', name: 'Princess', egg: ['#ffe6f5', '#ff9edb', '#ee66b8'], stat: '#f160b5' },
  { id: 'darkness', name: 'Darkness', egg: ['#5a3f8f', '#2c1e4a', '#150e26'], stat: '#6f46bd' },
  { id: 'ghost', name: 'Ghost', egg: ['#ffffff', '#d6eef8', '#a7d3e6'], stat: '#7fc0d6' },
  { id: 'legendary', name: 'Legendary', egg: ['#ffe27a', '#ff9a1a', '#e2401a'], stat: '#ff7a1a' },
  { id: 'sponge', name: 'Sponge', egg: ['#fffbb0', '#ffe44d', '#e0b81a'], stat: '#d9b310' },
  { id: 'dinosaur', name: 'Dinosaur', egg: ['#d8f5b8', '#7fcf5e', '#4e9e3a'], stat: '#4e9e3a' },
  { id: 'unicorn', name: 'Unicorn', egg: ['#fff0fb', '#ffb8e8', '#c9a8ff'], stat: '#c58af0' },
  { id: 'angel', name: 'Angel', egg: ['#ffffff', '#fff3c8', '#ffe08a'], stat: '#e0a51c' },
  { id: 'epic', name: 'Epic', egg: ['#8a5cff', '#4a22b0', '#1a0a4a'], stat: '#7c4dff' }
];
function sp(tier, rows) { return rows.map(r => ({ id: r[0], name: r[1], kind: r[2], c: r[3], d: r[4], txt: r[5], tier, special: r[6], lockTxt: r[7] })); }
const SQ = [].concat(
  sp(0, [
    ['mochi', 'Mochi-katten', 'cat', '#ffd6e7', '#f5a9c8', 'Mjuk som en marshmallow. Älskar att räkna till tio.'],
    ['bulle', 'Bullen Kanel', 'bun', '#f3c99a', '#c98d5a', 'Snurrar som en kanelbulle när det blir rätt.'],
    ['persika', 'Persikan Pia', 'peach', '#ffc3a8', '#ff9a80', 'Luktar sommar och tycker mest om plus.'],
    ['panda', 'Pandan Pösen', 'panda', '#ffffff', '#3d3546', 'Äter bambu i grupper om fem.'],
    ['groda', 'Grodan Gurra', 'frog', '#bdeca0', '#8fd16d', 'Hoppar längs tallinjen – boing!'],
    ['kanin', 'Kaninen Lusse', 'bunny', '#e4dbff', '#b9a8f5', 'Hoppar i tvåor: 2, 4, 6, 8!'],
    ['jordgubbe', 'Jordgubben Juni', 'strawberry', '#ff9fb1', '#ff7090', 'Har räknat alla sina frön. Två gånger.'],
    ['kyckling', 'Kycklingen Pip', 'chick', '#fff0a0', '#ffd84d', 'Säger pip för varje rätt svar.'],
    ['gris', 'Grisen Gosa', 'pig', '#ffc9d6', '#ff9fb6', 'Säger nöff när hon räknar i huvudet.'],
    ['moln', 'Molnet Mjuk', 'cloud', '#f3f8ff', '#c5dcf5', 'Det mjukaste molnet på hela himlen.'],
    ['munk', 'Munken Mums', 'donut', '#f6d3a3', '#ffa6c9', 'Har strössel i alla regnbågens färger.'],
    ['bjorn', 'Björnen Kakao', 'bear', '#e2c2a2', '#b88b62', 'Ger världens mjukaste björnkramar.'],
    ['hamster', 'Hamstern Hasse', 'hamster', '#ffd9a8', '#fff6ea', 'Samlar frön i kinderna – tiotals!'],
    ['lamm', 'Lammet Lisa', 'sheep', '#fff7ee', '#6e5a70', 'Räknar får när hon ska sova. Sig själv också.'],
    ['mus', 'Musen Pyttis', 'hamster', '#d7d3e2', '#f4f1f8', 'Liten, men räknar stort.'],
    ['hund', 'Hunden Bosse', 'dog', '#f2d3a8', '#c9925e', 'Viftar på svansen i takt med tvåans tabell.'],
    ['bi', 'Biet Surrina', 'bee', '#ffe27a', '#4a3a55', 'Surrar runt tiotalen.'],
    ['piga', 'Nyckelpigan Prick', 'ladybug', '#ff8d8d', '#4a3a55', 'Vet alltid hur många prickar hon har.'],
    ['svamp', 'Svampen Sylvia', 'mushroom', '#fff2e0', '#ff8a8a', 'Växer med en centimeter per rätt svar.'],
    ['muffin', 'Muffinen Mysan', 'cupcake', '#ffc9e3', '#f2c48c', 'Delar gärna i lika stora bitar.'],
    ['snigel', 'Snigeln Segis', 'snail', '#ffe8b8', '#e0a070', 'Tar den tid hon behöver. Och lite till.'],
    ['krabba', 'Krabban Knip', 'crab', '#ffa78f', '#ff8066', 'Går i sidled längs tallinjen.'],
    ['kaktus', 'Kaktusen Kram', 'cactus', '#a8e0a0', '#ffb3d1', 'Vill bara ha en försiktig kram.'],
    ['padda', 'Sköldpaddan Stilla', 'turtle', '#c9efb0', '#7fc98a', 'Långsamt och rätt vinner alltid.']
  ]),
  sp(1, [
    ['val', 'Valen Vilma', 'whale', '#b8dcff', '#86bdf0', 'Sprutar vatten när hon blir glad.'],
    ['pingvin', 'Pingvinen Iso', 'penguin', '#6f7ba0', '#ffffff', 'Åker kana nerför minustecken.'],
    ['avokado', 'Avokadon Ava', 'avocado', '#9fd48a', '#eaf7b8', 'Har en kärna full av klokskap.'],
    ['axolotl', 'Axolotln Axel', 'axolotl', '#ffc2d8', '#ff8fb8', 'Ler alltid, även när det är klurigt.'],
    ['rav', 'Räven Rulle', 'fox', '#ffb27a', '#ffffff', 'Listig på gångertabellen.'],
    ['sal', 'Sälen Sigge', 'seal', '#dfe6ef', '#b7c4d4', 'Balanserar tal på nosen.'],
    ['glass', 'Glassen Pistage', 'icecream', '#c9f0d6', '#f2c48c', 'Kall om fötterna men varm i hjärtat.'],
    ['agg', 'Ägget Solsken', 'egg', '#ffffff', '#ffd34d', 'Strålar som en sol varje morgon.'],
    ['koala', 'Koalan Kelly', 'koala', '#cfd3dd', '#fff', 'Sover 20 timmar. Räknar de andra fyra.'],
    ['lejon', 'Lejonet Love', 'lion', '#ffd59a', '#e8a35a', 'Ryter bara när svaret är rätt.'],
    ['hjort', 'Hjorten Hilda', 'deer', '#e2b98c', '#fff4e4', 'Räknar taggarna på sina horn.'],
    ['blacken', 'Bläckfisken Bläcka', 'octopus', '#c9b8f0', '#9883e6', 'Åtta armar – åttans tabell är enkel.'],
    ['manet', 'Maneten Manda', 'jelly', '#d9d0ff', '#ffc1e3', 'Svävar lugnt genom alla tal.'],
    ['fisken', 'Fisken Fena', 'fish', '#a8e4ee', '#ffb37d', 'Simmar i stim om tio.'],
    ['skatt', 'Silverkatten Sissi', 'cat', '#dbe1ea', '#aeb9c8', 'Glänser i månskenet.'],
    ['skanin', 'Silverkaninen Silja', 'bunny', '#e3e8f0', '#b8c2d0', 'Hoppar tyst som en tanke.'],
    ['sbjorn', 'Stålbjörnen Bruno', 'bear', '#cdd5df', '#a2afbf', 'Stark som en hel tabell.'],
    ['mmoln', 'Månmolnet Luna', 'cloud', '#e6ecf5', '#b4c1d4', 'Skiner i natten.'],
    ['fmunk', 'Frostmunken Frida', 'donut', '#e8edf4', '#bcd4ef', 'Har kall glasyr och varmt leende.'],
    ['ggroda', 'Grågrodan Gunnar', 'frog', '#d3dbe2', '#a9b6c2', 'Säger kvack i dubbel takt.']
  ]),
  sp(2, [
    ['uggla', 'Ugglan Ulla', 'owl', '#d4c1f0', '#b29be0', 'Vet svaret – men vill att du tänker själv.'],
    ['gkatt', 'Guldkatten Glans', 'cat', '#ffdf85', '#f2b92c', 'Spinner i guldton.'],
    ['gbjorn', 'Guldbjörnen Bruse', 'bear', '#ffd978', '#e6aa2a', 'Kramar gyllene kramar.'],
    ['gfisk', 'Guldfisken Glimma', 'fish', '#ffd25e', '#ff9a4d', 'Har tre önskningar – alla om matte.'],
    ['ggris', 'Spargrisen Sparsam', 'pig', '#ffe08a', '#f2b92c', 'Sparar varje stjärna du får.'],
    ['hbi', 'Honungsbiet Hanna', 'bee', '#ffcf4a', '#6a4a20', 'Gör den sötaste honungen i kupan.'],
    ['ggroda2', 'Guldgrodan Kväkis', 'frog', '#ffe07a', '#e8b52a', 'Hoppar över hela tiotal.'],
    ['skaktus', 'Solkaktusen Solveig', 'cactus', '#ffe58a', '#ff8fb8', 'Lyser hela öknen.'],
    ['glejon', 'Guldlejonet Majestät', 'lion', '#ffe08a', '#f2a81c', 'Kung över gångertabellerna.'],
    ['ghjort', 'Guldhjorten Aurum', 'deer', '#f2c85a', '#fff4c2', 'Har horn av rent solsken.'],
    ['kmuffin', 'Karamellmuffinen Karla', 'cupcake', '#ffd9a0', '#d99a3f', 'Doftar kola och nybakat.'],
    ['gmunk', 'Guldmunken Glasyr', 'donut', '#ffe7a8', '#f2b92c', 'Har guldströssel på allt.'],
    ['gkrabba', 'Guldkrabban Krösus', 'crab', '#ffd35e', '#f0a81c', 'Knipsar till sig varje rätt svar.'],
    ['gblack', 'Bärnstensbläckfisken Bella', 'octopus', '#ffc56b', '#e89528', 'Räknar med alla åtta armar.'],
    ['gping', 'Guldpingvinen Medalj', 'penguin', '#d9a82a', '#fff7dc', 'Har vunnit varenda kanatävling.'],
    ['ghamster', 'Guldhamstern Skatten', 'hamster', '#ffd76b', '#fff4c8', 'Har guldpengar i kinderna.']
  ]),
  sp(3, [
    ['stjarna', 'Stjärnan Glitter', 'star', '#fff09a', '#ffd23f', 'Lyser för att du klarade en hel gångertabell!', 'crown', 'Klara en hel gångertabell (få en krona).'],
    ['dino', 'Dinon Dunder', 'dino', '#b5e8c9', '#7fcfa3', 'Kom för att du svarat rätt 100 gånger. RAWR!', '100', 'Svara rätt på 100 tal.'],
    ['enhorning', 'Enhörningen Stjärnglans', 'unicorn', '#fff4fb', '#ffb3dd', 'Kom för att du klarat dagens mål fem dagar!', 'goal5', 'Klara dagens mål på 5 olika dagar.'],
    ['ikatt', 'Istappskatten Is', 'cat', '#e6f8ff', '#a7dff2', 'Har morrhår av frost.'],
    ['dkanin', 'Diamantkaninen Dia', 'bunny', '#ecfbff', '#b3e7f6', 'Vart hopp gnistrar.'],
    ['kval', 'Kristallvalen Klara', 'whale', '#d3f2fc', '#9cdcf0', 'Sjunger i kristallton.'],
    ['fping', 'Frostpingvinen Flinga', 'penguin', '#8ec9e0', '#f4fdff', 'Trivs bäst när det är minus.'],
    ['suggla', 'Snöugglan Snö', 'owl', '#eef9ff', '#bfe4f2', 'Tyst som snö och skarp som is.'],
    ['idrake', 'Isdraken Kyla', 'dragon', '#d6f3fc', '#92d6ec', 'Andas snöflingor.'],
    ['prav', 'Polarräven Pärla', 'fox', '#e8f7fd', '#ffffff', 'Syns inte i snön, men hörs när hon räknar.'],
    ['mmanet', 'Månmaneten Selene', 'jelly', '#e0f6ff', '#b3e0f5', 'Lyser svagt i djupet.'],
    ['kgroda', 'Kristallgrodan Klang', 'frog', '#d6f5f2', '#9fe0dc', 'Hoppar med ett litet pling.']
  ]),
  sp(4, [
    ['rmochi', 'Regnbågsmochi', 'cat', '#ffd0e6', '#c9b8f0', 'Byter färg när hon är glad, alltså hela tiden.'],
    ['renhorn', 'Enhörningen Prisma', 'unicorn', '#ffe6f5', '#c9b8f0', 'Springer längs regnbågen.'],
    ['rmoln', 'Molnet Färgglad', 'cloud', '#ffe6ef', '#c9e4ff', 'Regnar strössel.'],
    ['rglass', 'Glassen Tutti Frutti', 'icecream', '#ffd9ec', '#f2c48c', 'Smakar allt på en gång.'],
    ['rmunk', 'Munken Strössla', 'donut', '#ffe2c0', '#ffa6c9', 'Har mer strössel än munk.'],
    ['rblack', 'Bläckfisken Spektra', 'octopus', '#d9c9ff', '#a8d8ff', 'Har en färg per arm.'],
    ['rfisk', 'Fisken Skimmer', 'fish', '#c9e9ff', '#ffc4dc', 'Blänker i alla färger.'],
    ['rmanet', 'Maneten Aurora', 'jelly', '#e9dcff', '#a8ecd8', 'Dansar som norrsken.'],
    ['rdrake', 'Draken Kulör', 'dragon', '#ffd9b0', '#c9b8f0', 'Sprutar konfetti i stället för eld.']
  ]),
  sp(5, [
    ['pmochi', 'Prinsessan Rosalina', 'cat', '#ffc6e9', '#ff8fd0', 'Hovets finaste matematiker.'],
    ['pgroda', 'Prinsessgrodan Kyssa', 'frog', '#ffd0ea', '#ff9edb', 'Vill bli kysst – men bara efter rätt svar.'],
    ['penhorn', 'Prinsessenhörningen Stella', 'unicorn', '#fff0fa', '#ff9edb', 'Bär slöja av stjärnor.'],
    ['pkanin', 'Prinsesskaninen Fluffina', 'bunny', '#ffe0f4', '#ffaede', 'Har en tron av kuddar.'],
    ['pmanet', 'Prinsessmaneten Pärlemor', 'jelly', '#ffe6f6', '#ffc1e3', 'Bor i ett slott av snäckor.'],
    ['pmuffin', 'Sockerprinsessan Lina', 'cupcake', '#ffb8e0', '#ffe2a8', 'Kröner varje muffin personligen.'],
    ['puggla', 'Hovugglan Fjäderina', 'owl', '#ffd4ee', '#ffaad9', 'Rådgivare åt drottningen i tabellfrågor.']
  ]),
  sp(6, [
    ['dkatt', 'Mörkerkatten Natt', 'cat', '#3a2a5c', '#6a45b0', 'Ögonen lyser när alla andra sover.'],
    ['dbat', 'Skuggfladdermusen Svärta', 'bat', '#33264f', '#5b3d99', 'Hänger upp och ner och räknar baklänges.'],
    ['ddrake', 'Mörkerdraken Åska', 'dragon', '#2f2448', '#7a3fc4', 'Dyker upp med mullrande moln.'],
    ['dblack', 'Nattbläckfisken Djupa', 'octopus', '#2d2750', '#5a48a8', 'Bor där solen aldrig når.'],
    ['dkanin2', 'Mörkerkaninen Skymning', 'bunny', '#3b3058', '#6f55ad', 'Hoppar mellan skuggorna.'],
    ['dmoln', 'Stormmolnet Dunder', 'cloud', '#403664', '#5a4a86', 'Blixtrar när hon nyser.']
  ]),
  sp(7, [
    ['spoke', 'Spöket Buu', 'ghost', '#f2faff', '#c8e4f2', 'Vill egentligen bara ha en kompis.'],
    ['skatt2', 'Spökkatten Viska', 'cat', '#e8f4fb', '#c0dcea', 'Går rakt genom väggar.'],
    ['smanet', 'Spökmaneten Dimma', 'jelly', '#eaf7fd', '#c8e8f4', 'Syns bara i ögonvrån.'],
    ['suggla2', 'Spökugglan Tystnad', 'owl', '#e4f1f8', '#bcd8e8', 'Hoar utan ljud.'],
    ['sval', 'Spökvalen Eko', 'whale', '#ddf0f8', '#b6d8e8', 'Hennes sång kommer tillbaka tre gånger.']
  ]),
  sp(8, [
    ['fenix', 'Fenixen Eldrun', 'phoenix', '#ffb347', '#ff5e3a', 'Föds på nytt ur sin egen aska.'],
    ['kdrake', 'Stjärndraken Kosmos', 'dragon', '#ffcf6b', '#ff7a1a', 'Har hela stjärnhimlen på ryggen.'],
    ['euhorn', 'Himlahästen Evig', 'unicorn', '#fff0c2', '#ffa23f', 'Den äldsta av alla klämmisar.']
  ]),
  sp(9, [
    ['svamp1', 'Svampen Skrubb', 'sponge', '#ffe44d', '#d9a010', 'Skrubbar bort alla fel med ett leende.'],
    ['svamp2', 'Svampen Blubb', 'sponge', '#ffb0d0', '#e0709c', 'Blubbar glatt när svaret blir rätt.'],
    ['svamp3', 'Svampen Duschis', 'sponge', '#9fdcff', '#4aa3dd', 'Älskar bubbelbad och stora tal.'],
    ['svamp4', 'Svampen Bubbla', 'sponge', '#b6f0a8', '#5fbf55', 'Mjuk, porig och supersmart.']
  ]),
  sp(10, [
    ['dino1', 'Dinon Rex', 'dino', '#8fdc6a', '#4e9e3a', 'Ryter bara när hon räknar fel. Sällan.'],
    ['dino2', 'Dinon Trixi', 'dino', '#ffb066', '#e07a2a', 'Har tre horn och tre favoritsiffror.'],
    ['dino3', 'Dinon Stego', 'dino', '#c6a6f0', '#7a5fd0', 'Har plattor på ryggen, en för varje tabell.'],
    ['dino4', 'Dinon Ptera', 'dino', '#8fd6ff', '#3a8fd0', 'Flyger högt över alla uppgifter.']
  ]),
  sp(11, [
    ['enh1', 'Enhörningen Glitterlock', 'unicorn', '#ffd0f0', '#ff8fd0', 'Hennes man glittrar för varje rätt svar.'],
    ['enh2', 'Enhörningen Stjärnglans', 'unicorn', '#d0e4ff', '#8fb0ff', 'Springer över natthimlen och räknar stjärnor.'],
    ['enh3', 'Enhörningen Regnis', 'unicorn', '#e8d6ff', '#b08cff', 'Kommer fram när solen skiner genom regnet.']
  ]),
  sp(12, [
    ['ang1', 'Ängeln Gloria', 'bunny', '#ffffff', '#ffe27a', 'Hoppar mjukt på molnen. Tyst som en fjäder.'],
    ['ang2', 'Ängeln Himmelsmoln', 'cloud', '#ffffff', '#ffe9a0', 'Det finaste molnet i hela himlen.'],
    ['ang3', 'Ängeln Stjärnvinge', 'cat', '#fffbe6', '#ffd34d', 'Spinner så mjukt att stjärnorna tänds.']
  ]),
  sp(13, [
    ['epic1', 'Galaxdraken Nova', 'dragon', '#8a5cff', '#ffd34d', 'Bor mellan galaxerna och räknar planeter.'],
    ['epic2', 'Fenixen Aurora', 'phoenix', '#ff6fd0', '#ffd34d', 'Hennes fjädrar lyser som norrsken.']
  ])
);
const SQ_BY = Object.fromEntries(SQ.map(s => [s.id, s]));
const SLOTS = ['hat', 'glasses', 'bow', 'clothes', 'acc'];
const SLOT_NAME = { hat: 'Hatt', glasses: 'Glasögon', bow: 'Rosett', clothes: 'Kläder', acc: 'Tillbehör', skin: 'Kamouflage' };
const RAR_COL = ['', '#a9a3b5', '#5fc488', '#5aa7ee', '#a877ee', '#f2a81c', '#ff5e8a', '#22c3d6'], RAR_NAME = ['', 'Vanlig', 'Fin', 'Sällsynt', 'Episk', 'Mytisk', 'Legendarisk', 'Allra bäst'];
const RAR_PRICE = [0, 15, 35, 70, 140, 300], RAR_BONUS = [0, 3, 6, 11, 18, 30, 44, 60];
const priceOf = t => t.p != null ? t.p : RAR_PRICE[t.r];
const SLOT_STATS = { hat: { kl: 0.6, gl: 0.4 }, glasses: { kl: 1 }, bow: { gl: 1 }, clothes: { mj: 1 }, acc: { st: 1 } };
const STAT_KEYS = ['mj', 'st', 'gl', 'kl'], STAT_NAME = { mj: 'Mjukhet', st: 'Studs', gl: 'Glitter', kl: 'Klurighet' };
const STAT_COL = { mj: '#ff9ec4', st: '#7fd9b2', gl: '#ffd25e', kl: '#94a9f5' };
const STAT_HELP = { mj: 'Mjukhet: tål fler smällar i Striden.', st: 'Studs: slår hårdare i Striden.', gl: 'Glitter: större chans till superslag.', kl: 'Klurighet: mer tid att tänka i Striden.' };
const TIER_BASE = byRank([10, 16, 24, 34, 46, 60, 76, 94, 114, 136, 160, 186, 214, 246]), TREAT_COUNT = byRank([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5]), MAX_RAR = byRank([1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5]);
const THEME = { 5: ['tiara'], 6: ['horn', 'sammet'], 7: ['gloria', 'lykta'], 8: ['stjarnkrona', 'vingar'], 11: ['tiara'], 12: ['gloria', 'vingar'], 13: ['stjarnkrona', 'vingar'] };
const TAPS = byRank([3, 4, 4, 5, 5, 6, 6, 7, 9, 10, 10, 11, 11, 12]);
function sr(seed, i) { let h = Math.imul(seed ^ Math.imul(i + 1, 0x9E3779B1), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function rollTreats(tier) {
  const out = {}, want = TREAT_COUNT[tier];
  (THEME[tier] || []).forEach(id => { if (Object.keys(out).length < want) out[TREAT_BY[id].slot] = id; });
  for (const slot of shuffle(SLOTS.slice())) {
    if (Object.keys(out).length >= want) break;
    if (out[slot]) continue;
    const pool = TREATS.filter(t => t.slot === slot && t.r <= MAX_RAR[tier] && t.only == null && !t.shop);
    const w = pool.map(t => Math.pow(1.7, t.r));
    let r = Math.random() * w.reduce((a, b) => a + b, 0), got = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { got = pool[i]; break; } }
    out[slot] = got.id;
  }
  return out;
}
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const light = (c, t = 0.45) => mix(c, '#ffffff', t);
const dark = (c, t = 0.18) => mix(c, '#5a3d6e', t);
const EYE = '#3b2b4a';
const BLOB = 'M100 50C152 50 184 84 184 124C184 162 150 180 100 180C50 180 16 162 16 124C16 84 48 50 100 50Z';
const mir = svg => svg + '<g transform="translate(200 0) scale(-1 1)">' + svg + '</g>';
const shine = (x = 66, y = 82) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="11" fill="#fff" opacity=".55" transform="rotate(-28 ${x} ${y})"/>`;
const bodyP = (u, p = BLOB, sx, sy) => `<path d="${p}" fill="url(#${u}g)"/>` + shine(sx, sy);
function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return d + 'Z';
}

const KINDS = {
  blob: (s, u) => ({ body: bodyP(u) }),
  cat: (s, u) => ({
    back: mir(`<path d="M34 92Q30 46 44 30Q50 26 58 32Q76 46 88 60Z" fill="${s.c}"/><path d="M44 76Q42 50 50 42Q62 50 72 62Z" fill="#ffb3cc" opacity=".85"/>`),
    body: bodyP(u),
    front: mir(`<path d="M28 126l-16-3M28 133l-15 4" stroke="${dark(s.c, 0.35)}" stroke-width="2.4" stroke-linecap="round"/>`),
    face: { mouth: 'w' }
  }),
  bunny: (s, u) => ({
    back: mir(`<ellipse cx="70" cy="42" rx="17" ry="42" transform="rotate(-14 70 42)" fill="${s.c}"/><ellipse cx="70" cy="46" rx="8" ry="28" transform="rotate(-14 70 46)" fill="#ffc4dc"/>`),
    body: bodyP(u), face: { mouth: 'w' }, top: 48
  }),
  bear: (s, u) => ({
    back: mir(`<circle cx="50" cy="64" r="24" fill="${dark(s.c, 0.08)}"/><circle cx="50" cy="64" r="12" fill="${light(s.c, 0.35)}"/>`),
    body: bodyP(u),
    front: `<ellipse cx="100" cy="136" rx="26" ry="18" fill="${light(s.c, 0.5)}"/><ellipse cx="100" cy="128" rx="8" ry="5.5" fill="${EYE}"/>`,
    face: { ey: 108, mouth: 'w', my: 32, cy: 124, cx: 46 }
  }),
  panda: (s, u) => ({
    back: mir(`<circle cx="48" cy="66" r="22" fill="#3d3546"/>`),
    body: bodyP(u),
    front: mir(`<ellipse cx="74" cy="114" rx="15" ry="19" transform="rotate(30 74 114)" fill="#3d3546"/>`),
    face: { eye: 'ring', gap: 26, er: 6, mouth: 'w', cx: 50 }
  }),
  frog: (s, u) => ({
    back: mir(`<circle cx="64" cy="62" r="28" fill="url(#${u}g)"/>`),
    body: bodyP(u, BLOB, 60, 96),
    face: { ey: 60, gap: 36, er: 9, eye: 'ring', mouth: 'wide', my: 66, cy: 122, cx: 50 }, top: 26
  }),
  chick: (s, u) => ({
    back: `<path d="M96 56Q88 30 100 36Q104 22 110 38Q122 32 106 56Z" fill="${dark(s.c, 0.06)}"/>` + mir(`<ellipse cx="22" cy="128" rx="14" ry="22" transform="rotate(20 22 128)" fill="${dark(s.c, 0.1)}"/>`),
    body: bodyP(u),
    front: `<path d="M90 124L110 124L100 137Z" fill="#ffa64d" stroke="#f08a2a" stroke-width="2.5" stroke-linejoin="round"/>`,
    face: { ey: 110, mouth: 'none' }
  }),
  penguin: (s, u) => ({
    back: `<ellipse cx="78" cy="178" rx="16" ry="8" fill="#ffa64d"/><ellipse cx="122" cy="178" rx="16" ry="8" fill="#ffa64d"/>` + mir(`<ellipse cx="20" cy="124" rx="12" ry="28" transform="rotate(18 20 124)" fill="${dark(s.c, 0.15)}"/>`),
    body: bodyP(u),
    front: `<path d="M100 78C132 78 160 102 160 134C160 164 136 176 100 176C64 176 40 164 40 134C40 102 68 78 100 78Z" fill="#fff"/><path d="M91 126L109 126L100 137Z" fill="#ffa64d" stroke="#f08a2a" stroke-width="2.5" stroke-linejoin="round"/>`,
    face: { ey: 112, mouth: 'none', gap: 22 }
  }),
  whale: (s, u) => ({
    back: `<path d="M166 114Q190 98 196 72Q182 86 172 84Q186 70 184 52Q170 74 158 106Z" fill="${dark(s.c, 0.06)}"/>`,
    body: bodyP(u),
    front: `<path d="M48 158Q100 172 152 158M58 168Q100 180 142 168" stroke="${light(s.c, 0.65)}" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#9fd3ff"><circle cx="90" cy="30" r="6"/><circle cx="104" cy="20" r="7"/><circle cx="117" cy="31" r="5"/></g><path d="M101 50Q99 40 104 30" stroke="#9fd3ff" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    face: {}, top: 56
  }),
  seal: (s, u) => ({
    back: mir(`<ellipse cx="34" cy="170" rx="24" ry="10" transform="rotate(-18 34 170)" fill="${dark(s.c, 0.12)}"/>`),
    body: bodyP(u),
    front: `<ellipse cx="90" cy="133" rx="11" ry="8.5" fill="#fff"/><ellipse cx="110" cy="133" rx="11" ry="8.5" fill="#fff"/><ellipse cx="100" cy="125" rx="7" ry="5" fill="${EYE}"/><g fill="${dark(s.c, 0.45)}"><circle cx="86" cy="133" r="1.6"/><circle cx="92" cy="137" r="1.6"/><circle cx="108" cy="137" r="1.6"/><circle cx="114" cy="133" r="1.6"/></g>`,
    face: { ey: 108, mouth: 'none', cx: 46 }
  }),
  fox: (s, u) => ({
    back: mir(`<path d="M32 94L42 28L90 62Z" fill="${s.c}" stroke="${s.c}" stroke-width="10" stroke-linejoin="round"/><path d="M44 72L48 42L72 60Z" fill="#fff" opacity=".85"/>`),
    body: bodyP(u),
    front: `<path d="M18 128C40 120 72 128 100 146C128 128 160 120 182 128C178 162 148 180 100 180C52 180 22 162 18 128Z" fill="#fff"/><ellipse cx="100" cy="142" rx="7" ry="5" fill="${EYE}"/>`,
    face: { ey: 110, mouth: 'none', cy: 118 }
  }),
  owl: (s, u) => ({
    back: mir(`<path d="M32 82L38 36L70 58Z" fill="${dark(s.c, 0.08)}" stroke="${dark(s.c, 0.08)}" stroke-width="8" stroke-linejoin="round"/><ellipse cx="22" cy="132" rx="14" ry="30" fill="${dark(s.c, 0.12)}"/>`),
    body: bodyP(u),
    front: mir(`<circle cx="74" cy="108" r="23" fill="#fff"/>`) + `<path d="M84 158q6 6 12 0M104 158q6 6 12 0M94 168q6 6 12 0" stroke="${dark(s.c, 0.25)}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M93 127L107 127L100 139Z" fill="#ffb347"/>`,
    face: { ey: 108, gap: 26, er: 10, mouth: 'none', cy: 134, cx: 40 }
  }),
  axolotl: (s, u) => ({
    back: mir(`<g fill="${s.d}"><ellipse cx="24" cy="80" rx="21" ry="8" transform="rotate(30 24 80)"/><ellipse cx="14" cy="102" rx="21" ry="8"/><ellipse cx="22" cy="124" rx="21" ry="8" transform="rotate(-30 22 124)"/></g>`),
    body: bodyP(u), face: { gap: 30, mouth: 'wide' }
  }),
  strawberry: (s, u) => {
    const P = 'M100 58C150 50 186 82 178 124C170 160 132 184 100 184C68 184 30 160 22 124C14 82 50 50 100 58Z';
    const seeds = [[62, 88], [138, 88], [42, 118], [158, 118], [64, 160], [136, 160], [100, 172], [84, 74], [116, 74], [44, 146], [156, 146]]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="4.5" fill="#fff3a0"/>`).join('');
    return {
      body: bodyP(u, P),
      front: seeds + `<path d="M100 62L78 44L92 50L84 30L100 46L116 30L108 50L122 44Z" fill="#7fd08a" stroke="#5fb56c" stroke-width="3" stroke-linejoin="round"/><path d="M100 46Q102 32 108 24" stroke="#5fb56c" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      face: { ey: 116 }, top: 44
    };
  },
  peach: (s, u) => ({
    body: bodyP(u),
    front: `<path d="M100 54Q90 78 98 102" stroke="${dark(s.c, 0.25)}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".45"/><path d="M100 56Q100 44 106 38" stroke="#8a6a4a" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M104 52Q118 28 146 32Q130 58 104 52Z" fill="#8fd18a" stroke="#6bb86a" stroke-width="2.5"/>`,
    face: { ey: 118 }
  }),
  bun: (s, u) => ({
    body: bodyP(u),
    front: `<path d="M100 96C118 96 120 72 100 70C76 68 70 100 96 106C128 112 144 76 120 60C102 48 66 56 56 84" stroke="${dark(s.c, 0.3)}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".5"/><g fill="#fff"><rect x="70" y="60" width="7" height="5" rx="2.5"/><rect x="128" y="88" width="7" height="5" rx="2.5" transform="rotate(30 131 90)"/><rect x="112" y="102" width="7" height="5" rx="2.5"/><rect x="62" y="96" width="7" height="5" rx="2.5" transform="rotate(-20 65 98)"/><rect x="142" y="70" width="7" height="5" rx="2.5"/></g>`,
    face: { ey: 128, my: 13 }
  }),
  donut: (s, u) => {
    const cols = ['#9fd3ff', '#fff1a8', '#9fe7c6', '#c9b8f0', '#ffffff'];
    const spr = [[70, 70, 20], [96, 62, -30], [124, 70, 40], [150, 86, -20], [54, 90, 60], [84, 88, 10], [112, 92, -50], [140, 100, 30], [62, 78, -40]]
      .map(([x, y, r], i) => `<rect x="-6" y="-2.2" width="12" height="4.4" rx="2.2" fill="${cols[i % cols.length]}" transform="translate(${x} ${y}) rotate(${r})"/>`).join('');
    return {
      body: bodyP(u),
      front: `<path d="M20 106C22 66 58 50 100 50C142 50 178 66 180 106Q172 118 162 106Q152 122 140 108Q128 120 116 106Q104 124 92 108Q80 120 68 106Q56 122 44 106Q32 116 20 106Z" fill="${s.d}"/>` + shine(70, 70) + spr,
      face: { ey: 134, my: 13 }
    };
  },
  cloud: (s, u) => ({
    body: bodyP(u, 'M52 174C22 174 12 140 36 124C26 92 62 72 88 88C98 58 146 56 156 92C186 90 196 134 170 148C182 166 168 176 148 176Z', 74, 96),
    face: { ey: 130, gap: 22 }, top: 70
  }),
  avocado: (s, u) => {
    const P = 'M100 36C128 36 144 70 154 98C170 140 152 180 100 180C48 180 30 140 46 98C56 70 72 36 100 36Z';
    return {
      body: `<path d="${P}" fill="url(#${u}g)"/>`,
      front: `<path d="${P}" fill="${s.d}" transform="translate(100 112) scale(.82) translate(-100 -112)"/><circle cx="100" cy="148" r="22" fill="#b07a4f"/><circle cx="93" cy="141" r="6" fill="#d6a37b"/>` + shine(80, 70),
      face: { ey: 104, gap: 20, cx: 36, cy: 116 }, top: 40
    };
  },
  icecream: (s, u) => ({
    back: `<path d="M56 140L100 198L144 140Z" fill="#f2c48c" stroke="#d9a066" stroke-width="3" stroke-linejoin="round"/><path d="M66 152L126 162M76 168L118 176M80 146L112 186M120 146L92 186" stroke="#d9a066" stroke-width="2.5" stroke-linecap="round"/>`,
    body: bodyP(u, 'M100 48C150 48 178 78 178 112C178 130 170 140 160 142Q150 156 140 142Q128 152 118 142Q106 158 94 142Q82 152 72 142Q60 154 50 142C30 140 22 128 22 112C22 78 50 48 100 48Z', 66, 78),
    front: `<circle cx="114" cy="42" r="12" fill="#ff6f91"/><circle cx="110" cy="38" r="3.5" fill="#fff" opacity=".7"/><path d="M114 32Q118 18 130 12" stroke="#6bb86a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    face: { ey: 100, my: 13 }, top: 44
  }),
  egg: (s, u) => ({
    body: bodyP(u, 'M100 66C140 58 188 82 186 122C190 160 152 178 122 172C98 184 50 180 28 160C6 140 18 92 54 82C70 68 86 70 100 66Z', 56, 96),
    front: `<circle cx="100" cy="120" r="42" fill="url(#${u}y)"/><ellipse cx="84" cy="96" rx="12" ry="6" fill="#fff" opacity=".6" transform="rotate(-25 84 96)"/>`,
    defs: `<radialGradient id="${u}y" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff2a8"/><stop offset=".6" stop-color="${s.d}"/><stop offset="1" stop-color="#f5b82e"/></radialGradient>`,
    face: { ey: 116, gap: 16, er: 6.5, cx: 34, cy: 128 }, top: 76
  }),
  pig: (s, u) => ({
    back: mir(`<path d="M42 72L46 36L78 56Z" fill="${dark(s.c, 0.08)}" stroke="${dark(s.c, 0.08)}" stroke-width="8" stroke-linejoin="round"/>`),
    body: bodyP(u),
    front: `<ellipse cx="100" cy="136" rx="20" ry="14" fill="${s.d}"/><ellipse cx="93" cy="136" rx="3.5" ry="5" fill="${dark(s.d, 0.45)}"/><ellipse cx="107" cy="136" rx="3.5" ry="5" fill="${dark(s.d, 0.45)}"/>`,
    face: { ey: 108, mouth: 'none', cx: 46, cy: 126 }
  }),
  hamster: (s, u) => ({
    back: mir(`<circle cx="52" cy="62" r="16" fill="${dark(s.c, 0.1)}"/><circle cx="52" cy="62" r="8" fill="#ffc4dc"/>`),
    body: bodyP(u),
    front: `<path d="M44 150C60 126 140 126 156 150C150 172 128 180 100 180C72 180 50 172 44 150Z" fill="${s.d}"/>`,
    face: { ey: 108, mouth: 'w', cx: 44 }
  }),
  star: (s, u) => ({
    body: `<path d="${starPath(100, 116, 84, 46)}" fill="url(#${u}g)" stroke="${s.c}" stroke-width="20" stroke-linejoin="round"/>` + shine(76, 92),
    front: `<path d="M28 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff" opacity=".9"/><path d="M172 150l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff" opacity=".9"/>`,
    face: { ey: 118, gap: 18, mouth: 'open', cx: 32 }, top: 40
  }),
  dino: (s, u) => ({
    back: `<g fill="${s.d}" stroke="${s.d}" stroke-width="6" stroke-linejoin="round"><path d="M50 70L56 42L74 58Z"/><path d="M78 56L88 30L102 52Z"/><path d="M104 52L116 28L128 54Z"/><path d="M132 58L148 38L152 68Z"/></g><path d="M168 142Q196 142 198 114Q186 130 172 126Z" fill="${s.c}"/>`,
    body: bodyP(u),
    front: `<ellipse cx="100" cy="158" rx="42" ry="18" fill="${light(s.c, 0.6)}"/>`,
    face: { ey: 110, mouth: 'open' }
  }),
  sponge: (s, u) => ({
    body: `<path d="M26 66Q26 54 38 54H162Q174 54 174 66V164Q174 176 162 176H38Q26 176 26 164Z" fill="url(#${u}g)"/>` + shine(60, 80) + `<g fill="${s.d}" opacity=".5"><ellipse cx="52" cy="72" rx="7" ry="5"/><ellipse cx="150" cy="152" rx="9" ry="6"/><ellipse cx="148" cy="76" rx="5" ry="4"/><ellipse cx="46" cy="158" rx="6" ry="5"/><ellipse cx="100" cy="166" rx="5" ry="3"/></g>`,
    face: { ey: 112, mouth: 'open' }, top: 54
  }),
  unicorn: (s, u) => ({
    back: mir(`<path d="M44 74L48 44L74 60Z" fill="${s.c}" stroke="${s.c}" stroke-width="8" stroke-linejoin="round"/>`),
    body: bodyP(u),
    front: `<g><circle cx="78" cy="56" r="15" fill="#fff1a8"/><circle cx="58" cy="62" r="17" fill="#ffb3dd"/><circle cx="40" cy="78" r="17" fill="#c9b8f0"/><circle cx="28" cy="100" r="16" fill="#9fd3ff"/><circle cx="24" cy="122" r="14" fill="#9fe7c6"/></g><path d="M100 6L86 54Q100 60 114 54Z" fill="#ffe27a" stroke="#f2c14e" stroke-width="3" stroke-linejoin="round"/><path d="M90 42L110 36M93 28L107 24" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/>`,
    face: { ey: 114, mouth: 'smile', gap: 26 }
  })
};
/* ---------- fler figurer ---------- */
Object.assign(KINDS, {
  sheep: (s, u) => {
    let w = '';
    [[40, 92], [60, 66], [88, 54], [116, 54], [142, 66], [162, 92], [30, 124], [170, 124], [44, 152], [156, 152], [76, 166], [124, 166]].forEach(([x, y]) => { w += `<circle cx="${x}" cy="${y}" r="28" fill="${s.c}"/>`; });
    return { back: w, body: bodyP(u), front: `<ellipse cx="100" cy="124" rx="44" ry="38" fill="${s.d}"/><ellipse cx="100" cy="146" rx="20" ry="11" fill="${light(s.d, 0.35)}"/>`, face: { ey: 116, gap: 20, ink: '#fff', mouth: 'none', cheeks: false }, top: 34 };
  },
  dog: (s, u) => ({ body: bodyP(u), front: mir(`<ellipse cx="34" cy="108" rx="19" ry="42" transform="rotate(14 34 108)" fill="${s.d}"/>`) + `<ellipse cx="100" cy="138" rx="24" ry="17" fill="${light(s.c, 0.55)}"/><ellipse cx="100" cy="130" rx="8" ry="6" fill="${EYE}"/><ellipse cx="100" cy="158" rx="8" ry="10" fill="#ff8fa8"/>`, face: { ey: 108, mouth: 'w', my: 34, cy: 124, cx: 44 } }),
  lion: (s, u) => {
    let m = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = 100 + Math.cos(a) * 78, y = 118 + Math.sin(a) * 70; m += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="25" fill="${s.d}"/>`; }
    return { back: m, body: bodyP(u), front: `<ellipse cx="100" cy="136" rx="22" ry="15" fill="${light(s.c, 0.55)}"/><path d="M92 126L108 126L100 135Z" fill="${EYE}"/>`, face: { ey: 108, mouth: 'none', cy: 124, cx: 46 }, top: 40 };
  },
  koala: (s, u) => ({ back: mir(`<circle cx="36" cy="72" r="34" fill="${s.c}"/><circle cx="36" cy="74" r="20" fill="#ffd6e7"/>`), body: bodyP(u), front: `<ellipse cx="100" cy="128" rx="15" ry="20" fill="#4b3a63"/>`, face: { ey: 108, gap: 36, mouth: 'none', cy: 134, cx: 54 }, top: 48 }),
  deer: (s, u) => ({
    back: mir(`<path d="M72 60Q62 28 40 22M58 42Q50 42 40 48M68 36Q70 22 62 14" stroke="#c49a6c" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="92" rx="24" ry="12" transform="rotate(-22 32 92)" fill="${dark(s.c, 0.08)}"/>`),
    body: bodyP(u), front: `<g fill="${s.d}"><circle cx="46" cy="140" r="6"/><circle cx="154" cy="140" r="6"/><circle cx="62" cy="160" r="5"/><circle cx="138" cy="160" r="5"/><circle cx="100" cy="66" r="6"/></g><ellipse cx="100" cy="130" rx="8" ry="6" fill="${EYE}"/>`, face: { ey: 108, mouth: 'w', my: 34, cy: 124, cx: 44 }, top: 44
  }),
  bee: (s, u) => ({
    back: mir(`<ellipse cx="40" cy="64" rx="34" ry="22" transform="rotate(28 40 64)" fill="#e9f6ff" stroke="#c6e0f5" stroke-width="3"/><path d="M84 54Q74 26 58 24" stroke="${s.d}" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="58" cy="24" r="6" fill="${s.d}"/>`),
    body: bodyP(u), front: `<path d="M24 144Q100 170 176 144L170 160Q100 186 30 160Z" fill="${s.d}"/><path d="M42 170Q100 190 158 170L148 178Q100 192 52 178Z" fill="${s.d}"/>`, face: { ey: 104 }, top: 46
  }),
  ladybug: (s, u) => ({
    back: mir(`<path d="M84 54Q78 26 62 26" stroke="${s.d}" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="62" cy="26" r="6" fill="${s.d}"/>`),
    body: bodyP(u), front: `<g fill="${s.d}"><circle cx="46" cy="110" r="11"/><circle cx="154" cy="110" r="11"/><circle cx="66" cy="156" r="12"/><circle cx="134" cy="156" r="12"/><circle cx="100" cy="166" r="8"/><circle cx="100" cy="66" r="9"/></g>`, face: { ey: 108 }, top: 46
  }),
  mushroom: (s, u) => ({
    body: `<path d="M56 108C56 150 50 184 100 184C150 184 144 150 144 108Z" fill="url(#${u}g)"/>`,
    front: `<path d="M16 118C10 64 56 30 100 30C144 30 190 64 184 118C150 132 50 132 16 118Z" fill="${s.d}"/><g fill="#fff"><circle cx="56" cy="76" r="14"/><circle cx="110" cy="58" r="17"/><circle cx="152" cy="92" r="12"/><circle cx="86" cy="104" r="9"/></g>`,
    face: { ey: 148, gap: 20, er: 6.5, cx: 34 }, top: 26
  }),
  cupcake: (s, u) => ({
    back: `<path d="M38 116L54 186Q100 196 146 186L162 116Z" fill="${s.d}"/><path d="M58 122L68 188M84 122L88 192M116 122L112 192M142 122L132 188" stroke="${dark(s.d, 0.2)}" stroke-width="4" stroke-linecap="round"/>`,
    body: bodyP(u, 'M100 26C124 26 134 44 130 56C164 60 178 86 164 108C176 128 150 142 100 142C50 142 24 128 36 108C22 86 36 60 70 56C66 44 76 26 100 26Z', 74, 70),
    front: `<circle cx="100" cy="24" r="13" fill="#ff6f91"/><circle cx="96" cy="20" r="3.5" fill="#fff" opacity=".8"/>`, face: { ey: 100, my: 13 }, top: 22
  }),
  crab: (s, u) => ({
    back: mir(`<path d="M34 120Q10 104 16 76" stroke="${s.d}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M16 78C-4 60 8 34 22 40L20 58L38 44C50 54 40 80 16 78Z" fill="${s.d}"/><path d="M38 152L12 168M48 166L24 186" stroke="${s.d}" stroke-width="9" stroke-linecap="round"/><path d="M78 62L74 34" stroke="${s.d}" stroke-width="7" stroke-linecap="round"/><circle cx="74" cy="30" r="13" fill="#fff"/><circle cx="74" cy="30" r="6.5" fill="${EYE}"/>`),
    body: bodyP(u), face: { ey: 112, er: 0.01, gap: 24, mouth: 'wide', my: 12 }, top: 50
  }),
  cactus: (s, u) => ({
    back: `<path d="M38 120C22 120 16 106 16 88" stroke="${s.c}" stroke-width="24" fill="none" stroke-linecap="round"/><path d="M162 112C178 112 184 100 184 80" stroke="${s.c}" stroke-width="24" fill="none" stroke-linecap="round"/>`,
    body: bodyP(u, 'M100 28C132 28 150 54 150 90V184H50V90C50 54 68 28 100 28Z', 78, 66),
    front: `<g stroke="${dark(s.c, 0.3)}" stroke-width="3" stroke-linecap="round"><path d="M70 66l6 5M130 66l-6 5M62 150l7 4M138 150l-7 4M100 44v8M76 172l5-5M124 172l-5-5"/></g><g transform="translate(100 24)">` + [0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos(a * Math.PI / 180) * 11).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180) * 11).toFixed(1)}" r="9" fill="${s.d}"/>`).join('') + `<circle r="7" fill="#ffd34d"/></g>`,
    face: { ey: 112, gap: 22, cx: 36 }, top: 22
  }),
  turtle: (s, u) => ({
    back: mir(`<ellipse cx="30" cy="172" rx="24" ry="13" transform="rotate(-14 30 172)" fill="${s.c}"/>`),
    body: bodyP(u),
    front: `<path d="M20 112C20 62 62 40 100 40C138 40 180 62 180 112C140 96 60 96 20 112Z" fill="${s.d}"/><path d="M100 46V94M62 54L56 98M138 54L144 98" stroke="${dark(s.d, 0.22)}" stroke-width="5" stroke-linecap="round"/>`,
    face: { ey: 134, gap: 24 }, top: 34
  }),
  octopus: (s, u) => ({
    body: bodyP(u, 'M100 26C150 26 176 66 176 110C176 134 170 148 160 158L100 170L40 158C30 148 24 134 24 110C24 66 50 26 100 26Z', 66, 62),
    front: [34, 60, 86, 114, 140, 166].map((x, i) => `<path d="M${x} 146Q${x + (i < 3 ? -12 : 12)} 174 ${x + (i < 3 ? -4 : 4)} 192" stroke="${i % 2 ? s.c : s.d}" stroke-width="19" fill="none" stroke-linecap="round"/>`).join(''),
    face: { ey: 100, gap: 28, er: 9 }, top: 24
  }),
  jelly: (s, u) => ({
    back: [50, 74, 100, 126, 150].map((x, i) => `<path d="M${x} 110Q${x + (i % 2 ? 12 : -12)} 146 ${x} 196" stroke="${s.d}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>`).join(''),
    body: bodyP(u, 'M100 24C152 24 184 66 184 112C170 128 154 112 140 126C126 112 112 130 100 124C88 130 74 112 60 126C46 112 30 128 16 112C16 66 48 24 100 24Z', 64, 58),
    face: { ey: 88, gap: 26 }, top: 22
  }),
  fish: (s, u) => ({
    back: `<path d="M166 124Q198 96 196 76Q184 92 166 96Q190 124 196 174Q180 150 160 146Z" fill="${s.d}"/><path d="M100 54Q118 22 150 34Q130 44 128 62Z" fill="${s.d}"/>`,
    body: bodyP(u), front: `<path d="M124 118Q150 124 146 150Q124 146 118 126Z" fill="${s.d}" opacity=".85"/><path d="M64 164Q100 176 132 162" stroke="${light(s.c, 0.6)}" stroke-width="4" fill="none" stroke-linecap="round"/>`, face: { ey: 108, gap: 30, er: 9, eye: 'ring', mouth: 'open', cx: 56, cy: 128 }, top: 52
  }),
  bat: (s, u) => ({
    back: mir(`<path d="M46 118C24 84 10 74-2 72C4 92 2 110-4 130C12 124 20 132 24 148C34 134 44 134 58 146Z" fill="${dark(s.d, 0.1)}"/><path d="M42 84L40 26L82 60Z" fill="${s.c}" stroke="${s.c}" stroke-width="8" stroke-linejoin="round"/><path d="M50 70L50 40L72 58Z" fill="${s.d}"/>`),
    body: bodyP(u), front: `<path d="M88 130L92 144L98 130ZM102 130L108 144L112 130Z" fill="#fff"/>`, face: { ey: 108, gap: 26, er: 9, mouth: 'none', cx: 48 }, top: 48
  }),
  ghost: (s, u) => ({
    back: mir(`<ellipse cx="22" cy="118" rx="14" ry="24" transform="rotate(24 22 118)" fill="${s.d}"/>`),
    body: bodyP(u, 'M100 24C150 24 174 66 174 116V190Q160 176 146 190Q132 176 118 190Q104 176 90 190Q76 176 62 190Q46 176 26 190V116C26 66 50 24 100 24Z', 66, 62),
    face: { ey: 96, gap: 24, er: 10, mouth: 'open', my: 22, cy: 118, cx: 46 }, top: 22
  }),
  dragon: (s, u) => ({
    back: mir(`<path d="M46 96C18 66 2 62-6 62C2 82 2 96-6 116C10 112 22 118 30 132C38 120 48 118 62 124Z" fill="${s.d}"/><path d="M72 58Q60 34 44 28Q50 48 54 66Z" fill="#fff4d6" stroke="${s.d}" stroke-width="4" stroke-linejoin="round"/>`) + `<g fill="${s.d}" stroke="${s.d}" stroke-width="5" stroke-linejoin="round"><path d="M86 50L96 26L108 50Z"/></g><path d="M170 150Q198 150 198 118Q186 138 170 134Z" fill="${s.c}"/>`,
    body: bodyP(u), front: `<ellipse cx="100" cy="142" rx="34" ry="24" fill="${light(s.c, 0.5)}"/><ellipse cx="90" cy="136" rx="3.5" ry="4.5" fill="${dark(s.d, 0.4)}"/><ellipse cx="110" cy="136" rx="3.5" ry="4.5" fill="${dark(s.d, 0.4)}"/>`, face: { ey: 104, gap: 28, er: 9, mouth: 'wide', my: 50, cy: 118, cx: 54 }, top: 46
  }),
  phoenix: (s, u) => ({
    back: mir(`<path d="M44 128C10 96-2 62-2 40C14 62 22 66 34 62C28 80 36 88 48 88C44 100 52 106 66 108Z" fill="${s.d}"/><path d="M50 122C30 100 22 80 22 66C34 80 42 84 50 82C48 96 54 102 66 106Z" fill="#ffd34d"/>`) + `<g stroke="${s.d}" stroke-linejoin="round" stroke-width="5"><path d="M100 60Q78 40 88 8Q98 28 100 34Q104 22 116 4Q126 38 104 60Z" fill="#ffd34d"/></g>`,
    body: bodyP(u), front: `<path d="M90 124L110 124L100 140Z" fill="#ffd34d" stroke="#e8981a" stroke-width="2.5" stroke-linejoin="round"/><path d="M52 164Q100 186 148 164" stroke="#ffd34d" stroke-width="7" fill="none" stroke-linecap="round"/>`, face: { ey: 108, mouth: 'none', gap: 26, er: 8.5 }, top: 50
  })
});
KINDS.snail = (s, u) => ({
  back: `<circle cx="124" cy="96" r="62" fill="${s.d}"/><path d="M124 96m-8 0a8 8 0 1 1 16 0a20 20 0 1 1-40 0a32 32 0 1 1 64 0a44 44 0 1 1-88 0" fill="none" stroke="${dark(s.d, 0.3)}" stroke-width="6" stroke-linecap="round"/><path d="M56 110Q46 68 36 58M84 106Q78 70 72 58" stroke="${s.c}" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="36" cy="56" r="8" fill="${s.c}"/><circle cx="72" cy="56" r="8" fill="${s.c}"/>`,
  body: bodyP(u, 'M34 130C34 100 70 92 92 110C130 128 180 138 190 164C194 180 170 182 100 182C40 182 34 164 34 130Z', 64, 124),
  face: { ey: 136, gap: 22 }, top: 34
});

function faceSVG(f) {
  const L = 100 - f.gap, R = 100 + f.gap, y = f.ey, er = f.er || 7.5, ink = f.ink || EYE;
  let s = '';
  if (f.cheeks !== false) {
    const cy = f.cy || y + 14, cx = f.cx || f.gap + 17;
    s += `<ellipse cx="${100 - cx}" cy="${cy}" rx="11" ry="7" fill="#ff9fbf" opacity=".7"/><ellipse cx="${100 + cx}" cy="${cy}" rx="11" ry="7" fill="#ff9fbf" opacity=".7"/>`;
  }
  if (f.er !== 0.01) {
    let eyes;
    if (f.glow) eyes = [L, R].map(x => `<circle cx="${x}" cy="${y}" r="${er + 6}" fill="${f.glow}" opacity=".35"/><circle cx="${x}" cy="${y}" r="${er}" fill="${ink}"/>`).join('');
    else if (f.eye === 'ring') eyes = [L, R].map(x => `<circle cx="${x}" cy="${y}" r="${er + 3.5}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${er}" fill="${ink}"/><circle cx="${x + 2.4}" cy="${y - 2.4}" r="${er * 0.36}" fill="#fff"/>`).join('');
    else eyes = [L, R].map(x => `<circle cx="${x}" cy="${y}" r="${er}" fill="${ink}"/><circle cx="${x + er * 0.35}" cy="${y - er * 0.38}" r="${er * 0.36}" fill="#fff"/><circle cx="${x - er * 0.3}" cy="${y + er * 0.35}" r="${er * 0.16}" fill="#fff"/>`).join('');
    s += `<g class="eyes">${eyes}</g>`;
  }
  if (f.angry) s += `<path d="M${L - 12} ${y - 22}L${L + 12} ${y - 10}M${R + 12} ${y - 22}L${R - 12} ${y - 10}" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>`;
  const my = y + (f.my || 14);
  const st = `stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (f.angry) s += `<path d="M90 ${my + 6}Q100 ${my - 5} 110 ${my + 6}" ${st}/>`;
  else if (f.mouth === 'w') s += `<path d="M91 ${my - 2}q4.5 6 9 0q4.5 6 9 0" ${st}/>`;
  else if (f.mouth === 'open') s += `<path d="M91 ${my - 3}Q100 ${my + 11} 109 ${my - 3}Z" fill="#d9577f" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
  else if (f.mouth === 'wide') s += `<path d="M84 ${my - 3}Q100 ${my + 9} 116 ${my - 3}" ${st}/>`;
  else if (f.mouth !== 'none') s += `<path d="M93 ${my - 2}Q100 ${my + 5} 107 ${my - 2}" ${st}/>`;
  return s;
}

/* ---------- treats: hattar, glasögon, rosetter, kläder och tillbehör ---------- */
const bowD = (c, c2, extra = '') => (f, top) => `<g transform="translate(146 ${top + 14}) rotate(18)"><path d="M0 0L-24-14Q-31 0-24 14Z" fill="${c}" stroke="${c2}" stroke-width="2" stroke-linejoin="round"/><path d="M0 0L24-14Q31 0 24 14Z" fill="${c}" stroke="${c2}" stroke-width="2" stroke-linejoin="round"/><circle r="7" fill="${c2}"/>${extra}</g>`;
const heartP = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-10-3-6-10 0-5C6-10 10-3 0 6Z" fill="${c}"/>`;
const neckY = f => clamp(f.ey + 40, 138, 166);
const T_ = (id, slot, name, r, draw, x) => Object.assign({ id, slot, name, r, draw }, x || {});
const TREATS = [
  /* hattar */
  T_('partyhatt', 'hat', 'Partyhatt', 1, (f, top) => `<g transform="translate(100 ${top + 4})"><path d="M-24 0L0-50L24 0Z" fill="#9fd3ff" stroke="#6aaee6" stroke-width="2.5" stroke-linejoin="round"/><circle cx="-8" cy="-10" r="4" fill="#fff"/><circle cx="8" cy="-18" r="4" fill="#ffd34d"/><circle cx="-1" cy="-32" r="3.5" fill="#ff9ec4"/><circle cy="-52" r="8" fill="#ff9ec4"/></g>`),
  T_('mossa', 'hat', 'Mysmössa', 1, (f, top) => `<g transform="translate(100 ${top + 18})"><path d="M-56 0C-56-46 56-46 56 0Z" fill="#b9a8f5"/><path d="M-30-24v20M-10-32v28M10-32v28M30-24v20" stroke="#9883e6" stroke-width="3" stroke-linecap="round" opacity=".6"/><rect x="-60" y="-8" width="120" height="18" rx="9" fill="#9883e6"/><circle cy="-40" r="12" fill="#fff1a8"/></g>`),
  T_('keps', 'hat', 'Keps', 1, (f, top) => `<g transform="translate(100 ${top + 12})"><path d="M-46 6C-46-36 46-36 46 6Z" fill="#6aaee6"/><path d="M-22 4C10-6 62-2 76 10C50 20 2 18-22 4Z" fill="#4a8fd0"/><circle cy="-26" r="5" fill="#fff"/></g>`),
  T_('krans', 'hat', 'Blomkrans', 2, (f, top) => { let p = ''; for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 7, x = 100 + Math.cos(a) * 62, y = top + 42 + Math.sin(a) * 34, c = ['#ff9ec4', '#fff1a8', '#c9b8f0', '#9fd3ff'][i % 4]; p += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="12" fill="${c}"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4.5" fill="#ffd34d"/>`; } return p; }),
  T_('kock', 'hat', 'Kockmössa', 2, (f, top) => `<g transform="translate(100 ${top + 6})"><path d="M-30 6V-18C-52-22-50-52-26-48C-22-66 22-66 26-48C50-52 52-22 30-18V6Z" fill="#fff" stroke="#e3dbe9" stroke-width="3"/><rect x="-32" y="-2" width="64" height="12" rx="6" fill="#efe9f5"/></g>`),
  T_('cowboy', 'hat', 'Cowboyhatt', 2, (f, top) => `<g transform="translate(100 ${top + 10})"><path d="M-78 2Q0 26 78 2Q50-6 36-6L30-42Q12-34 0-40Q-12-34-30-42L-36-6Q-50-6-78 2Z" fill="#c49a6c" stroke="#9c7346" stroke-width="3" stroke-linejoin="round"/><path d="M-36-8Q0 4 36-8" stroke="#e8536c" stroke-width="6" fill="none"/></g>`),
  T_('trollhatt', 'hat', 'Trollkarlshatt', 3, (f, top) => `<g transform="translate(100 ${top + 10})"><path d="M-40 4L8-70Q14-74 16-66L40 4Z" fill="#7a5fd0"/><path d="M-62 6Q0 20 62 6Q0-10-62 6Z" fill="#5f46b8"/><path d="${starPath(4, -26, 11, 5)}" fill="#ffd34d"/><circle cx="-14" cy="-8" r="3.5" fill="#fff"/><circle cx="20" cy="-6" r="3" fill="#fff"/></g>`),
  T_('pirat', 'hat', 'Piratmössa', 3, (f, top) => `<g transform="translate(100 ${top + 14})"><path d="M-62 6Q-34-46 0-24Q34-46 62 6Q0 20-62 6Z" fill="#3b2b4a"/><path d="M-50 2Q0 14 50 2" stroke="#ffd34d" stroke-width="3.5" fill="none"/><path d="${starPath(0, -12, 12, 5)}" fill="#fff"/></g>`),
  T_('tiara', 'hat', 'Tiara', 4, (f, top) => `<g transform="translate(100 ${top + 8})"><path d="M-38 6Q0-12 38 6L30-14L16-6L0-30L-16-6L-30-14Z" fill="#ffe27a" stroke="#e8ac2a" stroke-width="2.5" stroke-linejoin="round"/><circle cy="-14" r="6" fill="#ff8fd0"/><circle cx="-22" cy="-4" r="3.5" fill="#9fd3ff"/><circle cx="22" cy="-4" r="3.5" fill="#9fd3ff"/></g>`, { only: 5 }),
  T_('krona', 'hat', 'Krona', 4, (f, top) => `<g transform="translate(100 ${top + 4})"><path d="M-30 4L-34-26L-16-12L0-32L16-12L34-26L30 4Z" fill="#ffd34d" stroke="#e8ac2a" stroke-width="3" stroke-linejoin="round"/><circle cy="-8" r="5" fill="#ff8fb8"/><circle cx="-18" cy="-4" r="3.5" fill="#9fd3ff"/><circle cx="18" cy="-4" r="3.5" fill="#9fd3ff"/></g>`),
  T_('horn', 'hat', 'Mörkerhorn', 4, (f, top) => mir(`<path d="M64 ${top + 18}C50 ${top - 6} 40 ${top - 20} 22 ${top - 26}C26 ${top} 36 ${top + 24} 50 ${top + 34}Z" fill="#2a1f42" stroke="#7a3fc4" stroke-width="3" stroke-linejoin="round"/>`), { only: 6 }),
  T_('gloria', 'hat', 'Gloria', 4, (f, top) => `<ellipse cx="100" cy="${top - 16}" rx="44" ry="13" fill="none" stroke="#fff3a8" stroke-width="10" opacity=".5"/><ellipse cx="100" cy="${top - 16}" rx="44" ry="13" fill="none" stroke="#ffd34d" stroke-width="4.5"/>`, { only: 7 }),
  T_('stjarnkrona', 'hat', 'Stjärnkrona', 5, (f, top) => `<g transform="translate(100 ${top + 6})"><path d="M-44 6L-52-38L-24-16L0-50L24-16L52-38L44 6Z" fill="#ffd34d" stroke="#e8981a" stroke-width="3.5" stroke-linejoin="round"/><path d="${starPath(0, -18, 15, 7)}" fill="#ff5e3a"/><circle cx="-30" cy="-6" r="5" fill="#9fd3ff"/><circle cx="30" cy="-6" r="5" fill="#9fd3ff"/><rect x="-46" y="0" width="92" height="9" rx="4.5" fill="#e8981a"/></g>`, { only: 8 }),
  /* glasögon */
  T_('runda', 'glasses', 'Runda glasögon', 1, f => { const L = 100 - f.gap, R = 100 + f.gap, y = f.ey; return `<g fill="#fff" fill-opacity=".25" stroke="#3b2b4a" stroke-width="4"><circle cx="${L}" cy="${y}" r="17"/><circle cx="${R}" cy="${y}" r="17"/></g><path d="M${L + 17} ${y}H${R - 17}" stroke="#3b2b4a" stroke-width="4"/>`; }),
  T_('hjartan', 'glasses', 'Hjärtglasögon', 2, f => { const y = f.ey; return heartP(100 - f.gap, y - 1, 2.8, '#ff6fa3') + heartP(100 + f.gap, y - 1, 2.8, '#ff6fa3') + `<path d="M${100 - f.gap + 16} ${y - 4}H${100 + f.gap - 16}" stroke="#ff6fa3" stroke-width="4"/>`; }),
  T_('glasogon', 'glasses', 'Solglasögon', 2, f => { const L = 100 - f.gap, R = 100 + f.gap, y = f.ey; return `<g><rect x="${L - 16}" y="${y - 11}" width="32" height="22" rx="10" fill="#3b2b4a"/><rect x="${R - 16}" y="${y - 11}" width="32" height="22" rx="10" fill="#3b2b4a"/><path d="M${L + 16} ${y - 3}Q100 ${y - 10} ${R - 16} ${y - 3}" stroke="#3b2b4a" stroke-width="4" fill="none"/><path d="M${L - 9} ${y - 3}l8-6M${R - 9} ${y - 3}l8-6" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`; }),
  T_('stjarnglas', 'glasses', 'Stjärnglasögon', 3, f => { const y = f.ey; return `<path d="${starPath(100 - f.gap, y, 21, 11)}" fill="#ffd34d" fill-opacity=".55" stroke="#e8ac2a" stroke-width="3" stroke-linejoin="round"/><path d="${starPath(100 + f.gap, y, 21, 11)}" fill="#ffd34d" fill-opacity=".55" stroke="#e8ac2a" stroke-width="3" stroke-linejoin="round"/>`; }),
  T_('dykmask', 'glasses', 'Dykmask', 3, f => { const y = f.ey, x = 100 - f.gap - 22, w = f.gap * 2 + 44; return `<rect x="${x}" y="${y - 18}" width="${w}" height="36" rx="16" fill="#9fd3ff" fill-opacity=".45" stroke="#4a8fd0" stroke-width="5"/><path d="M${x + 12} ${y - 8}l12-6" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`; }),
  T_('monokel', 'glasses', 'Monokel', 3, f => { const R = 100 + f.gap, y = f.ey; return `<circle cx="${R}" cy="${y}" r="17" fill="#fff" fill-opacity=".25" stroke="#e8ac2a" stroke-width="4.5"/><path d="M${R + 12} ${y + 12}Q${R + 30} ${y + 40} ${R + 18} ${y + 62}" stroke="#e8ac2a" stroke-width="2.5" fill="none"/>`; }),
  T_('diamant', 'glasses', 'Diamantglasögon', 4, f => { const y = f.ey; return [100 - f.gap, 100 + f.gap].map(x => `<path d="M${x} ${y - 21}L${x + 20} ${y}L${x} ${y + 21}L${x - 20} ${y}Z" fill="#c9f2ff" fill-opacity=".6" stroke="#5fc0e0" stroke-width="3.5" stroke-linejoin="round"/>`).join('') + `<path d="M${100 - f.gap + 20} ${y}H${100 + f.gap - 20}" stroke="#5fc0e0" stroke-width="3.5"/>`; }),
  T_('regnbage', 'glasses', 'Regnbågsvisir', 5, (f, top, u) => { const y = f.ey, x = 100 - f.gap - 24, w = f.gap * 2 + 48; return `<defs><linearGradient id="${u}rv"><stop offset="0" stop-color="#ff7fb0"/><stop offset=".25" stop-color="#ffd25e"/><stop offset=".5" stop-color="#7fd9b2"/><stop offset=".75" stop-color="#7fc7ff"/><stop offset="1" stop-color="#b79bff"/></linearGradient></defs><rect x="${x}" y="${y - 15}" width="${w}" height="30" rx="14" fill="url(#${u}rv)" fill-opacity=".8"/><path d="M${x + 12} ${y - 6}h${w - 24}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`; }),
  /* rosetter */
  T_('rosett', 'bow', 'Rosa rosett', 1, bowD('#ff8fb8', '#e86a9a')),
  T_('blomma', 'bow', 'Blomma', 1, (f, top) => { let p = ''; for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; p += `<circle cx="${(Math.cos(a) * 10).toFixed(1)}" cy="${(Math.sin(a) * 10).toFixed(1)}" r="9" fill="#ffffff" stroke="#f5c3dc" stroke-width="2"/>`; } return `<g transform="translate(58 ${top + 14})">${p}<circle r="7" fill="#ffd34d"/></g>`; }),
  T_('blarosett', 'bow', 'Blå rosett', 1, bowD('#94c9f5', '#6aaee6')),
  T_('prick', 'bow', 'Prickig rosett', 2, bowD('#ffdc6b', '#efbf3f', '<g fill="#fff"><circle cx="-16" cy="-3" r="2.8"/><circle cx="-13" cy="6" r="2.2"/><circle cx="16" cy="-3" r="2.8"/><circle cx="13" cy="6" r="2.2"/></g>')),
  T_('hjartrosett', 'bow', 'Hjärtrosett', 2, bowD('#ff9ec4', '#ff6fa3', heartP(-15, 0, 0.8, '#fff') + heartP(15, 0, 0.8, '#fff'))),
  T_('guldrosett', 'bow', 'Guldrosett', 3, bowD('#ffd34d', '#e8ac2a', '<path d="M-20-6l8 3M20-6l-8 3" stroke="#fff6c8" stroke-width="3" stroke-linecap="round"/>')),
  T_('sammet', 'bow', 'Sammetsrosett', 3, bowD('#6a45b0', '#3d2a70', '<circle r="3" fill="#d0bcff"/>')),
  T_('stjarnrosett', 'bow', 'Stjärnrosett', 4, bowD('#b9a8f5', '#7a5fd0', `<path d="${starPath(0, 0, 11, 5)}" fill="#ffd34d"/>`)),
  T_('regnrosett', 'bow', 'Regnbågsrosett', 5, (f, top, u) => `<defs><linearGradient id="${u}rb"><stop offset="0" stop-color="#ff7fb0"/><stop offset=".35" stop-color="#ffd25e"/><stop offset=".65" stop-color="#7fd9b2"/><stop offset="1" stop-color="#7fc7ff"/></linearGradient></defs><g transform="translate(146 ${top + 14}) rotate(18) scale(1.15)"><path d="M0 0L-24-14Q-31 0-24 14Z" fill="url(#${u}rb)"/><path d="M0 0L24-14Q31 0 24 14Z" fill="url(#${u}rb)"/><circle r="7" fill="#fff"/></g>`),
  /* kläder */
  T_('halsduk', 'clothes', 'Halsduk', 1, f => { const y = neckY(f); return `<path d="M42 ${y - 6}Q100 ${y + 16} 158 ${y - 6}L156 ${y + 10}Q100 ${y + 32} 44 ${y + 10}Z" fill="#ff9e7a"/><path d="M122 ${y + 14}l6 28 16-6-6-28Z" fill="#ff8a60"/>`; }),
  T_('fluga', 'clothes', 'Fluga', 1, f => { const y = neckY(f); return `<g transform="translate(100 ${y + 8})"><path d="M0 0L-24-13Q-28 0-24 13Z" fill="#7fc7ff" stroke="#4a8fd0" stroke-width="2"/><path d="M0 0L24-13Q28 0 24 13Z" fill="#7fc7ff" stroke="#4a8fd0" stroke-width="2"/><circle r="6" fill="#4a8fd0"/></g>`; }),
  T_('slips', 'clothes', 'Slips', 2, f => { const y = neckY(f); return `<path d="M92 ${y}H108L104 ${y + 10}L112 ${y + 36}L100 ${y + 46}L88 ${y + 36}L96 ${y + 10}Z" fill="#e8536c" stroke="#c23a52" stroke-width="2" stroke-linejoin="round"/>`; }),
  T_('parlor', 'clothes', 'Pärlhalsband', 2, f => { const y = neckY(f); let p = ''; for (let i = 0; i <= 12; i++) { const a = i / 12, x = 54 + a * 92, yy = y + Math.sin(a * Math.PI) * 22; p += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="6" fill="#fffaf2" stroke="#e9dbc6" stroke-width="1.5"/>`; } return p; }),
  T_('medalj', 'clothes', 'Medalj', 3, f => { const y = neckY(f); return `<path d="M76 ${y - 2}L100 ${y + 22}L124 ${y - 2}" stroke="#7fc7ff" stroke-width="8" fill="none"/><circle cx="100" cy="${y + 28}" r="15" fill="#ffd34d" stroke="#e8ac2a" stroke-width="3"/><path d="${starPath(100, y + 28, 8, 3.5)}" fill="#fff6c8"/>`; }),
  T_('tutu', 'clothes', 'Tutu', 3, () => { let p = ''; for (let i = 0; i < 9; i++) { const x = 28 + i * 18; p += `<ellipse cx="${x}" cy="${172 + (i % 2) * 5}" rx="16" ry="20" fill="${i % 2 ? '#ffc4dc' : '#ffa6cc'}"/>`; } return `<path d="M26 156Q100 176 174 156L168 174Q100 192 32 174Z" fill="#ff9ec4"/>` + p; }),
  T_('cape', 'clothes', 'Hjältecape', 3, () => `<path d="M46 86C8 110 4 176 18 196Q60 178 100 192Q140 178 182 196C196 176 192 110 154 86Z" fill="#e8536c"/><path d="M46 86C20 110 14 160 18 196" stroke="#c23a52" stroke-width="4" fill="none"/>`, { back: true }),
  T_('rustning', 'clothes', 'Rustning', 4, f => { const y = neckY(f) - 6; return `<path d="M58 ${y}Q100 ${y + 16} 142 ${y}L148 ${y + 24}Q140 ${y + 52} 100 ${y + 56}Q60 ${y + 52} 52 ${y + 24}Z" fill="#cfd8e4" stroke="#8e9bad" stroke-width="3"/><path d="M100 ${y + 8}V${y + 54}M62 ${y + 26}Q100 ${y + 38} 138 ${y + 26}" stroke="#8e9bad" stroke-width="3" fill="none"/>`; }),
  T_('galaklanning', 'clothes', 'Galaklänning', 4, () => `<path d="M46 142Q100 166 154 142L184 190Q100 206 16 190Z" fill="#3a3a8c"/><g fill="#fff"><circle cx="58" cy="176" r="2.5"/><circle cx="84" cy="164" r="2"/><circle cx="122" cy="178" r="2.5"/><circle cx="146" cy="168" r="2"/><circle cx="100" cy="186" r="2.2"/></g><path d="${starPath(66, 158, 6, 2.6)}" fill="#ffd34d"/><path d="${starPath(138, 186, 6, 2.6)}" fill="#ffd34d"/>`),
  T_('drakkappa', 'clothes', 'Drakkappa', 5, () => `<path d="M40 80C-4 110-6 178 12 198Q56 178 100 194Q144 178 188 198C206 178 204 110 160 80Z" fill="#c2331f"/><g fill="#ffb347"><path d="M30 118l14 8-14 8zM170 118l-14 8 14 8zM22 158l14 8-14 8zM178 158l-14 8 14 8z"/></g>`, { back: true }),
  /* tillbehör */
  T_('ballong', 'acc', 'Ballong', 1, () => `<path d="M170 146Q186 110 178 78" stroke="#9c8fb0" stroke-width="2.5" fill="none"/><ellipse cx="178" cy="50" rx="21" ry="28" fill="#ff8fa8"/><ellipse cx="170" cy="40" rx="6" ry="9" fill="#fff" opacity=".6"/><path d="M173 76h10l-5 7z" fill="#ff8fa8"/>`),
  T_('klubba', 'acc', 'Klubba', 1, () => `<path d="M170 164L178 92" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M170 164L178 92" stroke="#e3dbe9" stroke-width="1.5"/><circle cx="180" cy="74" r="24" fill="#ff9ec4"/><path d="M180 74m-4 0a4 4 0 1 1 8 0a10 10 0 1 1-20 0a16 16 0 1 1 32 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  T_('bok', 'acc', 'Mattebok', 2, () => `<g transform="translate(164 142) rotate(8)"><rect x="-22" y="-28" width="44" height="56" rx="5" fill="#7fd9b2" stroke="#4fbf92" stroke-width="3"/><rect x="-14" y="-18" width="28" height="18" rx="3" fill="#fff"/><text y="-4" text-anchor="middle" font-size="14" fill="#4b3a63">1+1</text></g>`),
  T_('bukett', 'acc', 'Bukett', 2, () => `<path d="M168 168L178 118" stroke="#6bb86a" stroke-width="7" stroke-linecap="round"/>` + [[160, 104, '#ff9ec4'], [182, 96, '#fff1a8'], [196, 114, '#c9b8f0'], [176, 118, '#9fd3ff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="15" fill="${c}"/><circle cx="${x}" cy="${y}" r="5.5" fill="#ffd34d"/>`).join('')),
  T_('lykta', 'acc', 'Spöklykta', 3, () => `<circle cx="174" cy="132" r="34" fill="#fff3a8" opacity=".35"/><path d="M174 92v14" stroke="#6e5a70" stroke-width="4"/><rect x="156" y="106" width="36" height="46" rx="8" fill="#fff3a8" stroke="#6e5a70" stroke-width="4"/><path d="M174 118c-8 10-6 20 0 22 6-2 8-12 0-22z" fill="#ffb347"/>`),
  T_('trollstav', 'acc', 'Trollstav', 3, () => `<path d="M162 168L184 96" stroke="#7a5fd0" stroke-width="7" stroke-linecap="round"/><path d="${starPath(187, 82, 22, 10)}" fill="#ffd34d" stroke="#e8ac2a" stroke-width="3" stroke-linejoin="round"/>`),
  T_('skold', 'acc', 'Sköld', 3, () => `<g transform="translate(26 140)"><path d="M-22-28H22V4Q22 26 0 36Q-22 26-22 4Z" fill="#94c9f5" stroke="#4a8fd0" stroke-width="4" stroke-linejoin="round"/><path d="${starPath(0, 0, 13, 6)}" fill="#fff"/></g>`),
  T_('stjarnstav', 'acc', 'Stjärnstav', 4, () => `<path d="M160 176L186 76" stroke="#ffd34d" stroke-width="8" stroke-linecap="round"/><path d="${starPath(190, 58, 30, 13)}" fill="#fff3a8" stroke="#e8ac2a" stroke-width="3.5" stroke-linejoin="round"/><path d="M170 112q18 4 26 16M166 130q14 4 22 14" stroke="#ff9ec4" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  T_('kristallkula', 'acc', 'Kristallkula', 4, () => `<path d="M152 186h44l-6-14h-32z" fill="#7a5fd0"/><circle cx="174" cy="150" r="27" fill="#c9b8f0" fill-opacity=".75" stroke="#fff" stroke-width="3"/><ellipse cx="165" cy="140" rx="9" ry="6" fill="#fff" opacity=".8"/>`),
  T_('vingar', 'acc', 'Änglavingar', 5, () => mir(`<path d="M52 110C10 96-14 58-10 26C8 44 22 46 32 44C28 62 40 70 50 70C48 84 56 94 70 96Z" fill="#fffaf0" stroke="#ffd34d" stroke-width="3" stroke-linejoin="round"/>`), { back: true })
];
/* ---------- fler föremål: ägs för alltid på kontot, kan bäras av vilken kompis som helst ---------- */
const capD = (c, c2, extra = '') => (f, top) => `<g transform="translate(100 ${top + 12})"><path d="M-46 6C-46-36 46-36 46 6Z" fill="${c}"/><path d="M-22 4C10-6 62-2 76 10C50 20 2 18-22 4Z" fill="${c2}"/><circle cy="-26" r="5" fill="#fff"/>${extra}</g>`;
const crownD = (c, c2, g1, g2, extra = '') => (f, top, u) => `<g transform="translate(100 ${top + 4})"><path d="M-34 4L-40-32L-18-14L0-38L18-14L40-32L34 4Z" fill="${c}" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/><circle cy="-10" r="6" fill="${g1}"/><circle cx="-20" cy="-4" r="4" fill="${g2}"/><circle cx="20" cy="-4" r="4" fill="${g2}"/>${extra}</g>`;
const sunD = (c, c2 = '#fff') => f => { const L = 100 - f.gap, R = 100 + f.gap, y = f.ey; return `<g><rect x="${L - 16}" y="${y - 11}" width="32" height="22" rx="10" fill="${c}"/><rect x="${R - 16}" y="${y - 11}" width="32" height="22" rx="10" fill="${c}"/><path d="M${L + 16} ${y - 3}Q100 ${y - 10} ${R - 16} ${y - 3}" stroke="${c}" stroke-width="4" fill="none"/><path d="M${L - 9} ${y - 3}l8-6M${R - 9} ${y - 3}l8-6" stroke="${c2}" stroke-width="3" stroke-linecap="round" opacity=".8"/></g>`; };
const scarfD = (c, c2, stripes) => f => { const y = neckY(f); return `<path d="M42 ${y - 6}Q100 ${y + 16} 158 ${y - 6}L156 ${y + 10}Q100 ${y + 32} 44 ${y + 10}Z" fill="${c}"/>` + (stripes ? `<path d="M70 ${y + 2}l-3 20M96 ${y + 8}l-3 20M122 ${y + 2}l-3 20" stroke="${stripes}" stroke-width="5" stroke-linecap="round" opacity=".85"/>` : '') + `<path d="M122 ${y + 14}l6 28 16-6-6-28Z" fill="${c2}"/>`; };
const tieD = (c, c2) => f => { const y = neckY(f); return `<g transform="translate(100 ${y + 8})"><path d="M0 0L-24-13Q-28 0-24 13Z" fill="${c}" stroke="${c2}" stroke-width="2"/><path d="M0 0L24-13Q28 0 24 13Z" fill="${c}" stroke="${c2}" stroke-width="2"/><circle r="6" fill="${c2}"/></g>`; };
const capeD = (c, c2, extra = '') => () => `<path d="M46 86C8 110 4 176 18 196Q60 178 100 192Q140 178 182 196C196 176 192 110 154 86Z" fill="${c}"/><path d="M46 86C20 110 14 160 18 196" stroke="${c2}" stroke-width="4" fill="none"/>${extra}`;
const balD = (c, x = 178, dx = 0) => () => `<path d="M170 146Q${186 + dx} 110 ${x} 78" stroke="#9c8fb0" stroke-width="2.5" fill="none"/><ellipse cx="${x}" cy="50" rx="21" ry="28" fill="${c}"/><ellipse cx="${x - 8}" cy="40" rx="6" ry="9" fill="#fff" opacity=".6"/><path d="M${x - 5} 76h10l-5 7z" fill="${c}"/>`;
const wingD = (c, c2, big) => () => mir(`<g transform="${big ? '' : 'translate(52 110) scale(.78) translate(-52 -110)'}"><path d="M52 110C10 96-14 58-10 26C8 44 22 46 32 44C28 62 40 70 50 70C48 84 56 94 70 96Z" fill="${c}" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/>${big ? `<path d="M40 100C18 86 6 62 6 42M48 90C34 80 26 66 24 52" stroke="${c2}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>` : ''}</g>`);
const jetD = (c, c2, fl) => () => [24, 176].map(x => `<rect x="${x - 13}" y="96" width="26" height="62" rx="12" fill="${c}" stroke="${c2}" stroke-width="3"/><rect x="${x - 13}" y="108" width="26" height="8" fill="${c2}"/><path d="M${x - 9} 160Q${x} 200 ${x + 9} 160Z" fill="${fl[0]}"/><path d="M${x - 5} 160Q${x} 188 ${x + 5} 160Z" fill="${fl[1]}"/>`).join('');
const S_ = (id, slot, name, p, draw, x) => Object.assign({ id, slot, name, p, r: p >= 5000 ? 7 : p > 2500 ? 6 : p > 1000 ? 5 : p > 450 ? 4 : p > 120 ? 3 : p > 30 ? 2 : 1, shop: true, draw }, x || {});
const RBW = (u, k) => `<defs><linearGradient id="${u}${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7fb0"/><stop offset=".25" stop-color="#ffd25e"/><stop offset=".5" stop-color="#7fd9b2"/><stop offset=".75" stop-color="#7fc7ff"/><stop offset="1" stop-color="#b48cff"/></linearGradient></defs>`;
const SHOP_ITEMS = [
  /* hattar */
  S_('k_rosa', 'hat', 'Rosa keps', 15, capD('#ff9ec4', '#e86a9a')),
  S_('k_gron', 'hat', 'Grön keps', 15, capD('#7fd9b2', '#4fbf92')),
  S_('k_gul', 'hat', 'Gul keps', 15, capD('#ffdc6b', '#efbf3f')),
  S_('k_lila', 'hat', 'Lila keps', 20, capD('#b9a8f5', '#8f78e0')),
  S_('k_rod', 'hat', 'Röd keps', 20, capD('#ff7a7a', '#d84a4a')),
  S_('k_svart', 'hat', 'Svart keps', 40, capD('#4a3d5c', '#2c2238')),
  S_('k_regn', 'hat', 'Regnbågskeps', 180, (f, top, u) => RBW(u, 'ck') + capD(`url(#${u}ck)`, '#fff')(f, top)),
  S_('k_guld', 'hat', 'Guldkeps', 450, capD('#ffd34d', '#e8ac2a', '<path d="M-30-6Q0-20 30-6" stroke="#fff6c8" stroke-width="3" fill="none" stroke-linecap="round"/>')),
  S_('solhatt', 'hat', 'Solhatt', 35, (f, top) => `<g transform="translate(100 ${top + 14})"><ellipse cy="2" rx="74" ry="16" fill="#f2d08a" stroke="#d9a94f" stroke-width="3"/><path d="M-36 2C-36-34 36-34 36 2Z" fill="#f7dc9c" stroke="#d9a94f" stroke-width="3"/><path d="M-36-6Q0 4 36-6" stroke="#ff8fb8" stroke-width="7" fill="none"/></g>`),
  S_('hjalm', 'hat', 'Cykelhjälm', 45, (f, top) => `<g transform="translate(100 ${top + 16})"><path d="M-52 6C-52-44 52-44 52 6Z" fill="#ff9e5a" stroke="#d9783a" stroke-width="3"/><path d="M-26-30L-20 4M0-36V4M26-30L20 4" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/></g>`),
  S_('kattoron', 'hat', 'Kattöron', 90, (f, top) => `<path d="M46 ${top + 30}L56 ${top - 14}L92 ${top + 12}Z" fill="#ffb3d1" stroke="#e86a9a" stroke-width="3" stroke-linejoin="round"/><path d="M54 ${top + 20}L58 ${top - 2}L76 ${top + 12}Z" fill="#fff" opacity=".7"/><path d="M154 ${top + 30}L144 ${top - 14}L108 ${top + 12}Z" fill="#ffb3d1" stroke="#e86a9a" stroke-width="3" stroke-linejoin="round"/><path d="M146 ${top + 20}L142 ${top - 2}L124 ${top + 12}Z" fill="#fff" opacity=".7"/>`),
  S_('haroron', 'hat', 'Kaninöron', 90, (f, top) => `<ellipse cx="66" cy="${top - 14}" rx="13" ry="38" fill="#fff" stroke="#e3dbe9" stroke-width="3" transform="rotate(-10 66 ${top + 10})"/><ellipse cx="66" cy="${top - 10}" rx="6" ry="26" fill="#ffc4dc" transform="rotate(-10 66 ${top + 10})"/><ellipse cx="134" cy="${top - 14}" rx="13" ry="38" fill="#fff" stroke="#e3dbe9" stroke-width="3" transform="rotate(10 134 ${top + 10})"/><ellipse cx="134" cy="${top - 10}" rx="6" ry="26" fill="#ffc4dc" transform="rotate(10 134 ${top + 10})"/>`),
  S_('cylinder', 'hat', 'Fin hatt', 120, (f, top) => `<g transform="translate(100 ${top + 10})"><ellipse cy="4" rx="54" ry="11" fill="#3b2b4a"/><rect x="-32" y="-44" width="64" height="48" rx="6" fill="#4a3d5c"/><rect x="-32" y="-12" width="64" height="12" fill="#ff7aa8"/></g>`),
  S_('glasstop', 'hat', 'Glasstrut', 70, (f, top) => `<g transform="translate(100 ${top + 6})"><circle cx="0" cy="-14" r="22" fill="#ffb3d1"/><circle cx="-16" cy="-2" r="14" fill="#fff"/><circle cx="16" cy="-2" r="14" fill="#c9f2ff"/><circle cy="-38" r="6" fill="#ff5e7a"/></g>`),
  S_('hjartband', 'hat', 'Hjärtpannband', 250, (f, top) => `<path d="M34 ${top + 38}Q100 ${top - 8} 166 ${top + 38}" stroke="#ff9ec4" stroke-width="8" fill="none" stroke-linecap="round"/>` + [[100, top + 3, 1.7], [64, top + 15, 1.2], [136, top + 15, 1.2]].map(([x, y, s]) => heartP(x, y, s * 2, '#ff5e8a')).join('')),
  S_('astro', 'hat', 'Rymdhjälm', 900, (f, top) => `<path d="M28 ${top + 80}Q22 ${top - 34} 100 ${top - 36}Q178 ${top - 34} 172 ${top + 80}" fill="#bfe6ff" fill-opacity=".28" stroke="#e8f2fb" stroke-width="9" stroke-linecap="round"/><path d="M56 ${top + 6}Q70 ${top - 12} 92 ${top - 14}" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>`),
  S_('krona_s', 'hat', 'Silverkrona', 700, crownD('#e8eef6', '#aab6c6', '#9fd3ff', '#fff')),
  S_('krona_r', 'hat', 'Rubinkrona', 1500, crownD('#ffd34d', '#e8ac2a', '#ff3a5e', '#ff7a98', '<path d="M-24 0H24" stroke="#fff6c8" stroke-width="3"/>')),
  S_('krona_d', 'hat', 'Diamantkrona', 3000, crownD('#c9f2ff', '#5fc0e0', '#fff', '#8fdcf2', '<path d="M-34-32l-4-8M0-38v-10M40-32l4-8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')),
  S_('krona_x', 'hat', 'Regnbågskrona', 5000, (f, top, u) => RBW(u, 'kx') + crownD(`url(#${u}kx)`, '#ffd34d', '#fff', '#ffd34d', '<circle cx="-40" cy="-32" r="4" fill="#fff"/><circle cx="40" cy="-32" r="4" fill="#fff"/><circle cy="-38" r="4" fill="#fff"/>')(f, top, u)),
  /* glasögon */
  S_('sol_rosa', 'glasses', 'Rosa solglasögon', 30, sunD('#ff8fb8')),
  S_('sol_gul', 'glasses', 'Gula solglasögon', 30, sunD('#ffd34d')),
  S_('sol_bla', 'glasses', 'Blå solglasögon', 30, sunD('#6aaee6')),
  S_('kattglas', 'glasses', 'Kattglasögon', 80, f => { const L = 100 - f.gap, R = 100 + f.gap, y = f.ey; return `<g fill="#fff" fill-opacity=".25" stroke="#ff6fa3" stroke-width="4.5" stroke-linejoin="round"><path d="M${L - 20} ${y - 14}L${L + 16} ${y - 8}Q${L + 18} ${y + 14} ${L - 4} ${y + 14}Q${L - 20} ${y + 12} ${L - 20} ${y - 14}Z"/><path d="M${R + 20} ${y - 14}L${R - 16} ${y - 8}Q${R - 18} ${y + 14} ${R + 4} ${y + 14}Q${R + 20} ${y + 12} ${R + 20} ${y - 14}Z"/></g><path d="M${L + 16} ${y - 4}H${R - 16}" stroke="#ff6fa3" stroke-width="4"/>`; }),
  S_('hjaltemask', 'glasses', 'Hjältemask', 150, f => { const y = f.ey, x = 100 - f.gap - 26, w = f.gap * 2 + 52; return `<path d="M${x} ${y - 14}Q100 ${y - 26} ${x + w} ${y - 14}L${x + w - 4} ${y + 12}Q100 ${y + 4} ${x + 4} ${y + 12}Z" fill="#7a5fd0" stroke="#5f46b8" stroke-width="3" stroke-linejoin="round"/><ellipse cx="${100 - f.gap}" cy="${y}" rx="13" ry="10" fill="#fff"/><ellipse cx="${100 + f.gap}" cy="${y}" rx="13" ry="10" fill="#fff"/>`; }),
  S_('robot', 'glasses', 'Robotvisir', 300, f => { const y = f.ey, x = 100 - f.gap - 24, w = f.gap * 2 + 48; return `<rect x="${x}" y="${y - 15}" width="${w}" height="30" rx="8" fill="#2c3a52" stroke="#9fb4d4" stroke-width="3.5"/><g fill="#6fffd8"><rect x="${x + 8}" y="${y - 6}" width="${w / 2 - 14}" height="12" rx="4"/><rect x="${x + w / 2 + 6}" y="${y - 6}" width="${w / 2 - 14}" height="12" rx="4"/></g>`; }),
  S_('guldglas', 'glasses', 'Guldglasögon', 900, f => { const L = 100 - f.gap, R = 100 + f.gap, y = f.ey; return `<g fill="#fff6c8" fill-opacity=".3" stroke="#e8ac2a" stroke-width="5"><circle cx="${L}" cy="${y}" r="18"/><circle cx="${R}" cy="${y}" r="18"/></g><path d="M${L + 18} ${y}H${R - 18}" stroke="#e8ac2a" stroke-width="5"/><path d="M${L - 8} ${y - 8}l7-5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`; }),
  S_('regnglas', 'glasses', 'Regnbågsrunda', 1200, (f, top, u) => { const L = 100 - f.gap, R = 100 + f.gap, y = f.ey; return RBW(u, 'rg') + `<g fill="#fff" fill-opacity=".2" stroke="url(#${u}rg)" stroke-width="6"><circle cx="${L}" cy="${y}" r="18"/><circle cx="${R}" cy="${y}" r="18"/></g><path d="M${L + 18} ${y}H${R - 18}" stroke="url(#${u}rg)" stroke-width="6"/>`; }),
  /* rosetter */
  S_('r_gul', 'bow', 'Gul rosett', 15, bowD('#ffd34d', '#e8ac2a')),
  S_('r_gron', 'bow', 'Grön rosett', 15, bowD('#7fd9b2', '#4fbf92')),
  S_('r_lila', 'bow', 'Lila rosett', 15, bowD('#b9a8f5', '#8f78e0')),
  S_('r_rod', 'bow', 'Röd rosett', 15, bowD('#ff7a7a', '#d84a4a')),
  S_('r_vit', 'bow', 'Vit rosett', 15, bowD('#ffffff', '#cfc6dc')),
  S_('r_glitter', 'bow', 'Glitterrosett', 90, bowD('#ff9ec4', '#e86a9a', '<g fill="#fff"><path d="M-17-4l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/><path d="M16 2l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z"/></g>')),
  S_('r_parl', 'bow', 'Pärlrosett', 200, bowD('#fffaf2', '#e0cfb0', '<circle cx="-16" cy="0" r="3.5" fill="#fff" stroke="#e0cfb0"/><circle cx="16" cy="0" r="3.5" fill="#fff" stroke="#e0cfb0"/>')),
  S_('r_rubin', 'bow', 'Rubinrosett', 400, bowD('#ff3a5e', '#b8203e', '<circle r="3.5" fill="#ffc4d0"/>')),
  S_('r_diamant', 'bow', 'Diamantrosett', 700, bowD('#c9f2ff', '#5fc0e0', '<path d="M0-5L5 0L0 5L-5 0Z" fill="#fff"/>')),
  S_('r_regn', 'bow', 'Stor regnbågsrosett', 1800, (f, top, u) => RBW(u, 'rr') + `<g transform="translate(146 ${top + 14}) rotate(18) scale(1.35)"><path d="M0 0L-24-14Q-31 0-24 14Z" fill="url(#${u}rr)" stroke="#fff" stroke-width="2"/><path d="M0 0L24-14Q31 0 24 14Z" fill="url(#${u}rr)" stroke="#fff" stroke-width="2"/><circle r="7" fill="#fff"/></g>`),
  /* kläder */
  S_('h_gul', 'clothes', 'Gul halsduk', 15, scarfD('#ffd34d', '#efb92c')),
  S_('h_gron', 'clothes', 'Grön halsduk', 15, scarfD('#7fd9b2', '#4fbf92')),
  S_('h_lila', 'clothes', 'Lila halsduk', 15, scarfD('#b9a8f5', '#8f78e0')),
  S_('h_rand', 'clothes', 'Randig halsduk', 25, scarfD('#ff8fb8', '#e86a9a', '#fff')),
  S_('fl_rod', 'clothes', 'Röd fluga', 15, tieD('#ff7a7a', '#d84a4a')),
  S_('fl_gron', 'clothes', 'Grön fluga', 15, tieD('#7fd9b2', '#4fbf92')),
  S_('fl_guld', 'clothes', 'Guldfluga', 200, tieD('#ffd34d', '#e8ac2a')),
  S_('hjarthals', 'clothes', 'Hjärthalsband', 80, f => { const y = neckY(f); return `<path d="M54 ${y - 2}Q100 ${y + 26} 146 ${y - 2}" stroke="#ff9ec4" stroke-width="4" fill="none"/>` + heartP(100, y + 24, 3.6, '#ff5e8a'); }),
  S_('guldkedja', 'clothes', 'Guldkedja', 500, f => { const y = neckY(f); let p = ''; for (let i = 0; i <= 14; i++) { const a = i / 14, x = 52 + a * 96, yy = y + Math.sin(a * Math.PI) * 24; p += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="4.5" fill="none" stroke="#e8ac2a" stroke-width="3"/>`; } return p + `<circle cx="100" cy="${y + 32}" r="9" fill="#ffd34d" stroke="#e8ac2a" stroke-width="3"/>`; }),
  S_('diamanthals', 'clothes', 'Diamanthalsband', 1500, f => { const y = neckY(f); let p = ''; for (let i = 0; i <= 10; i++) { const a = i / 10, x = 56 + a * 88, yy = y + Math.sin(a * Math.PI) * 22; p += `<path d="M${x.toFixed(0)} ${(yy - 6).toFixed(0)}l5 6-5 6-5-6z" fill="#c9f2ff" stroke="#5fc0e0" stroke-width="2"/>`; } return p; }),
  S_('c_bla', 'clothes', 'Blå cape', 150, capeD('#6aaee6', '#3f7fc0'), { back: true }),
  S_('c_lila', 'clothes', 'Lila cape', 150, capeD('#9a78f0', '#6a45b0'), { back: true }),
  S_('c_gron', 'clothes', 'Grön cape', 150, capeD('#6fdc9a', '#3fb070'), { back: true }),
  S_('c_stjarn', 'clothes', 'Stjärncape', 400, capeD('#3a3a8c', '#25256a', '<g fill="#ffd34d"><circle cx="38" cy="130" r="3"/><circle cx="162" cy="140" r="3"/><circle cx="52" cy="170" r="2.5"/><circle cx="150" cy="176" r="2.5"/><circle cx="100" cy="186" r="2.5"/></g>'), { back: true }),
  S_('c_kung', 'clothes', 'Kungacape', 1200, capeD('#c2331f', '#8f2012', '<path d="M46 86Q100 104 154 86L152 100Q100 118 48 100Z" fill="#fff"/><g fill="#3b2b4a"><circle cx="70" cy="100" r="2.5"/><circle cx="100" cy="106" r="2.5"/><circle cx="130" cy="100" r="2.5"/></g>'), { back: true }),
  S_('c_regn', 'clothes', 'Regnbågscape', 2500, (f, top, u) => RBW(u, 'cr') + capeD(`url(#${u}cr)`, '#fff')(f, top, u), { back: true }),
  /* tillbehör */
  S_('b_bla', 'acc', 'Blå ballong', 15, balD('#6aaee6')),
  S_('b_gron', 'acc', 'Grön ballong', 15, balD('#7fd9b2')),
  S_('b_gul', 'acc', 'Gul ballong', 15, balD('#ffd34d')),
  S_('b_regn', 'acc', 'Ballongbukett', 60, () => balD('#ff8fa8', 168, -6)() + balD('#7fc7ff', 186, 8)()),
  S_('glass', 'acc', 'Glass', 20, () => `<path d="M170 124L178 168L186 124Z" fill="#f2c98a" stroke="#d9a050" stroke-width="2.5" stroke-linejoin="round"/><circle cx="178" cy="112" r="16" fill="#ffb3d1"/><circle cx="170" cy="100" r="10" fill="#fff"/><circle cx="180" cy="90" r="5" fill="#ff5e7a"/>`),
  S_('nalle', 'acc', 'Nalle', 90, () => `<g transform="translate(168 150)"><circle cx="-16" cy="-34" r="8" fill="#c49a6c"/><circle cx="16" cy="-34" r="8" fill="#c49a6c"/><circle cy="-22" r="20" fill="#d9b080"/><ellipse cy="-16" rx="9" ry="7" fill="#f2dcc0"/><circle cx="-7" cy="-26" r="2.5" fill="#3b2b4a"/><circle cx="7" cy="-26" r="2.5" fill="#3b2b4a"/><circle cy="-18" r="2.5" fill="#3b2b4a"/><ellipse cy="14" rx="18" ry="22" fill="#d9b080"/></g>`),
  S_('ryggsack', 'acc', 'Ryggsäck', 45, () => `<rect x="156" y="100" width="44" height="62" rx="14" fill="#ff9e5a" stroke="#d9783a" stroke-width="3"/><rect x="170" y="130" width="28" height="22" rx="6" fill="#ffc48a" stroke="#d9783a" stroke-width="2.5"/>`, { back: true }),
  S_('paraply', 'acc', 'Regnbågsparaply', 120, (f, top, u) => RBW(u, 'pa') + `<path d="M178 170L178 90" stroke="#7a5fd0" stroke-width="5" stroke-linecap="round"/><path d="M142 92Q178 40 214 92Q196 84 178 92Q160 84 142 92Z" fill="url(#${u}pa)" stroke="#fff" stroke-width="2"/>`),
  S_('trofe', 'acc', 'Guldpokal', 700, () => `<g transform="translate(172 130)"><path d="M-18-30H18V-8Q18 8 0 12Q-18 8-18-8Z" fill="#ffd34d" stroke="#e8ac2a" stroke-width="3"/><path d="M-18-24Q-32-24-30-10Q-28 0-18-2M18-24Q32-24 30-10Q28 0 18-2" stroke="#e8ac2a" stroke-width="3" fill="none"/><rect x="-5" y="12" width="10" height="14" fill="#e8ac2a"/><rect x="-14" y="26" width="28" height="8" rx="3" fill="#e8981a"/><path d="${starPath(0, -12, 8, 3.5)}" fill="#fff6c8"/></g>`),
  S_('fjaril', 'acc', 'Fjärilsvingar', 400, wingD('#ffb3d1', '#e86a9a', false), { back: true }),
  S_('jetpack', 'acc', 'Jetpack', 800, jetD('#c9d4e6', '#7f8fa8', ['#ffb347', '#fff3a8']), { back: true }),
  S_('drakving', 'acc', 'Drakvingar', 1500, wingD('#7a5fd0', '#4a2f9a', true), { back: true }),
  S_('regnving', 'acc', 'Regnbågsvingar', 3000, (f, top, u) => RBW(u, 'rw') + wingD(`url(#${u}rw)`, '#fff', true)(), { back: true }),
  S_('guldjet', 'acc', 'Guldjetpack', 5000, jetD('#ffd34d', '#e8981a', ['#ff7a3a', '#fff3a8']), { back: true })
];
SHOP_ITEMS.forEach(t => TREATS.push(t));

TREATS.forEach(t => { t.bon = {}; const pts = RAR_BONUS[t.r], w = SLOT_STATS[t.slot]; for (const k in w) t.bon[k] = Math.round(pts * w[k]); });
const TREAT_BY = Object.fromEntries(TREATS.map(t => [t.id, t]));

/* ---------- varje nivå har eget utseende ---------- */
const TW = (x, y, r, c) => `<path class="tw" d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;
const SHEEN = '<path d="M46 150Q40 92 92 62" stroke="#fff" stroke-width="13" fill="none" stroke-linecap="round" opacity=".32"/>';
function tierBack(T, u) {
  if (T === 3) return `<circle cx="100" cy="112" r="99" fill="url(#${u}a)"/>`;
  if (T === 4) return `<circle cx="100" cy="112" r="99" fill="url(#${u}a)"/>`;
  if (T === 5) return `<circle cx="100" cy="112" r="99" fill="url(#${u}a)"/>`;
  if (T === 6) { let d = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 78 : 106; d += (i ? 'L' : 'M') + (100 + Math.cos(a) * r).toFixed(0) + ' ' + (112 + Math.sin(a) * r).toFixed(0); } return `<path d="${d}Z" fill="#7a3fc4" opacity=".55"/><circle cx="100" cy="112" r="96" fill="url(#${u}a)"/>`; }
  if (T === 8) { let d = ''; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 84 : 112; d += (i ? 'L' : 'M') + (100 + Math.cos(a) * r).toFixed(0) + ' ' + (112 + Math.sin(a) * r).toFixed(0); } return `<path d="${d}Z" fill="#ffd34d" opacity=".65"/><circle cx="100" cy="112" r="94" fill="url(#${u}a)"/>`; }
  return '';
}
function tierDeco(T) {
  switch (T) {
    case 1: return SHEEN + TW(152, 74, 8, '#fff');
    case 2: return SHEEN + TW(152, 72, 11, '#fff8d0') + TW(44, 106, 7, '#fff8d0');
    case 3: return SHEEN + TW(156, 70, 12, '#fff') + TW(40, 100, 9, '#c9f2ff') + TW(166, 136, 7, '#fff');
    case 4: return TW(156, 66, 12, '#fff') + TW(36, 100, 9, '#fff3a8') + TW(170, 138, 8, '#c9f2ff') + TW(34, 150, 7, '#ffd0e6');
    case 5: return TW(156, 68, 11, '#fff') + `<g class="tw">${heartP(40, 96, 1.5, '#ff6fb8')}</g><g class="tw">${heartP(166, 132, 1.3, '#ff6fb8')}</g>`;
    case 6: return TW(158, 70, 7, '#c9a8ff') + TW(40, 98, 6, '#c9a8ff');
    case 7: return TW(154, 70, 6, '#fff');
    case 8: return SHEEN + TW(158, 66, 14, '#fff') + TW(36, 96, 11, '#fff3a8') + TW(172, 140, 9, '#fff3a8') + TW(30, 152, 8, '#fff');
  }
  return '';
}
const AURA = { 3: '#b3ecff', 4: '#ffc3e3', 5: '#ffb3e6', 6: '#5b2fb0', 8: '#ffb347', 9: '#fff3a0', 10: '#b7f07a', 11: '#e2c8ff', 12: '#fff8d0', 13: '#ffd34d' };
let UID = 0;

/* ---------- kamouflage (köps med bosspoäng) ---------- */
const PT = (k, w, h, inner) => `<pattern id="${k}" patternUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">${inner}</pattern>`;
const SKINS = [
  { id: 'skin_dalm', name: 'Dalmatiner', p: 5, def: k => PT(k, 56, 56, '<rect width="56" height="56" fill="#fff"/><g fill="#2b2433"><circle cx="12" cy="14" r="6"/><circle cx="38" cy="34" r="8"/><circle cx="44" cy="10" r="4"/><circle cx="14" cy="46" r="4.5"/></g>') },
  { id: 'skin_ko', name: 'Kosmåla', p: 5, def: k => PT(k, 100, 100, '<rect width="100" height="100" fill="#fff"/><g fill="#4a3b36"><path d="M8 22Q26 -2 42 24Q38 52 12 44Z"/><path d="M60 62Q84 46 98 70Q90 96 64 90Z"/><path d="M62 6Q80-2 92 14Q84 30 66 24Z"/></g>') },
  { id: 'skin_skog', name: 'Skogskamo', p: 8, def: k => PT(k, 80, 80, '<rect width="80" height="80" fill="#6b8e4e"/><path d="M0 20Q20 0 34 18Q40 40 16 44Q-4 40 0 20Z" fill="#3f5a2e"/><path d="M44 8Q70 0 78 24Q66 40 48 30Z" fill="#8aa862"/><path d="M30 52Q56 40 70 60Q60 80 36 76Z" fill="#2d3d21"/><path d="M0 62Q14 52 22 70Q14 84 2 80Z" fill="#8aa862"/>') },
  { id: 'skin_oken', name: 'Ökenkamo', p: 8, def: k => PT(k, 80, 80, '<rect width="80" height="80" fill="#d9c08a"/><path d="M0 20Q20 0 34 18Q40 40 16 44Q-4 40 0 20Z" fill="#b99a5b"/><path d="M44 8Q70 0 78 24Q66 40 48 30Z" fill="#efdcae"/><path d="M30 52Q56 40 70 60Q60 80 36 76Z" fill="#8a6f3a"/><path d="M0 62Q14 52 22 70Q14 84 2 80Z" fill="#efdcae"/>') },
  { id: 'skin_sno', name: 'Snökamo', p: 10, def: k => PT(k, 80, 80, '<rect width="80" height="80" fill="#f4f8ff"/><path d="M0 20Q20 0 34 18Q40 40 16 44Q-4 40 0 20Z" fill="#cfdcf0"/><path d="M44 8Q70 0 78 24Q66 40 48 30Z" fill="#aec3e0"/><path d="M30 52Q56 40 70 60Q60 80 36 76Z" fill="#dbe6f6"/>') },
  { id: 'skin_tiger', name: 'Tigerrandig', p: 15, def: k => PT(k, 60, 44, '<rect width="60" height="44" fill="#ffa23a"/><g stroke="#2b2433" stroke-width="6" fill="none" stroke-linecap="round"><path d="M-4 10Q15 -2 30 10T64 10"/><path d="M-4 34Q15 22 30 34T64 34"/></g>') },
  { id: 'skin_leo', name: 'Leopard', p: 15, def: k => PT(k, 48, 48, '<rect width="48" height="48" fill="#f4c46a"/><g fill="#e09a3a" stroke="#3b2b2b" stroke-width="3.5"><circle cx="11" cy="11" r="6.5"/><circle cx="35" cy="28" r="7"/><circle cx="9" cy="38" r="5"/><circle cx="40" cy="6" r="4.5"/></g>') },
  { id: 'skin_zebra', name: 'Zebra', p: 15, def: k => PT(k, 44, 44, '<rect width="44" height="44" fill="#fff"/><path d="M-10 32L32 -10M12 54L54 12" stroke="#2b2433" stroke-width="10"/>') },
  { id: 'skin_hjart', name: 'Hjärtmönster', p: 20, def: k => PT(k, 36, 36, '<rect width="36" height="36" fill="#ffb8d6"/><path d="M18 28C4 17 9 7 18 14C27 7 32 17 18 28Z" fill="#fff"/>') },
  { id: 'skin_regn', name: 'Regnbåge', p: 30, def: k => `<pattern id="${k}" patternUnits="userSpaceOnUse" x="0" y="0" width="60" height="60" patternTransform="rotate(35)">${['#ff7fb0', '#ffa94d', '#ffe066', '#6fdc9a', '#6fc3ff', '#b48cff'].map((c, i) => `<rect y="${i * 10}" width="60" height="10.5" fill="${c}"/>`).join('')}</pattern>` },
  { id: 'skin_galax', name: 'Galax', p: 40, def: k => PT(k, 70, 70, '<rect width="70" height="70" fill="#241a52"/><circle cx="20" cy="20" r="18" fill="#ff7ac8" opacity=".25"/><circle cx="52" cy="48" r="16" fill="#6fc3ff" opacity=".22"/><g fill="#fff"><circle cx="10" cy="44" r="1.6"/><circle cx="34" cy="10" r="1.3"/><circle cx="60" cy="14" r="1.8"/><circle cx="40" cy="60" r="1.4"/><circle cx="24" cy="32" r="1"/></g><path d="M54 24l1.8 3.6 3.8.6-2.8 2.6.7 3.8-3.5-1.9-3.5 1.9.7-3.8-2.8-2.6 3.8-.6z" fill="#ffe066"/>') },
  { id: 'skin_guld', name: 'Guld', p: 60, def: k => PT(k, 50, 50, '<rect width="50" height="50" fill="#f2b92c"/><path d="M-10 40L40 -10M10 60L60 10" stroke="#fff3a8" stroke-width="12" opacity=".55"/><path d="M38 38l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#fff"/>') }
];
SKINS.forEach(k => { k.r = k.p <= 8 ? 2 : k.p <= 20 ? 3 : k.p <= 40 ? 4 : 5; k.bon = {}; k.skin = true; });
const SKIN_BY = Object.fromEntries(SKINS.map(k => [k.id, k]));
const itemBy = id => TREAT_BY[id] || SKIN_BY[id];
function sqSVG(id, opt = {}) {
  const s = SQ_BY[id] || SQ[0], T = s.tier, u = 'q' + (++UID), parts = (KINDS[s.kind] || KINDS.blob)(s, u);
  const f = Object.assign({ ey: 112, gap: 24, mouth: 'smile' }, parts.face || {});
  if (T === 6) { f.ink = '#f2e6ff'; f.glow = '#b58bff'; f.cheeks = false; }
  if (T === 7) { f.ink = '#49607a'; }
  if (opt.angry) { f.angry = true; f.cheeks = false; if (T === 6) { f.ink = '#ffd34d'; f.glow = '#ff5e3a'; } }
  const top = parts.top == null ? 50 : parts.top, tr = opt.treats || {};
  const grad = T === 4 && !opt.angry
    ? `<linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb3c9"/><stop offset=".22" stop-color="#ffd9a0"/><stop offset=".42" stop-color="#fff3a0"/><stop offset=".62" stop-color="#b8f0c0"/><stop offset=".82" stop-color="#a8d8ff"/><stop offset="1" stop-color="#d4b8ff"/></linearGradient>`
    : `<radialGradient id="${u}g" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${light(s.c, 0.6)}"/><stop offset=".55" stop-color="${s.c}"/><stop offset="1" stop-color="${dark(s.c, 0.14)}"/></radialGradient>`;
  const aura = AURA[T] ? `<radialGradient id="${u}a"><stop offset=".55" stop-color="${AURA[T]}" stop-opacity=".75"/><stop offset="1" stop-color="${AURA[T]}" stop-opacity="0"/></radialGradient>` : '';
  let skDef = '';
  const sk = SKIN_BY[tr.skin];
  if (sk) {
    const G = 'fill="url(#' + u + 'g)"', K = 'fill="url(#' + u + 'sk)"', shade = [];
    ['back', 'body', 'front'].forEach(kk => { if (parts[kk]) { (parts[kk].match(/<path[^>]*>/g) || []).forEach(m => { if (m.indexOf(G) >= 0) shade.push(m.replace(G, G + ' fill-opacity=".3"')); }); parts[kk] = parts[kk].split(G).join(K); } });
    parts.skShade = shade.join(''); skDef = sk.def(u + 'sk');
  }
  const draw = (slot, back) => { const t = TREAT_BY[tr[slot]]; if (!t || !!t.back !== back) return ''; return t.draw(f, top, u); };
  const backs = SLOTS.map(sl => draw(sl, true)).join('');
  const inner = (parts.back || '') + (parts.body || '') + (parts.front || '') + (parts.skShade || '') + tierDeco(T)
    + draw('clothes', false) + faceSVG(f) + draw('glasses', false) + draw('bow', false) + draw('hat', false) + draw('acc', false);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${grad}${aura}${skDef}${parts.defs || ''}</defs>${tierBack(T, u)}${backs}${T === 7 ? `<g opacity=".8">${inner}</g>` : inner}</svg>`;
}
function instSVG(inst) { return sqSVG(inst.s, { treats: inst.t }); }
function tierBadge(T) { return `<span class="tbadge t${T}">${TIERS[T].name}</span>`; }
const EGG_P = 'M100 8C150 8 186 96 186 156C186 210 146 242 100 242C54 242 14 210 14 156C14 96 50 8 100 8Z';
const CRACKS = ['M100 60L88 82L106 96L92 118', 'M92 118L72 126L60 148', 'M106 96L134 104L146 130', 'M92 118L114 140L104 168L124 190', 'M60 148L42 158M146 130L166 142M104 168L82 186L74 214'];
function eggPattern(T) {
  switch (T) {
    case 0: return '<g fill="#a86a38" opacity=".45"><circle cx="70" cy="110" r="12"/><circle cx="130" cy="86" r="9"/><circle cx="128" cy="170" r="14"/><circle cx="64" cy="186" r="8"/></g>';
    case 1: return '<g stroke="#fff" stroke-width="10" opacity=".7" fill="none"><path d="M34 120Q100 150 166 120"/><path d="M22 176Q100 208 178 176"/></g>';
    case 2: return `<g fill="#fff6c8"><path d="${starPath(70, 110, 20, 9)}"/><path d="${starPath(134, 90, 14, 6)}"/><path d="${starPath(130, 176, 22, 10)}"/><path d="${starPath(62, 188, 12, 5)}"/></g>`;
    case 3: return '<g fill="#fff" opacity=".85"><path d="M70 90l16 24-16 24-16-24z"/><path d="M134 110l12 18-12 18-12-18z"/><path d="M100 170l18 26-18 26-18-26z"/></g>';
    case 4: return '<g fill="none" stroke-width="11" opacity=".9"><path d="M30 190Q100 80 170 190" stroke="#ff8fb0"/><path d="M46 196Q100 112 154 196" stroke="#ffd25e"/><path d="M62 202Q100 142 138 202" stroke="#7fd9b2"/></g>';
    case 5: return heartP(70, 104, 3.2, '#fff') + heartP(134, 90, 2.4, '#fff') + heartP(128, 170, 3.6, '#fff') + heartP(62, 182, 2.2, '#fff');
    case 6: return '<g fill="#b58bff"><path d="M76 72L54 126H78L62 176L112 108H86L104 72Z"/><path d="M146 122L130 152H144L134 186L164 144H150L160 122Z" opacity=".75"/></g>';
    case 7: return '<g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"><path d="M60 100c20-24 44-4 28 12c-10 10-26-2-16-12"/><path d="M122 150c20-24 44-4 28 12c-10 10-26-2-16-12"/><path d="M62 190q20-14 40 0t40 0"/></g>';
    case 9: return '<g fill="#d9a010" opacity=".5"><ellipse cx="68" cy="100" rx="12" ry="8"/><ellipse cx="136" cy="84" rx="9" ry="6"/><ellipse cx="128" cy="168" rx="14" ry="9"/><ellipse cx="62" cy="180" rx="9" ry="6"/><ellipse cx="100" cy="132" rx="6" ry="4"/></g>';
    case 10: return '<g fill="#3a7a2a" opacity=".55"><path d="M40 120l14-14 14 14 14-14 14 14 14-14 14 14 14-14 14 14"/><circle cx="70" cy="84" r="11"/><circle cx="136" cy="168" r="13"/><circle cx="64" cy="188" r="8"/></g><path d="M30 150l14-14 14 14 14-14 14 14 14-14 14 14 14-14 14 14" fill="none" stroke="#3a7a2a" stroke-width="7" opacity=".6"/>';
    case 11: return '<g fill="none" stroke-width="10" opacity=".9"><path d="M30 130Q100 90 170 130" stroke="#ff8fd0"/><path d="M26 160Q100 120 174 160" stroke="#9fd3ff"/><path d="M30 190Q100 150 170 190" stroke="#ffe27a"/></g>' + `<path d="${starPath(100, 96, 16, 7)}" fill="#fff"/>`;
    case 12: return '<g fill="none" stroke="#ffd34d" stroke-width="9" opacity=".9"><ellipse cx="100" cy="80" rx="30" ry="9"/></g><g fill="#fff" opacity=".95"><path d="M20 160Q50 110 96 150Q60 150 36 178Z"/><path d="M180 160Q150 110 104 150Q140 150 164 178Z"/></g>';
    case 13: return `<g fill="#ffd34d"><path d="${starPath(70, 100, 18, 8)}"/><path d="${starPath(138, 84, 12, 5)}"/><path d="${starPath(132, 170, 20, 9)}"/><path d="${starPath(62, 188, 11, 5)}"/></g><g fill="#fff" opacity=".8"><circle cx="100" cy="140" r="3"/><circle cx="40" cy="150" r="2.5"/><circle cx="160" cy="130" r="2.5"/><circle cx="104" cy="206" r="3"/></g>`;
    case 8: return '<g><path d="M100 226C60 214 54 170 74 150C74 166 84 170 88 164C80 142 96 118 116 108C110 130 128 136 132 162C140 156 142 146 140 138C156 164 146 214 100 226Z" fill="#ffd34d" opacity=".95"/><path d="M100 222C78 212 76 186 90 176C92 188 100 190 104 184C102 170 110 160 118 156C116 176 128 182 124 202C120 214 110 220 100 222Z" fill="#ff5e3a"/></g>';
  }
}
function eggSVG(T, cr = 0) {
  const c = TIERS[T].egg, id = 'eg' + (++UID);
  const grad = T === 4
    ? `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc3d8"/><stop offset=".33" stop-color="#fff0a8"/><stop offset=".66" stop-color="#b8f0c0"/><stop offset="1" stop-color="#a8d8ff"/></linearGradient>`
    : `<radialGradient id="${id}" cx="36%" cy="24%" r="85%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".6" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`;
  let cracks = '';
  for (let i = 0; i < Math.min(cr, CRACKS.length); i++) cracks += `<path d="${CRACKS[i]}" stroke="${T === 6 || T === 13 ? '#e0ccff' : '#4b3a63'}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${grad}<clipPath id="${id}c"><path d="${EGG_P}"/></clipPath></defs><path d="${EGG_P}" fill="url(#${id})"/><g clip-path="url(#${id}c)">${eggPattern(T)}</g><ellipse cx="68" cy="66" rx="20" ry="30" fill="#fff" opacity="${T === 6 || T === 13 ? '.2' : '.55'}" transform="rotate(24 68 66)"/>${cracks}</svg>`;
}
/* =========================================================
   MATTEMOTORN: uppgifter, anpassning och repetition
   ========================================================= */
export { TIERS, TORDER, RANK, SQ, SQ_BY, SLOTS, SLOT_NAME, TREATS, TREAT_BY, SKINS, SKIN_BY, RAR_NAME, RAR_COL, sqSVG, eggSVG, rollTreats, TAPS };
