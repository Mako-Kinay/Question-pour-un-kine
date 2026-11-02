/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.7.0
   Reproduction, diffusion ou modification interdites sans accord écrit de l'auteur. Voir LICENCE.txt. */
/* Page joueur : rejoindre une partie, voir la question, répondre avant la fin du chrono, voir ses badges.
   Avec ?ecran=1, la même page sert d'écran à projeter (question, chrono, réponse révélée,
   tableau des badges quand le maître du jeu l'affiche). */
(function () {
"use strict";
var Q = window.QPK, esc = Q.esc, byId = Q.byId;
var app = byId("app");
var ECRAN = Q.param("ecran") === "1";
var K_ME = "qpk-joueur";
var db = null, uid = null, P = null, code = null, partyRef = null, joined = false;
var screenKey = null, lastFb = null, celebrated = {}, sending = false, draftByCard = {}, seenEtat = {};

Q.autoFit();
var saved = Q.lsGet(K_ME, sessionStorage) || {};
code = Q.cleanCode(Q.param("p")) || saved.code || "";
app.innerHTML = '<section class="panel">' + Q.brand() + '<p class="lead">Connexion…</p></section>';
Q.connect(ECRAN ? "ecran" : "joueur").then(function (c) {
  db = c.db; uid = c.uid;
  if (ECRAN) { if (code) subscribe(); else renderJoin(""); }
  else if (code && saved.code === code && saved.nom) join(code, saved.nom, true);
  else renderJoin("");
}).catch(function (e) {
  app.innerHTML = '<section class="panel">' + Q.brand() + '<h2>Connexion impossible</h2><p class="note warn">' + esc(e.message) + "</p></section>";
});

/* ---------- rejoindre ---------- */
function renderJoin(msg) {
  screenKey = "join";
  app.innerHTML = Q.demoBanner() +
    '<section class="panel" aria-labelledby="t">' + Q.brand() +
    '<h2 id="t">' + (ECRAN ? "Écran à projeter" : "Rejoindre la partie") + "</h2>" +
    '<form id="fJoin" autocomplete="off">' +
    '<div class="field-label">Code de la partie</div><input class="big-input code-input" id="inCode" maxlength="6" inputmode="text" autocapitalize="characters" value="' + esc(code) + '" aria-label="Code de la partie">' +
    (ECRAN ? "" : '<div class="field-label">Ton prénom ou pseudo</div><input class="big-input" id="inNom" maxlength="18" value="' + esc(saved.nom || "") + '" aria-label="Prénom ou pseudo">') +
    (msg ? '<p class="note warn" style="margin-top:12px">' + esc(msg) + "</p>" : "") +
    '<div class="setup-foot"><span></span><button class="primary" type="submit">' + (ECRAN ? "Afficher" : "Entrer dans la partie") + "</button></div></form></section>";
  var inNom = byId("inNom");
  (code && inNom ? inNom : byId("inCode")).focus();
  byId("fJoin").onsubmit = function (e) {
    e.preventDefault();
    var c = Q.cleanCode(byId("inCode").value);
    if (c.length < 4) { renderJoin("Le code fait 5 caractères. Il est affiché chez le maître du jeu."); return; }
    if (ECRAN) { code = c; subscribe(); return; }
    var nom = inNom.value.trim().replace(/\s+/g, " ").slice(0, 18);
    if (!nom) { code = c; renderJoin("Indique ton prénom ou un pseudo."); return; }
    join(c, nom, false);
  };
}
function join(c, nom, silent) {
  code = c;
  db.ref("parties/" + c).once("value").then(function (s) {
    var v = s.val();
    if (!v) { Q.lsSet(K_ME, null, sessionStorage); saved = {}; renderJoin(silent ? "" : "Aucune partie avec le code « " + c + " ». Vérifie le code auprès du maître du jeu."); return; }
    var me = v.joueurs && v.joueurs[uid];
    // Un nouveau joueur ne peut pas entrer si les inscriptions sont fermées, ou si la partie a plus de 24 h.
    if (!me && v.ferme) { renderJoin("Les inscriptions sont fermées. Demande au maître du jeu."); return; }
    if (!me && typeof v.cree === "number" && Q.now() - v.cree > 24 * 3600 * 1000) { renderJoin("Cette partie a plus de 24 h. Demande un nouveau code au maître du jeu."); return; }
    var jref = db.ref("parties/" + c + "/joueurs/" + uid);
    return jref.update({ nom: nom, enLigne: true, parti: null, t: me && me.t ? me.t : Q.NOW }).then(function () {
      saved = { code: c, nom: nom }; Q.lsSet(K_ME, saved, sessionStorage);
      joined = true;
      presence();
      subscribe();
    });
  }).catch(function (e) {
    var perm = /permission/i.test(String(e && (e.code || e.message)));
    renderJoin(perm ? "Impossible d'entrer : les inscriptions sont peut-être fermées. Demande au maître du jeu." : Q.permError(e));
  });
}
/* Présence : « hors ligne » quand le téléphone se déconnecte, « en ligne » à la reconnexion. */
function presence() {
  var en = db.ref("parties/" + code + "/joueurs/" + uid + "/enLigne");
  db.ref(".info/connected").on("value", function (s) {
    if (s.val() !== true || !joined) return;
    en.onDisconnect().set(false);
    if (P && P.joueurs && P.joueurs[uid] && !P.joueurs[uid].parti) en.set(true).catch(function () {});
  });
}
function subscribe() {
  if (partyRef) partyRef.off("value");
  partyRef = db.ref("parties/" + code);
  partyRef.on("value", function (s) { P = s.val(); render(); }, function (e) { renderJoin(Q.permError(e)); });
}
function quit() {
  watchCard(null);
  joined = false; Q.lsSet(K_ME, null, sessionStorage); saved = {};
  var upd = P && P.etat === "lobby" ? null : { parti: true, enLigne: false };
  var ref = db.ref("parties/" + code + "/joueurs/" + uid);
  (upd ? ref.update(upd) : ref.remove()).catch(function () {});
  if (partyRef) partyRef.off("value");
  partyRef = null; P = null;
  renderJoin("");
}

/* ---------- affichage ---------- */
function keyOf() {
  if (!P) return "gone";
  if (!ECRAN && joined && !(P.joueurs && P.joueurs[uid])) return "kicked";
  if (P.etat === "lobby") return "lobby";
  if (P.etat === "fin") return "fin";
  if (!P.carte) return "nocard";
  return "card-" + P.carte.id;
}
function render() {
  var k = keyOf();
  if (!ECRAN && joined) watchCard(P && P.etat === "jeu" && P.carte ? P.carte.id : null);
  if (k !== screenKey) {
    screenKey = k; lastFb = null;
    if (k === "gone") return renderGone();
    if (k === "kicked") { joined = false; Q.lsSet(K_ME, null, sessionStorage); return renderJoin("Le maître du jeu t'a retiré de la partie. Tu peux la rejoindre à nouveau."); }
    if (k === "lobby") renderWait(true);
    else if (k === "nocard") renderWait(false);
    else if (k === "fin") { Q.syncBoard(P, false); return renderEnd(); }
    else renderCard();
  }
  update();
}
function renderGone() {
  watchCard(null);
  if (partyRef) partyRef.off("value");
  Q.syncBoard(null, false);
  Q.lsSet(K_ME, null, sessionStorage);
  app.innerHTML = '<section class="panel">' + Q.brand() + "<h2>Partie terminée</h2><p class=\"lead\">Cette partie n'existe plus. Merci d'avoir joué !</p>" +
    '<div class="setup-foot"><span></span><button class="ghost" type="button" id="btnNew">Rejoindre une autre partie</button></div></section>';
  byId("btnNew").onclick = function () { code = ""; saved = {}; renderJoin(""); };
}
function header() {
  var me = !ECRAN && P.joueurs && P.joueurs[uid];
  return '<div class="infobar"><span>Partie <span class="code">' + esc(code) + "</span>" + (P.carte ? " · carte " + P.carte.n : "") + "</span><span class=\"acts\">" +
    (me ? "<span>Tu joues : <strong>" + esc(me.nom) + "</strong></span>" + (P.etat === "jeu" ? '<button class="mini" type="button" id="btnMine">Mes badges <b id="myLv"></b></button>' : "") : ECRAN ? "Écran projeté" : "") +
    "</span></div>";
}
function bindHeader() {
  var b = byId("btnMine");
  if (b) b.onclick = showMine;
}
function renderWait(lobby) {
  var url = Q.siteURL("joueur.html?p=" + code + (Q.param("demo") === "1" ? "&demo=1" : ""));
  app.innerHTML = Q.demoBanner() + header() +
    '<section class="panel waiting">' + (ECRAN && lobby
      ? '<h2>Rejoignez la partie</h2><div class="lobby" style="text-align:left"><div><div class="field-label" style="margin-top:0">Code</div><div class="code-big">' + esc(code) + '</div><p class="lead" style="margin:10px 0 4px">Scannez le QR code ou ouvrez :</p><div class="link">' + esc(url) + '</div></div><div class="qr-box">' + qr(url) + "</div></div>"
      : "<h2>" + (lobby ? "Tu es dans la partie" : "Carte suivante") + '</h2><p class="lead">' + (lobby ? "Le maître du jeu va lancer la partie" : "Le maître du jeu tire une carte") + '<span class="dots"></span></p>') +
    '<div class="field-label">Joueurs</div><div class="chips" id="chips"></div>' +
    (!ECRAN ? '<div class="setup-foot"><button class="mini danger" type="button" id="btnQuit">Quitter la partie</button><span></span></div>' : "") + "</section>";
  bindHeader();
  var b = byId("btnQuit");
  if (b) Q.armButton(b, "Confirmer ?", quit);
}
function qr(url) { try { return window.QPK_QR.svg(url, 260); } catch (e) { return ""; } }

function renderCard() {
  var c = P.carte;
  app.innerHTML = Q.demoBanner() + header() +
    '<div class="play' + (ECRAN ? " ecran-play" : "") + '">' +
    '<div class="card-slot" id="slot"><div class="card enter" id="card">' +
    '<div class="face front"><img src="carte.jpg" alt="">' + Q.cardFace(c.q, c.cat, c.g ? "Grande question" : "Question") + "</div>" +
    '<div class="face back" id="back"><img src="carte.jpg" alt=""></div></div></div>' +
    Q.timerHTML() +
    '<div class="source" id="source"></div>' +
    (ECRAN ? "" : '<form class="answer-form" id="fAns" autocomplete="off"><label class="field-label" for="ans" style="margin:0">Ta réponse</label>' +
      '<textarea id="ans" maxlength="500" placeholder="Tape ta réponse ici"></textarea>' +
      '<div class="feedback" id="fb" hidden></div>' +
      '<div class="foot"><span class="summary" id="hint"></span><button class="primary" type="submit" id="btnSend">Envoyer</button></div></form>' +
      '<div class="quit-row"><button class="mini danger" type="button" id="btnQuit">Quitter la partie</button></div>') +
    "</div>" +
    (ECRAN ? '<section class="status" id="status"></section>' : "");
  Q.fitCards(app);
  bindHeader();
  seenEtat[c.id] = null;
  var ta = byId("ans");
  if (ta) {
    ta.value = draftByCard[c.id] || "";
    ta.oninput = function () { draftByCard[c.id] = ta.value; updateForm(); };
    byId("fAns").onsubmit = function (e) { e.preventDefault(); send(); };
    ta.onkeydown = function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } };
  }
  var b = byId("btnQuit");
  if (b) Q.armButton(b, "Confirmer : quitter ?", quit);
  Q.paintTimer(c);
}

/* Ma réponse et la correction du maître du jeu pour la carte en cours.
   Elles sont rangées hors de la partie : un joueur ne peut lire que les siennes. */
var MYR = null, MYV = null, myRefs = [], watchedCard = null;
function watchCard(cid) {
  if (ECRAN || watchedCard === cid) return;
  myRefs.forEach(function (r) { r.off("value"); });
  myRefs = []; MYR = null; MYV = null; watchedCard = cid;
  if (!cid) return;
  var r1 = db.ref("reponses/" + code + "/" + cid + "/" + uid), r2 = db.ref("retours/" + code + "/" + cid + "/" + uid);
  r1.on("value", function (s) { MYR = s.val(); if (P) update(); }, function () {});
  r2.on("value", function (s) { MYV = s.val(); if (P) update(); }, function () {});
  myRefs = [r1, r2];
}
function mine() { return MYR || null; }
/* « Mais encore ? » : le maître du jeu demande plus de précision sur la version envoyée. */
function askedMore() {
  var r = mine(), V = MYV;
  return !!(r && V && V.v === r.v && V.more);
}
/* « Non » du maître du jeu sur la version envoyée. */
function refused() {
  var r = mine(), V = MYV;
  return !!(r && V && V.v === r.v && V.ok === false && !V.more);
}
function myPlus() { var c = P.carte; return c && c.plus && c.plus[uid] ? c.plus[uid] : 0; }
/* Peut-on encore envoyer ? Chrono de la carte, ou délai personnel accordé par « Mais encore ? ». */
function canAnswer() {
  var c = P.carte;
  if (!c || c.etat === "revelee") return false;
  if (c.etat === "ouverte" && Q.timeLeft(c) > 0) return true;
  return myPlus() > Q.now();
}
/* Chrono affiché chez le joueur : son délai personnel s'il en a un plus long. */
function myClock() {
  var c = P.carte, pl = myPlus();
  if (!ECRAN && pl && c.etat !== "revelee" && pl > (c.etat === "ouverte" ? c.fin : 0)) return { etat: "ouverte", fin: pl, duree: Math.max(30, Math.round((pl - (c.fin || pl)) / 1000)) };
  return c;
}
function update() {
  if (!P) return;
  var chips = byId("chips");
  if (chips) chips.innerHTML = Q.activeList(P).map(function (p) { return '<span class="' + (p.enLigne ? "" : "off") + '">' + esc(p.nom) + (p.uid === uid ? " (toi)" : "") + "</span>"; }).join("");
  var lv = byId("myLv");
  if (lv) lv.textContent = Q.totalLevels(P, uid) + "/" + (P.cats || []).length * 3;
  if (ECRAN) Q.syncBoard(P, false);
  if (!P.carte || screenKey.indexOf("card-") !== 0) return;
  var c = P.carte;
  var st = byId("status");
  if (st) {
    var R = (P.envoyes && P.envoyes[c.id]) || {}, act = Q.activeList(P);
    st.innerHTML = '<div class="st-row">' + act.map(function (p) {
      var cls = c.etat === "revelee" ? (c.ok && c.ok[p.uid] ? "ok" : R[p.uid] ? "ko" : "") : R[p.uid] ? "sent" : "";
      return '<span class="st-chip ' + cls + (p.enLigne ? "" : " off") + '">' + esc(p.nom) + (cls === "ok" ? " ✓" : cls === "sent" ? " ·" : "") + "</span>";
    }).join("") + "</div>";
  }
  Q.paintTimer(myClock());
  if (c.etat === "revelee") showAnswer();
  updateForm();
}
/* Le chrono tourne aussi entre deux messages de la base. */
setInterval(function () {
  if (!P || !P.carte || !screenKey || screenKey.indexOf("card-") !== 0) return;
  Q.paintTimer(myClock());
  var st = canAnswer() ? "open" : "up";
  if (seenEtat[P.carte.id] !== st) { seenEtat[P.carte.id] = st; updateForm(); }
}, 250);

function showAnswer() {
  var c = P.carte, card = byId("card"), back = byId("back");
  if (!card || card.classList.contains("flipped")) return;
  back.innerHTML = '<img src="carte.jpg" alt="">' + Q.cardFace(c.a || "", c.cat, "Réponse");
  Q.fitCards(app);
  card.classList.remove("enter");
  requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.add("flipped"); }); });
  var cu = Q.lienSur(c.u);
  if (c.s) byId("source").innerHTML = "Source : " + (cu ? '<a href="' + esc(cu) + '" target="_blank" rel="noopener noreferrer">' + esc(c.s) + "</a>" : esc(c.s));
  if (celebrated[c.id]) return;
  celebrated[c.id] = true;
  setTimeout(function () {
    if (ECRAN) {
      var names = Q.playerList(P).filter(function (p) { return c.ok && c.ok[p.uid]; }).map(function (p) { return p.nom; });
      var big = !names.length ? "Personne" : names.length === 1 ? names[0] : names.length + " bonnes réponses";
      Q.showBanner(names.length ? "Bravo" : "Pas de bonne réponse", big, names.length > 1 && names.length <= 4 ? names.join(", ") : c.cat, Q.COLOR[c.cat], 1500, names.length ? undefined : false);
    } else if (c.ok && c.ok[uid]) {
      var n = Q.bonnes(P, uid, c.cat);
      if (n <= 3) Q.showLevelUp(c.cat, n, n === 3 ? "Badge au maximum. Bravo !" : "Encore " + (3 - n) + " bonne" + (3 - n > 1 ? "s" : "") + " réponse" + (3 - n > 1 ? "s" : "") + " pour l'" + (n === 1 ? "argent" : "or") + ".");
      else Q.showLevelUp(c.cat, 3, "Ton badge est déjà en or. Continue !");
    }
  }, 600);
}
function updateForm() {
  var ta = byId("ans"), btn = byId("btnSend"), fb = byId("fb"), hint = byId("hint");
  if (!ta) return;
  var c = P.carte, r = mine(), revealed = c.etat === "revelee";
  var closed = !revealed && !canAnswer(), more = !revealed && askedMore();
  var text = ta.value.trim(), sentTxt = r ? String(r.txt).trim() : null;
  var fbClass = "", fbText = "", label = "Envoyer", enabled = !!text, hintText = "";
  if (revealed) {
    enabled = false;
    if (c.ok && c.ok[uid]) {
      var n = Q.bonnes(P, uid, c.cat);
      fbClass = "ok"; fbText = "Bonne réponse ! " + (n <= 3 ? "Ton badge « " + Q.nick(c.cat) + " » passe " + Q.NIV[n].toLowerCase() + "." : "Ton badge est déjà en or.");
    } else if (r) { fbClass = "ko"; fbText = "Pas cette fois. Regarde la réponse sur la carte."; }
    else { fbClass = "info"; fbText = "Tu n'as pas répondu à temps. La réponse est sur la carte."; }
  } else if (closed) {
    enabled = false;
    fbClass = "wait"; fbText = r ? "Temps écoulé ! Le maître du jeu corrige les réponses." : "Temps écoulé. Tu n'as pas envoyé de réponse cette fois.";
  } else if (more) {
    fbClass = "more"; fbText = "Mais encore ? Le maître du jeu te demande d'être plus précis. Complète ta réponse et renvoie-la.";
    if (text && text !== sentTxt) { label = "Renvoyer"; enabled = true; }
    else { label = "Renvoyer"; enabled = false; hintText = "Complète ta réponse pour la renvoyer."; }
  } else if (refused()) {
    fbClass = "ko"; fbText = "✗ Non. Le maître du jeu a refusé ta réponse. Tu peux la corriger et la renvoyer avant la fin du temps.";
    label = "Renvoyer"; enabled = !!text && text !== sentTxt;
    if (!text || text === sentTxt) hintText = "Modifie ta réponse pour la renvoyer.";
  } else if (r) {
    fbClass = "wait"; fbText = myPlus() ? "Réponse complétée ✓. Le maître du jeu la relit." : "Réponse envoyée ✓. Tu peux la modifier jusqu'à la fin du temps.";
    if (text && text !== sentTxt) { label = "Modifier"; enabled = true; }
    else { label = "Envoyée ✓"; enabled = false; }
  }
  ta.disabled = revealed || closed;
  btn.textContent = label;
  btn.disabled = !enabled || sending;
  hint.textContent = hintText;
  var fbKey = fbClass + "|" + fbText;
  if (fbKey !== lastFb) {
    lastFb = fbKey;
    fb.hidden = !fbText;
    fb.className = "feedback " + fbClass;
    fb.textContent = fbText;
    if ((fbClass === "more" || (fbClass === "ko" && !revealed)) && navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) {} }
  }
}
function send() {
  var ta = byId("ans"), c = P && P.carte;
  if (!ta || !c || sending || !canAnswer()) return;
  var txt = ta.value.trim().slice(0, 500), r = mine();
  if (!txt || (r && String(r.txt).trim() === txt)) return;
  sending = true; updateForm();
  var all = {};
  all["reponses/" + code + "/" + c.id + "/" + uid] = { txt: txt, ts: Q.NOW, v: Math.min(1000, (r ? r.v : 0) + 1) };
  all["parties/" + code + "/envoyes/" + c.id + "/" + uid] = true;
  db.ref().update(all)
    .then(function () { sending = false; updateForm(); })
    .catch(function (e) {
      sending = false; updateForm();
      var fb = byId("fb");
      if (fb) { fb.hidden = false; fb.className = "feedback ko"; fb.textContent = /permission/i.test(String(e && (e.code || e.message))) ? "Trop tard : le temps est écoulé." : Q.permError(e); lastFb = null; }
    });
}
/* Mes badges : la collection du joueur, sur son téléphone seulement. */
function showMine() {
  var el = document.createElement("div");
  el.className = "modal";
  el.innerHTML = '<div class="panel">' + Q.boardHTML(P, { mode: "joueur", uid: uid }, false) + '<div class="setup-foot"><span></span><button class="primary" type="button">Fermer</button></div></div>';
  el.onclick = function (e) { if (e.target === el || e.target.tagName === "BUTTON") el.parentNode.removeChild(el); };
  document.body.appendChild(el);
}

function renderEnd() {
  var me = !ECRAN && P.joueurs && P.joueurs[uid];
  var pos = null;
  Q.ranks(P).forEach(function (x) { if (x.p.uid === uid) pos = x.pos; });
  app.innerHTML = '<section class="panel wide" aria-labelledby="t">' + Q.brand() +
    '<h2 id="t">Classement final</h2><p class="lead">' + (P.tirees || 0) + " cartes tirées." + (me && pos ? " Tu termines " + Q.ordinal(pos) + "." : "") + " Merci d'avoir joué !</p>" +
    (me ? Q.boardHTML(P, { mode: "joueur", uid: uid }, false) : "") +
    Q.rankingHTML(P, ECRAN ? null : uid) + (ECRAN ? Q.bilanHTML(P) : "") + "</section>";
  Q.confetti("#F07A24", 100);
}
if (ECRAN) document.body.classList.add("ecran");
})();
