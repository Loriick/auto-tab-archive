// Auto Tab Archive — archivage automatique des onglets inactifs, à la manière d'Arc.
// Service worker éphémère : aucun état en mémoire. L'inactivité se mesure avec
// `tab.lastAccessed` (Chrome 121+). L'archive est stockée dans chrome.storage.local,
// les réglages dans chrome.storage.sync (modifiables depuis la page d'options).

importScripts("settings.js"); // DEFAULT_SETTINGS, partagé avec la page d'options

// ─── Constantes avancées (non exposées dans la page d'options) ──────────────
const CHECK_EVERY_MINUTES = 5;      // fréquence de vérification
const ARCHIVE_MAX_ITEMS = 500;      // taille maximale de l'archive
const ARCHIVE_RETENTION_DAYS = 30;  // durée de conservation dans l'archive
// ────────────────────────────────────────────────────────────────────────────

const ALARM_NAME = "archive-check";
const HOUR = 60 * 60 * 1000;

// Délai de grâce : au démarrage de Chrome ou à l'installation, le compteur de chaque
// onglet repart de zéro. Sinon, le matin, tous les onglets de la veille seraient
// archivés d'un coup dès l'ouverture. storage.session survit aux redémarrages du
// service worker mais est vidé à la fermeture de Chrome.
async function markGraceStart() {
  await chrome.storage.session.set({ graceStart: Date.now() });
}

async function getGraceStart() {
  const { graceStart } = await chrome.storage.session.get("graceStart");
  if (graceStart) return graceStart;
  await markGraceStart(); // valeur absente : on choisit l'option prudente
  return Date.now();
}

function isReopenable(url) {
  return !!url && !/^(chrome:\/\/newtab|about:blank|chrome-search:)/.test(url);
}

async function runArchive() {
  const now = Date.now();
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const graceStart = await getGraceStart();
  const threshold = settings.archiveAfterHours * HOUR;

  const tabs = await chrome.tabs.query({ pinned: false, windowType: "normal" });
  const candidates = tabs.filter((t) => {
    if (t.incognito) return false;
    if (settings.keepActive && t.active) return false;
    if (settings.keepGrouped && t.groupId !== -1) return false;
    if (settings.keepAudible && t.audible) return false;
    const last = Math.max(t.lastAccessed ?? now, graceStart);
    return now - last >= threshold;
  });

  // Ne jamais vider une fenêtre, même si keepActive est désactivé :
  // on garde au moins l'onglet actif.
  const tabsPerWindow = new Map();
  for (const t of await chrome.tabs.query({ windowType: "normal" })) {
    tabsPerWindow.set(t.windowId, (tabsPerWindow.get(t.windowId) || 0) + 1);
  }
  const closingPerWindow = new Map();
  for (const t of candidates) closingPerWindow.set(t.windowId, (closingPerWindow.get(t.windowId) || 0) + 1);
  const toClose = candidates.filter(
    (t) => !(t.active && closingPerWindow.get(t.windowId) >= tabsPerWindow.get(t.windowId))
  );
  if (toClose.length === 0) return;

  // Fermer d'abord, puis archiver uniquement ce qui a vraiment été fermé.
  const results = await Promise.allSettled(toClose.map((t) => chrome.tabs.remove(t.id)));
  const closed = toClose.filter((_, i) => results[i].status === "fulfilled");

  const entries = closed
    .filter((t) => isReopenable(t.url))
    .map((t) => ({
      id: crypto.randomUUID(),
      url: t.url,
      title: t.title || t.url,
      favIconUrl: /^https?:/.test(t.favIconUrl || "") ? t.favIconUrl : "",
      lastAccessed: t.lastAccessed ?? null,
      archivedAt: now,
    }));
  if (entries.length) await addToArchive(entries);
  console.log(`[Auto Tab Archive] ${closed.length} onglet(s) archivé(s).`);
}

async function addToArchive(entries) {
  const { archive = [] } = await chrome.storage.local.get("archive");
  const minDate = Date.now() - ARCHIVE_RETENTION_DAYS * 24 * HOUR;
  const merged = [...entries, ...archive]
    .filter((e) => e.archivedAt >= minDate)
    .slice(0, ARCHIVE_MAX_ITEMS);
  await chrome.storage.local.set({ archive: merged });
}

async function ensureAlarm({ force = false } = {}) {
  if (!force && (await chrome.alarms.get(ALARM_NAME))) return;
  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: CHECK_EVERY_MINUTES,
    periodInMinutes: CHECK_EVERY_MINUTES,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) return runArchive();
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.clear("midnight-cleanup"); // ancienne alarme de la v1
  await markGraceStart();
  await ensureAlarm({ force: true }); // applique un éventuel nouveau CHECK_EVERY_MINUTES
});

chrome.runtime.onStartup.addListener(async () => {
  await markGraceStart();
  await ensureAlarm();
});
