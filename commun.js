/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.4.2
   Reproduction, diffusion ou modification interdites sans accord écrit de l'auteur. Voir LICENCE.txt. */
/* Question pour un kiné – multijoueur : outils communs au maître du jeu, aux joueurs et à l'écran projeté.
   - Connexion : Firebase (si config.js est rempli) ou mode démo (onglets d'un même navigateur).
   - Visuels : catégories, badges, cartes, bannières, confettis, chrono. */
window.QPK = (function () {
"use strict";
var VERSION = "Multijoueur v1.4.2";
var CATS = [
  { id: "Développement", color: "#1E9E54", text: "#FFFFFF" },
  { id: "Neurologie", color: "#2457D6", text: "#FFFFFF" },
  { id: "Analyse de la marche", color: "#8A3FC8", text: "#FFFFFF" },
  { id: "Orthopédie", color: "#E8740C", text: "#FFFFFF" },
  { id: "Traumatologie et sport", color: "#D6263B", text: "#FFFFFF" },
  { id: "Sport et renforcement musculaire", color: "#F2C200", text: "#1F2440" },
  { id: "Neuromusculaire", color: "#D83C93", text: "#FFFFFF" },
  { id: "Maladies chroniques et génétiques", color: "#8B5A2B", text: "#FFFFFF" },
  { id: "Respiratoire", color: "#0091A6", text: "#FFFFFF" },
  { id: "Douleur", color: "#7B1E3C", text: "#FFFFFF" },
  { id: "Méthodes et évaluation", color: "#4B5563", text: "#FFFFFF" },
];
var CAT_IDS = CATS.map(function (c) { return c.id; });
var COLOR = {}, TXT = {}, KEY = {};
// Clé courte et sûre pour la base (« c0 », « c1 »…) : les noms de catégories ont des espaces et des accents.
CATS.forEach(function (c, i) { COLOR[c.id] = c.color; TXT[c.id] = c.text; KEY[c.id] = "c" + i; });
var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
var NOW = { ".sv": "timestamp" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}
function byId(id) { return document.getElementById(id); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 150) : ms); }); }
function ordinal(n) { return n === 1 ? "1er" : n + "e"; }
function lsGet(k, store) { try { var r = (store || localStorage).getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function lsSet(k, v, store) {
  try { if (v === null) (store || localStorage).removeItem(k); else (store || localStorage).setItem(k, JSON.stringify(v)); } catch (e) {}
}
function param(name) {
  var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
}
function cleanCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }
function newCode() {
  var abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";   // sans I, O, 0, 1 : pas de confusion à l'oral
  for (var i = 0; i < 4; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

/* ====================== Connexion ====================== */
var CFG = window.QPK_FIREBASE || {};
var DEMO = param("demo") === "1" || !CFG.apiKey || !CFG.databaseURL;

/* --- Base de démonstration : même interface que Firebase, stockée dans le navigateur.
       Tous les onglets ouverts sur le même site, dans le même navigateur, partagent la partie. --- */
var LocalDB = (function () {
  var K = "qpk-demo-base", listeners = [], chan = null;
  try { chan = new BroadcastChannel("qpk-demo"); chan.onmessage = function () { notify(); }; } catch (e) {}
  function readAll() { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } }
  function parts(p) { return String(p).split("/").filter(Boolean); }
  function getAt(t, p) {
    var o = t;
    parts(p).forEach(function (k) { o = o && typeof o === "object" ? o[k] : undefined; });
    return o === undefined ? null : o;
  }
  function resolve(v) {
    if (v && typeof v === "object") {
      if (v[".sv"] === "timestamp") return Date.now();
      var o = Array.isArray(v) ? [] : {};
      Object.keys(v).forEach(function (k) { var r = resolve(v[k]); if (r !== null && r !== undefined) o[k] = r; });
      return Object.keys(o).length ? o : null;
    }
    return v === undefined ? null : v;
  }
  function setAt(t, p, v) {
    var ks = parts(p);
    if (!ks.length) return v || {};
    var chain = [t], o = t;
    for (var i = 0; i < ks.length - 1; i++) {
      if (!o[ks[i]] || typeof o[ks[i]] !== "object") o[ks[i]] = {};
      o = o[ks[i]]; chain.push(o);
    }
    var last = ks[ks.length - 1];
    if (v === null) delete o[last]; else o[last] = v;
    for (i = chain.length - 1; i > 0; i--) {   // comme Firebase : un nœud vide disparaît
      if (Object.keys(chain[i]).length === 0) delete chain[i - 1][ks[i - 1]]; else break;
    }
    return t;
  }
  function commit(t) {
    try { localStorage.setItem(K, JSON.stringify(t)); } catch (e) { return Promise.reject(e); }
    if (chan) chan.postMessage(1);
    notify();
    return Promise.resolve();
  }
  function snap(v) { var s = JSON.stringify(v); return { val: function () { return s === undefined ? null : JSON.parse(s); }, exists: function () { return v !== null; } }; }
  function notify() {
    var t = readAll();
    listeners.slice().forEach(function (l) {
      var v = l.path === ".info/connected" ? true : getAt(t, l.path), s = JSON.stringify(v);
      if (s !== l.last) { l.last = s; l.cb(snap(v)); }
    });
  }
  window.addEventListener("storage", function (e) { if (e.key === K) notify(); });
  var leaving = [];
  window.addEventListener("pagehide", function () { leaving.forEach(function (f) { f(); }); });
  function ref(path) {
    path = parts(path).join("/");
    return {
      on: function (ev, cb) {
        var l = { path: path, cb: cb, last: undefined };
        listeners.push(l);
        setTimeout(function () { if (listeners.indexOf(l) < 0) return; var v = path === ".info/connected" ? true : getAt(readAll(), path); l.last = JSON.stringify(v); cb(snap(v)); }, 0);
        return cb;
      },
      off: function (ev, cb) { listeners = listeners.filter(function (l) { return !(l.path === path && (!cb || l.cb === cb)); }); },
      once: function () { return Promise.resolve(snap(getAt(readAll(), path))); },
      set: function (v) { return commit(setAt(readAll(), path, resolve(v))); },
      update: function (obj) {
        var t = readAll();
        Object.keys(obj).forEach(function (k) { t = setAt(t, path + "/" + k, resolve(obj[k])); });
        return commit(t);
      },
      remove: function () { return commit(setAt(readAll(), path, null)); },
      onDisconnect: function () {
        var self = this;
        return {
          set: function (v) { leaving.push(function () { self.set(v); }); return Promise.resolve(); },
          remove: function () { leaving.push(function () { self.remove(); }); return Promise.resolve(); },
          cancel: function () { leaving = []; return Promise.resolve(); },
        };
      },
    };
  }
  return { ref: ref };
})();

function loadScript(src) {
  return new Promise(function (res, rej) {
    var s = document.createElement("script");
    s.src = src; s.onload = res;
    s.onerror = function () { rej(new Error("Impossible de charger " + src)); };
    document.head.appendChild(s);
  });
}
var FB = "https://www.gstatic.com/firebasejs/10.12.2/";
/* role : "hote" (identité gardée sur ce navigateur) ou "joueur" / "ecran" (identité propre à chaque onglet). */
function connect(role) {
  if (DEMO) {
    var store = sessionStorage, uid = lsGet("qpk-demo-uid-" + role, store);
    if (role === "hote") { store = localStorage; uid = lsGet("qpk-demo-uid-hote", store); }
    if (!uid) { uid = role.charAt(0) + Math.random().toString(36).slice(2, 10); lsSet("qpk-demo-uid-" + role, uid, store); }
    followClock(LocalDB);
    return Promise.resolve({ db: LocalDB, uid: uid, demo: true });
  }
  return loadScript(FB + "firebase-app-compat.js")
    .then(function () { return loadScript(FB + "firebase-auth-compat.js"); })
    .then(function () { return loadScript(FB + "firebase-database-compat.js"); })
    .then(function () {
      // Une « appli » Firebase par rôle : le maître du jeu et un joueur ouverts sur le même ordinateur gardent des identités séparées.
      var app = firebase.initializeApp(CFG, role);
      var auth = app.auth();
      var pers = role === "hote" ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
      return auth.setPersistence(pers).then(function () {
        // On attend que Firebase ait relu l'identité enregistrée avant d'en créer une nouvelle (sinon le maître du jeu perdrait sa partie au rechargement).
        return new Promise(function (res) { var stop = auth.onAuthStateChanged(function (u) { stop(); res(u); }); });
      }).then(function (u) {
        return u ? u : auth.signInAnonymously().then(function (c) { return c.user; });
      }).then(function (user) { var d = app.database(); followClock(d); return { db: d, uid: user.uid, demo: false }; });
    })
    .catch(function (e) {
      var msg = String((e && (e.code || e.message)) || e);
      if (/operation-not-allowed|admin-restricted/.test(msg)) msg = "La connexion anonyme n'est pas activée dans Firebase (Authentication > Méthodes de connexion > Anonyme).";
      else if (/network|charger/i.test(msg)) msg = "Pas de connexion internet, ou le réseau bloque Firebase.";
      throw new Error(msg);
    });
}
function permError(e) {
  var m = String((e && (e.code || e.message)) || e);
  return /permission/i.test(m) ? "Action refusée par la base (règles Firebase). Vérifiez que les règles du guide sont bien publiées." : m;
}

/* ====================== Visuels ====================== */
function piePath(i, k, r, c) {
  r = r || 46; c = c || 50;
  if (k === 1) return "M " + c + " " + (c - r) + " A " + r + " " + r + " 0 1 1 " + (c - 0.01) + " " + (c - r) + " Z";
  var a0 = (-90 + i * 360 / k) * Math.PI / 180, a1 = (-90 + (i + 1) * 360 / k) * Math.PI / 180;
  var x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
  var large = 360 / k > 180 ? 1 : 0;
  return "M " + c + " " + c + " L " + x0.toFixed(2) + " " + y0.toFixed(2) + " A " + r + " " + r + " 0 " + large + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + " Z";
}
/* owned : objet { c0: true, … } venant de la base */
function pieSVG(owned, cats, pid) {
  owned = owned || {};
  var k = cats.length, n = 0;
  var slices = cats.map(function (c, i) {
    var has = !!owned[KEY[c]]; if (has) n++;
    return '<path class="slice" data-pid="' + esc(pid) + '" data-cat="' + esc(c) + '" d="' + piePath(i, k) + '" fill="' + (has ? COLOR[c] : "#EEF1FA") + '" stroke="#fff" stroke-width="2.2"><title>' + esc(c) + "</title></path>";
  }).join("");
  return '<svg viewBox="0 0 100 100" role="img" aria-label="' + n + " sur " + k + ' triangles">' + slices + '<circle cx="50" cy="50" r="47" fill="none" stroke="#C9CFEA" stroke-width="1.5"/></svg>';
}
function countOwned(owned, cats) { owned = owned || {}; return cats.filter(function (c) { return owned[KEY[c]]; }).length; }
function cardFace(text, cat, tag, label) {
  return '<div class="pill" style="--c:' + COLOR[cat] + ";--t:" + TXT[cat] + '"><span class="tag">' + esc(tag) + "</span><span>" + esc(label || cat) + "</span></div>" +
    '<div class="paper"><div class="text">' + esc(text) + "</div></div>";
}
function brand(sub) { return '<div class="brand"><h1>Question pour un kiné</h1><p>' + esc(sub || "version pédiatrique") + "</p></div>"; }

/* Texte des cartes calé sur les lignes pointillées (repris du jeu d'origine). */
function fitCards(root) {
  Array.prototype.forEach.call((root || document).querySelectorAll(".card-slot, .pile"), function (slot) {
    var cw = slot.getBoundingClientRect().width;
    if (!cw) return;
    slot.style.setProperty("--cw", cw + "px");
    Array.prototype.forEach.call(slot.querySelectorAll(".paper"), function (paper) {
      var text = paper.querySelector(".text");
      Array.prototype.forEach.call(paper.querySelectorAll(".rule"), function (r) { paper.removeChild(r); });
      var H = paper.clientHeight;
      if (!H) return;
      var L = cw * 54 / 1007, fs = L / 1.25;
      for (var k = 0; k < 40; k++) {
        text.style.fontSize = fs + "px"; text.style.lineHeight = L + "px"; text.style.paddingTop = "0px";
        if (text.scrollHeight <= H - L * 0.3) break;
        L *= 0.94; fs = L / 1.25;
      }
      var slots = Math.floor(H / L), lines = Math.max(1, Math.round(text.scrollHeight / L));
      text.style.paddingTop = Math.max(0, Math.floor((slots - lines) / 2)) * L + "px";
      var frag = document.createDocumentFragment();
      for (var i = 1; i <= slots; i++) {
        var r = document.createElement("div");
        r.className = "rule"; r.style.top = (i * L - L * 0.12 - 2) + "px";
        frag.appendChild(r);
      }
      paper.insertBefore(frag, paper.firstChild);
    });
  });
}
var fitTimer = null;
function autoFit() {
  function go() { clearTimeout(fitTimer); fitTimer = setTimeout(function () { fitCards(); }, 60); }
  if (window.ResizeObserver) new ResizeObserver(go).observe(document.body); else window.addEventListener("resize", go);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
}

function showBanner(small, big, sub, color, ms, extra) {
  return new Promise(function (resolve) {
    var el = document.createElement("div");
    el.className = "banner"; el.setAttribute("role", "status");
    el.innerHTML = '<div class="box" style="--c:' + color + '"><div class="small">' + esc(small) + '</div><div class="big">' + esc(big) + '</div><div class="sub">' + esc(sub) + "</div></div>";
    document.body.appendChild(el);
    if (extra !== false) confetti(color, extra ? 90 : 50);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); resolve(); }, reduced ? 0 : 330);
    }, reduced ? 600 : ms);
  });
}
function confetti(color, n) {
  if (reduced || !document.body.animate) return;
  var palette = [color, "#F07A24", "#FFD95E", "#FF3131", "#FFFFFF"];
  for (var i = 0; i < n; i++) {
    (function (i) {
      var c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = palette[i % palette.length];
      document.body.appendChild(c);
      var dx = (Math.random() - 0.5) * 200, rot = Math.random() * 720;
      var anim = c.animate([
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + dx + "px, 105vh) rotate(" + rot + "deg)", opacity: 0.9 },
      ], { duration: 1600 + Math.random() * 1200, delay: Math.random() * 300, easing: "cubic-bezier(.25,.6,.4,1)" });
      anim.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); };
    })(i);
  }
}
function armButton(btn, confirmText, action) {
  var label = btn.textContent, timer = null;
  btn.onclick = function () {
    if (btn.classList.contains("armed")) { clearTimeout(timer); btn.classList.remove("armed"); btn.textContent = label; action(); return; }
    btn.classList.add("armed"); btn.textContent = confirmText;
    timer = setTimeout(function () { btn.classList.remove("armed"); btn.textContent = label; }, 3500);
  };
}
/* ====================== Joueurs, badges et chrono (v1.4.0) ====================== */
/* Joueurs triés par ordre d'arrivée. parti = a quitté la partie (ses badges restent au classement). */
function playerList(P) {
  var J = (P && P.joueurs) || {};
  return Object.keys(J).filter(function (uid) { return J[uid] && J[uid].nom; }).map(function (uid) {
    return { uid: uid, nom: J[uid].nom, enLigne: J[uid].enLigne !== false && !J[uid].parti, parti: !!J[uid].parti, t: J[uid].t || 0 };
  }).sort(function (a, b) { return a.t - b.t; });
}
function activeList(P) { return playerList(P).filter(function (p) { return !p.parti; }); }
var NIV = ["À débloquer", "Bronze", "Argent", "Or"];

function badgeInfo(cat) {
  var L = window.BADGE_CATS || [];
  for (var i = 0; i < L.length; i++) if (L[i].nom === cat) return L[i];
  return null;
}
/* Nombre de bonnes réponses d'un joueur dans une catégorie, et niveau de badge (plafonné à 3 : or). */
function bonnes(P, uid, cat) { var b = P && P.bonnes && P.bonnes[uid]; return (b && b[KEY[cat]]) || 0; }
function level(P, uid, cat) { return Math.min(3, bonnes(P, uid, cat)); }
function totalLevels(P, uid) { return (P.cats || []).reduce(function (t, c) { return t + level(P, uid, c); }, 0); }
function totalBonnes(P, uid) { return (P.cats || []).reduce(function (t, c) { return t + bonnes(P, uid, c); }, 0); }
function nbOr(P, uid) { return (P.cats || []).filter(function (c) { return level(P, uid, c) === 3; }).length; }
function badge(cat, n) {
  var k = badgeInfo(cat);
  if (k && window.badgeSVG) return window.badgeSVG(k.id, n);
  return '<svg viewBox="0 0 100 100" role="img" aria-label="' + esc(cat + " – " + NIV[n]) + '"><circle cx="50" cy="50" r="44" fill="' + (n ? COLOR[cat] : "#E8E3DA") + '" stroke="#1F2440" stroke-width="4"/><text x="50" y="62" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">' + n + "</text></svg>";
}
function nick(cat) { var k = badgeInfo(cat); return k ? k.nick : cat; }
function shortName(cat) { var k = badgeInfo(cat); return k ? k.court : cat; }
function ranking(P) {
  return playerList(P).sort(function (a, b) {
    return totalLevels(P, b.uid) - totalLevels(P, a.uid) || nbOr(P, b.uid) - nbOr(P, a.uid) ||
      totalBonnes(P, b.uid) - totalBonnes(P, a.uid) || a.t - b.t;
  });
}
/* Rang avec ex æquo : deux joueurs au même total ont le même rang. */
function ranks(P) {
  var R = ranking(P), out = [], prev = null, pos = 0;
  R.forEach(function (p, i) {
    var key = totalLevels(P, p.uid) + "|" + nbOr(P, p.uid) + "|" + totalBonnes(P, p.uid);
    if (key !== prev) pos = i + 1;
    prev = key; out.push({ p: p, pos: pos });
  });
  return out;
}
function miniBadges(P, uid) {
  return '<span class="mini-badges">' + (P.cats || []).map(function (c) {
    return '<span class="mb" title="' + esc(c + " : " + NIV[level(P, uid, c)]) + '">' + badge(c, level(P, uid, c)) + "</span>";
  }).join("") + "</span>";
}
function rankingHTML(P, meUid) {
  var max = (P.cats || []).length * 3;
  return '<ol class="ranking">' + ranks(P).map(function (x) {
    var p = x.p, n = totalLevels(P, p.uid), b = totalBonnes(P, p.uid);
    return '<li' + (p.uid === meUid ? ' class="me"' : "") + '><span class="pos">' + ordinal(x.pos) + '</span><span class="who2">' + esc(p.nom) + (p.uid === meUid ? " (toi)" : "") +
      (p.parti ? ' <small class="left">a quitté</small>' : "") + "</span>" + miniBadges(P, p.uid) +
      '<span class="stat"><b>' + n + " / " + max + "</b> niveaux<br>" + b + " bonne" + (b > 1 ? "s" : "") + " réponse" + (b > 1 ? "s" : "") + "</span></li>";
  }).join("") + "</ol>";
}
/* Bilan du groupe pour le débrief : réussite par catégorie et questions les plus ratées. */
function bilanHTML(P) {
  var S = P.stats || {}, rows = (P.cats || []).filter(function (c) { return S[KEY[c]] && S[KEY[c]].q; }).map(function (c) {
    var s = S[KEY[c]], pct = s.r ? Math.round(100 * s.ok / s.r) : 0;
    return '<div class="bil-row"><span class="bil-cat"><i style="background:' + COLOR[c] + '"></i>' + esc(c) + '</span><span class="bil-bar"><i style="width:' + pct + "%;background:" + COLOR[c] + '"></i></span>' +
      '<span class="bil-n">' + (s.r ? pct + " %" : "–") + "<small>" + s.ok + " / " + s.r + " · " + s.q + " carte" + (s.q > 1 ? "s" : "") + "</small></span></div>";
  });
  var Hh = P.hist || {}, hist = Object.keys(Hh).map(function (k) { return Hh[k]; }).filter(function (h) { return h && h.r > 0; });
  hist.sort(function (a, b) { return a.ok / a.r - b.ok / b.r || b.r - a.r; });
  var miss = hist.filter(function (h) { return h.ok / h.r < 0.5; }).slice(0, 6);
  return '<div class="bilan"><h3>Réussite du groupe par catégorie</h3>' + (rows.length ? rows.join("") : '<p class="note">Aucune carte révélée pour l\'instant.</p>') +
    (miss.length ? '<h3>Questions à revoir ensemble</h3><ol class="miss">' + miss.map(function (h) {
      return '<li><span class="chip" style="--c:' + COLOR[h.cat] + ";--t:" + TXT[h.cat] + '">' + esc(shortName(h.cat)) + "</span> " + esc(h.q) + ' <small>' + h.ok + " / " + h.r + " juste" + (h.ok > 1 ? "s" : "") + "</small></li>";
    }).join("") + "</ol>" : "") + "</div>";
}
/* Tableau des badges affiché à la demande du maître du jeu. mode "tous" ou "joueur" (uid). */
function boardHTML(P, aff, controls) {
  aff = aff || { mode: "tous" };
  var cats = P.cats || [], list = activeList(P), max = cats.length * 3;
  var focus = aff.mode === "joueur" && P.joueurs && P.joueurs[aff.uid] ? playerList(P).filter(function (p) { return p.uid === aff.uid; })[0] : null;
  var head = '<div class="board-head"><h2>' + (focus ? "Les badges de " + esc(focus.nom) : "Les badges") + "</h2>" +
    (controls ? '<button class="mini" type="button" data-board="close">Fermer</button>' : "") + "</div>";
  var pick = controls ? '<div class="board-pick"><button type="button" class="mini" data-board="tous" aria-pressed="' + !focus + '">Tous</button>' +
    list.map(function (p) { return '<button type="button" class="mini" data-board="' + esc(p.uid) + '" aria-pressed="' + (focus && focus.uid === p.uid ? "true" : "false") + '">' + esc(p.nom) + "</button>"; }).join("") + "</div>" : "";
  var body;
  if (focus) {
    body = '<div class="board-one">' + cats.map(function (c) {
      var n = level(P, focus.uid, c);
      return '<figure class="b1' + (n ? "" : " locked") + '">' + badge(c, n) + '<figcaption><b>' + esc(nick(c)) + "</b><span>" + esc(shortName(c)) + " · " + NIV[n] + "</span></figcaption></figure>";
    }).join("") + '</div><p class="board-total">' + totalLevels(P, focus.uid) + " niveaux sur " + max + " · " + nbOr(P, focus.uid) + " badge" + (nbOr(P, focus.uid) > 1 ? "s" : "") + " or</p>";
  } else if (!list.length) {
    body = '<p class="note">Aucun joueur pour l\'instant.</p>';
  } else {
    var cols = "grid-template-columns:minmax(110px,1.3fr) repeat(" + cats.length + ",minmax(0,1fr)) minmax(56px,.6fr)";
    body = '<div class="board-grid" style="' + cols + '"><span class="bh"></span>' + cats.map(function (c) {
      return '<span class="bh" title="' + esc(c) + '"><i style="background:' + COLOR[c] + '"></i>' + esc(shortName(c)) + "</span>";
    }).join("") + '<span class="bh">Niveaux</span>' + ranking(P).filter(function (p) { return !p.parti; }).map(function (p) {
      return '<span class="bn">' + esc(p.nom) + "</span>" + cats.map(function (c) { var n = level(P, p.uid, c); return '<span class="bc' + (n ? "" : " locked") + '">' + badge(c, n) + "</span>"; }).join("") +
        '<span class="bt">' + totalLevels(P, p.uid) + "<small>/" + max + "</small></span>";
    }).join("") + "</div>";
  }
  return '<div class="board-box">' + head + pick + body + "</div>";
}
/* Affiche ou retire le tableau des badges selon P.affichage. onPick(valeur) reçoit "close", "tous" ou un uid. */
var boardSig = null;
function syncBoard(P, controls, onPick) {
  var el = byId("board"), aff = P && P.etat === "jeu" ? P.affichage : null;
  if (!aff) { if (el) el.parentNode.removeChild(el); boardSig = null; return; }
  var sig = JSON.stringify([aff.mode, aff.uid, P.bonnes || {}, P.joueurs || {}, P.cats]);
  if (!el) { el = document.createElement("div"); el.id = "board"; el.className = "board"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Tableau des badges"); document.body.appendChild(el); boardSig = null; }
  if (sig === boardSig) return;
  boardSig = sig;
  el.innerHTML = boardHTML(P, aff, controls);
  if (controls) Array.prototype.forEach.call(el.querySelectorAll("[data-board]"), function (b) { b.onclick = function () { onPick(b.dataset.board); }; });
}
/* Badge débloqué : grand badge au centre, puis disparition. */
function showLevelUp(cat, n, bonus) {
  return new Promise(function (resolve) {
    var el = document.createElement("div");
    el.className = "banner levelup"; el.setAttribute("role", "status");
    el.innerHTML = '<div class="box" style="--c:' + COLOR[cat] + '"><div class="small">' + (n ? "Badge " + NIV[n] + " débloqué !" : "Bonne réponse !") + '</div><div class="lu-badge">' + badge(cat, n) + '</div><div class="sub">' + esc(nick(cat)) + "</div>" +
      (bonus ? '<div class="lu-note">' + esc(bonus) + "</div>" : "") + "</div>";
    document.body.appendChild(el);
    confetti(COLOR[cat], n === 3 ? 110 : 60);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); resolve(); }, reduced ? 0 : 330);
    }, reduced ? 900 : 2600);
  });
}
/* ---------- chrono : heure du serveur, pour que tous les écrans affichent le même temps ---------- */
var OFFSET = 0;
function now() { return Date.now() + OFFSET; }
function followClock(db) {
  try { db.ref(".info/serverTimeOffset").on("value", function (s) { OFFSET = Number(s.val()) || 0; }); } catch (e) {}
}
function timeLeft(c) { return c && c.fin ? Math.max(0, c.fin - now()) : 0; }
function fmt(ms) { var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
function timerHTML() { return '<div class="timer" id="timer" role="timer" aria-live="off"><span class="tbar"><i id="tfill"></i></span><span class="ttxt" id="ttxt"></span></div>'; }
/* Met à jour la barre du chrono. Retourne true quand le temps est écoulé. */
function paintTimer(c) {
  var box = byId("timer");
  if (!box || !c) return false;
  var left = timeLeft(c), tot = (c.duree || 60) * 1000, up = c.etat !== "ouverte" || left <= 0;
  var f = byId("tfill"), t = byId("ttxt");
  if (f) f.style.width = (up ? 0 : Math.min(100, 100 * left / tot)) + "%";
  if (t) t.textContent = c.etat === "revelee" ? "Réponse révélée" : up ? "Temps écoulé" : fmt(left);
  box.className = "timer" + (up ? " up" : left <= 10000 ? " hurry" : "");
  return up;
}
async function flyTriangle(fromEl, sliceEl, color) {
  if (!fromEl || !sliceEl || reduced || !document.body.animate) return;
  var a = fromEl.getBoundingClientRect(), b = sliceEl.getBoundingClientRect(), size = 90;
  var fly = document.createElement("div");
  fly.className = "flyer";
  fly.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100"><path d="M50 50 L50 4 A46 46 0 0 1 89.8 27 Z" fill="' + color + '" stroke="#fff" stroke-width="4" transform="translate(-20 18) scale(1.4)"/></svg>';
  document.body.appendChild(fly);
  var sx = a.left + a.width / 2 - size / 2, sy = a.top + a.height / 2 - size / 2;
  var ex = b.left + b.width / 2 - size / 2, ey = b.top + b.height / 2 - size / 2;
  var mx = (sx + ex) / 2, my = Math.min(sy, ey) - 140;
  var anim = fly.animate([
    { transform: "translate(" + sx + "px, " + sy + "px) scale(.6) rotate(0deg)", opacity: 0 },
    { transform: "translate(" + sx + "px, " + (sy - 30) + "px) scale(1.5) rotate(-20deg)", opacity: 1, offset: 0.2 },
    { transform: "translate(" + mx + "px, " + my + "px) scale(1.2) rotate(160deg)", opacity: 1, offset: 0.6 },
    { transform: "translate(" + ex + "px, " + ey + "px) scale(.35) rotate(360deg)", opacity: 1 },
  ], { duration: 1150, easing: "cubic-bezier(.45,.05,.4,1)", fill: "forwards" });
  if (anim.finished) { try { await anim.finished; } catch (e) {} } else { await sleep(1150); }
  if (fly.parentNode) fly.parentNode.removeChild(fly);
}
/* ---------- choix des questions par fiche ---------- */
/* FI = { groupes: [[titre, [n…]]…], titres: { n: titre } } ; ficheOf(i) = numéro de fiche de la question i. */
function fichesPicker(FI, qs, selected, ficheOf) {
  ficheOf = ficheOf || function (i) { return qs[i].f; };
  var cnt = {};
  qs.forEach(function (q, i) { var f = ficheOf(i); cnt[f] = (cnt[f] || 0) + 1; });
  return '<div class="fiches-pick">' + FI.groupes.map(function (g, gi) {
    var nums = g[1], tot = 0, sel = 0;
    nums.forEach(function (n) { tot += cnt[n] || 0; if (selected.indexOf(n) >= 0) sel++; });
    return '<details' + (sel ? " open" : "") + '><summary><input type="checkbox" data-grp="' + gi + '" aria-label="Tout le chapitre ' + esc(g[0]) + '"' + (sel === nums.length ? " checked" : "") + ">" +
      "<span>" + esc(g[0]) + '</span> <span class="n">' + tot + '</span><span class="chev" aria-hidden="true">›</span></summary>' +
      nums.map(function (n) {
        return '<label><input type="checkbox" data-fiche="' + n + '"' + (selected.indexOf(n) >= 0 ? " checked" : "") + (cnt[n] ? "" : " disabled") + ">" +
          "<span>Fiche " + n + " · " + esc(FI.titres[n] || "") + '</span> <span class="n">' + (cnt[n] || 0) + "</span></label>";
      }).join("") + "</details>";
  }).join("") + '<p class="fiches-tools"><button type="button" class="linkish" data-all="1">Tout cocher</button> · <button type="button" class="linkish" data-all="0">Tout décocher</button></p></div>';
}
/* ---------- choix des questions par fil rouge ---------- */
/* FILS = [[nom, [n…]]…] ; selected = indices des fils cochés ; titres = { n: titre }. */
function filsPicker(FILS, titres, qs, selected, ficheOf) {
  ficheOf = ficheOf || function (i) { return qs[i].f; };
  var cnt = {};
  qs.forEach(function (q, i) { var f = ficheOf(i); cnt[f] = (cnt[f] || 0) + 1; });
  return '<div class="fiches-pick fils-pick">' + FILS.map(function (fl, i) {
    var tot = 0;
    fl[1].forEach(function (n) { tot += cnt[n] || 0; });
    return '<label class="fil"><input type="checkbox" data-fil="' + i + '"' + (selected.indexOf(i) >= 0 ? " checked" : "") + (tot ? "" : " disabled") + ">" +
      "<span><b>" + esc(fl[0]) + "</b><small>" + fl[1].map(function (n) { return "Fiche " + n + " · " + esc(titres[n] || ""); }).join("<br>") + '</small></span> <span class="n">' + tot + "</span></label>";
  }).join("") + '<p class="fiches-tools"><button type="button" class="linkish" data-all="1">Tout cocher</button> · <button type="button" class="linkish" data-all="0">Tout décocher</button></p></div>';
}
/* Fiches couvertes par les fils cochés, sans doublon, triées. */
function filsUnion(FILS, idx) {
  var u = [];
  (idx || []).forEach(function (i) { (FILS[i] ? FILS[i][1] : []).forEach(function (n) { if (u.indexOf(n) < 0) u.push(n); }); });
  return u.sort(function (a, b) { return a - b; });
}
function bindFilsPicker(box, onChange) {
  if (!box) return;
  function list() {
    return Array.prototype.map.call(box.querySelectorAll("input[data-fil]:checked"), function (x) { return +x.dataset.fil; });
  }
  Array.prototype.forEach.call(box.querySelectorAll("input[data-fil]"), function (x) {
    x.addEventListener("change", function () { onChange(list()); });
  });
  Array.prototype.forEach.call(box.querySelectorAll("[data-all]"), function (b) {
    b.onclick = function () {
      var on = b.dataset.all === "1";
      Array.prototype.forEach.call(box.querySelectorAll("input[data-fil]:not([disabled])"), function (x) { x.checked = on; });
      onChange(list());
    };
  });
}
function bindFichesPicker(box, onChange) {
  if (!box) return;
  function list() {
    return Array.prototype.map.call(box.querySelectorAll("input[data-fiche]:checked"), function (x) { return +x.dataset.fiche; }).sort(function (a, b) { return a - b; });
  }
  function syncGroups() {
    Array.prototype.forEach.call(box.querySelectorAll("details"), function (d) {
      var all = d.querySelectorAll("input[data-fiche]:not([disabled])"), on = d.querySelectorAll("input[data-fiche]:checked"), g = d.querySelector("input[data-grp]");
      g.checked = all.length > 0 && on.length === all.length;
      g.indeterminate = on.length > 0 && on.length < all.length;
    });
  }
  Array.prototype.forEach.call(box.querySelectorAll("input[data-grp]"), function (g) {
    g.addEventListener("click", function (e) { e.stopPropagation(); });
    g.addEventListener("change", function () {
      var d = g.closest("details");
      Array.prototype.forEach.call(d.querySelectorAll("input[data-fiche]:not([disabled])"), function (x) { x.checked = g.checked; });
      if (g.checked) d.open = true;
      syncGroups(); onChange(list());
    });
  });
  Array.prototype.forEach.call(box.querySelectorAll("input[data-fiche]"), function (x) {
    x.addEventListener("change", function () { syncGroups(); onChange(list()); });
  });
  Array.prototype.forEach.call(box.querySelectorAll("[data-all]"), function (b) {
    b.onclick = function () {
      var on = b.dataset.all === "1";
      Array.prototype.forEach.call(box.querySelectorAll("input[data-fiche]:not([disabled])"), function (x) { x.checked = on; });
      syncGroups(); onChange(list());
    };
  });
  syncGroups();
}
function siteURL(page) { return location.href.replace(/[?#].*$/, "").replace(/[^\/]*$/, "") + page; }
function demoBanner() {
  if (!DEMO) return "";
  return '<div class="demo-note"><strong>Mode démo.</strong> La partie ne passe pas par internet : elle se joue entre les onglets de ce navigateur, sur cet ordinateur. Pour jouer avec des téléphones, remplissez config.js (voir le guide).</div>';
}

/* ====================== Page de démarrage et mentions (v1.4.2) ====================== */
var AUTEUR = "Maxime KOSMALA, MKDE", ANNEE = "2026";
function splashHTML() {
  // Trois badges tirés au hasard : bronze, or au centre, argent.
  var ids = CAT_IDS.slice(), pick = [];
  for (var i = 0; i < 3; i++) pick.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
  var fan = '<div class="sp-fan" aria-hidden="true">' +
    '<span class="sp-b sp-l">' + badge(pick[0], 1) + "</span>" +
    '<span class="sp-b sp-r">' + badge(pick[2], 2) + "</span>" +
    '<span class="sp-b sp-c">' + badge(pick[1], 3) + "</span></div>";
  function point(color, title, text) {
    return '<li><i style="background:' + color + '"></i><div><b>' + title + "</b><span>" + text + "</span></div></li>";
  }
  return '<div class="sp-card">' +
    '<div class="sp-hero">' +
      '<p class="sp-eyebrow">Serious game · kinésithérapie pédiatrique</p>' +
      '<h1 id="splashTitle">Question<br>pour <em>un kiné</em></h1>' +
      fan +
      '<p class="sp-tag">Y a pas de mauvaise réponse</p>' +
    "</div>" +
    '<div class="sp-body">' +
      '<div class="sp-meta"><span class="sp-pill">Mode multijoueur</span><span class="sp-pill ghost">' + esc(VERSION.replace("Multijoueur ", "")) + "</span></div>" +
      '<ul class="sp-points">' +
        point(COLOR["Développement"], "Un jeu pour apprendre", "Pour la formation en kiné pédiatrique. Il ne remplace ni l'avis d'un professionnel ni les recommandations.") +
        point(COLOR["Neurologie"], "Des réponses sourcées", "Chaque réponse cite sa source sur la carte.") +
        point(COLOR["Orthopédie"], "Aucun compte", "Un prénom ou un pseudo suffit. La partie est effacée quand le maître du jeu la ferme.") +
      "</ul>" +
      '<button class="primary sp-go" type="button" id="splashGo">Commencer</button>' +
      '<p class="splash-auto" id="splashAuto" hidden>Le jeu démarre dans quelques secondes…</p>' +
      '<p class="sp-copy">Conception, questions, fiches et badges : <b>' + esc(AUTEUR) + "</b><br>© " + ANNEE + " " + esc(AUTEUR) + ". Tous droits réservés. Reproduction, diffusion ou modification interdites sans accord écrit.</p>" +
    "</div></div>";
}
/* force = true : réouverture depuis le pied de page. Sinon, une seule fois par onglet. */
function splash(force) {
  var K = "qpk-demarrage-vu";
  if (!force && lsGet(K, sessionStorage)) return;
  if (byId("splash")) return;
  var before = document.activeElement;
  var el = document.createElement("div");
  el.id = "splash"; el.className = "splash";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "splashTitle");
  el.innerHTML = splashHTML();
  document.body.appendChild(el);
  var timer = null;
  function close() {
    clearTimeout(timer);
    document.removeEventListener("keydown", onKey);
    lsSet(K, 1, sessionStorage);
    el.classList.add("out");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduced ? 0 : 320);
    if (force && before && before.focus) before.focus();
  }
  function onKey(e) { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); close(); } }
  document.addEventListener("keydown", onKey);
  byId("splashGo").onclick = close;
  byId("splashGo").focus();
  // L'écran projeté n'a souvent ni clavier ni souris à portée : il démarre seul.
  if (!force && param("ecran") === "1") { byId("splashAuto").hidden = false; timer = setTimeout(close, 7000); }
}
function footer() {
  if (byId("copyFoot")) return;
  var f = document.createElement("footer");
  f.id = "copyFoot"; f.className = "copy-foot";
  f.innerHTML = "© " + ANNEE + " " + esc(AUTEUR) + " · Tous droits réservés · " + esc(VERSION) + ' · <button type="button" class="linkish" id="btnMentions">Mentions</button>';
  document.body.appendChild(f);
  byId("btnMentions").onclick = function () { splash(true); };
}
/* Après le chargement de tous les scripts de la page (badges.js compris). */
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { footer(); splash(false); });
else { footer(); splash(false); }

return {
  VERSION: VERSION, CATS: CATS, CAT_IDS: CAT_IDS, COLOR: COLOR, TXT: TXT, KEY: KEY, NOW: NOW, DEMO: DEMO, reduced: reduced,
  esc: esc, byId: byId, sleep: sleep, ordinal: ordinal, lsGet: lsGet, lsSet: lsSet, param: param, cleanCode: cleanCode, newCode: newCode,
  connect: connect, permError: permError, pieSVG: pieSVG, countOwned: countOwned, cardFace: cardFace, brand: brand,
  fitCards: fitCards, autoFit: autoFit, showBanner: showBanner, confetti: confetti, armButton: armButton,
  playerList: playerList, activeList: activeList, ranking: ranking, ranks: ranks, rankingHTML: rankingHTML, bilanHTML: bilanHTML,
  NIV: NIV, badge: badge, nick: nick, shortName: shortName, bonnes: bonnes, level: level, totalLevels: totalLevels, totalBonnes: totalBonnes, nbOr: nbOr, miniBadges: miniBadges,
  boardHTML: boardHTML, syncBoard: syncBoard, showLevelUp: showLevelUp, now: now, timeLeft: timeLeft, fmt: fmt, timerHTML: timerHTML, paintTimer: paintTimer,
  flyTriangle: flyTriangle, siteURL: siteURL, fichesPicker: fichesPicker, bindFichesPicker: bindFichesPicker, filsPicker: filsPicker, bindFilsPicker: bindFilsPicker, filsUnion: filsUnion, demoBanner: demoBanner, splash: splash, AUTEUR: AUTEUR, _LocalDB: LocalDB,
};
})();
