/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.7.0
   Reproduction, diffusion ou modification interdites sans accord écrit de l'auteur. Voir LICENCE.txt. */
/* =========================================================
   Badges écureuil – Question pour un kiné (version pédiatrique)
   v1.0.0 – badges.js
   Usage :
     <script src="badges.js"></script>
     element.innerHTML = badgeSVG("neuro", 2);
   Catégories (id) : dev, neuro, marche, ortho, trauma, force,
                     nm, gen, resp, dlr, meth
   Niveaux : 0 à débloquer, 1 bronze, 2 argent, 3 or
   Infos utiles : BADGE_CATS (nom, surnom, couleur, étapes)
                  BADGE_NIVEAUX (libellés des niveaux)
   Aucune dépendance. Aucune image externe.
   ========================================================= */
(function(){

/* ================= Données ================= */
const OUT='#1f2440';
const CATS=[
 {id:'dev',nom:'Développement',court:'Développement',nick:'Graine de motricité',c:'#2e9e5b',a:['Allongé sur le ventre','Assis tout seul','Debout, bras en l\'air']},
 {id:'neuro',nom:'Neurologie',court:'Neurologie',nick:'Neurone en éveil',c:'#2f5bd8',a:['Un neurone s\'allume','Les connexions poussent','Tout un réseau en éveil']},
 {id:'marche',nom:'Analyse de la marche',court:'Marche',nick:'Pas à pas',c:'#8a46c9',a:['Avec un déambulateur','Avec une canne','Il marche tout seul']},
 {id:'ortho',nom:'Orthopédie',court:'Orthopédie',nick:'Os solide',c:'#ec7a1c',a:['Un os cassé en deux','L\'os se recolle','Brandi comme un trophée']},
 {id:'trauma',nom:'Traumatologie et sport',court:'Traumato',nick:'Retour au jeu',c:'#d92b3a',a:['Un plâtre à la jambe','Un simple bandage','Bandeau sur la tête, tout content']},
 {id:'force',nom:'Sport et renforcement musculaire',court:'Renforcement',nick:'Force tranquille',c:'#e0a100',a:['Un petit haltère','Deux haltères plus lourds','La grosse barre et le trophée']},
 {id:'nm',nom:'Neuromusculaire',court:'Neuromusculaire',nick:'Influx nerveux',c:'#d6408f',a:['Batterie faible','Ça se recharge','Pleine charge, ça pulse']},
 {id:'gen',nom:'Maladies chroniques et génétiques',court:'Génétique',nick:'Double hélice',c:'#8a5a2b',a:['Apprenti chercheur','Blouse, lunettes et ADN','Découverte au microscope']},
 {id:'resp',nom:'Respiratoire',court:'Respiratoire',nick:'Grand souffle',c:'#1395a8',a:['Un petit souffle','Il fait tourner le moulin','Il souffle une tempête']},
 {id:'dlr',nom:'Douleur',court:'Douleur',nick:'Main qui apaise',c:'#a3214d',a:['Un cœur dans la main','Un doudou à câliner','Une pluie de cœurs']},
 {id:'meth',nom:'Méthodes et évaluation',court:'Méthodes',nick:'Esprit critique',c:'#4a5568',a:['Une loupe','Des lunettes rondes','La toque de diplômé']},
];
const NIV=['À débloquer','Bronze','Argent','Or'];
const NEED=['Pas encore','1 bonne réponse','2 bonnes réponses','3 bonnes réponses'];

/* ================= Couleurs ================= */
const hex2rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(h,w,t)=>{const a=hex2rgb(h),b=hex2rgb(w);return '#'+a.map((v,i)=>Math.round(v*(1-t)+b[i]*t).toString(16).padStart(2,'0')).join('');};
const dark=c=>mix(c,'#141a33',.45);

/* ================= Petits outils de dessin ================= */
const SW=2.4;
const S=(w=SW)=>`stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const pts=a=>'M'+a.map(p=>p.join(' ')).join(' L');
function tube(d,w,col){ return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w+SW*2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; }
function star(cx,cy,r,fill='#ffd34d',w=1.6){let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.48:r;p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+' '+(cy+rr*Math.sin(a)).toFixed(1);}return `<path d="${p}Z" fill="${fill}" ${S(w)}/>`;}
function sparkle(x,y,s,col='#fff'){return `<path d="M${x} ${y-s}Q${x} ${y} ${x+s} ${y}Q${x} ${y} ${x} ${y+s}Q${x} ${y} ${x-s} ${y}Q${x} ${y} ${x} ${y-s}Z" fill="${col}" ${S(1.4)}/>`;}
const heartP='M0 8C-14-2-10-14-2-12C0-12 0-10 0-9C0-10 0-12 2-12C10-14 14-2 0 8Z';
const heart=(x,y,s=1,col='#ff6f91')=>`<path transform="translate(${x} ${y}) scale(${s})" d="${heartP}" fill="${col}" ${S(SW/s*.8)}/>`;
const bolt=(x,y,s=1,r=0)=>`<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M4-14L-6 2h6l-4 13L8-4H2l4-10z" fill="#ffe36b" ${S(2/s)}/>`;
const motion=(x,y,len=8)=>`<path d="M${x} ${y}h${len}M${x+3} ${y+5}h${len-3}" ${S(1.8)} fill="none"/>`;
const sweat=(x,y)=>`<path d="M${x} ${y}q-4 6 0 8q4-2 0-8z" fill="#9fdcff" ${S(1.3)}/>`;

/* ================= L'écureuil ================= */
function ear(x,y,r,F,C){return `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-2-11q-3-6 1-9q1 4 3 4q2-4 5-3q-4 3-4 8z" fill="${F}" ${S(1.8)}/><path d="M-8 5Q-10-11 0-12Q10-11 8 5Z" fill="${F}" ${S()}/><path d="M-4 3Q-5-7 0-8Q5-7 4 3Z" fill="${C}" opacity=".55"/></g>`;}

function head(o){
  const F=o.fur,C=o.c,e=o.eyes||'open',m=o.mouth||'smile';
  let s=ear(-15,-13,-24,F,C)+ear(15,-13,24,F,C);
  s+=`<ellipse rx="23.5" ry="20" fill="${F}" ${S()}/>`;
  s+=`<path d="M-7-19L-6-11M0-20V-10M7-19L6-11" stroke="${C}" stroke-width="3.6" stroke-linecap="round"/>`;
  if(m==='blow2'||m==='blow3'){const r=m==='blow3'?11:8,x=m==='blow3'?17:16;
    s+=`<circle cx="${-x}" cy="9" r="${r}" fill="${F}" ${S()}/><circle cx="${x}" cy="9" r="${r}" fill="${F}" ${S()}/>`;
    s+=`<ellipse cx="${-x}" cy="10" rx="${r*.55}" ry="${r*.35}" fill="#ff8fa3" opacity=".75"/><ellipse cx="${x}" cy="10" rx="${r*.55}" ry="${r*.35}" fill="#ff8fa3" opacity=".75"/>`;
  }
  s+=`<ellipse cx="0" cy="9.5" rx="11.5" ry="8" fill="#fff"/>`;
  if(!m.startsWith('blow')) s+=`<ellipse cx="-15.5" cy="8" rx="4.2" ry="2.6" fill="#ff8fa3" opacity=".7"/><ellipse cx="15.5" cy="8" rx="4.2" ry="2.6" fill="#ff8fa3" opacity=".7"/>`;
  // yeux
  const open=(x)=>`<ellipse cx="${x}" cy="1" rx="3.8" ry="4.8" fill="${OUT}"/><circle cx="${x+1.3}" cy="-.8" r="1.5" fill="#fff"/>`;
  if(e==='open') s+=open(-8)+open(8);
  if(e==='happy') s+=`<path d="M-12 3q4-6 8 0M4 3q4-6 8 0" ${S(2.6)} fill="none"/>`;
  if(e==='sad') s+=open(-8)+open(8)+`<path d="M-13-5l7-3M6-8l7 3" ${S(2)} fill="none"/>`;
  if(e==='effort') s+=`<path d="M-12-2l6 3-6 3M12-2l-6 3 6 3" ${S(2.3)} fill="none"/>`;
  if(e==='tired') s+=`<path d="M-12 1h8M4 1h8" ${S(2.4)}/><path d="M-11.5 1q3.5 4 7 0M4.5 1q3.5 4 7 0" fill="${OUT}"/>`;
  if(e==='star') s+=star(-8,1,5.5,'#ffd34d',1.4)+star(8,1,5.5,'#ffd34d',1.4);
  // nez
  s+=`<path d="M-3 6.5h6q0 3.2-3 4q-3-.8-3-4z" fill="${OUT}"/>`;
  if(['smile','flat','sad'].includes(m)) s+=`<rect x="-2.6" y="${m==='sad'?11.2:12.6}" width="5.2" height="4.4" rx="1" fill="#fff" ${S(1.3)}/><path d="M0 ${m==='sad'?11.2:12.6}v4.4" ${S(1)}/>`;
  // bouche
  if(m==='smile') s+=`<path d="M-5 12q2.5 3 5 0q2.5 3 5 0" ${S(1.8)} fill="none"/>`;
  if(m==='open') s+=`<path d="M-5.5 11.5q5.5 10 11 0z" fill="#7a2232" ${S(1.8)}/><path d="M-2.6 15.6q2.6-2 5.2 0q-2.6 2.2-5.2 0z" fill="#ff8fa3"/>`;
  if(m==='sad') s+=`<path d="M-4 15.5q4-4 8 0" ${S(1.8)} fill="none"/>`;
  if(m==='flat') s+=`<path d="M-4 13.5h8" ${S(1.8)}/>`;
  if(m==='grit') s+=`<rect x="-6" y="11.5" width="12" height="5" rx="1.5" fill="#fff" ${S(1.6)}/><path d="M-2 11.5v5M2 11.5v5" ${S(1)}/>`;
  if(m==='o') s+=`<circle cx="0" cy="14" r="2.4" fill="#7a2232" ${S(1.5)}/>`;
  if(m==='blow2'||m==='blow3') s+=`<circle cx="0" cy="14.5" r="${m==='blow3'?2.2:2.6}" fill="#7a2232" ${S(1.5)}/>`;
  return s;
}

const POSES={
  stand:{tail:'M10 46C34 50 46 30 40 12C34-4 36-20 50-22C60-23 62-12 54-10', armL:[[-12,24],[-23,36]], armR:[[12,24],[23,36]],
    feet:[[-9,52.5,0],[9,52.5,0]],
    body:F=>`<ellipse cx="0" cy="33" rx="16.5" ry="19" fill="${F}" ${S()}/><ellipse cx="0" cy="37" rx="10" ry="12.5" fill="#fff"/>`},
  sit:{tail:'M12 46C38 50 50 30 44 12C38-4 40-20 54-22C64-23 66-12 58-10', armL:[[-13,26],[-17,40]], armR:[[13,26],[17,40]],
    feet:[[-17,51,-18],[17,51,18]],
    body:F=>`<ellipse cx="0" cy="35" rx="19" ry="17" fill="${F}" ${S()}/><ellipse cx="0" cy="37" rx="12" ry="12" fill="#fff"/><ellipse cx="-11" cy="45" rx="9" ry="7" fill="${F}" ${S()}/><ellipse cx="11" cy="45" rx="9" ry="7" fill="${F}" ${S()}/>`},
  lie:{tail:'M54 14C70 12 76-4 70-16C64-26 54-22 58-14', armL:null, armR:null, feet:[[56,28,-10]],
    body:F=>`<ellipse cx="28" cy="18" rx="31" ry="12.5" fill="${F}" ${S()}/><ellipse cx="-12" cy="23" rx="7.5" ry="4.5" fill="${F}" ${S()}/><ellipse cx="9" cy="24" rx="7.5" ry="4.5" fill="${F}" ${S()}/>`},
};

function squirrel(o){
  const F=o.fur,C=o.c,P=POSES[o.pose||'stand'];
  const armL=o.armL!==undefined?o.armL:P.armL, armR=o.armR!==undefined?o.armR:P.armR;
  const feet=o.feet||P.feet;
  let s='';
  s+=o.back||'';
  const TP=o.tail||P.tail;
  s+=tube(TP,22,F)+`<path d="${TP}" fill="none" stroke="${C}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${o.pose==='lie'?'0 8 56 300':'0 10 66 300'}"/><path d="${TP}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${o.pose==='lie'?'0 8 56 300':'0 10 66 300'}" opacity=".7"/>`;
  s+=o.under||'';
  s+=feet.map(([x,y,r])=>`<ellipse transform="translate(${x} ${y}) rotate(${r})" rx="8.5" ry="4.6" fill="${F}" ${S()}/>`).join('');
  s+=P.body(F);
  s+=o.mid||'';
  if(armL&&armL.length) s+=tube(pts(armL),6.5,F);
  if(armR&&armR.length) s+=tube(pts(armR),6.5,F);
  s+=o.hands||'';
  s+=`<g transform="translate(0 ${o.headY||0}) rotate(${o.headR||0})">${head(o)}${o.head||''}</g>`;
  s+=o.over||'';
  return `<g transform="translate(${o.x} ${o.y}) scale(${o.flip?-o.s:o.s} ${o.s})">${s}</g>`;
}
function bust(o){
  const F=o.fur,C=o.c;
  let s=`<ellipse cx="0" cy="50" rx="30" ry="26" fill="${F}" ${S()}/><ellipse cx="0" cy="54" rx="17" ry="20" fill="#fff"/>`;
  s+=`<g>${head(o)}${o.head||''}</g>`;
  return `<g transform="translate(${o.x} ${o.y}) scale(${o.s})">${s}</g>`;
}

/* ================= Objets ================= */
const boneEnd=(x,y)=>`<circle cx="${x}" cy="${y-4}" r="5" fill="#fff8e6" ${S()}/><circle cx="${x}" cy="${y+4}" r="5" fill="#fff8e6" ${S()}/>`;
function bone(x,y,r,s=1,tape=null){
  return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${boneEnd(-17,0)}${boneEnd(17,0)}<rect x="-18" y="-4" width="36" height="8" fill="#fff8e6" ${S()}/><rect x="-18.5" y="-2.8" width="4" height="5.6" fill="#fff8e6"/><rect x="14.5" y="-2.8" width="4" height="5.6" fill="#fff8e6"/>${tape?`<rect x="-5" y="-6.5" width="10" height="13" rx="2" fill="${tape}" ${S(1.8)}/><path d="M-2-4v8M2-4v8" stroke="#fff" stroke-width="1.2" opacity=".8"/>`:''}</g>`;
}
function boneHalf(x,y,r,s=1){
  return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${boneEnd(-12,0)}<path d="M-13-4H6l-3 2.5 4 2-3 3.5H-13z" fill="#fff8e6" ${S()}/><rect x="-13.5" y="-2.8" width="4" height="5.6" fill="#fff8e6"/></g>`;
}
function dumbbell(x,y,r,k=1){
  return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${k})"><rect x="-10" y="-1.8" width="20" height="3.6" fill="#b9c0cc" ${S(1.6)}/><rect x="-15" y="-7" width="6" height="14" rx="2" fill="#3b4256" ${S(1.6)}/><rect x="9" y="-7" width="6" height="14" rx="2" fill="#3b4256" ${S(1.6)}/></g>`;
}
function trophy(x,y,s=1){
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12-14q-10 0-8 9q2 6 9 6M12-14q10 0 8 9q-2 6-9 6" fill="none" ${S(2.6)}/><path d="M-13-17h26v8q0 17-13 19q-13-2-13-19z" fill="#ffd34d" ${S()}/><path d="M-8-13v6q0 6 3 10" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8" fill="none"/><rect x="-3" y="10" width="6" height="7" fill="#ffd34d" ${S()}/><rect x="-12" y="17" width="24" height="7" rx="2" fill="#3b4256" ${S()}/>${star(0,-5,4.5,'#fff',1.2)}</g>`;
}
function testTube(x,y,r,col){
  return `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-4.5-14v22a4.5 4.5 0 0 0 9 0v-22" fill="#eaf7ff" ${S()}/><path d="M-4.5 0h9v8a4.5 4.5 0 0 1-9 0z" fill="${col}"/><path d="M-4.5-14v22a4.5 4.5 0 0 0 9 0v-22" fill="none" ${S()}/><path d="M-6.5-14h13" ${S(2.6)}/><circle cx="-1" cy="-20" r="2" fill="${col}" ${S(1.2)}/><circle cx="2.5" cy="-26" r="1.5" fill="${col}" ${S(1.2)}/></g>`;
}
function dna(x,y,r,s,c){
  let rungs='';for(let i=0;i<6;i++){const yy=-18+i*7.2;rungs+=`<path d="M${-5+Math.abs(Math.sin(i))*2} ${yy+3}h${10-Math.abs(Math.sin(i))*4}" stroke="${OUT}" stroke-width="1.6"/>`;}
  return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${rungs}<path d="M-7-20q14 10 0 20q-14 10 0 20" fill="none" stroke="${OUT}" stroke-width="6.5" stroke-linecap="round"/><path d="M-7-20q14 10 0 20q-14 10 0 20" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><path d="M7-20q-14 10 0 20q14 10 0 20" fill="none" stroke="${OUT}" stroke-width="6.5" stroke-linecap="round"/><path d="M7-20q-14 10 0 20q14 10 0 20" fill="none" stroke="#ffd34d" stroke-width="3.5" stroke-linecap="round"/></g>`;
}
function loupe(x,y,r){
  return `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-2.6" y="9" width="5.2" height="15" rx="2.4" fill="#8a5a2b" ${S()}/><circle r="10.5" fill="#dff3ff" fill-opacity=".85" stroke="${OUT}" stroke-width="4.2"/><circle r="10.5" fill="none" stroke="#c7cad6" stroke-width="1.6"/><path d="M-5-3a6 6 0 0 1 5-3.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/></g>`;
}
function teddy(x,y,s=1){
  const T='#d9a066';
  return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-8" cy="-14" r="4.5" fill="${T}" ${S()}/><circle cx="8" cy="-14" r="4.5" fill="${T}" ${S()}/><ellipse cy="5" rx="10" ry="9" fill="${T}" ${S()}/><circle cy="-7" r="9" fill="${T}" ${S()}/><ellipse cy="-4.5" rx="4" ry="3" fill="#f3d6ad"/><circle cx="-3.3" cy="-9" r="1.4" fill="${OUT}"/><circle cx="3.3" cy="-9" r="1.4" fill="${OUT}"/><path d="M-1.4-5.5h2.8l-1.4 1.6z" fill="${OUT}"/>${heart(0,6,.45)}</g>`;
}
function neuron(x,y,r,n,glow){
  let s='';
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2-Math.PI/2+.3,L=r*1.9,bx=x+Math.cos(a)*L,by=y+Math.sin(a)*L;
    s+=`<path d="M${x} ${y}L${bx.toFixed(1)} ${by.toFixed(1)}" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${y}L${bx.toFixed(1)} ${by.toFixed(1)}" stroke="#ffe36b" stroke-width="2.4" stroke-linecap="round"/>`;
    const a1=a-.5,a2=a+.5,l2=r*.8;
    s+=`<path d="M${bx.toFixed(1)} ${by.toFixed(1)}l${(Math.cos(a1)*l2).toFixed(1)} ${(Math.sin(a1)*l2).toFixed(1)}M${bx.toFixed(1)} ${by.toFixed(1)}l${(Math.cos(a2)*l2).toFixed(1)} ${(Math.sin(a2)*l2).toFixed(1)}" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return (glow?`<circle cx="${x}" cy="${y}" r="${r*2.3}" fill="#fff6b0" opacity=".55"/>`:'')+s+`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe36b" ${S()}/><circle cx="${x-r*.3}" cy="${y-r*.3}" r="${r*.3}" fill="#fff"/>`;
}
function link(a,b,spark){
  return `<path d="M${a[0]} ${a[1]}Q${(a[0]+b[0])/2} ${(a[1]+b[1])/2-8} ${b[0]} ${b[1]}" fill="none" stroke="${OUT}" stroke-width="4.6" stroke-linecap="round"/><path d="M${a[0]} ${a[1]}Q${(a[0]+b[0])/2} ${(a[1]+b[1])/2-8} ${b[0]} ${b[1]}" fill="none" stroke="#ffe36b" stroke-width="2" stroke-linecap="round" stroke-dasharray="${spark?'4 3':'none'}"/>`;
}
function battery(x,y,lvl,col){
  let bars='';for(let i=0;i<4;i++){const on=i<lvl;bars+=`<rect x="-9" y="${16-i*10}" width="18" height="7" rx="2" fill="${on?col:'#fff'}" ${on?S(1.4):'stroke="#c9cdd8" stroke-width="1.2"'}/>`;}
  return `<g transform="translate(${x} ${y})"><rect x="-5" y="-30" width="10" height="5" rx="1.5" fill="#3b4256" ${S(1.8)}/><rect x="-13.5" y="-26" width="27" height="52" rx="6" fill="#fff" ${S(2.8)}/>${bars}</g>`;
}
function pinwheel(x,y,r,col,fast){
  let s='';const cols=[col,'#ffd34d','#ff6f91','#fff'];
  for(let i=0;i<4;i++) s+=`<path transform="rotate(${i*90+15})" d="M0 0L0-${r}Q${r*.9}-${r*.9} ${r*.35} 0Z" fill="${cols[i]}" ${S(2)}/>`;
  const arcs=fast?`<path d="M${-r-6} ${-r*.2}a${r+6} ${r+6} 0 0 1 ${r*.7} ${-r-3}M${r+6} ${r*.2}a${r+6} ${r+6} 0 0 1 ${-r*.7} ${r+3}" ${S(2)} fill="none"/>`:'';
  return `<g transform="translate(${x} ${y})"><path d="M0 0l2 ${r*2.3}" ${S(3.6)} stroke="#8a5a2b"/><path d="M0 0l2 ${r*2.3}" stroke="#c98a4b" stroke-width="1.6"/>${arcs}${s}<circle r="3" fill="#fff" ${S(1.6)}/></g>`;
}
function breath(x,y,n,len){
  let s='';for(let i=0;i<n;i++){const yy=y+(i-(n-1)/2)*8;s+=`<path d="M${x} ${yy}q${len*.25}-5 ${len*.5} 0t${len*.5} 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M${x} ${yy}q${len*.25}-5 ${len*.5} 0t${len*.5} 0" fill="none" stroke="${OUT}" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`;}
  return s;
}
const bubble=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#e3f9ff" fill-opacity=".8" ${S(1.6)}/><path d="M${x-r*.5} ${y-r*.2}a${r*.55} ${r*.55} 0 0 1 ${r*.45} -${r*.4}" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
function walker(){ // repères locaux de l'écureuil
  const G='#9aa3b5';
  return tube('M-27 28V58M27 28V58',2.6,G)+tube('M-27 28H27',3,G)+tube('M-27 44H27',2.2,G)+`<circle cx="-27" cy="60" r="3.6" fill="#3b4256" ${S(1.6)}/><circle cx="27" cy="60" r="3.6" fill="#3b4256" ${S(1.6)}/><rect x="-31" y="25" width="9" height="6" rx="3" fill="#3b4256" ${S(1.4)}/><rect x="22" y="25" width="9" height="6" rx="3" fill="#3b4256" ${S(1.4)}/>`;
}
function microscope(x,y,c){
  return `<g transform="translate(${x} ${y})"><rect x="-17" y="20" width="34" height="8" rx="3" fill="${dark(c)}" ${S()}/><path d="M7 20V6q0-12-9-17" fill="none" stroke="${OUT}" stroke-width="9" stroke-linecap="round"/><path d="M7 20V6q0-12-9-17" fill="none" stroke="#c7cad6" stroke-width="4.5" stroke-linecap="round"/><g transform="rotate(-28)"><rect x="-13" y="-14" width="10" height="24" rx="3" fill="#c7cad6" ${S()}/><rect x="-14" y="-19" width="12" height="6" rx="2" fill="${dark(c)}" ${S(1.6)}/></g><rect x="-16" y="9" width="22" height="4" rx="1" fill="#e9ebf2" ${S(1.6)}/>${sparkle(-20,-4,4,'#ffe36b')}</g>`;
}
function cloudP(x,y,s){return `<path transform="translate(${x} ${y}) scale(${s})" d="M-14 6a9 9 0 0 1 4-15a12 12 0 0 1 22 2a8 8 0 0 1 4 13z" fill="#fff" ${S(2/s)}/>`;}

/* ---- accessoires de tête (repère tête) ---- */
const glasses=()=>`<circle cx="-8" cy="1" r="7" fill="#fff" fill-opacity=".25" stroke="${OUT}" stroke-width="2.6"/><circle cx="8" cy="1" r="7" fill="#fff" fill-opacity=".25" stroke="${OUT}" stroke-width="2.6"/><path d="M-1 0q1-2 2 0M-15 0l-7-3M15 0l7-3" ${S(2.2)} fill="none"/>`;
const goggles=(c,y=1)=>`<path d="M-23 ${y}q23-9 46 0" fill="none" stroke="${dark(c)}" stroke-width="4"/><ellipse cx="-8" cy="${y}" rx="8" ry="6.6" fill="#bfe8f5" fill-opacity=".85" ${S(2.4)}/><ellipse cx="8" cy="${y}" rx="8" ry="6.6" fill="#bfe8f5" fill-opacity=".85" ${S(2.4)}/><path d="M-11 ${y-3}l3-2M5 ${y-3}l3-2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`;
const headband=c=>`<path d="M-22-9q22-11 44 0" fill="none" stroke="${OUT}" stroke-width="9.5" stroke-linecap="round"/><path d="M-22-9q22-11 44 0" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M-20-9.5q20-9.5 40 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M21-8l8 7M22-9l9 2" stroke="${OUT}" stroke-width="6.5" stroke-linecap="round"/><path d="M21-8l8 7M22-9l9 2" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`;
const mortar=()=>`<g transform="translate(0 -21) rotate(-6)"><path d="M-12 0v6q12 6 24 0v-6" fill="#2b3044" ${S(2)}/><path d="M-26-2l26-10l26 10l-26 10z" fill="#2b3044" ${S(2)}/><path d="M0-2l18 5v12" stroke="#ffd34d" stroke-width="2.2" fill="none"/><circle cx="18" cy="16" r="3" fill="#ffd34d" ${S(1.2)}/></g>`;

/* ================= Scènes ================= */
// Disque intérieur : centre (100,92), rayon 64
function scene(k,n){
  const c=k.c, F=mix(c,'#ffffff',.9), base={fur:F,c};
  const Q=o=>squirrel(Object.assign({},base,o));
  const B=o=>bust(Object.assign({},base,o));
  const ST={x:84,y:82,s:1.0};
  switch(k.id){
  case 'dev':
    if(n===1) return `<rect x="34" y="122" width="132" height="14" rx="6" fill="${mix(c,'#ffffff',.35)}" ${S()}/><path d="M44 129h112" stroke="#fff" stroke-width="2" stroke-dasharray="5 5"/>`+Q({pose:'lie',x:72,y:100,s:1.08,eyes:'open',mouth:'smile'});
    if(n===2) return Q({pose:'sit',x:90,y:80,s:1.12,eyes:'open',mouth:'smile',armL:[[-13,26],[-25,38]],armR:[[13,26],[25,38]]})+sparkle(52,60,4,'#fff');
    return Q(Object.assign({},ST,{eyes:'happy',mouth:'open',armL:[[-12,22],[-24,6]],armR:[[12,22],[25,5]]}))+star(46,52,6)+star(150,128,5);
  case 'neuro':{
    const H=B({x:100,y:126,s:1.45,eyes:n===3?'happy':'open',mouth:n===3?'open':(n===2?'smile':'o')});
    if(n===1) return H+neuron(100,54,7,3,false);
    if(n===2) return H+link([82,56],[124,46],true)+neuron(82,56,6.5,4,true)+neuron(124,46,5.5,3,false);
    return H+link([62,64],[88,40],true)+link([88,40],[124,38],true)+link([124,38],[146,64],true)+link([88,40],[108,62],true)+link([108,62],[146,64],true)
      +neuron(62,64,5,3,true)+neuron(88,40,6,4,true)+neuron(124,38,6,4,true)+neuron(146,64,5,3,true)+neuron(108,62,4.5,3,true)+bolt(44,46,.6,-15)+bolt(160,40,.55,20);}
  case 'marche':
    if(n===1) return Q(Object.assign({},ST,{y:76,eyes:'open',mouth:'flat',armL:[[-12,24],[-26,28]],armR:[[12,24],[26,28]],over:walker()}));
    if(n===2) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armL:[[-12,24],[-25,30]],armR:[[12,24],[24,36]],
       over:`<path d="M24 34L30 60" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M24 34L30 60" stroke="#c98a4b" stroke-width="3" stroke-linecap="round"/><path d="M16 32q2-8 8-2" fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M16 32q2-8 8-2" fill="none" stroke="#c98a4b" stroke-width="3" stroke-linecap="round"/>`}));
    return `<g fill="${dark(c)}" opacity=".5">${[[44,150,-15],[58,142,15],[72,152,-15]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="3.6" ry="5.5"/><circle cx="-3" cy="-8" r="1.5"/><circle cx="0" cy="-9" r="1.5"/><circle cx="3" cy="-8" r="1.5"/></g>`).join('')}</g>`
      +Q(Object.assign({},ST,{x:96,eyes:'happy',mouth:'open',armL:[[-12,22],[-24,6]],armR:[[12,24],[26,32]],feet:[[-9,52.5,0],[12,47,-28]]}))+motion(128,140)+star(48,56,6);
  case 'ortho':
    if(n===1) return Q(Object.assign({},ST,{eyes:'sad',mouth:'sad',armL:[[-12,24],[-24,30]],armR:[[12,24],[24,30]],
       over:boneHalf(-30,28,-20,.9)+`<g transform="scale(-1 1)">${boneHalf(-30,28,-20,.9)}</g>`}))+sweat(66,64);
    if(n===2) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armL:[[-12,24],[-18,32]],armR:[[12,24],[18,32]],over:bone(0,32,0,1,c)}));
    return Q(Object.assign({},ST,{y:90,s:1.02,eyes:'happy',mouth:'open',armL:[[-12,22],[-17,-30]],armR:[[12,22],[17,-30]],over:bone(0,-34,-8,1.1,c)}))
      +sparkle(52,44,5,'#ffe36b')+sparkle(146,40,6,'#ffe36b')+sparkle(156,72,4,'#fff');
  case 'trauma':
    if(n===1) return Q({pose:'sit',x:80,y:66,s:1.1,eyes:'sad',mouth:'flat',armR:[[13,26],[20,36]],
       feet:[[-17,51,-18]],over:`<g transform="translate(8 44) rotate(-8) scale(1.2)">
  <rect x="2" y="7" width="44" height="10" rx="5" fill="${mix(c,'#ffffff',.55)}" ${S()}/>
  <path d="M8 9h32" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3"/>
  <rect x="0" y="-9" width="38" height="17" rx="7" fill="#fff" ${S(2.6)}/>
  <path d="M9-9v17M19-9v17M29-9v17" stroke="#e1e4eb" stroke-width="1.6"/>
  <ellipse cx="41" cy="-1" rx="5" ry="7" fill="${F}" ${S(2.2)}/>
  <path d="M44-5h2M45-1h2M44 3h2" ${S(1.4)}/>
  ${heart(10,-1,.38,c)}${star(22,-1,4,'#ffd34d',1.1)}<path d="M27 1q2-4 4 0t4 0" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
</g>`});
    if(n===2) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armL:[[-12,24],[-24,34]],armR:[[12,24],[24,34]],
       hands:`<path d="M-15.5 27.2L-21 31.8" stroke="${OUT}" stroke-width="12" stroke-linecap="round"/><path d="M-15.5 27.2L-21 31.8" stroke="#fff" stroke-width="8.4" stroke-linecap="round"/><path d="M-14.5 30.5l3-4.5M-17.5 33l3-4.5M-20.5 35l3-4.5" stroke="#d9dce4" stroke-width="1.4"/>`,
       over:`<rect x="3" y="44" width="10" height="7" rx="2" transform="rotate(-20 8 47)" fill="#f6c99b" ${S(1.6)}/>`}));
    return Q(Object.assign({},ST,{y:72,eyes:'happy',mouth:'open',head:headband(c),armL:[[-12,22],[-25,4]],armR:[[12,22],[26,3]],feet:[[-10,51,20],[10,51,-20]]}))
      +`<path d="M78 148q-4 4 0 8M98 148q4 4 0 8" ${S(2)} fill="none"/>`+star(46,50,6)+star(154,124,5);
  case 'force':
    if(n===1) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armR:[[12,24],[27,30],[26,14]],over:dumbbell(26,12,-10,.7)}));
    if(n===2) return Q(Object.assign({},ST,{eyes:'effort',mouth:'grit',armL:[[-12,24],[-27,30],[-26,14]],armR:[[12,24],[27,30],[26,14]],over:dumbbell(-26,12,10,1.05)+dumbbell(26,12,-10,1.05)}))+sweat(64,52)+sweat(56,64);
    return Q(Object.assign({},ST,{x:82,y:90,s:.98,eyes:'happy',mouth:'open',armL:[[-12,22],[-24,-26]],armR:[[12,22],[24,-26]],
       over:`<rect x="-46" y="-29.5" width="92" height="5" rx="2" fill="#b9c0cc" ${S(1.8)}/>`+[-44,-36,36,44].map((x,i)=>`<rect x="${x-4}" y="${i%3?-40:-44}" width="8" height="${i%3?26:34}" rx="2.5" fill="#3b4256" ${S(1.8)}/>`).join('')}))
      +trophy(146,124,.95)+sparkle(160,98,4,'#ffe36b');
  case 'nm':
    if(n===1) return Q({pose:'sit',x:76,y:82,s:1.08,flip:true,eyes:'tired',mouth:'flat'})+battery(142,96,1,'#f05a4f');
    if(n===2) return Q(Object.assign({},ST,{x:74,flip:true,eyes:'open',mouth:'smile'}))+battery(144,92,2,'#ffb020')
      +`<path d="M144 122q0 16 -14 22" fill="none" ${S(3)}/>`+bolt(144,92,.8);
    return Q(Object.assign({},ST,{x:76,flip:true,eyes:'star',mouth:'open',armL:[[-12,24],[-27,22],[-26,6]],armR:[[12,24],[27,22],[26,6]]}))
      +battery(146,98,4,'#3ccf6e')+bolt(146,60,.8,10)+bolt(42,54,.7,-15)+bolt(128,40,.55,25)+sparkle(160,130,4,'#ffe36b');
  case 'gen':{
    const coat=`<path d="M-15 22q-3 14 -1 28h32q2-14-1-28z" fill="#fff" ${S()}/><path d="M-6 19l6 14l6-14" fill="none" ${S(2)}/><circle cx="0" cy="38" r="1.4" fill="${OUT}"/><circle cx="0" cy="44" r="1.4" fill="${OUT}"/><rect x="6" y="36" width="6" height="4" rx="1" fill="${c}" ${S(1.2)}/>`;
    if(n===1) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armR:[[12,24],[26,28],[27,18]],over:testTube(27,10,12,c)}));
    if(n===2) return Q(Object.assign({},ST,{eyes:'open',mouth:'open',mid:coat,head:goggles(c),armR:[[12,24],[26,28],[27,18]],armL:[[-12,24],[-24,30]],over:dna(30,2,10,.7,c)+testTube(-26,30,-20,'#3ccf6e')}));
    return Q(Object.assign({},ST,{x:80,y:84,eyes:'happy',mouth:'open',mid:coat,head:goggles(c,-14),armL:[[-12,22],[-24,6]],armR:[[12,24],[24,34]],over:dna(-24,-8,-10,.65,c)}))
      +`<g transform="translate(136 122) scale(.85) translate(-136 -122)">${microscope(136,122,c)}</g>`+sparkle(150,52,5,'#ffe36b');}
  case 'resp':{
    const H=o=>B(Object.assign({x:74,y:96,s:1.32},o));
    if(n===1) return H({eyes:'open',mouth:'o'})+breath(98,116,2,22)+bubble(132,100,5)+bubble(144,88,3.5)+bubble(126,84,2.5);
    if(n===2) return H({eyes:'open',mouth:'blow2'})+pinwheel(146,72,14,c,false)+breath(100,116,3,26);
    return H({eyes:'effort',mouth:'blow3',headR:-4})+pinwheel(146,70,13,c,true)+breath(102,114,3,34)
      +`<path d="M104 92q26-18 50-2q8 9 0 14q-9 4-11-5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`
      +bubble(150,126,6.5)+bubble(162,104,4.5)+bubble(132,136,4)+cloudP(52,44,.8);}
  case 'dlr':
    if(n===1) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armR:[[12,24],[22,22]],over:heart(26,20,1)}));
    if(n===2) return Q(Object.assign({},ST,{eyes:'happy',mouth:'smile',armL:[[-12,24],[-12,38],[0,38]],armR:[[12,24],[12,38],[0,38]],mid:teddy(0,34,1)}))+heart(140,52,.7);
    return `<g>${[[48,52,.8],[150,46,.9],[162,96,.7],[40,104,.7],[124,30,.6],[70,32,.55]].map(([x,y,s])=>heart(x,y,s)).join('')}</g>`
      +Q(Object.assign({},ST,{eyes:'happy',mouth:'open',armL:[[-12,24],[-12,38],[0,38]],armR:[[12,24],[12,38],[0,38]],mid:teddy(0,34,1)}));
  case 'meth':
    if(n===1) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',armR:[[12,24],[27,28],[28,16]],over:loupe(29,4,25)}));
    if(n===2) return Q(Object.assign({},ST,{eyes:'open',mouth:'smile',head:glasses(),armR:[[12,24],[27,28],[28,16]],over:loupe(29,4,25)}));
    return Q(Object.assign({},ST,{eyes:'open',mouth:'open',head:glasses()+mortar(),armR:[[12,24],[27,28],[28,16]],armL:[[-12,24],[-24,6]],over:loupe(29,4,25)+`<g transform="translate(-28 -4) rotate(-12)"><rect x="-8" y="-10" width="16" height="20" rx="2" fill="#fff" ${S(1.8)}/><rect x="-4" y="-12" width="8" height="4" rx="1" fill="${c}" ${S(1.2)}/><path d="M-4-3l2 2 4-4M-4 4l2 2 4-4" ${S(1.4)} fill="none" stroke="#2e9e5b"/></g>`}))+star(150,124,5);
  }
}

/* ================= Cadres cartoon ================= */
const CX=100, CY=92, RIN=64;
function scallop(R,n,br){let p='';for(let i=0;i<=n;i++){const a=i*2*Math.PI/n-Math.PI/2,x=CX+R*Math.cos(a),y=CY+R*Math.sin(a);p+=i?`A${br} ${br} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`:`M${x.toFixed(1)} ${y.toFixed(1)}`;}return p+'Z';}
function sunburst(r1,r2,n){let p='';for(let i=0;i<n;i++){const a=i*2*Math.PI/n-Math.PI/2,b=a+Math.PI/n,c2=a+2*Math.PI/n;
  const P=(r,t)=>`${(CX+r*Math.cos(t)).toFixed(1)} ${(CY+r*Math.sin(t)).toFixed(1)}`;
  p+=(i?'':'M'+P(r1,a))+`Q${P(r2*1.04,b)} ${P(r1,c2)}`;}return p+'Z';}
function rays(R,n,col){let s='';for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=a+Math.PI/n*.6;s+=`<path d="M${CX} ${CY}L${(CX+R*Math.cos(a)).toFixed(1)} ${(CY+R*Math.sin(a)).toFixed(1)}L${(CX+R*Math.cos(b)).toFixed(1)} ${(CY+R*Math.sin(b)).toFixed(1)}Z" fill="${col}"/>`;}return s;}
function wing(side){
  const g=`<path d="M2-6C-10-18-38-20-46-10A6.5 6.5 0 0 0-41 0A6.5 6.5 0 0 0-35 10A6.5 6.5 0 0 0-25 17C-14 18-2 10 2-6Z" fill="#fffbe6" ${S(2.6)}/><path d="M-40 0q12-2 22-6M-34 10q10-2 16-10" fill="none" stroke="#e8c45a" stroke-width="1.8" stroke-linecap="round"/>`;
  return side<0?`<g transform="translate(${CX-72} ${CY})">${g}</g>`:`<g transform="translate(${CX+72} ${CY}) scale(-1 1)">${g}</g>`;
}
function banner(n,c){
  const y=150, col=n?c:'#c9c2b4', dk=n?dark(c):'#a39b8c';
  let s=`<path d="M44 ${y+6}h18v22H44l7-11z" fill="${dk}" ${S()}/><path d="M156 ${y+6}h-18v22h18l-7-11z" fill="${dk}" ${S()}/>`;
  s+=`<path d="M56 ${y}Q100 ${y-9} 144 ${y}V${y+22}Q100 ${y+13} 56 ${y+22}Z" fill="${col}" ${S(2.8)}/>`;
  s+=`<path d="M62 ${y+4}Q100 ${y-4} 138 ${y+4}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5" stroke-dasharray="3 3"/>`;
  if(n){const sp=17,x0=CX-(n-1)*sp/2;for(let i=0;i<n;i++)s+=star(x0+i*sp,y+8.5,8,'#ffd34d',1.8);}
  else s+=`<g transform="translate(${CX} ${y+9})"><path d="M-4-2v-4a4 4 0 0 1 8 0v4" fill="none" ${S(2.2)}/><rect x="-6.5" y="-2.5" width="13" height="10" rx="2" fill="#fff" ${S(2)}/></g>`;
  return s;
}
const METAL=[null,{m:'#df9257',d:'#a85f2c',h:'#ffd2a8'},{m:'#dfe4ec',d:'#98a1b3',h:'#ffffff'},{m:'#ffd23f',d:'#e39a00',h:'#fff6c2'}];

let uid=0;
function badgeSVG(catId,n){
  const k=CATS.find(x=>x.id===catId),c=k.c,id='b'+(uid++);
  let rim='',deco='',bg='';
  const shape = n===0?`<circle cx="${CX}" cy="${CY}" r="78"/>` : n===1?`<circle cx="${CX}" cy="${CY}" r="79"/>` : n===2?`<path d="${scallop(76,14,17.5)}"/>`:`<path d="${sunburst(80,94,16)}"/>`;
  const M=METAL[n];
  if(n===0){
    rim=`<g transform="translate(0 5)" fill="${OUT}" opacity=".12">${shape}</g><g fill="#e8e3da" stroke="#b9b2a4" stroke-width="3">${shape}</g><circle cx="${CX}" cy="${CY}" r="72" fill="none" stroke="#cfc8bb" stroke-width="3" stroke-dasharray="6 6"/>`;
  } else {
    rim=`<g transform="translate(0 6)" fill="${OUT}" opacity=".22">${shape}</g>`
       +(n===3?wing(-1)+wing(1):'')
       +`<g fill="${M.m}" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round">${shape}</g>`
       +`<circle cx="${CX}" cy="${CY}" r="${RIN+5}" fill="none" stroke="${M.d}" stroke-width="7"/>`
       +`<path d="M${CX-58} ${CY-36}A68 68 0 0 1 ${CX-30} ${CY-62}" stroke="${M.h}" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="${CX-20}" cy="${CY-67}" r="2.6" fill="${M.h}"/>`;
    if(n===2) for(let i=0;i<14;i++){const a=(i+.5)*2*Math.PI/14-Math.PI/2;rim+=`<circle cx="${(CX+79*Math.cos(a)).toFixed(1)}" cy="${(CY+79*Math.sin(a)).toFixed(1)}" r="2.6" fill="#fff" stroke="${M.d}" stroke-width="1.4"/>`;}
    if(n===3) deco=sparkle(CX-82,CY-58,7,'#fff6c2')+sparkle(CX+84,CY-54,6,'#fff6c2')+sparkle(CX+90,CY+40,4.5,'#fff');
  }
  if(n===0) bg=`<circle cx="${CX}" cy="${CY}" r="${RIN}" fill="#f1ede6"/>`;
  if(n===1) bg=`<circle cx="${CX}" cy="${CY}" r="${RIN}" fill="${mix(c,'#ffffff',.6)}"/>`;
  if(n===2) bg=`<circle cx="${CX}" cy="${CY}" r="${RIN}" fill="${mix(c,'#ffffff',.55)}"/><circle cx="${CX}" cy="${CY+6}" r="46" fill="${mix(c,'#ffffff',.78)}"/>`;
  if(n===3) bg=`<circle cx="${CX}" cy="${CY}" r="${RIN}" fill="${mix(c,'#ffffff',.42)}"/>${rays(110,18,'rgba(255,255,255,.4)')}<circle cx="${CX}" cy="${CY+6}" r="34" fill="#fff" opacity=".35"/>`;

  const content = n===0
    ? `<g filter="url(#sil${id})" opacity=".8">${scene(k,1)}</g><g transform="translate(140 52)"><circle r="15" fill="#fff" stroke="#b9b2a4" stroke-width="2.6"/><text y="7" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="20" fill="#a39b8c">?</text></g>`
    : scene(k,n);

  return `<svg viewBox="-22 0 244 186" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${k.nom} – ${NIV[n]}">
  <defs><filter id="sil${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.72  0 0 0 0 0.67  0 0 0 1 0"/></filter><clipPath id="cl${id}"><circle cx="${CX}" cy="${CY}" r="${RIN}"/></clipPath></defs>
  ${rim}
  <g clip-path="url(#cl${id})">${bg}${content}</g>
  <circle cx="${CX}" cy="${CY}" r="${RIN}" fill="none" stroke="${n?OUT:'#b9b2a4'}" stroke-width="3"/>
  ${deco}${banner(n,c)}
</svg>`;
}


window.badgeSVG = badgeSVG;
window.BADGE_CATS = CATS;
window.BADGE_NIVEAUX = NIV;
})();
