// УТРО ЖЕНИ — веб-виджет для Scriptable (iPhone)
// Источник выпуска: публичный JSON-файл, который ChatGPT обновляет на GitHub.
// Никаких токенов Notion и Gmail в этом скрипте нет.
// ВАЖНО: адрес веб-источника открытый; не публикуйте в нём личные планы без согласия.

const ZONE = 'Europe/Moscow';
const CITY = 'Лиски';
const LAT = 50.9841, LON = 39.5154;
const KEY = 'utro-zheni-remote-feed-url-v1';
const FEED_URL = 'https://raw.githubusercontent.com/sssneer124-maker/utro-zheni-feed./main/feed.json';
const BG = new Color('#FCF8F0');
const INK = new Color('#34271F');
const GOLD = new Color('#A27B47');
const MUTED = new Color('#817669');
const fm = FileManager.local();
const CACHE = fm.joinPath(fm.documentsDirectory(), 'utro_zheni_public_feed_cache.json');

function currentDate() {
  const pairs = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const d = {};
  pairs.forEach(p => { d[p.type] = p.value; });
  return `${d.year}-${d.month}-${d.day}`;
}
function shortText(s, max = 120) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}
function normalizeFeed(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.schema_version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(value.date || '')) return null;
  const tasks = Array.isArray(value.tasks) ? value.tasks : [];
  return {
    date: value.date,
    status: shortText(value.status, 40),
    weather: shortText(value.weather, 90),
    tasks: tasks.slice(0, 3).map(t => shortText(typeof t === 'string' ? t : t && t.title, 92)).filter(Boolean),
    news: shortText(typeof value.news === 'string' ? value.news : value.news && value.news.title, 130),
    idea: shortText(value.idea, 120),
    updated_at: shortText(value.updated_at, 50)
  };
}
async function configure() {
  if (!Keychain.contains(KEY)) Keychain.set(KEY, FEED_URL);
}

async function fetchFeed() {
  let data = null, cached = false;
  if (Keychain.contains(KEY)) {
    try {
      const url = Keychain.get(KEY);
      const separator = url.includes('?') ? '&' : '?';
      const req = new Request(url + separator + 'v=' + Math.floor(Date.now() / (30 * 60 * 1000)));
      req.timeoutInterval = 13;
      const result = normalizeFeed(await req.loadJSON());
      if (!result) throw new Error('Неподдерживаемый формат');
      data = result;
      fm.writeString(CACHE, JSON.stringify(result));
    } catch (_) { cached = true; }
  }
  if (!data && fm.fileExists(CACHE)) {
    try { data = normalizeFeed(JSON.parse(fm.readString(CACHE))); cached = true; } catch (_) {}
  }
  return { data, cached };
}
async function fetchWeather() {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(ZONE)}&forecast_days=1`;
    const req = new Request(u);
    req.timeoutInterval = 13;
    const json = await req.loadJSON();
    if (!json.current || typeof json.current.temperature_2m !== 'number') return null;
    const n = Math.round(json.current.temperature_2m);
    const code = json.current.weather_code;
    const desc = code >= 95 ? 'Гроза' : code >= 80 ? 'Ливни' : code >= 61 ? 'Дождь' : code >= 51 ? 'Морось' : code >= 45 ? 'Туман' : code >= 3 ? 'Облачно' : code >= 1 ? 'Переменная облачность' : 'Ясно';
    return { temp: (n > 0 ? '+' : '') + n + '°', desc,
      min: Math.round(json.daily.temperature_2m_min[0]), max: Math.round(json.daily.temperature_2m_max[0]) };
  } catch (_) { return null; }
}
function addText(w, txt, size = 12, color = INK, bold = false, lines = 1) {
  const t = w.addText(txt);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = lines;
  return t;
}
await configure();
const [feedState, weather] = await Promise.all([fetchFeed(), fetchWeather()]);
const feed = feedState.data;
const day = currentDate();
const niceDate = new Intl.DateTimeFormat('ru-RU', { timeZone:ZONE, day:'numeric', month:'long' }).format(new Date());
const weekday = new Intl.DateTimeFormat('ru-RU', { timeZone:ZONE, weekday:'long' }).format(new Date());
const w = new ListWidget();
w.backgroundColor = BG;
w.setPadding(17, 17, 15, 17);
addText(w, 'УТРО ЖЕНИ  /  DAILY PAPER', 11, GOLD, true);
w.addSpacer(7);
addText(w, niceDate, 29, INK, true);
addText(w, weekday + ' · ' + CITY, 11, MUTED);
w.addSpacer(12);
if (weather) {
  const line = w.addStack();
  line.layoutHorizontally();
  line.centerAlignContent();
  const v = line.addText(weather.temp); v.font = Font.boldSystemFont(35); v.textColor = INK;
  line.addSpacer(13);
  const r = line.addStack(); r.layoutVertically();
  let x = r.addText(weather.desc); x.font = Font.mediumSystemFont(12); x.textColor = INK;
  x = r.addText(`от ${weather.min}° до ${weather.max}°`); x.font = Font.systemFont(10); x.textColor = MUTED;
} else addText(w, (feed && feed.weather) || 'Погода пока недоступна', 13, INK, true, 2);
w.addSpacer(15);
addText(w, 'ПЛАНЫ ДНЯ', 10, GOLD, true);
w.addSpacer(5);
if (!Keychain.contains(KEY)) {
  addText(w, 'Открой Scriptable и запусти скрипт, чтобы указать адрес газеты.', 12, INK, false, 4);
} else if (!feed) {
  addText(w, 'Пока нет опубликованного выпуска. Попробуй позже.', 12, INK, false, 3);
} else if (feed.status === 'setup') {
  addText(w, 'Сайт подготовлен. Публикация выпусков ещё не запущена.', 12, INK, false, 3);
} else if (!feed.tasks.length) {
  addText(w, 'Личные планы — только в газете на почте.', 12, INK, false, 2);
} else {
  for (const item of feed.tasks) {
    addText(w, '□  ' + item, 12, INK, false, 2);
    w.addSpacer(4);
  }
}
w.addSpacer(10);
addText(w, 'НОВОСТЬ ДНЯ', 10, GOLD, true);
w.addSpacer(4);
addText(w, (feed && feed.news) || 'Жду проверенную новость в выпуске.', 11, INK, false, 3);
w.addSpacer(10);
addText(w, 'ИДЕЯ ДЛЯ ALEXJEN VET', 10, GOLD, true);
w.addSpacer(4);
addText(w, (feed && feed.idea) || 'Скоро здесь появится идея из газеты.', 11, INK, false, 2);
w.addSpacer();
const footer = !feed ? 'Источник ещё не подключён' : (feed.date === day ? 'Выпуск за сегодня' : 'Выпуск: ' + feed.date) + (feedState.cached ? ' · сохранённая копия' : ' · онлайн');
addText(w, footer, 9, MUTED);
w.refreshAfterDate = new Date(Date.now() + 35 * 60 * 1000);
Script.setWidget(w);
if (!config.runsInWidget) await w.presentLarge();
Script.complete();