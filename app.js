const STORAGE_KEY = "ashana-campaign-v1";
const UI_STORAGE_KEY = "ashana-ui-v1";
const LOCAL_SAFETY_STORAGE_KEY = "ashana-local-safety-v1";
const PENDING_CLOUD_STORAGE_KEY = "ashana-pending-cloud-save-v1";
const MINIGAME_STORAGE_KEY = "ashana-minigame-v1";
const DEFENSE_STORAGE_KEY = "ashana-defense-mirinka-v2";
const SNAKE_STORAGE_KEY = "ashana-snake-caravan-v1";
const CASINO_STORAGE_KEY = "ashana-casino-leshy-grave-v1";
const MINIGAME_SCORE_NAME_KEY = "ashana-minigame-score-name-v1";
const MINIGAME_SCORE_SUBMITTED_KEY = "ashana-minigame-score-submitted-v1";
const MINIGAME_SCORE_PREFIX = "minigame:";
const NAGASH_GAME_STORAGE_KEY = "ashana-nagash-mirror-v1";
const WIKI_INDEX_ID = "__wiki_index";
const CORE_RACES_WIKI_MIGRATION_ID = "pf1-core-races-ru-v1";
const EXTENDED_RACES_WIKI_MIGRATION_ID = "pf1-extended-races-ru-v1";
const OGRE_WIKI_MIGRATION_ID = "pf1-ogres-ru-v1";
const HARPY_WIKI_MIGRATION_ID = "pf1-harpies-ru-v1";
const NPC_STAT_PROFILE_MIGRATION_ID = "wiki-npc-stat-profiles-v1";
const MAP_OWNERSHIP_MIGRATION_ID = "map-cell-ownership-v1";
const extendedRaceWikiArticles = Array.isArray(globalThis.PF1_EXTENDED_RACE_WIKI_ARTICLES)
  ? globalThis.PF1_EXTENDED_RACE_WIKI_ARTICLES
  : [];
const ogreWikiArticles = Array.isArray(globalThis.PF1_OGRE_WIKI_ARTICLES)
  ? globalThis.PF1_OGRE_WIKI_ARTICLES
  : [];
const harpyWikiArticles = Array.isArray(globalThis.PF1_HARPY_WIKI_ARTICLES)
  ? globalThis.PF1_HARPY_WIKI_ARTICLES
  : [];
const SUPABASE_ORIGIN = "https://msthqpeisopneallhkpk.supabase.co";
const SUPABASE_URL = globalThis.ASHANA_SUPABASE_URL || SUPABASE_ORIGIN;
const SUPABASE_ANON_KEY = "sb_publishable_Qp0Z8J0uymysKz7KJRYUdA__74_rnbj";
const SUPABASE_BUCKET = "ashana-media";
const CLOUD_SAVE_CLIENT_VERSION = "2026-08-27.1";
const CLOUD_SAVE_MAX_CONFLICT_ATTEMPTS = 8;
const TRASH_RETENTION_DAYS = 7;
let storageWarningShown = false;
let supabaseClient = null;
let supabaseUser = null;
let supabaseProfile = null;
let cloudStatus = "Локальный режим";
let cloudSaveTimer = null;
let cloudSaveRetryTimer = null;
let cloudSaveFailureTimer = null;
let cloudSaveInFlight = null;
let cloudSaveRevision = 0;
let cloudSaveConfirmedRevision = 0;
let cloudSaveDirty = false;
let cloudSaveFailureMessage = "";
let lastConfirmedCloudSaveAt = null;
let adminCloudRequired = false;
let lastCloudSnapshot = null;
let lastCloudUpdatedAt = null;
let cloudStateReady = false;
let coreRaceMigrationNeedsCloudSave = false;
let dataProtectionTrash = [];
let dataProtectionBackups = [];
let localSafetySnapshots = loadLocalSafetySnapshots();
persistLocalSafetySnapshots();
let dataProtectionLoaded = false;
let dataProtectionLoading = false;
let dataProtectionError = "";
let rollSubscription = null;
let campaignEntrySubscription = null;
let mirrorPollingTimer = null;
let mirrorPollInFlight = false;
let lastMirrorPollUpdatedAt = null;
const minigameLeaderboardCache = new Map();

const wikiCategories = [
  { id: "gods", title: "Боги", hint: "Пантеон, культы, догматы и святыни." },
  { id: "places", title: "Места в мире", hint: "Регионы, дороги, города, руины и подземелья." },
  { id: "people", title: "Известные личности", hint: "Правители, герои, исторические фигуры." },
  { id: "races", title: "Расы и народы", hint: "Народы Асханы и игровые расы Pathfinder 1e." },
  { id: "npcs", title: "Выделяющиеся NPC", hint: "Союзники, враги, заказчики и странные знакомые." },
  { id: "buildings", title: "Важные постройки", hint: "Храмы, крепости, башни, архивы и таверны." },
  { id: "states", title: "Государства", hint: "Королевства, города-государства, кланы и союзы." },
  { id: "factions", title: "Фракции", hint: "Ордены, культы, гильдии и тайные общества." },
  { id: "artifacts", title: "Артефакты", hint: "Реликвии, проклятые вещи и уникальная магия." },
  { id: "history", title: "История", hint: "Войны, катастрофы, календарь и древние эпохи." },
  { id: "threats", title: "Угрозы", hint: "Монстры, культы, болезни и текущие опасности." },
];

const categoryAliases = {
  Боги: "gods",
  Места: "places",
  Государства: "states",
  Расы: "races",
  "Расы и народы": "races",
  Тайны: "history",
};

const npcAbilityDefinitions = [
  ["str", "Сила"],
  ["dex", "Ловкость"],
  ["con", "Выносливость"],
  ["int", "Интеллект"],
  ["wis", "Мудрость"],
  ["cha", "Харизма"],
];
const npcStatArrays = {
  adventurer: { label: "Авантюрист", values: [15, 14, 13, 12, 10, 8] },
  background: { label: "Фоновый NPC", values: [13, 12, 11, 10, 9, 8] },
};
const monsterStatArrays = {
  adventurer: { label: "Монстр-авантюрист", values: [4, 4, 2, 2, 0, -2] },
  background: { label: "Фоновый монстр", values: [0, 0, 0, 0, 0, 0] },
};
const NPC_STAT_TRANSFER_KEY = "ashana-npc-stat-transfer-v1";

const movementTypeOptions = [
  ["land", "Сухопутная"],
  ["swim", "Плавание"],
  ["fly", "Полет"],
  ["climb", "Лазание"],
  ["burrow", "Рытье"],
];

function movementTypeLabel(type) {
  return movementTypeOptions.find(([value]) => value === type)?.[1] ?? type;
}

function normalizeMovementSpeeds(speeds, legacySpeed = "") {
  const source = Array.isArray(speeds) ? speeds : [];
  const normalized = source.map((entry, index) => ({
    id: String(entry?.id || `speed-${index + 1}`),
    type: movementTypeOptions.some(([value]) => value === entry?.type) ? entry.type : "land",
    value: String(entry?.value ?? entry?.speed ?? "").trim(),
    armoredValue: String(entry?.armoredValue ?? entry?.armorValue ?? "").trim(),
  })).filter((entry) => entry.value || entry.armoredValue);
  if (!normalized.length && String(legacySpeed ?? "").trim()) {
    normalized.push({ id: "speed-land-legacy", type: "land", value: String(legacySpeed).trim(), armoredValue: "" });
  }
  return normalized;
}

function primaryMovementSpeed(speeds) {
  const normalized = normalizeMovementSpeeds(speeds);
  return String(normalized.find((entry) => entry.type === "land")?.value ?? normalized[0]?.value ?? "");
}

function movementSpeedSummary(entity) {
  const speeds = normalizeMovementSpeeds(entity?.speeds, entity?.speed);
  return speeds.length
    ? speeds.map((entry) => {
      const base = entry.value || "не указана";
      return `${movementTypeLabel(entry.type)}: ${base}${entry.armoredValue ? ` (в доспехе: ${entry.armoredValue})` : ""}`;
    }).join(" · ")
    : "не указана";
}

function normalizeBabEntries(entries, legacyBab = 0) {
  const source = Array.isArray(entries) ? entries : [];
  const normalized = source.map((entry, index) => ({
    id: String(entry?.id || `bab-${index + 1}`),
    label: String(entry?.label || entry?.name || "BAB").trim() || "BAB",
    value: String(entry?.value ?? entry?.bonus ?? "").trim(),
  })).filter((entry) => entry.value !== "");
  if (!normalized.length) {
    normalized.push({ id: "bab-primary", label: "BAB", value: String(legacyBab ?? 0) });
  }
  return normalized;
}

function primaryBabValue(entries, legacyBab = 0) {
  const value = Number(normalizeBabEntries(entries, legacyBab)[0]?.value);
  return Number.isFinite(value) ? value : Number(legacyBab || 0);
}

function babSummary(entity) {
  return normalizeBabEntries(entity?.babEntries, entity?.bab)
    .map((entry) => `${entry.label}: ${signed(Number(entry.value || 0))}`)
    .join(" · ");
}

const coreRaceWikiArticles = [
  {
    id: "pf1-core-races",
    title: "Основные расы Pathfinder 1e",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "pathfinder 1e", "правила"],
    image: "",
    public: true,
    npcStatProfile: { kind: "none", modifiers: {}, flexibleBonus: 0, baseStats: {} },
    related: ["pf1-dwarf", "pf1-elf", "pf1-gnome", "pf1-half-elf", "pf1-half-orc", "pf1-halfling", "pf1-human"],
    body: `Основные расы Pathfinder 1e - наиболее распространённые варианты для создания персонажа в классическом фэнтезийном мире. К ним относятся дворфы, эльфы, гномы, полуэльфы, полуорки, полурослики и люди.

Раса задаёт исходные модификаторы характеристик, размер, скорость, доступные языки, чувства и набор врождённых особенностей. Указанные в связанных статьях правила описывают стандартный вариант каждой расы. Альтернативные расовые черты могут заменять отдельные особенности, но требуют отдельного согласования с мастером.

Материалы подготовлены как самостоятельная русская справка по стандартным правилам Pathfinder 1e на основе d20PFSRD.

Источник: https://www.d20pfsrd.com/races`,
  },
  {
    id: "pf1-dwarf",
    title: "Дворф (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "дворф", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: { con: 2, wis: 2, cha: -2 }, flexibleBonus: 0, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Дворфы - коренастые и выносливые гуманоиды, тесно связанные с камнем, ремеслом, подземными крепостями и клановыми традициями. Среди искателей приключений они особенно хорошо чувствуют себя в роли стойких воинов и знатоков подземелий.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 Выносливость, +2 Мудрость, -2 Харизма.
• Размер: средний; обычных бонусов и штрафов за размер нет.
• Тип: гуманоид, подтип «дворф».
• Скорость: 20 футов. Броня и нагрузка не уменьшают эту скорость.
• Языки: общий и дворфийский. При высокой Интеллекте доступны великанский, гномий, гоблинский, орочий, терран и подземный общий.
• Чувства: тёмное зрение 60 футов.
• Очки расы: 11.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Защитная подготовка: +4 бонус уклонения к КБ против существ с подтипом «великан».
• Выносливость: +2 расовый бонус к спасброскам против ядов, заклинаний и псевдозаклинательных способностей.
• Устойчивость: +4 расовый бонус к ЗБМ против тарана и сбивания с ног, пока дворф стоит на земле.
• Жадность: +2 к Оценке немагических изделий из драгоценных металлов и камней.
• Чутьё камня: +2 к Вниманию для обнаружения необычной каменной кладки, ловушек и тайных дверей в камне. Проверка совершается автоматически при приближении на 10 футов.
• Ненависть: +1 к атакам против гуманоидов с орочьим или гоблиноидным подтипом.
• Знакомство с оружием: владение боевым топором, тяжёлой киркой и боевым молотом; оружие со словом «дворфийский» считается воинским.

Источник: https://www.d20pfsrd.com/races/core-races/dwarf`,
  },
  {
    id: "pf1-elf",
    title: "Эльф (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "эльф", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: { dex: 2, int: 2, con: -2 }, flexibleBonus: 0, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Эльфы - долгоживущий народ с тонким восприятием мира, природной ловкостью и сильной традицией тайной магии. Их долгая жизнь способствует мастерству, но телосложение обычно уступает человеческому по крепости.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 Ловкость, +2 Интеллект, -2 Выносливость.
• Размер: средний.
• Тип: гуманоид, подтип «эльф».
• Скорость: 30 футов.
• Языки: общий и эльфийский. Дополнительные: небесный, драконий, гнолльский, гномий, гоблинский, орочий и сильван.
• Чувства: сумеречное зрение; в тусклом свете эльф видит вдвое дальше человека.
• Очки расы: 10.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Эльфийские иммунитеты: иммунитет к магическому сну и +2 к спасброскам против чар и эффектов школы очарования.
• Обострённые чувства: +2 расовый бонус к Вниманию.
• Эльфийская магия: +2 к проверкам уровня заклинателя для преодоления сопротивления магии и +2 к Колдовству при определении свойств магических предметов.
• Знакомство с оружием: владение длинным и коротким луком, включая составные варианты, длинным мечом и рапирой; эльфийское оружие считается воинским.

Источник: https://www.d20pfsrd.com/races/core-races/elf`,
  },
  {
    id: "pf1-gnome",
    title: "Гном (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "гном", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: { con: 2, cha: 2, str: -2 }, flexibleBonus: 0, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Гномы - малый народ с фейским наследием, ярким воображением и тягой к новым впечатлениям. Они уступают крупным народам в физической силе, зато отличаются крепостью, общительностью, внимательностью и врождённым талантом к иллюзиям.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 Выносливость, +2 Харизма, -2 Сила.
• Размер: малый; +1 к КБ и атакам, -1 к ББМ и ЗБМ, +4 к Скрытности.
• Тип: гуманоид, подтип «гном».
• Скорость: 20 футов.
• Языки: общий, гномий и сильван. Дополнительные: драконий, дворфийский, эльфийский, великанский, гоблинский и орочий.
• Чувства: сумеречное зрение.
• Очки расы: 10.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Защитная подготовка: +4 бонус уклонения к КБ против великанов.
• Сопротивление иллюзиям: +2 к спасброскам против заклинаний и эффектов школы иллюзий.
• Обострённые чувства: +2 к Вниманию.
• Одержимость: +2 к одному выбранному Ремеслу или Профессии.
• Гномья магия: +1 к СЛ спасбросков против иллюзий гнома. При Харизме 11 и выше доступны один раз в день пляшущие огоньки, призрачный звук, фокусы и разговор с животными. Уровень заклинателя равен уровню персонажа; СЛ равна 10 + уровень заклинания + модификатор Харизмы.
• Ненависть: +1 к атакам против гуманоидов с рептильным или гоблиноидным подтипом.
• Знакомство с оружием: оружие со словом «гномье» считается воинским.

Источник: https://www.d20pfsrd.com/races/core-races/gnome`,
  },
  {
    id: "pf1-half-elf",
    title: "Полуэльф (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "полуэльф", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: {}, flexibleBonus: 2, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Полуэльфы соединяют человеческую гибкость с эльфийскими чувствами и долголетием. Они часто оказываются между двумя культурами, зато легко приспосабливаются, осваивают разные занятия и могут успешно развиваться сразу в нескольких профессиональных направлениях.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 к одной характеристике по выбору при создании персонажа.
• Размер: средний.
• Тип: гуманоид с подтипами «человек» и «эльф».
• Скорость: 30 футов.
• Языки: общий и эльфийский. При высокой Интеллекте можно выбрать любой язык, кроме тайных языков вроде друидического.
• Чувства: сумеречное зрение.
• Очки расы: 10.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Эльфийские иммунитеты: иммунитет к магическому сну и +2 к спасброскам против чар и эффектов школы очарования.
• Приспособляемость: черта «Уверенное владение навыком» в качестве дополнительной черты на 1-м уровне.
• Обострённые чувства: +2 к Вниманию.
• Эльфийская кровь: для эффектов, зависящих от расы, полуэльф считается одновременно человеком и эльфом.
• Многогранность: на 1-м уровне выбираются два предпочитаемых класса. При получении уровня в любом из них персонаж может получать обычную награду предпочитаемого класса: +1 пункт здоровья или +1 ранг навыка.

Источник: https://www.d20pfsrd.com/races/core-races/half-elf`,
  },
  {
    id: "pf1-half-orc",
    title: "Полуорк (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "полуорк", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: {}, flexibleBonus: 2, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Полуорки сочетают человеческую изменчивость с орочьей силой воли и свирепостью. Общественные предубеждения нередко подталкивают их к жизни на границе цивилизации, однако гибкие характеристики позволяют полуорку преуспеть почти в любом классе.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 к одной характеристике по выбору при создании персонажа.
• Размер: средний.
• Тип: гуманоид с подтипами «человек» и «орк».
• Скорость: 30 футов.
• Языки: общий и орочий. Дополнительные: бездны, драконий, великанский, гнолльский и гоблинский.
• Чувства: тёмное зрение 60 футов.
• Очки расы: 8.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Устрашающий вид: +2 расовый бонус к Запугиванию.
• Орочья свирепость: один раз в день, оказавшись ниже 0 пунктов здоровья, но не погибнув, полуорк может действовать ещё один раунд как при состоянии «обессилен». Если к концу следующего хода его здоровье не стало положительным, он теряет сознание и начинает умирать.
• Знакомство с оружием: владение двуручным топором и фальшионом; орочье оружие считается воинским.
• Орочья кровь: для зависящих от расы эффектов полуорк считается одновременно человеком и орком.

Источник: https://www.d20pfsrd.com/races/core-races/half-orc`,
  },
  {
    id: "pf1-halfling",
    title: "Полурослик (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "полурослик", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: { dex: 2, cha: 2, str: -2 }, flexibleBonus: 0, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Полурослики - небольшой, подвижный и удивительно удачливый народ. Они полагаются на ловкость, здравый смысл, смелость и способность находить выход из опасных обстоятельств, а их малый рост помогает скрываться и метко атаковать более крупных противников.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 Ловкость, +2 Харизма, -2 Сила.
• Размер: малый; +1 к КБ и атакам, -1 к ББМ и ЗБМ, +4 к Скрытности.
• Тип: гуманоид, подтип «полурослик».
• Скорость: 20 футов.
• Языки: общий и язык полуросликов. Дополнительные: дворфийский, эльфийский, гномий и гоблинский.
• Очки расы: 9.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Бесстрашие: +2 расовый бонус ко всем спасброскам против страха; складывается с бонусом удачи полурослика.
• Удача полурослика: +1 расовый бонус ко всем спасброскам.
• Уверенная поступь: +2 к Акробатике и Лазанию.
• Обострённые чувства: +2 к Вниманию.
• Знакомство с оружием: владение пращой; оружие со словом «полуросличье» считается воинским.

Источник: https://www.d20pfsrd.com/races/core-races/halfling`,
  },
  {
    id: "pf1-human",
    title: "Человек (Pathfinder 1e)",
    category: "Расы и народы",
    categoryId: "races",
    tags: ["раса", "основная раса", "человек", "pathfinder 1e"],
    image: "",
    public: true,
    npcStatProfile: { kind: "race", modifiers: {}, flexibleBonus: 2, baseStats: {} },
    related: ["pf1-core-races"],
    body: `Люди - многочисленный и чрезвычайно разнообразный народ. Их главное игромеханическое преимущество состоит в гибкости: персонаж сам выбирает усиленную характеристику, получает дополнительную черту и быстрее накапливает ранги навыков.

БАЗОВЫЕ ПАРАМЕТРЫ
• Характеристики: +2 к одной характеристике по выбору при создании персонажа.
• Размер: средний.
• Тип: гуманоид, подтип «человек».
• Скорость: 30 футов.
• Языки: общий. При высокой Интеллекте можно выбрать любые дополнительные языки, кроме тайных языков вроде друидического.
• Особые чувства: отсутствуют.
• Очки расы: 9.

СТАНДАРТНЫЕ РАСОВЫЕ ОСОБЕННОСТИ
• Дополнительная черта: одна дополнительная черта на 1-м уровне.
• Умелый: один дополнительный ранг навыка на 1-м уровне и ещё один дополнительный ранг при каждом последующем повышении уровня.

Источник: https://www.d20pfsrd.com/races/core-races/human`,
  },
];

const characterTabs = [
  ["overview", "Общее"],
  ["notes", "Заметки"],
  ["factions", "Фракции"],
  ["recognition", "Признание"],
  ["mechanics", "Механика"],
  ["links", "Связи"],
  ["gm", "GM"],
];

const characterMechanicsTabs = [
  ["summary", "Паспорт"],
  ["stats", "Характеристики"],
  ["combat", "Бой"],
  ["skills", "Навыки"],
  ["features", "Черты"],
  ["magic", "Магия"],
  ["inventory", "Инвентарь"],
];

const pathfinderSkills = [
  ["АКРОБАТИКА", "dex"],
  ["БЛЕФ", "cha"],
  ["ВЕРХОВАЯ ЕЗДА", "dex"],
  ["ВНИМАНИЕ", "wis"],
  ["ВЫЖИВАНИЕ", "wis"],
  ["ДИПЛОМАТИЯ", "cha"],
  ["ДРЕССИРОВКА*", "cha"],
  ["ЗАПУГИВАНИЕ", "cha"],
  ["ЗНАНИЕ (ВЫСШИЙ СВЕТ)*", "int"],
  ["ЗНАНИЕ (ВОЕННОЕ ДЕЛО)*", "int"],
  ["ЗНАНИЕ (ГЕОГРАФИЯ)*", "int"],
  ["ЗНАНИЕ (ИНЖЕНЕРНОЕ ДЕЛО)*", "int"],
  ["ЗНАНИЕ (ИСТОРИЯ)*", "int"],
  ["ЗНАНИЕ (КРАЕВЕДЕНИЕ)*", "int"],
  ["ЗНАНИЕ (МАГИЯ)*", "int"],
  ["ЗНАНИЕ (ПЛАНЫ)*", "int"],
  ["ЗНАНИЕ (ПОДЗЕМЕЛЬЯ)*", "int"],
  ["ЗНАНИЕ (ПРИРОДА)*", "int"],
  ["ЗНАНИЕ (РЕЛИГИЯ)*", "int"],
  ["ИЗВОРОТЛИВОСТЬ", "dex"],
  ["ИСПОЛНЕНИЕ", "cha"],
  ["ИСПОЛНЕНИЕ", "cha"],
  ["ИСПОЛЬЗОВАНИЕ МАГИЧЕСКИХ УСТРОЙСТВ*", "cha"],
  ["КОЛДОВСТВО*", "int"],
  ["ЛАЗАНИЕ", "str"],
  ["ЛЕЧЕНИЕ", "wis"],
  ["ЛОВКОСТЬ РУК*", "dex"],
  ["МАСКИРОВКА", "cha"],
  ["МЕХАНИКА*", "dex"],
  ["ОЦЕНКА", "int"],
  ["ПЛАВАНИЕ", "str"],
  ["ПОЛЕТ", "dex"],
  ["ПРОНИЦАТЕЛЬНОСТЬ", "wis"],
  ["ПРОФЕССИЯ*", "wis"],
  ["ПРОФЕССИЯ*", "wis"],
  ["РЕМЕСЛО", "int"],
  ["РЕМЕСЛО", "int"],
  ["РЕМЕСЛО", "int"],
  ["СКРЫТНОСТЬ", "dex"],
  ["ЯЗЫКОЗНАНИЕ*", "int"],
];

const hexTerrains = [
  ["пусто", "Пусто"],
  ["равнина", "Равнина"],
  ["лес", "Лес"],
  ["холмы", "Холмы"],
  ["степь", "Степь"],
  ["пустошь", "Пустошь"],
  ["снег", "Снег / лед"],
  ["вода", "Вода"],
  ["вода-берег-1", "Вода: берег 1"],
  ["вода-берег-2", "Вода: берег 2"],
  ["вода-берег-3", "Вода: берег 3"],
  ["вода-берег-4", "Вода: берег 4"],
  ["болото", "Болото"],
  ["горы", "Горы"],
  ["озеро", "Озеро"],
  ["глубокое-озеро", "Глубокое озеро"],
  ["река", "Река"],
  ["магический-лес", "Магический лес"],
  ["темный-лес", "Темный лес"],
  ["древний-лес", "Древний лес"],
  ["лес-холмы", "Гибрид: лес + холмы"],
  ["лес-в-холмах", "Лес в холмах"],
  ["болотный-лес", "Болотный лес"],
  ["лес-болото", "Гибрид: лес + болото"],
  ["лес-вода", "Гибрид: лес + вода"],
  ["лес-горы", "Гибрид: лес + горы"],
  ["холмы-горы", "Гибрид: холмы + горы"],
  ["равнина-холмы", "Гибрид: равнина + холмы"],
  ["побережье", "Гибрид: суша + вода"],
  ["речная-переправа", "Речная переправа"],
  ["болото-вода", "Гибрид: болото + вода"],
  ["снег-горы", "Гибрид: снег + горы"],
  ["горный-перевал", "Горный перевал"],
  ["ущелье", "Ущелье"],
  ["пещеры", "Пещеры"],
  ["пустыня", "Пустыня"],
  ["оазис", "Оазис"],
  ["город", "Город"],
  ["портовый-город", "Портовый город"],
  ["столица", "Столица"],
  ["поселение", "Поселение"],
  ["населенный-пункт", "Населенный пункт"],
  ["укрепление", "Укрепление"],
  ["руины", "Руины"],
  ["святилище", "Святилище"],
  ["магическая-зона", "Магическая зона"],
  ["проклятая-земля", "Проклятая земля"],
  ["опасность", "Опасность"],
  ["подземелье", "Подземелье"],
];

const terrainTileFiles = {
  равнина: "assets/hex-terrain/grass.png",
  лес: "assets/hex-terrain/forest.png",
  холмы: "assets/hex-terrain/hills.png",
  степь: "assets/hex-terrain/grass.png",
  пустошь: "assets/hex-terrain/bad place.png",
  снег: "assets/hex-terrain/mountain.png",
  вода: "assets/hex-terrain/water1.png",
  "вода-берег-1": "assets/hex-terrain/water bereg1.png",
  "вода-берег-2": "assets/hex-terrain/water bereg2.png",
  "вода-берег-3": "assets/hex-terrain/water bereg3.png",
  "вода-берег-4": "assets/hex-terrain/water bereg4.png",
  болото: "assets/hex-terrain/boloto.png",
  горы: "assets/hex-terrain/mountain.png",
  озеро: "assets/hex-terrain/water2.png",
  "глубокое-озеро": "assets/hex-terrain/water1.png",
  река: "assets/hex-terrain/water bereg2.png",
  "магический-лес": "assets/hex-terrain/magic-forest.png",
  "темный-лес": "assets/hex-terrain/forest.png",
  "древний-лес": "assets/hex-terrain/forest.png",
  "лес-холмы": "assets/hex-terrain/forest-hills.png",
  "лес-в-холмах": "assets/hex-terrain/forest-hills.png",
  "болотный-лес": "assets/hex-terrain/swamp-forest.png",
  "лес-болото": "assets/hex-terrain/swamp-forest.png",
  "лес-вода": "assets/hex-terrain/forest.png",
  "лес-горы": "assets/hex-terrain/forest.png",
  "холмы-горы": "assets/hex-terrain/mountain.png",
  "равнина-холмы": "assets/hex-terrain/grass.png",
  побережье: "assets/hex-terrain/water bereg1.png",
  "речная-переправа": "assets/hex-terrain/water bereg3.png",
  "болото-вода": "assets/hex-terrain/boloto.png",
  "снег-горы": "assets/hex-terrain/mountain.png",
  "горный-перевал": "assets/hex-terrain/mountain.png",
  ущелье: "assets/hex-terrain/mountain.png",
  пещеры: "assets/hex-terrain/temple destroyed.png",
  пустыня: "assets/hex-terrain/bad place.png",
  оазис: "assets/hex-terrain/water bereg4.png",
  город: "assets/hex-terrain/village.png",
  "портовый-город": "assets/hex-terrain/village.png",
  столица: "assets/hex-terrain/castle.png",
  поселение: "assets/hex-terrain/settlement-v2.png",
  "населенный-пункт": "assets/hex-terrain/hamlet.png",
  укрепление: "assets/hex-terrain/castle.png",
  руины: "assets/hex-terrain/temple destroyed.png",
  святилище: "assets/hex-terrain/temple destroyed.png",
  "магическая-зона": "assets/hex-terrain/bad place.png",
  "проклятая-земля": "assets/hex-terrain/bad place.png",
  опасность: "assets/hex-terrain/bad place.png",
  подземелье: "assets/hex-terrain/temple destroyed.png",
};

const hexTileChoices = [
  ["assets/hex-terrain/grass.png", "Равнина"],
  ["assets/hex-terrain/forest.png", "Лес"],
  ["assets/hex-terrain/magic-forest.png", "Магический лес"],
  ["assets/hex-terrain/forest-hills.png", "Лес в холмах"],
  ["assets/hex-terrain/swamp-forest.png", "Болотный лес"],
  ["assets/hex-terrain/hills.png", "Холмы"],
  ["assets/hex-terrain/mountain.png", "Горы"],
  ["assets/hex-terrain/water1.png", "Вода 1"],
  ["assets/hex-terrain/water2.png", "Вода 2"],
  ["assets/hex-terrain/water bereg1.png", "Берег 1"],
  ["assets/hex-terrain/water bereg2.png", "Берег 2"],
  ["assets/hex-terrain/water bereg3.png", "Берег 3"],
  ["assets/hex-terrain/water bereg4.png", "Берег 4"],
  ["assets/hex-terrain/water2.png", "Озеро"],
  ["assets/hex-terrain/boloto.png", "Болото"],
  ["assets/hex-terrain/bad place.png", "Опасное место"],
  ["assets/hex-terrain/bad place.png", "Пустыня / проклятая земля"],
  ["assets/hex-terrain/village.png", "Город"],
  ["assets/hex-terrain/settlement-v2.png", "Поселение"],
  ["assets/hex-terrain/hamlet.png", "Населенный пункт"],
  ["assets/hex-terrain/castle.png", "Укрепление"],
  ["assets/hex-terrain/castle.png", "Столица"],
  ["assets/hex-terrain/temple destroyed.png", "Руины / подземелье"],
  ["assets/hex-terrain/grass doroga1.png", "Равнина с дорогой"],
];

function customHexTilePresets() {
  return Array.isArray(state?.map?.tilePresets) ? state.map.tilePresets : [];
}

function customHexTilePresetValue(id) {
  return id ? `custom:${id}` : "";
}

function resolveHexTilePreset(value = "") {
  if (value.startsWith("custom:")) {
    const id = value.slice(7);
    const preset = customHexTilePresets().find((item) => item.id === id);
    return preset ? { ...preset, value, custom: true } : null;
  }
  const builtIn = hexTileChoices.find(([image]) => image === value);
  return builtIn
    ? { value, id: value, name: builtIn[1], image: builtIn[0], fit: "cover", scale: 1, x: 50, y: 50, rotation: 0, terrains: [], custom: false }
    : null;
}

function hexTileSelectOptions(currentValue = "", currentImage = "") {
  const options = [
    ["", "Автоматически по местности"],
    ...hexTileChoices,
    ...customHexTilePresets().map((preset) => [customHexTilePresetValue(preset.id), `Своя: ${preset.name}`]),
  ];
  if (currentValue && !options.some(([value]) => value === currentValue)) {
    options.push([currentValue, "Своя / загруженная"]);
  } else if (!currentValue && currentImage && !options.some(([value]) => value === currentImage)) {
    options.push([currentImage, "Своя / загруженная"]);
  }
  return options;
}

function isPresetHexTile(source = "") {
  return hexTileChoices.some(([value]) => value === source) || customHexTilePresets().some((preset) => preset.image === source);
}

function isBuiltInHexTile(source = "") {
  return hexTileChoices.some(([value]) => value === source);
}

function normalizeTileTransform(source = {}) {
  return {
    fit: source.fit === "contain" || source.tileFit === "contain" ? "contain" : "cover",
    scale: Math.min(3, Math.max(0.5, Number(source.scale ?? source.tileScale ?? 1) || 1)),
    x: Math.min(100, Math.max(0, Number(source.x ?? source.tileX ?? 50) || 0)),
    y: Math.min(100, Math.max(0, Number(source.y ?? source.tileY ?? 50) || 0)),
    rotation: Math.min(180, Math.max(-180, Number(source.rotation ?? source.tileRotation ?? 0) || 0)),
  };
}

function normalizeMapTilePreset(item = {}) {
  const transform = normalizeTileTransform(item);
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "Новый типовой гекс").trim() || "Новый типовой гекс",
    image: String(item.image || ""),
    terrains: normalizeTerrains(item.terrains),
    ...transform,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function applyMapTileImageStyle(image, source = {}, builtIn = false) {
  image.classList.toggle("terrain-tile-art", builtIn);
  image.classList.toggle("adjusted-map-tile", !builtIn);
  if (builtIn) {
    image.style.objectFit = "cover";
    image.style.removeProperty("width");
    image.style.removeProperty("height");
    image.style.removeProperty("left");
    image.style.removeProperty("top");
    image.style.removeProperty("transform");
    return;
  }
  const transform = normalizeTileTransform(source);
  image.style.objectFit = transform.fit;
  image.style.width = `${transform.scale * 100}%`;
  image.style.height = `${transform.scale * 100}%`;
  image.style.left = `${transform.x}%`;
  image.style.top = `${transform.y}%`;
  image.style.transform = `translate(-50%, -50%) rotate(${transform.rotation}deg)`;
}

const terrainStrategyMarks = {
  равнина: ["plains", "Р"],
  лес: ["forest", "Л"],
  холмы: ["hills", "Х"],
  степь: ["steppe", "С"],
  пустошь: ["waste", "П"],
  снег: ["snow", "СН"],
  вода: ["water", "В"],
  "вода-берег-1": ["coast", "Б"],
  "вода-берег-2": ["coast", "Б"],
  "вода-берег-3": ["coast", "Б"],
  "вода-берег-4": ["coast", "Б"],
  болото: ["swamp", "БЛ"],
  горы: ["mountain", "Г"],
  озеро: ["water", "ОЗ"],
  "глубокое-озеро": ["water", "ГО"],
  река: ["water", "РК"],
  "магический-лес": ["magic", "МЛ"],
  "темный-лес": ["dark", "ТЛ"],
  "древний-лес": ["forest", "ДЛ"],
  "лес-холмы": ["hybrid", "ЛХ"],
  "лес-в-холмах": ["hybrid", "ЛХ"],
  "болотный-лес": ["hybrid", "БЛ"],
  "лес-болото": ["hybrid", "ЛБ"],
  "лес-вода": ["hybrid", "ЛВ"],
  "лес-горы": ["hybrid", "ЛГ"],
  "холмы-горы": ["hybrid", "ХГ"],
  "равнина-холмы": ["hybrid", "РХ"],
  побережье: ["hybrid", "ПБ"],
  "речная-переправа": ["hybrid", "РП"],
  "болото-вода": ["hybrid", "БВ"],
  "снег-горы": ["hybrid", "СГ"],
  "горный-перевал": ["mountain", "ГП"],
  ущелье: ["mountain", "УЩ"],
  пещеры: ["dungeon", "ПЩ"],
  пустыня: ["desert", "ПС"],
  оазис: ["coast", "ОА"],
  город: ["settlement", "ГР"],
  "портовый-город": ["settlement", "ПГ"],
  столица: ["fort", "СТ"],
  поселение: ["settlement", "ПС"],
  "населенный-пункт": ["settlement", "НП"],
  укрепление: ["fort", "У"],
  руины: ["dungeon", "РН"],
  святилище: ["magic", "СВ"],
  "магическая-зона": ["magic", "МЗ"],
  "проклятая-земля": ["danger", "ПЗ"],
  опасность: ["danger", "!"],
  подземелье: ["dungeon", "D"],
};

const hexBoundaryStyles = [
  ["none", "Без контура"],
  ["solid", "Сплошная граница"],
  ["dashed", "Пунктир"],
  ["double", "Двойная граница"],
  ["wall", "Стена / укрепление"],
  ["traps", "Ловушки"],
  ["runes", "Руны / магическая зона"],
  ["custom", "Своя текстура"],
];

const hexBoundaryColors = ["#d4a74f", "#4da9a7", "#c85b52", "#7fa65a", "#8d72c7", "#d4863b", "#e8e4d6", "#32383a"];
const hexBoundarySideOptions = [
  ["top", "Северная грань"],
  ["topRight", "Северо-восточная"],
  ["bottomRight", "Юго-восточная"],
  ["bottom", "Южная грань"],
  ["bottomLeft", "Юго-западная"],
  ["topLeft", "Северо-западная"],
];
const hexBoundarySideIds = hexBoundarySideOptions.map(([value]) => value);
const squareBoundarySideOptions = [
  ["top", "Северная грань"],
  ["topRight", "Восточная грань"],
  ["bottom", "Южная грань"],
  ["topLeft", "Западная грань"],
];

const roadTypes = [
  ["road", "Дорога"],
  ["trail", "Тропа"],
  ["highway", "Тракт"],
];

const mapMarkerTypes = [
  ["quest", "Задание", "!"],
  ["event", "Событие", "*"],
  ["danger", "Опасность", "!!"],
  ["npc", "NPC", "N"],
  ["loot", "Находка", "+"],
  ["note", "Заметка", "?"],
  ["camp", "Лагерь", "^"],
  ["custom", "Свое", "•"],
];

const terrainAliases = {
  деревня: "поселение",
  "малая-деревня": "населенный-пункт",
  дорога: "равнина",
};

const mapTypes = [
  ["Регион", "Регион"],
  ["Мир", "Мир"],
  ["Поселение", "Поселение"],
  ["Город", "Город"],
  ["Здание", "Здание"],
  ["Подземелье", "Подземелье"],
  ["Боевая карта", "Боевая карта"],
  ["Другое", "Другое"],
];

const npcTypes = [
  ["ally", "Союзник"],
  ["neutral", "Нейтрал"],
  ["enemy", "Враг"],
  ["merchant", "Торговец"],
  ["patron", "Заказчик"],
  ["unknown", "Неизвестно"],
];

const npcStatuses = [
  ["alive", "Жив"],
  ["dead", "Мертв"],
  ["missing", "Пропал"],
  ["hidden", "Скрыт"],
  ["unknown", "Неизвестно"],
];

const uniqueItemTypes = [
  ["weapon", "Оружие"],
  ["armor", "Броня / щит"],
  ["wondrous", "Чудесный предмет"],
  ["relic", "Реликвия"],
  ["artifact", "Артефакт"],
  ["tool", "Инструмент"],
  ["document", "Документ / книга"],
  ["consumable", "Расходник"],
  ["key", "Ключ / печать"],
  ["other", "Другое"],
];

const uniqueItemStatuses = [
  ["known", "Известен"],
  ["owned", "У партии"],
  ["held", "У владельца"],
  ["hidden", "Скрыт"],
  ["lost", "Утерян"],
  ["destroyed", "Уничтожен"],
];

const uniqueItemCategories = [
  ["nonmagical", "Не магические предметы"],
  ["magical", "Магические предметы"],
  ["books", "Коллекции книг"],
];

const npcTabs = [
  ["overview", "Общее"],
  ["notes", "Заметки"],
  ["factions", "Фракции"],
  ["recognition", "Признание"],
  ["mechanics", "Механика"],
  ["links", "Связи"],
  ["gm", "GM"],
];

const npcMechanicsTabs = [
  ["summary", "Паспорт"],
  ["stats", "Характеристики"],
  ["combat", "Бой"],
  ["skills", "Навыки"],
  ["features", "Черты"],
  ["magic", "Магия"],
  ["inventory", "Инвентарь"],
];

const factionTypes = [
  ["state", "Государство"],
  ["cult", "Культ"],
  ["guild", "Гильдия"],
  ["order", "Орден"],
  ["family", "Семья"],
  ["army", "Армия"],
  ["other", "Другое"],
];

const influenceLevels = [
  ["low", "Низкое"],
  ["medium", "Среднее"],
  ["high", "Высокое"],
  ["major", "Огромное"],
];

const settlementTypes = [
  ["village", "Деревня"],
  ["town", "Городок"],
  ["city", "Город"],
  ["fort", "Крепость"],
  ["camp", "Лагерь"],
  ["port", "Порт"],
  ["estate", "Поместье"],
  ["other", "Другое"],
];

const settlementTabs = [
  ["overview", "Общее"],
  ["traits", "Черты"],
  ["laws", "Законы"],
  ["districts", "Кварталы"],
  ["buildings", "Постройки"],
  ["commerce", "Коммерческая деятельность"],
  ["population-groups", "Население"],
  ["residents", "Жители"],
  ["armies", "Войска"],
  ["chronicle", "Хроника"],
];

const countryTabs = [
  ["overview", "Общее"],
  ["council", "Совет"],
  ["laws", "Законы"],
  ["holdings", "Владения"],
  ["breakdown", "Источники показателей"],
];

const ROLL_DICE_SIDES = [4, 6, 8, 10, 12, 20, 100, 1000];

const countryMetricDefinitions = [
  ["stateStability", "Стабильность"],
  ["stateCulture", "Культура"],
  ["stateLoyalty", "Лояльность"],
  ["stateEconomy", "Экономика"],
  ["stateUnrest", "Количество беспорядков"],
  ["stateProjectedUnrest", "Прогнозируемое изменение беспорядков в Фазе Событий"],
  ["stateDomainSize", "Размер владений"],
  ["stateGlory", "Государственная слава"],
];

const countryMetricKeys = countryMetricDefinitions.map(([key]) => key);

const buildingStatuses = [
  ["active", "Работает"],
  ["building", "Строится"],
  ["damaged", "Повреждена"],
  ["abandoned", "Заброшена"],
];

const problemSeverities = [
  ["low", "Низкая"],
  ["medium", "Средняя"],
  ["high", "Высокая"],
  ["critical", "Критическая"],
];

const problemStatuses = [
  ["active", "Активна"],
  ["resolved", "Решена"],
  ["hidden", "Скрыта"],
];

const defaultAshanaMonths = [
  "Золотого Пепла",
  "Серебряного Дождя",
  "Медного Листа",
  "Белого Ветра",
  "Алого Солнца",
  "Синей Воды",
  "Черного Камня",
  "Янтарного Поля",
  "Лунной Тени",
  "Последней Зари",
];

const ashanaWeekdays = [
  "Первый день",
  "Второй день",
  "Третий день",
  "Четвертый день",
  "Пятый день",
  "Шестой день",
  "Седьмой день",
  "Восьмой день",
  "Девятый день",
];

const calendarEventTypes = [
  ["session", "Сессия"],
  ["quest", "Задание"],
  ["travel", "Путешествие"],
  ["settlement", "Поселение"],
  ["danger", "Угроза"],
  ["holiday", "Праздник"],
  ["note", "Заметка"],
];

const seedData = {
  meta: {
    campaignName: "Герои Асханы",
    currentRegion: "Северные рубежи Короны Арвейна",
    currentDate: "17 день месяца Золотого Пепла",
    ashanaDate: { year: 1, month: 1, day: 17 },
    monthNames: defaultAshanaMonths,
    version: 2,
  },
  tagMeta: {
    "бог": {
      description: "Бог в Асхане - могущественная сущность, связанная с верой, доменами, клятвами, культами и силами, которые смертные редко понимают до конца.",
      image: "",
      public: true,
    },
    "место": {
      description: "Географическая или сюжетная точка мира: регион, город, дорога, руины, святилище или иная важная локация.",
      image: "",
      public: true,
    },
    "npc": {
      description: "Неигровой персонаж: союзник, враг, заказчик, свидетель, правитель, торговец или иной участник истории.",
      image: "",
      public: true,
    },
    "фракция": {
      description: "Организация, культ, государство, дом, гильдия или группа влияния со своими целями и ресурсами.",
      image: "",
      public: true,
    },
  },
  wiki: [
    {
      id: "solaris",
      title: "Соларис, Бог Непогасимого Завета",
      category: "Боги",
      categoryId: "gods",
      tags: ["свет", "клятвы", "храмы"],
      image: "",
      public: true,
      body:
        "Соларис почитается хранителями границ, судьями и теми, кто связывает свою судьбу клятвой. Его символом считается золотой диск с черной трещиной: свет остается светом даже после раны.\n\nВ Асхане его жрецы часто выступают свидетелями договоров между городами и кланами.",
    },
    {
      id: "arvein",
      title: "Корона Арвейна",
      category: "Государства",
      categoryId: "states",
      tags: ["люди", "север", "политика"],
      image: "",
      public: true,
      body:
        "Северное королевство с сильными пограничными крепостями и старой военной знатью. Корона удерживает торговые дороги к рудникам и спорит с прибрежными городами за пошлины.\n\nНедавние слухи говорят о пропаже караванов у Серого Тракта.",
    },
    {
      id: "grey-road",
      title: "Серый Тракт",
      category: "Места",
      categoryId: "places",
      tags: ["дорога", "караваны", "опасность"],
      image: "",
      public: true,
      body:
        "Старый каменный путь, проходящий через туманные низины. На милевых столбах сохранились руны доимперского периода.\n\nМестные проводники уверяют, что ночью на тракте слышны шаги тех, кто давно не должен ходить.",
    },
    {
      id: "black-archive",
      title: "Черный Архив",
      category: "Тайны",
      categoryId: "history",
      tags: ["мастер", "запретное", "секрет"],
      image: "",
      public: false,
      body:
        "Секретный раздел для мастера. Здесь можно хранить истинные мотивы NPC, скрытые свойства артефактов и будущие последствия решений партии.",
    },
  ],
  quests: [
    {
      id: "missing-caravan",
      title: "Пропавший караван",
      status: "active",
      patron: "Купеческая лига Арвейна",
      reward: "800 зм и право беспошлинного прохода",
      linked: "Серый Тракт",
      notes:
        "Найти караван мастера Лиора. Последний раз его видели у третьего милевого столба.",
      gmNotes: "На караван напали не разбойники, а разведчики из культа Пепельной Луны.",
    },
    {
      id: "oath-temple",
      title: "Печать в храме Солариса",
      status: "active",
      patron: "Сестра Эйрин",
      reward: "Доступ к храмовой библиотеке",
      linked: "Соларис",
      notes:
        "Проверить, почему алтарная печать начала темнеть после последнего затмения.",
      gmNotes: "Печать реагирует на ложную клятву одного из храмовых рыцарей.",
    },
    {
      id: "archive-key",
      title: "Ключ Черного Архива",
      status: "hidden",
      patron: "Неизвестно",
      reward: "Неизвестно",
      linked: "Черный Архив",
      notes: "Запись скрыта от игроков.",
      gmNotes: "Ключ находится у городского писаря, который не знает его назначения.",
    },
  ],
  factions: [
    {
      id: "arvein-crown",
      name: "Корона Арвейна",
      type: "state",
      leader: "Северный двор",
      headquarters: "Арвейн",
      relation: 1,
      influence: "major",
      public: true,
      image: "",
      tags: ["север", "политика", "люди"],
      description: "Северное королевство с сильной пограничной властью, старой знатью и интересом к торговым дорогам Межей.",
      gmNotes: "Внутри двора есть несколько групп, которые по-разному смотрят на самостоятельность пограничных баронств.",
      goals: "Удержать дороги, налоги и военное присутствие на северных рубежах.",
      resources: "Пограничные крепости, законники, рыцарские дома, сборщики пошлин.",
      allies: [],
      enemies: [],
      wikiLinks: ["arvein"],
      questLinks: ["missing-caravan"],
      npcLinks: [],
    },
    {
      id: "ash-moon-cult",
      name: "Культ Пепельной Луны",
      type: "cult",
      leader: "Неизвестно",
      headquarters: "Скрыто",
      relation: -4,
      influence: "medium",
      public: false,
      image: "",
      tags: ["культ", "секрет", "угроза"],
      description: "Слухи о культе, который появляется возле исчезнувших караванов и старых руин.",
      gmNotes: "Разведчики культа проверяют Серый Тракт и ищут ключи к Черному Архиву.",
      goals: "Открыть путь к архиву и собрать запрещенные тексты.",
      resources: "Агенты, тайники, подкупленные писари.",
      allies: [],
      enemies: ["arvein-crown"],
      wikiLinks: ["black-archive"],
      questLinks: ["archive-key"],
      npcLinks: [],
    },
  ],
  npcs: [
    {
      id: "sister-eyrin",
      name: "Сестра Эйрин",
      type: "patron",
      ancestry: "человек",
      role: "жрица Солариса",
      factionId: "arvein-crown",
      location: "Храм Солариса",
      relation: 2,
      status: "alive",
      public: true,
      portrait: "",
      tags: ["свет", "храм", "заказчик"],
      description: "Спокойная жрица, которая попросила партию разобраться с темнеющей алтарной печатью.",
      gmNotes: "Знает больше о ложной клятве храмового рыцаря, но пока не готова говорить прямо.",
      lastSeen: "Храм Солариса",
      wikiLinks: ["solaris"],
      questLinks: ["oath-temple"],
    },
    {
      id: "master-lior",
      name: "Мастер Лиор",
      type: "neutral",
      ancestry: "человек",
      role: "караванный мастер",
      factionId: "arvein-crown",
      location: "Серый Тракт",
      relation: 0,
      status: "missing",
      public: true,
      portrait: "",
      tags: ["караван", "пропал", "торговля"],
      description: "Караванный мастер, чей пропавший обоз стал поводом для расследования на Сером Тракте.",
      gmNotes: "Его караван захватили не разбойники, а разведчики культа.",
      lastSeen: "Третий милевой столб Серого Тракта",
      wikiLinks: ["grey-road"],
      questLinks: ["missing-caravan"],
    },
  ],
  relationships: [],
  settlements: [
    {
      id: "grey-ford",
      name: "Серый Брод",
      type: "village",
      ruler: "Совет старост",
      factionId: "arvein-crown",
      mapRegionId: "mezhi-canvas",
      population: 420,
      size: "малое поселение",
      law: 0,
      crime: 0,
      corruption: 0,
      knowledge: 0,
      society: 1,
      production: 1,
      dangerRating: 1,
      capitalTurnoverLimit: 500,
      cashTurnoverLimit: 250,
      priceCeiling: 1000,
      public: true,
      tags: ["тракт", "деревня", "торговля"],
      description: "Пограничное поселение у переправы на Сером Тракте. Живет торговлей, перевозом и снабжением караванов.",
      gmNotes: "Часть старост покрывает контрабандистов, чтобы удержать поселение от голода.",
      wikiLinks: ["grey-road"],
      questLinks: ["missing-caravan"],
      npcLinks: ["master-lior"],
      traits: [
        { id: "river-crossing", name: "Переправа Серого Тракта", description: "Поселение выросло вокруг старой переправы и живет ритмом караванов.", effect: "Торговые и дорожные проверки получают ситуационное преимущество по решению мастера." },
      ],
      buildings: [
        { id: "market", name: "Рынок у переправы", type: "рынок", status: "active", income: 120, upkeep: 20, economy: 1, loyalty: 0, security: 0, stability: 0, threat: 0, notes: "Главный источник пошлин и слухов." },
        { id: "watch-post", name: "Сторожевой пост", type: "стража", status: "active", income: 0, upkeep: 55, economy: 0, loyalty: 0, security: 1, stability: 1, threat: -1, notes: "Держит переправу, но людей не хватает." },
        { id: "sun-shrine", name: "Святилище Солариса", type: "храм", status: "active", income: 20, upkeep: 10, economy: 0, loyalty: 1, security: 0, stability: 1, threat: 0, notes: "Место клятв, лечения и споров." },
      ],
      problems: [
        { id: "smuggling", title: "Контрабанда на переправе", severity: "medium", status: "active", income: -45, loyalty: -1, security: -1, economy: 0, stability: 0, threat: 1, public: true, linkedQuest: "missing-caravan", notes: "Кто-то проводит грузы мимо пошлин и стражи." },
        { id: "cult-signs", title: "Следы Пепельной Луны", severity: "high", status: "hidden", income: 0, loyalty: 0, security: -1, economy: 0, stability: -1, threat: 2, public: false, linkedQuest: "archive-key", notes: "Знаки нашли возле старого склада." },
      ],
      modifiers: [
        { id: "trade-road", title: "Торговый тракт", income: 35, upkeep: 0, loyalty: 0, security: 0, economy: 1, stability: 0, threat: 0, notes: "Поток караванов дает деньги и проблемы." },
        { id: "border-anxiety", title: "Пограничная тревога", income: 0, upkeep: 0, loyalty: -1, security: 0, economy: 0, stability: -1, threat: 1, notes: "Жители привыкли ждать беды с дороги." },
      ],
      log: [
        { date: "17 день Золотого Пепла", text: "Партия прибыла к переправе и услышала о пропавшем караване.", public: true },
      ],
    },
  ],
  countries: [],
  calendarEvents: [
    {
      id: "arrival-grey-ford",
      title: "Партия прибывает к Серому Броду",
      type: "travel",
      date: { year: 1, month: 1, day: 17 },
      public: true,
      summary: "Герои выходят к переправе на Сером Тракте и узнают первые подробности о пропавшем караване.",
      gmNotes: "Хороший момент показать первые следы контрабанды и намек на культ Пепельной Луны.",
      wikiLinks: ["grey-road"],
      questLinks: ["missing-caravan"],
      npcLinks: ["master-lior"],
      settlementLinks: ["grey-ford"],
      mapLinks: ["mezhi-canvas"],
    },
    {
      id: "oath-seal-deadline",
      title: "Печать храма темнеет сильнее",
      type: "danger",
      date: { year: 1, month: 1, day: 22 },
      public: false,
      summary: "Если никто не вмешается, алтарная печать Солариса перейдет в опасную фазу.",
      gmNotes: "Можно поднять сложность проверки или добавить осложнение в храме.",
      wikiLinks: ["solaris"],
      questLinks: ["oath-temple"],
      npcLinks: ["sister-eyrin"],
      settlementLinks: [],
      mapLinks: [],
      countryIds: [],
      factionIds: [],
    },
  ],
  sessionLogs: [
    {
      id: "session-1-grey-road",
      title: "След Серого Тракта",
      sessionNumber: 1,
      date: { year: 1, month: 1, day: 17 },
      public: true,
      players: "Ричи Голдманн и отряд",
      summary: "Партия добралась до Серого Тракта, услышала о пропавшем караване мастера Лиора и вышла к поселению Серый Брод.",
      decisions: "Герои решили начать с расспросов у переправы и проверить старые милевые столбы.",
      loot: "Пока без добычи.",
      consequences: "Серый Брод становится важной точкой расследования, а слухи о контрабанде начинают связываться с пропажей каравана.",
      gmNotes: "Следующая сессия может открыть конфликт между старостами, стражей и контрабандистами.",
      wikiLinks: ["grey-road"],
      questLinks: ["missing-caravan"],
      npcLinks: ["master-lior"],
      settlementLinks: ["grey-ford"],
      mapLinks: ["mezhi-canvas"],
    },
  ],
  characters: [
    {
      id: "richie-goldmann",
      name: "Ричи Голдманн",
      player: "Кирилл Голушков",
      ancestry: "человек-богатонец",
      className: "волшебник-инструктор 3 / вивисектор 1",
      homeland: "Богатония",
      deity: "",
      size: "Средний",
      gender: "Муж.",
      alignment: "ЗН",
      level: 4,
      hp: "22 / 22",
      ac: 20,
      touchAc: 14,
      flatFootedAc: 16,
      initiative: 6,
      speed: 30,
      bab: 2,
      cmb: 2,
      cmd: 16,
      portrait: "",
      stats: { str: 10, dex: 18, con: 14, int: 16, wis: 10, cha: 10 },
      saves: { fort: 5, ref: 6, will: 7 },
      skills: [
        { name: "Знание магии", ability: "int", ranks: 4, classSkill: true, misc: 3, armorPenalty: 0, total: 10 },
        { name: "Лечение", ability: "wis", ranks: 1, classSkill: true, misc: 4, armorPenalty: 0, total: 8 },
        { name: "Ремесло: мебельщик", ability: "int", ranks: 4, classSkill: true, misc: 3, armorPenalty: 0, total: 10 },
        { name: "Профессия: торговец", ability: "wis", ranks: 3, classSkill: true, misc: 0, armorPenalty: 0, total: 6 },
      ],
      attacks: [
        { name: "Двуручный топор гноллов", bonus: "+2", damage: "1d12", crit: "x3", range: "", type: "рубящий", notes: "+понимание гнолльского языка" },
        { name: "Луч несмертельного урона", bonus: "+6", damage: "1d6", crit: "x2", range: "30 фт", type: "луч", notes: "действие-реакция" },
      ],
      armor: [
        { name: "Клепаная кожанка", ac: "+3", maxDex: "5", penalty: "0", spellFail: "15%", notes: "" },
      ],
      feats: [
        "Благородный отпрыск",
        "Космополит",
        "Написание свитков",
        "Магия из крови",
        "Зельеварение",
        "Брось хоть что-нибудь",
      ],
      features: [
        "Преданный ученик",
        "Фокусы",
        "Магическая школа: Коммерция",
        "Сигна-шар 7/день",
        "2 экстракта в день",
        "1 мутаген на силу",
        "Скрытая атака +1d6 вместо бомбы",
      ],
      spells: [
        { level: 0, known: "Магическая метка / Престижимитация / Управляемое перо / Луч Мороза / Чтение магии", prepared: "" },
        { level: 1, known: "Удача ремесленника / Длинная рука / Магическая броня / Очаровать человека / Снежок", prepared: "" },
        { level: 2, known: "Сила быка / Ложная жизнь", prepared: "" },
      ],
      inventory: [
        { name: "Рюкзак", qty: "3", weight: "" },
        { name: "Бурдюк", qty: "2", weight: "" },
        { name: "Кремень и огниво", qty: "1", weight: "" },
        { name: "Инструменты мебельщика", qty: "1", weight: "" },
        { name: "Инструменты плотника", qty: "1", weight: "" },
        { name: "Три флакона чернил", qty: "1", weight: "" },
        { name: "Два пустых журнала", qty: "1", weight: "" },
        { name: "20-футовый измерительный шнур", qty: "1", weight: "" },
      ],
      languages: "Всеобщий, Богатонский, Обще-эльфийский, Гоблинский, Дьяволический, Высокий Церковный, диалект дроу",
      notes: "Пример расширенного листа по загруженному PDF. Поля можно полностью менять в админском JSON-редакторе.",
      gmNotes: "",
    },
    {
      id: "kael",
      name: "Каэль Рунный",
      player: "Игрок 1",
      ancestry: "человек",
      className: "маг 5",
      alignment: "НД",
      hp: "31 / 31",
      ac: 16,
      initiative: 3,
      speed: 30,
      stats: { str: 9, dex: 16, con: 12, int: 20, wis: 11, cha: 13 },
      saves: { fort: 2, ref: 4, will: 6 },
      skills: [
        ["Знание магии", 13],
        ["Колдовство", 14],
        ["Внимание", 5],
      ],
      attacks: [
        ["Посох", "+2", "1d6-1"],
        ["Луч холода", "+6", "1d3"],
      ],
      notes: "Ищет фрагменты доимперских рун. Носит перстень с расколотым сапфиром.",
    },
    {
      id: "mira",
      name: "Мира Вольная",
      player: "Игрок 2",
      ancestry: "полуэльф",
      className: "следопыт 5",
      alignment: "ХД",
      hp: "48 / 48",
      ac: 19,
      initiative: 6,
      speed: 30,
      stats: { str: 14, dex: 18, con: 14, int: 10, wis: 15, cha: 8 },
      saves: { fort: 6, ref: 8, will: 3 },
      skills: [
        ["Выживание", 12],
        ["Скрытность", 13],
        ["Внимание", 11],
      ],
      attacks: [
        ["Длинный лук", "+9", "1d8+2"],
        ["Короткий меч", "+7", "1d6+2"],
      ],
      notes: "Знает лесные тропы Арвейна и не доверяет городской страже.",
    },
  ],
  map: {
    zoom: 1,
    activeRegionId: "mezhi-canvas",
    selectedHex: "8,6",
    tilePresets: [],
    regions: [
      {
        id: "mezhi-canvas",
        title: "Межи: общая карта",
        type: "Регион",
        description: "Рабочее гекс-полотно Межей для путешествий, разведки и точек интереса.",
        public: true,
        image: "",
        mode: "canvas",
        grid: { cols: 24, rows: 16, hexSize: 96, offsetX: 24, offsetY: 24 },
        hexes: {
          "8,6": { title: "Лагерь партии", terrain: "лес", visible: true, notes: "Стартовая точка для редактирования карты Межей.", gmNotes: "", objects: ["партия", "лагерь"] },
          "9,6": { title: "Лесная дорога", terrain: "лес", terrains: ["лес"], roadType: "road", roadSides: ["topLeft", "bottomRight"], visible: true, notes: "Дорога через чащу.", gmNotes: "", objects: ["дорога"] },
          "10,6": { title: "Старое поселение", terrain: "поселение", visible: true, notes: "Небольшое поселение у дороги.", gmNotes: "", objects: ["поселение", "NPC"] },
          "11,6": { title: "Речной переход", terrain: "вода", visible: true, notes: "Место переправы.", gmNotes: "", objects: ["брод", "река"] },
        },
      },
    ],
  },
  gallery: [
    {
      id: "party-camp",
      title: "Стоянка у менгира",
      type: "Локация",
      linked: "Серый Тракт",
      palette: ["#d4a74f", "#4da9a7", "#111719"],
    },
    {
      id: "solaris-symbol",
      title: "Символ Солариса",
      type: "Религия",
      linked: "Соларис",
      palette: ["#f2d276", "#151515", "#b54b38"],
    },
    {
      id: "arvein-gates",
      title: "Ворота Арвейна",
      type: "Город",
      linked: "Корона Арвейна",
      palette: ["#6f7f83", "#d7ceb9", "#2f4248"],
    },
  ],
  items: [
    {
      id: "oath-temple-seal",
      name: "Потемневшая печать храма",
      category: "magical",
      type: "relic",
      status: "known",
      rarity: "уникальный",
      public: true,
      image: "",
      imageStyle: defaultImageStyle(),
      tags: ["реликвия", "храм", "клятвы"],
      ownerType: "place",
      ownerName: "Храм Солариса",
      locationName: "Храм Солариса",
      description: "Алтарная печать, которая начала темнеть после последнего затмения. Жрецы считают, что она реагирует на нарушенную клятву.",
      features: "Слабо светится рядом с ложью, связанной с храмовой присягой.",
      mechanics: "Мастер может дать +2 к проверкам Религии или Проницательности, если персонажи исследуют клятвы, печати и храмовые договоры.",
      gmNotes: "Истинная причина потемнения связана с ложной клятвой одного из храмовых рыцарей.",
      characterLinks: [],
      npcLinks: ["sister-eyrin"],
      wikiLinks: ["solaris"],
      settlementLinks: [],
      mapLinks: [],
    },
  ],
  npcGroups: [],
  characterGroups: [],
  paperThrone: {
    schemaVersion: 4,
    cards: [],
    decks: [],
    factions: [],
    leaders: [],
  },
  rolls: [],
};

const startupLocalSnapshot = readLocalCampaignSnapshot();
let state = loadState();
let currentView = "dashboard";
let isAdmin = false;
let activeWikiId = WIKI_INDEX_ID;
let activeCharacterId = state.characters[0]?.id ?? null;
let rollSelectedActorId = activeCharacterId || "";
let rollSelectedDiceCount = 1;
let rollSelectedDiceSides = "20";
let activeCharacterTab = "overview";
let activeCharacterMechanicsTab = "summary";
let activeCharacterGroupId = "";
let characterGroupManagerOpen = false;
let collapsedCharacterGroupIds = new Set();
let activeWikiTag = "";
let activeWikiCategoryId = "";
let wikiCategorySearchTerm = "";
let wikiDraft = null;
let activeDirectoryTab = "npcs";
let activeNpcGroupId = "";
let npcGroupManagerOpen = false;
let collapsedNpcGroupIds = new Set();
let activeSettlementId = state.settlements[0]?.id ?? null;
let activeSettlementTab = "overview";
let activeCountryId = state.countries[0]?.id ?? null;
let activeCountryTab = "overview";
let activeItemId = state.items[0]?.id ?? null;
let activeItemCategory = state.items.find((item) => item.id === activeItemId)?.category || "magical";
let itemDirectorySearchTerm = "";
let activeCalendarDateKey = ashanaDateKey(state.meta.ashanaDate);
let activeSessionId = state.sessionLogs[0]?.id ?? null;
let skillSearchTerm = "";
let activeGalleryTag = "";
let activeNpcTag = "";
let activeNpcId = state.npcs[0]?.id ?? null;
let npcDirectorySearchTerm = "";
let npcDirectoryScrollTop = 0;
let activeNpcTab = "overview";
let activeNpcMechanicsTab = "summary";
let relationshipSourceKey = "";
let relationshipTargetKey = "";
let sidebarCollapsed = false;
let mapZoom = state.map.zoom || 1;
let mapScroll = { left: 0, top: 0 };
let mapPanelScroll = { atlas: 0, inspector: 0 };
let mapViewByRegion = {};
let activeMapElements = null;
let mapUiSaveTimer = null;
let pendingMapMountRestore = null;
let mapDragSuppressClickUntil = 0;
let mapWikiSearchTerm = "";
let mapActiveTool = "select";
let mapBrushTerrain = "лес";
let mapBrushTerrains = ["лес"];
let mapBrushEnabled = false;
let mapBrushMode = "terrain";
let mapBrushBoundaryColor = "#d4a74f";
let mapBrushBoundaryStyle = "solid";
let mapBrushBoundaryImage = "";
let mapBrushBoundaryMode = "all";
let mapBrushBoundarySides = [...hexBoundarySideIds];
let mapBrushRoadType = "road";
let mapBrushRoadSides = ["topLeft", "bottomRight"];
let mapBrushTilePresetId = "";
let searchTerm = "";
let tagTooltipTimer = null;
let activeTagTooltip = null;
let activeNpcListPreview = null;
let npcListPreviewTimer = null;
let activeItemListPreview = null;
let itemListPreviewTimer = null;
let activeMinigameCleanup = null;
let activeMinigameId = "heretic";
let activeAshanaGameCleanup = null;
let activeAshanaGameId = "paper-throne";
let pendingWikiArticleScroll = false;
let tagLibrarySearchTerm = "";
let tagLibrarySortMode = "newest";
let tagLibraryPage = 0;

const savedUiState = loadUiState();

currentView = savedUiState.currentView || currentView;
if (!isKnownView(currentView)) currentView = "dashboard";
activeWikiId = savedUiState.activeWikiId || activeWikiId;
activeWikiTag = savedUiState.activeWikiTag || activeWikiTag;
activeWikiCategoryId = savedUiState.activeWikiCategoryId || activeWikiCategoryId;
wikiCategorySearchTerm = savedUiState.wikiCategorySearchTerm || wikiCategorySearchTerm;
activeCharacterId = savedUiState.activeCharacterId || activeCharacterId;
const savedRollActorId = typeof savedUiState.rollSelectedActorId === "string"
  ? savedUiState.rollSelectedActorId
  : rollSelectedActorId;
if (
  savedRollActorId === ""
  || savedRollActorId === "__gm__"
  || state.characters.some((character) => character.id === savedRollActorId)
  || (savedRollActorId.startsWith("npc:") && state.npcs.some((npc) => npc.id === savedRollActorId.slice(4)))
) {
  rollSelectedActorId = savedRollActorId;
}
const savedRollDiceCount = Number(savedUiState.rollSelectedDiceCount);
if (Number.isFinite(savedRollDiceCount)) {
  rollSelectedDiceCount = Math.max(1, Math.min(50, Math.trunc(savedRollDiceCount)));
}
if (["4", "6", "8", "10", "12", "20", "100", "1000"].includes(String(savedUiState.rollSelectedDiceSides))) {
  rollSelectedDiceSides = String(savedUiState.rollSelectedDiceSides);
}
activeCharacterTab = savedUiState.activeCharacterTab || activeCharacterTab;
const legacyCharacterMechanicsTab = characterMechanicsTabs.some(([id]) => id === activeCharacterTab)
  ? activeCharacterTab
  : "";
if (legacyCharacterMechanicsTab) activeCharacterTab = "mechanics";
if (!characterTabs.some(([id]) => id === activeCharacterTab)) activeCharacterTab = "overview";
activeCharacterMechanicsTab = savedUiState.activeCharacterMechanicsTab || legacyCharacterMechanicsTab || activeCharacterMechanicsTab;
if (!characterMechanicsTabs.some(([id]) => id === activeCharacterMechanicsTab)) activeCharacterMechanicsTab = "summary";
activeCharacterGroupId = savedUiState.activeCharacterGroupId || activeCharacterGroupId;
collapsedCharacterGroupIds = new Set(Array.isArray(savedUiState.collapsedCharacterGroupIds) ? savedUiState.collapsedCharacterGroupIds : []);
activeDirectoryTab = savedUiState.activeDirectoryTab || activeDirectoryTab;
if (!["npcs", "factions", "relationships"].includes(activeDirectoryTab)) activeDirectoryTab = "npcs";
activeNpcGroupId = savedUiState.activeNpcGroupId || activeNpcGroupId;
collapsedNpcGroupIds = new Set(Array.isArray(savedUiState.collapsedNpcGroupIds) ? savedUiState.collapsedNpcGroupIds : []);
activeSettlementId = savedUiState.activeSettlementId || activeSettlementId;
activeSettlementTab = savedUiState.activeSettlementTab || activeSettlementTab;
if (!settlementTabs.some(([id]) => id === activeSettlementTab)) activeSettlementTab = "overview";
activeCountryId = savedUiState.activeCountryId || activeCountryId;
activeCountryTab = savedUiState.activeCountryTab || activeCountryTab;
if (!countryTabs.some(([id]) => id === activeCountryTab)) activeCountryTab = "overview";
activeItemId = savedUiState.activeItemId || activeItemId;
activeItemCategory = uniqueItemCategories.some(([id]) => id === savedUiState.activeItemCategory)
  ? savedUiState.activeItemCategory
  : state.items.find((item) => item.id === activeItemId)?.category || activeItemCategory;
itemDirectorySearchTerm = savedUiState.itemDirectorySearchTerm || itemDirectorySearchTerm;
activeCalendarDateKey = savedUiState.activeCalendarDateKey || activeCalendarDateKey;
activeSessionId = savedUiState.activeSessionId || activeSessionId;
skillSearchTerm = savedUiState.skillSearchTerm || skillSearchTerm;
activeGalleryTag = savedUiState.activeGalleryTag || activeGalleryTag;
activeNpcTag = savedUiState.activeNpcTag || activeNpcTag;
activeNpcId = savedUiState.activeNpcId || activeNpcId;
npcDirectorySearchTerm = savedUiState.npcDirectorySearchTerm || npcDirectorySearchTerm;
npcDirectoryScrollTop = finiteScrollValue(savedUiState.npcDirectoryScrollTop);
activeNpcTab = savedUiState.activeNpcTab || activeNpcTab;
if (!npcTabs.some(([id]) => id === activeNpcTab)) activeNpcTab = "overview";
activeNpcMechanicsTab = savedUiState.activeNpcMechanicsTab || activeNpcMechanicsTab;
if (!npcMechanicsTabs.some(([id]) => id === activeNpcMechanicsTab)) activeNpcMechanicsTab = "summary";
relationshipSourceKey = savedUiState.relationshipSourceKey || relationshipSourceKey;
relationshipTargetKey = savedUiState.relationshipTargetKey || relationshipTargetKey;
sidebarCollapsed = Boolean(savedUiState.sidebarCollapsed ?? sidebarCollapsed);
activeMinigameId = savedUiState.activeMinigameId || activeMinigameId;
activeAshanaGameId = ["paper-throne", "nagash"].includes(savedUiState.activeAshanaGameId)
  ? savedUiState.activeAshanaGameId
  : activeAshanaGameId;
tagLibrarySearchTerm = savedUiState.tagLibrarySearchTerm || tagLibrarySearchTerm;
tagLibrarySortMode = savedUiState.tagLibrarySortMode || tagLibrarySortMode;
if (!["newest", "oldest", "az", "za", "empty", "with-image"].includes(tagLibrarySortMode)) tagLibrarySortMode = "newest";
tagLibraryPage = Number(savedUiState.tagLibraryPage || tagLibraryPage);
mapWikiSearchTerm = savedUiState.mapWikiSearchTerm || mapWikiSearchTerm;
mapActiveTool = ["select", "brush", "eraser"].includes(savedUiState.mapActiveTool)
  ? savedUiState.mapActiveTool
  : savedUiState.mapBrushEnabled ? "brush" : mapActiveTool;
mapBrushTerrain = savedUiState.mapBrushTerrain || mapBrushTerrain;
mapBrushTerrains = normalizeTerrains(savedUiState.mapBrushTerrains ?? mapBrushTerrain);
mapBrushTerrain = mapBrushTerrains[0] ?? "пусто";
mapBrushEnabled = mapActiveTool !== "select" || Boolean(savedUiState.mapBrushEnabled ?? mapBrushEnabled);
mapBrushMode = savedUiState.mapBrushMode || mapBrushMode;
mapBrushBoundaryColor = savedUiState.mapBrushBoundaryColor || mapBrushBoundaryColor;
mapBrushBoundaryStyle = savedUiState.mapBrushBoundaryStyle || mapBrushBoundaryStyle;
mapBrushBoundaryImage = savedUiState.mapBrushBoundaryImage || mapBrushBoundaryImage;
mapBrushBoundaryMode = savedUiState.mapBrushBoundaryMode || mapBrushBoundaryMode;
mapBrushBoundarySides = normalizeBoundarySides(savedUiState.mapBrushBoundarySides);
mapBrushRoadType = ["none", ...roadTypes.map(([value]) => value)].includes(savedUiState.mapBrushRoadType)
  ? savedUiState.mapBrushRoadType
  : mapBrushRoadType;
mapBrushRoadSides = normalizeRoadSides(savedUiState.mapBrushRoadSides ?? mapBrushRoadSides);
mapBrushTilePresetId = savedUiState.mapBrushTilePresetId || mapBrushTilePresetId;
mapZoom = Number(savedUiState.mapZoom || mapZoom);
mapScroll = savedUiState.mapScroll || mapScroll;
mapPanelScroll = savedUiState.mapPanelScroll || mapPanelScroll;
mapViewByRegion = normalizeMapViewByRegion(savedUiState.mapViewByRegion);
if (savedUiState.mapActiveRegionId) state.map.activeRegionId = savedUiState.mapActiveRegionId;
if (savedUiState.mapSelectedHex) state.map.selectedHex = savedUiState.mapSelectedHex;
const initialMapView = mapViewByRegion[state.map.activeRegionId];
if (initialMapView) {
  mapZoom = initialMapView.zoom;
  mapScroll = { ...initialMapView.map };
  mapPanelScroll = { ...initialMapView.panels };
}

const viewRoot = document.querySelector("#viewRoot");
const appShell = document.querySelector(".app-shell");
const sidebarToggle = document.querySelector("#sidebarToggle");
const navItems = document.querySelectorAll(".nav-item");
const globalSearch = document.querySelector("#globalSearch");
const activeCharacterSelect = document.querySelector("#activeCharacterSelect");
const adminBadge = document.querySelector("#adminBadge");
const quickLoginButton = document.querySelector("#quickLoginButton");
const loginDialog = document.querySelector("#loginDialog");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const cancelLogin = document.querySelector("#cancelLogin");
const resetViewButton = document.querySelector("#resetViewButton");
const quickRollButton = document.querySelector("#quickRollButton");
const quickRollPanel = document.querySelector("#quickRollPanel");

const navShortLabels = {
  dashboard: "Обзор",
  wiki: "Wiki",
  map: "Карта",
  directory: "NPC",
  settlements: "Посел.",
  countries: "Гос.",
  items: "Предм.",
  calendar: "Кал.",
  sessions: "Журн.",
  characters: "Перс.",
  gallery: "Гал.",
  quests: "Квесты",
  roller: "Roll",
  "ashana-games": "Игры",
  minigame: "Мини",
  admin: "Админ",
};

navItems.forEach((item) => {
  item.dataset.shortLabel = navShortLabels[item.dataset.view] || item.textContent.trim();
  item.title = item.textContent.trim();
});

function syncSidebarState() {
  appShell?.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  if (!sidebarToggle) return;
  sidebarToggle.title = sidebarCollapsed ? "Развернуть меню" : "Свернуть меню";
  sidebarToggle.setAttribute("aria-label", sidebarToggle.title);
  sidebarToggle.setAttribute("aria-expanded", String(!sidebarCollapsed));
}

syncSidebarState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    } catch {
      // The app can still run in-memory if browser storage is unavailable.
    }
    return normalizeState(structuredClone(seedData));
  }

  try {
    return normalizeState({ ...structuredClone(seedData), ...JSON.parse(saved) });
  } catch {
    return normalizeState(structuredClone(seedData));
  }
}

function loadUiState() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveUiState() {
  try {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
      currentView,
      activeWikiId,
      activeWikiTag,
      activeWikiCategoryId,
      wikiCategorySearchTerm,
      activeCharacterId,
      rollSelectedActorId,
      rollSelectedDiceCount,
      rollSelectedDiceSides,
      activeCharacterTab,
      activeCharacterMechanicsTab,
      activeCharacterGroupId,
      collapsedCharacterGroupIds: [...collapsedCharacterGroupIds],
      activeDirectoryTab,
      activeNpcGroupId,
      collapsedNpcGroupIds: [...collapsedNpcGroupIds],
      activeSettlementId,
      activeSettlementTab,
      activeCountryId,
      activeCountryTab,
      activeItemId,
      activeItemCategory,
      itemDirectorySearchTerm,
      activeCalendarDateKey,
      activeSessionId,
      skillSearchTerm,
      activeGalleryTag,
      activeNpcTag,
      activeNpcId,
      npcDirectorySearchTerm,
      npcDirectoryScrollTop,
      activeNpcTab,
      activeNpcMechanicsTab,
      relationshipSourceKey,
      relationshipTargetKey,
      sidebarCollapsed,
      activeMinigameId,
      activeAshanaGameId,
      tagLibrarySearchTerm,
      tagLibrarySortMode,
      tagLibraryPage,
      mapWikiSearchTerm,
      mapActiveTool,
      mapActiveRegionId: state.map.activeRegionId,
      mapSelectedHex: state.map.selectedHex,
      mapZoom,
      mapScroll,
      mapPanelScroll,
      mapViewByRegion,
      mapBrushTerrain,
      mapBrushTerrains,
      mapBrushEnabled,
      mapBrushMode,
      mapBrushBoundaryColor,
      mapBrushBoundaryStyle,
      mapBrushBoundaryImage,
      mapBrushBoundaryMode,
      mapBrushBoundarySides,
      mapBrushRoadType,
      mapBrushRoadSides,
      mapBrushTilePresetId,
    }));
  } catch (error) {
    console.warn("Не удалось сохранить положение интерфейса:", error.message);
  }
}

function finiteScrollValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeMapViewEntry(entry = {}) {
  const zoom = Number(entry.zoom);
  return {
    zoom: Number.isFinite(zoom) ? Math.max(0.45, Math.min(2.8, zoom)) : 1,
    map: {
      left: finiteScrollValue(entry.map?.left),
      top: finiteScrollValue(entry.map?.top),
    },
    panels: {
      atlas: finiteScrollValue(entry.panels?.atlas),
      inspector: finiteScrollValue(entry.panels?.inspector),
    },
    selectedHex: typeof entry.selectedHex === "string" ? entry.selectedHex : "0,0",
  };
}

function normalizeMapViewByRegion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([regionId, entry]) => [regionId, normalizeMapViewEntry(entry)])
  );
}

function mapViewForRegion(regionId) {
  if (!mapViewByRegion[regionId]) {
    const isActiveRegion = state.map.activeRegionId === regionId;
    mapViewByRegion[regionId] = normalizeMapViewEntry({
      zoom: Number(state.map.zoom || mapZoom || 1),
      map: isActiveRegion ? mapScroll : { left: 0, top: 0 },
      panels: isActiveRegion ? mapPanelScroll : { atlas: 0, inspector: 0 },
      selectedHex: isActiveRegion ? state.map.selectedHex : "0,0",
    });
  }
  return mapViewByRegion[regionId];
}

function scheduleMapUiSave() {
  clearTimeout(mapUiSaveTimer);
  mapUiSaveTimer = setTimeout(() => {
    mapUiSaveTimer = null;
    saveUiState();
  }, 120);
}

function updateMapView(regionId, changes = {}, persist = false) {
  if (!regionId) return;
  const current = mapViewForRegion(regionId);
  const next = normalizeMapViewEntry({
    ...current,
    ...changes,
    map: { ...current.map, ...(changes.map ?? {}) },
    panels: { ...current.panels, ...(changes.panels ?? {}) },
  });
  mapViewByRegion[regionId] = next;
  if (state.map.activeRegionId === regionId) {
    mapZoom = next.zoom;
    mapScroll = { ...next.map };
    mapPanelScroll = { ...next.panels };
  }
  if (persist) scheduleMapUiSave();
}

function captureActiveMapViewport(persist = false) {
  const elements = activeMapElements;
  if (!elements || elements.restoring || !elements.stage?.isConnected) return;
  updateMapView(elements.regionId, {
    zoom: mapZoom,
    map: { left: elements.stage.scrollLeft, top: elements.stage.scrollTop },
    panels: {
      atlas: elements.atlas?.scrollTop ?? 0,
      inspector: elements.inspector?.scrollTop ?? 0,
    },
    selectedHex: state.map.selectedHex,
  }, persist);
}

function isKnownView(view) {
  return ["dashboard", "wiki", "map", "directory", "settlements", "countries", "items", "calendar", "sessions", "characters", "gallery", "quests", "roller", "ashana-games", "minigame", "admin"].includes(view);
}

function applyContentMigrations(normalized) {
  const applied = Array.isArray(normalized.meta.contentMigrations)
    ? [...new Set(normalized.meta.contentMigrations.map(String))]
    : [];
  let changed = false;
  if (!applied.includes(CORE_RACES_WIKI_MIGRATION_ID)) {
    const knownIds = new Set(normalized.wiki.map((article) => article.id));
    coreRaceWikiArticles.forEach((article) => {
      if (knownIds.has(article.id)) return;
      normalized.wiki.push(normalizeWikiArticle(structuredClone(article)));
      knownIds.add(article.id);
      changed = true;
    });
    applied.push(CORE_RACES_WIKI_MIGRATION_ID);
    changed = true;
  }
  if (!applied.includes(EXTENDED_RACES_WIKI_MIGRATION_ID)) {
    const knownIds = new Set(normalized.wiki.map((article) => article.id));
    extendedRaceWikiArticles.forEach((article) => {
      if (knownIds.has(article.id)) return;
      normalized.wiki.push(normalizeWikiArticle(structuredClone(article)));
      knownIds.add(article.id);
      changed = true;
    });
    applied.push(EXTENDED_RACES_WIKI_MIGRATION_ID);
    changed = true;
  }
  if (!applied.includes(OGRE_WIKI_MIGRATION_ID)) {
    const knownIds = new Set(normalized.wiki.map((article) => article.id));
    ogreWikiArticles.forEach((article) => {
      if (knownIds.has(article.id)) return;
      normalized.wiki.push(normalizeWikiArticle(structuredClone(article)));
      knownIds.add(article.id);
      changed = true;
    });
    applied.push(OGRE_WIKI_MIGRATION_ID);
    changed = true;
  }
  if (!applied.includes(HARPY_WIKI_MIGRATION_ID)) {
    const knownIds = new Set(normalized.wiki.map((article) => article.id));
    harpyWikiArticles.forEach((article) => {
      if (knownIds.has(article.id)) return;
      normalized.wiki.push(normalizeWikiArticle(structuredClone(article)));
      knownIds.add(article.id);
      changed = true;
    });
    applied.push(HARPY_WIKI_MIGRATION_ID);
    changed = true;
  }
  if (!applied.includes(NPC_STAT_PROFILE_MIGRATION_ID)) {
    const profilesById = new Map(coreRaceWikiArticles.map((article) => [article.id, article.npcStatProfile]));
    normalized.wiki.forEach((article) => {
      if (!profilesById.has(article.id)) return;
      article.npcStatProfile = normalizeNpcStatProfile(profilesById.get(article.id));
    });
    applied.push(NPC_STAT_PROFILE_MIGRATION_ID);
    changed = true;
  }
  if (!applied.includes(MAP_OWNERSHIP_MIGRATION_ID)) {
    applied.push(MAP_OWNERSHIP_MIGRATION_ID);
    changed = true;
  }
  normalized.meta.contentMigrations = applied;
  return changed;
}

function normalizeState(raw) {
  const normalized = {
    ...structuredClone(seedData),
    ...raw,
    meta: { ...seedData.meta, ...(raw.meta ?? {}), version: 2 },
  };
  normalized.meta.ashanaDate = normalizeAshanaDate(normalized.meta.ashanaDate);
  normalized.meta.monthNames = normalizeMonthNames(normalized.meta.monthNames);
  normalized.meta.currentDate = formatAshanaDate(normalized.meta.ashanaDate, true, normalized.meta.monthNames);
  normalized.wiki = (raw.wiki ?? seedData.wiki).map(normalizeWikiArticle);
  applyContentMigrations(normalized);
  normalized.characters = (raw.characters ?? seedData.characters).map(normalizeCharacter);
  if (!normalized.characters.some((character) => character.id === "richie-goldmann")) {
    normalized.characters.unshift(normalizeCharacter(seedData.characters[0]));
  }
  const characterIds = new Set(normalized.characters.map((character) => character.id));
  normalized.characterGroups = sanitizeCharacterGroupHierarchy((raw.characterGroups ?? seedData.characterGroups ?? [])
    .map(normalizeCharacterGroup)
    .map((group) => ({ ...group, characterIds: group.characterIds.filter((id) => characterIds.has(id)) })));
  normalized.quests = raw.quests ?? seedData.quests;
  normalized.factions = (raw.factions ?? seedData.factions).map(normalizeFaction);
  normalized.npcs = (raw.npcs ?? seedData.npcs).map(normalizeNpc);
  const npcIds = new Set(normalized.npcs.map((npc) => npc.id));
  normalized.npcGroups = sanitizeNpcGroupHierarchy((raw.npcGroups ?? seedData.npcGroups ?? [])
    .map(normalizeNpcGroup)
    .map((group) => ({ ...group, npcIds: group.npcIds.filter((id) => npcIds.has(id)) })));
  normalized.relationships = (raw.relationships ?? seedData.relationships).map(normalizeRelationship)
    .filter((relationship) => relationship.sourceKey && relationship.targetKey && relationship.sourceKey !== relationship.targetKey);
  normalized.settlements = (raw.settlements ?? seedData.settlements).map(normalizeSettlement);
  normalized.countries = (raw.countries ?? seedData.countries).map(normalizeCountry);
  normalized.items = (raw.items ?? seedData.items).map(normalizeUniqueItem);
  normalized.calendarEvents = (raw.calendarEvents ?? seedData.calendarEvents).map(normalizeCalendarEvent);
  normalized.sessionLogs = (raw.sessionLogs ?? seedData.sessionLogs).map(normalizeSessionLog);
  normalized.gallery = (raw.gallery ?? seedData.gallery).map(normalizeGalleryItem);
  const paperThroneCompatible = Number(raw.paperThrone?.schemaVersion) === 4;
  normalized.paperThrone = {
    schemaVersion: 4,
    cards: paperThroneCompatible && Array.isArray(raw.paperThrone?.cards) ? raw.paperThrone.cards : [],
    decks: paperThroneCompatible && Array.isArray(raw.paperThrone?.decks) ? raw.paperThrone.decks : [],
    factions: paperThroneCompatible && Array.isArray(raw.paperThrone?.factions) ? raw.paperThrone.factions : [],
    leaders: paperThroneCompatible && Array.isArray(raw.paperThrone?.leaders) ? raw.paperThrone.leaders : [],
  };
  normalized.tagMeta = normalizeTagMeta(raw.tagMeta ?? seedData.tagMeta, normalized);
  normalized.map = {
    ...seedData.map,
    ...(raw.map ?? {}),
  };
  normalized.map.tilePresets = (raw.map?.tilePresets ?? []).map(normalizeMapTilePreset).filter((preset) => preset.image);
  normalized.map.regions = normalizeMapRegions(raw.map?.regions?.length ? raw.map.regions : seedData.map.regions);
  if (!normalized.map.regions.length) normalized.map.regions = normalizeMapRegions(seedData.map.regions);
  synchronizeMapOwnership(normalized);
  if (!normalized.map.regions.some((region) => region.id === normalized.map.activeRegionId)) {
    normalized.map.activeRegionId = normalized.map.regions[0]?.id ?? "mezhi-canvas";
  }
  normalized.map.selectedHex = raw.map?.selectedHex ?? seedData.map.selectedHex ?? "0,0";
  normalized.rolls = raw.rolls ?? [];
  return normalized;
}

function normalizeAshanaDate(date) {
  const source = date && typeof date === "object" ? date : seedData.meta.ashanaDate;
  return {
    year: Math.max(1, Number(source.year || 1)),
    month: Math.min(10, Math.max(1, Number(source.month || 1))),
    day: Math.min(36, Math.max(1, Number(source.day || 1))),
  };
}

function normalizeMonthNames(names) {
  const list = Array.isArray(names) ? names : [];
  return defaultAshanaMonths.map((fallback, index) => String(list[index] || fallback).trim() || fallback);
}

function campaignMonthNames() {
  return normalizeMonthNames(state?.meta?.monthNames);
}

function monthOptions() {
  return campaignMonthNames().map((name, index) => [String(index + 1), `${index + 1}. ${name}`]);
}

function ashanaDateIndex(date) {
  const normalized = normalizeAshanaDate(date);
  return (normalized.year - 1) * 360 + (normalized.month - 1) * 36 + (normalized.day - 1);
}

function ashanaDateFromIndex(index) {
  const safeIndex = Math.max(0, Number(index || 0));
  return {
    year: Math.floor(safeIndex / 360) + 1,
    month: Math.floor((safeIndex % 360) / 36) + 1,
    day: (safeIndex % 36) + 1,
  };
}

function formatAshanaDate(date, withYear = true, monthNames = null) {
  const normalized = normalizeAshanaDate(date);
  const names = monthNames ? normalizeMonthNames(monthNames) : campaignMonthNames();
  const monthName = names[normalized.month - 1] ?? `Месяц ${normalized.month}`;
  const year = withYear ? `, ${normalized.year} год` : "";
  return `${normalized.day} день месяца ${monthName}${year}`;
}

function ashanaWeekday(date) {
  const normalized = normalizeAshanaDate(date);
  return ashanaWeekdays[(normalized.day - 1) % 9] ?? `${((normalized.day - 1) % 9) + 1} день недели`;
}

function ashanaWeekNumber(date) {
  return Math.floor((normalizeAshanaDate(date).day - 1) / 9) + 1;
}

function ashanaDateKey(date) {
  const normalized = normalizeAshanaDate(date);
  return `${normalized.year}-${normalized.month}-${normalized.day}`;
}

function ashanaDateFromKey(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  return normalizeAshanaDate({ year, month, day });
}

function setCurrentAshanaDate(date) {
  state.meta.ashanaDate = normalizeAshanaDate(date);
  state.meta.currentDate = formatAshanaDate(state.meta.ashanaDate);
  activeCalendarDateKey = ashanaDateKey(state.meta.ashanaDate);
}

function normalizeTerrains(terrains) {
  const source = Array.isArray(terrains) ? terrains : [terrains];
  const allowed = new Set(hexTerrains.map(([value]) => value));
  const normalized = source
    .flatMap((value) => typeof value === "string" && value.includes(",") ? csv(value) : [value])
    .map((value) => terrainAliases[String(value || "").trim()] || String(value || "").trim())
    .filter((value) => value && value !== "пусто" && allowed.has(value));
  return [...new Set(normalized)];
}

function terrainValues(cell) {
  return normalizeTerrains(cell?.terrains?.length ? cell.terrains : cell?.terrain);
}

function primaryTerrain(cell) {
  return terrainValues(cell)[0] || "пусто";
}

function terrainLabel(value) {
  return hexTerrains.find(([terrainValue]) => terrainValue === value)?.[1] || value;
}

function terrainSummary(cell) {
  const values = terrainValues(cell);
  return values.length ? values.map(terrainLabel).join(", ") : "Пусто";
}

function hadLegacyRoad(cell) {
  const source = Array.isArray(cell?.terrains) ? cell.terrains : [cell?.terrain];
  return source.some((value) => String(value || "").trim() === "дорога");
}

function normalizeRoadSides(sides) {
  const values = Array.isArray(sides) ? sides : csv(sides ?? "");
  return [...new Set(values.map(String).filter((value) => hexBoundarySideIds.includes(value)))];
}

function normalizeRoadType(value) {
  return roadTypes.some(([type]) => type === value) ? value : "road";
}

function roadTypeLabel(value) {
  return roadTypes.find(([type]) => type === value)?.[1] || "Дорога";
}

function roadSummary(cell) {
  const sides = normalizeRoadSides(cell?.roadSides);
  return sides.length ? roadTypeLabel(normalizeRoadType(cell?.roadType)) : "";
}

function isSquareRegion(region) {
  return region?.gridType === "square";
}

function boundarySideOptionsFor(region) {
  return isSquareRegion(region) ? squareBoundarySideOptions : hexBoundarySideOptions;
}

function boundarySideIdsFor(region) {
  return boundarySideOptionsFor(region).map(([value]) => value);
}

function adaptBoundarySidesForRegion(region, sides) {
  const normalized = normalizeBoundarySides(sides);
  if (!isSquareRegion(region)) return normalized;
  const squareSides = [];
  if (normalized.includes("top")) squareSides.push("top");
  if (normalized.includes("topRight") || normalized.includes("bottomRight")) squareSides.push("topRight");
  if (normalized.includes("bottom")) squareSides.push("bottom");
  if (normalized.includes("topLeft") || normalized.includes("bottomLeft")) squareSides.push("topLeft");
  return squareSides.length ? squareSides : ["top"];
}

function adaptRoadSidesForRegion(region, sides) {
  const normalized = normalizeRoadSides(sides);
  if (!isSquareRegion(region)) return normalized;
  const squareSides = [];
  if (normalized.includes("top")) squareSides.push("top");
  if (normalized.includes("topRight") || normalized.includes("bottomRight")) squareSides.push("topRight");
  if (normalized.includes("bottom")) squareSides.push("bottom");
  if (normalized.includes("topLeft") || normalized.includes("bottomLeft")) squareSides.push("topLeft");
  return squareSides;
}

function mapMarkerType(type) {
  const value = String(type || "note");
  return mapMarkerTypes.some(([id]) => id === value) ? value : "note";
}

function mapMarkerMeta(type) {
  const normalized = mapMarkerType(type);
  const entry = mapMarkerTypes.find(([id]) => id === normalized) ?? mapMarkerTypes.at(-1);
  return { type: entry[0], title: entry[1], icon: entry[2] };
}

function normalizeMapMarkers(markers) {
  if (markers == null) return [];
  const values = Array.isArray(markers) ? markers : csv(markers);
  return values
    .map((marker) => {
      if (typeof marker === "string") {
        return { id: slug("marker"), type: "note", label: marker, icon: "" };
      }
      if (!marker || typeof marker !== "object") return null;
      const type = mapMarkerType(marker.type);
      return {
        id: String(marker.id || slug("marker")),
        type,
        label: String(marker.label || marker.title || mapMarkerMeta(type).title).trim(),
        icon: String(marker.icon || "").trim().slice(0, 3),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeTerrainTileImage(cell = {}) {
  const tileImage = String(cell.tileImage || "");
  const terrain = normalizeTerrains(cell.terrains?.length ? cell.terrains : cell.terrain)[0] || "";
  const legacyPresetImages = {
    холмы: ["assets/hex-terrain/mountain.png"],
    "лес-холмы": ["assets/hex-terrain/forest.png", "assets/hex-terrain/hills.png", "assets/hex-terrain/mountain.png"],
    "лес-в-холмах": ["assets/hex-terrain/forest.png", "assets/hex-terrain/hills.png", "assets/hex-terrain/mountain.png"],
    "болотный-лес": ["assets/hex-terrain/forest.png", "assets/hex-terrain/boloto.png"],
    "лес-болото": ["assets/hex-terrain/forest.png", "assets/hex-terrain/boloto.png"],
    поселение: ["assets/hex-terrain/village.png", "assets/hex-terrain/small village.png", "assets/hex-terrain/hamlet.png", "assets/hex-terrain/settlement.png"],
    "населенный-пункт": ["assets/hex-terrain/village.png", "assets/hex-terrain/small village.png"],
    "магический-лес": ["assets/hex-terrain/forest.png"],
  };
  if (legacyPresetImages[terrain]?.includes(tileImage)) return terrainTileFiles[terrain] || "";
  return tileImage;
}

function normalizeMapRegions(regions) {
  return regions.map((region) => ({
    id: region.id || slug(region.title || "region"),
    title: region.title || "Регион",
    type: region.type || "Регион",
    description: region.description || "",
    public: region.public ?? true,
    image: region.image || "",
    mode: region.mode || "canvas",
    gridType: region.gridType === "square" || region.grid?.type === "square" ? "square" : "hex",
    grid: {
      cols: 24,
      rows: 14,
      hexSize: 92,
      offsetX: 0,
      offsetY: 0,
      ...(region.grid ?? {}),
      staggerOffset: Number(region.grid?.staggerOffset || 0),
    },
    hexes: Object.fromEntries(
      Object.entries(region.hexes ?? {}).map(([key, value]) => [
        key,
        {
          title: "",
          terrain: "пусто",
          terrains: [],
          visible: true,
          notes: "",
          features: "",
          objectInfo: "",
          countryIds: [],
          factionIds: [],
          gmNotes: "",
          objects: [],
          markers: [],
          wikiLinks: [],
          questLinks: [],
          mapLinks: [],
          tileImage: "",
          tileFit: "cover",
          tilePresetId: "",
          tileScale: 1,
          tileX: 50,
          tileY: 50,
          tileRotation: 0,
          boundaryColor: "#d4a74f",
          boundaryStyle: "none",
          boundaryImage: "",
          boundarySides: [...hexBoundarySideIds],
          boundaryLayers: [],
          roadType: "road",
          roadSides: [],
          mergeRoot: "",
          mergeWidth: 1,
          mergeHeight: 1,
          ...value,
          tileImage: normalizeTerrainTileImage(value),
          tilePresetId: String(value.tilePresetId || ""),
          tileScale: normalizeTileTransform(value).scale,
          tileX: normalizeTileTransform(value).x,
          tileY: normalizeTileTransform(value).y,
          tileRotation: normalizeTileTransform(value).rotation,
          terrain: normalizeTerrains(value.terrains?.length ? value.terrains : value.terrain)[0] || "пусто",
          terrains: normalizeTerrains(value.terrains?.length ? value.terrains : value.terrain),
          objects: Array.isArray(value.objects) ? value.objects : csv(value.objects ?? ""),
          markers: normalizeMapMarkers(value.markers),
          wikiLinks: Array.isArray(value.wikiLinks) ? value.wikiLinks : csv(value.wikiLinks ?? ""),
          questLinks: Array.isArray(value.questLinks) ? value.questLinks : csv(value.questLinks ?? ""),
          mapLinks: Array.isArray(value.mapLinks) ? value.mapLinks : csv(value.mapLinks ?? ""),
          boundarySides: normalizeBoundarySides(value.boundarySides),
          boundaryLayers: normalizeBoundaryLayers(value.boundaryLayers, value),
          roadType: normalizeRoadType(value.roadType),
          roadSides: normalizeRoadSides(value.roadSides?.length
            ? value.roadSides
            : hadLegacyRoad(value) ? ["topLeft", "bottomRight"] : []),
          features: String(value.features || ""),
          objectInfo: String(value.objectInfo || ""),
          countryIds: normalizeOwnerIds(value.countryIds ?? value.countryId),
          factionIds: normalizeOwnerIds(value.factionIds ?? value.factionId),
          ...normalizeCountryEffects(value, { stateDomainSize: 1 }),
          mergeRoot: String(value.mergeRoot || ""),
          mergeWidth: Math.max(1, Math.floor(Number(value.mergeWidth) || 1)),
          mergeHeight: Math.max(1, Math.floor(Number(value.mergeHeight) || 1)),
        },
      ])
    ),
  }));
}

function synchronizeMapOwnership(normalized) {
  const countriesById = new Map(normalized.countries.map((country) => [country.id, country]));
  const factionsById = new Set(normalized.factions.map((faction) => faction.id));
  normalized.countries.forEach((country) => {
    normalizeOwnerIds(country.hexRefs).forEach((ref) => {
      const parsed = parseCountryHexRef(ref);
      const region = parsed && normalized.map.regions.find((item) => item.id === parsed.regionId);
      const coordinates = parsed && parseMapCellKey(parsed.key);
      if (!region || isSquareRegion(region) || !coordinates) return;
      if (coordinates.q < 0 || coordinates.r < 0 || coordinates.q >= region.grid.cols || coordinates.r >= region.grid.rows) return;
      const cell = getHex(region, parsed.key);
      cell.countryIds = normalizeOwnerIds(cell.countryIds);
      if (!cell.countryIds.includes(country.id)) cell.countryIds.push(country.id);
    });
    country.hexRefs = [];
  });
  normalized.map.regions.forEach((region) => {
    if (isSquareRegion(region)) return;
    Object.entries(region.hexes ?? {}).forEach(([key, cell]) => {
      const ref = countryHexRef(region.id, key);
      cell.countryIds = normalizeOwnerIds(cell.countryIds).filter((id) => countriesById.has(id));
      cell.factionIds = normalizeOwnerIds(cell.factionIds).filter((id) => factionsById.has(id));
      countriesById.forEach((country) => {
        if (cell.countryIds.includes(country.id) && !country.hexRefs.includes(ref)) country.hexRefs.push(ref);
      });
    });
  });
}

function normalizeBoundarySides(sides) {
  if (sides == null) return [...hexBoundarySideIds];
  const values = Array.isArray(sides) ? sides : csv(sides);
  return values.map((value) => String(value)).filter((value) => hexBoundarySideIds.includes(value));
}

function createBoundaryLayer(source = {}) {
  return normalizeBoundaryLayer({
    id: source.id,
    style: source.style || source.boundaryStyle || "solid",
    color: source.color || source.boundaryColor || "#d4a74f",
    image: source.image || source.boundaryImage || "",
    sides: source.sides || source.boundarySides || hexBoundarySideIds,
  });
}

function normalizeBoundaryLayer(layer = {}) {
  const styleValue = layer.style || layer.boundaryStyle;
  const style = hexBoundaryStyles.some(([value]) => value === styleValue) && styleValue !== "none" ? styleValue : "solid";
  return {
    id: String(layer.id || crypto.randomUUID?.() || `boundary-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
    style,
    color: /^#[0-9a-f]{6}$/i.test(layer.color || layer.boundaryColor || "") ? (layer.color || layer.boundaryColor) : "#d4a74f",
    image: typeof (layer.image || layer.boundaryImage) === "string" ? (layer.image || layer.boundaryImage) : "",
    sides: normalizeBoundarySides(layer.sides || layer.boundarySides),
  };
}

function normalizeBoundaryLayers(layers, legacySource = {}) {
  const sourceLayers = Array.isArray(layers) ? layers : [];
  const normalized = (sourceLayers.length
    ? sourceLayers
    : legacySource.boundaryStyle && legacySource.boundaryStyle !== "none"
      ? [createBoundaryLayer(legacySource)]
      : [])
    .map((layer) => normalizeBoundaryLayer(layer))
    .filter((layer) => layer.style !== "none" && layer.sides.length)
    .slice(0, 6);
  return normalized;
}

function syncLegacyBoundaryFields(hex) {
  const first = normalizeBoundaryLayers(hex.boundaryLayers, hex)[0];
  if (first) {
    hex.boundaryStyle = first.style;
    hex.boundaryColor = first.color;
    hex.boundaryImage = first.image;
    hex.boundarySides = [...first.sides];
  } else {
    hex.boundaryStyle = "none";
    hex.boundaryColor = "#d4a74f";
    hex.boundaryImage = "";
    hex.boundarySides = [...hexBoundarySideIds];
  }
  return hex;
}

function normalizeNpcStatProfile(profile = {}) {
  const kind = profile.kind === "race" || profile.kind === "monster" ? profile.kind : "none";
  const normalizeAbilities = (source = {}) => Object.fromEntries(npcAbilityDefinitions.map(([key]) => [
    key,
    Number(source?.[key] || 0),
  ]));
  return {
    kind,
    modifiers: normalizeAbilities(profile.modifiers),
    flexibleBonus: Math.max(0, Number(profile.flexibleBonus || 0)),
    baseStats: normalizeAbilities(profile.baseStats),
  };
}

function normalizeWikiArticle(article) {
  const categoryId = article.categoryId || categoryAliases[article.category] || "places";
  return {
    image: "",
    imageStyle: defaultImageStyle(),
    related: [],
    gmBody: "",
    ...article,
    imageStyle: { ...defaultImageStyle(), ...(article.imageStyle ?? {}) },
    categoryId,
    category: article.category || wikiCategoryTitle(categoryId),
    tags: Array.isArray(article.tags) ? article.tags : csv(article.tags ?? ""),
    npcStatProfile: normalizeNpcStatProfile(article.npcStatProfile),
  };
}

function normalizeGalleryItem(item) {
  return {
    image: "",
    imageStyle: defaultImageStyle(),
    description: "",
    tags: [],
    ...item,
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    tags: Array.isArray(item.tags) ? item.tags : csv(item.tags ?? item.type ?? ""),
    palette: Array.isArray(item.palette) ? item.palette : ["#d4a74f", "#4da9a7", "#111719"],
  };
}

function normalizeUniqueItem(item) {
  const source = item && typeof item === "object" ? item : {};
  const category = uniqueItemCategories.some(([value]) => value === source.category)
    ? source.category
    : "magical";
  return {
    id: source.id || slug(source.name || "item"),
    name: source.name || "Новый уникальный предмет",
    category,
    type: uniqueItemTypes.some(([value]) => value === source.type) ? source.type : "other",
    status: uniqueItemStatuses.some(([value]) => value === source.status) ? source.status : "known",
    rarity: source.rarity || "уникальный",
    price: String(source.price ?? ""),
    public: source.public ?? true,
    image: source.image || "",
    imageStyle: { ...defaultImageStyle(), ...(source.imageStyle ?? {}) },
    tags: Array.isArray(source.tags) ? source.tags : csv(source.tags ?? ""),
    ownerType: source.ownerType || "",
    ownerName: source.ownerName || "",
    locationName: source.locationName || "",
    description: source.description || "",
    features: source.features || "",
    mechanics: source.mechanics || "",
    gmNotes: source.gmNotes || "",
    characterLinks: Array.isArray(source.characterLinks) ? source.characterLinks : csv(source.characterLinks ?? ""),
    npcLinks: Array.isArray(source.npcLinks) ? source.npcLinks : csv(source.npcLinks ?? ""),
    wikiLinks: Array.isArray(source.wikiLinks) ? source.wikiLinks : csv(source.wikiLinks ?? ""),
    questLinks: Array.isArray(source.questLinks) ? source.questLinks : csv(source.questLinks ?? ""),
    settlementLinks: Array.isArray(source.settlementLinks) ? source.settlementLinks : csv(source.settlementLinks ?? ""),
    mapLinks: Array.isArray(source.mapLinks) ? source.mapLinks : csv(source.mapLinks ?? ""),
    books: Array.isArray(source.books)
      ? source.books.map((book, index) => normalizeCollectionBook(book, index))
      : [],
    linkedBookItemIds: Array.isArray(source.linkedBookItemIds)
      ? [...new Set(source.linkedBookItemIds.map(String).filter(Boolean))]
      : csv(source.linkedBookItemIds ?? ""),
  };
}

function readLocalCampaignSnapshot() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function campaignSnapshotSignature(source) {
  const text = JSON.stringify(source || {});
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function loadLocalSafetySnapshots() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_SAFETY_STORAGE_KEY) || "[]");
    return Array.isArray(value)
      ? value
        .filter((entry) => entry?.data && entry?.createdAt)
        .slice(0, 1)
        .map((entry) => ({ ...entry, signature: campaignSnapshotSignature(entry.data) }))
      : [];
  } catch {
    return [];
  }
}

function persistLocalSafetySnapshots() {
  try {
    localSafetySnapshots = localSafetySnapshots.slice(0, 1);
    localStorage.setItem(LOCAL_SAFETY_STORAGE_KEY, JSON.stringify(localSafetySnapshots));
  } catch {
    localSafetySnapshots = [];
    try {
      localStorage.removeItem(LOCAL_SAFETY_STORAGE_KEY);
    } catch {
      // Supabase revisions remain the primary recovery path if local storage is unavailable.
    }
  }
}

function preserveLocalSafetySnapshot(candidate, reference, reason = "Перед загрузкой облака") {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const compact = compactStateForStorage(normalizeState(structuredClone(candidate)));
  const signature = campaignSnapshotSignature(compact);
  if (campaignValuesEqual(compact, reference || {})) return null;
  if (localSafetySnapshots.some((entry) => entry.signature === signature)) return null;
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason,
    signature,
    data: compact,
  };
  localSafetySnapshots.unshift(entry);
  localSafetySnapshots = localSafetySnapshots.slice(0, 1);
  persistLocalSafetySnapshots();
  return entry;
}

function localSafetySnapshotSummary(snapshot) {
  const settlements = Array.isArray(snapshot?.data?.settlements) ? snapshot.data.settlements : [];
  const names = settlements.map((item) => item?.name).filter(Boolean);
  return {
    settlements: settlements.length,
    buildings: settlements.reduce((sum, item) => sum + (item?.buildings?.length || 0), 0),
    names: names.join(" · ") || "поселений нет",
  };
}

function normalizeCollectionBook(book, index = 0) {
  const source = book && typeof book === "object" ? book : {};
  return {
    id: source.id || `${slug(source.title || "book")}-${index + 1}`,
    title: source.title || "Новая книга",
    description: source.description || "",
    price: String(source.price ?? ""),
    readingEffect: source.readingEffect || "",
  };
}

function normalizeTagMeta(meta, sourceState = state) {
  const normalized = {};
  const source = meta && typeof meta === "object" ? meta : {};
  Object.entries(source).forEach(([tagName, value]) => {
    const clean = normalizeTagName(tagName);
    if (!clean) return;
    normalized[clean] = normalizeTagMetaEntry(clean, value);
  });
  collectCampaignTags(sourceState).forEach((tagName) => {
    const clean = normalizeTagName(tagName);
    if (!clean || normalized[clean]) return;
    normalized[clean] = normalizeTagMetaEntry(clean, {});
  });
  return Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b, "ru")));
}

function normalizeTagMetaEntry(tagName, value = {}) {
  const entry = value && typeof value === "object" ? value : {};
  return {
    description: entry.description || defaultTagDescription(tagName),
    image: entry.image || "",
    imageStyle: { ...defaultImageStyle(), ...(entry.imageStyle ?? {}) },
    public: entry.public ?? true,
    createdAt: entry.createdAt || "",
  };
}

function normalizeTagName(tagName) {
  return String(tagName || "").trim().toLowerCase();
}

function collectCampaignTags(sourceState = state) {
  const result = new Set();
  const add = (items) => (items ?? []).forEach((tagName) => {
    const clean = normalizeTagName(tagName);
    if (clean) result.add(clean);
  });
  (sourceState.wiki ?? []).forEach((item) => add(item.tags));
  (sourceState.gallery ?? []).forEach((item) => add(item.tags));
  (sourceState.npcs ?? []).forEach((item) => add(item.tags));
  (sourceState.factions ?? []).forEach((item) => add(item.tags));
  (sourceState.settlements ?? []).forEach((item) => add(item.tags));
  (sourceState.items ?? []).forEach((item) => add(item.tags));
  return [...result].sort((a, b) => a.localeCompare(b, "ru"));
}

function defaultTagDescription(tagName) {
  const value = normalizeTagName(tagName);
  const descriptions = {
    "бог": "Бог в Асхане - могущественная сущность, связанная с верой, доменами, клятвами, культами и силами, которые смертные редко понимают до конца.",
    "боги": "Раздел и теги, связанные с пантеонами, культами, божественными силами и их влиянием на смертных.",
    "место": "Географическая или сюжетная точка мира: регион, город, дорога, руины, святилище или иная важная локация.",
    "места": "Локации Асханы, которые важны для путешествий, заданий, политики или личных историй персонажей.",
    "npc": "Неигровой персонаж: союзник, враг, заказчик, свидетель, правитель, торговец или иной участник истории.",
    "фракция": "Организация, культ, государство, дом, гильдия или группа влияния со своими целями и ресурсами.",
    "поселение": "Населенный пункт, владение или база партии с постройками, доходами, проблемами и управлением.",
    "культ": "Закрытая религиозная или мистическая группа, часто связанная с тайными целями, обрядами и угрозами.",
    "секрет": "Информация, скрытая от игроков или известная не всем персонажам внутри мира.",
    "угроза": "Источник опасности: враг, бедствие, политический кризис, чудовище или надвигающееся событие.",
    "дорога": "Путь между локациями, важный для торговли, путешествий, засад, слухов и случайных встреч.",
    "город": "Крупное поселение с властью, фракциями, торговлей, законами и собственными конфликтами.",
    "деревня": "Малое поселение, обычно тесно связанное с местной экономикой, землей, соседями и слухами.",
    "торговля": "Деньги, рынки, пошлины, караваны, товары, долги и экономическое влияние.",
    "караван": "Группа путников или торговцев, перевозящая людей, товары, слухи и неприятности между землями.",
    "свет": "Темы света, очищения, откровения, защиты и сил, противостоящих тьме.",
    "клятвы": "Обеты, договоры, священные обещания и последствия их нарушения.",
    "храмы": "Священные места, духовные общины, реликвии и жрецы.",
  };
  return descriptions[value] || `Краткая справка по тегу "${tagName}". Мастер может заменить этот текст на точное описание термина Асханы.`;
}

function normalizeNpcTraits(traits, legacyPersonality = "") {
  const source = Array.isArray(traits) ? traits : [];
  const normalized = source
    .map((trait, index) => typeof trait === "string"
      ? { id: `trait-${index + 1}`, name: trait, description: "" }
      : {
          id: String(trait?.id || `trait-${index + 1}`),
          name: String(trait?.name || "").trim(),
          description: String(trait?.description || "").trim(),
        })
    .filter((trait) => trait.name);
  if (!normalized.length && String(legacyPersonality || "").trim()) {
    normalized.push({ id: "trait-legacy", name: "Общее впечатление", description: String(legacyPersonality).trim() });
  }
  return normalized;
}

function normalizeNpcLevels(levels, className = "", totalLevel = 1) {
  const source = Array.isArray(levels) ? levels : [];
  const normalized = source
    .map((entry, index) => ({
      id: String(entry?.id || `level-${index + 1}`),
      className: String(entry?.className || entry?.name || "").trim(),
      level: Math.max(0, Number(entry?.level ?? 0) || 0),
      notes: String(entry?.notes || "").trim(),
    }))
    .filter((entry) => entry.className || entry.level);
  if (!normalized.length && String(className || "").trim()) {
    normalized.push({ id: "level-legacy", className: String(className).trim(), level: Math.max(1, Number(totalLevel || 1)), notes: "" });
  }
  return normalized;
}

function migrateNpcNotes(item) {
  if (String(item.notes || "").trim()) return String(item.notes).trim();
  return [
    ["История контактов", item.partyHistory],
    ["Взаимодействие", item.interactionNotes],
    ["Цели", item.wants],
    ["Страхи", item.fears],
    ["Мотивация", item.motivation],
    ["Рычаги влияния", item.leverage],
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join("\n\n");
}

function normalizeNpc(item = {}) {
  const id = item.id || slug(item.name || "npc");
  const name = item.name || "Новый NPC";
  const sheet = normalizeCharacter({
    ...characterDefaults(),
    ...item,
    id,
    name,
    player: "NPC",
    ancestry: item.ancestry || "",
    className: item.className || "",
    level: Number(item.level ?? 1),
    portrait: item.portrait || "",
  });
  const levels = normalizeNpcLevels(item.levels, sheet.className, sheet.level);
  const derivedLevel = levels.reduce((sum, entry) => sum + Number(entry.level || 0), 0);
  return {
    id,
    name,
    player: item.player || "NPC",
    type: item.type || "neutral",
    ancestry: item.ancestry || "",
    homeland: item.homeland || "",
    culture: item.culture || "",
    religion: item.religion || "",
    deity: item.deity || "",
    alignment: item.alignment || "",
    estate: item.estate || "",
    size: item.size || "Средний",
    gender: item.gender || "",
    dangerClass: String(item.dangerClass || sheet.dangerClass || ""),
    age: String(item.age || sheet.age || ""),
    height: String(item.height || sheet.height || ""),
    weight: String(item.weight || sheet.weight || ""),
    maritalStatus: String(item.maritalStatus || sheet.maritalStatus || ""),
    role: item.role || "",
    className: item.className || levels.map((entry) => `${entry.className} ${entry.level}`).filter(Boolean).join(" / "),
    level: derivedLevel || Number(item.level ?? 1),
    levels,
    factionId: item.factionId || "",
    factionRole: item.factionRole || "",
    factionRank: item.factionRank || "",
    factionReputation: item.factionReputation || "",
    accumulatedRecognition: normalizeEffectNumber(item.accumulatedRecognition),
    authorityLevel: normalizeEffectNumber(item.authorityLevel),
    demand: normalizeRecognitionText(item.demand),
    honor: normalizeEffectNumber(item.honor),
    piety: normalizeEffectNumber(item.piety),
    fame: normalizeEffectNumber(item.fame),
    merits: String(item.merits || ""),
    location: item.location || "",
    relation: Number(item.relation ?? 0),
    status: item.status || "alive",
    public: item.public ?? true,
    adminOnlyEdit: Boolean(item.adminOnlyEdit),
    portrait: item.portrait || "",
    portraitStyle: { ...defaultImageStyle(), ...(item.portraitStyle ?? {}) },
    tags: Array.isArray(item.tags) ? item.tags : csv(item.tags ?? ""),
    appearance: item.appearance || "",
    personalityTraits: normalizeNpcTraits(item.personalityTraits, item.personality),
    voice: item.voice || "",
    notes: migrateNpcNotes(item),
    secrets: item.secrets || "",
    description: item.description || "",
    gmNotes: item.gmNotes || "",
    lastSeen: item.lastSeen || "",
    factionLinks: Array.isArray(item.factionLinks) ? item.factionLinks : csv(item.factionLinks ?? ""),
    npcLinks: Array.isArray(item.npcLinks) ? item.npcLinks : csv(item.npcLinks ?? ""),
    mapLinks: Array.isArray(item.mapLinks) ? item.mapLinks : csv(item.mapLinks ?? ""),
    wikiLinks: Array.isArray(item.wikiLinks) ? item.wikiLinks : csv(item.wikiLinks ?? ""),
    questLinks: Array.isArray(item.questLinks) ? item.questLinks : csv(item.questLinks ?? ""),
    hp: sheet.hp,
    ac: sheet.ac,
    touchAc: sheet.touchAc,
    flatFootedAc: sheet.flatFootedAc,
    initiative: sheet.initiative,
    speed: sheet.speed,
    speeds: sheet.speeds,
    bab: sheet.bab,
    babEntries: sheet.babEntries,
    cmb: sheet.cmb,
    cmd: sheet.cmd,
    stats: sheet.stats,
    unusualAncestry: sheet.unusualAncestry,
    customConModifier: sheet.customConModifier,
    saves: sheet.saves,
    skills: sheet.skills,
    attacks: sheet.attacks,
    armor: sheet.armor,
    feats: sheet.feats,
    features: sheet.features,
    templatesStatuses: sheet.templatesStatuses,
    strokes: sheet.strokes,
    spells: sheet.spells,
    spellNotes: sheet.spellNotes,
    inventory: sheet.inventory,
    inventoryNotes: sheet.inventoryNotes,
    equippedGear: sheet.equippedGear,
    magicItemLinks: sheet.magicItemLinks,
    attacksNotes: sheet.attacksNotes,
    armorNotes: sheet.armorNotes,
    languages: item.languages || "",
    mechanicsNotes: item.mechanicsNotes || "",
  };
}

function normalizeNpcGroup(item = {}) {
  return {
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "Новая вкладка").trim() || "Новая вкладка",
    parentId: String(item.parentId || ""),
    npcIds: Array.isArray(item.npcIds) ? item.npcIds.map(String).filter(Boolean) : csv(item.npcIds ?? ""),
    public: item.public ?? true,
  };
}

function normalizeCharacterGroup(item = {}) {
  return {
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "Новая вкладка").trim() || "Новая вкладка",
    parentId: String(item.parentId || ""),
    characterIds: Array.isArray(item.characterIds) ? item.characterIds.map(String).filter(Boolean) : csv(item.characterIds ?? ""),
    public: item.public ?? true,
  };
}

function sanitizeGroupHierarchy(groups) {
  const byId = new Map(groups.map((group) => [group.id, group]));
  groups.forEach((group) => {
    if (!byId.has(group.parentId) || group.parentId === group.id) group.parentId = "";
  });
  groups.forEach((group) => {
    const visited = new Set([group.id]);
    let parentId = group.parentId;
    while (parentId) {
      if (visited.has(parentId)) {
        group.parentId = "";
        break;
      }
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentId || "";
    }
  });
  return groups;
}

function sanitizeNpcGroupHierarchy(groups) {
  return sanitizeGroupHierarchy(groups);
}

function sanitizeCharacterGroupHierarchy(groups) {
  return sanitizeGroupHierarchy(groups);
}

function relationshipEntityKey(type, id) {
  return type && id ? `${type}:${id}` : "";
}

function normalizeRelationship(item = {}) {
  const sourceKey = item.sourceKey || relationshipEntityKey(item.sourceType, item.sourceId);
  const targetKey = item.targetKey || relationshipEntityKey(item.targetType, item.targetId);
  const pair = [String(sourceKey || ""), String(targetKey || "")].sort((a, b) => a.localeCompare(b));
  return {
    id: item.id || `relation:${pair[0]}:${pair[1]}`,
    sourceKey: pair[0] || "",
    targetKey: pair[1] || "",
    value: Math.max(-100, Math.min(100, Number(item.value ?? 0) || 0)),
    title: String(item.title || "").trim(),
    description: String(item.description || item.notes || "").trim(),
    public: item.public ?? true,
  };
}

function normalizeFaction(item) {
  return {
    id: item.id || slug(item.name || "faction"),
    name: item.name || "Новая фракция",
    type: item.type || "other",
    level: Math.max(0, Number(item.level ?? 1) || 0),
    leader: item.leader || "",
    headquarters: item.headquarters || "",
    relation: Number(item.relation ?? 0),
    influence: item.influence || "medium",
    public: item.public ?? true,
    image: item.image || "",
    tags: Array.isArray(item.tags) ? item.tags : csv(item.tags ?? ""),
    description: item.description || "",
    gmNotes: item.gmNotes || "",
    goals: item.goals || "",
    resources: item.resources || "",
    finances: String(item.finances || ""),
    traits: (Array.isArray(item.traits) ? item.traits : []).map(normalizeFactionTrait).filter((trait) => trait.name),
    resourceBuildings: (Array.isArray(item.resourceBuildings) ? item.resourceBuildings : [])
      .map(normalizeFactionBuildingResource)
      .filter((resource) => resource.buildingRef),
    allies: Array.isArray(item.allies) ? item.allies : csv(item.allies ?? ""),
    enemies: Array.isArray(item.enemies) ? item.enemies : csv(item.enemies ?? ""),
    wikiLinks: Array.isArray(item.wikiLinks) ? item.wikiLinks : csv(item.wikiLinks ?? ""),
    questLinks: Array.isArray(item.questLinks) ? item.questLinks : csv(item.questLinks ?? ""),
    npcLinks: Array.isArray(item.npcLinks) ? item.npcLinks : csv(item.npcLinks ?? ""),
  };
}

function normalizeFactionTrait(item = {}, index = 0) {
  const source = typeof item === "string" ? { name: item } : (item || {});
  return {
    id: String(source.id || `faction-trait-${index + 1}`),
    name: String(source.name || "").trim(),
    description: String(source.description || "").trim(),
    responsibleEntityKey: String(source.responsibleEntityKey || source.lieutenantKey || ""),
  };
}

function normalizeFactionBuildingResource(item = {}, index = 0) {
  const source = typeof item === "string" ? { buildingRef: item } : (item || {});
  return {
    id: String(source.id || `faction-building-resource-${index + 1}`),
    buildingRef: String(source.buildingRef || source.ref || ""),
  };
}

function normalizeOwnerIds(value) {
  const values = Array.isArray(value) ? value : csv(value ?? "");
  return [...new Set(values.map(String).filter(Boolean))];
}

function normalizeSettlement(item) {
  const npcLinks = Array.isArray(item.npcLinks) ? item.npcLinks : csv(item.npcLinks ?? "");
  const residents = normalizeSettlementRows(item.residents, normalizeSettlementResident);
  const districts = normalizeSettlementRows(item.districts, normalizeSettlementDistrict);
  const normalizedDistricts = districts.length
    ? districts
    : [normalizeSettlementDistrict({ id: "district-main", name: "Основной квартал", public: true })];
  const defaultDistrictId = normalizedDistricts[0].id;
  return {
    id: item.id || slug(item.name || "settlement"),
    name: item.name || "Новое поселение",
    type: item.type || "village",
    ruler: item.ruler || "",
    factionId: item.factionId || "",
    mapRegionId: item.mapRegionId || "",
    population: Number(item.population ?? 0),
    size: item.size || "",
    image: item.image || "",
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    law: normalizeEffectNumber(item.law ?? item.security),
    crime: normalizeEffectNumber(item.crime),
    corruption: normalizeEffectNumber(item.corruption),
    knowledge: normalizeEffectNumber(item.knowledge),
    society: normalizeEffectNumber(item.society ?? item.loyalty),
    production: normalizeEffectNumber(item.production ?? item.economy),
    dangerRating: normalizeEffectNumber(item.dangerRating ?? item.threat),
    capitalTurnoverLimit: Math.max(0, normalizeEffectNumber(item.capitalTurnoverLimit)),
    cashTurnoverLimit: Math.max(0, normalizeEffectNumber(item.cashTurnoverLimit)),
    priceCeiling: Math.max(0, normalizeEffectNumber(item.priceCeiling)),
    ...normalizeCountryEffects(item),
    public: item.public ?? true,
    tags: Array.isArray(item.tags) ? item.tags : csv(item.tags ?? ""),
    description: item.description || "",
    gmNotes: item.gmNotes || "",
    wikiLinks: Array.isArray(item.wikiLinks) ? item.wikiLinks : csv(item.wikiLinks ?? ""),
    questLinks: Array.isArray(item.questLinks) ? item.questLinks : csv(item.questLinks ?? ""),
    npcLinks,
    traits: migrateSettlementTraits(item),
    laws: normalizeSettlementRows(item.laws, normalizeSettlementLaw),
    districts: normalizedDistricts,
    buildings: normalizeSettlementRows(item.buildings, (building) => normalizeBuilding({
      ...building,
      districtId: building.districtId || defaultDistrictId,
    })),
    businesses: normalizeSettlementRows(item.businesses, normalizeSettlementBusiness),
    populationGroups: normalizeSettlementRows(item.populationGroups, normalizeSettlementPopulationGroup),
    residents: (residents.length ? residents : npcLinks.map((npcId, index) => normalizeSettlementResident({
      id: `resident-npc-${npcId || index}`,
      entityKey: relationshipEntityKey("npc", npcId),
      public: true,
    }))).map((resident) => ({
      ...resident,
      districtId: resident.districtId || normalizedDistricts.find((district) => district.name === resident.residence)?.id || defaultDistrictId,
    })),
    armies: normalizeSettlementRows(item.armies, normalizeSettlementArmy),
    problems: [],
    modifiers: [],
    log: normalizeSettlementRows(item.log, normalizeSettlementLog),
  };
}

function normalizeSettlementRows(rows, normalizer) {
  return Array.isArray(rows) ? rows.map(normalizer) : [];
}

function normalizeEffectNumber(value) {
  return Number(value ?? 0) || 0;
}

function normalizeCountryEffects(item = {}, defaults = {}) {
  return Object.fromEntries(countryMetricKeys.map((key) => [
    key,
    normalizeEffectNumber(item[key] ?? defaults[key]),
  ]));
}

function normalizeCountryCouncilRole(item = {}) {
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "Должность Совета").trim(),
    holderKey: String(item.holderKey || ""),
    effectivenessBasis: String(item.effectivenessBasis || "").trim(),
    description: String(item.description || "").trim(),
    ...normalizeCountryEffects(item),
    public: item.public ?? true,
  };
}

function normalizeCountryLaw(item = {}) {
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "Новый закон").trim(),
    description: String(item.description || "").trim(),
    effect: String(item.effect || "").trim(),
    ...normalizeCountryEffects(item),
    public: item.public ?? true,
  };
}

function normalizeCountry(item = {}) {
  const directEffects = {
    stateStability: item.stateStability ?? item.stability,
    stateCulture: item.stateCulture ?? item.culture,
    stateLoyalty: item.stateLoyalty ?? item.loyalty,
    stateEconomy: item.stateEconomy ?? item.economy,
    stateUnrest: item.stateUnrest ?? item.unrest,
    stateProjectedUnrest: item.stateProjectedUnrest ?? item.projectedUnrestChange,
    stateDomainSize: item.stateDomainSize ?? item.domainSize,
    stateGlory: item.stateGlory ?? item.glory,
  };
  return {
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "Новое государство").trim(),
    government: String(item.government || "").trim(),
    alignment: String(item.alignment || "").trim(),
    ruler: String(item.ruler || "").trim(),
    capital: String(item.capital || "").trim(),
    description: String(item.description || "").trim(),
    gmNotes: String(item.gmNotes || "").trim(),
    image: String(item.image || ""),
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    tags: Array.isArray(item.tags) ? item.tags.map(String).filter(Boolean) : csv(item.tags ?? ""),
    settlementIds: Array.isArray(item.settlementIds) ? item.settlementIds.map(String).filter(Boolean) : csv(item.settlementIds ?? ""),
    hexRefs: Array.isArray(item.hexRefs) ? item.hexRefs.map(String).filter(Boolean) : csv(item.hexRefs ?? ""),
    councilRoles: normalizeSettlementRows(item.councilRoles, normalizeCountryCouncilRole),
    laws: normalizeSettlementRows(item.laws, normalizeCountryLaw),
    ...normalizeCountryEffects(directEffects),
    public: item.public ?? true,
  };
}

function normalizeRecognitionText(value) {
  const text = String(value ?? "").trim();
  return text === "0" ? "" : text;
}

function normalizeSettlementTrait(item = {}) {
  return {
    id: item.id || slug(item.name || "settlement-trait"),
    name: String(item.name || item.title || "Черта поселения").trim(),
    description: String(item.description || "").trim(),
    effect: String(item.effect || item.notes || "").trim(),
    image: String(item.image || ""),
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    showDescription: item.showDescription ?? item.descriptionVisible ?? true,
    showEffect: item.showEffect ?? item.effectVisible ?? true,
    ...normalizeSettlementEffects(item),
    public: item.public ?? true,
  };
}

function normalizeSettlementLaw(item = {}) {
  return {
    ...normalizeSettlementTrait(item),
    id: item.id || crypto.randomUUID(),
    name: String(item.name || item.title || "Новый закон поселения").trim(),
  };
}

function normalizeSettlementDistrict(item = {}) {
  return {
    id: item.id || `district-${slug(item.name || "quarter")}`,
    name: String(item.name || "Новый квартал").trim(),
    description: String(item.description || "").trim(),
    image: item.image || "",
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    entityLinks: Array.isArray(item.entityLinks) ? item.entityLinks.map(String).filter(Boolean) : csv(item.entityLinks ?? ""),
    ...normalizeSettlementEffects(item),
    public: item.public ?? true,
  };
}

function migrateSettlementTraits(item = {}) {
  const explicit = normalizeSettlementRows(item.traits, normalizeSettlementTrait);
  const migratedProblems = normalizeSettlementRows(item.problems, (problem) => {
    const effects = effectBadges({ ...problem, ...normalizeSettlementEffects(problem) }).join(", ");
    return normalizeSettlementTrait({
      id: `problem-${problem.id || slug(problem.title || "problem")}`,
      ...normalizeSettlementEffects(problem),
      name: `Проблема: ${problem.title || "Без названия"}`,
      description: problem.notes || "",
      effect: [
        optionLabel(problemSeverities, problem.severity),
        optionLabel(problemStatuses, problem.status),
        problem.deadline ? `срок: ${problem.deadline}` : "",
        effects,
      ].filter(Boolean).join(" · "),
      public: problem.public ?? problem.status !== "hidden",
    });
  });
  const migratedModifiers = normalizeSettlementRows(item.modifiers, (modifier) => {
    const effects = effectBadges({ ...modifier, ...normalizeSettlementEffects(modifier) }).join(", ");
    return normalizeSettlementTrait({
      id: `modifier-${modifier.id || slug(modifier.title || "modifier")}`,
      ...normalizeSettlementEffects(modifier),
      name: modifier.title || "Особенность поселения",
      description: modifier.notes || "",
      effect: effects,
      public: true,
    });
  });
  const seen = new Set();
  return [...explicit, ...migratedProblems, ...migratedModifiers].filter((trait) => {
    if (seen.has(trait.id)) return false;
    seen.add(trait.id);
    return true;
  });
}

function normalizeSettlementEffects(item = {}) {
  return {
    law: normalizeEffectNumber(item.law ?? item.security),
    crime: normalizeEffectNumber(item.crime),
    corruption: normalizeEffectNumber(item.corruption),
    knowledge: normalizeEffectNumber(item.knowledge),
    society: normalizeEffectNumber(item.society ?? item.loyalty),
    production: normalizeEffectNumber(item.production ?? item.economy),
    dangerRating: normalizeEffectNumber(item.dangerRating ?? item.threat),
    capitalTurnoverLimit: normalizeEffectNumber(item.capitalTurnoverLimit),
    cashTurnoverLimit: normalizeEffectNumber(item.cashTurnoverLimit),
    priceCeiling: normalizeEffectNumber(item.priceCeiling),
    ...normalizeCountryEffects(item),
  };
}

function normalizeBuildingMagicItems(value, buildingId = "building", legacyCount = 0) {
  const rawSource = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  const source = [];
  const legacyByName = new Map();
  rawSource.forEach((entry) => {
    if (entry && typeof entry === "object") {
      source.push(entry);
      return;
    }
    const name = String(entry || "").trim();
    if (!name) return;
    const existing = legacyByName.get(name);
    if (existing) {
      existing.quantity += 1;
    } else {
      const migrated = { name, quantity: 1 };
      legacyByName.set(name, migrated);
      source.push(migrated);
    }
  });
  const normalizedItems = source.map((entry, index) => {
    const data = entry && typeof entry === "object" ? entry : { name: String(entry || "") };
    return {
      id: String(data.id || `${buildingId}-magic-${index + 1}`),
      name: String(data.name || data.title || "Магический предмет").trim(),
      type: String(data.type || "").trim(),
      cost: String(data.cost ?? data.price ?? "").trim(),
      description: String(data.description || "").trim(),
      effect: String(data.effect || data.mechanics || "").trim(),
      quantity: Math.max(1, Math.floor(normalizeEffectNumber(data.quantity) || 1)),
    };
  }).filter((entry) => entry.name);
  const groupedItems = new Map();
  normalizedItems.forEach((entry) => {
    const key = JSON.stringify([entry.name, entry.type, entry.cost, entry.description, entry.effect]);
    const existing = groupedItems.get(key);
    if (existing) existing.quantity += entry.quantity;
    else groupedItems.set(key, entry);
  });
  const items = [...groupedItems.values()];
  // Once the structured list exists, even as an empty array, it is authoritative.
  // The old counter is only a one-time migration source for records without magicItems.
  const normalizedLegacyCount = Array.isArray(value)
    ? 0
    : Math.max(0, Math.floor(normalizeEffectNumber(legacyCount)));
  if (!items.length && normalizedLegacyCount > 0) {
    items.push({
      id: `${buildingId}-magic-legacy`,
      name: "Предмет не указан",
      type: "",
      cost: "",
      description: "Перенесено из прежнего общего счётчика предметов.",
      effect: "",
      quantity: normalizedLegacyCount,
    });
  }
  const currentCount = items.reduce((sum, entry) => sum + entry.quantity, 0);
  if (items.length && normalizedLegacyCount > currentCount) {
    items[0].quantity += normalizedLegacyCount - currentCount;
  }
  return items;
}

function normalizeBuilding(item = {}) {
  const buildingId = item.id || slug(item.name || "building");
  const magicItems = normalizeBuildingMagicItems(item.magicItems, buildingId, item.magicItemCount);
  const magicItemCount = magicItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const hasStructuredPlacements = Array.isArray(item.placements);
  const placementSource = hasStructuredPlacements
    ? item.placements
    : ((item.districtId || item.location) ? [{ districtId: item.districtId, location: item.location }] : []);
  const placements = placementSource.map((placement, index) => normalizeBuildingPlacement(placement, index, buildingId));
  const hierarchyLevels = normalizeBuildingHierarchyLevels(item.hierarchyLevels, buildingId);
  const primaryPlacement = placements[0] || { districtId: "", location: "" };
  return {
    id: buildingId,
    name: item.name || "Постройка",
    type: item.type || "",
    status: item.status || "active",
    level: Math.max(1, normalizeEffectNumber(item.level) || 1),
    buildingCost: Math.max(0, normalizeEffectNumber(item.buildingCost)),
    upgradeCost: Math.max(0, normalizeEffectNumber(item.upgradeCost)),
    factionId: item.factionId || "",
    placements,
    districtId: primaryPlacement.districtId,
    image: item.image || "",
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    income: normalizeEffectNumber(item.income),
    upkeep: normalizeEffectNumber(item.upkeep),
    ...normalizeSettlementEffects(item),
    location: primaryPlacement.location,
    description: item.description || item.notes || "",
    upgrades: item.upgrades || "",
    effect: item.effect || "",
    magicItemCount,
    magicItems,
    public: item.public ?? true,
    responsibleNpc: item.responsibleNpc || "",
    linkedQuest: item.linkedQuest || "",
    hierarchyEnabled: Boolean(item.hierarchyEnabled || hierarchyLevels.some((level) => level.slots.length)),
    hierarchyLevels,
  };
}

function normalizeBuildingPlacement(item = {}, index = 0, buildingId = "building") {
  return {
    id: String(item.id || `${buildingId}-placement-${index + 1}`),
    districtId: String(item.districtId || ""),
    location: String(item.location || "").trim(),
  };
}

function normalizeBuildingHierarchyLevels(value, buildingId = "building") {
  const source = Array.isArray(value) ? value : [];
  const byLevel = new Map();
  source.forEach((entry, index) => {
    const level = Math.max(0, Math.floor(normalizeEffectNumber(entry?.level ?? index)));
    const slots = (Array.isArray(entry?.slots) ? entry.slots : []).map((slot, slotIndex) => ({
      id: String(slot?.id || `${buildingId}-hierarchy-${level}-slot-${slotIndex + 1}`),
      entityKey: String(slot?.entityKey || slot?.holderKey || ""),
    }));
    byLevel.set(level, {
      id: String(entry?.id || `${buildingId}-hierarchy-level-${level}`),
      level,
      slots,
    });
  });
  if (!byLevel.has(0)) {
    byLevel.set(0, { id: `${buildingId}-hierarchy-level-0`, level: 0, slots: [] });
  }
  return [...byLevel.values()].sort((a, b) => a.level - b.level);
}

function buildingPlacementCount(building, districtId = "") {
  return (building?.placements || []).filter((placement) => placement.districtId === districtId).length;
}

function buildingPlacementTotal(building) {
  return Math.max(1, building?.placements?.length || 0);
}

function buildingEffectInstances(buildings, districtId = "") {
  return buildings.flatMap((building) => Array.from(
    { length: buildingPlacementCount(building, districtId) },
    () => building
  ));
}

function normalizeSettlementBusiness(item = {}) {
  return {
    id: item.id || slug(item.name || "business"),
    name: item.name || "Новый бизнес",
    type: item.type || "",
    owner: item.owner || "",
    location: item.location || "",
    status: item.status || "active",
    income: normalizeEffectNumber(item.income),
    upkeep: normalizeEffectNumber(item.upkeep ?? item.expenses),
    employees: Math.max(0, normalizeEffectNumber(item.employees)),
    description: item.description || "",
    effect: item.effect || "",
    public: item.public ?? true,
  };
}

function normalizeSettlementPopulationGroup(item = {}) {
  const representativeNpcId = String(item.representativeNpcId || item.representativeId || "");
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "Новая группа населения").trim(),
    count: Math.max(0, Math.trunc(Number(item.count ?? item.population) || 0)),
    location: String(item.location || item.residence || "").trim(),
    factionId: String(item.factionId || ""),
    representativeKey: String(item.representativeKey || (representativeNpcId ? relationshipEntityKey("npc", representativeNpcId) : "")),
    representativeNpcId,
    race: String(item.race || "").trim(),
    confession: String(item.confession || item.religion || "").trim(),
    culture: String(item.culture || "").trim(),
    demand: String(item.demand || "").trim(),
    merits: String(item.merits || item.achievements || "").trim(),
    public: item.public ?? true,
  };
}

function normalizeSettlementResident(item = {}) {
  const entityKey = item.entityKey || relationshipEntityKey(item.entityType || "npc", item.entityId || item.npcId);
  const residence = item.residence || item.location || "";
  const localRole = item.localRole || item.role || "";
  const residentId = item.id || `resident-${slug([entityKey, residence, localRole].filter(Boolean).join("-") || "entry")}`;
  const magicItems = normalizeBuildingMagicItems(item.magicItems, residentId, item.magicItemCount);
  return {
    id: residentId,
    entityKey,
    districtId: String(item.districtId || ""),
    residence,
    localRole,
    notes: item.notes || "",
    affectsSettlement: Boolean(item.affectsSettlement),
    effect: String(item.effect || ""),
    income: normalizeEffectNumber(item.income),
    upkeep: normalizeEffectNumber(item.upkeep),
    ...normalizeSettlementEffects(item),
    magicItems,
    magicItemCount: magicItems.reduce((sum, entry) => sum + entry.quantity, 0),
    public: item.public ?? true,
  };
}

function normalizeSettlementArmyTrait(item = {}) {
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "Новая черта").trim(),
    description: String(item.description || "").trim(),
    effect: String(item.effect || "").trim(),
  };
}

function normalizeSettlementArmy(item = {}) {
  return {
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "Новое войско").trim(),
    image: String(item.image || ""),
    imageStyle: { ...defaultImageStyle(), ...(item.imageStyle ?? {}) },
    description: String(item.description || "").trim(),
    challengeClass: String(item.challengeClass || "").trim(),
    attack: String(item.attack || "").trim(),
    defense: String(item.defense || "").trim(),
    morale: String(item.morale || "").trim(),
    upkeep: String(item.upkeep || "").trim(),
    equipment: String(item.equipment || "").trim(),
    traits: normalizeSettlementRows(item.traits, normalizeSettlementArmyTrait),
    tactics: String(item.tactics || "").trim(),
    commanderKey: String(item.commanderKey || ""),
    soldierNpcId: String(item.soldierNpcId || ""),
    public: item.public ?? true,
  };
}

function normalizeProblem(item) {
  return {
    id: item.id || slug(item.title || "problem"),
    title: item.title || "Проблема",
    severity: item.severity || "medium",
    status: item.status || "active",
    income: normalizeEffectNumber(item.income),
    upkeep: normalizeEffectNumber(item.upkeep),
    ...normalizeSettlementEffects(item),
    public: item.public ?? true,
    linkedQuest: item.linkedQuest || "",
    deadline: item.deadline || "",
    notes: item.notes || "",
  };
}

function normalizeModifier(item) {
  return {
    id: item.id || slug(item.title || "modifier"),
    title: item.title || "Модификатор",
    income: normalizeEffectNumber(item.income),
    upkeep: normalizeEffectNumber(item.upkeep),
    ...normalizeSettlementEffects(item),
    notes: item.notes || "",
  };
}

function normalizeSettlementLog(item) {
  return {
    id: item.id || slug([item.date, item.title, item.text].filter(Boolean).join("-") || "chronicle-entry"),
    date: item.date || "",
    title: item.title || "",
    text: item.text || "",
    public: item.public ?? true,
  };
}

function normalizeCalendarEvent(item) {
  return {
    id: item.id || slug(item.title || "event"),
    title: item.title || "Новое событие",
    type: item.type || "note",
    date: normalizeAshanaDate(item.date),
    public: item.public ?? true,
    summary: item.summary || "",
    gmNotes: item.gmNotes || "",
    wikiLinks: Array.isArray(item.wikiLinks) ? item.wikiLinks : csv(item.wikiLinks ?? ""),
    questLinks: Array.isArray(item.questLinks) ? item.questLinks : csv(item.questLinks ?? ""),
    npcLinks: Array.isArray(item.npcLinks) ? item.npcLinks : csv(item.npcLinks ?? ""),
    settlementLinks: Array.isArray(item.settlementLinks) ? item.settlementLinks : csv(item.settlementLinks ?? ""),
    mapLinks: Array.isArray(item.mapLinks) ? item.mapLinks : csv(item.mapLinks ?? ""),
  };
}

function normalizeSessionLog(item) {
  return {
    id: item.id || slug(item.title || "session"),
    title: item.title || "Новая сессия",
    sessionNumber: Number(item.sessionNumber || 1),
    date: normalizeAshanaDate(item.date),
    public: item.public ?? true,
    players: item.players || "",
    summary: item.summary || "",
    decisions: item.decisions || "",
    loot: item.loot || "",
    consequences: item.consequences || "",
    gmNotes: item.gmNotes || "",
    wikiLinks: Array.isArray(item.wikiLinks) ? item.wikiLinks : csv(item.wikiLinks ?? ""),
    questLinks: Array.isArray(item.questLinks) ? item.questLinks : csv(item.questLinks ?? ""),
    npcLinks: Array.isArray(item.npcLinks) ? item.npcLinks : csv(item.npcLinks ?? ""),
    settlementLinks: Array.isArray(item.settlementLinks) ? item.settlementLinks : csv(item.settlementLinks ?? ""),
    mapLinks: Array.isArray(item.mapLinks) ? item.mapLinks : csv(item.mapLinks ?? ""),
  };
}

function legacyRowsToText(rows, keys) {
  if (!Array.isArray(rows)) return "";
  return rows
    .map((row) => {
      if (typeof row === "string") return row.trim();
      if (Array.isArray(row)) return row.filter((value) => String(value ?? "").trim()).join(" · ");
      return keys
        .map((key) => String(row?.[key] ?? "").trim())
        .filter(Boolean)
        .join(" · ");
    })
    .filter(Boolean)
    .join("\n");
}

function legacyCompatibleText(source, key, rows, keys) {
  return Object.prototype.hasOwnProperty.call(source ?? {}, key)
    ? String(source?.[key] ?? "")
    : legacyRowsToText(rows, keys);
}

function normalizeCharacter(character) {
  const base = characterDefaults();
  const normalized = {
    ...base,
    ...character,
    portraitStyle: { ...base.portraitStyle, ...(character.portraitStyle ?? {}) },
    stats: { ...base.stats, ...(character.stats ?? {}) },
    saves: { ...base.saves, ...(character.saves ?? {}) },
  };
  normalized.speeds = normalizeMovementSpeeds(character.speeds, character.speed ?? base.speed);
  normalized.speed = primaryMovementSpeed(normalized.speeds);
  normalized.babEntries = normalizeBabEntries(character.babEntries, character.bab ?? base.bab);
  normalized.bab = primaryBabValue(normalized.babEntries, character.bab ?? base.bab);
  normalized.adminOnlyEdit = Boolean(character.adminOnlyEdit);
  normalized.changesInProgress = Boolean(character.changesInProgress);
  normalized.unusualAncestry = Boolean(character.unusualAncestry);
  normalized.customConModifier = Number.isFinite(Number(character.customConModifier))
    ? Number(character.customConModifier)
    : statMod(normalized.stats.con);
  normalized.skills = normalizeRows(character.skills, (row) =>
    Array.isArray(row)
      ? { name: row[0] ?? "Навык", ability: "int", ranks: 0, classSkill: false, misc: Number(row[1] ?? 0), armorPenalty: 0, total: Number(row[1] ?? 0) }
      : { name: "Навык", ability: "int", ranks: 0, classSkill: false, misc: 0, armorPenalty: 0, total: 0, ...row }
  );
  normalized.skills = mergeSkillTemplate(normalized.skills);
  normalized.skills.forEach((skill) => {
    skill.total = calculateSkillTotal(normalized, skill);
  });
  const hasExplicitLevels = Array.isArray(character.levels) && character.levels.length > 0;
  normalized.levels = hasExplicitLevels ? normalizeNpcLevels(character.levels) : [];
  if (hasExplicitLevels) {
    normalized.className = normalized.levels.map((entry) => `${entry.className} ${entry.level}`).filter(Boolean).join(" / ") || normalized.className;
    normalized.level = normalized.levels.reduce((sum, entry) => sum + Number(entry.level || 0), 0) || Number(normalized.level || 1);
  }
  normalized.tags = Array.isArray(character.tags) ? character.tags.map(String).filter(Boolean) : csv(character.tags ?? "");
  normalized.personalityTraits = normalizeNpcTraits(character.personalityTraits, "");
  normalized.factionLinks = Array.isArray(character.factionLinks) ? character.factionLinks.map(String).filter(Boolean) : csv(character.factionLinks ?? "");
  normalized.npcLinks = Array.isArray(character.npcLinks) ? character.npcLinks.map(String).filter(Boolean) : csv(character.npcLinks ?? "");
  normalized.mapLinks = Array.isArray(character.mapLinks) ? character.mapLinks.map(String).filter(Boolean) : csv(character.mapLinks ?? "");
  normalized.wikiLinks = Array.isArray(character.wikiLinks) ? character.wikiLinks.map(String).filter(Boolean) : csv(character.wikiLinks ?? "");
  normalized.questLinks = Array.isArray(character.questLinks) ? character.questLinks.map(String).filter(Boolean) : csv(character.questLinks ?? "");
  normalized.attacks = normalizeRows(character.attacks, (row) =>
    Array.isArray(row)
      ? { name: row[0] ?? "Оружие", bonus: row[1] ?? "+0", damage: row[2] ?? "1d6", crit: "x2", range: "", type: "", notes: "" }
      : { name: "Оружие", bonus: "+0", damage: "1d6", crit: "x2", range: "", type: "", notes: "", ...row }
  );
  normalized.armor = normalizeRows(character.armor, (row) => ({ name: "Броня", ac: "+0", maxDex: "", penalty: "", spellFail: "", notes: "", ...row }));
  normalized.spells = normalizeRows(character.spells, (row) => ({ level: 0, known: "", prepared: "", ...row }));
  normalized.inventory = normalizeRows(character.inventory, (row) =>
    Array.isArray(row)
      ? { name: row[0] ?? "Предмет", qty: row[1] ?? "1", weight: row[2] ?? "" }
      : { name: "Предмет", qty: "1", weight: "", ...row }
  );
  normalized.feats = Array.isArray(character.feats) ? character.feats : [];
  normalized.features = Array.isArray(character.features) ? character.features : [];
  normalized.templatesStatuses = Array.isArray(character.templatesStatuses)
    ? character.templatesStatuses.map((item) => String(item || "").trim()).filter(Boolean)
    : lineItems(character.templatesStatuses || "");
  normalized.strokes = Array.isArray(character.strokes)
    ? character.strokes.map((item) => String(item || "").trim()).filter(Boolean)
    : lineItems(character.strokes || "");
  normalized.attacksNotes = legacyCompatibleText(character, "attacksNotes", character.attacks, ["name", "bonus", "damage", "crit", "range", "type", "notes"]);
  normalized.armorNotes = legacyCompatibleText(character, "armorNotes", character.armor, ["name", "ac", "maxDex", "penalty", "spellFail", "notes"]);
  normalized.spellNotes = legacyCompatibleText(character, "spellNotes", character.spells, ["level", "known", "prepared"]);
  normalized.inventoryNotes = legacyCompatibleText(character, "inventoryNotes", character.inventory, ["name", "qty", "weight"]);
  normalized.equippedGear = String(character.equippedGear || "");
  normalized.magicItemLinks = Array.isArray(character.magicItemLinks)
    ? character.magicItemLinks.map(String).filter(Boolean)
    : csv(character.magicItemLinks ?? "");
  normalized.accumulatedRecognition = normalizeEffectNumber(character.accumulatedRecognition);
  normalized.authorityLevel = normalizeEffectNumber(character.authorityLevel);
  normalized.demand = normalizeRecognitionText(character.demand);
  normalized.honor = normalizeEffectNumber(character.honor);
  normalized.piety = normalizeEffectNumber(character.piety);
  normalized.fame = normalizeEffectNumber(character.fame);
  normalized.merits = String(character.merits || "");
  return normalized;
}

function mergeSkillTemplate(existingSkills) {
  const buckets = new Map();
  existingSkills.forEach((skill) => {
    const key = normalizeSkillName(skill.name);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(skill);
  });

  const usage = new Map();
  const templateSkills = pathfinderSkills.map(([name, ability]) => {
    const key = normalizeSkillName(name);
    const index = usage.get(key) ?? 0;
    usage.set(key, index + 1);
    const existing = buckets.get(key)?.[index] ?? buckets.get(key)?.[0];
    return {
      name,
      ability,
      specialty: "",
      ranks: 0,
      classSkill: false,
      misc: 0,
      armorPenalty: 0,
      total: 0,
      ...existing,
      name,
      ability: existing?.ability || ability,
    };
  });
  const templateCounts = new Map();
  pathfinderSkills.forEach(([name]) => {
    const key = normalizeSkillName(name);
    templateCounts.set(key, (templateCounts.get(key) ?? 0) + 1);
  });
  const seen = new Map();
  const customSkills = existingSkills.filter((skill) => {
    const key = normalizeSkillName(skill.name);
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    return index >= (templateCounts.get(key) ?? 0);
  });
  return [...templateSkills, ...customSkills];
}

function skillDisplayName(skill) {
  return skill.specialty ? `${skill.name}: ${skill.specialty}` : skill.name;
}

function skillAbilityModifier(character, skill) {
  return characterStatModifier(character, skill.ability);
}

function skillClassBonus(skill) {
  return skill.classSkill && Number(skill.ranks || 0) > 0 ? 3 : 0;
}

function calculateSkillTotal(character, skill) {
  return skillAbilityModifier(character, skill)
    + Number(skill.ranks || 0)
    + skillClassBonus(skill)
    + Number(skill.misc || 0)
    + Number(skill.armorPenalty || 0);
}

function skillFormulaLabel(character, skill) {
  const ability = skillAbilityModifier(character, skill);
  const ranks = Number(skill.ranks || 0);
  const classBonus = skillClassBonus(skill);
  const misc = Number(skill.misc || 0);
  const armorPenalty = Number(skill.armorPenalty || 0);
  return [
    `${String(skill.ability || "").toUpperCase()} ${signed(ability)}`,
    `ранги ${signed(ranks)}`,
    classBonus ? "классовый +3" : "",
    misc ? `прочие ${signed(misc)}` : "",
    armorPenalty ? `штраф ${signed(armorPenalty)}` : "",
  ].filter(Boolean).join(" · ");
}

function skillRollActorId(character) {
  if (state.npcs.some((npc) => npc.id === character.id)) return `npc:${character.id}`;
  if (state.characters.some((item) => item.id === character.id)) return character.id;
  return "";
}

function normalizeSkillName(name) {
  const value = String(name || "")
    .toUpperCase()
    .replaceAll("*", "")
    .trim();
  if (value === "ЗНАНИЕ МАГИИ") return "ЗНАНИЕ (МАГИЯ)";
  if (value.startsWith("РЕМЕСЛО")) return "РЕМЕСЛО";
  if (value.startsWith("ПРОФЕССИЯ")) return "ПРОФЕССИЯ";
  if (value.startsWith("ИСПОЛНЕНИЕ")) return "ИСПОЛНЕНИЕ";
  return value;
}

function defaultImageStyle() {
  return { aspect: "wide", fit: "cover", x: 50, y: 50, zoom: 1, rotation: 0 };
}

function normalizeRows(rows, mapper) {
  return Array.isArray(rows) ? rows.map(mapper) : [];
}

function characterDefaults() {
  return {
    id: crypto.randomUUID(),
    name: "Новый герой",
    player: "Игрок",
    ancestry: "раса",
    className: "класс 1",
    homeland: "",
    culture: "",
    religion: "",
    deity: "",
    size: "Средний",
    gender: "",
    alignment: "Н",
    dangerClass: "",
    age: "",
    height: "",
    weight: "",
    maritalStatus: "",
    level: 1,
    hp: "10 / 10",
    ac: 10,
    touchAc: 10,
    flatFootedAc: 10,
    initiative: 0,
    speed: "30",
    speeds: [],
    bab: 0,
    babEntries: [],
    cmb: 0,
    cmd: 10,
    portrait: "",
    portraitStyle: { ...defaultImageStyle(), aspect: "square" },
    adminOnlyEdit: false,
    changesInProgress: false,
    unusualAncestry: false,
    customConModifier: 0,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: { fort: 0, ref: 0, will: 0 },
    skills: [],
    attacks: [],
    attacksNotes: "",
    armor: [],
    armorNotes: "",
    feats: [],
    features: [],
    templatesStatuses: [],
    strokes: [],
    spells: [],
    spellNotes: "",
    inventory: [],
    inventoryNotes: "",
    equippedGear: "",
    magicItemLinks: [],
    accumulatedRecognition: 0,
    authorityLevel: 0,
    demand: "",
    honor: 0,
    piety: 0,
    fame: 0,
    merits: "",
    languages: "",
    notes: "",
    gmNotes: "",
    levels: [],
    tags: [],
    description: "",
    appearance: "",
    personalityTraits: [],
    voice: "",
    location: "",
    lastSeen: "",
    factionId: "",
    factionRole: "",
    factionRank: "",
    factionReputation: "",
    factionLinks: [],
    npcLinks: [],
    mapLinks: [],
    wikiLinks: [],
    questLinks: [],
    mechanicsNotes: "",
  };
}

const trashCollectionLabels = {
  wiki: "Wiki-статья",
  characters: "Персонаж",
  characterGroups: "Вкладка персонажей",
  npcs: "NPC",
  npcGroups: "Вкладка NPC",
  factions: "Фракция",
  relationships: "Взаимоотношение",
  settlements: "Поселение",
  districts: "Квартал",
  traits: "Черта",
  buildings: "Постройка",
  magicItems: "Магический товар",
  businesses: "Предприятие",
  residents: "Житель",
  armies: "Войско",
  log: "Запись хроники",
  countries: "Государство",
  councilRoles: "Роль совета",
  laws: "Закон",
  items: "Предмет",
  books: "Книга",
  calendarEvents: "Событие календаря",
  sessionLogs: "Запись журнала",
  gallery: "Арт",
  quests: "Задание",
  regions: "Карта",
  tilePresets: "Типовой гекс",
  markers: "Значок карты",
  boundaryLayers: "Контур гекса",
  cards: "Карта Бумажного трона",
  decks: "Колода Бумажного трона",
  leaders: "Лидер Бумажного трона",
};

function stableArrayItemIdentity(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  if (typeof item.id === "string" && item.id) return { key: "id", value: item.id };
  return null;
}

function trashItemLabel(item) {
  return String(
    item?.name
    || item?.title
    || item?.label
    || item?.date
    || item?.id
    || "Без названия"
  );
}

function collectDeletedEntries(previous, next) {
  if (!previous || !next) return [];
  const entries = [];

  const visit = (oldValue, newValue, restorePath) => {
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      const collection = restorePath.at(-1)?.key || "items";
      if (collection === "rolls") return;

      const nextItems = new Map();
      newValue.forEach((item) => {
        const identity = stableArrayItemIdentity(item);
        if (identity) nextItems.set(`${identity.key}:${identity.value}`, item);
      });

      oldValue.forEach((oldItem, itemIndex) => {
        const identity = stableArrayItemIdentity(oldItem);
        if (!identity) return;
        const identityKey = `${identity.key}:${identity.value}`;
        const nextItem = nextItems.get(identityKey);
        if (!nextItem) {
          entries.push({
            itemType: trashCollectionLabels[collection] || "Объект",
            itemLabel: trashItemLabel(oldItem),
            restorePath,
            itemIndex,
            itemData: structuredClone(oldItem),
          });
          return;
        }
        visit(oldItem, nextItem, [...restorePath, { kind: "item", key: identity.key, value: identity.value }]);
      });
      return;
    }

    if (!oldValue || !newValue || typeof oldValue !== "object" || typeof newValue !== "object") return;
    Object.keys(oldValue).forEach((key) => {
      if (!(key in newValue)) return;
      visit(oldValue[key], newValue[key], [...restorePath, { kind: "property", key }]);
    });
  };

  visit(previous, next, []);
  return entries;
}

function resolveRestoreTarget(restorePath) {
  let target = state;
  for (const segment of restorePath ?? []) {
    if (segment?.kind === "property") {
      target = target?.[segment.key];
    } else if (segment?.kind === "item") {
      if (!Array.isArray(target)) return null;
      target = target.find((item) => String(item?.[segment.key]) === String(segment.value));
    } else {
      return null;
    }
    if (target == null) return null;
  }
  return Array.isArray(target) ? target : null;
}

function restoreTrashEntry(row) {
  const target = resolveRestoreTarget(row.restore_path);
  if (!target) return { restored: false, reason: "Исходный раздел больше не существует" };
  const data = structuredClone(row.item_data);
  const identity = stableArrayItemIdentity(data);
  if (identity && target.some((item) => String(item?.[identity.key]) === String(identity.value))) {
    return { restored: false, reason: "Объект уже существует" };
  }
  const index = Math.max(0, Math.min(Number(row.item_index || 0), target.length));
  target.splice(index, 0, data);
  return { restored: true };
}

function loadPendingCloudSave() {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_CLOUD_STORAGE_KEY) || "null");
    if (!value?.payload || typeof value.payload !== "object") return null;
    return {
      ...value,
      payload: stripUiOnlyCampaignState(value.payload),
      baseSnapshot: value.baseSnapshot && typeof value.baseSnapshot === "object"
        ? stripUiOnlyCampaignState(value.baseSnapshot)
        : value.baseSnapshot,
    };
  } catch {
    return null;
  }
}

function persistPendingCloudSave(payload, revision = cloudSaveRevision) {
  let record;
  try {
    record = JSON.stringify({
      createdAt: new Date().toISOString(),
      revision,
      baseUpdatedAt: lastCloudUpdatedAt,
      baseSnapshot: lastCloudSnapshot,
      payload,
    });
  } catch (error) {
    console.warn("Не удалось подготовить аварийную облачную копию:", error.message);
    return false;
  }
  try {
    localStorage.setItem(PENDING_CLOUD_STORAGE_KEY, record);
    return true;
  } catch (error) {
    try {
      localSafetySnapshots = [];
      localStorage.removeItem(LOCAL_SAFETY_STORAGE_KEY);
      localStorage.setItem(PENDING_CLOUD_STORAGE_KEY, record);
      return true;
    } catch (retryError) {
      console.warn("Не удалось обновить аварийную облачную копию:", retryError.message || error.message);
      return false;
    }
  }
}

function clearPendingCloudSave() {
  try {
    localStorage.removeItem(PENDING_CLOUD_STORAGE_KEY);
  } catch {
    // The confirmed server copy is authoritative even if local cleanup is unavailable.
  }
}

function ensureCriticalSaveOverlay() {
  let overlay = document.querySelector("#criticalSaveOverlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "criticalSaveOverlay";
  overlay.className = "critical-save-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "criticalSaveTitle");
  overlay.innerHTML = `
    <section class="critical-save-card">
      <p class="critical-save-kicker">КРИТИЧЕСКАЯ ОШИБКА СОХРАНЕНИЯ</p>
      <h2 id="criticalSaveTitle">ИЗМЕНЕНИЯ НЕ ПОДТВЕРЖДЕНЫ В ОБЛАКЕ</h2>
      <p id="criticalSaveMessage" class="critical-save-message"></p>
      <p class="critical-save-safety">Работа сохранена в аварийной копии этого браузера. Не закрывайте вкладку, пока запись не будет подтверждена.</p>
      <div class="critical-save-actions">
        <button id="criticalSaveRetry" class="primary-button" type="button">Повторить сохранение</button>
        <button id="criticalSaveDownload" class="ghost-button" type="button">Скачать аварийную копию</button>
        <button id="criticalSaveDismiss" class="ghost-button" type="button">Я понял, закрыть окно</button>
      </div>
    </section>`;
  document.body.append(overlay);
  overlay.querySelector("#criticalSaveRetry").addEventListener("click", async (event) => {
    const control = event.currentTarget;
    control.disabled = true;
    control.textContent = "Сохраняю и проверяю...";
    if (!cloudSaveDirty && !saveState()) {
      control.disabled = false;
      control.textContent = "Повторить сохранение";
      return;
    }
    const saved = await flushCloudSave({ immediate: true });
    if (saved && !cloudSaveDirty) clearCriticalSaveFailure();
    control.disabled = false;
    control.textContent = "Повторить сохранение";
  });
  overlay.querySelector("#criticalSaveDownload").addEventListener("click", downloadEmergencyCampaignCopy);
  overlay.querySelector("#criticalSaveDismiss").addEventListener("click", () => {
    overlay.hidden = true;
    document.body.classList.remove("critical-save-visible");
  });
  return overlay;
}

function reportCriticalSaveFailure(message) {
  cloudSaveFailureMessage = String(message || "Supabase не подтвердил запись.");
  cloudStatus = `НЕ СОХРАНЕНО: ${cloudSaveFailureMessage}`;
  const overlay = ensureCriticalSaveOverlay();
  overlay.querySelector("#criticalSaveMessage").textContent = cloudSaveFailureMessage;
  overlay.hidden = false;
  document.body.classList.add("critical-save-visible");
  renderCloudStatus();
}

function clearCriticalSaveFailure() {
  cloudSaveFailureMessage = "";
  const overlay = document.querySelector("#criticalSaveOverlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("critical-save-visible");
}

function downloadEmergencyCampaignCopy() {
  const pending = loadPendingCloudSave();
  const payload = pending?.payload || compactStateForStorage(state);
  const exported = {
    kind: "ashana-emergency-save",
    createdAt: pending?.createdAt || new Date().toISOString(),
    baseUpdatedAt: pending?.baseUpdatedAt || lastCloudUpdatedAt,
    reason: cloudSaveFailureMessage || "Ручная аварийная выгрузка",
    data: payload,
  };
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashana-emergency-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function requiresAdminCloudSave() {
  return adminCloudRequired || isAdmin || supabaseProfile?.role === "admin";
}

function markCloudSavePending(payload) {
  if (!requiresAdminCloudSave()) return;
  cloudSaveRevision += 1;
  cloudSaveDirty = true;
  const emergencySaved = persistPendingCloudSave(payload, cloudSaveRevision);
  cloudStatus = "Изменения ожидают подтверждения Supabase";
  renderCloudStatus();
  if (!emergencySaved) {
    reportCriticalSaveFailure("Браузер не смог создать отдельную аварийную копию. Основная локальная версия ещё открыта; не закрывайте вкладку до подтверждения Supabase.");
  }
  queueCloudSave({ immediate: !emergencySaved });
}

function saveState() {
  const compact = compactStateForStorage(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    markCloudSavePending(compact);
    return true;
  } catch (error) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
      markCloudSavePending(compact);
      if (!storageWarningShown) {
        storageWarningShown = true;
        alert("Данные сохранены, но браузерное хранилище переполнено картинками. Текст, статьи, персонажи и карта сохранены; слишком тяжелые загруженные картинки могут не пережить перезагрузку. Лучше хранить крупные изображения файлами в assets и выбирать их оттуда.");
      }
      return true;
    } catch (localError) {
      markCloudSavePending(compact);
      reportCriticalSaveFailure(`Браузер не смог создать даже локальную аварийную копию: ${localError.message || "localStorage недоступен"}.`);
      return false;
    }
  }
}

function cloudSavePrerequisiteError() {
  if (!supabaseClient) return "Нет соединения с Supabase.";
  if (!supabaseUser) return "Сессия мастера завершилась. Войдите снова, не закрывая эту вкладку.";
  if (!isAdmin || supabaseProfile?.role !== "admin") return "Supabase не подтвердил права мастера.";
  if (!cloudStateReady || !lastCloudSnapshot) return "Общая база ещё не загружена и не готова принять правки.";
  return "";
}

function cloudSaveErrorText(error) {
  if (!error) return "Неизвестная ошибка Supabase";
  return [error.message, error.details, error.hint, error.code]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ") || String(error);
}

function isCampaignVersionConflict(error) {
  return cloudSaveErrorText(error).includes("CAMPAIGN_VERSION_CONFLICT");
}

function isClientUpdateRequired(error) {
  return cloudSaveErrorText(error).includes("CLIENT_UPDATE_REQUIRED");
}

function waitForSaveRetry(attempt) {
  const delay = 180 + Math.floor(Math.random() * (420 + attempt * 280));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function scheduleCloudSaveRetry() {
  clearTimeout(cloudSaveRetryTimer);
  const delay = 3500 + Math.floor(Math.random() * 4500);
  cloudSaveRetryTimer = setTimeout(() => {
    if (cloudSaveDirty) flushCloudSave({ immediate: true });
  }, delay);
}

function queueCloudSave(options = {}) {
  if (!cloudSaveDirty) return;
  clearTimeout(cloudSaveTimer);
  clearTimeout(cloudSaveFailureTimer);
  cloudSaveTimer = setTimeout(() => {
    flushCloudSave({ immediate: true });
  }, options.immediate ? 0 : 450);
  cloudSaveFailureTimer = setTimeout(() => {
    if (!cloudSaveDirty || cloudSaveInFlight) return;
    reportCriticalSaveFailure(cloudSavePrerequisiteError() || "Сохранение не началось в течение 8 секунд.");
  }, 8000);
}

async function flushCloudSave() {
  if (!cloudSaveDirty) return true;
  if (cloudSaveInFlight) return cloudSaveInFlight;
  const prerequisiteError = cloudSavePrerequisiteError();
  if (prerequisiteError) {
    reportCriticalSaveFailure(prerequisiteError);
    scheduleCloudSaveRetry();
    return false;
  }

  clearTimeout(cloudSaveTimer);
  clearTimeout(cloudSaveFailureTimer);
  const revision = cloudSaveRevision;
  const payload = compactStateForStorage(state);
  const comparisonSnapshot = structuredClone(lastCloudSnapshot);
  cloudStatus = "Сохраняю и проверяю Supabase...";
  renderCloudStatus();
  let saveCompleted = false;

  cloudSaveInFlight = (async () => {
    let saved = false;
    try {
      saved = await saveCloudState({ payload, comparisonSnapshot, managedQueue: true });
    } catch (error) {
      cloudSaveFailureMessage = `Непредвиденный сбой сохранения: ${error.message || error}`;
    }
    if (!saved) {
      reportCriticalSaveFailure(cloudSaveFailureMessage || "Supabase не подтвердил запись. Правки остались в аварийной копии.");
      scheduleCloudSaveRetry();
      return false;
    }

    const currentPayload = compactStateForStorage(state);
    const rebasedPayload = mergeConcurrentCampaignState(payload, currentPayload, lastCloudSnapshot);
    const cloudMergeChangedLocalState = !campaignValuesEqual(rebasedPayload, currentPayload);
    // Keep live editor object references when Supabase confirmed the state we already have.
    // Replacing `state` here used to leave rendered forms attached to stale objects.
    if (cloudMergeChangedLocalState) {
      const activeMapRegionId = state.map.activeRegionId;
      const selectedMapHex = state.map.selectedHex;
      state = normalizeState({ ...structuredClone(seedData), ...rebasedPayload });
      restoreMapSelectionAfterStateReplacement(activeMapRegionId, selectedMapHex);
    }
    persistLocalStateOnly();
    cloudSaveConfirmedRevision = revision;
    lastConfirmedCloudSaveAt = new Date();
    saveCompleted = true;

    if (cloudSaveRevision > revision) {
      cloudSaveDirty = true;
      persistPendingCloudSave(compactStateForStorage(state), cloudSaveRevision);
      cloudStatus = "Сохранена предыдущая версия; отправляю новые изменения...";
      queueCloudSave({ immediate: true });
    } else {
      cloudSaveDirty = false;
      clearPendingCloudSave();
      clearCriticalSaveFailure();
      cloudStatus = `Сохранено и проверено: ${lastConfirmedCloudSaveAt.toLocaleTimeString("ru-RU")}`;
    }
    if (cloudMergeChangedLocalState) {
      renderCharacterSelect();
      render();
    }
    renderCloudStatus();
    return true;
  })().finally(() => {
    cloudSaveInFlight = null;
    if (cloudSaveDirty && saveCompleted) queueCloudSave({ immediate: true });
  });
  return cloudSaveInFlight;
}

async function waitForCloudSaveConfirmation(targetRevision) {
  if (!requiresAdminCloudSave()) return true;
  for (let attempt = 0; attempt < 5 && cloudSaveConfirmedRevision < targetRevision; attempt += 1) {
    const saved = await flushCloudSave();
    if (!saved) return false;
  }
  return cloudSaveConfirmedRevision >= targetRevision;
}

async function runCloudSaveSelfCheck() {
  markCloudSavePending(compactStateForStorage(state));
  const saved = await flushCloudSave({ immediate: true });
  if (!saved) return;
  alert(`Проверка пройдена. Supabase принял данные и вернул ту же версию при повторном чтении. Версия: ${lastCloudUpdatedAt || "подтверждена"}.`);
}

function mergePublicCampaignEntries(remoteState) {
  if (!remoteState || typeof remoteState !== "object") {
    return { characters: 0, updatedCharacters: 0, npcs: 0, updatedNpcs: 0 };
  }
  const knownCharacters = new Map(state.characters.map((item) => [item.id, item]));
  const knownNpcs = new Map(state.npcs.map((item) => [item.id, item]));
  const newCharacters = [];
  let updatedCharacters = 0;
  (remoteState.characters ?? []).map(normalizeCharacter).forEach((item) => {
    const existing = knownCharacters.get(item.id);
    if (!existing) {
      newCharacters.push(item);
      return;
    }
    if (JSON.stringify(existing) !== JSON.stringify(item)) {
      Object.assign(existing, item);
      updatedCharacters += 1;
    }
  });
  const newNpcs = [];
  let updatedNpcs = 0;
  (remoteState.npcs ?? []).map(normalizeNpc).forEach((item) => {
    const existing = knownNpcs.get(item.id);
    if (!existing) {
      newNpcs.push(item);
      return;
    }
    if (JSON.stringify(existing) !== JSON.stringify(item)) {
      Object.assign(existing, item);
      updatedNpcs += 1;
    }
  });
  if (newCharacters.length) state.characters.push(...newCharacters);
  if (newNpcs.length) state.npcs.unshift(...newNpcs);
  if (newCharacters.length || updatedCharacters || newNpcs.length || updatedNpcs) {
    persistLocalStateOnly();
    renderCharacterSelect();
    const editingCharacter = document.activeElement?.closest?.(".character-edit-form");
    if (!editingCharacter && ["characters", "directory", "dashboard"].includes(currentView)) render();
  }
  return { characters: newCharacters.length, updatedCharacters, npcs: newNpcs.length, updatedNpcs };
}

function subscribePublicCampaignEntries() {
  if (!supabaseClient || campaignEntrySubscription) return;
  campaignEntrySubscription = supabaseClient
    .channel("ashana-public-campaign-entries")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campaign_state", filter: "id=eq.main" }, (payload) => {
      mergePublicCampaignEntries(payload.new?.data);
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") console.warn("Обновления публичных персонажей временно недоступны");
    });
}

async function submitPublicCampaignEntry(kind, entry) {
  if (!supabaseClient) {
    alert("Общая база пока недоступна. Проверь подключение к интернету и попробуй снова.");
    return false;
  }
  const { data, error } = await supabaseClient.rpc("add_public_campaign_entry", {
    entry_kind: kind,
    entry_data: entry,
  });
  if (error) {
    console.warn("Публичная запись не добавлена:", error);
    const subject = kind === "npc" ? "NPC" : "персонажа";
    alert(`Не удалось добавить ${subject} в общую базу. Причина: ${publicEntryErrorText(error)}. Введённые данные остались в открытой форме.`);
    return false;
  }
  mergePublicCampaignEntries(data);
  cloudStatus = "Запись добавлена в общую базу";
  renderCloudStatus();
  return true;
}

async function updatePublicCharacter(character) {
  if (!supabaseClient) {
    alert("Общая база сейчас недоступна. Проверь подключение к интернету и попробуй снова.");
    return false;
  }
  const { data, error } = await supabaseClient.rpc("update_public_character", {
    character_id: character.id,
    character_data: character,
  });
  if (error) {
    console.warn("Публичное редактирование персонажа не выполнено:", error);
    persistLocalStateOnly();
    alert(`Персонаж НЕ сохранён в общей базе. Причина: ${publicEntryErrorText(error)}. Локальная копия оставлена в этом браузере.`);
    await loadCloudState();
    render();
    return false;
  }
  mergePublicCampaignEntries(data);
  persistLocalStateOnly();
  cloudStatus = `Персонаж сохранён: ${new Date().toLocaleTimeString("ru-RU")}`;
  renderCloudStatus();
  return true;
}

async function updatePublicNpc(npc) {
  if (!supabaseClient) {
    alert("Общая база сейчас недоступна. Проверь подключение к интернету и попробуй снова.");
    return false;
  }
  const { data, error } = await supabaseClient.rpc("update_public_npc", {
    npc_id: npc.id,
    npc_data: npc,
  });
  if (error) {
    console.warn("Публичное редактирование NPC не выполнено:", error);
    persistLocalStateOnly();
    alert(`NPC НЕ сохранён в общей базе. Причина: ${publicEntryErrorText(error)}. Локальная копия оставлена в этом браузере.`);
    await loadCloudState();
    render();
    return false;
  }
  mergePublicCampaignEntries(data);
  persistLocalStateOnly();
  cloudStatus = `NPC сохранён: ${new Date().toLocaleTimeString("ru-RU")}`;
  renderCloudStatus();
  return true;
}

function publicEntryErrorText(error) {
  const message = String(error?.message || "неизвестная ошибка Supabase");
  const lower = message.toLowerCase();
  if (lower.includes("admin-only") || lower.includes("admin access")) return "редактирование этого объекта разрешено только мастеру";
  if (lower.includes("not found")) return "объект не найден в актуальной версии общей базы; обновите страницу и попробуйте снова";
  if (lower.includes("too large")) return "карточка превышает допустимый размер; загрузите изображения как файлы, а не как встроенные данные";
  if (lower.includes("storage")) return "изображение не было загружено в хранилище Supabase";
  if (error?.code === "PGRST202" || lower.includes("schema cache")) return "серверная функция временно недоступна; обновите страницу и повторите попытку";
  return message;
}

function campaignValuesEqual(left, right) {
  if (left === right) return true;
  if (left == null || right == null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => campaignValuesEqual(value, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index] && campaignValuesEqual(left[key], right[key]));
}

function mergeConcurrentArray(base, local, remote) {
  const baseItems = Array.isArray(base) ? base : [];
  const localItems = Array.isArray(local) ? local : [];
  const remoteItems = Array.isArray(remote) ? remote : [];
  const allItems = [...baseItems, ...localItems, ...remoteItems];
  const identities = allItems.map(stableArrayItemIdentity);
  if (!allItems.length || identities.some((identity) => !identity)) {
    return campaignValuesEqual(localItems, baseItems)
      ? structuredClone(remoteItems)
      : structuredClone(localItems);
  }

  const identityKey = (item) => {
    const identity = stableArrayItemIdentity(item);
    return `${identity.key}:${identity.value}`;
  };
  const baseById = new Map(baseItems.map((item) => [identityKey(item), item]));
  const localById = new Map(localItems.map((item) => [identityKey(item), item]));
  const remoteById = new Map(remoteItems.map((item) => [identityKey(item), item]));
  const result = [];

  remoteItems.forEach((remoteItem) => {
    const key = identityKey(remoteItem);
    const baseItem = baseById.get(key);
    const localItem = localById.get(key);
    if (baseItem && !localItem) return;
    if (!baseItem && localItem) {
      result.push(mergeConcurrentValue({}, localItem, remoteItem));
      return;
    }
    if (!baseItem || !localItem) {
      result.push(structuredClone(remoteItem));
      return;
    }
    result.push(mergeConcurrentValue(baseItem, localItem, remoteItem));
  });

  localItems.forEach((localItem) => {
    const key = identityKey(localItem);
    if (remoteById.has(key)) return;
    const baseItem = baseById.get(key);
    if (!baseItem || !campaignValuesEqual(localItem, baseItem)) {
      result.push(structuredClone(localItem));
    }
  });
  return result;
}

function mergeConcurrentObject(base, local, remote) {
  const result = {};
  const keys = new Set([
    ...Object.keys(base ?? {}),
    ...Object.keys(local ?? {}),
    ...Object.keys(remote ?? {}),
  ]);
  keys.forEach((key) => {
    const baseHas = Object.hasOwn(base ?? {}, key);
    const localHas = Object.hasOwn(local ?? {}, key);
    const remoteHas = Object.hasOwn(remote ?? {}, key);
    if (!localHas) {
      if (!baseHas && remoteHas) result[key] = structuredClone(remote[key]);
      return;
    }
    if (!baseHas) {
      result[key] = remoteHas
        ? mergeConcurrentValue(undefined, local[key], remote[key])
        : structuredClone(local[key]);
      return;
    }
    if (!remoteHas) {
      if (!campaignValuesEqual(local[key], base[key])) result[key] = structuredClone(local[key]);
      return;
    }
    result[key] = mergeConcurrentValue(base[key], local[key], remote[key]);
  });
  return result;
}

function mergeConcurrentValue(base, local, remote) {
  if (campaignValuesEqual(local, base)) return structuredClone(remote);
  if (Array.isArray(local)) {
    return Array.isArray(remote)
      ? mergeConcurrentArray(Array.isArray(base) ? base : [], local, remote)
      : structuredClone(local);
  }
  if (local && remote && typeof local === "object" && typeof remote === "object") {
    return mergeConcurrentObject(base && typeof base === "object" ? base : {}, local, remote);
  }
  return structuredClone(local);
}

function mergeConcurrentCampaignState(base, local, remote) {
  return mergeConcurrentObject(base ?? {}, local ?? {}, remote ?? {});
}

async function fetchLatestCloudSnapshot() {
  const { data, error } = await supabaseClient
    .from("campaign_state")
    .select("data,updated_at")
    .eq("id", "main")
    .single();
  if (error || !data?.data) throw error || new Error("Общая база не найдена");
  return {
    data: compactStateForStorage(normalizeState({ ...structuredClone(seedData), ...data.data })),
    updatedAt: data.updated_at || null,
  };
}

async function verifyCloudSave(base, payload) {
  const latest = await fetchLatestCloudSnapshot();
  if (campaignValuesEqual(latest.data, payload)) return { confirmed: true, latest };
  const withLocalChanges = mergeConcurrentCampaignState(base, payload, latest.data);
  return {
    confirmed: campaignValuesEqual(withLocalChanges, latest.data),
    latest,
  };
}

async function saveCloudState(options = {}) {
  if (!supabaseClient || !supabaseUser || !isAdmin) {
    cloudSaveFailureMessage = cloudSavePrerequisiteError() || "Нет подтверждённой мастерской сессии.";
    if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
    return false;
  }
  if (!cloudStateReady && !options.allowUninitialized) {
    cloudSaveFailureMessage = "Сохранение ожидает загрузки общей базы.";
    if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
    return false;
  }
  const initialPayload = options.payload
    ? structuredClone(options.payload)
    : compactStateForStorage(state);
  let payload = initialPayload;
  let comparisonSnapshot = options.comparisonSnapshot
    ? structuredClone(options.comparisonSnapshot)
    : lastCloudSnapshot;
  let expectedUpdatedAt = options.expectedUpdatedAt ?? lastCloudUpdatedAt;
  let mergedConcurrentChanges = false;

  for (let attempt = 0; attempt < CLOUD_SAVE_MAX_CONFLICT_ATTEMPTS; attempt += 1) {
    const trashEntries = options.skipTrashDiff || !comparisonSnapshot
      ? []
      : collectDeletedEntries(comparisonSnapshot, payload);
    let data;
    let error;
    try {
      const result = await supabaseClient.rpc("save_campaign_state_resilient", {
        p_data: payload,
        p_trash_entries: trashEntries,
        p_expected_updated_at: expectedUpdatedAt,
        p_client_version: CLOUD_SAVE_CLIENT_VERSION,
      });
      data = result.data;
      error = result.error;
    } catch (requestError) {
      cloudSaveFailureMessage = `Запрос к Supabase оборвался: ${requestError.message || requestError}`;
      if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
      return false;
    }
    if (!error) {
      try {
        const verification = await verifyCloudSave(comparisonSnapshot, payload);
        if (!verification.confirmed) {
          payload = mergeConcurrentCampaignState(comparisonSnapshot, payload, verification.latest.data);
          comparisonSnapshot = verification.latest.data;
          expectedUpdatedAt = verification.latest.updatedAt;
          mergedConcurrentChanges = true;
          continue;
        }
        lastCloudSnapshot = structuredClone(verification.latest.data);
        lastCloudUpdatedAt = verification.latest.updatedAt || data?.updated_at || expectedUpdatedAt;
      } catch (verificationError) {
        cloudSaveFailureMessage = `Supabase принял запрос, но повторная проверка записи не удалась: ${verificationError.message}`;
        if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
        return false;
      }
      if (trashEntries.length || data?.backup_created) dataProtectionLoaded = false;
      cloudSaveFailureMessage = "";
      if (!options.managedQueue) {
        if (mergedConcurrentChanges) {
          const activeMapRegionId = state.map.activeRegionId;
          const selectedMapHex = state.map.selectedHex;
          state = normalizeState({ ...structuredClone(seedData), ...structuredClone(lastCloudSnapshot) });
          restoreMapSelectionAfterStateReplacement(activeMapRegionId, selectedMapHex);
          persistLocalStateOnly();
          renderCharacterSelect();
          render();
        }
        clearCriticalSaveFailure();
        cloudStatus = mergedConcurrentChanges
          ? `Сохранено и проверено после безопасного объединения: ${new Date().toLocaleTimeString("ru-RU")}`
          : `Сохранено и проверено: ${new Date().toLocaleTimeString("ru-RU")}`;
        renderCloudStatus();
      }
      return true;
    }

    if (isClientUpdateRequired(error)) {
      cloudSaveFailureMessage = "Открыта устаревшая версия сайта. Обновите эту вкладку: аварийная копия правок уже сохранена в браузере и будет восстановлена после обновления.";
      if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
      return false;
    }

    if (!isCampaignVersionConflict(error)) {
      cloudSaveFailureMessage = `Supabase отклонил сохранение: ${cloudSaveErrorText(error)}`;
      if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
      return false;
    }

    if (!mergedConcurrentChanges) {
      preserveLocalSafetySnapshot(initialPayload, lastCloudSnapshot, "Конфликт версий: правки до безопасного объединения");
    }
    try {
      await waitForSaveRetry(attempt);
      const latest = await fetchLatestCloudSnapshot();
      payload = mergeConcurrentCampaignState(comparisonSnapshot, payload, latest.data);
      comparisonSnapshot = latest.data;
      expectedUpdatedAt = latest.updatedAt;
      lastCloudSnapshot = structuredClone(latest.data);
      lastCloudUpdatedAt = latest.updatedAt;
      mergedConcurrentChanges = true;
    } catch (latestError) {
      cloudSaveFailureMessage = `Не удалось загрузить свежую версию для безопасного объединения: ${latestError.message}`;
      if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
      return false;
    }
  }

  preserveLocalSafetySnapshot(payload, comparisonSnapshot, "Конфликт не удалось объединить автоматически");
  cloudSaveFailureMessage = "Общая база активно меняется в другой мастерской вкладке. Правки сохранены в аварийной копии; сайт продолжит повторять безопасное объединение автоматически.";
  if (!options.managedQueue) reportCriticalSaveFailure(cloudSaveFailureMessage);
  return false;
}

async function loadCloudState(options = {}) {
  if (!supabaseClient) return false;
  if (cloudSaveInFlight) await cloudSaveInFlight;
  if (cloudSaveDirty && cloudStateReady && isAdmin && !options.skipPendingFlush) {
    const flushed = await flushCloudSave({ immediate: true });
    if (!flushed) return false;
  }
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = null;
  cloudStateReady = false;
  let recoveredPendingSave = false;
  let coreRaceMigrationPending = false;
  coreRaceMigrationNeedsCloudSave = false;
  const pendingCloudSave = (options.canSeed || requiresAdminCloudSave()) ? loadPendingCloudSave() : null;
  const uiState = loadUiState();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.from("campaign_state")
      .select("data,updated_at").eq("id", "main").abortSignal(controller.signal).single());
  } catch (loadError) {
    error = loadError;
  } finally {
    clearTimeout(timeout);
  }
  if (error) {
    const reason = controller.signal.aborted ? "превышено время ожидания" : error.message;
    cloudStatus = `Ошибка загрузки облака: ${reason}`;
    if (pendingCloudSave) reportCriticalSaveFailure(`Не удалось загрузить общую базу для отправки аварийной копии: ${error.message}`);
    showCloudReadFailure(reason);
    renderCloudStatus();
    return false;
  }
  hideCloudReadFailure();
  if (data?.data && Object.keys(data.data).length) {
    const remoteContentMigrations = Array.isArray(data.data.meta?.contentMigrations)
      ? data.data.meta.contentMigrations.map(String)
      : [];
    coreRaceMigrationPending = [CORE_RACES_WIKI_MIGRATION_ID, EXTENDED_RACES_WIKI_MIGRATION_ID, OGRE_WIKI_MIGRATION_ID, HARPY_WIKI_MIGRATION_ID, NPC_STAT_PROFILE_MIGRATION_ID, MAP_OWNERSHIP_MIGRATION_ID]
      .some((migrationId) => !remoteContentMigrations.includes(migrationId));
    preserveLocalSafetySnapshot(startupLocalSnapshot, data.data, "Локальная копия перед первой синхронизацией");
    preserveLocalSafetySnapshot(state, data.data, "Локальная копия перед загрузкой облака");
    const remoteState = normalizeState({ ...structuredClone(seedData), ...data.data });
    lastCloudSnapshot = compactStateForStorage(remoteState);
    lastCloudUpdatedAt = data.updated_at || null;
    lastMirrorPollUpdatedAt = lastCloudUpdatedAt;
    state = remoteState;
    if (pendingCloudSave) {
      const recovered = mergeConcurrentCampaignState(
        pendingCloudSave.baseSnapshot || lastCloudSnapshot,
        pendingCloudSave.payload,
        lastCloudSnapshot
      );
      if (!campaignValuesEqual(recovered, lastCloudSnapshot)) {
        state = normalizeState({ ...structuredClone(seedData), ...recovered });
        cloudSaveRevision = Math.max(cloudSaveRevision + 1, Number(pendingCloudSave.revision || 0) + 1);
        cloudSaveDirty = true;
        persistPendingCloudSave(compactStateForStorage(state), cloudSaveRevision);
        recoveredPendingSave = true;
      } else {
        clearPendingCloudSave();
      }
    }
    persistLocalStateOnly();
    cloudStateReady = true;
    coreRaceMigrationNeedsCloudSave = Boolean(options.canSeed && coreRaceMigrationPending);
  } else {
    lastCloudSnapshot = compactStateForStorage(state);
    lastCloudUpdatedAt = data?.updated_at || null;
    lastMirrorPollUpdatedAt = lastCloudUpdatedAt;
    cloudStateReady = true;
    if (options.canSeed) await saveCloudState({ allowUninitialized: true, skipTrashDiff: true });
  }
  if (!state.characters.some((character) => character.id === activeCharacterId)) {
    activeCharacterId = state.characters[0]?.id ?? null;
  }
  if (!activeCalendarDateKey) activeCalendarDateKey = ashanaDateKey(state.meta.ashanaDate);
  if (!state.sessionLogs.some((session) => session.id === activeSessionId)) {
    activeSessionId = state.sessionLogs[0]?.id ?? null;
  }
  if (!state.settlements.some((settlement) => settlement.id === activeSettlementId)) {
    activeSettlementId = state.settlements[0]?.id ?? null;
  }
  if (!state.items.some((item) => item.id === activeItemId)) {
    activeItemId = state.items[0]?.id ?? null;
  }
  const loadedActiveItem = state.items.find((item) => item.id === activeItemId);
  if (loadedActiveItem) activeItemCategory = loadedActiveItem.category;
  if (activeWikiId !== WIKI_INDEX_ID && !state.wiki.some((article) => article.id === activeWikiId)) {
    activeWikiId = WIKI_INDEX_ID;
    activeWikiCategoryId = "";
  }
  if (uiState.mapActiveRegionId && state.map.regions.some((region) => region.id === uiState.mapActiveRegionId)) {
    state.map.activeRegionId = uiState.mapActiveRegionId;
  }
  if (uiState.mapSelectedHex) state.map.selectedHex = uiState.mapSelectedHex;
  mapZoom = Number(uiState.mapZoom || state.map.zoom || 1);
  mapScroll = uiState.mapScroll || mapScroll;
  mapPanelScroll = uiState.mapPanelScroll || mapPanelScroll;
  mapViewByRegion = normalizeMapViewByRegion(uiState.mapViewByRegion);
  const restoredMapView = mapViewByRegion[state.map.activeRegionId];
  if (restoredMapView) {
    mapZoom = restoredMapView.zoom;
    mapScroll = { ...restoredMapView.map };
    mapPanelScroll = { ...restoredMapView.panels };
    state.map.selectedHex = restoredMapView.selectedHex || state.map.selectedHex;
  }
  await loadCloudRolls();
  renderCharacterSelect();
  render();
  cloudStatus = recoveredPendingSave
    ? "Найдена аварийная копия; сохраняю и проверяю..."
    : "Общая база подключена";
  renderCloudStatus();
  if (recoveredPendingSave) queueCloudSave({ immediate: true });
  return true;
}

async function loadCloudRolls() {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient
    .from("roll_logs")
    .select("id, actor, label, formula, rolls, total, created_at")
    .not("label", "like", `${MINIGAME_SCORE_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("Общий журнал бросков пока недоступен:", error.message);
    return false;
  }
  state.rolls = (data ?? []).map(normalizeCloudRoll);
  persistLocalStateOnly();
  return true;
}

function subscribeCloudRolls() {
  if (!supabaseClient || rollSubscription) return;
  rollSubscription = supabaseClient
    .channel("ashana-roll-logs")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "roll_logs" }, (payload) => {
      if (isMinigameScoreLabel(payload.new?.label)) {
        minigameLeaderboardCache.delete(minigameIdFromScoreLabel(payload.new.label));
        if (currentView === "minigame") refreshVisibleMinigameLeaderboards(true);
        return;
      }
      const entry = normalizeCloudRoll(payload.new);
      mergeRollEntry(entry);
      if (["roller", "dashboard"].includes(currentView)) render();
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "roll_logs" }, () => {
      minigameLeaderboardCache.clear();
      loadCloudRolls().then(() => {
        if (["roller", "dashboard"].includes(currentView)) render();
        if (currentView === "minigame") refreshVisibleMinigameLeaderboards(true);
      });
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") console.warn("Realtime журнала бросков недоступен");
    });
}

async function pollMirrorUpdates() {
  if (mirrorPollInFlight || !cloudStateReady || cloudSaveDirty || cloudSaveInFlight || document.visibilityState !== "visible") return;
  mirrorPollInFlight = true;
  try {
    const { data: revision, error: revisionError } = await supabaseClient.from("campaign_state")
      .select("updated_at").eq("id", "main").single();
    if (revisionError) throw revisionError;
    if (revision?.updated_at && revision.updated_at !== lastMirrorPollUpdatedAt) {
      const { data: current, error: currentError } = await supabaseClient.from("campaign_state")
        .select("data,updated_at").eq("id", "main").single();
      if (currentError) throw currentError;
      mergePublicCampaignEntries(current.data);
      lastMirrorPollUpdatedAt = current.updated_at;
    }
    const previousRollIds = state.rolls.map((roll) => roll.id).join(",");
    if (await loadCloudRolls() && previousRollIds !== state.rolls.map((roll) => roll.id).join(",")) {
      if (["roller", "dashboard"].includes(currentView)) render();
    }
    if (currentView === "minigame") {
      minigameLeaderboardCache.clear();
      refreshVisibleMinigameLeaderboards(true);
    }
  } catch (error) {
    console.warn("Синхронизация зеркала временно недоступна:", error.message);
  } finally {
    mirrorPollInFlight = false;
  }
}

function normalizeCloudRoll(row) {
  const timestamp = row?.created_at || row?.timestamp || new Date().toISOString();
  return {
    id: row?.id || crypto.randomUUID(),
    actor: row?.actor || "Партия",
    label: row?.label || "",
    formula: row?.formula || "1d20",
    rolls: Array.isArray(row?.rolls) ? row.rolls.map(Number) : [],
    total: Number(row?.total ?? 0),
    timestamp,
    createdAt: new Date(timestamp).toLocaleString("ru-RU"),
  };
}

function mergeRollEntry(entry) {
  if (!entry?.id || state.rolls.some((item) => item.id === entry.id)) return false;
  state.rolls.unshift(entry);
  state.rolls = state.rolls
    .slice(0, 240)
    .sort((a, b) => rollTimeValue(b) - rollTimeValue(a))
    .slice(0, 200);
  persistLocalStateOnly();
  return true;
}

function rollTimeValue(entry) {
  const value = Date.parse(entry?.timestamp || entry?.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

async function saveRollToCloud(entry) {
  if (!supabaseClient || !entry) return false;
  const { error } = await supabaseClient.from("roll_logs").insert({
    id: entry.id,
    actor: entry.actor,
    label: entry.label,
    formula: entry.formula,
    rolls: entry.rolls,
    total: entry.total,
    created_at: entry.timestamp || new Date().toISOString(),
  });
  if (error) {
    console.warn("Бросок не отправлен в общий журнал:", error.message);
    return false;
  }
  return true;
}

async function clearCloudRolls() {
  if (!supabaseClient || !supabaseUser || !isAdmin) return false;
  const { error } = await supabaseClient
    .from("roll_logs")
    .delete()
    .neq("id", "")
    .not("label", "like", `${MINIGAME_SCORE_PREFIX}%`);
  if (error) {
    alert(`Не удалось очистить общий журнал бросков: ${error.message}`);
    return false;
  }
  return true;
}

function persistLocalStateOnly() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compactStateForStorage(state)));
  } catch (error) {
    console.warn("Локальное сохранение журнала бросков недоступно:", error.message);
  }
}

function compactStateForStorage(source) {
  const compact = structuredClone(source);
  compact.wiki?.forEach((article) => {
    if (isEmbeddedImage(article.image)) article.image = "";
  });
  compact.gallery?.forEach((item) => {
    if (isEmbeddedImage(item.image)) item.image = "";
  });
  compact.items?.forEach((item) => {
    if (isEmbeddedImage(item.image)) item.image = "";
  });
  compact.npcs?.forEach((item) => {
    if (isEmbeddedImage(item.portrait)) item.portrait = "";
  });
  compact.factions?.forEach((item) => {
    if (isEmbeddedImage(item.image)) item.image = "";
  });
  compact.countries?.forEach((item) => {
    if (isEmbeddedImage(item.image)) item.image = "";
  });
  compact.settlements?.forEach((settlement) => {
    if (isEmbeddedImage(settlement.image)) settlement.image = "";
    settlement.districts?.forEach((district) => {
      if (isEmbeddedImage(district.image)) district.image = "";
    });
    settlement.buildings?.forEach((building) => {
      if (isEmbeddedImage(building.image)) building.image = "";
    });
  });
  Object.values(compact.tagMeta ?? {}).forEach((item) => {
    if (isEmbeddedImage(item.image)) item.image = "";
  });
  compact.characters?.forEach((character) => {
    if (isEmbeddedImage(character.portrait)) character.portrait = "";
  });
  compact.paperThrone?.cards?.forEach((card) => {
    if (isEmbeddedImage(card.art)) card.art = "";
  });
  compact.paperThrone?.factions?.forEach((faction) => {
    if (isEmbeddedImage(faction.art)) faction.art = "";
  });
  compact.paperThrone?.leaders?.forEach((leader) => {
    if (isEmbeddedImage(leader.art)) leader.art = "";
  });
  compact.map?.regions?.forEach((region) => {
    if (isEmbeddedImage(region.image)) region.image = "";
    Object.values(region.hexes ?? {}).forEach((hex) => {
      if (isEmbeddedImage(hex.tileImage)) hex.tileImage = "";
      if (isEmbeddedImage(hex.boundaryImage)) hex.boundaryImage = "";
      (hex.boundaryLayers ?? []).forEach((layer) => {
        if (isEmbeddedImage(layer.image)) layer.image = "";
      });
    });
  });
  compact.map?.tilePresets?.forEach((preset) => {
    if (isEmbeddedImage(preset.image)) preset.image = "";
  });
  compact.rolls = compact.rolls?.slice(0, 80) ?? [];
  return stripUiOnlyCampaignState(compact);
}

function stripUiOnlyCampaignState(source) {
  if (!source || typeof source !== "object") return source;
  if (source.map && typeof source.map === "object") {
    delete source.map.zoom;
    delete source.map.activeRegionId;
    delete source.map.selectedHex;
  }
  return source;
}

function restoreMapSelectionAfterStateReplacement(activeRegionId, selectedHex) {
  if (!state?.map) return;
  if (activeRegionId && state.map.regions.some((region) => region.id === activeRegionId)) {
    state.map.activeRegionId = activeRegionId;
  }
  if (selectedHex) state.map.selectedHex = selectedHex;
}

function isEmbeddedImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function initSupabase() {
  const supabaseFactory = globalThis.supabase;
  if (!supabaseFactory?.createClient) {
    cloudStatus = "Supabase SDK не загружен";
    showCloudReadFailure("модуль подключения к базе не загрузился");
    renderCloudStatus();
    return;
  }
  supabaseClient = supabaseFactory.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  if (SUPABASE_URL === SUPABASE_ORIGIN) {
    subscribeCloudRolls();
    subscribePublicCampaignEntries();
  } else if (!mirrorPollingTimer) {
    mirrorPollingTimer = setInterval(pollMirrorUpdates, 45000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") pollMirrorUpdates();
    });
  }
  supabaseClient.auth.getSession().then(async ({ data }) => {
    await applySupabaseSession(data.session);
  });
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    if (["TOKEN_REFRESHED", "SIGNED_IN"].includes(event) && session?.user?.id === supabaseUser?.id) {
      supabaseUser = session.user;
      return;
    }
    applySupabaseSession(session);
  });
}

async function applySupabaseSession(session) {
  supabaseUser = session?.user ?? null;
  supabaseProfile = null;
  cloudStateReady = false;
  if (!supabaseUser) {
    if (cloudSaveDirty) {
      reportCriticalSaveFailure("Сессия мастера завершилась до подтверждения записи. Войдите снова в этой вкладке.");
    } else {
      adminCloudRequired = false;
    }
    cloudStatus = cloudSaveDirty
      ? "НЕ СОХРАНЕНО: требуется повторный вход мастера"
      : "Гость: можно редактировать открытых персонажей и NPC";
    setAdminMode(false, { renderView: false });
    renderCloudStatus();
    await loadCloudState();
    return;
  }
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("role, display_name")
    .eq("user_id", supabaseUser.id)
    .maybeSingle();
  if (error) {
    cloudStatus = `Профиль не загружен: ${error.message}`;
    setAdminMode(false, { renderView: false });
  } else {
    supabaseProfile = data ?? { role: "player", display_name: supabaseUser.email };
    cloudStatus = `Загрузка общей базы: ${supabaseProfile.display_name || supabaseUser.email}`;
    setAdminMode(false, { renderView: false });
  }
  renderCloudStatus();
  const shouldAdmin = supabaseProfile?.role === "admin";
  adminCloudRequired = shouldAdmin || (adminCloudRequired && cloudSaveDirty);
  const cloudLoaded = await loadCloudState({ canSeed: shouldAdmin });
  setAdminMode(shouldAdmin && cloudLoaded);
  let coreRaceMigrationSaved = false;
  if (isAdmin && coreRaceMigrationNeedsCloudSave) {
    saveState();
    const migrationRevision = cloudSaveRevision;
    coreRaceMigrationSaved = await waitForCloudSaveConfirmation(migrationRevision);
    if (coreRaceMigrationSaved) {
      coreRaceMigrationNeedsCloudSave = false;
      cloudStatus = "Wiki обновлена: добавлены основные расы Pathfinder 1e";
    } else {
      reportCriticalSaveFailure("Статьи об основных расах подготовлены локально, но Supabase не подтвердил их добавление. Не закрывайте вкладку мастера до успешного повторного сохранения.");
    }
  }
  if (cloudLoaded && !cloudSaveDirty && !coreRaceMigrationSaved) {
    cloudStatus = `Вход: ${supabaseProfile?.display_name || supabaseUser.email}`;
  }
  renderCloudStatus();
}

function renderCloudStatus() {
  if (!adminBadge || !quickLoginButton) return;
  const role = isAdmin ? "мастер" : "гость";
  adminBadge.textContent = `${role} · ${cloudStatus}`;
  adminBadge.classList.toggle("cloud-saving", cloudSaveDirty && !cloudSaveFailureMessage);
  adminBadge.classList.toggle("cloud-save-error", Boolean(cloudSaveFailureMessage));
  adminBadge.title = cloudSaveFailureMessage || (lastConfirmedCloudSaveAt
    ? `Последнее подтверждённое сохранение: ${lastConfirmedCloudSaveAt.toLocaleString("ru-RU")}`
    : cloudStatus);
  quickLoginButton.textContent = supabaseUser ? "Выйти" : "Войти";
}

function showCloudReadFailure(reason) {
  let overlay = document.querySelector("#cloudReadFailureOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "cloudReadFailureOverlay";
    overlay.className = "critical-save-overlay";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <section class="critical-save-card">
        <p class="critical-save-kicker">НЕТ СВЯЗИ С ОБЩЕЙ БАЗОЙ</p>
        <h2>ДАННЫЕ МОГУТ БЫТЬ УСТАРЕВШИМИ</h2>
        <p class="critical-save-message"></p>
        <p class="critical-save-safety">Сейчас показана локальная копия этого браузера, а не подтверждённая версия сайта. Не редактируйте её, пока связь не восстановится.</p>
        <div class="critical-save-actions">
          <button class="primary-button" type="button" data-action="retry">Повторить подключение</button>
          <button class="ghost-button" type="button" data-action="offline">Посмотреть локальную копию</button>
        </div>
      </section>`;
    document.body.append(overlay);
    overlay.querySelector('[data-action="retry"]').addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = "Подключаюсь...";
      await loadCloudState();
      button.disabled = false;
      button.textContent = "Повторить подключение";
    });
    overlay.querySelector('[data-action="offline"]').addEventListener("click", () => {
      overlay.hidden = true;
    });
  }
  overlay.querySelector(".critical-save-message").textContent = `Причина: ${reason}.`;
  overlay.hidden = false;
}

function hideCloudReadFailure() {
  const overlay = document.querySelector("#cloudReadFailureOverlay");
  if (overlay) overlay.hidden = true;
}

async function signInSupabase(email, password) {
  if (!supabaseClient) initSupabase();
  if (!supabaseClient) throw new Error("Supabase SDK не загружен");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signOutSupabase() {
  if (cloudSaveDirty) {
    const saved = await flushCloudSave({ immediate: true });
    if (!saved) return false;
  }
  if (supabaseClient) await supabaseClient.auth.signOut();
  supabaseUser = null;
  supabaseProfile = null;
  adminCloudRequired = false;
  setAdminMode(false);
  return true;
}

async function imageFileToUrl(file, folder, options = {}) {
  const canUpload = supabaseClient && ((supabaseUser && isAdmin) || options.allowPublicUpload);
  if (!canUpload && options.requireCloudUpload) {
    alert(`${options.label || "Файл"} не загружен: нет активного доступа к Supabase Storage. Войдите в режим мастера заново и повторите загрузку.`);
    return "";
  }
  if (canUpload) {
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseClient.storage.from(SUPABASE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (!error) {
      return supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl
        .replace(SUPABASE_URL, SUPABASE_ORIGIN);
    }
    if (options.requireCloudUpload) {
      alert(`${options.label || "Файл"} не загружен в общую базу: ${error.message}. Проверьте права мастера и доступ к Supabase Storage.`);
      return "";
    }
    alert(`Картинка не загружена в Supabase Storage: ${error.message}. Сохраню локально как запасной вариант.`);
  }
  return readFileAsDataUrl(file);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function visibleWiki() {
  return state.wiki.filter((item) => item.public || isAdmin);
}

function visibleQuests() {
  return state.quests.filter((quest) => quest.status !== "hidden" || isAdmin);
}

function visibleNpcs() {
  return state.npcs.filter((npc) => npc.public || isAdmin);
}

function relationshipEntities() {
  return [
    ...state.characters.map((character) => ({
      key: relationshipEntityKey("character", character.id),
      type: "character",
      id: character.id,
      name: character.name,
      subtitle: [character.className, `ур. ${character.level}`].filter(Boolean).join(" · "),
      portrait: character.portrait || "",
      portraitStyle: character.portraitStyle || defaultImageStyle(),
    })),
    ...visibleNpcs().map((npc) => ({
      key: relationshipEntityKey("npc", npc.id),
      type: "npc",
      id: npc.id,
      name: npc.name,
      subtitle: [npc.role, npc.className, `ур. ${npc.level}`].filter(Boolean).join(" · "),
      portrait: npc.portrait || "",
      portraitStyle: npc.portraitStyle || defaultImageStyle(),
    })),
  ];
}

function relationshipEntity(key) {
  return relationshipEntities().find((entity) => entity.key === key) || null;
}

function relationshipPair(sourceKey, targetKey) {
  return [String(sourceKey || ""), String(targetKey || "")].sort((a, b) => a.localeCompare(b));
}

function relationshipBetween(sourceKey, targetKey) {
  const pair = relationshipPair(sourceKey, targetKey);
  return state.relationships.find((relationship) =>
    relationship.sourceKey === pair[0]
    && relationship.targetKey === pair[1]
    && (relationship.public || isAdmin)
  ) || null;
}

function visibleRelationships() {
  const entityKeys = new Set(relationshipEntities().map((entity) => entity.key));
  return (state.relationships ?? []).filter((relationship) =>
    (relationship.public || isAdmin)
    && entityKeys.has(relationship.sourceKey)
    && entityKeys.has(relationship.targetKey)
  );
}

function visibleFactions() {
  return state.factions.filter((faction) => faction.public || isAdmin);
}

function visibleSettlements() {
  return state.settlements.filter((settlement) => settlement.public || isAdmin);
}

function visibleCountries() {
  return state.countries.filter((country) => country.public || isAdmin);
}

function visibleItems() {
  return state.items.filter((item) => item.public || isAdmin);
}

function visibleCalendarEvents() {
  return state.calendarEvents.filter((event) => event.public || isAdmin);
}

function visibleSessionLogs() {
  return state.sessionLogs.filter((session) => session.public || isAdmin);
}

function setView(view, options = {}) {
  if (!options.skipWikiGuard && view !== currentView && !confirmWikiEditorLeave()) return false;
  if (currentView === "map") {
    captureActiveMapViewport(true);
  }
  currentView = view;
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  render();
  return true;
}

function hasUnsavedWikiDraft() {
  return Boolean(wikiDraft?.dirty);
}

function clearWikiDraft(articleId = null) {
  if (articleId && wikiDraft?.articleId !== articleId) return;
  wikiDraft = null;
}

function confirmWikiEditorLeave() {
  if (!hasUnsavedWikiDraft()) return true;
  const leave = confirm("Есть несохраненные изменения в Wiki-статье. Если перейти дальше, они пропадут. Перейти без сохранения?");
  if (leave) clearWikiDraft();
  return leave;
}

function guardedWikiNavigation(action) {
  if (!confirmWikiEditorLeave()) return false;
  action();
  render();
  return true;
}

function selectWikiArticle(articleId, options = {}) {
  activeWikiId = articleId;
  activeWikiCategoryId = "";
  if (options.clearTag) activeWikiTag = "";
  if (options.clearCategorySearch !== false) wikiCategorySearchTerm = "";
  pendingWikiArticleScroll = true;
}

function scrollWikiArticleToTop() {
  if (!pendingWikiArticleScroll || currentView !== "wiki") return;
  pendingWikiArticleScroll = false;
  requestAnimationFrame(() => {
    const detail = document.querySelector(".wiki-layout > article.panel");
    const target = detail?.querySelector(".wiki-article-view") || detail;
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function wikiFormSnapshotFromArticle(article) {
  const categoryId = article.categoryId || categoryAliases[article.category] || wikiCategories[0]?.id || "places";
  const style = { ...defaultImageStyle(), ...(article.imageStyle ?? {}) };
  return {
    title: article.title || "",
    categoryId,
    tags: Array.isArray(article.tags) ? article.tags.join(", ") : String(article.tags ?? ""),
    public: Boolean(article.public),
    body: article.body || "",
    gmBody: article.gmBody || "",
    image: article.image || "",
    imageStyle: {
      aspect: style.aspect,
      fit: style.fit,
      x: Number(style.x),
      y: Number(style.y),
      zoom: Number(style.zoom),
    },
    npcStatProfile: normalizeNpcStatProfile(article.npcStatProfile),
  };
}

function wikiFormSnapshotSignature(snapshot) {
  return JSON.stringify({
    title: snapshot.title || "",
    categoryId: snapshot.categoryId || "",
    tags: snapshot.tags || "",
    public: Boolean(snapshot.public),
    body: snapshot.body || "",
    gmBody: snapshot.gmBody || "",
    image: snapshot.image || "",
    imageStyle: {
      aspect: snapshot.imageStyle?.aspect || "wide",
      fit: snapshot.imageStyle?.fit || "cover",
      x: Number(snapshot.imageStyle?.x ?? 50),
      y: Number(snapshot.imageStyle?.y ?? 50),
      zoom: Number(snapshot.imageStyle?.zoom ?? 1),
    },
    npcStatProfile: normalizeNpcStatProfile(snapshot.npcStatProfile),
  });
}

function rememberWikiDraft(articleId, baseSnapshot, snapshot) {
  const baseSignature = wikiFormSnapshotSignature(baseSnapshot);
  const currentSignature = wikiFormSnapshotSignature(snapshot);
  if (baseSignature === currentSignature) {
    clearWikiDraft(articleId);
    return;
  }
  wikiDraft = { articleId, dirty: true, values: snapshot, baseSignature };
}

function wikiDraftValuesFor(articleId) {
  return wikiDraft?.articleId === articleId ? wikiDraft.values : null;
}

function setAdminMode(value, options = {}) {
  isAdmin = value;
  adminBadge.classList.toggle("admin", value);
  if (!visibleWiki().some((item) => item.id === activeWikiId)) {
    activeWikiId = WIKI_INDEX_ID;
  }
  renderCharacterSelect();
  renderCloudStatus();
  if (options.renderView !== false) render();
}

function render() {
  const viewMap = {
    dashboard: renderDashboard,
    wiki: renderWiki,
    map: renderMap,
    directory: renderDirectory,
    settlements: renderSettlements,
    countries: renderCountries,
    items: renderItems,
    calendar: renderCalendar,
    sessions: renderSessions,
    characters: renderCharacters,
    gallery: renderGallery,
    quests: renderQuests,
    roller: renderRoller,
    "ashana-games": renderAshanaGames,
    minigame: renderMinigame,
    admin: renderAdmin,
  };

  if (!viewMap[currentView]) currentView = "dashboard";
  if (currentView === "map") captureActiveMapViewport();
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  if (activeMinigameCleanup) {
    activeMinigameCleanup();
    activeMinigameCleanup = null;
  }
  if (activeAshanaGameCleanup) {
    activeAshanaGameCleanup();
    activeAshanaGameCleanup = null;
  }
  viewRoot.innerHTML = "";
  if (currentView !== "map") activeMapElements = null;
  pendingMapMountRestore = null;
  const nextView = viewMap[currentView]();
  viewRoot.append(nextView);
  const restoreMountedMap = pendingMapMountRestore;
  pendingMapMountRestore = null;
  restoreMountedMap?.();
  scrollWikiArticleToTop();
  saveUiState();
}

function header(title, subtitle, action) {
  const wrap = el("div", "view-head");
  const copy = el("div");
  copy.append(el("p", "eyebrow", state.meta.currentDate), el("h2", "", title));
  if (subtitle) copy.append(el("p", "", subtitle));
  wrap.append(copy);
  if (action) wrap.append(action);
  return wrap;
}

function renderDashboard() {
  if (searchTerm.trim()) return renderGlobalSearch();

  const root = el("div");
  root.append(
    header(
      "Асхана",
      "Рабочий портал кампании: события, справочник, персонажи, задания и броски партии."
    )
  );

  const grid = el("div", "dashboard-grid");
  const hero = el("section", "world-panel");
  const heroContent = el("div", "world-panel-content");
  heroContent.append(
    el("p", "eyebrow", state.meta.currentRegion),
    el("h3", "", "Герои идут по следу Серого Тракта"),
    el(
      "p",
      "",
      "Текущая версия уже хранит данные кампании локально и открывает базовый режим мастера для редактирования."
    ),
    actionRow([
      button("Открыть задания", "primary-button", () => setView("quests")),
      button("Кинуть d20", "ghost-button", () => {
        setView("roller");
        setTimeout(() => rollFormula("1d20"), 0);
      }),
    ])
  );
  hero.append(heroContent);

  const side = el("section", "panel");
  side.append(
    el("h3", "", "Сводка"),
    metricGrid([
      ["Wiki", visibleWiki().length],
      ["Задания", visibleQuests().length],
      ["NPC", visibleNpcs().length],
      ["Фракции", visibleFactions().length],
      ["Поселения", visibleSettlements().length],
      ["Предметы", visibleItems().length],
      ["Сессии", visibleSessionLogs().length],
      ["События", visibleCalendarEvents().length],
      ["Персонажи", state.characters.length],
      ["Броски", state.rolls.length],
    ])
  );

  const recent = el("section", "panel");
  recent.append(el("h3", "", "Последние броски"));
  const logs = state.rolls.slice(0, 4);
  recent.append(logs.length ? rollLogList(logs) : el("div", "empty-state", "Бросков пока нет"));

  const column = el("div", "metric-grid-column");
  column.append(side, recent);
  grid.append(hero, column);

  const cards = el("div", "card-grid");
  visibleWiki()
    .slice(0, 4)
    .forEach((article) => {
      const card = el("article", "card");
      card.append(
        el("p", "eyebrow", article.category),
        el("h3", "", article.title),
        el("p", "", article.body.slice(0, 150) + "...")
      );
      card.addEventListener("click", () => {
        selectWikiArticle(article.id);
        setView("wiki");
      });
      cards.append(card);
    });

  root.append(grid, spacer(), cards);
  return root;
}

function renderGlobalSearch() {
  const query = searchTerm.trim();
  const root = el("div");
  const clear = button("Очистить поиск", "ghost-button", () => {
    clearSearchTerm();
    render();
  });
  root.append(header("Поиск", `Результаты по запросу "${query}" во всех открытых разделах Асханы.`, clear));

  const results = globalSearchResults(query);
  const panel = el("section", "panel global-search-panel");
  panel.append(
    el("p", "eyebrow", "Найдено"),
    el("h3", "", `${results.length} результатов`)
  );
  if (!results.length) {
    panel.append(el("div", "empty-state", "Ничего не найдено. Попробуй другое слово или проверь, не скрыта ли запись от игроков."));
    root.append(panel);
    return root;
  }

  const list = el("div", "global-search-list");
  results.forEach((result) => {
    const card = button("", "global-search-card", () => result.open());
    card.append(
      compactBadges([result.section, result.visibility]),
      el("strong", "", result.title),
      el("span", "", result.subtitle),
      el("p", "", result.excerpt)
    );
    list.append(card);
  });
  panel.append(list);
  root.append(panel);
  return root;
}

function globalSearchResults(query) {
  const needle = normalizeSearchQuery(query);
  if (!needle) return [];
  const results = [];
  const add = (section, title, subtitle, excerpt, haystack, open, visibility = "игрокам") => {
    if (!matchesSearch(haystack, needle)) return;
    results.push({ section, title, subtitle, excerpt: shortText(excerpt || subtitle || title, 230), open, visibility });
  };

  visibleWiki().forEach((article) => {
    add(
      "Wiki",
      article.title,
      article.category,
      article.body,
      [article.title, article.category, article.body, isAdmin ? article.gmBody : "", article.tags.join(" ")],
      () => openWikiArticle(article.id),
      article.public ? "игрокам" : "мастеру"
    );
  });

  visibleQuests().forEach((quest) => {
    add(
      "Задания",
      quest.title,
      `${questStatus(quest.status)} · ${quest.patron || "без заказчика"}`,
      quest.notes,
      [quest.title, quest.status, quest.patron, quest.reward, quest.linked, quest.notes, isAdmin ? quest.gmNotes : ""],
      () => openQuest(quest.id),
      quest.status === "hidden" ? "мастеру" : "игрокам"
    );
  });

  visibleNpcs().forEach((npc) => {
    add(
      "NPC",
      npc.name,
      [npc.role, npc.location].filter(Boolean).join(" · ") || "NPC",
      npc.description,
      [npc.name, npc.role, npc.location, npc.ancestry, npc.culture, npc.religion, npc.description, isAdmin ? npc.gmNotes : "", npc.tags.join(" ")],
      () => openNpc(npc.id),
      npc.public ? "игрокам" : "мастеру"
    );
  });

  visibleFactions().forEach((faction) => {
    add(
      "Фракции",
      faction.name,
      [factionTypeLabel(faction), faction.headquarters].filter(Boolean).join(" · ") || "Фракция",
      faction.description,
      [
        faction.name,
        factionTypeLabel(faction),
        faction.level,
        faction.leader,
        faction.headquarters,
        faction.description,
        faction.goals,
        faction.resources,
        faction.finances,
        faction.traits.map((trait) => `${trait.name} ${trait.description}`).join(" "),
        isAdmin ? faction.gmNotes : "",
        faction.tags.join(" "),
      ],
      () => openFaction(faction.id),
      faction.public ? "игрокам" : "мастеру"
    );
  });

  visibleSettlements().forEach((settlement) => {
    const searchableProblems = settlement.problems.filter((problem) => isAdmin || (problem.public && problem.status !== "hidden"));
    add(
      "Поселения",
      settlement.name,
      [optionLabel(settlementTypes, settlement.type), settlement.ruler].filter(Boolean).join(" · ") || "Поселение",
      settlement.description,
      [
        settlement.name,
        settlement.ruler,
        settlement.size,
        settlement.description,
        isAdmin ? settlement.gmNotes : "",
        settlement.tags.join(" "),
        settlement.buildings.map((item) => item.name).join(" "),
        settlement.armies.map((item) => `${item.name} ${item.description} ${item.tactics}`).join(" "),
        settlement.residents.map((item) => relationshipEntity(item.entityKey)?.name || "").join(" "),
        searchableProblems.map((item) => item.title).join(" "),
      ],
      () => {
        clearSearchTerm();
        openSettlement(settlement.id);
      },
      settlement.public ? "игрокам" : "мастеру"
    );
  });

  visibleItems().forEach((item) => {
    add(
      "Предметы",
      item.name,
      [optionLabel(uniqueItemCategories, item.category), optionLabel(uniqueItemTypes, item.type), item.ownerName || item.locationName].filter(Boolean).join(" · ") || "Уникальный предмет",
      item.description,
      [uniqueItemSearchText(item)],
      () => openItem(item.id),
      item.public ? "игрокам" : "мастеру"
    );
  });

  visibleCalendarEvents().forEach((event) => {
    add(
      "Календарь",
      event.title,
      `${formatAshanaDate(event.date)} · ${optionLabel(calendarEventTypes, event.type)}`,
      event.summary,
      [event.title, optionLabel(calendarEventTypes, event.type), formatAshanaDate(event.date), event.summary, isAdmin ? event.gmNotes : ""],
      () => {
        clearSearchTerm();
        activeCalendarDateKey = ashanaDateKey(event.date);
        setView("calendar");
      },
      event.public ? "игрокам" : "мастеру"
    );
  });

  visibleSessionLogs().forEach((session) => {
    add(
      "Журнал",
      `#${session.sessionNumber} ${session.title}`,
      formatAshanaDate(session.date),
      session.summary,
      [session.title, session.players, session.summary, session.decisions, session.loot, session.consequences, isAdmin ? session.gmNotes : ""],
      () => {
        clearSearchTerm();
        activeSessionId = session.id;
        setView("sessions");
      },
      session.public ? "игрокам" : "мастеру"
    );
  });

  state.characters.forEach((character) => {
    add(
      "Персонажи",
      character.name,
      [character.player, character.className].filter(Boolean).join(" · ") || "Персонаж",
      character.notes,
      [character.name, character.player, character.className, character.ancestry, character.homeland, character.culture, character.religion, character.deity, character.languages, character.notes, isAdmin ? character.gmNotes : ""],
      () => {
        clearSearchTerm();
        activeCharacterId = character.id;
        setView("characters");
      }
    );
  });

  state.gallery.forEach((item) => {
    add(
      "Галерея",
      item.title,
      [item.type, item.linked].filter(Boolean).join(" · ") || "Изображение",
      item.linked,
      [item.title, item.type, item.linked, (item.tags ?? []).join(" ")],
      () => {
        clearSearchTerm();
        setView("gallery");
      }
    );
  });

  visibleMapRegions().forEach((region) => {
    add(
      "Карты",
      region.title,
      region.type,
      region.description,
      [region.title, region.type, region.description],
      () => {
        clearSearchTerm();
        if (!setView("map")) return;
        selectMapRegion(region.id);
      },
      region.public ? "игрокам" : "мастеру"
    );
    Object.entries(region.hexes ?? {}).forEach(([key, hex]) => {
      if (!hex.visible && !isAdmin) return;
      add(
        isSquareRegion(region) ? "Клетки карты" : "Гексы",
        hex.title || `${isSquareRegion(region) ? "Клетка" : "Гекс"} ${key}`,
        `${region.title} · ${key}`,
        hex.notes || hex.features || hex.objectInfo || hex.objects?.join(", ") || [terrainSummary(hex), roadSummary(hex)].filter(Boolean).join(", "),
        [key, hex.title, terrainSummary(hex), roadSummary(hex), hex.notes, hex.features, hex.objectInfo, isAdmin ? hex.gmNotes : "", (hex.objects ?? []).join(" ")],
        () => {
          clearSearchTerm();
          state.map.activeRegionId = region.id;
          state.map.selectedHex = key;
          setView("map");
        },
        hex.visible ? "игрокам" : "мастеру"
      );
    });
  });

  return results.sort((a, b) => a.section.localeCompare(b.section, "ru") || a.title.localeCompare(b.title, "ru"));
}

function normalizeSearchQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesSearch(values, needle) {
  return normalizeSearchQuery(Array.isArray(values) ? values.filter(Boolean).join(" ") : values).includes(needle);
}

function shortText(value, limit = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function clearSearchTerm() {
  searchTerm = "";
  if (globalSearch) globalSearch.value = "";
}

function renderWiki() {
  const root = el("div");
  const action = isAdmin ? button("Новая статья", "primary-button", () => createWikiArticle()) : null;
  root.append(header("Wiki", "Мапа знаний Асханы: категории, теги, изображения и скрытые заметки мастера.", action));

  const articles = filterWikiArticles(visibleWiki());
  const active = articles.find((item) => item.id === activeWikiId);

  const layout = el("div", "wiki-layout");
  const list = el("aside", "panel list-panel");
  const indexButton = button("Мапа Wiki", "list-button", () => {
    guardedWikiNavigation(() => {
      activeWikiId = WIKI_INDEX_ID;
      activeWikiTag = "";
      activeWikiCategoryId = "";
    });
  });
  indexButton.classList.toggle("active", activeWikiId === WIKI_INDEX_ID && !activeWikiCategoryId);
  list.append(indexButton);

  list.append(el("p", "eyebrow", "Категории"));
  wikiCategories.forEach((category) => {
    const categoryButton = button(category.title, "list-button", () => {
      guardedWikiNavigation(() => {
        activeWikiCategoryId = category.id;
        activeWikiId = WIKI_INDEX_ID;
        wikiCategorySearchTerm = "";
      });
    });
    categoryButton.classList.toggle("active", activeWikiCategoryId === category.id);
    list.append(categoryButton);
  });

  list.append(el("p", "eyebrow", "Теги"));
  const tagPanel = el("div", "tag-row");
  allWikiTags().forEach((tagName) => {
    const tagButton = button(tagName, `tag tag-button ${activeWikiTag === tagName ? "active" : ""}`, () => {
      guardedWikiNavigation(() => {
        activeWikiTag = activeWikiTag === tagName ? "" : tagName;
        activeWikiId = WIKI_INDEX_ID;
        activeWikiCategoryId = "";
      });
    });
    attachTagTooltip(tagButton, tagName);
    tagPanel.append(tagButton);
  });
  list.append(tagPanel);

  list.append(el("p", "eyebrow", "Статьи"));
  articles.forEach((article) => {
    const item = button(article.title, "list-button", () => {
      guardedWikiNavigation(() => {
        selectWikiArticle(article.id, { clearCategorySearch: false });
      });
    });
    item.classList.toggle("active", article.id === activeWikiId);
    list.append(item);
  });

  const detail = el("article", "panel");
  if (activeWikiCategoryId) {
    detail.append(wikiCategoryPage(activeWikiCategoryId, articles));
  } else if (activeWikiId === WIKI_INDEX_ID) {
    detail.append(wikiIndex(articles));
  } else if (!active) {
    detail.append(el("div", "empty-state", "Нет записей по текущему поиску"));
  } else {
    detail.append(wikiArticleView(active));
    if (isAdmin) {
      detail.append(spacer(), wikiEditor(active));
    }
  }

  layout.append(list, detail);
  root.append(layout);
  return root;
}

function filterWikiArticles(articles) {
  return filterItems(
    activeWikiTag ? articles.filter((item) => item.tags.includes(activeWikiTag)) : articles,
    (item) => [item.title, item.category, item.body, item.gmBody, item.tags.join(" ")].join(" ")
  );
}

function wikiIndex(articles) {
  const root = el("div", "admin-stack");
  root.append(
    el("p", "eyebrow", activeWikiTag ? `тег: ${activeWikiTag}` : "главная"),
    el("h3", "", "Мапа знаний"),
    el("p", "", "Выбери блок, чтобы перейти к статьям. Скрытые записи видны только в режиме мастера.")
  );

  const grid = el("div", "wiki-category-grid");
  wikiCategories.forEach((category) => {
    const categoryArticles = articles.filter((article) => article.categoryId === category.id);
    const card = el("section", "wiki-category-card");
    card.append(
      el("div", "wiki-category-count", categoryArticles.length),
      el("h3", "", category.title),
      el("p", "", category.hint)
    );
    const links = el("div", "wiki-link-list");
    categoryArticles.slice(0, 6).forEach((article) => {
      links.append(button(article.title, "wiki-link", () => {
        guardedWikiNavigation(() => {
          selectWikiArticle(article.id);
        });
      }));
    });
    card.append(links.children.length ? links : el("p", "muted", "Пока нет статей"));
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      guardedWikiNavigation(() => {
        activeWikiCategoryId = category.id;
        activeWikiId = WIKI_INDEX_ID;
        wikiCategorySearchTerm = "";
      });
    });
    grid.append(card);
  });

  root.append(grid);
  return root;
}

function wikiCategoryPage(categoryId, articles) {
  const category = wikiCategories.find((item) => item.id === categoryId);
  const root = el("div", "admin-stack");
  const search = input(wikiCategorySearchTerm);
  search.placeholder = `Поиск в категории "${category?.title ?? ""}"`;
  const searchForm = el("form", "search-form");
  searchForm.append(search, button("Найти", "small-button", null, "submit"));
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    guardedWikiNavigation(() => {
      wikiCategorySearchTerm = search.value;
    });
  });

  const categoryArticles = articles
    .filter((article) => article.categoryId === categoryId)
    .filter((article) => {
      const text = [article.title, article.body, article.gmBody, article.tags.join(" ")].join(" ").toLowerCase();
      return text.includes(wikiCategorySearchTerm.toLowerCase());
    });

  root.append(
    el("p", "eyebrow", "категория"),
    el("h3", "", category?.title ?? "Категория"),
    el("p", "", category?.hint ?? ""),
    searchForm
  );

  const grid = el("div", "category-article-grid");
  categoryArticles.forEach((article) => {
    const card = el("article", "category-article-card");
    card.append(
      el("p", "eyebrow", article.public ? "игрокам" : "мастер"),
      el("h3", "", article.title),
      tags(article.tags),
      el("p", "", article.body.slice(0, 220) + (article.body.length > 220 ? "..." : ""))
    );
    card.addEventListener("click", () => {
      guardedWikiNavigation(() => {
        selectWikiArticle(article.id);
      });
    });
    grid.append(card);
  });
  root.append(categoryArticles.length ? grid : el("div", "empty-state", "В категории пока нет статей"));
  return root;
}

function wikiArticleView(active) {
  const root = el("div", "admin-stack wiki-article-view");
  const articleText = el("div", "wiki-article-text");
  articleText.append(
    el("p", "eyebrow", wikiCategoryTitle(active.categoryId)),
    el("h3", "", active.title),
    tags(active.tags.concat(active.public ? ["игрокам"] : ["мастер"])),
    el("div", "article-body", active.body)
  );
  if (active.image) {
    const articleMain = el("div", "wiki-article-main");
    articleMain.append(wikiImage(active, "wiki-article-image"), articleText);
    root.append(articleMain);
  } else {
    root.append(articleText);
  }
  if (isAdmin && active.gmBody) {
    const gm = el("div", "gm-note");
    gm.append(el("p", "eyebrow", "GM"), el("div", "article-body", active.gmBody));
    root.append(gm);
  }
  if (active.npcStatProfile?.kind !== "none") root.append(wikiNpcStatCalculator(active));
  if (active.related?.length) root.append(tags(active.related.map((id) => wikiById(id)?.title).filter(Boolean)));
  return root;
}

function abilityLabel(key) {
  return npcAbilityDefinitions.find(([abilityKey]) => abilityKey === key)?.[1] || key.toUpperCase();
}

function readNpcStatTransfer() {
  try {
    const value = JSON.parse(localStorage.getItem(NPC_STAT_TRANSFER_KEY) || "null");
    return value?.stats && typeof value.stats === "object" ? value : null;
  } catch {
    return null;
  }
}

function storeNpcStatTransfer(article, stats) {
  localStorage.setItem(NPC_STAT_TRANSFER_KEY, JSON.stringify({
    sourceArticleId: article.id,
    sourceTitle: article.title,
    stats,
    createdAt: new Date().toISOString(),
  }));
}

function wikiNpcStatCalculator(article) {
  const profile = normalizeNpcStatProfile(article.npcStatProfile);
  const root = el("section", "wiki-npc-calculator");
  root.append(
    el("p", "eyebrow", "Конструктор NPC"),
    el("h4", "", profile.kind === "monster" ? "Рассчитать характеристики монстра" : "Рассчитать характеристики представителя расы")
  );
  const arrays = profile.kind === "monster" ? monsterStatArrays : npcStatArrays;
  const layout = selectInput(Object.entries(arrays).map(([key, value]) => [key, value.label]), "adventurer");
  const flexibleAbility = selectInput(npcAbilityDefinitions.map(([key, label]) => [key, label]), "str");
  const flexibleWrap = labelWrap(`Куда добавить свободный +${profile.flexibleBonus}`, flexibleAbility);
  flexibleWrap.hidden = !profile.flexibleBonus || profile.kind !== "race";
  const assignments = {};
  const controls = el("div", "wiki-npc-calculator-controls");
  const results = el("div", "wiki-npc-stat-grid");

  const renderAssignments = () => {
    controls.replaceChildren();
    const values = arrays[layout.value].values;
    npcAbilityDefinitions.forEach(([key, label], index) => {
      const select = selectInput(values.map((value, valueIndex) => [
        `${valueIndex}`,
        profile.kind === "monster" ? signed(value) : String(value),
      ]), `${index}`);
      assignments[key] = select;
      select.addEventListener("change", () => {
        const selected = Object.values(assignments).map((control) => control.value);
        if (new Set(selected).size !== selected.length) select.setCustomValidity("Каждое значение раскладки можно использовать только один раз.");
        else Object.values(assignments).forEach((control) => control.setCustomValidity(""));
        renderResults();
      });
      controls.append(labelWrap(label, select));
    });
    renderResults();
  };

  const calculate = () => {
    const values = arrays[layout.value].values;
    return Object.fromEntries(npcAbilityDefinitions.map(([key]) => {
      const assigned = values[Number(assignments[key]?.value ?? 0)] || 0;
      if (profile.kind === "monster") return [key, Number(profile.baseStats[key] || 0) + assigned];
      const flexible = flexibleAbility.value === key ? profile.flexibleBonus : 0;
      return [key, assigned + Number(profile.modifiers[key] || 0) + flexible];
    }));
  };

  function renderResults() {
    const stats = calculate();
    results.replaceChildren(...npcAbilityDefinitions.map(([key, label]) => {
      const card = el("div", "wiki-npc-stat-card");
      card.append(el("span", "", label), el("strong", "", stats[key]), el("small", "", `мод. ${signed(statMod(stats[key]))}`));
      return card;
    }));
  }

  layout.addEventListener("change", renderAssignments);
  flexibleAbility.addEventListener("change", renderResults);
  const copyButton = button("Скопировать характеристики", "primary-button", async () => {
    const selected = Object.values(assignments).map((control) => control.value);
    if (new Set(selected).size !== selected.length) {
      alert("Распредели каждое значение раскладки только один раз.");
      return;
    }
    const stats = calculate();
    storeNpcStatTransfer(article, stats);
    const text = npcAbilityDefinitions.map(([key, label]) => `${label}: ${stats[key]}`).join("; ");
    try { await navigator.clipboard.writeText(text); } catch { /* Local transfer remains available. */ }
    copyButton.textContent = "Скопировано для NPC";
    setTimeout(() => { copyButton.textContent = "Скопировать характеристики"; }, 1800);
  });
  renderAssignments();
  root.append(
    el("p", "muted", profile.kind === "monster"
      ? "Базовые показатели берутся из статьи. Распредели корректировки раскладки между шестью характеристиками."
      : "Распредели шесть значений раскладки, затем будут применены расовые модификаторы."),
    labelWrap("Раскладка", layout),
    ...(profile.flexibleBonus && profile.kind === "race" ? [flexibleWrap] : []),
    controls,
    results,
    actionRow([copyButton])
  );
  return root;
}

function wikiImage(article, className) {
  const frame = el("div", className);
  const style = { ...defaultImageStyle(), ...(article.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  const img = document.createElement("img");
  img.src = article.image;
  img.alt = article.title;
  img.style.objectFit = style.fit;
  img.style.objectPosition = `${style.x}% ${style.y}%`;
  img.style.transform = `scale(${style.zoom})`;
  frame.append(img);
  return frame;
}

function allWikiTags() {
  return [...new Set(visibleWiki().flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b));
}

function createWikiArticle() {
  if (!confirmWikiEditorLeave()) return;
  const category = resolveWikiCategoryForNewArticle();
  if (!category) return;
  const article = normalizeWikiArticle({
    id: slug(`новая статья ${category.title}`),
    title: `Новая статья: ${category.title}`,
    category: category.title,
    categoryId: category.id,
    tags: ["новое"],
    image: "",
    public: true,
    body: "Описание для игроков.",
    gmBody: "Скрытые заметки мастера.",
  });
  state.wiki.unshift(article);
  selectWikiArticle(article.id, { clearTag: true });
  activeWikiTag = "";
  wikiCategorySearchTerm = "";
  searchTerm = "";
  if (globalSearch) globalSearch.value = "";
  saveState();
  render();
}

function resolveWikiCategoryForNewArticle() {
  if (activeWikiCategoryId) return wikiCategories.find((item) => item.id === activeWikiCategoryId);
  const activeArticle = state.wiki.find((item) => item.id === activeWikiId);
  if (activeArticle && activeWikiId !== WIKI_INDEX_ID) {
    return wikiCategories.find((item) => item.id === activeArticle.categoryId) ?? wikiCategories[0];
  }
  const list = wikiCategories.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  const answer = prompt(`В какой категории создать новую статью?\n\n${list}`, "1");
  if (answer === null) return null;
  const trimmed = answer.trim().toLowerCase();
  const byNumber = wikiCategories[Number(trimmed) - 1];
  if (byNumber) return byNumber;
  const byText = wikiCategories.find((item) => item.title.toLowerCase() === trimmed || item.id.toLowerCase() === trimmed);
  if (byText) return byText;
  alert("Категория не найдена. Введи номер из списка или точное название категории.");
  return null;
}

function wikiById(id) {
  return state.wiki.find((article) => article.id === id);
}

function wikiCategoryTitle(id) {
  return wikiCategories.find((category) => category.id === id)?.title ?? "Места";
}

function visibleMapRegions() {
  return state.map.regions.filter((region) => region.public || isAdmin);
}

function ensureActiveMapRegion() {
  const visibleRegions = visibleMapRegions();
  if (!visibleRegions.length) return null;
  if (!visibleRegions.some((region) => region.id === state.map.activeRegionId)) {
    state.map.activeRegionId = visibleRegions[0].id;
    state.map.selectedHex = "0,0";
  }
  return visibleRegions.find((region) => region.id === state.map.activeRegionId) ?? visibleRegions[0];
}

function selectMapRegion(regionId) {
  const region = visibleMapRegions().find((item) => item.id === regionId);
  if (!region) return;
  captureActiveMapViewport(true);
  state.map.activeRegionId = region.id;
  const targetView = mapViewForRegion(region.id);
  state.map.selectedHex = targetView.selectedHex;
  mapZoom = targetView.zoom;
  mapScroll = { ...targetView.map };
  mapPanelScroll = { ...targetView.panels };
  saveUiState();
  render();
}

function createMapRegion() {
  if (!isAdmin) return;
  const title = prompt("Название новой карты/слоя атласа", "Новая карта");
  if (title === null) return;
  const gridAnswer = prompt("Тип сетки: введи «гексы» для географии или «квадраты» для поселения", "гексы");
  if (gridAnswer === null) return;
  const gridType = gridAnswer.trim().toLowerCase().startsWith("квад") ? "square" : "hex";
  const region = normalizeMapRegions([
    {
      id: slug(title || "map"),
      title: title.trim() || "Новая карта",
      type: "Регион",
      description: `Новая карта атласа. Заполни описание и ${gridType === "square" ? "клетки" : "гексы"} в режиме мастера.`,
      public: false,
      image: "",
      mode: "canvas",
      gridType,
      grid: { cols: 18, rows: 12, hexSize: gridType === "square" ? 72 : 92, offsetX: 24, offsetY: 24 },
      hexes: {},
    },
  ])[0];
  state.map.regions.unshift(region);
  state.map.activeRegionId = region.id;
  state.map.selectedHex = "0,0";
  mapScroll = { left: 0, top: 0 };
  mapPanelScroll = { atlas: 0, inspector: 0 };
  mapViewByRegion[region.id] = normalizeMapViewEntry({
    zoom: 1,
    map: mapScroll,
    panels: mapPanelScroll,
    selectedHex: "0,0",
  });
  saveState();
  render();
}

function renderMap() {
  const root = el("div");
  const action = isAdmin ? button("Новая карта", "primary-button", () => createMapRegion()) : null;
  root.append(header("Карта", "Атлас кампании: общая карта, поселения, подземелья и скрытые мастерские слои.", action));

  const region = ensureActiveMapRegion();
  if (!region) {
    root.append(el("div", "empty-state", "Публичных карт пока нет."));
    return root;
  }
  const savedView = mapViewForRegion(region.id);
  mapZoom = savedView.zoom;
  mapScroll = { ...savedView.map };
  mapPanelScroll = { ...savedView.panels };
  const selected = getHex(region, state.map.selectedHex);
  const layout = el("div", "map-layout");
  layout.classList.add("is-restoring-scroll");
  const atlas = mapAtlasPanel(region);
  const stage = el("section", "hex-map-stage");
  let restoring = true;
  stage.addEventListener("scroll", () => {
    if (restoring) return;
    updateMapView(region.id, { map: { left: stage.scrollLeft, top: stage.scrollTop } }, true);
  });
  attachMapDragPan(stage, region);
  const viewport = el("div", "hex-map-viewport");
  const size = mapPixelSize(region);
  viewport.style.width = `${size.width}px`;
  viewport.style.height = `${size.height}px`;
  viewport.style.transform = `scale(${mapZoom})`;
  const image = el("div", "hex-map-image");
  image.style.backgroundImage = region.image ? `url("${region.image}")` : "";
  if (region.image) viewport.append(image);
  viewport.append(hexGrid(region));
  stage.append(mapZoomControls(), viewport);

  const panel = mapInspector(region, selected);
  atlas.addEventListener("scroll", () => {
    if (restoring) return;
    updateMapView(region.id, { panels: { atlas: atlas.scrollTop } }, true);
  });
  panel.addEventListener("scroll", () => {
    if (restoring) return;
    updateMapView(region.id, { panels: { inspector: panel.scrollTop } }, true);
  });

  layout.append(atlas, stage, panel);
  root.append(layout);
  activeMapElements = { regionId: region.id, stage, atlas, inspector: panel, restoring: true };
  pendingMapMountRestore = () => {
    restoreMapScroll(stage, atlas, panel, layout, savedView);
    restoring = false;
    if (activeMapElements?.regionId === region.id) activeMapElements.restoring = false;
  };
  return root;
}

function mapAtlasPanel(activeRegion) {
  const panel = el("aside", "panel map-atlas-panel");
  panel.append(
    el("p", "eyebrow", "Атлас"),
    el("h3", "", "Карты кампании"),
    el("p", "muted", isAdmin ? "Мастер видит все карты и может скрывать черновики от игроков." : "Показаны только открытые игрокам карты.")
  );

  const list = el("div", "map-atlas-list");
  visibleMapRegions().forEach((region) => {
    const item = button("", `map-atlas-card ${region.id === activeRegion.id ? "active" : ""}`, () => selectMapRegion(region.id));
    item.append(
      el("span", "map-atlas-type", region.type || "Регион"),
      el("strong", "", region.title),
      el("span", "map-atlas-description", region.description || "Без описания"),
      compactBadges([region.public ? "игрокам" : "скрыто", isSquareRegion(region) ? "квадраты" : "гексы", `${region.grid.cols}x${region.grid.rows}`])
    );
    list.append(item);
  });
  panel.append(list);
  if (isAdmin) {
    panel.append(actionRow([button("Добавить карту", "primary-button", () => createMapRegion())]));
  }
  return panel;
}

function mapInspector(region, selected) {
  const panel = el("aside", "map-inspector");
  const head = el("div", "map-inspector-head");
  head.append(
    el("p", "eyebrow", region.title),
    el("h3", "", selected.title || `${isSquareRegion(region) ? "Клетка" : "Гекс"} ${state.map.selectedHex}`),
    compactBadges([
      state.map.selectedHex,
      ...terrainValues(selected).map(terrainLabel),
      roadSummary(selected),
      ...ownershipBadges(selected),
      selected.visible ? "игрокам" : "скрыто",
    ])
  );

  const body = el("div", "map-inspector-body");
  if (isAdmin) body.append(mapBrushPanel(region));
  body.append(
    inspectorSection("Описание гекса", el("p", "", selected.notes || "Описание пока не заполнено.")),
    inspectorSection("Особенности гекса", el("p", "", selected.features || "Особенностей пока нет.")),
    inspectorSection("Информация об объектах", el("p", "", selected.objectInfo || "Подробной информации об объектах пока нет.")),
    inspectorSection("Значки", selected.markers?.length ? markerBadges(selected.markers) : el("p", "muted", "Значков пока нет")),
    inspectorSection("Владение", ownershipBadges(selected).length ? compactBadges(ownershipBadges(selected)) : el("p", "muted", "Гекс не закреплён за государством или фракцией")),
    inspectorSection("Объекты", selected.objects?.length ? compactBadges(selected.objects) : el("p", "muted", "Объектов пока нет")),
    inspectorSection("Связи", mapHexLinksPanel(region, selected)),
    inspectorSection("Вид карты", el("p", "muted", `Масштаб ${Math.round(mapZoom * 100)}%`))
  );
  if (isAdmin && selected.gmNotes) body.append(inspectorSection("GM", el("p", "", selected.gmNotes), "danger"));
  if (isAdmin) {
    body.append(inspectorSection(`Редактор ${isSquareRegion(region) ? "клетки" : "гекса"}`, hexEditor(region, state.map.selectedHex, selected), "editor"));
    body.append(inspectorSection("Настройки карты", regionEditor(region), "editor"));
  }

  panel.append(head, body);
  return panel;
}

function inspectorSection(title, content, tone = "") {
  const section = el("section", `inspector-section ${tone}`.trim());
  section.append(el("h4", "", title), content);
  return section;
}

function compactBadges(items) {
  const row = el("div", "compact-badges");
  items.filter(Boolean).forEach((item) => row.append(el("span", "compact-badge", item)));
  return row;
}

function markerBadges(markers) {
  const row = el("div", "compact-badges marker-badges");
  normalizeMapMarkers(markers).forEach((marker) => {
    const meta = mapMarkerMeta(marker.type);
    row.append(el("span", `compact-badge marker-badge marker-${marker.type}`, `${marker.icon || meta.icon} ${marker.label || meta.title}`));
  });
  return row;
}

function tagChip(tagName, className = "tag") {
  const clean = normalizeTagName(tagName);
  const chip = el("span", className, tagName);
  chip.dataset.tagName = clean;
  attachTagTooltip(chip, clean);
  return chip;
}

function attachTagTooltip(target, tagName) {
  target.addEventListener("mouseenter", (event) => scheduleTagTooltip(tagName, event.currentTarget));
  target.addEventListener("mouseleave", hideTagTooltip);
  target.addEventListener("focus", (event) => scheduleTagTooltip(tagName, event.currentTarget));
  target.addEventListener("blur", hideTagTooltip);
}

function scheduleTagTooltip(tagName, anchor) {
  hideTagTooltip();
  tagTooltipTimer = setTimeout(() => showTagTooltip(tagName, anchor), 700);
}

function showTagTooltip(tagName, anchor) {
  const meta = tagMetaByName(tagName);
  if (!meta || (!meta.public && !isAdmin)) return;
  const tooltip = el("div", "tag-tooltip");
  if (meta.image) {
    const style = { ...defaultImageStyle(), ...(meta.imageStyle ?? {}) };
    const frame = el("div", `tag-tooltip-image image-aspect-${style.aspect}`);
    const img = document.createElement("img");
    img.src = meta.image;
    img.alt = tagName;
    img.style.objectFit = style.fit;
    img.style.objectPosition = `${style.x}% ${style.y}%`;
    img.style.transform = `scale(${style.zoom}) rotate(${Number(style.rotation || 0)}deg)`;
    frame.append(img);
    tooltip.append(frame);
  }
  tooltip.append(
    el("p", "eyebrow", "Тег"),
    el("h4", "", tagName),
    el("p", "", meta.description || defaultTagDescription(tagName))
  );
  document.body.append(tooltip);
  const rect = anchor.getBoundingClientRect();
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - 12, rect.bottom + 10);
  const left = Math.min(window.innerWidth - tooltip.offsetWidth - 12, Math.max(12, rect.left));
  tooltip.style.top = `${Math.max(12, top)}px`;
  tooltip.style.left = `${left}px`;
  activeTagTooltip = tooltip;
}

function hideTagTooltip() {
  clearTimeout(tagTooltipTimer);
  tagTooltipTimer = null;
  activeTagTooltip?.remove();
  activeTagTooltip = null;
}

function tagMetaByName(tagName) {
  const clean = normalizeTagName(tagName);
  return state.tagMeta?.[clean] ?? normalizeTagMetaEntry(clean, {});
}

function registerTags(tagNames, promptForDetails = false) {
  if (!state.tagMeta) state.tagMeta = {};
  const created = [];
  tagNames.forEach((tagName) => {
    const clean = normalizeTagName(tagName);
    if (!clean || state.tagMeta[clean]) return;
    state.tagMeta[clean] = normalizeTagMetaEntry(clean, { createdAt: new Date().toISOString() });
    created.push(clean);
  });
  if (promptForDetails && isAdmin) {
    created.forEach((tagName) => {
      if (!confirm(`Новый тег "${tagName}" добавлен в справочник. Заполнить краткое описание сейчас?`)) return;
      const description = prompt(`Описание тега "${tagName}"`, state.tagMeta[tagName].description);
      if (description !== null) state.tagMeta[tagName].description = description.trim() || state.tagMeta[tagName].description;
    });
  }
  state.tagMeta = normalizeTagMeta(state.tagMeta);
  return created;
}

function linkedWikiArticles(hex) {
  const visibleIds = new Set(visibleWiki().map((article) => article.id));
  return (hex.wikiLinks ?? []).map((id) => wikiById(id)).filter((article) => article && visibleIds.has(article.id));
}

function linkedQuests(hex) {
  const visibleIds = new Set(visibleQuests().map((quest) => quest.id));
  return (hex.questLinks ?? []).map((id) => state.quests.find((quest) => quest.id === id)).filter((quest) => quest && visibleIds.has(quest.id));
}

function linkedMapRegions(hex) {
  const visibleIds = new Set(visibleMapRegions().map((region) => region.id));
  return (hex.mapLinks ?? []).map((id) => state.map.regions.find((region) => region.id === id)).filter((region) => region && visibleIds.has(region.id));
}

function mapHexLinksPanel(region, hex) {
  const links = el("div", "map-link-list");
  linkedWikiArticles(hex).forEach((article) => {
    links.append(button(`Wiki: ${article.title}`, "map-link-button", () => openWikiArticle(article.id)));
  });
  linkedQuests(hex).forEach((quest) => {
    links.append(button(`Задание: ${quest.title}`, "map-link-button", () => openQuest(quest.id)));
  });
  linkedMapRegions(hex)
    .filter((linkedRegion) => linkedRegion.id !== region.id)
    .forEach((linkedRegion) => {
      links.append(button(`Карта: ${linkedRegion.title}`, "map-link-button", () => selectMapRegion(linkedRegion.id)));
    });
  return links.children.length ? links : el("p", "muted", "Связей пока нет");
}

function openWikiArticle(articleId) {
  selectWikiArticle(articleId, { clearTag: true });
  activeWikiTag = "";
  wikiCategorySearchTerm = "";
  searchTerm = "";
  if (globalSearch) globalSearch.value = "";
  setView("wiki");
}

function openQuest(questId) {
  const quest = state.quests.find((item) => item.id === questId);
  searchTerm = quest?.title ?? "";
  if (globalSearch) globalSearch.value = searchTerm;
  setView("quests");
}

function restoreMapScroll(stage, atlas, inspector, layout, savedView) {
  const target = normalizeMapViewEntry(savedView);
  stage.scrollLeft = target.map.left;
  stage.scrollTop = target.map.top;
  if (atlas) atlas.scrollTop = target.panels.atlas;
  if (inspector) inspector.scrollTop = target.panels.inspector;
  layout?.classList.remove("is-restoring-scroll");
}

function attachMapDragPan(stage, region) {
  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".map-zoom-controls")) return;
    const cell = target?.closest(".hex-cell");
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: stage.scrollLeft,
      top: stage.scrollTop,
      cellKey: cell?.dataset.hexKey || "",
      moved: false,
    };
    stage.setPointerCapture?.(event.pointerId);
    stage.classList.add("is-dragging-map");
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    event.preventDefault();
    stage.scrollLeft = drag.left - dx;
    stage.scrollTop = drag.top - dy;
    updateMapView(region.id, { map: { left: stage.scrollLeft, top: stage.scrollTop } }, true);
  });
  const endDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      mapDragSuppressClickUntil = Date.now() + 180;
    } else if (drag.cellKey) {
      mapDragSuppressClickUntil = Date.now() + 180;
      handleMapCellInteraction(region, drag.cellKey);
    }
    stage.releasePointerCapture?.(event.pointerId);
    stage.classList.remove("is-dragging-map");
    drag = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const step = event.deltaY > 0 ? -0.12 : 0.12;
    setMapZoom(mapZoom + step, event);
  }, { passive: false });
}

function mapZoomControls() {
  const controls = el("div", "map-zoom-controls");
  controls.append(
    button("−", "icon-button", () => setMapZoom(mapZoom - 0.15)),
    el("span", "zoom-value", `${Math.round(mapZoom * 100)}%`),
    button("+", "icon-button", () => setMapZoom(mapZoom + 0.15)),
    button("1:1", "small-button", () => setMapZoom(1))
  );
  return controls;
}

function setMapZoom(value, anchorEvent = null) {
  const stage = activeMapElements?.stage;
  const regionId = state.map.activeRegionId;
  const oldZoom = mapZoom || 1;
  const nextZoom = Math.max(0.45, Math.min(2.8, value));
  if (Math.abs(nextZoom - oldZoom) < 0.001) return;
  let nextMapView = null;
  if (stage) {
    const rect = stage.getBoundingClientRect();
    const relX = anchorEvent ? anchorEvent.clientX - rect.left : rect.width / 2;
    const relY = anchorEvent ? anchorEvent.clientY - rect.top : rect.height / 2;
    const contentX = (stage.scrollLeft + relX) / oldZoom;
    const contentY = (stage.scrollTop + relY) / oldZoom;
    nextMapView = {
      left: Math.max(0, contentX * nextZoom - relX),
      top: Math.max(0, contentY * nextZoom - relY),
    };
  } else {
    captureActiveMapViewport();
  }
  mapZoom = nextZoom;
  updateMapView(regionId, nextMapView ? { zoom: mapZoom, map: nextMapView } : { zoom: mapZoom });
  saveUiState();
  render();
}

function activeMapRegion() {
  return ensureActiveMapRegion() ?? state.map.regions[0];
}

function getHex(region, key) {
  if (!region.hexes[key]) {
    region.hexes[key] = {
      title: "",
      terrain: "пусто",
      terrains: [],
      visible: true,
      notes: "",
      features: "",
      objectInfo: "",
      gmNotes: "",
      objects: [],
      markers: [],
      wikiLinks: [],
      questLinks: [],
      mapLinks: [],
      tileImage: "",
      tileFit: "cover",
      tilePresetId: "",
      tileScale: 1,
      tileX: 50,
      tileY: 50,
      tileRotation: 0,
      boundaryColor: "#d4a74f",
      boundaryStyle: "none",
      boundaryImage: "",
      boundarySides: [...hexBoundarySideIds],
      boundaryLayers: [],
      roadType: "road",
      roadSides: [],
      ...normalizeCountryEffects({}, { stateDomainSize: 1 }),
      mergeRoot: "",
      mergeWidth: 1,
      mergeHeight: 1,
    };
  }
  return region.hexes[key];
}

function applyMapBrush(region, cell) {
  if (mapBrushMode === "boundary") {
    cell.boundaryLayers = mapBrushBoundaryStyle === "none"
      ? []
      : [createBoundaryLayer({
        style: mapBrushBoundaryStyle,
        color: mapBrushBoundaryColor,
        image: mapBrushBoundaryStyle === "custom" ? mapBrushBoundaryImage : "",
        sides: mapBrushBoundaryMode === "custom"
          ? adaptBoundarySidesForRegion(region, mapBrushBoundarySides)
          : boundarySideIdsFor(region),
      })];
    syncLegacyBoundaryFields(cell);
  } else if (mapBrushMode === "road") {
    cell.roadType = normalizeRoadType(mapBrushRoadType);
    cell.roadSides = mapBrushRoadType === "none"
      ? []
      : adaptRoadSidesForRegion(region, mapBrushRoadSides);
  } else {
    cell.terrains = normalizeTerrains(mapBrushTerrains);
    cell.terrain = cell.terrains[0] || "пусто";
    const preset = resolveHexTilePreset(mapBrushTilePresetId);
    if (preset) {
      const transform = normalizeTileTransform(preset);
      cell.tileImage = preset.image;
      cell.tilePresetId = mapBrushTilePresetId;
      cell.tileFit = transform.fit;
      cell.tileScale = transform.scale;
      cell.tileX = transform.x;
      cell.tileY = transform.y;
      cell.tileRotation = transform.rotation;
    } else if (isPresetHexTile(cell.tileImage) || cell.tilePresetId) {
      cell.tileImage = "";
      cell.tilePresetId = "";
      cell.tileScale = 1;
      cell.tileX = 50;
      cell.tileY = 50;
      cell.tileRotation = 0;
    }
  }
}

function eraseMapBrushTarget(cell) {
  if (mapBrushMode === "boundary") {
    cell.boundaryLayers = [];
    syncLegacyBoundaryFields(cell);
  } else if (mapBrushMode === "road") {
    cell.roadSides = [];
  } else {
    cell.terrains = [];
    cell.terrain = "пусто";
    if (isPresetHexTile(cell.tileImage) || cell.tilePresetId) {
      cell.tileImage = "";
      cell.tilePresetId = "";
      cell.tileScale = 1;
      cell.tileX = 50;
      cell.tileY = 50;
      cell.tileRotation = 0;
    }
  }
}

function handleMapCellInteraction(region, key) {
  let campaignChanged = false;
  if (isAdmin && mapActiveTool === "brush") {
    applyMapBrush(region, getHex(region, key));
    campaignChanged = true;
  } else if (isAdmin && mapActiveTool === "eraser") {
    eraseMapBrushTarget(getHex(region, key));
    campaignChanged = true;
  }
  state.map.selectedHex = key;
  updateMapView(region.id, { selectedHex: key });
  if (campaignChanged) saveState();
  else saveUiState();
  render();
}

function hexGrid(region) {
  const squareGrid = isSquareRegion(region);
  const grid = el("div", `hex-grid ${squareGrid ? "square-grid" : ""}`);
  const { cols, rows, hexSize, offsetX, offsetY } = region.grid;
  const staggerOffset = Number(region.grid.staggerOffset || 0);
  const hexHeight = hexSize * 0.866;
  const { width: gridWidth, height: gridHeight } = mapPixelSize(region);
  grid.style.width = `${gridWidth}px`;
  grid.style.height = `${gridHeight}px`;
  for (let q = 0; q < cols; q += 1) {
    for (let r = 0; r < rows; r += 1) {
      const key = hexKey(q, r);
      const data = region.hexes[key];
      if (squareGrid && data?.mergeRoot && region.hexes[data.mergeRoot]) continue;
      const mergeWidth = squareGrid ? Math.max(1, Math.min(cols - q, Number(data?.mergeWidth) || 1)) : 1;
      const mergeHeight = squareGrid ? Math.max(1, Math.min(rows - r, Number(data?.mergeHeight) || 1)) : 1;
      const boundaryLayers = data ? normalizeBoundaryLayers(data.boundaryLayers, data) : [];
      const roadSides = data ? adaptRoadSidesForRegion(region, data.roadSides) : [];
      const markers = normalizeMapMarkers(data?.markers);
      const objectCount = data?.objects?.length ?? 0;
      const linkCount = (data?.wikiLinks?.length ?? 0) + (data?.questLinks?.length ?? 0) + (data?.mapLinks?.length ?? 0);
      const hasContent = Boolean(
        data &&
          (markers.length ||
            objectCount ||
            linkCount ||
            data.title ||
            data.notes ||
            data.gmNotes ||
            data.tileImage ||
            boundaryLayers.length ||
            roadSides.length ||
            terrainValues(data).length)
      );
      const ownerNames = ownershipBadges(data);
      const hex = button("", `hex-cell ${squareGrid ? "square-cell" : ""} ${mergeWidth > 1 || mergeHeight > 1 ? "merged-square-cell" : ""} ${hasContent ? "has-data" : ""} ${state.map.selectedHex === key ? "selected" : ""}`, () => {
        if (Date.now() < mapDragSuppressClickUntil) return;
        handleMapCellInteraction(region, key);
      });
      hex.dataset.hexKey = key;
      hex.title = data?.title || `${squareGrid ? "Клетка" : "Гекс"} ${key}`;
      if (ownerNames.length) hex.title += ` · Владение: ${ownerNames.join(", ")}`;
      if (squareGrid && (mergeWidth > 1 || mergeHeight > 1)) hex.title += ` · ${mergeWidth}×${mergeHeight}`;
      hex.style.width = `${squareGrid ? hexSize * mergeWidth : hexSize}px`;
      hex.style.height = `${squareGrid ? hexSize * mergeHeight : hexHeight}px`;
      hex.style.left = `${offsetX + q * hexSize * (squareGrid ? 1 : 0.75)}px`;
      const staggeredColumn = ((q + staggerOffset) % 2 + 2) % 2;
      hex.style.top = `${offsetY + (squareGrid ? r * hexSize : r * hexHeight + staggeredColumn * (hexHeight / 2))}px`;
      const surface = el("div", `hex-surface ${squareGrid ? "square-surface" : ""}`);
      const visualTerrain = primaryTerrain(data);
      if (visualTerrain) surface.dataset.terrain = visualTerrain;
      const strategyTerrains = terrainValues(data);
      if (strategyTerrains.length) surface.dataset.terrainTags = strategyTerrains.join(" ");
      const terrainImage = terrainTileFiles[visualTerrain];
      const tileSource = data?.tileImage || terrainImage;
      const presetTile = Boolean(terrainImage && !data?.tileImage) || isPresetHexTile(tileSource);
      const builtInTile = Boolean(terrainImage && !data?.tileImage) || (isBuiltInHexTile(tileSource) && !String(data?.tilePresetId || "").startsWith("custom:"));
      if (presetTile) surface.classList.add("has-terrain-art");
      if (tileSource) {
        const img = document.createElement("img");
        img.src = tileSource;
        img.alt = data.title || key;
        applyMapTileImageStyle(img, data || { tileFit: "cover" }, builtInTile);
        surface.append(img);
      }
      hex.append(surface);
      if (strategyTerrains.length) hex.append(terrainStrategyOverlay(strategyTerrains));
      if (roadSides.length) hex.append(roadOverlay(region, data));
      boundaryLayers.forEach((layer, index) => {
        const overlay = squareGrid
          ? squareBoundaryOverlay(layer, `${key}-${index}`)
          : hexBoundaryOverlay(layer, `${key}-${index}`);
        overlay.style.zIndex = String(3 + index);
        hex.append(overlay);
      });
      if (markers.length) hex.append(mapMarkersOverlay(markers));
      if (ownerNames.length) hex.append(mapOwnershipOverlay(data));
      grid.append(hex);
    }
  }
  return grid;
}

function terrainStrategyOverlay(terrains) {
  const row = el("div", "terrain-strategy-row");
  normalizeTerrains(terrains).slice(0, 4).forEach((terrain) => {
    const [tone, mark] = terrainStrategyMarks[terrain] || ["plain", terrainLabel(terrain).slice(0, 2).toUpperCase()];
    const item = el("span", `terrain-strategy-mark terrain-${tone}`, mark);
    item.title = terrainLabel(terrain);
    row.append(item);
  });
  return row;
}

function mapMarkersOverlay(markers) {
  const row = el("div", "hex-marker-row");
  normalizeMapMarkers(markers).slice(0, 4).forEach((marker) => {
    const meta = mapMarkerMeta(marker.type);
    const item = el("span", `hex-marker marker-${marker.type}`, marker.icon || meta.icon);
    item.title = marker.label || meta.title;
    row.append(item);
  });
  return row;
}

function mapPixelSize(region) {
  const { cols, rows, hexSize, offsetX, offsetY } = region.grid;
  if (isSquareRegion(region)) {
    return {
      width: offsetX + cols * hexSize + 80,
      height: offsetY + rows * hexSize + 80,
    };
  }
  const hexHeight = hexSize * 0.866;
  return {
    width: offsetX + cols * hexSize * 0.75 + hexSize + 80,
    height: offsetY + rows * hexHeight + hexHeight + 80,
  };
}

function mapBrushPanel(region) {
  const cellName = isSquareRegion(region) ? "клетки" : "гекса";
  const boundaryOptions = boundarySideOptionsFor(region);
  const panel = el("div", "brush-panel boundary-brush-panel");
  const toolButtons = el("div", "map-tool-row");
  [
    ["select", "Выбор"],
    ["brush", "Кисть"],
    ["eraser", "Ластик"],
  ].forEach(([tool, label]) => {
    toolButtons.append(button(label, `small-button ${mapActiveTool === tool ? "active" : ""}`, () => {
      mapActiveTool = tool;
      mapBrushEnabled = tool !== "select";
      saveUiState();
      render();
    }));
  });
  const mode = selectInput([
    ["terrain", "Местность"],
    ["road", "Дорожное сообщение"],
    ["boundary", `Контур ${cellName}`],
  ], mapBrushMode);
  mode.addEventListener("change", () => {
    mapBrushMode = mode.value;
    saveUiState();
    render();
  });
  const terrain = checkboxList(hexTerrains.filter(([value]) => value !== "пусто"), mapBrushTerrains);
  terrain.classList.add("terrain-checkbox-list");
  terrain.addEventListener("change", () => {
    mapBrushTerrains = normalizeTerrains(checkedValues(terrain));
    mapBrushTerrain = mapBrushTerrains[0] || "пусто";
    saveUiState();
  });
  if (mapBrushTilePresetId && !resolveHexTilePreset(mapBrushTilePresetId)) mapBrushTilePresetId = "";
  const tilePreset = selectInput(hexTileSelectOptions(mapBrushTilePresetId), mapBrushTilePresetId);
  tilePreset.addEventListener("change", () => {
    mapBrushTilePresetId = tilePreset.value;
    const preset = resolveHexTilePreset(mapBrushTilePresetId);
    if (preset?.terrains?.length) {
      mapBrushTerrains = normalizeTerrains(preset.terrains);
      mapBrushTerrain = mapBrushTerrains[0] || "пусто";
    }
    saveUiState();
    render();
  });
  const roadType = selectInput([
    ["none", "Убрать дорогу"],
    ...roadTypes,
  ], mapBrushRoadType);
  roadType.addEventListener("change", () => {
    mapBrushRoadType = roadType.value;
    saveUiState();
    render();
  });
  const roadSides = checkboxList(boundaryOptions, adaptRoadSidesForRegion(region, mapBrushRoadSides));
  roadSides.classList.add("hex-side-list");
  roadSides.addEventListener("change", () => {
    mapBrushRoadSides = checkedValues(roadSides);
    saveUiState();
  });
  const boundaryStyle = selectInput(hexBoundaryStyles, mapBrushBoundaryStyle);
  boundaryStyle.addEventListener("change", () => {
    mapBrushBoundaryStyle = boundaryStyle.value;
    saveUiState();
    render();
  });
  const boundaryColor = colorInput(mapBrushBoundaryColor);
  boundaryColor.addEventListener("input", () => {
    mapBrushBoundaryColor = boundaryColor.value;
    saveUiState();
  });
  const palette = boundaryColorPalette(boundaryColor, (color) => {
    mapBrushBoundaryColor = color;
    saveUiState();
  });
  const boundaryFile = document.createElement("input");
  boundaryFile.type = "file";
  boundaryFile.accept = "image/png,image/jpeg,image/webp,image/gif";
  const boundaryCoverage = selectInput([
    ["all", `Вся ${isSquareRegion(region) ? "клетка" : "граница гекса"}`],
    ["custom", "Выбрать грани"],
  ], mapBrushBoundaryMode);
  boundaryCoverage.addEventListener("change", () => {
    mapBrushBoundaryMode = boundaryCoverage.value;
    saveUiState();
    render();
  });
  const boundarySides = checkboxList(boundaryOptions, adaptBoundarySidesForRegion(region, mapBrushBoundarySides));
  boundarySides.classList.add("hex-side-list");
  const boundarySidesWrap = labelWrap(`Грани ${cellName}`, boundarySides);
  boundarySides.addEventListener("change", () => {
    mapBrushBoundarySides = checkedValues(boundarySides);
    saveUiState();
  });
  boundaryFile.addEventListener("change", async () => {
    const file = boundaryFile.files?.[0];
    if (!file) return;
    mapBrushBoundaryImage = await imageFileToUrl(file, "map-boundaries");
    mapBrushBoundaryStyle = "custom";
    saveUiState();
    render();
  });
  panel.append(labelWrap("Инструмент", toolButtons), labelWrap("Слой инструмента", mode));
  if (mapBrushMode === "boundary") {
    boundarySidesWrap.classList.toggle("is-hidden", mapBrushBoundaryMode !== "custom");
    panel.append(
      labelWrap("Вид контура", boundaryStyle),
      labelWrap("Цвет принадлежности", fragment([boundaryColor, palette])),
      labelWrap("Покрытие контура", boundaryCoverage)
    );
    panel.append(boundarySidesWrap);
    if (mapBrushBoundaryStyle === "custom") panel.append(labelWrap("Текстура контура", boundaryFile));
  } else if (mapBrushMode === "road") {
    panel.append(labelWrap("Действие", roadType));
    if (mapBrushRoadType !== "none") panel.append(labelWrap("Выходы дороги", roadSides));
  } else {
    panel.append(
      labelWrap("Виды местности", terrain),
      labelWrap("Визуальный типовой гекс", tilePreset),
      mapTilePresetLibraryPanel(region)
    );
  }
  const layerHint = mapBrushMode === "boundary"
    ? `контур ${cellName}`
    : mapBrushMode === "road"
      ? "дороги"
      : "местность";
  const hint = mapActiveTool === "select"
    ? "Выбор: клик по ячейке открывает ее детали. Карту можно таскать мышью за само полотно."
    : mapActiveTool === "eraser"
      ? `Ластик: клик по ячейке стирает выбранный слой (${layerHint}), не трогая остальные данные.`
      : mapBrushMode === "boundary"
        ? `Кисть: клик по ячейке меняет только контур ${cellName}. Картинка и местность сохраняются.`
        : mapBrushMode === "road"
          ? "Кисть: выбранные выходы соединяются через центр ячейки. Так создаются прямые дороги, повороты и перекрёстки."
          : "Кисть: клик по ячейке применяет выбранное сочетание видов местности. Первый выбранный тип задаёт подложку.";
  panel.append(el("p", "brush-hint", hint));
  return panel;
}

function mapTilePresetLibraryPanel(region) {
  const details = el("details", "map-tile-preset-library");
  const summary = el("summary", "", `Свои типовые ${isSquareRegion(region) ? "клетки" : "гексы"}`);
  const body = el("div", "map-tile-preset-library-body");
  const actions = actionRow([button("Новый типовой гекс", "ghost-button", () => openMapTilePresetDialog())]);
  const presets = customHexTilePresets();
  const grid = el("div", "map-tile-preset-grid");
  presets.forEach((preset) => {
    const card = el("article", "map-tile-preset-card");
    const preview = el("div", "map-preset-preview");
    const image = document.createElement("img");
    image.src = preset.image;
    image.alt = preset.name;
    applyMapTileImageStyle(image, preset, false);
    preview.append(image);
    const copy = el("div", "map-tile-preset-copy");
    copy.append(el("strong", "", preset.name), compactBadges(preset.terrains.map(terrainLabel)));
    const cardActions = actionRow([
      button("Выбрать", "small-button", () => {
        mapBrushTilePresetId = customHexTilePresetValue(preset.id);
        if (preset.terrains.length) {
          mapBrushTerrains = [...preset.terrains];
          mapBrushTerrain = mapBrushTerrains[0] || "пусто";
        }
        mapActiveTool = "brush";
        mapBrushMode = "terrain";
        saveUiState();
        render();
      }),
      button("Изменить", "ghost-button", () => openMapTilePresetDialog(preset.id)),
      button("Удалить", "ghost-button", () => deleteMapTilePreset(preset)),
    ]);
    card.append(preview, copy, cardActions);
    grid.append(card);
  });
  body.append(
    el("p", "muted", "Сохраняй собственные изображения с настроенным кадром. Пресет появится здесь, в редакторе ячейки и в кисти."),
    actions,
    presets.length ? grid : el("div", "empty-state compact-empty", "Своих типовых гексов пока нет.")
  );
  details.append(summary, body);
  return details;
}

function deleteMapTilePreset(preset) {
  if (!isAdmin || !confirm(`Удалить типовой гекс «${preset.name}»? Уже нанесённые изображения останутся на карте.`)) return;
  state.map.tilePresets = customHexTilePresets().filter((item) => item.id !== preset.id);
  if (mapBrushTilePresetId === customHexTilePresetValue(preset.id)) mapBrushTilePresetId = "";
  saveUiState();
  saveState();
  render();
}

function openMapTilePresetDialog(presetId = "") {
  if (!isAdmin) return;
  const existing = customHexTilePresets().find((item) => item.id === presetId);
  const draft = normalizeMapTilePreset(existing || { id: crypto.randomUUID(), name: "", image: "", terrains: [], fit: "cover", scale: 1, x: 50, y: 50, rotation: 0 });
  const { dialog, panel } = publicEntryDialog(
    existing ? "Редактировать типовой гекс" : "Новый типовой гекс",
    "Настрой изображение один раз, затем используй этот тип в кисти и в редакторе отдельных ячеек."
  );
  const form = el("form", "form-grid map-preset-editor-form");
  const name = input(existing?.name || "");
  name.required = true;
  name.placeholder = "Например: Красные горы";
  const terrains = checkboxList(hexTerrains.filter(([value]) => value !== "пусто"), draft.terrains);
  terrains.classList.add("terrain-checkbox-list", "map-preset-terrain-list");
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  const fit = selectInput([["cover", "Заполнить гекс"], ["contain", "Вписать целиком"]], draft.fit);
  const scale = rangeInput(draft.scale, 0.5, 3, 0.05);
  const posX = rangeInput(draft.x, 0, 100, 1);
  const posY = rangeInput(draft.y, 0, 100, 1);
  const rotation = rangeInput(draft.rotation, -180, 180, 1);
  const preview = el("div", "map-preset-preview map-preset-editor-preview");
  const previewImage = document.createElement("img");
  preview.append(previewImage);
  const scaleValue = el("span", "range-value");
  const posXValue = el("span", "range-value");
  const posYValue = el("span", "range-value");
  const rotationValue = el("span", "range-value");
  const refreshPreview = () => {
    previewImage.src = draft.image || "";
    draft.fit = fit.value;
    draft.scale = Number(scale.value);
    draft.x = Number(posX.value);
    draft.y = Number(posY.value);
    draft.rotation = Number(rotation.value);
    applyMapTileImageStyle(previewImage, draft, false);
    preview.classList.toggle("is-empty", !draft.image);
    scaleValue.textContent = `${Math.round(draft.scale * 100)}%`;
    posXValue.textContent = `${draft.x}%`;
    posYValue.textContent = `${draft.y}%`;
    rotationValue.textContent = `${draft.rotation}°`;
  };
  [fit, scale, posX, posY, rotation].forEach((control) => control.addEventListener("input", refreshPreview));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    draft.image = await imageFileToUrl(file, "map-presets");
    refreshPreview();
  });
  const submit = button(existing ? "Сохранить изменения" : "Создать типовой гекс", "primary-button", null, "submit");
  form.append(
    labelWrap("Название", name, "span-2"),
    labelWrap("Связанные виды местности", terrains, "span-2"),
    labelWrap("Изображение", imageInput, "span-2"),
    labelWrap("Предпросмотр", preview, "span-2"),
    labelWrap("Подгонка", fit),
    labelWrap("Масштаб", fragment([scale, scaleValue])),
    labelWrap("Позиция X", fragment([posX, posXValue])),
    labelWrap("Позиция Y", fragment([posY, posYValue])),
    labelWrap("Поворот", fragment([rotation, rotationValue]), "span-2"),
    actionRow([submit, button("Отмена", "ghost-button", () => dialog.close())], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!draft.image) {
      alert("Сначала выбери изображение для типового гекса.");
      return;
    }
    const next = normalizeMapTilePreset({
      ...draft,
      name: name.value,
      terrains: checkedValues(terrains),
      fit: fit.value,
      scale: Number(scale.value),
      x: Number(posX.value),
      y: Number(posY.value),
      rotation: Number(rotation.value),
      createdAt: existing?.createdAt || draft.createdAt,
    });
    state.map.tilePresets ??= [];
    const index = state.map.tilePresets.findIndex((item) => item.id === next.id);
    if (index >= 0) state.map.tilePresets[index] = next;
    else state.map.tilePresets.push(next);
    mapBrushTilePresetId = customHexTilePresetValue(next.id);
    if (next.terrains.length) {
      mapBrushTerrains = [...next.terrains];
      mapBrushTerrain = mapBrushTerrains[0] || "пусто";
    }
    saveUiState();
    saveState();
    dialog.close();
    render();
  });
  refreshPreview();
  panel.append(form);
}

function colorInput(value) {
  const control = document.createElement("input");
  control.type = "color";
  control.value = /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#d4a74f";
  return control;
}

function boundaryColorPalette(colorControl, onChange) {
  const palette = el("div", "boundary-color-palette");
  hexBoundaryColors.forEach((color) => {
    const swatch = button("", "boundary-color-swatch", () => {
      colorControl.value = color;
      onChange(color);
      palette.querySelectorAll(".boundary-color-swatch").forEach((item) => item.classList.toggle("active", item.dataset.color === color));
    });
    swatch.type = "button";
    swatch.title = `Выбрать цвет ${color}`;
    swatch.dataset.color = color;
    swatch.style.backgroundColor = color;
    swatch.classList.toggle("active", colorControl.value.toLowerCase() === color.toLowerCase());
    palette.append(swatch);
  });
  return palette;
}

function buildHexBoundaryPreview(data, key, region = null) {
  const squareGrid = isSquareRegion(region);
  const preview = el("div", "hex-preview-stack");
  preview.classList.toggle("square-preview-stack", squareGrid);
  preview.append(el("div", `hex-surface preview-surface ${squareGrid ? "square-surface" : ""}`));
  const layers = Array.isArray(data) ? data : normalizeBoundaryLayers(data.boundaryLayers, data);
  layers.forEach((layer, index) => {
    const overlay = squareGrid
      ? squareBoundaryOverlay(layer, `${key}-${index}`)
      : hexBoundaryOverlay(layer, `${key}-${index}`);
    overlay.style.zIndex = String(3 + index);
    preview.append(overlay);
  });
  return preview;
}

function hexBoundaryOverlay(data, key) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 86.6");
  svg.setAttribute("preserveAspectRatio", "none");
  const style = data.style || data.boundaryStyle || "solid";
  svg.classList.add("hex-boundary", `boundary-${style}`);
  svg.setAttribute("aria-hidden", "true");
  const points = [
    { x: 25, y: 0 },
    { x: 75, y: 0 },
    { x: 100, y: 43.3 },
    { x: 75, y: 86.6 },
    { x: 25, y: 86.6 },
    { x: 0, y: 43.3 },
  ];
  const sideIndexById = Object.fromEntries(hexBoundarySideIds.map((id, index) => [id, index]));
  const selectedSideIndexes = normalizeBoundarySides(data.sides || data.boundarySides)
    .map((id) => sideIndexById[id])
    .filter((index) => Number.isInteger(index));
  if (!selectedSideIndexes.length) return svg;
  const colorValue = data.color || data.boundaryColor || "";
  const color = /^#[0-9a-f]{6}$/i.test(colorValue) ? colorValue : "#d4a74f";
  const edgeLine = (start, end, className, stroke = color, scale = 1) => {
    const shape = document.createElementNS(ns, "line");
    const scaledStart = {
      x: 50 + (start.x - 50) * scale,
      y: 43.3 + (start.y - 43.3) * scale,
    };
    const scaledEnd = {
      x: 50 + (end.x - 50) * scale,
      y: 43.3 + (end.y - 43.3) * scale,
    };
    shape.setAttribute("x1", scaledStart.x);
    shape.setAttribute("y1", scaledStart.y);
    shape.setAttribute("x2", scaledEnd.x);
    shape.setAttribute("y2", scaledEnd.y);
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", stroke);
    shape.setAttribute("vector-effect", "non-scaling-stroke");
    shape.setAttribute("stroke-linejoin", "round");
    shape.setAttribute("stroke-linecap", "round");
    shape.classList.add(className);
    return shape;
  };
  const appendEdges = (className, stroke = color, scale = 1) => {
    selectedSideIndexes.forEach((index) => {
      svg.append(edgeLine(points[index], points[(index + 1) % points.length], className, stroke, scale));
    });
  };

  const boundaryImage = data.image || data.boundaryImage || "";
  if (style === "custom" && boundaryImage) {
    const defs = document.createElementNS(ns, "defs");
    const pattern = document.createElementNS(ns, "pattern");
    const patternId = `hex-boundary-${String(key).replace(/[^a-z0-9]/gi, "-")}-${Math.random().toString(36).slice(2)}`;
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "20");
    pattern.setAttribute("height", "20");
    const image = document.createElementNS(ns, "image");
    image.setAttribute("href", boundaryImage);
    image.setAttribute("width", "20");
    image.setAttribute("height", "20");
    image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    pattern.append(image);
    defs.append(pattern);
    svg.append(defs);
    appendEdges("boundary-custom-stroke", `url(#${patternId})`);
    return svg;
  }

  if (style === "double") {
    appendEdges("boundary-double-outer");
    appendEdges("boundary-double-inner", color, 0.9);
  } else if (style === "wall") {
    appendEdges("boundary-wall-base", "#171b1c");
    appendEdges("boundary-wall-top");
  } else if (style === "traps") {
    appendEdges("boundary-trap-base", "#171b1c");
    appendEdges("boundary-trap-marks");
  } else if (style === "runes") {
    appendEdges("boundary-rune-glow");
    appendEdges("boundary-rune-marks");
  } else {
    appendEdges("boundary-stroke");
  }
  return svg;
}

function squareBoundaryOverlay(data, key) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  const style = data.style || data.boundaryStyle || "solid";
  svg.classList.add("hex-boundary", "square-boundary", `boundary-${style}`);
  svg.setAttribute("aria-hidden", "true");
  const edges = {
    top: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    topRight: [{ x: 100, y: 0 }, { x: 100, y: 100 }],
    bottom: [{ x: 100, y: 100 }, { x: 0, y: 100 }],
    topLeft: [{ x: 0, y: 100 }, { x: 0, y: 0 }],
  };
  const sourceSides = normalizeBoundarySides(data.sides || data.boundarySides);
  const selectedSides = [
    sourceSides.includes("top") ? "top" : "",
    sourceSides.includes("topRight") || sourceSides.includes("bottomRight") ? "topRight" : "",
    sourceSides.includes("bottom") ? "bottom" : "",
    sourceSides.includes("topLeft") || sourceSides.includes("bottomLeft") ? "topLeft" : "",
  ].filter(Boolean);
  if (!selectedSides.length) return svg;
  const colorValue = data.color || data.boundaryColor || "";
  const color = /^#[0-9a-f]{6}$/i.test(colorValue) ? colorValue : "#d4a74f";
  const edgeLine = (start, end, className, stroke = color, scale = 1) => {
    const shape = document.createElementNS(ns, "line");
    const scalePoint = (point) => ({
      x: 50 + (point.x - 50) * scale,
      y: 50 + (point.y - 50) * scale,
    });
    const scaledStart = scalePoint(start);
    const scaledEnd = scalePoint(end);
    shape.setAttribute("x1", scaledStart.x);
    shape.setAttribute("y1", scaledStart.y);
    shape.setAttribute("x2", scaledEnd.x);
    shape.setAttribute("y2", scaledEnd.y);
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", stroke);
    shape.setAttribute("vector-effect", "non-scaling-stroke");
    shape.setAttribute("stroke-linejoin", "round");
    shape.setAttribute("stroke-linecap", "round");
    shape.classList.add(className);
    return shape;
  };
  const appendEdges = (className, stroke = color, scale = 1) => {
    selectedSides.forEach((side) => svg.append(edgeLine(edges[side][0], edges[side][1], className, stroke, scale)));
  };
  const boundaryImage = data.image || data.boundaryImage || "";
  if (style === "custom" && boundaryImage) {
    const defs = document.createElementNS(ns, "defs");
    const pattern = document.createElementNS(ns, "pattern");
    const patternId = `square-boundary-${String(key).replace(/[^a-z0-9]/gi, "-")}-${Math.random().toString(36).slice(2)}`;
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "20");
    pattern.setAttribute("height", "20");
    const image = document.createElementNS(ns, "image");
    image.setAttribute("href", boundaryImage);
    image.setAttribute("width", "20");
    image.setAttribute("height", "20");
    image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    pattern.append(image);
    defs.append(pattern);
    svg.append(defs);
    appendEdges("boundary-custom-stroke", `url(#${patternId})`);
    return svg;
  }
  if (style === "double") {
    appendEdges("boundary-double-outer");
    appendEdges("boundary-double-inner", color, 0.94);
  } else if (style === "wall") {
    appendEdges("boundary-wall-base", "#171b1c");
    appendEdges("boundary-wall-top");
  } else if (style === "traps") {
    appendEdges("boundary-trap-base", "#171b1c");
    appendEdges("boundary-trap-marks");
  } else if (style === "runes") {
    appendEdges("boundary-rune-glow");
    appendEdges("boundary-rune-marks");
  } else {
    appendEdges("boundary-stroke");
  }
  return svg;
}

function roadOverlay(region, data) {
  const ns = "http://www.w3.org/2000/svg";
  const squareGrid = isSquareRegion(region);
  const height = squareGrid ? 100 : 86.6;
  const center = { x: 50, y: height / 2 };
  const exits = squareGrid
    ? {
        top: { x: 50, y: 0 },
        topRight: { x: 100, y: 50 },
        bottom: { x: 50, y: 100 },
        topLeft: { x: 0, y: 50 },
      }
    : {
        top: { x: 50, y: 0 },
        topRight: { x: 87.5, y: 21.65 },
        bottomRight: { x: 87.5, y: 64.95 },
        bottom: { x: 50, y: 86.6 },
        bottomLeft: { x: 12.5, y: 64.95 },
        topLeft: { x: 12.5, y: 21.65 },
      };
  const roadType = normalizeRoadType(data?.roadType);
  const sides = adaptRoadSidesForRegion(region, data?.roadSides).filter((side) => exits[side]);
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 100 ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("cell-road", `road-${roadType}`);
  svg.setAttribute("aria-hidden", "true");
  const appendSegment = (end, className) => {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", center.x);
    line.setAttribute("y1", center.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.classList.add(className);
    svg.append(line);
  };
  sides.forEach((side) => appendSegment(exits[side], "road-shadow"));
  sides.forEach((side) => appendSegment(exits[side], "road-surface"));
  if (roadType === "highway") sides.forEach((side) => appendSegment(exits[side], "road-marking"));
  return svg;
}

function buildRoadPreview(region, roadType, roadSides) {
  const squareGrid = isSquareRegion(region);
  const preview = el("div", `hex-preview-stack ${squareGrid ? "square-preview-stack" : ""}`);
  preview.append(el("div", `hex-surface preview-surface ${squareGrid ? "square-surface" : ""}`));
  preview.append(roadOverlay(region, { roadType, roadSides }));
  return preview;
}

function hexKey(q, r) {
  return `${q},${r}`;
}

function parseMapCellKey(key) {
  const match = String(key || "").match(/^(-?\d+),(-?\d+)$/);
  return match ? { q: Number(match[1]), r: Number(match[2]) } : null;
}

function shiftedMapCellKey(key, deltaQ = 0, deltaR = 0) {
  const coordinates = parseMapCellKey(key);
  return coordinates ? hexKey(coordinates.q + deltaQ, coordinates.r + deltaR) : key;
}

function mapOwnershipOverlay(cell) {
  const row = el("div", "hex-ownership-row");
  normalizeOwnerIds(cell?.countryIds).slice(0, 3).forEach((id) => {
    const country = state.countries.find((item) => item.id === id);
    if (!country || (!isAdmin && !country.public)) return;
    const marker = el("span", "hex-owner-chip country-owner", "Г");
    marker.title = `Государство: ${country.name}`;
    row.append(marker);
  });
  normalizeOwnerIds(cell?.factionIds).slice(0, 3).forEach((id) => {
    const faction = factionById(id);
    if (!faction || (!isAdmin && !faction.public)) return;
    const marker = el("span", "hex-owner-chip faction-owner", "Ф");
    marker.title = `Фракция: ${faction.name}`;
    row.append(marker);
  });
  return row;
}

function countryHexRef(regionId, key) {
  return `${regionId}::${key}`;
}

function parseCountryHexRef(ref) {
  const separator = String(ref || "").lastIndexOf("::");
  if (separator < 1) return null;
  return {
    regionId: String(ref).slice(0, separator),
    key: String(ref).slice(separator + 2),
  };
}

function countryHexRecord(ref) {
  const parsed = parseCountryHexRef(ref);
  if (!parsed) return null;
  const region = state.map.regions.find((item) => item.id === parsed.regionId);
  if (!region || isSquareRegion(region) || !parseMapCellKey(parsed.key)) return null;
  const cell = region.hexes[parsed.key] || {};
  return {
    ref,
    region,
    key: parsed.key,
    cell,
    effects: normalizeCountryEffects(cell, { stateDomainSize: 1 }),
  };
}

function countryValidHexRecords(country) {
  return mapOwnershipRecords("country", country.id);
}

function mapOwnershipRecords(kind, ownerId) {
  const field = kind === "faction" ? "factionIds" : "countryIds";
  return state.map.regions
    .filter((region) => !isSquareRegion(region))
    .flatMap((region) => Object.entries(region.hexes ?? {})
      .filter(([, cell]) => normalizeOwnerIds(cell[field]).includes(ownerId))
      .map(([key]) => countryHexRecord(countryHexRef(region.id, key))))
    .filter(Boolean);
}

function syncCountryRefsFromMap() {
  state.countries.forEach((country) => {
    country.hexRefs = mapOwnershipRecords("country", country.id).map((record) => record.ref);
  });
}

function ownershipBadges(cell) {
  return [
    ...normalizeOwnerIds(cell?.countryIds)
      .map((id) => state.countries.find((item) => item.id === id))
      .filter((item) => item && (isAdmin || item.public))
      .map((item) => item.name),
    ...normalizeOwnerIds(cell?.factionIds)
      .map((id) => factionById(id))
      .filter((item) => item && (isAdmin || item.public))
      .map((item) => item.name),
  ];
}

function countryHexOptions() {
  return state.map.regions
    .filter((region) => !isSquareRegion(region))
    .flatMap((region) => {
      const options = [];
      for (let q = 0; q < Number(region.grid.cols || 0); q += 1) {
        for (let r = 0; r < Number(region.grid.rows || 0); r += 1) {
          const key = hexKey(q, r);
          const cell = region.hexes[key] || {};
          const title = cell.title ? ` · ${cell.title}` : "";
          options.push([
            countryHexRef(region.id, key),
            `${region.title} · гекс ${key}${title}`,
            `${terrainSummary(cell)} ${(cell.objects ?? []).join(" ")}`,
          ]);
        }
      }
      return options;
    });
}

function expandMapRegion(region, direction, requestedAmount) {
  if (!isAdmin || !region) return;
  const amount = Math.max(1, Math.min(50, Math.floor(Number(requestedAmount) || 1)));
  const horizontal = direction === "left" || direction === "right";
  const currentSize = horizontal ? Number(region.grid.cols) : Number(region.grid.rows);
  const appliedAmount = Math.min(amount, Math.max(0, 200 - currentSize));
  if (!appliedAmount) {
    alert("Достигнут предел карты: 200 клеток по одной стороне.");
    return;
  }

  captureActiveMapViewport();
  const shiftQ = direction === "left" ? appliedAmount : 0;
  const shiftR = direction === "top" ? appliedAmount : 0;
  if (shiftQ || shiftR) {
    region.hexes = Object.fromEntries(
      Object.entries(region.hexes ?? {}).map(([key, value]) => [
        shiftedMapCellKey(key, shiftQ, shiftR),
        {
          ...value,
          mergeRoot: value.mergeRoot ? shiftedMapCellKey(value.mergeRoot, shiftQ, shiftR) : "",
        },
      ])
    );
    state.countries.forEach((country) => {
      country.hexRefs = country.hexRefs.map((ref) => {
        const parsed = parseCountryHexRef(ref);
        if (!parsed || parsed.regionId !== region.id) return ref;
        return countryHexRef(region.id, shiftedMapCellKey(parsed.key, shiftQ, shiftR));
      });
    });
  }

  if (horizontal) region.grid.cols = currentSize + appliedAmount;
  else region.grid.rows = currentSize + appliedAmount;

  if (direction === "left" && !isSquareRegion(region)) {
    const currentStagger = Number(region.grid.staggerOffset || 0);
    region.grid.staggerOffset = ((currentStagger - appliedAmount) % 2 + 2) % 2;
  }

  const view = mapViewForRegion(region.id);
  const selectedHex = shiftedMapCellKey(view.selectedHex, shiftQ, shiftR);
  const nextMap = { ...view.map };
  if (direction === "left") {
    nextMap.left += appliedAmount * region.grid.hexSize * (isSquareRegion(region) ? 1 : 0.75) * view.zoom;
  }
  if (direction === "top") {
    nextMap.top += appliedAmount * region.grid.hexSize * (isSquareRegion(region) ? 1 : 0.866) * view.zoom;
  }
  updateMapView(region.id, { selectedHex, map: nextMap });
  if (state.map.activeRegionId === region.id) state.map.selectedHex = selectedHex;
  saveUiState();
  saveState();
  render();
}

function mapMarkerEditor(markers) {
  const wrap = el("div", "map-marker-editor");
  const list = el("div", "map-marker-editor-list");
  const addRow = (marker = {}) => {
    if (list.children.length >= 8) return;
    const meta = mapMarkerMeta(marker.type);
    const row = el("div", "map-marker-editor-row");
    const type = selectInput(mapMarkerTypes.map(([value, label]) => [value, label]), marker.type || "quest");
    const label = input(marker.label || meta.title);
    label.placeholder = "Подпись";
    const icon = input(marker.icon || meta.icon);
    icon.placeholder = "Знак";
    icon.maxLength = 3;
    type.addEventListener("change", () => {
      const nextMeta = mapMarkerMeta(type.value);
      if (!label.value.trim() || label.value === meta.title) label.value = nextMeta.title;
      if (!icon.value.trim() || icon.value === meta.icon) icon.value = nextMeta.icon;
    });
    row.append(type, label, icon, button("Убрать", "ghost-button", () => row.remove()));
    list.append(row);
  };
  markers.forEach(addRow);
  const addButton = button("Добавить значок", "ghost-button", () => addRow({ type: "quest" }));
  wrap.append(list, addButton);
  return wrap;
}

function readMapMarkerEditor(editor) {
  return [...editor.querySelectorAll(".map-marker-editor-row")]
    .map((row) => {
      const [type, label, icon] = row.querySelectorAll("select, input");
      const normalizedType = mapMarkerType(type?.value);
      const meta = mapMarkerMeta(normalizedType);
      const cleanLabel = label?.value.trim() || meta.title;
      const cleanIcon = icon?.value.trim().slice(0, 3) || meta.icon;
      return {
        id: slug("marker"),
        type: normalizedType,
        label: cleanLabel,
        icon: cleanIcon,
      };
    })
    .filter((marker) => marker.label || marker.icon)
    .slice(0, 8);
}

function hexEditor(region, key, data) {
  const form = el("form", "inspector-form");
  const squareGrid = isSquareRegion(region);
  const cellName = squareGrid ? "клетки" : "гекса";
  const boundaryOptions = boundarySideOptionsFor(region);
  const allBoundarySides = boundarySideIdsFor(region);
  const title = input(data.title);
  const terrains = checkboxList(hexTerrains.filter(([value]) => value !== "пусто"), terrainValues(data));
  terrains.classList.add("terrain-checkbox-list");
  const roadType = selectInput(roadTypes, normalizeRoadType(data.roadType));
  const roadSides = checkboxList(boundaryOptions, adaptRoadSidesForRegion(region, data.roadSides));
  roadSides.classList.add("hex-side-list");
  const roadPreview = el("div", "boundary-editor-preview road-editor-preview");
  const roadEditor = el("section", "road-editor span-2");
  const updateRoadPreview = () => {
    roadPreview.replaceChildren(buildRoadPreview(region, roadType.value, checkedValues(roadSides)));
  };
  roadType.addEventListener("change", updateRoadPreview);
  roadSides.addEventListener("change", updateRoadPreview);
  const clearRoadButton = button("Убрать дорогу", "ghost-button", () => {
    roadSides.querySelectorAll("input[type='checkbox']").forEach((box) => {
      box.checked = false;
    });
    updateRoadPreview();
  });
  const roadEditorHead = el("div", "road-editor-head");
  roadEditorHead.append(el("strong", "", "Дорожное сообщение"), clearRoadButton);
  roadEditor.append(
    roadEditorHead,
    labelWrap("Тип пути", roadType),
    labelWrap("Выходы через грани", roadSides),
    labelWrap("Предпросмотр", roadPreview)
  );
  updateRoadPreview();
  const visible = document.createElement("input");
  visible.type = "checkbox";
  visible.checked = data.visible;
  const notes = textarea(data.notes);
  const features = textarea(data.features || "");
  const objectInfo = textarea(data.objectInfo || "");
  const countryOwners = checkboxList(state.countries.map((country) => [country.id, country.name]), data.countryIds ?? []);
  const factionOwners = checkboxList(state.factions.map((faction) => [faction.id, faction.name]), data.factionIds ?? []);
  const gmNotes = textarea(data.gmNotes);
  const countryEffects = Object.fromEntries(countryMetricKeys.map((metricKey) => [
    metricKey,
    input(data[metricKey] ?? (metricKey === "stateDomainSize" ? 1 : 0)),
  ]));
  countryMetricKeys.forEach((metricKey) => {
    countryEffects[metricKey].type = "number";
    countryEffects[metricKey].step = "1";
  });
  const objects = textarea((data.objects ?? []).join("\n"));
  const markerRows = normalizeMapMarkers(data.markers);
  const markersEditor = mapMarkerEditor(markerRows);
  const wikiLinks = searchableCheckboxList(
    visibleWiki().map((article) => [article.id, article.title, `${article.category} ${article.tags?.join(" ") ?? ""} ${article.body ?? ""}`]),
    data.wikiLinks ?? [],
    mapWikiSearchTerm,
    (value) => {
      mapWikiSearchTerm = value;
      saveUiState();
    },
    "Поиск Wiki-статей"
  );
  const questLinks = checkboxList(
    visibleQuests().map((quest) => [quest.id, quest.title]),
    data.questLinks ?? []
  );
  const mapLinks = checkboxList(
    state.map.regions.filter((item) => item.id !== region.id).map((item) => [item.id, item.title]),
    data.mapLinks ?? []
  );
  let tileImage = data.tileImage || "";
  let tilePresetValue = data.tilePresetId || (isBuiltInHexTile(tileImage) ? tileImage : tileImage || "");
  const tileFit = selectInput([
    ["cover", `Обрезать по ${squareGrid ? "клетке" : "гексу"}`],
    ["contain", "Вписать целиком"],
  ], data.tileFit || "cover");
  const tileScale = rangeInput(data.tileScale ?? 1, 0.5, 3, 0.05);
  const tileX = rangeInput(data.tileX ?? 50, 0, 100, 1);
  const tileY = rangeInput(data.tileY ?? 50, 0, 100, 1);
  const tileRotation = rangeInput(data.tileRotation ?? 0, -180, 180, 1);
  const tileScaleValue = el("span", "range-value");
  const tileXValue = el("span", "range-value");
  const tileYValue = el("span", "range-value");
  const tileRotationValue = el("span", "range-value");
  const tilePreset = selectInput(hexTileSelectOptions(tilePresetValue, tileImage), tilePresetValue);
  const tileInput = document.createElement("input");
  tileInput.type = "file";
  tileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  const tilePreview = el("div", "hex-tile-preview");
  tilePreview.classList.toggle("square-tile-preview", squareGrid);
  const tilePreviewImg = document.createElement("img");
  tilePreview.append(tilePreviewImg);
  function updateTilePreview() {
    const builtInTile = isBuiltInHexTile(tileImage) && !tilePresetValue.startsWith("custom:");
    tilePreviewImg.src = tileImage || "";
    applyMapTileImageStyle(tilePreviewImg, {
      fit: tileFit.value,
      scale: Number(tileScale.value),
      x: Number(tileX.value),
      y: Number(tileY.value),
      rotation: Number(tileRotation.value),
    }, builtInTile);
    tileScaleValue.textContent = `${Math.round(Number(tileScale.value) * 100)}%`;
    tileXValue.textContent = `${tileX.value}%`;
    tileYValue.textContent = `${tileY.value}%`;
    tileRotationValue.textContent = `${tileRotation.value}°`;
  }
  tilePreset.addEventListener("change", () => {
    tilePresetValue = tilePreset.value;
    const preset = resolveHexTilePreset(tilePresetValue);
    if (preset) {
      const transform = normalizeTileTransform(preset);
      tileImage = preset.image;
      tileFit.value = transform.fit;
      tileScale.value = transform.scale;
      tileX.value = transform.x;
      tileY.value = transform.y;
      tileRotation.value = transform.rotation;
      if (preset.terrains?.length) {
        const selected = new Set(preset.terrains);
        terrains.querySelectorAll('input[type="checkbox"]').forEach((control) => {
          control.checked = selected.has(control.value);
        });
      }
    } else if (!tilePresetValue) {
      tileImage = "";
    } else {
      tileImage = tilePresetValue;
    }
    updateTilePreview();
  });
  terrains.addEventListener("change", () => {
    if (!isBuiltInHexTile(tileImage) || tilePresetValue.startsWith("custom:")) return;
    const nextTerrain = normalizeTerrains(checkedValues(terrains))[0] || "";
    tileImage = terrainTileFiles[nextTerrain] || "";
    tilePresetValue = isBuiltInHexTile(tileImage) ? tileImage : "";
    tilePreset.value = tilePresetValue;
    updateTilePreview();
  });
  [tileFit, tileScale, tileX, tileY, tileRotation].forEach((control) => control.addEventListener("input", updateTilePreview));
  tileInput.addEventListener("change", async () => {
    const file = tileInput.files?.[0];
    if (!file) return;
    tileImage = await imageFileToUrl(file, "map-hexes");
    tilePresetValue = tileImage;
    tilePreset.replaceChildren(...hexTileSelectOptions(tilePresetValue, tileImage).map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === tilePresetValue;
      return option;
    }));
    updateTilePreview();
  });
  updateTilePreview();
  const boundaryLayers = normalizeBoundaryLayers(data.boundaryLayers, data).map((layer) => ({
    ...layer,
    sides: adaptBoundarySidesForRegion(region, layer.sides),
  }));
  const boundaryLayersList = el("div", "boundary-layer-list span-2");
  const boundaryCombinedPreview = el("div", "boundary-editor-preview");
  const boundaryCombinedWrap = labelWrap("Итоговый контур", boundaryCombinedPreview, "span-2");
  const addBoundaryLayerButton = button("Добавить новый слой", "ghost-button", () => {
    if (boundaryLayers.length >= 6) return;
    boundaryLayers.push(createBoundaryLayer());
    renderBoundaryLayers();
  });
  const addBoundaryLayerWrap = actionRow([addBoundaryLayerButton], "span-2");
  const syncBoundaryLayerCards = () => {
    boundaryCombinedPreview.replaceChildren(buildHexBoundaryPreview(boundaryLayers, `combined-${key}`, region));
    addBoundaryLayerButton.disabled = boundaryLayers.length >= 6;
    addBoundaryLayerButton.textContent = boundaryLayers.length >= 6 ? "Лимит слоев достигнут" : "Добавить новый слой";
  };
  const createBoundaryLayerCard = (layer, index) => {
    const card = el("section", "boundary-layer-card");
    const header = el("div", "boundary-layer-card-head");
    header.append(el("strong", "", `Слой ${index + 1}`));
    header.append(button("Удалить", "ghost-button", () => {
      const layerIndex = boundaryLayers.findIndex((item) => item.id === layer.id);
      if (layerIndex === -1) return;
      boundaryLayers.splice(layerIndex, 1);
      renderBoundaryLayers();
    }));
    const style = selectInput(hexBoundaryStyles.filter(([value]) => value !== "none"), layer.style);
    const color = colorInput(layer.color);
    const palette = boundaryColorPalette(color, (value) => {
      layer.color = value;
      updatePreview();
    });
    const coverage = selectInput([
      ["all", squareGrid ? "Вся клетка" : "Весь гекс"],
      ["custom", "Выбрать грани"],
    ], allBoundarySides.every((side) => layer.sides.includes(side)) ? "all" : "custom");
    const sides = checkboxList(boundaryOptions, layer.sides);
    sides.classList.add("hex-side-list");
    const sidesWrap = labelWrap(`Грани ${cellName}`, sides, "span-2");
    const imageInput = document.createElement("input");
    imageInput.type = "file";
    imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    const preview = el("div", "boundary-editor-preview");
    const imageWrap = labelWrap("Своя текстура контура", fragment([imageInput, preview]), "span-2");
    const updatePreview = () => {
      layer.style = style.value;
      layer.color = color.value;
      layer.sides = coverage.value === "all" ? [...allBoundarySides] : checkedValues(sides);
      if (!layer.sides.length) layer.sides = [allBoundarySides[0]];
      sidesWrap.classList.toggle("is-hidden", coverage.value !== "custom");
      imageWrap.classList.toggle("is-hidden", style.value !== "custom");
      preview.replaceChildren(buildHexBoundaryPreview([layer], `layer-${key}-${layer.id}`, region));
      syncBoundaryLayerCards();
    };
    style.addEventListener("change", updatePreview);
    color.addEventListener("input", updatePreview);
    palette.addEventListener("click", () => requestAnimationFrame(updatePreview));
    coverage.addEventListener("change", updatePreview);
    sides.addEventListener("change", updatePreview);
    imageInput.addEventListener("change", async () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      layer.image = await imageFileToUrl(file, "map-boundaries");
      style.value = "custom";
      updatePreview();
    });
    card.append(
      header,
      labelWrap(`Контур ${cellName}`, style),
      labelWrap("Цвет принадлежности", fragment([color, palette])),
      labelWrap("Покрытие контура", coverage),
      sidesWrap,
      imageWrap
    );
    updatePreview();
    return card;
  };
  function renderBoundaryLayers() {
    boundaryLayersList.replaceChildren();
    if (!boundaryLayers.length) {
      boundaryLayersList.append(el("p", "muted", `Контуров пока нет. Добавь слой, чтобы выделить ${squareGrid ? "клетку" : "гекс"}.`));
    } else {
      boundaryLayers.forEach((layer, index) => boundaryLayersList.append(createBoundaryLayerCard(layer, index)));
    }
    syncBoundaryLayerCards();
  }
  renderBoundaryLayers();
  const mergeEditor = squareGrid ? squareMergeEditor(region, key, data) : "";
  form.append(
    labelWrap("Название", title),
    labelWrap("Виды местности", terrains),
    checkboxWrap("Видно игрокам", visible),
    labelWrap("Типовой тайл", tilePreset),
    labelWrap(`Картинка ${cellName}`, fragment([tileInput, tilePreview])),
    labelWrap("Подгонка картинки", tileFit),
    labelWrap("Масштаб картинки", fragment([tileScale, tileScaleValue])),
    labelWrap("Позиция X", fragment([tileX, tileXValue])),
    labelWrap("Позиция Y", fragment([tileY, tileYValue])),
    labelWrap("Поворот", fragment([tileRotation, tileRotationValue]), "span-2"),
    actionRow([button("Создать типовой гекс", "ghost-button", () => openMapTilePresetDialog())], "span-2"),
    mergeEditor,
    roadEditor,
    boundaryLayersList,
    addBoundaryLayerWrap,
    boundaryCombinedWrap,
    el("h4", "span-2 settlement-editor-heading", "Вклад гекса в показатели государства"),
    ...countryMetricDefinitions.map(([metricKey, label]) => labelWrap(label, countryEffects[metricKey])),
    ...(!squareGrid ? [
      el("h4", "span-2 settlement-editor-heading", "Территориальная принадлежность"),
      labelWrap("Государства-владельцы", countryOwners, "span-2"),
      labelWrap("Фракции-владельцы", factionOwners, "span-2"),
    ] : []),
    labelWrap("Объекты, по одному на строку", objects),
    labelWrap("Описание гекса", notes, "span-2"),
    labelWrap("Особенности гекса", features, "span-2"),
    labelWrap("Информация об объектах", objectInfo, "span-2"),
    labelWrap("Значки на карте", markersEditor, "span-2"),
    labelWrap("Связанные Wiki-статьи", wikiLinks),
    labelWrap("Связанные задания", questLinks),
    labelWrap("Переходы на карты", mapLinks),
    labelWrap("GM-заметки", gmNotes, "span-2"),
    actionRow([
      button(`Сохранить ${squareGrid ? "клетку" : "гекс"}`, "primary-button", null, "submit"),
      button("Убрать картинку", "ghost-button", () => {
        tileImage = "";
        tilePresetValue = "";
        tilePreset.value = "";
        updateTilePreview();
      }),
      button(`Очистить ${squareGrid ? "клетку" : "гекс"}`, "ghost-button", () => {
        if (!confirm(`Очистить ${squareGrid ? "клетку" : "гекс"} ${key}?`)) return;
        if (squareGrid) unmergeSquareCells(region, key, false);
        delete region.hexes[key];
        syncCountryRefsFromMap();
        saveState();
        render();
      }),
    ])
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedTerrains = normalizeTerrains(checkedValues(terrains));
    const nextHex = {
      title: title.value,
      terrain: selectedTerrains[0] || "пусто",
      terrains: selectedTerrains,
      visible: visible.checked,
      notes: notes.value,
      features: features.value,
      objectInfo: objectInfo.value,
      countryIds: squareGrid ? [] : checkedValues(countryOwners),
      factionIds: squareGrid ? [] : checkedValues(factionOwners),
      gmNotes: gmNotes.value,
      objects: objects.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      markers: readMapMarkerEditor(markersEditor),
      wikiLinks: checkedValues(wikiLinks),
      questLinks: checkedValues(questLinks),
      mapLinks: checkedValues(mapLinks),
      ...Object.fromEntries(countryMetricKeys.map((metricKey) => [metricKey, Number(countryEffects[metricKey].value || 0)])),
      tileImage,
      tileFit: tileFit.value,
      tilePresetId: resolveHexTilePreset(tilePresetValue) ? tilePresetValue : "",
      tileScale: Number(tileScale.value),
      tileX: Number(tileX.value),
      tileY: Number(tileY.value),
      tileRotation: Number(tileRotation.value),
      roadType: normalizeRoadType(roadType.value),
      roadSides: checkedValues(roadSides),
      mergeRoot: squareGrid ? String(data.mergeRoot || "") : "",
      mergeWidth: squareGrid ? Math.max(1, Number(data.mergeWidth) || 1) : 1,
      mergeHeight: squareGrid ? Math.max(1, Number(data.mergeHeight) || 1) : 1,
    };
    nextHex.boundaryLayers = boundaryLayers.map((layer) => normalizeBoundaryLayer(layer));
    syncLegacyBoundaryFields(nextHex);
    region.hexes[key] = nextHex;
    syncCountryRefsFromMap();
    saveState();
    render();
  });
  return form;
}

function deleteMapRegion(region) {
  if (!isAdmin) return;
  if (state.map.regions.length <= 1) {
    alert("Нельзя удалить последнюю карту атласа.");
    return;
  }
  if (!confirm(`Удалить карту "${region.title}"? Это удалит все ячейки и заметки этой карты.`)) return;
  state.map.regions = state.map.regions.filter((item) => item.id !== region.id);
  state.countries.forEach((country) => {
    country.hexRefs = country.hexRefs.filter((ref) => parseCountryHexRef(ref)?.regionId !== region.id);
  });
  delete mapViewByRegion[region.id];
  const nextRegion = visibleMapRegions()[0] ?? state.map.regions[0];
  state.map.activeRegionId = nextRegion?.id ?? "";
  const nextView = nextRegion ? mapViewForRegion(nextRegion.id) : normalizeMapViewEntry();
  state.map.selectedHex = nextView.selectedHex;
  mapZoom = nextView.zoom;
  mapScroll = { ...nextView.map };
  mapPanelScroll = { ...nextView.panels };
  saveState();
  render();
}

function regionEditor(region) {
  const form = el("form", "inspector-form compact");
  const title = input(region.title);
  const type = selectInput(mapTypes, region.type || "Регион");
  const gridType = selectInput([
    ["hex", "Гексагональная — регионы и путешествия"],
    ["square", "Квадратная — поселения и здания"],
  ], isSquareRegion(region) ? "square" : "hex");
  const description = textarea(region.description || "");
  const isPublic = document.createElement("input");
  isPublic.type = "checkbox";
  isPublic.checked = region.public;
  const cols = input(region.grid.cols);
  const rows = input(region.grid.rows);
  cols.type = "number";
  rows.type = "number";
  cols.readOnly = true;
  rows.readOnly = true;
  const expandAmount = input(1);
  expandAmount.type = "number";
  expandAmount.min = "1";
  expandAmount.max = "50";
  expandAmount.step = "1";
  const expandControls = el("div", "map-expand-controls span-2");
  const expandDirections = el("div", "map-expand-directions");
  [
    ["top", "↑ Сверху"],
    ["right", "Справа →"],
    ["bottom", "↓ Снизу"],
    ["left", "← Слева"],
  ].forEach(([direction, label]) => {
    expandDirections.append(button(label, "small-button", () => expandMapRegion(region, direction, expandAmount.value)));
  });
  expandControls.append(
    labelWrap("Сколько клеток добавить", expandAmount),
    expandDirections,
    el("p", "muted", "Выберите сторону расширения. Существующие клетки и их содержимое сохранятся.")
  );
  const hexSize = input(region.grid.hexSize);
  const offsetX = input(region.grid.offsetX);
  const offsetY = input(region.grid.offsetY);
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    region.image = await imageFileToUrl(file, "maps");
    saveState();
    render();
  });
  form.append(
    labelWrap("Название карты", title),
    labelWrap("Тип карты", type),
    labelWrap("Тип сетки", gridType),
    checkboxWrap("Видно игрокам", isPublic),
    labelWrap("Описание в атласе", description, "span-2"),
    labelWrap("Колонки", cols),
    labelWrap("Ряды", rows),
    expandControls,
    labelWrap("Размер ячейки", hexSize),
    labelWrap("Сдвиг X", offsetX),
    labelWrap("Сдвиг Y", offsetY),
    labelWrap("Фоновая подложка", imageInput, "span-2"),
    actionRow([
      button("Сохранить карту", "primary-button", null, "submit"),
      button("Очистить фон", "ghost-button", () => {
        region.image = "";
        saveState();
        render();
      }),
      button("Удалить карту", "ghost-button", () => deleteMapRegion(region)),
    ])
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    region.title = title.value;
    region.type = type.value;
    region.gridType = gridType.value;
    region.description = description.value;
    region.public = isPublic.checked;
    region.grid = {
      cols: Number(cols.value),
      rows: Number(rows.value),
      hexSize: Number(hexSize.value),
      offsetX: Number(offsetX.value),
      offsetY: Number(offsetY.value),
      staggerOffset: Number(region.grid.staggerOffset || 0),
    };
    saveState();
    render();
  });
  return form;
}

function mapSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 680");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.innerHTML = `
    <defs>
      <linearGradient id="land" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#d2ad63"/>
        <stop offset=".45" stop-color="#789b88"/>
        <stop offset="1" stop-color="#2d5860"/>
      </linearGradient>
      <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="4"/><feDisplacementMap in="SourceGraphic" scale="22"/></filter>
    </defs>
    <rect width="1000" height="680" fill="#101719"/>
    <path d="M120 165 C210 62 332 92 419 143 C510 196 579 95 704 139 C855 193 890 310 825 428 C753 560 607 533 490 602 C336 692 178 552 142 448 C103 337 51 244 120 165Z" fill="url(#land)" filter="url(#rough)"/>
    <path d="M170 408 C280 335 360 366 454 323 C559 276 650 297 790 224" stroke="#f3ead1" stroke-width="9" opacity=".52" fill="none"/>
    <path d="M300 548 C346 498 392 478 446 481 C514 485 576 447 642 390" stroke="#284b55" stroke-width="13" opacity=".72" fill="none"/>
    <path d="M468 126 L492 220 L585 234 L508 286 L530 382 L450 329 L368 377 L393 283 L322 218 L418 211Z" fill="#f2dd9e" opacity=".22"/>
    <circle cx="696" cy="405" r="104" fill="#101719" opacity=".26"/>
    <path d="M693 301 C722 355 714 430 665 494" stroke="#f0e7ca" stroke-width="6" opacity=".24" fill="none"/>
    <text x="305" y="300" fill="#f8efd8" opacity=".8" font-size="34" font-family="serif">Корона Арвейна</text>
    <text x="587" y="216" fill="#f8efd8" opacity=".72" font-size="25" font-family="serif">Серый Тракт</text>
    <text x="382" y="118" fill="#f8efd8" opacity=".7" font-size="24" font-family="serif">Храм Солариса</text>
  `;
  return svg;
}

function visibleCharacterGroups() {
  if (isAdmin) return state.characterGroups;
  const byId = new Map(state.characterGroups.map((group) => [group.id, group]));
  return state.characterGroups.filter((group) => {
    const visited = new Set();
    let current = group;
    while (current) {
      if (visited.has(current.id) || !current.public) return false;
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : null;
    }
    return true;
  });
}

function characterGroupChildren(parentId, groups = state.characterGroups) {
  return groups.filter((group) => group.parentId === parentId);
}

function characterGroupDescendants(groupId, groups = state.characterGroups) {
  const result = [];
  const pending = [groupId];
  const visited = new Set();
  while (pending.length) {
    const id = pending.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const group = groups.find((item) => item.id === id);
    if (!group) continue;
    result.push(group);
    characterGroupChildren(id, groups).forEach((child) => pending.push(child.id));
  }
  return result;
}

function characterGroupCharacterIds(groupId, groups = state.characterGroups) {
  return new Set(characterGroupDescendants(groupId, groups).flatMap((group) => group.characterIds));
}

function flattenCharacterGroupTree(groups = state.characterGroups) {
  const result = [];
  const ids = new Set(groups.map((group) => group.id));
  const append = (group, depth) => {
    result.push({ group, depth });
    characterGroupChildren(group.id, groups).forEach((child) => append(child, depth + 1));
  };
  groups.filter((group) => !group.parentId || !ids.has(group.parentId)).forEach((group) => append(group, 0));
  return result;
}

function addCharacterGroup(parentId = "") {
  const parent = state.characterGroups.find((group) => group.id === parentId);
  const group = normalizeCharacterGroup({
    name: parent ? `Подвкладка: ${parent.name}` : "Новая вкладка",
    parentId: parent?.id || "",
    characterIds: [],
    public: parent?.public ?? true,
  });
  state.characterGroups.push(group);
  activeCharacterGroupId = group.id;
  collapsedCharacterGroupIds.delete(parentId);
  characterGroupManagerOpen = true;
  saveState();
  saveUiState();
  render();
}

function characterGroupTabs() {
  const tree = el("section", "panel npc-group-tree");
  const groups = visibleCharacterGroups();
  if (activeCharacterGroupId && !groups.some((group) => group.id === activeCharacterGroupId)) activeCharacterGroupId = "";
  const visibleCharacterIds = new Set(state.characters.map((character) => character.id));
  const openGroup = (id) => {
    activeCharacterGroupId = id;
    const memberIds = id ? characterGroupCharacterIds(id, groups) : visibleCharacterIds;
    if (!memberIds.has(activeCharacterId)) {
      activeCharacterId = state.characters.find((character) => memberIds.has(character.id))?.id ?? null;
    }
    renderCharacterSelect();
    saveUiState();
    render();
  };
  const makeGroupButton = (id, name, count, isPublic) => {
    const label = `${name} · ${count}${isAdmin && !isPublic ? " · скрыто" : ""}`;
    return button(label, `tab-button npc-group-tab ${activeCharacterGroupId === id ? "active" : ""}`, () => openGroup(id));
  };
  const allRow = el("div", "npc-group-tree-row npc-group-tree-root");
  allRow.append(el("span", "npc-group-toggle-spacer"), makeGroupButton("", "Все персонажи", visibleCharacterIds.size, true));
  const branches = el("div", "npc-group-tree-branches");
  const appendBranch = (group, depth) => {
    const children = characterGroupChildren(group.id, groups);
    const row = el("div", "npc-group-tree-row");
    row.style.setProperty("--npc-group-depth", depth);
    if (children.length) {
      const collapsed = collapsedCharacterGroupIds.has(group.id);
      const toggle = button(collapsed ? "+" : "−", "npc-group-toggle", () => {
        if (collapsed) collapsedCharacterGroupIds.delete(group.id);
        else collapsedCharacterGroupIds.add(group.id);
        saveUiState();
        render();
      });
      toggle.title = collapsed ? "Развернуть подвкладки" : "Свернуть подвкладки";
      toggle.setAttribute("aria-label", toggle.title);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      row.append(toggle);
    } else {
      row.append(el("span", "npc-group-toggle-spacer"));
    }
    const count = [...characterGroupCharacterIds(group.id, groups)].filter((id) => visibleCharacterIds.has(id)).length;
    row.append(makeGroupButton(group.id, group.name, count, group.public));
    branches.append(row);
    if (!collapsedCharacterGroupIds.has(group.id)) children.forEach((child) => appendBranch(child, depth + 1));
  };
  const groupIds = new Set(groups.map((group) => group.id));
  groups
    .filter((group) => !group.parentId || !groupIds.has(group.parentId))
    .forEach((group) => appendBranch(group, 0));
  tree.append(el("div", "npc-group-tree-title", "Подборки персонажей"), allRow, branches);
  return tree;
}

function characterGroupManager() {
  const details = el("details", "panel npc-group-manager");
  details.open = Boolean(characterGroupManagerOpen);
  details.addEventListener("toggle", () => {
    characterGroupManagerOpen = details.open;
  });
  const summary = el("summary", "", "Настроить вкладки персонажей");
  const body = el("div", "admin-stack npc-group-manager-body");
  body.append(
    el("p", "muted", "Собирай персонажей в древовидные подборки. Родительская вкладка показывает персонажей из всех своих подвкладок. Скрытие родителя скрывает от игроков всё поддерево."),
    actionRow([button("Новая корневая вкладка", "primary-button", () => addCharacterGroup())])
  );
  const list = el("div", "npc-group-editor-list");
  if (!state.characterGroups.length) {
    list.append(el("div", "empty-state", "Пользовательских вкладок пока нет."));
  }
  flattenCharacterGroupTree(state.characterGroups).forEach(({ group, depth }) => {
    const shell = el("div", "npc-group-editor-shell");
    shell.style.setProperty("--npc-group-depth", Math.min(depth, 6));
    const form = el("form", "npc-group-editor");
    const name = input(group.name);
    const descendantIds = new Set(characterGroupDescendants(group.id).map((item) => item.id));
    const parentOptions = [
      ["", "Без родительской вкладки"],
      ...flattenCharacterGroupTree(state.characterGroups)
        .filter(({ group: candidate }) => !descendantIds.has(candidate.id))
        .map(({ group: candidate, depth: candidateDepth }) => [
          candidate.id,
          `${"— ".repeat(candidateDepth)}${candidate.name}`,
        ]),
    ];
    const parent = selectInput(parentOptions, group.parentId);
    const publicControl = document.createElement("input");
    publicControl.type = "checkbox";
    publicControl.checked = group.public;
    const members = searchableCheckboxList(
      state.characters.map((character) => [
        character.id,
        character.name,
        [character.player, character.className, character.ancestry].filter(Boolean).join(" "),
      ]),
      group.characterIds,
      "",
      null,
      "Поиск персонажа для вкладки"
    );
    form.append(
      el("strong", "npc-group-editor-title span-2", `${depth ? "Подвкладка" : "Вкладка"}: ${group.name}`),
      labelWrap("Название вкладки", name),
      labelWrap("Родительская вкладка", parent),
      labelWrap("Видимость", checkboxWrap("Показывать игрокам", publicControl), "span-2"),
      labelWrap("Персонажи во вкладке", members, "span-2"),
      actionRow([
        button("Сохранить вкладку", "primary-button", null, "submit"),
        button("Добавить подвкладку", "ghost-button", () => addCharacterGroup(group.id)),
        button("Удалить", "ghost-button", () => {
          if (!confirm(`Удалить вкладку "${group.name}"? Персонажи останутся на месте, а её подвкладки поднимутся на уровень выше.`)) return;
          state.characterGroups.forEach((item) => {
            if (item.parentId === group.id) item.parentId = group.parentId;
          });
          state.characterGroups = state.characterGroups.filter((item) => item.id !== group.id);
          collapsedCharacterGroupIds.delete(group.id);
          if (activeCharacterGroupId === group.id) activeCharacterGroupId = "";
          characterGroupManagerOpen = true;
          saveState();
          saveUiState();
          render();
        }),
      ], "span-2")
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      group.name = name.value.trim() || "Без названия";
      group.public = publicControl.checked;
      group.parentId = parent.value;
      group.characterIds = checkedValues(members);
      state.characterGroups = sanitizeCharacterGroupHierarchy(state.characterGroups);
      characterGroupManagerOpen = true;
      saveState();
      saveUiState();
      render();
    });
    shell.append(form);
    list.append(shell);
  });
  body.append(list);
  details.append(summary, body);
  return details;
}

function renderCharacters() {
  const root = el("div", "admin-stack");
  const groups = visibleCharacterGroups();
  if (activeCharacterGroupId && !groups.some((group) => group.id === activeCharacterGroupId)) activeCharacterGroupId = "";
  const activeGroup = groups.find((group) => group.id === activeCharacterGroupId);
  const activeGroupCharacterIds = activeGroup ? characterGroupCharacterIds(activeGroup.id, groups) : null;
  const groupCharacters = activeGroup
    ? state.characters.filter((character) => activeGroupCharacterIds.has(character.id))
    : state.characters;
  const characters = filterItems(groupCharacters, (item) =>
    [item.name, item.player, item.className, item.notes].join(" ")
  );
  if (!characters.some((item) => item.id === activeCharacterId)) {
    activeCharacterId = characters[0]?.id ?? null;
  }
  const active = characters.find((item) => item.id === activeCharacterId);
  const actions = actionRow([
    button(isAdmin ? "Новый персонаж" : "Добавить персонажа", "primary-button", () => addCharacter()),
    ...(isAdmin && active ? [button("Дублировать", "ghost-button", () => duplicateCharacter(active))] : []),
    ...(isAdmin && active ? [button("Перенести в NPC", "ghost-button", () => transferCharacterToNpc(active))] : []),
  ]);
  root.append(header("Персонажи", "Цифровые листы Pathfinder 1e для партии.", actions));
  root.append(characterGroupTabs());
  if (isAdmin) root.append(characterGroupManager());

  const layout = el("div", "character-layout");
  const list = el("aside", "panel list-panel");
  characters.forEach((character) => {
    const item = button(`${character.name}${character.changesInProgress ? " · В процессе изменений" : ""} · ${character.className}`, "list-button", () => {
      activeCharacterId = character.id;
      renderCharacterSelect();
      saveUiState();
      render();
    });
    item.classList.toggle("active", character.id === activeCharacterId);
    list.append(item);
  });

  const sheet = el("section", "sheet-panel");
  if (!active) {
    sheet.append(el("div", "empty-state", "Персонажи не найдены"));
  } else {
    sheet.append(characterSheet(active));
  }

  layout.append(list, sheet);
  root.append(layout);
  return root;
}

function addCharacter() {
  if (!isAdmin) {
    openPublicCharacterDialog();
    return;
  }
  const character = normalizeCharacter(characterDefaults());
  state.characters.push(character);
  activeCharacterGroupId = "";
  activeCharacterId = character.id;
  saveState();
  renderCharacterSelect();
  render();
}

function publicEntryDialog(title, description) {
  const dialog = document.createElement("dialog");
  dialog.className = "public-entry-dialog";
  const panel = el("section", "public-entry-panel");
  const head = el("div", "public-entry-head");
  const copy = el("div");
  copy.append(el("p", "eyebrow", "Общая база"), el("h3", "", title), el("p", "muted", description));
  head.append(copy, button("×", "gallery-lightbox-close", () => dialog.close()));
  panel.append(head);
  dialog.append(panel);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute("open", "");
  return { dialog, panel };
}

function openPublicCharacterDialog() {
  const { dialog, panel } = publicEntryDialog(
    "Добавить персонажа",
    "Персонаж сразу появится у всех. После публикации мастер сможет дополнить и отредактировать его лист."
  );
  const form = el("form", "form-grid public-entry-form");
  const fields = {
    name: input(""),
    player: input(""),
    ancestry: input(""),
    className: input(""),
    level: input(1),
    homeland: input(""),
    culture: input(""),
    religion: input(""),
    deity: input(""),
    alignment: input("Н"),
    dangerClass: input(""),
    age: input(""),
    height: input(""),
    weight: input(""),
    maritalStatus: input(""),
    hp: input("10 / 10"),
    ac: input(10),
    languages: input(""),
    notes: textarea(""),
  };
  fields.name.required = true;
  fields.player.required = true;
  fields.level.type = "number";
  fields.level.min = "1";
  fields.level.max = "30";
  fields.ac.type = "number";
  const statInputs = Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((key) => [key, input(10)]));
  Object.values(statInputs).forEach((control) => {
    control.type = "number";
    control.min = "1";
    control.max = "50";
  });
  const stats = el("div", "public-entry-stats");
  [["СИЛ", "str"], ["ЛОВ", "dex"], ["ТЕЛ", "con"], ["ИНТ", "int"], ["МДР", "wis"], ["ХАР", "cha"]]
    .forEach(([label, key]) => stats.append(labelWrap(label, statInputs[key])));
  const statsSection = el("section", "public-entry-stats-section span-2");
  statsSection.append(el("p", "public-entry-section-title", "Характеристики"), stats);
  const submit = button("Добавить персонажа", "primary-button", null, "submit");
  form.append(
    labelWrap("Имя персонажа", fields.name),
    labelWrap("Имя игрока", fields.player),
    labelWrap("Раса/народ", fields.ancestry),
    labelWrap("Класс", fields.className),
    labelWrap("Уровень", fields.level),
    labelWrap("Родина", fields.homeland),
    labelWrap("Культура", fields.culture),
    labelWrap("Вероисповедание", fields.religion),
    labelWrap("Божество", fields.deity),
    labelWrap("Мировоззрение", fields.alignment),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("HP", fields.hp),
    labelWrap("AC", fields.ac),
    statsSection,
    labelWrap("Языки", fields.languages, "span-2"),
    labelWrap("Описание и заметки", fields.notes, "span-2"),
    actionRow([submit, button("Отмена", "ghost-button", () => dialog.close())], "span-2")
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "Добавляю...";
    const entry = {
      id: crypto.randomUUID(),
      name: fields.name.value.trim(),
      player: fields.player.value.trim(),
      ancestry: fields.ancestry.value.trim(),
      className: fields.className.value.trim(),
      level: Number(fields.level.value || 1),
      homeland: fields.homeland.value.trim(),
      culture: fields.culture.value.trim(),
      religion: fields.religion.value.trim(),
      deity: fields.deity.value.trim(),
      alignment: fields.alignment.value.trim(),
      dangerClass: fields.dangerClass.value.trim(),
      age: fields.age.value.trim(),
      height: fields.height.value.trim(),
      weight: fields.weight.value.trim(),
      maritalStatus: fields.maritalStatus.value.trim(),
      hp: fields.hp.value.trim(),
      ac: Number(fields.ac.value || 10),
      stats: Object.fromEntries(Object.entries(statInputs).map(([key, control]) => [key, Number(control.value || 10)])),
      languages: fields.languages.value.trim(),
      notes: fields.notes.value.trim(),
      gmNotes: "",
    };
    if (await submitPublicCampaignEntry("character", entry)) {
      activeCharacterGroupId = "";
      activeCharacterId = entry.id;
      saveUiState();
      dialog.close();
      render();
      return;
    }
    submit.disabled = false;
    submit.textContent = "Добавить персонажа";
  });
  panel.append(form);
}

function characterSheet(character) {
  const root = el("div", "admin-stack");
  const head = el("div", "character-head");
  const portrait = el("div", "character-portrait");
  if (character.portrait) {
    const portraitStyle = { ...defaultImageStyle(), ...(character.portraitStyle ?? {}) };
    const portraitImage = document.createElement("img");
    portraitImage.src = character.portrait;
    portraitImage.alt = character.name;
    portraitImage.style.objectFit = portraitStyle.fit;
    portraitImage.style.objectPosition = `${portraitStyle.x}% ${portraitStyle.y}%`;
    portraitImage.style.transform = `scale(${portraitStyle.zoom}) rotate(${Number(portraitStyle.rotation || 0)}deg)`;
    portrait.append(portraitImage);
  } else {
    portrait.textContent = initials(character.name);
  }
  const copy = el("div");
  const nameRow = el("div", "character-name-row");
  nameRow.append(el("h3", "", character.name));
  if (character.changesInProgress) {
    nameRow.append(el("span", "character-change-status", "В процессе изменений"));
  }
  copy.append(
    el("p", "eyebrow", character.player),
    nameRow,
    el(
      "p",
      "muted",
      `${character.ancestry} · ${character.className} · ${character.alignment} · уровень ${character.level}`
    ),
    tags([
      `HP ${character.hp}`,
      `AC ${character.ac}`,
      `Init ${signed(character.initiative)}`,
      movementSpeedSummary(character),
      character.adminOnlyEdit ? "только мастер" : "редактируется игроками",
      ...(character.unusualAncestry ? ["необычная раса"] : []),
    ])
  );
  head.append(portrait, copy);
  root.append(head, characterTabBar());

  const content = el("div", "character-tab-content");
  if (activeCharacterTab === "overview") content.append(characterOverview(character));
  if (activeCharacterTab === "notes") content.append(characterNotes(character));
  if (activeCharacterTab === "factions") content.append(characterFactions(character));
  if (activeCharacterTab === "recognition") content.append(characterRecognition(character));
  if (activeCharacterTab === "mechanics") content.append(characterMechanics(character));
  if (activeCharacterTab === "links") content.append(characterLinks(character));
  if (activeCharacterTab === "gm") content.append(characterGm(character));
  if (canEditCharacter(character)) {
    content.append(characterTabEditor(character));
  } else {
    content.append(el("p", "character-edit-locked", "Редактирование этого персонажа доступно только мастеру."));
  }
  root.append(content);
  return root;
}

function canEditCharacter(character) {
  return isAdmin || !character.adminOnlyEdit;
}

function characterTabBar() {
  const tabs = el("div", "tabs");
  const availableTabs = characterTabs.filter(([id]) => id !== "gm" || isAdmin);
  if (!availableTabs.some(([id]) => id === activeCharacterTab)) activeCharacterTab = "overview";
  availableTabs.forEach(([id, label]) => {
    const tab = button(label, `tab-button ${activeCharacterTab === id ? "active" : ""}`, () => {
      activeCharacterTab = id;
      saveUiState();
      render();
    });
    tabs.append(tab);
  });
  return tabs;
}

function characterOverview(character) {
  const root = el("div", "sheet-section-grid");
  root.append(
    characterSummary(character),
    infoPanel("Описание", [
      ["Игрокам", character.description || "описание пока не заполнено"],
      ["Внешность", character.appearance || "не указано"],
      ["Манера речи", character.voice || "не указано"],
      ["Локация", character.location || "не указано"],
    ]),
    npcPersonalityPanel(character)
  );
  return root;
}

function characterFactions(character) {
  return npcFactions(character);
}

function characterMechanics(character) {
  const root = el("div", "admin-stack pathfinder-sheet character-pathfinder-sheet");
  const masthead = el("div", "pathfinder-sheet-masthead");
  masthead.append(
    el("span", "pathfinder-sheet-mark", "PF1"),
    el("div", "", ""),
    el("strong", "", character.name),
    el("span", "", `${npcLevelSummary(character)} · ${character.alignment || "мировоззрение не указано"}`)
  );
  const tabs = el("div", "tabs pathfinder-sheet-tabs");
  characterMechanicsTabs.forEach(([id, label]) => {
    tabs.append(button(label, `tab-button ${activeCharacterMechanicsTab === id ? "active" : ""}`, () => {
      activeCharacterMechanicsTab = id;
      saveUiState();
      render();
    }));
  });
  const sections = {
    summary: characterSummary,
    stats: characterStats,
    combat: characterCombat,
    skills: characterSkills,
    features: characterFeatures,
    magic: characterMagic,
    inventory: characterInventory,
  };
  const body = el("div", "pathfinder-sheet-body");
  body.append((sections[activeCharacterMechanicsTab] || characterSummary)(character));
  root.append(masthead, tabs, body);
  return root;
}

function characterLinks(character) {
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Связанные материалы", [], [
      ...linkedWikiByIds(character.wikiLinks).map((article) => button(`Wiki: ${article.title}`, "small-button", () => openWikiArticle(article.id))),
      ...linkedQuestsByIds(character.questLinks).map((quest) => button(`Задание: ${quest.title}`, "small-button", () => openQuest(quest.id))),
      ...linkedMapRegionsByIds(character.mapLinks).map((region) => button(`Карта: ${region.title}`, "small-button", () => openMapRegion(region.id))),
    ]),
    infoPanel("Связанные NPC", [], linkedNpcsByIds(character.npcLinks).map((item) => button(item.name, "small-button", () => openNpc(item.id))))
  );
  return root;
}

function characterGm(character) {
  return infoPanel("GM-заметки", [[character.gmNotes || "скрытых заметок пока нет", ""]]);
}

function characterSummary(character) {
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Паспорт", [
      ["Игрок", character.player],
      ["Класс", character.className],
      ["Раса", character.ancestry],
      ["Родина", character.homeland],
      ["Культура", character.culture || "не указано"],
      ["Вероисповедание", character.religion || "не указано"],
      ["Размер", character.size],
      ["Пол", character.gender],
      ["Мировоззрение", character.alignment],
      ["Божество", character.deity || "не указано"],
      ["Класс Опасности", character.dangerClass || "не указано"],
      ["Возраст", character.age || "не указано"],
      ["Рост", character.height || "не указано"],
      ["Вес", character.weight || "не указано"],
      ["Семейный статус", character.maritalStatus || "не указано"],
    ]),
    infoPanel("Быстрые броски", [], [
      button(`Инициатива ${signed(character.initiative)}`, "small-button", () => rollFormula(`1d20${signed(character.initiative)}`, "Инициатива")),
      button(`Стойкость ${signed(character.saves.fort)}`, "small-button", () => rollFormula(`1d20${signed(character.saves.fort)}`, "Стойкость")),
      button(`Реакция ${signed(character.saves.ref)}`, "small-button", () => rollFormula(`1d20${signed(character.saves.ref)}`, "Реакция")),
      button(`Воля ${signed(character.saves.will)}`, "small-button", () => rollFormula(`1d20${signed(character.saves.will)}`, "Воля")),
    ]),
    infoPanel("Языки", [[character.languages || "не указаны", ""]])
  );
  return root;
}

function characterStats(character) {
  const root = el("div", "admin-stack");
  const stats = el("div", "sheet-grid");
  Object.entries(character.stats).forEach(([key, value]) => {
    const mod = characterStatModifier(character, key);
    const box = el("div", "stat-box stat-roll");
    box.append(el("span", "", key.toUpperCase()), el("strong", "", value), el("button", "small-button", signed(mod)));
    box.querySelector("button").addEventListener("click", () => rollFormula(`1d20${signed(mod)}`, key.toUpperCase()));
    stats.append(box);
  });
  root.append(stats, infoPanel("Спасброски", [
    ["Стойкость", signed(character.saves.fort)],
    ["Реакция", signed(character.saves.ref)],
    ["Воля", signed(character.saves.will)],
  ]));
  return root;
}

function characterCombat(character) {
  const root = el("div", "admin-stack");
  root.append(
    infoPanel("Боевая сводка", [
      ["HP", character.hp],
      ["AC", character.ac],
      ["Касание", character.touchAc],
      ["Врасплох", character.flatFootedAc],
      ["BAB", babSummary(character)],
      ["CMB", signed(character.cmb)],
      ["CMD", character.cmd],
      ["Скорость", movementSpeedSummary(character)],
    ]),
    textRecordPanel("Атаки", character.attacksNotes, "Атаки пока не записаны."),
    textRecordPanel("Броня и защита", character.armorNotes, "Броня пока не записана.")
  );
  return root;
}

function characterSkills(character) {
  const root = el("div", "admin-stack");
  const search = input(skillSearchTerm);
  search.placeholder = "Поиск по навыкам";
  const searchForm = el("form", "search-form");
  searchForm.append(search, button("Найти", "small-button", null, "submit"));
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    skillSearchTerm = search.value;
    render();
  });
  const skills = character.skills.filter((skill) =>
    [skill.name, skill.specialty, skill.ability].join(" ").toLowerCase().includes(skillSearchTerm.toLowerCase())
  );
  const skillRows = skills.map((skill) => ({
    ...skill,
    displayName: skillDisplayName(skill),
    abilityDisplay: `${String(skill.ability || "").toUpperCase()} ${signed(skillAbilityModifier(character, skill))}`,
    classSkillDisplay: skill.classSkill ? (Number(skill.ranks || 0) > 0 ? "да (+3)" : "да") : "нет",
    total: calculateSkillTotal(character, skill),
  }));
  root.append(searchForm, objectTable(
    "Навыки",
    skillRows,
    ["displayName", "abilityDisplay", "ranks", "classSkillDisplay", "misc", "armorPenalty", "total"],
    ["Навык", "Хар.", "Ранги", "Класс", "Проч.", "Штраф", "Итог"],
    (skill) => {
      const roll = button(`Roll ${signed(skill.total)}`, "small-button", () => {
        rollFormula(`1d20${signed(skill.total)}`, skill.displayName, skillRollActorId(character));
      });
      roll.title = skillFormulaLabel(character, skill);
      return [roll];
    }
  ));
  return root;
}

function characterFeatures(character) {
  const root = el("div", "sheet-section-grid");
  root.append(
    listPanel("Черты", character.feats),
    listPanel("Классовые особенности", character.features),
    listPanel("Шаблоны и статусы", character.templatesStatuses),
    listPanel("Штрихи", character.strokes)
  );
  return root;
}

function squareCellHasContent(cell) {
  if (!cell) return false;
  return Boolean(
    cell.title
    || cell.notes
    || cell.features
    || cell.objectInfo
    || cell.gmNotes
    || cell.tileImage
    || terrainValues(cell).length
    || cell.objects?.length
    || cell.markers?.length
    || cell.wikiLinks?.length
    || cell.questLinks?.length
    || cell.mapLinks?.length
    || normalizeBoundaryLayers(cell.boundaryLayers, cell).length
    || normalizeRoadSides(cell.roadSides).length
  );
}

function squareMergeKeys(region, key, width, height) {
  const origin = parseMapCellKey(key);
  if (!origin) return [];
  const keys = [];
  for (let q = origin.q; q < origin.q + width; q += 1) {
    for (let r = origin.r; r < origin.r + height; r += 1) {
      if (q < 0 || r < 0 || q >= region.grid.cols || r >= region.grid.rows) return [];
      keys.push(hexKey(q, r));
    }
  }
  return keys;
}

function unmergeSquareCells(region, key, persist = true) {
  if (!isSquareRegion(region)) return;
  const selected = region.hexes[key];
  const rootKey = selected?.mergeRoot || key;
  const root = region.hexes[rootKey];
  if (!root) return;
  root.mergeRoot = "";
  root.mergeWidth = 1;
  root.mergeHeight = 1;
  Object.values(region.hexes).forEach((cell) => {
    if (cell.mergeRoot === rootKey) cell.mergeRoot = "";
  });
  state.map.selectedHex = rootKey;
  updateMapView(region.id, { selectedHex: rootKey });
  if (persist) {
    saveState();
    render();
  }
}

function mergeSquareCells(region, key, requestedWidth, requestedHeight) {
  if (!isAdmin || !isSquareRegion(region)) return;
  const root = getHex(region, key);
  if (root.mergeRoot) {
    alert("Выбери основную объединённую клетку, а не её внутреннюю часть.");
    return;
  }
  const width = Math.max(1, Math.floor(Number(requestedWidth) || 1));
  const height = Math.max(1, Math.floor(Number(requestedHeight) || 1));
  const keys = squareMergeKeys(region, key, width, height);
  if (!keys.length) {
    alert("Объединение выходит за границы карты.");
    return;
  }
  const oldCovered = new Set(Object.entries(region.hexes)
    .filter(([, cell]) => cell.mergeRoot === key)
    .map(([cellKey]) => cellKey));
  const conflict = keys.find((cellKey) => {
    if (cellKey === key || oldCovered.has(cellKey)) return false;
    const cell = region.hexes[cellKey];
    return Boolean(cell?.mergeRoot || (cell?.mergeWidth > 1 || cell?.mergeHeight > 1) || squareCellHasContent(cell));
  });
  if (conflict) {
    alert(`Клетка ${conflict} уже содержит данные или входит в другое объединение.`);
    return;
  }
  unmergeSquareCells(region, key, false);
  root.mergeWidth = width;
  root.mergeHeight = height;
  keys.filter((cellKey) => cellKey !== key).forEach((cellKey) => {
    const cell = getHex(region, cellKey);
    cell.mergeRoot = key;
    cell.mergeWidth = 1;
    cell.mergeHeight = 1;
  });
  saveState();
  render();
}

function duplicateCharacter(character) {
  if (!isAdmin || !character) return;
  const copy = normalizeCharacter({
    ...structuredClone(character),
    id: crypto.randomUUID(),
    name: `${character.name} (копия)`,
  });
  state.characters.push(copy);
  activeCharacterGroupId = "";
  activeCharacterId = copy.id;
  saveState();
  renderCharacterSelect();
  render();
}

function replaceEntityReferenceKeys(fromType, fromId, toType, toId) {
  const fromKey = relationshipEntityKey(fromType, fromId);
  const toKey = relationshipEntityKey(toType, toId);
  state.relationships.forEach((relationship) => {
    if (relationship.sourceKey === fromKey) relationship.sourceKey = toKey;
    if (relationship.targetKey === fromKey) relationship.targetKey = toKey;
    if (relationship.sourceType === fromType && relationship.sourceId === fromId) {
      relationship.sourceType = toType;
      relationship.sourceId = toId;
    }
    if (relationship.targetType === fromType && relationship.targetId === fromId) {
      relationship.targetType = toType;
      relationship.targetId = toId;
    }
  });
  state.relationships = state.relationships.map(normalizeRelationship);
  state.settlements.forEach((settlement) => {
    settlement.residents.forEach((resident) => {
      if (resident.entityKey === fromKey) resident.entityKey = toKey;
    });
    settlement.armies.forEach((army) => {
      if (army.commanderKey === fromKey) army.commanderKey = toKey;
    });
    settlement.populationGroups.forEach((group) => {
      if (group.representativeKey === fromKey || (fromType === "npc" && group.representativeNpcId === fromId)) {
        group.representativeKey = toKey;
        group.representativeNpcId = toType === "npc" ? toId : "";
      }
    });
  });
  state.countries.forEach((country) => {
    country.councilRoles.forEach((role) => {
      if (role.holderKey === fromKey) role.holderKey = toKey;
    });
  });
  state.items.forEach((item) => {
    if (fromType === "npc" && (item.npcLinks ?? []).includes(fromId)) {
      item.npcLinks = item.npcLinks.filter((id) => id !== fromId);
      item.characterLinks = [...new Set([...(item.characterLinks ?? []), toId])];
    }
    if (fromType === "character" && (item.characterLinks ?? []).includes(fromId)) {
      item.characterLinks = item.characterLinks.filter((id) => id !== fromId);
      item.npcLinks = [...new Set([...(item.npcLinks ?? []), toId])];
    }
  });
  if (relationshipSourceKey === fromKey) relationshipSourceKey = toKey;
  if (relationshipTargetKey === fromKey) relationshipTargetKey = toKey;
}

function removeNpcOnlyReferences(npcId) {
  state.factions.forEach((faction) => {
    faction.npcLinks = (faction.npcLinks ?? []).filter((id) => id !== npcId);
  });
  [...state.npcs, ...state.characters].forEach((item) => {
    item.npcLinks = (item.npcLinks ?? []).filter((id) => id !== npcId);
  });
  state.settlements.forEach((settlement) => {
    settlement.npcLinks = (settlement.npcLinks ?? []).filter((id) => id !== npcId);
    settlement.armies.forEach((army) => {
      if (army.soldierNpcId === npcId) army.soldierNpcId = "";
    });
  });
  [...state.calendarEvents, ...state.sessionLogs].forEach((entry) => {
    entry.npcLinks = (entry.npcLinks ?? []).filter((id) => id !== npcId);
  });
}

function transferNpcToCharacter(npc) {
  if (!isAdmin || !npc) return;
  if (state.characters.some((character) => character.id === npc.id)) {
    alert("Перенос остановлен: в списке персонажей уже есть объект с таким идентификатором.");
    return;
  }
  if (!confirm(`Перенести NPC «${npc.name}» в список персонажей? Карточка, механика и универсальные связи будут сохранены.`)) return;
  const character = normalizeCharacter({
    ...structuredClone(npc),
    player: npc.player && npc.player !== "NPC" ? npc.player : "Игрок не указан",
  });
  state.npcs = state.npcs.filter((item) => item.id !== npc.id);
  state.npcGroups.forEach((group) => {
    group.npcIds = group.npcIds.filter((id) => id !== npc.id);
  });
  state.characters.push(character);
  replaceEntityReferenceKeys("npc", npc.id, "character", character.id);
  removeNpcOnlyReferences(npc.id);
  activeNpcId = state.npcs[0]?.id ?? null;
  activeCharacterGroupId = "";
  activeCharacterId = character.id;
  currentView = "characters";
  activeCharacterTab = "overview";
  saveState();
  renderCharacterSelect();
  saveUiState();
  render();
}

function transferCharacterToNpc(character) {
  if (!isAdmin || !character) return;
  if (state.npcs.some((npc) => npc.id === character.id)) {
    alert("Перенос остановлен: в списке NPC уже есть объект с таким идентификатором.");
    return;
  }
  if (!confirm(`Перенести персонажа «${character.name}» в список NPC? Лист, механика и универсальные связи будут сохранены.`)) return;
  const npc = normalizeNpc({
    ...structuredClone(character),
    status: character.status || "alive",
    public: character.public ?? true,
  });
  state.characters = state.characters.filter((item) => item.id !== character.id);
  state.characterGroups.forEach((group) => {
    group.characterIds = group.characterIds.filter((id) => id !== character.id);
  });
  state.npcs.unshift(npc);
  replaceEntityReferenceKeys("character", character.id, "npc", npc.id);
  activeCharacterId = state.characters[0]?.id ?? null;
  activeDirectoryTab = "npcs";
  activeNpcGroupId = "";
  activeNpcId = npc.id;
  currentView = "directory";
  activeNpcTab = "overview";
  saveState();
  renderCharacterSelect();
  saveUiState();
  render();
}

function squareMergeEditor(region, key, data) {
  const coordinates = parseMapCellKey(key) || { q: 0, r: 0 };
  const width = input(data.mergeWidth || 1);
  const height = input(data.mergeHeight || 1);
  [width, height].forEach((control) => {
    control.type = "number";
    control.min = "1";
    control.step = "1";
  });
  width.max = String(Math.max(1, region.grid.cols - coordinates.q));
  height.max = String(Math.max(1, region.grid.rows - coordinates.r));
  const section = el("section", "square-merge-editor span-2");
  section.append(
    el("strong", "", "Размер здания на сетке"),
    el("p", "muted", "Объединение растягивает текущую клетку вправо и вниз. Заполненные клетки не перезаписываются."),
    labelWrap("Ширина в клетках", width),
    labelWrap("Высота в клетках", height),
    actionRow([
      button("Объединить клетки", "ghost-button", () => mergeSquareCells(region, key, width.value, height.value)),
      button("Разъединить", "ghost-button", () => unmergeSquareCells(region, key)),
    ], "span-2")
  );
  return section;
}

function characterMagic(character) {
  return textRecordPanel("Заклинания и магия", character.spellNotes, "Записей о заклинаниях пока нет.");
}

function characterInventory(character) {
  const root = el("div", "sheet-section-grid inventory-section-grid");
  const magicItems = state.items.filter((item) =>
    item.category === "magical"
    && character.magicItemLinks.includes(item.id)
    && (item.public || isAdmin)
  );
  const magicPanel = el("section", "panel admin-stack");
  magicPanel.append(el("h3", "", "Магические предметы"));
  if (magicItems.length) {
    magicItems.forEach((item) => {
      magicPanel.append(button(
        [item.name, item.price ? `· ${item.price}` : ""].filter(Boolean).join(" "),
        "inventory-item-link",
        () => openItem(item.id)
      ));
    });
  } else {
    magicPanel.append(el("p", "muted", "Магические предметы не привязаны."));
  }
  root.append(
    textRecordPanel("Инвентарь", character.inventoryNotes, "Инвентарь пока не записан."),
    textRecordPanel("Надетое снаряжение", character.equippedGear, "Надетое снаряжение не указано."),
    magicPanel
  );
  return root;
}

function characterRecognition(character) {
  return recognitionView(character, "Признание персонажа");
}

function recognitionView(character, title) {
  const root = el("div", "admin-stack");
  root.append(
    metricGrid([
      ["Накопленное признание", character.accumulatedRecognition],
      ["Уровень авторитета", character.authorityLevel],
      ["Честь", character.honor],
      ["Благочестие", character.piety],
      ["Слава", character.fame],
    ]),
    textRecordPanel("Спрос", character.demand, "Требования и спрос пока не записаны."),
    textRecordPanel("Заслуги", character.merits, "Потраченные заслуги и приобретённые бонусы пока не записаны.")
  );
  root.setAttribute("aria-label", title);
  return root;
}

function textRecordPanel(title, text, emptyText) {
  const panel = el("section", "panel admin-stack text-record-panel");
  panel.append(el("h3", "", title), el("div", "article-body", text || emptyText));
  return panel;
}

function characterNotes(character) {
  const root = el("div", "sheet-section-grid");
  root.append(infoPanel("Заметки игрока", [
    ["Последняя встреча", character.lastSeen || "не указано"],
    ["Записи", character.notes || "нет заметок"],
  ]));
  return root;
}

function infoPanel(title, rows, actions = []) {
  const panel = el("section", "panel admin-stack");
  panel.append(el("h3", "", title));
  rows.forEach(([label, value]) => {
    const line = el("div", "info-line");
    line.append(el("span", "muted", label), el("strong", "", value));
    panel.append(line);
  });
  if (actions.length) panel.append(actionRow(actions));
  return panel;
}

function listPanel(title, items) {
  const panel = el("section", "panel admin-stack");
  panel.append(el("h3", "", title));
  panel.append(items?.length ? tags(items) : el("p", "muted", "Пока пусто"));
  return panel;
}

function objectTable(title, rows, keys, headings, actionFactory) {
  const wrap = el("div", "panel admin-stack");
  wrap.append(el("h3", "", title));
  const table = el("div", "object-table");
  if (title === "Навыки") table.classList.add("skills-table");
  table.style.setProperty("--cols", `${headings.length + (actionFactory ? 1 : 0)}`);
  if (title === "Навыки") {
    table.style.gridTemplateColumns = actionFactory
      ? "minmax(210px, 2fr) 82px 64px 86px 64px 64px 64px 104px"
      : "minmax(210px, 2fr) 82px 64px 86px 64px 64px 64px";
  }
  headings.forEach((heading) => table.append(el("strong", "table-head", heading)));
  if (actionFactory) table.append(el("strong", "table-head", "Roll"));
  rows.forEach((item) => {
    keys.forEach((key) => table.append(el("span", "", formatCell(item[key]))));
    if (actionFactory) table.append(actionRow(actionFactory(item)));
  });
  wrap.append(rows?.length ? table : el("p", "muted", "Пока пусто"));
  return wrap;
}

function tableBlock(title, rows, headings = ["Название", "Итог", ""]) {
  const wrap = el("div", "panel");
  wrap.append(el("h3", "", title));
  const table = el("div", "table-like");
  table.append(row(headings, "table-row header"));
  rows.forEach((item) => table.append(row([item[0], item[1], item[2] ?? ""], "table-row")));
  wrap.append(table);
  return wrap;
}

function row(items, className) {
  const line = el("div", className);
  items.forEach((item) => line.append(el("span", "", item)));
  return line;
}

function statMod(value) {
  return Math.floor((Number(value) - 10) / 2);
}

function characterStatModifier(character, statKey) {
  if (statKey === "con" && character?.unusualAncestry) {
    return Number(character.customConModifier || 0);
  }
  return statMod(character?.stats?.[statKey] ?? 10);
}

function signed(value) {
  const number = Number(String(value).replace("+", ""));
  if (Number.isNaN(number)) return String(value || "+0");
  return number >= 0 ? `+${number}` : String(number);
}

function initials(value) {
  return String(value || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatCell(value) {
  if (value === true) return "да";
  if (value === false) return "нет";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function renderGallery() {
  const root = el("div");
  const action = isAdmin ? button("Новый арт", "primary-button", () => addGalleryItem()) : null;
  root.append(header("Галерея", "Арты, символы, локации и визуальные материалы кампании.", action));
  const tagBar = el("div", "gallery-filter-bar");
  const allButton = button("Все", `tag tag-button ${activeGalleryTag ? "" : "active"}`, () => {
    activeGalleryTag = "";
    render();
  });
  tagBar.append(allButton);
  allGalleryTags().forEach((tagName) => {
    const tagButton = button(tagName, `tag tag-button ${activeGalleryTag === tagName ? "active" : ""}`, () => {
      activeGalleryTag = activeGalleryTag === tagName ? "" : tagName;
      render();
    });
    attachTagTooltip(tagButton, tagName);
    tagBar.append(tagButton);
  });
  root.append(tagBar);
  const grid = el("div", "gallery-grid");
  const items = activeGalleryTag ? state.gallery.filter((item) => item.tags.includes(activeGalleryTag)) : state.gallery;
  filterItems(items, (item) => [item.title, item.type, item.linked, item.description, item.tags.join(" ")].join(" ")).forEach(
    (item) => {
      const card = el("article", "gallery-card");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Открыть арт: ${item.title}`);
      const art = galleryArt(item);
      const info = el("div", "gallery-info");
      info.append(el("p", "eyebrow", item.type), el("h3", "", item.title), el("p", "", item.linked), tags(item.tags));
      card.append(art, info);
      card.addEventListener("click", (event) => {
        openGalleryLightbox(item.id);
      });
      card.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        openGalleryLightbox(item.id);
      });
      grid.append(card);
    }
  );
  root.append(grid);
  return root;
}

function addGalleryItem() {
  const draft = normalizeGalleryItem({
    id: crypto.randomUUID(),
    title: "Новый образ Асханы",
    type: "Материал",
    linked: "Связь с wiki",
    description: "Краткое описание изображения.",
    tags: ["материал"],
    image: "",
    imageStyle: defaultImageStyle(),
    palette: ["#d4a74f", "#4da9a7", "#111719"],
  });
  openGalleryLightbox(draft.id, { item: draft, isNew: true, edit: true });
}

function openGalleryLightbox(itemId, options = {}) {
  const item = options.item || state.gallery.find((entry) => entry.id === itemId);
  if (!item) return;
  const dialog = el("dialog", "gallery-lightbox");
  const panel = el("div", "gallery-lightbox-panel");
  const media = el("div", "gallery-lightbox-media");
  const img = document.createElement("img");
  img.src = galleryImage(item);
  img.alt = item.title;
  media.append(img);

  const side = el("aside", "gallery-lightbox-side");
  const close = button("×", "gallery-lightbox-close", () => dialog.close());
  const description = item.description || item.linked || "Описание пока не заполнено.";
  side.append(
    close,
    el("p", "eyebrow", item.type || "Арт"),
    el("h3", "", item.title),
    item.linked ? el("p", "gallery-lightbox-linked", item.linked) : "",
    tags(item.tags),
    el("p", "gallery-lightbox-description", description)
  );
  if (isAdmin) {
    const editor = inlineEditor(options.isNew ? "Добавить арт" : "Редактировать арт", galleryEditor(item, options));
    editor.open = Boolean(options.edit);
    side.append(editor);
  }
  panel.append(media, side);
  dialog.append(panel);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  if (dialog.showModal) {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function galleryArt(item) {
  const frame = el("div", "gallery-art");
  const style = { ...defaultImageStyle(), ...(item.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  const img = document.createElement("img");
  img.src = galleryImage(item);
  img.alt = item.title;
  img.style.objectFit = style.fit;
  img.style.objectPosition = `${style.x}% ${style.y}%`;
  img.style.transform = `scale(${style.zoom})`;
  img.loading = "lazy";
  frame.append(img);
  return frame;
}

function galleryImage(item) {
  if (item.image) return item.image;
  const [a, b, c] = item.palette;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${a}"/><stop offset=".52" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
      <rect width="800" height="550" fill="${c}"/>
      <path d="M72 420 C190 168 352 90 504 146 C630 193 710 305 742 474 L72 474Z" fill="url(#g)" opacity=".92"/>
      <circle cx="570" cy="168" r="76" fill="#f6e5bd" opacity=".54"/>
      <path d="M170 366 C290 308 398 316 528 258 C608 222 668 224 734 248" stroke="#fff5d6" stroke-width="15" opacity=".32" fill="none"/>
      <text x="42" y="86" fill="#fff8e8" font-size="42" font-family="serif">${escapeSvg(item.title)}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function renderDirectory() {
  const root = el("div");
  const actions = isAdmin
    ? actionRow([
        button("Новый NPC", "primary-button", () => addNpc()),
        button("Новая фракция", "ghost-button", () => addFaction()),
      ])
    : actionRow([button("Добавить NPC", "primary-button", () => addNpc())]);
  root.append(header("NPC и фракции", "Рабочая база персонажей мира, организаций, отношений и связей с заданиями.", actions));

  const tabs = el("div", "directory-tabs");
  [
    ["npcs", `NPC (${visibleNpcs().length})`],
    ["factions", `Фракции (${visibleFactions().length})`],
    ["relationships", `Взаимоотношения (${visibleRelationships().length})`],
  ].forEach(([tab, label]) => {
    tabs.append(button(label, `tab-button ${activeDirectoryTab === tab ? "active" : ""}`, () => {
      activeDirectoryTab = tab;
      render();
    }));
  });
  root.append(tabs);
  const renderers = {
    npcs: renderNpcDirectory,
    factions: renderFactionDirectory,
    relationships: renderRelationshipsDirectory,
  };
  root.append((renderers[activeDirectoryTab] || renderNpcDirectory)());
  return root;
}

function visibleNpcGroups() {
  if (isAdmin) return state.npcGroups;
  const byId = new Map(state.npcGroups.map((group) => [group.id, group]));
  return state.npcGroups.filter((group) => {
    const visited = new Set();
    let current = group;
    while (current) {
      if (visited.has(current.id) || !current.public) return false;
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : null;
    }
    return true;
  });
}

function npcGroupChildren(parentId, groups = state.npcGroups) {
  return groups.filter((group) => group.parentId === parentId);
}

function npcGroupDescendants(groupId, groups = state.npcGroups) {
  const result = [];
  const pending = [groupId];
  const visited = new Set();
  while (pending.length) {
    const id = pending.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const group = groups.find((item) => item.id === id);
    if (!group) continue;
    result.push(group);
    npcGroupChildren(id, groups).forEach((child) => pending.push(child.id));
  }
  return result;
}

function npcGroupNpcIds(groupId, groups = state.npcGroups) {
  return new Set(npcGroupDescendants(groupId, groups).flatMap((group) => group.npcIds));
}

function flattenNpcGroupTree(groups = state.npcGroups) {
  const result = [];
  const ids = new Set(groups.map((group) => group.id));
  const append = (group, depth) => {
    result.push({ group, depth });
    npcGroupChildren(group.id, groups).forEach((child) => append(child, depth + 1));
  };
  groups.filter((group) => !group.parentId || !ids.has(group.parentId)).forEach((group) => append(group, 0));
  return result;
}

function addNpcGroup(parentId = "") {
  const parent = state.npcGroups.find((group) => group.id === parentId);
  const group = normalizeNpcGroup({
    name: parent ? `Подвкладка: ${parent.name}` : "Новая вкладка",
    parentId: parent?.id || "",
    npcIds: [],
    public: parent?.public ?? true,
  });
  state.npcGroups.push(group);
  activeNpcGroupId = group.id;
  collapsedNpcGroupIds.delete(parentId);
  npcGroupManagerOpen = true;
  saveState();
  saveUiState();
  render();
}

function npcGroupTabs() {
  const tree = el("section", "panel npc-group-tree");
  const groups = visibleNpcGroups();
  if (activeNpcGroupId && !groups.some((group) => group.id === activeNpcGroupId)) activeNpcGroupId = "";
  const visibleNpcIds = new Set(visibleNpcs().map((npc) => npc.id));
  const openGroup = (id) => {
    activeNpcGroupId = id;
    const memberIds = id ? npcGroupNpcIds(id, groups) : visibleNpcIds;
    if (!memberIds.has(activeNpcId)) {
      activeNpcId = visibleNpcs().find((npc) => memberIds.has(npc.id))?.id ?? null;
    }
    saveUiState();
    render();
  };
  const makeGroupButton = (id, name, count, isPublic) => {
    const label = `${name} · ${count}${isAdmin && !isPublic ? " · скрыто" : ""}`;
    return button(label, `tab-button npc-group-tab ${activeNpcGroupId === id ? "active" : ""}`, () => openGroup(id));
  };
  const allRow = el("div", "npc-group-tree-row npc-group-tree-root");
  allRow.append(el("span", "npc-group-toggle-spacer"), makeGroupButton("", "Все NPC", visibleNpcIds.size, true));
  const branches = el("div", "npc-group-tree-branches");
  const appendBranch = (group, depth) => {
    const children = npcGroupChildren(group.id, groups);
    const row = el("div", "npc-group-tree-row");
    row.style.setProperty("--npc-group-depth", depth);
    if (children.length) {
      const collapsed = collapsedNpcGroupIds.has(group.id);
      const toggle = button(collapsed ? "+" : "−", "npc-group-toggle", () => {
        if (collapsed) collapsedNpcGroupIds.delete(group.id);
        else collapsedNpcGroupIds.add(group.id);
        saveUiState();
        render();
      });
      toggle.title = collapsed ? "Развернуть подвкладки" : "Свернуть подвкладки";
      toggle.setAttribute("aria-label", toggle.title);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      row.append(toggle);
    } else {
      row.append(el("span", "npc-group-toggle-spacer"));
    }
    const count = [...npcGroupNpcIds(group.id, groups)].filter((id) => visibleNpcIds.has(id)).length;
    row.append(makeGroupButton(group.id, group.name, count, group.public));
    branches.append(row);
    if (!collapsedNpcGroupIds.has(group.id)) children.forEach((child) => appendBranch(child, depth + 1));
  };
  const groupIds = new Set(groups.map((group) => group.id));
  groups
    .filter((group) => !group.parentId || !groupIds.has(group.parentId))
    .forEach((group) => appendBranch(group, 0));
  tree.append(el("div", "npc-group-tree-title", "Подборки NPC"), allRow, branches);
  return tree;
}

function npcGroupManager() {
  const details = el("details", "panel npc-group-manager");
  details.open = Boolean(npcGroupManagerOpen);
  details.addEventListener("toggle", () => {
    npcGroupManagerOpen = details.open;
  });
  const summary = el("summary", "", "Настроить вкладки NPC");
  const body = el("div", "admin-stack npc-group-manager-body");
  const add = button("Новая корневая вкладка", "primary-button", () => addNpcGroup());
  body.append(
    el("p", "muted", "Собирай NPC в древовидные подборки. Родительская вкладка показывает NPC из всех своих подвкладок. Скрытие родителя скрывает от игроков всё поддерево."),
    actionRow([add])
  );
  const list = el("div", "npc-group-editor-list");
  if (!state.npcGroups.length) {
    list.append(el("div", "empty-state", "Пользовательских вкладок пока нет."));
  }
  flattenNpcGroupTree(state.npcGroups).forEach(({ group, depth }) => {
    const shell = el("div", "npc-group-editor-shell");
    shell.style.setProperty("--npc-group-depth", Math.min(depth, 6));
    const form = el("form", "npc-group-editor");
    const name = input(group.name);
    const descendantIds = new Set(npcGroupDescendants(group.id).map((item) => item.id));
    const parentOptions = [
      ["", "Без родительской вкладки"],
      ...flattenNpcGroupTree(state.npcGroups)
        .filter(({ group: candidate }) => !descendantIds.has(candidate.id))
        .map(({ group: candidate, depth: candidateDepth }) => [
          candidate.id,
          `${"— ".repeat(candidateDepth)}${candidate.name}`,
        ]),
    ];
    const parent = selectInput(parentOptions, group.parentId);
    const publicControl = document.createElement("input");
    publicControl.type = "checkbox";
    publicControl.checked = group.public;
    const members = searchableCheckboxList(
      state.npcs.map((npc) => [npc.id, npc.name, [npc.role, npc.location, npc.tags.join(" ")].filter(Boolean).join(" ")]),
      group.npcIds,
      "",
      null,
      "Поиск NPC для вкладки"
    );
    form.append(
      el("strong", "npc-group-editor-title span-2", `${depth ? "Подвкладка" : "Вкладка"}: ${group.name}`),
      labelWrap("Название вкладки", name),
      labelWrap("Родительская вкладка", parent),
      labelWrap("Видимость", checkboxWrap("Показывать игрокам", publicControl), "span-2"),
      labelWrap("NPC во вкладке", members, "span-2"),
      actionRow([
        button("Сохранить вкладку", "primary-button", null, "submit"),
        button("Добавить подвкладку", "ghost-button", () => addNpcGroup(group.id)),
        button("Удалить", "ghost-button", () => {
          if (!confirm(`Удалить вкладку "${group.name}"? NPC останутся на месте, а её подвкладки поднимутся на уровень выше.`)) return;
          state.npcGroups.forEach((item) => {
            if (item.parentId === group.id) item.parentId = group.parentId;
          });
          state.npcGroups = state.npcGroups.filter((item) => item.id !== group.id);
          collapsedNpcGroupIds.delete(group.id);
          if (activeNpcGroupId === group.id) activeNpcGroupId = "";
          npcGroupManagerOpen = true;
          saveState();
          saveUiState();
          render();
        }),
      ], "span-2")
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      group.name = name.value.trim() || "Без названия";
      group.public = publicControl.checked;
      group.parentId = parent.value;
      group.npcIds = checkedValues(members);
      state.npcGroups = sanitizeNpcGroupHierarchy(state.npcGroups);
      npcGroupManagerOpen = true;
      saveState();
      saveUiState();
      render();
    });
    shell.append(form);
    list.append(shell);
  });
  body.append(list);
  details.append(summary, body);
  return details;
}

function renderNpcDirectory() {
  hideNpcListPreview();
  const root = el("div", "admin-stack npc-directory-section");
  const groups = visibleNpcGroups();
  if (activeNpcGroupId && !groups.some((group) => group.id === activeNpcGroupId)) activeNpcGroupId = "";
  const activeGroup = groups.find((group) => group.id === activeNpcGroupId);
  const activeGroupNpcIds = activeGroup ? npcGroupNpcIds(activeGroup.id, groups) : null;
  const groupNpcs = activeGroup
    ? visibleNpcs().filter((npc) => activeGroupNpcIds.has(npc.id))
    : visibleNpcs();
  const availableTags = [...new Set(visibleNpcs().flatMap((npc) => npc.tags ?? []))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "ru"));
  if (activeNpcTag && !availableTags.includes(activeNpcTag)) activeNpcTag = "";
  const taggedNpcs = activeNpcTag
    ? groupNpcs.filter((npc) => (npc.tags ?? []).includes(activeNpcTag))
    : groupNpcs;
  const npcNameNeedle = npcDirectorySearchTerm.trim().toLowerCase();
  const items = filterItems(taggedNpcs, (npc) =>
    [
      npc.name,
      npc.role,
      npc.ancestry,
      npc.culture,
      npc.religion,
      npc.location,
      npc.tags.join(" "),
      npc.description,
      npc.alignment,
      npc.estate,
      npc.personalityTraits.map((trait) => `${trait.name} ${trait.description}`).join(" "),
      npc.notes,
      npc.mechanicsNotes,
      factionById(npc.factionId)?.name ?? "",
    ].join(" ")
  );
  if (!items.some((npc) => npc.id === activeNpcId)) activeNpcId = items[0]?.id ?? null;
  const active = items.find((npc) => npc.id === activeNpcId);
  const layout = el("div", "character-layout npc-layout");
  const list = el("aside", "panel list-panel npc-list-panel");
  items.forEach((npc) => {
    const item = button(npc.name, "list-button npc-list-button", () => {
      npcDirectoryScrollTop = list.scrollTop;
      activeNpcId = npc.id;
      saveUiState();
      render();
    });
    item.title = npc.name;
    item.addEventListener("mouseenter", () => scheduleNpcListPreview(item, npc));
    item.addEventListener("mouseleave", hideNpcListPreview);
    item.addEventListener("focus", () => scheduleNpcListPreview(item, npc));
    item.addEventListener("blur", hideNpcListPreview);
    item.classList.toggle("active", npc.id === activeNpcId);
    item.classList.toggle("is-hidden", Boolean(npcNameNeedle) && !npc.name.toLowerCase().includes(npcNameNeedle));
    list.append(item);
  });
  list.addEventListener("scroll", () => {
    if (!list.isConnected) return;
    npcDirectoryScrollTop = list.scrollTop;
    hideNpcListPreview();
  }, { passive: true });
  const sheet = el("section", "sheet-panel npc-sheet-panel");
  sheet.append(active ? npcSheet(active) : el("div", "empty-state", "NPC не найдены"));
  layout.append(list, sheet);
  root.append(npcGroupTabs());
  const tagBar = el("div", "gallery-filter-bar npc-filter-bar");
  tagBar.setAttribute("aria-label", "Фильтр NPC по тегам");
  tagBar.append(button("Все", `tag tag-button ${activeNpcTag ? "" : "active"}`, () => {
    activeNpcTag = "";
    npcDirectoryScrollTop = 0;
    saveUiState();
    render();
  }));
  availableTags.forEach((tagName) => {
    const tagButton = button(tagName, `tag tag-button ${activeNpcTag === tagName ? "active" : ""}`, () => {
      activeNpcTag = activeNpcTag === tagName ? "" : tagName;
      npcDirectoryScrollTop = 0;
      saveUiState();
      render();
    });
    attachTagTooltip(tagButton, tagName);
    tagBar.append(tagButton);
  });
  root.append(tagBar);
  root.append(directorySearchControl(
    "npcDirectorySearch",
    npcDirectorySearchTerm,
    "Поиск NPC по имени",
    (value) => { npcDirectorySearchTerm = value; },
    ".npc-list-button"
  ));
  if (isAdmin) root.append(npcGroupManager());
  root.append(layout);
  requestAnimationFrame(() => {
    if (list.isConnected) list.scrollTop = npcDirectoryScrollTop;
  });
  return root;
}

function scheduleNpcListPreview(anchor, npc) {
  hideNpcListPreview();
  npcListPreviewTimer = window.setTimeout(() => showNpcListPreview(anchor, npc), 180);
}

function showNpcListPreview(anchor, npc) {
  hideNpcListPreview();
  if (!anchor.isConnected) return;
  const currentNpc = state.npcs.find((item) => item.id === npc.id) ?? npc;
  const preview = el("div", "npc-list-preview");
  preview.append(
    directoryPortrait(currentNpc.portrait, currentNpc.name, currentNpc.portraitStyle),
    el("strong", "", currentNpc.name)
  );
  document.body.append(preview);
  const anchorRect = anchor.getBoundingClientRect();
  const width = preview.offsetWidth;
  const height = preview.offsetHeight;
  const right = anchorRect.right + 10;
  const left = right + width <= window.innerWidth - 12
    ? right
    : Math.max(12, anchorRect.left - width - 10);
  const top = Math.min(
    window.innerHeight - height - 12,
    Math.max(12, anchorRect.top + (anchorRect.height - height) / 2)
  );
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
  activeNpcListPreview = preview;
}

function hideNpcListPreview() {
  window.clearTimeout(npcListPreviewTimer);
  npcListPreviewTimer = null;
  activeNpcListPreview?.remove();
  activeNpcListPreview = null;
}

function npcSheet(npc) {
  const root = el("div", "admin-stack");
  const faction = factionById(npc.factionId);
  const head = el("div", "character-head npc-head");
  head.append(directoryPortrait(npc.portrait, npc.name, npc.portraitStyle));
  const copy = el("div");
  copy.append(
    el("p", "eyebrow", ["NPC", optionLabel(npcStatuses, npc.status)].filter(Boolean).join(" · ")),
    el("h3", "", npc.name),
    el("p", "muted", [npc.ancestry, npc.className, npc.role, npc.location, faction?.name].filter(Boolean).join(" · ") || "Карточка NPC"),
    compactBadges([
      `уровень ${npc.level}`,
      npc.alignment || "мировоззрение не указано",
      npc.public ? "игрокам" : "скрыто",
      npc.adminOnlyEdit ? "только мастер" : "редактируется игроками",
      npc.lastSeen ? `видели: ${npc.lastSeen}` : "встреч не было",
    ]),
    isAdmin ? actionRow([
      button("Дублировать NPC", "ghost-button", () => duplicateNpc(npc)),
      button("Перенести в персонажи", "ghost-button", () => transferNpcToCharacter(npc)),
    ]) : ""
  );
  head.append(copy);
  root.append(head, tags(npc.tags), npcTabBar());
  const content = el("div", "character-tab-content npc-tab-content");
  if (activeNpcTab === "overview") content.append(npcOverview(npc));
  if (activeNpcTab === "notes") content.append(npcNotes(npc));
  if (activeNpcTab === "factions") content.append(npcFactions(npc));
  if (activeNpcTab === "recognition") content.append(npcRecognition(npc));
  if (activeNpcTab === "mechanics") content.append(npcMechanics(npc));
  if (activeNpcTab === "links") content.append(npcLinks(npc));
  if (activeNpcTab === "gm") content.append(npcGm(npc));
  if (canEditNpc(npc)) {
    content.append(npcTabEditor(npc));
  } else {
    content.append(el("p", "character-edit-locked", "Редактирование этого NPC доступно только мастеру."));
  }
  root.append(content);
  return root;
}

function canEditNpc(npc) {
  return isAdmin || !npc.adminOnlyEdit;
}

function npcTabBar() {
  const tabs = el("div", "tabs");
  const availableTabs = npcTabs.filter(([id]) => id !== "gm" || isAdmin);
  if (!availableTabs.some(([id]) => id === activeNpcTab)) activeNpcTab = "overview";
  availableTabs.forEach(([id, label]) => {
    tabs.append(button(label, `tab-button ${activeNpcTab === id ? "active" : ""}`, () => {
      activeNpcTab = id;
      saveUiState();
      render();
    }));
  });
  return tabs;
}

function npcOverview(npc) {
  const faction = factionById(npc.factionId);
  const linkedFactions = linkedFactionsByIds(npc.factionLinks)
    .filter((item) => item.id !== npc.factionId)
    .map((item) => item.name)
    .join(", ");
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Паспорт NPC", [
      ["Имя", npc.name],
      ["Статус", optionLabel(npcStatuses, npc.status)],
      ["Раса/народ", npc.ancestry || "не указано"],
      ["Родина", npc.homeland || "не указано"],
      ["Культура", npc.culture || "не указано"],
      ["Вероисповедание", npc.religion || "не указано"],
      ["Божество", npc.deity || "не указано"],
      ["Мировоззрение", npc.alignment || "не указано"],
      ["Сословие", npc.estate || "не указано"],
      ["Размер", npc.size || "не указано"],
      ["Пол", npc.gender || "не указано"],
      ["Класс Опасности", npc.dangerClass || "не указано"],
      ["Возраст", npc.age || "не указано"],
      ["Рост", npc.height || "не указано"],
      ["Вес", npc.weight || "не указано"],
      ["Семейный статус", npc.maritalStatus || "не указано"],
      ["Роль", npc.role || "не указано"],
      ["Классы и уровни", npcLevelSummary(npc)],
      ["Локация", npc.location || "не указано"],
      ["Последняя встреча", npc.lastSeen || "не указано"],
      ["Фракция", faction?.name || "без фракции"],
      ["Роль во фракции", npc.factionRole || "не указано"],
      ["Ранг/должность", npc.factionRank || "не указано"],
      ["Репутация во фракции", npc.factionReputation || "не указано"],
      ["Другие фракции", linkedFactions || "не указаны"],
      ["Видимость", npc.public ? "видно игрокам" : "скрыто от игроков"],
      ["Редактирование", npc.adminOnlyEdit ? "только мастер" : "мастер и игроки"],
    ]),
    infoPanel("Описание", [
      ["Игрокам", npc.description || "описание пока не заполнено"],
      ["Внешность", npc.appearance || "не указано"],
      ["Манера речи", npc.voice || "не указано"],
    ]),
    npcPersonalityPanel(npc)
  );
  return root;
}

function npcLevelSummary(npc) {
  return npc.levels?.length
    ? npc.levels.map((entry) => `${entry.className || "класс"} ${entry.level}${entry.notes ? ` (${entry.notes})` : ""}`).join(" / ")
    : `общий уровень ${npc.level || 1}`;
}

function npcPersonalityPanel(npc) {
  const panel = el("section", "panel admin-stack npc-personality-panel");
  panel.append(el("h3", "", "Характер"));
  const traits = el("div", "npc-trait-list");
  (npc.personalityTraits ?? []).forEach((trait) => {
    const chip = el("span", "npc-trait-chip", trait.name);
    chip.tabIndex = 0;
    chip.setAttribute("aria-label", `${trait.name}: ${trait.description || "описание не заполнено"}`);
    chip.append(el("span", "npc-trait-tooltip", trait.description || "Описание черты пока не заполнено."));
    traits.append(chip);
  });
  panel.append(traits.children.length ? traits : el("p", "muted", "Черты характера пока не добавлены"));
  return panel;
}

function npcNotes(npc) {
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Заметки о персонаже", [
      ["Последняя встреча", npc.lastSeen || "не указано"],
      ["Записи", npc.notes || "заметок пока нет"],
    ])
  );
  return root;
}

function npcFactions(npc) {
  const primary = factionById(npc.factionId);
  const linked = linkedFactionsByIds(npc.factionLinks).filter((faction) => faction.id !== npc.factionId);
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Позиция во фракциях", [
      ["Основная фракция", primary?.name || "без фракции"],
      ["Роль", npc.factionRole || "не указано"],
      ["Ранг/должность", npc.factionRank || "не указано"],
      ["Репутация", npc.factionReputation || "не указано"],
    ]),
    infoPanel("Связанные фракции", [], [
      ...(primary ? [button(`Открыть: ${primary.name}`, "small-button", () => openFaction(primary.id))] : []),
      ...linked.map((faction) => button(faction.name, "small-button", () => openFaction(faction.id))),
    ])
  );
  return root;
}

function npcRecognition(npc) {
  return recognitionView(npc, "Признание NPC");
}

function npcMechanics(npc) {
  const root = el("div", "admin-stack pathfinder-sheet npc-pathfinder-sheet");
  const masthead = el("div", "pathfinder-sheet-masthead");
  masthead.append(
    el("span", "pathfinder-sheet-mark", "PF1"),
    el("div", "", ""),
    el("strong", "", npc.name),
    el("span", "", `${npcLevelSummary(npc)} · ${npc.alignment || "мировоззрение не указано"}`)
  );
  const tabs = el("div", "tabs pathfinder-sheet-tabs");
  npcMechanicsTabs.forEach(([id, label]) => {
    tabs.append(button(label, `tab-button ${activeNpcMechanicsTab === id ? "active" : ""}`, () => {
      activeNpcMechanicsTab = id;
      saveUiState();
      render();
    }));
  });
  const body = el("div", "pathfinder-sheet-body");
  const sections = {
    summary: npcMechanicsSummary,
    stats: characterStats,
    combat: characterCombat,
    skills: characterSkills,
    features: characterFeatures,
    magic: characterMagic,
    inventory: characterInventory,
  };
  body.append((sections[activeNpcMechanicsTab] || npcMechanicsSummary)(npc));
  root.append(masthead, tabs, body);
  return root;
}

function npcMechanicsSummary(npc) {
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Данные персонажа", [
      ["Имя", npc.name],
      ["Раса/народ", npc.ancestry || "не указано"],
      ["Классы", npcLevelSummary(npc)],
      ["Общий уровень", npc.level],
      ["Мировоззрение", npc.alignment || "не указано"],
      ["Родина", npc.homeland || "не указано"],
      ["Размер", npc.size || "не указано"],
      ["Пол", npc.gender || "не указано"],
      ["Божество", npc.deity || "не указано"],
      ["Класс Опасности", npc.dangerClass || "не указано"],
      ["Возраст", npc.age || "не указано"],
      ["Рост", npc.height || "не указано"],
      ["Вес", npc.weight || "не указано"],
      ["Семейный статус", npc.maritalStatus || "не указано"],
    ]),
    infoPanel("Ключевые показатели", [
      ["HP", npc.hp || "не указано"],
      ["AC", npc.ac],
      ["Инициатива", signed(npc.initiative)],
      ["Скорость", movementSpeedSummary(npc)],
      ["Языки", npc.languages || "не указаны"],
    ]),
    infoPanel("Механические заметки", [[npc.mechanicsNotes || "нет заметок", ""]])
  );
  return root;
}

function npcLinks(npc) {
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Связанные материалы", [], [
      ...linkedWikiByIds(npc.wikiLinks).map((article) => button(`Wiki: ${article.title}`, "small-button", () => openWikiArticle(article.id))),
      ...linkedQuestsByIds(npc.questLinks).map((quest) => button(`Задание: ${quest.title}`, "small-button", () => openQuest(quest.id))),
      ...linkedMapRegionsByIds(npc.mapLinks).map((region) => button(`Карта: ${region.title}`, "small-button", () => openMapRegion(region.id))),
    ]),
    infoPanel("Связанные NPC", [], linkedNpcsByIds(npc.npcLinks, npc.id).map((item) => button(item.name, "small-button", () => openNpc(item.id))))
  );
  return root;
}

function npcGm(npc) {
  const root = el("div", "sheet-section-grid");
  root.append(
    infoPanel("Секреты", [[npc.secrets || "секреты пока не заполнены", ""]]),
    infoPanel("GM-заметки", [[npc.gmNotes || "скрытых заметок пока нет", ""]])
  );
  return root;
}

function renderRelationshipsDirectory() {
  const root = el("div", "admin-stack relationship-directory");
  const entities = relationshipEntities();
  if (entities.length < 2) {
    root.append(el("div", "empty-state", "Для взаимоотношений нужны как минимум два NPC или персонажа."));
    return root;
  }
  if (!entities.some((entity) => entity.key === relationshipSourceKey)) relationshipSourceKey = entities[0].key;
  if (!entities.some((entity) => entity.key === relationshipTargetKey) || relationshipTargetKey === relationshipSourceKey) {
    relationshipTargetKey = entities.find((entity) => entity.key !== relationshipSourceKey)?.key || "";
  }
  const options = entities.map((entity) => [entity.key, `${entity.type === "npc" ? "NPC" : "Герой"}: ${entity.name}`]);
  const source = selectInput(options, relationshipSourceKey);
  const target = selectInput(options, relationshipTargetKey);
  const selectors = el("section", "panel relationship-selectors");
  selectors.append(
    labelWrap("Первый персонаж", source),
    el("span", "relationship-direction", "↔"),
    labelWrap("Второй персонаж", target)
  );
  const selectPair = (changed) => {
    relationshipSourceKey = source.value;
    relationshipTargetKey = target.value;
    if (relationshipSourceKey === relationshipTargetKey) {
      const replacement = entities.find((entity) => entity.key !== changed.value);
      if (changed === source) relationshipTargetKey = replacement?.key || "";
      else relationshipSourceKey = replacement?.key || "";
    }
    saveUiState();
    render();
  };
  source.addEventListener("change", () => selectPair(source));
  target.addEventListener("change", () => selectPair(target));
  root.append(selectors, relationshipDetail(relationshipSourceKey, relationshipTargetKey));
  return root;
}

function relationshipDetail(sourceKey, targetKey) {
  const source = relationshipEntity(sourceKey);
  const target = relationshipEntity(targetKey);
  const relationship = relationshipBetween(sourceKey, targetKey);
  const panel = el("section", "panel relationship-detail");
  if (!source || !target) {
    panel.append(el("div", "empty-state", "Выбери двух персонажей."));
    return panel;
  }
  const people = el("div", "relationship-people");
  [source, target].forEach((entity) => {
    const person = el("div", "relationship-person");
    person.append(directoryPortrait(entity.portrait, entity.name, entity.portraitStyle));
    const copy = el("div");
    copy.append(el("strong", "", entity.name), el("span", "muted", entity.subtitle || (entity.type === "npc" ? "NPC" : "Персонаж")));
    person.append(copy);
    person.addEventListener("click", () => entity.type === "npc" ? openNpc(entity.id) : openCharacter(entity.id));
    people.append(person);
  });
  const value = Number(relationship?.value ?? 0);
  const meter = el("div", `relationship-meter relation-${relationshipScaleTone(value)}`);
  const fill = el("div", "relationship-meter-fill");
  fill.style.setProperty("--relation-position", `${(value + 100) / 2}%`);
  meter.append(fill, el("span", "relationship-meter-min", "-100"), el("span", "relationship-meter-zero", "0"), el("span", "relationship-meter-max", "+100"));
  const summary = el("div", "relationship-summary");
  summary.append(
    el("p", "eyebrow", relationship?.title || relationshipScaleLabel(value)),
    el("strong", "relationship-score", `${value > 0 ? "+" : ""}${value}`),
    el("p", "", relationship?.description || "Взаимоотношения пока не описаны.")
  );
  panel.append(people, meter, summary);
  if (isAdmin) panel.append(relationshipEditor(source, target, relationship));
  return panel;
}

function relationshipScaleTone(value) {
  const relation = Number(value || 0);
  if (relation <= -40) return "bad";
  if (relation < 0) return "cold";
  if (relation >= 40) return "good";
  if (relation > 0) return "warm";
  return "neutral";
}

function relationshipScaleLabel(value) {
  const relation = Number(value || 0);
  if (relation <= -80) return "Непримиримая вражда";
  if (relation <= -40) return "Вражда";
  if (relation < 0) return "Напряжение";
  if (relation === 0) return "Нейтральные отношения";
  if (relation < 40) return "Расположение";
  if (relation < 80) return "Доверие";
  return "Глубокая преданность";
}

function relationshipEditor(source, target, relationship) {
  const form = el("form", "character-edit-form relationship-editor");
  const title = input(relationship?.title || relationshipScaleLabel(relationship?.value ?? 0));
  const description = textarea(relationship?.description || "");
  const value = rangeInput(relationship?.value ?? 0, -100, 100, 1);
  const valueLabel = el("strong", "relationship-editor-value", String(relationship?.value ?? 0));
  value.addEventListener("input", () => {
    valueLabel.textContent = `${Number(value.value) > 0 ? "+" : ""}${value.value}`;
    if (!title.dataset.edited) title.value = relationshipScaleLabel(value.value);
  });
  title.addEventListener("input", () => { title.dataset.edited = "true"; });
  const publicInput = document.createElement("input");
  publicInput.type = "checkbox";
  publicInput.checked = relationship?.public ?? true;
  const actions = [button("Сохранить взаимоотношения", "primary-button", null, "submit")];
  if (relationship) actions.push(button("Удалить запись", "ghost-button", () => {
    if (!confirm(`Удалить описание отношений между ${source.name} и ${target.name}?`)) return;
    state.relationships = state.relationships.filter((item) => item.id !== relationship.id);
    saveState();
    render();
  }));
  form.append(
    labelWrap("Оценка от -100 до +100", fragment([value, valueLabel]), "span-2"),
    labelWrap("Название отношений", title, "span-2"),
    labelWrap("Описание", description, "span-2"),
    checkboxWrap("Видно игрокам", publicInput),
    actionRow(actions, "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeRelationship({
      id: relationship?.id,
      sourceKey: source.key,
      targetKey: target.key,
      value: Number(value.value),
      title: title.value,
      description: description.value,
      public: publicInput.checked,
    });
    const index = state.relationships.findIndex((item) => item.sourceKey === next.sourceKey && item.targetKey === next.targetKey);
    if (index >= 0) state.relationships[index] = next;
    else state.relationships.push(next);
    saveState();
    render();
  });
  return editorPanel("Редактор взаимоотношений", form);
}

function renderFactionDirectory() {
  const grid = el("div", "directory-grid faction-directory-list");
  const items = filterItems(visibleFactions(), (faction) =>
    [
      faction.name,
      factionTypeLabel(faction),
      faction.level,
      faction.leader,
      faction.headquarters,
      faction.tags.join(" "),
      faction.description,
      faction.finances,
      faction.traits.map((trait) => `${trait.name} ${trait.description}`).join(" "),
    ].join(" ")
  );
  items.forEach((faction) => grid.append(factionCard(faction)));
  return grid.children.length ? grid : el("div", "empty-state", "Фракции не найдены");
}

function npcCard(npc) {
  const card = el("article", "directory-card");
  const head = el("div", "directory-card-head");
  head.append(directoryPortrait(npc.portrait, npc.name, npc.portraitStyle), directoryTitleBlock(
    npc.name,
    [npc.role, factionById(npc.factionId)?.name, npc.location].filter(Boolean),
    [`ур. ${npc.level}`, optionLabel(npcStatuses, npc.status), npc.public ? "игрокам" : "скрыто"]
  ));
  card.append(head);
  card.append(tags(npc.tags));
  card.append(el("p", "directory-description", npc.description || "Описание пока не заполнено."));
  card.append(directoryMeta([
    ["Раса/народ", npc.ancestry],
    ["Локация", npc.location],
    ["Последняя встреча", npc.lastSeen],
  ]));
  card.append(directoryLinks([
    ...linkedWikiByIds(npc.wikiLinks).map((article) => [`Wiki: ${article.title}`, () => openWikiArticle(article.id)]),
    ...linkedQuestsByIds(npc.questLinks).map((quest) => [`Задание: ${quest.title}`, () => openQuest(quest.id)]),
    ...(npc.factionId && factionById(npc.factionId) ? [[`Фракция: ${factionById(npc.factionId).name}`, () => openFaction(npc.factionId)]] : []),
  ]));
  if (isAdmin && npc.gmNotes) card.append(el("p", "gm-inline", `GM: ${npc.gmNotes}`));
  if (isAdmin) card.append(inlineEditor("Редактировать NPC", npcEditor(npc)));
  return card;
}

function factionCard(faction) {
  const card = el("article", "directory-card");
  const head = el("div", "directory-card-head");
  head.append(directoryPortrait(faction.image, faction.name), directoryTitleBlock(
    faction.name,
    [factionTypeLabel(faction), `Уровень ${faction.level}`],
    [faction.public ? "игрокам" : "скрыто"]
  ));
  card.append(head);
  card.append(tags(faction.tags));
  card.append(el("p", "directory-description", faction.description || "Описание пока не заполнено."));
  card.append(directoryMeta([
    ["Лидер", faction.leader],
    ["Штаб/территория", faction.headquarters],
    ["Цели", faction.goals],
    ["Ресурсы", faction.resources],
    ["Финансы", faction.finances],
  ]));
  if (faction.traits.length) {
    const traitsPanel = el("section", "faction-traits");
    traitsPanel.append(el("strong", "", "Черты фракции"));
    const traitList = el("div", "npc-trait-list");
    faction.traits.forEach((trait) => {
      const traitRow = el("div", "faction-trait-row");
      const chip = el("span", "npc-trait-chip", trait.name);
      chip.tabIndex = 0;
      chip.setAttribute("aria-label", `${trait.name}: ${trait.description || "описание не заполнено"}`);
      chip.append(el("span", "npc-trait-tooltip", trait.description || "Описание черты пока не заполнено."));
      traitRow.append(chip);
      const lieutenant = relationshipEntity(trait.responsibleEntityKey);
      if (lieutenant) {
        traitRow.append(button(`Ответственный лейтенант: ${lieutenant.name}`, "map-link-button", () => openRelationshipEntity(lieutenant)));
      }
      traitList.append(traitRow);
    });
    traitsPanel.append(traitList);
    card.append(traitsPanel);
  }
  const buildingResources = faction.resourceBuildings
    .map((resource) => settlementBuildingRecord(resource.buildingRef))
    .filter((record) => record && (isAdmin || (record.settlement.public && record.building.public)));
  if (buildingResources.length) {
    const resources = el("section", "faction-building-resources");
    resources.append(el("strong", "", "Связанные постройки"));
    const links = el("div", "directory-links");
    buildingResources.forEach((record) => {
      links.append(button(record.label, "map-link-button", () => openSettlementBuildingRecord(record)));
    });
    resources.append(links);
    card.append(resources);
  }
  const memberNpcs = visibleNpcs().filter((npc) => npc.factionId === faction.id || faction.npcLinks.includes(npc.id));
  const controlledHexes = mapOwnershipRecords("faction", faction.id);
  if (controlledHexes.length) {
    const territory = el("section", "faction-territory");
    territory.append(el("strong", "", `Территории на карте · ${controlledHexes.length}`));
    const links = el("div", "directory-links");
    controlledHexes.forEach((record) => {
      if (!isAdmin && (!record.region.public || !record.cell.visible)) return;
      links.append(button(record.cell.title || `${record.region.title} · ${record.key}`, "map-link-button", () => openCountryHex(record.ref)));
    });
    territory.append(links.children.length ? links : el("p", "muted", "Территории скрыты мастером."));
    card.append(territory);
  }
  card.append(directoryLinks([
    ...memberNpcs.map((npc) => [`NPC: ${npc.name}`, () => openNpc(npc.id)]),
    ...linkedWikiByIds(faction.wikiLinks).map((article) => [`Wiki: ${article.title}`, () => openWikiArticle(article.id)]),
    ...linkedQuestsByIds(faction.questLinks).map((quest) => [`Задание: ${quest.title}`, () => openQuest(quest.id)]),
  ]));
  if (isAdmin && faction.gmNotes) card.append(el("p", "gm-inline", `GM: ${faction.gmNotes}`));
  if (isAdmin) card.append(inlineEditor("Редактировать фракцию", factionEditor(faction)));
  return card;
}

function directoryPortrait(src, name, imageStyle = null) {
  const frame = el("div", "directory-portrait");
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = name;
    img.className = "directory-portrait-image";
    applyPortraitStyle(img, imageStyle);
    frame.append(img);
  } else {
    frame.append(el("span", "", initials(name)));
  }
  return frame;
}

function normalizedPortraitStyle(imageStyle = null) {
  const source = { ...defaultImageStyle(), ...(imageStyle ?? {}) };
  const finiteNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  return {
    ...source,
    fit: source.fit === "contain" ? "contain" : "cover",
    x: Math.min(100, Math.max(0, finiteNumber(source.x, 50))),
    y: Math.min(100, Math.max(0, finiteNumber(source.y, 50))),
    zoom: Math.min(3, Math.max(1, finiteNumber(source.zoom, 1))),
    rotation: Math.min(180, Math.max(-180, finiteNumber(source.rotation, 0))),
  };
}

function applyPortraitStyle(img, imageStyle = null) {
  const style = normalizedPortraitStyle(imageStyle);
  img.style.setProperty("object-fit", style.fit, "important");
  img.style.setProperty("object-position", `${style.x}% ${style.y}%`, "important");
  img.style.setProperty("transform", `scale(${style.zoom}) rotate(${style.rotation}deg)`, "important");
  img.style.setProperty("transform-origin", "center center", "important");
  return style;
}

function directoryTitleBlock(title, subtitles, badges) {
  const block = el("div", "directory-title");
  block.append(el("h3", "", title), el("p", "", subtitles.filter(Boolean).join(" · ") || "Без роли"));
  block.append(compactBadges(badges));
  return block;
}

function directoryMeta(rows) {
  const meta = el("div", "directory-meta");
  rows.filter(([, value]) => value).forEach(([label, value]) => {
    const item = el("div", "directory-meta-item");
    item.append(el("span", "", label), el("strong", "", value));
    meta.append(item);
  });
  return meta;
}

function directoryLinks(entries) {
  const box = el("div", "map-link-list");
  entries.forEach(([label, handler]) => box.append(button(label, "map-link-button", handler)));
  return box.children.length ? box : el("p", "muted", "Связей пока нет");
}

function inlineEditor(title, content) {
  const details = el("details", "inline-editor");
  details.append(el("summary", "", title), content);
  return details;
}

function lazyInlineEditor(title, createContent) {
  const details = el("details", "inline-editor");
  details.append(el("summary", "", title));
  details.addEventListener("toggle", () => {
    if (details.open && details.children.length === 1) details.append(createContent());
  });
  return details;
}

async function saveNpc(npc) {
  if (!canEditNpc(npc)) {
    alert("Этот NPC доступен для редактирования только мастеру.");
    await loadCloudState();
    render();
    return false;
  }
  Object.assign(npc, normalizeNpc(npc));
  if (isAdmin) {
    saveState();
  } else if (!(await updatePublicNpc(npc))) {
    return false;
  }
  render();
  return true;
}

function npcTabEditor(npc) {
  const editors = {
    overview: npcOverviewEditor,
    notes: npcNotesEditor,
    factions: npcFactionsEditor,
    recognition: npcRecognitionEditor,
    mechanics: npcMechanicsEditor,
    links: npcLinksEditor,
    gm: npcGmEditor,
  };
  return editors[activeNpcTab]?.(npc) ?? "";
}

function structuredRowsEditor(items, columns, addLabel) {
  const root = el("div", "structured-rows-editor");
  const list = el("div", "structured-rows-list");
  const rows = [];
  const syncRows = () => {
    rows.forEach((row) => {
      columns.forEach((column) => {
        const control = row.controls[column.key];
        if (!control) return;
        row.values[column.key] = column.type === "checkbox" ? control.checked : control.value;
      });
    });
  };
  const renderRows = () => {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const line = el("div", "structured-row");
      columns.forEach((column) => {
        let control;
        if (column.options) {
          control = selectInput(column.options, row.values[column.key] ?? column.defaultValue ?? "");
        } else if (column.type === "textarea") {
          control = textarea(row.values[column.key] || "");
        } else if (column.type === "checkbox") {
          control = document.createElement("input");
          control.type = "checkbox";
          control.checked = Boolean(row.values[column.key] ?? column.defaultValue ?? false);
        } else {
          control = input(row.values[column.key] ?? column.defaultValue ?? "");
        }
        if (column.type === "number") {
          control.type = "number";
          if (column.min !== undefined) control.min = String(column.min);
          if (column.max !== undefined) control.max = String(column.max);
          control.step = String(column.step ?? 1);
        }
        control.placeholder = column.label;
        control.dataset.key = column.key;
        row.controls[column.key] = control;
        line.append(labelWrap(column.label, control));
      });
      line.append(button("Удалить", "ghost-button", () => {
        syncRows();
        rows.splice(index, 1);
        renderRows();
      }));
      list.append(line);
    });
  };
  const addRow = (values = {}) => {
    syncRows();
    rows.push({ values: { ...values }, controls: {} });
    renderRows();
  };
  (items ?? []).forEach((item) => rows.push({ values: { ...item }, controls: {} }));
  renderRows();
  root.append(list, button(addLabel, "small-button", () => addRow()));
  return {
    element: root,
    read: () => rows.map((row, index) => ({
      id: row.values.id || `${columns[0]?.key || "row"}-${index + 1}-${Date.now()}`,
      ...Object.fromEntries(columns.map((column) => {
        const control = row.controls[column.key];
        const value = column.type === "checkbox"
          ? Boolean(control?.checked)
          : control?.value ?? row.values[column.key] ?? "";
        if (column.type === "number") return [column.key, Number(value || 0)];
        if (column.type === "checkbox") return [column.key, value];
        return [column.key, String(value).trim()];
      })),
    })).filter((row) => columns.some((column) => column.type !== "checkbox" && row[column.key] !== "" && row[column.key] !== 0)),
  };
}

function searchableSelectPicker(records, initialValue = "", placeholder = "Начните вводить имя") {
  const root = el("div", "searchable-select-picker");
  const search = input("");
  const select = document.createElement("select");
  search.type = "search";
  search.placeholder = placeholder;
  let selectedValue = String(initialValue || "");
  const refresh = () => {
    const currentValue = select.value || selectedValue;
    const term = search.value.trim().toLocaleLowerCase("ru-RU");
    const visible = records.filter((record) => !term || record.searchText.toLocaleLowerCase("ru-RU").includes(term));
    const selectedRecord = records.find((record) => record.value === currentValue);
    select.replaceChildren();
    select.append(new Option("Не выбран", ""));
    if (selectedRecord && !visible.some((record) => record.value === selectedRecord.value)) {
      select.append(new Option(selectedRecord.label, selectedRecord.value));
    }
    visible.forEach((record) => select.append(new Option(record.label, record.value)));
    select.value = records.some((record) => record.value === currentValue) ? currentValue : "";
    selectedValue = select.value;
  };
  search.addEventListener("input", refresh);
  select.addEventListener("change", () => {
    selectedValue = select.value;
  });
  refresh();
  root.append(search, select);
  return {
    element: root,
    read: () => select.value || selectedValue || "",
  };
}

function entitySearchPicker(initialValue = "") {
  return searchableSelectPicker(
    relationshipEntities().map((entity) => ({
      value: entity.key,
      label: `${entity.name}${entity.subtitle ? ` · ${entity.subtitle}` : ""}`,
      searchText: `${entity.name} ${entity.subtitle}`,
    })),
    initialValue,
    "Поиск NPC или персонажа"
  );
}

function settlementBuildingRecords() {
  return state.settlements.flatMap((settlement) => settlement.buildings.map((building) => ({
    value: `${settlement.id}:${building.id}`,
    label: `${building.name} · ${settlement.name}`,
    searchText: `${building.name} ${settlement.name} ${building.type}`,
    settlement,
    building,
  })));
}

function settlementBuildingRecord(buildingRef) {
  return settlementBuildingRecords().find((record) => record.value === buildingRef) || null;
}

function openSettlementBuildingRecord(record) {
  if (!record) return;
  clearSearchTerm();
  activeSettlementId = record.settlement.id;
  activeSettlementTab = "buildings";
  setView("settlements");
  window.setTimeout(() => {
    const card = [...document.querySelectorAll("[data-building-id]")]
      .find((element) => element.dataset.buildingId === record.building.id);
    card?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 0);
}

function buildingPlacementsEditor(settlement, initialPlacements = []) {
  const root = el("div", "building-placements-editor");
  const list = el("div", "building-placement-list");
  const rows = (initialPlacements.length ? initialPlacements : [{
    id: crypto.randomUUID(),
    districtId: settlement.districts[0]?.id || "",
    location: "",
  }]).map((placement) => ({ values: { ...placement }, controls: {} }));
  const sync = () => rows.forEach((row) => {
    row.values.districtId = row.controls.districtId?.value ?? row.values.districtId;
    row.values.location = row.controls.location?.value ?? row.values.location;
  });
  const renderRows = () => {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const line = el("div", "building-placement-row");
      const district = selectInput(
        settlement.districts.map((item) => [item.id, item.name]),
        row.values.districtId || settlement.districts[0]?.id || ""
      );
      const location = input(row.values.location || "");
      location.placeholder = "Например: северная стена или рыночная площадь";
      row.controls = { districtId: district, location };
      line.append(
        el("span", "building-placement-index", `Размещение ${index + 1}`),
        labelWrap("Квартал", district),
        labelWrap("Расположение", location),
        button("Удалить", "ghost-button", () => {
          if (rows.length <= 1) return;
          sync();
          rows.splice(index, 1);
          renderRows();
        })
      );
      list.append(line);
    });
  };
  renderRows();
  root.append(list, button("Добавить размещение", "small-button", () => {
    sync();
    rows.push({
      values: { id: crypto.randomUUID(), districtId: settlement.districts[0]?.id || "", location: "" },
      controls: {},
    });
    renderRows();
  }));
  return {
    element: root,
    read: () => {
      sync();
      return rows.map((row) => ({
        id: row.values.id || crypto.randomUUID(),
        districtId: String(row.values.districtId || ""),
        location: String(row.values.location || "").trim(),
      }));
    },
  };
}

function factionTraitsEditor(initialTraits = []) {
  const root = el("div", "structured-rows-editor faction-traits-editor");
  const list = el("div", "structured-rows-list");
  const rows = initialTraits.map((trait) => ({ values: { ...trait }, controls: {}, picker: null }));
  const sync = () => rows.forEach((row) => {
    row.values.name = row.controls.name?.value ?? row.values.name;
    row.values.description = row.controls.description?.value ?? row.values.description;
    row.values.responsibleEntityKey = row.picker?.read() ?? row.values.responsibleEntityKey;
  });
  const renderRows = () => {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const line = el("div", "structured-row faction-trait-editor-row");
      const name = input(row.values.name || "");
      const description = textarea(row.values.description || "");
      const picker = entitySearchPicker(row.values.responsibleEntityKey || "");
      row.controls = { name, description };
      row.picker = picker;
      line.append(
        labelWrap("Название", name),
        labelWrap("Описание", description),
        labelWrap("Ответственный лейтенант", picker.element),
        button("Удалить", "ghost-button", () => {
          sync();
          rows.splice(index, 1);
          renderRows();
        })
      );
      list.append(line);
    });
  };
  renderRows();
  root.append(list, button("Добавить черту фракции", "small-button", () => {
    sync();
    rows.push({ values: { id: crypto.randomUUID(), name: "", description: "", responsibleEntityKey: "" }, controls: {}, picker: null });
    renderRows();
  }));
  return {
    element: root,
    read: () => {
      sync();
      return rows.map((row, index) => normalizeFactionTrait(row.values, index)).filter((trait) => trait.name);
    },
  };
}

function factionBuildingResourcesEditor(initialResources = []) {
  const root = el("div", "structured-rows-editor faction-building-resources-editor");
  const list = el("div", "structured-rows-list");
  const rows = initialResources.map((resource) => ({ values: { ...resource }, picker: null }));
  const records = settlementBuildingRecords();
  const sync = () => rows.forEach((row) => {
    row.values.buildingRef = row.picker?.read() ?? row.values.buildingRef;
  });
  const renderRows = () => {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const line = el("div", "structured-row faction-building-resource-row");
      const picker = searchableSelectPicker(records, row.values.buildingRef || "", "Поиск постройки или поселения");
      row.picker = picker;
      line.append(
        labelWrap("Связанная постройка", picker.element),
        button("Удалить", "ghost-button", () => {
          sync();
          rows.splice(index, 1);
          renderRows();
        })
      );
      list.append(line);
    });
  };
  renderRows();
  root.append(list, button("Добавить постройку", "small-button", () => {
    sync();
    rows.push({ values: { id: crypto.randomUUID(), buildingRef: "" }, picker: null });
    renderRows();
  }));
  return {
    element: root,
    read: () => {
      sync();
      return rows.map((row, index) => normalizeFactionBuildingResource(row.values, index)).filter((resource) => resource.buildingRef);
    },
  };
}

function buildingHierarchyEditor(initialLevels = []) {
  const root = el("div", "building-hierarchy-editor");
  const list = el("div", "building-hierarchy-editor-levels");
  const levels = normalizeBuildingHierarchyLevels(initialLevels, "building-editor")
    .map((level) => ({ ...structuredClone(level), slotPickers: [] }));
  const sync = () => levels.forEach((level) => {
    level.slots.forEach((slot, index) => {
      slot.entityKey = level.slotPickers[index]?.read() ?? slot.entityKey;
    });
  });
  const renderLevels = () => {
    list.replaceChildren();
    [...levels].sort((a, b) => b.level - a.level).forEach((level) => {
      level.slotPickers = [];
      const section = el("section", "building-hierarchy-editor-level");
      const head = el("div", "building-hierarchy-editor-level-head");
      head.append(el("strong", "", level.level === 0 ? "Базовый уровень 0" : `Уровень ${level.level}`));
      if (level.level !== 0) {
        head.append(button("Удалить уровень", "ghost-button", () => {
          sync();
          levels.splice(levels.indexOf(level), 1);
          renderLevels();
        }));
      }
      const slots = el("div", "building-hierarchy-editor-slots");
      level.slots.forEach((slot, slotIndex) => {
        const picker = entitySearchPicker(slot.entityKey || "");
        level.slotPickers[slotIndex] = picker;
        const slotRow = el("div", "building-hierarchy-editor-slot");
        slotRow.append(
          labelWrap(`Ячейка ${slotIndex + 1}`, picker.element),
          button("Удалить", "ghost-button", () => {
            sync();
            level.slots.splice(slotIndex, 1);
            renderLevels();
          })
        );
        slots.append(slotRow);
      });
      section.append(head, slots, button("Добавить ячейку", "small-button", () => {
        sync();
        level.slots.push({ id: crypto.randomUUID(), entityKey: "" });
        renderLevels();
      }));
      list.append(section);
    });
  };
  renderLevels();
  root.append(list, button("Добавить новый уровень", "small-button", () => {
    sync();
    const nextLevel = Math.max(0, ...levels.map((level) => level.level)) + 1;
    levels.push({ id: crypto.randomUUID(), level: nextLevel, slots: [], slotPickers: [] });
    renderLevels();
  }));
  return {
    element: root,
    read: () => {
      sync();
      return levels.map((level) => ({
        id: level.id || crypto.randomUUID(),
        level: level.level,
        slots: level.slots.map((slot) => ({ id: slot.id || crypto.randomUUID(), entityKey: slot.entityKey || "" })),
      }));
    },
  };
}

function npcOverviewEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const fields = {
    name: input(npc.name),
    status: selectInput(npcStatuses, npc.status),
    ancestry: input(npc.ancestry),
    homeland: input(npc.homeland),
    culture: input(npc.culture),
    religion: input(npc.religion),
    deity: input(npc.deity),
    alignment: input(npc.alignment),
    estate: input(npc.estate),
    size: input(npc.size),
    gender: input(npc.gender),
    dangerClass: input(npc.dangerClass),
    age: input(npc.age),
    height: input(npc.height),
    weight: input(npc.weight),
    maritalStatus: input(npc.maritalStatus),
    role: input(npc.role),
    location: input(npc.location),
    lastSeen: input(npc.lastSeen),
    tags: input(npc.tags.join(", ")),
    description: textarea(npc.description),
    appearance: textarea(npc.appearance),
    voice: textarea(npc.voice),
    public: document.createElement("input"),
  };
  fields.public.type = "checkbox";
  fields.public.checked = npc.public;
  const adminOnlyEdit = document.createElement("input");
  adminOnlyEdit.type = "checkbox";
  adminOnlyEdit.checked = npc.adminOnlyEdit;
  const levels = structuredRowsEditor(npc.levels, [
    { key: "className", label: "Класс / архетип" },
    { key: "level", label: "Уровень", type: "number", min: 0, max: 40 },
    { key: "notes", label: "Примечание" },
  ], "Добавить класс или уровень");
  const personalityTraits = structuredRowsEditor(npc.personalityTraits, [
    { key: "name", label: "Название" },
    { key: "description", label: "Описание", type: "textarea" },
  ], "Добавить черту характера");
  const portraitInput = document.createElement("input");
  portraitInput.type = "file";
  portraitInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let portraitValue = npc.portrait || "";
  const portraitStyle = { ...defaultImageStyle(), ...(npc.portraitStyle ?? {}) };
  const portraitPreview = el("div", "upload-preview npc-portrait-preview image-aspect-square");
  const portraitPreviewImage = document.createElement("img");
  const portraitPreviewText = el("span", "muted", "Портрет не загружен");
  portraitPreview.append(portraitPreviewImage, portraitPreviewText);
  const portraitFit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], portraitStyle.fit);
  const portraitX = rangeInput(portraitStyle.x, 0, 100, 1);
  const portraitY = rangeInput(portraitStyle.y, 0, 100, 1);
  const portraitZoom = rangeInput(portraitStyle.zoom, 1, 3, 0.05);
  const portraitRotation = rangeInput(portraitStyle.rotation || 0, -180, 180, 1);
  const refreshPortrait = () => {
    portraitPreviewImage.src = portraitValue;
    portraitPreviewImage.hidden = !portraitValue;
    portraitPreviewText.hidden = Boolean(portraitValue);
    applyPortraitStyle(portraitPreviewImage, {
      fit: portraitFit.value,
      x: portraitX.value,
      y: portraitY.value,
      zoom: portraitZoom.value,
      rotation: portraitRotation.value,
    });
  };
  [portraitFit, portraitX, portraitY, portraitZoom, portraitRotation].forEach((control) => control.addEventListener("input", refreshPortrait));
  portraitInput.addEventListener("change", async () => {
    const file = portraitInput.files?.[0];
    if (!file) return;
    const uploadedPortrait = await imageFileToUrl(file, "npcs", {
      allowPublicUpload: !isAdmin,
      requireCloudUpload: !isAdmin,
    });
    if (!uploadedPortrait) return;
    portraitValue = uploadedPortrait;
    refreshPortrait();
  });
  refreshPortrait();
  form.append(
    labelWrap("Имя", fields.name),
    labelWrap("Статус", fields.status),
    labelWrap("Раса/народ", fields.ancestry),
    labelWrap("Родина", fields.homeland),
    labelWrap("Культура", fields.culture),
    labelWrap("Вероисповедание", fields.religion),
    labelWrap("Божество", fields.deity),
    labelWrap("Мировоззрение", fields.alignment),
    labelWrap("Сословие", fields.estate),
    labelWrap("Размер", fields.size),
    labelWrap("Пол", fields.gender),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("Роль", fields.role),
    labelWrap("Локация", fields.location),
    labelWrap("Последняя встреча", fields.lastSeen),
    ...(isAdmin ? [
      checkboxWrap("Видно игрокам", fields.public),
      labelWrap(
        "Доступ к редактированию",
        checkboxWrap("Редактировать NPC может только мастер", adminOnlyEdit),
        "span-2 character-access-control"
      ),
    ] : []),
    labelWrap("Теги", fields.tags),
    labelWrap("Классы и уровни", levels.element, "span-2"),
    labelWrap("Портрет", fragment([portraitInput, portraitPreview]), "span-2"),
    labelWrap("Подгонка", portraitFit),
    labelWrap("Масштаб", portraitZoom),
    labelWrap("Позиция X", portraitX),
    labelWrap("Позиция Y", portraitY),
    labelWrap("Поворот", portraitRotation, "span-2"),
    actionRow([button("Убрать портрет", "ghost-button", () => {
      portraitValue = "";
      portraitInput.value = "";
      refreshPortrait();
    })], "span-2"),
    labelWrap("Описание игрокам", fields.description, "span-2"),
    labelWrap("Внешность", fields.appearance, "span-2"),
    labelWrap("Черты характера", personalityTraits.element, "span-2"),
    labelWrap("Манера речи", fields.voice, "span-2"),
    actionRow([button("Сохранить общее", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextTags = csv(fields.tags.value);
    const nextLevels = levels.read();
    registerTags(nextTags, true);
    Object.assign(npc, {
      name: fields.name.value,
      status: fields.status.value,
      ancestry: fields.ancestry.value,
      homeland: fields.homeland.value,
      culture: fields.culture.value,
      religion: fields.religion.value,
      deity: fields.deity.value,
      alignment: fields.alignment.value,
      estate: fields.estate.value,
      size: fields.size.value,
      gender: fields.gender.value,
      dangerClass: fields.dangerClass.value,
      age: fields.age.value,
      height: fields.height.value,
      weight: fields.weight.value,
      maritalStatus: fields.maritalStatus.value,
      role: fields.role.value,
      location: fields.location.value,
      lastSeen: fields.lastSeen.value,
      tags: nextTags,
      levels: nextLevels,
      className: nextLevels.map((entry) => `${entry.className} ${entry.level}`).filter(Boolean).join(" / "),
      level: nextLevels.reduce((sum, entry) => sum + Number(entry.level || 0), 0) || 1,
      portrait: portraitValue,
      portraitStyle: {
        aspect: "square",
        fit: portraitFit.value,
        x: Number(portraitX.value),
        y: Number(portraitY.value),
        zoom: Number(portraitZoom.value),
        rotation: Number(portraitRotation.value),
      },
      description: fields.description.value,
      appearance: fields.appearance.value,
      personalityTraits: personalityTraits.read(),
      voice: fields.voice.value,
    });
    if (isAdmin) {
      npc.public = fields.public.checked;
      npc.adminOnlyEdit = adminOnlyEdit.checked;
    }
    saveNpc(npc);
  });
  return editorPanel("Редактор вкладки: общее NPC", form);
}

function npcNotesEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const fields = {
    lastSeen: input(npc.lastSeen),
    notes: textarea(npc.notes),
  };
  form.append(
    labelWrap("Последняя встреча", fields.lastSeen),
    labelWrap("Заметки о персонаже", fields.notes, "span-2"),
    actionRow([button("Сохранить заметки", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(npc, {
      lastSeen: fields.lastSeen.value,
      notes: fields.notes.value,
    });
    saveNpc(npc);
  });
  return editorPanel("Редактор вкладки: заметки", form);
}

function npcFactionsEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const fields = {
    factionId: selectInput([["", "Без фракции"], ...visibleFactions().map((faction) => [faction.id, faction.name])], npc.factionId),
    factionRole: input(npc.factionRole),
    factionRank: input(npc.factionRank),
    factionReputation: textarea(npc.factionReputation),
    factionLinks: checkboxList(visibleFactions().map((faction) => [faction.id, faction.name]), npc.factionLinks),
  };
  form.append(
    labelWrap("Основная фракция", fields.factionId),
    labelWrap("Роль во фракции", fields.factionRole),
    labelWrap("Ранг/должность", fields.factionRank),
    labelWrap("Репутация и обязательства", fields.factionReputation, "span-2"),
    labelWrap("Дополнительные фракционные связи", fields.factionLinks, "span-2"),
    actionRow([button("Сохранить фракции", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(npc, {
      factionId: fields.factionId.value,
      factionRole: fields.factionRole.value,
      factionRank: fields.factionRank.value,
      factionReputation: fields.factionReputation.value,
      factionLinks: checkedValues(fields.factionLinks).filter((id) => id !== fields.factionId.value),
    });
    saveNpc(npc);
  });
  return editorPanel("Редактор вкладки: фракции NPC", form);
}

function npcRecognitionEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const fields = {
    accumulatedRecognition: input(npc.accumulatedRecognition),
    authorityLevel: input(npc.authorityLevel),
    demand: textarea(npc.demand),
    honor: input(npc.honor),
    piety: input(npc.piety),
    fame: input(npc.fame),
    merits: textarea(npc.merits),
  };
  [fields.accumulatedRecognition, fields.authorityLevel, fields.honor, fields.piety, fields.fame].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  form.append(
    labelWrap("Накопленное признание", fields.accumulatedRecognition),
    labelWrap("Уровень авторитета", fields.authorityLevel),
    labelWrap("Честь", fields.honor),
    labelWrap("Благочестие", fields.piety),
    labelWrap("Слава", fields.fame),
    labelWrap("Спрос — требования NPC", fields.demand, "span-2"),
    labelWrap("Заслуги и приобретённые бонусы", fields.merits, "span-2"),
    actionRow([button("Сохранить признание", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    npc.accumulatedRecognition = Number(fields.accumulatedRecognition.value || 0);
    npc.authorityLevel = Number(fields.authorityLevel.value || 0);
    npc.honor = Number(fields.honor.value || 0);
    npc.piety = Number(fields.piety.value || 0);
    npc.fame = Number(fields.fame.value || 0);
    npc.demand = fields.demand.value;
    npc.merits = fields.merits.value;
    saveNpc(npc);
  });
  return editorPanel("Редактор вкладки: признание NPC", form);
}

function npcMechanicsEditor(npc) {
  const editors = {
    summary: npcMechanicsSummaryEditor,
    stats: npcMechanicsStatsEditor,
    combat: npcMechanicsCombatEditor,
    skills: npcMechanicsSkillsEditor,
    features: npcMechanicsFeaturesEditor,
    magic: (item) => characterMagicEditor(item, saveNpc, "Редактор листа NPC: магия"),
    inventory: (item) => characterInventoryEditor(item, saveNpc, "Редактор листа NPC: инвентарь"),
  };
  return (editors[activeNpcMechanicsTab] || npcMechanicsSummaryEditor)(npc);
}

function npcMechanicsSummaryEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const fields = {
    homeland: input(npc.homeland),
    size: input(npc.size),
    gender: input(npc.gender),
    deity: input(npc.deity),
    dangerClass: input(npc.dangerClass),
    age: input(npc.age),
    height: input(npc.height),
    weight: input(npc.weight),
    maritalStatus: input(npc.maritalStatus),
    languages: textarea(npc.languages),
    mechanicsNotes: textarea(npc.mechanicsNotes),
  };
  form.append(
    labelWrap("Родина", fields.homeland),
    labelWrap("Размер", fields.size),
    labelWrap("Пол", fields.gender),
    labelWrap("Божество", fields.deity),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("Языки", fields.languages, "span-2"),
    labelWrap("Механические заметки", fields.mechanicsNotes, "span-2"),
    actionRow([button("Сохранить паспорт листа", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(npc, {
      homeland: fields.homeland.value,
      size: fields.size.value,
      gender: fields.gender.value,
      deity: fields.deity.value,
      dangerClass: fields.dangerClass.value,
      age: fields.age.value,
      height: fields.height.value,
      weight: fields.weight.value,
      maritalStatus: fields.maritalStatus.value,
      languages: fields.languages.value,
      mechanicsNotes: fields.mechanicsNotes.value,
    });
    saveNpc(npc);
  });
  return editorPanel("Редактор листа: паспорт", form);
}

function npcMechanicsStatsEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const statInputs = {};
  Object.entries(npc.stats).forEach(([key, value]) => {
    statInputs[key] = input(value);
  });
  const saveInputs = {};
  Object.entries(npc.saves).forEach(([key, value]) => {
    saveInputs[key] = input(value);
  });
  const initiative = input(npc.initiative);
  const unusualAncestry = document.createElement("input");
  unusualAncestry.type = "checkbox";
  unusualAncestry.checked = npc.unusualAncestry;
  const customConModifier = input(npc.customConModifier);
  customConModifier.type = "number";
  customConModifier.step = "1";
  const customConWrap = labelWrap("Отдельный модификатор Выносливости (CON)", customConModifier, "span-2 unusual-con-control");
  const refreshUnusualAncestry = () => {
    customConWrap.hidden = !unusualAncestry.checked;
    customConModifier.disabled = !unusualAncestry.checked;
  };
  unusualAncestry.addEventListener("change", refreshUnusualAncestry);
  refreshUnusualAncestry();
  const transfer = readNpcStatTransfer();
  if (transfer) {
    const transferPanel = el("section", "npc-stat-transfer span-2");
    const transferValues = npcAbilityDefinitions.map(([key, label]) => `${label}: ${Number(transfer.stats[key] || 0)}`).join(" · ");
    const insertButton = button("Вставить характеристики", "ghost-button", () => {
      npcAbilityDefinitions.forEach(([key]) => {
        if (statInputs[key]) statInputs[key].value = Number(transfer.stats[key] || 0);
      });
      insertButton.textContent = "Характеристики вставлены";
    });
    const clearButton = button("Убрать перенос", "ghost-button", () => {
      localStorage.removeItem(NPC_STAT_TRANSFER_KEY);
      transferPanel.remove();
    });
    transferPanel.append(
      el("p", "eyebrow", "Перенос из Wiki"),
      el("strong", "", transfer.sourceTitle || "Wiki-статья"),
      el("p", "muted", transferValues),
      actionRow([insertButton, clearButton])
    );
    form.append(transferPanel);
  }
  form.append(
    el("h3", "span-2", "Характеристики"),
    ...Object.entries(statInputs).map(([key, control]) => labelWrap(key.toUpperCase(), control)),
    labelWrap(
      "Особая Выносливость",
      checkboxWrap("Показатель Выносливости и его модификатор не зависят друг от друга", unusualAncestry),
      "span-2 character-access-control"
    ),
    customConWrap,
    el("h3", "span-2", "Спасброски"),
    ...Object.entries(saveInputs).map(([key, control]) => labelWrap(key, control)),
    labelWrap("Инициатива", initiative),
    actionRow([button("Сохранить характеристики", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    Object.entries(statInputs).forEach(([key, control]) => { npc.stats[key] = Number(control.value || 0); });
    Object.entries(saveInputs).forEach(([key, control]) => { npc.saves[key] = Number(control.value || 0); });
    npc.unusualAncestry = unusualAncestry.checked;
    npc.customConModifier = unusualAncestry.checked
      ? Number(customConModifier.value || 0)
      : statMod(npc.stats.con);
    npc.initiative = Number(initiative.value || 0);
    if (await saveNpc(npc)) localStorage.removeItem(NPC_STAT_TRANSFER_KEY);
  });
  return editorPanel("Редактор листа: характеристики", form);
}

function npcMechanicsCombatEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const speeds = structuredRowsEditor(normalizeMovementSpeeds(npc.speeds, npc.speed), [
    { key: "type", label: "Тип скорости", options: movementTypeOptions, defaultValue: "land" },
    { key: "value", label: "Скорость без доспеха" },
    { key: "armoredValue", label: "Скорость в доспехе" },
  ], "Добавить скорость");
  const babEntries = structuredRowsEditor(normalizeBabEntries(npc.babEntries, npc.bab), [
    { key: "label", label: "Название", defaultValue: "BAB" },
    { key: "value", label: "Значение" },
  ], "Добавить BAB");
  const fields = {
    hp: input(npc.hp),
    ac: input(npc.ac),
    touchAc: input(npc.touchAc),
    flatFootedAc: input(npc.flatFootedAc),
    cmb: input(npc.cmb),
    cmd: input(npc.cmd),
    attacksNotes: textarea(npc.attacksNotes),
    armorNotes: textarea(npc.armorNotes),
  };
  form.append(
    labelWrap("HP", fields.hp),
    labelWrap("AC", fields.ac),
    labelWrap("Касание", fields.touchAc),
    labelWrap("Врасплох", fields.flatFootedAc),
    labelWrap("CMB", fields.cmb),
    labelWrap("CMD", fields.cmd),
    labelWrap("BAB", babEntries.element, "span-2"),
    labelWrap("Скорости", speeds.element, "span-2"),
    labelWrap("Атаки", fields.attacksNotes, "span-2"),
    labelWrap("Броня и защита", fields.armorNotes, "span-2"),
    actionRow([button("Сохранить бой", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(npc, {
      hp: fields.hp.value,
      ac: Number(fields.ac.value || 0),
      touchAc: Number(fields.touchAc.value || 0),
      flatFootedAc: Number(fields.flatFootedAc.value || 0),
      cmb: Number(fields.cmb.value || 0),
      cmd: Number(fields.cmd.value || 0),
      attacksNotes: fields.attacksNotes.value,
      armorNotes: fields.armorNotes.value,
    });
    npc.babEntries = babEntries.read();
    npc.bab = primaryBabValue(npc.babEntries, npc.bab);
    npc.speeds = speeds.read();
    npc.speed = primaryMovementSpeed(npc.speeds);
    saveNpc(npc);
  });
  return editorPanel("Редактор листа: бой", form);
}

function createSkillEditor(character) {
  const element = el("div", "skill-editor-shell");
  const table = el("div", "skill-edit-table");
  const rows = character.skills.map((skill, index) => ({
    skill: { ...skill },
    isCore: index < pathfinderSkills.length,
    controls: {},
  }));
  const renderRows = () => {
    table.replaceChildren();
    ["Навык", "Уточнение", "Хар.", "Ранги", "Класс", "Проч.", "Штраф", "Итог", ""].forEach((heading) => {
      table.append(el("strong", "table-head", heading));
    });
    rows.forEach((row, index) => {
      const skill = row.skill;
      const controls = {
        name: input(skill.name),
        specialty: input(skill.specialty ?? ""),
        ability: selectInput(npcAbilityDefinitions.map(([key, label]) => [key, label]), skill.ability || "int"),
        ranks: input(skill.ranks),
        classSkill: document.createElement("input"),
        misc: input(skill.misc),
        armorPenalty: input(skill.armorPenalty),
        total: input(calculateSkillTotal(character, skill)),
      };
      row.controls = controls;
      controls.name.readOnly = row.isCore;
      [controls.ranks, controls.misc, controls.armorPenalty].forEach((control) => {
        control.type = "number";
        control.step = "1";
      });
      controls.ranks.min = "0";
      controls.classSkill.type = "checkbox";
      controls.classSkill.checked = Boolean(skill.classSkill);
      controls.total.type = "number";
      controls.total.readOnly = true;
      controls.total.tabIndex = -1;
      controls.total.classList.add("skill-total-output");
      const refreshTotal = () => {
        controls.total.value = calculateSkillTotal(character, {
          ...skill,
          ability: controls.ability.value,
          ranks: Number(controls.ranks.value || 0),
          classSkill: controls.classSkill.checked,
          misc: Number(controls.misc.value || 0),
          armorPenalty: Number(controls.armorPenalty.value || 0),
        });
      };
      [controls.ranks, controls.misc, controls.armorPenalty].forEach((control) => control.addEventListener("input", refreshTotal));
      controls.classSkill.addEventListener("change", refreshTotal);
      controls.ability.addEventListener("change", refreshTotal);
      const remove = button("Удалить", "ghost-button skill-remove-button", () => {
        rows.splice(index, 1);
        renderRows();
      });
      remove.disabled = row.isCore;
      remove.title = row.isCore ? "Базовые навыки есть у всех персонажей" : "Удалить дополнительный навык";
      table.append(
        controls.name,
        controls.specialty,
        controls.ability,
        controls.ranks,
        controls.classSkill,
        controls.misc,
        controls.armorPenalty,
        controls.total,
        remove
      );
    });
  };
  renderRows();
  element.append(table, button("Добавить новый навык", "small-button add-skill-button", () => {
    rows.push({
      skill: { name: "Новый навык", ability: "int", specialty: "", ranks: 0, classSkill: false, misc: 0, armorPenalty: 0, total: 0 },
      isCore: false,
      controls: {},
    });
    renderRows();
    table.lastElementChild?.scrollIntoView?.({ block: "nearest" });
  }));
  return {
    element,
    apply: () => {
      character.skills = rows.map((row) => {
        const controls = row.controls;
        const skill = {
          ...row.skill,
          name: controls.name.value.trim() || "Навык",
          specialty: controls.specialty.value.trim(),
          ability: controls.ability.value,
          ranks: Number(controls.ranks.value || 0),
          classSkill: controls.classSkill.checked,
          misc: Number(controls.misc.value || 0),
          armorPenalty: Number(controls.armorPenalty.value || 0),
        };
        skill.total = calculateSkillTotal(character, skill);
        return skill;
      });
    },
  };
}

function npcMechanicsSkillsEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const skillEditor = createSkillEditor(npc);
  form.append(
    labelWrap("Ранги и автоматические итоги навыков", skillEditor.element, "span-2"),
    actionRow([button("Сохранить навыки", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    skillEditor.apply();
    saveNpc(npc);
  });
  return editorPanel("Редактор листа: навыки", form);
}

function npcMechanicsFeaturesEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const feats = textarea(npc.feats.join("\n"));
  const features = textarea(npc.features.join("\n"));
  const templatesStatuses = textarea(npc.templatesStatuses.join("\n"));
  const strokes = textarea(npc.strokes.join("\n"));
  form.append(
    labelWrap("Черты, по одной на строку", feats, "span-2"),
    labelWrap("Особые и классовые способности, по одной на строку", features, "span-2"),
    labelWrap("Шаблоны и статусы, по одному на строку", templatesStatuses, "span-2"),
    labelWrap("Штрихи, по одному на строку", strokes, "span-2"),
    actionRow([button("Сохранить черты и способности", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    npc.feats = lineItems(feats.value);
    npc.features = lineItems(features.value);
    npc.templatesStatuses = lineItems(templatesStatuses.value);
    npc.strokes = lineItems(strokes.value);
    saveNpc(npc);
  });
  return editorPanel("Редактор листа: черты", form);
}

function npcMechanicsJsonEditor(npc, key, label, saveLabel) {
  const form = el("form", "character-edit-form npc-edit-form");
  const json = textarea(JSON.stringify(npc[key], null, 2));
  json.classList.add("json-editor", "compact-json");
  form.append(labelWrap(label, json, "span-2"), actionRow([button(saveLabel, "primary-button", null, "submit")], "span-2"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const parsed = JSON.parse(json.value || "[]");
      if (!Array.isArray(parsed)) throw new Error();
      npc[key] = parsed;
    } catch {
      alert(`${label} не сохранен: требуется JSON-массив.`);
      return;
    }
    saveNpc(npc);
  });
  return editorPanel(`Редактор листа: ${label.replace(" JSON", "").toLowerCase()}`, form);
}

function npcLinksEditor(npc) {
  const form = el("form", "character-edit-form npc-edit-form");
  const fields = {
    wikiLinks: searchableCheckboxList(
      visibleWiki().map((article) => [article.id, article.title, `${article.category} ${article.tags?.join(" ") ?? ""}`]),
      npc.wikiLinks,
      "",
      null,
      "Поиск Wiki"
    ),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), npc.questLinks),
    npcLinks: checkboxList(visibleNpcs().filter((item) => item.id !== npc.id).map((item) => [item.id, item.name]), npc.npcLinks),
    mapLinks: checkboxList(visibleMapRegions().map((region) => [region.id, region.title]), npc.mapLinks),
  };
  form.append(
    labelWrap("Связанные Wiki-статьи", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    labelWrap("Связанные NPC", fields.npcLinks, "span-2"),
    labelWrap("Связанные карты", fields.mapLinks, "span-2"),
    actionRow([button("Сохранить связи", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(npc, {
      wikiLinks: checkedValues(fields.wikiLinks),
      questLinks: checkedValues(fields.questLinks),
      npcLinks: checkedValues(fields.npcLinks),
      mapLinks: checkedValues(fields.mapLinks),
    });
    saveNpc(npc);
  });
  return editorPanel("Редактор вкладки: связи NPC", form);
}

function npcGmEditor(npc) {
  const root = el("div", "admin-stack");
  const form = el("form", "character-edit-form npc-edit-form");
  const secrets = textarea(npc.secrets);
  const gmNotes = textarea(npc.gmNotes);
  form.append(
    labelWrap("Секреты NPC", secrets, "span-2"),
    labelWrap("GM-заметки", gmNotes, "span-2"),
    actionRow([button("Сохранить GM", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    npc.secrets = secrets.value;
    npc.gmNotes = gmNotes.value;
    saveNpc(npc);
  });
  root.append(editorPanel("Редактор вкладки: GM", form), npcAdvancedEditor(npc));
  return root;
}

function npcAdvancedEditor(npc) {
  const jsonPanel = el("details", "json-details");
  const json = textarea(JSON.stringify(npc, null, 2));
  json.classList.add("json-editor");
  const form = el("form", "admin-stack");
  form.append(
    el("p", "muted", "Полный контроль над карточкой NPC для редких полей и быстрой массовой правки."),
    labelWrap("JSON NPC", json),
    actionRow([
      button("Сохранить JSON", "primary-button", null, "submit"),
      button("Удалить NPC", "ghost-button", () => deleteNpc(npc)),
    ])
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let parsed;
    try {
      parsed = normalizeNpc(JSON.parse(json.value));
    } catch {
      alert("JSON не сохранен: проверь запятые, кавычки и скобки.");
      return;
    }
    Object.assign(npc, parsed);
    saveNpc(npc);
  });
  jsonPanel.append(el("summary", "", "Расширенный JSON-редактор NPC"), form);
  return jsonPanel;
}

function npcEditor(npc) {
  const form = el("form", "form-grid");
  const fields = {
    name: input(npc.name),
    ancestry: input(npc.ancestry),
    culture: input(npc.culture),
    religion: input(npc.religion),
    alignment: input(npc.alignment),
    estate: input(npc.estate),
    dangerClass: input(npc.dangerClass),
    age: input(npc.age),
    height: input(npc.height),
    weight: input(npc.weight),
    maritalStatus: input(npc.maritalStatus),
    role: input(npc.role),
    className: input(npc.className),
    level: input(npc.level),
    factionId: selectInput([["", "Без фракции"], ...state.factions.map((faction) => [faction.id, faction.name])], npc.factionId),
    location: input(npc.location),
    status: selectInput(npcStatuses, npc.status),
    lastSeen: input(npc.lastSeen),
    tags: input(npc.tags.join(", ")),
    description: textarea(npc.description),
    notes: textarea(npc.notes),
    gmNotes: textarea(npc.gmNotes),
    public: document.createElement("input"),
    wikiLinks: checkboxList(visibleWiki().map((article) => [article.id, article.title]), npc.wikiLinks),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), npc.questLinks),
  };
  fields.public.type = "checkbox";
  fields.public.checked = npc.public;
  const portraitInput = document.createElement("input");
  portraitInput.type = "file";
  portraitInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let portraitValue = npc.portrait || "";
  portraitInput.addEventListener("change", async () => {
    const file = portraitInput.files?.[0];
    if (!file) return;
    portraitValue = await imageFileToUrl(file, "npcs");
  });
  form.append(
    labelWrap("Имя", fields.name),
    labelWrap("Раса/народ", fields.ancestry),
    labelWrap("Культура", fields.culture),
    labelWrap("Вероисповедание", fields.religion),
    labelWrap("Мировоззрение", fields.alignment),
    labelWrap("Сословие", fields.estate),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("Роль", fields.role),
    labelWrap("Класс / архетип", fields.className),
    labelWrap("Уровень", fields.level),
    labelWrap("Фракция", fields.factionId),
    labelWrap("Локация", fields.location),
    labelWrap("Статус", fields.status),
    labelWrap("Последняя встреча", fields.lastSeen),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Теги", fields.tags, "span-2"),
    labelWrap("Портрет", portraitInput, "span-2"),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("Заметки о персонаже", fields.notes, "span-2"),
    labelWrap("GM-заметки", fields.gmNotes, "span-2"),
    labelWrap("Связанные Wiki", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    actionRow([
      button("Сохранить NPC", "primary-button", null, "submit"),
      button("Удалить NPC", "ghost-button", () => deleteNpc(npc)),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextTags = csv(fields.tags.value);
    registerTags(nextTags, true);
    Object.assign(npc, normalizeNpc({
      ...npc,
      name: fields.name.value,
      ancestry: fields.ancestry.value,
      culture: fields.culture.value,
      religion: fields.religion.value,
      alignment: fields.alignment.value,
      estate: fields.estate.value,
      dangerClass: fields.dangerClass.value,
      age: fields.age.value,
      height: fields.height.value,
      weight: fields.weight.value,
      maritalStatus: fields.maritalStatus.value,
      role: fields.role.value,
      className: fields.className.value,
      level: Number(fields.level.value || 0),
      levels: fields.className.value.trim() ? [{ className: fields.className.value.trim(), level: Number(fields.level.value || 0), notes: "" }] : npc.levels,
      factionId: fields.factionId.value,
      location: fields.location.value,
      status: fields.status.value,
      lastSeen: fields.lastSeen.value,
      public: fields.public.checked,
      tags: nextTags,
      description: fields.description.value,
      notes: fields.notes.value,
      portrait: portraitValue,
      gmNotes: fields.gmNotes.value,
      wikiLinks: checkedValues(fields.wikiLinks),
      questLinks: checkedValues(fields.questLinks),
    }));
    saveState();
    render();
  });
  return form;
}

function factionEditor(faction) {
  const form = el("form", "form-grid");
  const factionTraits = factionTraitsEditor(faction.traits);
  const buildingResources = factionBuildingResourcesEditor(faction.resourceBuildings);
  const fields = {
    name: input(faction.name),
    type: input(factionTypeLabel(faction)),
    level: input(faction.level),
    leader: input(faction.leader),
    headquarters: input(faction.headquarters),
    tags: input(faction.tags.join(", ")),
    description: textarea(faction.description),
    goals: textarea(faction.goals),
    resources: textarea(faction.resources),
    finances: textarea(faction.finances),
    gmNotes: textarea(faction.gmNotes),
    public: document.createElement("input"),
    wikiLinks: checkboxList(visibleWiki().map((article) => [article.id, article.title]), faction.wikiLinks),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), faction.questLinks),
    npcLinks: checkboxList(state.npcs.map((npc) => [npc.id, npc.name]), faction.npcLinks),
  };
  fields.level.type = "number";
  fields.level.min = "0";
  fields.level.step = "1";
  fields.type.placeholder = "Например: торговая гильдия, культ или военный орден";
  fields.public.type = "checkbox";
  fields.public.checked = faction.public;
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    faction.image = await imageFileToUrl(file, "factions");
    saveState();
    render();
  });
  form.append(
    labelWrap("Название", fields.name),
    labelWrap("Тип", fields.type),
    labelWrap("Уровень фракции", fields.level),
    labelWrap("Лидер", fields.leader),
    labelWrap("Штаб/территория", fields.headquarters),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Теги", fields.tags),
    labelWrap("Эмблема/картинка", imageInput, "span-2"),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("Цели", fields.goals, "span-2"),
    labelWrap("Ресурсы", fields.resources, "span-2"),
    labelWrap("Постройки в ресурсах", buildingResources.element, "span-2"),
    labelWrap("Финансы", fields.finances, "span-2"),
    labelWrap("Черты фракции", factionTraits.element, "span-2"),
    labelWrap("GM-заметки", fields.gmNotes, "span-2"),
    labelWrap("Связанные NPC", fields.npcLinks, "span-2"),
    labelWrap("Связанные Wiki", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    actionRow([
      button("Сохранить фракцию", "primary-button", null, "submit"),
      button("Удалить фракцию", "ghost-button", () => deleteFaction(faction)),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextTags = csv(fields.tags.value);
    registerTags(nextTags, true);
    Object.assign(faction, normalizeFaction({
      ...faction,
      name: fields.name.value,
      type: fields.type.value,
      level: Number(fields.level.value || 0),
      leader: fields.leader.value,
      headquarters: fields.headquarters.value,
      public: fields.public.checked,
      tags: nextTags,
      description: fields.description.value,
      goals: fields.goals.value,
      resources: fields.resources.value,
      resourceBuildings: buildingResources.read(),
      finances: fields.finances.value,
      traits: factionTraits.read(),
      gmNotes: fields.gmNotes.value,
      npcLinks: checkedValues(fields.npcLinks),
      wikiLinks: checkedValues(fields.wikiLinks),
      questLinks: checkedValues(fields.questLinks),
    }));
    saveState();
    render();
  });
  return form;
}

function addNpc() {
  if (!isAdmin) {
    openPublicNpcDialog();
    return;
  }
  const npc = normalizeNpc({ id: slug("npc"), name: "Новый NPC", public: false, tags: ["новое"] });
  state.npcs.unshift(npc);
  activeDirectoryTab = "npcs";
  activeNpcId = npc.id;
  activeNpcTab = "overview";
  saveState();
  render();
}

function openPublicNpcDialog() {
  const { dialog, panel } = publicEntryDialog(
    "Добавить NPC",
    "NPC сразу появится в общей базе и будет виден игрокам. Скрытые мастерские поля через эту форму недоступны."
  );
  const form = el("form", "form-grid public-entry-form");
  const fields = {
    name: input(""),
    ancestry: input(""),
    culture: input(""),
    religion: input(""),
    alignment: input(""),
    estate: input(""),
    dangerClass: input(""),
    age: input(""),
    height: input(""),
    weight: input(""),
    maritalStatus: input(""),
    role: input(""),
    className: input(""),
    level: input(1),
    factionId: selectInput([["", "Без фракции"], ...visibleFactions().map((faction) => [faction.id, faction.name])], ""),
    location: input(""),
    status: selectInput(npcStatuses, "alive"),
    tags: input(""),
    description: textarea(""),
    traitName: input(""),
    traitDescription: textarea(""),
    notes: textarea(""),
    mechanicsNotes: textarea(""),
    hp: input(""),
    ac: input(10),
  };
  fields.name.required = true;
  fields.level.type = "number";
  fields.level.min = "0";
  fields.level.max = "40";
  fields.ac.type = "number";
  const submit = button("Добавить NPC", "primary-button", null, "submit");
  form.append(
    labelWrap("Имя NPC", fields.name),
    labelWrap("Раса/народ", fields.ancestry),
    labelWrap("Культура", fields.culture),
    labelWrap("Вероисповедание", fields.religion),
    labelWrap("Мировоззрение", fields.alignment),
    labelWrap("Сословие", fields.estate),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("Роль", fields.role),
    labelWrap("Класс / архетип", fields.className),
    labelWrap("Уровень", fields.level),
    labelWrap("Фракция", fields.factionId),
    labelWrap("Локация", fields.location),
    labelWrap("Статус", fields.status),
    labelWrap("Теги через запятую", fields.tags),
    labelWrap("HP", fields.hp),
    labelWrap("AC", fields.ac),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("Название черты характера", fields.traitName),
    labelWrap("Описание черты характера", fields.traitDescription),
    labelWrap("Заметки о персонаже", fields.notes, "span-2"),
    labelWrap("Игромеханические особенности", fields.mechanicsNotes, "span-2"),
    actionRow([submit, button("Отмена", "ghost-button", () => dialog.close())], "span-2")
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "Добавляю...";
    const entry = {
      id: crypto.randomUUID(),
      name: fields.name.value.trim(),
      ancestry: fields.ancestry.value.trim(),
      culture: fields.culture.value.trim(),
      religion: fields.religion.value.trim(),
      alignment: fields.alignment.value.trim(),
      estate: fields.estate.value.trim(),
      dangerClass: fields.dangerClass.value.trim(),
      age: fields.age.value.trim(),
      height: fields.height.value.trim(),
      weight: fields.weight.value.trim(),
      maritalStatus: fields.maritalStatus.value.trim(),
      role: fields.role.value.trim(),
      className: fields.className.value.trim(),
      level: Number(fields.level.value || 0),
      levels: fields.className.value.trim() ? [{ className: fields.className.value.trim(), level: Number(fields.level.value || 0), notes: "" }] : [],
      factionId: fields.factionId.value,
      location: fields.location.value.trim(),
      status: fields.status.value,
      tags: csv(fields.tags.value),
      description: fields.description.value.trim(),
      personalityTraits: fields.traitName.value.trim() ? [{ name: fields.traitName.value.trim(), description: fields.traitDescription.value.trim() }] : [],
      notes: fields.notes.value.trim(),
      mechanicsNotes: fields.mechanicsNotes.value.trim(),
      hp: fields.hp.value.trim(),
      ac: Number(fields.ac.value || 10),
      public: true,
      secrets: "",
      gmNotes: "",
    };
    if (await submitPublicCampaignEntry("npc", entry)) {
      activeDirectoryTab = "npcs";
      activeNpcId = entry.id;
      activeNpcTab = "overview";
      saveUiState();
      dialog.close();
      render();
      return;
    }
    submit.disabled = false;
    submit.textContent = "Добавить NPC";
  });
  panel.append(form);
}

function addFaction() {
  if (!isAdmin) return;
  const faction = normalizeFaction({ id: slug("faction"), name: "Новая фракция", public: false, tags: ["новое"] });
  state.factions.unshift(faction);
  activeDirectoryTab = "factions";
  saveState();
  render();
}

function deleteNpc(npc) {
  if (!confirm(`Удалить NPC "${npc.name}"?`)) return;
  state.npcs = state.npcs.filter((item) => item.id !== npc.id);
  state.factions.forEach((faction) => {
    faction.npcLinks = faction.npcLinks.filter((id) => id !== npc.id);
  });
  state.npcs.forEach((item) => {
    item.npcLinks = (item.npcLinks ?? []).filter((id) => id !== npc.id);
  });
  const deletedKey = relationshipEntityKey("npc", npc.id);
  state.relationships = state.relationships.filter((item) => item.sourceKey !== deletedKey && item.targetKey !== deletedKey);
  activeNpcId = state.npcs[0]?.id ?? null;
  saveState();
  render();
}

function deleteFaction(faction) {
  if (!confirm(`Удалить фракцию "${faction.name}"? NPC останутся, но потеряют привязку к ней.`)) return;
  state.factions = state.factions.filter((item) => item.id !== faction.id);
  state.map.regions.forEach((region) => Object.values(region.hexes ?? {}).forEach((cell) => {
    cell.factionIds = normalizeOwnerIds(cell.factionIds).filter((id) => id !== faction.id);
  }));
  state.npcs.forEach((npc) => {
    if (npc.factionId === faction.id) npc.factionId = "";
  });
  saveState();
  render();
}

function factionById(id) {
  return state.factions.find((faction) => faction.id === id);
}

function npcById(id) {
  return state.npcs.find((npc) => npc.id === id);
}

function linkedWikiByIds(ids) {
  const visibleIds = new Set(visibleWiki().map((article) => article.id));
  return (ids ?? []).map((id) => wikiById(id)).filter((article) => article && visibleIds.has(article.id));
}

function linkedQuestsByIds(ids) {
  const visibleIds = new Set(visibleQuests().map((quest) => quest.id));
  return (ids ?? []).map((id) => state.quests.find((quest) => quest.id === id)).filter((quest) => quest && visibleIds.has(quest.id));
}

function linkedFactionsByIds(ids) {
  const visibleIds = new Set(visibleFactions().map((faction) => faction.id));
  return (ids ?? []).map((id) => factionById(id)).filter((faction) => faction && visibleIds.has(faction.id));
}

function linkedNpcsByIds(ids, excludeId = "") {
  const visibleIds = new Set(visibleNpcs().map((npc) => npc.id));
  return (ids ?? []).map((id) => npcById(id)).filter((npc) => npc && npc.id !== excludeId && visibleIds.has(npc.id));
}

function linkedMapRegionsByIds(ids) {
  const visibleIds = new Set(visibleMapRegions().map((region) => region.id));
  return (ids ?? []).map((id) => state.map.regions.find((region) => region.id === id)).filter((region) => region && visibleIds.has(region.id));
}

function openMapRegion(regionId) {
  selectMapRegion(regionId);
  setView("map");
}

function openCharacter(characterId) {
  const character = state.characters.find((item) => item.id === characterId);
  if (!character) return;
  clearSearchTerm();
  activeCharacterGroupId = "";
  activeCharacterId = character.id;
  setView("characters");
}

function openNpc(npcId) {
  const npc = npcById(npcId);
  activeDirectoryTab = "npcs";
  activeNpcId = npcId;
  searchTerm = npc?.name ?? "";
  if (globalSearch) globalSearch.value = searchTerm;
  setView("directory");
}

function openFaction(factionId) {
  const faction = factionById(factionId);
  activeDirectoryTab = "factions";
  searchTerm = faction?.name ?? "";
  if (globalSearch) globalSearch.value = searchTerm;
  setView("directory");
}

function optionLabel(options, value) {
  return options.find(([id]) => id === value)?.[1] ?? value ?? "";
}

function factionTypeLabel(faction) {
  return optionLabel(factionTypes, faction?.type) || "Фракция";
}

function relationTone(value) {
  const relation = Number(value || 0);
  if (relation <= -3) return "bad";
  if (relation >= 3) return "good";
  if (relation > 0) return "warm";
  if (relation < 0) return "cold";
  return "neutral";
}

function relationText(value) {
  const relation = Number(value || 0);
  return `отношение ${relation > 0 ? "+" : ""}${relation}`;
}

function countryMetricLabel(key) {
  return countryMetricDefinitions.find(([metricKey]) => metricKey === key)?.[1] || key;
}

function formatCountryMetric(key, value) {
  const number = normalizeEffectNumber(value);
  if (["stateUnrest", "stateDomainSize"].includes(key)) return number.toLocaleString("ru-RU");
  return signed(number);
}

function countryEffectBadges(source) {
  return countryMetricDefinitions
    .map(([key, label]) => source[key] ? `${label.toLowerCase()} ${signed(source[key])}` : "")
    .filter(Boolean);
}

function sumCountryEffects(sources) {
  return Object.fromEntries(countryMetricKeys.map((key) => [key, sumBy(sources, key)]));
}

function settlementCountrySources(settlement) {
  return [
    { kind: "settlement", title: settlement.name, subtitle: "Базовый вклад поселения", effects: normalizeCountryEffects(settlement), public: settlement.public },
    ...settlement.traits.map((trait) => ({
      kind: "trait",
      title: trait.name,
      subtitle: `Черта поселения · ${settlement.name}`,
      effects: normalizeCountryEffects(trait),
      public: settlement.public && trait.public,
    })),
    ...settlement.laws.map((law) => ({
      kind: "law",
      title: law.name,
      subtitle: `Закон поселения · ${settlement.name}`,
      effects: normalizeCountryEffects(law),
      public: settlement.public && law.public,
    })),
    ...settlement.buildings
      .filter((building) => building.status === "active")
      .flatMap((building) => Array.from({ length: buildingPlacementTotal(building) }, (_, index) => ({
        kind: "building",
        title: building.name,
        subtitle: `Постройка · ${settlement.name}${buildingPlacementTotal(building) > 1 ? ` · размещение ${index + 1}` : ""}`,
        effects: normalizeCountryEffects(building),
        public: settlement.public && building.public,
      }))),
    ...settlement.residents
      .filter((resident) => resident.affectsSettlement)
      .map((resident) => {
        const entity = relationshipEntity(resident.entityKey);
        return {
          kind: "resident",
          title: entity?.name || "Житель поселения",
          subtitle: `Житель · ${settlement.name}`,
          effects: normalizeCountryEffects(resident),
          public: settlement.public && resident.public,
        };
      }),
  ];
}

function countryRoleHolder(holderKey) {
  const [type, id] = String(holderKey || "").split(":");
  if (type === "character") return state.characters.find((character) => character.id === id) || null;
  if (type === "npc") return state.npcs.find((npc) => npc.id === id) || null;
  return null;
}

function countryContributionRows(country) {
  const rows = [{
    kind: "country",
    title: country.name,
    subtitle: "Базовые показатели государства",
    effects: normalizeCountryEffects(country),
    public: country.public,
  }];
  country.councilRoles
    .filter((role) => countryRoleHolder(role.holderKey))
    .forEach((role) => {
      const holder = countryRoleHolder(role.holderKey);
      rows.push({
        kind: "council",
        title: role.name,
        subtitle: `Совет · ${holder?.name || "назначенный советник"}`,
        effects: normalizeCountryEffects(role),
        public: country.public && role.public,
      });
    });
  country.laws.forEach((law) => {
    rows.push({
      kind: "law",
      title: law.name,
      subtitle: "Закон государства",
      effects: normalizeCountryEffects(law),
      public: country.public && law.public,
    });
  });
  country.settlementIds.forEach((settlementId) => {
    const settlement = state.settlements.find((item) => item.id === settlementId);
    if (settlement) rows.push(...settlementCountrySources(settlement));
  });
  countryValidHexRecords(country).forEach((record) => {
    rows.push({
      kind: "hex",
      title: record.cell.title || `Гекс ${record.key}`,
      subtitle: `${record.region.title} · ${record.key}`,
      effects: record.effects,
      public: record.region.public && (record.cell.visible ?? true),
      hexRef: record.ref,
    });
  });
  return rows;
}

function countryTotals(country) {
  return sumCountryEffects(countryContributionRows(country).map((row) => row.effects));
}

function countryMetricGrid(effects) {
  return metricGrid(countryMetricDefinitions.map(([key, label]) => [label, formatCountryMetric(key, effects[key])]));
}

function renderCountries() {
  const root = el("div");
  const action = isAdmin ? button("Новое государство", "primary-button", addCountry) : null;
  root.append(header("Государства", "Политические владения Асханы, их показатели, поселения и территории на карте.", action));
  const countries = filterItems(visibleCountries(), (country) => [
    country.name,
    country.government,
    country.alignment,
    country.ruler,
    country.capital,
    country.description,
    country.tags.join(" "),
    country.councilRoles.map((role) => `${role.name} ${role.effectivenessBasis} ${role.description}`).join(" "),
    country.laws.map((law) => `${law.name} ${law.description} ${law.effect}`).join(" "),
  ].join(" "));
  if (!countries.some((country) => country.id === activeCountryId)) activeCountryId = countries[0]?.id ?? null;
  if (!countries.length) {
    root.append(el("div", "empty-state", isAdmin ? "Государств пока нет. Создай первое государство." : "Публичных государств пока нет."));
    return root;
  }
  const active = countries.find((country) => country.id === activeCountryId) ?? countries[0];
  const layout = el("div", "country-layout");
  const list = el("aside", "panel country-list");
  list.append(el("p", "eyebrow", "Политическая карта"), el("h3", "", "Государства"));
  countries.forEach((country) => {
    const item = button("", `country-list-card ${country.id === active.id ? "active" : ""}`, () => {
      activeCountryId = country.id;
      render();
    });
    item.append(
      el("strong", "", country.name),
      el("span", "", [country.government, country.capital].filter(Boolean).join(" · ") || "Форма правления не указана"),
      compactBadges([
        country.public ? "игрокам" : "скрыто",
        formatRussianCount(country.settlementIds.length, "поселение", "поселения", "поселений"),
        formatRussianCount(countryValidHexRecords(country).length, "гекс", "гекса", "гексов"),
      ])
    );
    list.append(item);
  });
  layout.append(list, countryDetail(active));
  root.append(layout);
  return root;
}

function countryDetail(country) {
  const detail = el("section", "panel country-detail");
  detail.append(
    el("p", "eyebrow", country.government || "Государство"),
    el("h3", "", country.name),
    compactBadges([country.alignment, country.capital ? `столица: ${country.capital}` : "", country.public ? "игрокам" : "скрыто"]),
    countryTabBar()
  );
  const content = el("div", "country-tab-content");
  const views = {
    overview: countryOverviewView,
    council: countryCouncilView,
    laws: countryLawsView,
    holdings: countryHoldingsView,
    breakdown: countryBreakdownView,
  };
  content.append((views[activeCountryTab] || countryOverviewView)(country));
  if (isAdmin) content.append(countryTabEditor(country));
  detail.append(content);
  return detail;
}

function countryTabBar() {
  const tabs = el("div", "tabs country-tabs");
  countryTabs.forEach(([id, label]) => {
    tabs.append(button(label, `tab-button ${activeCountryTab === id ? "active" : ""}`, () => {
      activeCountryTab = id;
      saveUiState();
      render();
    }));
  });
  return tabs;
}

function countryArt(country) {
  const frame = el("div", `country-art image-aspect-${country.imageStyle.aspect}`);
  if (!country.image) {
    frame.append(el("span", "country-art-placeholder", initials(country.name)));
    return frame;
  }
  const image = document.createElement("img");
  image.src = country.image;
  image.alt = country.name;
  image.style.objectFit = country.imageStyle.fit;
  image.style.objectPosition = `${country.imageStyle.x}% ${country.imageStyle.y}%`;
  image.style.transform = `scale(${country.imageStyle.zoom}) rotate(${country.imageStyle.rotation || 0}deg)`;
  frame.append(image);
  return frame;
}

function countryOverviewView(country) {
  const root = el("div", "country-overview");
  const intro = el("div", "country-intro");
  const description = el("div", "country-description");
  description.append(
    metricGrid([
      ["Форма правления", country.government || "не указана"],
      ["Мировоззрение", country.alignment || "не указано"],
      ["Правитель", country.ruler || "не указан"],
      ["Столица", country.capital || "не указана"],
    ]),
    el("p", "", country.description || "Описание государства пока не заполнено."),
    tags(country.tags)
  );
  intro.append(countryArt(country), description);
  root.append(intro, el("h4", "country-section-title", "Итоговые показатели"), countryMetricGrid(countryTotals(country)));
  if (isAdmin && country.gmNotes) root.append(settlementLabeledText("GM-заметки", country.gmNotes));
  return root;
}

function openCountryRoleHolder(holderKey) {
  const [type, id] = String(holderKey || "").split(":");
  if (type === "character") openCharacter(id);
  if (type === "npc") openNpc(id);
}

function countryCouncilView(country) {
  const root = el("div", "country-council country-entry-grid");
  const roles = country.councilRoles.filter((role) => role.public || isAdmin);
  if (!roles.length) {
    root.append(el("div", "empty-state", "Состав Совета пока не указан."));
    return root;
  }
  roles.forEach((role) => {
    const assignedHolder = countryRoleHolder(role.holderKey);
    const holder = relationshipEntity(role.holderKey);
    const card = el("article", "country-entry-card country-council-card");
    const heading = el("div", "country-entry-heading");
    const title = el("div");
    title.append(el("p", "eyebrow", "Должность Совета"), el("h4", "", role.name));
    const status = compactBadges([
      assignedHolder ? "должность занята" : "вакантно",
      role.public ? "игрокам" : "скрыто",
    ]);
    heading.append(title, status);
    card.append(heading);
    const holderRow = el("div", "country-council-holder");
    if (holder) {
      const portrait = directoryPortrait(holder.portrait, holder.name, holder.portraitStyle);
      portrait.classList.add("country-council-portrait");
      holderRow.append(portrait);
      const holderInfo = el("div");
      holderInfo.append(el("span", "muted", "Должность занимает"), el("strong", "", holder.name));
      if (holder.subtitle) holderInfo.append(el("span", "muted", holder.subtitle));
      holderRow.append(holderInfo, button("Открыть", "small-button", () => openCountryRoleHolder(role.holderKey)));
    } else if (assignedHolder) {
      holderRow.append(el("p", "muted", "Должность занята, но сведения о советнике скрыты."));
    } else {
      holderRow.append(el("p", "muted", "Должность свободна и не влияет на итоговые показатели."));
    }
    card.append(holderRow);
    if (role.effectivenessBasis) card.append(settlementLabeledText("Эффективность зависит от", role.effectivenessBasis));
    if (role.description) card.append(settlementLabeledText("Описание", role.description));
    card.append(compactBadges(countryEffectBadges(role).length ? countryEffectBadges(role) : ["без модификаторов"]));
    root.append(card);
  });
  return root;
}

function countryLawsView(country) {
  const root = el("div", "country-laws country-entry-grid");
  const laws = country.laws.filter((law) => law.public || isAdmin);
  if (!laws.length) {
    root.append(el("div", "empty-state", "Законы государства пока не описаны."));
    return root;
  }
  laws.forEach((law) => {
    const card = el("article", "country-entry-card country-law-card");
    const heading = el("div", "country-entry-heading");
    const title = el("div");
    title.append(el("p", "eyebrow", "Закон государства"), el("h4", "", law.name));
    heading.append(title, compactBadges([law.public ? "игрокам" : "скрыто"]));
    card.append(heading);
    if (law.description) card.append(settlementLabeledText("Описание", law.description));
    if (law.effect) card.append(settlementLabeledText("Эффект", law.effect));
    card.append(compactBadges(countryEffectBadges(law).length ? countryEffectBadges(law) : ["без модификаторов"]));
    root.append(card);
  });
  return root;
}

function countryHoldingsView(country) {
  const root = el("div", "country-holdings");
  const settlements = el("section", "country-holdings-section");
  settlements.append(el("h4", "", "Контролируемые поселения"));
  if (!country.settlementIds.length) settlements.append(el("p", "muted", "Поселения пока не назначены."));
  country.settlementIds.forEach((settlementId) => {
    const settlement = state.settlements.find((item) => item.id === settlementId);
    if (!settlement) return;
    const visible = settlement.public || isAdmin;
    const card = el("article", "country-holding-card");
    const effects = sumCountryEffects(settlementCountrySources(settlement).map((row) => row.effects));
    card.append(
      el("strong", "", visible ? settlement.name : "Скрытое поселение"),
      el("span", "muted", visible ? optionLabel(settlementTypes, settlement.type) : "Данные мастера"),
      compactBadges(countryEffectBadges(effects))
    );
    if (visible) card.append(button("Открыть поселение", "small-button", () => openSettlement(settlement.id)));
    settlements.append(card);
  });

  const hexes = el("section", "country-holdings-section");
  hexes.append(el("h4", "", "Контролируемые гексы"));
  const hexRecords = countryValidHexRecords(country);
  if (!hexRecords.length) hexes.append(el("p", "muted", "Территории на карте пока не назначены."));
  if (isAdmin && hexRecords.length !== country.hexRefs.length) {
    hexes.append(el("p", "muted", "Некоторые ранее назначенные гексы больше не существуют и не учитываются."));
  }
  hexRecords.forEach((record) => {
    const ref = record.ref;
    const visible = (record.region.public && (record.cell.visible ?? true)) || isAdmin;
    const card = el("article", "country-holding-card");
    card.append(
      el("strong", "", visible ? (record.cell.title || `Гекс ${record.key}`) : "Скрытая территория"),
      el("span", "muted", visible ? `${record.region.title} · ${record.key} · ${terrainSummary(record.cell)}` : "Данные мастера"),
      compactBadges(countryEffectBadges(record.effects))
    );
    if (visible) card.append(button("Открыть на карте", "small-button", () => openCountryHex(ref)));
    hexes.append(card);
  });
  root.append(settlements, hexes);
  return root;
}

function countryBreakdownView(country) {
  const root = el("div", "country-breakdown");
  const rows = countryContributionRows(country).filter((row) => row.public || isAdmin);
  rows.forEach((row) => {
    const card = el("article", "country-source-card");
    card.append(
      el("p", "eyebrow", row.subtitle),
      el("strong", "", row.title),
      compactBadges(countryEffectBadges(row.effects).length ? countryEffectBadges(row.effects) : ["без модификаторов"])
    );
    root.append(card);
  });
  return root;
}

function countryTabEditor(country) {
  const editors = {
    overview: countryOverviewEditor,
    council: countryCouncilEditor,
    laws: countryLawsEditor,
    holdings: countryHoldingsEditor,
    breakdown: () => el("p", "muted", "Источники формируются автоматически из базы государства, Совета, законов, поселений, черт, построек и гексов."),
  };
  return (editors[activeCountryTab] || countryOverviewEditor)(country);
}

function addCountry() {
  if (!isAdmin) return;
  const country = normalizeCountry({ name: "Новое государство", public: false });
  state.countries.unshift(country);
  activeCountryId = country.id;
  activeCountryTab = "overview";
  saveState();
  render();
}

function deleteCountry(country) {
  if (!confirm(`Удалить государство «${country.name}»?`)) return;
  state.countries = state.countries.filter((item) => item.id !== country.id);
  state.map.regions.forEach((region) => Object.values(region.hexes ?? {}).forEach((cell) => {
    cell.countryIds = normalizeOwnerIds(cell.countryIds).filter((id) => id !== country.id);
  }));
  activeCountryId = visibleCountries()[0]?.id ?? null;
  saveState();
  render();
}

function saveCountry(country) {
  Object.assign(country, normalizeCountry(country));
  saveState();
  render();
}

function openCountryHex(ref) {
  const record = countryHexRecord(ref);
  if (!record || (!record.region.public && !isAdmin)) return;
  state.map.activeRegionId = record.region.id;
  state.map.selectedHex = record.key;
  updateMapView(record.region.id, { selectedHex: record.key });
  setView("map");
}

function countryOverviewEditor(country) {
  const form = el("form", "form-grid country-editor");
  const fields = {
    name: input(country.name),
    government: input(country.government),
    alignment: input(country.alignment),
    ruler: input(country.ruler),
    capital: input(country.capital),
    description: textarea(country.description),
    gmNotes: textarea(country.gmNotes),
    tags: input(country.tags.join(", ")),
    public: document.createElement("input"),
    ...Object.fromEntries(countryMetricKeys.map((key) => [key, input(country[key])])),
  };
  fields.name.required = true;
  fields.public.type = "checkbox";
  fields.public.checked = country.public;
  countryMetricKeys.forEach((key) => {
    fields[key].type = "number";
    fields[key].step = "1";
  });

  const imageStyle = { ...defaultImageStyle(), ...(country.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = country.image || "";
  const preview = el("div", "upload-preview country-image-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Изображение не загружено");
  preview.append(previewImage, previewText);
  const aspect = selectInput([["wide", "Широкая 16:9"], ["square", "Квадрат 1:1"], ["portrait", "Портрет 3:4"], ["banner", "Баннер 21:9"]], imageStyle.aspect);
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 3, 0.05);
  const rotation = rangeInput(imageStyle.rotation || 0, -180, 180, 1);
  const refreshPreview = () => {
    preview.className = `upload-preview country-image-preview image-aspect-${aspect.value}`;
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value}) rotate(${rotation.value}deg)`;
  };
  [aspect, fit, posX, posY, zoom, rotation].forEach((control) => control.addEventListener("input", refreshPreview));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "countries");
    refreshPreview();
  });
  refreshPreview();
  form.append(
    labelWrap("Название", fields.name),
    labelWrap("Форма правления", fields.government),
    labelWrap("Мировоззрение", fields.alignment),
    labelWrap("Правитель", fields.ruler),
    labelWrap("Столица", fields.capital),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Описание государства", fields.description, "span-2"),
    labelWrap("GM-заметки", fields.gmNotes, "span-2"),
    labelWrap("Теги", fields.tags, "span-2"),
    labelWrap("Изображение", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб", zoom),
    labelWrap("Поворот", rotation),
    actionRow([button("Убрать изображение", "ghost-button", () => {
      imageValue = "";
      imageInput.value = "";
      refreshPreview();
    })], "span-2"),
    el("h4", "span-2 settlement-editor-heading", "Базовые показатели государства"),
    ...countryMetricDefinitions.map(([key, label]) => labelWrap(label, fields[key])),
    actionRow([
      button("Сохранить государство", "primary-button", null, "submit"),
      button("Удалить государство", "ghost-button", () => deleteCountry(country)),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextTags = csv(fields.tags.value);
    registerTags(nextTags, true);
    Object.assign(country, {
      name: fields.name.value,
      government: fields.government.value,
      alignment: fields.alignment.value,
      ruler: fields.ruler.value,
      capital: fields.capital.value,
      description: fields.description.value,
      gmNotes: fields.gmNotes.value,
      tags: nextTags,
      public: fields.public.checked,
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
        rotation: Number(rotation.value),
      },
      ...Object.fromEntries(countryMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
    });
    saveCountry(country);
  });
  return editorPanel("Редактор государства", form);
}

function countryCouncilHolderOptions() {
  return [
    ["", "Должность вакантна"],
    ...state.characters.map((character) => [
      relationshipEntityKey("character", character.id),
      `Герой: ${character.name}`,
    ]),
    ...state.npcs.map((npc) => [
      relationshipEntityKey("npc", npc.id),
      `NPC: ${npc.name}`,
    ]),
  ];
}

function countryEntriesEditor(items, fields, addLabel, defaultValues = {}) {
  const root = el("div", "country-entries-editor");
  const list = el("div", "country-edit-entry-list");
  const rows = (items ?? []).map((item) => ({ values: { ...item }, controls: {} }));
  let openIndex = rows.length ? 0 : -1;

  const syncRows = () => {
    rows.forEach((row) => {
      fields.forEach((field) => {
        const control = row.controls[field.key];
        if (!control) return;
        row.values[field.key] = field.type === "checkbox" ? control.checked : control.value;
      });
    });
  };

  const renderRows = () => {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const details = el("details", "country-edit-entry");
      details.open = index === openIndex;
      const summary = el("summary", "");
      summary.append(
        el("strong", "", row.values.name || "Новая запись"),
        el("span", "muted", index === openIndex ? "редактирование" : "открыть")
      );
      details.addEventListener("toggle", () => {
        if (details.open) openIndex = index;
      });
      const grid = el("div", "form-grid country-edit-entry-fields");
      fields.forEach((field) => {
        let control;
        if (field.options) {
          control = selectInput(field.options, row.values[field.key] ?? field.defaultValue ?? "");
        } else if (field.type === "textarea") {
          control = textarea(row.values[field.key] || "");
        } else if (field.type === "checkbox") {
          control = document.createElement("input");
          control.type = "checkbox";
          control.checked = Boolean(row.values[field.key] ?? field.defaultValue ?? false);
        } else {
          control = input(row.values[field.key] ?? field.defaultValue ?? "");
        }
        if (field.type === "number") {
          control.type = "number";
          control.step = String(field.step ?? 1);
        }
        if (field.key === "name") {
          control.addEventListener("input", () => {
            summary.querySelector("strong").textContent = control.value.trim() || "Новая запись";
          });
        }
        row.controls[field.key] = control;
        grid.append(field.type === "checkbox"
          ? checkboxWrap(field.label, control)
          : labelWrap(field.label, control, field.type === "textarea" ? "span-2" : ""));
      });
      grid.append(actionRow([button("Удалить", "ghost-button", () => {
        syncRows();
        rows.splice(index, 1);
        openIndex = Math.min(index, rows.length - 1);
        renderRows();
      })], "span-2"));
      details.append(summary, grid);
      list.append(details);
    });
  };

  const addEntry = () => {
    syncRows();
    rows.push({ values: { id: crypto.randomUUID(), ...defaultValues }, controls: {} });
    openIndex = rows.length - 1;
    renderRows();
  };
  renderRows();
  root.append(list, button(addLabel, "small-button", addEntry));
  return {
    element: root,
    read: () => {
      syncRows();
      return rows
        .map((row) => ({
          id: row.values.id || crypto.randomUUID(),
          ...Object.fromEntries(fields.map((field) => {
            const value = row.values[field.key];
            if (field.type === "number") return [field.key, Number(value || 0)];
            if (field.type === "checkbox") return [field.key, Boolean(value)];
            return [field.key, String(value || "").trim()];
          })),
        }))
        .filter((row) => row.name);
    },
  };
}

function countryCouncilEditor(country) {
  const form = el("form", "form-grid country-council-editor");
  const editor = countryEntriesEditor(country.councilRoles, [
    { key: "name", label: "Название роли" },
    { key: "holderKey", label: "Кто занимает роль", options: countryCouncilHolderOptions() },
    { key: "effectivenessBasis", label: "От чего зависит эффективность", type: "textarea" },
    { key: "description", label: "Описание", type: "textarea" },
    ...countryMetricDefinitions.map(([key, label]) => ({ key, label, type: "number" })),
    { key: "public", label: "Видно игрокам", type: "checkbox", defaultValue: true },
  ], "Добавить роль в Совет", { name: "Новая должность", public: true });
  form.append(
    labelWrap("Роли государственного Совета", editor.element, "span-2"),
    el("p", "muted span-2", "Модификаторы роли учитываются только тогда, когда на должность назначен герой или NPC."),
    actionRow([button("Сохранить Совет", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    country.councilRoles = editor.read().map(normalizeCountryCouncilRole);
    saveCountry(country);
  });
  return editorPanel("Редактор Совета", form);
}

function countryLawsEditor(country) {
  const form = el("form", "form-grid country-laws-editor");
  const editor = countryEntriesEditor(country.laws, [
    { key: "name", label: "Название закона" },
    { key: "description", label: "Художественное описание", type: "textarea" },
    { key: "effect", label: "Описание эффекта", type: "textarea" },
    ...countryMetricDefinitions.map(([key, label]) => ({ key, label, type: "number" })),
    { key: "public", label: "Видно игрокам", type: "checkbox", defaultValue: true },
  ], "Добавить закон", { name: "Новый закон", public: true });
  form.append(
    labelWrap("Законы государства", editor.element, "span-2"),
    actionRow([button("Сохранить законы", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    country.laws = editor.read().map(normalizeCountryLaw);
    saveCountry(country);
  });
  return editorPanel("Редактор законов", form);
}

function countryHoldingsEditor(country) {
  const form = el("form", "form-grid country-holdings-editor");
  const settlements = searchableCheckboxList(
    state.settlements.map((settlement) => [settlement.id, settlement.name, `${settlement.type} ${settlement.tags.join(" ")}`]),
    country.settlementIds,
    "",
    null,
    "Поиск поселений"
  );
  const hexes = searchableCheckboxList(countryHexOptions(), country.hexRefs, "", null, "Поиск по карте, названию или координатам");
  hexes.classList.add("country-hex-selector");
  form.append(
    labelWrap("Контролируемые поселения", settlements, "span-2"),
    labelWrap("Контролируемые гексы", hexes, "span-2"),
    actionRow([button("Сохранить владения", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    country.settlementIds = checkedValues(settlements);
    const selectedHexRefs = new Set(checkedValues(hexes));
    state.map.regions.filter((region) => !isSquareRegion(region)).forEach((region) => {
      for (let q = 0; q < Number(region.grid.cols || 0); q += 1) {
        for (let r = 0; r < Number(region.grid.rows || 0); r += 1) {
          const key = hexKey(q, r);
          const ref = countryHexRef(region.id, key);
          const existingCell = region.hexes?.[key];
          if (!existingCell && !selectedHexRefs.has(ref)) continue;
          const cell = existingCell || getHex(region, key);
          const owners = new Set(normalizeOwnerIds(cell.countryIds));
          if (selectedHexRefs.has(ref)) owners.add(country.id);
          else owners.delete(country.id);
          cell.countryIds = [...owners];
        }
      }
    });
    syncCountryRefsFromMap();
    saveCountry(country);
  });
  return editorPanel("Редактор владений", form);
}

function renderSettlements() {
  const root = el("div");
  const action = isAdmin ? button("Новое поселение", "primary-button", () => addSettlement()) : null;
  root.append(header("Поселения", "Владения партии: кварталы, показатели, постройки, бизнесы, жители, войска и хронология.", action));

  const visible = visibleSettlements();
  if (!visible.some((settlement) => settlement.id === activeSettlementId)) activeSettlementId = visible[0]?.id ?? null;
  if (!visible.length) {
    root.append(el("div", "empty-state", "Публичных поселений пока нет."));
    return root;
  }

  const active = visible.find((settlement) => settlement.id === activeSettlementId) ?? visible[0];
  const layout = el("div", "settlement-layout");
  const list = el("aside", "panel settlement-list");
  list.append(el("p", "eyebrow", "Домены"), el("h3", "", "Поселения"));
  visible.forEach((settlement) => {
    const item = button("", `settlement-list-card ${settlement.id === active.id ? "active" : ""}`, () => {
      activeSettlementId = settlement.id;
      render();
    });
    item.append(el("strong", "", settlement.name));
    list.append(item);
  });
  if (isAdmin) list.append(actionRow([button("Добавить поселение", "primary-button", () => addSettlement())]));
  layout.append(list, settlementDetail(active));
  root.append(layout);
  return root;
}

function settlementDetail(settlement) {
  const detail = el("section", "panel settlement-detail");
  const titleActions = isAdmin
    ? actionRow([button("Дублировать поселение", "ghost-button", () => duplicateSettlement(settlement))])
    : "";
  detail.append(
    el("p", "eyebrow", optionLabel(settlementTypes, settlement.type)),
    el("h3", "", settlement.name),
    compactBadges([settlement.size, `${settlement.population} жителей`, settlement.public ? "игрокам" : "скрыто"]),
    settlementTabBar(),
    titleActions
  );
  const content = el("div", "settlement-tab-content");
  const views = {
    overview: settlementOverviewView,
    traits: settlementTraitsView,
    laws: settlementLawsView,
    districts: settlementDistrictsView,
    buildings: settlementBuildingsView,
    commerce: settlementCommerceView,
    "population-groups": settlementPopulationGroupsView,
    residents: settlementResidentsView,
    armies: settlementArmiesView,
    chronicle: settlementLogView,
  };
  content.append((views[activeSettlementTab] || settlementOverviewView)(settlement));
  if (isAdmin) content.append(settlementTabEditor(settlement));
  detail.append(content);
  return detail;
}

function settlementTabBar() {
  const tabs = el("div", "tabs settlement-tabs");
  settlementTabs.forEach(([id, label]) => {
    tabs.append(button(label, `tab-button ${activeSettlementTab === id ? "active" : ""}`, () => {
      activeSettlementTab = id;
      saveUiState();
      render();
    }));
  });
  return tabs;
}

function settlementOverviewView(settlement) {
  const root = el("div", "admin-stack");
  const economy = settlementEconomy(settlement);
  const faction = factionById(settlement.factionId);
  const linkedMap = state.map.regions.find((region) => region.id === settlement.mapRegionId);
  root.append(
    settlementOverviewIntro(settlement),
    compactBadges([`кварталов в расчёте: ${settlement.districts.length}`]),
    metricGrid([
      ["Закон", signed(economy.law)],
      ["Преступность", signed(economy.crime)],
      ["Коррупция", signed(economy.corruption)],
      ["Знания", signed(economy.knowledge)],
      ["Общество", signed(economy.society)],
      ["Производство", signed(economy.production)],
      ["Рейтинг опасности", signed(economy.dangerRating)],
      ["Лимит оборота капитала", formatPlainAmount(economy.capitalTurnoverLimit)],
      ["Лимит оборота денежных средств", formatGoldAmount(economy.cashTurnoverLimit)],
      ["Верхний предел цен", formatGoldAmount(economy.priceCeiling)],
    ]),
    settlementMarketOverview(settlement),
    directoryMeta([
      ["Управляющий", settlement.ruler],
      ["Фракция", faction?.name],
      ["Карта", linkedMap?.title],
    ]),
    directoryLinks([
      ...(faction ? [[`Фракция: ${faction.name}`, () => openFaction(faction.id)]] : []),
      ...(linkedMap ? [[`Карта: ${linkedMap.title}`, () => selectSettlementMap(linkedMap.id)]] : []),
      ...linkedWikiByIds(settlement.wikiLinks).map((article) => [`Wiki: ${article.title}`, () => openWikiArticle(article.id)]),
      ...linkedQuestsByIds(settlement.questLinks).map((quest) => [`Задание: ${quest.title}`, () => openQuest(quest.id)]),
    ])
  );
  if (isAdmin && settlement.gmNotes) root.append(el("p", "gm-inline", `GM: ${settlement.gmNotes}`));
  return root;
}

function settlementOverviewIntro(settlement) {
  const intro = el("section", `settlement-overview-intro ${settlement.image ? "has-art" : ""}`);
  if (settlement.image) {
    const frame = el("div", "settlement-overview-art");
    const style = { ...defaultImageStyle(), ...(settlement.imageStyle ?? {}) };
    frame.classList.add(`image-aspect-${style.aspect}`);
    const image = document.createElement("img");
    image.src = settlement.image;
    image.alt = settlement.name;
    image.style.objectFit = style.fit;
    image.style.objectPosition = `${style.x}% ${style.y}%`;
    image.style.transform = `scale(${style.zoom}) rotate(${style.rotation || 0}deg)`;
    frame.append(image);
    intro.append(frame);
  }
  intro.append(el("p", "settlement-description", settlement.description || "Описание пока не заполнено."));
  return intro;
}

function settlementMarketOverview(settlement) {
  const sources = [
    ...settlement.buildings
      .filter((building) => (building.public || isAdmin) && (building.magicItemCount || building.magicItems.length))
      .map((building) => ({ source: building, title: building.name, placements: building.placements })),
    ...settlement.residents
      .filter((resident) => resident.affectsSettlement && (resident.public || isAdmin) && (resident.magicItemCount || resident.magicItems.length))
      .map((resident) => ({
        source: resident,
        title: relationshipEntity(resident.entityKey)?.name || "Житель поселения",
        districtId: resident.districtId,
      })),
  ];
  const section = el("section", "settlement-market-overview");
  section.append(el("h4", "", "Магические предметы в продаже"));
  if (!sources.length) {
    section.append(el("p", "muted", "Магические предметы пока не поступали на рынок."));
    return section;
  }
  sources.forEach(({ source, title, districtId, placements }) => {
    const placementLabels = Array.isArray(placements)
      ? placements.map((placement) => {
          const district = settlement.districts.find((item) => item.id === placement.districtId && (item.public || isAdmin));
          return [district?.name, placement.location].filter(Boolean).join(" · ");
        }).filter(Boolean)
      : [];
    const district = settlement.districts.find((item) => item.id === districtId && (item.public || isAdmin));
    const row = el("div", "settlement-market-row");
    row.append(
      el("strong", "", title),
      el("span", "market-count", `${source.magicItemCount} шт.`),
      el("p", "", [
        placementLabels.length ? placementLabels.join("; ") : district?.name,
        source.magicItems.length
          ? source.magicItems.map((item) => `${item.name} ×${item.quantity}${item.cost ? ` · ${item.cost}` : ""}`).join(" · ")
          : "Перечень не указан",
      ].filter(Boolean).join(" · "))
    );
    section.append(row);
  });
  return section;
}

function settlementSection(title, content) {
  const section = el("section", "settlement-section");
  section.append(el("h4", "", title), content);
  return section;
}

function settlementTraitsView(settlement) {
  const visibleTraits = settlement.traits.filter((trait) => trait.public || isAdmin);
  if (!visibleTraits.length) return el("div", "empty-state", "Черты поселения пока не добавлены.");
  const list = el("div", "settlement-trait-list");
  visibleTraits.forEach((trait) => {
    const card = el("article", `settlement-trait-card ${trait.image ? "has-art" : ""}`);
    if (trait.image) card.append(settlementTraitImage(trait));
    const content = el("div", "settlement-trait-card-body");
    content.append(el("strong", "", trait.name));
    if (trait.showDescription || isAdmin) {
      content.append(settlementTraitDisclosure(
        trait.showDescription ? "Описание" : "Описание · скрыто от игроков",
        trait.description || "Художественное описание пока не заполнено.",
        trait.showDescription
      ));
    }
    if (trait.showEffect || isAdmin) {
      const effectContent = el("div", "settlement-trait-effect-content");
      effectContent.append(
        el("p", "", trait.effect || "Эффект пока не указан."),
        compactBadges(effectBadges(trait))
      );
      content.append(settlementTraitDisclosure(
        trait.showEffect ? "Эффект" : "Эффект · скрыт от игроков",
        effectContent,
        trait.showEffect
      ));
    }
    card.append(content);
    if (isAdmin) {
      card.append(lazyInlineEditor("Редактировать черту", () => settlementTraitForm(settlement, trait)));
    }
    list.append(card);
  });
  return list;
}

function settlementTraitImage(trait) {
  const frame = el("div", "settlement-trait-art");
  const style = { ...defaultImageStyle(), ...(trait.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  const image = document.createElement("img");
  image.src = trait.image;
  image.alt = trait.name;
  image.style.objectFit = style.fit;
  image.style.objectPosition = `${style.x}% ${style.y}%`;
  image.style.transform = `scale(${style.zoom}) rotate(${style.rotation || 0}deg)`;
  frame.append(image);
  return frame;
}

function settlementTraitDisclosure(label, content, open = true) {
  const details = el("details", "settlement-trait-disclosure");
  details.open = Boolean(open);
  details.append(el("summary", "", label));
  details.append(typeof content === "string" ? el("p", "", content) : content);
  return details;
}

function settlementLawsView(settlement) {
  const visibleLaws = settlement.laws.filter((law) => law.public || isAdmin);
  if (!visibleLaws.length) return el("div", "empty-state", "Законы поселения пока не добавлены.");
  const grid = el("div", "settlement-trait-grid");
  visibleLaws.forEach((law) => {
    const card = el("article", "settlement-trait-card settlement-law-card");
    card.append(
      el("strong", "", law.name),
      el("p", "settlement-trait-description", law.description || "Описание закона пока не заполнено."),
      settlementLabeledText("Действие закона", law.effect || "Эффект пока не указан."),
      compactBadges(effectBadges(law))
    );
    grid.append(card);
  });
  return grid;
}

function settlementDistrictsView(settlement) {
  const visibleDistricts = settlement.districts.filter((district) => district.public || isAdmin);
  if (!visibleDistricts.length) return el("div", "empty-state", "Публичных кварталов пока нет.");
  const grid = el("div", "settlement-district-grid");
  visibleDistricts.forEach((district) => {
    const card = el("article", "settlement-district-card");
    const buildings = settlement.buildings.filter((building) => buildingPlacementCount(building, district.id) > 0 && (building.public || isAdmin));
    const placementCount = buildings.reduce((sum, building) => sum + buildingPlacementCount(building, district.id), 0);
    const economy = settlementDistrictEconomy(settlement, district);
    card.append(
      settlementDistrictImage(district),
      el("h4", "", district.name),
      compactBadges([formatRussianCount(placementCount, "размещение", "размещения", "размещений"), district.public ? "игрокам" : "скрыто"]),
      el("p", "settlement-district-description", district.description || "Описание квартала пока не заполнено.")
    );
    const details = el("details", "settlement-district-details");
    details.append(
      el("summary", "", "Показатели и обитатели"),
      settlementDistrictMetricGrid(economy),
      settlementDistrictEntities(district)
    );
    card.append(details);
    if (isAdmin) card.append(inlineEditor("Редактировать квартал", settlementDistrictForm(settlement, district)));
    grid.append(card);
  });
  return grid;
}

function settlementDistrictImage(district) {
  const frame = el("div", "settlement-district-art");
  const style = { ...defaultImageStyle(), ...(district.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  if (!district.image) {
    frame.append(el("span", "settlement-building-placeholder", initials(district.name)));
    return frame;
  }
  const image = document.createElement("img");
  image.src = district.image;
  image.alt = district.name;
  image.style.objectFit = style.fit;
  image.style.objectPosition = `${style.x}% ${style.y}%`;
  image.style.transform = `scale(${style.zoom}) rotate(${style.rotation || 0}deg)`;
  frame.append(image);
  return frame;
}

function settlementDistrictMetricGrid(economy) {
  return metricGrid([
    ["Закон", signed(economy.law)],
    ["Преступность", signed(economy.crime)],
    ["Коррупция", signed(economy.corruption)],
    ["Знания", signed(economy.knowledge)],
    ["Общество", signed(economy.society)],
    ["Производство", signed(economy.production)],
    ["Опасность", signed(economy.dangerRating)],
    ["Оборот капитала", formatPlainAmount(economy.capitalTurnoverLimit)],
    ["Оборот средств", formatGoldAmount(economy.cashTurnoverLimit)],
    ["Предел цен", formatGoldAmount(economy.priceCeiling)],
  ]);
}

function settlementDistrictEntities(district) {
  const entities = district.entityLinks.map(relationshipEntity).filter(Boolean);
  const section = el("section", "settlement-district-entities");
  section.append(el("p", "eyebrow", "Существа и персонажи квартала"));
  if (!entities.length) {
    section.append(el("p", "muted", "Связанные персонажи пока не добавлены."));
    return section;
  }
  const links = el("div", "directory-links");
  entities.forEach((entity) => {
    links.append(button(entity.name, "map-link-button", () => entity.type === "npc" ? openNpc(entity.id) : openCharacter(entity.id)));
  });
  section.append(links);
  return section;
}

function settlementBuildingsView(settlement) {
  const visibleBuildings = settlement.buildings.filter((building) => building.public || isAdmin);
  if (!visibleBuildings.length) return el("div", "empty-state", "Построек пока нет.");
  const grid = el("div", "settlement-item-grid");
  visibleBuildings.forEach((building) => {
    const card = el("article", "settlement-item settlement-building-card");
    const responsible = npcById(building.responsibleNpc);
    const quest = state.quests.find((item) => item.id === building.linkedQuest);
    const faction = factionById(building.factionId);
    const placementLabels = buildingPlacementLabels(settlement, building);
    card.dataset.buildingId = building.id;
    card.append(
      settlementBuildingImage(building),
      el("strong", "", building.name),
      compactBadges([
        building.type,
        `уровень ${building.level}`,
        building.buildingCost ? `строительство: ${formatGoldAmount(building.buildingCost)}` : "",
        building.upgradeCost ? `улучшения: ${formatGoldAmount(building.upgradeCost)}` : "",
        optionLabel(buildingStatuses, building.status),
        ...placementLabels,
        faction?.name,
        building.public ? "игрокам" : "скрыто",
      ])
    );
    const details = el("details", "settlement-building-details");
    const detailsBody = el("div", "settlement-building-details-body");
    details.append(el("summary", "", "Описание и параметры"), detailsBody);
    detailsBody.append(
      el("p", "", building.description || "Описание постройки пока не заполнено."),
      building.upgrades ? settlementLabeledText("Улучшения", building.upgrades) : "",
      building.effect ? settlementLabeledText("Эффект", building.effect) : "",
      compactBadges(effectBadges(building))
    );
    if (building.magicItemCount || building.magicItems.length) {
      detailsBody.append(settlementMagicMarket(building));
    }
    if (building.hierarchyEnabled) {
      detailsBody.append(button("Открыть слот-иерархию", "primary-button building-hierarchy-open", () => {
        openBuildingHierarchy(settlement, building);
      }));
    }
    if (faction) detailsBody.append(button(`Владелец: ${faction.name}`, "map-link-button", () => openFaction(faction.id)));
    if (responsible) detailsBody.append(button(`Ответственный: ${responsible.name}`, "map-link-button", () => openNpc(responsible.id)));
    if (quest) detailsBody.append(button(`Задание: ${quest.title}`, "map-link-button", () => openQuest(quest.id)));
    card.append(details);
    if (isAdmin) card.append(inlineEditor("Редактировать постройку", settlementBuildingForm(settlement, building)));
    grid.append(card);
  });
  return grid;
}

function buildingPlacementLabels(settlement, building) {
  return (building.placements || []).map((placement, index) => {
    const districtRecord = settlement.districts.find((item) => item.id === placement.districtId);
    const district = districtRecord && (districtRecord.public || isAdmin) ? districtRecord : null;
    const location = placement.location ? ` · ${placement.location}` : "";
    const districtName = district?.name || (districtRecord ? "Скрытый квартал" : "Квартал не выбран");
    return `${index + 1}. ${districtName}${location}`;
  });
}

function openRelationshipEntity(entity) {
  if (!entity) return;
  if (entity.type === "npc") openNpc(entity.id);
  else openCharacter(entity.id);
}

function buildingHierarchyDiagram(building, onSelect = openRelationshipEntity) {
  const diagram = el("div", "building-hierarchy-diagram");
  const levels = [...(building.hierarchyLevels || [])].sort((a, b) => b.level - a.level);
  levels.forEach((level) => {
    const row = el("section", "building-hierarchy-level");
    row.append(el("div", "building-hierarchy-level-label", level.level === 0 ? "Базовый уровень 0" : `Уровень ${level.level}`));
    const slots = el("div", "building-hierarchy-slots");
    if (!level.slots.length) {
      slots.append(el("div", "building-hierarchy-empty", "Ячейки пока не добавлены"));
    }
    level.slots.forEach((slot) => {
      const entity = relationshipEntity(slot.entityKey);
      const cell = button("", "building-hierarchy-slot", () => onSelect(entity));
      cell.disabled = !entity;
      cell.append(
        directoryPortrait(entity?.portrait || "", entity?.name || "Свободная ячейка", entity?.portraitStyle),
        el("strong", "", entity?.name || "Свободная ячейка"),
        entity?.subtitle ? el("span", "muted", entity.subtitle) : ""
      );
      slots.append(cell);
    });
    row.append(slots);
    diagram.append(row);
  });
  return diagram;
}

function openBuildingHierarchy(settlement, building) {
  const overlay = el("div", "building-hierarchy-overlay");
  const panel = el("section", "building-hierarchy-modal");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", `Слот-иерархия: ${building.name}`);
  const close = () => {
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };
  const head = el("header", "building-hierarchy-modal-head");
  head.append(
    el("div", "", ""),
    el("div", "", ""),
    button("Закрыть", "ghost-button", close)
  );
  head.children[0].append(el("span", "eyebrow", settlement.name), el("h2", "", building.name));
  head.children[1].append(el("p", "muted", "Слот-иерархия постройки"));
  panel.append(head, buildingHierarchyDiagram(building, (entity) => {
    close();
    openRelationshipEntity(entity);
  }));
  overlay.append(panel);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKeyDown);
  document.body.append(overlay);
  panel.querySelector("button")?.focus();
}

function settlementBuildingImage(building) {
  const frame = el("div", "settlement-building-art");
  const style = { ...defaultImageStyle(), ...(building.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  if (!building.image) {
    frame.append(el("span", "settlement-building-placeholder", initials(building.name)));
    return frame;
  }
  const image = document.createElement("img");
  image.src = building.image;
  image.alt = building.name;
  image.style.objectFit = style.fit;
  image.style.objectPosition = `${style.x}% ${style.y}%`;
  image.style.transform = `scale(${style.zoom}) rotate(${style.rotation || 0}deg)`;
  frame.append(image);
  return frame;
}

function settlementMagicMarket(building) {
  const block = el("div", "settlement-magic-market");
  block.append(el("span", "eyebrow", "Магические предметы на рынке"));
  block.append(el("strong", "", `${building.magicItemCount} шт.`));
  if (building.magicItems.length) {
    const list = el("ul", "settlement-magic-list");
    building.magicItems.forEach((item) => {
      const row = el("li", "settlement-magic-item");
      row.append(
        el("strong", "", `${item.name} ×${item.quantity}`),
        item.type ? el("span", "muted", item.type) : "",
        item.cost ? el("span", "settlement-magic-cost", `Стоимость: ${item.cost}`) : "",
        item.description ? el("p", "", item.description) : "",
        item.effect ? settlementLabeledText("Эффект", item.effect) : ""
      );
      list.append(row);
    });
    block.append(list);
  } else {
    block.append(el("p", "muted", "Перечень предметов пока не указан."));
  }
  return block;
}

function settlementCommerceView(settlement) {
  const businesses = settlement.businesses.filter((business) => business.public || isAdmin);
  if (!businesses.length) return el("div", "empty-state", "Коммерческая деятельность пока не добавлена.");
  const grid = el("div", "settlement-item-grid");
  businesses.forEach((business) => {
    const card = el("article", "settlement-item settlement-business-card");
    card.append(
      el("strong", "", business.name),
      compactBadges([business.type, business.status, business.location, business.public ? "игрокам" : "скрыто"]),
      el("p", "", business.description || "Описание бизнеса пока не заполнено."),
      business.owner ? settlementLabeledText("Владелец", business.owner) : "",
      business.effect ? settlementLabeledText("Особенности", business.effect) : "",
      compactBadges([`${formatGold(business.income - business.upkeep)}/мес`, business.employees ? `работников: ${business.employees}` : ""])
    );
    if (isAdmin) card.append(inlineEditor("Редактировать предприятие", settlementBusinessForm(settlement, business)));
    grid.append(card);
  });
  return grid;
}

function settlementPopulationGroupsView(settlement) {
  const groups = settlement.populationGroups.filter((group) => group.public || isAdmin);
  if (!groups.length) return el("div", "empty-state", "Группы населения пока не добавлены.");
  const grid = el("div", "settlement-population-grid");
  groups.forEach((group) => {
    const faction = factionById(group.factionId);
    const representative = relationshipEntity(group.representativeKey || relationshipEntityKey("npc", group.representativeNpcId));
    const card = el("article", "settlement-population-card");
    card.append(
      el("div", "settlement-population-head", ""),
      directoryMeta([
        ["Место обитания", group.location],
        ["Раса", group.race],
        ["Конфессия", group.confession],
        ["Культурная группа", group.culture],
      ]),
      settlementLabeledText("Спрос — требования группы", group.demand || "Требования пока не записаны."),
      settlementLabeledText("Заслуги и приобретённые бонусы", group.merits || "Заслуги и бонусы пока не записаны.")
    );
    const head = card.querySelector(".settlement-population-head");
    const title = el("div", "");
    title.append(el("h4", "", group.name), compactBadges([
      `${group.count} чел.`,
      group.public ? "игрокам" : "скрыто",
    ]));
    head.append(title);
    const links = directoryLinks([
      ...(faction ? [[`Поддерживает: ${faction.name}`, () => openFaction(faction.id)]] : []),
      ...(representative ? [[`Представитель: ${representative.name}`, () => representative.type === "npc" ? openNpc(representative.id) : openCharacter(representative.id)]] : []),
    ]);
    if (links.childElementCount) head.append(links);
    if (isAdmin) card.append(inlineEditor("Редактировать группу", settlementPopulationGroupForm(settlement, group)));
    grid.append(card);
  });
  return grid;
}

function settlementResidentsView(settlement) {
  const residents = settlement.residents
    .filter((resident) => resident.public || isAdmin)
    .map((resident) => ({ resident, entity: relationshipEntity(resident.entityKey) }))
    .filter(({ entity }) => entity || isAdmin);
  if (!residents.length) return el("div", "empty-state", "Жители и связанные персонажи пока не добавлены.");
  const list = el("div", "settlement-resident-list");
  residents.forEach(({ resident, entity }) => {
    const card = el("article", "settlement-resident-card");
    const displayEntity = entity || {
      name: "Персонаж не найден",
      portrait: "",
      portraitStyle: defaultImageStyle(),
      type: "npc",
    };
    const district = settlement.districts.find((item) => item.id === resident.districtId);
    card.append(directoryPortrait(displayEntity.portrait, displayEntity.name, displayEntity.portraitStyle));
    const copy = el("div", "settlement-resident-copy");
    copy.append(
      entity
        ? button(entity.name, "settlement-resident-link", () => entity.type === "npc" ? openNpc(entity.id) : openCharacter(entity.id))
        : el("strong", "", displayEntity.name),
      compactBadges([
        entity?.type === "character" ? "Герой" : "NPC",
        resident.localRole,
        district?.name,
        resident.affectsSettlement ? "влияет на поселение" : "",
        resident.public ? "игрокам" : "скрыто",
      ]),
      settlementLabeledText("Место проживания", resident.residence || "не указано"),
      resident.notes ? el("p", "muted", resident.notes) : ""
    );
    if (resident.affectsSettlement) {
      const details = el("details", "settlement-resident-impact");
      const body = el("div", "settlement-building-details-body");
      details.append(el("summary", "", "Влияние на поселение"), body);
      body.append(
        resident.effect ? settlementLabeledText("Эффекты", resident.effect) : "",
        compactBadges(effectBadges(resident))
      );
      if (resident.magicItemCount || resident.magicItems.length) body.append(settlementMagicMarket(resident));
      copy.append(details);
    }
    if (isAdmin) copy.append(inlineEditor("Редактировать жителя", settlementResidentForm(settlement, resident)));
    card.append(copy);
    list.append(card);
  });
  return list;
}

function settlementArmiesView(settlement) {
  const armies = settlement.armies.filter((army) => army.public || isAdmin);
  if (!armies.length) return el("div", "empty-state", "Войска поселения пока не добавлены.");
  const grid = el("div", "settlement-army-grid");
  armies.forEach((army) => {
    const commander = relationshipEntity(army.commanderKey);
    const soldier = relationshipEntity(relationshipEntityKey("npc", army.soldierNpcId));
    const card = el("article", "settlement-army-card");
    card.append(
      settlementArmyImage(army),
      el("h4", "", army.name),
      compactBadges([
        army.challengeClass ? `КОВ ${army.challengeClass}` : "",
        army.attack ? `атака ${army.attack}` : "",
        army.defense ? `защита ${army.defense}` : "",
        army.morale ? `мораль ${army.morale}` : "",
        army.upkeep ? `содержание ${army.upkeep}` : "",
        army.public ? "игрокам" : "скрыто",
      ]),
      el("p", "settlement-army-description", army.description || "Описание войска пока не заполнено.")
    );
    const details = el("details", "settlement-army-details");
    const body = el("div", "settlement-building-details-body");
    details.append(el("summary", "", "Состав, тактики и способности"), body);
    body.append(
      army.equipment ? settlementLabeledText("Особое оснащение", army.equipment) : "",
      army.tactics ? settlementLabeledText("Известные тактики", army.tactics) : ""
    );
    if (army.traits.length) {
      const traits = el("div", "settlement-army-traits");
      army.traits.forEach((trait) => {
        const traitCard = el("article", "settlement-army-trait");
        traitCard.append(
          el("strong", "", trait.name),
          trait.description ? el("p", "", trait.description) : "",
          trait.effect ? settlementLabeledText("Эффект", trait.effect) : ""
        );
        traits.append(traitCard);
      });
      body.append(traits);
    }
    const links = [];
    if (commander) links.push([`Командир: ${commander.name}`, () => commander.type === "npc" ? openNpc(commander.id) : openCharacter(commander.id)]);
    if (soldier) links.push([`Типовой солдат: ${soldier.name}`, () => openNpc(soldier.id)]);
    if (links.length) body.append(directoryLinks(links));
    card.append(details);
    if (isAdmin) card.append(inlineEditor("Редактировать войско", settlementArmyForm(settlement, army)));
    grid.append(card);
  });
  return grid;
}

function settlementArmyImage(army) {
  const frame = el("div", "settlement-army-art");
  const style = { ...defaultImageStyle(), ...(army.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  if (!army.image) {
    frame.append(el("span", "settlement-building-placeholder", initials(army.name)));
    return frame;
  }
  const image = document.createElement("img");
  image.src = army.image;
  image.alt = army.name;
  image.style.objectFit = style.fit;
  image.style.objectPosition = `${style.x}% ${style.y}%`;
  image.style.transform = `scale(${style.zoom}) rotate(${style.rotation || 0}deg)`;
  frame.append(image);
  return frame;
}

function settlementLogView(settlement) {
  const entries = settlement.log.filter((entry) => entry.public || isAdmin);
  if (!entries.length) return el("div", "empty-state", "Хроника поселения пока пуста.");
  const list = el("div", "settlement-log");
  entries.forEach((entry) => {
    const item = el("div", "settlement-log-item");
    item.append(
      el("span", "", entry.date || "без даты"),
      entry.title ? el("strong", "", entry.title) : "",
      el("p", "", entry.text)
    );
    if (isAdmin) item.append(inlineEditor("Редактировать запись", settlementChronicleForm(settlement, entry)));
    list.append(item);
  });
  return list;
}

function settlementLabeledText(label, text) {
  const block = el("div", "settlement-labeled-text");
  block.append(el("span", "eyebrow", label), el("p", "", text));
  return block;
}

const settlementMetricKeys = [
  "law",
  "crime",
  "corruption",
  "knowledge",
  "society",
  "production",
  "dangerRating",
  "capitalTurnoverLimit",
  "cashTurnoverLimit",
  "priceCeiling",
];

const settlementMetricLabels = {
  law: "Закон",
  crime: "Преступность",
  corruption: "Коррупция",
  knowledge: "Знания",
  society: "Общество",
  production: "Производство",
  dangerRating: "Рейтинг опасности",
  capitalTurnoverLimit: "Лимит оборота капитала",
  cashTurnoverLimit: "Лимит оборота средств",
  priceCeiling: "Верхний предел цен",
};

function settlementMetricLabel(key) {
  return settlementMetricLabels[key] || key;
}

function settlementDistrictEconomy(settlement, district) {
  const activeBusinesses = settlement.businesses.filter((item) => item.status === "active");
  const activeBuildings = buildingEffectInstances(
    settlement.buildings.filter((item) => item.status === "active"),
    district.id
  );
  const influentialResidents = settlement.residents.filter((resident) =>
    resident.affectsSettlement && (!resident.districtId || resident.districtId === district.id)
  );
  const globalEffects = [...settlement.traits, ...settlement.laws, ...activeBusinesses];
  const districtEffects = [district, ...activeBuildings, ...influentialResidents];
  const totals = {};
  settlementMetricKeys.forEach((key) => {
    const value = normalizeEffectNumber(settlement[key]) + sumBy(globalEffects, key) + sumBy(districtEffects, key);
    totals[key] = ["capitalTurnoverLimit", "cashTurnoverLimit", "priceCeiling"].includes(key)
      ? Math.max(0, value)
      : value;
  });
  totals.income = sumBy([...activeBuildings, ...influentialResidents], "income");
  totals.upkeep = sumBy([...activeBuildings, ...influentialResidents], "upkeep");
  totals.net = totals.income - totals.upkeep;
  return totals;
}

function settlementEconomy(settlement) {
  const districts = settlement.districts.length
    ? settlement.districts
    : [normalizeSettlementDistrict({ id: "district-main", name: "Основной квартал" })];
  const districtTotals = districts.map((district) => settlementDistrictEconomy(settlement, district));
  const totals = {};
  settlementMetricKeys.forEach((key) => {
    const average = districtTotals.reduce((sum, item) => sum + normalizeEffectNumber(item[key]), 0) / districtTotals.length;
    totals[key] = Math.round(average * 100) / 100;
  });
  const activeBuildings = settlement.buildings
    .filter((item) => item.status === "active")
    .flatMap((building) => Array.from({ length: buildingPlacementTotal(building) }, () => building));
  const activeBusinesses = settlement.businesses.filter((item) => item.status === "active");
  const influentialResidents = settlement.residents.filter((resident) => resident.affectsSettlement);
  totals.income = sumBy([...activeBuildings, ...activeBusinesses, ...influentialResidents], "income");
  totals.upkeep = sumBy([...activeBuildings, ...activeBusinesses, ...influentialResidents], "upkeep");
  totals.net = totals.income - totals.upkeep;
  return totals;
}

function sumBy(items, key) {
  return items.reduce((sum, item) => sum + normalizeEffectNumber(item[key]), 0);
}

function effectBadges(item) {
  return [
    item.income ? `доход ${formatGold(item.income)}` : "",
    item.upkeep ? `содержание ${formatGold(-item.upkeep)}` : "",
    item.law ? `закон ${signed(item.law)}` : "",
    item.crime ? `преступность ${signed(item.crime)}` : "",
    item.corruption ? `коррупция ${signed(item.corruption)}` : "",
    item.knowledge ? `знания ${signed(item.knowledge)}` : "",
    item.society ? `общество ${signed(item.society)}` : "",
    item.production ? `производство ${signed(item.production)}` : "",
    item.dangerRating ? `опасность ${signed(item.dangerRating)}` : "",
    item.capitalTurnoverLimit ? `оборот капитала ${formatPlainAmount(item.capitalTurnoverLimit)}` : "",
    item.cashTurnoverLimit ? `оборот средств ${formatGoldAmount(item.cashTurnoverLimit)}` : "",
    item.priceCeiling ? `предел цен ${formatGoldAmount(item.priceCeiling)}` : "",
    ...countryEffectBadges(item),
  ].filter(Boolean);
}

function formatGold(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${number} зм`;
}

function formatGoldAmount(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} зм`;
}

function formatPlainAmount(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function formatRussianCount(value, one, few, many) {
  const count = Math.abs(Number(value || 0));
  const mod100 = count % 100;
  const mod10 = count % 10;
  const word = mod100 >= 11 && mod100 <= 14 ? many : mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many;
  return `${value} ${word}`;
}

function selectSettlementMap(regionId) {
  if (!setView("map")) return;
  selectMapRegion(regionId);
}

function settlementTabEditor(settlement) {
  const editors = {
    overview: settlementOverviewEditor,
    traits: settlementTraitsEditor,
    laws: settlementLawsEditor,
    districts: settlementDistrictsEditor,
    buildings: settlementBuildingsEditor,
    commerce: settlementCommerceEditor,
    "population-groups": settlementPopulationGroupsEditor,
    residents: settlementResidentsEditor,
    armies: settlementArmiesEditor,
    chronicle: settlementChronicleEditor,
  };
  return (editors[activeSettlementTab] || settlementOverviewEditor)(settlement);
}

function saveSettlement(settlement) {
  Object.assign(settlement, normalizeSettlement(settlement));
  saveState();
  render();
}

function duplicateNpc(npc) {
  if (!isAdmin || !npc) return;
  const copy = normalizeNpc({
    ...structuredClone(npc),
    id: crypto.randomUUID(),
    name: `${npc.name} (копия)`,
  });
  state.npcs.unshift(copy);
  activeDirectoryTab = "npcs";
  activeNpcId = copy.id;
  activeNpcTab = "overview";
  saveState();
  render();
}

function settlementOverviewEditor(settlement) {
  const form = el("form", "form-grid");
  const fields = {
    name: input(settlement.name),
    type: selectInput(settlementTypes, settlement.type),
    ruler: input(settlement.ruler),
    factionId: selectInput([["", "Без фракции"], ...state.factions.map((faction) => [faction.id, faction.name])], settlement.factionId),
    mapRegionId: selectInput([["", "Без карты"], ...state.map.regions.map((region) => [region.id, region.title])], settlement.mapRegionId),
    population: input(settlement.population),
    size: input(settlement.size),
    law: input(settlement.law),
    crime: input(settlement.crime),
    corruption: input(settlement.corruption),
    knowledge: input(settlement.knowledge),
    society: input(settlement.society),
    production: input(settlement.production),
    dangerRating: input(settlement.dangerRating),
    capitalTurnoverLimit: input(settlement.capitalTurnoverLimit),
    cashTurnoverLimit: input(settlement.cashTurnoverLimit),
    priceCeiling: input(settlement.priceCeiling),
    ...Object.fromEntries(countryMetricKeys.map((key) => [key, input(settlement[key])])),
    tags: input(settlement.tags.join(", ")),
    description: textarea(settlement.description),
    gmNotes: textarea(settlement.gmNotes),
    public: document.createElement("input"),
    wikiLinks: checkboxList(visibleWiki().map((article) => [article.id, article.title]), settlement.wikiLinks),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), settlement.questLinks),
  };
  const imageStyle = { ...defaultImageStyle(), ...(settlement.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = settlement.image || "";
  const imagePreview = el("div", "upload-preview settlement-overview-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Арт поселения не загружен");
  imagePreview.append(previewImage, previewText);
  const imageAspect = selectInput([
    ["wide", "Широкий 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const imageFit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], imageStyle.fit);
  const imageX = rangeInput(imageStyle.x, 0, 100, 1);
  const imageY = rangeInput(imageStyle.y, 0, 100, 1);
  const imageZoom = rangeInput(imageStyle.zoom, 1, 3, 0.05);
  const imageRotation = rangeInput(imageStyle.rotation || 0, -180, 180, 1);
  const refreshSettlementImage = () => {
    imagePreview.className = `upload-preview settlement-overview-preview image-aspect-${imageAspect.value}`;
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    previewImage.style.objectFit = imageFit.value;
    previewImage.style.objectPosition = `${imageX.value}% ${imageY.value}%`;
    previewImage.style.transform = `scale(${imageZoom.value}) rotate(${imageRotation.value}deg)`;
  };
  [imageAspect, imageFit, imageX, imageY, imageZoom, imageRotation].forEach((control) => control.addEventListener("input", refreshSettlementImage));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "settlements");
    refreshSettlementImage();
  });
  refreshSettlementImage();
  fields.public.type = "checkbox";
  fields.public.checked = settlement.public;
  [
    fields.population,
    fields.law,
    fields.crime,
    fields.corruption,
    fields.knowledge,
    fields.society,
    fields.production,
    fields.dangerRating,
    fields.capitalTurnoverLimit,
    fields.cashTurnoverLimit,
    fields.priceCeiling,
    ...countryMetricKeys.map((key) => fields[key]),
  ].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  form.append(
    labelWrap("Название", fields.name),
    labelWrap("Тип", fields.type),
    labelWrap("Управляющий", fields.ruler),
    labelWrap("Фракция", fields.factionId),
    labelWrap("Карта", fields.mapRegionId),
    labelWrap("Население", fields.population),
    labelWrap("Размер", fields.size),
    checkboxWrap("Видно игрокам", fields.public),
    el("h3", "span-2", "Арт поселения"),
    labelWrap("Изображение", fragment([imageInput, imagePreview]), "span-2"),
    labelWrap("Формат", imageAspect),
    labelWrap("Отображение", imageFit),
    labelWrap("Позиция X", imageX),
    labelWrap("Позиция Y", imageY),
    labelWrap("Масштаб", imageZoom),
    labelWrap("Поворот", imageRotation),
    actionRow([button("Убрать изображение", "ghost-button", () => {
      imageValue = "";
      imageInput.value = "";
      refreshSettlementImage();
    })], "span-2"),
    el("h3", "span-2", "Базовые показатели"),
    labelWrap("Закон", fields.law),
    labelWrap("Преступность", fields.crime),
    labelWrap("Коррупция", fields.corruption),
    labelWrap("Знания", fields.knowledge),
    labelWrap("Общество", fields.society),
    labelWrap("Производство", fields.production),
    labelWrap("Рейтинг опасности", fields.dangerRating),
    labelWrap("Лимит оборота капитала", fields.capitalTurnoverLimit),
    labelWrap("Лимит оборота денежных средств", fields.cashTurnoverLimit),
    labelWrap("Верхний предел цен", fields.priceCeiling),
    el("h3", "span-2", "Вклад поселения в показатели государства"),
    ...countryMetricDefinitions.map(([key, label]) => labelWrap(label, fields[key])),
    labelWrap("Теги", fields.tags, "span-2"),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("GM-заметки", fields.gmNotes, "span-2"),
    labelWrap("Связанные Wiki", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    actionRow([
      button("Сохранить основные данные", "primary-button", null, "submit"),
      button("Удалить поселение", "ghost-button", () => deleteSettlement(settlement)),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextTags = csv(fields.tags.value);
    registerTags(nextTags, true);
    Object.assign(settlement, {
      name: fields.name.value,
      type: fields.type.value,
      ruler: fields.ruler.value,
      factionId: fields.factionId.value,
      mapRegionId: fields.mapRegionId.value,
      population: Number(fields.population.value || 0),
      size: fields.size.value,
      image: imageValue,
      imageStyle: {
        aspect: imageAspect.value,
        fit: imageFit.value,
        x: Number(imageX.value),
        y: Number(imageY.value),
        zoom: Number(imageZoom.value),
        rotation: Number(imageRotation.value),
      },
      law: Number(fields.law.value || 0),
      crime: Number(fields.crime.value || 0),
      corruption: Number(fields.corruption.value || 0),
      knowledge: Number(fields.knowledge.value || 0),
      society: Number(fields.society.value || 0),
      production: Number(fields.production.value || 0),
      dangerRating: Number(fields.dangerRating.value || 0),
      capitalTurnoverLimit: Number(fields.capitalTurnoverLimit.value || 0),
      cashTurnoverLimit: Number(fields.cashTurnoverLimit.value || 0),
      priceCeiling: Number(fields.priceCeiling.value || 0),
      ...Object.fromEntries(countryMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
      public: fields.public.checked,
      tags: nextTags,
      description: fields.description.value,
      gmNotes: fields.gmNotes.value,
      wikiLinks: checkedValues(fields.wikiLinks),
      questLinks: checkedValues(fields.questLinks),
    });
    saveSettlement(settlement);
  });
  return editorPanel("Редактор вкладки: основные данные", form);
}

function settlementTraitsEditor(settlement) {
  const trait = normalizeSettlementTrait({
    id: crypto.randomUUID(),
    name: "Новая черта поселения",
    public: false,
  });
  return inlineEditor("Добавить черту поселения", settlementTraitForm(settlement, trait, true));
}

function settlementLawsEditor(settlement) {
  return settlementFeatureEditor(settlement, "laws", "Законы поселения", "Добавить закон", "Сохранить законы", "Редактор вкладки: законы");
}

function settlementFeatureEditor(settlement, key, fieldLabel, addLabel, saveLabel, panelLabel) {
  const form = el("form", "form-grid");
  const editor = structuredRowsEditor(settlement[key], [
    { key: "name", label: "Название" },
    { key: "description", label: "Художественное описание", type: "textarea" },
    { key: "effect", label: "Описание эффекта", type: "textarea" },
    { key: "law", label: "Закон", type: "number" },
    { key: "crime", label: "Преступность", type: "number" },
    { key: "corruption", label: "Коррупция", type: "number" },
    { key: "knowledge", label: "Знания", type: "number" },
    { key: "society", label: "Общество", type: "number" },
    { key: "production", label: "Производство", type: "number" },
    { key: "dangerRating", label: "Рейтинг опасности", type: "number" },
    { key: "capitalTurnoverLimit", label: "Лимит оборота капитала", type: "number" },
    { key: "cashTurnoverLimit", label: "Лимит оборота средств", type: "number" },
    { key: "priceCeiling", label: "Верхний предел цен", type: "number" },
    ...countryMetricDefinitions.map(([key, label]) => ({ key, label: `${label} государства`, type: "number" })),
    { key: "public", label: "Видно игрокам", type: "checkbox", defaultValue: true },
  ], addLabel);
  form.append(
    labelWrap(fieldLabel, editor.element, "span-2"),
    actionRow([button(saveLabel, "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    settlement[key] = editor.read();
    saveSettlement(settlement);
  });
  return editorPanel(panelLabel, form);
}

function settlementTraitForm(settlement, trait, isNew = false) {
  const form = el("form", "form-grid settlement-trait-editor-form");
  const fields = {
    name: input(trait.name),
    description: textarea(trait.description),
    effect: textarea(trait.effect),
    public: document.createElement("input"),
    showDescription: document.createElement("input"),
    showEffect: document.createElement("input"),
    ...Object.fromEntries(settlementMetricKeys.map((key) => [key, input(trait[key])])),
    ...Object.fromEntries(countryMetricKeys.map((key) => [key, input(trait[key])])),
  };
  fields.name.required = true;
  fields.public.type = "checkbox";
  fields.public.checked = trait.public;
  fields.showDescription.type = "checkbox";
  fields.showDescription.checked = trait.showDescription;
  fields.showEffect.type = "checkbox";
  fields.showEffect.checked = trait.showEffect;
  [...settlementMetricKeys, ...countryMetricKeys].forEach((key) => {
    fields[key].type = "number";
    fields[key].step = "1";
  });

  const imageStyle = { ...defaultImageStyle(), ...(trait.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = trait.image || "";
  const preview = el("div", "upload-preview settlement-trait-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Изображение черты не загружено");
  preview.append(previewImage, previewText);
  const aspect = selectInput([
    ["wide", "Широкое 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 3, 0.05);
  const rotation = rangeInput(imageStyle.rotation || 0, -180, 180, 1);
  const refreshPreview = () => {
    preview.className = `upload-preview settlement-trait-preview image-aspect-${aspect.value}`;
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value}) rotate(${rotation.value}deg)`;
  };
  [aspect, fit, posX, posY, zoom, rotation].forEach((control) => control.addEventListener("input", refreshPreview));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "settlement-traits");
    refreshPreview();
  });
  refreshPreview();
  const visibilityControls = el("div", "span-2 settlement-trait-visibility");
  visibilityControls.append(
    el("span", "settlement-trait-visibility-label", "Отображение текста"),
    checkboxWrap("Показывать описание игрокам", fields.showDescription),
    checkboxWrap("Показывать эффект игрокам", fields.showEffect)
  );

  form.append(
    labelWrap("Название", fields.name),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Художественное описание", fields.description, "span-2"),
    labelWrap("Описание эффекта", fields.effect, "span-2"),
    visibilityControls,
    labelWrap("Изображение", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб", zoom),
    labelWrap("Поворот", rotation),
    actionRow([button("Убрать изображение", "ghost-button", () => {
      imageValue = "";
      imageInput.value = "";
      refreshPreview();
    })], "span-2"),
    el("h4", "span-2 settlement-editor-heading", "Изменения показателей кварталов"),
    ...settlementMetricKeys.map((key) => labelWrap(settlementMetricLabel(key), fields[key])),
    el("h4", "span-2 settlement-editor-heading", "Вклад в показатели государства"),
    ...countryMetricDefinitions.map(([key, label]) => labelWrap(label, fields[key])),
    actionRow([
      button(isNew ? "Добавить черту" : "Сохранить черту", "primary-button", null, "submit"),
      ...(!isNew ? [button("Удалить черту", "ghost-button", () => removeSettlementEntry(settlement, "traits", trait, "черту"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementTrait({
      ...trait,
      name: fields.name.value,
      description: fields.description.value,
      effect: fields.effect.value,
      public: fields.public.checked,
      showDescription: fields.showDescription.checked,
      showEffect: fields.showEffect.checked,
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
        rotation: Number(rotation.value),
      },
      ...Object.fromEntries(settlementMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
      ...Object.fromEntries(countryMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
    });
    upsertSettlementEntry(settlement, "traits", next, isNew);
  });
  return form;
}

function settlementDistrictsEditor(settlement) {
  const district = normalizeSettlementDistrict({
    id: crypto.randomUUID(),
    name: "Новый квартал",
    public: false,
  });
  return inlineEditor("Добавить квартал", settlementDistrictForm(settlement, district, true));
}

function settlementDistrictForm(settlement, district, isNew = false) {
  const form = el("form", "form-grid settlement-district-form");
  const fields = {
    name: input(district.name),
    description: textarea(district.description),
    entityLinks: checkboxList(relationshipEntities().map((entity) => [entity.key, `${entity.type === "npc" ? "NPC" : "Герой"}: ${entity.name}`]), district.entityLinks),
    law: input(district.law),
    crime: input(district.crime),
    corruption: input(district.corruption),
    knowledge: input(district.knowledge),
    society: input(district.society),
    production: input(district.production),
    dangerRating: input(district.dangerRating),
    capitalTurnoverLimit: input(district.capitalTurnoverLimit),
    cashTurnoverLimit: input(district.cashTurnoverLimit),
    priceCeiling: input(district.priceCeiling),
    public: document.createElement("input"),
  };
  fields.name.required = true;
  fields.public.type = "checkbox";
  fields.public.checked = district.public;
  settlementMetricKeys.forEach((key) => {
    fields[key].type = "number";
    fields[key].step = "1";
  });

  const imageStyle = { ...defaultImageStyle(), ...(district.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = district.image || "";
  const preview = el("div", "upload-preview settlement-district-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Изображение не загружено");
  preview.append(previewImage, previewText);
  const aspect = selectInput([
    ["wide", "Широкая 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 3, 0.05);
  const rotation = rangeInput(imageStyle.rotation || 0, -180, 180, 1);
  const refreshPreview = () => {
    preview.className = `upload-preview settlement-district-preview image-aspect-${aspect.value}`;
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value}) rotate(${rotation.value}deg)`;
  };
  [aspect, fit, posX, posY, zoom, rotation].forEach((control) => control.addEventListener("input", refreshPreview));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "settlement-districts");
    refreshPreview();
  });
  refreshPreview();

  form.append(
    labelWrap("Название квартала", fields.name),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("Существа и персонажи квартала", fields.entityLinks, "span-2"),
    labelWrap("Изображение", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб", zoom),
    labelWrap("Поворот", rotation),
    actionRow([button("Убрать изображение", "ghost-button", () => {
      imageValue = "";
      imageInput.value = "";
      refreshPreview();
    })], "span-2"),
    el("h4", "span-2 settlement-editor-heading", "Изменения показателей квартала"),
    labelWrap("Закон", fields.law),
    labelWrap("Преступность", fields.crime),
    labelWrap("Коррупция", fields.corruption),
    labelWrap("Знания", fields.knowledge),
    labelWrap("Общество", fields.society),
    labelWrap("Производство", fields.production),
    labelWrap("Рейтинг опасности", fields.dangerRating),
    labelWrap("Лимит оборота капитала", fields.capitalTurnoverLimit),
    labelWrap("Лимит оборота средств", fields.cashTurnoverLimit),
    labelWrap("Верхний предел цен", fields.priceCeiling),
    actionRow([
      button(isNew ? "Добавить квартал" : "Сохранить квартал", "primary-button", null, "submit"),
      ...(!isNew ? [button("Дублировать квартал", "ghost-button", () => duplicateSettlementDistrict(settlement, district))] : []),
      ...(!isNew ? [button("Удалить квартал", "ghost-button", () => deleteSettlementDistrict(settlement, district))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementDistrict({
      ...district,
      name: fields.name.value,
      description: fields.description.value,
      entityLinks: checkedValues(fields.entityLinks),
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
        rotation: Number(rotation.value),
      },
      public: fields.public.checked,
      ...Object.fromEntries(settlementMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
    });
    upsertSettlementEntry(settlement, "districts", next, isNew);
  });
  return form;
}

function deleteSettlementDistrict(settlement, district) {
  if (settlement.districts.length <= 1) {
    alert("В поселении должен остаться хотя бы один квартал.");
    return;
  }
  if (!confirm(`Удалить квартал «${district.name}»? Здания будут перенесены в другой квартал.`)) return;
  const fallback = settlement.districts.find((item) => item.id !== district.id);
  settlement.districts = settlement.districts.filter((item) => item.id !== district.id);
  settlement.buildings.forEach((building) => {
    building.placements = building.placements.map((placement) => placement.districtId === district.id
      ? { ...placement, districtId: fallback.id }
      : placement);
  });
  saveSettlement(settlement);
}

function duplicateSettlementDistrict(settlement, district) {
  if (!isAdmin || !settlement || !district) return;
  const copy = normalizeSettlementDistrict({
    ...structuredClone(district),
    id: crypto.randomUUID(),
    name: `${district.name} (копия)`,
  });
  const index = settlement.districts.findIndex((item) => item.id === district.id);
  settlement.districts.splice(index + 1, 0, copy);
  settlement.buildings.forEach((building) => {
    const copiedPlacements = building.placements
      .filter((placement) => placement.districtId === district.id)
      .map((placement) => ({ ...structuredClone(placement), id: crypto.randomUUID(), districtId: copy.id }));
    building.placements.push(...copiedPlacements);
  });
  saveSettlement(settlement);
}

function settlementBuildingsEditor(settlement) {
  const building = normalizeBuilding({
    id: crypto.randomUUID(),
    name: "Новая постройка",
    public: false,
  });
  const root = el("div", "admin-stack settlement-building-editor-tools");
  const templates = state.settlements.flatMap((sourceSettlement) =>
    sourceSettlement.buildings.map((sourceBuilding) => ({ sourceSettlement, sourceBuilding }))
  );
  if (templates.length) {
    const templateSelect = selectInput(templates.map(({ sourceSettlement, sourceBuilding }) => [
      `${sourceSettlement.id}:${sourceBuilding.id}`,
      `${sourceBuilding.name} · ${sourceSettlement.name}`,
    ]), `${templates[0].sourceSettlement.id}:${templates[0].sourceBuilding.id}`);
    const targetDistrict = selectInput(
      settlement.districts.map((district) => [district.id, district.name]),
      settlement.districts[0]?.id || ""
    );
    const copyPanel = el("div", "settlement-building-copy-panel");
    copyPanel.append(
      labelWrap("Скопировать существующую постройку", templateSelect),
      labelWrap("Квартал назначения", targetDistrict),
      button("Добавить копию", "ghost-button", () => {
        const [settlementId, buildingId] = templateSelect.value.split(":");
        const sourceSettlement = state.settlements.find((item) => item.id === settlementId);
        const sourceBuilding = sourceSettlement?.buildings.find((item) => item.id === buildingId);
        if (sourceBuilding) copyBuildingToSettlement(sourceBuilding, settlement, targetDistrict.value);
      })
    );
    root.append(copyPanel);
  }
  root.append(inlineEditor("Добавить новую постройку", settlementBuildingForm(settlement, building, true)));
  return root;
}

function settlementBuildingForm(settlement, building, isNew = false) {
  const form = el("form", "form-grid");
  const placementsEditor = buildingPlacementsEditor(settlement, building.placements || []);
  const hierarchyEditor = buildingHierarchyEditor(building.hierarchyLevels || []);
  const fields = {
    name: input(building.name),
    type: input(building.type),
    status: selectInput(buildingStatuses, building.status),
    level: input(building.level),
    buildingCost: input(building.buildingCost),
    upgradeCost: input(building.upgradeCost),
    factionId: selectInput([["", "Без фракции"], ...state.factions.map((faction) => [faction.id, faction.name])], building.factionId),
    description: textarea(building.description),
    upgrades: textarea(building.upgrades),
    effect: textarea(building.effect),
    responsibleNpc: selectInput([["", "Не назначен"], ...state.npcs.map((npc) => [npc.id, npc.name])], building.responsibleNpc),
    linkedQuest: selectInput([["", "Без задания"], ...state.quests.map((quest) => [quest.id, quest.title])], building.linkedQuest),
    income: input(building.income),
    upkeep: input(building.upkeep),
    law: input(building.law),
    crime: input(building.crime),
    corruption: input(building.corruption),
    knowledge: input(building.knowledge),
    society: input(building.society),
    production: input(building.production),
    dangerRating: input(building.dangerRating),
    capitalTurnoverLimit: input(building.capitalTurnoverLimit),
    cashTurnoverLimit: input(building.cashTurnoverLimit),
    priceCeiling: input(building.priceCeiling),
    ...Object.fromEntries(countryMetricKeys.map((key) => [key, input(building[key])])),
    public: document.createElement("input"),
    hierarchyEnabled: document.createElement("input"),
  };
  fields.public.type = "checkbox";
  fields.public.checked = building.public;
  fields.hierarchyEnabled.type = "checkbox";
  fields.hierarchyEnabled.checked = building.hierarchyEnabled;
  const magicItemsEditor = structuredRowsEditor(building.magicItems, [
    { key: "name", label: "Название" },
    { key: "type", label: "Тип предмета" },
    { key: "cost", label: "Стоимость" },
    { key: "description", label: "Описание", type: "textarea" },
    { key: "effect", label: "Эффект", type: "textarea" },
    { key: "quantity", label: "Количество", type: "number", min: 1, defaultValue: 1 },
  ], "Добавить магический предмет");
  [
    fields.level,
    fields.buildingCost,
    fields.upgradeCost,
    fields.income,
    fields.upkeep,
    fields.law,
    fields.crime,
    fields.corruption,
    fields.knowledge,
    fields.society,
    fields.production,
    fields.dangerRating,
    fields.capitalTurnoverLimit,
    fields.cashTurnoverLimit,
    fields.priceCeiling,
    ...countryMetricKeys.map((key) => fields[key]),
  ].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  fields.level.min = "1";
  fields.buildingCost.min = "0";
  fields.upgradeCost.min = "0";
  fields.upkeep.min = "0";

  const imageStyle = { ...defaultImageStyle(), ...(building.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = building.image || "";
  const preview = el("div", "upload-preview settlement-building-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Изображение не загружено");
  preview.append(previewImage, previewText);
  const aspect = selectInput([
    ["wide", "Широкая 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 3, 0.05);
  const rotation = rangeInput(imageStyle.rotation || 0, -180, 180, 1);
  const refreshPreview = () => {
    preview.className = `upload-preview settlement-building-preview image-aspect-${aspect.value}`;
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value}) rotate(${rotation.value}deg)`;
  };
  [aspect, fit, posX, posY, zoom, rotation].forEach((control) => control.addEventListener("input", refreshPreview));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "settlement-buildings");
    refreshPreview();
  });
  refreshPreview();

  const hierarchyWrap = labelWrap("Редактор слот-иерархии", hierarchyEditor.element, "span-2 building-hierarchy-editor-wrap");
  hierarchyWrap.hidden = !fields.hierarchyEnabled.checked;
  fields.hierarchyEnabled.addEventListener("change", () => {
    hierarchyWrap.hidden = !fields.hierarchyEnabled.checked;
  });

  form.append(
    labelWrap("Название", fields.name),
    labelWrap("Тип постройки", fields.type),
    labelWrap("Состояние", fields.status),
    labelWrap("Уровень постройки", fields.level),
    labelWrap("Стоимость строения", fields.buildingCost),
    labelWrap("Стоимость улучшений строения", fields.upgradeCost),
    labelWrap("Фракция-владелец", fields.factionId),
    labelWrap("Размещения постройки", placementsEditor.element, "span-2"),
    checkboxWrap("Видно игрокам", fields.public),
    checkboxWrap("Добавить слот-иерархию", fields.hierarchyEnabled),
    hierarchyWrap,
    labelWrap("Ответственный NPC", fields.responsibleNpc),
    labelWrap("Связанное задание", fields.linkedQuest),
    labelWrap("Изображение", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб", zoom),
    labelWrap("Поворот", rotation),
    actionRow([button("Убрать изображение", "ghost-button", () => {
      imageValue = "";
      imageInput.value = "";
      refreshPreview();
    })], "span-2"),
    labelWrap("Подробное описание", fields.description, "span-2"),
    labelWrap("Улучшения постройки", fields.upgrades, "span-2"),
    labelWrap("Особенности и эффект", fields.effect, "span-2"),
    labelWrap("Магические предметы на рынке", magicItemsEditor.element, "span-2"),
    el("h4", "span-2 settlement-editor-heading", "Экономика и показатели"),
    labelWrap("Доход в месяц", fields.income),
    labelWrap("Содержание в месяц", fields.upkeep),
    labelWrap("Закон", fields.law),
    labelWrap("Преступность", fields.crime),
    labelWrap("Коррупция", fields.corruption),
    labelWrap("Знания", fields.knowledge),
    labelWrap("Общество", fields.society),
    labelWrap("Производство", fields.production),
    labelWrap("Опасность", fields.dangerRating),
    labelWrap("Лимит оборота капитала", fields.capitalTurnoverLimit),
    labelWrap("Лимит оборота средств", fields.cashTurnoverLimit),
    labelWrap("Верхний предел цен", fields.priceCeiling),
    el("h4", "span-2 settlement-editor-heading", "Вклад постройки в государство"),
    ...countryMetricDefinitions.map(([key, label]) => labelWrap(label, fields[key])),
    actionRow([
      button(isNew ? "Добавить постройку" : "Сохранить изменения", "primary-button", null, "submit"),
      ...(!isNew ? [button("Дублировать постройку", "ghost-button", () => copyBuildingToSettlement(building, settlement))] : []),
      ...(!isNew ? [button("Удалить постройку", "ghost-button", () => removeSettlementEntry(settlement, "buildings", building, "постройку"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeBuilding({
      ...building,
      name: fields.name.value,
      type: fields.type.value,
      status: fields.status.value,
      level: Number(fields.level.value || 1),
      buildingCost: Number(fields.buildingCost.value || 0),
      upgradeCost: Number(fields.upgradeCost.value || 0),
      placements: placementsEditor.read(),
      factionId: fields.factionId.value,
      public: fields.public.checked,
      responsibleNpc: fields.responsibleNpc.value,
      linkedQuest: fields.linkedQuest.value,
      hierarchyEnabled: fields.hierarchyEnabled.checked,
      hierarchyLevels: hierarchyEditor.read(),
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
        rotation: Number(rotation.value),
      },
      description: fields.description.value,
      upgrades: fields.upgrades.value,
      effect: fields.effect.value,
      magicItems: magicItemsEditor.read(),
      income: Number(fields.income.value || 0),
      upkeep: Number(fields.upkeep.value || 0),
      law: Number(fields.law.value || 0),
      crime: Number(fields.crime.value || 0),
      corruption: Number(fields.corruption.value || 0),
      knowledge: Number(fields.knowledge.value || 0),
      society: Number(fields.society.value || 0),
      production: Number(fields.production.value || 0),
      dangerRating: Number(fields.dangerRating.value || 0),
      capitalTurnoverLimit: Number(fields.capitalTurnoverLimit.value || 0),
      cashTurnoverLimit: Number(fields.cashTurnoverLimit.value || 0),
      priceCeiling: Number(fields.priceCeiling.value || 0),
      ...Object.fromEntries(countryMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
    });
    upsertSettlementEntry(settlement, "buildings", next, isNew);
  });
  return form;
}

function settlementCommerceEditor(settlement) {
  const business = normalizeSettlementBusiness({ id: crypto.randomUUID(), public: false });
  return inlineEditor("Добавить предприятие", settlementBusinessForm(settlement, business, true));
}

function settlementBusinessForm(settlement, business, isNew = false) {
  const form = el("form", "form-grid");
  const fields = {
    name: input(business.name),
    type: input(business.type),
    owner: input(business.owner),
    location: input(business.location),
    status: selectInput([["active", "Работает"], ["paused", "Приостановлено"], ["closed", "Закрыто"]], business.status),
    employees: input(business.employees),
    income: input(business.income),
    upkeep: input(business.upkeep),
    description: textarea(business.description),
    effect: textarea(business.effect),
    public: document.createElement("input"),
  };
  fields.public.type = "checkbox";
  fields.public.checked = business.public;
  [fields.employees, fields.income, fields.upkeep].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  fields.employees.min = "0";
  fields.upkeep.min = "0";
  form.append(
    labelWrap("Название", fields.name),
    labelWrap("Вид деятельности", fields.type),
    labelWrap("Владелец", fields.owner),
    labelWrap("Адрес / район", fields.location),
    labelWrap("Статус", fields.status),
    labelWrap("Работников", fields.employees),
    labelWrap("Доход в месяц", fields.income),
    labelWrap("Расходы в месяц", fields.upkeep),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("Особенности и эффект", fields.effect, "span-2"),
    actionRow([
      button(isNew ? "Добавить предприятие" : "Сохранить изменения", "primary-button", null, "submit"),
      ...(!isNew ? [button("Удалить предприятие", "ghost-button", () => removeSettlementEntry(settlement, "businesses", business, "предприятие"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementBusiness({
      ...business,
      name: fields.name.value,
      type: fields.type.value,
      owner: fields.owner.value,
      location: fields.location.value,
      status: fields.status.value,
      employees: Number(fields.employees.value || 0),
      income: Number(fields.income.value || 0),
      upkeep: Number(fields.upkeep.value || 0),
      description: fields.description.value,
      effect: fields.effect.value,
      public: fields.public.checked,
    });
    upsertSettlementEntry(settlement, "businesses", next, isNew);
  });
  return form;
}

function settlementPopulationGroupsEditor(settlement) {
  const group = normalizeSettlementPopulationGroup({
    id: crypto.randomUUID(),
    public: false,
  });
  return inlineEditor("Добавить группу населения", settlementPopulationGroupForm(settlement, group, true));
}

function settlementPopulationGroupForm(settlement, group, isNew = false) {
  const form = el("form", "form-grid settlement-population-form");
  const representativeOptions = relationshipEntities().map((entity) => [
    entity.key,
    `${entity.type === "npc" ? "NPC" : "Герой"}: ${entity.name}`,
  ]);
  const fields = {
    name: input(group.name),
    count: input(group.count),
    location: input(group.location),
    factionId: selectInput([["", "Не поддерживает фракцию"], ...state.factions.map((faction) => [faction.id, faction.name])], group.factionId),
    representativeKey: selectInput([["", "Представитель не избран"], ...representativeOptions], group.representativeKey || relationshipEntityKey("npc", group.representativeNpcId)),
    race: input(group.race),
    confession: input(group.confession),
    culture: input(group.culture),
    demand: textarea(group.demand),
    merits: textarea(group.merits),
    public: document.createElement("input"),
  };
  fields.name.required = true;
  fields.count.type = "number";
  fields.count.min = "0";
  fields.count.step = "1";
  fields.public.type = "checkbox";
  fields.public.checked = group.public;
  form.append(
    labelWrap("Название группы", fields.name),
    labelWrap("Численность", fields.count),
    labelWrap("Где обитает", fields.location),
    labelWrap("Поддерживаемая фракция", fields.factionId),
    labelWrap("Избранный представитель", fields.representativeKey),
    labelWrap("Раса", fields.race),
    labelWrap("Конфессия", fields.confession),
    labelWrap("Культурная группа", fields.culture),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Спрос — требования группы", fields.demand, "span-2"),
    labelWrap("Заслуги и приобретённые бонусы", fields.merits, "span-2"),
    actionRow([
      button(isNew ? "Добавить группу" : "Сохранить группу", "primary-button", null, "submit"),
      ...(!isNew ? [button("Удалить группу", "ghost-button", () => removeSettlementEntry(settlement, "populationGroups", group, "группу населения"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementPopulationGroup({
      ...group,
      name: fields.name.value,
      count: fields.count.value,
      location: fields.location.value,
      factionId: fields.factionId.value,
      representativeKey: fields.representativeKey.value,
      representativeNpcId: fields.representativeKey.value.startsWith("npc:") ? fields.representativeKey.value.slice(4) : "",
      race: fields.race.value,
      confession: fields.confession.value,
      culture: fields.culture.value,
      demand: fields.demand.value,
      merits: fields.merits.value,
      public: fields.public.checked,
    });
    upsertSettlementEntry(settlement, "populationGroups", next, isNew);
  });
  return form;
}

function settlementResidentsEditor(settlement) {
  const resident = normalizeSettlementResident({ id: crypto.randomUUID(), entityKey: "", public: false });
  return inlineEditor("Добавить жителя", settlementResidentForm(settlement, resident, true));
}

function settlementResidentForm(settlement, resident, isNew = false) {
  const form = el("form", "form-grid");
  const entityOptions = [
    ...state.characters.map((character) => [relationshipEntityKey("character", character.id), `Герой: ${character.name}`]),
    ...state.npcs.map((npc) => [relationshipEntityKey("npc", npc.id), `NPC: ${npc.name}`]),
  ];
  const fields = {
    entityKey: selectInput([["", "Выберите персонажа"], ...entityOptions], resident.entityKey),
    districtId: selectInput(settlement.districts.map((district) => [district.id, district.name]), resident.districtId || settlement.districts[0]?.id),
    residence: input(resident.residence),
    localRole: input(resident.localRole),
    notes: textarea(resident.notes),
    effect: textarea(resident.effect),
    income: input(resident.income),
    upkeep: input(resident.upkeep),
    law: input(resident.law),
    crime: input(resident.crime),
    corruption: input(resident.corruption),
    knowledge: input(resident.knowledge),
    society: input(resident.society),
    production: input(resident.production),
    dangerRating: input(resident.dangerRating),
    capitalTurnoverLimit: input(resident.capitalTurnoverLimit),
    cashTurnoverLimit: input(resident.cashTurnoverLimit),
    priceCeiling: input(resident.priceCeiling),
    ...Object.fromEntries(countryMetricKeys.map((key) => [key, input(resident[key])])),
    affectsSettlement: document.createElement("input"),
    public: document.createElement("input"),
  };
  fields.entityKey.required = true;
  fields.affectsSettlement.type = "checkbox";
  fields.affectsSettlement.checked = resident.affectsSettlement;
  fields.public.type = "checkbox";
  fields.public.checked = resident.public;
  [
    fields.income,
    fields.upkeep,
    ...settlementMetricKeys.map((key) => fields[key]),
    ...countryMetricKeys.map((key) => fields[key]),
  ].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  const magicItemsEditor = structuredRowsEditor(resident.magicItems, [
    { key: "name", label: "Название" },
    { key: "type", label: "Тип предмета" },
    { key: "cost", label: "Стоимость" },
    { key: "description", label: "Описание", type: "textarea" },
    { key: "effect", label: "Эффект", type: "textarea" },
    { key: "quantity", label: "Количество", type: "number", min: 1, defaultValue: 1 },
  ], "Добавить магический предмет");
  const impactSection = el("section", "resident-impact-editor span-2");
  impactSection.append(
    el("h4", "settlement-editor-heading", "Влияние жителя на поселение"),
    labelWrap("Описание эффектов", fields.effect, "span-2"),
    labelWrap("Магические предметы на рынке", magicItemsEditor.element, "span-2"),
    el("h4", "settlement-editor-heading span-2", "Изменения показателей квартала"),
    labelWrap("Доход в месяц", fields.income),
    labelWrap("Содержание в месяц", fields.upkeep),
    labelWrap("Закон", fields.law),
    labelWrap("Преступность", fields.crime),
    labelWrap("Коррупция", fields.corruption),
    labelWrap("Знания", fields.knowledge),
    labelWrap("Общество", fields.society),
    labelWrap("Производство", fields.production),
    labelWrap("Рейтинг опасности", fields.dangerRating),
    labelWrap("Лимит оборота капитала", fields.capitalTurnoverLimit),
    labelWrap("Лимит оборота средств", fields.cashTurnoverLimit),
    labelWrap("Верхний предел цен", fields.priceCeiling),
    el("h4", "settlement-editor-heading span-2", "Вклад жителя в государство"),
    ...countryMetricDefinitions.map(([key, label]) => labelWrap(label, fields[key]))
  );
  const updateImpactVisibility = () => {
    impactSection.hidden = !fields.affectsSettlement.checked;
  };
  fields.affectsSettlement.addEventListener("change", updateImpactVisibility);
  updateImpactVisibility();
  form.append(
    labelWrap("Персонаж", fields.entityKey),
    labelWrap("Квартал", fields.districtId),
    labelWrap("Место проживания", fields.residence),
    labelWrap("Роль в поселении", fields.localRole),
    checkboxWrap("Видно игрокам", fields.public),
    checkboxWrap("Влияет на поселение", fields.affectsSettlement),
    labelWrap("Дополнительная информация", fields.notes, "span-2"),
    impactSection,
    actionRow([
      button(isNew ? "Добавить жителя" : "Сохранить изменения", "primary-button", null, "submit"),
      ...(!isNew ? [button("Удалить жителя", "ghost-button", () => removeSettlementEntry(settlement, "residents", resident, "жителя"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementResident({
      ...resident,
      entityKey: fields.entityKey.value,
      districtId: fields.districtId.value,
      residence: fields.residence.value,
      localRole: fields.localRole.value,
      notes: fields.notes.value,
      affectsSettlement: fields.affectsSettlement.checked,
      effect: fields.effect.value,
      income: Number(fields.income.value || 0),
      upkeep: Number(fields.upkeep.value || 0),
      magicItems: magicItemsEditor.read(),
      ...Object.fromEntries(settlementMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
      ...Object.fromEntries(countryMetricKeys.map((key) => [key, Number(fields[key].value || 0)])),
      public: fields.public.checked,
    });
    upsertSettlementEntry(settlement, "residents", next, isNew);
  });
  return form;
}

function settlementArmiesEditor(settlement) {
  const army = normalizeSettlementArmy({ id: crypto.randomUUID(), public: false });
  return inlineEditor("Добавить войско", settlementArmyForm(settlement, army, true));
}

function settlementArmyForm(settlement, army, isNew = false) {
  const form = el("form", "form-grid settlement-army-form");
  const commanderOptions = relationshipEntities().map((entity) => [
    entity.key,
    `${entity.type === "npc" ? "NPC" : "Герой"}: ${entity.name}`,
  ]);
  const fields = {
    name: input(army.name),
    description: textarea(army.description),
    challengeClass: input(army.challengeClass),
    attack: input(army.attack),
    defense: input(army.defense),
    morale: input(army.morale),
    upkeep: input(army.upkeep),
    equipment: textarea(army.equipment),
    tactics: textarea(army.tactics),
    commanderKey: selectInput([["", "Командир не назначен"], ...commanderOptions], army.commanderKey),
    soldierNpcId: selectInput([["", "Типовой солдат не выбран"], ...state.npcs.map((npc) => [npc.id, npc.name])], army.soldierNpcId),
    public: document.createElement("input"),
  };
  fields.public.type = "checkbox";
  fields.public.checked = army.public;
  const traitsEditor = structuredRowsEditor(army.traits, [
    { key: "name", label: "Название" },
    { key: "description", label: "Описание", type: "textarea" },
    { key: "effect", label: "Эффект / особая способность", type: "textarea" },
  ], "Добавить черту или способность");

  const imageStyle = { ...defaultImageStyle(), ...(army.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = army.image || "";
  const preview = el("div", "upload-preview settlement-army-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Изображение не загружено");
  preview.append(previewImage, previewText);
  const aspect = selectInput([
    ["wide", "Широкая 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 3, 0.05);
  const rotation = rangeInput(imageStyle.rotation || 0, -180, 180, 1);
  const refreshPreview = () => {
    preview.className = `upload-preview settlement-army-preview image-aspect-${aspect.value}`;
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value}) rotate(${rotation.value}deg)`;
  };
  [aspect, fit, posX, posY, zoom, rotation].forEach((control) => control.addEventListener("input", refreshPreview));
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "settlement-armies");
    refreshPreview();
  });
  refreshPreview();

  form.append(
    labelWrap("Название войска", fields.name),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Описание", fields.description, "span-2"),
    labelWrap("Класс Опасности Войска", fields.challengeClass),
    labelWrap("Атака Войска", fields.attack),
    labelWrap("Защита Войска", fields.defense),
    labelWrap("Мораль Войска", fields.morale),
    labelWrap("Содержание войска", fields.upkeep),
    labelWrap("Командир", fields.commanderKey),
    labelWrap("Типовой солдат (NPC)", fields.soldierNpcId),
    labelWrap("Особое оснащение", fields.equipment, "span-2"),
    labelWrap("Известные тактики", fields.tactics, "span-2"),
    labelWrap("Черты и особые способности", traitsEditor.element, "span-2"),
    labelWrap("Арт войска", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб", zoom),
    labelWrap("Поворот", rotation),
    actionRow([button("Убрать изображение", "ghost-button", () => {
      imageValue = "";
      imageInput.value = "";
      refreshPreview();
    })], "span-2"),
    actionRow([
      button(isNew ? "Добавить войско" : "Сохранить войско", "primary-button", null, "submit"),
      ...(!isNew ? [button("Удалить войско", "ghost-button", () => removeSettlementEntry(settlement, "armies", army, "войско"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementArmy({
      ...army,
      name: fields.name.value,
      description: fields.description.value,
      challengeClass: fields.challengeClass.value,
      attack: fields.attack.value,
      defense: fields.defense.value,
      morale: fields.morale.value,
      upkeep: fields.upkeep.value,
      equipment: fields.equipment.value,
      tactics: fields.tactics.value,
      commanderKey: fields.commanderKey.value,
      soldierNpcId: fields.soldierNpcId.value,
      traits: traitsEditor.read(),
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
        rotation: Number(rotation.value),
      },
      public: fields.public.checked,
    });
    upsertSettlementEntry(settlement, "armies", next, isNew);
  });
  return form;
}

function settlementChronicleEditor(settlement) {
  const entry = normalizeSettlementLog({ id: crypto.randomUUID(), public: false });
  return inlineEditor("Добавить запись в хронику", settlementChronicleForm(settlement, entry, true));
}

function settlementChronicleForm(settlement, entry, isNew = false) {
  const form = el("form", "form-grid");
  const fields = {
    date: input(entry.date),
    title: input(entry.title),
    text: textarea(entry.text),
    public: document.createElement("input"),
  };
  fields.public.type = "checkbox";
  fields.public.checked = entry.public;
  form.append(
    labelWrap("Дата", fields.date),
    labelWrap("Заголовок события", fields.title),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Запись в хронике", fields.text, "span-2"),
    actionRow([
      button(isNew ? "Добавить запись" : "Сохранить изменения", "primary-button", null, "submit"),
      ...(!isNew ? [button("Удалить запись", "ghost-button", () => removeSettlementEntry(settlement, "log", entry, "запись"))] : []),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = normalizeSettlementLog({
      ...entry,
      date: fields.date.value,
      title: fields.title.value,
      text: fields.text.value,
      public: fields.public.checked,
    });
    upsertSettlementEntry(settlement, "log", next, isNew);
  });
  return form;
}

function parseLineList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function upsertSettlementEntry(settlement, key, entry, isNew) {
  const entries = Array.isArray(settlement[key]) ? settlement[key] : [];
  const index = entries.findIndex((item) => item.id === entry.id);
  if (isNew || index < 0) entries.push(entry);
  else entries[index] = entry;
  settlement[key] = entries;
  saveSettlement(settlement);
}

function removeSettlementEntry(settlement, key, entry, label) {
  if (!confirm(`Удалить ${label} «${entry.name || entry.title || entry.date || "без названия"}»?`)) return;
  settlement[key] = settlement[key].filter((item) => item.id !== entry.id);
    saveSettlement(settlement);
}

function copyBuildingToSettlement(sourceBuilding, targetSettlement, targetDistrictId = "") {
  if (!isAdmin || !sourceBuilding || !targetSettlement) return;
  const buildingId = crypto.randomUUID();
  const targetPlacements = targetDistrictId
    ? [{ id: crypto.randomUUID(), districtId: targetDistrictId, location: sourceBuilding.placements[0]?.location || "" }]
    : sourceBuilding.placements.map((placement) => ({
        ...structuredClone(placement),
        id: crypto.randomUUID(),
        districtId: targetSettlement.districts.some((district) => district.id === placement.districtId)
          ? placement.districtId
          : (targetSettlement.districts[0]?.id || ""),
      }));
  const copy = normalizeBuilding({
    ...structuredClone(sourceBuilding),
    id: buildingId,
    name: `${sourceBuilding.name} (копия)`,
    placements: targetPlacements.length ? targetPlacements : [{
      id: crypto.randomUUID(),
      districtId: targetSettlement.districts[0]?.id || "",
      location: "",
    }],
    magicItems: sourceBuilding.magicItems.map((item) => ({
      ...structuredClone(item),
      id: crypto.randomUUID(),
    })),
  });
  targetSettlement.buildings.push(copy);
  saveSettlement(targetSettlement);
}

function duplicateSettlement(settlement) {
  if (!isAdmin || !settlement) return;
  const copyData = structuredClone(settlement);
  const districtIds = new Map();
  copyData.districts = copyData.districts.map((district) => {
    const id = crypto.randomUUID();
    districtIds.set(district.id, id);
    return { ...district, id };
  });
  const renewIds = (items = []) => items.map((item) => ({ ...item, id: crypto.randomUUID() }));
  copyData.id = crypto.randomUUID();
  copyData.name = `${settlement.name} (копия)`;
  copyData.mapRegionId = "";
  copyData.traits = renewIds(copyData.traits);
  copyData.laws = renewIds(copyData.laws);
  copyData.buildings = copyData.buildings.map((building) => ({
    ...building,
    id: crypto.randomUUID(),
    placements: (building.placements || []).map((placement) => ({
      ...placement,
      id: crypto.randomUUID(),
      districtId: districtIds.get(placement.districtId) || copyData.districts[0]?.id || "",
    })),
    magicItems: renewIds(building.magicItems),
    hierarchyLevels: (building.hierarchyLevels || []).map((level) => ({
      ...level,
      id: crypto.randomUUID(),
      slots: renewIds(level.slots),
    })),
  }));
  copyData.businesses = renewIds(copyData.businesses);
  copyData.populationGroups = renewIds(copyData.populationGroups);
  copyData.residents = copyData.residents.map((resident) => ({
    ...resident,
    id: crypto.randomUUID(),
    districtId: districtIds.get(resident.districtId) || copyData.districts[0]?.id || "",
    magicItems: renewIds(resident.magicItems),
  }));
  copyData.armies = copyData.armies.map((army) => ({
    ...army,
    id: crypto.randomUUID(),
    traits: renewIds(army.traits),
  }));
  copyData.log = renewIds(copyData.log);
  const copy = normalizeSettlement(copyData);
  state.settlements.unshift(copy);
  activeSettlementId = copy.id;
  activeSettlementTab = "overview";
  saveState();
  saveUiState();
  render();
}

function addSettlement() {
  if (!isAdmin) return;
  const settlement = normalizeSettlement({
    id: slug("settlement"),
    name: "Новое поселение",
    type: "village",
    public: false,
    tags: ["новое"],
    description: "Новое владение партии.",
    traits: [],
    laws: [],
    buildings: [],
    businesses: [],
    populationGroups: [],
    residents: [],
    armies: [],
    log: [],
  });
  state.settlements.unshift(settlement);
  activeSettlementId = settlement.id;
  activeSettlementTab = "overview";
  saveState();
  render();
}

function deleteSettlement(settlement) {
  if (!confirm(`Удалить поселение "${settlement.name}"?`)) return;
  state.settlements = state.settlements.filter((item) => item.id !== settlement.id);
  state.countries.forEach((country) => {
    country.settlementIds = country.settlementIds.filter((id) => id !== settlement.id);
  });
  activeSettlementId = visibleSettlements()[0]?.id ?? null;
  saveState();
  render();
}

function openSettlement(settlementId) {
  const settlement = visibleSettlements().find((item) => item.id === settlementId);
  if (!settlement) return;
  activeSettlementId = settlement.id;
  activeSettlementTab = "overview";
  setView("settlements");
}

function renderItems() {
  hideItemListPreview();
  const root = el("div");
  const actionLabel = activeItemCategory === "books" ? "Новая коллекция" : "Новый предмет";
  const action = isAdmin ? button(actionLabel, "primary-button", addUniqueItem) : null;
  root.append(header("Уникальные предметы", "Магические и немагические реликвии, особая добыча и книжные собрания кампании.", action));

  const availableItems = visibleItems();
  const categoryTabs = el("div", "tabs item-category-tabs");
  uniqueItemCategories.forEach(([categoryId, label]) => {
    const count = availableItems.filter((item) => item.category === categoryId).length;
    const tab = button(`${label} · ${count}`, categoryId === activeItemCategory ? "active" : "", () => {
      activeItemCategory = categoryId;
      activeItemId = availableItems.find((item) => item.category === categoryId)?.id ?? null;
      saveUiState();
      render();
    });
    tab.setAttribute("aria-pressed", String(categoryId === activeItemCategory));
    categoryTabs.append(tab);
  });
  root.append(categoryTabs);

  root.append(directorySearchControl(
    "itemDirectorySearch",
    itemDirectorySearchTerm,
    "Поиск предмета по названию",
    (value) => { itemDirectorySearchTerm = value; },
    ".item-list-button"
  ));

  const items = filterItems(
    availableItems.filter((item) => item.category === activeItemCategory),
    uniqueItemSearchText
  );
  if (!items.some((item) => item.id === activeItemId)) activeItemId = items[0]?.id ?? null;
  const active = items.find((item) => item.id === activeItemId);
  const layout = el("div", "item-layout");
  const list = el("aside", "panel item-list list-panel");
  items.forEach((item) => {
    const listButton = button(item.name, `list-button item-list-button ${item.id === activeItemId ? "active" : ""}`, () => {
      activeItemId = item.id;
      saveUiState();
      render();
    });
    listButton.title = item.name;
    listButton.classList.toggle(
      "is-hidden",
      Boolean(itemDirectorySearchTerm.trim()) && !item.name.toLowerCase().includes(itemDirectorySearchTerm.trim().toLowerCase())
    );
    listButton.addEventListener("mouseenter", () => scheduleItemListPreview(listButton, item));
    listButton.addEventListener("mouseleave", hideItemListPreview);
    listButton.addEventListener("focus", () => scheduleItemListPreview(listButton, item));
    listButton.addEventListener("blur", hideItemListPreview);
    list.append(listButton);
  });
  list.addEventListener("scroll", hideItemListPreview, { passive: true });
  if (!items.length) {
    const emptyLabel = searchTerm || itemDirectorySearchTerm
      ? "В этом разделе ничего не найдено."
      : activeItemCategory === "books" ? "Коллекций книг пока нет." : "Предметов в этом разделе пока нет.";
    list.append(el("div", "empty-state", emptyLabel));
  }
  const emptyDetail = el("section", "panel item-detail");
  emptyDetail.append(el("div", "empty-state", "Выбери предмет"));
  layout.append(list, active ? uniqueItemDetail(active) : emptyDetail);
  root.append(layout);
  return root;
}

function uniqueItemSearchText(item) {
  const bookText = item.books
    .map((book) => [book.title, book.description, book.price, book.readingEffect].join(" "))
    .join(" ");
  return [
    item.name,
    optionLabel(uniqueItemCategories, item.category),
    optionLabel(uniqueItemTypes, item.type),
    optionLabel(uniqueItemStatuses, item.status),
    item.rarity,
    item.ownerName,
    item.locationName,
    item.description,
    item.features,
    item.mechanics,
    bookText,
    isAdmin ? item.gmNotes : "",
    item.tags.join(" "),
  ].join(" ");
}

function scheduleItemListPreview(anchor, item) {
  hideItemListPreview();
  itemListPreviewTimer = window.setTimeout(() => showItemListPreview(anchor, item), 180);
}

function showItemListPreview(anchor, item) {
  hideItemListPreview();
  if (!anchor.isConnected) return;
  const preview = el("div", "item-list-preview");
  preview.append(uniqueItemArt(item), el("strong", "", item.name));
  document.body.append(preview);
  const anchorRect = anchor.getBoundingClientRect();
  const width = preview.offsetWidth;
  const height = preview.offsetHeight;
  const right = anchorRect.right + 10;
  const left = right + width <= window.innerWidth - 12
    ? right
    : Math.max(12, anchorRect.left - width - 10);
  const top = Math.min(
    window.innerHeight - height - 12,
    Math.max(12, anchorRect.top + (anchorRect.height - height) / 2)
  );
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
  activeItemListPreview = preview;
}

function hideItemListPreview() {
  window.clearTimeout(itemListPreviewTimer);
  itemListPreviewTimer = null;
  activeItemListPreview?.remove();
  activeItemListPreview = null;
}

function uniqueItemDetail(item) {
  const detail = el("section", "panel item-detail");
  const head = el("div", "item-head");
  head.append(uniqueItemArt(item), directoryTitleBlock(item.name, [
    optionLabel(uniqueItemCategories, item.category),
    optionLabel(uniqueItemTypes, item.type),
    item.rarity,
    item.ownerName || item.locationName,
  ], [optionLabel(uniqueItemStatuses, item.status), item.public ? "игрокам" : "мастеру"]));
  detail.append(head, tags(item.tags));
  detail.append(directoryMeta([
    ["Раздел", optionLabel(uniqueItemCategories, item.category)],
    ["Тип", optionLabel(uniqueItemTypes, item.type)],
    ["Статус", optionLabel(uniqueItemStatuses, item.status)],
    ["Редкость", item.rarity],
    ["Цена", item.price || "не указана"],
    ["Владелец", item.ownerName],
    ["Местонахождение", item.locationName],
  ]));
  detail.append(itemTextSection("Описание", item.description || "Описание пока не заполнено."));
  if (item.category === "books") {
    detail.append(collectionBooksPassport(item), collectionLinkedItems(item));
  } else {
    detail.append(itemTextSection("Особенности", item.features || "Особенности пока не описаны."));
    detail.append(itemTextSection("Игромеханика", item.mechanics || "Механические свойства пока не указаны."));
  }
  detail.append(itemLinkSection(item));
  if (isAdmin && item.gmNotes) detail.append(el("p", "gm-inline", `GM: ${item.gmNotes}`));
  if (isAdmin) {
    detail.append(actionRow([
      button(item.category === "books" ? "Дублировать коллекцию" : "Дублировать предмет", "ghost-button", () => duplicateUniqueItem(item)),
    ], "item-detail-actions"));
    detail.append(inlineEditor(item.category === "books" ? "Редактировать коллекцию" : "Редактировать предмет", uniqueItemEditor(item)));
  }
  return detail;
}

function collectionBooksPassport(item) {
  const section = el("section", "item-section collection-passport");
  section.append(el("p", "eyebrow", "Книги в коллекции"));
  if (!item.books.length) {
    section.append(el("p", "muted", "Состав коллекции пока не заполнен."));
    return section;
  }
  const list = el("div", "collection-book-list");
  item.books.forEach((book, index) => {
    const entry = el("article", "collection-book-entry");
    const title = el("div", "collection-book-title");
    title.append(el("span", "collection-book-number", String(index + 1)), el("h3", "", book.title));
    if (book.price) title.append(el("strong", "collection-book-price", book.price));
    entry.append(title);
    entry.append(itemTextSection("Описание", book.description || "Описание книги не заполнено."));
    entry.append(itemTextSection("Эффект от прочтения", book.readingEffect || "Эффект от прочтения не указан."));
    list.append(entry);
  });
  section.append(list);
  return section;
}

function collectionLinkedItems(item) {
  const section = el("section", "item-section collection-linked-items");
  section.append(el("p", "eyebrow", "Связанные уникальные книги"));
  const linked = visibleItems().filter((entry) =>
    entry.id !== item.id
    && entry.category !== "books"
    && item.linkedBookItemIds.includes(entry.id)
  );
  if (!linked.length) {
    section.append(el("p", "muted", "Ссылок на отдельные уникальные книги пока нет."));
    return section;
  }
  const list = el("div", "collection-linked-list");
  linked.forEach((entry) => {
    const link = button(entry.name, "collection-item-link", () => openItem(entry.id));
    link.append(el("span", "", [optionLabel(uniqueItemCategories, entry.category), entry.price].filter(Boolean).join(" · ")));
    list.append(link);
  });
  section.append(list);
  return section;
}

function uniqueItemArt(item) {
  const frame = el("div", "item-art");
  const style = { ...defaultImageStyle(), ...(item.imageStyle ?? {}) };
  frame.classList.add(`image-aspect-${style.aspect}`);
  if (item.image) {
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.style.objectFit = style.fit;
    img.style.objectPosition = `${style.x}% ${style.y}%`;
    img.style.transform = `scale(${style.zoom})`;
    frame.append(img);
  } else {
    frame.append(el("span", "", initials(item.name)));
  }
  return frame;
}

function itemTextSection(title, text) {
  const section = el("section", "item-section");
  section.append(el("p", "eyebrow", title), el("p", "", text));
  return section;
}

function itemLinkSection(item) {
  const links = directoryLinks([
    ...item.characterLinks.map((id) => state.characters.find((character) => character.id === id)).filter(Boolean).map((character) => [`Персонаж: ${character.name}`, () => openCharacter(character.id)]),
    ...visibleNpcs().filter((npc) => item.npcLinks.includes(npc.id)).map((npc) => [`NPC: ${npc.name}`, () => openNpc(npc.id)]),
    ...linkedWikiByIds(item.wikiLinks).map((article) => [`Wiki: ${article.title}`, () => openWikiArticle(article.id)]),
    ...linkedQuestsByIds(item.questLinks).map((quest) => [`Задание: ${quest.title}`, () => openQuest(quest.id)]),
    ...visibleSettlements().filter((settlement) => item.settlementLinks.includes(settlement.id)).map((settlement) => [`Поселение: ${settlement.name}`, () => openSettlement(settlement.id)]),
    ...visibleMapRegions().filter((region) => item.mapLinks.includes(region.id)).map((region) => [`Карта: ${region.title}`, () => openMapRegion(region.id)]),
  ]);
  const section = el("section", "item-section");
  section.append(el("p", "eyebrow", "Связи"), links);
  return section;
}

function uniqueItemEditor(item) {
  const form = el("form", "form-grid");
  const fields = {
    name: input(item.name),
    category: selectInput(uniqueItemCategories, item.category),
    type: selectInput(uniqueItemTypes, item.type),
    status: selectInput(uniqueItemStatuses, item.status),
    rarity: input(item.rarity),
    price: input(item.price),
    ownerName: input(item.ownerName),
    locationName: input(item.locationName),
    tags: input(item.tags.join(", ")),
    description: textarea(item.description),
    features: textarea(item.features),
    mechanics: textarea(item.mechanics),
    gmNotes: textarea(item.gmNotes),
    public: document.createElement("input"),
    characterLinks: checkboxList(state.characters.map((character) => [character.id, character.name]), item.characterLinks),
    npcLinks: checkboxList(visibleNpcs().map((npc) => [npc.id, npc.name]), item.npcLinks),
    wikiLinks: searchableCheckboxList(visibleWiki().map((article) => [article.id, article.title, [article.category, article.tags.join(" ")].join(" ")]), item.wikiLinks),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), item.questLinks),
    settlementLinks: checkboxList(visibleSettlements().map((settlement) => [settlement.id, settlement.name]), item.settlementLinks),
    mapLinks: checkboxList(visibleMapRegions().map((region) => [region.id, region.title]), item.mapLinks),
  };
  const collectionBookEditor = collectionBooksEditor(item.books);
  const linkedBookItemIds = searchableCheckboxList(
    state.items
      .filter((entry) => entry.id !== item.id && entry.category !== "books" && entry.type === "document")
      .map((entry) => [
        entry.id,
        `${entry.name} · ${optionLabel(uniqueItemCategories, entry.category)}`,
        [entry.price, entry.tags.join(" ")].filter(Boolean).join(" "),
      ]),
    item.linkedBookItemIds,
    "",
    null,
    "Поиск уникальной книги"
  );
  fields.public.type = "checkbox";
  fields.public.checked = item.public;

  const imageStyle = { ...defaultImageStyle(), ...(item.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = item.image || "";
  const preview = el("div", "upload-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Картинка не загружена");
  preview.append(previewImage, previewText);
  const aspect = selectInput([
    ["wide", "Широкая 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([
    ["cover", "Обрезать по рамке"],
    ["contain", "Вписать целиком"],
  ], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 2.5, 0.05);
  const refreshPreview = () => {
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    preview.className = `upload-preview image-aspect-${aspect.value}`;
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value})`;
  };
  [aspect, fit, posX, posY, zoom].forEach((control) => control.addEventListener("input", refreshPreview));
  refreshPreview();
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "items");
    refreshPreview();
  });

  const regularFields = el("div", "form-grid span-2 item-category-editor");
  regularFields.append(
    labelWrap("Особенности", fields.features, "span-2"),
    labelWrap("Игромеханика", fields.mechanics, "span-2")
  );
  const collectionFields = el("div", "form-grid span-2 item-category-editor collection-editor-fields");
  collectionFields.append(
    collectionBookEditor.element,
    labelWrap("Ссылки на магические и немагические книги", linkedBookItemIds, "span-2")
  );
  const syncCategoryFields = () => {
    const isCollection = fields.category.value === "books";
    regularFields.hidden = isCollection;
    collectionFields.hidden = !isCollection;
  };
  fields.category.addEventListener("change", syncCategoryFields);
  syncCategoryFields();

  form.append(
    labelWrap("Название", fields.name),
    labelWrap("Раздел каталога", fields.category),
    labelWrap("Тип предмета", fields.type),
    labelWrap("Статус", fields.status),
    labelWrap("Редкость", fields.rarity),
    labelWrap("Цена", fields.price),
    labelWrap("Владелец / кому принадлежит", fields.ownerName),
    labelWrap("Где находится", fields.locationName),
    checkboxWrap("Видно игрокам", fields.public),
    labelWrap("Теги", fields.tags),
    labelWrap("Арт предмета", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат картинки", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб обрезки", zoom, "span-2"),
    labelWrap("Описание", fields.description, "span-2"),
    regularFields,
    collectionFields,
    labelWrap("GM-заметки", fields.gmNotes, "span-2"),
    labelWrap("Связанные персонажи", fields.characterLinks, "span-2"),
    labelWrap("Связанные NPC", fields.npcLinks, "span-2"),
    labelWrap("Связанные Wiki-статьи", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    labelWrap("Связанные поселения", fields.settlementLinks, "span-2"),
    labelWrap("Связанные карты", fields.mapLinks, "span-2"),
    actionRow([
      button("Сохранить изменения", "primary-button", null, "submit"),
      button("Убрать картинку", "ghost-button", () => {
        imageValue = "";
        imageInput.value = "";
        refreshPreview();
      }),
      button("Удалить предмет", "ghost-button", () => deleteUniqueItem(item)),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextTags = csv(fields.tags.value);
    registerTags(nextTags, true);
    Object.assign(item, normalizeUniqueItem({
      ...item,
      name: fields.name.value,
      category: fields.category.value,
      type: fields.type.value,
      status: fields.status.value,
      rarity: fields.rarity.value,
      price: fields.price.value,
      ownerName: fields.ownerName.value,
      locationName: fields.locationName.value,
      public: fields.public.checked,
      tags: nextTags,
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
      },
      description: fields.description.value,
      features: fields.features.value,
      mechanics: fields.mechanics.value,
      gmNotes: fields.gmNotes.value,
      characterLinks: checkedValues(fields.characterLinks),
      npcLinks: checkedValues(fields.npcLinks),
      wikiLinks: checkedValues(fields.wikiLinks),
      questLinks: checkedValues(fields.questLinks),
      settlementLinks: checkedValues(fields.settlementLinks),
      mapLinks: checkedValues(fields.mapLinks),
      books: collectionBookEditor.value(),
      linkedBookItemIds: checkedValues(linkedBookItemIds),
    }));
    activeItemCategory = item.category;
    saveState();
    render();
  });
  return form;
}

function collectionBooksEditor(initialBooks) {
  const root = el("section", "span-2 collection-books-editor");
  const list = el("div", "collection-book-editor-list");
  const books = initialBooks.map((book, index) => ({ ...normalizeCollectionBook(book, index) }));

  const renderRows = () => {
    list.innerHTML = "";
    if (!books.length) list.append(el("p", "muted", "Добавь первую книгу в коллекцию."));
    books.forEach((book, index) => {
      const row = el("fieldset", "collection-book-editor-row");
      const legend = el("legend", "", `Книга ${index + 1}`);
      const title = input(book.title);
      const description = textarea(book.description);
      const price = input(book.price);
      const readingEffect = textarea(book.readingEffect);
      title.addEventListener("input", () => { book.title = title.value; });
      description.addEventListener("input", () => { book.description = description.value; });
      price.addEventListener("input", () => { book.price = price.value; });
      readingEffect.addEventListener("input", () => { book.readingEffect = readingEffect.value; });
      row.append(
        legend,
        labelWrap("Название книги", title),
        labelWrap("Стоимость", price),
        labelWrap("Описание", description, "span-2"),
        labelWrap("Эффект от прочтения", readingEffect, "span-2"),
        actionRow([button("Удалить книгу", "ghost-button", () => {
          books.splice(index, 1);
          renderRows();
        })], "span-2")
      );
      list.append(row);
    });
  };

  const addBook = button("Добавить книгу", "ghost-button", () => {
    books.push(normalizeCollectionBook({ id: `book-${crypto.randomUUID()}`, title: "Новая книга" }, books.length));
    renderRows();
  });
  root.append(el("div", "collection-books-editor-head", "Состав коллекции"), list, addBook);
  renderRows();
  return {
    element: root,
    value: () => books.map((book, index) => normalizeCollectionBook(book, index)),
  };
}

function addUniqueItem() {
  if (!isAdmin) return;
  const isCollection = activeItemCategory === "books";
  const item = normalizeUniqueItem({
    id: `item-${crypto.randomUUID()}`,
    name: isCollection ? "Новая коллекция книг" : "Новый уникальный предмет",
    category: activeItemCategory,
    type: isCollection ? "document" : "relic",
    status: "hidden",
    rarity: "уникальный",
    public: false,
    tags: isCollection ? ["новое", "книги", "коллекция"] : ["новое", "предмет"],
    description: isCollection ? "Описание книжной коллекции." : "Описание предмета.",
  });
  state.items.unshift(item);
  activeItemId = item.id;
  saveState();
  render();
}

function deleteUniqueItem(item) {
  if (!confirm(`Удалить предмет "${item.name}"?`)) return;
  state.items = state.items.filter((entry) => entry.id !== item.id);
  state.items.forEach((entry) => {
    entry.linkedBookItemIds = entry.linkedBookItemIds.filter((id) => id !== item.id);
  });
  activeItemId = visibleItems().find((entry) => entry.category === activeItemCategory)?.id ?? null;
  saveState();
  render();
}

function duplicateUniqueItem(item) {
  if (!isAdmin) return;
  const copy = normalizeUniqueItem({
    ...structuredClone(item),
    id: `item-${crypto.randomUUID()}`,
    name: `${item.name} (копия)`,
    books: item.books.map((book) => ({ ...structuredClone(book), id: `book-${crypto.randomUUID()}` })),
  });
  state.items.unshift(copy);
  activeItemCategory = copy.category;
  activeItemId = copy.id;
  saveState();
  render();
}

function openItem(itemId) {
  const item = visibleItems().find((entry) => entry.id === itemId);
  if (!item) return;
  clearSearchTerm();
  activeItemId = item.id;
  activeItemCategory = item.category;
  saveUiState();
  setView("items");
}

function renderCalendar() {
  const root = el("div");
  const selectedDate = ashanaDateFromKey(activeCalendarDateKey || ashanaDateKey(state.meta.ashanaDate));
  const monthNames = campaignMonthNames();
  const action = isAdmin
    ? actionRow([
        button("+1 день", "primary-button", () => shiftCurrentDate(1)),
        button("Новое событие", "ghost-button", () => addCalendarEvent(selectedDate)),
      ])
    : null;
  root.append(header("Календарь", "Год Асханы: 360 дней, 10 месяцев по 36 дней, 4 недели по 9 дней.", action));

  const layout = el("div", "calendar-layout");
  const overview = el("section", "panel calendar-current");
  overview.append(
    el("p", "eyebrow", "Текущая дата"),
    el("h3", "", formatAshanaDate(state.meta.ashanaDate)),
    compactBadges([ashanaWeekday(state.meta.ashanaDate), `${ashanaWeekNumber(state.meta.ashanaDate)} неделя`, `${state.meta.ashanaDate.year} год`]),
    metricGrid([
      ["Месяц", `${state.meta.ashanaDate.month}. ${monthNames[state.meta.ashanaDate.month - 1]}`],
      ["День", state.meta.ashanaDate.day],
      ["Неделя", `${ashanaWeekNumber(state.meta.ashanaDate)} / 4`],
      ["День года", (state.meta.ashanaDate.month - 1) * 36 + state.meta.ashanaDate.day],
    ])
  );
  if (isAdmin) {
    overview.append(actionRow([
      button("-1 день", "ghost-button", () => shiftCurrentDate(-1)),
      button("+9 дней", "ghost-button", () => shiftCurrentDate(9)),
    ]));
    overview.append(inlineEditor("Поставить точную дату", calendarDateEditor()));
    overview.append(inlineEditor("Названия месяцев", monthNamesEditor()));
  }

  const monthPanel = el("section", "panel calendar-month");
  monthPanel.append(el("p", "eyebrow", "Месяц"), el("h3", "", `${selectedDate.month}. ${monthNames[selectedDate.month - 1]}`));
  const prevMonth = button("Пред. месяц", "ghost-button", () => shiftCalendarMonth(-1));
  const nextMonth = button("След. месяц", "ghost-button", () => shiftCalendarMonth(1));
  prevMonth.disabled = selectedDate.month <= 1;
  nextMonth.disabled = selectedDate.month >= 10;
  const monthControls = actionRow([
    prevMonth,
    button("Текущий месяц", "ghost-button", () => {
      activeCalendarDateKey = ashanaDateKey(state.meta.ashanaDate);
      render();
    }),
    nextMonth,
  ]);
  monthPanel.append(monthControls, monthTracker(selectedDate));
  const days = el("div", "calendar-days");
  for (let day = 1; day <= 36; day += 1) {
    const date = { year: selectedDate.year, month: selectedDate.month, day };
    const events = eventsForDate(date);
    const classes = [
      "calendar-day",
      ashanaDateKey(date) === ashanaDateKey(state.meta.ashanaDate) ? "current" : "",
      ashanaDateKey(date) === activeCalendarDateKey ? "selected" : "",
      events.length ? "has-events" : "",
    ].filter(Boolean).join(" ");
    const cell = button("", classes, () => {
      activeCalendarDateKey = ashanaDateKey(date);
      render();
    });
    cell.append(el("strong", "", day), el("span", "", ashanaWeekday(date).replace(" день", "")));
    if (events.length) cell.append(el("small", "", events.length));
    days.append(cell);
  }
  monthPanel.append(days);

  const dayPanel = el("section", "panel calendar-day-panel");
  const selectedEvents = eventsForDate(selectedDate);
  dayPanel.append(
    el("p", "eyebrow", "Выбранный день"),
    el("h3", "", formatAshanaDate(selectedDate)),
    compactBadges([ashanaWeekday(selectedDate), `${ashanaWeekNumber(selectedDate)} неделя`, `${selectedEvents.length} событий`])
  );
  if (isAdmin && ashanaDateKey(selectedDate) !== ashanaDateKey(state.meta.ashanaDate)) {
    dayPanel.append(actionRow([button("Сделать текущей датой", "primary-button", () => {
      setCurrentAshanaDate(selectedDate);
      saveState();
      render();
    })]));
  }
  dayPanel.append(calendarEventsList(selectedEvents));
  if (isAdmin) dayPanel.append(inlineEditor("Добавить событие на этот день", calendarEventEditor(normalizeCalendarEvent({ date: selectedDate }), true)));

  layout.append(overview, monthPanel, dayPanel);
  root.append(layout);
  return root;
}

function shiftCurrentDate(delta) {
  setCurrentAshanaDate(ashanaDateFromIndex(ashanaDateIndex(state.meta.ashanaDate) + delta));
  saveState();
  render();
}

function shiftCalendarMonth(delta) {
  const selected = ashanaDateFromKey(activeCalendarDateKey);
  const nextMonth = selected.month + delta;
  if (nextMonth < 1 || nextMonth > 10) return;
  activeCalendarDateKey = ashanaDateKey({ ...selected, month: nextMonth, day: Math.min(selected.day, 36) });
  render();
}

function monthTracker(selectedDate) {
  const track = el("div", "calendar-month-track");
  campaignMonthNames().forEach((name, index) => {
    const monthNumber = index + 1;
    const item = button(String(monthNumber), `month-track-item ${monthNumber === selectedDate.month ? "active" : ""} ${monthNumber === state.meta.ashanaDate.month ? "current" : ""}`, () => {
      activeCalendarDateKey = ashanaDateKey({ ...selectedDate, month: monthNumber });
      render();
    });
    item.title = name;
    track.append(item);
  });
  return track;
}

function eventsForDate(date) {
  const key = ashanaDateKey(date);
  return visibleCalendarEvents()
    .filter((event) => ashanaDateKey(event.date) === key)
    .sort((a, b) => optionLabel(calendarEventTypes, a.type).localeCompare(optionLabel(calendarEventTypes, b.type), "ru"));
}

function calendarEventsList(events) {
  if (!events.length) return el("div", "empty-state compact-empty", "На этот день событий нет.");
  const list = el("div", "calendar-event-list");
  events.forEach((event) => {
    const card = el("article", "calendar-event");
    card.append(
      compactBadges([optionLabel(calendarEventTypes, event.type), event.public ? "игрокам" : "скрыто"]),
      el("h4", "", event.title),
      el("p", "", event.summary || "Описание пока не заполнено."),
      entityLinks(event)
    );
    if (isAdmin && event.gmNotes) card.append(el("p", "gm-inline", `GM: ${event.gmNotes}`));
    if (isAdmin) card.append(inlineEditor("Редактировать событие", calendarEventEditor(event)));
    list.append(card);
  });
  return list;
}

function calendarDateEditor() {
  const form = el("form", "form-grid compact-form");
  const year = input(state.meta.ashanaDate.year);
  const month = selectInput(monthOptions(), String(state.meta.ashanaDate.month));
  const day = input(state.meta.ashanaDate.day);
  day.type = "number";
  day.min = 1;
  day.max = 36;
  year.type = "number";
  year.min = 1;
  form.append(
    labelWrap("Год", year),
    labelWrap("Месяц", month),
    labelWrap("День", day),
    actionRow([button("Сохранить дату", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setCurrentAshanaDate({ year: Number(year.value), month: Number(month.value), day: Number(day.value) });
    saveState();
    render();
  });
  return form;
}

function monthNamesEditor() {
  const form = el("form", "form-grid month-name-editor");
  const controls = campaignMonthNames().map((name, index) => {
    const control = input(name);
    form.append(labelWrap(`${index + 1} месяц`, control));
    return control;
  });
  form.append(actionRow([button("Сохранить месяцы", "primary-button", null, "submit")], "span-2"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.meta.monthNames = normalizeMonthNames(controls.map((control) => control.value));
    state.meta.currentDate = formatAshanaDate(state.meta.ashanaDate);
    saveState();
    render();
  });
  return form;
}

function calendarEventEditor(event, create = false) {
  const form = el("form", "form-grid");
  const fields = linkedEntityFields(event);
  const title = input(event.title);
  const type = selectInput(calendarEventTypes, event.type);
  const year = input(event.date.year);
  const month = selectInput(monthOptions(), String(event.date.month));
  const day = input(event.date.day);
  const summary = textarea(event.summary);
  const gmNotes = textarea(event.gmNotes);
  const publicInput = document.createElement("input");
  publicInput.type = "checkbox";
  publicInput.checked = event.public;
  [year, day].forEach((item) => {
    item.type = "number";
    item.min = item === day ? 1 : 1;
  });
  day.max = 36;
  form.append(
    labelWrap("Название", title),
    labelWrap("Тип", type),
    labelWrap("Год", year),
    labelWrap("Месяц", month),
    labelWrap("День", day),
    checkboxWrap("Видно игрокам", publicInput),
    labelWrap("Описание", summary, "span-2"),
    labelWrap("GM-заметки", gmNotes, "span-2"),
    linkedEntityControls(fields),
    actionRow([
      button(create ? "Создать событие" : "Сохранить событие", "primary-button", null, "submit"),
      ...(create ? [] : [button("Удалить событие", "ghost-button", () => deleteCalendarEvent(event))]),
    ], "span-2")
  );
  form.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const next = normalizeCalendarEvent({
      ...event,
      title: title.value,
      type: type.value,
      date: { year: Number(year.value), month: Number(month.value), day: Number(day.value) },
      public: publicInput.checked,
      summary: summary.value,
      gmNotes: gmNotes.value,
      ...readLinkedEntityFields(fields),
    });
    if (create) {
      state.calendarEvents.unshift(next);
      activeCalendarDateKey = ashanaDateKey(next.date);
    } else {
      Object.assign(event, next);
    }
    saveState();
    render();
  });
  return form;
}

function addCalendarEvent(date = state.meta.ashanaDate) {
  if (!isAdmin) return;
  const event = normalizeCalendarEvent({
    id: slug("event"),
    title: "Новое событие",
    type: "note",
    date,
    public: false,
    summary: "Описание события.",
  });
  state.calendarEvents.unshift(event);
  activeCalendarDateKey = ashanaDateKey(event.date);
  saveState();
  render();
}

function deleteCalendarEvent(event) {
  if (!confirm(`Удалить событие "${event.title}"?`)) return;
  state.calendarEvents = state.calendarEvents.filter((item) => item.id !== event.id);
  saveState();
  render();
}

function renderSessions() {
  const root = el("div");
  const action = isAdmin ? button("Новая запись", "primary-button", () => addSessionLog()) : null;
  root.append(header("Журнал сессий", "Хроника решений партии, добычи, последствий и зацепок по игровым датам.", action));
  const visible = visibleSessionLogs().sort((a, b) => ashanaDateIndex(b.date) - ashanaDateIndex(a.date) || b.sessionNumber - a.sessionNumber);
  if (!visible.some((session) => session.id === activeSessionId)) activeSessionId = visible[0]?.id ?? null;
  if (!visible.length) {
    root.append(el("div", "empty-state", "Публичных записей журнала пока нет."));
    return root;
  }
  const active = visible.find((session) => session.id === activeSessionId) ?? visible[0];
  const layout = el("div", "session-layout");
  const list = el("aside", "panel session-list");
  list.append(el("p", "eyebrow", "Хроника"), el("h3", "", "Сессии"));
  visible.forEach((session) => {
    const item = button("", `session-list-card ${session.id === active.id ? "active" : ""}`, () => {
      activeSessionId = session.id;
      render();
    });
    item.append(
      el("strong", "", `#${session.sessionNumber} ${session.title}`),
      el("span", "", formatAshanaDate(session.date)),
      compactBadges([session.public ? "игрокам" : "скрыто", session.players || "без состава"])
    );
    list.append(item);
  });
  layout.append(list, sessionDetail(active));
  root.append(layout);
  return root;
}

function sessionDetail(session) {
  const detail = el("section", "panel session-detail");
  detail.append(
    el("p", "eyebrow", `Сессия #${session.sessionNumber}`),
    el("h3", "", session.title),
    compactBadges([formatAshanaDate(session.date), ashanaWeekday(session.date), session.public ? "игрокам" : "скрыто"]),
    directoryMeta([
      ["Состав", session.players],
      ["Добыча", session.loot],
    ])
  );
  detail.append(sessionTextBlock("Итоги", session.summary));
  detail.append(sessionTextBlock("Решения партии", session.decisions));
  detail.append(sessionTextBlock("Последствия", session.consequences));
  detail.append(entityLinks(session));
  if (isAdmin && session.gmNotes) detail.append(el("p", "gm-inline", `GM: ${session.gmNotes}`));
  if (isAdmin) detail.append(inlineEditor("Редактировать запись", sessionEditor(session)));
  return detail;
}

function sessionTextBlock(title, text) {
  const block = el("section", "session-text-block");
  block.append(el("h4", "", title), el("p", "", text || "Пока не заполнено."));
  return block;
}

function sessionEditor(session) {
  const form = el("form", "form-grid");
  const fields = linkedEntityFields(session);
  const title = input(session.title);
  const sessionNumber = input(session.sessionNumber);
  const year = input(session.date.year);
  const month = selectInput(monthOptions(), String(session.date.month));
  const day = input(session.date.day);
  const players = input(session.players);
  const summary = textarea(session.summary);
  const decisions = textarea(session.decisions);
  const loot = textarea(session.loot);
  const consequences = textarea(session.consequences);
  const gmNotes = textarea(session.gmNotes);
  const publicInput = document.createElement("input");
  publicInput.type = "checkbox";
  publicInput.checked = session.public;
  [sessionNumber, year, day].forEach((item) => {
    item.type = "number";
    item.min = 1;
  });
  day.max = 36;
  form.append(
    labelWrap("Название", title),
    labelWrap("Номер сессии", sessionNumber),
    labelWrap("Год", year),
    labelWrap("Месяц", month),
    labelWrap("День", day),
    labelWrap("Игроки/состав", players),
    checkboxWrap("Видно игрокам", publicInput),
    labelWrap("Итоги", summary, "span-2"),
    labelWrap("Решения", decisions, "span-2"),
    labelWrap("Добыча", loot, "span-2"),
    labelWrap("Последствия", consequences, "span-2"),
    labelWrap("GM-заметки", gmNotes, "span-2"),
    linkedEntityControls(fields),
    actionRow([
      button("Сохранить запись", "primary-button", null, "submit"),
      button("Удалить запись", "ghost-button", () => deleteSessionLog(session)),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(session, normalizeSessionLog({
      ...session,
      title: title.value,
      sessionNumber: Number(sessionNumber.value || 1),
      date: { year: Number(year.value), month: Number(month.value), day: Number(day.value) },
      public: publicInput.checked,
      players: players.value,
      summary: summary.value,
      decisions: decisions.value,
      loot: loot.value,
      consequences: consequences.value,
      gmNotes: gmNotes.value,
      ...readLinkedEntityFields(fields),
    }));
    saveState();
    render();
  });
  return form;
}

function addSessionLog() {
  if (!isAdmin) return;
  const nextNumber = Math.max(0, ...state.sessionLogs.map((session) => Number(session.sessionNumber || 0))) + 1;
  const session = normalizeSessionLog({
    id: slug("session"),
    title: "Новая сессия",
    sessionNumber: nextNumber,
    date: state.meta.ashanaDate,
    public: false,
    summary: "Краткие итоги сессии.",
  });
  state.sessionLogs.unshift(session);
  activeSessionId = session.id;
  saveState();
  render();
}

function deleteSessionLog(session) {
  if (!confirm(`Удалить запись "${session.title}"?`)) return;
  state.sessionLogs = state.sessionLogs.filter((item) => item.id !== session.id);
  activeSessionId = visibleSessionLogs()[0]?.id ?? null;
  saveState();
  render();
}

function linkedEntityFields(source) {
  return {
    wikiLinks: checkboxList(visibleWiki().map((article) => [article.id, article.title]), source.wikiLinks),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), source.questLinks),
    npcLinks: checkboxList(visibleNpcs().map((npc) => [npc.id, npc.name]), source.npcLinks),
    settlementLinks: checkboxList(visibleSettlements().map((settlement) => [settlement.id, settlement.name]), source.settlementLinks),
    mapLinks: checkboxList(visibleMapRegions().map((region) => [region.id, region.title]), source.mapLinks),
  };
}

function linkedEntityControls(fields) {
  return fragment([
    labelWrap("Связанные Wiki", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    labelWrap("Связанные NPC", fields.npcLinks, "span-2"),
    labelWrap("Связанные поселения", fields.settlementLinks, "span-2"),
    labelWrap("Связанные карты", fields.mapLinks, "span-2"),
  ]);
}

function readLinkedEntityFields(fields) {
  return {
    wikiLinks: checkedValues(fields.wikiLinks),
    questLinks: checkedValues(fields.questLinks),
    npcLinks: checkedValues(fields.npcLinks),
    settlementLinks: checkedValues(fields.settlementLinks),
    mapLinks: checkedValues(fields.mapLinks),
  };
}

function entityLinks(source) {
  return directoryLinks([
    ...linkedWikiByIds(source.wikiLinks ?? []).map((article) => [`Wiki: ${article.title}`, () => openWikiArticle(article.id)]),
    ...linkedQuestsByIds(source.questLinks ?? []).map((quest) => [`Задание: ${quest.title}`, () => openQuest(quest.id)]),
    ...visibleNpcs().filter((npc) => (source.npcLinks ?? []).includes(npc.id)).map((npc) => [`NPC: ${npc.name}`, () => openNpc(npc.id)]),
    ...visibleSettlements().filter((settlement) => (source.settlementLinks ?? []).includes(settlement.id)).map((settlement) => [`Поселение: ${settlement.name}`, () => openSettlement(settlement.id)]),
    ...visibleMapRegions().filter((region) => (source.mapLinks ?? []).includes(region.id)).map((region) => [`Карта: ${region.title}`, () => selectSettlementMap(region.id)]),
  ]);
}

function allGalleryTags() {
  return [...new Set(state.gallery.flatMap((item) => item.tags ?? []))].sort((a, b) => a.localeCompare(b));
}

function renderQuests() {
  const root = el("div");
  const action = isAdmin ? button("Новое задание", "primary-button", () => openQuestCreator()) : null;
  root.append(header("Доска заданий", "Активные, завершенные и скрытые задачи кампании.", action));

  const grid = el("div", "quest-grid");
  filterItems(visibleQuests(), (item) =>
    [item.title, item.status, item.patron, item.reward, item.linked, item.notes].join(" ")
  ).forEach((quest) => {
    const card = el("article", "quest-card");
    const meta = el("div", "quest-meta-grid");
    meta.append(
      questMeta("Заказчик", quest.patron),
      questMeta("Награда", quest.reward),
      questMeta("Связь", quest.linked)
    );
    card.append(
      el("span", `quest-status ${quest.status}`, questStatus(quest.status)),
      el("h3", "", quest.title),
      el("p", "quest-description", quest.notes),
      meta
    );
    if (isAdmin) {
      card.append(el("p", "muted", `GM: ${quest.gmNotes}`), questEditor(quest));
    }
    grid.append(card);
  });

  root.append(grid.children.length ? grid : el("div", "empty-state", "Заданий не найдено"));
  return root;
}

function questMeta(label, value) {
  const item = el("div", "quest-meta-item");
  item.append(el("span", "", label), el("strong", "", value || "—"));
  return item;
}

function rollActorOptions() {
  return [
    ["", "Без персонажа"],
    ["__gm__", "Мастер игры/Ведущий"],
    ...state.characters.map((character) => [character.id, character.name]),
    ...state.npcs.map((npc) => [`npc:${npc.id}`, `NPC: ${npc.name}`]),
  ];
}

function renderRoller() {
  const root = el("div");
  root.append(header("Roll", "Броски костей с выбором персонажа и журналом результатов."));

  const layout = el("div", "roller-layout");
  const panel = el("section", "panel admin-stack");
  const actor = selectInput(rollActorOptions(), rollSelectedActorId);
  const dice = el("div", "dice-grid");
  ROLL_DICE_SIDES.forEach((sides) => {
    dice.append(button(`d${sides}`, "dice-button", () => rollFormula(`1d${sides}`, "", actor.value)));
  });

  const formula = el("input");
  formula.id = "formulaInput";
  formula.placeholder = "1d20+5";
  const diceCount = input(rollSelectedDiceCount);
  diceCount.type = "number";
  diceCount.min = "1";
  diceCount.max = "50";
  diceCount.step = "1";
  const diceSides = selectInput(
    ROLL_DICE_SIDES.map((sides) => [String(sides), `d${sides}`]),
    rollSelectedDiceSides
  );
  const diceModifier = input(0);
  const rememberBuilderSelection = () => {
    rollSelectedActorId = actor.value;
    rollSelectedDiceCount = Math.max(1, Math.min(50, Math.trunc(Number(diceCount.value) || 1)));
    rollSelectedDiceSides = diceSides.value;
    saveUiState();
  };
  actor.addEventListener("change", rememberBuilderSelection);
  diceCount.addEventListener("change", rememberBuilderSelection);
  diceSides.addEventListener("change", rememberBuilderSelection);
  const builder = el("div", "roll-builder");
  builder.append(
    labelWrap("Кол-во", diceCount),
    labelWrap("Кость", diceSides),
    labelWrap("Модификатор", diceModifier)
  );
  const result = el("div", "roll-result");
  const latest = state.rolls[0];
  result.append(
    latest
      ? fragment([el("span", "muted", latest.formula), el("strong", "", latest.total)])
      : el("span", "muted", "Нет бросков")
  );

  panel.append(
    labelWrap("От чьего лица", actor),
    el("h3", "", "Кости"),
    dice,
    el("h3", "", "Конструктор"),
    builder,
    actionRow([
      button("Бросить выбранные", "primary-button", () => {
        const mod = Number(diceModifier.value || 0);
        rollFormula(`${Number(diceCount.value || 1)}d${diceSides.value}${mod >= 0 ? `+${mod}` : mod}`, "", actor.value);
      }),
    ]),
    labelWrap("Формула", formula),
    actionRow([
      button("Бросить", "primary-button", () => rollFormula(formula.value || "1d20", "", actor.value)),
      button("d20 + модификатор", "ghost-button", () => {
        formula.value = "1d20+0";
        formula.focus();
      }),
    ]),
    result
  );

  const logPanel = el("aside", "panel admin-stack");
  logPanel.append(el("h3", "", "Журнал"));
  if (isAdmin) {
    logPanel.append(
      actionRow([
        button("Очистить журнал", "small-button", async () => {
          state.rolls = [];
          saveState();
          await clearCloudRolls();
          render();
        }),
      ])
    );
  }
  logPanel.append(state.rolls.length ? rollLogList(state.rolls) : el("div", "empty-state", "Журнал пуст"));

  layout.append(panel, logPanel);
  root.append(layout);
  return root;
}

function setQuickRollOpen(open) {
  if (!quickRollPanel || !quickRollButton) return;
  quickRollPanel.hidden = !open;
  quickRollButton.setAttribute("aria-expanded", String(open));
  quickRollButton.classList.toggle("active", open);
  if (open) renderQuickRollPanel();
}

function renderQuickRollPanel() {
  if (!quickRollPanel) return;
  quickRollPanel.innerHTML = "";
  const heading = el("div", "quick-roll-heading");
  const headingCopy = el("div");
  headingCopy.append(el("p", "eyebrow", "Доступен в любом разделе"), el("h3", "", "Быстрый Roll"));
  const closeButton = button("×", "icon-button quick-roll-close", () => setQuickRollOpen(false));
  closeButton.title = "Закрыть быстрый Roll";
  closeButton.setAttribute("aria-label", closeButton.title);
  heading.append(headingCopy, closeButton);

  const actor = selectInput(rollActorOptions(), rollSelectedActorId);
  const diceCount = input(rollSelectedDiceCount);
  diceCount.type = "number";
  diceCount.min = "1";
  diceCount.max = "50";
  diceCount.step = "1";
  const diceSides = selectInput(ROLL_DICE_SIDES.map((sides) => [String(sides), `d${sides}`]), rollSelectedDiceSides);
  const modifier = input(0);
  modifier.type = "number";
  modifier.step = "1";
  const latest = state.rolls[0];
  const result = el("div", "quick-roll-result");
  const showResult = (entry) => {
    result.innerHTML = "";
    if (!entry) {
      result.append(el("span", "muted", "Бросков пока нет"));
      return;
    }
    result.append(
      el("span", "muted", `${entry.actor} · ${entry.formula}`),
      el("strong", "", entry.total)
    );
  };
  showResult(latest);
  const remember = () => {
    rollSelectedActorId = actor.value;
    rollSelectedDiceCount = Math.max(1, Math.min(50, Math.trunc(Number(diceCount.value) || 1)));
    rollSelectedDiceSides = diceSides.value;
    saveUiState();
  };
  actor.addEventListener("change", remember);
  diceCount.addEventListener("change", remember);
  diceSides.addEventListener("change", remember);
  const throwSelected = () => {
    remember();
    const mod = Number(modifier.value || 0);
    const entry = rollFormula(`${rollSelectedDiceCount}d${rollSelectedDiceSides}${mod >= 0 ? `+${mod}` : mod}`, "", rollSelectedActorId);
    showResult(entry);
  };
  const quickDice = el("div", "quick-roll-dice");
  ROLL_DICE_SIDES.forEach((sides) => {
    quickDice.append(button(`d${sides}`, "small-button", () => {
      diceCount.value = "1";
      diceSides.value = String(sides);
      remember();
      showResult(rollFormula(`1d${sides}`, "", rollSelectedActorId));
    }));
  });
  const builder = el("div", "quick-roll-builder");
  builder.append(
    labelWrap("Количество", diceCount),
    labelWrap("Кость", diceSides),
    labelWrap("Модификатор", modifier)
  );
  quickRollPanel.append(
    heading,
    labelWrap("От чьего лица", actor),
    quickDice,
    builder,
    button("Бросить", "primary-button quick-roll-submit", throwSelected),
    result,
    button("Открыть полный журнал Roll", "ghost-button quick-roll-full", () => {
      setQuickRollOpen(false);
      setView("roller");
    })
  );
}

function rollActorName(actorId) {
  if (!actorId) return "Без персонажа";
  const value = String(actorId);
  if (value === "__gm__") return "Мастер игры/Ведущий";
  if (value.startsWith("npc:")) {
    return state.npcs.find((npc) => npc.id === value.slice(4))?.name ?? "Неизвестный NPC";
  }
  return state.characters.find((character) => character.id === value)?.name ?? "Без персонажа";
}

function rollFormula(formula, label = "", actorId = activeCharacterId) {
  const parsed = parseRoll(formula.trim());
  if (!parsed) {
    alert("Формат: 1d20+5, 2d6, d1000");
    return;
  }

  rollSelectedActorId = actorId == null ? "" : String(actorId);
  rollSelectedDiceCount = parsed.count;
  if (ROLL_DICE_SIDES.includes(parsed.sides)) {
    rollSelectedDiceSides = String(parsed.sides);
  }
  saveUiState();

  const rolls = Array.from({ length: parsed.count }, () => 1 + Math.floor(Math.random() * parsed.sides));
  const total = rolls.reduce((sum, value) => sum + value, 0) + parsed.modifier;
  const actor = rollActorName(actorId);
  const timestamp = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(),
    actor,
    label,
    formula: normalizeRoll(parsed),
    rolls,
    total,
    timestamp,
    createdAt: new Date(timestamp).toLocaleString("ru-RU"),
  };
  state.rolls.unshift(entry);
  state.rolls = state.rolls.slice(0, 200);
  saveState();
  saveRollToCloud(entry);
  render();
  showRollPopup(entry);
  return entry;
}

function showRollPopup(log) {
  const old = document.querySelector(".roll-popup");
  if (old) {
    old.cleanupRollAnimation?.();
    old.remove();
  }
  const popup = el("div", "roll-popup");
  const parsed = parseRoll(log.formula) ?? { sides: Math.max(...log.rolls, 20), modifier: 0 };
  const animation = createRollAnimation(log, parsed);
  popup.append(
    el("p", "eyebrow", log.actor),
    el("h3", "", log.label || "Бросок"),
    animation.node,
    el("strong", "roll-popup-total", log.total),
    el("p", "muted", `${log.formula} → [${log.rolls.join(", ")}]`)
  );
  const close = button("Закрыть", "small-button", () => {
    animation.cleanup?.();
    popup.remove();
  });
  popup.append(close);
  popup.cleanupRollAnimation = animation.cleanup;
  document.body.append(popup);
  setTimeout(() => {
    animation.cleanup?.();
    popup.remove();
  }, 5600);
}

function createRollAnimation(log, parsed) {
  if (globalThis.THREE?.WebGLRenderer) return createThreeRollStage(log, parsed);
  return createSvgRollStage(log, parsed);
}

function createSvgRollStage(log, parsed) {
  const diceStage = el("div", `roll-animation-stage ${log.rolls.length > 1 ? "multi" : ""}`);
  const visibleRolls = log.rolls.slice(0, 8);
  visibleRolls.forEach((rollValue, index) => {
    const die = createRollDie(parsed.sides);
    diceStage.append(die);
    animateRollDie(die, rollValue, parsed.sides, index * 90);
  });
  if (log.rolls.length > visibleRolls.length) {
    diceStage.append(el("div", "roll-extra-dice", `+${log.rolls.length - visibleRolls.length}`));
  }
  return { node: diceStage, cleanup: () => {} };
}

function createThreeRollStage(log, parsed) {
  const THREE = globalThis.THREE;
  const stage = el("div", "roll-three-stage");
  const resultBadge = el("div", "roll-three-result", "?");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const visibleRolls = log.rolls.slice(0, 5);
  const diceAmount = visibleRolls.length;
  const rollsSum = log.rolls.reduce((sum, value) => sum + value, 0);
  const totalLabel = parsed.modifier
    ? `Σ ${rollsSum} ${parsed.modifier > 0 ? `+${parsed.modifier}` : parsed.modifier} = ${log.total}`
    : `Σ ${rollsSum}`;
  if (diceAmount > 1) stage.classList.add("multi");
  const valuesLayer = el("div", "roll-three-values");
  const valueBadges = (diceAmount > 1 ? visibleRolls : []).map((_rollValue, index) => {
    const badge = el("span", "roll-three-die-value", "?");
    badge.style.left = `${dieBadgeLeft(index, diceAmount)}%`;
    valuesLayer.append(badge);
    return badge;
  });
  const width = diceAmount > 1 ? 380 : 300;
  const height = diceAmount > 1 ? 212 : 170;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  stage.append(renderer.domElement, valuesLayer, resultBadge);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, diceAmount > 1 ? 3.0 : 2.8, diceAmount > 1 ? 7.4 : 6.1);
  camera.lookAt(0, 0.25, 0);
  scene.add(new THREE.HemisphereLight(0xfff1cf, 0x1b2426, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffdf96, 3.4);
  keyLight.position.set(2.2, 4.4, 3.2);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(diceAmount > 1 ? 4.4 : 3.2, 64),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.08;
  floor.receiveShadow = true;
  scene.add(floor);

  const spacing = diceAmount > 1 ? 1.8 : 0;
  const baseScale = diceAmount >= 4 ? 0.68 : diceAmount === 3 ? 0.78 : diceAmount === 2 ? 0.86 : 1;
  const groups = visibleRolls.map((rollValue, index) => {
    const group = createThreeDieGroup(parsed.sides);
    group.position.x = (index - (visibleRolls.length - 1) / 2) * spacing;
    group.position.y = 1.8 + Math.random() * 0.5;
    group.scale.setScalar(baseScale);
    group.userData = {
      finalValue: rollValue,
      baseScale,
      startRotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: new THREE.Vector3(8 + Math.random() * 3, 10 + Math.random() * 4, 7 + Math.random() * 3),
      finalRotation: new THREE.Euler(Math.random() * 0.55, Math.random() * 0.55, Math.random() * 0.55),
      delay: index * 90,
    };
    group.rotation.copy(group.userData.startRotation);
    scene.add(group);
    return group;
  });

  let frameId = 0;
  let stopped = false;
  const duration = 1700;
  const startedAt = performance.now();
  const animate = (now) => {
    if (stopped) return;
    let allDone = true;
    groups.forEach((group) => {
      const t = Math.max(0, Math.min(1, (now - startedAt - group.userData.delay) / duration));
      if (t < 1) allDone = false;
      const eased = 1 - Math.pow(1 - t, 3);
      const bounce = Math.sin(t * Math.PI * 2.8) * (1 - eased) * 0.58;
      group.position.y = -0.2 + (1 - eased) * 2.2 + Math.max(0, bounce);
      group.position.x += Math.sin(now / 180 + group.userData.delay) * 0.0015 * (1 - eased);
      group.rotation.x = group.userData.startRotation.x + group.userData.spin.x * (1 - Math.pow(1 - t, 2)) + group.userData.finalRotation.x * eased;
      group.rotation.y = group.userData.startRotation.y + group.userData.spin.y * (1 - Math.pow(1 - t, 2)) + group.userData.finalRotation.y * eased;
      group.rotation.z = group.userData.startRotation.z + group.userData.spin.z * (1 - Math.pow(1 - t, 2)) + group.userData.finalRotation.z * eased;
      group.scale.setScalar(group.userData.baseScale * (1 + Math.sin(t * Math.PI) * 0.04));
    });
    renderer.render(scene, camera);
    if (allDone) {
      valueBadges.forEach((badge, index) => {
        badge.textContent = visibleRolls[index];
        badge.classList.add("shown");
      });
      resultBadge.textContent = visibleRolls.length === 1 ? visibleRolls[0] : totalLabel;
      resultBadge.classList.add("shown");
    }
    frameId = requestAnimationFrame(animate);
  };
  frameId = requestAnimationFrame(animate);

  return {
    node: stage,
    cleanup: () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      renderer.dispose();
      stage.remove();
    },
  };
}

function dieBadgeLeft(index, count) {
  if (count <= 1) return 50;
  const spread = Math.min(78, 23 * (count - 1));
  return 50 + (index - (count - 1) / 2) * (spread / (count - 1));
}

function createThreeDieGroup(sides) {
  const THREE = globalThis.THREE;
  const group = new THREE.Group();
  const geometry = threeDiceGeometry(sides);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd4a74f,
    roughness: 0.48,
    metalness: 0.18,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x5b3d16, transparent: true, opacity: 0.58 })
  );
  group.add(edges);
  return group;
}

function threeDiceGeometry(sides) {
  const THREE = globalThis.THREE;
  const value = Number(sides);
  if (value === 4) return new THREE.TetrahedronGeometry(1.05, 0);
  if (value === 6) return new THREE.BoxGeometry(1.45, 1.45, 1.45);
  if (value === 8) return new THREE.OctahedronGeometry(1.12, 0);
  if (value === 10) return bipyramidGeometry(10, 1.03, 1.45);
  if (value === 12) return new THREE.DodecahedronGeometry(1.1, 0);
  if (value === 20) return new THREE.IcosahedronGeometry(1.12, 0);
  if (value === 100 || value === 1000) return new THREE.SphereGeometry(1.06, value === 1000 ? 24 : 18, 12);
  return new THREE.IcosahedronGeometry(1.08, 0);
}

function bipyramidGeometry(segments = 10, radius = 1, height = 1.35) {
  const THREE = globalThis.THREE;
  const vertices = [[0, height / 2, 0], [0, -height / 2, 0]];
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    vertices.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
  }
  const indices = [];
  for (let index = 0; index < segments; index += 1) {
    const current = 2 + index;
    const next = 2 + ((index + 1) % segments);
    indices.push(0, current, next, 1, next, current);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createRollDie(sides) {
  const visual = diceVisualClass(sides);
  const die = el("div", `roll-die ${visual}`);
  die.append(diceShapeSvg(sides), el("span", "roll-die-face", "?"), el("small", "roll-die-type", `d${sides}`));
  return die;
}

function diceVisualClass(sides) {
  if ([4, 6, 8, 10, 12, 20, 100, 1000].includes(Number(sides))) return `die-d${sides}`;
  return "die-poly";
}

function diceShapeSvg(sides) {
  const svg = svgEl("svg", { class: "roll-die-shape", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false" });
  const body = svgEl("polygon", { class: "die-body", points: diceShapePoints(sides) });
  svg.append(body);
  const facets = diceFacetPath(sides);
  if (facets) svg.append(svgEl("path", { class: "die-facets", d: facets }));
  if (Number(sides) === 6) {
    svg.innerHTML = "";
    svg.append(svgEl("rect", { class: "die-body", x: "7", y: "7", width: "86", height: "86", rx: "15" }));
    svg.append(svgEl("path", { class: "die-facets", d: "M50 8 L50 92 M8 50 L92 50 M20 20 L80 80 M80 20 L20 80" }));
  }
  if (Number(sides) === 100 || Number(sides) === 1000) {
    svg.innerHTML = "";
    svg.append(svgEl("circle", { class: "die-body", cx: "50", cy: "50", r: "43" }));
    svg.append(svgEl("path", { class: "die-facets", d: "M50 7 C34 24 34 76 50 93 M50 7 C66 24 66 76 50 93 M7 50 H93 M18 28 C37 38 63 38 82 28 M18 72 C37 62 63 62 82 72" }));
  }
  return svg;
}

function diceShapePoints(sides) {
  const value = Number(sides);
  if (value === 4) return "50,5 94,91 6,91";
  if (value === 8) return "50,2 96,50 50,98 4,50";
  if (value === 10) return "50,2 92,27 78,94 22,94 8,27";
  if (value === 12) return "50,3 76,10 96,33 91,68 65,94 35,94 9,68 4,33 24,10";
  if (value === 20) return "50,2 76,9 96,30 96,60 78,88 50,98 22,88 4,60 4,30 24,9";
  return "50,2 82,13 98,42 89,76 62,96 38,96 11,76 2,42 18,13";
}

function diceFacetPath(sides) {
  const value = Number(sides);
  if (value === 4) return "M50 5 L50 91 M50 38 L6 91 M50 38 L94 91";
  if (value === 8) return "M50 2 L50 98 M4 50 H96 M50 2 L4 50 M50 2 L96 50 M50 98 L4 50 M50 98 L96 50";
  if (value === 10) return "M50 2 L50 94 M8 27 L92 27 M22 94 L50 45 L78 94 M8 27 L50 45 L92 27";
  if (value === 12) return "M50 3 L65 94 M50 3 L35 94 M4 33 L96 33 M9 68 L91 68 M24 10 L50 50 L76 10 M35 94 L50 50 L65 94";
  if (value === 20) return "M50 2 L50 98 M4 30 L96 60 M96 30 L4 60 M24 9 L78 88 M76 9 L22 88 M4 30 L50 46 L96 30 M4 60 L50 46 L96 60 M22 88 L50 46 L78 88";
  return "M50 2 L50 96 M2 42 L98 42 M11 76 L89 76 M18 13 L50 50 L82 13 M38 96 L50 50 L62 96";
}

function svgEl(tag, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function animateRollDie(die, finalFace, sides, delay = 0) {
  const face = die.querySelector(".roll-die-face");
  const safeSides = Math.max(2, Number(sides || 20));
  setTimeout(() => {
    die.classList.add("rolling");
    const startedAt = performance.now();
    const duration = 1180;
    let lastFaceChange = 0;
    const step = (now) => {
      if (now - lastFaceChange > 135) {
        face.textContent = 1 + Math.floor(Math.random() * safeSides);
        lastFaceChange = now;
      }
      if (now - startedAt < duration) {
        requestAnimationFrame(step);
        return;
      }
      face.textContent = finalFace;
      die.classList.remove("rolling");
      die.classList.add("landed");
    };
    requestAnimationFrame(step);
  }, delay);
}

function parseRoll(input) {
  const match = input.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;
  const count = Math.min(Number(match[1] || 1), 50);
  const sides = Math.min(Number(match[2]), 1000);
  const modifier = Number(match[3] || 0);
  if (count < 1 || sides < 2) return null;
  return { count, sides, modifier };
}

function normalizeRoll(roll) {
  const mod = roll.modifier === 0 ? "" : roll.modifier > 0 ? `+${roll.modifier}` : `${roll.modifier}`;
  return `${roll.count}d${roll.sides}${mod}`;
}

function rollLogList(logs) {
  const list = el("div", "log-list");
  logs.forEach((log) => {
    const item = el("div", "log-item");
    item.append(
      el("strong", "", `${log.actor}${log.label ? ` · ${log.label}` : ""}: ${log.total}`),
      el("div", "muted", `${log.formula} → [${log.rolls.join(", ")}] · ${log.createdAt}`)
    );
    list.append(item);
  });
  return list;
}

function dataProtectionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "дата неизвестна";
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dataProtectionSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} Б`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / (1024 ** 2)).toFixed(1)} МБ`;
}

function backupKindLabel(kind) {
  return {
    daily: "Ежедневный",
    weekly: "Понедельничный архив",
    revision: "Перед сохранением",
    initial: "Первичный снимок",
    pre_restore: "Перед восстановлением",
    manual: "Ручной",
  }[kind] || kind || "Резервная копия";
}

function downloadLocalSafetySnapshot(snapshot) {
  const blob = new Blob([JSON.stringify(snapshot.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashana-local-safety-${snapshot.createdAt.replaceAll(":", "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function restoreLocalSafetySnapshot(snapshot) {
  const summary = localSafetySnapshotSummary(snapshot);
  if (!confirm(`Восстановить локальный страховочный снимок от ${dataProtectionDate(snapshot.createdAt)}? В нём: ${summary.names}. Текущая облачная версия перед заменой попадёт в серверную историю.`)) return;
  const previousState = structuredClone(state);
  state = normalizeState(structuredClone(snapshot.data));
  saveState();
  const saved = await flushCloudSave({ immediate: true });
  if (!saved) {
    render();
    preserveLocalSafetySnapshot(state, previousState, "Восстановление ожидает подтверждения Supabase");
    return;
  }
  dataProtectionLoaded = false;
  renderCharacterSelect();
  render();
  alert("Локальный страховочный снимок восстановлен в общей базе.");
}

function trashGroups() {
  const groups = new Map();
  dataProtectionTrash.forEach((row) => {
    const key = row.batch_id || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.values()].sort((a, b) => new Date(b[0].deleted_at) - new Date(a[0].deleted_at));
}

async function loadDataProtectionData(force = false) {
  if (!isAdmin || !supabaseClient || dataProtectionLoading || (dataProtectionLoaded && !force)) return;
  dataProtectionLoading = true;
  dataProtectionError = "";
  const now = new Date().toISOString();
  const [trashResult, backupResult] = await Promise.all([
    supabaseClient
      .from("campaign_trash")
      .select("id,batch_id,item_type,item_label,restore_path,item_index,item_data,deleted_at,expires_at")
      .eq("campaign_id", "main")
      .gt("expires_at", now)
      .order("deleted_at", { ascending: false })
      .limit(240),
    supabaseClient
      .from("campaign_state_backups")
      .select("id,backup_kind,is_weekly,created_at,source_updated_at,size_bytes")
      .eq("campaign_id", "main")
      .order("created_at", { ascending: false })
      .limit(240),
  ]);
  if (trashResult.error || backupResult.error) {
    dataProtectionError = trashResult.error?.message || backupResult.error?.message || "Не удалось загрузить данные защиты.";
  } else {
    dataProtectionTrash = trashResult.data ?? [];
    dataProtectionBackups = backupResult.data ?? [];
    dataProtectionLoaded = true;
  }
  dataProtectionLoading = false;
  if (currentView === "admin" && isAdmin) render();
}

async function restoreTrashGroup(firstRow) {
  const batchRows = dataProtectionTrash.filter((row) =>
    firstRow.batch_id ? row.batch_id === firstRow.batch_id : row.id === firstRow.id
  );
  if (!batchRows.length) return;
  const names = batchRows.slice(0, 4).map((row) => `«${row.item_label}»`).join(", ");
  const suffix = batchRows.length > 4 ? ` и ещё ${batchRows.length - 4}` : "";
  if (!confirm(`Восстановить ${names}${suffix} на прежние места?`)) return;

  const previousState = structuredClone(state);
  const restoredRows = [];
  const failedRows = [];
  [...batchRows]
    .sort((a, b) => (a.restore_path?.length || 0) - (b.restore_path?.length || 0))
    .forEach((row) => {
      const result = restoreTrashEntry(row);
      if (result.restored) restoredRows.push(row);
      else failedRows.push({ row, reason: result.reason });
    });

  if (!restoredRows.length) {
    alert(failedRows.map(({ row, reason }) => `${row.item_label}: ${reason}`).join("\n"));
    return;
  }

  state = normalizeState(state);
  saveState();
  const saved = await flushCloudSave({ immediate: true });
  if (!saved) {
    render();
    preserveLocalSafetySnapshot(state, previousState, "Восстановление корзины ожидает подтверждения Supabase");
    return;
  }

  const { error } = await supabaseClient
    .from("campaign_trash")
    .delete()
    .in("id", restoredRows.map((row) => row.id));
  if (error) console.warn("Восстановленные записи не удалены из корзины:", error.message);
  dataProtectionLoaded = false;
  renderCharacterSelect();
  await loadDataProtectionData(true);
  const failedText = failedRows.length ? ` Не восстановлено: ${failedRows.map(({ row }) => row.item_label).join(", ")}.` : "";
  alert(`Восстановлено объектов: ${restoredRows.length}.${failedText}`);
}

async function restoreCampaignBackup(backup) {
  const date = dataProtectionDate(backup.created_at);
  if (!confirm(`Полностью заменить текущую кампанию резервной копией от ${date}? Перед заменой Supabase автоматически сохранит ещё один страховочный снимок.`)) return;
  const { error } = await supabaseClient.rpc("restore_campaign_backup", { p_backup_id: backup.id });
  if (error) {
    alert(`Не удалось восстановить резервную копию: ${error.message}`);
    return;
  }
  dataProtectionLoaded = false;
  await loadCloudState();
  await loadDataProtectionData(true);
  alert(`Кампания восстановлена из резервной копии от ${date}.`);
}

async function downloadCampaignBackup(backup) {
  const { data, error } = await supabaseClient
    .from("campaign_state_backups")
    .select("data,created_at")
    .eq("id", backup.id)
    .single();
  if (error || !data?.data) {
    alert(`Не удалось скачать резервную копию: ${error?.message || "данные не найдены"}`);
    return;
  }
  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashana-backup-${new Date(data.created_at).toISOString().replaceAll(":", "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function dataProtectionPanel() {
  const panel = el("section", "admin-panel admin-stack data-protection-panel");
  const heading = el("div", "data-protection-heading");
  const copy = el("div");
  copy.append(
    el("h3", "", "Защита данных"),
    el("p", "muted", `Удалённые объекты хранятся ${TRASH_RETENTION_DAYS} дней. Перед каждым облачным сохранением создаётся страховочная ревизия; дополнительно хранятся ежедневные и понедельничные снимки.`)
  );
  heading.append(copy, button("Обновить", "ghost-button", () => loadDataProtectionData(true)));
  panel.append(heading);

  if (dataProtectionLoading && !dataProtectionLoaded) {
    panel.append(el("div", "data-protection-message", "Загружаю корзину и резервные копии…"));
    return panel;
  }
  if (dataProtectionError) {
    panel.append(el("div", "data-protection-error", `Система защиты недоступна: ${dataProtectionError}`));
    return panel;
  }

  const columns = el("div", "data-protection-columns");
  const trashSection = el("section", "data-protection-section");
  trashSection.append(el("h4", "", `Корзина · ${dataProtectionTrash.length}`));
  const trashList = el("div", "data-protection-list");
  const groups = trashGroups();
  if (!groups.length) {
    trashList.append(el("p", "data-protection-empty", "Корзина пуста."));
  } else {
    groups.forEach((group) => {
      const row = group[0];
      const card = el("article", "data-protection-row");
      const labels = group.slice(0, 4).map((item) => item.item_label).join(" · ");
      const remaining = Math.max(0, Math.ceil((new Date(row.expires_at) - Date.now()) / 86400000));
      const info = el("div", "data-protection-copy");
      info.append(
        el("strong", "", group.length > 1 ? `${row.item_type} и ещё ${group.length - 1}` : row.item_label),
        el("span", "", group.length > 1 ? labels : row.item_type),
        el("small", "", `${dataProtectionDate(row.deleted_at)} · осталось ${remaining} дн.`)
      );
      card.append(info, button("Восстановить", "small-button", () => restoreTrashGroup(row)));
      trashList.append(card);
    });
  }
  trashSection.append(trashList);

  const backupSection = el("section", "data-protection-section");
  backupSection.append(el("h4", "", `Резервные копии · ${dataProtectionBackups.length}`));
  const backupList = el("div", "data-protection-list");
  if (!dataProtectionBackups.length) {
    backupList.append(el("p", "data-protection-empty", "Резервных копий пока нет."));
  } else {
    dataProtectionBackups.forEach((backup) => {
      const card = el("article", `data-protection-row ${backup.is_weekly ? "is-weekly" : ""}`);
      const info = el("div", "data-protection-copy");
      info.append(
        el("strong", "", dataProtectionDate(backup.created_at)),
        el("span", "", `${backupKindLabel(backup.backup_kind)} · ${dataProtectionSize(backup.size_bytes)}`),
        el("small", "", backup.is_weekly ? "Хранится бессрочно" : "Полный снимок кампании")
      );
      card.append(
        info,
        actionRow([
          button("Скачать", "ghost-button", () => downloadCampaignBackup(backup)),
          button("Восстановить", "small-button", () => restoreCampaignBackup(backup)),
        ], "data-protection-actions")
      );
      backupList.append(card);
    });
  }
  backupSection.append(backupList);
  columns.append(trashSection, backupSection);
  const localSection = el("section", "data-protection-section");
  localSection.append(el("h4", "", `Локальные страховочные снимки · ${localSafetySnapshots.length}`));
  const localList = el("div", "data-protection-list");
  if (!localSafetySnapshots.length) {
    localList.append(el("p", "data-protection-empty", "Локальных снимков в этом браузере пока нет."));
  } else {
    localSafetySnapshots.forEach((snapshot) => {
      const summary = localSafetySnapshotSummary(snapshot);
      const info = el("div", "data-protection-copy");
      info.append(
        el("strong", "", dataProtectionDate(snapshot.createdAt)),
        el("span", "", `${summary.settlements} поселений · ${summary.buildings} построек`),
        el("small", "", `${snapshot.reason} · ${summary.names}`)
      );
      const card = el("article", "data-protection-row");
      card.append(info, actionRow([
        button("Скачать", "ghost-button", () => downloadLocalSafetySnapshot(snapshot)),
        button("Восстановить", "small-button", () => restoreLocalSafetySnapshot(snapshot)),
      ], "data-protection-actions"));
      localList.append(card);
    });
  }
  localSection.append(localList);
  panel.append(columns, localSection);
  return panel;
}

function renderAdmin() {
  const root = el("div");
  root.append(header("Админ", "Вход мастера для редактирования общей базы кампании."));

  if (!isAdmin) {
    const panel = el("section", "admin-panel admin-stack");
    panel.append(
      el("h3", "", "Режим гостя"),
      el("p", "", "Игрокам вход не нужен: общая база открывается для чтения автоматически. Вход здесь нужен только мастерам для редактирования."),
      button("Войти", "primary-button", () => loginDialog.showModal())
    );
    root.append(panel);
    return root;
  }

  const stack = el("div", "admin-stack");
  const meta = el("section", "admin-panel");
  meta.append(el("h3", "", "Кампания"), campaignEditor());
  const create = el("section", "admin-panel");
  create.append(el("h3", "", "Новая wiki-запись"), wikiCreator());
  const tagsPanel = tagLibraryPanel();
  const protectionPanel = dataProtectionPanel();
  const dataPanel = el("section", "admin-panel admin-stack");
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        state = normalizeState(JSON.parse(String(reader.result || "{}")));
        saveState();
        renderCharacterSelect();
        render();
      } catch {
        alert("Не удалось импортировать JSON кампании.");
      }
    });
    reader.readAsText(file, "utf-8");
  });
  dataPanel.append(
    el("h3", "", "Данные"),
    el("p", "muted", "Экспортируй базу перед большими изменениями. Импорт полностью заменяет локальные данные. Облачная база Supabase является общей для всех вошедших игроков."),
    actionRow([
      button("Экспорт JSON", "ghost-button", () => exportCampaign()),
      button("Залить локальные данные в облако", "ghost-button", async () => {
        if (!confirm("Заменить общую облачную базу текущими данными из этого браузера?")) return;
        markCloudSavePending(compactStateForStorage(state));
        await flushCloudSave({ immediate: true });
      }),
      button("Проверить сохранение", "ghost-button", runCloudSaveSelfCheck),
      button("Обновить из облака", "ghost-button", () => loadCloudState()),
      button("Сбросить к демо", "ghost-button", () => {
        if (confirm("Сбросить локальные данные кампании?")) {
          state = normalizeState(structuredClone(seedData));
          saveState();
          renderCharacterSelect();
          render();
        }
      }),
      button("Выйти из аккаунта", "ghost-button", () => signOutSupabase()),
    ]),
    labelWrap("Импорт JSON", importInput)
  );
  stack.append(meta, create, protectionPanel, tagsPanel, dataPanel);
  root.append(stack);
  if (!dataProtectionLoaded && !dataProtectionLoading) {
    requestAnimationFrame(() => loadDataProtectionData());
  }
  return root;
}

function tagLibraryPanel() {
  registerTags(collectCampaignTags());
  const panel = el("section", "admin-panel admin-stack");
  const createForm = el("form", "search-form");
  const newTag = input("");
  newTag.placeholder = "Новый тег";
  createForm.append(newTag, button("Добавить тег", "small-button", null, "submit"));
  createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const clean = normalizeTagName(newTag.value);
    if (!clean) return;
    registerTags([clean], true);
    newTag.value = "";
    tagLibrarySortMode = "newest";
    tagLibraryPage = 0;
    saveUiState();
    saveState();
    render();
  });

  const search = input(tagLibrarySearchTerm);
  search.placeholder = "Поиск по тегам";
  const sort = selectInput([
    ["newest", "Сначала новые"],
    ["oldest", "Сначала старые"],
    ["az", "По алфавиту А-Я"],
    ["za", "По алфавиту Я-А"],
    ["empty", "Сначала без описания"],
    ["with-image", "Сначала с картинкой"],
  ], tagLibrarySortMode);
  const pageSize = 10;
  const allTags = Object.entries(state.tagMeta ?? {}).map(([name, meta]) => ({
    name,
    meta: tagMetaByName(name),
    searchable: [name, meta?.description, meta?.public ? "видно игрокам" : "скрыто", meta?.image ? "картинка" : ""].join(" ").toLowerCase(),
  }));
  const query = normalizeTagName(tagLibrarySearchTerm);
  const filteredTags = allTags
    .filter((item) => !query || item.searchable.includes(query))
    .sort((a, b) => compareTagLibraryItems(a, b, tagLibrarySortMode));
  const maxPage = Math.max(0, Math.ceil(filteredTags.length / pageSize) - 1);
  if (tagLibraryPage > maxPage) tagLibraryPage = maxPage;
  if (tagLibraryPage < 0) tagLibraryPage = 0;
  const pageStart = tagLibraryPage * pageSize;
  const pageItems = filteredTags.slice(pageStart, pageStart + pageSize);
  const controls = el("div", "tag-library-controls");
  search.addEventListener("input", () => {
    tagLibrarySearchTerm = search.value;
    tagLibraryPage = 0;
    saveUiState();
    render();
  });
  sort.addEventListener("change", () => {
    tagLibrarySortMode = sort.value;
    tagLibraryPage = 0;
    saveUiState();
    render();
  });
  controls.append(
    labelWrap("Поиск", search),
    labelWrap("Сортировка", sort)
  );

  const grid = el("div", "tag-library-grid");
  pageItems.forEach(({ name }) => {
    grid.append(tagMetaEditor(name));
  });
  const pager = el("div", "tag-library-pager");
  const from = filteredTags.length ? pageStart + 1 : 0;
  const to = Math.min(filteredTags.length, pageStart + pageSize);
  pager.append(
    el("span", "muted", `Показано ${from}-${to} из ${filteredTags.length}`),
    button("Назад", "ghost-button", () => {
      tagLibraryPage = Math.max(0, tagLibraryPage - 1);
      saveUiState();
      render();
    }),
    el("span", "tag-library-page", `${tagLibraryPage + 1} / ${maxPage + 1}`),
    button("Далее", "ghost-button", () => {
      tagLibraryPage = Math.min(maxPage, tagLibraryPage + 1);
      saveUiState();
      render();
    })
  );
  const pagerButtons = pager.querySelectorAll("button");
  if (pagerButtons[0]) pagerButtons[0].disabled = tagLibraryPage <= 0;
  if (pagerButtons[1]) pagerButtons[1].disabled = tagLibraryPage >= maxPage;

  panel.append(
    el("h3", "", "Справочник тегов"),
    el("p", "muted", "Эти описания показываются игрокам при наведении на тег. Картинку и текст можно менять в любой момент."),
    createForm,
    controls,
    filteredTags.length ? fragment([grid, pager]) : el("div", "empty-state compact-empty", "По этому запросу тегов нет.")
  );
  return panel;
}

function compareTagLibraryItems(a, b, mode) {
  if (mode === "oldest") return (a.meta.createdAt || "").localeCompare(b.meta.createdAt || "") || a.name.localeCompare(b.name, "ru");
  if (mode === "az") return a.name.localeCompare(b.name, "ru");
  if (mode === "za") return b.name.localeCompare(a.name, "ru");
  if (mode === "empty") {
    const aEmpty = Number(!a.meta.description || a.meta.description === defaultTagDescription(a.name));
    const bEmpty = Number(!b.meta.description || b.meta.description === defaultTagDescription(b.name));
    return bEmpty - aEmpty || a.name.localeCompare(b.name, "ru");
  }
  if (mode === "with-image") return Number(Boolean(b.meta.image)) - Number(Boolean(a.meta.image)) || a.name.localeCompare(b.name, "ru");
  return (b.meta.createdAt || "").localeCompare(a.meta.createdAt || "") || a.name.localeCompare(b.name, "ru");
}

function tagMetaEditor(tagName) {
  const meta = tagMetaByName(tagName);
  const card = el("article", "tag-library-card");
  const preview = el("div", "tag-library-preview");
  const form = el("form", "form-grid compact-form");
  const description = textarea(meta.description);
  const publicInput = document.createElement("input");
  const imageInput = document.createElement("input");
  let imageValue = meta.image;
  const imageStyle = { ...defaultImageStyle(), ...(meta.imageStyle ?? {}) };
  const aspect = selectInput([
    ["wide", "Широкий 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([
    ["cover", "Обрезать по рамке"],
    ["contain", "Вписать целиком"],
  ], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 2.5, 0.05);
  const refreshPreview = () => {
    preview.innerHTML = "";
    preview.className = `tag-library-preview image-aspect-${aspect.value}`;
    if (!imageValue) {
      preview.append(el("span", "", "#"));
      return;
    }
    const img = document.createElement("img");
    img.src = imageValue;
    img.alt = tagName;
    img.style.objectFit = fit.value;
    img.style.objectPosition = `${posX.value}% ${posY.value}%`;
    img.style.transform = `scale(${zoom.value})`;
    preview.append(img);
  };
  [aspect, fit, posX, posY, zoom].forEach((control) => control.addEventListener("input", refreshPreview));
  refreshPreview();
  publicInput.type = "checkbox";
  publicInput.checked = meta.public;
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "tags");
    refreshPreview();
  });
  form.append(
    labelWrap("Описание", description, "span-2"),
    checkboxWrap("Видно игрокам", publicInput),
    labelWrap("Картинка", imageInput, "span-2"),
    labelWrap("Формат картинки", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб обрезки", zoom, "span-2"),
    actionRow([
      button("Сохранить тег", "primary-button", null, "submit"),
      button("Убрать картинку", "ghost-button", () => {
        imageValue = "";
        refreshPreview();
      }),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.tagMeta[tagName] = normalizeTagMetaEntry(tagName, {
      ...state.tagMeta[tagName],
      description: description.value,
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
      },
      public: publicInput.checked,
    });
    saveState();
    render();
  });
  card.append(preview, el("h4", "", tagName), tagChip(tagName), form);
  return card;
}

function exportCampaign() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashana-campaign-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function campaignEditor() {
  const form = el("form", "form-grid");
  const name = input(state.meta.campaignName);
  const region = input(state.meta.currentRegion);
  const year = input(state.meta.ashanaDate.year);
  const month = selectInput(monthOptions(), String(state.meta.ashanaDate.month));
  const day = input(state.meta.ashanaDate.day);
  year.type = "number";
  year.min = 1;
  day.type = "number";
  day.min = 1;
  day.max = 36;
  form.append(
    labelWrap("Название", name, "span-2"),
    labelWrap("Текущий регион", region, "span-2"),
    labelWrap("Год Асханы", year),
    labelWrap("Месяц", month),
    labelWrap("День", day),
    actionRow([button("Сохранить", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.meta.campaignName = name.value;
    state.meta.currentRegion = region.value;
    setCurrentAshanaDate({ year: Number(year.value), month: Number(month.value), day: Number(day.value) });
    saveState();
    render();
  });
  return form;
}

function wikiCreator() {
  const article = { title: "", category: "Места", categoryId: "places", tags: "", body: "", gmBody: "", image: "", imageStyle: defaultImageStyle(), public: true };
  return wikiForm(article, (values) => {
    const nextTags = csv(values.tags);
    registerTags(nextTags, true);
    const article = normalizeWikiArticle({
      id: slug(values.title),
      title: values.title,
      category: values.category,
      categoryId: values.categoryId,
      tags: nextTags,
      body: values.body,
      gmBody: values.gmBody,
      image: values.image,
      imageStyle: values.imageStyle,
      npcStatProfile: values.npcStatProfile,
      public: values.public,
    });
    state.wiki.unshift(article);
    selectWikiArticle(article.id, { clearTag: true });
    saveState();
    setView("wiki");
  });
}

function wikiEditor(article) {
  const box = el("div", "admin-panel");
  const draftValues = wikiDraftValuesFor(article.id);
  const formArticle = {
    ...article,
    ...(draftValues ?? {}),
    tags: draftValues?.tags ?? article.tags.join(", "),
    category: wikiCategoryTitle(draftValues?.categoryId ?? article.categoryId),
  };
  box.append(el("h3", "", "Редактирование"), wikiForm(
    formArticle,
    (values) => {
      const nextTags = csv(values.tags);
      registerTags(nextTags, true);
      Object.assign(article, {
        title: values.title,
        category: values.category,
        categoryId: values.categoryId,
        tags: nextTags,
        body: values.body,
        gmBody: values.gmBody,
        image: values.image,
        imageStyle: values.imageStyle,
        npcStatProfile: values.npcStatProfile,
        public: values.public,
      });
      clearWikiDraft(article.id);
      saveState();
      render();
    },
    { draftArticleId: article.id, baseSnapshot: wikiFormSnapshotFromArticle(article) }
  ));
  box.append(actionRow([
    button("Удалить статью", "ghost-button", () => {
      if (!confirm(`Удалить статью "${article.title}"?`)) return;
      clearWikiDraft(article.id);
      state.wiki = state.wiki.filter((item) => item.id !== article.id);
      activeWikiId = WIKI_INDEX_ID;
      saveState();
      render();
    }),
  ]));
  return box;
}

function wikiForm(article, onSubmit, options = {}) {
  const form = el("form", "form-grid");
  const title = input(article.title);
  const category = document.createElement("select");
  wikiCategories.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.title;
    option.selected = (article.categoryId || categoryAliases[article.category]) === item.id;
    category.append(option);
  });
  const tagsInput = input(article.tags);
  const publicInput = document.createElement("input");
  publicInput.type = "checkbox";
  publicInput.checked = article.public;
  const body = textarea(article.body);
  const gmBody = textarea(article.gmBody);
  const statProfile = normalizeNpcStatProfile(article.npcStatProfile);
  const statKind = selectInput([
    ["none", "Без конструктора характеристик"],
    ["race", "Раса: базовая раскладка + расовые модификаторы"],
    ["monster", "Монстр: показатели статьи + раскладка корректировок"],
  ], statProfile.kind);
  const statModifierInputs = Object.fromEntries(npcAbilityDefinitions.map(([key]) => [key, input(statProfile.modifiers[key])]));
  const statBaseInputs = Object.fromEntries(npcAbilityDefinitions.map(([key]) => [key, input(statProfile.baseStats[key])]));
  [...Object.values(statModifierInputs), ...Object.values(statBaseInputs)].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  const flexibleBonus = input(statProfile.flexibleBonus);
  flexibleBonus.type = "number";
  flexibleBonus.min = "0";
  flexibleBonus.step = "1";
  const statProfileFields = el("section", "wiki-stat-profile-fields span-2");
  const updateStatProfileFields = () => {
    statProfileFields.replaceChildren();
    if (statKind.value === "none") return;
    statProfileFields.append(
      el("p", "muted", statKind.value === "monster"
        ? "Введи собственные показатели монстра из бестиария. Конструктор прибавит к ним выбранную раскладку."
        : "Введи постоянные расовые модификаторы. Свободный бонус можно направить в любую характеристику при расчёте."),
      el("div", "wiki-stat-profile-grid")
    );
    const grid = statProfileFields.lastElementChild;
    const controls = statKind.value === "monster" ? statBaseInputs : statModifierInputs;
    npcAbilityDefinitions.forEach(([key, label]) => grid.append(labelWrap(label, controls[key])));
    if (statKind.value === "race") grid.append(labelWrap("Свободный расовый бонус", flexibleBonus));
  };
  statKind.addEventListener("change", updateStatProfileFields);
  updateStatProfileFields();
  let imageValue = article.image || "";
  const imageStyle = { ...defaultImageStyle(), ...(article.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  const imagePreview = el("div", "upload-preview");
  const previewImg = document.createElement("img");
  imagePreview.append(previewImg);
  const aspect = selectInput([
    ["wide", "Широкая 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([
    ["cover", "Обрезать по рамке"],
    ["contain", "Вписать целиком"],
  ], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 2.5, 0.05);
  function updateImagePreview() {
    previewImg.src = imageValue || "";
    imagePreview.className = `upload-preview image-aspect-${aspect.value}`;
    previewImg.style.objectFit = fit.value;
    previewImg.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImg.style.transform = `scale(${zoom.value})`;
  }
  [aspect, fit, posX, posY, zoom].forEach((control) => control.addEventListener("input", updateImagePreview));
  updateImagePreview();
  const baseSnapshot = options.baseSnapshot ?? wikiFormSnapshotFromArticle(article);
  function currentWikiFormSnapshot() {
    return {
      title: title.value,
      categoryId: category.value,
      tags: tagsInput.value,
      public: publicInput.checked,
      body: body.value,
      gmBody: gmBody.value,
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
      },
      npcStatProfile: {
        kind: statKind.value,
        modifiers: Object.fromEntries(npcAbilityDefinitions.map(([key]) => [key, Number(statModifierInputs[key].value || 0)])),
        flexibleBonus: Number(flexibleBonus.value || 0),
        baseStats: Object.fromEntries(npcAbilityDefinitions.map(([key]) => [key, Number(statBaseInputs[key].value || 0)])),
      },
    };
  }
  function updateWikiDraft() {
    if (!options.draftArticleId) return;
    rememberWikiDraft(options.draftArticleId, baseSnapshot, currentWikiFormSnapshot());
  }
  form.addEventListener("input", updateWikiDraft);
  form.addEventListener("change", updateWikiDraft);
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    imageValue = await imageFileToUrl(file, "wiki");
    updateImagePreview();
    updateWikiDraft();
  });

  form.append(
    labelWrap("Заголовок", title),
    labelWrap("Категория", category),
    labelWrap("Теги", tagsInput),
    checkboxWrap("Видно игрокам", publicInput),
    labelWrap("Картинка", fragment([imageInput, imagePreview]), "span-2"),
    labelWrap("Формат картинки", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб обрезки", zoom),
    labelWrap("Текст для игроков", body, "span-2"),
    labelWrap("Скрытый GM-текст", gmBody, "span-2"),
    el("h4", "span-2 settlement-editor-heading", "Конструктор характеристик NPC"),
    labelWrap("Тип статьи", statKind, "span-2"),
    statProfileFields,
    actionRow([button("Сохранить", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const categoryId = category.value;
    onSubmit({
      title: title.value.trim() || "Новая запись",
      category: wikiCategoryTitle(categoryId),
      categoryId,
      tags: tagsInput.value,
      body: body.value.trim(),
      gmBody: gmBody.value.trim(),
      image: imageValue,
      imageStyle: {
        aspect: aspect.value,
        fit: fit.value,
        x: Number(posX.value),
        y: Number(posY.value),
        zoom: Number(zoom.value),
      },
      npcStatProfile: {
        kind: statKind.value,
        modifiers: Object.fromEntries(npcAbilityDefinitions.map(([key]) => [key, Number(statModifierInputs[key].value || 0)])),
        flexibleBonus: Number(flexibleBonus.value || 0),
        baseStats: Object.fromEntries(npcAbilityDefinitions.map(([key]) => [key, Number(statBaseInputs[key].value || 0)])),
      },
      public: publicInput.checked,
    });
  });
  return form;
}

function markerEditor(marker) {
  if (!marker) return "";
  const form = el("form", "form-grid");
  const name = input(marker.name);
  const type = input(marker.type);
  const x = input(marker.x);
  const y = input(marker.y);
  const note = textarea(marker.note);
  form.append(
    labelWrap("Название", name),
    labelWrap("Тип", type),
    labelWrap("X %", x),
    labelWrap("Y %", y),
    labelWrap("Заметка", note, "span-2"),
    actionRow([
      button("Сохранить", "primary-button", null, "submit"),
      button("Удалить", "ghost-button", () => {
        if (!confirm(`Удалить метку "${marker.name}"?`)) return;
        state.map.markers = state.map.markers.filter((item) => item.id !== marker.id);
        state.map.selectedMarker = state.map.markers[0]?.id ?? "";
        saveState();
        render();
      }),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(marker, {
      name: name.value,
      type: type.value,
      x: Number(x.value),
      y: Number(y.value),
      note: note.value,
    });
    saveState();
    render();
  });
  return form;
}

function characterTabEditor(character) {
  const editors = {
    overview: characterSummaryEditor,
    notes: characterNotesEditor,
    factions: characterFactionsEditor,
    recognition: characterRecognitionEditor,
    mechanics: characterMechanicsEditor,
    links: characterLinksEditor,
    gm: characterGmEditor,
  };
  return editors[activeCharacterTab]?.(character) ?? "";
}

function characterMechanicsEditor(character) {
  const editors = {
    summary: characterMechanicsSummaryEditor,
    stats: characterStatsEditor,
    combat: characterCombatEditor,
    skills: characterSkillsEditor,
    features: characterFeaturesEditor,
    magic: characterMagicEditor,
    inventory: characterInventoryEditor,
  };
  return (editors[activeCharacterMechanicsTab] || characterMechanicsSummaryEditor)(character);
}

function characterFactionsEditor(character) {
  const form = el("form", "character-edit-form");
  const fields = {
    factionId: selectInput([["", "Без фракции"], ...visibleFactions().map((faction) => [faction.id, faction.name])], character.factionId),
    factionRole: input(character.factionRole),
    factionRank: input(character.factionRank),
    factionReputation: textarea(character.factionReputation),
    factionLinks: checkboxList(visibleFactions().map((faction) => [faction.id, faction.name]), character.factionLinks),
  };
  form.append(
    labelWrap("Основная фракция", fields.factionId),
    labelWrap("Роль во фракции", fields.factionRole),
    labelWrap("Ранг/должность", fields.factionRank),
    labelWrap("Репутация и обязательства", fields.factionReputation, "span-2"),
    labelWrap("Дополнительные фракционные связи", fields.factionLinks, "span-2"),
    actionRow([button("Сохранить фракции", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(character, {
      factionId: fields.factionId.value,
      factionRole: fields.factionRole.value,
      factionRank: fields.factionRank.value,
      factionReputation: fields.factionReputation.value,
      factionLinks: checkedValues(fields.factionLinks).filter((id) => id !== fields.factionId.value),
    });
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: фракции", form);
}

function characterLinksEditor(character) {
  const form = el("form", "character-edit-form");
  const fields = {
    wikiLinks: searchableCheckboxList(
      visibleWiki().map((article) => [article.id, article.title, `${article.category} ${article.tags?.join(" ") ?? ""}`]),
      character.wikiLinks,
      "",
      null,
      "Поиск Wiki"
    ),
    questLinks: checkboxList(visibleQuests().map((quest) => [quest.id, quest.title]), character.questLinks),
    npcLinks: checkboxList(visibleNpcs().map((npc) => [npc.id, npc.name]), character.npcLinks),
    mapLinks: checkboxList(visibleMapRegions().map((region) => [region.id, region.title]), character.mapLinks),
  };
  form.append(
    labelWrap("Связанные Wiki-статьи", fields.wikiLinks, "span-2"),
    labelWrap("Связанные задания", fields.questLinks, "span-2"),
    labelWrap("Связанные NPC", fields.npcLinks, "span-2"),
    labelWrap("Связанные карты", fields.mapLinks, "span-2"),
    actionRow([button("Сохранить связи", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(character, {
      wikiLinks: checkedValues(fields.wikiLinks),
      questLinks: checkedValues(fields.questLinks),
      npcLinks: checkedValues(fields.npcLinks),
      mapLinks: checkedValues(fields.mapLinks),
    });
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: связи", form);
}

function characterGmEditor(character) {
  if (!isAdmin) return "";
  const root = el("div", "admin-stack");
  const form = el("form", "character-edit-form");
  const gmNotes = textarea(character.gmNotes);
  form.append(
    labelWrap("GM-заметки", gmNotes, "span-2"),
    actionRow([button("Сохранить GM", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    character.gmNotes = gmNotes.value;
    saveCharacter(character);
  });
  root.append(editorPanel("Редактор вкладки: GM", form), characterAdvancedEditor(character));
  return root;
}

function editorPanel(title, form) {
  const panel = el("section", "panel admin-stack tab-editor-panel");
  panel.append(el("h3", "", title), form);
  return panel;
}

async function saveCharacter(character) {
  if (!canEditCharacter(character)) {
    alert("Этот персонаж доступен для редактирования только мастеру.");
    await loadCloudState();
    render();
    return false;
  }
  Object.assign(character, normalizeCharacter(character));
  if (isAdmin) {
    saveState();
  } else if (!(await updatePublicCharacter(character))) {
    return false;
  }
  renderCharacterSelect();
  render();
  return true;
}

function characterSummaryEditor(character) {
  const form = el("form", "character-edit-form");
  const fields = {
    name: input(character.name),
    player: input(character.player),
    className: input(character.className),
    ancestry: input(character.ancestry),
    homeland: input(character.homeland),
    culture: input(character.culture),
    religion: input(character.religion),
    size: input(character.size),
    gender: input(character.gender),
    dangerClass: input(character.dangerClass),
    age: input(character.age),
    height: input(character.height),
    weight: input(character.weight),
    maritalStatus: input(character.maritalStatus),
    alignment: input(character.alignment),
    deity: input(character.deity),
    level: input(character.level),
    languages: textarea(character.languages),
    tags: input(character.tags.join(", ")),
    description: textarea(character.description),
    appearance: textarea(character.appearance),
    voice: textarea(character.voice),
    location: input(character.location),
    lastSeen: input(character.lastSeen),
  };
  const levels = structuredRowsEditor(character.levels, [
    { key: "className", label: "Класс / архетип" },
    { key: "level", label: "Уровень", type: "number", min: 0, max: 40 },
    { key: "notes", label: "Примечание" },
  ], "Добавить класс или уровень");
  const personalityTraits = structuredRowsEditor(character.personalityTraits, [
    { key: "name", label: "Название" },
    { key: "description", label: "Описание", type: "textarea" },
  ], "Добавить черту характера");
  const portraitInput = document.createElement("input");
  portraitInput.type = "file";
  portraitInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let portraitValue = character.portrait || "";
  const portraitStyle = { ...defaultImageStyle(), aspect: "square", ...(character.portraitStyle ?? {}) };
  const portraitPreview = el("div", "upload-preview character-portrait-preview image-aspect-square");
  const portraitPreviewImage = document.createElement("img");
  const portraitPreviewText = el("span", "muted", "Портрет не загружен");
  portraitPreview.append(portraitPreviewImage, portraitPreviewText);
  const portraitFit = selectInput([["cover", "Обрезать по рамке"], ["contain", "Вписать целиком"]], portraitStyle.fit);
  const portraitX = rangeInput(portraitStyle.x, 0, 100, 1);
  const portraitY = rangeInput(portraitStyle.y, 0, 100, 1);
  const portraitZoom = rangeInput(portraitStyle.zoom, 1, 3, 0.05);
  const portraitRotation = rangeInput(portraitStyle.rotation || 0, -180, 180, 1);
  const refreshPortrait = () => {
    portraitPreviewImage.src = portraitValue;
    portraitPreviewImage.hidden = !portraitValue;
    portraitPreviewText.hidden = Boolean(portraitValue);
    applyPortraitStyle(portraitPreviewImage, {
      fit: portraitFit.value,
      x: portraitX.value,
      y: portraitY.value,
      zoom: portraitZoom.value,
      rotation: portraitRotation.value,
    });
  };
  [portraitFit, portraitX, portraitY, portraitZoom, portraitRotation]
    .forEach((control) => control.addEventListener("input", refreshPortrait));
  portraitInput.addEventListener("change", async () => {
    const file = portraitInput.files?.[0];
    if (!file) return;
    const uploadedPortrait = await imageFileToUrl(file, "characters", {
      allowPublicUpload: !isAdmin,
      requireCloudUpload: !isAdmin,
    });
    if (!uploadedPortrait) return;
    portraitValue = uploadedPortrait;
    refreshPortrait();
  });
  const adminOnlyEdit = document.createElement("input");
  adminOnlyEdit.type = "checkbox";
  adminOnlyEdit.checked = character.adminOnlyEdit;
  const changesInProgress = document.createElement("input");
  changesInProgress.type = "checkbox";
  changesInProgress.checked = character.changesInProgress;
  refreshPortrait();
  form.append(
    labelWrap("Имя", fields.name),
    labelWrap("Игрок", fields.player),
    labelWrap("Класс (если один)", fields.className),
    labelWrap("Общий уровень", fields.level),
    labelWrap("Раса", fields.ancestry),
    labelWrap("Родина", fields.homeland),
    labelWrap("Культура", fields.culture),
    labelWrap("Вероисповедание", fields.religion),
    labelWrap("Размер", fields.size),
    labelWrap("Пол", fields.gender),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("Мировоззрение", fields.alignment),
    labelWrap("Божество", fields.deity),
    labelWrap("Локация", fields.location),
    labelWrap("Последняя встреча", fields.lastSeen),
    labelWrap("Теги", fields.tags),
    labelWrap("Классы и уровни", levels.element, "span-2"),
    labelWrap("Языки", fields.languages, "span-2"),
    labelWrap("Портрет", fragment([portraitInput, portraitPreview]), "span-2"),
    labelWrap("Подгонка", portraitFit),
    labelWrap("Масштаб", portraitZoom),
    labelWrap("Позиция X", portraitX),
    labelWrap("Позиция Y", portraitY),
    labelWrap("Поворот", portraitRotation, "span-2"),
    actionRow([button("Убрать портрет", "ghost-button", () => {
      portraitValue = "";
      portraitInput.value = "";
      refreshPortrait();
    })], "span-2"),
    labelWrap("Описание игрокам", fields.description, "span-2"),
    labelWrap("Внешность", fields.appearance, "span-2"),
    labelWrap("Черты характера", personalityTraits.element, "span-2"),
    labelWrap("Манера речи", fields.voice, "span-2"),
    labelWrap(
      "Состояние листа",
      checkboxWrap("В процессе изменений", changesInProgress),
      "span-2 character-change-control"
    ),
    ...(isAdmin ? [labelWrap(
      "Доступ к редактированию",
      checkboxWrap("Редактировать персонажа может только мастер", adminOnlyEdit),
      "span-2 character-access-control"
    )] : []),
    actionRow([button("Сохранить общее", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextLevels = levels.read();
    const nextTags = csv(fields.tags.value);
    registerTags(nextTags, true);
    Object.assign(character, {
      name: fields.name.value,
      player: fields.player.value,
      ancestry: fields.ancestry.value,
      homeland: fields.homeland.value,
      culture: fields.culture.value,
      religion: fields.religion.value,
      size: fields.size.value,
      gender: fields.gender.value,
      dangerClass: fields.dangerClass.value,
      age: fields.age.value,
      height: fields.height.value,
      weight: fields.weight.value,
      maritalStatus: fields.maritalStatus.value,
      alignment: fields.alignment.value,
      deity: fields.deity.value,
      levels: nextLevels,
      className: nextLevels.map((entry) => `${entry.className} ${entry.level}`).filter(Boolean).join(" / ") || fields.className.value,
      level: nextLevels.reduce((sum, entry) => sum + Number(entry.level || 0), 0) || Number(fields.level.value || 1),
      languages: fields.languages.value,
      tags: nextTags,
      description: fields.description.value,
      appearance: fields.appearance.value,
      personalityTraits: personalityTraits.read(),
      voice: fields.voice.value,
      location: fields.location.value,
      lastSeen: fields.lastSeen.value,
      portrait: portraitValue,
      portraitStyle: {
        aspect: "square",
        fit: portraitFit.value,
        x: Number(portraitX.value),
        y: Number(portraitY.value),
        zoom: Number(portraitZoom.value),
        rotation: Number(portraitRotation.value),
      },
      changesInProgress: changesInProgress.checked,
    });
    if (isAdmin) character.adminOnlyEdit = adminOnlyEdit.checked;
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: общее", form);
}

function characterMechanicsSummaryEditor(character) {
  const form = el("form", "character-edit-form");
  const fields = {
    homeland: input(character.homeland),
    size: input(character.size),
    gender: input(character.gender),
    deity: input(character.deity),
    dangerClass: input(character.dangerClass),
    age: input(character.age),
    height: input(character.height),
    weight: input(character.weight),
    maritalStatus: input(character.maritalStatus),
    languages: textarea(character.languages),
    mechanicsNotes: textarea(character.mechanicsNotes),
  };
  form.append(
    labelWrap("Родина", fields.homeland),
    labelWrap("Размер", fields.size),
    labelWrap("Пол", fields.gender),
    labelWrap("Божество", fields.deity),
    labelWrap("Класс Опасности", fields.dangerClass),
    labelWrap("Возраст", fields.age),
    labelWrap("Рост", fields.height),
    labelWrap("Вес", fields.weight),
    labelWrap("Семейный статус", fields.maritalStatus),
    labelWrap("Языки", fields.languages, "span-2"),
    labelWrap("Механические заметки", fields.mechanicsNotes, "span-2"),
    actionRow([button("Сохранить паспорт листа", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(character, Object.fromEntries(Object.entries(fields).map(([key, control]) => [key, control.value])));
    saveCharacter(character);
  });
  return editorPanel("Редактор листа: паспорт", form);
}

function characterStatsEditor(character) {
  const form = el("form", "character-edit-form");
  const statInputs = {};
  Object.entries(character.stats).forEach(([key, value]) => {
    statInputs[key] = input(value);
  });
  const saveInputs = {};
  Object.entries(character.saves).forEach(([key, value]) => {
    saveInputs[key] = input(value);
  });
  const initiative = input(character.initiative);
  const unusualAncestry = document.createElement("input");
  unusualAncestry.type = "checkbox";
  unusualAncestry.checked = character.unusualAncestry;
  const customConModifier = input(character.customConModifier);
  customConModifier.type = "number";
  customConModifier.step = "1";
  const customConWrap = labelWrap("Отдельный модификатор Выносливости (CON)", customConModifier, "span-2 unusual-con-control");
  const refreshUnusualAncestry = () => {
    customConWrap.hidden = !unusualAncestry.checked;
    customConModifier.disabled = !unusualAncestry.checked;
  };
  unusualAncestry.addEventListener("change", refreshUnusualAncestry);
  refreshUnusualAncestry();
  form.append(
    el("h3", "span-2", "Характеристики"),
    ...Object.entries(statInputs).map(([key, control]) => labelWrap(key.toUpperCase(), control)),
    labelWrap(
      "Необычная раса",
      checkboxWrap("Значение Выносливости и его модификатор не зависят друг от друга", unusualAncestry),
      "span-2 character-access-control"
    ),
    customConWrap,
    el("h3", "span-2", "Спасброски"),
    ...Object.entries(saveInputs).map(([key, control]) => labelWrap(key, control)),
    labelWrap("Инициатива", initiative),
    actionRow([button("Сохранить характеристики", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.entries(statInputs).forEach(([key, control]) => {
      character.stats[key] = Number(control.value || 0);
    });
    Object.entries(saveInputs).forEach(([key, control]) => {
      character.saves[key] = Number(control.value || 0);
    });
    character.unusualAncestry = unusualAncestry.checked;
    character.customConModifier = unusualAncestry.checked
      ? Number(customConModifier.value || 0)
      : statMod(character.stats.con);
    character.initiative = Number(initiative.value || 0);
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: характеристики", form);
}

function characterCombatEditor(character) {
  const form = el("form", "character-edit-form");
  const speeds = structuredRowsEditor(normalizeMovementSpeeds(character.speeds, character.speed), [
    { key: "type", label: "Тип скорости", options: movementTypeOptions, defaultValue: "land" },
    { key: "value", label: "Скорость без доспеха" },
    { key: "armoredValue", label: "Скорость в доспехе" },
  ], "Добавить скорость");
  const babEntries = structuredRowsEditor(normalizeBabEntries(character.babEntries, character.bab), [
    { key: "label", label: "Название", defaultValue: "BAB" },
    { key: "value", label: "Значение" },
  ], "Добавить BAB");
  const fields = {
    hp: input(character.hp),
    ac: input(character.ac),
    touchAc: input(character.touchAc),
    flatFootedAc: input(character.flatFootedAc),
    cmb: input(character.cmb),
    cmd: input(character.cmd),
    attacksNotes: textarea(character.attacksNotes),
    armorNotes: textarea(character.armorNotes),
  };
  form.append(
    labelWrap("HP", fields.hp),
    labelWrap("AC", fields.ac),
    labelWrap("Касание", fields.touchAc),
    labelWrap("Врасплох", fields.flatFootedAc),
    labelWrap("CMB", fields.cmb),
    labelWrap("CMD", fields.cmd),
    labelWrap("BAB", babEntries.element, "span-2"),
    labelWrap("Скорости", speeds.element, "span-2"),
    labelWrap("Атаки", fields.attacksNotes, "span-2"),
    labelWrap("Броня и защита", fields.armorNotes, "span-2"),
    actionRow([button("Сохранить бой", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(character, {
      hp: fields.hp.value,
      ac: Number(fields.ac.value || 0),
      touchAc: Number(fields.touchAc.value || 0),
      flatFootedAc: Number(fields.flatFootedAc.value || 0),
      cmb: Number(fields.cmb.value || 0),
      cmd: Number(fields.cmd.value || 0),
      attacksNotes: fields.attacksNotes.value,
      armorNotes: fields.armorNotes.value,
    });
    character.babEntries = babEntries.read();
    character.bab = primaryBabValue(character.babEntries, character.bab);
    character.speeds = speeds.read();
    character.speed = primaryMovementSpeed(character.speeds);
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: бой", form);
}

function characterSkillsEditor(character) {
  const form = el("form", "character-edit-form");
  const skillEditor = createSkillEditor(character);
  form.append(
    labelWrap("Ранги и автоматические итоги навыков", skillEditor.element, "span-2"),
    actionRow([button("Сохранить навыки", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    skillEditor.apply();
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: навыки", form);
}

function characterFeaturesEditor(character) {
  const form = el("form", "character-edit-form");
  const feats = textarea(character.feats.join("\n"));
  const features = textarea(character.features.join("\n"));
  const templatesStatuses = textarea(character.templatesStatuses.join("\n"));
  const strokes = textarea(character.strokes.join("\n"));
  form.append(
    labelWrap("Черты, по одной на строку", feats, "span-2"),
    labelWrap("Классовые особенности, по одной на строку", features, "span-2"),
    labelWrap("Шаблоны и статусы, по одному на строку", templatesStatuses, "span-2"),
    labelWrap("Штрихи, по одному на строку", strokes, "span-2"),
    actionRow([button("Сохранить черты", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    character.feats = lineItems(feats.value);
    character.features = lineItems(features.value);
    character.templatesStatuses = lineItems(templatesStatuses.value);
    character.strokes = lineItems(strokes.value);
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: черты", form);
}

function characterMagicEditor(character, saveHandler = saveCharacter, title = "Редактор вкладки: магия") {
  const form = el("form", "character-edit-form");
  const spellNotes = textarea(character.spellNotes);
  form.append(
    labelWrap("Заклинания и магические записи", spellNotes, "span-2"),
    actionRow([button("Сохранить магию", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    character.spellNotes = spellNotes.value;
    saveHandler(character);
  });
  return editorPanel(title, form);
}

function characterInventoryEditor(character, saveHandler = saveCharacter, title = "Редактор вкладки: инвентарь") {
  const form = el("form", "character-edit-form");
  const inventoryNotes = textarea(character.inventoryNotes);
  const equippedGear = textarea(character.equippedGear);
  const magicItemLinks = checkboxList(
    state.items
      .filter((item) => item.category === "magical")
      .map((item) => [item.id, [item.name, item.price].filter(Boolean).join(" · ")]),
    character.magicItemLinks
  );
  form.append(
    labelWrap("Инвентарь — свободная запись", inventoryNotes, "span-2"),
    labelWrap("Надетое снаряжение", equippedGear, "span-2"),
    labelWrap("Магические предметы из справочника", magicItemLinks, "span-2"),
    actionRow([button("Сохранить инвентарь", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    character.inventoryNotes = inventoryNotes.value;
    character.equippedGear = equippedGear.value;
    character.magicItemLinks = checkedValues(magicItemLinks);
    saveHandler(character);
  });
  return editorPanel(title, form);
}

function characterRecognitionEditor(character) {
  const form = el("form", "character-edit-form");
  const fields = {
    accumulatedRecognition: input(character.accumulatedRecognition),
    authorityLevel: input(character.authorityLevel),
    honor: input(character.honor),
    piety: input(character.piety),
    fame: input(character.fame),
    demand: textarea(character.demand),
    merits: textarea(character.merits),
  };
  [fields.accumulatedRecognition, fields.authorityLevel, fields.honor, fields.piety, fields.fame].forEach((control) => {
    control.type = "number";
    control.step = "1";
  });
  form.append(
    labelWrap("Накопленное признание", fields.accumulatedRecognition),
    labelWrap("Уровень авторитета", fields.authorityLevel),
    labelWrap("Честь", fields.honor),
    labelWrap("Благочестие", fields.piety),
    labelWrap("Слава", fields.fame),
    labelWrap("Спрос и требования", fields.demand, "span-2"),
    labelWrap("Заслуги и приобретённые бонусы", fields.merits, "span-2"),
    actionRow([button("Сохранить признание", "primary-button", null, "submit")], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    character.accumulatedRecognition = Number(fields.accumulatedRecognition.value || 0);
    character.authorityLevel = Number(fields.authorityLevel.value || 0);
    character.honor = Number(fields.honor.value || 0);
    character.piety = Number(fields.piety.value || 0);
    character.fame = Number(fields.fame.value || 0);
    character.demand = fields.demand.value;
    character.merits = fields.merits.value;
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: признание", form);
}

function characterNotesEditor(character) {
  const form = el("form", "character-edit-form");
  const notes = textarea(character.notes);
  const lastSeen = input(character.lastSeen);
  form.append(labelWrap("Последняя встреча", lastSeen), labelWrap("Заметки игрока", notes, "span-2"));
  form.append(actionRow([button("Сохранить заметки", "primary-button", null, "submit")], "span-2"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    character.notes = notes.value;
    character.lastSeen = lastSeen.value;
    saveCharacter(character);
  });
  return editorPanel("Редактор вкладки: заметки", form);
}

function jsonArrayTabEditor(character, key, title, label, saveLabel) {
  const form = el("form", "character-edit-form");
  const json = textarea(JSON.stringify(character[key], null, 2));
  json.classList.add("json-editor", "compact-json");
  form.append(labelWrap(label, json, "span-2"), actionRow([button(saveLabel, "primary-button", null, "submit")], "span-2"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let parsed;
    try {
      parsed = JSON.parse(json.value || "[]");
      if (!Array.isArray(parsed)) throw new Error();
    } catch {
      alert(`${label} не сохранен: нужен JSON-массив.`);
      return;
    }
    character[key] = parsed;
    saveCharacter(character);
  });
  return editorPanel(title, form);
}

function characterAdvancedEditor(character) {
  const jsonPanel = el("details", "json-details");
  const summary = el("summary", "", "Расширенный JSON-редактор персонажа");
  const json = textarea(JSON.stringify(character, null, 2));
  json.classList.add("json-editor");
  const jsonForm = el("form", "admin-stack");
  jsonForm.append(
    el("p", "muted", "Для редких полей и полного контроля мастера. Этот блок специально спрятан в заметках, чтобы не мешать обычному редактированию вкладок."),
    labelWrap("JSON персонажа", json),
    actionRow([
      button("Сохранить JSON", "primary-button", null, "submit"),
      button("Удалить персонажа", "ghost-button", () => {
        if (!confirm(`Удалить персонажа ${character.name}?`)) return;
        state.characters = state.characters.filter((item) => item.id !== character.id);
        state.characterGroups.forEach((group) => {
          group.characterIds = group.characterIds.filter((id) => id !== character.id);
        });
        const deletedKey = relationshipEntityKey("character", character.id);
        state.relationships = state.relationships.filter((item) => item.sourceKey !== deletedKey && item.targetKey !== deletedKey);
        activeCharacterId = state.characters[0]?.id ?? null;
        saveState();
        renderCharacterSelect();
        render();
      }),
    ])
  );
  jsonForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let parsed;
    try {
      parsed = normalizeCharacter(JSON.parse(json.value));
    } catch {
      alert("JSON не сохранен: проверь запятые, кавычки и скобки.");
      return;
    }
    Object.assign(character, parsed);
    saveCharacter(character);
  });
  jsonPanel.append(summary, jsonForm);
  return jsonPanel;
}

function lineItems(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function characterEditor(character) {
  const root = el("div", "admin-stack");
  const form = el("form", "character-edit-form");
  const speeds = structuredRowsEditor(normalizeMovementSpeeds(character.speeds, character.speed), [
    { key: "type", label: "Тип скорости", options: movementTypeOptions, defaultValue: "land" },
    { key: "value", label: "Скорость без доспеха" },
    { key: "armoredValue", label: "Скорость в доспехе" },
  ], "Добавить скорость");
  const fields = {
    name: input(character.name),
    player: input(character.player),
    className: input(character.className),
    ancestry: input(character.ancestry),
    level: input(character.level),
    hp: input(character.hp),
    ac: input(character.ac),
    touchAc: input(character.touchAc),
    flatFootedAc: input(character.flatFootedAc),
    initiative: input(character.initiative),
    languages: textarea(character.languages),
    notes: textarea(character.notes),
    gmNotes: textarea(character.gmNotes),
  };
  const statInputs = {};
  Object.entries(character.stats).forEach(([key, value]) => {
    statInputs[key] = input(value);
  });
  const saveInputs = {};
  Object.entries(character.saves).forEach(([key, value]) => {
    saveInputs[key] = input(value);
  });

  const skillEditor = createSkillEditor(character);

  form.append(
    el("h3", "", "Редактор персонажа"),
    labelWrap("Имя", fields.name),
    labelWrap("Игрок", fields.player),
    labelWrap("Класс", fields.className),
    labelWrap("Раса", fields.ancestry),
    labelWrap("Уровень", fields.level),
    labelWrap("HP", fields.hp),
    labelWrap("AC", fields.ac),
    labelWrap("Касание", fields.touchAc),
    labelWrap("Врасплох", fields.flatFootedAc),
    labelWrap("Инициатива", fields.initiative),
    labelWrap("Скорости", speeds.element, "span-2"),
    el("h3", "span-2", "Характеристики"),
    ...Object.entries(statInputs).map(([key, control]) => labelWrap(key.toUpperCase(), control)),
    el("h3", "span-2", "Спасброски"),
    ...Object.entries(saveInputs).map(([key, control]) => labelWrap(key, control)),
    labelWrap("Языки", fields.languages, "span-2"),
    labelWrap("Заметки", fields.notes, "span-2"),
    labelWrap("GM-заметки", fields.gmNotes, "span-2"),
    el("h3", "span-2", "Навыки"),
    labelWrap("Ранги и автоматические итоги навыков", skillEditor.element, "span-2"),
    actionRow([button("Сохранить персонажа", "primary-button", null, "submit")], "span-2")
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(character, {
      name: fields.name.value,
      player: fields.player.value,
      className: fields.className.value,
      ancestry: fields.ancestry.value,
      level: Number(fields.level.value),
      hp: fields.hp.value,
      ac: Number(fields.ac.value),
      touchAc: Number(fields.touchAc.value),
      flatFootedAc: Number(fields.flatFootedAc.value),
      initiative: Number(fields.initiative.value),
      languages: fields.languages.value,
      notes: fields.notes.value,
      gmNotes: fields.gmNotes.value,
    });
    Object.entries(statInputs).forEach(([key, control]) => {
      character.stats[key] = Number(control.value);
    });
    Object.entries(saveInputs).forEach(([key, control]) => {
      character.saves[key] = Number(control.value);
    });
    character.speeds = speeds.read();
    character.speed = primaryMovementSpeed(character.speeds);
    skillEditor.apply();
    saveState();
    renderCharacterSelect();
    render();
  });

  const jsonPanel = el("details", "json-details");
  const summary = el("summary", "", "Расширенный JSON-редактор");
  const json = textarea(JSON.stringify(character, null, 2));
  json.classList.add("json-editor");
  const jsonForm = el("form", "admin-stack");
  const portraitInput = document.createElement("input");
  portraitInput.type = "file";
  portraitInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  portraitInput.addEventListener("change", async () => {
    const file = portraitInput.files?.[0];
    if (!file) return;
    character.portrait = await imageFileToUrl(file, "characters");
    json.value = JSON.stringify(character, null, 2);
    saveState();
    render();
  });
  jsonForm.append(
    el("p", "muted", "Для редких полей: атаки, магия, инвентарь, черты, портрет и любые дополнительные данные."),
    labelWrap("Портрет", portraitInput),
    labelWrap("JSON персонажа", json),
    actionRow([
      button("Сохранить JSON", "primary-button", null, "submit"),
      button("Удалить персонажа", "ghost-button", () => {
        if (!confirm(`Удалить персонажа ${character.name}?`)) return;
        state.characters = state.characters.filter((item) => item.id !== character.id);
        state.characterGroups.forEach((group) => {
          group.characterIds = group.characterIds.filter((id) => id !== character.id);
        });
        const deletedKey = relationshipEntityKey("character", character.id);
        state.relationships = state.relationships.filter((item) => item.sourceKey !== deletedKey && item.targetKey !== deletedKey);
        activeCharacterId = state.characters[0]?.id ?? null;
        saveState();
        renderCharacterSelect();
        render();
      }),
    ])
  );
  jsonForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let parsed;
    try {
      parsed = normalizeCharacter(JSON.parse(json.value));
    } catch {
      alert("JSON не сохранен: проверь запятые, кавычки и скобки.");
      return;
    }
    Object.assign(character, parsed);
    saveState();
    renderCharacterSelect();
    render();
  });
  jsonPanel.append(summary, jsonForm);
  root.append(form, jsonPanel);
  return root;
}

function questEditor(quest) {
  const form = el("form", "form-grid");
  const title = input(quest.title);
  const patron = input(quest.patron);
  const reward = input(quest.reward);
  const linked = input(quest.linked);
  const notes = textarea(quest.notes);
  const gmNotes = textarea(quest.gmNotes);
  const status = document.createElement("select");
  ["active", "done", "hidden"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = questStatus(value);
    option.selected = quest.status === value;
    status.append(option);
  });

  form.append(
    labelWrap("Название", title),
    labelWrap("Статус", status),
    labelWrap("Заказчик", patron),
    labelWrap("Награда", reward),
    labelWrap("Связь", linked, "span-2"),
    labelWrap("Описание", notes, "span-2"),
    labelWrap("GM", gmNotes, "span-2"),
    actionRow([
      button("Сохранить", "primary-button", null, "submit"),
      button("Удалить", "ghost-button", () => {
        if (!confirm(`Удалить задание "${quest.title}"?`)) return;
        state.quests = state.quests.filter((item) => item.id !== quest.id);
        saveState();
        render();
      }),
    ], "span-2")
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    quest.title = title.value;
    quest.status = status.value;
    quest.patron = patron.value;
    quest.reward = reward.value;
    quest.linked = linked.value;
    quest.notes = notes.value;
    quest.gmNotes = gmNotes.value;
    saveState();
    render();
  });
  return form;
}

function renderAshanaGames() {
  const root = el("div", "ashana-games-page");
  root.append(header(
    "Игры Асханы",
    "Настольные игры мира Асханы: карточные дуэли, игры на доверие и соперники под управлением компьютера."
  ));
  const selector = el("div", "ashana-game-selector");
  [
    ["paper-throne", "Бумажный трон", "Карточная дуэль за влияние, богатство и право безнаказанно жульничать."],
    ["nagash", "Зеркало Нагаша", "Скрытые кости, растущие ставки и обвинения во лжи."],
  ].forEach(([id, title, description]) => {
    const card = button("", `ashana-game-option ${activeAshanaGameId === id ? "active" : ""}`, () => {
      if (activeAshanaGameId === id) return;
      activeAshanaGameId = id;
      saveUiState();
      render();
    });
    card.append(el("strong", "", title), el("span", "", description));
    selector.append(card);
  });
  root.append(selector);
  if (activeAshanaGameId === "paper-throne" && typeof window.renderPaperThroneGame === "function") {
    root.append(window.renderPaperThroneGame());
  } else {
    root.append(renderNagashMirrorGame({ embedded: true }));
  }
  return root;
}

function renderNagashMirrorGame(options = {}) {
  const root = el("div", "ashana-games-page");
  if (!options.embedded) {
    root.append(header(
      "Игры Асханы",
      "Настольные игры мира Асханы с персонажами кампании, скрытой информацией и противниками под управлением компьютера."
    ));
  }

  const intro = el("section", "nagash-intro");
  const introCopy = el("div", "nagash-intro-copy");
  introCopy.append(
    el("p", "eyebrow", "Игра на доверие и расчет"),
    el("h3", "", "Зеркало Нагаша"),
    el("p", "", "Спрячьте бросок под чашей, повышайте ставки и решите, когда соперник окончательно заврался. Последний участник с костями побеждает.")
  );
  const rules = document.createElement("details");
  rules.className = "nagash-rules";
  const rulesSummary = document.createElement("summary");
  rulesSummary.textContent = "Правила партии";
  const rulesList = el("ol");
  [
    "Каждый участник начинает с шестью костями и видит только свой бросок.",
    "Назовите количество одинаковых граней среди всех скрытых костей, например: «пять троек».",
    "Следующая ставка обязана увеличить количество; значение грани можно сменить.",
    "Вместо ставки можно обвинить предыдущего игрока во лжи и раскрыть все чаши.",
    "Если заявленных граней достаточно, кость теряет споривший. Иначе кость теряет автор ставки.",
    "Участник без костей выбывает. Побеждает последний оставшийся за столом.",
  ].forEach((rule) => rulesList.append(el("li", "", rule)));
  rules.append(rulesSummary, rulesList);
  introCopy.append(rules);
  intro.append(introCopy, el("div", "nagash-intro-sigil", "Н"));
  root.append(intro);

  const gameMount = el("section", "nagash-game-mount");
  root.append(gameMount);

  let game = loadNagashGame();
  let setupMode = "ai";
  let setupPlayerCount = 2;
  let setupKeys = [];
  let aiTimer = null;
  let closed = false;
  let draftFace = 2;
  let draftQuantity = 1;

  const entityOptions = nagashEntityOptions();
  setupKeys = Array.from({ length: 4 }, (_, index) => entityOptions[index % entityOptions.length]?.key || `guest:${index + 1}`);

  const clearAiTimer = () => {
    if (aiTimer) window.clearTimeout(aiTimer);
    aiTimer = null;
  };

  const persist = () => saveNagashGame(game);

  const beginRound = (starterIndex) => {
    const activePlayers = game.players.filter((player) => player.diceCount > 0);
    if (activePlayers.length <= 1) {
      game.phase = "finished";
      game.winnerIndex = game.players.findIndex((player) => player.diceCount > 0);
      persist();
      renderGame();
      return;
    }
    game.round += 1;
    game.players.forEach((player) => {
      player.dice = player.diceCount > 0 ? nagashRollDice(player.diceCount) : [];
    });
    game.currentIndex = game.players[starterIndex]?.diceCount > 0
      ? starterIndex
      : nagashNextActivePlayer(game, starterIndex);
    game.lastBid = null;
    game.reveal = null;
    game.phase = game.mode === "local" ? "handoff" : "turn";
    game.handoffRevealed = game.mode !== "local";
    draftQuantity = 1;
    draftFace = 2;
    persist();
    renderGame();
  };

  const makeBid = (playerIndex, quantity, face) => {
    if (!game || game.phase !== "turn" || game.currentIndex !== playerIndex) return;
    const totalDice = nagashTotalDice(game);
    const minimum = game.lastBid ? Number(game.lastBid.quantity) + 1 : 1;
    const safeQuantity = Math.floor(Number(quantity));
    const safeFace = Math.floor(Number(face));
    if (!Number.isFinite(safeQuantity) || safeQuantity < minimum || safeQuantity > totalDice) return;
    if (!Number.isFinite(safeFace) || safeFace < 1 || safeFace > 6) return;
    const bidder = game.players[playerIndex];
    game.lastBid = { quantity: safeQuantity, face: safeFace, bidderIndex: playerIndex };
    game.history.unshift({
      round: game.round,
      text: `${bidder.name}: ${nagashBidLabel(safeQuantity, safeFace)}`,
      kind: "bid",
    });
    game.currentIndex = nagashNextActivePlayer(game, playerIndex);
    game.phase = game.mode === "local" ? "handoff" : "turn";
    game.handoffRevealed = game.mode !== "local";
    draftQuantity = Math.min(totalDice, safeQuantity + 1);
    draftFace = safeFace;
    persist();
    renderGame();
  };

  const challengeBid = (challengerIndex) => {
    if (!game?.lastBid || game.phase !== "turn" || game.currentIndex !== challengerIndex) return;
    const { quantity, face, bidderIndex } = game.lastBid;
    const actual = game.players.reduce(
      (sum, player) => sum + player.dice.filter((die) => die === face).length,
      0
    );
    const bidWasTrue = actual >= quantity;
    const loserIndex = bidWasTrue ? challengerIndex : bidderIndex;
    const loser = game.players[loserIndex];
    loser.diceCount = Math.max(0, loser.diceCount - 1);
    game.reveal = { quantity, face, bidderIndex, challengerIndex, actual, bidWasTrue, loserIndex };
    game.history.unshift({
      round: game.round,
      text: `${game.players[challengerIndex].name} потребовал раскрыть чаши: найдено ${actual}, ${loser.name} теряет кость.`,
      kind: "challenge",
    });
    const survivors = game.players.filter((player) => player.diceCount > 0);
    if (survivors.length <= 1) {
      game.phase = "finished";
      game.winnerIndex = game.players.findIndex((player) => player.diceCount > 0);
    } else {
      game.phase = "reveal";
      game.nextStarterIndex = loserIndex;
    }
    persist();
    renderGame();
  };

  const runAiTurn = () => {
    clearAiTimer();
    if (!game || game.phase !== "turn") return;
    const playerIndex = game.currentIndex;
    const player = game.players[playerIndex];
    if (!player || player.controller !== "ai") return;
    aiTimer = window.setTimeout(() => {
      aiTimer = null;
      if (closed || !game || game.phase !== "turn" || game.currentIndex !== playerIndex) return;
      const decision = nagashAiDecision(game, playerIndex);
      if (decision.action === "challenge") challengeBid(playerIndex);
      else makeBid(playerIndex, decision.quantity, decision.face);
    }, 900 + Math.floor(Math.random() * 450));
  };

  const renderSetup = () => {
    clearAiTimer();
    gameMount.innerHTML = "";
    const setup = el("div", "nagash-setup");
    const heading = el("div", "nagash-setup-head");
    heading.append(el("p", "eyebrow", "Новая партия"), el("h3", "", "Кто сядет перед зеркалом?"));

    const modeControl = el("div", "nagash-mode-control");
    [
      ["ai", "Против компьютера", "Один герой против 1–3 соперников под управлением компьютера."],
      ["local", "Игрок против игрока", "Локальная партия на одном устройстве с закрытым экраном между ходами."],
    ].forEach(([mode, title, description]) => {
      const modeButton = button("", `nagash-mode-button ${setupMode === mode ? "active" : ""}`, () => {
        setupMode = mode;
        renderSetup();
      });
      modeButton.append(el("strong", "", title), el("span", "", description));
      modeControl.append(modeButton);
    });

    const countSelect = selectInput([["2", "2 участника"], ["3", "3 участника"], ["4", "4 участника"]], String(setupPlayerCount));
    countSelect.addEventListener("change", () => {
      setupPlayerCount = Number(countSelect.value);
      renderSetup();
    });

    const seats = el("div", "nagash-setup-seats");
    for (let index = 0; index < setupPlayerCount; index += 1) {
      const seat = el("article", "nagash-setup-seat");
      const controller = setupMode === "ai" && index > 0 ? "Компьютер" : "Игрок";
      const select = selectInput(entityOptions.map((entity) => [entity.key, `${entity.name}${entity.subtitle ? ` · ${entity.subtitle}` : ""}`]), setupKeys[index]);
      select.addEventListener("change", () => {
        setupKeys[index] = select.value;
        const selected = entityOptions.find((entity) => entity.key === select.value);
        const portraitSlot = seat.querySelector(".directory-portrait");
        portraitSlot?.replaceWith(directoryPortrait(selected?.portrait, selected?.name || "Участник", selected?.portraitStyle));
      });
      const playerCopy = el("div", "nagash-setup-seat-copy");
      playerCopy.append(el("span", "nagash-seat-number", `Место ${index + 1}`), el("strong", "", controller));
      const chosen = entityOptions.find((entity) => entity.key === setupKeys[index]) || entityOptions[0];
      seat.append(directoryPortrait(chosen?.portrait, chosen?.name || "Участник", chosen?.portraitStyle), playerCopy, select);
      seats.append(seat);
    }

    const error = el("p", "form-error nagash-setup-error");
    error.hidden = true;
    const start = button("Начать партию", "primary-button nagash-start-button", () => {
      const chosenKeys = setupKeys.slice(0, setupPlayerCount);
      if (new Set(chosenKeys).size !== chosenKeys.length) {
        error.textContent = "Каждое место должно принадлежать отдельному персонажу или NPC.";
        error.hidden = false;
        return;
      }
      const players = chosenKeys.map((key, index) => {
        const entity = entityOptions.find((item) => item.key === key) || entityOptions[index];
        return {
          id: crypto.randomUUID(),
          entityKey: entity.key,
          name: entity.name,
          subtitle: entity.subtitle || "Странник Асханы",
          portrait: entity.portrait || "",
          portraitStyle: entity.portraitStyle || defaultImageStyle(),
          controller: setupMode === "ai" && index > 0 ? "ai" : "human",
          diceCount: 6,
          dice: nagashRollDice(6),
        };
      });
      game = {
        version: 1,
        mode: setupMode,
        round: 1,
        phase: setupMode === "local" ? "handoff" : "turn",
        handoffRevealed: setupMode !== "local",
        currentIndex: 0,
        players,
        lastBid: null,
        reveal: null,
        history: [{ round: 1, text: "Чаши поставлены на стол. Первый раунд начался.", kind: "system" }],
      };
      draftQuantity = 1;
      draftFace = 2;
      persist();
      renderGame();
    });

    const setupBody = el("div", "nagash-setup-body");
    setupBody.append(
      nagashControlGroup("Режим", modeControl),
      labelWrap("Участников", countSelect),
      seats,
      error,
      start
    );
    setup.append(heading, setupBody);
    gameMount.append(setup);
  };

  const renderGame = () => {
    clearAiTimer();
    gameMount.innerHTML = "";
    if (!game) {
      renderSetup();
      return;
    }
    const shell = el("div", "nagash-game-shell");
    const toolbar = el("div", "nagash-game-toolbar");
    const roundInfo = el("div");
    roundInfo.append(
      el("p", "eyebrow", `Раунд ${game.round}`),
      el("strong", "", game.mode === "ai" ? "Партия против компьютера" : "Локальная партия")
    );
    const newGameButton = button("Новая партия", "ghost-button", () => {
      if (!confirm("Завершить текущую партию и вернуться к выбору участников?")) return;
      game = null;
      localStorage.removeItem(NAGASH_GAME_STORAGE_KEY);
      renderSetup();
    });
    toolbar.append(roundInfo, newGameButton);

    const table = el("div", "nagash-table");
    const seats = el("div", "nagash-player-seats");
    game.players.forEach((player, index) => {
      const seat = el("article", `nagash-player-seat ${index === game.currentIndex && game.phase !== "finished" ? "active" : ""} ${player.diceCount <= 0 ? "eliminated" : ""}`);
      seat.append(directoryPortrait(player.portrait, player.name, player.portraitStyle));
      const copy = el("div", "nagash-player-copy");
      copy.append(
        el("strong", "", player.name),
        el("span", "", player.controller === "ai" ? "Компьютер" : "Игрок"),
        el("span", "nagash-dice-counter", player.diceCount > 0 ? `${player.diceCount} ${nagashDiceWord(player.diceCount)}` : "Выбыл")
      );
      seat.append(copy);
      seats.append(seat);
    });

    const center = el("div", "nagash-table-center");
    const bid = el("div", "nagash-current-bid");
    bid.append(
      el("span", "", "Ставка под зеркалом"),
      el("strong", "", game.lastBid ? nagashBidLabel(game.lastBid.quantity, game.lastBid.face) : "Ставок еще нет")
    );
    if (game.lastBid) bid.append(el("small", "", `Объявил: ${game.players[game.lastBid.bidderIndex]?.name || "участник"}`));
    center.append(bid);

    const current = game.players[game.currentIndex];
    if (game.phase === "handoff") {
      const handoff = el("div", "nagash-handoff");
      handoff.append(
        el("p", "eyebrow", "Передайте устройство"),
        el("h3", "", `Ход: ${current?.name || "участник"}`),
        el("p", "", "Убедитесь, что остальные игроки не смотрят на экран. После открытия будут видны только ваши кости.")
      );
      handoff.append(button("Показать мои кости", "primary-button", () => {
        game.phase = "turn";
        game.handoffRevealed = true;
        persist();
        renderGame();
      }));
      center.append(handoff);
    } else if (game.phase === "turn" && current?.controller === "ai") {
      const thinking = el("div", "nagash-thinking");
      thinking.append(el("span", "nagash-cup-icon"), el("strong", "", `${current.name} изучает отражение...`));
      center.append(thinking);
    } else if (game.phase === "turn") {
      center.append(renderNagashTurnPanel(game, draftQuantity, draftFace, {
        onDraftQuantity(value) { draftQuantity = value; },
        onDraftFace(value) { draftFace = value; },
        onBid() { makeBid(game.currentIndex, draftQuantity, draftFace); },
        onChallenge() { challengeBid(game.currentIndex); },
      }));
    } else if (game.phase === "reveal") {
      center.append(renderNagashReveal(game, () => beginRound(game.nextStarterIndex)));
    } else if (game.phase === "finished") {
      const winner = game.players[game.winnerIndex];
      const finish = el("div", "nagash-finish");
      finish.append(
        el("p", "eyebrow", "Зеркало выбрало победителя"),
        directoryPortrait(winner?.portrait, winner?.name || "Победитель", winner?.portraitStyle),
        el("h3", "", winner?.name || "Победитель"),
        el("p", "", "Последняя чаша осталась на столе. Остальные отражения рассеялись.")
      );
      finish.append(button("Сыграть еще раз", "primary-button", () => {
        game = null;
        localStorage.removeItem(NAGASH_GAME_STORAGE_KEY);
        renderSetup();
      }));
      center.append(finish);
    }
    table.append(seats, center);

    const history = el("aside", "nagash-history");
    history.append(el("p", "eyebrow", "Ход партии"), el("h3", "", "Записи зеркала"));
    const historyList = el("div", "nagash-history-list");
    game.history.slice(0, 14).forEach((entry) => {
      const item = el("div", `nagash-history-entry ${entry.kind || ""}`);
      item.append(el("span", "", `Р${entry.round}`), el("p", "", entry.text));
      historyList.append(item);
    });
    history.append(historyList);
    shell.append(toolbar, table, history);
    gameMount.append(shell);
    if (game.phase === "turn" && current?.controller === "ai") runAiTurn();
  };

  activeAshanaGameCleanup = () => {
    closed = true;
    clearAiTimer();
  };
  renderGame();
  return root;
}

function nagashEntityOptions() {
  const entities = relationshipEntities().map((entity) => ({ ...entity }));
  for (let index = 1; index <= 4; index += 1) {
    entities.push({
      key: `guest:${index}`,
      name: `Странник ${index}`,
      subtitle: "Без привязки к листу",
      portrait: "",
      portraitStyle: defaultImageStyle(),
    });
  }
  return entities;
}

function loadNagashGame() {
  try {
    const game = JSON.parse(localStorage.getItem(NAGASH_GAME_STORAGE_KEY) || "null");
    if (!game || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 4) return null;
    game.players = game.players.map((player, index) => ({
      id: player.id || crypto.randomUUID(),
      entityKey: String(player.entityKey || `guest:${index + 1}`),
      name: String(player.name || `Участник ${index + 1}`),
      subtitle: String(player.subtitle || ""),
      portrait: String(player.portrait || ""),
      portraitStyle: { ...defaultImageStyle(), ...(player.portraitStyle || {}) },
      controller: player.controller === "ai" ? "ai" : "human",
      diceCount: Math.max(0, Math.min(6, Number(player.diceCount) || 0)),
      dice: Array.isArray(player.dice) ? player.dice.map(Number).filter((die) => die >= 1 && die <= 6) : [],
    }));
    game.history = Array.isArray(game.history) ? game.history : [];
    game.round = Math.max(1, Number(game.round) || 1);
    game.currentIndex = Math.max(0, Math.min(game.players.length - 1, Number(game.currentIndex) || 0));
    if (!["turn", "handoff", "reveal", "finished"].includes(game.phase)) return null;
    if (game.mode !== "local") game.mode = "ai";
    if (game.mode === "local" && game.phase === "turn") {
      game.phase = "handoff";
      game.handoffRevealed = false;
    }
    return game;
  } catch (error) {
    console.warn("Не удалось восстановить партию Зеркала Нагаша:", error);
    return null;
  }
}

function saveNagashGame(game) {
  try {
    if (game) localStorage.setItem(NAGASH_GAME_STORAGE_KEY, JSON.stringify(game));
    else localStorage.removeItem(NAGASH_GAME_STORAGE_KEY);
  } catch (error) {
    console.warn("Не удалось сохранить партию Зеркала Нагаша:", error);
  }
}

function nagashRollDice(count) {
  return Array.from({ length: Math.max(0, Number(count) || 0) }, () => Math.floor(Math.random() * 6) + 1);
}

function nagashTotalDice(game) {
  return game.players.reduce((sum, player) => sum + Math.max(0, Number(player.diceCount) || 0), 0);
}

function nagashNextActivePlayer(game, fromIndex) {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (fromIndex + offset) % game.players.length;
    if (game.players[index].diceCount > 0) return index;
  }
  return fromIndex;
}

function nagashDiceWord(value) {
  const amount = Math.abs(Number(value)) % 100;
  const last = amount % 10;
  if (amount > 10 && amount < 20) return "костей";
  if (last === 1) return "кость";
  if (last >= 2 && last <= 4) return "кости";
  return "костей";
}

function nagashFaceWord(face, quantity) {
  const words = {
    1: ["единица", "единицы", "единиц"],
    2: ["двойка", "двойки", "двоек"],
    3: ["тройка", "тройки", "троек"],
    4: ["четверка", "четверки", "четверок"],
    5: ["пятерка", "пятерки", "пятерок"],
    6: ["шестерка", "шестерки", "шестерок"],
  }[face] || ["грань", "грани", "граней"];
  const amount = Math.abs(Number(quantity)) % 100;
  const last = amount % 10;
  if (amount > 10 && amount < 20) return words[2];
  if (last === 1) return words[0];
  if (last >= 2 && last <= 4) return words[1];
  return words[2];
}

function nagashBidLabel(quantity, face) {
  return `${quantity} ${nagashFaceWord(face, quantity)}`;
}

function renderNagashDie(value, options = {}) {
  const die = el("div", `nagash-die face-${value} ${options.compact ? "compact" : ""}`);
  die.setAttribute("aria-label", `Выпало ${value}`);
  const activePips = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  }[Number(value)] || [];
  for (let index = 1; index <= 9; index += 1) {
    die.append(el("span", activePips.includes(index) ? "active" : ""));
  }
  return die;
}

function renderNagashTurnPanel(game, draftQuantity, draftFace, handlers) {
  const current = game.players[game.currentIndex];
  const panel = el("div", "nagash-turn-panel");
  const turnHead = el("div", "nagash-turn-head");
  turnHead.append(el("p", "eyebrow", "Ваш ход"), el("h3", "", current.name));
  const ownDice = el("div", "nagash-own-dice");
  current.dice.forEach((die) => ownDice.append(renderNagashDie(die)));

  const totalDice = nagashTotalDice(game);
  const minimum = game.lastBid ? Number(game.lastBid.quantity) + 1 : 1;
  const bidControls = el("div", "nagash-bid-controls");
  const quantity = selectInput(
    Array.from({ length: Math.max(0, totalDice - minimum + 1) }, (_, index) => {
      const value = minimum + index;
      return [String(value), String(value)];
    }),
    String(Math.max(minimum, Math.min(totalDice, draftQuantity)))
  );
  quantity.disabled = minimum > totalDice;
  quantity.addEventListener("change", () => handlers.onDraftQuantity(Number(quantity.value)));

  const faces = el("div", "nagash-face-picker");
  for (let face = 1; face <= 6; face += 1) {
    const faceButton = button("", `nagash-face-button ${face === draftFace ? "active" : ""}`, () => {
      handlers.onDraftFace(face);
      [...faces.children].forEach((item, index) => item.classList.toggle("active", index + 1 === face));
    });
    faceButton.title = `Выбрать грань ${face}`;
    faceButton.append(renderNagashDie(face, { compact: true }));
    faces.append(faceButton);
  }
  const quantityField = labelWrap("Количество", quantity);
  const faceField = nagashControlGroup("Грань", faces);
  bidControls.append(quantityField, faceField);

  const actions = el("div", "nagash-turn-actions");
  const bidButton = button("Объявить ставку", "primary-button", handlers.onBid);
  bidButton.disabled = minimum > totalDice;
  const challengeButton = button("Обвинить во лжи", "danger-button", handlers.onChallenge);
  challengeButton.disabled = !game.lastBid;
  actions.append(bidButton, challengeButton);

  panel.append(turnHead, el("p", "nagash-private-note", "Только вы видите этот бросок"), ownDice, bidControls, actions);
  return panel;
}

function renderNagashReveal(game, onNextRound) {
  const reveal = game.reveal;
  const panel = el("div", "nagash-reveal");
  const statement = reveal.bidWasTrue
    ? `Ставка была честной: найдено ${reveal.actual}.`
    : `Зеркало раскрыло ложь: найдено только ${reveal.actual}.`;
  panel.append(
    el("p", "eyebrow", "Чаши раскрыты"),
    el("h3", "", statement),
    el("p", "", `${game.players[reveal.loserIndex].name} теряет одну кость.`)
  );
  const rows = el("div", "nagash-reveal-rows");
  game.players.filter((player) => player.dice.length).forEach((player, index) => {
    const row = el("div", `nagash-reveal-row ${game.players.indexOf(player) === reveal.loserIndex ? "loser" : ""}`);
    const name = el("strong", "", player.name);
    const dice = el("div", "nagash-reveal-dice");
    player.dice.forEach((die) => dice.append(renderNagashDie(die, { compact: true })));
    row.append(name, dice);
    rows.append(row);
  });
  panel.append(rows, button("Начать следующий раунд", "primary-button", onNextRound));
  return panel;
}

function nagashControlGroup(title, control) {
  const group = el("div", "nagash-control-group");
  group.append(el("span", "nagash-control-label", title), control);
  return group;
}

function nagashBinomialTailProbability(trials, requiredSuccesses, successChance = 1 / 6) {
  const safeTrials = Math.max(0, Math.floor(Number(trials) || 0));
  const required = Math.floor(Number(requiredSuccesses) || 0);
  if (required <= 0) return 1;
  if (required > safeTrials) return 0;
  let probability = 0;
  for (let successes = required; successes <= safeTrials; successes += 1) {
    let combinations = 1;
    const smallerSide = Math.min(successes, safeTrials - successes);
    for (let step = 1; step <= smallerSide; step += 1) {
      combinations *= (safeTrials - smallerSide + step) / step;
    }
    probability += combinations
      * (successChance ** successes)
      * ((1 - successChance) ** (safeTrials - successes));
  }
  return Math.min(1, Math.max(0, probability));
}

function nagashBidProbability(player, totalDice, quantity, face) {
  const ownMatches = player.dice.filter((die) => die === face).length;
  const hiddenDice = Math.max(0, totalDice - player.diceCount);
  return nagashBinomialTailProbability(hiddenDice, quantity - ownMatches);
}

function nagashAiProfile(player) {
  const seedText = `${player.entityKey || ""}:${player.name || ""}`;
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  const positiveSeed = seed >>> 0;
  return {
    skepticism: 0.26 + (positiveSeed % 11) / 100,
    bluffEdge: 0.08 + ((positiveSeed >>> 6) % 7) / 100,
    deception: 0.08 + ((positiveSeed >>> 12) % 11) / 100,
    openingConfidence: 0.57 + ((positiveSeed >>> 18) % 8) / 100,
  };
}

function nagashRankedBids(player, totalDice, quantity) {
  return Array.from({ length: 6 }, (_, index) => {
    const face = index + 1;
    return {
      quantity,
      face,
      ownMatches: player.dice.filter((die) => die === face).length,
      probability: nagashBidProbability(player, totalDice, quantity, face),
    };
  }).sort((left, right) =>
    right.probability - left.probability
    || right.ownMatches - left.ownMatches
    || left.face - right.face
  );
}

function nagashChooseCredibleBid(candidates, profile) {
  const best = candidates[0];
  if (!best) return null;
  const credibleAlternatives = candidates.filter((candidate) =>
    candidate.probability >= 0.12
    && candidate.probability >= best.probability * 0.72
  );
  if (credibleAlternatives.length > 1 && Math.random() < profile.deception) {
    const alternativeIndex = 1 + Math.floor(Math.random() * (credibleAlternatives.length - 1));
    return credibleAlternatives[alternativeIndex];
  }
  return best;
}

function nagashAiDecision(game, playerIndex) {
  const player = game.players[playerIndex];
  const totalDice = nagashTotalDice(game);
  const profile = nagashAiProfile(player);
  if (!game.lastBid) {
    const credibleOpenings = [];
    for (let quantity = 1; quantity <= totalDice; quantity += 1) {
      const bestAtQuantity = nagashRankedBids(player, totalDice, quantity)[0];
      if (bestAtQuantity.probability >= profile.openingConfidence) credibleOpenings.push(bestAtQuantity);
    }
    const highestCredibleQuantity = credibleOpenings.at(-1)?.quantity || 1;
    const openingCandidates = nagashRankedBids(player, totalDice, highestCredibleQuantity);
    const opening = nagashChooseCredibleBid(openingCandidates, profile) || openingCandidates[0];
    return { action: "bid", quantity: opening.quantity, face: opening.face };
  }

  const bid = game.lastBid;
  const currentBidProbability = nagashBidProbability(player, totalDice, bid.quantity, bid.face);
  const nextQuantity = bid.quantity + 1;
  if (nextQuantity > totalDice) return { action: "challenge" };

  const nextCandidates = nagashRankedBids(player, totalDice, nextQuantity);
  const bestNextBid = nextCandidates[0];
  const chanceToWinChallenge = 1 - currentBidProbability;
  const bluffRoom = profile.bluffEdge * (1 - bid.quantity / totalDice);
  const bidSurvivalValue = bestNextBid.probability + bluffRoom;
  const currentBidLooksAbsurd = currentBidProbability < profile.skepticism;
  const nextBidWouldBeAbsurd = bestNextBid.probability < 0.08;

  if (currentBidLooksAbsurd || nextBidWouldBeAbsurd || chanceToWinChallenge > bidSurvivalValue) {
    return { action: "challenge" };
  }

  let chosenBid = nagashChooseCredibleBid(nextCandidates, profile) || bestNextBid;
  if (nextQuantity + 1 <= totalDice && chosenBid.probability >= 0.72 && Math.random() < 0.1) {
    const confidentJump = nagashRankedBids(player, totalDice, nextQuantity + 1)
      .find((candidate) => candidate.face === chosenBid.face);
    if (confidentJump?.probability >= 0.55) chosenBid = confidentJump;
  }
  return { action: "bid", quantity: chosenBid.quantity, face: chosenBid.face };
}

function renderMinigame() {
  const root = el("div");
  root.append(header("Мини-игры", "Небольшие игровые сцены Асханы: погони, обороны и быстрые испытания между сессиями."));

  const selector = el("div", "minigame-selector");
  [
    ["heretic", "Побег еретика", "Собери реликвии и не дай инквизитору тебя догнать."],
    ["mirinka", "Оборона Миринки", "Выдержи ночной налет, распределяя защитников по дорогам поселения."],
    ["caravan", "Караван реликвария", "Проведи цепь паломников за припасами и не врежься в частокол."],
    ["casino", "Казино Могилы Лешего", "Испытай удачу на пяти барабанах и вынеси из кургана мешок лешачьих марок."],
  ].forEach(([id, title, description]) => {
    const card = button("", `minigame-card ${activeMinigameId === id ? "active" : ""}`, () => {
      if (activeMinigameId === id) return;
      activeMinigameId = id;
      saveUiState();
      render();
    });
    card.append(el("strong", "", title), el("span", "", description));
    selector.append(card);
  });
  root.append(selector);

  const minigameRenderers = {
    heretic: renderHereticMinigame,
    mirinka: renderMirinkaDefense,
    caravan: renderCaravanSnake,
    casino: renderLeshyCasino,
  };
  root.append(
    (minigameRenderers[activeMinigameId] || renderHereticMinigame)(),
    renderMinigameLeaderboards()
  );
  return root;
}

function minigameDefinition(gameId) {
  return {
    heretic: {
      title: "Побег еретика",
      scoreLabel: "очков",
    },
    mirinka: {
      title: "Оборона Миринки",
      scoreLabel: "очков",
    },
    caravan: {
      title: "Караван реликвария",
      scoreLabel: "очков",
    },
    casino: {
      title: "Казино Могилы Лешего",
      scoreLabel: "марок прибыли",
    },
  }[gameId] ?? { title: "Мини-игра", scoreLabel: "очков" };
}

function renderMinigameLeaderboards() {
  const section = el("section", "minigame-leaderboards");
  const heading = el("div", "minigame-leaderboards-head");
  heading.append(
    el("p", "eyebrow", "Общий рейтинг"),
    el("h3", "", "Лучшие результаты Асханы"),
    el("p", "", "Топ-10 хранится в общей базе и одинаково отображается у всех игроков.")
  );
  const grid = el("div", "minigame-leaderboards-grid");
  ["heretic", "mirinka", "caravan", "casino"].forEach((gameId) => {
    grid.append(renderMinigameLeaderboardCard(gameId));
  });
  section.append(heading, grid);
  return section;
}

function renderMinigameLeaderboardCard(gameId) {
  const definition = minigameDefinition(gameId);
  const card = el("article", `minigame-leaderboard-card ${activeMinigameId === gameId ? "active" : ""}`);
  card.dataset.minigameLeaderboard = gameId;
  const head = el("div", "minigame-leaderboard-head");
  head.append(el("span", "minigame-leaderboard-mark", "10"), el("h4", "", definition.title));
  const list = el("div", "minigame-leaderboard-list");
  list.append(el("p", "empty", "Загрузка рекордов..."));
  card.append(head, list);
  loadMinigameLeaderboard(gameId).then((entries) => renderMinigameLeaderboardRows(list, gameId, entries));
  return card;
}

async function loadMinigameLeaderboard(gameId, force = false) {
  if (!force && minigameLeaderboardCache.has(gameId)) {
    return minigameLeaderboardCache.get(gameId);
  }
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from("roll_logs")
    .select("id, actor, label, formula, rolls, total, created_at")
    .eq("label", `${MINIGAME_SCORE_PREFIX}${gameId}`)
    .order("total", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) {
    console.warn(`Рейтинг мини-игры ${gameId} временно недоступен:`, error.message);
    return [];
  }
  const entries = (data ?? []).map((row) => ({
    id: row.id,
    name: row.actor || "Безымянный герой",
    details: row.formula || "",
    score: Number(row.total || 0),
    createdAt: row.created_at || "",
  }));
  minigameLeaderboardCache.set(gameId, entries);
  return entries;
}

function renderMinigameLeaderboardRows(list, gameId, entries) {
  if (!list?.isConnected && !list?.parentElement) return;
  list.innerHTML = "";
  if (!entries.length) {
    list.append(el("p", "empty", supabaseClient ? "Рекордов пока нет. Первый результат может стать легендой." : "Общая база пока не подключена."));
    return;
  }
  entries.slice(0, 10).forEach((entry, index) => {
    const row = el("div", `minigame-leaderboard-row ${index < 3 ? `rank-${index + 1}` : ""}`);
    const place = el("strong", "minigame-leaderboard-place", String(index + 1));
    const person = el("div", "minigame-leaderboard-person");
    person.append(
      el("strong", "", entry.name),
      el("span", "", entry.details || minigameDefinition(gameId).title)
    );
    const value = el("strong", "minigame-leaderboard-score", entry.score.toLocaleString("ru-RU"));
    row.append(place, person, value);
    list.append(row);
  });
}

function refreshVisibleMinigameLeaderboards(force = false) {
  document.querySelectorAll("[data-minigame-leaderboard]").forEach((card) => {
    const gameId = card.dataset.minigameLeaderboard;
    const list = card.querySelector(".minigame-leaderboard-list");
    if (!gameId || !list) return;
    loadMinigameLeaderboard(gameId, force).then((entries) => renderMinigameLeaderboardRows(list, gameId, entries));
  });
}

function isMinigameScoreLabel(label) {
  return String(label || "").startsWith(MINIGAME_SCORE_PREFIX);
}

function minigameIdFromScoreLabel(label) {
  return String(label || "").slice(MINIGAME_SCORE_PREFIX.length);
}

function createMinigameResultPanel(gameId) {
  const panel = el("section", "minigame-result-panel");
  panel.dataset.minigameResult = gameId;
  panel.hidden = true;
  return panel;
}

function updateMinigameResultPanel(panel, gameId, game) {
  if (!panel || !game) return;
  const finished = gameId === "mirinka" ? Boolean(game.victory || game.gameOver) : Boolean(game.gameOver);
  panel.hidden = !finished;
  panel.innerHTML = "";
  if (!finished) return;

  const result = minigameScoreSnapshot(gameId, game);
  const runId = game.runId || `${gameId}-${result.score}-${Date.now()}`;
  game.runId = runId;
  const copy = el("div", "minigame-result-copy");
  copy.append(
    el("p", "eyebrow", gameId === "mirinka" && game.victory ? "Победа" : "Испытание завершено"),
    el("h3", "", `${result.score.toLocaleString("ru-RU")} ${minigameDefinition(gameId).scoreLabel}`),
    el("p", "", result.details)
  );
  panel.append(copy);

  if (isMinigameRunSubmitted(runId)) {
    const saved = el("div", "minigame-result-saved");
    saved.append(el("strong", "", "Результат сохранён"), el("span", "", "Он уже участвует в общем рейтинге."));
    panel.append(saved);
    return;
  }

  const form = el("form", "minigame-result-form");
  const nameLabel = el("label", "");
  nameLabel.append(document.createTextNode("Имя в таблице"));
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "scoreName";
  nameInput.required = true;
  nameInput.maxLength = 28;
  nameInput.autocomplete = "nickname";
  nameInput.placeholder = "Например: Ричи";
  nameInput.value = localStorage.getItem(MINIGAME_SCORE_NAME_KEY) || "";
  nameLabel.append(nameInput);
  const submit = button("Сохранить результат", "primary-button", null);
  submit.type = "submit";
  const message = el("p", "minigame-result-message");
  form.append(nameLabel, submit, message);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = String(nameInput.value || "").replace(/\s+/g, " ").trim().slice(0, 28);
    if (name.length < 2) {
      message.textContent = "Укажи имя минимум из двух символов.";
      nameInput.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Сохраняю...";
    message.textContent = "";
    const saved = await saveMinigameScore(gameId, runId, name, result);
    if (!saved) {
      submit.disabled = false;
      submit.textContent = "Сохранить результат";
      message.textContent = "Не удалось связаться с общей базой. Результат можно отправить повторно.";
      return;
    }
    localStorage.setItem(MINIGAME_SCORE_NAME_KEY, name);
    markMinigameRunSubmitted(runId);
    minigameLeaderboardCache.delete(gameId);
    updateMinigameResultPanel(panel, gameId, game);
    refreshVisibleMinigameLeaderboards(true);
  });
  panel.append(form);
}

function minigameScoreSnapshot(gameId, game) {
  if (gameId === "mirinka") {
    const maxWaves = Math.max(1, Number(game.maxWaves || 5));
    const reachedWave = game.victory
      ? maxWaves
      : Math.min(maxWaves, Number(game.wave || 0) + (game.gameOver || game.waveRunning ? 1 : 0));
    const integrity = Math.max(0, Math.ceil(Number(game.integrity || 0)));
    const defeated = Math.max(0, Number(game.defeated || 0));
    const supplies = Math.max(0, Number(game.supplies || 0));
    const score = Math.round((game.victory ? 6000 : 0) + reachedWave * 1000 + defeated * 30 + integrity * 12 + supplies * 5);
    return {
      score,
      details: `${game.victory ? "победа" : "поражение"} · волна ${reachedWave}/${maxWaves} · целостность ${integrity}% · врагов ${defeated}`,
      metrics: [reachedWave, integrity, defeated, supplies],
    };
  }
  if (gameId === "casino") {
    const profit = casinoSessionProfit(game);
    const wallet = Math.max(0, Math.floor(Number(game.wallet || 0)));
    const spins = Math.max(0, Number(game.spins || 0));
    const bestWin = Math.max(0, Math.floor(Number(game.bestWin || 0)));
    return {
      score: Math.max(0, profit),
      details: `кошель ${wallet} марок · прибыль ${profit >= 0 ? "+" : ""}${profit} · вращений ${spins} · лучший куш ${bestWin}`,
      metrics: [wallet, profit, spins, bestWin],
    };
  }
  if (gameId === "caravan") {
    const score = Math.max(0, Math.floor(Number(game.score || 0)));
    const relics = Math.max(0, Number(game.relics || 0));
    const length = Math.max(0, game.segments?.length || 0);
    return {
      score,
      details: `припасов ${relics} · длина каравана ${length}`,
      metrics: [relics, length],
    };
  }
  const score = Math.max(0, Math.floor(Number(game.score || 0)));
  const relics = Math.max(0, Number(game.relics || 0));
  const seconds = Math.max(0, Math.floor(Number(game.time || 0)));
  return {
    score,
    details: `реликвий ${relics} · погоня ${seconds} сек.`,
    metrics: [relics, seconds],
  };
}

async function saveMinigameScore(gameId, runId, name, result) {
  if (!supabaseClient) return false;
  const cleanRunId = String(runId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);
  const entry = {
    id: `minigame-score-${gameId}-${cleanRunId}`,
    actor: name,
    label: `${MINIGAME_SCORE_PREFIX}${gameId}`,
    formula: result.details,
    rolls: result.metrics,
    total: Math.round(result.score),
    created_at: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from("roll_logs").insert(entry);
  if (error && error.code !== "23505") {
    console.warn("Результат мини-игры не сохранён:", error.message);
    return false;
  }
  return true;
}

function submittedMinigameRuns() {
  try {
    const value = JSON.parse(localStorage.getItem(MINIGAME_SCORE_SUBMITTED_KEY) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function isMinigameRunSubmitted(runId) {
  return submittedMinigameRuns().includes(runId);
}

function markMinigameRunSubmitted(runId) {
  try {
    const values = [runId, ...submittedMinigameRuns().filter((id) => id !== runId)].slice(0, 120);
    localStorage.setItem(MINIGAME_SCORE_SUBMITTED_KEY, JSON.stringify(values));
  } catch {
    // The database still guards a run from duplicate inserts through its deterministic id.
  }
}

const CASINO_BETS = [10, 25, 50, 100, 250];
const CASINO_LINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];
const CASINO_SYMBOLS = [
  { id: "crown", glyph: "♛", title: "Корона Ватиката", weight: 4, payouts: { 3: 10, 4: 35, 5: 180 } },
  { id: "skull", glyph: "☠", title: "Могила Лешего", weight: 7, payouts: { 3: 7, 4: 20, 5: 80 } },
  { id: "swords", glyph: "⚔", title: "Клинки Межей", weight: 10, payouts: { 3: 5, 4: 14, 5: 45 } },
  { id: "rune", glyph: "ᚱ", title: "Руна Асханы", weight: 13, payouts: { 3: 4, 4: 10, 5: 30 } },
  { id: "coin", glyph: "¤", title: "Лешачья марка", weight: 18, payouts: { 3: 3, 4: 7, 5: 18 } },
  { id: "wild", glyph: "✦", title: "Дикий огонь", weight: 4, payouts: { 3: 12, 4: 45, 5: 220 }, wild: true },
  { id: "relic", glyph: "◆", title: "Древняя реликвия", weight: 6, payouts: {}, scatter: true },
];

function renderLeshyCasino() {
  const root = el("div");
  const shell = el("section", "panel minigame-panel casino-panel");
  const top = el("div", "casino-top");
  const walletStat = el("div", "minigame-stat casino-wallet");
  const profitStat = el("div", "minigame-stat");
  const jackpotStat = el("div", "minigame-stat");
  const status = el("div", "minigame-status casino-status");
  status.setAttribute("aria-live", "polite");
  const finishButton = button("Завершить вечер", "ghost-button", null);
  top.append(walletStat, profitStat, jackpotStat, status, finishButton);

  const resultPanel = createMinigameResultPanel("casino");
  const stage = el("div", "casino-stage");
  const stageShade = el("div", "casino-stage-shade");
  const heading = el("div", "casino-heading");
  heading.append(
    el("p", "eyebrow", "Под курганом Могилы Лешего"),
    el("h3", "", "Пять печатей удачи"),
    el("p", "", "Пять линий. Дикий огонь заменяет любой знак, а три реликвии платят в любом месте.")
  );

  const machine = el("div", "casino-machine");
  const machineTop = el("div", "casino-machine-top");
  machineTop.append(el("span", "", "КАЗИНО"), el("strong", "", "МОГИЛЫ ЛЕШЕГО"), el("span", "", "5 ЛИНИЙ"));
  const reels = el("div", "casino-reels");
  const reelNodes = [];
  for (let reelIndex = 0; reelIndex < 5; reelIndex += 1) {
    const reel = el("div", "casino-reel");
    reel.dataset.reel = String(reelIndex);
    const cells = [];
    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      const cell = el("div", "casino-cell");
      cell.dataset.reel = String(reelIndex);
      cell.dataset.row = String(rowIndex);
      reel.append(cell);
      cells.push(cell);
    }
    reels.append(reel);
    reelNodes.push({ reel, cells });
  }

  const machineControls = el("div", "casino-controls");
  const betGroup = el("div", "casino-bet-group");
  const betLabel = el("span", "", "Ставка");
  const betValue = el("strong", "", "10");
  const betDown = button("−", "icon-button casino-bet-button", null);
  betDown.title = "Уменьшить ставку";
  betDown.setAttribute("aria-label", "Уменьшить ставку");
  const betUp = button("+", "icon-button casino-bet-button", null);
  betUp.title = "Увеличить ставку";
  betUp.setAttribute("aria-label", "Увеличить ставку");
  betGroup.append(betLabel, betDown, betValue, betUp);
  const spinButton = button("Вращать", "primary-button casino-spin-button", null);
  const helpButton = button("Таблица выплат", "ghost-button casino-rules-button", null);
  machineControls.append(betGroup, spinButton, helpButton);
  machine.append(machineTop, reels, machineControls);

  const sessionStrip = el("div", "casino-session-strip");
  const spinsNode = el("span");
  const wageredNode = el("span");
  const wonNode = el("span");
  const bestNode = el("span");
  sessionStrip.append(spinsNode, wageredNode, wonNode, bestNode);

  const lower = el("div", "casino-lower");
  const paytable = el("section", "casino-paytable");
  paytable.hidden = true;
  const paytableHead = el("div", "casino-section-head");
  paytableHead.append(el("h4", "", "Таблица выплат"), el("span", "", "множитель ставки на линию"));
  const paytableRows = el("div", "casino-paytable-rows");
  CASINO_SYMBOLS.forEach((symbol) => {
    const row = el("div", "casino-paytable-row");
    const mark = el("span", `casino-mini-symbol casino-symbol-${symbol.id}`, symbol.glyph);
    mark.title = symbol.title;
    const values = symbol.scatter
      ? "3 — ×2 · 4 — ×5 · 5+ — ×15 от ставки"
      : `3 — ×${symbol.payouts[3] || 0} · 4 — ×${symbol.payouts[4] || 0} · 5 — ×${symbol.payouts[5] || 0}`;
    row.append(mark, el("strong", "", symbol.title), el("span", "", values));
    paytableRows.append(row);
  });
  paytable.append(paytableHead, paytableRows);

  const history = el("section", "casino-history");
  const historyHead = el("div", "casino-section-head");
  historyHead.append(el("h4", "", "Последние вращения"), el("span", "", "эта игровая сессия"));
  const historyList = el("div", "casino-history-list");
  history.append(historyHead, historyList);
  lower.append(paytable, history);

  stageShade.append(heading, machine, sessionStrip);
  stage.append(stageShade);
  shell.append(top, resultPanel, stage, lower);
  root.append(shell);

  let game = loadLeshyCasino();
  let pendingOutcome = null;
  const timers = new Set();
  const minimumBet = CASINO_BETS[0];

  const schedule = (callback, delay) => {
    const handle = window.setTimeout(() => {
      timers.delete(handle);
      callback();
    }, delay);
    timers.add(handle);
    return handle;
  };
  const clearTimers = () => {
    timers.forEach((handle) => {
      window.clearTimeout(handle);
      window.clearInterval(handle);
    });
    timers.clear();
  };

  const paintCell = (cell, symbol, winning = false) => {
    cell.className = `casino-cell casino-symbol-${symbol.id}${winning ? " winning" : ""}`;
    cell.replaceChildren(
      el("span", "casino-symbol-glyph", symbol.glyph),
      el("small", "", symbol.id === "wild" ? "WILD" : symbol.id === "relic" ? "РЕЛИКВИЯ" : symbol.title)
    );
    cell.title = symbol.title;
  };
  const paintGrid = (grid, winningCells = new Set()) => {
    reelNodes.forEach(({ cells }, reelIndex) => {
      cells.forEach((cell, rowIndex) => {
        const symbol = casinoSymbol(grid?.[reelIndex]?.[rowIndex]) || casinoRandomSymbol();
        paintCell(cell, symbol, winningCells.has(`${reelIndex}:${rowIndex}`));
      });
    });
  };
  const paintRandomReel = (reelIndex) => {
    reelNodes[reelIndex].cells.forEach((cell) => paintCell(cell, casinoRandomSymbol()));
  };

  const renderHistory = () => {
    historyList.innerHTML = "";
    if (!game.lastWins.length) {
      historyList.append(el("p", "empty", "Стол ещё ждёт первого вращения."));
      return;
    }
    game.lastWins.slice(0, 6).forEach((entry) => {
      const row = el("div", `casino-history-row ${entry.win > 0 ? "won" : ""}`);
      row.append(
        el("span", "", `Ставка ${entry.bet}`),
        el("strong", "", entry.win > 0 ? `+${entry.win}` : "без выигрыша"),
        el("small", "", entry.label || "Печати молчат")
      );
      historyList.append(row);
    });
  };

  const updateUi = () => {
    const profit = casinoSessionProfit(game);
    walletStat.replaceChildren(el("strong", "", game.wallet.toLocaleString("ru-RU")), el("span", "", "лешачьих марок"));
    profitStat.replaceChildren(el("strong", "", `${profit >= 0 ? "+" : ""}${profit}`), el("span", "", "прибыль вечера"));
    jackpotStat.replaceChildren(el("strong", "", game.jackpot.toLocaleString("ru-RU")), el("span", "", "сокровищница"));
    betValue.textContent = game.bet.toLocaleString("ru-RU");
    spinsNode.textContent = `Вращений: ${game.spins}`;
    wageredNode.textContent = `Поставлено: ${game.totalWagered}`;
    wonNode.textContent = `Получено: ${game.totalWon}`;
    bestNode.textContent = `Лучший куш: ${game.bestWin}`;
    status.textContent = game.message;
    finishButton.textContent = game.gameOver ? "Новый вечер" : "Завершить вечер";
    spinButton.disabled = game.spinning || game.gameOver || game.wallet < game.bet;
    betDown.disabled = game.spinning || game.gameOver || CASINO_BETS.indexOf(game.bet) <= 0;
    betUp.disabled = game.spinning || game.gameOver || CASINO_BETS.indexOf(game.bet) >= CASINO_BETS.length - 1;
    spinButton.textContent = game.spinning ? "Печати вращаются..." : game.wallet < minimumBet ? "Касса пуста" : "Вращать";
    updateMinigameResultPanel(resultPanel, "casino", game);
    renderHistory();
  };

  const settleSpin = () => {
    if (!pendingOutcome) return;
    clearTimers();
    const { grid, result } = pendingOutcome;
    pendingOutcome = null;
    game.grid = grid;
    game.spinning = false;
    let payout = result.payout;
    if (result.jackpot) {
      payout += game.jackpot;
      game.jackpot = 2500;
    }
    game.wallet += payout;
    game.totalWon += payout;
    game.bestWin = Math.max(game.bestWin, payout);
    const label = result.labels.length ? result.labels.join(" · ") : "Печати молчат";
    game.lastWins.unshift({ bet: game.bet, win: payout, label });
    game.lastWins = game.lastWins.slice(0, 6);
    game.message = payout > 0
      ? `${result.jackpot ? "Сокровищница открыта! " : ""}Выигрыш ${payout} марок: ${label}.`
      : game.wallet < minimumBet
        ? "Кошель пуст. Заведение выдаст дорожный мешок на новый вечер."
        : "Леший забрал ставку. Попробуй другую печать.";
    paintGrid(grid, result.winningCells);
    saveLeshyCasino(game);
    updateUi();
  };

  const spin = () => {
    if (game.spinning || game.gameOver) return;
    if (game.wallet < game.bet) {
      game.message = "Недостаточно лешачьих марок для этой ставки.";
      updateUi();
      return;
    }
    game.wallet -= game.bet;
    game.totalWagered += game.bet;
    game.spins += 1;
    game.jackpot += Math.max(1, Math.round(game.bet * 0.08));
    game.spinning = true;
    game.message = "Костяные барабаны набирают ход...";
    const grid = createCasinoGrid();
    pendingOutcome = { grid, result: evaluateCasinoGrid(grid, game.bet) };
    saveLeshyCasino(game);
    updateUi();
    reels.classList.add("spinning");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reelNodes.forEach(({ reel }, reelIndex) => {
      reel.classList.add("rolling");
      const interval = window.setInterval(() => paintRandomReel(reelIndex), reducedMotion ? 80 : 58);
      timers.add(interval);
      schedule(() => {
        window.clearInterval(interval);
        timers.delete(interval);
        reel.classList.remove("rolling");
        game.grid[reelIndex] = grid[reelIndex];
        reelNodes[reelIndex].cells.forEach((cell, rowIndex) => paintCell(cell, casinoSymbol(grid[reelIndex][rowIndex])));
        if (reelIndex === reelNodes.length - 1) {
          reels.classList.remove("spinning");
          settleSpin();
        }
      }, reducedMotion ? 120 + reelIndex * 35 : 620 + reelIndex * 170);
    });
  };

  const changeBet = (direction) => {
    if (game.spinning || game.gameOver) return;
    const current = Math.max(0, CASINO_BETS.indexOf(game.bet));
    const next = Math.max(0, Math.min(CASINO_BETS.length - 1, current + direction));
    game.bet = CASINO_BETS[next];
    game.message = `Ставка изменена: ${game.bet} лешачьих марок.`;
    saveLeshyCasino(game);
    updateUi();
  };

  const startNewEvening = () => {
    const refilled = game.wallet < minimumBet;
    const wallet = refilled ? 500 : game.wallet;
    game = createLeshyCasinoGame(wallet);
    game.message = refilled
      ? "Крупье выдал дорожный мешок: 500 марок. Новый вечер начинается."
      : "Новый вечер начинается. Костяные барабаны готовы.";
    paintGrid(game.grid);
    saveLeshyCasino(game);
    updateUi();
  };

  spinButton.addEventListener("click", spin);
  betDown.addEventListener("click", () => changeBet(-1));
  betUp.addEventListener("click", () => changeBet(1));
  helpButton.addEventListener("click", () => {
    paytable.hidden = !paytable.hidden;
    helpButton.textContent = paytable.hidden ? "Таблица выплат" : "Скрыть выплаты";
  });
  finishButton.addEventListener("click", () => {
    if (game.spinning) return;
    if (game.gameOver) {
      startNewEvening();
      return;
    }
    if (!game.spins) {
      game.message = "Сначала сделай хотя бы одно вращение.";
      updateUi();
      return;
    }
    game.gameOver = true;
    game.message = `Вечер завершён. Итоговая прибыль: ${casinoSessionProfit(game)} марок.`;
    saveLeshyCasino(game);
    updateUi();
  });

  const keydown = (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
    if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      spin();
    }
  };
  window.addEventListener("keydown", keydown);

  paintGrid(game.grid);
  updateUi();
  activeMinigameCleanup = () => {
    if (pendingOutcome) settleSpin();
    clearTimers();
    window.removeEventListener("keydown", keydown);
    saveLeshyCasino(game);
  };
  return root;
}

function casinoSymbol(symbolId) {
  return CASINO_SYMBOLS.find((symbol) => symbol.id === symbolId);
}

function casinoRandomSymbol() {
  const totalWeight = CASINO_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const symbol of CASINO_SYMBOLS) {
    roll -= symbol.weight;
    if (roll <= 0) return symbol;
  }
  return CASINO_SYMBOLS[CASINO_SYMBOLS.length - 1];
}

function createCasinoGrid() {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => casinoRandomSymbol().id));
}

function evaluateCasinoGrid(grid, bet) {
  const lineStake = bet / CASINO_LINES.length;
  const winningCells = new Set();
  const labels = [];
  let payout = 0;
  let jackpot = false;

  CASINO_LINES.forEach((rows, lineIndex) => {
    const symbols = rows.map((row, reel) => casinoSymbol(grid[reel][row]));
    if (symbols[0]?.scatter) return;
    const base = symbols.find((symbol) => symbol && !symbol.wild && !symbol.scatter) || symbols[0];
    if (!base || base.scatter) return;
    let count = 0;
    for (const symbol of symbols) {
      if (symbol && (symbol.id === base.id || symbol.wild)) count += 1;
      else break;
    }
    if (count < 3) return;
    const multiplier = Number(base.payouts[count] || 0);
    if (!multiplier) return;
    const amount = Math.max(1, Math.round(lineStake * multiplier));
    payout += amount;
    labels.push(`${base.title}: ${count} на линии ${lineIndex + 1}`);
    for (let reel = 0; reel < count; reel += 1) {
      winningCells.add(`${reel}:${rows[reel]}`);
    }
    if (base.id === "crown" && count === 5) jackpot = true;
  });

  const scatterCells = [];
  grid.forEach((reel, reelIndex) => {
    reel.forEach((symbolId, rowIndex) => {
      if (symbolId === "relic") scatterCells.push(`${reelIndex}:${rowIndex}`);
    });
  });
  if (scatterCells.length >= 3) {
    const multiplier = scatterCells.length >= 5 ? 15 : scatterCells.length === 4 ? 5 : 2;
    payout += bet * multiplier;
    scatterCells.forEach((key) => winningCells.add(key));
    labels.push(`Древние реликвии: ${scatterCells.length}`);
  }
  return { payout, jackpot, labels, winningCells };
}

function createLeshyCasinoGame(wallet = 1000) {
  return {
    runId: crypto.randomUUID(),
    wallet: Math.max(0, Math.floor(Number(wallet || 0))),
    sessionStartBalance: Math.max(0, Math.floor(Number(wallet || 0))),
    bet: 10,
    spins: 0,
    totalWagered: 0,
    totalWon: 0,
    bestWin: 0,
    jackpot: 2500,
    grid: createCasinoGrid(),
    lastWins: [],
    spinning: false,
    gameOver: false,
    message: "Костяные барабаны готовы. Выбери ставку и испытай удачу.",
  };
}

function loadLeshyCasino() {
  try {
    const saved = JSON.parse(localStorage.getItem(CASINO_STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return createLeshyCasinoGame();
    const fallback = createLeshyCasinoGame(Number(saved.wallet || 0));
    return {
      ...fallback,
      ...saved,
      runId: saved.runId || crypto.randomUUID(),
      wallet: Math.max(0, Math.floor(Number(saved.wallet ?? fallback.wallet))),
      sessionStartBalance: Math.max(0, Math.floor(Number(saved.sessionStartBalance ?? saved.wallet ?? fallback.wallet))),
      bet: CASINO_BETS.includes(Number(saved.bet)) ? Number(saved.bet) : 10,
      spins: Math.max(0, Number(saved.spins || 0)),
      totalWagered: Math.max(0, Number(saved.totalWagered || 0)),
      totalWon: Math.max(0, Number(saved.totalWon || 0)),
      bestWin: Math.max(0, Number(saved.bestWin || 0)),
      jackpot: Math.max(2500, Number(saved.jackpot || 2500)),
      grid: Array.isArray(saved.grid) && saved.grid.length === 5 ? saved.grid : fallback.grid,
      lastWins: Array.isArray(saved.lastWins) ? saved.lastWins.slice(0, 6) : [],
      spinning: false,
      gameOver: Boolean(saved.gameOver),
    };
  } catch {
    return createLeshyCasinoGame();
  }
}

function saveLeshyCasino(game) {
  try {
    localStorage.setItem(CASINO_STORAGE_KEY, JSON.stringify({
      ...game,
      spinning: false,
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Не удалось сохранить казино:", error.message);
  }
}

function casinoSessionProfit(game) {
  return Math.floor(Number(game.wallet || 0) - Number(game.sessionStartBalance || 0));
}

function renderHereticMinigame() {
  const root = el("div");

  const shell = el("section", "panel minigame-panel");
  const top = el("div", "minigame-top");
  const score = el("div", "minigame-stat");
  const status = el("div", "minigame-status", "WASD / стрелки - движение. Пробел - рывок. Esc - пауза.");
  let gameControl = null;
  const restart = button("Начать", "primary-button", () => {
    if (!gameControl) return;
    if (gameControl.isGameOver()) {
      gameControl.restart();
      return;
    }
    if (!gameControl.isStarted()) {
      gameControl.start();
      return;
    }
    if (gameControl.isPaused()) {
      gameControl.resume();
      return;
    }
    gameControl.pause("Пауза. Нажми «Продолжить», когда будешь готов бежать дальше.");
  });
  top.append(score, status, restart);

  const canvasWrap = el("div", "minigame-canvas-wrap");
  const canvas = document.createElement("canvas");
  canvas.width = 820;
  canvas.height = 420;
  canvas.setAttribute("aria-label", "Мини-игра Еретик бежит");
  canvasWrap.append(canvas);

  const controls = el("div", "minigame-controls");
  [
    ["up", "↑"],
    ["left", "←"],
    ["dash", "рывок"],
    ["right", "→"],
    ["down", "↓"],
  ].forEach(([key, label]) => {
    const control = button(label, `small-button minigame-control ${key === "dash" ? "dash" : ""}`, null);
    control.addEventListener("pointerdown", () => minigameTouchKeys.add(key));
    control.addEventListener("pointerup", () => minigameTouchKeys.delete(key));
    control.addEventListener("pointerleave", () => minigameTouchKeys.delete(key));
    controls.append(control);
  });

  const help = el("div", "minigame-help");
  const resultPanel = createMinigameResultPanel("heretic");
  [
    ["WASD", "движение"],
    ["↑ ↓ ← →", "движение"],
    ["Space", "рывок"],
    ["Esc", "пауза / продолжить"],
  ].forEach(([key, label]) => {
    const item = el("span", "minigame-help-item");
    item.append(el("kbd", "", key), document.createTextNode(label));
    help.append(item);
  });

  shell.append(top, resultPanel, canvasWrap, controls, help);
  root.append(shell);
  gameControl = startHereticRun(canvas, score, status, {
    onStateChange: (game) => {
      restart.textContent = game.gameOver ? "Начать заново" : !game.started ? "Начать" : game.paused ? "Продолжить" : "Пауза";
      if (game.gameOver) saveMinigameState(game);
      updateMinigameResultPanel(resultPanel, "heretic", game);
    },
  });
  activeMinigameCleanup = gameControl.cleanup;
  return root;
}

function renderMirinkaDefense() {
  const root = el("div");
  const shell = el("section", "panel minigame-panel defense-panel");
  const top = el("div", "minigame-top");
  const score = el("div", "minigame-stat");
  const status = el("div", "minigame-status", "Выбери направление, ставь защитников и переживи 5 волн. Space - следующая волна, Esc - пауза.");
  let gameControl = null;
  const mainButton = button("Начать оборону", "primary-button", () => {
    if (!gameControl) return;
    if (gameControl.isFinished()) {
      gameControl.restart();
      return;
    }
    if (!gameControl.isStarted()) {
      gameControl.start();
      return;
    }
    if (gameControl.canStartWave()) {
      gameControl.startWave();
      return;
    }
    if (gameControl.isPaused()) {
      gameControl.resume();
      return;
    }
    gameControl.pause("Пауза. Нажми «Продолжить», когда будешь готов держать оборону.");
  });
  top.append(score, status, mainButton);

  const canvasWrap = el("div", "minigame-canvas-wrap defense-canvas-wrap");
  const canvas = document.createElement("canvas");
  canvas.width = 820;
  canvas.height = 420;
  canvas.setAttribute("aria-label", "Мини-игра Оборона Миринки");
  canvasWrap.append(canvas);

  const laneRow = el("div", "defense-lane-row");
  const shop = el("div", "defense-shop");
  const help = el("div", "minigame-help");
  const resultPanel = createMinigameResultPanel("mirinka");
  [
    ["Клик по дороге", "выбор направления"],
    ["Стража", "держит центр"],
    ["Лучники", "бьют издалека"],
    ["Маг", "урон по области"],
    ["Баррикада", "замедляет"],
  ].forEach(([key, label]) => {
    const item = el("span", "minigame-help-item");
    item.append(el("kbd", "", key), document.createTextNode(label));
    help.append(item);
  });

  shell.append(top, resultPanel, canvasWrap, laneRow, shop, help);
  root.append(shell);
  gameControl = startMirinkaDefense(canvas, score, status, laneRow, shop, {
    onStateChange: (game) => {
      mainButton.textContent = defenseMainButtonText(game);
      if (game.victory || game.gameOver) saveDefenseState(game);
      updateMinigameResultPanel(resultPanel, "mirinka", game);
    },
  });
  activeMinigameCleanup = gameControl.cleanup;
  return root;
}

function defenseMainButtonText(game) {
  if (game.victory || game.gameOver) return "Начать заново";
  if (!game.started) return "Начать оборону";
  if (game.paused) return "Продолжить";
  if (!game.waveRunning) return game.wave >= game.maxWaves ? "Итог" : `Начать волну ${game.wave + 1}`;
  return "Пауза";
}

function renderCaravanSnake() {
  const root = el("div");
  const shell = el("section", "panel minigame-panel");
  const top = el("div", "minigame-top");
  const score = el("div", "minigame-stat");
  const status = el("div", "minigame-status", "WASD / стрелки - поворот каравана. Esc - пауза.");
  let gameControl = null;
  const mainButton = button("Начать путь", "primary-button", () => {
    if (!gameControl) return;
    if (gameControl.isGameOver()) {
      gameControl.restart();
      return;
    }
    if (!gameControl.isStarted()) {
      gameControl.start();
      return;
    }
    if (gameControl.isPaused()) {
      gameControl.resume();
      return;
    }
    gameControl.pause("Пауза. Караван ждет нового приказа.");
  });
  top.append(score, status, mainButton);

  const canvasWrap = el("div", "minigame-canvas-wrap");
  const canvas = document.createElement("canvas");
  canvas.width = 820;
  canvas.height = 420;
  canvas.setAttribute("aria-label", "Мини-игра Караван реликвария");
  canvasWrap.append(canvas);

  const controls = el("div", "minigame-controls");
  [
    ["up", "↑"],
    ["left", "←"],
    ["right", "→"],
    ["down", "↓"],
  ].forEach(([key, label]) => {
    const control = button(label, "small-button minigame-control", () => gameControl?.turn(key));
    controls.append(control);
  });

  const help = el("div", "minigame-help");
  const resultPanel = createMinigameResultPanel("caravan");
  [
    ["WASD", "поворот"],
    ["↑ ↓ ← →", "поворот"],
    ["Припасы", "+очки и длина"],
    ["Частокол", "смертельно"],
    ["Esc", "пауза / продолжить"],
  ].forEach(([key, label]) => {
    const item = el("span", "minigame-help-item");
    item.append(el("kbd", "", key), document.createTextNode(label));
    help.append(item);
  });

  shell.append(top, resultPanel, canvasWrap, controls, help);
  root.append(shell);
  gameControl = startCaravanSnake(canvas, score, status, {
    onStateChange: (game) => {
      mainButton.textContent = game.gameOver ? "Начать заново" : !game.started ? "Начать путь" : game.paused ? "Продолжить" : "Пауза";
      if (game.gameOver) saveCaravanSnake(game);
      updateMinigameResultPanel(resultPanel, "caravan", game);
    },
  });
  activeMinigameCleanup = gameControl.cleanup;
  return root;
}

const minigameTouchKeys = new Set();
const hereticRunSprites = Array.from({ length: 6 }, (_, index) => {
  const image = new Image();
  image.src = `assets/minigame/heretic_run_${String(index + 1).padStart(2, "0")}_clean.png`;
  return image;
});

function minigameKeyAction(event) {
  const codeMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyS: "down",
    KeyA: "left",
    KeyD: "right",
    Space: "dash",
    Escape: "pause",
  };
  if (codeMap[event.code]) return codeMap[event.code];
  const key = String(event.key || "").toLowerCase();
  return {
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
    w: "up",
    ц: "up",
    s: "down",
    ы: "down",
    a: "left",
    ф: "left",
    d: "right",
    в: "right",
    " ": "dash",
    spacebar: "dash",
    escape: "pause",
    esc: "pause",
  }[key] || "";
}

function startCaravanSnake(canvas, scoreNode, statusNode, options = {}) {
  const ctx = canvas.getContext("2d");
  const world = { w: canvas.width, h: canvas.height };
  const board = caravanBoard(world);
  let game = restoreCaravanSnake(board);
  let notifiedState = "";

  const notify = () => {
    const signature = `${game.started}-${game.paused}-${game.gameOver}-${game.score}-${game.relics}`;
    if (signature === notifiedState) return;
    notifiedState = signature;
    options.onStateChange?.(game);
  };
  const turn = (direction) => {
    const next = caravanDirectionVector(direction);
    if (!next || !game.started || game.paused || game.gameOver) return;
    if (next.x === -game.direction.x && next.y === -game.direction.y) return;
    game.nextDirection = next;
  };
  const pause = (message = "Пауза.") => {
    if (!game.started || game.paused || game.gameOver) return;
    game.paused = true;
    game.running = false;
    game.message = message;
    saveCaravanSnake(game);
    updateCaravanSnakeHud(scoreNode, statusNode, game);
    notify();
  };
  const resume = () => {
    if (!game.started || game.gameOver) return;
    game.paused = false;
    game.running = true;
    game.last = performance.now();
    game.message = "Караван снова идет по тракту.";
    saveCaravanSnake(game);
    updateCaravanSnakeHud(scoreNode, statusNode, game);
    notify();
  };
  const togglePause = () => {
    if (!game.started || game.gameOver) return;
    if (game.paused) resume();
    else pause("Пауза. Нажми Esc или «Продолжить», чтобы двинуть караван дальше.");
  };
  const keydown = (event) => {
    const action = minigameKeyAction(event);
    if (!action) return;
    event.preventDefault();
    if (action === "pause") {
      if (!event.repeat) togglePause();
      return;
    }
    if (["up", "down", "left", "right"].includes(action)) turn(action);
  };
  const pauseOnHidden = () => {
    if (document.hidden) pause("Пауза: вкладка была свернута. Прогресс каравана сохранен.");
  };
  const pauseOnBlur = () => pause("Пауза: окно потеряло фокус. Караван стоит лагерем.");
  window.addEventListener("keydown", keydown);
  document.addEventListener("visibilitychange", pauseOnHidden);
  window.addEventListener("blur", pauseOnBlur);

  const loop = (now) => {
    const dt = Math.min(0.05, (now - game.last) / 1000);
    game.last = now;
    updateCaravanSnake(game, board, dt);
    drawCaravanSnake(ctx, game, board, world);
    updateCaravanSnakeHud(scoreNode, statusNode, game);
    notify();
    game.frameId = requestAnimationFrame(loop);
  };

  updateCaravanSnakeHud(scoreNode, statusNode, game);
  drawCaravanSnake(ctx, game, board, world);
  notify();
  game.frameId = requestAnimationFrame(loop);

  return {
    start: () => {
      if (game.started && !game.gameOver) return;
      game = createCaravanSnakeGame(board, true);
      game.last = performance.now();
      saveCaravanSnake(game);
      updateCaravanSnakeHud(scoreNode, statusNode, game);
      notify();
    },
    restart: () => {
      game = createCaravanSnakeGame(board, true);
      game.last = performance.now();
      saveCaravanSnake(game);
      updateCaravanSnakeHud(scoreNode, statusNode, game);
      notify();
    },
    resume,
    pause,
    turn,
    isStarted: () => game.started,
    isPaused: () => game.paused,
    isGameOver: () => game.gameOver,
    cleanup: () => {
      if (game.started && !game.gameOver) {
        game.paused = true;
        game.running = false;
        game.message = "Пауза: прогресс каравана сохранен.";
      }
      saveCaravanSnake(game);
      cancelAnimationFrame(game.frameId);
      window.removeEventListener("keydown", keydown);
      document.removeEventListener("visibilitychange", pauseOnHidden);
      window.removeEventListener("blur", pauseOnBlur);
    },
  };
}

function caravanBoard(world) {
  const cell = 24;
  const cols = 31;
  const rows = 15;
  return {
    cell,
    cols,
    rows,
    x: Math.round((world.w - cols * cell) / 2),
    y: Math.round((world.h - rows * cell) / 2),
  };
}

function createCaravanSnakeGame(board, started = false) {
  const obstacles = caravanBaseObstacles(board);
  const game = {
    runId: crypto.randomUUID(),
    started,
    running: started,
    paused: !started,
    gameOver: false,
    frameId: 0,
    last: performance.now(),
    time: 0,
    tick: 0,
    stepDelay: 0.24,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    segments: [
      { x: 8, y: 7 },
      { x: 7, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 7 },
    ],
    obstacles,
    food: null,
    score: 0,
    relics: 0,
    message: started ? "Караван вышел на тракт. Собирай припасы и не бейся в частокол." : "Нажми «Начать путь», чтобы вывести караван.",
  };
  game.food = spawnCaravanFood(board, game);
  return game;
}

function restoreCaravanSnake(board) {
  try {
    const saved = JSON.parse(localStorage.getItem(SNAKE_STORAGE_KEY) || "{}");
    if (!saved?.started) return createCaravanSnakeGame(board, false);
    const fallback = createCaravanSnakeGame(board, true);
    return {
      ...fallback,
      ...saved,
      running: false,
      paused: !saved.gameOver,
      gameOver: Boolean(saved.gameOver),
      last: performance.now(),
      frameId: 0,
      direction: caravanValidVector(saved.direction) || fallback.direction,
      nextDirection: caravanValidVector(saved.nextDirection) || caravanValidVector(saved.direction) || fallback.nextDirection,
      segments: Array.isArray(saved.segments) && saved.segments.length ? saved.segments.map(caravanPoint) : fallback.segments,
      obstacles: Array.isArray(saved.obstacles) && saved.obstacles.length ? saved.obstacles.map(caravanPoint) : fallback.obstacles,
      food: saved.food ? { ...caravanPoint(saved.food), type: saved.food.type || "supplies" } : fallback.food,
      message: saved.gameOver ? saved.message || "Караван разбит." : "Пауза: путь восстановлен. Нажми «Продолжить».",
    };
  } catch {
    return createCaravanSnakeGame(board, false);
  }
}

function saveCaravanSnake(game) {
  try {
    localStorage.setItem(SNAKE_STORAGE_KEY, JSON.stringify({
      runId: game.runId || crypto.randomUUID(),
      started: Boolean(game.started),
      paused: Boolean(game.paused || !game.running),
      running: false,
      gameOver: Boolean(game.gameOver),
      time: Number(game.time || 0),
      tick: Number(game.tick || 0),
      stepDelay: Number(game.stepDelay || 0.24),
      direction: caravanPoint(game.direction),
      nextDirection: caravanPoint(game.nextDirection),
      segments: (game.segments ?? []).map(caravanPoint),
      obstacles: (game.obstacles ?? []).map(caravanPoint),
      food: game.food ? { ...caravanPoint(game.food), type: game.food.type || "supplies" } : null,
      score: Number(game.score || 0),
      relics: Number(game.relics || 0),
      message: game.message || "",
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Не удалось сохранить караван:", error.message);
  }
}

function caravanPoint(point) {
  return { x: Number(point?.x || 0), y: Number(point?.y || 0) };
}

function caravanValidVector(vector) {
  const point = caravanPoint(vector);
  return Math.abs(point.x) + Math.abs(point.y) === 1 ? point : null;
}

function caravanBaseObstacles(board) {
  const obstacles = [];
  const reserved = [
    { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 },
    { x: 9, y: 7 }, { x: 10, y: 7 }, { x: 11, y: 7 },
  ];
  const target = Math.max(10, Math.floor((board.cols * board.rows) / 32));
  const clusterOffsets = [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }],
  ];
  for (let attempt = 0; attempt < 80 && obstacles.length < target; attempt += 1) {
    const pattern = clusterOffsets[Math.floor(Math.random() * clusterOffsets.length)];
    const anchor = {
      x: 2 + Math.floor(Math.random() * Math.max(1, board.cols - 4)),
      y: 1 + Math.floor(Math.random() * Math.max(1, board.rows - 2)),
    };
    pattern.forEach((offset) => {
      const point = { x: anchor.x + offset.x, y: anchor.y + offset.y };
      if (caravanObstaclePointFree(point, board, obstacles, reserved)) obstacles.push(point);
    });
  }
  while (obstacles.length < target) {
    const point = {
      x: 1 + Math.floor(Math.random() * Math.max(1, board.cols - 2)),
      y: 1 + Math.floor(Math.random() * Math.max(1, board.rows - 2)),
    };
    if (caravanObstaclePointFree(point, board, obstacles, reserved)) obstacles.push(point);
  }
  return obstacles.slice(0, target);
}

function caravanObstaclePointFree(point, board, obstacles, reserved = []) {
  if (point.x <= 0 || point.y <= 0 || point.x >= board.cols - 1 || point.y >= board.rows - 1) return false;
  const busy = [...obstacles, ...reserved];
  return !busy.some((item) => item.x === point.x && item.y === point.y);
}

function caravanDirectionVector(direction) {
  return {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[direction] || null;
}

function updateCaravanSnake(game, board, dt) {
  game.time += dt;
  if (!game.started || game.paused || game.gameOver || !game.running) return;
  game.tick += dt;
  while (game.tick >= game.stepDelay && !game.gameOver) {
    game.tick -= game.stepDelay;
    stepCaravanSnake(game, board);
  }
}

function stepCaravanSnake(game, board) {
  game.direction = game.nextDirection;
  const head = game.segments[0];
  const next = { x: head.x + game.direction.x, y: head.y + game.direction.y };
  const eats = next.x === game.food.x && next.y === game.food.y;
  const body = eats ? game.segments : game.segments.slice(0, -1);
  if (
    next.x < 0 ||
    next.y < 0 ||
    next.x >= board.cols ||
    next.y >= board.rows ||
    body.some((segment) => segment.x === next.x && segment.y === next.y) ||
    game.obstacles.some((obstacle) => obstacle.x === next.x && obstacle.y === next.y)
  ) {
    game.running = false;
    game.paused = false;
    game.gameOver = true;
    game.message = `Караван разбился. Итог: ${game.score} очков и ${game.relics} припасов.`;
    saveCaravanSnake(game);
    return;
  }

  game.segments.unshift(next);
  if (eats) {
    const relicBonus = game.food.type === "relic" ? 80 : game.food.type === "coin" ? 55 : 40;
    game.relics += 1;
    game.score += relicBonus + game.segments.length * 3;
    game.stepDelay = Math.max(0.09, 0.24 - game.relics * 0.009);
    if (game.relics % 5 === 0) addCaravanObstacle(game, board);
    game.food = spawnCaravanFood(board, game);
    game.message = game.relics % 5 === 0 ? "Дорога стала опаснее: на тракте новый частокол." : "Припасы взяты. Караван растет.";
    saveCaravanSnake(game);
  } else {
    game.segments.pop();
    game.score += 1;
  }
}

function addCaravanObstacle(game, board) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const point = {
      x: 2 + Math.floor(Math.random() * (board.cols - 4)),
      y: 2 + Math.floor(Math.random() * (board.rows - 4)),
    };
    if (caravanCellFree(point, game)) {
      game.obstacles.push(point);
      return;
    }
  }
}

function spawnCaravanFood(board, game) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const point = {
      x: Math.floor(Math.random() * board.cols),
      y: Math.floor(Math.random() * board.rows),
    };
    if (caravanCellFree(point, game)) {
      const roll = Math.random();
      return { ...point, type: roll > 0.84 ? "relic" : roll > 0.58 ? "coin" : "supplies" };
    }
  }
  return { x: board.cols - 3, y: board.rows - 3, type: "supplies" };
}

function caravanCellFree(point, game) {
  return !game.segments.some((segment) => segment.x === point.x && segment.y === point.y) &&
    !game.obstacles.some((obstacle) => obstacle.x === point.x && obstacle.y === point.y) &&
    !(game.food && game.food.x === point.x && game.food.y === point.y);
}

function updateCaravanSnakeHud(scoreNode, statusNode, game) {
  if (!scoreNode || !statusNode) return;
  scoreNode.innerHTML = "";
  scoreNode.append(
    el("strong", "", Math.floor(game.score)),
    el("span", "", `припасы: ${game.relics} · длина: ${game.segments.length} · темп: ${Math.max(1, Math.round((0.26 - game.stepDelay) * 100))}`)
  );
  statusNode.textContent = game.message;
}

function drawCaravanSnake(ctx, game, board, world) {
  ctx.clearRect(0, 0, world.w, world.h);
  const bg = ctx.createLinearGradient(0, 0, world.w, world.h);
  bg.addColorStop(0, "#111719");
  bg.addColorStop(0.52, "#1f2925");
  bg.addColorStop(1, "#2b2118");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, world.w, world.h);
  drawCaravanBackdrop(ctx, board, world, game.time);
  drawCaravanBoard(ctx, board);
  game.obstacles.forEach((obstacle) => drawCaravanObstacle(ctx, board, obstacle));
  drawCaravanFood(ctx, board, game.food, game.time);
  for (let index = game.segments.length - 1; index >= 0; index -= 1) {
    drawCaravanSegment(ctx, board, game.segments[index], index, game);
  }
  if (!game.started || game.paused || game.gameOver) drawCaravanOverlay(ctx, world, game);
}

function drawCaravanBackdrop(ctx, board, world, time) {
  ctx.strokeStyle = "rgba(212, 167, 79, 0.07)";
  ctx.lineWidth = 1;
  for (let x = -80; x < world.w + 80; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 128, world.h);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i += 1) {
    const x = 32 + (i % 5) * 172;
    const y = i < 5 ? 22 : world.h - 34;
    ctx.fillStyle = `rgba(212, 167, 79, ${0.15 + Math.sin(time * 2 + i) * 0.04})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(board.x - 16, board.y - 16, board.cols * board.cell + 32, board.rows * board.cell + 32);
}

function drawCaravanBoard(ctx, board) {
  const width = board.cols * board.cell;
  const height = board.rows * board.cell;
  const ground = ctx.createLinearGradient(board.x, board.y, board.x + width, board.y + height);
  ground.addColorStop(0, "#26312d");
  ground.addColorStop(0.55, "#222b28");
  ground.addColorStop(1, "#2d251b");
  ctx.fillStyle = ground;
  ctx.fillRect(board.x, board.y, width, height);
  ctx.strokeStyle = "rgba(242, 229, 201, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= board.cols; x += 1) {
    ctx.beginPath();
    ctx.moveTo(board.x + x * board.cell, board.y);
    ctx.lineTo(board.x + x * board.cell, board.y + height);
    ctx.stroke();
  }
  for (let y = 0; y <= board.rows; y += 1) {
    ctx.beginPath();
    ctx.moveTo(board.x, board.y + y * board.cell);
    ctx.lineTo(board.x + width, board.y + y * board.cell);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(212, 167, 79, 0.46)";
  ctx.lineWidth = 3;
  ctx.strokeRect(board.x - 1, board.y - 1, width + 2, height + 2);
}

function drawCaravanObstacle(ctx, board, obstacle) {
  const p = caravanCellCenter(board, obstacle);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 7, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6d4b2f";
  ctx.lineWidth = 4;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 7, 8);
    ctx.lineTo(i * 7 + 2, -9);
    ctx.stroke();
  }
  ctx.strokeStyle = "#b98d52";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(12, -2);
  ctx.stroke();
  ctx.restore();
}

function drawCaravanFood(ctx, board, food, time) {
  if (!food) return;
  const p = caravanCellCenter(board, food);
  ctx.save();
  ctx.translate(p.x, p.y + Math.sin(time * 5) * 1.4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 9, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (food.type === "relic") {
    ctx.fillStyle = "#4da9a7";
    ctx.strokeStyle = "#f2e5c9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (food.type === "coin") {
    ctx.fillStyle = "#d4a74f";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6d4b2f";
    ctx.font = "900 10px Inter, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("А", 0, 1);
  } else {
    ctx.fillStyle = "#c8bda4";
    ctx.beginPath();
    ctx.roundRect?.(-9, -8, 18, 16, 5);
    if (!ctx.roundRect) {
      ctx.rect(-9, -8, 18, 16);
    }
    ctx.fill();
    ctx.strokeStyle = "#6d4b2f";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCaravanSegment(ctx, board, segment, index, game) {
  const p = caravanCellCenter(board, segment);
  const isHead = index === 0;
  const direction = isHead ? game.direction : segmentDirection(game.segments[index - 1], segment);
  const angle = Math.atan2(direction.y, direction.x);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 8, isHead ? 14 : 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isHead) {
    const shield = ctx.createLinearGradient(-13, -13, 13, 13);
    shield.addColorStop(0, "#f2e5c9");
    shield.addColorStop(0.52, "#d4a74f");
    shield.addColorStop(1, "#6d4b2f");
    ctx.fillStyle = shield;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(4, 13);
    ctx.lineTo(-16, 10);
    ctx.lineTo(-16, -10);
    ctx.lineTo(4, -13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#111719";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#3b2a1d";
    ctx.fillRect(-13, -8, 16, 16);
    ctx.fillStyle = "#d4a74f";
    ctx.beginPath();
    ctx.arc(7, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111719";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -9);
    ctx.lineTo(-4, 9);
    ctx.moveTo(-11, -4);
    ctx.lineTo(2, -4);
    ctx.moveTo(-11, 4);
    ctx.lineTo(2, 4);
    ctx.stroke();
  } else {
    drawCaravanWagon(ctx, index);
  }
  ctx.restore();
}

function drawCaravanWagon(ctx, index) {
  const wood = index % 2 ? "#8c5a34" : "#6b5a34";
  const cover = index % 2 ? "#527a58" : "#8f7f52";
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.roundRect?.(-12, -8, 23, 16, 4);
  if (!ctx.roundRect) ctx.rect(-12, -8, 23, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.32)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = cover;
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.quadraticCurveTo(0, -17, 10, -8);
  ctx.lineTo(10, 1);
  ctx.lineTo(-9, 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1512";
  [-7, 8].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 9, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4a74f";
    ctx.beginPath();
    ctx.arc(x, 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1512";
  });
  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
}

function segmentDirection(previous, current) {
  const dx = previous.x - current.x;
  const dy = previous.y - current.y;
  if (Math.abs(dx) + Math.abs(dy) === 1) return { x: dx, y: dy };
  return { x: 1, y: 0 };
}

function caravanCellCenter(board, point) {
  return {
    x: board.x + point.x * board.cell + board.cell / 2,
    y: board.y + point.y * board.cell + board.cell / 2,
  };
}

function drawCaravanOverlay(ctx, world, game) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
  ctx.fillRect(0, 0, world.w, world.h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2e5c9";
  ctx.font = "800 34px Inter, Arial";
  const title = game.gameOver ? "Караван разбит" : game.started ? "Пауза каравана" : "Караван ждет";
  ctx.fillText(title, world.w / 2, world.h / 2 - 18);
  ctx.fillStyle = "#d4a74f";
  ctx.font = "700 18px Inter, Arial";
  const hint = game.gameOver ? "Нажми «Начать заново»" : game.started ? "Esc или «Продолжить»" : "Нажми «Начать путь»";
  ctx.fillText(hint, world.w / 2, world.h / 2 + 20);
}

function loadMinigameState() {
  try {
    const saved = JSON.parse(localStorage.getItem(MINIGAME_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

function saveMinigameState(game) {
  try {
    localStorage.setItem(MINIGAME_STORAGE_KEY, JSON.stringify({
      runId: game.runId || crypto.randomUUID(),
      started: Boolean(game.started),
      paused: Boolean(game.paused || !game.running),
      running: false,
      gameOver: Boolean(game.gameOver),
      score: Number(game.score || 0),
      relics: Number(game.relics || 0),
      dashReady: Number(game.dashReady || 0),
      hunterTrapTimer: Number(game.hunterTrapTimer || 0),
      hunterTrapRelics: Number(game.hunterTrapRelics || 0),
      time: Number(game.time || 0),
      message: game.message || "",
      player: minigameActorSnapshot(game.player),
      hunter: minigameActorSnapshot(game.hunter),
      relic: game.relic ? {
        x: Number(game.relic.x || 0),
        y: Number(game.relic.y || 0),
        r: Number(game.relic.r || 16),
      } : null,
      obstacles: (game.obstacles ?? []).map((item) => ({
        x: Number(item.x || 0),
        y: Number(item.y || 0),
        r: Number(item.r || 0),
      })),
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Не удалось сохранить прогресс мини-игры:", error.message);
  }
}

function minigameActorSnapshot(actor) {
  return actor ? {
    x: Number(actor.x || 0),
    y: Number(actor.y || 0),
    r: Number(actor.r || 0),
    speed: Number(actor.speed || 0),
    facing: Number(actor.facing || 0),
  } : null;
}

function startMirinkaDefense(canvas, scoreNode, statusNode, laneRow, shopNode, options = {}) {
  const ctx = canvas.getContext("2d");
  const world = { w: canvas.width, h: canvas.height };
  const laneDefs = defenseLaneDefs(world);
  let game = restoreDefenseGame(world, laneDefs);
  let lastSave = 0;
  let notifiedState = "";

  const notify = () => {
    const signature = `${game.started}-${game.paused}-${game.waveRunning}-${game.wave}-${game.victory}-${game.gameOver}-${game.selectedLane}`;
    if (signature === notifiedState) return;
    notifiedState = signature;
    options.onStateChange?.(game);
  };
  const repaintControls = () => {
    renderDefenseControls(game, laneDefs, laneRow, shopNode, {
      selectLane: (laneId) => {
        game.selectedLane = laneId;
        saveDefenseState(game);
        repaintControls();
      },
      buy: (type) => {
        buyDefense(game, type);
        saveDefenseState(game);
        repaintControls();
      },
    });
    updateDefenseHud(scoreNode, statusNode, game);
    notify();
  };
  const pause = (message = "Пауза.") => {
    if (!game.started || game.paused || game.victory || game.gameOver) return;
    game.paused = true;
    game.running = false;
    game.message = message;
    saveDefenseState(game);
    repaintControls();
  };
  const resume = () => {
    if (!game.started || game.victory || game.gameOver) return;
    game.paused = false;
    game.running = true;
    game.last = performance.now();
    game.message = game.waveRunning ? "Оборона продолжается." : "Подготовка. Можно усилить выбранную дорогу.";
    saveDefenseState(game);
    repaintControls();
  };
  const startWave = () => {
    if (!game.started || game.paused || game.waveRunning || game.victory || game.gameOver) return;
    game.waveRunning = true;
    game.spawnQueue = createDefenseWave(game.wave, laneDefs);
    game.spawnTimer = 0.2;
    game.message = `Волна ${game.wave + 1}: враги идут к Миринке.`;
    saveDefenseState(game);
    repaintControls();
  };
  const start = () => {
    if (game.started && !game.gameOver && !game.victory) return;
    game = createDefenseGame(world, laneDefs, true);
    game.message = "Миринка готовится к первой волне. Расставь защитников и начинай.";
    saveDefenseState(game);
    repaintControls();
  };
  const restart = () => {
    game = createDefenseGame(world, laneDefs, true);
    saveDefenseState(game);
    repaintControls();
  };
  const togglePause = () => {
    if (!game.started || game.gameOver || game.victory) return;
    if (game.paused) resume();
    else pause("Пауза. Нажми Esc или «Продолжить», чтобы вернуться к обороне.");
  };
  const keydown = (event) => {
    if (event.code === "Escape") {
      event.preventDefault();
      if (!event.repeat) togglePause();
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat && game.started && !game.paused && !game.waveRunning) startWave();
    }
  };
  const click = (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
    const laneId = nearestDefenseLane(point, laneDefs);
    if (!laneId) return;
    game.selectedLane = laneId;
    saveDefenseState(game);
    repaintControls();
  };
  const pauseOnHidden = () => {
    if (document.hidden) pause("Пауза: вкладка была свернута. Прогресс обороны сохранен.");
  };
  const pauseOnBlur = () => pause("Пауза: окно потеряло фокус. Прогресс обороны сохранен.");
  window.addEventListener("keydown", keydown);
  canvas.addEventListener("click", click);
  document.addEventListener("visibilitychange", pauseOnHidden);
  window.addEventListener("blur", pauseOnBlur);

  const loop = (now) => {
    const dt = Math.min(0.033, (now - game.last) / 1000);
    game.last = now;
    updateDefenseGame(game, laneDefs, world, dt);
    drawDefenseGame(ctx, game, laneDefs, world);
    updateDefenseHud(scoreNode, statusNode, game);
    notify();
    if (game.started && !game.paused && now - lastSave > 1000) {
      lastSave = now;
      saveDefenseState(game);
    }
    game.frameId = requestAnimationFrame(loop);
  };
  repaintControls();
  game.frameId = requestAnimationFrame(loop);

  return {
    start,
    restart,
    startWave,
    resume,
    pause,
    isStarted: () => game.started,
    isPaused: () => game.paused,
    isFinished: () => game.victory || game.gameOver,
    canStartWave: () => game.started && !game.paused && !game.waveRunning && !game.victory && !game.gameOver,
    cleanup: () => {
      if (game.started && !game.victory && !game.gameOver) {
        game.paused = true;
        game.running = false;
        game.message = "Пауза: прогресс обороны сохранен.";
      }
      saveDefenseState(game);
      cancelAnimationFrame(game.frameId);
      window.removeEventListener("keydown", keydown);
      canvas.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", pauseOnHidden);
      window.removeEventListener("blur", pauseOnBlur);
    },
  };
}

function createDefenseGame(world, laneDefs, started = false) {
  const lanes = {};
  laneDefs.forEach((lane, index) => {
    lanes[lane.id] = {
      guard: index === 0 ? 1 : 0,
      archer: 0,
      mage: 0,
      barricade: 0,
      cooldowns: { guard: 0, archer: 0, mage: 0 },
    };
  });
  return {
    runId: crypto.randomUUID(),
    started,
    paused: !started,
    running: started,
    waveRunning: false,
    victory: false,
    gameOver: false,
    frameId: 0,
    last: performance.now(),
    wave: 0,
    maxWaves: 5,
    supplies: 12,
    integrity: 85,
    defeated: 0,
    selectedLane: "north",
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    projectiles: [],
    effects: [],
    lanes,
    time: 0,
    shake: 0,
    message: started ? "Миринка готовится к первой волне. Расставь защитников и начинай." : "Нажми «Начать оборону», чтобы поднять тревогу.",
  };
}

function restoreDefenseGame(world, laneDefs) {
  const saved = loadDefenseState();
  if (!saved?.started) return createDefenseGame(world, laneDefs, false);
  const fallback = createDefenseGame(world, laneDefs, true);
  const lanes = { ...fallback.lanes };
  Object.entries(saved.lanes ?? {}).forEach(([id, lane]) => {
    lanes[id] = {
      ...lanes[id],
      ...lane,
      cooldowns: { guard: 0, archer: 0, mage: 0, ...(lane.cooldowns ?? {}) },
    };
  });
  return {
    ...fallback,
    ...saved,
    lanes,
    running: false,
    paused: !saved.victory && !saved.gameOver,
    frameId: 0,
    last: performance.now(),
    projectiles: [],
    effects: [],
    message: saved.victory || saved.gameOver ? saved.message : "Пауза: оборона восстановлена. Нажми «Продолжить».",
  };
}

function loadDefenseState() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEFENSE_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

function saveDefenseState(game) {
  try {
    localStorage.setItem(DEFENSE_STORAGE_KEY, JSON.stringify({
      runId: game.runId || crypto.randomUUID(),
      started: Boolean(game.started),
      paused: Boolean(game.paused || !game.running),
      running: false,
      waveRunning: Boolean(game.waveRunning),
      victory: Boolean(game.victory),
      gameOver: Boolean(game.gameOver),
      wave: Number(game.wave || 0),
      maxWaves: Number(game.maxWaves || 5),
      supplies: Number(game.supplies || 0),
      integrity: Number(game.integrity || 0),
      defeated: Number(game.defeated || 0),
      selectedLane: game.selectedLane || "north",
      spawnQueue: game.spawnQueue ?? [],
      spawnTimer: Number(game.spawnTimer || 0),
      enemies: (game.enemies ?? []).map((enemy) => ({
        id: enemy.id,
        laneId: enemy.laneId,
        type: enemy.type,
        progress: Number(enemy.progress || 0),
        hp: Number(enemy.hp || 0),
        maxHp: Number(enemy.maxHp || 0),
        speed: Number(enemy.speed || 0),
        damage: Number(enemy.damage || 0),
        reward: Number(enemy.reward || 0),
        radius: Number(enemy.radius || 10),
      })),
      lanes: game.lanes,
      time: Number(game.time || 0),
      message: game.message || "",
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Не удалось сохранить Оборону Миринки:", error.message);
  }
}

function defenseLaneDefs(world) {
  const center = { x: world.w / 2, y: world.h / 2 };
  return [
    { id: "north", title: "Северная дорога", start: { x: center.x, y: 24 }, end: { x: center.x, y: center.y - 43 }, label: { x: center.x + 92, y: 54 }, color: "#6d876a" },
    { id: "east", title: "Старый мост", start: { x: world.w - 30, y: center.y }, end: { x: center.x + 55, y: center.y }, label: { x: world.w - 140, y: center.y - 42 }, color: "#4da9a7" },
    { id: "south", title: "Заброшенные поля", start: { x: center.x, y: world.h - 26 }, end: { x: center.x, y: center.y + 50 }, label: { x: center.x + 116, y: world.h - 55 }, color: "#b98d52" },
    { id: "west", title: "Лесная кромка", start: { x: 30, y: center.y }, end: { x: center.x - 55, y: center.y }, label: { x: 145, y: center.y - 42 }, color: "#527a58" },
  ];
}

function defenseEnemyTypes() {
  return {
    bandit: { title: "Разбойник", hp: 40, speed: 0.073, damage: 8, reward: 1, radius: 10, color: "#8c5a34" },
    cultist: { title: "Культист", hp: 32, speed: 0.095, damage: 6, reward: 1, radius: 9, color: "#6b2e58" },
    firebug: { title: "Поджигатель", hp: 40, speed: 0.078, damage: 18, reward: 2, radius: 10, color: "#b54b38" },
    brute: { title: "Одержимый", hp: 92, speed: 0.049, damage: 15, reward: 3, radius: 13, color: "#51615b" },
    boss: { title: "Пепельный вожак", hp: 260, speed: 0.038, damage: 36, reward: 8, radius: 18, color: "#2b2420" },
  };
}

function createDefenseWave(wave, laneDefs) {
  const patterns = [
    ["bandit", "bandit", "cultist", "bandit", "bandit", "cultist", "bandit"],
    ["cultist", "bandit", "bandit", "firebug", "cultist", "bandit", "firebug", "bandit", "cultist"],
    ["bandit", "firebug", "brute", "cultist", "bandit", "firebug", "brute", "cultist", "firebug", "bandit"],
    ["brute", "cultist", "firebug", "brute", "firebug", "cultist", "brute", "bandit", "firebug", "brute", "cultist"],
    ["cultist", "firebug", "brute", "bandit", "firebug", "brute", "cultist", "firebug", "brute", "brute", "boss"],
  ];
  const lanes = laneDefs.map((lane) => lane.id);
  return (patterns[wave] ?? patterns[patterns.length - 1]).map((type, index) => ({
    type,
    laneId: lanes[(index + wave) % lanes.length],
  }));
}

function renderDefenseControls(game, laneDefs, laneRow, shopNode, actions) {
  laneRow.innerHTML = "";
  laneDefs.forEach((lane) => {
    const laneState = game.lanes[lane.id];
    const item = button("", `defense-lane-button ${game.selectedLane === lane.id ? "active" : ""}`, () => actions.selectLane(lane.id));
    item.append(
      el("strong", "", lane.title),
      el("span", "", `С ${laneState.guard} · Л ${laneState.archer} · М ${laneState.mage} · Б ${laneState.barricade}`)
    );
    laneRow.append(item);
  });

  const selectedLane = laneDefs.find((lane) => lane.id === game.selectedLane) ?? laneDefs[0];
  const costs = defenseCosts();
  shopNode.innerHTML = "";
  shopNode.append(el("div", "defense-shop-title", `${selectedLane.title} · запасы: ${game.supplies}`));
  [
    ["guard", "Стража", "держит центр"],
    ["archer", "Лучники", "дальний урон"],
    ["mage", "Маг", "удар по области"],
    ["barricade", "Баррикада", "замедление"],
  ].forEach(([type, title, hint]) => {
    const buy = button("", "defense-buy-button", () => actions.buy(type));
    buy.disabled = game.supplies < costs[type] || game.victory || game.gameOver || !game.started;
    buy.append(el("strong", "", `${title} · ${costs[type]}`), el("span", "", hint));
    shopNode.append(buy);
  });
}

function defenseCosts() {
  return { guard: 6, archer: 7, mage: 12, barricade: 5 };
}

function buyDefense(game, type) {
  if (!game.started || game.victory || game.gameOver) return false;
  const costs = defenseCosts();
  const lane = game.lanes[game.selectedLane];
  if (!lane || game.supplies < costs[type]) return false;
  game.supplies -= costs[type];
  lane[type] = (lane[type] ?? 0) + 1;
  game.message = `${defenseBuyTitle(type)} усиливает ${defenseLaneName(game.selectedLane)}.`;
  return true;
}

function defenseBuyTitle(type) {
  return { guard: "Стража", archer: "Лучники", mage: "Маг", barricade: "Баррикада" }[type] ?? type;
}

function defenseLaneName(id) {
  return { north: "север", east: "мост", south: "поля", west: "лесную кромку" }[id] ?? "дорогу";
}

function updateDefenseGame(game, laneDefs, world, dt) {
  game.time += dt;
  game.shake = Math.max(0, (game.shake ?? 0) - dt * 5);
  updateDefenseParticles(game, dt);
  if (!game.started || game.paused || game.gameOver || game.victory || !game.waveRunning) return;

  game.spawnTimer -= dt;
  if (game.spawnQueue.length && game.spawnTimer <= 0) {
    const next = game.spawnQueue.shift();
    game.enemies.push(createDefenseEnemy(next.type, next.laneId));
    game.spawnTimer = Math.max(0.34, 0.74 - game.wave * 0.07);
  }

  game.enemies.forEach((enemy) => {
    const lane = game.lanes[enemy.laneId];
    const slow = Math.max(0.62, 1 - (lane?.barricade ?? 0) * 0.09);
    enemy.progress += enemy.speed * slow * dt;
  });
  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.progress < 1) return true;
    game.integrity = Math.max(0, game.integrity - enemy.damage);
    game.shake = 1;
    game.effects.push({ type: "hit", laneId: enemy.laneId, life: 0.5, t: 1 });
    return false;
  });

  laneDefs.forEach((lane) => updateDefenseLaneCombat(game, lane, dt));
  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.hp > 0) return true;
    game.defeated += 1;
    game.supplies += enemy.reward;
    game.effects.push({ type: "defeat", laneId: enemy.laneId, progress: enemy.progress, life: 0.42, t: 1, color: defenseEnemyTypes()[enemy.type]?.color });
    return false;
  });

  if (game.integrity <= 0) {
    game.gameOver = true;
    game.waveRunning = false;
    game.message = `Миринка пала на ${game.wave + 1} волне.`;
    saveDefenseState(game);
    return;
  }
  if (!game.spawnQueue.length && !game.enemies.length) {
    game.waveRunning = false;
    game.wave += 1;
    if (game.wave >= game.maxWaves) {
      game.victory = true;
      game.message = `Миринка выстояла. Целостность: ${Math.ceil(game.integrity)}.`;
    } else {
      game.supplies += 5 + game.wave;
      game.message = `Волна отбита. Миринка держится. Подготовься к волне ${game.wave + 1}.`;
    }
    saveDefenseState(game);
  }
}

function createDefenseEnemy(type, laneId) {
  const meta = defenseEnemyTypes()[type] ?? defenseEnemyTypes().bandit;
  return {
    id: crypto.randomUUID(),
    laneId,
    type,
    progress: 0,
    hp: meta.hp,
    maxHp: meta.hp,
    speed: meta.speed,
    damage: meta.damage,
    reward: meta.reward,
    radius: meta.radius,
  };
}

function updateDefenseLaneCombat(game, lane, dt) {
  const laneState = game.lanes[lane.id];
  if (!laneState) return;
  laneState.cooldowns ??= { guard: 0, archer: 0, mage: 0 };
  Object.keys(laneState.cooldowns).forEach((key) => {
    laneState.cooldowns[key] = Math.max(0, laneState.cooldowns[key] - dt);
  });
  const laneEnemies = game.enemies.filter((enemy) => enemy.laneId === lane.id).sort((a, b) => b.progress - a.progress);
  const target = laneEnemies[0];
  if (!target) return;
  if (laneState.guard > 0 && target.progress > 0.56 && laneState.cooldowns.guard <= 0) {
    target.hp -= 11 * laneState.guard;
    laneState.cooldowns.guard = 0.54;
    game.effects.push({ type: "slash", laneId: lane.id, progress: target.progress, life: 0.18, t: 1 });
  }
  if (laneState.archer > 0 && laneState.cooldowns.archer <= 0) {
    target.hp -= 8 * laneState.archer;
    laneState.cooldowns.archer = 0.78;
    game.projectiles.push({ laneId: lane.id, from: 0.62, to: target.progress, life: 0.28, t: 1, color: "#d4a74f" });
  }
  if (laneState.mage > 0 && laneState.cooldowns.mage <= 0) {
    laneEnemies.filter((enemy) => Math.abs(enemy.progress - target.progress) < 0.18).forEach((enemy) => {
      enemy.hp -= 15 * laneState.mage;
    });
    laneState.cooldowns.mage = 1.58;
    game.effects.push({ type: "blast", laneId: lane.id, progress: target.progress, life: 0.36, t: 1, color: "#4da9a7" });
  }
}

function updateDefenseParticles(game, dt) {
  game.projectiles = (game.projectiles ?? []).filter((projectile) => {
    projectile.life -= dt;
    return projectile.life > 0;
  });
  game.effects = (game.effects ?? []).filter((effect) => {
    effect.life -= dt;
    return effect.life > 0;
  });
}

function drawDefenseGame(ctx, game, laneDefs, world) {
  const shakeX = game.shake ? (Math.random() - 0.5) * game.shake * 6 : 0;
  const shakeY = game.shake ? (Math.random() - 0.5) * game.shake * 6 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10, -10, world.w + 20, world.h + 20);
  const bg = ctx.createLinearGradient(0, 0, world.w, world.h);
  bg.addColorStop(0, "#111719");
  bg.addColorStop(0.52, "#1f2925");
  bg.addColorStop(1, "#2a2119");
  ctx.fillStyle = bg;
  ctx.fillRect(-10, -10, world.w + 20, world.h + 20);
  drawDefenseScenery(ctx, world, game);
  drawDefenseRoads(ctx, laneDefs, game);
  drawDefenseLaneLabels(ctx, laneDefs, game);
  drawMirinkaVillage(ctx, world, game);
  laneDefs.forEach((lane) => drawLaneDefenders(ctx, game, lane));
  game.enemies.forEach((enemy) => drawDefenseEnemy(ctx, enemy, laneDefs));
  game.projectiles.forEach((projectile) => drawDefenseProjectile(ctx, projectile, laneDefs));
  game.effects.forEach((effect) => drawDefenseEffect(ctx, effect, laneDefs, world));
  ctx.restore();
  drawDefenseOverlay(ctx, game, world);
}

function drawDefenseScenery(ctx, world, game) {
  ctx.save();
  ctx.globalAlpha = 0.95;

  for (let i = 0; i < 12; i += 1) {
    const x = 52 + (i % 3) * 42 + Math.sin(i * 1.7) * 8;
    const y = 56 + Math.floor(i / 3) * 48;
    drawDefenseTree(ctx, x, y, 0.82 + (i % 3) * 0.1);
  }

  const water = ctx.createLinearGradient(world.w - 190, 0, world.w, world.h);
  water.addColorStop(0, "rgba(77, 169, 167, 0.05)");
  water.addColorStop(0.55, "rgba(77, 169, 167, 0.18)");
  water.addColorStop(1, "rgba(77, 169, 167, 0.07)");
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(world.w - 190, 0);
  ctx.bezierCurveTo(world.w - 140, 82, world.w - 172, 162, world.w - 108, 242);
  ctx.bezierCurveTo(world.w - 42, 322, world.w - 114, 392, world.w - 54, world.h);
  ctx.lineTo(world.w, world.h);
  ctx.lineTo(world.w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 221, 216, 0.16)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = 38 + i * 54 + Math.sin(game.time + i) * 3;
    ctx.beginPath();
    ctx.moveTo(world.w - 168, y);
    ctx.bezierCurveTo(world.w - 128, y - 8, world.w - 92, y + 12, world.w - 38, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(212, 167, 79, 0.13)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = world.h - 118 + i * 14;
    ctx.beginPath();
    ctx.moveTo(210 + i * 12, y);
    ctx.lineTo(world.w - 208 + i * 4, y - 56);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(212, 167, 79, 0.16)";
  for (let i = 0; i < 18; i += 1) {
    const x = world.w / 2 - 100 + (i % 6) * 36;
    const y = world.h / 2 - 76 + Math.floor(i / 6) * 52;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + Math.sin(game.time * 2 + i) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDefenseTree(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.beginPath();
  ctx.ellipse(2, 15, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4d3925";
  ctx.fillRect(-3, 3, 6, 17);
  const crown = ctx.createRadialGradient(-4, -8, 2, 0, -2, 25);
  crown.addColorStop(0, "#7fa15f");
  crown.addColorStop(0.58, "#45683f");
  crown.addColorStop(1, "#213729");
  ctx.fillStyle = crown;
  ctx.beginPath();
  ctx.arc(-8, -4, 13, 0, Math.PI * 2);
  ctx.arc(7, -6, 15, 0, Math.PI * 2);
  ctx.arc(0, 5, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDefenseRoads(ctx, laneDefs, game) {
  laneDefs.forEach((lane) => {
    const active = game.selectedLane === lane.id;
    const gradient = ctx.createLinearGradient(lane.start.x, lane.start.y, lane.end.x, lane.end.y);
    gradient.addColorStop(0, active ? "rgba(181, 143, 82, 0.58)" : "rgba(129, 91, 55, 0.42)");
    gradient.addColorStop(1, active ? "rgba(212, 167, 79, 0.84)" : "rgba(177, 130, 74, 0.62)");
    ctx.strokeStyle = "rgba(0, 0, 0, 0.34)";
    ctx.lineWidth = active ? 42 : 38;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lane.start.x, lane.start.y);
    ctx.lineTo(lane.end.x, lane.end.y);
    ctx.stroke();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = active ? 32 : 28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lane.start.x, lane.start.y);
    ctx.lineTo(lane.end.x, lane.end.y);
    ctx.stroke();
    ctx.strokeStyle = active ? "rgba(242, 229, 201, 0.28)" : "rgba(242, 229, 201, 0.16)";
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let i = 0.13; i < 0.9; i += 0.12) {
      const p = defensePoint(lane, i);
      const angle = Math.atan2(lane.end.y - lane.start.y, lane.end.x - lane.start.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.strokeStyle = "rgba(58, 43, 29, 0.38)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, Math.sin(i * 20) * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawDefenseLaneLabels(ctx, laneDefs, game) {
  laneDefs.forEach((lane) => {
    if (!lane.label) return;
    const active = game.selectedLane === lane.id;
    ctx.save();
    ctx.font = "800 13px Inter, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.max(116, ctx.measureText(lane.title).width + 28);
    const height = 30;
    drawDefensePanel(ctx, lane.label.x - width / 2, lane.label.y - height / 2, width, height, 9, active ? "rgba(212, 167, 79, 0.24)" : "rgba(14, 20, 21, 0.78)", active ? "rgba(212, 167, 79, 0.72)" : "rgba(242, 229, 201, 0.18)");
    ctx.fillStyle = active ? "#f2e5c9" : "#d7ceb9";
    ctx.fillText(lane.title, lane.label.x, lane.label.y + 1);
    ctx.restore();
  });
}

function drawDefensePanel(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawMirinkaVillage(ctx, world, game) {
  const center = { x: world.w / 2, y: world.h / 2 };
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 90, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5f4a2e";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-62, -56);
  ctx.lineTo(62, -56);
  ctx.quadraticCurveTo(78, -56, 78, -40);
  ctx.lineTo(78, 40);
  ctx.quadraticCurveTo(78, 56, 62, 56);
  ctx.lineTo(-62, 56);
  ctx.quadraticCurveTo(-78, 56, -78, 40);
  ctx.lineTo(-78, -40);
  ctx.quadraticCurveTo(-78, -56, -62, -56);
  ctx.stroke();
  const houses = [
    [-35, -20, "#8c5a34"],
    [20, -24, "#a0713f"],
    [-8, 18, "#6c5135"],
    [42, 20, "#7c6040"],
  ];
  houses.forEach(([x, y, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - 13, y - 10, 26, 22);
    ctx.fillStyle = "#2d2117";
    ctx.beginPath();
    ctx.moveTo(x - 17, y - 10);
    ctx.lineTo(x, y - 25);
    ctx.lineTo(x + 17, y - 10);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = "#d4a74f";
  ctx.beginPath();
  ctx.arc(0, -2, 6 + Math.sin(game.time * 5) * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLaneDefenders(ctx, game, lane) {
  const laneState = game.lanes[lane.id];
  if (!laneState) return;
  for (let index = 0; index < laneState.barricade; index += 1) {
    const p = defensePoint(lane, 0.36 + index * 0.04);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(lane.end.y - lane.start.y, lane.end.x - lane.start.x) + Math.PI / 2);
    ctx.strokeStyle = "#6b4b2d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(18, 5);
    ctx.moveTo(-18, 5);
    ctx.lineTo(18, -5);
    ctx.stroke();
    ctx.restore();
  }
  drawDefenseUnitStack(ctx, lane, 0.72, laneState.guard, "#c8bda4", "С");
  drawDefenseUnitStack(ctx, lane, 0.60, laneState.archer, "#d4a74f", "Л");
  drawDefenseUnitStack(ctx, lane, 0.49, laneState.mage, "#4da9a7", "М");
}

function drawDefenseUnitStack(ctx, lane, progress, count, color, label) {
  for (let index = 0; index < count; index += 1) {
    const p = defensePoint(lane, progress - index * 0.025);
    ctx.save();
    ctx.translate(p.x + (index % 2 ? 9 : -9), p.y + (index % 3 - 1) * 5);
    drawDefenseDefender(ctx, color, label, index);
    ctx.restore();
  }
}

function drawDefenseDefender(ctx, color, label, index) {
  const sway = Math.sin(index * 1.7) * 1.5;
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.beginPath();
  ctx.ellipse(0, 15, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#17120e";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 5);
  ctx.lineTo(-7, 15);
  ctx.moveTo(4, 5);
  ctx.lineTo(7, 15);
  ctx.stroke();
  const armor = ctx.createLinearGradient(0, -16, 0, 9);
  armor.addColorStop(0, lightenHex(color, 34));
  armor.addColorStop(0.55, color);
  armor.addColorStop(1, "#2b241b");
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.roundRect?.(-9, -11, 18, 20, 6);
  if (!ctx.roundRect) ctx.rect(-9, -11, 18, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.42)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#d7c8a7";
  ctx.beginPath();
  ctx.arc(0, -17, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b241b";
  ctx.fillRect(-8, -22, 16, 4);
  ctx.strokeStyle = label === "Л" ? "#d4a74f" : label === "М" ? "#4da9a7" : "#c8bda4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (label === "Л") {
    ctx.arc(12, -4, 11, -Math.PI / 2, Math.PI / 2);
    ctx.moveTo(12, -15);
    ctx.lineTo(12, 8);
  } else if (label === "М") {
    ctx.moveTo(12 + sway, -18);
    ctx.lineTo(18 + sway, 12);
    ctx.moveTo(9 + sway, -12);
    ctx.lineTo(16 + sway, -15);
  } else {
    ctx.moveTo(-15, -5);
    ctx.lineTo(15, -10);
    ctx.moveTo(9, -14);
    ctx.lineTo(17, -10);
  }
  ctx.stroke();
}

function drawDefenseEnemy(ctx, enemy, laneDefs) {
  const lane = laneDefs.find((item) => item.id === enemy.laneId);
  if (!lane) return;
  const meta = defenseEnemyTypes()[enemy.type] ?? defenseEnemyTypes().bandit;
  const p = defensePoint(lane, enemy.progress);
  const angle = Math.atan2(lane.end.y - lane.start.y, lane.end.x - lane.start.x);
  const pulse = Math.sin((enemy.progress * 20 + performance.now() / 140)) * 0.9;
  const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.radius + 8, enemy.radius + 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, pulse);

  const body = ctx.createLinearGradient(0, -enemy.radius - 12, 0, enemy.radius + 9);
  body.addColorStop(0, lightenHex(meta.color, 28));
  body.addColorStop(0.58, meta.color);
  body.addColorStop(1, "#1a1512");
  ctx.fillStyle = body;

  if (enemy.type === "boss") {
    drawDefenseBossEnemy(ctx, enemy.radius);
  } else if (enemy.type === "brute") {
    drawDefenseBruteEnemy(ctx, enemy.radius);
  } else if (enemy.type === "firebug") {
    drawDefenseFirebugEnemy(ctx, enemy.radius);
  } else if (enemy.type === "cultist") {
    drawDefenseCultistEnemy(ctx, enemy.radius);
  } else {
    drawDefenseBanditEnemy(ctx, enemy.radius);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
  ctx.fillRect(-18, -enemy.radius - 17, 36, 4);
  ctx.fillStyle = "#b54b38";
  ctx.fillRect(-18, -enemy.radius - 17, 36 * hpRatio, 4);
  ctx.restore();
}

function drawDefenseBanditEnemy(ctx, radius) {
  ctx.strokeStyle = "#18110d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.34, radius * 0.62);
  ctx.lineTo(-radius * 0.72, radius * 1.42);
  ctx.moveTo(radius * 0.34, radius * 0.62);
  ctx.lineTo(radius * 0.72, radius * 1.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 1, radius * 0.86, radius * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.42)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#44301f";
  ctx.fillRect(-radius * 0.7, -radius * 0.04, radius * 1.4, radius * 0.26);
  ctx.fillStyle = "#d1b08c";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.96, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#24160f";
  ctx.beginPath();
  ctx.moveTo(-radius * 0.65, -radius * 1.05);
  ctx.lineTo(radius * 0.62, -radius * 1.18);
  ctx.lineTo(radius * 0.28, -radius * 1.36);
  ctx.lineTo(-radius * 0.72, -radius * 1.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#352316";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.75, 2);
  ctx.lineTo(radius * 0.75, -7);
  ctx.stroke();
  ctx.strokeStyle = "#e2d4b6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(radius * 0.72, -7);
  ctx.lineTo(radius * 1.22, -radius * 0.68);
  ctx.stroke();
}

function drawDefenseCultistEnemy(ctx, radius) {
  ctx.strokeStyle = "#211019";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.32, radius * 0.72);
  ctx.lineTo(-radius * 0.62, radius * 1.42);
  ctx.moveTo(radius * 0.32, radius * 0.72);
  ctx.lineTo(radius * 0.62, radius * 1.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.45);
  ctx.quadraticCurveTo(radius * 1.05, -radius * 0.35, radius * 0.82, radius * 1.2);
  ctx.lineTo(-radius * 0.82, radius * 1.2);
  ctx.quadraticCurveTo(-radius * 1.05, -radius * 0.35, 0, -radius * 1.45);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.35)";
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.55, radius * 0.42, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d4a74f";
  ctx.fillRect(-1, -radius * 0.2, 2, radius * 0.9);
  ctx.strokeStyle = "#d4a74f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.24, -radius * 0.05);
  ctx.lineTo(radius * 0.24, -radius * 0.05);
  ctx.stroke();
  ctx.strokeStyle = "#2b141f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(radius * 0.86, -radius * 0.25);
  ctx.lineTo(radius * 1.18, radius * 1.1);
  ctx.stroke();
}

function drawDefenseFirebugEnemy(ctx, radius) {
  ctx.strokeStyle = "#20120e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.34, radius * 0.62);
  ctx.lineTo(-radius * 0.72, radius * 1.38);
  ctx.moveTo(radius * 0.34, radius * 0.62);
  ctx.lineTo(radius * 0.72, radius * 1.38);
  ctx.stroke();
  ctx.shadowColor = "rgba(231, 122, 58, 0.65)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(0, 2, radius * 0.82, radius * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f0c06b";
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.5);
  ctx.quadraticCurveTo(radius * 0.55, -radius * 0.75, radius * 0.12, -radius * 0.2);
  ctx.quadraticCurveTo(-radius * 0.45, -radius * 0.82, 0, -radius * 1.5);
  ctx.fill();
  ctx.strokeStyle = "#37231a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.82, radius * 0.15);
  ctx.lineTo(radius * 0.82, -radius * 0.18);
  ctx.stroke();
  ctx.fillStyle = "#f2e5c9";
  ctx.beginPath();
  ctx.arc(radius * 0.98, -radius * 0.28, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d85b2f";
  ctx.beginPath();
  ctx.moveTo(radius * 1.08, -radius * 0.82);
  ctx.quadraticCurveTo(radius * 1.42, -radius * 0.28, radius * 0.98, radius * 0.08);
  ctx.quadraticCurveTo(radius * 0.78, -radius * 0.38, radius * 1.08, -radius * 0.82);
  ctx.fill();
}

function drawDefenseBruteEnemy(ctx, radius) {
  ctx.strokeStyle = "#181412";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, radius * 0.74);
  ctx.lineTo(-radius * 0.82, radius * 1.4);
  ctx.moveTo(radius * 0.42, radius * 0.74);
  ctx.lineTo(radius * 0.82, radius * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 3, radius * 1.02, radius * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#2b2420";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.88, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b54b38";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.7, -radius * 0.22);
  ctx.lineTo(radius * 0.7, radius * 0.24);
  ctx.stroke();
  ctx.strokeStyle = "#4a3424";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(radius * 0.72, -radius * 0.62);
  ctx.lineTo(radius * 1.35, radius * 0.62);
  ctx.stroke();
  ctx.fillStyle = "#7a5233";
  ctx.beginPath();
  ctx.ellipse(radius * 1.4, radius * 0.7, radius * 0.28, radius * 0.55, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawDefenseBossEnemy(ctx, radius) {
  ctx.strokeStyle = "#17110e";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, radius * 0.7);
  ctx.lineTo(-radius * 0.88, radius * 1.42);
  ctx.moveTo(radius * 0.42, radius * 0.7);
  ctx.lineTo(radius * 0.88, radius * 1.42);
  ctx.stroke();
  ctx.shadowColor = "rgba(212, 167, 79, 0.36)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const r = i % 2 ? radius * 1.1 : radius * 1.55;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#d4a74f";
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.15, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d4a74f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.5, -radius * 1.18);
  ctx.lineTo(-radius * 0.18, -radius * 1.62);
  ctx.lineTo(radius * 0.05, -radius * 1.18);
  ctx.lineTo(radius * 0.34, -radius * 1.58);
  ctx.lineTo(radius * 0.55, -radius * 1.12);
  ctx.stroke();
  ctx.strokeStyle = "#8c2f28";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(radius * 0.92, -radius * 0.85);
  ctx.lineTo(radius * 1.35, radius * 0.96);
  ctx.stroke();
}

function lightenHex(hex, amount) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return hex;
  const channels = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
  return `rgb(${channels.map((value) => clamp(value + amount, 0, 255)).join(", ")})`;
}

function drawDefenseProjectile(ctx, projectile, laneDefs) {
  const lane = laneDefs.find((item) => item.id === projectile.laneId);
  if (!lane) return;
  const t = 1 - projectile.life / 0.28;
  const from = defensePoint(lane, projectile.from);
  const to = defensePoint(lane, projectile.to);
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 20;
  ctx.fillStyle = projectile.color || "#d4a74f";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawDefenseEffect(ctx, effect, laneDefs, world) {
  const lane = laneDefs.find((item) => item.id === effect.laneId);
  const p = lane ? defensePoint(lane, effect.progress ?? 0.96) : { x: world.w / 2, y: world.h / 2 };
  const alpha = clamp(effect.life / (effect.t || 1), 0, 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (effect.type === "blast") {
    ctx.strokeStyle = `rgba(77, 169, 167, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34 * (1 - alpha + 0.3), 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === "slash") {
    ctx.strokeStyle = `rgba(242, 229, 201, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(14, 8);
    ctx.stroke();
  } else {
    ctx.fillStyle = `rgba(181, 75, 56, ${alpha * 0.45})`;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * (1 - alpha + 0.2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDefenseOverlay(ctx, game, world) {
  if (!game.started || game.paused || game.gameOver || game.victory) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.fillRect(0, 0, world.w, world.h);
    ctx.fillStyle = "#f2e5c9";
    ctx.font = "800 32px Inter, Arial";
    ctx.textAlign = "center";
    const title = game.victory ? "Миринка выстояла" : game.gameOver ? "Миринка пала" : game.started ? "Пауза обороны" : "Миринка ждет приказа";
    ctx.fillText(title, world.w / 2, world.h / 2 - 10);
    ctx.fillStyle = "#d4a74f";
    ctx.font = "700 17px Inter, Arial";
    const hint = game.victory || game.gameOver ? "Нажми «Начать заново»" : game.started ? "Esc или «Продолжить»" : "Нажми «Начать оборону»";
    ctx.fillText(hint, world.w / 2, world.h / 2 + 24);
  }
}

function defensePoint(lane, progress) {
  return {
    x: lane.start.x + (lane.end.x - lane.start.x) * progress,
    y: lane.start.y + (lane.end.y - lane.start.y) * progress,
  };
}

function nearestDefenseLane(point, laneDefs) {
  const ranked = laneDefs
    .map((lane) => [lane.id, distanceToSegment(point, lane.start, lane.end)])
    .sort((a, b) => a[1] - b[1]);
  return ranked[0]?.[1] < 42 ? ranked[0][0] : "";
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  return Math.hypot(point.x - x, point.y - y);
}

function updateDefenseHud(scoreNode, statusNode, game) {
  if (!scoreNode || !statusNode) return;
  scoreNode.innerHTML = "";
  scoreNode.append(
    el("strong", "", `${Math.ceil(game.integrity)}%`),
    el("span", "", `волна ${Math.min(game.wave + 1, game.maxWaves)} / ${game.maxWaves} · запасы ${game.supplies} · врагов ${game.defeated}`)
  );
  statusNode.textContent = game.message;
}

function startHereticRun(canvas, scoreNode, statusNode, options = {}) {
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const world = { w: canvas.width, h: canvas.height };
  const createGame = (started = false) => {
    const obstacles = randomHereticObstacles(world, 4);
    return {
    runId: crypto.randomUUID(),
    started,
    paused: !started,
    running: started,
    gameOver: false,
    frameId: 0,
    last: performance.now(),
    score: 0,
    relics: 0,
    dashReady: 0,
    hunterTrapTimer: 0,
    hunterTrapRelics: 0,
    time: 0,
    message: started ? "Беги, пока инквизитор не достал протокол." : "Нажми «Начать», чтобы запустить погоню.",
    player: { x: 130, y: 210, r: 18, facing: 0, vx: 0, vy: 0 },
    hunter: { x: 690, y: 210, r: 24, speed: 108, facing: Math.PI, vx: 0, vy: 0 },
    relic: randomRelic(world, obstacles),
    obstacles,
    embers: Array.from({ length: 34 }, () => ({ x: Math.random() * world.w, y: Math.random() * world.h, s: 0.5 + Math.random() * 1.8, a: Math.random() * Math.PI * 2 })),
    };
  };
  const restoreGame = () => {
    const saved = loadMinigameState();
    if (!saved?.started) return createGame(false);
    const fallback = createGame(true);
    return {
      ...fallback,
      ...saved,
      running: false,
      paused: !saved.gameOver,
      gameOver: Boolean(saved.gameOver),
      last: performance.now(),
      frameId: 0,
      message: saved.gameOver ? saved.message || "Погоня завершена." : "Пауза: прогресс восстановлен. Нажми «Продолжить».",
      player: { ...fallback.player, ...(saved.player ?? {}), vx: 0, vy: 0 },
      hunter: { ...fallback.hunter, ...(saved.hunter ?? {}), vx: 0, vy: 0 },
      relic: { ...fallback.relic, ...(saved.relic ?? {}) },
      obstacles: Array.isArray(saved.obstacles) && saved.obstacles.length ? saved.obstacles : fallback.obstacles,
      embers: fallback.embers,
    };
  };
  let game = restoreGame();
  let lastMinigameSave = 0;

  const down = (event) => {
    const action = minigameKeyAction(event);
    if (!action) return;
    event.preventDefault();
    if (action === "pause") {
      if (!event.repeat) togglePause();
      return;
    }
    keys.add(action);
    if (action === "dash" && !event.repeat && game.started && !game.paused && !game.gameOver) {
      game.message = game.dashReady <= 0 ? "Рывок!" : game.message;
    }
  };
  const up = (event) => {
    const action = minigameKeyAction(event);
    if (action) keys.delete(action);
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);

  let notifiedState = "";
  const notify = () => {
    const signature = `${game.started}-${game.paused}-${game.gameOver}`;
    if (signature === notifiedState) return;
    notifiedState = signature;
    options.onStateChange?.(game);
  };
  const pause = (message = "Пауза.") => {
    if (!game.started || game.paused || game.gameOver) return;
    game.running = false;
    game.paused = true;
    game.message = message;
    keys.clear();
    minigameTouchKeys.clear();
    notify();
    updateMinigameHud(scoreNode, statusNode, game);
    saveMinigameState(game);
  };
  const resumeGame = () => {
    if (!game.started || game.gameOver) return;
    game.running = true;
    game.paused = false;
    game.last = performance.now();
    game.message = "Погоня продолжается.";
    notify();
    updateMinigameHud(scoreNode, statusNode, game);
    saveMinigameState(game);
  };
  const togglePause = () => {
    if (!game.started || game.gameOver) return;
    if (game.paused) resumeGame();
    else pause("Пауза. Нажми Esc или «Продолжить», чтобы вернуться в погоню.");
  };
  const pauseOnHidden = () => {
    if (document.hidden) pause("Пауза: вкладка была свернута. Нажми «Продолжить», чтобы вернуться в погоню.");
  };
  const pauseOnBlur = () => pause("Пауза: окно потеряло фокус. Нажми «Продолжить», когда вернешься.");
  document.addEventListener("visibilitychange", pauseOnHidden);
  window.addEventListener("blur", pauseOnBlur);

  const loop = (now) => {
    const dt = Math.min(0.033, (now - game.last) / 1000);
    game.last = now;
    updateHereticRun(game, keys, world, dt, scoreNode, statusNode);
    notify();
    drawHereticRun(ctx, game, world);
    if (game.started && !game.paused && !game.gameOver && now - lastMinigameSave > 1200) {
      lastMinigameSave = now;
      saveMinigameState(game);
    }
    game.frameId = requestAnimationFrame(loop);
  };

  updateMinigameHud(scoreNode, statusNode, game);
  notify();
  game.frameId = requestAnimationFrame(loop);

  return {
    start: () => {
      if (game.started && !game.gameOver) return;
      game = createGame(true);
      game.last = performance.now();
      notify();
      updateMinigameHud(scoreNode, statusNode, game);
      saveMinigameState(game);
    },
    restart: () => {
      game = createGame(true);
      game.last = performance.now();
      notify();
      updateMinigameHud(scoreNode, statusNode, game);
      saveMinigameState(game);
    },
    resume: resumeGame,
    pause,
    isStarted: () => game.started,
    isPaused: () => game.paused,
    isGameOver: () => game.gameOver,
    cleanup: () => {
      if (game.started && !game.gameOver) {
        game.running = false;
        game.paused = true;
        game.message = "Пауза: прогресс сохранен.";
        saveMinigameState(game);
      } else if (game.started) {
        saveMinigameState(game);
      }
      cancelAnimationFrame(game.frameId);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", pauseOnHidden);
      window.removeEventListener("blur", pauseOnBlur);
      minigameTouchKeys.clear();
    },
  };
}

function updateHereticRun(game, keys, world, dt, scoreNode, statusNode) {
  if (!game.started || game.paused || game.gameOver || !game.running) {
    game.time += dt * 0.35;
    game.player.vx = 0;
    game.player.vy = 0;
    game.hunter.vx = 0;
    game.hunter.vy = 0;
    updateMinigameHud(scoreNode, statusNode, game);
    return;
  }
  game.time += dt;
  game.score += dt * 10;
  game.dashReady = Math.max(0, game.dashReady - dt);
  game.hunterTrapTimer = Math.max(0, (game.hunterTrapTimer ?? 0) - dt);

  const player = game.player;
  const input = {
    x: Number(keys.has("right") || minigameTouchKeys.has("right")) - Number(keys.has("left") || minigameTouchKeys.has("left")),
    y: Number(keys.has("down") || minigameTouchKeys.has("down")) - Number(keys.has("up") || minigameTouchKeys.has("up")),
  };
  const length = Math.hypot(input.x, input.y) || 1;
  const dash = (keys.has("dash") || minigameTouchKeys.has("dash")) && game.dashReady <= 0;
  const speed = dash ? 430 : 215;
  if (dash) {
    game.dashReady = 1.4;
    game.message = "Рывок! Бумаги инквизитора разлетелись.";
  }
  player.vx = (input.x / length) * speed;
  player.vy = (input.y / length) * speed;
  if (input.x || input.y) player.facing = Math.atan2(player.vy, player.vx);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, 24, world.w - 24);
  player.y = clamp(player.y, 24, world.h - 24);

  game.obstacles.forEach((obstacle) => {
    const distance = Math.hypot(player.x - obstacle.x, player.y - obstacle.y);
    const minDistance = player.r + obstacle.r;
    if (distance < minDistance) {
      const nx = (player.x - obstacle.x) / (distance || 1);
      const ny = (player.y - obstacle.y) / (distance || 1);
      player.x = obstacle.x + nx * minDistance;
      player.y = obstacle.y + ny * minDistance;
      game.score = Math.max(0, game.score - 18 * dt);
    }
  });

  const hunter = game.hunter;
  const chaseX = player.x - hunter.x;
  const chaseY = player.y - hunter.y;
  const chaseDistance = Math.hypot(chaseX, chaseY) || 1;
  const hunterSpeed = game.hunter.speed + game.time * 2.2 + game.relics * 8;
  hunter.vx = (chaseX / chaseDistance) * hunterSpeed;
  hunter.vy = (chaseY / chaseDistance) * hunterSpeed;
  hunter.facing = Math.atan2(hunter.vy, hunter.vx);
  hunter.x += hunter.vx * dt;
  hunter.y += hunter.vy * dt;

  if (Math.hypot(player.x - game.relic.x, player.y - game.relic.y) < player.r + game.relic.r) {
    game.relics += 1;
    game.score += 75;
    game.message = "Реликвия спасена. Это точно не улика.";
    if (maybeAddHereticObstacle(game, world)) game.message += " Инквизитор перекрыл часть пути.";
    game.relic = randomRelic(world, game.obstacles);
  }

  if (Math.hypot(player.x - hunter.x, player.y - hunter.y) < player.r + hunter.r) {
    game.running = false;
    game.paused = false;
    game.gameOver = true;
    game.message = `Инквизитор догнал еретика. Счет: ${Math.floor(game.score)}.`;
    saveMinigameState(game);
  }
  updateMinigameHud(scoreNode, statusNode, game);
}

function drawHereticRun(ctx, game, world) {
  ctx.clearRect(0, 0, world.w, world.h);
  const gradient = ctx.createLinearGradient(0, 0, world.w, world.h);
  gradient.addColorStop(0, "#101719");
  gradient.addColorStop(0.58, "#1d2524");
  gradient.addColorStop(1, "#2b2118");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.w, world.h);

  ctx.strokeStyle = "rgba(212, 167, 79, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < world.w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 90, world.h);
    ctx.stroke();
  }

  game.embers.forEach((ember) => {
    ember.a += 0.018;
    ctx.fillStyle = `rgba(212, 167, 79, ${0.18 + Math.sin(ember.a) * 0.08})`;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y + Math.sin(ember.a) * 8, ember.s, 0, Math.PI * 2);
    ctx.fill();
  });

  game.obstacles.forEach((obstacle) => drawPyre(ctx, obstacle));
  drawRelic(ctx, game.relic, game.time);
  drawInquisitor(ctx, game.hunter, game.time);
  drawHeretic(ctx, game.player, game.time);

  if (!game.started || game.paused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fillRect(0, 0, world.w, world.h);
    ctx.fillStyle = "#f2e5c9";
    ctx.font = "800 34px Inter, Arial";
    ctx.textAlign = "center";
    ctx.fillText(game.started ? "Пауза" : "Погоня ждет", world.w / 2, world.h / 2 - 12);
    ctx.fillStyle = "#d4a74f";
    ctx.font = "700 18px Inter, Arial";
    ctx.fillText(game.started ? "Нажми Esc или «Продолжить»" : "Нажми «Начать»", world.w / 2, world.h / 2 + 24);
  }

  if (game.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.54)";
    ctx.fillRect(0, 0, world.w, world.h);
    ctx.fillStyle = "#f2e5c9";
    ctx.font = "800 42px Inter, Arial";
    ctx.textAlign = "center";
    ctx.fillText("Ересь пресечена", world.w / 2, world.h / 2 - 12);
    ctx.fillStyle = "#d4a74f";
    ctx.font = "700 22px Inter, Arial";
    ctx.fillText(`Счет: ${Math.floor(game.score)} · Реликвии: ${game.relics}`, world.w / 2, world.h / 2 + 30);
  }
}

function drawHeretic(ctx, hero, time) {
  ctx.save();
  const moving = Math.hypot(hero.vx || 0, hero.vy || 0) > 10;
  const stride = moving ? Math.sin(time * 15) : Math.sin(time * 4) * 0.18;
  const angle = (hero.facing ?? 0) + Math.PI / 2;
  ctx.translate(hero.x, hero.y);
  drawActorShadow(ctx, 28, 14, "rgba(0, 0, 0, 0.34)");
  const sprite = hereticRunSprites[Math.floor(time * (moving ? 12 : 5)) % hereticRunSprites.length];
  if (sprite?.complete && sprite.naturalWidth) {
    drawHereticSprite(ctx, sprite, hero);
    ctx.restore();
    return;
  }
  ctx.rotate(angle);

  ctx.strokeStyle = "#0b0f10";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(-13 - stride * 4, 27);
  ctx.moveTo(8, 10);
  ctx.lineTo(13 + stride * 4, 27);
  ctx.stroke();

  ctx.strokeStyle = "#4da9a7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.lineTo(-22, 10 + stride * 4);
  ctx.moveTo(11, -4);
  ctx.lineTo(22, 10 - stride * 4);
  ctx.stroke();

  const cloak = ctx.createLinearGradient(0, -32, 0, 28);
  cloak.addColorStop(0, "#243638");
  cloak.addColorStop(0.48, "#13191b");
  cloak.addColorStop(1, "#070909");
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.quadraticCurveTo(24 + stride * 2, -11, 18, 24);
  ctx.quadraticCurveTo(0, 35 + Math.abs(stride) * 3, -18, 24);
  ctx.quadraticCurveTo(-24 - stride * 2, -11, 0, -32);
  ctx.fill();
  ctx.strokeStyle = "rgba(77, 169, 167, 0.38)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#0f1516";
  ctx.beginPath();
  ctx.ellipse(0, -12, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d4a74f";
  ctx.beginPath();
  ctx.arc(0, -10, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4da9a7";
  ctx.beginPath();
  ctx.arc(0, 3, 4 + Math.sin(time * 8) * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(242, 229, 201, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -16);
  ctx.lineTo(6, -16);
  ctx.stroke();

  ctx.restore();
}

function drawHereticSprite(ctx, sprite, hero) {
  const vx = hero.vx || Math.cos(hero.facing || 0);
  const facingLeft = vx < -4;
  const groundY = 34;
  const width = 102;
  const height = 102;
  ctx.save();
  ctx.translate(0, groundY);
  ctx.scale(facingLeft ? -1 : 1, 1);
  ctx.shadowColor = "rgba(77, 169, 167, 0.34)";
  ctx.shadowBlur = 8;
  ctx.drawImage(sprite, -width / 2, -height, width, height);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(77, 169, 167, 0.8)";
  ctx.beginPath();
  ctx.arc(-18, -62, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawInquisitor(ctx, hunter, time) {
  ctx.save();
  const moving = Math.hypot(hunter.vx || 0, hunter.vy || 0) > 10;
  const stride = moving ? Math.sin(time * 10) : Math.sin(time * 3) * 0.12;
  const angle = (hunter.facing ?? Math.PI) + Math.PI / 2;
  ctx.translate(hunter.x, hunter.y);
  drawActorShadow(ctx, 40, 15, "rgba(0, 0, 0, 0.48)");
  ctx.rotate(angle);

  ctx.lineCap = "round";
  ctx.strokeStyle = "#16120f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-9, 12);
  ctx.lineTo(-19 - stride * 4, 30);
  ctx.moveTo(9, 12);
  ctx.lineTo(19 + stride * 4, 30);
  ctx.stroke();

  ctx.fillStyle = "#1a1411";
  ctx.beginPath();
  ctx.ellipse(-20 - stride * 4, 31, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(20 + stride * 4, 31, 8, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e2d4b6";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-17, -12);
  ctx.lineTo(-30, 7 - stride * 3);
  ctx.moveTo(17, -12);
  ctx.lineTo(33, 7 + stride * 3);
  ctx.stroke();

  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(34, -22);
  ctx.lineTo(34, 30);
  ctx.stroke();
  ctx.strokeStyle = "#d4a74f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(24, -15);
  ctx.lineTo(44, -15);
  ctx.moveTo(34, -25);
  ctx.lineTo(34, -3);
  ctx.moveTo(29, 30);
  ctx.lineTo(39, 30);
  ctx.stroke();

  const coat = ctx.createLinearGradient(0, -34, 0, 31);
  coat.addColorStop(0, "#37241f");
  coat.addColorStop(0.45, "#812f28");
  coat.addColorStop(1, "#241814");
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.quadraticCurveTo(30, -18, 25, 28);
  ctx.lineTo(7, 21);
  ctx.lineTo(0, 33);
  ctx.lineTo(-7, 21);
  ctx.lineTo(-25, 28);
  ctx.quadraticCurveTo(-30, -18, 0, -34);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#d4a74f";
  ctx.beginPath();
  ctx.moveTo(-8, -5);
  ctx.lineTo(8, -5);
  ctx.lineTo(5, 16);
  ctx.lineTo(-5, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#211711";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#11100e";
  ctx.save();
  ctx.rotate(-0.18);
  ctx.fillRect(-24, -1, 48, 6);
  ctx.restore();

  ctx.fillStyle = "#1a1513";
  ctx.beginPath();
  ctx.ellipse(0, -24, 16, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e4d8bd";
  ctx.beginPath();
  ctx.ellipse(0, -27, 29, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b54b38";
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(13, -27);
  ctx.lineTo(-13, -27);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#d4a74f";
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(7, 7);
  ctx.lineTo(0, 18);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(242, 229, 201, 0.9)";
  ctx.fillRect(-7, -30, 14, 3);
  ctx.fillStyle = "#11100e";
  ctx.fillRect(-5, -24, 10, 6);

  ctx.restore();
}

function drawRelic(ctx, relic, time) {
  ctx.save();
  ctx.translate(relic.x, relic.y);
  const pulse = 1 + Math.sin(time * 5) * 0.08;
  ctx.rotate(time * 1.1);
  ctx.fillStyle = "rgba(77, 169, 167, 0.16)";
  ctx.beginPath();
  ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(212, 167, 79, 0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 28, 0, 0, Math.PI * 2);
  ctx.stroke();

  const crystal = ctx.createLinearGradient(-10, -16, 14, 18);
  crystal.addColorStop(0, "#f2e5c9");
  crystal.addColorStop(0.38, "#4da9a7");
  crystal.addColorStop(1, "#1e5552");
  ctx.fillStyle = crystal;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(15, -5);
  ctx.lineTo(8, 18);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-15, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 229, 201, 0.82)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f2e5c9";
  ctx.beginPath();
  ctx.arc(-4, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawActorShadow(ctx, width, height, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 22, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPyre(ctx, obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);
  ctx.fillStyle = "rgba(154, 71, 43, 0.26)";
  ctx.beginPath();
  ctx.arc(0, 0, obstacle.r + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a3424";
  ctx.beginPath();
  ctx.arc(0, 0, obstacle.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d4a74f";
  ctx.beginPath();
  ctx.moveTo(0, -obstacle.r + 7);
  ctx.quadraticCurveTo(15, -4, 0, obstacle.r - 8);
  ctx.quadraticCurveTo(-16, 0, 0, -obstacle.r + 7);
  ctx.fill();
  ctx.restore();
}

function randomHereticObstacles(world, count = 4) {
  const obstacles = [];
  for (let attempt = 0; attempt < 120 && obstacles.length < count; attempt += 1) {
    const obstacle = {
      x: 96 + Math.random() * (world.w - 192),
      y: 72 + Math.random() * (world.h - 144),
      r: 24 + Math.random() * 14,
    };
    if (hereticObstacleFits(obstacle, obstacles, world)) obstacles.push(obstacle);
  }
  return obstacles;
}

function hereticObstacleFits(obstacle, obstacles, world, game = null) {
  if (obstacle.x - obstacle.r < 30 || obstacle.y - obstacle.r < 30 || obstacle.x + obstacle.r > world.w - 30 || obstacle.y + obstacle.r > world.h - 30) return false;
  const fixedClearance = [
    { x: 130, y: 210, r: 72 },
    { x: 690, y: 210, r: 78 },
    ...(game?.player ? [{ x: game.player.x, y: game.player.y, r: 86 }] : []),
    ...(game?.hunter ? [{ x: game.hunter.x, y: game.hunter.y, r: 82 }] : []),
    ...(game?.relic ? [{ x: game.relic.x, y: game.relic.y, r: 54 }] : []),
  ];
  return [...obstacles, ...fixedClearance].every((item) => Math.hypot(obstacle.x - item.x, obstacle.y - item.y) > obstacle.r + item.r + 12);
}

function maybeAddHereticObstacle(game, world) {
  const relics = Number(game.relics || 0);
  if (relics < 2 || (game.hunterTrapTimer ?? 0) > 0 || (game.obstacles?.length ?? 0) >= 10) return false;
  const chance = Math.min(0.86, 0.22 + relics * 0.09);
  if (relics <= (game.hunterTrapRelics ?? 0) || Math.random() > chance) return false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 92 + Math.random() * 145;
    const obstacle = {
      x: clamp(game.player.x + Math.cos(angle) * distance, 54, world.w - 54),
      y: clamp(game.player.y + Math.sin(angle) * distance, 54, world.h - 54),
      r: 22 + Math.random() * 12,
    };
    if (hereticObstacleFits(obstacle, game.obstacles, world, game)) {
      game.obstacles.push(obstacle);
      game.hunterTrapTimer = Math.max(2.1, 4.4 - relics * 0.18);
      game.hunterTrapRelics = relics;
      return true;
    }
  }
  game.hunterTrapTimer = 1.2;
  return false;
}

function randomRelic(world, obstacles = []) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const relic = { x: 70 + Math.random() * (world.w - 140), y: 70 + Math.random() * (world.h - 140), r: 16 };
    if (obstacles.every((item) => Math.hypot(relic.x - item.x, relic.y - item.y) > relic.r + item.r + 30)) return relic;
  }
  return { x: world.w / 2, y: world.h / 2, r: 16 };
}

function updateMinigameHud(scoreNode, statusNode, game) {
  if (!scoreNode || !statusNode) return;
  scoreNode.innerHTML = "";
  scoreNode.append(
    el("strong", "", Math.floor(game.score)),
    el("span", "", `реликвии: ${game.relics} · рывок: ${game.dashReady <= 0 ? "готов" : game.dashReady.toFixed(1)}`)
  );
  statusNode.textContent = game.message;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function galleryEditor(item, options = {}) {
  const form = el("form", "form-grid");
  const title = input(item.title);
  const type = input(item.type);
  const linked = input(item.linked);
  const description = textarea(item.description || "");
  const tagsInput = input((item.tags ?? []).join(", "));
  const palette = input(item.palette.join(", "));
  const imageStyle = { ...defaultImageStyle(), ...(item.imageStyle ?? {}) };
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  let imageValue = item.image || "";
  let imageUploadPromise = null;
  let attachedToGallery = !options.isNew;
  const preview = el("div", "upload-preview");
  const previewImage = document.createElement("img");
  const previewText = el("span", "muted", "Картинка не загружена");
  preview.append(previewImage, previewText);
  const aspect = selectInput([
    ["wide", "Широкая 16:9"],
    ["square", "Квадрат 1:1"],
    ["portrait", "Портрет 3:4"],
    ["banner", "Баннер 21:9"],
  ], imageStyle.aspect);
  const fit = selectInput([
    ["cover", "Обрезать по рамке"],
    ["contain", "Вписать целиком"],
  ], imageStyle.fit);
  const posX = rangeInput(imageStyle.x, 0, 100, 1);
  const posY = rangeInput(imageStyle.y, 0, 100, 1);
  const zoom = rangeInput(imageStyle.zoom, 1, 2.5, 0.05);
  const uploadStatus = el("p", "muted span-2", "");
  const saveButton = button(options.isNew ? "Добавить арт" : "Сохранить изменения", "primary-button", null, "submit");
  const removeButton = button(options.isNew ? "Отмена" : "Удалить", "small-button", () => {
    if (options.isNew && !attachedToGallery) {
      form.closest("dialog")?.close();
      return;
    }
    if (!confirm(`Удалить арт "${item.title}"?`)) return;
    state.gallery = state.gallery.filter((entry) => entry.id !== item.id);
    saveState();
    render();
    form.closest("dialog")?.close();
  });
  const refreshPreview = () => {
    previewImage.src = imageValue;
    previewImage.hidden = !imageValue;
    previewText.hidden = Boolean(imageValue);
    preview.className = `upload-preview image-aspect-${aspect.value}`;
    previewImage.style.objectFit = fit.value;
    previewImage.style.objectPosition = `${posX.value}% ${posY.value}%`;
    previewImage.style.transform = `scale(${zoom.value})`;
  };
  [aspect, fit, posX, posY, zoom].forEach((control) => control.addEventListener("input", refreshPreview));
  refreshPreview();
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    uploadStatus.textContent = "Загружаю изображение в Supabase Storage...";
    saveButton.disabled = true;
    const pendingUpload = imageFileToUrl(file, "gallery", {
      requireCloudUpload: true,
      label: "Арт",
    });
    imageUploadPromise = pendingUpload;
    try {
      const uploadedImage = await pendingUpload;
      if (imageUploadPromise !== pendingUpload) return;
      if (!uploadedImage) {
        uploadStatus.textContent = "Изображение не загружено. Проверьте сообщение об ошибке и повторите выбор файла.";
        return;
      }
      imageValue = uploadedImage;
      uploadStatus.textContent = "Изображение загружено. Теперь можно сохранить арт.";
      refreshPreview();
    } catch (error) {
      if (imageUploadPromise === pendingUpload) {
        uploadStatus.textContent = `Ошибка загрузки изображения: ${error.message || error}`;
      }
    } finally {
      if (imageUploadPromise === pendingUpload) {
        imageUploadPromise = null;
        saveButton.disabled = false;
      }
    }
  });
  form.append(
    labelWrap("Название", title),
    labelWrap("Тип", type),
    labelWrap("Связь", linked, "span-2"),
    labelWrap("Описание", description, "span-2"),
    labelWrap("Теги", tagsInput),
    labelWrap("Палитра", palette),
    labelWrap("Картинка", fragment([imageInput, preview]), "span-2"),
    labelWrap("Формат картинки", aspect),
    labelWrap("Отображение", fit),
    labelWrap("Позиция X", posX),
    labelWrap("Позиция Y", posY),
    labelWrap("Масштаб обрезки", zoom, "span-2"),
    uploadStatus,
    actionRow([
      saveButton,
      button("Убрать картинку", "small-button", () => {
        imageValue = "";
        imageInput.value = "";
        uploadStatus.textContent = "Картинка будет удалена после сохранения.";
        refreshPreview();
      }),
      removeButton,
    ], "span-2")
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (imageUploadPromise) await imageUploadPromise;
    if (options.isNew && !imageValue) {
      uploadStatus.textContent = "Выберите изображение и дождитесь завершения загрузки.";
      return;
    }
    const nextTags = csv(tagsInput.value);
    registerTags(nextTags, true);
    item.title = title.value;
    item.type = type.value;
    item.linked = linked.value;
    item.description = description.value;
    item.tags = nextTags;
    item.image = imageValue;
    item.imageStyle = {
      aspect: aspect.value,
      fit: fit.value,
      x: Number(posX.value),
      y: Number(posY.value),
      zoom: Number(zoom.value),
    };
    item.palette = csv(palette.value).slice(0, 3);
    while (item.palette.length < 3) item.palette.push("#111719");
    if (!attachedToGallery) {
      state.gallery.unshift(item);
      attachedToGallery = true;
      activeGalleryTag = "";
      removeButton.textContent = "Удалить";
    }
    saveButton.disabled = true;
    uploadStatus.textContent = "Сохраняю и проверяю запись в Supabase...";
    saveState();
    const targetRevision = cloudSaveRevision;
    const confirmed = await waitForCloudSaveConfirmation(targetRevision);
    if (!confirmed) {
      uploadStatus.textContent = "Supabase не подтвердил сохранение. Арт оставлен в аварийной копии; повторите сохранение после устранения ошибки.";
      saveButton.disabled = false;
      return;
    }
    uploadStatus.textContent = "Арт сохранён и проверен.";
    render();
    form.closest("dialog")?.close();
  });
  return form;
}

function openQuestCreator() {
  state.quests.unshift({
    id: crypto.randomUUID(),
    title: "Новое задание",
    status: "active",
    patron: "Заказчик",
    reward: "Награда",
    linked: "Связь",
    notes: "Описание задания",
    gmNotes: "Заметки мастера",
  });
  saveState();
  render();
}

function renderCharacterSelect() {
  activeCharacterSelect.innerHTML = "";
  state.characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = `${character.name}${character.changesInProgress ? " · В процессе изменений" : ""}`;
    option.selected = character.id === activeCharacterId;
    activeCharacterSelect.append(option);
  });
}

function filterItems(items, getText) {
  if (!searchTerm) return items;
  const needle = searchTerm.toLowerCase();
  return items.filter((item) => getText(item).toLowerCase().includes(needle));
}

function directorySearchControl(id, value, placeholder, onChange, itemSelector) {
  const search = input(value);
  search.id = id;
  search.type = "search";
  search.placeholder = placeholder;
  search.className = "directory-search-input";
  search.addEventListener("input", () => {
    onChange(search.value);
    saveUiState();
    const needle = search.value.trim().toLowerCase();
    document.querySelectorAll(itemSelector).forEach((item) => {
      item.classList.toggle("is-hidden", Boolean(needle) && !item.textContent.toLowerCase().includes(needle));
    });
  });
  return search;
}

function metricGrid(items) {
  const grid = el("div", "metric-grid");
  items.forEach(([label, value]) => {
    const box = el("div", "metric");
    box.append(el("span", "muted", label), el("strong", "", value));
    grid.append(box);
  });
  return grid;
}

function tags(items) {
  const wrap = el("div", "tag-row");
  items.filter(Boolean).forEach((item) => wrap.append(tagChip(item)));
  return wrap;
}

function questStatus(status) {
  return { active: "активно", hidden: "скрыто", done: "завершено" }[status] ?? status;
}

function actionRow(buttons, extraClass = "") {
  const rowEl = el("div", `button-row ${extraClass}`.trim());
  buttons.forEach((item) => rowEl.append(item));
  return rowEl;
}

function labelWrap(text, control, extraClass = "") {
  const label = el("label", extraClass);
  label.append(document.createTextNode(text), control);
  return label;
}

function checkboxWrap(text, control) {
  const label = el("label");
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.gap = "9px";
  control.style.width = "auto";
  label.append(control, document.createTextNode(text));
  return label;
}

function checkboxList(options, selected = []) {
  const selectedSet = new Set(selected);
  const list = el("div", "checkbox-list");
  if (!options.length) {
    list.append(el("p", "muted", "Нет доступных вариантов"));
    return list;
  }
  options.forEach(([value, text]) => {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = value;
    box.checked = selectedSet.has(value);
    list.append(checkboxWrap(text, box));
  });
  return list;
}

function searchableCheckboxList(options, selected = [], searchValue = "", onSearch = null, placeholder = "Поиск") {
  const wrap = el("div", "searchable-checkbox-list");
  const search = input(searchValue);
  search.type = "search";
  search.placeholder = placeholder;
  const list = checkboxList(options, selected);
  [...list.children].forEach((item, index) => {
    const [value, text, extra = ""] = options[index] ?? [];
    item.dataset.searchText = [value, text, extra].join(" ").toLowerCase();
  });
  const applyFilter = () => {
    const needle = search.value.trim().toLowerCase();
    [...list.children].forEach((item) => {
      if (!item.dataset.searchText) return;
      item.classList.toggle("is-hidden", Boolean(needle) && !item.dataset.searchText.includes(needle));
    });
    onSearch?.(search.value);
  };
  search.addEventListener("input", applyFilter);
  applyFilter();
  wrap.append(search, list);
  return wrap;
}

function checkedValues(container) {
  return [...container.querySelectorAll("input[type='checkbox']:checked")].map((item) => item.value);
}

function input(value) {
  const item = document.createElement("input");
  item.value = value ?? "";
  return item;
}

function rangeInput(value, min, max, step) {
  const item = document.createElement("input");
  item.type = "range";
  item.min = min;
  item.max = max;
  item.step = step;
  item.value = value ?? min;
  return item;
}

function selectInput(options, value) {
  const item = document.createElement("select");
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === value;
    item.append(option);
  });
  return item;
}

function textarea(value) {
  const item = document.createElement("textarea");
  item.value = value ?? "";
  return item;
}

function button(text, className, onClick, type = "button") {
  const item = document.createElement("button");
  item.type = type;
  item.className = className;
  item.textContent = text;
  if (onClick) item.addEventListener("click", onClick);
  return item;
}

function el(tag, className = "", text = "") {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== "") item.textContent = text;
  return item;
}

function fragment(children) {
  const frag = document.createDocumentFragment();
  children.forEach((child) => frag.append(child));
  return frag;
}

function spacer() {
  const item = el("div");
  item.style.height = "14px";
  return item;
}

function csv(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slug(value) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `${base || "entry"}-${Date.now().toString(36)}`;
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

navItems.forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
sidebarToggle?.addEventListener("click", () => {
  sidebarCollapsed = !sidebarCollapsed;
  syncSidebarState();
  saveUiState();
});
globalSearch.addEventListener("input", () => {
  if (currentView === "wiki" && hasUnsavedWikiDraft()) {
    const nextSearchTerm = globalSearch.value;
    globalSearch.value = searchTerm;
    if (!confirmWikiEditorLeave()) return;
    searchTerm = nextSearchTerm;
    globalSearch.value = nextSearchTerm;
    render();
    return;
  }
  searchTerm = globalSearch.value;
  if (searchTerm.trim()) {
    currentView = "dashboard";
    navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  }
  render();
});
activeCharacterSelect.addEventListener("change", () => {
  activeCharacterGroupId = "";
  activeCharacterId = activeCharacterSelect.value;
  render();
});
resetViewButton.addEventListener("click", () => setView("dashboard"));
quickRollButton?.addEventListener("click", () => setQuickRollOpen(quickRollPanel?.hidden ?? true));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || quickRollPanel?.hidden) return;
  setQuickRollOpen(false);
});
quickLoginButton.addEventListener("click", async () => {
  if (supabaseUser) {
    if (!confirmWikiEditorLeave()) return;
    await signOutSupabase();
  } else {
    loginError.hidden = true;
    loginError.textContent = "Не удалось войти";
    loginDialog.showModal();
    document.querySelector("#loginEmail").focus();
  }
});
cancelLogin.addEventListener("click", () => loginDialog.close());
window.addEventListener("beforeunload", (event) => {
  captureActiveMapViewport();
  saveUiState();
  if (!hasUnsavedWikiDraft() && !cloudSaveDirty && !cloudSaveInFlight) return;
  event.preventDefault();
  event.returnValue = "";
});
window.addEventListener("pagehide", () => {
  captureActiveMapViewport();
  saveUiState();
  if (cloudSaveDirty) flushCloudSave({ immediate: true });
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden") return;
  captureActiveMapViewport();
  saveUiState();
  if (cloudSaveDirty) flushCloudSave({ immediate: true });
});
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#adminPassword").value;
  try {
    await signInSupabase(email, password);
    document.querySelector("#loginEmail").value = "";
    document.querySelector("#adminPassword").value = "";
    loginDialog.close();
    setView("admin");
  } catch (error) {
    loginError.textContent = error.message || "Не удалось войти";
    loginError.hidden = false;
  }
});

renderCharacterSelect();
setAdminMode(false, { renderView: false });
initSupabase();
render();
