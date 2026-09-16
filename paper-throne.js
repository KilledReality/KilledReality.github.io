const PAPER_THRONE_STORAGE_KEY = "ashana-paper-throne-gwent-v4";
const PAPER_THRONE_ROWS = ["melee", "ranged", "siege"];
const PAPER_THRONE_ROW_LABELS = {
  melee: "Рукопашный ряд",
  ranged: "Дальнобойный ряд",
  siege: "Осадный ряд",
};
const PAPER_THRONE_NEUTRAL_FACTION = {
  id: "neutral",
  name: "Без фракции",
  color: "#999084",
  passive: "none",
  passiveText: "Нейтральные карты могут входить в любую колоду.",
  description: "Системная принадлежность для нейтральных карт.",
  art: "",
};
const PAPER_THRONE_FACTION_PASSIVES = {
  none: ["Без модификатора", "Фракция не меняет правила партии."],
  "draw-win": ["Резерв победителя", "После победы в раунде берет одну карту из колоды."],
  "tie-win": ["Право ничьей", "Побеждает в раунде при равном счете."],
  first: ["Первый ход", "Начинает первый раунд, если соперник не обладает тем же модификатором."],
  "keep-unit": ["Несгибаемый отряд", "После раунда случайный негероический отряд остается на поле."],
};
const PAPER_THRONE_TYPE_LABELS = {
  unit: "Отряд",
  special: "Специальная карта",
};
const PAPER_THRONE_ABILITY_LABELS = {
  none: "Без умения",
  bond: "Прочная связь",
  morale: "Боевой дух",
  spy: "Шпион",
  medic: "Медик",
  muster: "Сбор",
  "weather-melee": "Мороз",
  "weather-ranged": "Туман",
  "weather-siege": "Ливень",
  clear: "Ясная погода",
  horn: "Командирский рог",
  scorch: "Казнь",
  decoy: "Чучело",
};
const PAPER_THRONE_LEADER_EFFECTS = {
  none: ["Без способности", "Лидер не применяет отдельную активную способность."],
  clear: ["Развеять непогоду", "Один раз за партию убирает все погодные эффекты."],
  "horn-best": ["Воодушевляющая речь", "Один раз за партию удваивает сильнейший свой ряд."],
  scorch: ["Публичный приговор", "Один раз за партию уничтожает сильнейшие негероические отряды на поле."],
  draw: ["Тайный резерв", "Один раз за партию берет одну карту из колоды."],
};
const PAPER_THRONE_ART = {
  iron: "assets/hex-terrain/settlement-v2.png",
  court: "assets/hex-terrain/castle.png",
  shadow: "assets/hex-terrain/magic-forest.png",
  coin: "assets/hex-terrain/village.png",
  neutral: "assets/hex-terrain/grass.png",
  prison: "assets/hex-terrain/bad place.png",
  relic: "assets/hex-terrain/temple destroyed.png",
  storm: "assets/hex-terrain/water2.png",
  frost: "assets/hex-terrain/mountain.png",
  fog: "assets/hex-terrain/swamp-forest.png",
};

let paperThroneSection = "play";
let paperThroneEditingCardId = "";
let paperThroneEditingDeckId = "";
let paperThroneEditingFactionId = "";
let paperThroneEditingLeaderId = "";

function paperThroneCard(id, name, faction, row, power, ability, text, art, options = {}) {
  const abilities = paperThroneNormalizeAbilities(options.abilities ?? ability);
  const properties = paperThroneNormalizeTerms(options.properties?.length ? options.properties : (options.tags?.length ? options.tags : [name]));
  const affiliations = paperThroneNormalizeTerms(options.affiliations);
  return {
    id,
    name,
    faction,
    type: options.type || "unit",
    row: row || "",
    power: Number(power || 0),
    ability: abilities[0],
    abilities,
    properties,
    affiliations,
    hero: Boolean(options.hero),
    musterGroup: options.musterGroup || "",
    text,
    art,
    imageStyle: options.imageStyle || { fit: "cover", positionX: 50, positionY: 50, zoom: 100, ratio: "3:4" },
    custom: Boolean(options.custom),
  };
}

function paperThroneNormalizeTerms(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,;\n]/);
  return [...new Set(source.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
}

function paperThroneNormalizeAbilities(value) {
  const source = Array.isArray(value) ? value : [value];
  const abilities = [...new Set(source.map(String).filter((ability) => PAPER_THRONE_ABILITY_LABELS[ability] && ability !== "none"))];
  return abilities.length ? abilities : ["none"];
}

function paperThroneCardAbilities(card) {
  return paperThroneNormalizeAbilities(card?.abilities ?? card?.ability);
}

function paperThroneCardHasAbility(card, ability) {
  return paperThroneCardAbilities(card).includes(ability);
}

function paperThroneAbilityText(card) {
  return paperThroneCardAbilities(card).map((ability) => PAPER_THRONE_ABILITY_LABELS[ability]).join(" · ");
}

function paperThroneCardsShareSynergy(left, right) {
  const rightProperties = new Set(paperThroneNormalizeTerms(right?.properties));
  const rightAffiliations = new Set(paperThroneNormalizeTerms(right?.affiliations));
  return paperThroneNormalizeTerms(left?.properties).some((property) => rightProperties.has(property))
    || paperThroneNormalizeTerms(left?.affiliations).some((affiliation) => rightAffiliations.has(affiliation));
}

const PAPER_THRONE_RETIRED_CARDS = [
  paperThroneCard("ir-warden", "Смотрящий каторги", "iron", "melee", 10, "none", "Герой. Не подвержен умениям и погоде.", PAPER_THRONE_ART.prison, { hero: true }),
  paperThroneCard("ir-banner", "Знамя первого бунта", "iron", "ranged", 8, "none", "Герой Железной улицы.", PAPER_THRONE_ART.iron, { hero: true }),
  paperThroneCard("ir-bruiser", "Каторжный громила", "iron", "melee", 5, "bond", "Прочная связь: одинаковые громилы усиливают друг друга.", PAPER_THRONE_ART.iron),
  paperThroneCard("ir-sergeant", "Бывший сержант", "iron", "melee", 6, "morale", "Боевой дух: дает +1 остальным негероическим отрядам ряда.", PAPER_THRONE_ART.iron),
  paperThroneCard("ir-slinger", "Камнемет с галереи", "iron", "ranged", 4, "muster", "Сбор: выводит из руки и колоды всех камнеметов.", PAPER_THRONE_ART.iron, { musterGroup: "ir-slinger" }),
  paperThroneCard("ir-chain", "Цепной боец", "iron", "melee", 7, "none", "Тяжелый штурмовой отряд.", PAPER_THRONE_ART.prison),
  paperThroneCard("ir-medic", "Подпольный лекарь", "iron", "ranged", 5, "medic", "Медик: возвращает сильнейший негероический отряд из отбоя.", PAPER_THRONE_ART.iron),
  paperThroneCard("ir-ballista", "Тюремная баллиста", "iron", "siege", 6, "bond", "Прочная связь с другими тюремными баллистами.", PAPER_THRONE_ART.relic),

  paperThroneCard("co-regent", "Пустой регент", "court", "melee", 10, "none", "Герой Позолоченного двора.", PAPER_THRONE_ART.court, { hero: true }),
  paperThroneCard("co-judge", "Судья золотой печати", "court", "ranged", 9, "none", "Герой. Его приговор нельзя изменить погодой.", PAPER_THRONE_ART.court, { hero: true }),
  paperThroneCard("co-knight", "Рыцарь долговой книги", "court", "melee", 6, "bond", "Прочная связь: рыцари сражаются строем.", PAPER_THRONE_ART.court),
  paperThroneCard("co-herald", "Глашатай палаты", "court", "ranged", 5, "morale", "Боевой дух для своего ряда.", PAPER_THRONE_ART.court),
  paperThroneCard("co-clerk", "Писарь налоговой башни", "court", "ranged", 4, "spy", "Шпион: размещается у противника, после чего вы берете две карты.", PAPER_THRONE_ART.relic),
  paperThroneCard("co-guard", "Страж дворцовых ворот", "court", "melee", 7, "none", "Надежный отряд ближнего боя.", PAPER_THRONE_ART.court),
  paperThroneCard("co-medic", "Придворный хирург", "court", "ranged", 5, "medic", "Медик: возвращает сильнейший негероический отряд из отбоя.", PAPER_THRONE_ART.court),
  paperThroneCard("co-trebuchet", "Позолоченный требушет", "court", "siege", 6, "bond", "Прочная связь с другими требушетами.", PAPER_THRONE_ART.relic),

  paperThroneCard("sh-witness", "Свидетель без лица", "shadow", "ranged", 10, "none", "Герой Чернильной тени.", PAPER_THRONE_ART.shadow, { hero: true }),
  paperThroneCard("sh-assassin", "Убийца под чужим именем", "shadow", "melee", 9, "none", "Герой. Не подвержен специальным эффектам.", PAPER_THRONE_ART.shadow, { hero: true }),
  paperThroneCard("sh-agent", "Немой осведомитель", "shadow", "ranged", 4, "spy", "Шпион: переходит на сторону противника и позволяет взять две карты.", PAPER_THRONE_ART.shadow),
  paperThroneCard("sh-blade", "Клинок из черного стекла", "shadow", "melee", 6, "bond", "Прочная связь с одинаковыми клинками.", PAPER_THRONE_ART.shadow),
  paperThroneCard("sh-crows", "Посыльные вороньей крыши", "shadow", "ranged", 4, "muster", "Сбор: выводит всех посыльных из руки и колоды.", PAPER_THRONE_ART.shadow, { musterGroup: "sh-crows" }),
  paperThroneCard("sh-saboteur", "Сапер ночного хода", "shadow", "siege", 6, "none", "Осадный специалист Чернильной тени.", PAPER_THRONE_ART.relic),
  paperThroneCard("sh-medic", "Хирург подполья", "shadow", "ranged", 5, "medic", "Медик: возвращает отряд из отбоя.", PAPER_THRONE_ART.shadow),
  paperThroneCard("sh-captain", "Капитан тайной стражи", "shadow", "melee", 5, "morale", "Боевой дух для своего ряда.", PAPER_THRONE_ART.shadow),

  paperThroneCard("lc-master", "Хозяин медной кассы", "coin", "melee", 10, "none", "Герой Ломаной короны.", PAPER_THRONE_ART.coin, { hero: true }),
  paperThroneCard("lc-broker", "Купец сломанных клятв", "coin", "ranged", 9, "none", "Герой торговых дворов.", PAPER_THRONE_ART.coin, { hero: true }),
  paperThroneCard("lc-caravan", "Караван общака", "coin", "siege", 5, "muster", "Сбор: выводит все караваны общака.", PAPER_THRONE_ART.coin, { musterGroup: "lc-caravan" }),
  paperThroneCard("lc-guard", "Охрана долгового дома", "coin", "melee", 6, "bond", "Прочная связь с другой охраной.", PAPER_THRONE_ART.coin),
  paperThroneCard("lc-crier", "Зазывала черного рынка", "coin", "ranged", 5, "morale", "Боевой дух для своего ряда.", PAPER_THRONE_ART.coin),
  paperThroneCard("lc-spy", "Счетовод чужой казны", "coin", "ranged", 4, "spy", "Шпион: приносит противнику силу, а вам две карты.", PAPER_THRONE_ART.relic),
  paperThroneCard("lc-medic", "Аптекарь караванщиков", "coin", "ranged", 5, "medic", "Медик: возвращает отряд из отбоя.", PAPER_THRONE_ART.coin),
  paperThroneCard("lc-cannon", "Пушка залогового двора", "coin", "siege", 7, "none", "Тяжелый осадный отряд.", PAPER_THRONE_ART.relic),

  paperThroneCard("nt-mercenary", "Наемник Серого Тракта", "neutral", "melee", 5, "none", "Нейтральный отряд для любой колоды.", PAPER_THRONE_ART.neutral),
  paperThroneCard("nt-medic", "Полевой костоправ", "neutral", "ranged", 4, "medic", "Нейтральный медик.", PAPER_THRONE_ART.neutral),
  paperThroneCard("sp-frost", "Мороз Пепельной недели", "neutral", "melee", 0, "weather-melee", "Все негероические рукопашные отряды получают силу 1.", PAPER_THRONE_ART.frost, { type: "special" }),
  paperThroneCard("sp-fog", "Туман утонувшей межи", "neutral", "ranged", 0, "weather-ranged", "Все негероические дальнобойные отряды получают силу 1.", PAPER_THRONE_ART.fog, { type: "special" }),
  paperThroneCard("sp-rain", "Ливень над бастионами", "neutral", "siege", 0, "weather-siege", "Все негероические осадные отряды получают силу 1.", PAPER_THRONE_ART.storm, { type: "special" }),
  paperThroneCard("sp-clear", "День без дурных знамений", "neutral", "", 0, "clear", "Убирает все погодные эффекты.", PAPER_THRONE_ART.neutral, { type: "special" }),
  paperThroneCard("sp-horn", "Рог Карточного Авторитета", "neutral", "", 0, "horn", "Удваивает силу негероических отрядов выбранного своего ряда.", PAPER_THRONE_ART.relic, { type: "special" }),
  paperThroneCard("sp-scorch", "Публичная казнь", "neutral", "", 0, "scorch", "Уничтожает все сильнейшие негероические отряды на поле.", PAPER_THRONE_ART.prison, { type: "special" }),
  paperThroneCard("sp-decoy", "Бумажное чучело", "neutral", "", 0, "decoy", "Возвращает выбранный свой негероический отряд в руку.", PAPER_THRONE_ART.neutral, { type: "special" }),
];

function paperThroneCopies(id, amount) {
  return Array.from({ length: amount }, () => id);
}

function paperThroneStarterCards(prefix) {
  const unitIds = PAPER_THRONE_RETIRED_CARDS.filter((card) => card.type === "unit" && card.id.startsWith(prefix)).map((card) => card.id);
  return [
    ...paperThroneCopies(unitIds[0], 1),
    ...paperThroneCopies(unitIds[1], 1),
    ...paperThroneCopies(unitIds[2], 3),
    ...paperThroneCopies(unitIds[3], 3),
    ...paperThroneCopies(unitIds[4], 3),
    ...paperThroneCopies(unitIds[5], 3),
    ...paperThroneCopies(unitIds[6], 2),
    ...paperThroneCopies(unitIds[7], 2),
    ...paperThroneCopies("nt-mercenary", 2),
    ...paperThroneCopies("nt-medic", 2),
    "sp-frost", "sp-fog", "sp-rain", "sp-clear",
    ...paperThroneCopies("sp-horn", 2),
    "sp-scorch", "sp-decoy",
  ];
}

const PAPER_THRONE_RETIRED_DECKS = [
  {
    id: "starter-iron",
    name: "Железная улица",
    faction: "iron",
    leaderName: "Смотрящий каторги",
    leaderEffect: "clear",
    description: "Плотный рукопашный строй, связанные отряды и возвращение бойцов из отбоя.",
    cardIds: paperThroneStarterCards("ir-"),
    builtIn: true,
  },
  {
    id: "starter-court",
    name: "Позолоченный двор",
    faction: "court",
    leaderName: "Пустой регент",
    leaderEffect: "horn-best",
    description: "Сильные ряды, шпионы и победа при равном счете.",
    cardIds: paperThroneStarterCards("co-"),
    builtIn: true,
  },
  {
    id: "starter-shadow",
    name: "Чернильная тень",
    faction: "shadow",
    leaderName: "Свидетель без лица",
    leaderEffect: "scorch",
    description: "Шпионы, быстрый сбор и право начать первый раунд.",
    cardIds: paperThroneStarterCards("sh-"),
    builtIn: true,
  },
  {
    id: "starter-coin",
    name: "Ломаная корона",
    faction: "coin",
    leaderName: "Хозяин медной кассы",
    leaderEffect: "draw",
    description: "Сбор караванов и сохранение одного отряда между раундами.",
    cardIds: paperThroneStarterCards("lc-"),
    builtIn: true,
  },
];

const PAPER_THRONE_BASE_CARDS = [];
const PAPER_THRONE_BASE_DECKS = [];

function paperThroneCustomData() {
  if (!state.paperThrone || typeof state.paperThrone !== "object") state.paperThrone = { schemaVersion: 4, cards: [], decks: [], factions: [], leaders: [] };
  state.paperThrone.schemaVersion = 4;
  if (!Array.isArray(state.paperThrone.cards)) state.paperThrone.cards = [];
  if (!Array.isArray(state.paperThrone.decks)) state.paperThrone.decks = [];
  if (!Array.isArray(state.paperThrone.factions)) state.paperThrone.factions = [];
  if (!Array.isArray(state.paperThrone.leaders)) state.paperThrone.leaders = [];
  return state.paperThrone;
}

function paperThroneNormalizeImageStyle(style = {}) {
  return {
    fit: style.fit === "contain" ? "contain" : "cover",
    positionX: Math.min(100, Math.max(0, Number(style.positionX ?? 50))),
    positionY: Math.min(100, Math.max(0, Number(style.positionY ?? 50))),
    zoom: Math.min(180, Math.max(70, Number(style.zoom ?? 100))),
    ratio: ["3:4", "1:1", "16:9"].includes(style.ratio) ? style.ratio : "3:4",
  };
}

function paperThroneNormalizeCustomCard(source = {}) {
  const abilities = paperThroneNormalizeAbilities(source.abilities ?? source.ability);
  const properties = paperThroneNormalizeTerms(source.properties?.length ? source.properties : (source.tags?.length ? source.tags : [source.musterGroup || source.name || "Новое свойство"]));
  const affiliations = paperThroneNormalizeTerms(source.affiliations);
  const factionId = paperThroneAllFactions().some((faction) => faction.id === source.faction) ? source.faction : "neutral";
  return paperThroneCard(
    String(source.id || `custom-card:${crypto.randomUUID()}`),
    String(source.name || "Новая карта").trim(),
    factionId,
    PAPER_THRONE_ROWS.includes(source.row) ? source.row : "melee",
    Math.min(20, Math.max(0, Number(source.power || 0))),
    abilities[0],
    String(source.text || ""),
    String(source.art || ""),
    {
      type: source.type === "special" ? "special" : "unit",
      hero: Boolean(source.hero),
      musterGroup: String(source.musterGroup || ""),
      abilities,
      properties,
      affiliations,
      imageStyle: paperThroneNormalizeImageStyle(source.imageStyle),
      custom: true,
    }
  );
}

function paperThroneAllCards() {
  return paperThroneCustomData().cards.map(paperThroneNormalizeCustomCard);
}

function paperThroneCardById(id) {
  return paperThroneAllCards().find((card) => card.id === id) || paperThroneCard(
    id || "missing-card",
    "Утраченная карта",
    "neutral",
    "melee",
    0,
    "none",
    "Эта карта была удалена из мастерской.",
    ""
  );
}

function paperThroneNormalizeFaction(source = {}) {
  const passive = PAPER_THRONE_FACTION_PASSIVES[source.passive] ? source.passive : "none";
  const color = /^#[0-9a-f]{6}$/i.test(String(source.color || "")) ? String(source.color) : "#9a8060";
  return {
    id: String(source.id || `custom-faction:${crypto.randomUUID()}`),
    name: String(source.name || "Новая фракция").trim(),
    color,
    passive,
    passiveText: String(source.passiveText || PAPER_THRONE_FACTION_PASSIVES[passive][1]),
    description: String(source.description || ""),
    art: String(source.art || ""),
    imageStyle: paperThroneNormalizeImageStyle(source.imageStyle),
  };
}

function paperThroneAllFactions(includeNeutral = true) {
  const factions = paperThroneCustomData().factions.map(paperThroneNormalizeFaction);
  return includeNeutral ? [PAPER_THRONE_NEUTRAL_FACTION, ...factions] : factions;
}

function paperThroneFactionById(id) {
  return paperThroneAllFactions().find((faction) => faction.id === id) || PAPER_THRONE_NEUTRAL_FACTION;
}

function paperThroneNormalizeLeader(source = {}) {
  const knownFactionIds = new Set(paperThroneAllFactions(false).map((faction) => faction.id));
  const factionIds = [...new Set((Array.isArray(source.factionIds) ? source.factionIds : []).map(String).filter((id) => knownFactionIds.has(id)))];
  return {
    id: String(source.id || `custom-leader:${crypto.randomUUID()}`),
    name: String(source.name || "Новый лидер").trim(),
    factionIds,
    universal: Boolean(source.universal) || factionIds.length === 0,
    effect: PAPER_THRONE_LEADER_EFFECTS[source.effect] ? source.effect : "none",
    description: String(source.description || ""),
    art: String(source.art || ""),
    imageStyle: paperThroneNormalizeImageStyle(source.imageStyle),
  };
}

function paperThroneAllLeaders() {
  return paperThroneCustomData().leaders.map(paperThroneNormalizeLeader);
}

function paperThroneLeaderById(id) {
  return paperThroneAllLeaders().find((leader) => leader.id === id) || null;
}

function paperThroneLeaderSupportsFaction(leader, factionId) {
  return Boolean(leader) && (leader.universal || leader.factionIds.includes(factionId));
}

function paperThroneNormalizeDeck(source = {}) {
  const availableFactionIds = new Set(paperThroneAllFactions(false).map((faction) => faction.id));
  const faction = availableFactionIds.has(source.faction) ? source.faction : (paperThroneAllFactions(false)[0]?.id || "");
  return {
    id: String(source.id || `custom-deck:${crypto.randomUUID()}`),
    name: String(source.name || "Новая колода").trim(),
    faction,
    leaderId: String(source.leaderId || ""),
    description: String(source.description || ""),
    cardIds: Array.isArray(source.cardIds) ? source.cardIds.map(String) : [],
  };
}

function paperThroneAllDecks() {
  return paperThroneCustomData().decks.map(paperThroneNormalizeDeck);
}

function paperThroneDeckById(id) {
  return paperThroneAllDecks().find((deck) => deck.id === id) || null;
}

function paperThroneDeckStats(deck) {
  const cards = deck.cardIds.map(paperThroneCardById);
  return {
    total: cards.length,
    units: cards.filter((card) => card.type === "unit").length,
    specials: cards.filter((card) => card.type === "special").length,
    heroes: cards.filter((card) => card.hero).length,
  };
}

function paperThroneValidateDeck(deck) {
  const stats = paperThroneDeckStats(deck);
  const counts = new Map();
  let factionMismatch = false;
  let copyViolation = false;
  let missingCard = false;
  const knownCardIds = new Set(paperThroneAllCards().map((card) => card.id));
  deck.cardIds.forEach((id) => {
    const card = paperThroneCardById(id);
    if (!knownCardIds.has(id)) missingCard = true;
    counts.set(id, (counts.get(id) || 0) + 1);
    if (![deck.faction, "neutral"].includes(card.faction)) factionMismatch = true;
  });
  counts.forEach((count, id) => {
    const card = paperThroneCardById(id);
    if (count > (card.hero ? 1 : 3)) copyViolation = true;
  });
  const errors = [];
  const faction = paperThroneAllFactions(false).find((item) => item.id === deck.faction);
  const leader = paperThroneLeaderById(deck.leaderId);
  if (!faction) errors.push("не выбрана существующая фракция");
  if (!leader) errors.push("не выбран лидер");
  else if (!paperThroneLeaderSupportsFaction(leader, deck.faction)) errors.push("лидер несовместим с фракцией");
  if (stats.units < 22) errors.push(`нужно еще ${22 - stats.units} карт отрядов`);
  if (stats.specials > 10) errors.push("специальных карт больше 10");
  if (factionMismatch) errors.push("есть карты другой фракции");
  if (copyViolation) errors.push("превышен лимит копий");
  if (missingCard) errors.push("есть удаленные карты");
  return { ok: errors.length === 0, errors, stats };
}

function paperThroneShuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function paperThroneEmptyBoard() {
  return { melee: [], ranged: [], siege: [] };
}

function paperThroneInstance(card) {
  return { uid: crypto.randomUUID(), cardId: card.id };
}

function paperThroneDraw(player, amount) {
  let drawn = 0;
  while (drawn < amount && player.deck.length) {
    player.hand.push(player.deck.pop());
    drawn += 1;
  }
  return drawn;
}

function paperThroneHistory(game, text, kind = "system") {
  game.history.unshift({ round: game.round, text, kind });
  game.history = game.history.slice(0, 80);
}

function paperThroneRowCards(game, playerIndex, row) {
  return game.players[playerIndex].board[row];
}

function paperThroneEffectivePower(game, playerIndex, row, instance) {
  const card = paperThroneCardById(instance.cardId);
  if (card.hero) return card.power;
  let power = game.weather[row] ? Math.min(1, card.power) : card.power;
  if (paperThroneCardHasAbility(card, "bond")) {
    const copies = paperThroneRowCards(game, playerIndex, row).filter((item) => {
      const candidate = paperThroneCardById(item.cardId);
      return paperThroneCardsShareSynergy(card, candidate);
    }).length;
    power *= Math.max(1, copies);
  }
  const morale = paperThroneRowCards(game, playerIndex, row).filter((item) => {
    const other = paperThroneCardById(item.cardId);
    return paperThroneCardHasAbility(other, "morale") && item.uid !== instance.uid;
  }).length;
  power += morale;
  if (game.players[playerIndex].horn[row]) power *= 2;
  return Math.max(0, power);
}

function paperThroneRowScore(game, playerIndex, row) {
  return paperThroneRowCards(game, playerIndex, row).reduce(
    (sum, instance) => sum + paperThroneEffectivePower(game, playerIndex, row, instance),
    0
  );
}

function paperThroneScore(game, playerIndex) {
  return PAPER_THRONE_ROWS.reduce((sum, row) => sum + paperThroneRowScore(game, playerIndex, row), 0);
}

function paperThroneFindInstance(game, playerIndex, uid) {
  for (const row of PAPER_THRONE_ROWS) {
    const instance = game.players[playerIndex].board[row].find((item) => item.uid === uid);
    if (instance) return { instance, row };
  }
  return null;
}

function paperThroneDestroyInstance(game, playerIndex, uid) {
  const found = paperThroneFindInstance(game, playerIndex, uid);
  if (!found) return false;
  const rowCards = game.players[playerIndex].board[found.row];
  rowCards.splice(rowCards.findIndex((item) => item.uid === uid), 1);
  game.players[playerIndex].discard.push(found.instance.cardId);
  return true;
}

function paperThroneScorch(game) {
  const candidates = [];
  game.players.forEach((player, playerIndex) => {
    PAPER_THRONE_ROWS.forEach((row) => {
      player.board[row].forEach((instance) => {
        const card = paperThroneCardById(instance.cardId);
        if (!card.hero) candidates.push({ playerIndex, uid: instance.uid, power: paperThroneEffectivePower(game, playerIndex, row, instance) });
      });
    });
  });
  const highest = Math.max(0, ...candidates.map((item) => item.power));
  const destroyed = candidates.filter((item) => item.power === highest && highest > 0);
  destroyed.forEach((item) => paperThroneDestroyInstance(game, item.playerIndex, item.uid));
  return destroyed.length;
}

function paperThroneRowsForCard(card) {
  if (card.type === "unit") return [card.row];
  const weather = paperThroneCardAbilities(card).find((ability) => ability.startsWith("weather-"));
  if (weather) return [weather.replace("weather-", "")];
  if (paperThroneCardHasAbility(card, "horn")) return [...PAPER_THRONE_ROWS];
  return [];
}

function paperThroneCanPlayCard(game, playerIndex, handIndex, row = "") {
  if (game.phase !== "turn" || game.currentIndex !== playerIndex || game.players[playerIndex].passed) return false;
  const card = paperThroneCardById(game.players[playerIndex].hand[handIndex]);
  if (["clear", "scorch"].some((ability) => paperThroneCardHasAbility(card, ability))) return true;
  if (paperThroneCardHasAbility(card, "decoy")) {
    return PAPER_THRONE_ROWS.some((rowId) => game.players[playerIndex].board[rowId].some((instance) => !paperThroneCardById(instance.cardId).hero));
  }
  return paperThroneRowsForCard(card).includes(row);
}

function paperThroneRevive(game, playerIndex) {
  const player = game.players[playerIndex];
  const candidates = player.discard
    .map((id, discardIndex) => ({ card: paperThroneCardById(id), discardIndex }))
    .filter(({ card }) => card.type === "unit" && !card.hero && !paperThroneCardHasAbility(card, "spy"))
    .sort((left, right) => right.card.power - left.card.power);
  if (!candidates.length) return null;
  const target = candidates[0];
  player.discard.splice(target.discardIndex, 1);
  player.board[target.card.row].push(paperThroneInstance(target.card));
  return target.card;
}

function paperThroneMuster(game, playerIndex, card) {
  const player = game.players[playerIndex];
  let count = 0;
  ["hand", "deck"].forEach((zone) => {
    for (let index = player[zone].length - 1; index >= 0; index -= 1) {
      const candidate = paperThroneCardById(player[zone][index]);
      if (!paperThroneCardsShareSynergy(card, candidate)) continue;
      player[zone].splice(index, 1);
      player.board[candidate.row].push(paperThroneInstance(candidate));
      count += 1;
    }
  });
  return count;
}

function paperThroneResolveCard(game, playerIndex, handIndex, row = "", targetUid = "") {
  const player = game.players[playerIndex];
  const card = paperThroneCardById(player.hand[handIndex]);
  if (!paperThroneCanPlayCard(game, playerIndex, handIndex, row)) return false;
  if (paperThroneCardHasAbility(card, "decoy")) {
    const found = paperThroneFindInstance(game, playerIndex, targetUid);
    if (!found || paperThroneCardById(found.instance.cardId).hero) return false;
  }
  player.hand.splice(handIndex, 1);
  if (card.type === "unit") {
    const boardOwnerIndex = paperThroneCardHasAbility(card, "spy") ? (playerIndex === 0 ? 1 : 0) : playerIndex;
    game.players[boardOwnerIndex].board[card.row].push(paperThroneInstance(card));
    if (paperThroneCardHasAbility(card, "spy")) {
      const drawn = paperThroneDraw(player, 2);
      paperThroneHistory(game, `${player.name} внедряет «${card.name}» и берет ${drawn} карт.`, "spy");
    }
    if (paperThroneCardHasAbility(card, "medic")) {
      const revived = paperThroneRevive(game, playerIndex);
      paperThroneHistory(game, revived ? `${player.name} возвращает из отбоя «${revived.name}».` : `${card.name} не находит подходящей цели в отбое.`, "medic");
    }
    if (paperThroneCardHasAbility(card, "muster")) {
      const gathered = paperThroneMuster(game, playerIndex, card);
      paperThroneHistory(game, `${card.name} собирает еще ${gathered} отрядов.`, "muster");
    }
  } else {
    player.discard.push(card.id);
    const weather = paperThroneCardAbilities(card).find((ability) => ability.startsWith("weather-"));
    if (weather) {
      game.weather[row] = true;
      game.specialCards.push({ playerIndex, cardId: card.id });
    }
    if (paperThroneCardHasAbility(card, "clear")) PAPER_THRONE_ROWS.forEach((rowId) => { game.weather[rowId] = false; });
    if (paperThroneCardHasAbility(card, "horn")) {
      player.horn[row] = true;
      game.specialCards.push({ playerIndex, cardId: card.id });
    }
    if (paperThroneCardHasAbility(card, "scorch")) paperThroneScorch(game);
    if (paperThroneCardHasAbility(card, "decoy")) {
      const found = paperThroneFindInstance(game, playerIndex, targetUid);
      const rowCards = player.board[found.row];
      rowCards.splice(rowCards.findIndex((item) => item.uid === targetUid), 1);
      player.hand.push(found.instance.cardId);
    }
  }
  paperThroneHistory(game, `${player.name} разыгрывает «${card.name}»${row ? ` в «${PAPER_THRONE_ROW_LABELS[row]}»` : ""}.`, card.type === "special" ? "special" : "play");
  paperThroneFinishAction(game, playerIndex);
  return true;
}

function paperThroneNextActivePlayer(game, fromIndex) {
  const other = fromIndex === 0 ? 1 : 0;
  if (!game.players[other].passed) return other;
  if (!game.players[fromIndex].passed) return fromIndex;
  return -1;
}

function paperThroneFinishAction(game, actorIndex) {
  const nextIndex = paperThroneNextActivePlayer(game, actorIndex);
  if (nextIndex < 0) {
    paperThroneFinishRound(game);
    return;
  }
  game.currentIndex = nextIndex;
  game.phase = game.mode === "local" ? "handoff" : "turn";
}

function paperThronePass(game, playerIndex) {
  if (game.phase !== "turn" || game.currentIndex !== playerIndex) return false;
  game.players[playerIndex].passed = true;
  paperThroneHistory(game, `${game.players[playerIndex].name} пасует до конца раунда.`, "pass");
  paperThroneFinishAction(game, playerIndex);
  return true;
}

function paperThroneUseLeader(game, playerIndex) {
  const player = game.players[playerIndex];
  if (game.phase !== "turn" || game.currentIndex !== playerIndex || player.leaderUsed) return false;
  const leader = paperThroneLeaderById(player.leaderId);
  if (!leader || leader.effect === "none") return false;
  player.leaderUsed = true;
  if (leader.effect === "clear") PAPER_THRONE_ROWS.forEach((row) => { game.weather[row] = false; });
  if (leader.effect === "horn-best") {
    const row = [...PAPER_THRONE_ROWS].sort((left, right) => paperThroneRowScore(game, playerIndex, right) - paperThroneRowScore(game, playerIndex, left))[0];
    player.horn[row] = true;
  }
  if (leader.effect === "scorch") paperThroneScorch(game);
  if (leader.effect === "draw") paperThroneDraw(player, 1);
  paperThroneHistory(game, `${player.name} применяет умение лидера «${leader.name}».`, "leader");
  return true;
}

function paperThroneRoundKeeper(game, playerIndex) {
  const player = game.players[playerIndex];
  if (paperThroneFactionById(player.faction).passive !== "keep-unit") return null;
  const candidates = PAPER_THRONE_ROWS.flatMap((row) => player.board[row].map((instance) => ({ row, instance })))
    .filter(({ instance }) => !paperThroneCardById(instance.cardId).hero);
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function paperThroneClearRound(game) {
  game.players.forEach((player, playerIndex) => {
    const keeper = paperThroneRoundKeeper(game, playerIndex);
    PAPER_THRONE_ROWS.forEach((row) => {
      const survivors = [];
      player.board[row].forEach((instance) => {
        if (keeper?.instance.uid === instance.uid) survivors.push(instance);
        else player.discard.push(instance.cardId);
      });
      player.board[row] = survivors;
      player.horn[row] = false;
    });
  });
  game.weather = { melee: false, ranged: false, siege: false };
  game.specialCards = [];
}

function paperThroneFinishRound(game) {
  const scores = game.players.map((player, index) => paperThroneScore(game, index));
  let winnerIndex = scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1;
  const tieWinner = game.players.findIndex((player) => paperThroneFactionById(player.faction).passive === "tie-win");
  if (winnerIndex < 0 && tieWinner >= 0 && paperThroneFactionById(game.players[tieWinner === 0 ? 1 : 0].faction).passive !== "tie-win") winnerIndex = tieWinner;
  if (winnerIndex < 0) {
    game.players.forEach((player) => { player.tokens = Math.max(0, player.tokens - 1); });
    paperThroneHistory(game, `Ничья ${scores[0]}:${scores[1]}. Оба претендента теряют жетон.`, "round");
  } else {
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    game.players[loserIndex].tokens = Math.max(0, game.players[loserIndex].tokens - 1);
    if (paperThroneFactionById(game.players[winnerIndex].faction).passive === "draw-win") paperThroneDraw(game.players[winnerIndex], 1);
    paperThroneHistory(game, `${game.players[winnerIndex].name} выигрывает раунд ${scores[0]}:${scores[1]}.`, "round");
  }
  game.roundResult = { scores, winnerIndex };
  const alive = game.players.map((player) => player.tokens > 0);
  if (!alive[0] || !alive[1]) {
    game.phase = "finished";
    game.winnerIndex = alive[0] === alive[1] ? -1 : alive[0] ? 0 : 1;
  } else {
    game.phase = "round-end";
    game.nextStarterIndex = winnerIndex >= 0 ? winnerIndex : Math.floor(Math.random() * 2);
  }
}

function paperThroneBeginNextRound(game) {
  paperThroneClearRound(game);
  game.players.forEach((player) => { player.passed = false; });
  game.round += 1;
  game.roundResult = null;
  game.currentIndex = game.nextStarterIndex;
  game.phase = game.mode === "local" ? "handoff" : "turn";
  paperThroneHistory(game, `Начинается ${game.round} раунд. Новые карты не добираются.`, "system");
}

function paperThroneMulligan(player, selectedIndexes) {
  const indexes = [...selectedIndexes].sort((left, right) => right - left).slice(0, 2);
  const returned = indexes.map((index) => player.hand.splice(index, 1)[0]).filter(Boolean);
  player.deck.push(...returned);
  player.deck = paperThroneShuffle(player.deck);
  paperThroneDraw(player, returned.length);
}

function paperThroneAiMulligan(player) {
  const ranked = player.hand.map((id, index) => {
    const card = paperThroneCardById(id);
    let value = card.type === "unit" ? card.power : 3;
    if (card.hero) value += 6;
    if (["spy", "medic", "muster"].some((ability) => paperThroneCardHasAbility(card, ability))) value += 4;
    const copies = player.hand.filter((candidate) => candidate === id).length;
    if (card.type === "special" && copies > 1) value -= 3;
    return { index, value };
  }).sort((left, right) => left.value - right.value);
  paperThroneMulligan(player, new Set(ranked.slice(0, 2).map((item) => item.index)));
}

function paperThroneChooseStarter(game) {
  const firstPassives = game.players.map((player) => paperThroneFactionById(player.faction).passive === "first");
  if (firstPassives[0] !== firstPassives[1]) return firstPassives[0] ? 0 : 1;
  return Math.floor(Math.random() * 2);
}

function paperThroneFinishMulligan(game, playerIndex, selectedIndexes) {
  paperThroneMulligan(game.players[playerIndex], selectedIndexes);
  if (game.mode === "ai") {
    paperThroneAiMulligan(game.players[1]);
    game.currentIndex = paperThroneChooseStarter(game);
    game.phase = "turn";
    paperThroneHistory(game, `${game.players[game.currentIndex].name} начинает первый раунд.`, "system");
    return;
  }
  if (playerIndex === 0) {
    game.currentIndex = 1;
    game.phase = "mulligan-handoff";
  } else {
    game.currentIndex = paperThroneChooseStarter(game);
    game.phase = "handoff";
    paperThroneHistory(game, `${game.players[game.currentIndex].name} начинает первый раунд.`, "system");
  }
}

function paperThroneCreatePlayer(entity, controller, deckId) {
  const deckDefinition = paperThroneDeckById(deckId);
  const player = {
    id: crypto.randomUUID(),
    entityKey: entity.key,
    name: entity.name,
    subtitle: entity.subtitle || "Претендент на Бумажный трон",
    portrait: entity.portrait || "",
    portraitStyle: entity.portraitStyle || {},
    controller,
    deckId,
    faction: deckDefinition.faction,
    leaderId: deckDefinition.leaderId,
    deck: paperThroneShuffle(deckDefinition.cardIds),
    hand: [],
    discard: [],
    board: paperThroneEmptyBoard(),
    horn: { melee: false, ranged: false, siege: false },
    tokens: 2,
    passed: false,
    leaderUsed: false,
  };
  paperThroneDraw(player, 10);
  return player;
}

function paperThroneCreateGame(options) {
  const deckDefinitions = options.deckIds.map(paperThroneDeckById);
  if (deckDefinitions.some((deck) => !deck || !paperThroneValidateDeck(deck).ok)) return null;
  const game = {
    version: 4,
    mode: options.mode,
    difficulty: options.difficulty,
    round: 1,
    phase: options.mode === "local" ? "mulligan-handoff" : "mulligan",
    currentIndex: 0,
    players: [
      paperThroneCreatePlayer(options.entities[0], "human", options.deckIds[0]),
      paperThroneCreatePlayer(options.entities[1], options.mode === "ai" ? "ai" : "human", options.deckIds[1]),
    ],
    weather: { melee: false, ranged: false, siege: false },
    specialCards: [],
    history: [],
    roundResult: null,
    winnerIndex: null,
  };
  paperThroneHistory(game, "Колоды перемешаны. Каждый претендент получил десять карт.");
  return game;
}

function paperThroneSaveGame(game) {
  try {
    if (game) localStorage.setItem(PAPER_THRONE_STORAGE_KEY, JSON.stringify(game));
    else localStorage.removeItem(PAPER_THRONE_STORAGE_KEY);
  } catch (error) {
    console.warn("Не удалось сохранить матч Бумажного трона:", error);
  }
}

function paperThroneLoadGame() {
  try {
    const game = JSON.parse(localStorage.getItem(PAPER_THRONE_STORAGE_KEY) || "null");
    if (!game || game.version !== 4 || !Array.isArray(game.players) || game.players.length !== 2) return null;
    if (game.players.some((player) => !paperThroneDeckById(player.deckId) || !paperThroneLeaderById(player.leaderId))) return null;
    if (game.mode === "local" && ["turn", "mulligan"].includes(game.phase)) {
      game.phase = game.phase === "mulligan" ? "mulligan-handoff" : "handoff";
    }
    return game;
  } catch (error) {
    console.warn("Не удалось восстановить матч Бумажного трона:", error);
    return null;
  }
}

function paperThroneAiChoices(game, playerIndex) {
  const player = game.players[playerIndex];
  const choices = [];
  player.hand.forEach((cardId, handIndex) => {
    const card = paperThroneCardById(cardId);
    if (["clear", "scorch"].some((ability) => paperThroneCardHasAbility(card, ability)) && paperThroneCanPlayCard(game, playerIndex, handIndex)) {
      choices.push({ handIndex, row: "", targetUid: "" });
      return;
    }
    if (paperThroneCardHasAbility(card, "decoy")) {
      PAPER_THRONE_ROWS.forEach((row) => {
        player.board[row].forEach((instance) => {
          if (!paperThroneCardById(instance.cardId).hero && paperThroneCanPlayCard(game, playerIndex, handIndex)) {
            choices.push({ handIndex, row: "", targetUid: instance.uid });
          }
        });
      });
      return;
    }
    paperThroneRowsForCard(card).forEach((row) => {
      if (paperThroneCanPlayCard(game, playerIndex, handIndex, row)) choices.push({ handIndex, row, targetUid: "" });
    });
  });
  return choices;
}

function paperThroneAiChoiceValue(game, playerIndex, choice) {
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const card = paperThroneCardById(game.players[playerIndex].hand[choice.handIndex]);
  const before = paperThroneScore(game, playerIndex) - paperThroneScore(game, opponentIndex);
  const copy = structuredClone(game);
  paperThroneResolveCard(copy, playerIndex, choice.handIndex, choice.row, choice.targetUid);
  const after = paperThroneScore(copy, playerIndex) - paperThroneScore(copy, opponentIndex);
  let value = after - before;
  if (paperThroneCardHasAbility(card, "spy")) value += 11;
  if (paperThroneCardHasAbility(card, "medic")) value += 4;
  if (paperThroneCardHasAbility(card, "muster")) value += 3;
  if (card.hero) value += 2;
  if (paperThroneCardAbilities(card).some((ability) => ability.startsWith("weather-")) && value <= 0) value -= 8;
  if (paperThroneCardHasAbility(card, "clear") && !Object.values(game.weather).some(Boolean)) value -= 9;
  if (paperThroneCardHasAbility(card, "decoy")) {
    const target = paperThroneFindInstance(game, playerIndex, choice.targetUid);
    const targetCard = target ? paperThroneCardById(target.instance.cardId) : null;
    value += ["medic", "muster", "morale"].some((ability) => paperThroneCardHasAbility(targetCard, ability)) ? 6 : -2;
  }
  return value;
}

function paperThroneAiDecision(game, playerIndex) {
  const player = game.players[playerIndex];
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponent = game.players[opponentIndex];
  const ownScore = paperThroneScore(game, playerIndex);
  const opponentScore = paperThroneScore(game, opponentIndex);
  const deficit = opponentScore - ownScore;
  const choices = paperThroneAiChoices(game, playerIndex);
  if (!choices.length) return { action: "pass" };
  if (opponent.passed && ownScore > opponentScore) return { action: "pass" };
  const shouldConserve = game.difficulty !== "easy" && (
    (deficit > 14 && player.hand.length <= opponent.hand.length)
    || (game.round < 3 && ownScore > opponentScore + 8 && player.hand.length < opponent.hand.length)
    || (player.hand.length <= 4 && deficit > 10 && player.tokens > opponent.tokens)
  );
  if (shouldConserve) return { action: "pass" };
  const noise = game.difficulty === "easy" ? 9 : game.difficulty === "normal" ? 2.4 : 0.65;
  const ranked = choices.map((choice) => ({
    ...choice,
    value: paperThroneAiChoiceValue(game, playerIndex, choice) + Math.random() * noise,
  })).sort((left, right) => right.value - left.value);
  if (game.difficulty === "easy") return { action: "play", ...ranked[Math.floor(Math.random() * Math.min(4, ranked.length))] };
  return { action: "play", ...ranked[0] };
}

function paperThroneAiShouldUseLeader(game, playerIndex) {
  const player = game.players[playerIndex];
  if (player.leaderUsed) return false;
  const leader = paperThroneLeaderById(player.leaderId);
  if (!leader || leader.effect === "none") return false;
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const deficit = paperThroneScore(game, opponentIndex) - paperThroneScore(game, playerIndex);
  if (leader.effect === "clear") return Object.values(game.weather).some(Boolean) && deficit > 2;
  if (leader.effect === "horn-best") return game.round >= 2 && paperThroneScore(game, playerIndex) >= 10;
  if (leader.effect === "scorch") return deficit > 5 && paperThroneScore(game, opponentIndex) >= 12;
  if (leader.effect === "draw") return game.round >= 2 || player.hand.length <= 5;
  return false;
}

function paperThroneCardImageStyle(element, card) {
  const style = paperThroneNormalizeImageStyle(card.imageStyle);
  element.style.backgroundImage = card.art ? `url("${card.art}")` : "";
  element.style.backgroundSize = style.fit === "contain" ? "contain" : `${style.zoom}%`;
  element.style.backgroundPosition = `${style.positionX}% ${style.positionY}%`;
  element.style.backgroundRepeat = "no-repeat";
}

function paperThroneApplyFactionStyle(element, factionId) {
  element.style.setProperty("--deck-color", paperThroneFactionById(factionId).color);
  return element;
}

window.renderPaperThroneGame = function renderPaperThroneGame() {
  const root = el("div", "paper-throne-root");
  const mount = el("div", "paper-throne-mount");
  root.append(mount);
  let game = paperThroneLoadGame();
  let setupMode = "ai";
  let setupDifficulty = "normal";
  let setupDeckIds = ["", ""];
  let setupEntityKeys = [];
  let selectedHandIndex = -1;
  let mulliganSelection = new Set();
  let aiTimer = null;
  let closed = false;
  let cardDraft = null;
  let cardCollectionSearch = "";
  let cardCollectionScope = "all";
  let cardCollectionFaction = "all";
  let cardCollectionScroll = 0;
  let deckDraft = null;
  let deckSearch = "";
  let deckCatalogScroll = 0;
  let factionDraft = null;
  let leaderDraft = null;

  const entities = relationshipEntities();
  const fallbackEntities = [1, 2].map((index) => ({
    key: `paper-guest:${index}`,
    name: `Претендент ${index}`,
    subtitle: "Игрок Бумажного трона",
    portrait: "",
    portraitStyle: {},
  }));
  const entityOptions = entities.length >= 2 ? entities : [...entities, ...fallbackEntities];
  setupEntityKeys = [entityOptions[0]?.key || fallbackEntities[0].key, entityOptions[1]?.key || fallbackEntities[1].key];

  const clearTimer = () => {
    if (aiTimer) window.clearTimeout(aiTimer);
    aiTimer = null;
  };

  const saveAndRender = () => {
    paperThroneSaveGame(game);
    renderModule();
  };

  const runAi = () => {
    clearTimer();
    if (!game || closed || game.phase !== "turn") return;
    const playerIndex = game.currentIndex;
    if (game.players[playerIndex].controller !== "ai") return;
    aiTimer = window.setTimeout(() => {
      if (closed || game.phase !== "turn" || game.currentIndex !== playerIndex) return;
      if (paperThroneAiShouldUseLeader(game, playerIndex)) {
        paperThroneUseLeader(game, playerIndex);
        saveAndRender();
        return;
      }
      const decision = paperThroneAiDecision(game, playerIndex);
      if (decision.action === "pass") paperThronePass(game, playerIndex);
      else paperThroneResolveCard(game, playerIndex, decision.handIndex, decision.row, decision.targetUid);
      selectedHandIndex = -1;
      saveAndRender();
    }, 700 + Math.random() * 550);
  };

  const renderSubnav = () => {
    const nav = el("div", "paper-throne-subnav");
    const options = [["play", "Играть"]];
    if (isAdmin) options.push(
      ["cards", "Карты"],
      ["factions", "Фракции"],
      ["leaders", "Лидеры"],
      ["decks", "Колоды"]
    );
    options.forEach(([id, label]) => {
      const tab = button(label, paperThroneSection === id ? "active" : "", () => {
        paperThroneSection = id;
        selectedHandIndex = -1;
        renderModule();
      });
      nav.append(tab);
    });
    return nav;
  };

  const renderRulesIntro = () => {
    const intro = el("section", "paper-throne-intro");
    const copy = el("div", "paper-throne-intro-copy");
    copy.append(
      el("p", "eyebrow", "Армии, расчет и десять карт на всю войну"),
      el("h3", "", "Бумажный трон"),
      el("p", "", "Выиграйте два раунда, разумно распределяя ограниченную руку между рукопашным, дальнобойным и осадным рядами. Иногда лучший ход - вовремя спасовать.")
    );
    const rules = document.createElement("details");
    rules.className = "paper-throne-rules";
    const summary = document.createElement("summary");
    summary.textContent = "Правила партии";
    const list = el("ol");
    [
      "Перед партией каждый берет 10 карт и может заменить до двух. Обычного добора между раундами нет.",
      "За ход разыгрывается одна карта или объявляется пас. После паса вернуться в раунд нельзя.",
      "Когда оба спасовали, сравнивается общая сила трех рядов. Проигравший теряет жетон.",
      "При ничьей жетон теряют оба, если способность фракции не говорит обратного.",
      "Герои не подвержены погоде, рогу, казни и умениям других карт.",
      "Победитель раунда начинает следующий. Потерявший оба жетона проигрывает партию.",
    ].forEach((text) => list.append(el("li", "", text)));
    rules.append(summary, list);
    copy.append(rules);
    intro.append(copy, el("div", "paper-throne-crown", "БТ"));
    return intro;
  };

  const renderSetup = () => {
    const panel = el("section", "paper-throne-setup");
    const modeGrid = el("div", "paper-throne-mode-grid");
    [
      ["ai", "Против компьютера", "Компьютер оценивает счет, экономит руку и умеет вовремя пасовать."],
      ["local", "Игрок против игрока", "Закрытая локальная дуэль с передачей устройства между ходами."],
    ].forEach(([id, title, description]) => {
      const option = button("", `paper-choice-button ${setupMode === id ? "active" : ""}`, () => {
        setupMode = id;
        renderModule();
      });
      option.append(el("strong", "", title), el("span", "", description));
      modeGrid.append(option);
    });
    const difficulty = selectInput([["easy", "Новичок"], ["normal", "Игрок"], ["authority", "Карточный Авторитет"]], setupDifficulty);
    difficulty.disabled = setupMode !== "ai";
    difficulty.addEventListener("change", () => { setupDifficulty = difficulty.value; });
    const controls = el("div", "paper-throne-setup-controls");
    controls.append(el("span", "", "Сложность компьютера"), difficulty);
    const playableDecks = paperThroneAllDecks().filter((deck) => paperThroneValidateDeck(deck).ok);
    setupDeckIds = setupDeckIds.map((id, index) => playableDecks.some((deck) => deck.id === id) ? id : (playableDecks[index % playableDecks.length]?.id || ""));
    if (!playableDecks.length) {
      panel.append(
        modeGrid,
        controls,
        paperThroneGroup(
          "paper-throne-empty-setup",
          el("strong", "", "Готовых колод пока нет"),
          el("p", "", isAdmin
            ? "Создайте фракцию, совместимого лидера, не менее 22 карт отрядов и затем соберите колоду."
            : "Мастер еще не подготовил колоды для Бумажного трона.")
        )
      );
      return panel;
    }
    const players = el("div", "paper-throne-setup-players");
    for (let index = 0; index < 2; index += 1) {
      const entity = entityOptions.find((item) => item.key === setupEntityKeys[index]) || entityOptions[index];
      const block = el("article", "paper-throne-setup-player");
      const identity = el("div", "paper-throne-setup-identity");
      const entitySelect = selectInput(entityOptions.map((item) => [item.key, item.name]), entity.key);
      entitySelect.addEventListener("change", () => { setupEntityKeys[index] = entitySelect.value; });
      const identityCopy = el("div");
      identityCopy.append(el("span", "eyebrow", index === 0 ? "Первый претендент" : setupMode === "ai" ? "Компьютер" : "Второй претендент"), entitySelect);
      identity.append(directoryPortrait(entity.portrait, entity.name, entity.portraitStyle), identityCopy);
      const deckGrid = el("div", "paper-throne-deck-grid");
      playableDecks.forEach((deck) => {
        const faction = paperThroneFactionById(deck.faction);
        const leader = paperThroneLeaderById(deck.leaderId);
        const option = button("", `paper-deck-choice ${setupDeckIds[index] === deck.id ? "active" : ""}`, () => {
          setupDeckIds[index] = deck.id;
          renderModule();
        });
        paperThroneApplyFactionStyle(option, deck.faction);
        const stats = paperThroneDeckStats(deck);
        option.append(
          el("strong", "", deck.name),
          el("span", "", deck.description || faction.passiveText),
          el("small", "", `${faction.name} · ${stats.units} отрядов · ${stats.specials} специальных`),
          el("small", "", `Лидер: ${leader?.name || "не выбран"}`)
        );
        deckGrid.append(option);
      });
      block.append(identity, deckGrid);
      players.append(block);
    }
    const error = el("p", "form-error");
    error.hidden = true;
    const start = button("Начать партию", "primary-button paper-throne-start", () => {
      if (setupEntityKeys[0] === setupEntityKeys[1]) {
        error.textContent = "Выберите двух разных участников.";
        error.hidden = false;
        return;
      }
      const selectedEntities = setupEntityKeys.map((key, index) => entityOptions.find((item) => item.key === key) || entityOptions[index]);
      game = paperThroneCreateGame({ mode: setupMode, difficulty: setupDifficulty, deckIds: setupDeckIds, entities: selectedEntities });
      if (!game) {
        error.textContent = "Одна из выбранных колод была изменена или удалена. Выберите колоды заново.";
        error.hidden = false;
        return;
      }
      selectedHandIndex = -1;
      mulliganSelection = new Set();
      paperThroneSaveGame(game);
      renderModule();
    });
    panel.append(modeGrid, controls, players, error, start);
    return panel;
  };

  const renderPlay = () => {
    const area = el("div", "paper-throne-play-area");
    if (!game) {
      area.append(renderRulesIntro(), renderSetup());
      return area;
    }
    area.append(renderGameShell());
    return area;
  };

  const renderGameShell = () => {
    const shell = el("section", "paper-throne-game");
    shell.append(paperThroneGameToolbar(game, () => {
      if (!confirm("Завершить текущую партию и вернуться к выбору колод?")) return;
      game = null;
      paperThroneSaveGame(null);
      renderModule();
    }));
    const body = el("div", "paper-throne-game-body");
    const table = el("div", "paper-throne-table");
    table.append(paperThronePlayerBar(game, 1, true));
    PAPER_THRONE_ROWS.forEach((row) => {
      table.append(paperThroneBattleRow(game, row, selectedHandIndex, (targetRow, targetUid = "") => {
        if (selectedHandIndex < 0) return;
        if (paperThroneResolveCard(game, game.currentIndex, selectedHandIndex, targetRow, targetUid)) {
          selectedHandIndex = -1;
          saveAndRender();
        }
      }));
    });
    table.append(paperThronePlayerBar(game, 0, false));

    if (["handoff", "mulligan-handoff"].includes(game.phase)) {
      const title = game.phase === "mulligan-handoff" ? "Подготовьте замену карт" : "Передайте устройство";
      table.append(paperThroneHandoff(game, title, () => {
        game.phase = game.phase === "mulligan-handoff" ? "mulligan" : "turn";
        paperThroneSaveGame(game);
        renderModule();
      }));
    }
    if (game.phase === "turn" && game.players[game.currentIndex].controller === "ai") table.append(paperThroneThinking(`${game.players[game.currentIndex].name} оценивает ряды...`));
    if (game.phase === "round-end") table.append(paperThroneRoundEnd(game, () => {
      paperThroneBeginNextRound(game);
      selectedHandIndex = -1;
      saveAndRender();
    }));
    if (game.phase === "finished") table.append(paperThroneFinish(game, () => {
      game = null;
      paperThroneSaveGame(null);
      renderModule();
    }));

    const panel = game.phase === "mulligan"
      ? paperThroneMulliganPanel(game, mulliganSelection, {
        toggle(index) {
          if (mulliganSelection.has(index)) mulliganSelection.delete(index);
          else if (mulliganSelection.size < 2) mulliganSelection.add(index);
          renderModule();
        },
        confirm() {
          paperThroneFinishMulligan(game, game.currentIndex, mulliganSelection);
          mulliganSelection = new Set();
          saveAndRender();
        },
      })
      : paperThroneSidePanel(game, selectedHandIndex, {
        select(index) {
          if (game.phase !== "turn" || game.players[game.currentIndex].controller !== "human") return;
          selectedHandIndex = selectedHandIndex === index ? -1 : index;
          renderModule();
        },
        pass() {
          if (paperThronePass(game, game.currentIndex)) {
            selectedHandIndex = -1;
            saveAndRender();
          }
        },
        leader() {
          if (paperThroneUseLeader(game, game.currentIndex)) saveAndRender();
        },
        playAuto() {
          if (selectedHandIndex < 0) return;
          if (paperThroneResolveCard(game, game.currentIndex, selectedHandIndex)) {
            selectedHandIndex = -1;
            saveAndRender();
          }
        },
      });
    body.append(table, panel);
    shell.append(body);
    if (game.phase === "turn" && game.players[game.currentIndex].controller === "ai") runAi();
    return shell;
  };

  const renderModule = () => {
    clearTimer();
    mount.innerHTML = "";
    mount.append(renderSubnav());
    if (paperThroneSection === "cards" && isAdmin) mount.append(paperThroneCardWorkshop({
      getDraft: () => cardDraft,
      setDraft: (value) => { cardDraft = value; },
      getSearch: () => cardCollectionSearch,
      setSearch: (value) => { cardCollectionSearch = value; },
      getScope: () => cardCollectionScope,
      setScope: (value) => { cardCollectionScope = value; },
      getFaction: () => cardCollectionFaction,
      setFaction: (value) => { cardCollectionFaction = value; },
      getCollectionScroll: () => cardCollectionScroll,
      setCollectionScroll: (value) => { cardCollectionScroll = value; },
      rerender: renderModule,
    }));
    else if (paperThroneSection === "factions" && isAdmin) mount.append(paperThroneFactionWorkshop({
      getDraft: () => factionDraft,
      setDraft: (value) => { factionDraft = value; },
      rerender: renderModule,
    }));
    else if (paperThroneSection === "leaders" && isAdmin) mount.append(paperThroneLeaderWorkshop({
      getDraft: () => leaderDraft,
      setDraft: (value) => { leaderDraft = value; },
      rerender: renderModule,
    }));
    else if (paperThroneSection === "decks" && isAdmin) mount.append(paperThroneDeckWorkshop({
      getDraft: () => deckDraft,
      setDraft: (value) => { deckDraft = value; },
      getSearch: () => deckSearch,
      setSearch: (value) => { deckSearch = value; },
      getCatalogScroll: () => deckCatalogScroll,
      setCatalogScroll: (value) => { deckCatalogScroll = value; },
      rerender: renderModule,
    }));
    else {
      paperThroneSection = "play";
      mount.append(renderPlay());
    }
  };

  activeAshanaGameCleanup = () => {
    closed = true;
    clearTimer();
  };
  renderModule();
  return root;
};

function paperThroneGameToolbar(game, onNewGame) {
  const toolbar = el("header", "paper-throne-toolbar");
  const title = el("div", "paper-throne-toolbar-title");
  title.append(el("p", "eyebrow", `Раунд ${game.round}`), el("strong", "", "Бумажный трон"));
  const tokens = el("div", "paper-throne-token-board");
  game.players.forEach((player) => {
    const row = el("div", "paper-throne-token-row");
    const marks = el("span", "paper-throne-token-marks");
    for (let index = 0; index < 2; index += 1) marks.append(el("i", index < player.tokens ? "active" : "lost"));
    row.append(el("span", "", player.name), marks);
    tokens.append(row);
  });
  toolbar.append(title, tokens, button("Новая партия", "ghost-button", onNewGame));
  return toolbar;
}

function paperThronePlayerBar(game, playerIndex, opponent) {
  const player = game.players[playerIndex];
  const deck = paperThroneDeckById(player.deckId);
  const bar = el("div", `paper-throne-player-bar ${opponent ? "opponent" : "self"} ${game.currentIndex === playerIndex && game.phase === "turn" ? "active" : ""}`);
  const identity = el("div", "paper-throne-player-identity");
  identity.append(directoryPortrait(player.portrait, player.name, player.portraitStyle));
  const copy = el("div");
  copy.append(el("strong", "", player.name), el("span", "", deck.name));
  identity.append(copy);
  const stats = el("div", "paper-throne-player-stats");
  stats.append(
    paperThroneStat("Сила", paperThroneScore(game, playerIndex)),
    paperThroneStat("Рука", player.hand.length),
    paperThroneStat("Колода", player.deck.length),
    paperThroneStat("Отбой", player.discard.length)
  );
  if (player.passed) stats.append(el("span", "paper-throne-passed", "ПАС"));
  bar.append(identity, stats);
  return bar;
}

function paperThroneStat(label, value) {
  const stat = el("span", "paper-throne-stat");
  stat.append(el("small", "", label), el("strong", "", String(value)));
  return stat;
}

function paperThroneBattleRow(game, row, selectedHandIndex, onPlay) {
  const current = game.players[game.currentIndex];
  const viewerIndex = game.mode === "ai" ? 0 : game.currentIndex;
  const opponentIndex = viewerIndex === 0 ? 1 : 0;
  const band = el("div", `paper-throne-battle-row row-${row} ${game.weather[row] ? "weathered" : ""}`);
  const opponentCards = el("div", "paper-throne-board-line opponent-line");
  const ownCards = el("div", "paper-throne-board-line own-line");
  const selectedCard = selectedHandIndex >= 0 ? paperThroneCardById(current.hand[selectedHandIndex]) : null;
  const decoyMode = paperThroneCardHasAbility(selectedCard, "decoy") && game.currentIndex === viewerIndex;
  game.players[opponentIndex].board[row].forEach((instance) => {
    opponentCards.append(paperThroneBoardCard(game, opponentIndex, row, instance, false, () => {}));
  });
  game.players[viewerIndex].board[row].forEach((instance) => {
    const targetable = Boolean(decoyMode && !paperThroneCardById(instance.cardId).hero);
    ownCards.append(paperThroneBoardCard(game, viewerIndex, row, instance, targetable, () => onPlay("", instance.uid)));
  });
  const label = document.createElement("button");
  label.type = "button";
  label.className = "paper-throne-row-label";
  const canTarget = selectedCard && paperThroneCanPlayCard(game, game.currentIndex, selectedHandIndex, row);
  if (canTarget) {
    band.classList.add("playable-target");
    label.addEventListener("click", () => onPlay(row));
  }
  label.disabled = !canTarget;
  label.append(
    el("strong", "", PAPER_THRONE_ROW_LABELS[row]),
    el("span", "", `${paperThroneRowScore(game, opponentIndex, row)} : ${paperThroneRowScore(game, viewerIndex, row)}`)
  );
  const conditions = el("span", "paper-throne-row-conditions");
  if (game.weather[row]) conditions.append(el("i", "weather", "Погода"));
  if (game.players[opponentIndex].horn[row]) conditions.append(el("i", "horn", "Рог соперника"));
  if (game.players[viewerIndex].horn[row]) conditions.append(el("i", "horn", "Рог"));
  band.append(opponentCards, label, conditions, ownCards);
  return band;
}

function paperThroneBoardCard(game, playerIndex, row, instance, targetable, onTarget) {
  const card = paperThroneCardById(instance.cardId);
  const item = document.createElement(targetable ? "button" : "article");
  if (targetable) item.type = "button";
  item.className = `paper-throne-board-card faction-${card.faction} ${card.hero ? "hero" : ""} ${targetable ? "decoy-target" : ""}`;
  paperThroneApplyFactionStyle(item, card.faction);
  item.title = `${card.name}: ${card.text}`;
  if (targetable) item.addEventListener("click", onTarget);
  const art = el("div", "paper-throne-board-card-art");
  paperThroneCardImageStyle(art, card);
  if (!card.art) art.append(el("span", "", card.name.slice(0, 2).toUpperCase()));
  item.append(
    art,
    el("strong", "paper-throne-board-card-name", card.name),
    el("span", "paper-throne-board-card-power", String(paperThroneEffectivePower(game, playerIndex, row, instance)))
  );
  if (card.hero) item.append(el("span", "paper-throne-hero-mark", "Г"));
  if (!paperThroneCardHasAbility(card, "none")) item.append(el("span", "paper-throne-ability-mark", paperThroneAbilityText(card).slice(0, 1)));
  return item;
}

function paperThroneHandCard(cardId, index, options, onSelect) {
  const card = paperThroneCardById(cardId);
  const item = button("", `paper-throne-card faction-${card.faction} ${card.hero ? "hero" : ""} ${options.selected ? "selected" : ""} ${options.disabled ? "disabled" : ""}`, onSelect);
  paperThroneApplyFactionStyle(item, card.faction);
  item.disabled = Boolean(options.disabled);
  const art = el("div", "paper-throne-card-art");
  paperThroneCardImageStyle(art, card);
  if (!card.art) art.append(el("span", "paper-throne-card-monogram", card.name.slice(0, 2).toUpperCase()));
  const rowLabel = card.type === "unit" ? PAPER_THRONE_ROW_LABELS[card.row] : "Особое действие";
  item.append(
    el("span", "paper-throne-card-power", card.type === "unit" ? String(card.power) : "С"),
    art,
    el("strong", "paper-throne-card-name", card.name),
    el("small", "paper-throne-card-meta", `${card.hero ? "Герой · " : ""}${rowLabel}`),
    el("small", "paper-throne-card-ability", paperThroneAbilityText(card)),
    el("p", "", card.text)
  );
  if (options.mulliganSelected) item.append(el("span", "paper-throne-mulligan-mark", "Заменить"));
  return item;
}

function paperThroneSidePanel(game, selectedHandIndex, handlers) {
  const panel = el("aside", "paper-throne-side-panel");
  const current = game.players[game.currentIndex];
  const humanTurn = game.phase === "turn" && current.controller === "human";
  const head = el("div", "paper-throne-turn-head");
  head.append(el("p", "eyebrow", humanTurn ? "Ваш ход" : "Ход соперника"), el("h3", "", current.name));
  const hand = el("div", "paper-throne-hand");
  if (humanTurn) {
    current.hand.forEach((cardId, index) => {
      const card = paperThroneCardById(cardId);
      const hasTarget = paperThroneCardHasAbility(card, "decoy")
        ? paperThroneCanPlayCard(game, game.currentIndex, index)
        : ["clear", "scorch"].some((ability) => paperThroneCardHasAbility(card, ability))
          ? true
          : paperThroneRowsForCard(card).some((row) => paperThroneCanPlayCard(game, game.currentIndex, index, row));
      hand.append(paperThroneHandCard(cardId, index, {
        selected: selectedHandIndex === index,
        disabled: !hasTarget,
      }, () => handlers.select(index)));
    });
  } else {
    Array.from({ length: current.hand.length }, () => hand.append(el("div", "paper-throne-card-back", "БТ")));
  }
  if (!current.hand.length) hand.append(el("p", "empty", "Рука пуста. Остается спасовать."));
  const selected = humanTurn && selectedHandIndex >= 0 ? paperThroneCardById(current.hand[selectedHandIndex]) : null;
  const hint = el("div", "paper-throne-selection-hint");
  if (!selected) hint.textContent = humanTurn ? "Выберите карту. Подходящий ряд подсветится на поле." : "Карты соперника скрыты.";
  else if (paperThroneCardHasAbility(selected, "decoy")) hint.textContent = "Нажмите подсвеченный свой отряд, который нужно вернуть в руку.";
  else if (["clear", "scorch"].some((ability) => paperThroneCardHasAbility(selected, ability))) hint.textContent = "Эта карта не требует выбора ряда.";
  else hint.textContent = `Выбрано: ${selected.name}. Нажмите подсвеченный ряд.`;
  const deck = paperThroneDeckById(current.deckId);
  const leaderData = paperThroneLeaderById(current.leaderId || deck?.leaderId);
  const actions = el("div", "paper-throne-actions");
  const leader = button(`Лидер: ${leaderData?.name || "не выбран"}`, "ghost-button", handlers.leader);
  leader.disabled = !humanTurn || current.leaderUsed || !leaderData || leaderData.effect === "none";
  const pass = button("Пас", "danger-button", handlers.pass);
  pass.disabled = !humanTurn;
  actions.append(leader, pass);
  if (selected && ["clear", "scorch"].some((ability) => paperThroneCardHasAbility(selected, ability))) actions.prepend(button("Разыграть карту", "primary-button", handlers.playAuto));
  const faction = paperThroneFactionById(current.faction);
  const passive = el("div", "paper-throne-passive");
  passive.append(el("strong", "", faction.name), el("span", "", faction.passiveText));
  const history = paperThroneHistoryPanel(game);
  panel.append(head, hand, hint, actions, passive, history);
  return panel;
}

function paperThroneMulliganPanel(game, selection, handlers) {
  const panel = el("aside", "paper-throne-side-panel paper-throne-mulligan-panel");
  const player = game.players[game.currentIndex];
  const head = el("div", "paper-throne-turn-head");
  head.append(el("p", "eyebrow", "Подготовка к партии"), el("h3", "", player.name));
  const explanation = el("p", "paper-throne-mulligan-copy", "Выберите до двух карт, которые вернутся в колоду. Вместо них будут взяты новые карты. Остальная рука останется с вами на все раунды.");
  const hand = el("div", "paper-throne-hand");
  player.hand.forEach((cardId, index) => {
    hand.append(paperThroneHandCard(cardId, index, {
      selected: selection.has(index),
      disabled: false,
      mulliganSelected: selection.has(index),
    }, () => handlers.toggle(index)));
  });
  const counter = el("div", "paper-throne-mulligan-counter", `Выбрано: ${selection.size} / 2`);
  const confirmButton = button(selection.size ? "Заменить выбранные" : "Оставить руку", "primary-button", handlers.confirm);
  panel.append(head, explanation, hand, counter, confirmButton, paperThroneHistoryPanel(game));
  return panel;
}

function paperThroneHistoryPanel(game) {
  const history = el("div", "paper-throne-history");
  history.append(el("p", "eyebrow", "Записи стола"));
  game.history.slice(0, 12).forEach((entry) => {
    const row = el("div", `paper-throne-history-entry ${entry.kind}`);
    row.append(el("span", "", `Р${entry.round}`), el("p", "", entry.text));
    history.append(row);
  });
  return history;
}

function paperThroneHandoff(game, title, onReveal) {
  const player = game.players[game.currentIndex];
  const overlay = el("div", "paper-throne-overlay paper-throne-handoff");
  overlay.append(
    el("p", "eyebrow", "Закрытая рука"),
    el("h3", "", title),
    directoryPortrait(player.portrait, player.name, player.portraitStyle),
    el("strong", "", player.name),
    el("p", "", "Убедитесь, что соперник не смотрит на экран."),
    button("Открыть мой стол", "primary-button", onReveal)
  );
  return overlay;
}

function paperThroneThinking(text) {
  const overlay = el("div", "paper-throne-overlay paper-throne-thinking");
  overlay.append(el("span", "paper-throne-ink-loader"), el("strong", "", text));
  return overlay;
}

function paperThroneRoundEnd(game, onNext) {
  const result = game.roundResult;
  const overlay = el("div", "paper-throne-overlay paper-throne-round-end");
  const title = result.winnerIndex < 0 ? "Раунд завершился ничьей" : `${game.players[result.winnerIndex].name} выигрывает раунд`;
  overlay.append(
    el("p", "eyebrow", "Подсчет силы"),
    el("h3", "", title),
    el("div", "paper-throne-round-score", `${result.scores[0]} : ${result.scores[1]}`),
    el("p", "", "Все карты поля уходят в отбой. Новые карты не добираются, кроме случаев, предусмотренных способностью фракции."),
    button("Следующий раунд", "primary-button", onNext)
  );
  return overlay;
}

function paperThroneFinish(game, onRestart) {
  const overlay = el("div", "paper-throne-overlay paper-throne-finish");
  if (game.winnerIndex < 0) {
    overlay.append(el("p", "eyebrow", "Оба лишились жетонов"), el("h3", "", "Бумажный трон остался пуст"), el("p", "", "Партия завершилась общей гибелью армий."));
  } else {
    const winner = game.players[game.winnerIndex];
    overlay.append(
      el("p", "eyebrow", "Бумажный трон занят"),
      directoryPortrait(winner.portrait, winner.name, winner.portraitStyle),
      el("h3", "", winner.name),
      el("p", "", `${winner.name} сохранил последний жетон и получает бумажную корону.`)
    );
  }
  overlay.append(button("Новая борьба за трон", "primary-button", onRestart));
  return overlay;
}

function paperThroneInput(value = "", type = "text") {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  return input;
}

function paperThroneField(label, control, hint = "") {
  const field = el("label", "paper-throne-field");
  field.append(el("span", "", label), control);
  if (hint) field.append(el("small", "", hint));
  return field;
}

function paperThroneFieldBlock(label, control, hint = "") {
  const field = el("div", "paper-throne-field");
  field.append(el("span", "", label), control);
  if (hint) field.append(el("small", "", hint));
  return field;
}

function paperThroneGroup(className, ...children) {
  const group = el("div", className);
  group.append(...children.filter(Boolean));
  return group;
}

function paperThroneNewCardDraft() {
  return paperThroneNormalizeCustomCard({
    id: `custom-card:${crypto.randomUUID()}`,
    name: "",
    faction: "neutral",
    type: "unit",
    row: "melee",
    power: 4,
    abilities: ["none"],
    properties: ["новое свойство"],
    affiliations: ["без принадлежности"],
    hero: false,
    text: "",
    art: "",
    imageStyle: { fit: "cover", positionX: 50, positionY: 50, zoom: 100, ratio: "3:4" },
  });
}

function paperThroneCardWorkshop(context) {
  const root = el("section", "paper-throne-workshop paper-throne-card-studio");
  const customData = paperThroneCustomData();
  let draft = context.getDraft();
  if (!draft) {
    const existing = customData.cards.find((card) => card.id === paperThroneEditingCardId);
    draft = existing ? structuredClone(paperThroneNormalizeCustomCard(existing)) : paperThroneNewCardDraft();
    context.setDraft(draft);
  }
  const head = el("header", "paper-throne-workshop-head");
  const copy = el("div");
  copy.append(el("p", "eyebrow", "Карточные Авторитеты"), el("h3", "", "Карты Бумажного трона"), el("p", "", "Создавайте карты, задавайте их игровые свойства и отдельно отмечайте расу, род войск или иной тип принадлежности."));
  head.append(copy, button("Новая карта", "primary-button", () => {
    paperThroneEditingCardId = "";
    context.setDraft(paperThroneNewCardDraft());
    context.rerender();
  }));

  const body = el("div", "paper-throne-workshop-layout");
  const library = el("aside", "paper-throne-workshop-library paper-throne-card-collection");
  const customCards = customData.cards.map(paperThroneNormalizeCustomCard);
  const collectionEntries = customCards.map((card) => ({ card, scope: "custom" }))
    .sort((left, right) => left.card.name.localeCompare(right.card.name, "ru"));
  const collectionHead = el("div", "paper-throne-collection-head");
  collectionHead.append(paperThroneGroup("", el("h4", "", "Коллекция карт"), el("small", "", `${collectionEntries.length} всего · ${customCards.length} создано`)));
  const search = paperThroneInput(context.getSearch(), "search");
  search.placeholder = "Название, свойство или принадлежность";
  const faction = selectInput([["all", "Все фракции"], ...paperThroneAllFactions().map((item) => [item.id, item.name])], context.getFaction());
  const filters = paperThroneGroup("paper-throne-collection-filters", search, faction);
  const collection = el("div", "paper-throne-collection-grid");
  const applyFilters = () => {
    const query = search.value.trim().toLocaleLowerCase("ru");
    collection.querySelectorAll(".paper-throne-collection-card").forEach((item) => {
      item.hidden = (faction.value !== "all" && item.dataset.faction !== faction.value)
        || (Boolean(query) && !item.dataset.search.includes(query));
    });
    const visible = [...collection.children].filter((item) => !item.hidden).length;
    empty.hidden = visible > 0;
  };
  const empty = el("p", "empty", "По выбранным условиям карт не найдено.");
  collectionEntries.forEach(({ card, scope: cardScope }) => {
    const item = paperThroneCollectionCard(card, cardScope, card.id === draft.id, () => {
      context.setCollectionScroll(collection.scrollTop);
      paperThroneEditingCardId = card.id;
      context.setDraft(structuredClone(card));
      context.rerender();
    });
    collection.append(item);
  });
  search.addEventListener("input", () => {
    context.setSearch(search.value);
    applyFilters();
  });
  faction.addEventListener("change", () => {
    context.setFaction(faction.value);
    applyFilters();
  });
  library.append(collectionHead, filters, collection, empty);
  applyFilters();
  requestAnimationFrame(() => { collection.scrollTop = context.getCollectionScroll(); });

  const editor = el("div", "paper-throne-editor");
  const editorHeading = el("div", "paper-throne-editor-heading");
  const isExisting = customData.cards.some((card) => card.id === draft.id);
  editorHeading.append(
    paperThroneGroup("", el("p", "eyebrow", isExisting ? "Редактирование карты" : "Новая карта"), el("h4", "", draft.name || "Безымянная карта")),
    el("span", "paper-throne-save-state", isExisting ? "Сохранена в общей коллекции" : "Еще не сохранена")
  );
  const preview = paperThroneLargeCardPreview(draft);
  const form = paperThroneCardForm(draft, preview, context);
  const actions = el("div", "paper-throne-editor-actions");
  actions.append(button("Сохранить карту", "primary-button", () => {
    if (!draft.name.trim()) {
      alert("Укажите название карты.");
      return;
    }
    const normalized = paperThroneNormalizeCustomCard(draft);
    if (!normalized.art) {
      alert("Добавьте арт карты.");
      return;
    }
    if (!normalized.properties.length) {
      alert("Добавьте хотя бы одно свойство карты.");
      return;
    }
    if (!normalized.affiliations.length) {
      alert("Добавьте хотя бы одну принадлежность карты.");
      return;
    }
    if (normalized.type === "special" && !["weather-melee", "weather-ranged", "weather-siege", "clear", "horn", "scorch", "decoy"].some((ability) => paperThroneCardHasAbility(normalized, ability))) {
      alert("Выберите специальное умение для специальной карты.");
      return;
    }
    const index = customData.cards.findIndex((card) => card.id === normalized.id);
    if (index >= 0) customData.cards[index] = normalized;
    else customData.cards.push(normalized);
    paperThroneEditingCardId = normalized.id;
    context.setDraft(structuredClone(normalized));
    saveState();
    context.rerender();
  }));
  if (customData.cards.some((card) => card.id === draft.id)) {
    actions.append(button("Удалить карту", "danger-button", () => {
      if (!confirm(`Удалить карту «${draft.name}»? Она также исчезнет из пользовательских колод.`)) return;
      customData.cards = customData.cards.filter((card) => card.id !== draft.id);
      customData.decks.forEach((deck) => { deck.cardIds = deck.cardIds.filter((id) => id !== draft.id); });
      paperThroneEditingCardId = "";
      context.setDraft(paperThroneNewCardDraft());
      saveState();
      context.rerender();
    }));
  }
  editor.append(editorHeading, paperThroneGroup("paper-throne-editor-main", preview, form), actions);
  body.append(library, editor);
  root.append(head, body);
  return root;
}

function paperThroneCollectionCard(card, scope, active, onSelect) {
  const item = button("", `paper-throne-collection-card faction-${card.faction} ${active ? "active" : ""}`, onSelect);
  paperThroneApplyFactionStyle(item, card.faction);
  item.dataset.scope = scope;
  item.dataset.faction = card.faction;
  item.dataset.search = `${card.name} ${card.properties.join(" ")} ${card.affiliations.join(" ")} ${paperThroneAbilityText(card)} ${PAPER_THRONE_ROW_LABELS[card.row] || ""}`.toLocaleLowerCase("ru");
  const art = el("span", "paper-throne-collection-art");
  paperThroneCardImageStyle(art, card);
  if (!card.art) art.append(el("span", "", card.name.slice(0, 2).toUpperCase()));
  const power = el("strong", "paper-throne-collection-power", card.type === "unit" ? String(card.power) : "С");
  const copy = el("span", "paper-throne-collection-copy");
  copy.append(
    el("strong", "", card.name),
    el("small", "", `${paperThroneFactionById(card.faction).name} · ${card.type === "unit" ? PAPER_THRONE_ROW_LABELS[card.row] : "Особая"}`),
    el("small", "paper-throne-collection-ability", paperThroneAbilityText(card)),
    el("small", "paper-throne-collection-tags", card.affiliations.slice(0, 3).join(" · "))
  );
  const badge = el("span", `paper-throne-source-badge ${scope}`, scope === "base" ? "Шаблон" : "Своя");
  item.append(art, power, copy, badge);
  return item;
}

function paperThroneLargeCardPreview(card) {
  const preview = el("article", `paper-throne-card-preview faction-${card.faction} ${card.hero ? "hero" : ""}`);
  paperThroneApplyFactionStyle(preview, card.faction);
  const art = el("div", "paper-throne-card-preview-art");
  paperThroneCardImageStyle(art, card);
  if (!card.art) art.append(el("span", "", "Арт карты"));
  const properties = el("div", "paper-throne-card-preview-tags properties");
  paperThroneRenderTermBox(properties, "Свойства", card.properties);
  const affiliations = el("div", "paper-throne-card-preview-tags affiliations");
  paperThroneRenderTermBox(affiliations, "Принадлежность", card.affiliations);
  preview.append(
    el("span", "paper-throne-card-preview-power", card.type === "unit" ? String(card.power) : "С"),
    art,
    el("h4", "", card.name || "Безымянная карта"),
    el("p", "paper-throne-card-preview-meta", `${paperThroneFactionById(card.faction).name} · ${paperThroneAbilityText(card)}`),
    properties,
    affiliations,
    el("p", "", card.text || "Описание карты пока не заполнено.")
  );
  return preview;
}

function paperThroneRenderTermBox(box, label, terms) {
  box.innerHTML = "";
  box.append(el("small", "paper-throne-tag-label", label));
  paperThroneNormalizeTerms(terms).forEach((term) => box.append(el("span", "", term)));
}

function paperThroneCardForm(draft, preview, context) {
  const form = el("div", "paper-throne-form");
  const name = paperThroneInput(draft.name);
  name.addEventListener("input", () => {
    draft.name = name.value;
    preview.querySelector("h4").textContent = draft.name || "Безымянная карта";
  });
  const faction = selectInput(paperThroneAllFactions().map((item) => [item.id, item.name]), draft.faction);
  faction.addEventListener("change", () => {
    draft.faction = faction.value;
    context.setDraft(draft);
    context.rerender();
  });
  const type = selectInput([["unit", "Карта отряда"], ["special", "Специальная карта"]], draft.type);
  type.addEventListener("change", () => {
    draft.type = type.value;
    draft.abilities = draft.type === "special" ? ["clear"] : ["none"];
    draft.ability = draft.abilities[0];
    draft.hero = false;
    context.setDraft(draft);
    context.rerender();
  });
  form.append(
    paperThroneGroup("paper-throne-form-grid", paperThroneField("Название", name), paperThroneField("Фракция", faction), paperThroneField("Тип карты", type))
  );
  if (draft.type === "unit") {
    const row = selectInput(PAPER_THRONE_ROWS.map((id) => [id, PAPER_THRONE_ROW_LABELS[id]]), draft.row);
    row.addEventListener("change", () => { draft.row = row.value; });
    const power = paperThroneInput(String(draft.power), "number");
    power.min = "0";
    power.max = "20";
    power.addEventListener("input", () => {
      draft.power = Math.min(20, Math.max(0, Number(power.value || 0)));
      preview.querySelector(".paper-throne-card-preview-power").textContent = String(draft.power);
    });
    const abilityPicker = el("div", "paper-throne-ability-picker");
    ["bond", "morale", "spy", "medic", "muster"].forEach((abilityId) => {
      const option = el("label", "paper-throne-ability-option");
      const control = document.createElement("input");
      control.type = "checkbox";
      control.checked = paperThroneCardHasAbility(draft, abilityId);
      control.addEventListener("change", () => {
        const selected = paperThroneCardAbilities(draft).filter((ability) => ability !== "none" && ability !== abilityId);
        if (control.checked) selected.push(abilityId);
        draft.abilities = paperThroneNormalizeAbilities(selected);
        draft.ability = draft.abilities[0];
        context.setDraft(draft);
        context.rerender();
      });
      option.append(control, el("span", "", PAPER_THRONE_ABILITY_LABELS[abilityId]));
      abilityPicker.append(option);
    });
    const heroWrap = el("label", "paper-throne-check");
    const hero = document.createElement("input");
    hero.type = "checkbox";
    hero.checked = draft.hero;
    hero.addEventListener("change", () => {
      draft.hero = hero.checked;
      context.setDraft(draft);
      context.rerender();
    });
    heroWrap.append(hero, el("span", "", "Герой: иммунитет к погоде и умениям"));
    form.append(
      paperThroneGroup("paper-throne-form-grid", paperThroneField("Линия", row), paperThroneField("Сила", power)),
      paperThroneFieldBlock("Особые способности", abilityPicker, "Можно выбрать несколько. Если ничего не отмечено, карта считается картой без умения."),
      heroWrap
    );
  } else {
    const specialAbilities = ["weather-melee", "weather-ranged", "weather-siege", "clear", "horn", "scorch", "decoy"];
    const ability = selectInput(specialAbilities.map((id) => [id, PAPER_THRONE_ABILITY_LABELS[id]]), paperThroneCardAbilities(draft)[0]);
    ability.addEventListener("change", () => {
      draft.abilities = [ability.value];
      draft.ability = ability.value;
      context.setDraft(draft);
      context.rerender();
    });
    form.append(paperThroneField("Особая способность", ability));
  }
  const properties = paperThroneInput(paperThroneNormalizeTerms(draft.properties).join(", "));
  properties.placeholder = "например: натиск, караул, тяжелая броня";
  properties.addEventListener("input", () => {
    draft.properties = paperThroneNormalizeTerms(properties.value);
    const box = preview.querySelector(".paper-throne-card-preview-tags.properties");
    paperThroneRenderTermBox(box, "Свойства", draft.properties);
  });
  const affiliations = paperThroneInput(paperThroneNormalizeTerms(draft.affiliations).join(", "));
  affiliations.placeholder = "например: человек, каторжник, северный легион";
  affiliations.addEventListener("input", () => {
    draft.affiliations = paperThroneNormalizeTerms(affiliations.value);
    const box = preview.querySelector(".paper-throne-card-preview-tags.affiliations");
    paperThroneRenderTermBox(box, "Принадлежность", draft.affiliations);
  });
  form.append(
    paperThroneField("Свойства карты", properties, "Игровые свойства и ключевые слова способности. «Сбор» и «Прочная связь» учитывают совпадающие свойства."),
    paperThroneField("Принадлежность", affiliations, "Раса, тип существа, род войск или организация. Совпадение также может связывать карты.")
  );
  const description = textarea(draft.text);
  description.rows = 4;
  description.addEventListener("input", () => {
    draft.text = description.value;
    const paragraphs = preview.querySelectorAll("p");
    paragraphs[paragraphs.length - 1].textContent = draft.text || "Описание карты пока не заполнено.";
  });
  form.append(paperThroneField("Описание", description));
  form.append(paperThroneCardImageEditor(draft, preview));
  return form;
}

function paperThroneCardImageEditor(draft, preview) {
  const block = el("section", "paper-throne-image-editor");
  block.append(el("h4", "", "Арт карты"));
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.addEventListener("change", async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    file.disabled = true;
    const url = await imageFileToUrl(selected, "paper-throne/cards");
    file.disabled = false;
    if (!url) return;
    draft.art = url;
    const art = preview.querySelector(".paper-throne-card-preview-art");
    art.innerHTML = "";
    paperThroneCardImageStyle(art, draft);
  });
  const style = paperThroneNormalizeImageStyle(draft.imageStyle);
  draft.imageStyle = style;
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], style.fit);
  const ratio = selectInput([["3:4", "Вертикальный 3:4"], ["1:1", "Квадрат 1:1"], ["16:9", "Широкий 16:9"]], style.ratio);
  const x = paperThroneRange(style.positionX);
  const y = paperThroneRange(style.positionY);
  const zoom = paperThroneRange(style.zoom, 70, 180);
  const refresh = () => {
    style.fit = fit.value;
    style.ratio = ratio.value;
    style.positionX = Number(x.value);
    style.positionY = Number(y.value);
    style.zoom = Number(zoom.value);
    const art = preview.querySelector(".paper-throne-card-preview-art");
    paperThroneCardImageStyle(art, draft);
  };
  [fit, ratio, x, y, zoom].forEach((control) => control.addEventListener("input", refresh));
  block.append(
    paperThroneField("Загрузить изображение", file),
    paperThroneGroup("paper-throne-form-grid", paperThroneField("Отображение", fit), paperThroneField("Формат", ratio)),
    paperThroneGroup("paper-throne-form-grid sliders", paperThroneField("Позиция X", x), paperThroneField("Позиция Y", y), paperThroneField("Масштаб", zoom))
  );
  return block;
}

function paperThroneRange(value, min = 0, max = 100) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  return input;
}

function paperThroneObjectImageEditor(draft, previewArt, folder, title) {
  const block = el("section", "paper-throne-image-editor");
  block.append(el("h4", "", title));
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.addEventListener("change", async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    file.disabled = true;
    const url = await imageFileToUrl(selected, folder);
    file.disabled = false;
    if (!url) return;
    draft.art = url;
    previewArt.innerHTML = "";
    paperThroneCardImageStyle(previewArt, draft);
  });
  const style = paperThroneNormalizeImageStyle(draft.imageStyle);
  draft.imageStyle = style;
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], style.fit);
  const ratio = selectInput([["3:4", "Вертикальный 3:4"], ["1:1", "Квадрат 1:1"], ["16:9", "Широкий 16:9"]], style.ratio);
  const x = paperThroneRange(style.positionX);
  const y = paperThroneRange(style.positionY);
  const zoom = paperThroneRange(style.zoom, 70, 180);
  const refresh = () => {
    style.fit = fit.value;
    style.ratio = ratio.value;
    style.positionX = Number(x.value);
    style.positionY = Number(y.value);
    style.zoom = Number(zoom.value);
    paperThroneCardImageStyle(previewArt, draft);
  };
  [fit, ratio, x, y, zoom].forEach((control) => control.addEventListener("input", refresh));
  block.append(
    paperThroneField("Загрузить изображение", file),
    paperThroneGroup("paper-throne-form-grid", paperThroneField("Отображение", fit), paperThroneField("Формат", ratio)),
    paperThroneGroup("paper-throne-form-grid sliders", paperThroneField("Позиция X", x), paperThroneField("Позиция Y", y), paperThroneField("Масштаб", zoom))
  );
  return block;
}

function paperThroneNewFactionDraft() {
  return paperThroneNormalizeFaction({
    id: `custom-faction:${crypto.randomUUID()}`,
    name: "",
    color: "#a98645",
    passive: "none",
    passiveText: PAPER_THRONE_FACTION_PASSIVES.none[1],
    description: "",
    art: "",
  });
}

function paperThroneFactionWorkshop(context) {
  const root = el("section", "paper-throne-workshop paper-throne-object-studio");
  const customData = paperThroneCustomData();
  let draft = context.getDraft();
  if (!draft) {
    const existing = customData.factions.find((item) => item.id === paperThroneEditingFactionId);
    draft = existing ? structuredClone(paperThroneNormalizeFaction(existing)) : paperThroneNewFactionDraft();
    context.setDraft(draft);
  }
  const head = el("header", "paper-throne-workshop-head");
  head.append(
    paperThroneGroup("", el("p", "eyebrow", "Политика стола"), el("h3", "", "Фракции"), el("p", "", "Фракция определяет состав колоды, цвет карт и пассивное правило армии.")),
    button("Новая фракция", "primary-button", () => {
      paperThroneEditingFactionId = "";
      context.setDraft(paperThroneNewFactionDraft());
      context.rerender();
    })
  );
  const body = el("div", "paper-throne-workshop-layout");
  const library = el("aside", "paper-throne-workshop-library");
  library.append(el("h4", "", "Фракции"));
  if (!customData.factions.length) library.append(el("p", "empty", "Пока нет ни одной фракции."));
  customData.factions.map(paperThroneNormalizeFaction).sort((a, b) => a.name.localeCompare(b.name, "ru")).forEach((faction) => {
    const item = button("", `paper-throne-library-item ${faction.id === draft.id ? "active" : ""}`, () => {
      paperThroneEditingFactionId = faction.id;
      context.setDraft(structuredClone(faction));
      context.rerender();
    });
    paperThroneApplyFactionStyle(item, faction.id);
    const thumb = el("span", "paper-throne-library-thumb faction-thumb");
    paperThroneCardImageStyle(thumb, faction);
    if (!faction.art) thumb.style.background = faction.color;
    item.append(thumb, paperThroneGroup("", el("strong", "", faction.name), el("small", "", PAPER_THRONE_FACTION_PASSIVES[faction.passive][0])));
    library.append(item);
  });
  const editor = el("div", "paper-throne-editor");
  const preview = el("article", "paper-throne-object-preview faction-preview");
  preview.style.setProperty("--object-color", draft.color);
  const previewArt = el("div", "paper-throne-object-preview-art");
  paperThroneCardImageStyle(previewArt, draft);
  const previewName = el("h4", "", draft.name || "Безымянная фракция");
  const previewRule = el("strong", "", PAPER_THRONE_FACTION_PASSIVES[draft.passive][0]);
  const previewText = el("p", "", draft.description || "Описание фракции пока не заполнено.");
  preview.append(previewArt, previewName, previewRule, previewText);
  const name = paperThroneInput(draft.name);
  name.addEventListener("input", () => { draft.name = name.value; previewName.textContent = draft.name || "Безымянная фракция"; });
  const color = paperThroneInput(draft.color, "color");
  color.addEventListener("input", () => { draft.color = color.value; preview.style.setProperty("--object-color", draft.color); });
  const passive = selectInput(Object.entries(PAPER_THRONE_FACTION_PASSIVES).map(([id, value]) => [id, value[0]]), draft.passive);
  const passiveText = textarea(draft.passiveText);
  passiveText.rows = 3;
  passive.addEventListener("change", () => {
    draft.passive = passive.value;
    draft.passiveText = PAPER_THRONE_FACTION_PASSIVES[draft.passive][1];
    passiveText.value = draft.passiveText;
    previewRule.textContent = PAPER_THRONE_FACTION_PASSIVES[draft.passive][0];
  });
  passiveText.addEventListener("input", () => { draft.passiveText = passiveText.value; });
  const description = textarea(draft.description);
  description.rows = 5;
  description.addEventListener("input", () => { draft.description = description.value; previewText.textContent = draft.description || "Описание фракции пока не заполнено."; });
  const form = el("div", "paper-throne-form");
  form.append(
    paperThroneGroup("paper-throne-form-grid", paperThroneField("Название", name), paperThroneField("Цвет карт", color), paperThroneField("Правило фракции", passive)),
    paperThroneField("Текст правила", passiveText),
    paperThroneField("Описание", description),
    paperThroneObjectImageEditor(draft, previewArt, "paper-throne/factions", "Арт фракции")
  );
  const actions = el("div", "paper-throne-editor-actions");
  actions.append(button("Сохранить фракцию", "primary-button", () => {
    if (!draft.name.trim()) return alert("Укажите название фракции.");
    const normalized = paperThroneNormalizeFaction(draft);
    const duplicate = customData.factions.some((item) => item.id !== normalized.id && paperThroneNormalizeFaction(item).name.toLocaleLowerCase("ru") === normalized.name.toLocaleLowerCase("ru"));
    if (duplicate) return alert("Фракция с таким названием уже существует.");
    const index = customData.factions.findIndex((item) => item.id === normalized.id);
    if (index >= 0) customData.factions[index] = normalized;
    else customData.factions.push(normalized);
    paperThroneEditingFactionId = normalized.id;
    context.setDraft(structuredClone(normalized));
    saveState();
    context.rerender();
  }));
  if (customData.factions.some((item) => item.id === draft.id)) actions.append(button("Удалить фракцию", "danger-button", () => {
    const cardCount = customData.cards.filter((card) => card.faction === draft.id).length;
    const deckCount = customData.decks.filter((deck) => deck.faction === draft.id).length;
    if (!confirm(`Удалить фракцию «${draft.name}»? Вместе с ней будут удалены карты (${cardCount}) и колоды (${deckCount}) этой фракции.`)) return;
    const removedCardIds = new Set(customData.cards.filter((card) => card.faction === draft.id).map((card) => card.id));
    customData.factions = customData.factions.filter((item) => item.id !== draft.id);
    customData.cards = customData.cards.filter((card) => !removedCardIds.has(card.id));
    customData.decks = customData.decks.filter((deck) => deck.faction !== draft.id).map((deck) => ({ ...deck, cardIds: deck.cardIds.filter((id) => !removedCardIds.has(id)) }));
    customData.leaders = customData.leaders.map((leader) => {
      const factionIds = (leader.factionIds || []).filter((id) => id !== draft.id);
      return { ...leader, factionIds, universal: Boolean(leader.universal) || factionIds.length === 0 };
    });
    paperThroneSaveGame(null);
    paperThroneEditingFactionId = "";
    context.setDraft(paperThroneNewFactionDraft());
    saveState();
    context.rerender();
  }));
  editor.append(paperThroneGroup("paper-throne-object-editor-main", preview, form), actions);
  body.append(library, editor);
  root.append(head, body);
  return root;
}

function paperThroneNewLeaderDraft() {
  const firstFaction = paperThroneAllFactions(false)[0];
  return paperThroneNormalizeLeader({
    id: `custom-leader:${crypto.randomUUID()}`,
    name: "",
    factionIds: firstFaction ? [firstFaction.id] : [],
    universal: !firstFaction,
    effect: "none",
    description: "",
    art: "",
  });
}

function paperThroneLeaderWorkshop(context) {
  const root = el("section", "paper-throne-workshop paper-throne-object-studio");
  const customData = paperThroneCustomData();
  let draft = context.getDraft();
  if (!draft) {
    const existing = customData.leaders.find((item) => item.id === paperThroneEditingLeaderId);
    draft = existing ? structuredClone(paperThroneNormalizeLeader(existing)) : paperThroneNewLeaderDraft();
    context.setDraft(draft);
  }
  const head = el("header", "paper-throne-workshop-head");
  head.append(
    paperThroneGroup("", el("p", "eyebrow", "Воля полководца"), el("h3", "", "Лидеры"), el("p", "", "Лидер выбирается вместе с фракцией и один раз за партию применяет свое умение. Он может служить одной, нескольким или всем фракциям.")),
    button("Новый лидер", "primary-button", () => {
      paperThroneEditingLeaderId = "";
      context.setDraft(paperThroneNewLeaderDraft());
      context.rerender();
    })
  );
  const body = el("div", "paper-throne-workshop-layout");
  const library = el("aside", "paper-throne-workshop-library");
  library.append(el("h4", "", "Лидеры"));
  if (!customData.leaders.length) library.append(el("p", "empty", "Пока нет ни одного лидера."));
  customData.leaders.map(paperThroneNormalizeLeader).sort((a, b) => a.name.localeCompare(b.name, "ru")).forEach((leader) => {
    const item = button("", `paper-throne-library-item ${leader.id === draft.id ? "active" : ""}`, () => {
      paperThroneEditingLeaderId = leader.id;
      context.setDraft(structuredClone(leader));
      context.rerender();
    });
    const thumb = el("span", "paper-throne-library-thumb");
    paperThroneCardImageStyle(thumb, leader);
    item.append(thumb, paperThroneGroup("", el("strong", "", leader.name), el("small", "", leader.universal ? "Все фракции" : `${leader.factionIds.length} фракц.`)));
    library.append(item);
  });
  const editor = el("div", "paper-throne-editor");
  const preview = el("article", "paper-throne-object-preview leader-preview");
  const previewArt = el("div", "paper-throne-object-preview-art");
  paperThroneCardImageStyle(previewArt, draft);
  const previewName = el("h4", "", draft.name || "Безымянный лидер");
  const previewEffect = el("strong", "", PAPER_THRONE_LEADER_EFFECTS[draft.effect][0]);
  const previewText = el("p", "", draft.description || "Описание лидера пока не заполнено.");
  preview.append(previewArt, previewName, previewEffect, previewText);
  const name = paperThroneInput(draft.name);
  name.addEventListener("input", () => { draft.name = name.value; previewName.textContent = draft.name || "Безымянный лидер"; });
  const effect = selectInput(Object.entries(PAPER_THRONE_LEADER_EFFECTS).map(([id, value]) => [id, value[0]]), draft.effect);
  effect.addEventListener("change", () => { draft.effect = effect.value; previewEffect.textContent = PAPER_THRONE_LEADER_EFFECTS[draft.effect][0]; });
  const description = textarea(draft.description);
  description.rows = 5;
  description.addEventListener("input", () => { draft.description = description.value; previewText.textContent = draft.description || "Описание лидера пока не заполнено."; });
  const universalWrap = el("label", "paper-throne-check");
  const universal = document.createElement("input");
  universal.type = "checkbox";
  universal.checked = draft.universal;
  universalWrap.append(universal, el("span", "", "Подходит для любой фракции"));
  const memberships = el("div", "paper-throne-membership-grid");
  const renderMemberships = () => {
    memberships.innerHTML = "";
    paperThroneAllFactions(false).forEach((faction) => {
      const label = el("label", "paper-throne-ability-option");
      const control = document.createElement("input");
      control.type = "checkbox";
      control.checked = draft.factionIds.includes(faction.id);
      control.disabled = draft.universal;
      control.addEventListener("change", () => {
        if (control.checked) draft.factionIds = [...new Set([...draft.factionIds, faction.id])];
        else draft.factionIds = draft.factionIds.filter((id) => id !== faction.id);
      });
      label.append(control, el("span", "", faction.name));
      memberships.append(label);
    });
  };
  universal.addEventListener("change", () => { draft.universal = universal.checked; renderMemberships(); });
  renderMemberships();
  const form = el("div", "paper-throne-form");
  form.append(
    paperThroneGroup("paper-throne-form-grid", paperThroneField("Имя лидера", name), paperThroneField("Активная способность", effect)),
    paperThroneField("Описание", description),
    universalWrap,
    paperThroneFieldBlock("Допустимые фракции", memberships, "Можно выбрать одну или несколько фракций."),
    paperThroneObjectImageEditor(draft, previewArt, "paper-throne/leaders", "Портрет лидера")
  );
  const actions = el("div", "paper-throne-editor-actions");
  actions.append(button("Сохранить лидера", "primary-button", () => {
    if (!draft.name.trim()) return alert("Укажите имя лидера.");
    if (!draft.universal && !draft.factionIds.length) return alert("Выберите хотя бы одну фракцию или отметьте совместимость со всеми.");
    const normalized = paperThroneNormalizeLeader(draft);
    const index = customData.leaders.findIndex((item) => item.id === normalized.id);
    if (index >= 0) customData.leaders[index] = normalized;
    else customData.leaders.push(normalized);
    paperThroneEditingLeaderId = normalized.id;
    context.setDraft(structuredClone(normalized));
    saveState();
    context.rerender();
  }));
  if (customData.leaders.some((item) => item.id === draft.id)) actions.append(button("Удалить лидера", "danger-button", () => {
    const deckCount = customData.decks.filter((deck) => deck.leaderId === draft.id).length;
    if (!confirm(`Удалить лидера «${draft.name}»? Колоды с этим лидером (${deckCount}) также будут удалены.`)) return;
    customData.leaders = customData.leaders.filter((item) => item.id !== draft.id);
    customData.decks = customData.decks.filter((deck) => deck.leaderId !== draft.id);
    paperThroneSaveGame(null);
    paperThroneEditingLeaderId = "";
    context.setDraft(paperThroneNewLeaderDraft());
    saveState();
    context.rerender();
  }));
  editor.append(paperThroneGroup("paper-throne-object-editor-main", preview, form), actions);
  body.append(library, editor);
  root.append(head, body);
  return root;
}

function paperThroneNewDeckDraft() {
  const faction = paperThroneAllFactions(false)[0];
  const leader = faction ? paperThroneAllLeaders().find((item) => paperThroneLeaderSupportsFaction(item, faction.id)) : null;
  return paperThroneNormalizeDeck({
    id: `custom-deck:${crypto.randomUUID()}`,
    name: "",
    faction: faction?.id || "",
    leaderId: leader?.id || "",
    description: "",
    cardIds: [],
  });
}

function paperThroneDeckWorkshop(context) {
  const root = el("section", "paper-throne-workshop");
  const customData = paperThroneCustomData();
  let draft = context.getDraft();
  if (!draft) {
    const existing = customData.decks.find((deck) => deck.id === paperThroneEditingDeckId);
    draft = existing ? structuredClone(paperThroneNormalizeDeck(existing)) : paperThroneNewDeckDraft();
    context.setDraft(draft);
  }
  const head = el("header", "paper-throne-workshop-head");
  const copy = el("div");
  copy.append(el("p", "eyebrow", "Арсенал претендента"), el("h3", "", "Конструктор колод"), el("p", "", "Выберите фракцию и совместимого лидера, затем соберите минимум 22 отряда и не более 10 специальных карт."));
  head.append(copy, button("Пустая колода", "primary-button", () => {
    paperThroneEditingDeckId = "";
    context.setDraft(paperThroneNewDeckDraft());
    context.rerender();
  }));
  const body = el("div", "paper-throne-workshop-layout deck-layout");
  const library = el("aside", "paper-throne-workshop-library");
  library.append(el("h4", "", "Готовые колоды"));
  customData.decks.map(paperThroneNormalizeDeck).forEach((deck) => {
    const validation = paperThroneValidateDeck(deck);
    const item = el("div", `paper-throne-deck-library-item ${deck.id === draft.id ? "active" : ""}`);
    const choose = button("", "paper-throne-deck-library-main", () => {
      paperThroneEditingDeckId = deck.id;
      context.setDraft(structuredClone(deck));
      context.rerender();
    });
    const leader = paperThroneLeaderById(deck.leaderId);
    choose.append(el("strong", "", deck.name), el("span", "", `${paperThroneFactionById(deck.faction).name} · ${leader?.name || "без лидера"}`));
    item.append(choose, el("small", validation.ok ? "valid" : "invalid", validation.ok ? "Готова к игре" : validation.errors.join("; ")));
    library.append(item);
  });
  if (!customData.decks.length) library.append(el("p", "empty", "Сохраненных колод пока нет."));

  const editor = el("div", "paper-throne-editor paper-throne-deck-editor");
  const name = paperThroneInput(draft.name);
  name.addEventListener("input", () => { draft.name = name.value; });
  const factions = paperThroneAllFactions(false);
  const faction = selectInput(factions.map((item) => [item.id, item.name]), draft.faction);
  faction.addEventListener("change", () => {
    draft.faction = faction.value;
    draft.cardIds = draft.cardIds.filter((id) => [draft.faction, "neutral"].includes(paperThroneCardById(id).faction));
    if (!paperThroneLeaderSupportsFaction(paperThroneLeaderById(draft.leaderId), draft.faction)) {
      draft.leaderId = paperThroneAllLeaders().find((item) => paperThroneLeaderSupportsFaction(item, draft.faction))?.id || "";
    }
    context.setDraft(draft);
    context.rerender();
  });
  const compatibleLeaders = paperThroneAllLeaders().filter((item) => paperThroneLeaderSupportsFaction(item, draft.faction));
  const leader = selectInput(compatibleLeaders.map((item) => [item.id, item.name]), draft.leaderId);
  leader.addEventListener("change", () => { draft.leaderId = leader.value; });
  const description = textarea(draft.description);
  description.rows = 3;
  description.addEventListener("input", () => { draft.description = description.value; });
  const form = el("div", "paper-throne-form");
  form.append(
    paperThroneGroup("paper-throne-form-grid", paperThroneField("Название колоды", name), paperThroneField("Фракция", faction)),
    paperThroneField("Лидер", leader, compatibleLeaders.length ? "Показаны только лидеры, совместимые с выбранной фракцией." : "Для этой фракции пока нет подходящих лидеров."),
    paperThroneField("Описание", description),
    el("div", "paper-throne-faction-rule", draft.faction
      ? `${paperThroneFactionById(draft.faction).name}: ${paperThroneFactionById(draft.faction).passiveText}`
      : "Сначала создайте фракцию.")
  );
  const validation = paperThroneValidateDeck(draft);
  const stats = el("div", `paper-throne-deck-stats ${validation.ok ? "valid" : "invalid"}`);
  stats.append(
    paperThroneStat("Всего", validation.stats.total),
    paperThroneStat("Отряды", `${validation.stats.units} / 22+`),
    paperThroneStat("Особые", `${validation.stats.specials} / 10`),
    paperThroneStat("Герои", validation.stats.heroes)
  );
  if (!validation.ok) stats.append(el("p", "", validation.errors.join("; ")));
  const search = paperThroneInput(context.getSearch(), "search");
  search.placeholder = "Поиск карты по названию или умению";
  const catalog = el("div", "paper-throne-deck-catalog");
  search.addEventListener("input", () => {
    const value = search.value.trim().toLocaleLowerCase("ru");
    context.setSearch(search.value);
    catalog.querySelectorAll(".paper-throne-catalog-card").forEach((item) => {
      item.hidden = Boolean(value) && !item.dataset.search.includes(value);
    });
  });
  const counts = new Map();
  draft.cardIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  const query = context.getSearch().trim().toLocaleLowerCase("ru");
  paperThroneAllCards()
    .filter((card) => [draft.faction, "neutral"].includes(card.faction))
    .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name, "ru"))
    .forEach((card) => {
      const catalogCard = paperThroneDeckCatalogCard(card, counts.get(card.id) || 0, (delta) => {
      context.setCatalogScroll(catalog.scrollTop);
      const current = counts.get(card.id) || 0;
      const max = card.hero ? 1 : 3;
      const next = Math.min(max, Math.max(0, current + delta));
      if (next > current) draft.cardIds.push(...Array.from({ length: next - current }, () => card.id));
      if (next < current) {
        let remove = current - next;
        draft.cardIds = draft.cardIds.filter((id) => {
          if (id === card.id && remove > 0) {
            remove -= 1;
            return false;
          }
          return true;
        });
      }
      context.setDraft(draft);
      context.rerender();
      });
      catalogCard.dataset.search = `${card.name} ${card.properties.join(" ")} ${card.affiliations.join(" ")} ${paperThroneAbilityText(card)}`.toLocaleLowerCase("ru");
      catalogCard.hidden = Boolean(query) && !catalogCard.dataset.search.includes(query);
      catalog.append(catalogCard);
    });
  requestAnimationFrame(() => {
    catalog.scrollTop = context.getCatalogScroll();
  });
  const actions = el("div", "paper-throne-editor-actions");
  const save = button("Сохранить колоду", "primary-button", () => {
    if (!draft.name.trim()) {
      alert("Укажите название колоды.");
      return;
    }
    const normalized = paperThroneNormalizeDeck(draft);
    const result = paperThroneValidateDeck(normalized);
    if (!normalized.faction || !normalized.leaderId) {
      alert("Укажите фракцию и лидера.");
      return;
    }
    if (!result.ok) {
      alert(`Колода не готова: ${result.errors.join("; ")}.`);
      return;
    }
    const index = customData.decks.findIndex((deck) => deck.id === normalized.id);
    if (index >= 0) customData.decks[index] = normalized;
    else customData.decks.push(normalized);
    paperThroneEditingDeckId = normalized.id;
    context.setDraft(structuredClone(normalized));
    saveState();
    context.rerender();
  });
  actions.append(save);
  if (customData.decks.some((deck) => deck.id === draft.id)) actions.append(button("Удалить колоду", "danger-button", () => {
    if (!confirm(`Удалить колоду «${draft.name}»?`)) return;
    customData.decks = customData.decks.filter((deck) => deck.id !== draft.id);
    paperThroneEditingDeckId = "";
    context.setDraft(paperThroneNewDeckDraft());
    saveState();
    context.rerender();
  }));
  editor.append(form, stats, paperThroneField("Карты колоды", search), catalog, actions);
  body.append(library, editor);
  root.append(head, body);
  return root;
}

function paperThroneDeckCatalogCard(card, count, onAdjust) {
  const item = el("article", `paper-throne-catalog-card faction-${card.faction}`);
  paperThroneApplyFactionStyle(item, card.faction);
  const art = el("div", "paper-throne-catalog-art");
  paperThroneCardImageStyle(art, card);
  const copy = el("div", "paper-throne-catalog-copy");
  copy.append(
    el("strong", "", card.name),
    el("span", "", `${card.type === "unit" ? `${card.power} · ${PAPER_THRONE_ROW_LABELS[card.row]}` : "Специальная"}`),
    el("small", "", paperThroneAbilityText(card))
  );
  const stepper = el("div", "paper-throne-copy-stepper");
  const minus = button("−", "ghost-button", () => onAdjust(-1));
  minus.disabled = count <= 0;
  const plus = button("+", "ghost-button", () => onAdjust(1));
  plus.disabled = count >= (card.hero ? 1 : 3);
  stepper.append(minus, el("strong", "", String(count)), plus);
  item.append(art, copy, stepper);
  return item;
}
