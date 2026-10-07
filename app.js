const $=s=>document.querySelector(s),V=id=>{const e=document.getElementById(id);return e?e.value:''};
const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let selM=null,U=null,D=null,tab='team',mode='login',msg='',editId=null,sel=null,q='',uname='';
let T=get('cc_t','');
async function api(p,m='GET',b){
  const r=await fetch('/api/'+p,{method:m,headers:{'Content-Type':'application/json',...(T?{Authorization:'Bearer '+T}:{})},body:b?JSON.stringify(b):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(j.error||'Server error'),{status:r.status});
  return j}
let st;const save=()=>{clearTimeout(st);st=setTimeout(()=>api('data','PUT',D).catch(()=>{msg='Save nahi hua — internet check karo';}),400)};
function enter(u,d){U=u;D=d&&d.matches?d:{team:null,matches:[]};tab=D.team?'matches':'team';msg='';render()}
async function auth(kind){
  const u=V('u').trim().toLowerCase(),p=V('p');uname=u;
  if(!u||!p){msg='Username aur password dono bharo';return render()}
  try{
    if(kind==='login'){
      const x=await api('exists?u='+encodeURIComponent(u));
      if(!x.exists){mode='signup';msg='Account nahi mila — pehle account banao';return render()}}
    const r=await api(kind,'POST',{u,p});T=r.token;set('cc_t',T);enter(r.user,r.data)
  }catch(e){
    if(e.status===409){mode='login';msg='Account pehle se hai — login karo'}else msg=e.message;
    render()}}
function logout(){U=D=null;T='';set('cc_t','');mode='login';render()}
function authView(){return `<div class="c"><h1>🏏 Mehra Cricket</h1><p class="m">${mode==='login'?'Login karo':'Naya account banao'}</p>
<input id="u" placeholder="Username" value="${H(uname)}" autocomplete="username"><input id="p" type="password" placeholder="Password" autocomplete="current-password">
<div class="err">${H(msg)}</div><button onclick="auth('${mode}')">${mode==='login'?'Login':'Account banao'}</button>
<button class="s" onclick="mode='${mode==='login'?'signup':'login'}';msg='';uname=V('u');render()">${mode==='login'?'Account nahi hai? Banao':'Pehle se account hai? Login'}</button></div>`}
function pl(){const n=+V('cnt');$('#pl').innerHTML=Array.from({length:n},(_,i)=>`<input class="pn" placeholder="Player ${i+1} ka naam">`).join('')}
function saveTeam(){
  const name=V('tn').trim(),ns=[...document.querySelectorAll('.pn')].map(e=>e.value.trim()).filter(Boolean);
  if(!name||!ns.length){msg='Team name aur kam se kam 1 player bharo';return render()}
  D.team={name,players:ns.map((n,i)=>({id:'p'+Date.now()+i,name:n}))};save();tab='matches';msg='';render()}
function updTeam(){
  D.team.name=V('tn').trim()||D.team.name;
  document.querySelectorAll('.pe').forEach(e=>{const p=D.team.players.find(x=>x.id===e.dataset.id);if(p&&e.value.trim())p.name=e.value.trim()});
  save();msg='Save ho gaya ✓';render()}
function teamView(){
  if(!D.team)return `<div class="c"><h2>Create your team</h2><label class="m">Kitne players?</label>
<select id="cnt" onchange="pl()">${Array.from({length:11},(_,i)=>`<option ${i==10?'selected':''}>${i+1}</option>`).join('')}</select>
<input id="tn" placeholder="Team name"><h3>Player names</h3><div id="pl"></div><div class="err">${H(msg)}</div><button onclick="saveTeam()">Team banao</button></div><script>pl()<\/script>`;
  return `<div class="c"><h2>Team details (edit kar sakte ho)</h2><input id="tn" value="${H(D.team.name)}">
${D.team.players.map(p=>`<input class="pe" data-id="${p.id}" value="${H(p.name)}">`).join('')}<div class="m">${H(msg)}</div><button onclick="updTeam()">Save</button></div>`}
function matchView(){
  if(!D.team)return `<div class="c">Pehle team banao.</div>`;
  const m=D.matches.find(x=>x.id===editId)||{st:{}},T=D.team;
  return `<div class="c"><h2>${editId?'Match edit karo':'Naya match'}</h2>
<input id="mo" placeholder="Opponent team" value="${H(m.opp)}"><input id="mp" placeholder="Place" value="${H(m.place)}"><input id="md" type="date" value="${H(m.date)}">
<select id="mt"><option value="">Toss kisne jeeta?</option><option ${m.toss==='me'?'selected':''} value="me">${H(T.name)}</option><option ${m.toss==='opp'?'selected':''} value="opp">Opponent</option></select>
<div class="err">${H(msg)}</div><button onclick="saveMatch()">Match save</button>${editId?`<button class="s" onclick="editId=null;render()">Cancel</button>`:''}</div>
<div class="c"><h2>Matches</h2>${D.matches.length?D.matches.map(x=>`<div class="top" style="padding:6px 0;border-bottom:1px solid var(--bd)"><span>${H(T.name)} vs ${H(x.opp)}<br><span class="m">${H(x.place)} • ${H(x.date)}</span></span><span><button class="s" onclick="selM='${x.id}';tab='stats';render()">Stats</button><button class="s" onclick="editId='${x.id}';msg='';scrollTo(0,0);render()">Edit</button><button class="s" onclick="delMatch('${x.id}')">Delete</button></span></div>`).join(''):'<span class="m">Abhi koi match nahi.</span>'}</div>`}
function statsView(){
  if(!D.team)return `<div class="c">Pehle team banao.</div>`;
  if(!D.matches.length)return `<div class="c">Pehle Matches tab mein match add karo.</div>`;
  if(!D.matches.find(x=>x.id===selM))selM=D.matches[0].id;
  const m=D.matches.find(x=>x.id===selM);
  return `<div class="c"><h2>Player stats</h2><label class="m">Kaunsa match?</label>
<select onchange="selM=this.value;msg='';render()">${D.matches.map(x=>`<option value="${x.id}" ${x.id===selM?'selected':''}>${H(x.date)} — vs ${H(x.opp)} (${H(x.place)})</option>`).join('')}</select>
<h3>Tick = khela</h3><div class="r m"><span>Player</span><span>Runs</span><span>Balls</span><span>Wkts</span><span>Overs</span><span>R diye</span></div>
${D.team.players.map(p=>{const s=m.st[p.id];return `<div class="r"><label><input type="checkbox" id="c_${p.id}" ${s?'checked':''} style="width:auto"> ${H(p.name)}</label>
${['r','b','w','o','k'].map(k=>`<input type="number" min="0" step="${k==='o'?'0.1':'1'}" id="${k}_${p.id}" value="${s?s[k]:''}">`).join('')}</div>`}).join('')}
<div class="m">${H(msg)}</div><button onclick="saveStats()">Stats save</button></div>`}
function saveStats(){
  const m=D.matches.find(x=>x.id===selM);m.st={};
  D.team.players.forEach(p=>{if($('#c_'+p.id).checked){const n=k=>+V(k+'_'+p.id)||0;m.st[p.id]={r:n('r'),b:n('b'),w:n('w'),o:n('o'),k:n('k')}}});
  save();msg='Save ho gaya ✓';render()}
function saveMatch(){
  const m={id:editId||'m'+Date.now(),opp:V('mo').trim(),place:V('mp').trim(),date:V('md'),toss:V('mt'),st:(D.matches.find(x=>x.id===editId)||{st:{}}).st};
  if(!m.opp||!m.place||!m.date||!m.toss){msg='Opponent, place, date aur toss bharo';return render()}
  const i=D.matches.findIndex(x=>x.id===m.id);i<0?D.matches.push(m):D.matches[i]=m;
  D.matches.sort((a,b)=>b.date.localeCompare(a.date));save();editId=null;msg='';selM=m.id;tab='stats';render()}
function delMatch(id){if(confirm('Match delete karna hai?')){D.matches=D.matches.filter(x=>x.id!==id);save();render()}}
function scoreView(){
  if(!D.team||!D.matches.length)return `<div class="c">Abhi koi match nahi. Pehle match add karo.</div>`;
  const T=D.team,nm=id=>H((T.players.find(p=>p.id===id)||{name:'?'}).name);
  const tr=D.matches.reduce((a,m)=>a+Object.values(m.st).reduce((s,x)=>s+x.r,0),0),tw=D.matches.reduce((a,m)=>a+Object.values(m.st).reduce((s,x)=>s+x.w,0),0);
  return `<div class="c"><h2>${H(T.name)} — Overall</h2><div class="st"><div><b>${D.matches.length}</b>Matches</div><div><b>${tr}</b>Total runs</div><div><b>${tw}</b>Wickets</div></div></div>`+
  D.matches.map(m=>{const e=Object.entries(m.st),R=e.reduce((s,[,x])=>s+x.r,0),W=e.reduce((s,[,x])=>s+x.w,0);
  return `<div class="c"><h2>${H(T.name)} vs ${H(m.opp)}</h2><div class="m">${H(m.place)} • ${H(m.date)} • Toss: ${m.toss==='me'?H(T.name):H(m.opp)}</div>
<div class="sc"><h3>Batting — ${R} runs</h3><table><tr><th>Batter</th><th>R</th><th>B</th><th>SR</th></tr>${e.filter(([,x])=>x.b||x.r).map(([id,x])=>`<tr><td>${nm(id)}</td><td>${x.r}</td><td>${x.b}</td><td>${x.b?(x.r/x.b*100).toFixed(1):'-'}</td></tr>`).join('')}</table>
<h3>Bowling — ${W} wickets</h3><table><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr>${e.filter(([,x])=>x.o).map(([id,x])=>`<tr><td>${nm(id)}</td><td>${x.o}</td><td>${x.k}</td><td>${x.w}</td></tr>`).join('')}</table></div></div>`}).join('')}
function stats(id){const ms=D.matches.filter(m=>m.st[id]).slice().reverse();const r=ms.map(m=>m.st[id].r),w=ms.map(m=>m.st[id].w),b=ms.reduce((s,m)=>s+m.st[id].b,0);
  return{ms,r,w,tr:r.reduce((a,c)=>a+c,0),tw:w.reduce((a,c)=>a+c,0),b,hi:Math.max(0,...r)}}
function bars(v,labels,t){if(!v.length)return '';const mx=Math.max(1,...v),bw=300/v.length;
  return `<h3>${t}</h3><svg viewBox="0 0 320 150" style="width:100%;max-width:420px">${v.map((x,i)=>{const h=x/mx*100;const X=10+i*bw;return `<rect x="${X+bw*.15}" y="${115-h}" width="${bw*.7}" height="${h}" rx="3" fill="var(--ac)"/><text x="${X+bw/2}" y="${111-h}" font-size="10" text-anchor="middle" fill="var(--fg)">${x}</text><text x="${X+bw/2}" y="132" font-size="9" text-anchor="middle" fill="var(--mut)">${H(String(labels[i]).slice(5))}</text>`}).join('')}</svg>`}
function renamePl(id){const p=D.team.players.find(x=>x.id===id),n=V('rn').trim();if(n){p.name=n;save();render()}}
function playersView(){
  if(!D.team)return `<div class="c">Pehle team banao.</div>`;
  const list=D.team.players.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));
  let h=`<div class="c"><h2>Player dashboard</h2><input id="q" placeholder="Apna naam search karo" value="${H(q)}" oninput="q=this.value;render(true)"><div class="g">${list.map(p=>`<div class="p" onclick="sel='${p.id}';render()"><div class="av">${H(p.name[0].toUpperCase())}</div>${H(p.name)}</div>`).join('')||'<span class="m">Koi player nahi mila</span>'}</div></div>`;
  const p=D.team.players.find(x=>x.id===sel);
  if(p){const s=stats(p.id);h+=`<div class="c"><h2>${H(p.name)}</h2><div class="st"><div><b>${s.ms.length}</b>Matches</div><div><b>${s.tr}</b>Runs</div><div><b>${s.hi}</b>Highest</div><div><b>${s.ms.length?(s.tr/s.ms.length).toFixed(1):0}</b>Avg</div><div><b>${s.b?(s.tr/s.b*100).toFixed(1):0}</b>Strike rate</div><div><b>${s.tw}</b>Wickets</div></div>
${bars(s.r,s.ms.map(m=>m.date),'Runs per match')}${bars(s.w,s.ms.map(m=>m.date),'Wickets per match')}
<h3>Naam edit karo</h3><input id="rn" value="${H(p.name)}"><button onclick="renamePl('${p.id}')">Save name</button></div>`}
  return h}
function render(keep){
  const a=$('#app');
  if(!U){a.innerHTML=authView();return}
  const T=[['team','Team'],['matches','Matches'],['stats','Player Stats'],['score','Scoreboard'],['players','Players']];
  const body={team:teamView,matches:matchView,stats:statsView,score:scoreView,players:playersView}[tab]();
  a.innerHTML=`<div class="top"><h1>🏏 ${H(D.team?D.team.name:'Mehra Cricket')}</h1><span><span class="m">${H(U)}</span> <button class="s" onclick="logout()">Logout</button></span></div>
<div class="tabs">${T.map(([k,l])=>`<button class="${tab===k?'':'s'}" onclick="tab='${k}';msg='';render()">${l}</button>`).join('')}</div>${body}`;
  a.querySelectorAll('script').forEach(s=>{const n=document.createElement('script');n.textContent=s.textContent;s.replaceWith(n)});
  if(keep){const e=$('#q');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}}}
(async()=>{if(T){try{const r=await api('me');return enter(r.user,r.data)}catch(e){T='';set('cc_t','')}}render()})();
