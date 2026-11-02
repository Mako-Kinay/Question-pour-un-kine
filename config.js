/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.7.0
   Reproduction, diffusion ou modification interdites sans accord écrit de l'auteur. Voir LICENCE.txt. */
/* ================================================================
   Configuration Firebase (voir le guide, étape 4).
   Tant que apiKey est vide, le jeu tourne en mode démo :
   la partie se joue seulement entre les onglets d'un même navigateur.
   ================================================================ */

// ▼▼▼ Remplacez tout ce bloc par celui copié dans la console Firebase ▼▼▼
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
// ▲▲▲ Fin du bloc à remplacer ▲▲▲

window.QPK_FIREBASE = firebaseConfig;

// Facultatif : App Check (voir le guide, partie « Pour aller plus loin »).
// Colle ici la clé de site reCAPTCHA v3 entre les guillemets. Laisse vide pour ne pas l'utiliser.
window.QPK_APPCHECK_CLE = "";
