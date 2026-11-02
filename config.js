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
  apiKey: "AIzaSyCSlmxuzeHbw2fzy5IJtcVhXj-isdDoM9w",
  authDomain: "qpuk-9417e.firebaseapp.com",
  databaseURL: "https://qpuk-9417e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "qpuk-9417e",
  storageBucket: "qpuk-9417e.firebasestorage.app",
  messagingSenderId: "1008129366283",
  appId: "1:1008129366283:web:8a1547a1596e2cbbe1ea0e"
}
// ▲▲▲ Fin du bloc à remplacer ▲▲▲

window.QPK_FIREBASE = firebaseConfig;

// Facultatif : App Check (voir le guide, partie « Pour aller plus loin »).
// Colle ici la clé de site reCAPTCHA v3 entre les guillemets. Laisse vide pour ne pas l'utiliser.
window.QPK_APPCHECK_CLE = "";
