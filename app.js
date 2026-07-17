/* ================= STATE ================= */
const APP_VER='v9';
const LS_KEY='amwali_v1';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date().toISOString().slice(0,10);
const thisMonth=()=>new Date().toISOString().slice(0,7);

const DEFAULTS={
  appName:'أموالي',
  appIcon:'',
  users:[
    {id:'u1',name:'طارق',pin:null,private:false},
    {id:'u2',name:'دويني',pin:null,private:false},
    {id:'u3',name:'سعاد',pin:null,private:false},
    {id:'u4',name:'فاطمة',pin:null,private:false},
    {id:'u5',name:'بدر',pin:null,private:false},
    {id:'u6',name:'علي',pin:null,private:false},
  ],
  adminId:'u1',
  theme:{preset:0,dark:false,customBg:null},
  sync:{enabled:true,url:'https://our-nice-farm-default-rtdb.europe-west1.firebasedatabase.app',code:'',apiKey:''},
  currencies:[
    {code:'LYD',name:'دينار ليبي'},
    {code:'USD',name:'دولار أمريكي'},
    {code:'EUR',name:'يورو'},
  ],
  cats:{
    expense:[
      {id:'c1',name:'طعام وشراب',icon:'🍽️'},{id:'c2',name:'مواصلات',icon:'🚗'},
      {id:'c3',name:'فواتير',icon:'🧾'},{id:'c4',name:'إيجار',icon:'🏠'},
      {id:'c5',name:'صحة',icon:'💊'},{id:'c6',name:'ملابس',icon:'👕'},
      {id:'c7',name:'تعليم',icon:'📚'},{id:'c8',name:'اتصالات وإنترنت',icon:'📱'},
      {id:'c9',name:'مستلزمات منزلية',icon:'🧹'},{id:'c10',name:'ترفيه',icon:'🎮'},
      {id:'c11',name:'هدايا وصدقة',icon:'🎁'},{id:'c12',name:'أخرى',icon:'📦'},
    ],
    income:[
      {id:'i1',name:'راتب',icon:'💼'},{id:'i2',name:'عمل إضافي',icon:'🛠️'},
      {id:'i3',name:'تجارة',icon:'🏪'},{id:'i4',name:'هدية',icon:'🎁'},{id:'i5',name:'أخرى',icon:'📦'},
    ]
  },
  tx:[], transfers:[], debts:[], budgets:[], recurring:[], goals:[], audit:[], pin:null,
  sound:true, notify:true
};

let S=load();
function load(){
  let s;
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(raw){const d=JSON.parse(raw); s=Object.assign(JSON.parse(JSON.stringify(DEFAULTS)),d);}
  }catch(e){}
  if(!s) s=JSON.parse(JSON.stringify(DEFAULTS));
  // migrations (never reset — the family has real data in here)
  if(!Array.isArray(s.audit)) s.audit=[];
  (s.budgets||[]).forEach(b=>{ if(!b.id) b.id='b_'+b.catId+'_'+b.cur; });   // budgets had no id → never synced
  return s;
}
function saveLocal(){ localStorage.setItem(LS_KEY,JSON.stringify(S)); }
function save(){ S.updatedAt=Date.now(); saveLocal(); snapshotLocal(); scheduleCloudPush(); cloudSnapshot(); }

/* ---- identity: who is using THIS device (stored per-device, not synced) ---- */
const ME_KEY='amwali_me';
let ME=localStorage.getItem(ME_KEY)||null;
function me(){ return S.users.find(u=>u.id===ME)||null; }

/* خلفيات فاخرة — Emerald & Gold design system v2 */
const BGS=[
  ['#0b5d52','#06332d'],   // الزمرد الملكي (الافتراضي)
  ['#0f2a43','#081526'],   // ليل المتوسط
  ['#3b2f80','#191046'],   // البنفسج الملكي
  ['#8a5a0e','#3a2604'],   // ذهب الصحراء
  ['#7c1d35','#2c0716'],   // العنابي الفاخر
  ['#28303f','#0b0f19'],   // الجرافيت
  ['#14532d','#04180c'],   // غابة عميقة
  ['#274690','#101c40'],   // أزرق سيادي
  ['#0a5c73','#062b38'],   // محيط هادئ
  ['#453f3a','#171412'],   // بني داكن أنيق
];

/* ================= HELPERS ================= */
const fmt=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
const userName=id=>{const u=S.users.find(u=>u.id===id); return u?u.name:'—';};
const catOf=(type,id)=>{const c=(S.cats[type]||[]).find(c=>c.id===id); return c||{name:'أخرى',icon:'📦'};};
function toast(msg){const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2200);}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dateAr(d){ try{return new Date(d+'T00:00:00').toLocaleDateString('ar-LY',{day:'numeric',month:'long',year:'numeric'});}catch(e){return d;} }

/* ================= NAV ================= */
document.getElementById('nav').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return; openTab(b.dataset.tab);
});
function openTab(tab){
  currentTab=tab;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  ['home','tx','transfers','debts','reports','settings'].forEach(t=>{
    document.getElementById('tab-'+t).classList.toggle('hide',t!==tab);
  });
  if(tab==='home')renderHome();
  if(tab==='tx')renderTx();
  if(tab==='transfers')renderTransfers();
  if(tab==='debts')renderDebts();
  if(tab==='reports')renderReports();
  if(tab==='settings')renderSettings();
  window.scrollTo({top:0});
}

/* ================= THEME ================= */
function applyTheme(){
  const t=S.theme;
  document.body.classList.toggle('dark',!!t.dark);
  document.getElementById('darkBtn').textContent=t.dark?'☀️':'🌙';
  const tb=document.getElementById('darkBtnTop'); if(tb)tb.textContent=t.dark?'☀️':'🌙';
  if(t.customBg){
    document.body.classList.add('custom-bg');
    document.body.style.setProperty('--custom-bg',`url(${t.customBg})`);
  }else{
    document.body.classList.remove('custom-bg');
    const bg=BGS[t.preset]||BGS[0];
    document.documentElement.style.setProperty('--bg1',bg[0]);
    document.documentElement.style.setProperty('--bg2',bg[1]);
    document.body.style.background=`linear-gradient(135deg,${bg[0]},${bg[1]}) fixed`;
  }
}
function toggleDark(){S.theme.dark=!S.theme.dark; save(); applyTheme(); renderSettings();}
function setCustomBg(inp){
  const f=inp.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{S.theme.customBg=r.result; save(); applyTheme(); toast('تم تغيير الخلفية ✨');};
  r.readAsDataURL(f);
}
function clearCustomBg(){S.theme.customBg=null; save(); applyTheme(); toast('تمت إزالة الصورة');}

/* ================= HEADER ================= */
const LOGO_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7H6a2.5 2.5 0 0 1 0-5h11.5v5"/><path d="M19 7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V4.5"/><circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none"/></svg>';
function renderHeader(){
  document.getElementById('appName').textContent=S.appName;
  document.title=S.appName+' — منظومة إدارة الأموال';
  document.getElementById('adminChip').textContent=me()?me().name:'من أنت؟';
  const av=document.getElementById('meAvatar');
  if(av)av.textContent=(me()&&me().avatar)||'👤';
  const lg=document.getElementById('appLogo');
  if(lg){ if(S.appIcon){ lg.textContent=S.appIcon; } else if(!lg.querySelector('svg')){ lg.innerHTML=LOGO_SVG; } }
  try{
    const ic=S.appIcon||'💰';
    document.querySelector("link[rel='icon']").href='data:image/svg+xml,'+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='#0b5d52'/><text x='50' y='68' font-size='52' text-anchor='middle'>"+ic+"</text></svg>");
  }catch(e){}
  document.getElementById('todayLine').textContent=new Date().toLocaleDateString('ar-LY',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

/* ================= AVATARS & APP ICON — صور رمزية وشعار ================= */
const AVATARS=['🦁','🦅','🐎','🦊','🐪','🦉','🕊️','🐬','👑','⚔️','🛡️','🌙','⭐','☀️','🔥','💎','🌊','🌹','🌴','🏔️','🎯','🪶','🏇','⚜️'];
const APP_ICONS=['💰','🏦','💎','🪙','👛','🏆','🌙','⚜️','🕌','✨','📊','🧿'];
let avatarMode='me';
function openAvatarModal(mode){
  avatarMode=mode||'me';
  if(avatarMode==='me'&&!me()){ showLogin(); return; }
  document.getElementById('avatarModalTitle').textContent=avatarMode==='app'?'💠 اختر شعار المنظومة':'🖼️ اختر صورتك الرمزية';
  const list=avatarMode==='app'?APP_ICONS:AVATARS;
  const cur=avatarMode==='app'?S.appIcon:((me()||{}).avatar);
  document.getElementById('avatarGrid').innerHTML=list.map(a=>
    `<button class="avatar-opt ${cur===a?'on':''}" onclick="pickAvatar('${a}')">${a}</button>`).join('');
  document.getElementById('avatarCustom').value='';
  document.getElementById('resetIconBtn').style.display=avatarMode==='app'?'':'none';
  document.getElementById('avatarModal').classList.add('open');
}
function pickAvatar(a){ applyAvatar(a); }
function customAvatar(){
  const v=document.getElementById('avatarCustom').value.trim();
  if(!v){toast('⚠️ اكتب رمزاً تعبيرياً أولاً'); return;}
  applyAvatar(v.slice(0,8));
}
function applyAvatar(a){
  if(avatarMode==='app'){ S.appIcon=a; toast('تم تغيير شعار المنظومة ✨'); }
  else{ const u=me(); if(!u)return; u.avatar=a; toast('تم تغيير صورتك الرمزية ✨'); }
  save(); closeModal('avatarModal'); sndOk();
  renderHeader(); renderSettings(); if(currentTab==='home')renderHome(); renderLoginUsers();
}
function resetAppIcon(){
  S.appIcon=''; save(); closeModal('avatarModal');
  const lg=document.getElementById('appLogo'); if(lg)lg.innerHTML=LOGO_SVG;
  renderHeader(); renderSettings(); toast('عاد الشعار الأصلي 💛');
}

/* ================= ABOUT — حول المنظومة ================= */
function openAbout(){
  document.getElementById('aboutBody').innerHTML=`
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:52px">${S.appIcon||'💰'}</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px">${esc(S.appName)}</div>
      <div style="font-size:12px;color:var(--muted)">منظومة إدارة الأموال العائلية · الإصدار ${APP_VER}</div>
    </div>
    <div class="set-row"><div><div class="s1">👨‍💻 صاحب الفكرة والمشرف</div><div class="s2">طارق الشيخ (توتوفروتو)</div></div></div>
    <div class="set-row"><div><div class="s1">🤖 البرمجة</div><div class="s2">بُنيت بمساعدة Claude من Anthropic</div></div></div>
    <div class="set-row"><div><div class="s1">📅 السنة</div><div class="s2">2025 – 2026</div></div></div>
    <div class="set-row"><div><div class="s1">🌍 أين</div><div class="s2">ألمانيا ↔ ليبيا (طرابلس · ودان)</div></div></div>
    <div class="set-row"><div><div class="s1">⚙️ التقنية</div><div class="s2">HTML/CSS/JS · Firebase · GitHub Pages — بلا أي إطار عمل</div></div></div>
    <div class="set-row"><div><div class="s1">📊 بياناتكم الآن</div><div class="s2">${S.tx.length} معاملة · ${S.transfers.length} حوالة · ${S.debts.length} دين · ${S.users.length} أفراد</div></div></div>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-top:12px">صُنعت بحب لعائلة الشيخ ❤️</div>`;
  document.getElementById('aboutModal').classList.add('open');
}

/* ================= HOME ================= */
function renderHome(){
  const m=thisMonth();
  const txM=S.tx.filter(t=>t.date.startsWith(m));
  const pend=S.transfers.filter(t=>t.status==='sent');
  // per-currency month sums
  let incT={},expT={};
  txM.forEach(t=>{const o=t.type==='income'?incT:expT; o[t.cur]=(o[t.cur]||0)+Number(t.amount);});
  const sumLine=o=>Object.keys(o).length?Object.entries(o).map(([c,v])=>fmt(v)+' '+c).join(' + '):'0';
  document.getElementById('homeStats').innerHTML=`
    <div class="card"><div class="stat-icon">⬇️</div><h3>دخل هذا الشهر</h3><div class="big pos" style="font-size:17px">${sumLine(incT)}</div></div>
    <div class="card"><div class="stat-icon">⬆️</div><h3>مصروف هذا الشهر</h3><div class="big neg" style="font-size:17px">${sumLine(expT)}</div></div>
    <div class="card"><div class="stat-icon">✈️</div><h3>حوالات في الطريق</h3><div class="big warn">${pend.length}</div></div>`;
  // balances per currency (all time): income - expense - transfers sent + transfers received in that currency
  const bal={};
  S.tx.forEach(t=>{bal[t.cur]=(bal[t.cur]||0)+(t.type==='income'?1:-1)*Number(t.amount);});
  S.transfers.forEach(t=>{bal[t.cur]=(bal[t.cur]||0)-Number(t.amount);});
  const cards=Object.entries(bal).filter(([c,v])=>v!==0||true);
  document.getElementById('balanceCards').innerHTML=cards.length?cards.map(([c,v])=>{
    const cur=S.currencies.find(x=>x.code===c);
    return `<div class="card"><h3>${esc(cur?cur.name:c)}</h3><div class="big ${v>=0?'pos':'neg'}">${fmt(v)} <span style="font-size:14px">${esc(c)}</span></div><div class="t2" style="font-size:11px;color:var(--muted);margin-top:4px">صافي (الدخل − المصروف − الحوالات المرسلة)</div></div>`;
  }).join(''):'<div class="card empty"><div class="e-ic">🗂️</div>لا توجد بيانات بعد — ابدأ بإضافة دخل أو مصروف</div>';
  // recent: merge tx + transfers by date
  const rec=[
    ...S.tx.map(t=>({...t,_k:'tx'})),
    ...S.transfers.map(t=>({...t,_k:'tr'})),
  ].sort((a,b)=>b.date.localeCompare(a.date)||((b.ts||0)-(a.ts||0))).slice(0,8);
  document.getElementById('recentList').innerHTML=rec.length?rec.map(r=>{
    if(r._k==='tx'){
      const c=catOf(r.type,r.cat);
      return `<div class="item"><div class="icon">${c.icon}</div><div class="info"><div class="t1">${esc(c.name)}</div><div class="t2">${dateAr(r.date)} · ${esc(userName(r.user))}${r.note?' · '+esc(r.note):''}</div></div><div class="amount ${r.type==='income'?'pos':'neg'}">${r.type==='income'?'+':'−'}${fmt(r.amount)} ${esc(r.cur)}</div></div>`;
    }
    return `<div class="item"><div class="icon">✈️</div><div class="info"><div class="t1">حوالة إلى ${esc(userName(r.to))}</div><div class="t2">${dateAr(r.date)} · <span class="badge ${r.status==='sent'?'sent':'recv'}">${r.status==='sent'?'⏳ في الطريق':'✅ مستلمة'}</span></div></div><div class="amount warn">${fmt(r.amount)} ${esc(r.cur)}</div></div>`;
  }).join(''):'<div class="empty"><div class="e-ic">📭</div>لا توجد حركات بعد</div>';
  renderFamily(); renderBudgets(); renderGoals();
}

/* ================= FAMILY WALLETS — رصيد كل فرد ================= */
/* رصيد الشخص = دخله − مصروفه − ما أرسله + ما استلمه (بعد تأكيد الاستلام، بعملة الاستلام) */
function userBalances(id){
  const b={};
  S.tx.forEach(t=>{ if(t.user===id) b[t.cur]=(b[t.cur]||0)+(t.type==='income'?1:-1)*Number(t.amount); });
  S.transfers.forEach(t=>{
    if(t.from===id) b[t.cur]=(b[t.cur]||0)-Number(t.amount);
    if(t.to===id&&t.status==='received'){
      const c=t.recvCur||t.cur, a=Number(t.recvAmount||t.amount);
      b[c]=(b[c]||0)+a;
    }
  });
  return b;
}
function renderFamily(){
  const el=document.getElementById('familyCards'); if(!el)return;
  el.innerHTML=S.users.map(u=>{
    const hidden=!!u.private&&u.id!==ME;
    let lines;
    if(hidden){ lines='<div class="big" style="font-size:16px">🔒 مخفي</div>'; }
    else{
      const ent=Object.entries(userBalances(u.id)).filter(([c,v])=>Math.abs(v)>0.004);
      lines=ent.length?ent.map(([c,v])=>`<div class="big ${v>=0?'pos':'neg'}" style="font-size:15px">${fmt(v)} ${esc(c)}</div>`).join('')
        :'<div class="big" style="font-size:15px;color:var(--muted)">0</div>';
    }
    return `<div class="card"><h3><span style="font-size:17px">${esc(u.avatar||'👤')}</span> ${esc(u.name)}${u.id===ME?' <span style="color:var(--accent)">(أنت)</span>':''}${u.private?' 🙈':''}</h3>${lines}
      <div style="font-size:10px;color:var(--muted);margin-top:4px">${hidden?'اختار صاحب الحساب الخصوصية':'دخله − مصروفه − ما أرسل + ما استلم'}</div></div>`;
  }).join('');
}

/* ================= TX ================= */
let txEditId=null, txType='expense';
function fillSelect(el,opts,withAll){
  el.innerHTML=(withAll?`<option value="">${withAll}</option>`:'')+opts.map(o=>`<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('');
}
function refreshFormSelects(){
  const curOpts=S.currencies.map(c=>({v:c.code,t:c.code+' — '+c.name}));
  const userOpts=S.users.map(u=>({v:u.id,t:u.name}));
  fillSelect(document.getElementById('txCur'),curOpts);
  fillSelect(document.getElementById('txUser'),userOpts);
  fillSelect(document.getElementById('trCur'),curOpts);
  fillSelect(document.getElementById('trRecvCur'),curOpts);
  fillSelect(document.getElementById('trFrom'),userOpts);
  fillSelect(document.getElementById('trTo'),userOpts);
  fillSelect(document.getElementById('fCur'),curOpts,'كل العملات');
  fillSelect(document.getElementById('rCur'),curOpts);
  const allCats=[...S.cats.expense.map(c=>({v:c.id,t:c.icon+' '+c.name})),...S.cats.income.map(c=>({v:c.id,t:c.icon+' '+c.name}))];
  fillSelect(document.getElementById('fCat'),allCats,'كل الفئات');
}
function setTxType(t){
  txType=t;
  document.getElementById('segInc').classList.toggle('on',t==='income');
  document.getElementById('segExp').classList.toggle('on',t==='expense');
  fillSelect(document.getElementById('txCat'),S.cats[t].map(c=>({v:c.id,t:c.icon+' '+c.name})));
}
function openTxModal(type,editId){
  txEditId=editId||null;
  refreshFormSelects();
  document.getElementById('txModalTitle').textContent=editId?'تعديل معاملة':(type==='income'?'إضافة دخل':'إضافة مصروف');
  if(editId){
    const t=S.tx.find(x=>x.id===editId);
    setTxType(t.type);
    document.getElementById('txAmount').value=t.amount;
    document.getElementById('txCur').value=t.cur;
    document.getElementById('txCat').value=t.cat;
    document.getElementById('txUser').value=t.user;
    document.getElementById('txDate').value=t.date;
    document.getElementById('txNote').value=t.note||'';
  }else{
    setTxType(type);
    document.getElementById('txAmount').value='';
    document.getElementById('txNote').value='';
    document.getElementById('txDate').value=today();
    document.getElementById('txUser').value=ME||S.adminId;
  }
  document.getElementById('txRepeat').checked=false;
  txCatTouched=!!editId;
  document.getElementById('txModal').classList.add('open');
}
function saveTx(){
  const amount=parseFloat(document.getElementById('txAmount').value);
  if(!amount||amount<=0){toast('⚠️ أدخل مبلغاً صحيحاً'); return;}
  const rec={
    type:txType, amount,
    cur:document.getElementById('txCur').value,
    cat:document.getElementById('txCat').value,
    user:document.getElementById('txUser').value,
    date:document.getElementById('txDate').value||today(),
    note:document.getElementById('txNote').value.trim(),
    ts:Date.now(), by:ME||S.adminId
  };
  if(!txEditId){
    const dup=S.tx.find(t=>t.type===rec.type&&Number(t.amount)===Number(rec.amount)&&t.cur===rec.cur&&t.cat===rec.cat&&t.date===rec.date);
    if(dup&&!confirm('⚠️ تنبيه تكرار!\nتوجد معاملة مطابقة تماماً (نفس المبلغ والفئة والتاريخ)'
      +(dup.by?'\nسجّلها: '+userName(dup.by):'')+(dup.note?'\nملاحظتها: '+dup.note:'')
      +'\n\nربما سجّلها شخص آخر من العائلة قبلك. هل تريد الإضافة على أي حال؟')){sndWarn(); return;}
  }
  if(txEditId){Object.assign(S.tx.find(x=>x.id===txEditId),rec); toast('تم التعديل ✏️'); sndOk();}
  else{rec.id=uid(); S.tx.push(rec); toast(txType==='income'?'تمت إضافة الدخل ✅':'تمت إضافة المصروف ✅'); txType==='income'?sndCash():sndOk();}
  if(!txEditId&&document.getElementById('txRepeat').checked){
    S.recurring.push({id:uid(),type:rec.type,amount:rec.amount,cur:rec.cur,cat:rec.cat,user:rec.user,
      day:parseInt(rec.date.slice(8),10)||1,note:rec.note,last:rec.date.slice(0,7)});
    toast('🔁 ستتكرر تلقائياً كل شهر يوم '+(parseInt(rec.date.slice(8),10)||1));
  }
  save(); closeModal('txModal'); renderHome(); renderTx();
  if(rec.type==='expense'){
    const b=S.budgets.find(x=>x.catId===rec.cat&&x.cur===rec.cur);
    if(b){
      const spent=spentFor(rec.cat,rec.cur);
      if(spent>b.amount)setTimeout(()=>{toast('🚨 تجاوزت ميزانية «'+catOf('expense',rec.cat).name+'» ('+fmt(spent)+' من '+fmt(b.amount)+' '+rec.cur+')'); sndWarn(); notif('🚨 تجاوز الميزانية','فئة «'+catOf('expense',rec.cat).name+'» تجاوزت الحد الشهري');},1200);
      else if(spent>=b.amount*0.8)setTimeout(()=>toast('⚠️ اقتربت من حد ميزانية «'+catOf('expense',rec.cat).name+'»'),1200);
    }
  }
}
function delTx(id){ askDelete('tx',id); }
function renderTx(){
  const fT=document.getElementById('fType').value,
        fC=document.getElementById('fCat').value,
        fCur=document.getElementById('fCur').value,
        fM=document.getElementById('fMonth').value,
        fS=document.getElementById('fSearch').value.trim();
  let list=S.tx.filter(t=>
    (!fT||t.type===fT)&&(!fC||t.cat===fC)&&(!fCur||t.cur===fCur)&&
    (!fM||t.date.startsWith(fM))&&
    (!fS||(t.note||'').includes(fS)||catOf(t.type,t.cat).name.includes(fS))
  ).sort((a,b)=>b.date.localeCompare(a.date)||((b.ts||0)-(a.ts||0)));
  // summary
  let inc={},exp={};
  list.forEach(t=>{const o=t.type==='income'?inc:exp; o[t.cur]=(o[t.cur]||0)+Number(t.amount);});
  const line=(o,cls,lbl)=>Object.entries(o).map(([c,v])=>`<div class="summary-line"><span>${lbl} (${c})</span><b class="${cls}">${fmt(v)} ${c}</b></div>`).join('');
  document.getElementById('txSummary').innerHTML=line(inc,'pos','إجمالي الدخل')+line(exp,'neg','إجمالي المصروف');
  document.getElementById('txList').innerHTML=list.length?list.map(t=>{
    const c=catOf(t.type,t.cat);
    return `<div class="item">
      <div class="icon">${c.icon}</div>
      <div class="info"><div class="t1">${esc(c.name)}</div><div class="t2">${dateAr(t.date)} · ${esc(userName(t.user))}${t.by&&t.by!==t.user?' · ✍️ سجّلها '+esc(userName(t.by)):''}${t.note?' · '+esc(t.note):''}</div></div>
      <div style="text-align:left"><div class="amount ${t.type==='income'?'pos':'neg'}">${t.type==='income'?'+':'−'}${fmt(t.amount)} ${esc(t.cur)}</div>
      <div class="acts" style="margin-top:5px"><button class="btn btn-ghost btn-sm" onclick="openTxModal(null,'${t.id}')">✏️</button><button class="btn btn-ghost btn-sm" onclick="delTx('${t.id}')">🗑️</button></div></div>
    </div>`;
  }).join(''):'<div class="empty"><div class="e-ic">🔍</div>لا توجد معاملات مطابقة</div>';
}

/* ================= TRANSFERS ================= */
let trEditId=null;
function calcTransfer(){
  const a=parseFloat(document.getElementById('trAmount').value)||0;
  const r=parseFloat(document.getElementById('trRate').value)||0;
  if(a&&r)document.getElementById('trRecvAmount').value=(a*r).toFixed(2);
}
function openTransferModal(editId){
  trEditId=editId||null;
  refreshFormSelects();
  document.getElementById('trModalTitle').textContent=editId?'تعديل حوالة':'حوالة جديدة';
  if(editId){
    const t=S.transfers.find(x=>x.id===editId);
    document.getElementById('trAmount').value=t.amount;
    document.getElementById('trCur').value=t.cur;
    document.getElementById('trRate').value=t.rate||'';
    document.getElementById('trRecvCur').value=t.recvCur;
    document.getElementById('trRecvAmount').value=t.recvAmount||'';
    document.getElementById('trFrom').value=t.from;
    document.getElementById('trTo').value=t.to;
    document.getElementById('trMethod').value=t.method||'';
    document.getElementById('trDate').value=t.date;
    document.getElementById('trNote').value=t.note||'';
  }else{
    ['trAmount','trRate','trRecvAmount','trMethod','trNote'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('trDate').value=today();
    document.getElementById('trFrom').value=ME||S.adminId;
    const other=S.users.find(u=>u.id!==(ME||S.adminId));
    if(other)document.getElementById('trTo').value=other.id;
    document.getElementById('trRecvCur').value='LYD';
  }
  document.getElementById('trModal').classList.add('open');
}
function saveTransfer(){
  const amount=parseFloat(document.getElementById('trAmount').value);
  if(!amount||amount<=0){toast('⚠️ أدخل مبلغاً صحيحاً'); return;}
  const rec={
    amount, cur:document.getElementById('trCur').value,
    rate:parseFloat(document.getElementById('trRate').value)||null,
    recvAmount:parseFloat(document.getElementById('trRecvAmount').value)||null,
    recvCur:document.getElementById('trRecvCur').value,
    from:document.getElementById('trFrom').value,
    to:document.getElementById('trTo').value,
    method:document.getElementById('trMethod').value.trim(),
    date:document.getElementById('trDate').value||today(),
    note:document.getElementById('trNote').value.trim(),
    ts:Date.now(), by:ME||S.adminId
  };
  if(rec.from===rec.to){toast('⚠️ المُرسِل والمُستلِم نفس الشخص'); return;}
  if(!trEditId){
    const dup=S.transfers.find(t=>Number(t.amount)===Number(rec.amount)&&t.cur===rec.cur&&t.from===rec.from&&t.to===rec.to&&t.date===rec.date);
    if(dup&&!confirm('⚠️ تنبيه تكرار!\nتوجد حوالة مطابقة (نفس المبلغ والمُرسِل والمُستلِم والتاريخ)'
      +(dup.by?'\nسجّلها: '+userName(dup.by):'')
      +'\n\nربما سجّلها شخص آخر قبلك. هل تريد الإضافة على أي حال؟')){sndWarn(); return;}
  }
  if(trEditId){Object.assign(S.transfers.find(x=>x.id===trEditId),rec); toast('تم التعديل ✏️');}
  else{rec.id=uid(); rec.status='sent'; S.transfers.push(rec); toast('تم تسجيل الحوالة ✈️');}
  save(); closeModal('trModal'); renderTransfers(); renderHome();
}
function confirmReceive(id){
  const t=S.transfers.find(x=>x.id===id);
  if(!confirm(`تأكيد استلام ${fmt(t.recvAmount||t.amount)} ${t.recvCur||t.cur} بواسطة ${userName(t.to)}؟`))return;
  t.status='received'; t.recvDate=today(); save(); renderTransfers(); renderHome(); toast('تم تأكيد الاستلام ✅'); sndCash();
}
function undoReceive(id){
  const t=S.transfers.find(x=>x.id===id);
  t.status='sent'; delete t.recvDate; save(); renderTransfers(); toast('أُعيدت إلى "في الطريق"');
}
function delTransfer(id){ askDelete('transfers',id); }
function renderTransfers(){
  const fSt=document.getElementById('ftStatus').value, fM=document.getElementById('ftMonth').value;
  const all=S.transfers;
  const pend=all.filter(t=>t.status==='sent');
  let sent={};
  all.forEach(t=>{sent[t.cur]=(sent[t.cur]||0)+Number(t.amount);});
  const sumLine=o=>Object.keys(o).length?Object.entries(o).map(([c,v])=>fmt(v)+' '+c).join('<br>'):'0';
  document.getElementById('trStats').innerHTML=`
    <div class="card"><div class="stat-icon">📤</div><h3>إجمالي المُرسَل</h3><div class="big" style="font-size:16px">${sumLine(sent)}</div></div>
    <div class="card"><div class="stat-icon">⏳</div><h3>في الطريق</h3><div class="big warn">${pend.length}</div></div>
    <div class="card"><div class="stat-icon">✅</div><h3>مستلمة</h3><div class="big pos">${all.length-pend.length}</div></div>`;
  const list=all.filter(t=>(!fSt||t.status===fSt)&&(!fM||t.date.startsWith(fM)))
    .sort((a,b)=>b.date.localeCompare(a.date)||((b.ts||0)-(a.ts||0)));
  document.getElementById('trList').innerHTML=list.length?list.map(t=>`
    <div class="item">
      <div class="icon">✈️</div>
      <div class="info">
        <div class="t1">${esc(userName(t.from))} ← ${esc(userName(t.to))} <span class="badge ${t.status==='sent'?'sent':'recv'}">${t.status==='sent'?'⏳ في الطريق':'✅ مستلمة'}</span></div>
        <div class="t2">${dateAr(t.date)}${t.method?' · '+esc(t.method):''}${t.rate?' · سعر الصرف: '+t.rate:''}${t.note?' · '+esc(t.note):''}${t.recvDate?' · استُلمت: '+dateAr(t.recvDate):''}</div>
      </div>
      <div style="text-align:left">
        <div class="amount">${fmt(t.amount)} ${esc(t.cur)}</div>
        ${t.recvAmount?`<div class="t2" style="color:var(--green)">يستلم: ${fmt(t.recvAmount)} ${esc(t.recvCur)}</div>`:''}
        <div class="acts" style="margin-top:5px">
          ${t.status==='sent'?`<button class="btn btn-green btn-sm" onclick="confirmReceive('${t.id}')">✓ استلام</button>`:`<button class="btn btn-ghost btn-sm" onclick="undoReceive('${t.id}')">↩</button>`}
          <button class="btn btn-ghost btn-sm" onclick="openTransferModal('${t.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="delTransfer('${t.id}')">🗑️</button>
        </div>
      </div>
    </div>`).join(''):'<div class="empty"><div class="e-ic">✈️</div>لا توجد حوالات بعد</div>';
}

/* ================= REPORTS ================= */
let pieChart=null, barChart=null, netChart=null;
function renderReports(){
  const cur=document.getElementById('rCur').value||((S.currencies[0]||{}).code);
  const m=document.getElementById('rMonth').value||thisMonth();
  document.getElementById('rMonth').value=m;
  const txM=S.tx.filter(t=>t.cur===cur&&t.date.startsWith(m));
  // pie: expenses by cat
  const byCat={};
  txM.filter(t=>t.type==='expense').forEach(t=>{
    const c=catOf('expense',t.cat); byCat[c.icon+' '+c.name]=(byCat[c.icon+' '+c.name]||0)+Number(t.amount);
  });
  const labels=Object.keys(byCat), vals=Object.values(byCat);
  const COLORS=['#12b8a2','#c9a227','#dd3345','#2563eb','#7c3aed','#db2777','#12965e','#e3a44a','#0891b2','#ea580c','#9333ea','#61708b'];
  if(typeof Chart!=='undefined'){
    document.getElementById('pieFallback').innerHTML='';
    if(pieChart)pieChart.destroy();
    if(labels.length){
      pieChart=new Chart(document.getElementById('pieChart'),{
        type:'doughnut',
        data:{labels,datasets:[{data:vals,backgroundColor:COLORS,borderWidth:0}]},
        options:{maintainAspectRatio:false,plugins:{legend:{position:'left',labels:{color:getComputedStyle(document.body).getPropertyValue('--text'),font:{family:'IBM Plex Sans Arabic, Segoe UI'}}}}}
      });
    }else{document.getElementById('pieFallback').innerHTML='<div class="empty">لا مصروفات بعملة '+esc(cur)+' في هذا الشهر</div>';}
    // bar: last 6 months
    const months=[]; const d=new Date(m+'-01T00:00:00');
    for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1); months.push(x.toISOString().slice(0,7));}
    const incArr=months.map(mm=>S.tx.filter(t=>t.cur===cur&&t.type==='income'&&t.date.startsWith(mm)).reduce((s,t)=>s+Number(t.amount),0));
    const expArr=months.map(mm=>S.tx.filter(t=>t.cur===cur&&t.type==='expense'&&t.date.startsWith(mm)).reduce((s,t)=>s+Number(t.amount),0));
    if(barChart)barChart.destroy();
    const tc=getComputedStyle(document.body).getPropertyValue('--text');
    barChart=new Chart(document.getElementById('barChart'),{
      type:'bar',
      data:{labels:months,datasets:[
        {label:'دخل',data:incArr,backgroundColor:'#12965e',borderRadius:8},
        {label:'مصروف',data:expArr,backgroundColor:'#dd3345',borderRadius:8}
      ]},
      options:{maintainAspectRatio:false,scales:{x:{ticks:{color:tc}},y:{ticks:{color:tc}}},plugins:{legend:{labels:{color:tc}}}}
    });
    // net worth over last 12 months
    const dm=new Date(m+'-01T00:00:00');
    const nLabels=[],nData=[];
    for(let i=11;i>=0;i--){
      const x=new Date(dm.getFullYear(),dm.getMonth()-i,1);
      const mm=x.toISOString().slice(0,7);
      nLabels.push(mm);
      const net=S.tx.filter(t=>t.cur===cur&&t.date.slice(0,7)<=mm)
          .reduce((s,t)=>s+(t.type==='income'?1:-1)*Number(t.amount),0)
        -S.transfers.filter(t=>t.cur===cur&&t.date.slice(0,7)<=mm)
          .reduce((s,t)=>s+Number(t.amount),0);
      nData.push(net);
    }
    if(netChart)netChart.destroy();
    netChart=new Chart(document.getElementById('netChart'),{
      type:'line',
      data:{labels:nLabels,datasets:[{label:'صافي الثروة ('+cur+')',data:nData,
        borderColor:'#12b8a2',backgroundColor:'#12b8a233',fill:true,tension:.35,pointRadius:3}]},
      options:{maintainAspectRatio:false,scales:{x:{ticks:{color:tc}},y:{ticks:{color:tc}}},plugins:{legend:{labels:{color:tc}}}}
    });
  }else{
    document.getElementById('pieFallback').innerHTML=labels.map((l,i)=>`<div class="summary-line"><span>${l}</span><b>${fmt(vals[i])} ${esc(cur)}</b></div>`).join('')||'<div class="empty">لا بيانات</div>';
  }
  // summary
  const inc=txM.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
  const exp=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const trM=S.transfers.filter(t=>t.cur===cur&&t.date.startsWith(m)).reduce((s,t)=>s+Number(t.amount),0);
  document.getElementById('rSummary').innerHTML=`
    <div class="summary-line"><span>إجمالي الدخل</span><b class="pos">${fmt(inc)} ${esc(cur)}</b></div>
    <div class="summary-line"><span>إجمالي المصروف</span><b class="neg">${fmt(exp)} ${esc(cur)}</b></div>
    <div class="summary-line"><span>حوالات مُرسلة</span><b class="warn">${fmt(trM)} ${esc(cur)}</b></div>
    <div class="summary-line"><span>الصافي</span><b class="${inc-exp-trM>=0?'pos':'neg'}">${fmt(inc-exp-trM)} ${esc(cur)}</b></div>`;
}

/* ================= SETTINGS ================= */
function renderSettings(){
  document.getElementById('setAppName').textContent=S.appName;
  document.getElementById('setAdminName').textContent=userName(S.adminId);
  document.getElementById('darkBtn').textContent=S.theme.dark?'☀️':'🌙';
  // backgrounds
  document.getElementById('bgGrid').innerHTML=BGS.map((bg,i)=>
    `<div class="bg-opt ${!S.theme.customBg&&S.theme.preset===i?'on':''}" style="background:linear-gradient(135deg,${bg[0]},${bg[1]})" onclick="setBg(${i})"></div>`).join('');
  // users
  document.getElementById('userChips').innerHTML=S.users.map(u=>
    `<span class="chip">${u.id===S.adminId?'👑 ':''}${esc(u.avatar||'')} ${esc(u.name)} <span style="cursor:pointer" onclick="renameUser('${u.id}')">✏️</span>${u.id!==S.adminId?` <span class="del" onclick="delUser('${u.id}')">✕</span>`:''}</span>`).join('');
  // currencies
  document.getElementById('curChips').innerHTML=S.currencies.map(c=>
    `<span class="chip">${esc(c.code)} — ${esc(c.name)} <span class="del" onclick="delCurrency('${esc(c.code)}')">✕</span></span>`).join('');
  // cats
  document.getElementById('expCatChips').innerHTML=S.cats.expense.map(c=>
    `<span class="chip">${c.icon} ${esc(c.name)} <span class="del" onclick="delCat('expense','${c.id}')">✕</span></span>`).join('');
  document.getElementById('incCatChips').innerHTML=S.cats.income.map(c=>
    `<span class="chip">${c.icon} ${esc(c.name)} <span class="del" onclick="delCat('income','${c.id}')">✕</span></span>`).join('');
  // pin
  document.getElementById('pinStatus').textContent=S.pin?'مفعل 🔒':'غير مفعل';
  document.getElementById('pinBtn').textContent=S.pin?'تغيير / إزالة':'تعيين';
  // my identity, my pin, my privacy
  const meU=me();
  document.getElementById('setMeName').textContent=meU?meU.name:'لم تسجّل الدخول';
  document.getElementById('myPinStatus').textContent=meU&&meU.pin?'مفعل 🔒':'غير مفعل — أي شخص يستطيع الدخول باسمك';
  document.getElementById('myPinBtn').textContent=meU&&meU.pin?'تغيير':'تعيين';
  document.getElementById('myPrivStatus').textContent=meU&&meU.private?'رصيدك مخفي عن الآخرين 🙈':'رصيدك ظاهر للجميع';
  document.getElementById('myPrivBtn').textContent=meU&&meU.private?'إظهار':'إخفاء';
  document.getElementById('myAvatarNow').textContent=(meU&&meU.avatar)||'👤 (لم تُحدَّد)';
  document.getElementById('appIconNow').textContent=S.appIcon||'💼 الشعار الأصلي';
  // sound & notify
  document.getElementById('soundBtn').textContent=S.sound===false?'🔇 مغلقة':'🔊 مفعلة';
  document.getElementById('notifBtn').textContent=S.notify===false?'🔕 مغلقة':'🔔 مفعلة';
  // recurring
  document.getElementById('recChips').innerHTML=(S.recurring||[]).length?S.recurring.map(r=>{
    const c=catOf(r.type,r.cat);
    return `<span class="chip">🔁 ${c.icon} ${esc(c.name)} — ${fmt(r.amount)} ${esc(r.cur)} (يوم ${r.day}) <span class="del" onclick="delRecurring('${r.id}')">✕</span></span>`;
  }).join(''):'<span style="font-size:12px;color:var(--muted)">لا يوجد</span>';
  // sync
  document.getElementById('syncUrl').value=S.sync.url||'';
  document.getElementById('syncCode').value=S.sync.code||'';   // show the REAL value, never a fake default
  document.getElementById('syncApiKey').value=S.sync.apiKey||'';
  const tb=document.getElementById('syncToggleBtn');
  tb.textContent=S.sync.enabled?'إيقاف':'تفعيل';
  tb.className='btn btn-sm '+(S.sync.enabled?'btn-red':'btn-primary');
  updateSyncStatus();
  renderHist();
  renderAudit();
}
function setBg(i){S.theme.preset=i; S.theme.customBg=null; save(); applyTheme(); renderSettings();}
function renameApp(){
  const n=prompt('اسم المنظومة الجديد:',S.appName);
  if(n&&n.trim()){S.appName=n.trim(); save(); renderHeader(); renderSettings(); toast('تم تغيير الاسم ✅');}
}
function renameAdmin(){renameUser(S.adminId);}
function renameUser(id){
  const u=S.users.find(u=>u.id===id);
  const n=prompt('الاسم الجديد:',u.name);
  if(n&&n.trim()){u.name=n.trim(); save(); renderHeader(); renderSettings(); toast('تم التغيير ✅');}
}
function addUser(){
  const n=prompt('اسم الشخص الجديد:');
  if(n&&n.trim()){S.users.push({id:uid(),name:n.trim()}); save(); renderSettings(); toast('تمت الإضافة ✅');}
}
function delUser(id){
  if(S.tx.some(t=>t.user===id)||S.transfers.some(t=>t.from===id||t.to===id)){toast('⚠️ لا يمكن الحذف — مرتبط بمعاملات'); return;}
  const reason=reasonPrompt(); if(reason===null)return;
  logAudit('delete','users',S.users.find(u=>u.id===id),reason);
  S.users=S.users.filter(u=>u.id!==id); save(); renderSettings();
}
function addCurrency(){
  const code=prompt('رمز العملة (مثال: TND):'); if(!code)return;
  const cc=code.trim().toUpperCase();
  if(S.currencies.some(c=>c.code===cc)){toast('⚠️ العملة موجودة'); return;}
  const name=prompt('اسم العملة:',cc)||cc;
  S.currencies.push({code:cc,name:name.trim()}); save(); renderSettings(); toast('تمت الإضافة ✅');
}
function delCurrency(code){
  if(S.tx.some(t=>t.cur===code)||S.transfers.some(t=>t.cur===code||t.recvCur===code)){toast('⚠️ لا يمكن الحذف — مستخدمة في معاملات'); return;}
  const reason=reasonPrompt(); if(reason===null)return;
  logAudit('delete','currencies',S.currencies.find(c=>c.code===code),reason);
  S.currencies=S.currencies.filter(c=>c.code!==code); save(); renderSettings();
}
function addCat(type){
  const n=prompt('اسم الفئة الجديدة:'); if(!n||!n.trim())return;
  const icon=prompt('رمز تعبيري للفئة (اختياري):','📌')||'📌';
  S.cats[type].push({id:uid(),name:n.trim(),icon:icon.trim()}); save(); renderSettings(); toast('تمت الإضافة ✅');
}
function delCat(type,id){
  if(S.tx.some(t=>t.cat===id)){toast('⚠️ لا يمكن الحذف — مستخدمة في معاملات'); return;}
  const reason=reasonPrompt(); if(reason===null)return;
  logAudit('delete','cats',S.cats[type].find(c=>c.id===id),reason);
  S.cats[type]=S.cats[type].filter(c=>c.id!==id); save(); renderSettings();
}

/* ================= BACKUP ================= */
function download(name,content,type){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type}));
  a.download=name; a.click(); URL.revokeObjectURL(a.href);
}
function exportData(){
  download('amwali-backup-'+today()+'.json',JSON.stringify(S,null,2),'application/json');
  toast('تم التصدير 📥');
}
function importData(inp){
  const f=inp.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(!d.tx&&!d.transfers)throw 0;
      if(!confirm('سيتم استبدال البيانات الحالية بالنسخة المستوردة. متابعة؟'))return;
      snapshotLocal(true); cloudSnapshot(true);
      S=Object.assign(JSON.parse(JSON.stringify(DEFAULTS)),d);
      save(); applyTheme(); renderHeader(); renderHome(); renderSettings(); refreshFormSelects();
      toast('تم الاستيراد بنجاح ✅');
    }catch(e){toast('⚠️ ملف غير صالح');}
  };
  r.readAsText(f); inp.value='';
}
function exportCSV(){
  const BOM='\uFEFF';
  let rows=[['النوع','المبلغ','العملة','الفئة','الشخص','التاريخ','ملاحظة']];
  S.tx.forEach(t=>rows.push([t.type==='income'?'دخل':'مصروف',t.amount,t.cur,catOf(t.type,t.cat).name,userName(t.user),t.date,t.note||'']));
  rows.push([]);
  rows.push(['حوالة: من','إلى','المبلغ','العملة','المستلم يستلم','عملة الاستلام','الحالة','تاريخ الإرسال','تاريخ الاستلام','ملاحظة']);
  S.transfers.forEach(t=>rows.push([userName(t.from),userName(t.to),t.amount,t.cur,t.recvAmount||'',t.recvCur||'',t.status==='sent'?'في الطريق':'مستلمة',t.date,t.recvDate||'',t.note||'']));
  const csv=BOM+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  download('amwali-'+today()+'.csv',csv,'text/csv;charset=utf-8');
  toast('تم تصدير CSV 📊');
}
function wipeData(){
  const reason=prompt('⚠️ سيتم مسح كل البيانات!\nاكتب سبب المسح (إجباري — سيبقى مسجلاً باسمك):');
  if(reason===null)return;
  if(reason.trim().length<3){toast('⚠️ لا مسح بدون سبب واضح'); return;}
  if(!confirm('تأكيد أخير! ستُحفظ نقطة استعادة قبل المسح.'))return;
  snapshotLocal(true); cloudSnapshot(true);
  const wiper=ME||S.adminId, wipeNote=reason.trim();
  localStorage.removeItem(LS_KEY);
  clearShadow();
  S=JSON.parse(JSON.stringify(DEFAULTS));
  S.audit=[{id:uid(),ts:Date.now(),action:'wipe',coll:'all',summary:'مسح كل بيانات المنظومة',reason:wipeNote,by:wiper}];
  save(); applyTheme(); renderHeader(); renderHome(); renderSettings(); refreshFormSelects();
  openTab('home'); toast('تم مسح البيانات');
}

/* ================= BUDGETS ================= */
function openBudgetModal(){
  fillSelect(document.getElementById('bCat'),S.cats.expense.map(c=>({v:c.id,t:c.icon+' '+c.name})));
  fillSelect(document.getElementById('bCur'),S.currencies.map(c=>({v:c.code,t:c.code+' — '+c.name})));
  document.getElementById('bAmount').value='';
  document.getElementById('budgetModal').classList.add('open');
}
function saveBudget(){
  const amount=parseFloat(document.getElementById('bAmount').value);
  if(!amount||amount<=0){toast('⚠️ أدخل مبلغاً صحيحاً'); return;}
  const catId=document.getElementById('bCat').value, cur=document.getElementById('bCur').value;
  S.budgets=S.budgets.filter(b=>!(b.catId===catId&&b.cur===cur));
  S.budgets.push({id:'b_'+catId+'_'+cur,catId,cur,amount});
  save(); closeModal('budgetModal'); renderHome(); toast('تم تحديد الميزانية 🎯');
}
function delBudget(catId,cur){
  const reason=reasonPrompt(); if(reason===null)return;
  logAudit('delete','budgets',S.budgets.find(b=>b.catId===catId&&b.cur===cur),reason);
  S.budgets=S.budgets.filter(b=>!(b.catId===catId&&b.cur===cur));
  save(); renderHome();
}
function spentFor(catId,cur){
  const m=thisMonth();
  return S.tx.filter(t=>t.type==='expense'&&t.cat===catId&&t.cur===cur&&t.date.startsWith(m))
    .reduce((s,t)=>s+Number(t.amount),0);
}
function renderBudgets(){
  const el=document.getElementById('budgetList');
  if(!S.budgets.length){el.innerHTML='<div class="empty"><div class="e-ic">🎯</div>حدد حداً شهرياً لأي فئة لمراقبة صرفك</div>'; return;}
  el.innerHTML=S.budgets.map(b=>{
    const c=catOf('expense',b.catId);
    const spent=spentFor(b.catId,b.cur);
    const pct=Math.min(100,Math.round(spent/b.amount*100));
    const color=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';
    return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700">
        <span>${c.icon} ${esc(c.name)}</span>
        <span>${fmt(spent)} / ${fmt(b.amount)} ${esc(b.cur)} <span class="del" style="cursor:pointer;color:var(--red)" onclick="delBudget('${b.catId}','${esc(b.cur)}')">✕</span></span>
      </div>
      <div style="height:8px;background:var(--card2);border-radius:99px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color}"></div></div>
      ${pct>=100?'<div style="color:var(--red);font-size:11px;margin-top:4px;font-weight:700">⚠️ تم تجاوز الميزانية!</div>':pct>=80?'<div style="color:var(--amber);font-size:11px;margin-top:4px;font-weight:700">⚠️ اقتربت من الحد ('+pct+'%)</div>':''}
    </div>`;
  }).join('');
}

/* ================= RECURRING ================= */
function applyRecurring(){
  let added=0;
  (S.recurring||[]).forEach(r=>{
    let [y,mo]=r.last.split('-').map(Number);
    for(let guard=0;guard<120;guard++){
      mo++; if(mo>12){mo=1;y++;}
      const mm=y+'-'+String(mo).padStart(2,'0');
      if(mm>thisMonth())break;
      const dim=new Date(y,mo,0).getDate();
      const dstr=mm+'-'+String(Math.min(r.day,dim)).padStart(2,'0');
      if(dstr>today())break;
      S.tx.push({id:uid(),type:r.type,amount:r.amount,cur:r.cur,cat:r.cat,user:r.user,date:dstr,note:(r.note?r.note+' ':'')+'🔁 تلقائي',ts:Date.now()});
      r.last=mm; added++;
    }
  });
  if(added){save(); toast('🔁 أُضيفت '+added+' معاملة متكررة تلقائياً');}
}
function delRecurring(id){ askDelete('recurring',id); }

/* ================= DEBTS ================= */
let debtEditId=null, debtDir='lent';
function setDebtDir(d){
  debtDir=d;
  document.getElementById('segLent').classList.toggle('on',d==='lent');
  document.getElementById('segBor').classList.toggle('on',d==='borrowed');
}
function debtPaid(d){ return (d.payments||[]).reduce((s,p)=>s+Number(p.amount),0); }
function debtRemain(d){ return Number(d.amount)-debtPaid(d); }
function openDebtModal(editId){
  debtEditId=editId||null;
  fillSelect(document.getElementById('dbCur'),S.currencies.map(c=>({v:c.code,t:c.code+' — '+c.name})));
  document.getElementById('debtModalTitle').textContent=editId?'تعديل دين':'دين / سلفة جديدة';
  if(editId){
    const d=S.debts.find(x=>x.id===editId);
    setDebtDir(d.dir);
    document.getElementById('dbPerson').value=d.person;
    document.getElementById('dbAmount').value=d.amount;
    document.getElementById('dbCur').value=d.cur;
    document.getElementById('dbDate').value=d.date;
    document.getElementById('dbDue').value=d.due||'';
    document.getElementById('dbNote').value=d.note||'';
  }else{
    setDebtDir('lent');
    ['dbPerson','dbAmount','dbDue','dbNote'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('dbDate').value=today();
  }
  document.getElementById('debtModal').classList.add('open');
}
function saveDebt(){
  const person=document.getElementById('dbPerson').value.trim();
  const amount=parseFloat(document.getElementById('dbAmount').value);
  if(!person){toast('⚠️ أدخل اسم الشخص'); return;}
  if(!amount||amount<=0){toast('⚠️ أدخل مبلغاً صحيحاً'); return;}
  const rec={
    person, dir:debtDir, amount,
    cur:document.getElementById('dbCur').value,
    date:document.getElementById('dbDate').value||today(),
    due:document.getElementById('dbDue').value||null,
    note:document.getElementById('dbNote').value.trim(), ts:Date.now(), by:ME||S.adminId
  };
  if(!debtEditId){
    const dup=S.debts.find(d=>d.person.trim()===rec.person&&Number(d.amount)===Number(rec.amount)&&d.cur===rec.cur&&d.dir===rec.dir&&d.date===rec.date);
    if(dup&&!confirm('⚠️ تنبيه تكرار!\nيوجد دين مطابق (نفس الشخص والمبلغ والتاريخ)'
      +(dup.by?'\nسجّله: '+userName(dup.by):'')
      +'\n\nهل تريد الإضافة على أي حال؟')){sndWarn(); return;}
  }
  if(debtEditId){Object.assign(S.debts.find(x=>x.id===debtEditId),rec); toast('تم التعديل ✏️');}
  else{rec.id=uid(); rec.payments=[]; S.debts.push(rec); toast('تم التسجيل 🤝');}
  save(); closeModal('debtModal'); renderDebts();
}
function addPayment(id){
  const d=S.debts.find(x=>x.id===id);
  const v=parseFloat(prompt('مبلغ التسديد ('+d.cur+') — المتبقي: '+fmt(debtRemain(d)),fmt(debtRemain(d)).replace(/,/g,'')));
  if(!v||v<=0)return;
  d.payments=d.payments||[]; d.payments.push({amount:v,date:today()});
  save(); renderDebts();
  if(debtRemain(d)<=0){toast('✅ سُدِّد بالكامل 🎉'); sndCash(); confetti();}
  else{toast('تم تسجيل التسديد — المتبقي: '+fmt(debtRemain(d))+' '+d.cur); sndOk();}
}
function delDebt(id){ askDelete('debts',id); }
function renderDebts(){
  const fD=document.getElementById('fdDir').value, fS=document.getElementById('fdStatus').value;
  let lent={},bor={};
  S.debts.forEach(d=>{
    const r=debtRemain(d); if(r<=0)return;
    const o=d.dir==='lent'?lent:bor; o[d.cur]=(o[d.cur]||0)+r;
  });
  const line=o=>Object.keys(o).length?Object.entries(o).map(([c,v])=>fmt(v)+' '+c).join('<br>'):'0';
  document.getElementById('debtStats').innerHTML=`
    <div class="card"><div class="stat-icon">💰</div><h3>لك (متبقٍ)</h3><div class="big pos" style="font-size:17px">${line(lent)}</div></div>
    <div class="card"><div class="stat-icon">📥</div><h3>عليك (متبقٍ)</h3><div class="big neg" style="font-size:17px">${line(bor)}</div></div>`;
  const list=S.debts.filter(d=>{
    const paid=debtRemain(d)<=0;
    return (!fD||d.dir===fD)&&(fS===''||(fS==='paid'?paid:!paid));
  }).sort((a,b)=>b.date.localeCompare(a.date)||((b.ts||0)-(a.ts||0)));
  document.getElementById('debtList').innerHTML=list.length?list.map(d=>{
    const remain=debtRemain(d), paid=debtPaid(d);
    const overdue=d.due&&remain>0&&d.due<today();
    return `<div class="item">
      <div class="icon">${d.dir==='lent'?'💰':'📥'}</div>
      <div class="info">
        <div class="t1">${esc(d.person)} <span class="badge ${remain<=0?'recv':'sent'}">${remain<=0?'✅ مسدَّد':d.dir==='lent'?'💰 لي عنده':'📥 عليّ له'}</span>${overdue?' <span class="badge" style="background:#fee2e2;color:#b91c1c">⏰ متأخر</span>':''}</div>
        <div class="t2">${dateAr(d.date)}${d.due?' · السداد: '+dateAr(d.due):''}${paid?' · سُدِّد: '+fmt(paid)+' '+esc(d.cur):''}${d.note?' · '+esc(d.note):''}</div>
      </div>
      <div style="text-align:left">
        <div class="amount ${d.dir==='lent'?'pos':'neg'}">${fmt(remain>0?remain:d.amount)} ${esc(d.cur)}</div>
        ${remain>0&&paid?`<div class="t2">من أصل ${fmt(d.amount)}</div>`:''}
        <div class="acts" style="margin-top:5px">
          ${remain>0?`<button class="btn btn-green btn-sm" onclick="addPayment('${d.id}')">تسديد</button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="openDebtModal('${d.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="delDebt('${d.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="e-ic">🤝</div>لا توجد ديون مطابقة</div>';
}
function buildDebtsReport(){
  const list=S.debts.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length){toast('⚠️ لا توجد ديون'); return null;}
  const rows=list.map(d=>{
    const remain=debtRemain(d);
    return `<tr><td>${esc(d.person)}</td><td>${d.dir==='lent'?'لي':'عليّ'}</td><td dir="ltr">${fmt(d.amount)} ${esc(d.cur)}</td><td dir="ltr">${fmt(debtPaid(d))}</td><td dir="ltr">${fmt(remain)}</td><td>${dateAr(d.date)}</td><td>${d.due?dateAr(d.due):'—'}</td><td>${remain<=0?'مسدَّد':'قائم'}</td><td>${esc(d.note||'')}</td></tr>`;
  }).join('');
  return {title:'دفتر الديون والسلف',sub:'',
    body:`<table><thead><tr><th>الشخص</th><th>النوع</th><th>المبلغ</th><th>المُسدَّد</th><th>المتبقي</th><th>التاريخ</th><th>موعد السداد</th><th>الحالة</th><th>ملاحظة</th></tr></thead><tbody>${rows}</tbody></table>`};
}

/* ================= PIN HASHING — لا تُخزَّن الأرقام السرية نصاً صريحاً ================= */
async function sha256Pin(s){
  try{
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('amwali:'+s));
    return 'sha256:'+[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }catch(e){ return null; }   // بيئة غير آمنة (http) — نبقى على النص الصريح
}
async function pinMatch(stored,input){
  if(!stored) return true;
  if(String(stored).startsWith('sha256:')){ return (await sha256Pin(input))===stored; }
  return input===stored;      // رقم قديم غير مشفَّر
}
async function hashOrPlain(s){ return (await sha256Pin(s))||s; }

/* ================= USER LOGIN — دخول شخصي لكل فرد ================= */
let loginSel=null;
function showLogin(){
  loginSel=null; renderLoginUsers();
  document.getElementById('loginPinRow').style.display='none';
  document.getElementById('loginErr').textContent='';
  document.getElementById('loginScreen').style.display='flex';
}
function renderLoginUsers(){
  const el=document.getElementById('loginUsers'); if(!el)return;
  el.innerHTML=S.users.map(u=>
    `<button class="login-user ${loginSel===u.id?'on':''}" onclick="loginPick('${u.id}')"><span style="font-size:22px">${esc(u.avatar||'👤')}</span><br>${esc(u.name)}${u.pin?' 🔒':''}</button>`).join('');
}
function loginPick(id){
  loginSel=id; renderLoginUsers();
  document.getElementById('loginErr').textContent='';
  const u=S.users.find(x=>x.id===id);
  if(u&&u.pin){
    document.getElementById('loginPinRow').style.display='block';
    document.getElementById('loginPin').value='';
    setTimeout(()=>{try{document.getElementById('loginPin').focus();}catch(e){}},100);
  }else{
    document.getElementById('loginPinRow').style.display='none';
    loginConfirm();
  }
}
async function loginConfirm(){
  if(!loginSel){ document.getElementById('loginErr').textContent='اختر اسمك أولاً'; return; }
  const u=S.users.find(x=>x.id===loginSel); if(!u)return;
  if(u.pin){
    const v=document.getElementById('loginPin').value;
    if(!(await pinMatch(u.pin,v))){ document.getElementById('loginErr').textContent='رقم سري خاطئ — حاول مجدداً'; document.getElementById('loginPin').value=''; return; }
    if(!String(u.pin).startsWith('sha256:')){ const h=await sha256Pin(v); if(h){ u.pin=h; save(); } }   // ترقية رقم قديم
  }
  ME=u.id; try{localStorage.setItem(ME_KEY,ME);}catch(e){}
  document.getElementById('loginPin').value='';
  document.getElementById('loginScreen').style.display='none';
  renderHeader(); if(currentTab==='home')renderHome(); if(currentTab==='settings')renderSettings();
  toast('أهلاً '+u.name+' 👋'); sndOk();
}
function logout(){
  ME=null; try{localStorage.removeItem(ME_KEY);}catch(e){}
  renderHeader(); showLogin();
}
function switchUser(){ logout(); }
function addFamilyMembers(){
  const names=['طارق','دويني','سعاد','فاطمة','بدر','علي'];
  const missing=names.filter(n=>!S.users.some(u=>u.name.trim()===n));
  if(!missing.length){toast('كل أفراد العائلة موجودون ✅'); return;}
  if(!confirm('سيُضاف: '+missing.join('، ')+'\n(إن كان أحدهم موجوداً باسم آخر — مثل «سوسو» بدل «سعاد» — الأفضل تعديل اسمه بدل الإضافة)\nمتابعة؟'))return;
  missing.forEach(n=>S.users.push({id:uid(),name:n,pin:null,private:false}));
  save(); renderSettings(); refreshFormSelects();
  toast('أُضيف: '+missing.join('، ')+' ✅'); sndOk();
}
function loginCheck(){
  const u=me();
  if(!u || u.pin) showLogin();   // no identity yet, or identity is PIN-protected → ask on every open
}
async function setMyPin(){
  const u=me(); if(!u){ showLogin(); return; }
  if(u.pin){
    const cur=prompt('أدخل رقمك السري الحالي:');
    if(cur===null)return;
    if(!(await pinMatch(u.pin,cur))){toast('⚠️ رقم خاطئ'); return;}
  }
  const n=prompt(u.pin?'الرقم الجديد (اتركه فارغاً لإزالته):':'اختر رقماً سرياً لدخولك (4 أرقام أو أكثر):');
  if(n===null)return;
  u.pin=n.trim()?await hashOrPlain(n.trim()):null;
  save(); renderSettings();
  toast(u.pin?'تم تعيين رقمك السري 🔒 (مشفَّر)':'أُزيل رقمك السري 🔓');
}
function toggleMyPrivacy(){
  const u=me(); if(!u){ toast('⚠️ سجّل دخولك أولاً'); showLogin(); return; }
  u.private=!u.private; save(); renderSettings(); if(currentTab==='home')renderHome();
  toast(u.private?'أصبح رصيدك مخفياً عن الآخرين 🙈':'أصبح رصيدك ظاهراً للجميع 👁️');
}

/* ================= PIN LOCK ================= */
async function setPin(){
  if(S.pin){
    const cur=prompt('أدخل الرقم السري الحالي:');
    if(cur===null)return;
    if(!(await pinMatch(S.pin,cur))){toast('⚠️ رقم خاطئ'); return;}
  }
  const n=prompt(S.pin?'الرقم الجديد (اتركه فارغاً لإزالة القفل):':'اختر رقماً سرياً (4 أرقام أو أكثر):');
  if(n===null)return;
  S.pin=n.trim()?await hashOrPlain(n.trim()):null;
  save(); renderSettings();
  toast(S.pin?'تم تفعيل القفل 🔒 (مشفَّر)':'تمت إزالة القفل 🔓');
}
function lockCheck(){
  if(S.pin){
    document.getElementById('lockScreen').style.display='flex';
    setTimeout(()=>{try{document.getElementById('pinInput').focus();}catch(e){}},150);
  }
}
async function tryUnlock(){
  const v=document.getElementById('pinInput').value;
  if(await pinMatch(S.pin,v)){
    if(S.pin&&!String(S.pin).startsWith('sha256:')){ const h=await sha256Pin(v); if(h){ S.pin=h; save(); } }   // ترقية
    document.getElementById('lockScreen').style.display='none';
    document.getElementById('pinInput').value='';
    document.getElementById('pinErr').textContent='';
  }else{
    document.getElementById('pinErr').textContent='رقم خاطئ — حاول مجدداً';
    document.getElementById('pinInput').value='';
  }
}
document.getElementById('pinInput').addEventListener('keydown',e=>{if(e.key==='Enter')tryUnlock();});
document.getElementById('loginPin').addEventListener('keydown',e=>{if(e.key==='Enter')loginConfirm();});

/* ================= AUDIT LOG — سجل الحذف (من حذف ماذا ولماذا) ================= */
function auditSummary(coll,item){
  try{
    if(coll==='tx'){const c=catOf(item.type,item.cat);return (item.type==='income'?'دخل':'مصروف')+' '+fmt(item.amount)+' '+item.cur+' ('+c.name+') بتاريخ '+item.date+' — '+userName(item.user);}
    if(coll==='transfers')return 'حوالة '+fmt(item.amount)+' '+item.cur+' من '+userName(item.from)+' إلى '+userName(item.to)+' بتاريخ '+item.date;
    if(coll==='debts')return 'دين '+fmt(item.amount)+' '+item.cur+' — '+item.person;
    if(coll==='goals')return 'هدف ادخار «'+item.name+'»';
    if(coll==='recurring'){const c=catOf(item.type,item.cat);return 'معاملة متكررة ('+c.name+' — '+fmt(item.amount)+' '+item.cur+')';}
    if(coll==='budgets')return 'ميزانية '+fmt(item.amount)+' '+item.cur+' ('+catOf('expense',item.catId).name+')';
    if(coll==='users')return 'شخص «'+item.name+'»';
    if(coll==='currencies')return 'عملة '+item.code;
    if(coll==='cats')return 'فئة «'+item.name+'»';
    if(coll==='all')return 'كل بيانات المنظومة';
  }catch(e){}
  return coll;
}
function logAudit(action,coll,item,reason){
  S.audit=S.audit||[];
  S.audit.push({id:uid(),ts:Date.now(),action,coll,summary:auditSummary(coll,item),reason:String(reason||'').trim(),by:ME||S.adminId});
  if(S.audit.length>400)S.audit.splice(0,S.audit.length-400);
}
function reasonPrompt(){
  const r=prompt('سبب الحذف (إجباري — سيُسجَّل باسمك في سجل الحذف):');
  if(r===null)return null;
  if(r.trim().length<3){toast('⚠️ لا حذف بدون سبب واضح'); return null;}
  return r.trim();
}
function renderAudit(){
  const el=document.getElementById('auditList'); if(!el)return;
  const ICON={delete:'🗑️',restore:'↩️',wipe:'🧨'};
  const list=(S.audit||[]).slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,60);
  el.innerHTML=list.length?list.map(a=>
    `<div class="set-row"><div><div class="s1">${ICON[a.action]||'📝'} ${esc(userName(a.by))} — ${a.action==='restore'?'استرجع':'حذف'}: ${esc(a.summary)}</div>
      <div class="s2">السبب: ${esc(a.reason||'—')} · ${fmtTs(a.ts)}</div></div></div>`).join('')
    :'<div style="font-size:12px;color:var(--muted)">لا عمليات حذف بعد — كل حذف سيُسجَّل هنا تلقائياً مع السبب واسم من قام به، ويراه الجميع</div>';
}

/* ---- delete-with-reason modal: لا حذف بدون سبب ---- */
let delCtx=null;
const DEL_INFO={
  tx:       {after:()=>{renderTx&&renderTx();renderHome&&renderHome();}},
  transfers:{after:()=>{renderTransfers&&renderTransfers();renderHome&&renderHome();}},
  debts:    {after:()=>{renderDebts&&renderDebts();}},
  goals:    {after:()=>{renderGoals&&renderGoals();}},
  recurring:{after:()=>{renderSettings&&renderSettings();}},
};
function askDelete(coll,id){
  const item=(S[coll]||[]).find(x=>x.id===id);
  if(!item)return;
  delCtx={coll,id};
  document.getElementById('delItemLine').textContent=auditSummary(coll,item);
  document.getElementById('delReason').value='';
  document.getElementById('delErr').textContent='';
  document.getElementById('delModal').classList.add('open');
  setTimeout(()=>{try{document.getElementById('delReason').focus();}catch(e){}},150);
}
function confirmDelete(){
  const reason=document.getElementById('delReason').value.trim();
  if(reason.length<3){ document.getElementById('delErr').textContent='⚠️ اكتب سبب الحذف أولاً — لا حذف بدون سبب'; sndWarn(); return; }
  const {coll,id}=delCtx||{}; delCtx=null;
  const info=DEL_INFO[coll]; if(!info){ closeModal('delModal'); return; }
  const item=(S[coll]||[]).find(x=>x.id===id);
  if(!item){ closeModal('delModal'); return; }
  snapshotLocal(true);
  logAudit('delete',coll,item,reason);
  S[coll]=S[coll].filter(x=>x.id!==id);
  save(); closeModal('delModal'); info.after(); sndDel();
  toastUndo('تم الحذف 🗑️',()=>{
    S[coll].push(item);
    logAudit('restore',coll,item,'تراجع عن الحذف');
    save(); info.after();
  });
}

/* ================= CONFETTI 🎉 ================= */
function confetti(){
  try{
    const c=document.createElement('canvas');
    c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:400';
    c.width=window.innerWidth; c.height=window.innerHeight;
    document.body.appendChild(c);
    const x=c.getContext('2d'); if(!x){c.remove();return;}
    const P=Array.from({length:130},()=>({
      x:Math.random()*c.width, y:-30-Math.random()*c.height/2,
      r:5+Math.random()*7, col:'hsl('+Math.floor(Math.random()*360)+',90%,60%)',
      vy:2.5+Math.random()*4, vx:-2+Math.random()*4, a:Math.random()*6, va:.05+Math.random()*.15
    }));
    let n=0;
    (function frame(){
      x.clearRect(0,0,c.width,c.height);
      P.forEach(p=>{
        p.y+=p.vy; p.x+=p.vx; p.a+=p.va;
        x.save(); x.translate(p.x,p.y); x.rotate(p.a);
        x.fillStyle=p.col; x.fillRect(-p.r/2,-p.r/2,p.r,p.r*.6); x.restore();
      });
      if(++n<170)requestAnimationFrame(frame); else c.remove();
    })();
  }catch(e){}
}

/* ================= SAVINGS GOALS 🎯 ================= */
function openGoalModal(){
  fillSelect(document.getElementById('gCur'),S.currencies.map(c=>({v:c.code,t:c.code+' — '+c.name})));
  ['gName','gTarget','gIcon'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('goalModal').classList.add('open');
}
function saveGoal(){
  const name=document.getElementById('gName').value.trim();
  const target=parseFloat(document.getElementById('gTarget').value);
  if(!name){toast('⚠️ أدخل اسم الهدف'); return;}
  if(!target||target<=0){toast('⚠️ أدخل مبلغاً مستهدفاً صحيحاً'); return;}
  S.goals=S.goals||[];
  S.goals.push({id:uid(),name,target,cur:document.getElementById('gCur').value,
    icon:document.getElementById('gIcon').value.trim()||'🎯',saved:0});
  save(); closeModal('goalModal'); renderGoals(); toast('أُضيف الهدف 🎯'); sndOk();
}
function goalDeposit(id){
  const g=S.goals.find(x=>x.id===id);
  const v=parseFloat(prompt('مبلغ الإيداع في «'+g.name+'» ('+g.cur+'):'));
  if(!v||v<=0)return;
  const was=g.saved||0; g.saved=was+v;
  save(); renderGoals();
  if(was<g.target&&g.saved>=g.target){
    confetti(); sndCash();
    toast('🎉🎉 مبرووووك! حققت هدف «'+g.name+'»');
    notif('🎉 هدف محقق!','وصلت إلى هدفك: '+g.name);
  }else sndCash();
}
function goalWithdraw(id){
  const g=S.goals.find(x=>x.id===id);
  const v=parseFloat(prompt('مبلغ السحب من «'+g.name+'»:'));
  if(!v||v<=0)return;
  g.saved=Math.max(0,(g.saved||0)-v); save(); renderGoals(); sndDel();
}
function delGoal(id){ askDelete('goals',id); }
function renderGoals(){
  const el=document.getElementById('goalList'); if(!el)return;
  el.innerHTML=(S.goals||[]).length?S.goals.map(g=>{
    const pct=Math.min(100,Math.round((g.saved||0)/g.target*100));
    const done=pct>=100;
    return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:700">
        <span>${g.icon} ${esc(g.name)} ${done?'🏆':''}</span>
        <span>${fmt(g.saved||0)} / ${fmt(g.target)} ${esc(g.cur)} (${pct}%)</span>
      </div>
      <div style="height:10px;background:var(--card2);border-radius:99px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${done?'var(--green)':'linear-gradient(90deg,var(--accent),var(--accent2))'}"></div></div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-green btn-sm" onclick="goalDeposit('${g.id}')">＋ إيداع</button>
        <button class="btn btn-ghost btn-sm" onclick="goalWithdraw('${g.id}')">− سحب</button>
        <button class="btn btn-ghost btn-sm" onclick="delGoal('${g.id}')">🗑️</button>
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="e-ic">🎯</div>ضع هدفاً (هاتف جديد، سفر، طوارئ...) وتابع تقدمك حتى الاحتفال 🎉</div>';
}

/* ================= SMART CATEGORY 🧠 ================= */
const SMART_KW={
  c1:['خبز','سوق','مطعم','اكل','أكل','طعام','خضار','لحم','حليب','قهوة','غداء','عشاء','فطور'],
  c2:['بنزين','وقود','تاكسي','سياره','سيارة','مواصلات','باص','زيت'],
  c3:['كهرباء','ماء','مياه','فاتوره','فاتورة','غاز'],
  c4:['ايجار','إيجار','كراء'],
  c5:['دواء','صيدليه','صيدلية','طبيب','مستشفى','علاج','تحاليل','اسنان','أسنان'],
  c6:['ملابس','حذاء','قميص','جاكيت','عبايه','عباية'],
  c7:['مدرسه','مدرسة','جامعه','جامعة','كتب','دراسه','دراسة','رسوم'],
  c8:['انترنت','إنترنت','رصيد','شحن','هاتف','نت','اتصال'],
  c9:['صابون','منظف','مستلزمات','ادوات','أدوات','تنظيف'],
  c10:['سينما','لعبه','لعبة','رحله','رحلة','مقهى','ترفيه','ملاهي'],
  c11:['هديه','هدية','صدقه','صدقة','زكاة','عيديه','عيدية']
};
function smartCat(note){
  const words=String(note||'').trim().split(/\s+/).filter(w=>w.length>2);
  if(!words.length)return null;
  // learn from your own history first
  const counts={};
  S.tx.filter(t=>t.type==='expense'&&t.note).forEach(t=>{
    const tw=t.note.split(/\s+/);
    if(words.some(w=>tw.includes(w)))counts[t.cat]=(counts[t.cat]||0)+1;
  });
  const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(best&&S.cats.expense.some(c=>c.id===best[0]))return best[0];
  // fallback: built-in keywords
  for(const [cat,kws] of Object.entries(SMART_KW))
    if(kws.some(k=>note.includes(k))&&S.cats.expense.some(c=>c.id===cat))return cat;
  return null;
}
let txCatTouched=false, smartTimer=null;
document.getElementById('txCat').addEventListener('change',()=>{txCatTouched=true;});
document.getElementById('txNote').addEventListener('input',()=>{
  if(txType!=='expense'||txCatTouched)return;
  clearTimeout(smartTimer);
  smartTimer=setTimeout(()=>{
    const c=smartCat(document.getElementById('txNote').value);
    if(c){
      const el=document.getElementById('txCat');
      if(el.value!==c){el.value=c; el.style.borderColor='var(--accent2)'; el.style.borderWidth='2.5px';
        setTimeout(()=>{el.style.borderColor=''; el.style.borderWidth='';},900);}
    }
  },350);
});

/* ================= LIVE EXCHANGE RATE 🌐 ================= */
async function fetchRate(){
  const from=document.getElementById('trCur').value, to=document.getElementById('trRecvCur').value;
  if(from===to){toast('⚠️ اختر عملتين مختلفتين'); return;}
  toast('🌐 جاري جلب السعر...');
  try{
    const r=await fetch('https://open.er-api.com/v6/latest/'+encodeURIComponent(from));
    const d=await r.json();
    const rate=d&&d.rates&&d.rates[to];
    if(!rate)throw 0;
    document.getElementById('trRate').value=rate.toFixed(4);
    calcTransfer(); sndOk();
    toast('السعر الرسمي: 1 '+from+' = '+rate.toFixed(4)+' '+to);
  }catch(e){toast('⚠️ تعذر جلب السعر — أدخله يدوياً');}
}

/* ================= SOUNDS ================= */
let audioCtx=null;
function beep(seq){
  if(S.sound===false)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const t0=audioCtx.currentTime;
    seq.forEach(([f,dur,dt])=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0.15,t0+dt);
      g.gain.exponentialRampToValueAtTime(0.001,t0+dt+dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0+dt); o.stop(t0+dt+dur);
    });
  }catch(e){}
}
const sndOk=()=>beep([[880,.12,0],[1320,.15,.09]]);
const sndCash=()=>beep([[1050,.06,0],[1400,.06,.07],[1870,.14,.14]]);
const sndWarn=()=>beep([[520,.18,0],[370,.25,.14]]);
const sndDel=()=>beep([[420,.08,0],[300,.14,.07]]);
function toggleSound(){ S.sound=S.sound===false; save(); renderSettings(); if(S.sound!==false)sndOk(); }

/* ================= NOTIFICATIONS ================= */
function askNotifPerm(){ try{ if(window.Notification&&Notification.permission==='default')Notification.requestPermission(); }catch(e){} }
function notif(title,body){
  if(S.notify===false)return;
  try{ if(window.Notification&&Notification.permission==='granted')new Notification(title,{body}); }catch(e){}
}
function toggleNotify(){
  S.notify=S.notify===false; save(); renderSettings();
  if(S.notify!==false){ askNotifPerm(); toast('تم تفعيل الإشعارات 🔔'); }
  else toast('تم إيقاف الإشعارات');
}
function bootAlerts(){
  const t=today();
  const overdue=S.debts.filter(d=>debtRemain(d)>0&&d.due&&d.due<=t);
  if(overdue.length){
    const names=overdue.map(d=>d.person).join('، ');
    toast('⏰ ديون مستحقة السداد: '+names); sndWarn();
    notif('⏰ تذكير الديون','مستحقة السداد: '+names);
  }
  const weekAgo=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const stale=S.transfers.filter(x=>x.status==='sent'&&x.date<weekAgo);
  if(stale.length){
    setTimeout(()=>toast('✈️ '+stale.length+' حوالة لم يُؤكد استلامها منذ أكثر من أسبوع'),3000);
    notif('✈️ حوالات معلقة',stale.length+' حوالة بانتظار تأكيد الاستلام');
  }
}

/* ================= UNDO ================= */
let undoFn=null;
function toastUndo(msg,fn){
  undoFn=fn;
  const t=document.getElementById('toast');
  t.innerHTML=esc(msg)+' <button onclick="doUndo()" style="background:#fff;color:#111;border:none;border-radius:8px;padding:3px 12px;margin-inline-start:8px;font-weight:800;cursor:pointer;font-family:inherit">↩ تراجع</button>';
  t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>{t.classList.remove('show'); undoFn=null;},6000);
}
function doUndo(){
  if(undoFn){undoFn(); undoFn=null;}
  document.getElementById('toast').classList.remove('show');
  setTimeout(()=>toast('تم التراجع ↩'),150);
}

/* ================= PRINT / PDF ================= */
function fillPrintArea(title,sub,bodyHtml){
  const pa=document.getElementById('printArea');
  pa.innerHTML=
    `<div class="p-head"><h1>${esc(S.appName)}</h1><div class="p-sub">${title}</div>${sub?`<div class="p-sub">${sub}</div>`:''}</div>`
    +bodyHtml
    +`<div class="p-foot">أُنشئ بتاريخ ${new Date().toLocaleString('ar-LY')}</div>`;
  return pa;
}
function doPrint(title,sub,bodyHtml){ fillPrintArea(title,sub,bodyHtml); window.print(); }
async function sharePdf(r,fname,saveOnly){
  if(!r)return;
  const JS=window.jspdf&&window.jspdf.jsPDF;
  if(!JS){ toast('⚠️ يلزم إنترنت أول مرة لإنشاء PDF — سأفتح الطباعة بدلاً منه'); doPrint(r.title,r.sub,r.body); return; }
  toast('⏳ جاري إنشاء PDF...');
  try{
    // parse the report HTML into structured tables
    const pa=fillPrintArea(r.title,r.sub,r.body);
    const sections=[];
    pa.querySelectorAll('table').forEach(tb=>{
      sections.push({
        head:[...tb.querySelectorAll('thead th')].map(th=>th.textContent.trim()),
        rows:[...tb.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()))
      });
    });
    const tots=[...pa.querySelectorAll('.p-tot')].map(x=>x.textContent.trim());
    // draw on A4 canvases (Arabic shaped natively by the browser)
    const W=1240,H=1754,M=60,rowH=42;
    const pages=[]; let cnv,ctx,y;
    function newPage(){
      cnv=document.createElement('canvas'); cnv.width=W; cnv.height=H;
      ctx=cnv.getContext('2d');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
      try{ctx.direction='rtl';}catch(e){}
      ctx.font='15px Arial'; ctx.fillStyle='#888'; ctx.textAlign='center';
      ctx.fillText('أُنشئ بواسطة '+S.appName+' — '+new Date().toLocaleString('ar-LY'),W/2,H-26);
      y=M; pages.push(cnv);
    }
    function txt(t,x,yy,font,align,color,maxW){
      ctx.font=font; ctx.fillStyle=color||'#000'; ctx.textAlign=align||'right';
      let s=String(t==null?'':t);
      if(maxW){ while(s.length>2&&ctx.measureText(s).width>maxW)s=s.slice(0,-2); if(s!==String(t))s+='…'; }
      ctx.fillText(s,x,yy);
    }
    newPage();
    txt(S.appName,W/2,y+14,'bold 34px Arial','center'); y+=56;
    txt(r.title,W/2,y,'bold 26px Arial','center'); y+=36;
    if(r.sub){txt(r.sub,W/2,y,'20px Arial','center','#555'); y+=30;}
    ctx.strokeStyle='#333'; ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(W-M,y); ctx.stroke(); y+=26;
    for(const sec of sections){
      const cols=sec.head.length||1, cw=(W-2*M)/cols;
      const drawRow=(cells,bold,bg)=>{
        if(bg){ctx.fillStyle=bg; ctx.fillRect(M,y,W-2*M,rowH);}
        ctx.strokeStyle='#aaa';
        for(let i=0;i<cols;i++){
          const xR=W-M-i*cw;
          ctx.strokeRect(xR-cw,y,cw,rowH);
          txt(cells[i],xR-8,y+28,(bold?'bold ':'')+'17px Arial','right','#000',cw-16);
        }
        y+=rowH;
      };
      drawRow(sec.head,true,'#e8e8e8');
      for(const row of sec.rows){
        if(y+rowH>H-M-20){ newPage(); drawRow(sec.head,true,'#e8e8e8'); }
        drawRow(row,false,null);
      }
      y+=22;
    }
    for(const t of tots){
      if(y+34>H-M-20)newPage();
      txt(t,W-M,y+20,'bold 19px Arial','right'); y+=36;
    }
    // build PDF
    const pdf=new JS({unit:'mm',format:'a4',orientation:'portrait'});
    pages.forEach((c,i)=>{ if(i)pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297); });
    const blob=pdf.output('blob');
    const file=new File([blob],fname,{type:'application/pdf'});
    if(!saveOnly&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:r.title});
      toast('تم الإرسال 📤');
    }else{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download=fname; a.click();
      URL.revokeObjectURL(a.href);
      toast('📥 حُفظ ملف PDF في التنزيلات — أرسله من واتساب');
    }
  }catch(e){ if(!(e&&e.name==='AbortError'))toast('⚠️ تعذر إنشاء PDF — جرّب زر الطباعة'); }
}
function printTx(){ const r=buildTxReport(); if(r)doPrint(r.title,r.sub,r.body); }
function shareTx(){ sharePdf(buildTxReport(),'amwali-mo3amalat-'+today()+'.pdf'); }
function printTransfers(){ const r=buildTransfersReport(); if(r)doPrint(r.title,r.sub,r.body); }
function shareTransfers(){ sharePdf(buildTransfersReport(),'amwali-7awalat-'+today()+'.pdf'); }
function printDebts(){ const r=buildDebtsReport(); if(r)doPrint(r.title,r.sub,r.body); }
function shareDebts(){ sharePdf(buildDebtsReport(),'amwali-doyoon-'+today()+'.pdf'); }
function printMonthReport(){ const r=buildMonthReport(); if(r)doPrint(r.title,r.sub,r.body); }
function shareMonthReport(){ sharePdf(buildMonthReport(),'amwali-taqrir-'+(document.getElementById('rMonth').value||thisMonth())+'.pdf'); }
function saveTxPdf(){ sharePdf(buildTxReport(),'amwali-mo3amalat-'+today()+'.pdf',true); }
function saveTransfersPdf(){ sharePdf(buildTransfersReport(),'amwali-7awalat-'+today()+'.pdf',true); }
function saveDebtsPdf(){ sharePdf(buildDebtsReport(),'amwali-doyoon-'+today()+'.pdf',true); }
function saveMonthReportPdf(){ sharePdf(buildMonthReport(),'amwali-taqrir-'+(document.getElementById('rMonth').value||thisMonth())+'.pdf',true); }
function txFiltered(){
  const fT=document.getElementById('fType').value,
        fC=document.getElementById('fCat').value,
        fCur=document.getElementById('fCur').value,
        fM=document.getElementById('fMonth').value,
        fS=document.getElementById('fSearch').value.trim();
  return S.tx.filter(t=>
    (!fT||t.type===fT)&&(!fC||t.cat===fC)&&(!fCur||t.cur===fCur)&&
    (!fM||t.date.startsWith(fM))&&
    (!fS||(t.note||'').includes(fS)||catOf(t.type,t.cat).name.includes(fS))
  ).sort((a,b)=>b.date.localeCompare(a.date)||((b.ts||0)-(a.ts||0)));
}
function buildTxReport(){
  const list=txFiltered();
  if(!list.length){toast('⚠️ لا توجد معاملات'); return null;}
  const fM=document.getElementById('fMonth').value;
  let inc={},exp={};
  list.forEach(t=>{const o=t.type==='income'?inc:exp; o[t.cur]=(o[t.cur]||0)+Number(t.amount);});
  const rows=list.map(t=>{const c=catOf(t.type,t.cat);
    return `<tr><td>${dateAr(t.date)}</td><td>${t.type==='income'?'دخل':'مصروف'}</td><td>${esc(c.name)}</td><td>${esc(userName(t.user))}</td><td dir="ltr">${fmt(t.amount)} ${esc(t.cur)}</td><td>${esc(t.note||'')}</td></tr>`;}).join('');
  const tot=[...Object.entries(inc).map(([c,v])=>`إجمالي الدخل (${c}): ${fmt(v)}`),
             ...Object.entries(exp).map(([c,v])=>`إجمالي المصروف (${c}): ${fmt(v)}`)].join(' &nbsp;|&nbsp; ');
  return {title:'كشف المعاملات',sub:fM?('شهر: '+fM):'كل الفترات',
    body:`<table><thead><tr><th>التاريخ</th><th>النوع</th><th>الفئة</th><th>الشخص</th><th>المبلغ</th><th>ملاحظة</th></tr></thead><tbody>${rows}</tbody></table>
     <div class="p-tot">${tot}</div>`};
}
function buildTransfersReport(){
  const fSt=document.getElementById('ftStatus').value, fM=document.getElementById('ftMonth').value;
  const list=S.transfers.filter(t=>(!fSt||t.status===fSt)&&(!fM||t.date.startsWith(fM)))
    .sort((a,b)=>b.date.localeCompare(a.date)||((b.ts||0)-(a.ts||0)));
  if(!list.length){toast('⚠️ لا توجد حوالات'); return null;}
  let sent={};
  list.forEach(t=>{sent[t.cur]=(sent[t.cur]||0)+Number(t.amount);});
  const rows=list.map(t=>
    `<tr><td>${dateAr(t.date)}</td><td>${esc(userName(t.from))}</td><td>${esc(userName(t.to))}</td><td dir="ltr">${fmt(t.amount)} ${esc(t.cur)}</td><td dir="ltr">${t.rate||'—'}</td><td dir="ltr">${t.recvAmount?fmt(t.recvAmount)+' '+esc(t.recvCur):'—'}</td><td>${t.status==='sent'?'في الطريق':'مستلمة'}</td><td>${t.recvDate?dateAr(t.recvDate):'—'}</td><td>${esc(t.note||'')}</td></tr>`).join('');
  return {title:'كشف الحوالات إلى ليبيا',sub:fM?('شهر: '+fM):'كل الفترات',
    body:`<table><thead><tr><th>تاريخ الإرسال</th><th>المُرسِل</th><th>المُستلِم</th><th>المبلغ</th><th>سعر الصرف</th><th>المُستلَم</th><th>الحالة</th><th>تاريخ الاستلام</th><th>ملاحظة</th></tr></thead><tbody>${rows}</tbody></table>
     <div class="p-tot">${Object.entries(sent).map(([c,v])=>`إجمالي المُرسَل (${c}): ${fmt(v)}`).join(' &nbsp;|&nbsp; ')}</div>`};
}
function buildMonthReport(){
  const cur=document.getElementById('rCur').value||((S.currencies[0]||{}).code);
  const m=document.getElementById('rMonth').value||thisMonth();
  const txM=S.tx.filter(t=>t.cur===cur&&t.date.startsWith(m));
  const inc=txM.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
  const exp=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  const trM=S.transfers.filter(t=>t.cur===cur&&t.date.startsWith(m)).reduce((s,t)=>s+Number(t.amount),0);
  const byCat={};
  txM.filter(t=>t.type==='expense').forEach(t=>{const c=catOf('expense',t.cat); byCat[c.name]=(byCat[c.name]||0)+Number(t.amount);});
  const catRows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([n,v])=>
    `<tr><td>${esc(n)}</td><td dir="ltr">${fmt(v)} ${esc(cur)}</td><td dir="ltr">${exp?Math.round(v/exp*100):0}%</td></tr>`).join('');
  return {title:'التقرير الشهري',sub:'شهر: '+m+' — العملة: '+esc(cur),
    body:`<table><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>
      <tr><td>إجمالي الدخل</td><td dir="ltr">${fmt(inc)} ${esc(cur)}</td></tr>
      <tr><td>إجمالي المصروف</td><td dir="ltr">${fmt(exp)} ${esc(cur)}</td></tr>
      <tr><td>حوالات مُرسلة</td><td dir="ltr">${fmt(trM)} ${esc(cur)}</td></tr>
      <tr><td><b>الصافي</b></td><td dir="ltr"><b>${fmt(inc-exp-trM)} ${esc(cur)}</b></td></tr>
    </tbody></table>
    ${catRows?`<div class="p-tot" style="margin-top:16px">المصروفات حسب الفئة:</div>
    <table><thead><tr><th>الفئة</th><th>المبلغ</th><th>النسبة</th></tr></thead><tbody>${catRows}</tbody></table>`:''}`};
}

/* ================= CLOUD SYNC (Firebase RTDB — per-record merge) =================
   Design notes:
   - Cloud layout:  /amwali/{code}/meta          → settings blob (LWW, one _u)
                    /amwali/{code}/{coll}/{id}   → one node per record, each with _u
   - Every record carries _u (epoch ms, stamped at push). Deletes leave a tombstone
     {id,_d:true,_u} so a peer that is offline does not resurrect them on next pull.
   - Push happens BEFORE pull, always. That way a local edit gets a fresh _u and wins
     over the older cloud copy, instead of being clobbered by it.
   - A local "shadow" (last-synced snapshot) tells us which records actually changed,
     so we only PATCH the diff — not the whole ledger. Two people editing different
     transactions at the same time now merge instead of overwriting each other.
================================================================================= */
let currentTab='home', pushTimer=null, lastSyncStr=null, syncBusy=false;

const COLLS=['tx','transfers','debts','budgets','recurring','goals','audit'];
const META_KEYS=['appName','appIcon','users','adminId','theme','currencies','cats','pin','sound','notify'];
const SHADOW_KEY='amwali_shadow_v2';
const TOMB_TTL=90*24*60*60*1000;   // drop tombstones after 90 days

function syncOn(){ return !!(S.sync && S.sync.enabled && S.sync.url && S.sync.code); }

/* ================= FIREBASE AUTH — مصادقة مجهولة عبر REST (بدون SDK) =================
   إذا أُدخل مفتاح الويب (apiKey) نحصل على هوية مجهولة من Firebase ونلحق ?auth=<token>
   بكل الطلبات. بدون مفتاح تعمل المنظومة كالسابق (وضع القواعد المفتوحة).
   الرموز تُجدَّد تلقائياً عبر refresh_token المخزن على الجهاز. */
const AUTH_KEY='amwali_auth';
function loadAuthState(){ try{return JSON.parse(localStorage.getItem(AUTH_KEY))||null;}catch(e){return null;} }
function saveAuthState(a){ try{localStorage.setItem(AUTH_KEY,JSON.stringify(a));}catch(e){} }
let authBusy=null;
async function authToken(){
  const key=(S.sync.apiKey||'').trim();
  if(!key) return null;
  const a=loadAuthState();
  if(a&&a.idToken&&a.exp>Date.now()+60000) return a.idToken;
  if(authBusy) return authBusy;
  authBusy=(async()=>{
    try{
      if(a&&a.refreshToken){
        const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+encodeURIComponent(key),{
          method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(a.refreshToken)});
        if(r.ok){
          const d=await r.json();
          const na={idToken:d.id_token,refreshToken:d.refresh_token,exp:Date.now()+(Number(d.expires_in||3600)-120)*1000};
          saveAuthState(na); return na.idToken;
        }
      }
      const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(key),{
        method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!r.ok) throw 0;
      const d=await r.json();
      const na={idToken:d.idToken,refreshToken:d.refreshToken,exp:Date.now()+(Number(d.expiresIn||3600)-120)*1000};
      saveAuthState(na); return na.idToken;
    }catch(e){ return null; }
    finally{ authBusy=null; }
  })();
  return authBusy;
}
async function authedUrl(url){
  const t=await authToken();
  return t ? url+(url.includes('?')?'&':'?')+'auth='+encodeURIComponent(t) : url;
}
function authedUrlSync(url){   // للاستخدام في pagehide حيث لا مجال لـ await
  const a=loadAuthState();
  const t=(S.sync.apiKey&&a&&a.idToken&&a.exp>Date.now())?a.idToken:null;
  return t ? url+(url.includes('?')?'&':'?')+'auth='+encodeURIComponent(t) : url;
}
function syncBase(){
  const base=S.sync.url.trim().replace(/\/+$/,'');
  const code=encodeURIComponent((S.sync.code||'').trim());
  return base+'/amwali/'+code;
}
function syncPath(){ return syncBase()+'.json'; }   // kept: legacy + flushNow + backups

function loadShadow(){ try{return JSON.parse(localStorage.getItem(SHADOW_KEY))||{};}catch(e){return {};} }
function saveShadow(sh){ try{localStorage.setItem(SHADOW_KEY,JSON.stringify(sh));}catch(e){} }
function clearShadow(){ try{localStorage.removeItem(SHADOW_KEY);}catch(e){} }
const clone=o=>JSON.parse(JSON.stringify(o));
function bare(r){ const c=Object.assign({},r); delete c._u; delete c._d; return JSON.stringify(c); }
function collMap(name){ const m={}; (S[name]||[]).forEach(r=>{ if(r&&r.id)m[r.id]=r; }); return m; }
function metaObj(){ const o={}; META_KEYS.forEach(k=>{ o[k]=S[k]; }); o._u=S.metaU||0; return o; }

/* ---- what changed locally since the last successful sync? ---- */
function collDiff(name,now,sh){
  const out={}, cur=collMap(name), old=sh[name]||{};
  for(const id in cur){
    const c=cur[id], s=old[id];
    if(!s || s._d || bare(s)!==bare(c)) out[id]=Object.assign({},c,{_u:now});
  }
  for(const id in old){
    if(!old[id]._d && !cur[id]) out[id]={id:id,_d:true,_u:now};   // tombstone
  }
  return out;
}
function hasPending(){
  const sh=loadShadow(), now=Date.now();
  for(const c of COLLS) if(Object.keys(collDiff(c,now,sh)).length) return true;
  const m=metaObj(); return !sh.meta || bare(sh.meta)!==bare(m);
}

/* ---- shadow = "what the cloud and I agree on right now" ---- */
function rebuildShadow(cloudNode){
  const sh={meta:clone(metaObj())}, cut=Date.now()-TOMB_TTL;
  for(const c of COLLS){
    const m={};
    (S[c]||[]).forEach(r=>{ if(r&&r.id) m[r.id]=clone(r); });
    const cn=(cloudNode&&cloudNode[c])||{};
    for(const id in cn){                              // carry live tombstones forward
      const t=cn[id];
      if(t&&t._d&&!m[id]&&(t._u||0)>cut) m[id]={id:id,_d:true,_u:t._u};
    }
    sh[c]=m;
  }
  saveShadow(sh);
}

function updateSyncStatus(msg){
  const el=document.getElementById('syncStatus');
  if(el) el.textContent=msg||(syncOn()
    ? ('مفعلة ✅'+(S.sync.apiKey?' · محمية 🔐':'')+(lastSyncStr?' · آخر مزامنة: '+lastSyncStr:''))
    : 'غير مفعلة — البيانات على هذا الجهاز فقط');
  const b=document.getElementById('syncBanner');
  if(b) b.style.display=syncOn()?'none':'flex';
}
function stamp(){ lastSyncStr=new Date().toLocaleTimeString('ar-LY'); updateSyncStatus(); }
function scheduleCloudPush(){ if(!syncOn())return; clearTimeout(pushTimer); pushTimer=setTimeout(cloudPush,1200); }

/* ---- PUSH: send only what changed ---- */
async function cloudPush(){
  if(!syncOn())return false;
  const now=Date.now(), sh=loadShadow();
  const jobs=[]; let touched=false;

  for(const c of COLLS){
    const d=collDiff(c,now,sh);
    if(!Object.keys(d).length) continue;
    touched=true;
    for(const id in d){                               // stamp the live records too
      if(!d[id]._d){ const r=collMap(c)[id]; if(r) r._u=now; }
    }
    jobs.push(authedUrl(syncBase()+'/'+c+'.json').then(u=>fetch(u,{method:'PATCH',body:JSON.stringify(d)})));
  }
  const m=metaObj();
  if(!sh.meta || bare(sh.meta)!==bare(m)){
    touched=true; m._u=now; S.metaU=now;
    jobs.push(authedUrl(syncBase()+'/meta.json').then(u=>fetch(u,{method:'PUT',body:JSON.stringify(m)})));
  }
  if(!touched){ stamp(); return true; }

  try{
    const rs=await Promise.all(jobs);
    if(rs.some(r=>!r.ok)) throw new Error('http');
    saveLocal(); rebuildShadow(sh); stamp();
    return true;
  }catch(e){ updateSyncStatus('⚠️ فشل الرفع — تحقق من الاتصال أو قواعد Firebase'); return false; }
}

function rerenderAll(){
  applyTheme(); renderHeader(); refreshFormSelects();
  ({home:renderHome,tx:renderTx,transfers:renderTransfers,debts:renderDebts,reports:renderReports,settings:renderSettings})[currentTab]();
  // keep the login screen consistent with freshly-merged users
  const ls=document.getElementById('loginScreen');
  if(ls&&ls.style.display==='flex')renderLoginUsers();
  if(ME&&!me()){ ME=null; try{localStorage.removeItem(ME_KEY);}catch(e){} showLogin(); }
}

/* ---- duplicate scan after cloud merges: هل سجّل شخصان نفس الشيء؟ ---- */
let dupWarned={};
try{ dupWarned=JSON.parse(localStorage.getItem('amwali_dupw'))||{}; }catch(e){}
function scanDups(){
  const seen={}, fresh=[];
  const check=k=>{ if(seen[k]&&!dupWarned[k])fresh.push(k); seen[k]=1; };
  S.tx.forEach(t=>check(['tx',t.type,t.amount,t.cur,t.cat,t.date].join('|')));
  S.transfers.forEach(t=>check(['tr',t.amount,t.cur,t.from,t.to,t.date].join('|')));
  S.debts.forEach(d=>check(['db',(d.person||'').trim(),d.amount,d.cur,d.dir,d.date].join('|')));
  if(fresh.length){
    fresh.forEach(k=>dupWarned[k]=1);
    try{localStorage.setItem('amwali_dupw',JSON.stringify(dupWarned));}catch(e){}
    toast('⚠️ يوجد '+fresh.length+' سجل يبدو مكرراً — ربما سجّل شخصان نفس العملية. راجعوا القوائم'); sndWarn();
    notif('⚠️ تكرار محتمل','ربما سجّل اثنان من العائلة نفس العملية مرتين');
  }
}

/* ---- one-time migration of the old whole-state format ----
   The old app PUT the entire state to /amwali/{code}.json. That leaves:
   - settings keys (appName, users, ...) and updatedAt at the ROOT of the node
   - collections stored as ARRAYS (numeric keys) instead of per-id maps
   needsMigration() detects any such remnant; migrateLegacy() converts the whole
   node to the clean {meta, coll/{id}} shape. cloudPull() then PUTs the clean node
   back ONCE — the only place a full-node PUT is allowed (see SYNC.md). */
function needsMigration(d){
  if(!d) return false;
  if(d.updatedAt!==undefined) return true;
  if(META_KEYS.some(k=>d[k]!==undefined)) return true;
  return COLLS.some(c=>Array.isArray(d[c]));
}
function migrateLegacy(d){
  const u=d.updatedAt||(d.meta&&d.meta._u)||1;
  const out={meta: d.meta?clone(d.meta):{}};
  META_KEYS.forEach(k=>{ if(out.meta[k]===undefined && d[k]!==undefined) out.meta[k]=clone(d[k]); });
  if(out.meta._u===undefined) out.meta._u=u;
  for(const c of COLLS){
    const m={}, node=d[c];
    if(Array.isArray(node)){
      node.forEach(r=>{ if(r&&r.id) m[r.id]=Object.assign({_u:u},clone(r)); });
    }else if(node&&typeof node==='object'){
      for(const id in node){
        const r=node[id]; if(!r) continue;
        const key=(r.id&&typeof r.id==='string')?r.id:id;     // heal numeric-key records
        m[key]=Object.assign({},clone(r),{id:key,_u:r._u||u});
        if(r._d) m[key]={id:key,_d:true,_u:r._u||u};
      }
    }
    out[c]=m;
  }
  return out;
}

/* ---- PULL: merge record by record ---- */
async function cloudPull(silent){
  if(!syncOn())return false;
  try{
    const r=await fetch(await authedUrl(syncPath()+'?_='+Date.now()));
    if(!r.ok)throw new Error(r.status);
    let d=await r.json();
    if(!d){ stamp(); return true; }
    if(needsMigration(d)){
      d=migrateLegacy(d);
      // one-time cleanup: replace the legacy node with the clean shape (see SYNC.md)
      try{ await fetch(await authedUrl(syncPath()),{method:'PUT',body:JSON.stringify(d)}); }catch(e){}
    }

    let changed=false;
    for(const c of COLLS){
      const node=d[c]||{}; if(!S[c])S[c]=[];
      const cur=collMap(c);
      for(const id in node){
        const rec=node[id]; if(!rec) continue;
        const loc=cur[id];
        const lu=loc?(loc._u||0):-1;
        if((rec._u||0)<=lu) continue;                 // local copy is same or newer
        if(rec._d){
          if(loc){ S[c]=S[c].filter(x=>x.id!==id); changed=true; }
        }else{
          rec.id=id;
          if(loc){ S[c]=S[c].map(x=>x.id===id?rec:x); } else { S[c].push(rec); }
          changed=true;
        }
      }
    }
    const cm=d.meta;
    if(cm && (cm._u||0)>(S.metaU||0)){
      META_KEYS.forEach(k=>{ if(cm[k]!==undefined) S[k]=cm[k]; });
      S.metaU=cm._u; changed=true;
    }

    if(changed){
      saveLocal(); rebuildShadow(d); rerenderAll(); scanDups();
      toast('وصلت بيانات جديدة من السحابة ☁️');
      beep([[700,.09,0],[930,.12,.08]]);
      notif('☁️ تحديث جديد','وصلت بيانات جديدة من أحد أفراد العائلة');
    }else{
      rebuildShadow(d);
    }
    stamp();
    return true;
  }catch(e){ updateSyncStatus('⚠️ تعذر الاتصال — تحقق من الرابط أو قواعد Firebase'); return false; }
}

/* ---- the only entry point that should ever run ----
   Normal cycle: push, then pull (a pending local edit gets a fresh _u and wins).
   FIRST connect on a device (no shadow yet): pull FIRST, then push. Otherwise a
   fresh device would PUT its default meta over the family's real settings and
   would import legacy records before migration. */
async function syncCycle(silent){
  if(!syncOn()||syncBusy)return false;
  syncBusy=true;
  try{
    const first=!localStorage.getItem(SHADOW_KEY);
    if(!first && hasPending()) await cloudPush();
    const ok=await cloudPull(silent);
    if(first && ok) await cloudPush();
    return ok;
  } finally { syncBusy=false; }
}

function readSyncInputs(){
  const u=document.getElementById('syncUrl');
  const c=document.getElementById('syncCode');
  const k=document.getElementById('syncApiKey');
  if(u&&u.value.trim())S.sync.url=u.value.trim();
  if(c)S.sync.code=c.value.trim();
  if(k&&k.value.trim()!==(S.sync.apiKey||'')){ S.sync.apiKey=k.value.trim(); try{localStorage.removeItem(AUTH_KEY);}catch(e){} }
}
async function toggleSync(){
  readSyncInputs();
  if(!S.sync.enabled && !S.sync.code){ openSyncModal(); return; }
  S.sync.enabled=!S.sync.enabled;
  saveLocal(); renderSettings(); updateSyncStatus();
  if(S.sync.enabled){
    toast('جاري الاتصال بالسحابة...');
    toast(await syncCycle(false) ? 'تم تفعيل المزامنة ☁️✅' : '⚠️ تعذر الاتصال — راجع قواعد Firebase');
  }else toast('تم إيقاف المزامنة');
}
async function syncNow(){
  readSyncInputs(); saveLocal();
  if(!syncOn()){ openSyncModal(); return; }
  toast('جاري المزامنة...');
  if(await syncCycle(false)) toast('تمت المزامنة ✅');
}

/* ---- family-code modal (replaces the native prompt(), which mobile browsers eat) ---- */
function openSyncModal(){
  const i=document.getElementById('syncModalCode');
  if(i) i.value=S.sync.code||'';
  const k=document.getElementById('syncModalKey');
  if(k) k.value=S.sync.apiKey||'';
  document.getElementById('syncModal').classList.add('open');
  setTimeout(()=>{ if(i)i.focus(); },150);
}
async function confirmSyncCode(){
  const i=document.getElementById('syncModalCode');
  const c=(i.value||'').trim();
  if(!c){ toast('⚠️ أدخل رمز العائلة'); return; }
  const k=document.getElementById('syncModalKey');
  if(k){ const nk=(k.value||'').trim(); if(nk!==(S.sync.apiKey||'')){ S.sync.apiKey=nk; try{localStorage.removeItem(AUTH_KEY);}catch(e){} } }
  const switching = S.sync.code && S.sync.code!==c;
  S.sync.code=c; S.sync.enabled=true;
  if(switching) clearShadow();          // different ledger → forget the old baseline
  saveLocal(); closeModal('syncModal'); updateSyncStatus();
  toast('جاري الاتصال بالسحابة...');
  if(await syncCycle(false)){ toast('تم تفعيل المزامنة ☁️✅'); renderSettings&&renderSettings(); }
  else toast('⚠️ تعذر الاتصال — راجع الرابط أو قواعد Firebase');
}

/* ================= RESTORE POINTS ================= */
const HIST_KEY='amwali_hist';
function histList(){ try{return JSON.parse(localStorage.getItem(HIST_KEY))||[];}catch(e){return [];} }
function snapshotLocal(force){
  try{
    const h=histList();
    if(!force&&h.length&&Date.now()-h[h.length-1].t<120000)return;
    const copy=JSON.parse(JSON.stringify(S));
    if(copy.theme)copy.theme.customBg=null;
    h.push({t:Date.now(),data:copy});
    while(h.length>12)h.shift();
    localStorage.setItem(HIST_KEY,JSON.stringify(h));
  }catch(e){}
}
function bkBase(){ return syncBase()+'-backups'; }
function bkPath(ts){ return bkBase()+'/'+ts+'.json'; }
async function cloudSnapshot(force){
  if(!syncOn())return false;
  const day=today();
  if(!force&&localStorage.getItem('amwali_bkday')===day)return false;
  const copy=JSON.parse(JSON.stringify(S));
  if(copy.theme)copy.theme.customBg=null;
  try{
    const ts=Date.now();
    const r=await fetch(await authedUrl(bkPath(ts)),{method:'PUT',body:JSON.stringify(copy)});
    if(!r.ok)throw 0;
    localStorage.setItem('amwali_bkday',day);
    try{
      const lr=await fetch(await authedUrl(bkBase()+'.json?shallow=true'));
      const keys=Object.keys(await lr.json()||{}).sort();
      for(const k of keys.slice(0,Math.max(0,keys.length-30)))
        await fetch(await authedUrl(bkPath(k)),{method:'DELETE'});
    }catch(e){}
    return true;
  }catch(e){return false;}
}
function manualCloudSnapshot(){
  cloudSnapshot(true).then(ok=>toast(ok?'☁️ حُفظت نسخة سحابية ✅':'⚠️ تعذر الحفظ — تحقق من الاتصال'));
}
function fmtTs(t){ return new Date(t).toLocaleString('ar-LY',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
function renderHist(){
  const el=document.getElementById('histLocal'); if(!el)return;
  const h=histList();
  el.innerHTML=h.length?h.slice().reverse().map((x,ri)=>{
    const idx=h.length-1-ri;
    return `<div class="set-row"><div><div class="s1">${fmtTs(x.t)}</div><div class="s2">${(x.data.tx||[]).length} معاملة · ${(x.data.transfers||[]).length} حوالة · ${(x.data.debts||[]).length} دين</div></div>
      <button class="btn btn-ghost btn-sm" onclick="restoreLocal(${idx})">↩ استرجاع</button></div>`;
  }).join(''):'<div style="font-size:12px;color:var(--muted)">لا نسخ بعد — ستظهر تلقائياً مع الاستخدام</div>';
}
function applyRestore(data,src){
  if(!confirm('استرجاع النسخة ('+src+')؟\nسيتم استبدال البيانات الحالية، مع حفظ نقطة قبل الاسترجاع للتراجع.'))return;
  snapshotLocal(true);
  const keepSync=S.sync, keepBg=S.theme&&S.theme.customBg;
  S=Object.assign(JSON.parse(JSON.stringify(DEFAULTS)),data);
  S.sync=keepSync; if(keepBg)S.theme.customBg=keepBg;
  save(); applyTheme(); renderHeader(); refreshFormSelects(); renderSettings();
  toast('تم الاسترجاع بنجاح ✅');
}
function restoreLocal(idx){ const h=histList(); if(h[idx])applyRestore(h[idx].data,'محلية '+fmtTs(h[idx].t)); }
async function loadCloudBackups(){
  if(!syncOn()){toast('⚠️ المزامنة غير مفعلة'); return;}
  const el=document.getElementById('histCloud');
  el.innerHTML='<div style="font-size:12px;color:var(--muted)">⏳ جاري التحميل...</div>';
  try{
    const r=await fetch(await authedUrl(bkBase()+'.json?shallow=true'));
    const keys=Object.keys(await r.json()||{}).sort().reverse();
    el.innerHTML=keys.length?keys.map(k=>
      `<div class="set-row"><div class="s1">☁️ ${fmtTs(Number(k))}</div><button class="btn btn-ghost btn-sm" onclick="restoreCloud('${k}')">↩ استرجاع</button></div>`).join('')
      :'<div style="font-size:12px;color:var(--muted)">لا نسخ سحابية بعد — اضغط «حفظ الآن»</div>';
  }catch(e){ el.innerHTML='<div style="color:var(--red);font-size:12px">تعذر التحميل — تحقق من الاتصال</div>'; }
}
async function restoreCloud(k){
  try{
    const r=await fetch(await authedUrl(bkPath(k))); const d=await r.json();
    if(d)applyRestore(d,'سحابية '+fmtTs(Number(k))); else toast('⚠️ نسخة فارغة');
  }catch(e){toast('⚠️ تعذر الاسترجاع');}
}

/* ================= MODALS ================= */
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-bg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));

/* ================= INIT ================= */
applyTheme(); renderHeader(); refreshFormSelects();
applyRecurring();
renderHome();
lockCheck();
loginCheck();
scanDups();
document.getElementById('rMonth').value=thisMonth();
/* ---- sync bootstrap ---- */
updateSyncStatus();                       // shows the red banner if sync is off
if(S.sync.enabled && !S.sync.code) setTimeout(openSyncModal,700);
if(syncOn()) syncCycle(true);
setInterval(()=>{ syncCycle(true); },20000);
window.addEventListener('focus',()=>{ syncCycle(true); });
window.addEventListener('online',()=>{ syncCycle(true); });

// flush pending changes to the cloud when the page is closed / backgrounded
function flushNow(){
  if(!syncOn()||!hasPending())return;
  try{
    clearTimeout(pushTimer);
    const now=Date.now(), sh=loadShadow();
    for(const c of COLLS){
      const d=collDiff(c,now,sh);
      if(Object.keys(d).length)
        fetch(authedUrlSync(syncBase()+'/'+c+'.json'),{method:'PATCH',body:JSON.stringify(d),keepalive:true});
    }
    const m=metaObj(), sm=sh.meta;
    if(!sm||bare(sm)!==bare(m)){ m._u=now; fetch(authedUrlSync(syncBase()+'/meta.json'),{method:'PUT',body:JSON.stringify(m),keepalive:true}); }
  }catch(e){}
}
window.addEventListener('pagehide',flushNow);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden')flushNow(); });
setTimeout(bootAlerts,1500);
askNotifPerm();
