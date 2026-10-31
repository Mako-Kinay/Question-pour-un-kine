/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.4.2
   Reproduction, diffusion ou modification interdites sans accord écrit de l'auteur. Voir LICENCE.txt. */
/* Page du maître du jeu : crée la partie, tire les cartes, voit la réponse attendue.
   Les joueurs répondent avant la fin du chrono. Le maître du jeu valide ou refuse chaque réponse.
   Chaque bonne réponse fait monter le badge du joueur dans la catégorie (bronze, argent, or). */
(function () {
"use strict";
var Q = window.QPK, QS = window.QPK_QUESTIONS || [], esc = Q.esc, byId = Q.byId;
var app = byId("app");
var K_H = "qpk-mj-hote", K_CATS = "qpk-mj-cats", K_FICH = "qpk-mj-fiches", K_DUR = "qpk-mj-duree";
var DURS = [20, 30, 45, 60, 90, 120];
var db = null, uid = null, P = null, partyRef = null, H = null;
var FI = window.QPK_FICHES || { groupes: [], titres: {} };
if (!FI.fils) FI.fils = [];
var HAS_FICHES = FI.groupes.length > 0 && QS.length > 0 && QS.every(function (q) { return q.f; });
/* Index des questions par catégorie, limité aux fiches choisies (null = toutes les questions). */
/* Les grandes questions (g) ne sortent que dans leur mode : grandes = true. */
function byFor(fiches, grandes) {
  var m = {};
  QS.forEach(function (q, i) { if (!q.g !== !grandes) return; if (!fiches || fiches.indexOf(q.f) >= 0) (m[q.c] = m[q.c] || []).push(i); });
  return m;
}
var ALL = byFor(null), GR = byFor(null, true), BY = ALL;
var HAS_G = Object.keys(GR).length > 0;
var lastF = Q.lsGet(K_FICH) || {};
var setupMode = HAS_FICHES && (lastF.mode === "fiches" || (lastF.mode === "fils" && FI.fils.length) || (lastF.mode === "grandes" && HAS_G)) ? lastF.mode : "cats";
var setupFiches = Array.isArray(lastF.fiches) ? lastF.fiches.filter(function (n) { return FI.titres[n]; }) : [];
var setupFils = Array.isArray(lastF.fils) ? lastF.fils.filter(function (i) { return FI.fils[i]; }) : [];
/* Fiches retenues : cochées (« Par fiche ») ou couvertes par les fils rouges cochés (« Par fil rouge »). */
function effFiches() { return setupMode === "fils" ? Q.filsUnion(FI.fils, setupFils) : setupFiches; }
function rowLabel() { return setupMode === "fiches" ? "Fiches en jeu" : setupMode === "fils" ? "Fils rouges en jeu" : setupMode === "grandes" ? "Grandes questions" : "Catégories en jeu"; }
function useFiches() { return setupMode === "fiches" || setupMode === "fils"; }
var setupCats = (Q.lsGet(K_CATS) || Q.CAT_IDS).filter(function (c) { return ALL[c]; });
if (!setupCats.length) setupCats = Q.CAT_IDS.filter(function (c) { return ALL[c]; });
function setupBY() { return setupMode === "grandes" ? GR : setupMode === "cats" ? ALL : byFor(effFiches()); }
function setupActiveCats() { var b = setupBY(); return setupCats.filter(function (c) { return b[c]; }); }
var setupDur = DURS.indexOf(Q.lsGet(K_DUR)) >= 0 ? Q.lsGet(K_DUR) : 45;
var busy = false, closing = false, showAnswer = true, lastCard = null, lastEtat = null, celebrated = {}, screen = null, flash = "";

function saveH() { Q.lsSet(K_H, H); }
function path(p) { return "parties/" + H.code + (p ? "/" + p : ""); }
function demoQS() { return Q.param("demo") === "1" ? "&demo=1" : ""; }
function joinURL() { return Q.siteURL("joueur.html?p=" + H.code + demoQS()); }
function screenURL() { return Q.siteURL("joueur.html?p=" + H.code + "&ecran=1" + demoQS()); }
function fail(e) { flash = Q.permError(e); render(); }

/* ---------- démarrage ---------- */
app.innerHTML = '<section class="panel">' + Q.brand("mode multijoueur") + '<p class="lead">Connexion…</p></section>';
Q.autoFit();
Q.connect("hote").then(function (c) {
  db = c.db; uid = c.uid; H = Q.lsGet(K_H);
  if (H && H.code) {
    db.ref("parties/" + H.code).once("value").then(function (s) {
      var v = s.val();
      if (v && v.hote === uid) renderSetup(v); else { H = null; saveH(); renderSetup(null); }
    }).catch(function () { renderSetup(null); });
  } else renderSetup(null);
}).catch(function (e) {
  app.innerHTML = '<section class="panel">' + Q.brand("mode multijoueur") + '<h2>Connexion impossible</h2><p class="note warn">' + esc(e.message) + "</p></section>";
});

/* ---------- création ---------- */
function renderSetup(resumable) {
  screen = "setup";
  app.innerHTML = Q.demoBanner() +
    '<section class="panel" aria-labelledby="t">' + Q.brand("mode multijoueur") +
    '<h2 id="t">Créer une partie</h2>' +
    '<p class="lead">Vous êtes le maître du jeu. Vous voyez la question et la réponse. Les joueurs, sur leur téléphone, ne voient que la question et tapent leur réponse.</p>' +
    (resumable ? '<div class="resume-box"><span>Une partie est en cours : code <strong>' + esc(H.code) + "</strong>, " + Object.keys(resumable.joueurs || {}).length + ' joueur(s).</span><button class="ghost" type="button" id="btnResume">Reprendre</button><button class="mini danger" type="button" id="btnDrop">Effacer cette partie</button></div>' : "") +
    (HAS_FICHES ? '<div class="field-row"><div class="field-label" id="rowLabel">' + rowLabel() + '</div><div class="mode-switch" role="group" aria-label="Choisir les questions">' +
      '<button type="button" data-mode="cats" aria-pressed="' + (setupMode === "cats") + '">Par catégorie</button><button type="button" data-mode="fiches" aria-pressed="' + (setupMode === "fiches") + '">Par fiche</button>' +
      (FI.fils.length ? '<button type="button" data-mode="fils" aria-pressed="' + (setupMode === "fils") + '">Par fil rouge</button>' : "") +
      (HAS_G ? '<button type="button" data-mode="grandes" aria-pressed="' + (setupMode === "grandes") + '">Grandes questions</button>' : "") + "</div></div>" +
      '<p class="fiches-note" id="grandesBox"' + (setupMode === "grandes" ? "" : " hidden") + '>Une grande question par fiche. Elles demandent une réponse construite, à discuter ensemble. Elles ne sortent pas dans les trois autres modes.</p>' +
      '<div id="fichesBox"' + (setupMode === "fiches" ? "" : " hidden") + '>' + Q.fichesPicker(FI, QS, setupFiches) + "</div>" +
      (FI.fils.length ? '<div id="filsBox"' + (setupMode === "fils" ? "" : " hidden") + '>' + Q.filsPicker(FI.fils, FI.titres, QS, setupFils) + "</div>" : "") : "") +
    '<div class="field-label" id="catsLabel"' + (HAS_FICHES && setupMode === "cats" ? " hidden" : "") + '>Catégories en jeu</div>' +
    '<div class="cats" id="cats"></div>' +
    '<p class="fiches-note" id="lowNote" hidden></p>' +
    '<div class="field-label">Temps pour répondre</div><div class="mode-switch durs" role="group" aria-label="Temps pour répondre">' +
    DURS.map(function (d) { return '<button type="button" data-dur="' + d + '" aria-pressed="' + (d === setupDur) + '">' + (d < 60 ? d + " s" : d / 60 + " min") + "</button>"; }).join("") + "</div>" +
    '<p class="fiches-note">Conseil : 2 min pour les grandes questions. Le maître du jeu peut ajouter du temps pendant la carte.</p>' +
    (flash ? '<p class="note warn" style="margin-top:12px">' + esc(flash) + "</p>" : "") +
    '<div class="setup-foot"><span class="summary" id="summary"></span><button class="primary" type="button" id="btnCreate">Créer la partie</button></div>' +
    '<p class="version">Question pour un kiné · ' + Q.VERSION + "</p></section>";
  flash = "";
  function sum() {
    var k = setupActiveCats().length;
    var noFiche = useFiches() && !effFiches().length;
    byId("summary").textContent = noFiche ? (setupMode === "fils" ? "Choisissez au moins un fil rouge." : "Choisissez au moins une fiche.") : k ? k + " catégorie" + (k > 1 ? "s" : "") + " : " + k + " badge" + (k > 1 ? "s" : "") + " à faire monter jusqu'à l'or." : "Choisissez au moins une catégorie.";
    byId("btnCreate").disabled = !k || noFiche;
  }
  function drawCats() {
    var b = setupBY();
    byId("cats").innerHTML = Q.CATS.filter(function (c) { return setupMode === "cats" || b[c.id]; }).map(function (c) {
      var n = b[c.id] ? b[c.id].length : 0;
      return '<button type="button" class="cat-toggle" style="--c:' + c.color + ";--t:" + c.text + '" data-cat="' + esc(c.id) + '" aria-pressed="' + (n > 0 && setupCats.indexOf(c.id) >= 0) + '"' + (n ? "" : " disabled") + '><span class="dot">✓</span>' + esc(c.id) + ' <span class="n">' + n + "</span></button>";
    }).join("");
    Array.prototype.forEach.call(app.querySelectorAll(".cat-toggle"), function (bt) {
      bt.onclick = function () {
        var c = bt.dataset.cat;
        if (setupCats.indexOf(c) >= 0) setupCats = setupCats.filter(function (x) { return x !== c; });
        else setupCats = Q.CAT_IDS.filter(function (x) { return x === c || setupCats.indexOf(x) >= 0; });
        bt.setAttribute("aria-pressed", setupCats.indexOf(c) >= 0);
        lowNote(); sum();
      };
    });
    lowNote(); sum();
  }
  function lowNote() {
    var b = setupBY(), el = byId("lowNote");
    var low = setupMode !== "cats" ? setupActiveCats().filter(function (c) { return b[c].length < 3; }) : [];
    el.hidden = !low.length;
    el.textContent = low.length ? "Peu de questions en " + low.map(function (c) { return c + " (" + b[c].length + ")"; }).join(", ") + " : ces cartes reviendront souvent. Vous pouvez décocher ces catégories." : "";
  }
  Array.prototype.forEach.call(app.querySelectorAll(".mode-switch button"), function (bt) {
    bt.onclick = function () {
      setupMode = bt.dataset.mode;
      Array.prototype.forEach.call(app.querySelectorAll(".mode-switch button"), function (x) { x.setAttribute("aria-pressed", x === bt); });
      byId("fichesBox").hidden = setupMode !== "fiches";
      if (byId("filsBox")) byId("filsBox").hidden = setupMode !== "fils";
      byId("grandesBox").hidden = setupMode !== "grandes";
      byId("catsLabel").hidden = setupMode === "cats";
      byId("rowLabel").textContent = rowLabel();
      if (setupMode !== "cats") setupCats = Q.CAT_IDS.slice();
      drawCats();
    };
  });
  if (HAS_FICHES) Q.bindFichesPicker(byId("fichesBox"), function (list) { setupFiches = list; setupCats = Q.CAT_IDS.slice(); drawCats(); });
  if (HAS_FICHES) Q.bindFilsPicker(byId("filsBox"), function (list) { setupFils = list; setupCats = Q.CAT_IDS.slice(); drawCats(); });
  drawCats();
  Array.prototype.forEach.call(app.querySelectorAll("[data-dur]"), function (bt) {
    bt.onclick = function () {
      setupDur = +bt.dataset.dur; Q.lsSet(K_DUR, setupDur);
      Array.prototype.forEach.call(app.querySelectorAll("[data-dur]"), function (x) { x.setAttribute("aria-pressed", x === bt); });
    };
  });
  byId("btnCreate").onclick = function () { createParty(0); };
  var r = byId("btnResume"); if (r) r.onclick = function () { subscribe(); };
  var d = byId("btnDrop");
  if (d) Q.armButton(d, "Confirmer l'effacement ?", function () {
    db.ref("parties/" + H.code).remove().catch(function () {});
    H = null; saveH(); renderSetup(null);
  });
  sum();
}

function createParty(tries) {
  tries = tries || 0;
  var code = Q.newCode();
  byId("btnCreate").disabled = true;
  db.ref("parties/" + code).once("value").then(function (s) {
    if (s.exists()) { if (tries < 6) return createParty(tries + 1); throw new Error("Impossible de trouver un code libre, réessayez."); }
    var cats = setupActiveCats();
    if (setupMode === "cats") Q.lsSet(K_CATS, setupCats);
    Q.lsSet(K_FICH, { mode: setupMode, fiches: setupFiches, fils: setupFils });
    var party = { hote: uid, cree: Q.NOW, etat: "lobby", cats: cats, tirees: 0, duree: setupDur };
    if (useFiches()) party.fiches = effFiches().slice();
    if (setupMode === "grandes") party.grandes = true;
    if (setupMode === "fils") party.fils = setupFils.map(function (i) { return FI.fils[i][0]; });
    return db.ref("parties/" + code).set(party).then(function () {
      H = { code: code, used: [], qi: null }; saveH(); subscribe();
    });
  }).catch(function (e) { flash = Q.permError(e); renderSetup(null); });
}

function subscribe() {
  if (partyRef) partyRef.off("value");
  partyRef = db.ref(path());
  partyRef.on("value", function (s) {
    P = s.val();
    BY = P && P.grandes ? GR : P && Array.isArray(P.fiches) && P.fiches.length ? byFor(P.fiches) : ALL;
    if (!P) { partyRef.off("value"); partyRef = null; H = null; saveH(); renderSetup(null); return; }
    render();
  }, function (e) { flash = Q.permError(e); renderSetup(null); });
}

function render() {
  if (!P) return;
  if (P.etat === "lobby") renderLobby();
  else if (P.etat === "fin") renderEnd();
  else renderGame();
}

/* ---------- salle d'attente ---------- */
function playersChips(removable) {
  var list = Q.activeList(P);
  if (!list.length) return '<p class="note">Personne pour l\'instant. Les prénoms apparaîtront ici dès qu\'un joueur rejoint la partie.</p>';
  return '<div class="chips">' + list.map(function (p) {
    return '<span class="' + (p.enLigne ? "" : "off") + '">' + esc(p.nom) + (removable ? '<button type="button" class="x" data-kick="' + esc(p.uid) + '" aria-label="Retirer ' + esc(p.nom) + '">×</button>' : "") + "</span>";
  }).join("") + "</div>";
}
function lobbyBlock() {
  return '<div class="lobby"><div><div class="field-label" style="margin-top:0">Code de la partie</div><div class="code-big">' + esc(H.code) + "</div>" +
    '<p class="lead" style="margin:10px 0 4px">Les joueurs scannent le QR code, ou ouvrent :</p><div class="link">' + esc(joinURL()) + "</div></div>" +
    '<div class="qr-box">' + qrSVG(joinURL()) + "</div></div>";
}
function fichesLine() {
  var n = P.cats.reduce(function (t, c) { return t + (BY[c] ? BY[c].length : 0); }, 0);
  var base = P && P.grandes ? "Grandes questions : une par fiche, à réponse construite (" + n + " questions)."
    : Array.isArray(P.fiches) && P.fiches.length ? (Array.isArray(P.fils) && P.fils.length ? "Fil" + (P.fils.length > 1 ? "s" : "") + " rouge" + (P.fils.length > 1 ? "s" : "") + " : " + P.fils.map(esc).join(", ") + ". Fiches " : "Questions des fiches ") + P.fiches.join(", ") + " (" + n + " questions)."
    : P.cats.length + " catégorie" + (P.cats.length > 1 ? "s" : "") + " (" + n + " questions).";
  return '<p class="fiches-note">' + base + " " + (P.duree || 45) + " s pour répondre à chaque carte.</p>";
}
function qrSVG(url) { try { return window.QPK_QR.svg(url, 240); } catch (e) { return ""; } }
function renderLobby() {
  screen = "lobby";
  var n = Q.activeList(P).length;
  app.innerHTML = Q.demoBanner() +
    '<section class="panel" aria-labelledby="t">' + Q.brand("mode multijoueur") +
    '<h2 id="t">Salle d\'attente</h2>' + lobbyBlock() + fichesLine() +
    '<div class="field-label">Joueurs connectés (' + n + ")</div>" + playersChips(true) +
    '<p class="fiches-note">Les joueurs peuvent aussi arriver ou partir pendant la partie.</p>' +
    (flash ? '<p class="note warn" style="margin-top:12px">' + esc(flash) + "</p>" : "") +
    '<div class="setup-foot"><span class="row"><button class="ghost" type="button" id="btnScreen">Écran à projeter</button>' +
    (Q.DEMO ? '<button class="ghost" type="button" id="btnTest">Ouvrir un joueur de test</button>' : "") +
    '</span><button class="primary" type="button" id="btnGo"' + (n ? "" : " disabled") + ">Commencer la partie</button></div></section>";
  flash = "";
  bindCommon();
  byId("btnGo").onclick = function () { partyRef.update({ etat: "jeu" }).then(drawCard).catch(fail); };
}
function bindCommon() {
  var s = byId("btnScreen"); if (s) s.onclick = function () { window.open(screenURL(), "_blank"); };
  var t = byId("btnTest"); if (t) t.onclick = function () { window.open(joinURL(), "_blank"); };
  Array.prototype.forEach.call(app.querySelectorAll("[data-kick]"), function (b) {
    b.onclick = function () {
      var u = b.dataset.kick, upd = {};
      upd["joueurs/" + u] = null; upd["bonnes/" + u] = null; upd["essais/" + u] = null;
      partyRef.update(upd).catch(fail);
    };
  });
}

/* ---------- tirage ---------- */
/* Les catégories les moins maîtrisées par les joueurs présents sortent plus souvent. Jamais deux fois de suite la même, si on a le choix. */
function pickCat() {
  var cats = P.cats.filter(function (c) { return BY[c] && BY[c].length; });
  if (!cats.length) return null;
  var prev = P.carte && P.carte.cat;
  if (cats.length > 1) cats = cats.filter(function (c) { return c !== prev; });
  var act = Q.activeList(P);
  var w = cats.map(function (c) { return 1 + act.reduce(function (t, p) { return t + (3 - Q.level(P, p.uid, c)); }, 0); });
  var tot = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot;
  for (var i = 0; i < cats.length; i++) { r -= w[i]; if (r < 0) return cats[i]; }
  return cats[cats.length - 1];
}
function drawCard() {
  if (busy || !P) return;
  var cat = pickCat();
  if (!cat) return;
  var pool = BY[cat].filter(function (i) { return H.used.indexOf(i) < 0; });
  if (!pool.length) { H.used = H.used.filter(function (i) { return QS[i].c !== cat; }); pool = BY[cat].slice(); }
  var qi = pool[Math.floor(Math.random() * pool.length)];
  H.used.push(qi); H.qi = qi; saveH();
  var n = (P.tirees || 0) + 1, dur = P.duree || 45, upd = {};
  upd.carte = { id: "k" + n + Date.now().toString(36).slice(-4), n: n, cat: cat, q: QS[qi].q, etat: "ouverte", duree: dur, fin: Q.now() + dur * 1000 };
  if (QS[qi].g) upd.carte.g = true;
  upd.tirees = n;
  upd.affichage = null;
  if (P.carte) { upd["reponses/" + P.carte.id] = null; upd["verdicts/" + P.carte.id] = null; }
  busy = true; showAnswer = true;
  partyRef.update(upd).catch(fail).then(function () { busy = false; });
}
function currentQ() {
  var c = P.carte;
  if (!c) return null;
  if (H.qi !== null && H.qi !== undefined && QS[H.qi] && QS[H.qi].q === c.q) return QS[H.qi];
  for (var i = 0; i < QS.length; i++) if (QS[i].q === c.q) { H.qi = i; saveH(); return QS[i]; }
  return { c: c.cat, q: c.q, a: c.a || "(réponse introuvable dans la banque de questions)", s: c.s || "", u: c.u || "" };
}
function closeCard() {
  if (!P || !P.carte || P.carte.etat !== "ouverte" || closing) return;
  closing = true;
  partyRef.update({ "carte/etat": "fermee" }).catch(fail).then(function () { closing = false; });
}
function addTime(s) {
  if (!P || !P.carte || P.carte.etat !== "ouverte") return;
  var c = P.carte, left = Q.timeLeft(c);
  var upd = { "carte/fin": Q.now() + left + s * 1000, "carte/duree": Math.round((left / 1000) + s) > (c.duree || 45) ? Math.round(left / 1000 + s) : c.duree };
  partyRef.update(upd).catch(fail);
}
/* Chrono du maître du jeu : c'est lui qui ferme la carte à la fin du temps. */
setInterval(function () {
  if (!P || P.etat !== "jeu" || !P.carte) return;
  var up = Q.paintTimer(P.carte);
  if (P.carte.etat === "ouverte" && up) closeCard();
}, 200);

/* ---------- jeu ---------- */
function answers() {
  var c = P.carte;
  return c && P.reponses && P.reponses[c.id] ? P.reponses[c.id] : {};
}
function verdictOf(uid) {
  var c = P.carte, r = answers()[uid], V = c && P.verdicts && P.verdicts[c.id] ? P.verdicts[c.id] : {};
  return r && V[uid] && V[uid].v === r.v ? V[uid].ok : null;
}
function answerRows() {
  var c = P.carte, R = answers(), revealed = c.etat === "revelee", open = c.etat === "ouverte";
  var list = Q.playerList(P).filter(function (p) { return !p.parti || R[p.uid]; });
  if (!list.length) return '<p class="note">Aucun joueur dans la partie.</p>';
  return '<ul class="answers">' + list.map(function (p) {
    var r = R[p.uid], v = verdictOf(p.uid), okRev = revealed && c.ok && c.ok[p.uid];
    var state = revealed ? (r ? (okRev ? "ok" : "ko") : "none") : (v === true ? "ok" : v === false ? "ko" : r ? "todo" : "none");
    var txt = r ? esc(r.txt) : '<em>' + (open ? "en train de répondre…" : "pas de réponse") + "</em>";
    var btns = r && !revealed ? '<span class="judge"><button type="button" class="j-ok" data-ok="' + esc(p.uid) + '" aria-pressed="' + (v === true) + '" aria-label="Valider la réponse de ' + esc(p.nom) + '">✓</button>' +
      '<button type="button" class="j-ko" data-ko="' + esc(p.uid) + '" aria-pressed="' + (v === false) + '" aria-label="Refuser la réponse de ' + esc(p.nom) + '">✗</button></span>'
      : revealed && r ? '<span class="res ' + state + '">' + (okRev ? "✓ juste" : "✗") + "</span>" : "";
    return '<li class="ans ' + state + (p.enLigne ? "" : " off") + '"><span class="an">' + esc(p.nom) + (r && r.v > 1 && open ? ' <small>modifiée</small>' : "") + '</span><span class="at">' + txt + "</span>" + btns + "</li>";
  }).join("") + "</ul>";
}
function renderGame() {
  screen = "game";
  var c = P.carte, q = currentQ(), revealed = c && c.etat === "revelee", open = c && c.etat === "ouverte", closed = c && c.etat === "fermee";
  var act = Q.activeList(P), R = c ? answers() : {};
  var nRep = act.filter(function (p) { return R[p.uid]; }).length;
  var todo = c ? act.filter(function (p) { return R[p.uid] && verdictOf(p.uid) === null; }).length : 0;
  var newCard = c && c.id !== lastCard, flipNow = c && revealed && lastEtat !== "revelee" && lastEtat !== null && !newCard;
  var src = q && q.s ? (q.u ? '<a href="' + esc(q.u) + '" target="_blank" rel="noopener">' + esc(q.s) + "</a>" : esc(q.s)) : "";

  app.innerHTML = Q.demoBanner() +
    '<div class="infobar"><span>Partie <span class="code">' + esc(H.code) + "</span>" + (c ? " · carte " + c.n : "") + " · " + act.length + " joueur" + (act.length > 1 ? "s" : "") + "</span>" +
    '<span class="acts"><button class="mini" type="button" id="btnBoard" aria-pressed="' + !!P.affichage + '">' + (P.affichage ? "Masquer les badges" : "Afficher les badges") + "</button>" +
    '<button class="mini" type="button" id="btnInvite">Inviter (QR code)</button><button class="mini" type="button" id="btnScreen">Écran à projeter</button>' +
    (Q.DEMO ? '<button class="mini" type="button" id="btnTest">Joueur de test</button>' : "") +
    '<button class="mini danger" type="button" id="btnEnd">Terminer la partie</button></span></div>' +
    (flash ? '<p class="demo-note err-note">' + esc(flash) + "</p>" : "") +
    '<div class="mj-grid"><div class="mj-col">' +
    '<div class="card-slot fluid" id="slot">' + (c ?
      '<div class="card' + ((revealed && !flipNow) ? " flipped" : "") + (newCard ? " enter" : "") + '" id="card">' +
      '<div class="face front"><img src="carte.jpg" alt="">' + Q.cardFace(c.q, c.cat, c.g ? "Grande question" : "Question") + "</div>" +
      '<div class="face back"><img src="carte.jpg" alt="">' + Q.cardFace(q ? q.a : "", c.cat, "Réponse") + "</div></div>"
      : '<div class="card-empty">Tirez la première carte.</div>') + "</div>" +
    (c ? Q.timerHTML() : "") +
    (c ? '<div class="answer-box"><h3>' + (revealed ? "Réponse affichée chez les joueurs" : "Réponse attendue · visible par vous seul") + "</h3>" +
      '<div class="a' + (showAnswer || revealed ? "" : " hidden") + '">' + esc(q ? q.a : "") + "</div>" +
      (src ? '<div class="src">Source : ' + src + "</div>" : "") +
      (revealed ? "" : '<div class="tools"><button class="mini" type="button" id="btnHide">' + (showAnswer ? "Masquer la réponse" : "Afficher la réponse") + "</button></div>") + "</div>" : "") +
    '<div class="mj-controls">' + (!c ? '<button class="primary" type="button" id="btnDraw">Tirer une carte</button>'
      : revealed ? '<button class="primary" type="button" id="btnDraw">Carte suivante</button>'
      : closed ? '<button class="primary" type="button" id="btnReveal">Révéler la réponse</button><button class="ghost" type="button" id="btnSkip">Passer sans révéler</button>'
      : '<button class="ghost" type="button" id="btnMore">+15 s</button><button class="ghost" type="button" id="btnClose">Clore maintenant</button><button class="ghost" type="button" id="btnSkip">Passer cette carte</button>') + "</div>" +
    (closed && todo ? '<p class="mj-hint">' + todo + " réponse" + (todo > 1 ? "s" : "") + " pas encore corrigée" + (todo > 1 ? "s" : "") + ". Elle" + (todo > 1 ? "s" : "") + " compteront fausse" + (todo > 1 ? "s" : "") + " si vous révélez maintenant.</p>" : "") +
    "</div>" +
    '<div class="mj-col"><div class="pile-head"><h3>Réponses des joueurs</h3><span class="n">' + (c ? nRep + " / " + act.length + " ont répondu" : "") + "</span></div>" +
    (c ? (open ? '<p class="mj-hint light">Vous pouvez corriger pendant le temps de réponse. Si un joueur modifie sa réponse, elle repasse à corriger.</p>' : "") + answerRows()
      : '<div class="pile"><div class="pile-empty">Les réponses des joueurs arriveront ici.</div></div>') +
    "</div></div>";
  flash = "";

  Q.fitCards(app);
  if (c) Q.paintTimer(c);
  if (flipNow) { var card = byId("card"); requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.add("flipped"); }); }); }
  if (revealed && !celebrated[c.id]) {
    celebrated[c.id] = true;
    if (flipNow) celebrate(c);
  }
  lastCard = c ? c.id : null; lastEtat = c ? c.etat : null;

  bindCommon();
  byId("btnInvite").onclick = showInvite;
  byId("btnBoard").onclick = function () { partyRef.update({ affichage: P.affichage ? null : { mode: "tous" } }).catch(fail); };
  Q.armButton(byId("btnEnd"), "Confirmer : terminer ?", function () { partyRef.update({ etat: "fin", affichage: null }).catch(fail); });
  var d = byId("btnDraw"); if (d) d.onclick = drawCard;
  var sk = byId("btnSkip"); if (sk) sk.onclick = drawCard;
  var h = byId("btnHide"); if (h) h.onclick = function () { showAnswer = !showAnswer; renderGame(); };
  var rv = byId("btnReveal"); if (rv) rv.onclick = reveal;
  var mo = byId("btnMore"); if (mo) mo.onclick = function () { addTime(15); };
  var cl = byId("btnClose"); if (cl) cl.onclick = closeCard;
  Array.prototype.forEach.call(app.querySelectorAll("[data-ok]"), function (b) { b.onclick = function () { judge(b.dataset.ok, true); }; });
  Array.prototype.forEach.call(app.querySelectorAll("[data-ko]"), function (b) { b.onclick = function () { judge(b.dataset.ko, false); }; });
  Q.syncBoard(P, true, function (v) {
    partyRef.update({ affichage: v === "close" ? null : v === "tous" ? { mode: "tous" } : { mode: "joueur", uid: v } }).catch(fail);
  });
}
function celebrate(c) {
  var names = Q.playerList(P).filter(function (p) { return c.ok && c.ok[p.uid]; }).map(function (p) { return p.nom; });
  var big = !names.length ? "Personne" : names.length === 1 ? names[0] : names.length + " bonnes réponses";
  Q.showBanner(names.length ? "Bravo" : "Pas de bonne réponse", big, names.length > 1 && names.length <= 4 ? names.join(", ") : c.cat, Q.COLOR[c.cat], 1500, names.length ? undefined : false);
}
function judge(u, ok) {
  var c = P.carte, r = answers()[u];
  if (!c || !r || c.etat === "revelee") return;
  var cur = verdictOf(u);
  db.ref(path("verdicts/" + c.id + "/" + u)).set(cur === ok ? null : { v: r.v, ok: ok }).catch(fail);
}
function reveal() {
  if (busy || !P.carte) return;
  var c = P.carte, q = currentQ(), R = answers(), k = Q.KEY[c.cat], upd = {}, ok = {}, nOk = 0, nRep = 0;
  upd["carte/etat"] = "revelee"; upd["carte/a"] = q.a; upd["carte/s"] = q.s || ""; upd["carte/u"] = q.u || "";
  Object.keys(R).forEach(function (u) {
    if (!P.joueurs || !P.joueurs[u]) return;
    nRep++;
    var e = (P.essais && P.essais[u] && P.essais[u][k]) || 0;
    upd["essais/" + u + "/" + k] = e + 1;
    if (verdictOf(u) === true) {
      ok[u] = true; nOk++;
      upd["bonnes/" + u + "/" + k] = Q.bonnes(P, u, c.cat) + 1;
    }
  });
  upd["carte/ok"] = nOk ? ok : null;
  upd["carte/nbOk"] = nOk;
  var s = (P.stats && P.stats[k]) || { q: 0, r: 0, ok: 0 };
  upd["stats/" + k] = { q: s.q + 1, r: s.r + nRep, ok: s.ok + nOk };
  upd["hist/n" + c.n] = { q: c.q, cat: c.cat, r: nRep, ok: nOk };
  busy = true;
  partyRef.update(upd).then(function () { busy = false; }).catch(function (e) { busy = false; fail(e); });
}

function showInvite() {
  var el = document.createElement("div");
  el.className = "modal";
  el.innerHTML = '<div class="panel">' + lobbyBlock() + '<div class="setup-foot"><span></span><button class="primary" type="button">Fermer</button></div></div>';
  el.onclick = function (e) { if (e.target === el || e.target.tagName === "BUTTON") el.parentNode.removeChild(el); };
  document.body.appendChild(el);
}

/* ---------- fin ---------- */
function renderEnd() {
  Q.syncBoard(P, false);
  if (screen === "end") return;
  screen = "end";
  app.innerHTML = '<section class="panel wide" aria-labelledby="t">' + Q.brand("mode multijoueur") +
    '<h2 id="t">Classement final</h2><p class="lead">Partie ' + esc(H.code) + " · " + (P.tirees || 0) + " cartes tirées.</p>" + Q.rankingHTML(P) + Q.bilanHTML(P) +
    '<div class="setup-foot"><button class="mini danger" type="button" id="btnWipe">Fermer la partie</button><span class="row"><button class="ghost" type="button" id="btnBack">Reprendre la partie</button><button class="primary" type="button" id="btnAgain">Rejouer avec les mêmes joueurs</button></span></div>' +
    '<p class="note" style="margin-top:14px">« Reprendre » continue la partie, badges compris. « Rejouer » garde le même code et remet les badges à zéro. « Fermer la partie » l\'efface de la base.</p></section>';
  Q.confetti("#F07A24", 120);
  byId("btnBack").onclick = function () { partyRef.update({ etat: "jeu" }).catch(fail); };
  byId("btnAgain").onclick = function () {
    H.used = []; H.qi = null; saveH(); lastCard = null; celebrated = {};
    partyRef.update({ etat: "jeu", bonnes: null, essais: null, stats: null, hist: null, carte: null, reponses: null, verdicts: null, affichage: null, tirees: 0 }).then(drawCard).catch(fail);
  };
  Q.armButton(byId("btnWipe"), "Confirmer ?", function () { partyRef.remove().catch(fail); });
}
})();
