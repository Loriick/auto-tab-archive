const list = document.getElementById("list");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function ago(ts) {
  const min = Math.round((ts - Date.now()) / 60000);
  if (min > -60) return rtf.format(min, "minute");
  const h = Math.round(min / 60);
  if (h > -24) return rtf.format(h, "hour");
  return rtf.format(Math.round(h / 24), "day");
}

function host(url) {
  try { return new URL(url).hostname || url; } catch { return url; }
}

async function getArchive() {
  const { archive = [] } = await chrome.storage.local.get("archive");
  return archive;
}

async function removeEntry(id) {
  const archive = await getArchive();
  await chrome.storage.local.set({ archive: archive.filter((e) => e.id !== id) });
}

function icon(entry) {
  const fallback = document.createElement("span");
  fallback.className = "icon letter";
  fallback.textContent = (host(entry.url)[0] || "?").toUpperCase();
  if (!entry.favIconUrl) return fallback;
  const img = document.createElement("img");
  img.className = "icon";
  img.src = entry.favIconUrl;
  img.alt = "";
  img.onerror = () => img.replaceWith(fallback);
  return img;
}

async function render() {
  const q = search.value.trim().toLowerCase();
  const items = (await getArchive()).filter(
    (e) => !q || e.title.toLowerCase().includes(q) || e.url.toLowerCase().includes(q)
  );
  list.replaceChildren(
    ...items.map((e) => {
      const li = document.createElement("li");
      li.title = e.url;

      const text = document.createElement("div");
      text.className = "text";
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = e.title;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${host(e.url)} · archivé ${ago(e.archivedAt)}`;
      text.append(title, meta);

      const del = document.createElement("button");
      del.className = "del";
      del.title = "Retirer de l'archive";
      del.textContent = "×";
      del.onclick = (ev) => { ev.stopPropagation(); removeEntry(e.id); };

      li.onclick = async () => {
        await removeEntry(e.id);
        await chrome.tabs.create({ url: e.url });
      };
      li.append(icon(e), text, del);
      return li;
    })
  );
  empty.hidden = items.length > 0;
}

document.getElementById("clear").onclick = async () => {
  if (confirm("Vider toute l'archive ?")) await chrome.storage.local.set({ archive: [] });
};
document.getElementById("options").onclick = () => chrome.runtime.openOptionsPage();
search.oninput = render;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.archive) render();
});
render();
