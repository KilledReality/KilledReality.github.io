const SUPABASE_URL = "https://msthqpeisopneallhkpk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qp0Z8J0uymysKz7KJRYUdA__74_rnbj";
const SITE_NAME = "Герои Асханы";

const COLLECTIONS = {
  wiki: { title: "Wiki", singular: "Статья", aliases: ["articles"] },
  characters: { title: "Персонажи", singular: "Персонаж" },
  npcs: { title: "NPC", singular: "NPC" },
  factions: { title: "Фракции", singular: "Фракция" },
  settlements: { title: "Поселения", singular: "Поселение" },
  countries: { title: "Государства", singular: "Государство" },
  items: { title: "Предметы", singular: "Предмет" },
  quests: { title: "Задания", singular: "Задание" },
  gallery: { title: "Галерея", singular: "Арт" },
  sessionLogs: { title: "Журнал сессий", singular: "Сессия", aliases: ["sessions"] },
  calendarEvents: { title: "События календаря", singular: "Событие" },
};

const PRIVATE_KEYS = new Set([
  "gmBody",
  "gmNotes",
  "masterNotes",
  "secretNotes",
  "secrets",
  "password",
  "adminPassword",
  "adminOnlyEdit",
]);

const TECHNICAL_KEYS = new Set([
  "imageStyle",
  "portraitStyle",
  "palette",
  "crop",
  "positionX",
  "positionY",
  "zoom",
  "rotation",
  "showDescription",
  "showEffect",
]);

const LABELS = {
  id: "ID",
  name: "Название",
  title: "Название",
  description: "Описание",
  body: "Текст",
  tags: "Теги",
  category: "Категория",
  categoryId: "ID категории",
  public: "Видимость",
  image: "Изображение",
  type: "Тип",
  status: "Статус",
  role: "Роль",
  level: "Уровень",
  levels: "Уровни",
  alignment: "Мировоззрение",
  dangerClass: "Класс Опасности",
  age: "Возраст",
  height: "Рост",
  weight: "Вес",
  maritalStatus: "Семейный статус",
  speed: "Основная скорость",
  speeds: "Скорости",
  culture: "Культура",
  religion: "Вероисповедание",
  population: "Население",
  ruler: "Правитель",
  government: "Форма правления",
  capital: "Столица",
  buildings: "Постройки",
  districts: "Кварталы",
  residents: "Жители",
  armies: "Войска",
  businesses: "Коммерческая деятельность",
  traits: "Черты",
  laws: "Законы",
  log: "Хроника",
  price: "Стоимость",
  buildingCost: "Стоимость строения",
  upgradeCost: "Стоимость улучшений",
  upgrades: "Улучшения",
  effect: "Эффект",
  modifiers: "Модификаторы",
  magicItems: "Магические предметы на рынке",
  stateStability: "Стабильность государства",
  stateCulture: "Культура государства",
  stateLoyalty: "Лояльность государства",
  stateEconomy: "Экономика государства",
  stateUnrest: "Беспорядки",
  stateProjectedUnrest: "Прогноз изменения беспорядков",
  stateDomainSize: "Размер владений",
  stateGlory: "Государственная слава",
  law: "Закон",
  crime: "Преступность",
  corruption: "Коррупция",
  knowledge: "Знания",
  society: "Общество",
  production: "Производство",
  dangerRating: "Рейтинг опасности",
  capitalTurnoverLimit: "Лимит оборота капитала",
  cashTurnoverLimit: "Лимит оборота денежных средств",
  priceCeiling: "Верхний предел цен",
  features: "Особенности",
  mechanics: "Игромеханика",
  mechanicsNotes: "Заметки по механике",
  ownerName: "Владелец",
  locationName: "Местонахождение",
  rarity: "Редкость",
  summary: "Краткое содержание",
  date: "Дата",
  sessionNumber: "Номер сессии",
};

let cachedState = null;
let cachedAt = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugPart(value) {
  return encodeURIComponent(String(value ?? ""));
}

function objectTitle(item, fallback = "Без названия") {
  return item?.name || item?.title || item?.label || item?.id || fallback;
}

function isPublic(value) {
  return !value || value.public !== false;
}

function sanitize(value) {
  if (Array.isArray(value)) {
    return value.filter(isPublic).map(sanitize);
  }
  if (!value || typeof value !== "object") return value;
  if (value.public === false) return null;

  const clean = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "description" && value.showDescription === false) continue;
    if (key === "effect" && value.showEffect === false) continue;
    if (PRIVATE_KEYS.has(key) || TECHNICAL_KEYS.has(key) || /^(gm|master|secret)/i.test(key)) continue;
    if (key === "public") {
      clean.public = entry === false ? "скрыто" : "видно игрокам";
      continue;
    }
    clean[key] = sanitize(entry);
  }
  return clean;
}

async function loadState() {
  if (cachedState && Date.now() - cachedAt < 30_000) return cachedState;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/campaign_state?select=data,updated_at&id=eq.main`,
    { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`Supabase returned ${response.status}`);
  }

  const rows = await response.json();
  const row = rows[0];
  if (!row?.data) throw new Error("Campaign state is empty");

  cachedState = { data: row.data, updatedAt: row.updated_at || null };
  cachedAt = Date.now();
  return cachedState;
}

function resolveCollection(name) {
  if (COLLECTIONS[name]) return name;
  return Object.entries(COLLECTIONS).find(([, config]) => config.aliases?.includes(name))?.[0] || null;
}

function collectionItems(state, key) {
  const values = state.data[key];
  if (!Array.isArray(values)) return [];
  return values.filter(isPublic).map(sanitize);
}

function findItem(items, id) {
  const decoded = decodeURIComponent(id);
  return items.find((item) => String(item.id) === decoded) || null;
}

function labelFor(key) {
  return LABELS[key] || key.replace(/([a-zа-я])([A-ZА-Я])/g, "$1 $2");
}

function isEmpty(value) {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);
}

function renderValue(value, depth = 0) {
  if (value === true) return "Да";
  if (value === false) return "Нет";
  if (typeof value === "number") return escapeHtml(value);
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      const safe = escapeHtml(value);
      if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value)) {
        return `<a href="${safe}"><img class="knowledge-image" src="${safe}" alt="Изображение" loading="lazy"></a>`;
      }
      return `<a href="${safe}" rel="noreferrer">${safe}</a>`;
    }
    return `<span class="text-value">${escapeHtml(value)}</span>`;
  }
  if (Array.isArray(value)) {
    if (!value.length) return "";
    const primitives = value.every((item) => item == null || typeof item !== "object");
    if (primitives) return `<ul>${value.map((item) => `<li>${renderValue(item, depth + 1)}</li>`).join("")}</ul>`;
    return `<div class="object-list">${value.map((item, index) => {
      const title = objectTitle(item, `Запись ${index + 1}`);
      return `<section class="nested"><h${Math.min(depth + 3, 6)}>${escapeHtml(title)}</h${Math.min(depth + 3, 6)}>${renderObject(item, depth + 1, new Set(["name", "title"]))}</section>`;
    }).join("")}</div>`;
  }
  if (value && typeof value === "object") return renderObject(value, depth + 1);
  return "";
}

function renderObject(value, depth = 0, omitted = new Set()) {
  const entries = Object.entries(value).filter(([key, entry]) => !omitted.has(key) && !isEmpty(entry));
  if (!entries.length) return `<p class="muted">Нет данных</p>`;
  return `<dl class="fields">${entries.map(([key, entry]) =>
    `<div class="field"><dt>${escapeHtml(labelFor(key))}</dt><dd>${renderValue(entry, depth)}</dd></div>`,
  ).join("")}</dl>`;
}

function baseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function isKnowledgeCrawler(request) {
  const agent = request.headers.get("user-agent") || "";
  return /(ChatGPT-User|GPTBot|OAI-SearchBot|ClaudeBot|Claude-Web|PerplexityBot|Googlebot|bingbot|YandexBot|DuckDuckBot)/i.test(agent);
}

function layout({ request, title, description, body, updatedAt, canonicalPath = "/knowledge" }) {
  const canonical = `${baseUrl(request)}${canonicalPath}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description || "Публичная энциклопедия мира Асханы.");
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle} | ${SITE_NAME}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <style>
    :root{color-scheme:dark;--bg:#111512;--panel:#191d19;--line:#5f4a25;--gold:#d6ad58;--text:#eee9dc;--muted:#b7b1a3}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 Georgia,serif}
    a{color:#e1bd70}header,main,footer{width:min(1120px,calc(100% - 32px));margin:auto}header{padding:32px 0 20px;border-bottom:1px solid var(--line)}
    nav{display:flex;gap:16px;flex-wrap:wrap;font:14px Arial,sans-serif}.brand{font-size:28px;color:var(--gold);text-decoration:none}h1,h2,h3,h4{color:#ead19d;line-height:1.2}
    main{padding:26px 0 48px}.intro{color:var(--muted)}.collection-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
    .card,.nested,.field{border:1px solid #343a34;background:var(--panel)}.card{padding:16px;text-decoration:none}.card:hover{border-color:var(--gold)}
    .card h2,.card h3{margin:0 0 6px}.card p{margin:0;color:var(--muted)}.fields{display:grid;gap:12px}.field{padding:14px}.field dt{font:700 12px Arial,sans-serif;text-transform:uppercase;color:var(--gold);margin-bottom:6px}.field dd{margin:0;overflow-wrap:anywhere}
    .text-value{white-space:pre-wrap}.object-list{display:grid;gap:12px}.nested{padding:14px}.nested h3,.nested h4,.nested h5,.nested h6{margin-top:0}
    ul{margin:4px 0;padding-left:20px}.knowledge-image{display:block;max-width:min(100%,560px);max-height:520px;object-fit:contain;border:1px solid #4c432f}
    .meta,.muted{color:var(--muted)}.breadcrumbs{margin-bottom:18px;font:14px Arial,sans-serif}footer{padding:20px 0 40px;border-top:1px solid var(--line);color:var(--muted);font:13px Arial,sans-serif}
  </style>
</head>
<body>
  <header><a class="brand" href="/knowledge">${SITE_NAME}</a><nav><a href="/">Открыть сайт</a><a href="/knowledge">Энциклопедия</a><a href="/api/v1/index">JSON API</a><a href="/llms.txt">llms.txt</a></nav></header>
  <main><div class="breadcrumbs"><a href="/knowledge">Энциклопедия</a></div><h1>${safeTitle}</h1>${description ? `<p class="intro">${safeDescription}</p>` : ""}${body}</main>
  <footer>Публичные данные кампании. Обновлено: ${escapeHtml(updatedAt || "неизвестно")}.</footer>
</body>
</html>`;
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      "X-Robots-Tag": status === 200 ? "index, follow" : "noindex",
    },
  });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function notFound(request, updatedAt, message = "Страница не найдена") {
  return htmlResponse(layout({
    request,
    title: "Не найдено",
    description: message,
    body: `<p>${escapeHtml(message)}</p>`,
    updatedAt,
  }), 404);
}

function publicCampaign(state) {
  const collections = {};
  for (const key of Object.keys(COLLECTIONS)) collections[key] = collectionItems(state, key);
  return { site: SITE_NAME, updatedAt: state.updatedAt, collections };
}

function knowledgeIndex(request, state) {
  const cards = Object.entries(COLLECTIONS).map(([key, config]) => {
    const count = collectionItems(state, key).length;
    return `<a class="card" href="/knowledge/${key}"><h2>${escapeHtml(config.title)}</h2><p>${count} ${count === 1 ? "запись" : "записей"}</p></a>`;
  }).join("");
  return htmlResponse(layout({
    request,
    title: "Энциклопедия Асханы",
    description: "Публичные сведения о мире, персонажах, поселениях, государствах, предметах и событиях кампании.",
    body: `<div class="collection-grid">${cards}</div>`,
    updatedAt: state.updatedAt,
  }));
}

function knowledgeCollection(request, state, key) {
  const config = COLLECTIONS[key];
  const items = collectionItems(state, key);
  const cards = items.map((item) => {
    const title = objectTitle(item);
    const description = item.description || item.summary || item.body || item.role || item.type || "Открыть запись";
    return `<a class="card" href="/knowledge/${key}/${slugPart(item.id)}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(String(description).slice(0, 240))}</p></a>`;
  }).join("") || `<p class="muted">Публичных записей пока нет.</p>`;
  return htmlResponse(layout({
    request,
    title: config.title,
    description: `Публичный раздел «${config.title}» энциклопедии Асханы.`,
    body: `<p class="meta">Записей: ${items.length}</p><div class="collection-grid">${cards}</div>`,
    updatedAt: state.updatedAt,
    canonicalPath: `/knowledge/${key}`,
  }));
}

function knowledgeItem(request, state, key, id) {
  const config = COLLECTIONS[key];
  const item = findItem(collectionItems(state, key), id);
  if (!item) return notFound(request, state.updatedAt, `${config.singular} не найден.`);
  const title = objectTitle(item);
  const description = String(item.description || item.summary || item.body || `${config.singular} мира Асханы.`).slice(0, 300);
  const canonicalPath = `/knowledge/${key}/${slugPart(item.id)}`;
  return htmlResponse(layout({
    request,
    title,
    description,
    body: `<p class="breadcrumbs"><a href="/knowledge/${key}">${escapeHtml(config.title)}</a></p>${renderObject(item, 0, new Set(["name", "title"]))}`,
    updatedAt: state.updatedAt,
    canonicalPath,
  }));
}

function apiIndex(request, state) {
  const origin = baseUrl(request);
  const collections = Object.entries(COLLECTIONS).map(([key, config]) => ({
    id: key,
    title: config.title,
    count: collectionItems(state, key).length,
    html: `${origin}/knowledge/${key}`,
    json: `${origin}/api/v1/${key}`,
  }));
  return jsonResponse({ site: SITE_NAME, updatedAt: state.updatedAt, collections });
}

function llmsText(request, state) {
  const origin = baseUrl(request);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    "> Публичная база знаний по авторскому миру Асханы и кампании Pathfinder 1e.",
    "",
    "Данные доступны без JavaScript и без регистрации. Скрытые мастерские записи исключены.",
    `Обновлено: ${state.updatedAt || "неизвестно"}`,
    "",
    "## Навигация",
    `- [Энциклопедия](${origin}/knowledge)`,
    `- [Индекс JSON API](${origin}/api/v1/index)`,
    `- [Все публичные данные JSON](${origin}/api/v1/campaign)`,
    ...Object.entries(COLLECTIONS).map(([key, config]) => `- [${config.title}](${origin}/knowledge/${key}) — [JSON](${origin}/api/v1/${key})`),
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=30" },
  });
}

function sitemap(request, state) {
  const origin = baseUrl(request);
  const paths = ["/knowledge"];
  for (const key of Object.keys(COLLECTIONS)) {
    paths.push(`/knowledge/${key}`);
    for (const item of collectionItems(state, key)) paths.push(`/knowledge/${key}/${slugPart(item.id)}`);
  }
  const urls = paths.map((path) => `<url><loc>${escapeHtml(origin + path)}</loc>${state.updatedAt ? `<lastmod>${escapeHtml(state.updatedAt)}</lastmod>` : ""}</url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

async function handleDynamic(request) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    if (!isKnowledgeCrawler(request)) return null;
    const state = await loadState();
    return knowledgeIndex(request, state);
  }

  if (url.pathname === "/robots.txt") {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${baseUrl(request)}/sitemap.xml\n`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const state = await loadState();
  if (url.pathname === "/llms.txt") return llmsText(request, state);
  if (url.pathname === "/sitemap.xml") return sitemap(request, state);
  if (url.pathname === "/knowledge" || url.pathname === "/knowledge/") return knowledgeIndex(request, state);

  if (segments[0] === "knowledge") {
    const key = resolveCollection(segments[1]);
    if (!key) return notFound(request, state.updatedAt, "Раздел энциклопедии не найден.");
    if (segments.length === 2) return knowledgeCollection(request, state, key);
    return knowledgeItem(request, state, key, segments.slice(2).join("/"));
  }

  if (segments[0] === "api" && segments[1] === "v1") {
    if (!segments[2] || segments[2] === "index") return apiIndex(request, state);
    if (segments[2] === "campaign") return jsonResponse(publicCampaign(state));
    const key = resolveCollection(segments[2]);
    if (!key) return jsonResponse({ error: "Collection not found" }, 404);
    const items = collectionItems(state, key);
    if (segments.length === 3) return jsonResponse({ collection: key, updatedAt: state.updatedAt, count: items.length, items });
    const item = findItem(items, segments.slice(3).join("/"));
    return item ? jsonResponse({ collection: key, updatedAt: state.updatedAt, item }) : jsonResponse({ error: "Item not found" }, 404);
  }

  return null;
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    try {
      const response = await handleDynamic(request);
      if (response) return request.method === "HEAD" ? new Response(null, response) : response;
      return env.ASSETS.fetch(request);
    } catch (error) {
      const message = "Публичная энциклопедия временно недоступна. Основной сайт продолжает работать.";
      if (new URL(request.url).pathname.startsWith("/api/")) {
        return jsonResponse({ error: message }, 503);
      }
      return htmlResponse(layout({ request, title: "Временная ошибка", description: message, body: `<p>${message}</p>`, updatedAt: null }), 503);
    }
  },
};

export { sanitize, renderObject, collectionItems, resolveCollection };
