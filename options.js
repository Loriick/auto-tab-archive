const form = document.getElementById("form");
const status = document.getElementById("status");
const custom = document.getElementById("custom");

function formatHours(h) {
  if (h < 1 / 60) return `${Math.round(h * 3600)} seconde(s) (valeur de test)`;
  if (h < 1) return `${Math.round(h * 60)} minute(s) (valeur de test)`;
  if (h % 24 === 0) return `${h / 24} jour(s)`;
  return `${h} heure(s)`;
}

async function load() {
  const s = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const radio = form.querySelector(`input[name="archiveAfterHours"][value="${s.archiveAfterHours}"]`);
  if (radio) {
    radio.checked = true;
  } else {
    // Valeur posée à la main (ex. test à 1 minute) : on l'affiche telle quelle.
    custom.value = String(s.archiveAfterHours);
    custom.checked = true;
    document.getElementById("customLabel").textContent = formatHours(s.archiveAfterHours);
    document.getElementById("customRow").hidden = false;
  }
  for (const key of ["keepActive", "keepGrouped", "keepAudible"]) {
    form.elements[key].checked = s[key];
  }
}

let timer;
form.addEventListener("change", async () => {
  await chrome.storage.sync.set({
    archiveAfterHours: Number(form.elements.archiveAfterHours.value),
    keepActive: form.elements.keepActive.checked,
    keepGrouped: form.elements.keepGrouped.checked,
    keepAudible: form.elements.keepAudible.checked,
  });
  status.textContent = "Enregistré. Appliqué à la prochaine vérification (≤ 5 min).";
  clearTimeout(timer);
  timer = setTimeout(() => (status.textContent = ""), 3000);
});

load();
