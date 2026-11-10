// Réglages par défaut, partagés entre le service worker et la page d'options.
// Les valeurs choisies par l'utilisateur sont stockées dans chrome.storage.sync.
const DEFAULT_SETTINGS = {
  archiveAfterHours: 12, // délai d'inactivité avant archivage (Arc : 12 h)
  keepGrouped: true,     // épargner les onglets rangés dans un groupe
  keepActive: true,      // épargner l'onglet actif de chaque fenêtre
  keepAudible: false,    // épargner les onglets qui jouent du son
};
