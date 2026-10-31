/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.4.2
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
