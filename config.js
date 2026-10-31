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
  apiKey: "AIzaSyA9a68ALEYEVbF9D-0ZODm-eA554jEib1Q",
  authDomain: "question-pour-un-kine.firebaseapp.com",
  databaseURL: "https://question-pour-un-kine-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "question-pour-un-kine",
  storageBucket: "question-pour-un-kine.firebasestorage.app",
  messagingSenderId: "369438859710",
  appId: "1:369438859710:web:60b9713cf64b5ca7c659ef"
};
// ▲▲▲ Fin du bloc à remplacer ▲▲▲

window.QPK_FIREBASE = firebaseConfig;
