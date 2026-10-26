/* تطبيق لولو — app logic. All data stays on this device (localStorage). */
(function(){
'use strict';
const QS = window.LULU_Q || [], PASS = window.LULU_PASSAGES || {};
const QBY = Object.fromEntries(QS.map(q=>[q.id,q]));
const KEY='lulu.v1', DAY=864e5;
// ---- Parent daily report (Google Apps Script web app owned by the dad). Paste the /exec URL here. ----
const REPORT_URL='https://script.google.com/macros/s/AKfycbxH4po-nSwPbtrXbYD7h93aIO2akbDuh1NtztlgL1Cx8KHCnZ8cKzj3LS8ep3k8WHqnxQ/exec';            // e.g. 'https://script.google.com/macros/s/XXXX/exec'
const REPORT_TOKEN='lulu-bdc13450439785ff';  // must match TOKEN in the Apps Script code
const TYPES = {
  analogy:{n:'التناظر اللفظي',e:'🔗',s:'v'}, completion:{n:'إكمال الجمل',e:'✍️',s:'v'}, error:{n:'الخطأ السياقي',e:'🕵️',s:'v'},
  reading:{n:'استيعاب المقروء',e:'📖',s:'v'}, odd:{n:'المفردة الشاذة',e:'🦄',s:'v'},
  arith:{n:'الحساب',e:'🧮',s:'q'}, algebra:{n:'الجبر',e:'🔣',s:'q'}, geometry:{n:'الهندسة',e:'📐',s:'q'}, stats:{n:'الإحصاء والتحليل',e:'📊',s:'q'}, compare:{n:'المقارنات',e:'⚖️',s:'q'}
};
const SECS={v:{n:'اللفظي',e:'📚'},q:{n:'الكمّي',e:'🔢'}};
const LET=['أ','ب','ج','د'];
const LEVELS=[[0,'مبتدئة','🌱'],[100,'مستكشفة','🔍'],[250,'متحمّسة','⚡'],[500,'ذكية','💡'],[850,'مثابرة','💪'],[1300,'لامعة','✨'],[1900,'نجمة','⭐'],[2600,'محترفة','🎯'],[3500,'عبقرية','🧠'],[4600,'بطلة','🏆'],[6000,'أسطورة','👑']];
const STICKERS='🦄🌈🍩🐱🌸🚀🎀🐧🍓⭐🦋🌙🧁🐼🍉🐬🌻🎈🦊🍭💎🐝🌵🪐'.match(/\p{Extended_Pictographic}/gu);
const BOX_DAYS=[0,1,3,7,14];
const PRAISE=['أحسنتِ يا بطلة! 🌟','واو! عقلك ذهب 💛','صح عليكِ! 🎯','كفو والله! 🔥','ممتاز يا {n}! ✨','إبداع! كمّلي 🚀','شاطرة! 💜','رهيبة! 🦄'];
const SOFT=['ولا يهمك، هذي فرصة نتعلم منها 💜','قريبة! خلينا نشوف الحيلة 👀','الخطأ جزء من التعلّم، يا بطلة 🌱','عادي! الحين بتعرفينها للأبد 🧠','ما عليه، الشرح بيوضحها 👇'];
const HOME_TALK=['جاهزة لثلاث أسئلة بس؟ 😄','كل سؤال يقرّبك من هدفك 🎯','شوي كل يوم أحسن من كثير مرة وحدة 🌱','مخك يحب الأشياء الصغيرة السريعة ⚡','أنا فخورة فيكِ يا {n} 💜','خذي نفس، ويلا نبدأ 🌬️'];

// ---------- state ----------
function fresh(){return {v:1,onboarded:false,name:'',goal:10,set:{timer:false,sfx:true,digits:'ar',calm:false,calmAnim:false},xp:0,
  qs:{},ts:{},mist:{},mastered:[],days:{},streak:{n:0,last:null,freeze:1,best:0},badges:[],stickers:[],hist:[],mocks:[],mockOpen:false,rounds:0,bestCombo:0,created:Date.now()};}
let S; try{S=Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY)||'{}'));S.set=Object.assign(fresh().set,S.set||{});S.streak=Object.assign(fresh().streak,S.streak||{});}catch(e){S=fresh();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast('تعذّر الحفظ على الجهاز');}}
const today=()=>dkey(new Date());
function dkey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dayDiff(a,b){return Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/DAY);}
const nm=()=>S.name||'بطلة';
const pick=a=>a[Math.floor(Math.random()*a.length)];
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function level(xp){let i=0;while(i+1<LEVELS.length&&xp>=LEVELS[i+1][0])i++;const cur=LEVELS[i],nx=LEVELS[i+1];return {i,name:cur[1],em:cur[2],from:cur[0],to:nx?nx[0]:cur[0],pct:nx?(xp-cur[0])/(nx[0]-cur[0]):1};}
function dayRec(){return S.days[today()]||(S.days[today()]={q:0,c:0,xp:0});}
function totalAnswered(){return Object.values(S.ts).reduce((a,t)=>a+t.s,0);}
function totalCorrect(){return Object.values(S.ts).reduce((a,t)=>a+t.c,0);}
function dueMistakes(){const now=Date.now();return Object.entries(S.mist).filter(([id,m])=>m.due<=now&&QBY[id]).map(([id])=>id);}

// ---------- rendering helpers ----------
const $=s=>document.querySelector(s), app=$('#app');
function math(s){return String(s).replace(/\[\[([^\]]+?)\/([^\]]+?)\]\]/g,'<span class="frac"><span>$1</span><span>$2</span></span>');}
function optHTML(o){const isNum=/^[-−\d.,\[\]\/%°ط√ +]+$/.test(o)&&/\d/.test(o);const h=math(o);return isNum?`<bdi dir="ltr">${h.replace(/^-/,'−')}</bdi>`:h;}
const AR='٠١٢٣٤٥٦٧٨٩';
function digits(root){if(S.set.digits!=='ar')return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){if(n.parentNode&&n.parentNode.closest&&n.parentNode.closest('.nodig,input,textarea,style,script'))continue;const t=n.nodeValue;if(/\d/.test(t))n.nodeValue=t.replace(/(\d)\.(\d)/g,'$1٫$2').replace(/\d/g,d=>AR[d]);}}
function render(html,opts={}){app.innerHTML=html;digits(app);document.body.classList.toggle('focus',!!opts.focus);
  document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.tab===opts.tab));if(!opts.keepScroll)window.scrollTo(0,0);}
function toast(t,ms=2200){const el=$('#toast');el.textContent=t;digits(el);el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),ms);}
function modal(html,onclose){const o=$('#overlay');o.innerHTML=`<div class="modal">${html}</div>`;digits(o);o.hidden=false;o.onclick=e=>{if(e.target===o||e.target.closest('[data-close]')){o.hidden=true;o.innerHTML='';onclose&&onclose();}};}
function closeModal(){const o=$('#overlay');o.hidden=true;o.innerHTML='';}

// ---------- mascot (original SVG owl "لولو") ----------
function mascot(mood='happy',cls=''){
  const eyes = mood==='cheer' ? '<path d="M70 92q10-12 20 0M110 92q10-12 20 0" stroke="#2e1f4f" stroke-width="5" fill="none" stroke-linecap="round"/>'
   : `<circle cx="80" cy="92" r="17" fill="#fff"/><circle cx="120" cy="92" r="17" fill="#fff"/>
      <circle cx="${mood==='think'?84:82}" cy="${mood==='think'?86:94}" r="8" fill="#2e1f4f"/><circle cx="${mood==='think'?124:122}" cy="${mood==='think'?86:94}" r="8" fill="#2e1f4f"/>
      <circle cx="${mood==='think'?86:85}" cy="${mood==='think'?83:91}" r="2.6" fill="#fff"/><circle cx="${mood==='think'?126:125}" cy="${mood==='think'?83:91}" r="2.6" fill="#fff"/>
      <ellipse class="lid" opacity="0" cx="80" cy="92" rx="18" ry="18" fill="#8b5cf6"/><ellipse class="lid" opacity="0" cx="120" cy="92" rx="18" ry="18" fill="#8b5cf6"/>`;
  const extra = mood==='think' ? '<text x="160" y="50" font-size="34" font-weight="900" fill="#14b8a6">؟</text>'
   : mood==='cheer' ? '<text x="150" y="40" font-size="26">✨</text><text x="22" y="52" font-size="20">⭐</text>'
   : mood==='encourage' ? '<path d="M158 50c-6-10-20-2-10 8l10 9 10-9c10-10-4-18-10-8z" fill="#ec4899"/>' : '';
  const mouth = mood==='encourage' ? '<path d="M92 128q8 6 16 0" stroke="#2e1f4f" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
  return `<svg class="mascot ${mood} ${cls}" viewBox="0 0 200 200" role="img" aria-label="لولو البومة"><g class="body">
   <ellipse cx="100" cy="188" rx="46" ry="7" fill="#7c3aed" opacity=".15"/>
   <path class="wingL" d="M44 110c-18 10-20 40-4 52 6-14 10-30 4-52z" fill="#7c3aed"/>
   <path class="wingR" d="M156 110c18 10 20 40 4 52-6-14-10-30-4-52z" fill="#7c3aed"/>
   <path d="M100 40c-38 0-62 28-60 70 2 46 26 72 60 72s58-26 60-72c2-42-22-70-60-70z" fill="#8b5cf6"/>
   <path d="M62 52 50 24l30 18zM138 52l12-28-30 18z" fill="#7c3aed"/>
   <ellipse cx="100" cy="140" rx="36" ry="38" fill="#ddd6fe"/>
   <path d="M86 132q6 4 12 0M102 146q6 4 12 0M86 158q6 4 12 0" stroke="#a78bfa" stroke-width="3" fill="none" stroke-linecap="round"/>
   <circle cx="66" cy="112" r="8" fill="#f9a8d4" opacity=".7"/><circle cx="134" cy="112" r="8" fill="#f9a8d4" opacity=".7"/>
   ${eyes}
   <path d="M93 108l7 12 7-12z" fill="#f59e0b"/>
   ${mouth}
   <g transform="translate(118 38) rotate(18)"><path d="M0 0l-18-10v20zM0 0l18-10v20z" fill="#ec4899"/><circle r="5" fill="#db2777"/></g>
   <path d="M84 182v8M92 182v8M108 182v8M116 182v8" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
   ${extra}</g></svg>`;
}

// ---------- sound ----------
let AC=null, noise=null;
function ac(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();}if(AC.state==='suspended')AC.resume();return AC;}
function beep(seq){if(!S.set.sfx)return;const a=ac();if(!a)return;let t=a.currentTime;for(const [f,d] of seq){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.02);t+=d*.8;}}
const sfx={ok:()=>beep([[660,.12],[880,.18]]),no:()=>beep([[330,.22]]),win:()=>beep([[523,.12],[659,.12],[784,.12],[1046,.3]])};
function calmSound(on){const a=ac();if(!a)return;if(noise){try{noise.src.stop();}catch(e){}noise=null;}if(!on)return;
  const len=a.sampleRate*4,buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}
  const src=a.createBufferSource();src.buffer=buf;src.loop=true;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=600;const g=a.createGain();g.gain.value=.22;src.connect(f).connect(g).connect(a.destination);src.start();noise={src};}

// ---------- confetti ----------
const cv=$('#confetti'),cx=cv.getContext('2d');let parts=[],raf=0;
function confetti(n=80){if(S.set.calmAnim)return;cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;const cols=['#7c3aed','#ec4899','#14b8a6','#f59e0b','#a855f7','#22d3ee'];
  for(let i=0;i<n;i++)parts.push({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*.45,vx:(Math.random()-.5)*12,vy:-Math.random()*13-4,s:Math.random()*7+4,c:pick(cols),r:Math.random()*6,vr:(Math.random()-.5)*.3,l:120});
  if(!raf)raf=requestAnimationFrame(tick);}
function tick(){cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);cx.clearRect(0,0,innerWidth,innerHeight);parts=parts.filter(p=>p.l-->0&&p.y<innerHeight+20);
  for(const p of parts){p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.r+=p.vr;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore();}
  raf=parts.length?requestAnimationFrame(tick):0;if(!raf)cx.clearRect(0,0,innerWidth,innerHeight);}
function xpFloat(txt,el){const r=el?el.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0};const f=document.createElement('div');f.className='xpfloat';f.textContent=txt;digits(f);f.style.left=(r.left+r.width/2-30)+'px';f.style.top=(r.top)+'px';document.body.appendChild(f);setTimeout(()=>f.remove(),1300);}

// ---------- XP / streak / badges ----------
function addXP(n){const before=level(S.xp).i;S.xp+=n;dayRec().xp+=n;const after=level(S.xp);if(after.i>before){setTimeout(()=>{sfx.win();confetti(160);modal(`${mascot('cheer')}<h2>مستوى جديد! ${after.em}</h2><p>صرتِ <b>${after.name}</b> يا ${esc(nm())}! 🎉</p><button class="btn" data-close>يلا نكمل 🚀</button>`);},700);}}
function touchStreak(){const t=today(),st=S.streak;let msg='';
  if(st.last===t)return '';
  if(!st.last){st.n=1;}
  else{const gap=dayDiff(st.last,t);
    if(gap===1)st.n++;
    else if(gap>1&&st.freeze>=gap-1){st.freeze-=gap-1;st.n++;msg=`🛡️ استخدمنا ${gap-1===1?'درع':'دروع'} الحماية وحافظنا على سلسلتك!`;}
    else if(gap>1){st.n=1;addXP(25);msg='🌈 مرحبا بعودتك! +٢٥ نقطة مكافأة الرجوع. نبدأ سلسلة جديدة سوا 💜';}}
  st.last=t;if(st.n>st.best)st.best=st.n;if(st.n>0&&st.n%7===0&&st.freeze<3){st.freeze++;msg=(msg?msg+' ':'')+'🛡️ كسبتِ درع حماية جديد للسلسلة!';}
  return msg;}
const BADGES=[
 ['first','🎉','أول جولة','خلّصتِ أول جولة',()=>S.rounds>=1],
 ['c10','🌟','١٠ صح','١٠ إجابات صحيحة',()=>totalCorrect()>=10],
 ['c50','💫','٥٠ صح','٥٠ إجابة صحيحة',()=>totalCorrect()>=50],
 ['c100','🏅','١٠٠ صح','١٠٠ إجابة صحيحة',()=>totalCorrect()>=100],
 ['c250','🏆','٢٥٠ صح','٢٥٠ إجابة صحيحة',()=>totalCorrect()>=250],
 ['s3','🔥','٣ أيام','سلسلة ٣ أيام',()=>S.streak.best>=3],
 ['s7','🌋','أسبوع','سلسلة ٧ أيام',()=>S.streak.best>=7],
 ['s14','☄️','أسبوعين','سلسلة ١٤ يوم',()=>S.streak.best>=14],
 ['combo5','⚡','كومبو ٥','٥ صح ورا بعض',()=>S.bestCombo>=5],
 ['combo10','🌪️','كومبو ١٠','١٠ صح ورا بعض',()=>S.bestCombo>=10],
 ['perfect','💯','جولة كاملة','كل الجولة صح',()=>S.hist.some(h=>h.n>=5&&h.c===h.n)],
 ['m1','🧹','أول إتقان','أتقنتِ سؤال من بنك الأخطاء',()=>S.mastered.length>=1],
 ['m10','🧠','ذاكرة حديد','أتقنتِ ١٠ أسئلة من أخطائك',()=>S.mastered.length>=10],
 ['all','🗺️','مستكشفة','جرّبتِ كل الأنواع العشرة',()=>Object.keys(TYPES).every(t=>S.ts[t]&&S.ts[t].s>0)],
 ['mock','⏱️','تجربة حقيقية','أنهيتِ اختبارًا تجريبيًا',()=>S.mocks.length>=1],
 ['goal','🎯','هدف اليوم','حقّقتِ هدفك اليومي',()=>Object.values(S.days).some(d=>d.q>=S.goal)],
];
function checkBadges(){const n=[];for(const [id,em,name,desc,f] of BADGES){if(!S.badges.includes(id)&&f()){S.badges.push(id);n.push([em,name]);}}return n;}

// ---------- question selection ----------
function weight(q){const st=S.qs[q.id];if(!st)return 3;const acc=st.c/st.s;return acc<.5?2:acc<1?1:.3;}
function choose(pool,n,exclude=new Set()){pool=pool.filter(q=>!exclude.has(q.id));const out=[];const used=new Set();
  // weighted sample without replacement, then group reading passages adjacently
  while(out.length<n&&pool.length){let tot=0;for(const q of pool)tot+=weight(q);let r=Math.random()*tot,i=0;for(;i<pool.length;i++){r-=weight(pool[i]);if(r<=0)break;}const q=pool.splice(Math.min(i,pool.length-1),1)[0];if(!used.has(q.id)){out.push(q);used.add(q.id);}}
  return out;}
function interleave(types,n){ // mix several types evenly
  const per={};for(const t of types)per[t]=QS.filter(q=>q.type===t);const order=shuffle(types);const out=[];const ex=new Set();let k=0;
  while(out.length<n&&k<n*4){const t=order[k%order.length];const c=choose(per[t],1,ex)[0];if(c){out.push(c);ex.add(c.id);}k++;}return out;}
function buildRound(cfg){
  let qs=[];const due=shuffle(dueMistakes()).map(id=>QBY[id]);
  if(cfg.mode==='mistakes'){const all=Object.keys(S.mist).filter(id=>QBY[id]).map(id=>QBY[id]);const ids=new Set(due.map(q=>q.id));qs=due.concat(shuffle(all.filter(q=>!ids.has(q.id)))).slice(0,cfg.n);}
  else if(cfg.type){qs=choose(QS.filter(q=>q.type===cfg.type),cfg.n);}
  else if(cfg.sec){qs=interleave(Object.keys(TYPES).filter(t=>TYPES[t].s===cfg.sec),cfg.n);}
  else{qs=interleave(Object.keys(TYPES),cfg.n);}
  if(cfg.mode!=='mistakes'&&!cfg.type&&due.length){ // sprinkle up to 2 due reviews (spaced repetition + interleaving)
    const ex=new Set(qs.map(q=>q.id));const add=due.filter(q=>!ex.has(q.id)).slice(0,Math.min(2,Math.max(1,Math.floor(cfg.n/4))));
    for(const q of add){qs.splice(1+Math.floor(Math.random()*(qs.length-1)),1,q);} }
  return qs;}

// ---------- practice round ----------
let R=null;
function startRound(cfg){
  cfg=Object.assign({n:7,mode:'practice'},cfg);const qs=buildRound(cfg);
  if(!qs.length){toast(cfg.mode==='mistakes'?'بنك الأخطاء فاضي! 🎉 ما فيه شي تراجعينه':'ما فيه أسئلة هنا');return;}
  R={cfg,qs,i:0,res:[],xp:0,combo:0,hint:true,second:[],secondDone:false,t0:Date.now(),title:cfg.title||'جولة سريعة'};
  if(location.hash==='#play')showQuestion();else location.hash='#play';}
function curQ(){return R.qs[R.i];}
function showQuestion(){
  if(!R){location.hash='#home';return;}
  const q=curQ(),T=TYPES[q.type];const isSecond=R.i>=R.baseLen&&R.baseLen!=null;
  const dots=R.qs.map((x,i)=>`<i class="${i<R.res.length?(R.res[i]?'ok':'no'):i===R.i?'cur':''}"></i>`).join('');
  const passage=q.passage?`<div class="passage ${R.passClosed?'closed':''}" id="passage">${esc(PASS[q.passage].text)}</div><button class="btn ghost sm" id="ptoggle">${R.passClosed?'📖 اعرضي النص':'🙈 صغّري النص'}</button>`:'';
  render(`<div class="qtop"><button class="iconbtn" id="quit" aria-label="خروج">✕</button><div class="dots">${dots}</div>
    <button class="iconbtn ${S.set.calm?'on':''}" id="calm" aria-label="صوت هادئ">🎧</button></div>
    ${S.set.timer?'<div class="timer" id="timer"><i></i></div>':''}
    <div class="row" style="justify-content:space-between"><span class="chip ${T.s==='v'?'k':'t'}">${T.e} ${T.n}</span>${isSecond?'<span class="chip y">🔁 فرصة ثانية</span>':S.mist[q.id]?'<span class="chip y">📒 مراجعة</span>':''}${R.combo>=2?`<span class="chip y">🔥 ${R.combo}</span>`:''}</div>
    <div class="qcard">${passage}${q.lead?`<div class="lead">${q.lead}</div>`:''}<div class="qtext">${math(q.q)}</div>${q.svg||''}
    ${q.src==='qiyas'?'<div class="src">✔️ نموذج رسمي من كتيّب قياس</div>':''}</div>
    <div class="opts" id="opts">${q.opts.map((o,i)=>`<button class="opt" data-i="${i}"><span class="L">${LET[i]}</span><span class="grow">${optHTML(o)}</span></button>`).join('')}</div>
    <div id="after"></div>
    <div class="row" style="margin-top:14px" id="tools">${R.hint?'<button class="btn ghost sm" id="hint">✂️ احذفي خيارين (مرة بالجولة)</button>':''}</div>`,{focus:true});
  R.answered=false;R.qStart=Date.now();
  $('#quit').onclick=()=>{modal(`${mascot('encourage')}<h3>تبين توقفين؟</h3><p class="mut">عادي تاخذين استراحة! بنحفظ اللي حليتيه 💜</p><div class="grid2"><button class="btn ghost" data-close>أكمل</button><button class="btn" id="qyes">أوقف</button></div>`);$('#qyes').onclick=()=>{closeModal();finishRound(true);};};
  $('#calm').onclick=e=>{S.set.calm=!S.set.calm;save();calmSound(S.set.calm);e.currentTarget.classList.toggle('on',S.set.calm);toast(S.set.calm?'🎧 صوت هادئ يساعد على التركيز':'🔇 أطفأنا الصوت');};
  if($('#ptoggle'))$('#ptoggle').onclick=()=>{R.passClosed=!R.passClosed;$('#passage').classList.toggle('closed',R.passClosed);$('#ptoggle').textContent=R.passClosed?'📖 اعرضي النص':'🙈 صغّري النص';};
  if($('#hint'))$('#hint').onclick=()=>{if(R.answered)return;R.hint=false;const wrong=shuffle([0,1,2,3].filter(i=>i!==q.a)).slice(0,2);wrong.forEach(i=>document.querySelector(`.opt[data-i="${i}"]`).classList.add('gone'));$('#hint').remove();};
  document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>answer(+b.dataset.i,b));
  if(S.set.timer){const per=62;clearInterval(R.tm);R.tm=setInterval(()=>{const el=$('#timer');if(!el||R.answered){clearInterval(R.tm);return;}const s=(Date.now()-R.qStart)/1000;el.firstChild.style.width=Math.min(100,s/per*100)+'%';if(s>per&&!el.classList.contains('over')){el.classList.add('over');toast('خذي وقتك 🌿 الوقت هنا للتعوّد بس');}},1000);}
}
function recordAnswer(q,ok,review){
  const st=S.qs[q.id]||(S.qs[q.id]={s:0,c:0});st.s++;if(ok)st.c++;st.last=Date.now();
  const ts=S.ts[q.type]||(S.ts[q.type]={s:0,c:0});ts.s++;if(ok)ts.c++;
  const d=dayRec();d.q++;if(ok)d.c++;
  const m=S.mist[q.id];let mastered=false;
  if(!ok){S.mist[q.id]={box:1,due:Date.now()+BOX_DAYS[1]*DAY,added:(m&&m.added)||Date.now(),day:today()};}
  else if(m&&m.day!==today()&&(review||m.due<=Date.now())){m.day=today();m.box++;if(m.box>4){delete S.mist[q.id];if(!S.mastered.includes(q.id))S.mastered.push(q.id);mastered=true;}else m.due=Date.now()+BOX_DAYS[m.box]*DAY;}
  return mastered;}
function answer(i,btn){
  if(R.answered)return;R.answered=true;clearInterval(R.tm);const q=curQ(),ok=i===q.a;const review=R.cfg.mode==='mistakes'||!!S.mist[q.id];
  btn.classList.add('pick');document.querySelectorAll('.opt').forEach(b=>b.disabled=true);$('#tools').innerHTML='';
  const wasGoal=dayRec().q>=S.goal;
  setTimeout(()=>{ // brief pause = a moment to think before feedback
    const mastered=recordAnswer(q,ok,review);R.res.push(ok);dayRec().ms=(dayRec().ms||0)+Math.min(Date.now()-R.qStart,180000);
    document.querySelectorAll('.opt').forEach(b=>{const k=+b.dataset.i;b.classList.remove('pick');if(k===q.a)b.classList.add('ok');else if(k===i)b.classList.add('no');else b.classList.add('dim');});
    let gain;
    if(ok){R.combo++;S.bestCombo=Math.max(S.bestCombo,R.combo);gain=review?15:10;if(R.combo%3===0)gain+=5;sfx.ok();confetti(R.combo>=3?110:55);}
    else{R.combo=0;gain=2;sfx.no();btn.classList.add('shake');if(!R.secondDone&&!R.second.includes(q.id)&&R.i<(R.baseLen??R.qs.length))R.second.push(q.id);}
    R.xp+=gain;addXP(gain);xpFloat('+'+gain,btn);
    if(!wasGoal&&dayRec().q>=S.goal){addXP(30);R.xp+=30;setTimeout(()=>{sfx.win();confetti(150);toast('🎯 حقّقتِ هدف اليوم! +٣٠ نقطة',3000);},900);}
    save();
    const msg=ok?(mastered?'🧠 أتقنتِ هذا السؤال! طلع من بنك الأخطاء 🎉':pick(PRAISE).replace('{n}',nm())+(R.combo>=3?` كومبو ${R.combo} 🔥`:'')):pick(SOFT);
    const after=$('#after');
    after.innerHTML=`<div class="feedback ${ok?'ok':'no'}">${mascot(ok?'cheer':'encourage')}<div class="bubble">${msg}</div></div>
      <div id="exwrap">${ok?'<button class="btn ghost" id="showex">💡 شوفي الشرح والحيلة</button>':explainHTML(q)}</div>
      <div class="bottombar"><button class="btn ${ok?'':'t'}" id="next">${R.i+1<R.qs.length||R.second.length&&!R.secondDone?'التالي ←':'النتيجة 🎁'}</button></div>`;
    digits(after);
    if($('#showex'))$('#showex').onclick=()=>{$('#exwrap').innerHTML=explainHTML(q);digits($('#exwrap'));bindMore();};
    bindMore();$('#next').onclick=next;
    setTimeout(()=>after.scrollIntoView({behavior:S.set.calmAnim?'auto':'smooth',block:'start'}),ok?100:250);
  },420);}
function explainHTML(q){
  return `<div class="explain"><h3>🪄 الحل خطوة خطوة</h3><ol class="steps">${q.steps.map((s,k)=>`<li style="animation-delay:${k*.35}s">${math(s)}</li>`).join('')}</ol>
   <div class="trick">💡 <b>الحيلة:</b> ${math(q.trick)}</div><div class="hook">🧠 ${math(q.hook)}</div>
   ${q.more&&q.more.length?`<div class="more"><button class="btn ghost sm" data-more>➕ اشرحي أكثر</button><ul hidden>${q.more.map(m=>`<li>${math(m)}</li>`).join('')}</ul></div>`:''}</div>`;}
function bindMore(){document.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>{const u=b.nextElementSibling;u.hidden=!u.hidden;b.textContent=u.hidden?'➕ اشرحي أكثر':'➖ أقل';});}
function next(){
  if(R.baseLen==null)R.baseLen=R.qs.length;
  if(R.i+1<R.qs.length){R.i++;showQuestion();return;}
  if(R.second.length&&!R.secondDone){R.secondDone=true;const extra=R.second.map(id=>QBY[id]);R.qs=R.qs.concat(extra);R.i++;toast('🔁 فرصة ثانية للأسئلة اللي فاتتك!');showQuestion();return;}
  finishRound(false);}
function finishRound(quit){
  clearInterval(R&&R.tm);if(!R)return;const n=R.res.length,c=R.res.filter(Boolean).length;
  if(n===0){R=null;location.hash='#home';return;}
  S.rounds++;const streakMsg=touchStreak();const bonus=quit?0:20;if(bonus){addXP(bonus);R.xp+=bonus;}
  S.hist.unshift({t:Date.now(),title:R.title,n,c,xp:R.xp});S.hist=S.hist.slice(0,60);setTimeout(reportNow,50);
  // surprise reward (variable reward keeps it exciting)
  let surprise='';if(!quit){const r=Math.random();
    if(r<.45){const st=pick(STICKERS);S.stickers.push(st);surprise=`<span class="reward">${st}</span><p><b>ملصق جديد لمجموعتك!</b></p>`;}
    else if(r<.75){const b=pick([10,15,20,25]);addXP(b);R.xp+=b;surprise=`<span class="reward">🎁</span><p><b>هدية مفاجأة: +${b} نقطة!</b></p>`;}
    else surprise=`<span class="reward">${pick(['🌈','💜','🦋'])}</span><p><b>${pick(['تعرفين؟ المذاكرة القصيرة المتكررة أقوى من الطويلة 🧠','مخك الحين أقوى من قبل الجولة بشوي 💪','كل جولة = خطوة لدرجتك الحلوة 🎯','اشربي موية واتحركي دقيقة، تستاهلين 💧'])}</b></p>`;}
  const nb=checkBadges();save();
  const pct=Math.round(c/n*100);const roundsToday=S.hist.filter(h=>dkey(new Date(h.t))===today()).length;
  const mood=pct>=60?'cheer':'encourage';
  const head=pct===100?'جولة كاملة! 💯 أسطورة':pct>=70?`رهيبة يا ${esc(nm())}! 🌟`:pct>=40?'شغل حلو! كل مرة أحسن 💪':'بداية حلوة! الأخطاء صارت بنك تعلّم 📒';
  sfx.win();confetti(pct>=70?200:90);
  const cfg=R.cfg;R=null;
  render(`<div class="onb">${mascot(mood)}<h1>${head}</h1>
    <div class="stats3"><div class="stat"><b>${c}/${n}</b><small>صح</small></div><div class="stat"><b>+${S.hist[0].xp}</b><small>نقطة</small></div><div class="stat"><b>🔥 ${S.streak.n}</b><small>أيام متتالية</small></div></div>
    ${streakMsg?`<div class="card">${streakMsg}</div>`:''}
    ${surprise?`<div class="card">${surprise}</div>`:''}
    ${nb.length?`<div class="card"><h3>أوسمة جديدة! 🏅</h3><div class="badges">${nb.map(([e,t])=>`<div class="badge"><span>${e}</span>${t}</div>`).join('')}</div></div>`:''}
    ${roundsToday>=2&&roundsToday%2===0?`<div class="card"><b>🧃 وقت استراحة؟</b><p class="mut">بعد جولتين، استراحة ٥ دقائق ترجّع التركيز.</p><button class="btn t" id="brk">⏸️ استراحة ٥ دقائق</button></div>`:''}
    <div class="grid2" style="margin-top:12px"><button class="btn" id="again">🔁 جولة ثانية</button><button class="btn ghost" id="home">🏠 الرئيسية</button></div></div>`,{focus:true});
  $('#again').onclick=()=>startRound(cfg);$('#home').onclick=()=>location.hash='#home';
  if($('#brk'))$('#brk').onclick=breakTimer;
}
function breakTimer(){let s=300;modal(`<h2>استراحة 🧃</h2><div class="breath" id="br">تنفّسي</div><p class="mut">شهيق… زفير… قومي اتحركي أو اشربي موية 💧</p><div class="clock" id="bc">05:00</div><br><button class="btn ghost" data-close>رجعت! ✋</button>`,()=>clearInterval(breakTimer.t));
  clearInterval(breakTimer.t);breakTimer.t=setInterval(()=>{s--;const el=$('#bc');if(!el){clearInterval(breakTimer.t);return;}el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');digits(el);if(s<=0){clearInterval(breakTimer.t);sfx.win();el.textContent='يلا نرجع! 🚀';}},1000);}

// ---------- screens ----------
function ringSVG(p,label){const r=26,c=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#f1e8ff" stroke-width="8"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="url(#gr)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-Math.min(1,p))}" transform="rotate(-90 32 32)"/><defs><linearGradient id="gr"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><text x="32" y="36" text-anchor="middle" font-size="13" font-weight="900" fill="#2e1f4f">${label}</text></svg>`;}
function secProgress(sec){let s=0,c=0;for(const t in TYPES)if(TYPES[t].s===sec&&S.ts[t]){s+=S.ts[t].s;c+=S.ts[t].c;}const seen=QS.filter(q=>q.sec===sec&&S.qs[q.id]).length,tot=QS.filter(q=>q.sec===sec).length;return {acc:s?Math.round(c/s*100):0,seen,tot};}
function home(){
  if(!S.onboarded){onboard();return;}
  const L=level(S.xp),d=dayRec(),hr=new Date().getHours();const greet=hr<12?'صباح الخير':hr<18?'هلا والله':'مساء الخير';
  const due=dueMistakes().length,mcount=Object.keys(S.mist).length;const v=secProgress('v'),qq=secProgress('q');
  const ans=totalAnswered();
  render(`<div class="hero">${mascot('happy')}<div class="grow"><div class="mut">${greet}</div><h1>يا ${esc(nm())} 💜</h1><div class="bubble">${pick(HOME_TALK).replace('{n}',esc(nm()))}</div></div></div>
   <div class="stats3"><div class="stat"><b>🔥 ${S.streak.n}</b><small>سلسلة الأيام ${'🛡️'.repeat(S.streak.freeze)}</small></div>
     <div class="stat"><b>${L.em} ${L.i+1}</b><small>${L.name}</small></div><div class="stat"><b>⭐ ${S.xp}</b><small>نقطة</small></div></div>
   <div class="card" style="padding:12px 16px"><div class="row"><div class="grow"><b>المستوى التالي</b><div class="xpbar"><i style="width:${Math.round(L.pct*100)}%"></i></div><small class="mut">${L.to>L.from?`باقي ${L.to-S.xp} نقطة`:'وصلتِ للقمة 👑'}</small></div>
     ${ringSVG(d.q/S.goal,`${Math.min(d.q,S.goal)}/${S.goal}`)}</div><small class="mut">🎯 هدف اليوم: ${S.goal} أسئلة ${d.q>=S.goal?'— تم! 🎉':''}</small></div>
   <button class="big3" id="b3"><span class="em">⚡</span><span><b>٣ أسئلة بس!</b><small>دقيقتين وتخلصين 😉</small></span></button>
   <div class="grid2" style="margin-top:12px"><button class="btn t" id="quick">🎲 جولة منوّعة (٧)</button><button class="btn y" id="mist">📒 أخطائي ${mcount?`(${mcount})`:''}</button></div>
   ${due?`<div class="card" style="background:#fff7d6"><b>⏰ عندك ${due} ${due===1?'سؤال':'أسئلة'} حان وقت مراجعتها</b><p class="mut">المراجعة المتباعدة تثبّت المعلومة 🧠</p><button class="btn y sm" id="rev">راجعيها الحين</button></div>`:''}
   <h2 style="margin-top:18px">الأقسام</h2>
   <div class="grid2"><button class="sec v" data-sec="v"><span class="em">📚</span><b>اللفظي</b><small>${v.seen}/${v.tot} سؤال · دقة ${v.acc}%</small><span class="bar"><i style="width:${v.seen/v.tot*100}%"></i></span></button>
   <button class="sec q" data-sec="q"><span class="em">🔢</span><b>الكمّي</b><small>${qq.seen}/${qq.tot} سؤال · دقة ${qq.acc}%</small><span class="bar"><i style="width:${qq.seen/qq.tot*100}%"></i></span></button></div>
   <button class="tile" id="mock"><span class="em">⏱️</span><span class="grow"><b>اختبار تجريبي</b><small class="mut">${S.mockOpen||ans>=60?'مثل الاختبار الحقيقي بالوقت':`ننصح فيه بعد ٦٠ سؤال (حليتي ${ans}) 🔒`}</small></span></button>
   <button class="tile" id="tips"><span class="em">🌟</span><span class="grow"><b>نصائح يوم الاختبار</b><small class="mut">وش تسوين قبل وفي يوم الاختبار</small></span></button>
   <button class="tile" id="about"><span class="em">🔬</span><span class="grow"><b>ليش لولو كذا؟</b><small class="mut">المصادر والأبحاث</small></span></button>`,{tab:'home'});
  $('#b3').onclick=()=>startRound({n:3,title:'٣ أسئلة بس'});$('#quick').onclick=()=>startRound({n:7,title:'جولة منوّعة'});
  $('#mist').onclick=()=>location.hash='#mistakes';if($('#rev'))$('#rev').onclick=()=>startRound({mode:'mistakes',n:7,title:'مراجعة الأخطاء'});
  document.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>location.hash='#practice/'+b.dataset.sec);
  $('#mock').onclick=()=>location.hash='#mock';$('#tips').onclick=()=>location.hash='#tips';$('#about').onclick=()=>location.hash='#about';}
function practice(sec){
  const list=(s)=>Object.keys(TYPES).filter(t=>TYPES[t].s===s).map(t=>{const st=S.ts[t]||{s:0,c:0};const tot=QS.filter(q=>q.type===t).length;const seen=QS.filter(q=>q.type===t&&S.qs[q.id]).length;
    return `<button class="tile" data-type="${t}"><span class="em">${TYPES[t].e}</span><span class="grow"><b>${TYPES[t].n}</b><small class="mut">${seen}/${tot} · ${st.s?`دقة ${Math.round(st.c/st.s*100)}%`:'جديد ✨'}</small><span class="xpbar"><i style="width:${seen/tot*100}%"></i></span></span><span>‹</span></button>`;}).join('');
  const secs=sec?[sec]:['v','q'];
  render(`<div class="top">${sec?'<button class="iconbtn" id="back">→</button>':''}<h1 class="grow">🎯 تدرّبي</h1></div>
   <div class="card"><b>كم سؤال بالجولة؟</b><div class="seg" id="len">${[3,5,7,10].map(n=>`<button data-n="${n}" class="${(S.len||7)===n?'on':''}">${n}</button>`).join('')}</div><small class="mut">جولات قصيرة = تركيز أعلى 🧠</small></div>
   ${secs.map(s=>`<h2>${SECS[s].e} ${SECS[s].n}</h2><button class="btn ${s==='v'?'':'t'}" data-mix="${s}">🎲 خلطة ${SECS[s].n}</button>${list(s)}`).join('')}`,{tab:'practice'});
  if($('#back'))$('#back').onclick=()=>location.hash='#practice';
  document.querySelectorAll('#len button').forEach(b=>b.onclick=()=>{S.len=+b.dataset.n;save();practice(sec);});
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>startRound({type:b.dataset.type,n:S.len||7,title:TYPES[b.dataset.type].n}));
  document.querySelectorAll('[data-mix]').forEach(b=>b.onclick=()=>startRound({sec:b.dataset.mix,n:S.len||7,title:'خلطة '+SECS[b.dataset.mix].n}));}
function mistakes(){
  const ids=Object.keys(S.mist).filter(id=>QBY[id]);const due=dueMistakes();const now=Date.now();
  const byBox=[1,2,3,4].map(b=>ids.filter(id=>S.mist[id].box===b).length);
  render(`<div class="top"><h1 class="grow">📒 بنك أخطائي</h1></div>
   <div class="card"><div class="row">${mascot('encourage','')}<div><b>كل خطأ هنا = فرصة 🌱</b><p class="mut">نرجّع لك السؤال بعد ١ ثم ٣ ثم ٧ ثم ١٤ يوم. تجاوبينه صح ٤ مرات ← يطلع وتكسبين نجمة إتقان ⭐</p></div></div></div>
   <div class="stats3"><div class="stat"><b>${ids.length}</b><small>بالبنك</small></div><div class="stat"><b>${due.length}</b><small>حان وقتها</small></div><div class="stat"><b>⭐ ${S.mastered.length}</b><small>أتقنتيها</small></div></div>
   <div class="card"><b>الصناديق</b><div class="bars">${byBox.map((n,i)=>`<div class="b"><div class="row"><span>📦 صندوق ${i+1} (كل ${BOX_DAYS[i+1]} ${i?'أيام':'يوم'})</span><span>${n}</span></div><div class="track"><i style="width:${ids.length?n/ids.length*100:0}%"></i></div></div>`).join('')}</div></div>
   ${ids.length?`<button class="btn y" id="go">${due.length?`🔁 راجعي ${Math.min(7,due.length)} الحين`:'🔁 راجعي مبكرًا'}</button>`:`<div class="card" style="text-align:center"><span class="reward">🎉</span><b>البنك فاضي!</b><p class="mut">أي سؤال تغلطين فيه بيجي هنا تلقائيًا</p></div>`}
   ${ids.length?`<h3 style="margin-top:16px">آخر الأخطاء</h3>`+ids.sort((a,b)=>S.mist[b].added-S.mist[a].added).slice(0,8).map(id=>{const q=QBY[id];const d=Math.max(0,Math.ceil((S.mist[id].due-now)/DAY));return `<div class="tile"><span class="em">${TYPES[q.type].e}</span><span class="grow"><b>${TYPES[q.type].n}</b><small class="mut">${d?`المراجعة بعد ${d} ${d===1?'يوم':'أيام'}`:'جاهز للمراجعة ✅'}</small></span></div>`;}).join(''):''}`,{tab:'mistakes'});
  if($('#go'))$('#go').onclick=()=>startRound({mode:'mistakes',n:7,title:'مراجعة الأخطاء'});}

// ---------- mock exam ----------
const MOCKS={v:{n:'قسم لفظي',q:24,min:25,mix:{analogy:7,completion:3,error:4,reading:8,odd:2}},q:{n:'قسم كمّي',q:24,min:25,mix:{arith:9,compare:5,geometry:5,algebra:2,stats:3}},
  mini:{n:'تجربة مصغّرة',q:12,min:12,mix:{analogy:2,completion:1,error:2,reading:2,odd:1,arith:2,compare:1,geometry:1}}};
let M=null;
function mockMenu(){
  const ans=totalAnswered(),open=S.mockOpen||ans>=60;
  render(`<div class="top"><button class="iconbtn" id="back">→</button><h1 class="grow">⏱️ اختبار تجريبي</h1></div>
   <div class="card"><p>مثل الحقيقي: <b>بدون آلة حاسبة</b>، والشرح يجي <b>بعد</b> ما تسلّمين. القسم الحقيقي = ٢٤ سؤال في ٢٥ دقيقة.</p><p class="mut">💡 تقدرين تتنقلين بين الأسئلة وتعلّمين على اللي تبين ترجعين له 🚩</p></div>
   ${open?'':`<div class="card lock"><b>🔒 ننصح فيه بعد ما تتدربين على ٦٠ سؤال</b><p class="mut">حليتي ${ans}. التدريب القصير أول يبني الثقة 💪</p><button class="btn ghost sm" id="unlock">افتحيه الآن</button></div>`}
   ${Object.entries(MOCKS).map(([k,m])=>`<button class="tile ${open?'':'lock'}" data-m="${k}"><span class="em">${k==='v'?'📚':k==='q'?'🔢':'🌱'}</span><span class="grow"><b>${m.n}</b><small class="mut">${m.q} سؤال · ${m.min} دقيقة</small></span><span>‹</span></button>`).join('')}
   ${S.mocks.length?`<h3>نتائجك السابقة</h3>`+S.mocks.slice(0,6).map(r=>`<div class="tile"><span class="em">📝</span><span class="grow"><b>${MOCKS[r.k].n}: ${r.c}/${r.n}</b><small class="mut">${new Date(r.t).toLocaleDateString('ar-SA-u-nu-latn')}</small></span><b>${Math.round(r.c/r.n*100)}%</b></div>`).join(''):''}`,{tab:'home'});
  $('#back').onclick=()=>location.hash='#home';if($('#unlock'))$('#unlock').onclick=()=>{S.mockOpen=true;save();mockMenu();};
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(!open){toast('افتحيه أول من الزر فوق 🔓');return;}startMock(b.dataset.m);});}
function startMock(k){const m=MOCKS[k];let qs=[];const ex=new Set();
  for(const [t,n] of Object.entries(m.mix)){if(t==='reading'){const pids=shuffle(Object.keys(PASS));let got=[];for(const p of pids){if(got.length>=n)break;const g=QS.filter(q=>q.passage===p).slice(0,n-got.length);got=got.concat(g);}qs=qs.concat(got);}else qs=qs.concat(choose(QS.filter(q=>q.type===t),n,ex));}
  qs.forEach(q=>ex.add(q.id));
  M={k,qs,ans:Array(qs.length).fill(null),flag:Array(qs.length).fill(false),i:0,end:Date.now()+m.min*60e3,t0:Date.now()};if(location.hash==='#exam')exam();else location.hash='#exam';}
function exam(){
  if(!M){location.hash='#mock';return;}const q=M.qs[M.i];
  render(`<div class="qtop"><button class="iconbtn" id="quit">✕</button><div class="grow" style="text-align:center"><b>${M.i+1} / ${M.qs.length}</b></div><span class="clock" id="clock">--:--</span></div>
   <div class="row" style="justify-content:space-between"><span class="chip">${TYPES[q.type].e} ${TYPES[q.type].n}</span><button class="btn ghost sm" id="flag">${M.flag[M.i]?'🚩 معلّم':'🏳️ علّمي للرجوع'}</button></div>
   <div class="qcard">${q.passage?`<div class="passage">${esc(PASS[q.passage].text)}</div>`:''}${q.lead?`<div class="lead">${q.lead}</div>`:''}<div class="qtext">${math(q.q)}</div>${q.svg||''}</div>
   <div class="opts">${q.opts.map((o,i)=>`<button class="opt ${M.ans[M.i]===i?'pick':''}" data-i="${i}" style="animation:none"><span class="L">${LET[i]}</span><span class="grow">${optHTML(o)}</span></button>`).join('')}</div>
   <div class="grid2" style="margin-top:14px"><button class="btn ghost" id="prev" ${M.i?'':'disabled'}>→ السابق</button><button class="btn" id="nx">${M.i+1<M.qs.length?'التالي ←':'مراجعة وتسليم'}</button></div>
   <div class="card"><div class="mockgrid">${M.qs.map((_,i)=>`<button data-g="${i}" class="${M.ans[i]!=null?'ans':''} ${M.flag[i]?'flag':''} ${i===M.i?'cur':''}">${i+1}</button>`).join('')}</div>
   <button class="btn t sm" id="submit" style="width:100%;margin-top:10px">✅ سلّمي الاختبار</button></div>`,{focus:true});
  document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{M.ans[M.i]=+b.dataset.i;document.querySelectorAll('.opt').forEach(x=>x.classList.toggle('pick',x===b));const g=document.querySelector(`[data-g="${M.i}"]`);g.classList.add('ans');});
  $('#flag').onclick=()=>{M.flag[M.i]=!M.flag[M.i];exam();};
  $('#prev').onclick=()=>{M.i--;exam();};$('#nx').onclick=()=>{if(M.i+1<M.qs.length){M.i++;exam();}else confirmSubmit();};
  document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{M.i=+b.dataset.g;exam();});
  $('#submit').onclick=confirmSubmit;
  $('#quit').onclick=()=>modal(`<h3>تطلعين من الاختبار؟</h3><p class="mut">ما بنحفظ هالمحاولة.</p><div class="grid2"><button class="btn ghost" data-close>أكمل</button><button class="btn" id="qy">اطلعي</button></div>`)||($('#qy').onclick=()=>{closeModal();clearInterval(exam.t);M=null;location.hash='#mock';});
  clearInterval(exam.t);const tickc=()=>{const el=$('#clock');if(!el||!M)return clearInterval(exam.t);let s=Math.max(0,Math.round((M.end-Date.now())/1000));el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');el.classList.toggle('low',s<180);digits(el);if(s<=0){clearInterval(exam.t);toast('⏰ انتهى الوقت! نسلّم عنك');submitMock();}};tickc();exam.t=setInterval(tickc,1000);}
function confirmSubmit(){const blank=M.ans.filter(a=>a==null).length;modal(`<h3>تسلّمين؟</h3>${blank?`<p>باقي <b>${blank}</b> بدون إجابة. تذكّري: <b>الخطأ ما ينقص درجة</b>، فخمّني بدل ما تتركينها 😉</p>`:'<p>جاوبتِ على الكل 👏</p>'}<div class="grid2"><button class="btn ghost" data-close>أرجع</button><button class="btn" id="sy">سلّمي</button></div>`);$('#sy').onclick=()=>{closeModal();submitMock();};}
function submitMock(){clearInterval(exam.t);if(!M)return;const by={};let c=0;
  M.qs.forEach((q,i)=>{const ok=M.ans[i]===q.a;if(ok)c++;const b=by[q.type]||(by[q.type]={n:0,c:0});b.n++;if(ok)b.c++;if(M.ans[i]!=null)recordAnswer(q,ok,false);else if(!S.mist[q.id])S.mist[q.id]={box:1,due:Date.now()+DAY,added:Date.now()};});
  const r={k:M.k,t:Date.now(),n:M.qs.length,c,by,secs:Math.round((Date.now()-M.t0)/1000)};S.mocks.unshift(r);S.mocks=S.mocks.slice(0,30);dayRec().ms=(dayRec().ms||0)+Math.min(r.secs,3600)*1000;addXP(c*5+30);touchStreak();checkBadges();save();setTimeout(reportNow,50);
  const done=M;M=null;sfx.win();confetti(160);const pct=Math.round(c/r.n*100);
  render(`<div class="onb">${mascot(pct>=60?'cheer':'encourage')}<h1>${c} / ${r.n} — ${pct}%</h1><p>${pct>=80?'مستوى رهيب! 🏆':pct>=60?'أداء قوي! نحسّن الباقي 💪':'التجربة نفسها إنجاز 👏 الأخطاء صارت في بنكك'}</p><p class="mut">الوقت: ${Math.floor(r.secs/60)} دقيقة · +${c*5+30} نقطة</p></div>
   <div class="card bars">${Object.entries(by).map(([t,b])=>`<div class="b"><div class="row"><span>${TYPES[t].e} ${TYPES[t].n}</span><span>${b.c}/${b.n}</span></div><div class="track"><i style="width:${b.c/b.n*100}%"></i></div></div>`).join('')}</div>
   <h3>راجعي إجاباتك</h3>${done.qs.map((q,i)=>{const ok=done.ans[i]===q.a;return `<details class="card"><summary><b>${ok?'✅':done.ans[i]==null?'⚪':'🟠'} سؤال ${i+1}</b> · <span class="mut">${TYPES[q.type].n}</span></summary>
     ${q.passage?`<div class="passage closed">${esc(PASS[q.passage].text)}</div>`:''}<div class="qtext">${math(q.q)}</div>${q.svg||''}<p>إجابتك: <b>${done.ans[i]==null?'—':LET[done.ans[i]]+') '+optHTML(q.opts[done.ans[i]])}</b><br>الصحيحة: <b>${LET[q.a]}) ${optHTML(q.opts[q.a])}</b></p>${explainHTML(q)}</details>`;}).join('')}
   <button class="btn" id="hm">🏠 الرئيسية</button>`,{focus:false,tab:'home'});bindMore();$('#hm').onclick=()=>location.hash='#home';}

// ---------- stats ----------
function stats(){
  const ans=totalAnswered(),cor=totalCorrect();const acc=ans?Math.round(cor/ans*100):0;const L=level(S.xp);
  const typeRows=Object.keys(TYPES).map(t=>{const s=S.ts[t]||{s:0,c:0};return {t,s:s.s,acc:s.s?Math.round(s.c/s.s*100):null};});
  const weak=typeRows.filter(r=>r.s>=3).sort((a,b)=>a.acc-b.acc).slice(0,3);
  const days=[];for(let i=27;i>=0;i--){const d=new Date(Date.now()-i*DAY);const k=dkey(d);const r=S.days[k];const q=r?r.q:0;days.push(`<i class="${q?q>=S.goal*2?'l4':q>=S.goal?'l3':q>=S.goal/2?'l2':'l1':''} ${i===0?'today':''}" title="${k}: ${q}"></i>`);}
  render(`<div class="top"><h1 class="grow">📊 تقدّمي</h1></div>
   <div class="stats3"><div class="stat"><b>${ans}</b><small>سؤال حليتيه</small></div><div class="stat"><b>${acc}%</b><small>الدقة</small></div><div class="stat"><b>🔥 ${S.streak.best}</b><small>أطول سلسلة</small></div></div>
   <div class="card"><b>${L.em} المستوى ${L.i+1}: ${L.name}</b><div class="xpbar"><i style="width:${L.pct*100}%"></i></div><small class="mut">⭐ ${S.xp} نقطة</small></div>
   <div class="card"><h3>القسمين</h3><div class="bars">${['v','q'].map(s=>{const p=secProgress(s);return `<div class="b"><div class="row"><span>${SECS[s].e} ${SECS[s].n}</span><span>${p.acc}% · ${p.seen}/${p.tot}</span></div><div class="track"><i style="width:${p.acc}%"></i></div></div>`;}).join('')}</div></div>
   <div class="card"><h3>كل نوع</h3><div class="bars">${typeRows.map(r=>`<div class="b"><div class="row"><span>${TYPES[r.t].e} ${TYPES[r.t].n}</span><span>${r.acc==null?'لم تبدئي':r.acc+'% ('+r.s+')'}</span></div><div class="track"><i style="width:${r.acc||0}%"></i></div></div>`).join('')}</div></div>
   <div class="card"><h3>🎯 ركّزي على</h3>${weak.length?weak.map(r=>`<button class="tile" data-type="${r.t}"><span class="em">${TYPES[r.t].e}</span><span class="grow"><b>${TYPES[r.t].n}</b><small class="mut">دقتك ${r.acc}% — جولة قصيرة تفرق!</small></span><span class="chip k">تدرّبي</span></button>`).join(''):'<p class="mut">حلي ٣ أسئلة على الأقل من كل نوع عشان نعرف وين نركّز 🔍</p>'}</div>
   <div class="card"><h3>آخر ٤ أسابيع</h3><div class="heat">${days.join('')}</div><small class="mut">كل مربع يوم، اللون الأغمق = حليتي أكثر</small></div>
   <div class="card"><h3>الأوسمة (${S.badges.length}/${BADGES.length})</h3><div class="badges">${BADGES.map(([id,em,n,d])=>`<div class="badge ${S.badges.includes(id)?'':'lock'}" title="${d}"><span>${em}</span>${n}</div>`).join('')}</div></div>
   <div class="card"><h3>ملصقاتي (${S.stickers.length})</h3><div class="stickers">${S.stickers.length?S.stickers.join(''):'<span class="mut" style="font-size:14px">خلّصي جولات وتجيك ملصقات مفاجأة 🎁</span>'}</div></div>
   <div class="card"><h3>آخر الجولات</h3>${S.hist.slice(0,10).map(h=>`<div class="row" style="justify-content:space-between;border-bottom:1px solid #f3ecff;padding:6px 0"><span>${esc(h.title)}</span><span class="mut">${h.c}/${h.n} · +${h.xp}</span></div>`).join('')||'<p class="mut">لا يوجد بعد</p>'}</div>`,{tab:'stats'});
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>startRound({type:b.dataset.type,n:5,title:TYPES[b.dataset.type].n}));}

// ---------- tips / about ----------
function tips(){
  const T=[['😴','نامي بدري','النوم يثبّت اللي ذاكرتيه. لا تسهرين ليلة الاختبار.'],['🍳','افطري','فطور خفيف + موية يعطي مخك طاقة.'],['🪪','جهّزي أغراضك من الليل','الهوية وبطاقة الدخول، وتأكدي من مكان القاعة.'],['⏰','تعالي بدري','وصول مبكر = قلق أقل.'],['🚫🧮','بدون آلة حاسبة','تدرّبي على الحساب الذهني والحيل.'],['⏱️','٢٤ سؤال في ٢٥ دقيقة','تقريبًا دقيقة لكل سؤال. لا تعلقين!'],['🎯','لا تتركين ولا سؤال فاضي','الإجابة الخطأ ما تنقص درجة، فخمّني بذكاء.'],['✂️','احذفي الخيارات الغلط','كل خيار تحذفينه يرفع فرصتك.'],['🔁','فوّتي وارجعي','سؤال صعب؟ علّميه وكمّلي، وارجعي له آخر القسم.'],['🌬️','تنفّسي','لو تشتتّي: نفس عميق ٤ ثواني، وارجعي للسؤال.'],['👀','اقري آخر السؤال مرتين','وش المطلوب بالضبط؟ س ولا ٣س؟'],['📖','في القطع: اقري السؤال أول','ثم دوري على الدليل في النص.']];
  render(`<div class="top"><button class="iconbtn" id="back">→</button><h1 class="grow">🌟 نصائح يوم الاختبار</h1></div>${T.map(([e,t,d])=>`<div class="card tip"><span class="em">${e}</span><div><b>${t}</b><div class="mut">${d}</div></div></div>`).join('')}
   <div class="card" style="text-align:center">${mascot('cheer')}<b>أنتِ قدها يا ${esc(nm())}! 💜</b></div>`,{tab:'home'});$('#back').onclick=()=>location.hash='#home';}
function about(){
  const cnt=t=>QS.filter(q=>q.type===t).length, off=QS.filter(q=>q.src==='qiyas').length;
  render(`<div class="top"><button class="iconbtn" id="back">→</button><h1 class="grow">🔬 ليش لولو كذا؟</h1></div>
   <div class="card"><h3>📦 بنك الأسئلة: ${QS.length} سؤال</h3><p>${Object.keys(TYPES).map(t=>`${TYPES[t].e} ${TYPES[t].n}: ${cnt(t)}`).join('<br>')}</p>
   <p class="mut">منها ${off} نموذجًا رسميًا منشورًا في <b>كتيّب اختبار القدرات العامة — هيئة تقويم التعليم والتدريب (قياس)</b>، أُعيد رسم أشكالها. والباقي أسئلة أصلية مكتوبة على نفس نمط الاختبار، وتم التحقق من إجابات الكمّي برمجيًا.</p></div>
   <div class="card"><h3>🧠 تصميم يناسب تشتت الانتباه</h3><ul>
   <li><b>جولات قصيرة</b> (٣–١٠ أسئلة) واستراحات: التركيز يدوم أكثر في فترات قصيرة.</li>
   <li><b>مكافآت فورية ومتنوعة</b> (نقاط، ملصقات، مفاجآت): أدمغة ADHD تتفاعل أقوى مع المكافأة القريبة.</li>
   <li><b>اختبار ذاتي + مراجعة متباعدة</b> (بنك الأخطاء ١-٣-٧-١٤ يوم) بدل إعادة القراءة.</li>
   <li><b>خلط الأنواع</b> داخل الجولة يقوّي التمييز بين أنواع المسائل.</li>
   <li><b>شرح بصري قصير</b>: فكرة بكل سطر، وحيلة واحدة واضحة.</li>
   <li>لحظة تفكير قصيرة قبل إظهار النتيجة، ومؤقت لطيف اختياري بدون ضغط.</li></ul></div>
   <div class="card"><h3>📚 المصادر</h3><p class="mut nodig" style="direction:ltr;text-align:left;font-size:12px;line-height:1.8">
   Qiyas (ETEC) — General Aptitude Test booklet (public samples)<br>
   Knouse et al. (2016) Clin Psychol Sci — retrieval practice & ADHD, doi:10.1177/2167702614565175<br>
   Sonuga-Barke (1992; 2009) — delay aversion in ADHD, doi:10.1111/j.1469-7610.1992.tb00874.x<br>
   Rohrer & Taylor (2007) — interleaved practice, doi:10.1007/s11251-007-9015-8<br>
   CHADD — study & homework strategies (short work chunks + breaks)</p></div>
   <div class="card"><p class="mut">🔒 كل بياناتك محفوظة على جهازك فقط. خذي نسخة احتياطية من الإعدادات.<br>الخط: Cairo (رخصة SIL OFL). الشخصية والرسومات أصلية.</p></div>`,{tab:'home'});digits(app);$('#back').onclick=()=>location.hash='#home';}

// ---------- settings ----------
function settings(){
  const tg=(k,label,sub)=>`<div class="switch"><div><b>${label}</b>${sub?`<div class="mut">${sub}</div>`:''}</div><button class="tg ${S.set[k]?'on':''}" data-tg="${k}" aria-label="${label}"></button></div>`;
  render(`<div class="top"><h1 class="grow">⚙️ الإعدادات</h1></div>
   <div class="card"><div class="field"><b>اسمك</b><input id="name" maxlength="20" value="${esc(S.name)}" placeholder="اكتبي اسمك (اختياري)"></div>
   <b>🎯 هدفك اليومي (أسئلة)</b><div class="seg" id="goal">${[5,10,15,20,30].map(n=>`<button data-n="${n}" class="${S.goal===n?'on':''}">${n}</button>`).join('')}</div><small class="mut">ابدئي صغير وكبّريه بعدين 🌱</small></div>
   <div class="card">${tg('timer','⏱️ مؤقت لطيف','شريط بسيط يعوّدك على دقيقة لكل سؤال، بدون عقاب')}${tg('sfx','🔔 أصوات الإجابات')}${tg('calm','🎧 صوت هادئ للتركيز','ضوضاء بنية خفيفة أثناء الحل')}${tg('calmAnim','🧘 تقليل الحركة','يخفف الأنيميشن والقصاصات')}
   <div class="switch"><b>🔢 الأرقام</b><div class="seg" id="dg"><button data-d="ar" class="${S.set.digits==='ar'?'on':''}">١٢٣</button><button data-d="en" class="${S.set.digits==='en'?'on':''}">123</button></div></div></div>
   <div class="card"><h3>💾 نسخة احتياطية</h3><p class="mut">تقدّمك محفوظ على هذا الجهاز. خذي نسخة عشان ما يضيع لو انحذف التطبيق.</p>
   <div class="grid2"><button class="btn t sm" id="exp">⬇️ تنزيل ملف</button><button class="btn ghost sm" id="share">📤 مشاركة/نسخ</button></div>
   <div class="field"><b>استرجاع</b><input type="file" id="file" accept="application/json,.json"><textarea id="paste" rows="2" placeholder="أو الصقي النسخة هنا"></textarea><button class="btn ghost sm" id="imp">♻️ استرجعي من النص</button></div></div>
   <div class="card"><button class="btn ghost sm" id="reset">🗑️ مسح كل التقدّم</button></div>
   <div class="card" style="background:#fff0f7"><b>💌 بابا يشجّعك</b><p class="mut">ملخص بسيط لتقدّمك (عدد الأسئلة والنسبة والمستوى) يوصل لبابا كل يوم، عشان يفرح بإنجازك ويدعمك 💜</p></div>
   <p class="mut" style="text-align:center" id="ver">تطبيق لولو · ${QS.length} سؤال · يعمل بدون إنترنت ✈️</p>
   <div class="card" id="adv" hidden><b>رابط التقرير (لولي الأمر)</b><div class="field"><input id="rurl" class="nodig" dir="ltr" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(S.reportUrl||'')}"></div><small class="mut nodig" dir="ltr">${REPORT_URL?'built-in URL set':'no built-in URL'} · queued: ${(S.outbox||[]).length}</small><br><button class="btn ghost sm" id="rsend">📤 أرسل الآن</button></div>`,{tab:'settings'});
  let taps=0;$('#ver').onclick=()=>{if(++taps>=5){$('#adv').hidden=false;}};
  $('#rurl').onchange=e=>{const v=e.target.value.trim();if(v&&!/^https:\/\/script\.google\.com\//.test(v)){toast('الرابط غير صحيح');return;}S.reportUrl=v;save();toast('تم الحفظ ✅');reportNow();};
  $('#rsend').onclick=()=>{reportNow();toast(reportUrl()?'تم الإرسال 📤':'ما فيه رابط');};
  $('#name').onchange=e=>{S.name=e.target.value.trim().slice(0,20);save();toast('تم الحفظ 💜');};
  document.querySelectorAll('#goal button').forEach(b=>b.onclick=()=>{S.goal=+b.dataset.n;save();settings();});
  document.querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>{const k=b.dataset.tg;S.set[k]=!S.set[k];save();b.classList.toggle('on',S.set[k]);if(k==='calm')calmSound(S.set.calm);if(k==='calmAnim')document.body.classList.toggle('calm',S.set.calmAnim);});
  document.querySelectorAll('#dg button').forEach(b=>b.onclick=()=>{S.set.digits=b.dataset.d;save();settings();});
  const dump=()=>JSON.stringify(S);
  $('#exp').onclick=()=>{const blob=new Blob([dump()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lulu-backup-'+today()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('تم تنزيل النسخة ✅');};
  $('#share').onclick=async()=>{const txt=dump();try{if(navigator.share){const f=new File([txt],'lulu-backup.json',{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'نسخة لولو'});else await navigator.share({text:txt});}else{await navigator.clipboard.writeText(txt);toast('نسخنا النسخة للحافظة 📋');}}catch(e){try{await navigator.clipboard.writeText(txt);toast('نسخنا النسخة للحافظة 📋');}catch(_){toast('ما قدرنا ننسخ، استخدمي التنزيل');}}};
  const restore=txt=>{try{const o=JSON.parse(txt);if(!o||o.v!==1||typeof o.xp!=='number')throw 0;S=Object.assign(fresh(),o);S.set=Object.assign(fresh().set,o.set||{});save();toast('تم الاسترجاع 🎉');settings();}catch(e){toast('الملف غير صالح 😕');}};
  $('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>restore(r.result);r.readAsText(f);};
  $('#imp').onclick=()=>restore($('#paste').value);
  $('#reset').onclick=()=>modal(`<h3>متأكدة؟ 🥺</h3><p class="mut">بينمسح كل التقدّم والنقاط. خذي نسخة احتياطية أول.</p><div class="grid2"><button class="btn ghost" data-close>لا</button><button class="btn" id="ry">امسحي</button></div>`)||($('#ry').onclick=()=>{S=fresh();save();closeModal();location.hash='#home';home();});}

// ---------- onboarding ----------
function onboard(step=0){
  if(step===0)render(`<div class="onb">${mascot('cheer')}<h1>أهلًا! أنا لولو 🦉</h1><p>بساعدك تستعدين لـ<b>اختبار القدرات</b> بجولات قصيرة وممتعة، وكل خطأ نحوّله لفرصة 💜</p><button class="btn" id="n1">يلا نبدأ ✨</button></div>`,{focus:true});
  if(step===1)render(`<div class="onb">${mascot('happy')}<h2>وش أناديكِ؟</h2><div class="field"><input id="nm" maxlength="20" placeholder="اسمك (اختياري)" value="${esc(S.name)}"></div><button class="btn" id="n2">التالي ←</button><br><button class="btn ghost sm" id="skip" style="margin:auto">تخطي</button></div>`,{focus:true});
  if(step===2)render(`<div class="onb">${mascot('think')}<h2>كم سؤال يوميًا يا ${esc(nm())}؟</h2><p class="mut">ابدئي بهدف صغير، الاستمرار أهم من الكثرة 🌱</p><div class="seg" id="g" style="justify-content:center">${[5,10,15,20].map(n=>`<button data-n="${n}" class="${S.goal===n?'on':''}">${n}</button>`).join('')}</div><br><button class="btn" id="n3">جاهزة! 🚀</button></div>`,{focus:true});
  if($('#n1'))$('#n1').onclick=()=>onboard(1);
  if($('#n2')){const go=()=>{S.name=($('#nm').value||'').trim().slice(0,20);save();onboard(2);};$('#n2').onclick=go;$('#skip').onclick=()=>onboard(2);}
  if($('#g')){document.querySelectorAll('#g button').forEach(b=>b.onclick=()=>{S.goal=+b.dataset.n;document.querySelectorAll('#g button').forEach(x=>x.classList.toggle('on',x===b));});$('#n3').onclick=()=>{S.onboarded=true;save();confetti(120);sfx.win();home();};}}

// ---------- parent report (silent; queued offline, flushed when online) ----------
function reportUrl(){return (S.reportUrl||REPORT_URL||'').trim();}
function snapshot(){
  const d=S.days[today()]||{q:0,c:0,xp:0,ms:0};const L=level(S.xp);const ans=totalAnswered(),cor=totalCorrect();
  const types={};for(const t in TYPES){const s=S.ts[t];if(s&&s.s)types[t]={n:TYPES[t].n,s:s.s,c:s.c,acc:Math.round(s.c/s.s*100)};}
  const weak=Object.entries(types).filter(([t,v])=>v.s>=3).sort((a,b)=>a[1].acc-b[1].acc).slice(0,3).map(([t,v])=>({t,n:v.n,acc:v.acc}));
  const last7=[];for(let i=6;i>=0;i--){const k=dkey(new Date(Date.now()-i*DAY));const r=S.days[k];last7.push({d:k,q:r?r.q:0,c:r?r.c:0,min:r?Math.round((r.ms||0)/60000):0});}
  if(!S.dev){S.dev=Math.random().toString(36).slice(2,10);save();}
  return {token:REPORT_TOKEN,v:1,dev:S.dev,sentAt:new Date().toISOString(),date:today(),name:S.name||'',
    today:{q:d.q,c:d.c,pct:d.q?Math.round(d.c/d.q*100):null,min:Math.round((d.ms||0)/60000),xp:d.xp,rounds:S.hist.filter(h=>dkey(new Date(h.t))===today()).length,goal:S.goal},
    total:{q:ans,c:cor,pct:ans?Math.round(cor/ans*100):null,seen:Object.keys(S.qs).length,bank:QS.length},
    xp:S.xp,level:L.i+1,levelName:L.name,streak:S.streak.n,bestStreak:S.streak.best,lastActive:S.streak.last,
    mistakes:Object.keys(S.mist).length,due:dueMistakes().length,mastered:S.mastered.length,
    types,weak,mocks:S.mocks.slice(0,5).map(m=>({d:dkey(new Date(m.t)),k:m.k,kn:(MOCKS[m.k]||{}).n||m.k,c:m.c,n:m.n,pct:Math.round(m.c/m.n*100),min:Math.round(m.secs/60)})),
    badges:S.badges.length,last7};}
function reportNow(){if(!reportUrl())return;try{const s=snapshot();S.outbox=(S.outbox||[]).filter(x=>x.date!==s.date);S.outbox.push(s);S.outbox=S.outbox.slice(-14);save();flushReports();}catch(e){}}
let flushing=false;
async function flushReports(){const url=reportUrl();if(!url||flushing||!(S.outbox&&S.outbox.length)||navigator.onLine===false)return;flushing=true;
  try{while(S.outbox.length){const s=S.outbox[0];
      await fetch(url,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(s)});
      S.outbox.shift();S.lastReport=Date.now();save();}}
  catch(e){/* offline or blocked: keep queued, retry later */}finally{flushing=false;}}
window.addEventListener('online',flushReports);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')flushReports();});

// ---------- router ----------
function route(){
  const h=(location.hash||'#home').slice(1);const [p,arg]=h.split('/');closeModal();
  if(!S.onboarded&&p!=='about'){onboard();return;}
  if(p!=='play'&&R){R=null;}
  if(p!=='exam'&&M){clearInterval(exam.t);M=null;}
  ({home,practice:()=>practice(arg),play:showQuestion,mistakes,stats,settings,mock:mockMenu,exam,tips,about}[p]||home)();}
window.addEventListener('hashchange',route);
document.body.classList.toggle('calm',!!S.set.calmAnim);
route();
setTimeout(reportNow,1500);
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.LULU={get S(){return S;},get R(){return R;},get M(){return M;},snapshot,reportNow,flushReports,play(ids){R={cfg:{n:ids.length,mode:'practice'},qs:ids.map(i=>QBY[i]),i:0,res:[],xp:0,combo:0,hint:true,second:[],secondDone:true,t0:Date.now(),title:'test'};if(location.hash==='#play')showQuestion();else location.hash='#play';}}; // for automated testing
})();
