import { normalizeExternalMedia } from './media-providers';
import {date as formatDate,isMessageKey,localeFrom,localeFromPath,localePath,number as formatNumber,t,type Locale} from './i18n';
type Data=Record<string,any>;
const main=document.querySelector<HTMLElement>('main')!,dialog=document.querySelector<HTMLDialogElement>('#dialog')!;
const landingIndexing=document.querySelector<HTMLMetaElement>('meta[name=mw-index-root]')?.content==='true';
document.querySelector('.skip')?.addEventListener('click',event=>{event.preventDefault();main.focus();});
let me:Data|null=null,catalog:Data={songs:[],genres:[],available:0},own:Data[]=[],room:Data|null=null,adminToken='',editing:Data|null=null;
let poll:ReturnType<typeof setTimeout>|undefined,pollErrors=0,offset=0,routeGeneration=0;
let helpState={key:'',hintOpen:false,hintSeen:false,albumOpen:false};
let worlds:{enabled:boolean;authenticated?:boolean;csrf?:string;guestLink?:boolean;existingGuest?:boolean}={enabled:false};
const storedLocale=localStorage.getItem('mw-language');
let locale:Locale=storedLocale?localeFrom(storedLocale):(['/spiele','/ueber'].includes(location.pathname)?'de':location.pathname.startsWith('/en')?'en':localeFrom(navigator.languages?.[0]||navigator.language));
const tr=(key:Parameters<typeof t>[1],values:Record<string,string|number>={})=>t(locale,key,values);
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const $=<T extends HTMLElement>(selector:string,root:ParentNode=document)=>root.querySelector<T>(selector)!;
const statusName=():Data=>({pending:tr('status.pending'),approved:tr('status.approved'),blocked:tr('status.blocked'),withdrawn:tr('status.withdrawn')});
function notice(message:string){const n=$('#notice');n.textContent=message;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),6500);}
async function api(path:string,method='GET',data?:unknown,admin=false):Promise<any>{
  const r=await fetch('/api'+path,{method,headers:{'X-MW-Language':locale,...(data?{'Content-Type':'application/json'}:{}),...(admin?{Authorization:`Bearer ${adminToken}`}:{})},body:data?JSON.stringify(data):undefined});
  const result=await r.json() as Data;if(!r.ok){const e=new Error(result.error||tr('error.connection')) as Error&{status:number};e.status=r.status;throw e;}return result;
}
function buttons(html:string){return `<div class="actions">${html}</div>`;}
function pageTitle(kicker:string,title:string,description:string){return `<div class="page-title"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>`;}
function modal(title:string,content:string){dialog.innerHTML=`<button class="close ghost" data-close aria-label="${esc(tr('dialog.close'))}">×</button><h2>${esc(title)}</h2>${content}`;dialog.showModal();$('[data-close]',dialog).onclick=()=>dialog.close();}
function worldsLoginHref(reauth=false){return '/auth/start?'+new URLSearchParams({next:localePath('/',locale)+'#profil',ui_locales:locale,...(reauth?{reauth:'1'}:{})});}
async function signInWithWorlds(reauth=false){location.assign(worldsLoginHref(reauth));}
async function reviewGuestProfile(){
 const staged=await api('/worlds/link/prepare','POST',{csrf:worlds.csrf});
 modal(tr('worlds.reviewGuest'),`<p>${tr('worlds.linkText')}</p>
  <p>Worlds Hub <strong>${esc(staged.worldsEmail)}</strong></p>
  <p>${tr('worlds.guestLabel')} <strong>${esc(staged.guestName)}</strong></p>
  <button class="primary" id="confirm-guest-link">${tr('worlds.confirmGuest')}</button>`);
 const confirm=$<HTMLButtonElement>('#confirm-guest-link',dialog);
 confirm.onclick=()=>void run(async()=>{
  confirm.disabled=true;
  try{
   await api('/worlds/link/confirm','POST',{csrf:worlds.csrf,proof:staged.proof});
   location.reload();
  }catch(error){dialog.close();throw error;}
 });
}
async function signOutOfWorlds(){
 const response=await fetch('/auth/logout?locale='+locale,{method:'POST',body:new URLSearchParams({csrf:worlds.csrf??''})});
 if(!response.ok)throw new Error(tr('error.worldsUnavailable'));
 localStorage.removeItem('mw-room');
 location.assign(localePath('/',locale)+'#profil');
 location.reload();
}
async function ensureMe():Promise<boolean>{
  if(me)return true;
  if(worlds.enabled&&!worlds.authenticated){location.assign(worldsLoginHref());return false;}
  if(worlds.existingGuest){location.hash='profil';return false;}
  return new Promise(resolve=>{
    const central=!!worlds.authenticated;
    modal(tr(central?'worlds.create':'session.title'),`<p>${tr(central?'worlds.createText':'session.text')}</p><form id="name-form"><label>${tr('session.name')}<input name="name" maxlength="40" required autocomplete="nickname" placeholder="${tr('session.placeholder')}"></label><button class="primary">${tr(central?'worlds.create':'session.start')}</button><p class="minor">${tr('session.noPassword')} <a href="#rechte">${tr('session.privacy')}</a></p></form>`);
    dialog.addEventListener('close',()=>resolve(!!me),{once:true});
    $('#name-form',dialog).onsubmit=async e=>{e.preventDefault();const name=String(new FormData(e.target as HTMLFormElement).get('name'));
      await run(async()=>{me=await api(central?'/worlds/profile':'/session','POST',
       {name,theme:'dark',language:locale,...(central?{csrf:worlds.csrf}:{})});dialog.close();});};
  });
}
async function run(fn:()=>Promise<unknown>){try{await fn();}catch(e){const message=(e as Error).message;notice(isMessageKey(message)?tr(message):message);}}
function shell(){
  document.documentElement.lang=locale;document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(e=>{const key=e.dataset.i18n!;if(isMessageKey(key))e.textContent=tr(key);});
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(e=>{const key=e.dataset.i18nAria!;if(isMessageKey(key))e.setAttribute('aria-label',tr(key));});
  document.querySelector('nav')?.setAttribute('aria-label',tr('nav.label'));document.querySelector('.language-switch')?.setAttribute('aria-label',tr('language.switch'));
  document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===locale)));
  document.querySelectorAll<HTMLAnchorElement>('[data-local-page]').forEach(a=>a.href=localePath(a.dataset.localPage==='games'?'/spiele':'/ueber',locale));
  document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach(a=>a.href=localePath('/',locale)+'#'+a.dataset.nav);
  document.querySelectorAll<HTMLAnchorElement>('a.brand').forEach(a=>a.href=localePath('/',locale)+'#spielen');
  const canonical=document.querySelector<HTMLLinkElement>('link[rel=canonical]');if(canonical)canonical.href=location.origin+localePath(location.pathname,locale);
}
async function selectLanguage(next:Locale){
  if(next===locale)return;locale=next;localStorage.setItem('mw-language',locale);history.replaceState(null,'',localePath(location.pathname,locale)+location.hash);shell();
  if(me){me.language=locale;await api('/me','PATCH',{name:me.name,theme:me.theme,language:locale});}await route();
}
function home(){
  main.innerHTML=`<section class="hero"><div><div class="eyebrow">${tr('home.kicker')}</div><h1>${tr('home.title')}</h1><p>${tr('home.text')}</p>${buttons(`<button class="primary" data-create>${tr('home.create')} <span>↗</span></button><button class="ghost" data-join>${tr('home.join')}</button>`)}<div class="micro">${tr('home.micro')}</div></div><div class="art" aria-hidden="true"><div class="art-label">MUSIC WORLDS — VOL. 01</div><div class="big-type">PRESS<br>PLAY.</div><div class="record"></div><span class="art-arrow">↗</span><div class="art-caption">${tr('home.artCaption')}</div></div></section>
    <div class="ticker"><span><b>01</b> &nbsp; ${tr('nav.play')}</span><span>✦</span><span><b>02</b> &nbsp; ${tr('nav.discover')}</span><span>✦</span><span><b>03</b> &nbsp; ${tr('nav.contribute')}</span><span>✦</span><span>${tr('home.ticker')}</span></div>
    <section><div class="section-head"><div><h2>${tr('home.next')}</h2><p>${tr('home.many')}</p></div><span class="pill">VOL. 01</span></div><article class="game-card"><div class="game-visual" aria-hidden="true"><div class="wave">${'<i></i>'.repeat(11)}</div><span>GUESS THE SONG / 01</span></div><div class="game-body"><span class="pill green">${tr('home.now')}</span><span class="pill">${tr('home.multi')}</span><h3>${tr('game.name')}</h3><p>${tr('home.gameText')}</p><div class="game-bottom"><small>${tr('home.questions',{count:formatNumber(locale,catalog.available)})}<br>${tr('home.point')}</small><button class="primary" data-create>${tr('home.start')}</button></div></div></article></section>
    <section><div class="section-head"><h2>${tr('home.easy')}</h2></div><div class="grid"><article class="panel"><div class="step">${tr('home.step1')}</div><h3>${tr('home.codeTitle')}</h3><p>${tr('home.codeText')}</p></article><article class="panel"><div class="step">${tr('home.step2')}</div><h3>${tr('home.knowledge')}</h3><p>${tr('home.answerText')}</p></article><article class="panel"><div class="step">${tr('home.step3')}</div><h3>${tr('home.sound')}</h3><p>${tr('home.contributeText')}</p><a class="button ghost small" href="#beitragen">${tr('home.contribute')}</a></article></div></section>`;
  document.querySelectorAll<HTMLElement>('[data-create]').forEach(b=>b.onclick=()=>run(create));document.querySelectorAll<HTMLElement>('[data-join]').forEach(b=>b.onclick=joinDialog);
}
async function create(){if(!await ensureMe())return;room=await api('/rooms','POST',{});localStorage.setItem('mw-room',room!.code);location.hash=`raum/${room!.code}`;}
function joinDialog(){modal(tr('join.title'),`<p>${tr('join.text')}</p><form id="join-form"><label>${tr('join.code')}<input name="code" maxlength="8" minlength="8" pattern="[A-Za-z2-9]{8}" required placeholder="ABCD2345" autocapitalize="characters" autocomplete="off"></label><button class="primary">${tr('join.button')}</button></form>`);
  $('#join-form',dialog).onsubmit=e=>{e.preventDefault();const code=String(new FormData(e.target as HTMLFormElement).get('code')).trim().toUpperCase();dialog.close();location.hash=`raum/${code}`;};}
function songDetail(song:Data){
  modal(song.title,`<p lang="${esc(song.language||'und')}">${esc(song.artists.join(', '))}</p><div class="info">${esc(song.album||tr('song.single'))} · ${song.year?formatNumber(locale,song.year):tr('song.yearUnknown')} · ${esc(song.genre)}</div><p>${tr('song.detailText')}</p><a class="button primary" target="_blank" rel="noopener noreferrer" href="${esc(song.source)}">${tr('common.source')}</a><p class="minor">${tr('song.externalTerms')}</p>`);
}
function discover(){
  main.innerHTML=pageTitle(tr('discover.kicker'),tr('discover.title'),tr('discover.text'))+
    `<form id="search" class="toolbar"><label>${tr('discover.search')}<input id="query" type="search" placeholder="${tr('discover.placeholder')}"></label><label>${tr('discover.genre')}<select id="genre"><option value="">${tr('discover.allGenres')}</option>${catalog.genres.map((g:string)=>`<option>${esc(g)}</option>`).join('')}</select></label></form><div class="toolbar"><button class="small ghost" data-collection="">${tr('discover.allSongs')}</button><button class="small ghost" data-collection="Pop">${tr('discover.pop')}</button><button class="small ghost" data-collection="Rock">${tr('discover.rock')}</button><button class="small ghost" data-collection="Electronic">${tr('discover.electronic')}</button></div><p class="minor" id="song-count"></p><div id="songs"></div>`;
  const render=()=>{const q=$<HTMLInputElement>('#query').value.toLocaleLowerCase(),g=$<HTMLSelectElement>('#genre').value;
    const songs=catalog.songs.filter((s:Data)=>(!g||s.genre===g)&&[s.title,...s.artists,s.album,s.genre].join(' ').toLocaleLowerCase().includes(q));
    $('#song-count').textContent=tr('discover.count',{songs:formatNumber(locale,songs.length),artists:formatNumber(locale,new Set(songs.flatMap((s:Data)=>s.artists)).size),albums:formatNumber(locale,new Set(songs.map((s:Data)=>s.album).filter(Boolean)).size)});
    $('#songs').innerHTML=songs.length?songs.map((s:Data)=>`<button class="catalog-row" data-song="${esc(s.id)}"><span class="album" aria-hidden="true">♪</span><span lang="${esc(s.language||'und')}"><h3>${esc(s.title)}</h3><p>${esc(s.artists.join(', '))} · ${esc(s.album||tr('song.single'))}</p></span><span class="meta">${esc(s.genre)} · ${s.year?formatNumber(locale,s.year):'–'} &nbsp; ↗</span></button>`).join(''):`<div class="empty">${tr('discover.empty')}</div>`;
    document.querySelectorAll<HTMLElement>('[data-song]').forEach(b=>b.onclick=()=>songDetail(songs.find((s:Data)=>s.id===b.dataset.song)));};
  $('#search').onsubmit=e=>e.preventDefault();$('#query').oninput=render;$('#genre').onchange=render;
  document.querySelectorAll<HTMLElement>('[data-collection]').forEach(b=>b.onclick=()=>{$<HTMLSelectElement>('#genre').value=b.dataset.collection!;render();});render();
}
function field(label:string,name:string,value='',opts=''){return `<label>${esc(label)}<input name="${name}" value="${esc(value)}" ${opts}></label>`;}
async function contribute(){
  if(!me){main.innerHTML=pageTitle(tr('contribute.guestKicker'),tr('contribute.guestTitle'),tr('contribute.guestText'))+`<button class="primary" id="begin">${tr('contribute.createProfile')}</button>`;$('#begin').onclick=()=>run(async()=>{if(await ensureMe())await contribute();});return;}
  own=(await api('/contributions')).contributions;renderContribution();
}
function renderContribution(){
  const c=editing?.body;
  main.innerHTML=pageTitle(tr('contribute.kicker'),editing?tr('contribute.editTitle'):tr('contribute.title'),tr('contribute.text'))+
    `<div class="split"><form class="panel" id="contribute-form"><h3>${editing?tr('contribute.edit'):tr('contribute.new')}</h3><div class="form-grid">${field(tr('contribute.songTitle'),'title',c?.song.title,'required maxlength="180"')}${field(tr('contribute.artists'),'artists',c?.song.artists.join(', '),'required maxlength="800"')}${field(tr('contribute.album'),'album',c?.song.album,'maxlength="180"')}${field(tr('contribute.year'),'year',c?.song.year,'type="number" min="1000" max="'+(new Date().getFullYear()+1)+'"')}<label>${tr('discover.genre')}<select name="genre">${[['Pop','Pop'],['Rock','Rock'],['Electronic','Electronic'],['Klassik',tr('genre.classical')],['Andere',tr('genre.other')]].map(([v,l])=>`<option value="${v}" ${c?.song.genre===v?'selected':''}>${l}</option>`).join('')}</select></label>${field(tr('contribute.language'),'language',c?.song.language,'maxlength="30"')}<div class="span2">${field(tr('contribute.songSource'),'source',c?.song.source,'type="url" required placeholder="https://…" maxlength="1500"')}</div></div><label>${tr('contribute.prompt')}<textarea name="prompt" required maxlength="3000" placeholder="${tr('contribute.promptPlaceholder')}">${esc(c?.prompt)}</textarea></label>${field(tr('contribute.hint'),'hint',c?.hint,'maxlength="300"')}<div class="form-grid">${[0,1,2].map(i=>field(tr('contribute.wrong',{number:i+1}),`alternative${i}`,c?.alternatives[i],'required maxlength="180"')).join('')}<label>${tr('contribute.difficulty')}<select name="difficulty">${[['easy',tr('difficulty.easy')],['medium',tr('difficulty.medium')],['hard',tr('difficulty.hard')]].map(([v,l])=>`<option value="${v}" ${c?.difficulty===v?'selected':''}>${l}</option>`).join('')}</select></label></div>${field(tr('contribute.aliases'),'aliases',c?.aliases.join('; '),'maxlength="1800"')}
    <details ${c?.media?'open':''}><summary>${tr('contribute.media')}</summary><p class="minor">${tr('contribute.mediaText')}</p>${field(tr('contribute.youtube'),'youtube',c?.media?.url,'type="url" maxlength="1500"')}<div class="form-grid">${field(tr('contribute.startSeconds'),'start',c?.media?.start??'0','type="number" min="0" max="86400"')}${field(tr('contribute.endSeconds'),'end',c?.media?.end,'type="number" min="1" max="86400"')}</div><label class="check"><input type="checkbox" name="official" ${c?.media?.official?'checked':''}>${tr('contribute.official')}</label>${field(tr('contribute.mbid'),'mbid',c?.song.musicbrainzId,'maxlength="36"')}<p class="minor">${tr('contribute.manual')}</p></details>
    <details open><summary>${tr('contribute.rights')}</summary><p class="minor">${tr('contribute.rightsText')}</p>${field(tr('contribute.holder'),'holder',c?.rights.holder||me!.name,'required maxlength="200"')}<label>${tr('contribute.evidence')}<textarea name="evidence" required maxlength="3000" placeholder="${tr('contribute.evidencePlaceholder')}">${esc(c?.rights.evidence)}</textarea></label><label class="check"><input type="checkbox" name="permission" required>${tr('contribute.permission')}</label></details>
    <div class="info">${tr('contribute.private')}</div>${buttons(`<button class="primary">${editing?tr('contribute.submitEdit'):tr('contribute.submit')} ↗</button>${editing?`<button type="button" id="cancel-edit" class="ghost">${tr('common.cancel')}</button>`:''}`)}</form>
    <aside><div class="panel"><div class="step">${tr('contribute.mine')}</div><h3>${tr(own.length===1?'contribute.ideaOne':'contribute.ideaMany',{count:formatNumber(locale,own.length)})}</h3>${own.length?own.map(o=>`<article class="contribution" lang="${esc(o.body.song.language||'und')}"><span class="pill ${o.status==='approved'?'green':''}">${statusName()[o.status]}</span><h3>${esc(o.body.song.title)}</h3><p>${esc(o.body.prompt.slice(0,110))}</p>${o.review?.reason?`<p>${tr('contribute.review',{reason:esc(o.review.reason)})}${o.review.reviewedAt?` · ${formatDate(locale,o.review.reviewedAt)}`:''}</p>`:''}<div class="actions"><button class="small ghost" data-edit="${o.id}">${tr('common.edit')}</button>${o.status!=='withdrawn'?`<button class="small danger ghost" data-withdraw="${o.id}">${tr('common.withdraw')}</button>`:''}</div></article>`).join(''):`<p>${tr('contribute.empty')}</p>`}</div><div class="info">${tr('contribute.guestInfo')}</div></aside></div>`;
  $('#contribute-form').onsubmit=e=>{e.preventDefault();const form=e.target as HTMLFormElement,fd=new FormData(form),s=(k:string)=>String(fd.get(k)||'').trim();
    const genre=s('genre'),data={song:{title:s('title'),artists:s('artists').split(',').map(x=>x.trim()).filter(Boolean),album:s('album'),year:s('year')?Number(s('year')):undefined,genre,language:s('language'),source:s('source'),musicbrainzId:s('mbid')||undefined},
      kind:'original_hint',prompt:s('prompt'),hint:s('hint'),alternatives:[0,1,2].map(i=>s('alternative'+i)),aliases:s('aliases')?s('aliases').split(';').map(x=>x.trim()).filter(Boolean):[],difficulty:s('difficulty'),category:({Pop:'pop',Rock:'rock',Electronic:'electronic',Klassik:'classical'} as Data)[genre]||'mixed',
      rights:{basis:'original_content',holder:s('holder'),license:'Darstellung in Music-Worlds erlaubt',source:s('source'),evidence:s('evidence'),uses:['display']},
      media:s('youtube')?{url:s('youtube'),start:Number(s('start')||0),end:s('end')?Number(s('end')):undefined,official:fd.has('official')}:undefined};
    if(data.media&&!data.media.official){notice(tr('contribute.confirmOfficial'));return;}
    void run(async()=>{await api(editing?'/contributions/'+editing.id:'/contributions',editing?'PATCH':'POST',editing?{revision:editing.revision,body:data}:data);editing=null;notice(tr('contribute.sent'));await contribute();});};
  document.querySelectorAll<HTMLElement>('[data-edit]').forEach(b=>b.onclick=()=>{editing=own.find(o=>o.id===b.dataset.edit)!;renderContribution();window.scrollTo({top:0});});
  document.querySelectorAll<HTMLElement>('[data-withdraw]').forEach(b=>b.onclick=()=>{const o=own.find(o=>o.id===b.dataset.withdraw)!;modal(tr('contribute.withdrawTitle'),`<p>${tr('contribute.withdrawText')}</p><button class="danger" id="confirm-withdraw">${tr('common.withdraw')}</button>`);$('#confirm-withdraw').onclick=()=>run(async()=>{await api('/contributions/'+o.id,'DELETE',{revision:o.revision});dialog.close();await contribute();});});
  if(editing)$('#cancel-edit').onclick=()=>{editing=null;renderContribution();};
}
async function profile(){
  if(!me){
    const central=!!worlds.authenticated;
    const existing=worlds.existingGuest===true;
    main.innerHTML=pageTitle(tr('profile.kicker'),tr(existing?'worlds.existingGuestTitle':central?'worlds.create':worlds.enabled?'worlds.signInTitle':'profile.guestTitle'),tr(existing?'worlds.existingGuestText':central?'worlds.createText':worlds.enabled?'worlds.signInText':'profile.guestText'))+
     buttons(`${existing?'':worlds.enabled&&!central?`<a class="button primary" id="begin" href="${worldsLoginHref()}">${tr('worlds.signIn')}</a>`:`<button class="primary" id="begin">${tr(central?'worlds.create':'contribute.createProfile')}</button>`}
      ${worlds.enabled&&central?`<button class="ghost" id="worlds-action">${tr('worlds.signOut')}</button>`:''}
      ${worlds.guestLink?`<button class="ghost" id="review-guest">${tr('worlds.reviewGuest')}</button>
       <button class="ghost" id="renew-worlds">${tr('worlds.renew')}</button>`:''}`);
    if(!existing&&(!worlds.enabled||central))$('#begin').onclick=()=>run(async()=>{if(await ensureMe())await profile();});
    if(worlds.enabled&&central)$('#worlds-action').onclick=()=>run(signOutOfWorlds);
    if(worlds.guestLink){
     $('#review-guest').onclick=()=>run(reviewGuestProfile);
     $('#renew-worlds').onclick=()=>run(()=>signInWithWorlds(true));
    }
    return;
  }
  me=await api('/me');document.documentElement.dataset.theme=me!.theme;
  const board=await api('/leaderboard'),s=me!.stats;
  const stats:[[string,unknown],[string,unknown],[string,unknown],[string,unknown]]=[[tr('profile.points'),formatNumber(locale,s.points)],[tr('profile.games'),formatNumber(locale,s.games)],[tr('profile.wins'),formatNumber(locale,s.wins)],[tr('profile.correct'),s.rounds?formatNumber(locale,s.points/s.rounds,{style:'percent',maximumFractionDigits:0}):'–']];
  main.innerHTML=pageTitle(tr('profile.kicker'),tr('profile.hello',{name:esc(me!.name)}),tr('profile.text'))+`<div class="stats">${stats.map(([l,v])=>`<div class="panel"><div class="stat">${v}</div><p>${l}</p></div>`).join('')}</div><div class="split"><div class="panel"><h3>${tr('profile.board')}</h3>${board.players.length?board.players.map((p:Data,i:number)=>`<div class="leader"><span>${formatNumber(locale,i+1)}. &nbsp; ${esc(p.name)}<br><small>${formatNumber(locale,p.games)} ${tr(p.games===1?'profile.gameOne':'profile.gameMany')}</small></span><b>${formatNumber(locale,p.points)} ${tr(p.points===1?'profile.pointOne':'profile.pointMany')}</b></div>`).join(''):`<p>${tr('profile.first')}</p>`}</div><aside><form class="panel" id="profile-form"><h3>${tr('profile.settings')}</h3>${field(tr('session.name'),'name',me!.name,'required maxlength="40"')}<label>${tr('profile.appearance')}<select name="theme"><option value="dark">${tr('profile.dark')}</option><option value="light" ${me!.theme==='light'?'selected':''}>${tr('profile.light')}</option></select></label><label>${tr('profile.language')}<select name="language"><option value="de" ${locale==='de'?'selected':''}>Deutsch (DE)</option><option value="en" ${locale==='en'?'selected':''}>English (EN)</option></select></label><button class="primary">${tr('common.save')}</button></form><div class="panel"><h3>${tr('profile.achievements')}</h3>${me!.achievements.length?me!.achievements.map((a:string)=>`<span class="pill green">✦ ${tr(a==='first_session'?'achievement.first_session':'achievement.ten_titles')}</span>`).join(''):`<p>${tr('profile.noAchievement')}</p>`}</div><div class="info"><b>${tr('profile.hubTitle')}</b><br>${tr('profile.hubText')}</div><button id="logout" class="ghost danger">${tr('profile.logout')}</button></aside></div>`;
  $('#profile-form').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target as HTMLFormElement);void run(async()=>{const next=localeFrom(d.get('language'));if(next!==locale)await selectLanguage(next);me=await api('/me','PATCH',{name:d.get('name'),theme:d.get('theme'),language:next});await profile();notice(tr('profile.saved'));});};
  const deleteButton=document.createElement('button');deleteButton.className='ghost danger';deleteButton.textContent=tr('profile.delete');$('#logout').after(deleteButton);
  if(worlds.enabled){
   const hubInfo=main.querySelector('aside .info');
   if(me!.source==='worlds'){
    if(hubInfo)hubInfo.textContent=tr('worlds.active');
    $('#logout').textContent=tr('worlds.signOut');
   }else if(hubInfo){
    const button=document.createElement('a');
    button.className='button ghost';button.textContent=tr('worlds.signIn');button.href=worldsLoginHref();
    hubInfo.replaceChildren(button);
   }
  }
  deleteButton.onclick=()=>{modal(tr('profile.deleteTitle'),`<p>${tr('profile.deleteText')}</p><form id="delete-profile"><label>${tr('profile.deleteConfirm')}<input name="confirm" pattern="DELETE" required autocomplete="off"></label><button class="danger">${tr('profile.deleteButton')}</button></form>`);$('#delete-profile').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/me','DELETE',{confirm:new FormData(e.target as HTMLFormElement).get('confirm')});me=null;room=null;localStorage.removeItem('mw-room');dialog.close();location.hash='spielen';notice(tr('profile.deleted'));});};};
  $('#logout').onclick=()=>{const central=me?.source==='worlds';modal(tr(central?'worlds.signOut':'profile.logoutTitle'),`<p>${tr(central?'worlds.signOutText':'profile.logoutText')}</p><button id="confirm-logout" class="danger">${tr(central?'worlds.signOut':'profile.logout')}</button>`);$('#confirm-logout').onclick=()=>run(async()=>{if(central){await signOutOfWorlds();return;}await api('/logout','POST',{});me=null;room=null;localStorage.removeItem('mw-room');dialog.close();location.hash='spielen';});};
}
function playerList(){return `<ul class="players">${room!.players.map((p:Data)=>`<li><span class="avatar">${esc(p.name[0].toUpperCase())}</span><span>${esc(p.name)} ${p.id===me!.id?`(${tr('room.you')})`:''}${p.id===room!.host?' ♛':''}</span><b>${formatNumber(locale,p.score)}</b></li>`).join('')}</ul>`;}
async function action(action:string,extra:Data={}){
  if(!room)return;
  try{room=await api('/rooms/'+room.code+'/action','POST',{version:room.version,action,match:room.match,round:room.roundIndex,...extra});if(action==='leave'){room=null;localStorage.removeItem('mw-room');location.hash='spielen';return;}renderRoom();}
  catch(e){if((e as any).status===409){await refreshRoom(true);}throw e;}
}
function renderRoom(){
  if(!room||!me)return;
  const r=room,host=r.host===me.id,round=r.round,finished=r.phase==='finished';
  const helpKey=`${r.code}:${r.match}:${r.roundIndex}`;
  if(helpState.key!==helpKey)helpState={key:helpKey,hintOpen:false,hintSeen:false,albumOpen:false};
  const categories=[['mixed',tr('room.allSongs')],['pop','Pop'],['rock','Rock'],['electronic','Electronic'],['classical',tr('genre.classical')]];
  const content=r.phase==='lobby'?`<h2>${tr('room.lobbyTitle')}</h2><p>${tr('room.lobbyText')}</p><form id="settings-form"><div class="form-grid"><label>${tr('room.rounds')}<input name="rounds" type="number" min="1" max="10" value="${r.settings.rounds}" ${!host?'disabled':''}></label><label>${tr('room.time')}<select name="seconds" ${!host?'disabled':''}>${[15,30,45,60].map(n=>`<option ${r.settings.seconds===n?'selected':''} value="${n}">${tr('room.seconds',{count:formatNumber(locale,n)})}</option>`).join('')}</select></label><label>${tr('room.answerType')}<select name="answerType" ${!host?'disabled':''}><option value="choice">${tr('room.choice')}</option><option value="text" ${r.settings.answerType==='text'?'selected':''}>${tr('room.free')}</option></select></label><label>${tr('room.collection')}<select name="category" ${!host?'disabled':''}>${categories.map(([v,l])=>`<option value="${v}" ${r.settings.category===v?'selected':''}>${l}</option>`).join('')}</select></label></div>${host?`<button class="ghost small" type="submit">${tr('room.saveSettings')}</button>`:''}</form><div class="info">${tr('room.noRepeat')}</div>${host?`<button class="primary" id="start">${tr('room.start')}</button>`:`<p>${tr('room.waitHost')}</p>`}`:
  finished?`<div class="eyebrow">${tr('room.wellPlayed')}</div><h2>${tr('room.winner',{names:esc(r.players.filter((p:Data)=>p.score===Math.max(...r.players.map((p:Data)=>p.score))).map((p:Data)=>p.name).join(' & '))})}</h2><p>${tr('room.savedResults')}</p>${playerList()}${host?buttons(`<button class="primary" id="rematch">${tr('room.backLobby')}</button>`):`<p>${tr('room.more')}</p>`}`:
  `<div class="round-top"><span>${tr(round.kind==='lyrics'?'room.publicDomain':'room.originalHint')} · ${tr('room.round',{current:formatNumber(locale,r.roundIndex+1),total:formatNumber(locale,r.settings.rounds)})}</span><span class="timer" id="timer"></span></div><div class="prompt" lang="${esc(round.language||'und')}">${esc(round.prompt)}</div>${round.solution?`<div class="reveal"><p>${tr('room.solution')}</p><h2>${esc(round.solution.title)}</h2><p>${esc(round.solution.artists.join(', '))}</p></div>`:''}
    ${r.settings.answerType==='choice'?`<div class="choices">${round.choices.map((c:Data,i:number)=>`<button data-answer="${c.id}" class="${round.myAnswer===c.id?'selected':''} ${round.solution?.correctId===c.id?'correct':''}" ${r.phase!=='voting'||round.myAnswer?'disabled':''}><span>${String.fromCharCode(65+i)}.</span> ${esc(c.text)}</button>`).join('')}</div>`:r.phase==='voting'?`<form id="answer-form"><label>${tr('room.question')}<input name="answer" required maxlength="180" autocomplete="off" ${round.myAnswer?'disabled':''} value="${esc(round.myAnswer||'')}" placeholder="${tr('room.answerPlaceholder')}"></label><button class="primary" ${round.myAnswer?'disabled':''}>${tr('room.answer')}</button></form>`:''}
    <p class="minor">${tr('room.answers',{answered:formatNumber(locale,round.answered.length),players:formatNumber(locale,r.players.length)})}${round.myAnswer?' · '+tr('room.answerSaved'):''}</p><div class="helps">${round.help.hint?`<details id="help-hint" ${helpState.hintOpen?'open':''}><summary>${tr('room.hint')}</summary><p lang="${esc(round.language||'und')}">${esc(round.help.hint)}</p></details>`:''}${round.help.album?`<details id="help-album" ${round.help.hint&&!helpState.hintSeen?'hidden':''} ${helpState.albumOpen?'open':''}><summary>${tr('room.album')}</summary><p>${esc(round.help.album)}</p></details>`:''}</div>
    ${round.solution?`<a href="${esc(round.solution.source)}" target="_blank" rel="noopener noreferrer" class="button small ghost">${tr('room.songSource')}</a> <button id="report-round" class="small ghost">${tr('room.report')}</button>${host?buttons(`<button class="primary" id="next">${tr(r.roundIndex+1===r.settings.rounds?'room.results':'room.next')}</button>`):`<p>${tr('room.waitNext')}</p>`}${round.media?`<div class="info">${tr('room.mediaInfo')}</div><button id="media" class="ghost">${tr(round.media.provider==='external_link'?'room.external':'room.youtube')}</button><div id="player"></div>`:''}`:''}`;
  main.innerHTML=`<div class="room-head"><div><div class="eyebrow">${tr('room.private')}</div><h1>${tr('game.name')}</h1><span class="room-code">${r.code}</span></div><div class="actions"><button class="ghost small" id="invite">${tr('room.invite')}</button><button class="ghost small" id="leave">${tr('room.leave')}</button></div></div><div class="split"><section class="panel">${content}</section><aside class="panel"><div class="step">${tr('room.yourRound',{players:formatNumber(locale,r.players.length)})}</div><h3>${tr('room.together')}</h3>${playerList()}<p class="minor">${tr('room.persistence')}</p><p class="minor" id="connection">${tr('room.connected')}</p></aside></div>`;
  $('#invite').onclick=()=>run(async()=>{const link=location.origin+localePath('/',locale)+'#raum/'+r.code;try{await navigator.clipboard.writeText(link);notice(tr('room.inviteCopied'));}catch{modal(tr('room.inviteLink'),field(tr('room.copyLink'),'invite',link,'readonly'));}});
  $('#leave').onclick=()=>{modal(tr('room.leaveTitle'),`<p>${tr('room.leaveText')}</p><button id="confirm-leave" class="danger">${tr('room.leaveButton')}</button>`);$('#confirm-leave').onclick=()=>run(async()=>{await action('leave');dialog.close();});};
  if(r.phase==='lobby'&&host){$('#settings-form').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target as HTMLFormElement);void run(()=>action('settings',{settings:{rounds:Number(d.get('rounds')),seconds:Number(d.get('seconds')),answerType:d.get('answerType'),category:d.get('category')}}));};$('#start').onclick=()=>run(()=>action('start'));}
  document.querySelectorAll<HTMLElement>('[data-answer]').forEach(b=>b.onclick=()=>run(()=>action('answer',{answer:b.dataset.answer})));
  const af=document.querySelector<HTMLElement>('#answer-form');if(af)af.onsubmit=e=>{e.preventDefault();void run(()=>action('answer',{answer:new FormData(e.target as HTMLFormElement).get('answer')}));};
  if(document.querySelector('#next'))$('#next').onclick=()=>run(()=>action('next'));if(document.querySelector('#rematch'))$('#rematch').onclick=()=>run(()=>action('rematch'));
  if(document.querySelector('#media'))$('#media').onclick=()=>loadPlayer(round.media);
  const hintDetails=document.querySelector<HTMLDetailsElement>('#help-hint'),albumDetails=document.querySelector<HTMLDetailsElement>('#help-album');
  if(hintDetails)hintDetails.ontoggle=()=>{if(helpState.key!==helpKey)return;helpState.hintOpen=hintDetails.open;if(hintDetails.open){helpState.hintSeen=true;if(albumDetails)albumDetails.hidden=false;}};
  if(albumDetails)albumDetails.ontoggle=()=>{if(helpState.key===helpKey)helpState.albumOpen=albumDetails.open;};
  if(document.querySelector('#report-round'))$('#report-round').onclick=()=>reportDialog(round.solution.contributionId);
  updateTimer();
}
function reportDialog(id:string){modal(tr('report.title'),`<form id="report-form"><label>${tr('report.question')}<textarea name="reason" required minlength="5" maxlength="1000" placeholder="${tr('report.placeholder')}"></textarea></label><button class="primary">${tr('report.send')}</button></form>`);$('#report-form').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/report','POST',{id,reason:new FormData(e.target as HTMLFormElement).get('reason')});dialog.close();notice(tr('report.thanks'));});};}
function updateTimer(){const element=document.querySelector('#timer');if(element&&room?.round){element.textContent=room.phase==='voting'?formatNumber(locale,Math.max(0,Math.ceil((room.round.deadline-Date.now()-offset)/1000)))+' s':tr('room.resolved');}}
setInterval(updateTimer,1000);
async function refreshRoom(force=false){
  if(!room?.code)return;const code=room.code,next=await api('/rooms/'+code);if(!location.hash.endsWith(code))return;
  offset=next.serverTime-Date.now();if(force||room.version!==next.version){room=next;renderRoom();}pollErrors=0;
}
function schedulePoll(){clearTimeout(poll);if(!location.hash.startsWith('#raum/')||!room)return;poll=setTimeout(async()=>{
  try{if(!document.hidden)await refreshRoom();}catch(e){pollErrors++;const c=document.querySelector('#connection');if(c)c.textContent=tr('room.disconnected');if(pollErrors===1)notice((e as Error).message);}
  schedulePoll();},document.hidden?15000:Math.min(15000,3000*(pollErrors+1)));}
async function enterRoom(code:string){
  if(!/^[A-Z2-9]{8}$/.test(code))throw new Error(tr('error.invalidRoom'));
  if(!await ensureMe()){location.hash='spielen';return;}
  try{room=await api('/rooms/'+code);}catch(e){if((e as any).status===403)room=await api('/rooms/'+code+'/join','POST',{});else throw e;}
  localStorage.setItem('mw-room',code);offset=room!.serverTime-Date.now();renderRoom();schedulePoll();
}
type YouTubeWindow=Window&{YT?:{Player:new(id:string,options:Data)=>unknown};onYouTubeIframeAPIReady?:()=>void};
let youtubeReady:Promise<void>|undefined;
function loadPlayer(media:Data){
  void run(async()=>{
    const source=normalizeExternalMedia(media as {url:string;provider?:'youtube'|'external_link';start?:number;end?:number}),w=window as YouTubeWindow;
    if(source.provider==='external_link'){$('#player').innerHTML=`<a class="button ghost" target="_blank" rel="noopener noreferrer" href="${esc(source.url)}">${tr('media.openExternal')}</a>`;return;}
    $('#player').innerHTML=`<div id="youtube-player"></div><p class="minor"><span id="video-status">${tr('media.fallback')}</span><a target="_blank" rel="noopener noreferrer" href="${esc(source.url)}">${tr('media.openOfficial')}</a></p>`;
    if(!w.YT?.Player){youtubeReady??=new Promise((resolve,reject)=>{w.onYouTubeIframeAPIReady=()=>resolve();const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>reject(new Error(tr('error.playerLoad')));document.head.append(script);setTimeout(()=>{if(!w.YT?.Player)reject(new Error(tr('error.youtubeUnavailable')));},12000);});await youtubeReady;}
    if(!document.querySelector('#youtube-player'))return;
    new w.YT!.Player('youtube-player',{width:'100%',height:270,videoId:source.id,playerVars:{controls:1,playsinline:1,start:media.start||0,...(media.end?{end:media.end}:{}),origin:location.origin},events:{onError:(e:{data:number})=>{const status=document.querySelector('#video-status'),keys:Data={2:'media.invalid',5:'media.unplayable',100:'media.removed',101:'media.embedDenied',150:'media.embedDenied',153:'media.configDenied'};if(status)status.textContent=tr(keys[e.data]||'media.unavailable');}}});
  });
}
async function moderation(){
  if(!await ensureMe())return;
  if(!adminToken){main.innerHTML=pageTitle(tr('moderation.kicker'),tr('moderation.title'),tr('moderation.text'))+`<form class="panel" id="admin-login">${field(tr('moderation.key'),'token','','type="password" required autocomplete="off"')}<button class="primary">${tr('moderation.open')}</button></form>`;
    $('#admin-login').onsubmit=e=>{e.preventDefault();adminToken=String(new FormData(e.target as HTMLFormElement).get('token'));void run(moderation);};return;}
  let data;try{data=await api('/admin','GET',undefined,true);}catch(e){adminToken='';throw e;}
  main.innerHTML=pageTitle(tr('moderation.kicker'),tr('moderation.reviewTitle'),tr('moderation.reviewText'))+`${data.contributions.length?data.contributions.map((c:Data)=>`<article class="panel"><span class="pill">${statusName()[c.status]}</span><div lang="${esc(c.body.song.language||'und')}"><h3>${esc(c.body.song.title)} · ${esc(c.body.song.artists.join(', '))}</h3><p>${esc(c.body.prompt)}</p></div><div class="info"><b>${tr('moderation.rightsBasis')}:</b> ${esc(c.body.rights.basis)}<br><b>${tr('moderation.holder')}:</b> ${esc(c.body.rights.holder)}<br><b>${tr('moderation.license')}:</b> ${esc(c.body.rights.license)}<br><b>${tr('moderation.evidence')}:</b> ${esc(c.body.rights.evidence)}<br><b>${tr('moderation.uses')}:</b> ${esc(c.body.rights.uses.join(', '))}<br><a target="_blank" rel="noopener noreferrer" href="${esc(c.body.rights.source)}">${tr('moderation.rightsSource')}</a></div><details><summary>${tr('moderation.full')}</summary><pre>${esc(JSON.stringify(c.body,null,2))}</pre></details><form data-review="${c.id}" data-revision="${c.revision}"><label>${tr('moderation.reason')}<textarea name="reason" required minlength="12" maxlength="1500"></textarea></label><label class="check"><input type="checkbox" name="evidence">${tr('moderation.evidenceCheck')}</label><label class="check"><input type="checkbox" name="mediaChecked">${tr('moderation.mediaCheck')}</label><div class="actions"><button name="status" value="approved" class="primary">${tr('moderation.approve')}</button><button name="status" value="blocked" class="danger">${tr('moderation.block')}</button><button name="status" value="withdrawn">${tr('common.remove')}</button></div></form></article>`).join(''):`<div class="empty">${tr('moderation.none')}</div>`}<h2>${tr('moderation.reports')}</h2>${data.reports.map((r:Data)=>`<article class="panel"><p>${esc(r.reason)}</p><p class="minor">${tr('moderation.contribution',{id:esc(r.contribution_id)})} · ${formatDate(locale,r.created_at)}</p><button data-resolve="${r.id}" class="small">${tr('moderation.resolve')}</button></article>`).join('')||`<p>${tr('moderation.noReports')}</p>`}`;
  document.querySelectorAll<HTMLFormElement>('[data-review]').forEach(f=>f.onsubmit=e=>{e.preventDefault();const d=new FormData(f);void run(async()=>{await api('/admin/review','POST',{id:f.dataset.review,revision:Number(f.dataset.revision),status:(e.submitter as HTMLButtonElement).value,reason:d.get('reason'),evidenceChecked:d.has('evidence'),mediaChecked:d.has('mediaChecked')},true);await moderation();});});
  document.querySelectorAll<HTMLElement>('[data-resolve]').forEach(b=>b.onclick=()=>run(async()=>{await api('/admin/resolve','POST',{id:b.dataset.resolve},true);await moderation();}));
}
function rights(){main.innerHTML=pageTitle(tr('rights.kicker'),tr('rights.title'),tr('rights.subtitle'))+`<article class="privacy-copy"><h2>${tr('rights.playHeading')}</h2><p>${tr('rights.playText')}</p><h2>${tr('rights.lyricsHeading')}</h2><p>${tr('rights.lyricsText')}</p><h2>${tr('rights.externalHeading')}</h2><p>${tr('rights.externalText')}</p><h2>${tr('rights.dataHeading')}</h2><p>${tr('rights.dataText')}</p><h2>${tr('rights.deleteHeading')}</h2><p>${tr('rights.deleteText')}</p><h2>${tr('rights.sources')}</h2><p><a href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noopener noreferrer">YouTube Developer Policies ↗</a><br><a href="https://musicbrainz.org/doc/About/Data_License" target="_blank" rel="noopener noreferrer">${tr('rights.musicbrainz')}</a><br><a href="https://www.gesetze-im-internet.de/urhg/__19a.html" target="_blank" rel="noopener noreferrer">UrhG § 19a ↗</a></p></article>`;}
function rules(){main.innerHTML=pageTitle(tr('rules.pageKicker'),tr('rules.pageTitle'),tr('rules.pageText'))+`<div class="grid"><section class="panel"><div class="step">${tr('rules.prepareStep')}</div><h2>${tr('rules.prepareTitle')}</h2><p>${tr('rules.prepareText')}</p></section><section class="panel"><div class="step">${tr('rules.guessStep')}</div><h2>${tr('rules.guessTitle')}</h2><p>${tr('rules.guessText')}</p></section><section class="panel"><div class="step">${tr('rules.revealStep')}</div><h2>${tr('rules.revealTitle')}</h2><p>${tr('rules.revealText')}</p></section></div><div class="info">${tr('rules.media')}</div><a href="${localePath('/',locale)}#spielen" class="button primary">${tr('rules.back')}</a>`;}
async function route(){
  clearTimeout(poll);const generation=++routeGeneration,path=location.pathname,hash=decodeURIComponent(location.hash.slice(1)||(['/ueber','/en/about'].includes(path)?'rechte':['/spiele','/en/games'].includes(path)?'regeln':'spielen'));
  document.querySelector<HTMLMetaElement>('meta[name=robots]')!.content=landingIndexing&&['/','/en'].includes(path)&&hash==='spielen'?'index,follow':'noindex,nofollow';
  const titleKeys:Data={spielen:'seo.homeTitle',entdecken:'title.discover',beitragen:'title.contribute',profil:'title.profile',rechte:'title.rights',regeln:'title.rules',moderation:'title.moderation'};document.title=titleKeys[hash]?tr(titleKeys[hash]):hash.startsWith('raum/')?tr('title.room'):'Music-Worlds';
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach(a=>{const active=a.dataset.nav===hash;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  main.innerHTML=`<p class="loading">${tr('common.loading')}</p>`;
  try{if(hash==='spielen'){catalog=await api('/catalog');if(generation!==routeGeneration)return;home();const last=localStorage.getItem('mw-room');if(last&&me){const n=document.createElement('div');n.className='info';n.innerHTML=`${tr('route.resume')} <a href="#raum/${esc(last)}">${tr('route.reopen',{code:esc(last)})}</a>`;main.prepend(n);}}
    else if(hash==='entdecken'){catalog=await api('/catalog');if(generation!==routeGeneration)return;discover();}
    else if(hash==='beitragen')await contribute();else if(hash==='profil')await profile();else if(hash.startsWith('raum/'))await enterRoom(hash.slice(5));else if(hash==='moderation')await moderation();else if(hash==='rechte')rights();else if(hash==='regeln')rules();else{location.hash='spielen';}}
  catch(e){main.innerHTML=pageTitle(tr('route.errorKicker'),tr('route.errorTitle'),esc((e as Error).message))+`<button class="primary" id="retry">${tr('route.retry')}</button> <a class="button ghost" href="#spielen">${tr('route.home')}</a>`;$('#retry').onclick=()=>route();}
}
window.addEventListener('hashchange',()=>{window.scrollTo({top:0});void route();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&room)void run(()=>refreshRoom());});
document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach(button=>button.onclick=()=>run(()=>selectLanguage(localeFrom(button.dataset.language))));
void (async()=>{localStorage.setItem('mw-language',locale);if(location.pathname==='/'&&locale==='en')history.replaceState(null,'','/en'+location.hash);shell();
 try{worlds=await api('/worlds/status');}catch{/* Guest mode remains available when Worlds is disabled. */}
 try{me=await api('/me');document.documentElement.dataset.theme=me!.theme;if(me!.language&&me!.language!==locale){locale=localeFrom(me!.language);localStorage.setItem('mw-language',locale);history.replaceState(null,'',localePath(location.pathname,locale)+location.hash);shell();}}catch{}await route();})();
