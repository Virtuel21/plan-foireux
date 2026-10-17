import './style.css';
import { Museum } from '../scene';
import { icon } from '../icons';
import { Session, type Snapshot } from './session';
import { type Command } from './engine';
import { sceneView, scenePlayers } from './scene-view';
import * as ui from './views';
const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
let snapshot:Snapshot,museum:Museum|null=null,target='',lastTurn=-1,seenGame=0,dialog:'role'|'invite'|'join'|null=null,checkCount=0,sceneRoster='';
let muted=localStorage.getItem('pf-muted')==='1',audio:AudioContext|null=null,spotlightIndex=-1,chatKey='',toastTimer:ReturnType<typeof setTimeout>;
const session=new Session(localStorage.getItem('pf-name')||'Julien',render);
try{museum=new Museum($('#scene'));museum.renderer.domElement.setAttribute('aria-label','La bande de braqueurs dans le musée. Choisis ton action sur les deux cartes.');}catch{$('#scene').innerHTML='<p class="scene-error">Le musée nécessite WebGL. Active l’accélération graphique et recharge la page.</p>';}
function notify(text:string){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
function command(c:Omit<Command,'turn'>){if(snapshot.view)session.command({...c,turn:snapshot.view.turn});}
function chime(){if(muted||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.setValueAtTime(230,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(650,audio.currentTime+.23);gain.gain.setValueAtTime(.04,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.28);osc.start();osc.stop(audio.currentTime+.3);}
function setHTML(id:string,html:string){const el=$(id);if(el.innerHTML!==html)el.innerHTML=html;}
function render(s:Snapshot){
  snapshot=s;const v=s.view,newTurn=!!v&&v.turn!==lastTurn;
  if(newTurn){lastTurn=v!.turn;spotlightIndex=-1;chime();}
  if(v&&(!target||target===s.myId||!s.players.some(p=>p.id===target)||v.phase==='vote'&&s.players.find(p=>p.id===target)?.exposed==='burglar'))target=[...s.players].filter(p=>p.id!==s.myId&&(v.phase!=='vote'||p.exposed!=='burglar')).sort((a,b)=>b.money-a.money)[0]?.id??'';
  const active=document.activeElement as HTMLInputElement|null,focusId=active?.id,draft=active?.value,start=active?.selectionStart;
  document.body.classList.toggle('lobby',!v);
  setHTML('#top',ui.header(s,muted));setHTML('#crew',ui.crew(s,target));setHTML('#controls',ui.controls(s,target,session.name));setHTML('#scene-ui',ui.overlay(v));setHTML('#footer',ui.footer(s));
  if((s.chat.at(-1)?.id??'')!==chatKey){chatKey=s.chat.at(-1)?.id??'';const history=$('#chat-history');history.scrollTop=history.scrollHeight;}
  if(focusId){const el=document.getElementById(focusId) as HTMLInputElement|null;if(el&&el!==active){el.value=draft??'';el.focus({preventScroll:true});if(start!==null&&start!==undefined)el.setSelectionRange(start,start);}}
  if(museum){const roster=s.players.map(p=>`${p.id}:${p.name}:${p.color}`).join('|');if(roster!==sceneRoster){sceneRoster=roster;museum.setPlayers(scenePlayers(s.players));}museum.update(v?sceneView(v):null);museum.presentCaper(v?.phase==='reveal'?v.report?.findings??[]:[],v?.phase==='secret'?v.signals:[]);}
  if(v&&v.started!==seenGame){seenGame=v.started;checkCount=0;dialog='role';}
  if(v&&v.checks.length>checkCount){const check=v.checks.at(-1)!;checkCount=v.checks.length;notify(check.target?`${s.players.find(p=>p.id===check.target)?.name} : ${check.role==='agent'?'FBI démasqué !':'innocent. Son sac et sa place sont conservés.'}`:'Pas de majorité. Le FBI reste parmi vous.');}
  renderDialog();updateClock();
}
function renderDialog(){const v=snapshot?.view;let html='';
  if(dialog==='role'&&v){const me=v.players.find(p=>p.id===v.myId)!,agent=v.myRole==='agent';html=`<section class="modal ${agent?'role-agent':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" style="--player:${me.color}"><img src="${ui.portrait(me.color)}" alt="" width="100" height="120"><span class="eyebrow">Ton identité secrète</span><h2 id="dialog-title">${agent?'Tu es le FBI.':'Tu es un braqueur.'}</h2><p>${agent?'Fais monter l’alarme à 10 sans te faire démasquer.':'Sors avec le plus gros sac. Mais si l’alarme atteint 10, tu perds tout.'}</p>${ui.btn('C’est parti !','close','button primary')}</section>`;}
  if(dialog==='invite')html=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${ui.btn(icon('close'),'close','icon-button','aria-label="Fermer"')}<span class="eyebrow">Le casse se partage</span><h2 id="dialog-title">Invite ta bande.</h2><p>4 à 6 joueurs. Les places libres sont prises par des bots.</p>${snapshot.room?`<input id="invite-link" aria-label="Lien du salon" readonly value="${ui.esc(`${location.origin}${location.pathname}#room=${snapshot.room}`)}">${ui.btn('Copier le lien','copy','button primary')}`:ui.btn('Créer le salon privé','create','button primary',snapshot.status==='connecting'?'disabled':'')}${snapshot.error?`<p>${ui.esc(snapshot.error)}</p>`:''}</section>`;
  if(dialog==='join')html=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><span class="eyebrow">Tu es invité au casse</span><h2 id="dialog-title">Comment t’appelles-tu ?</h2><label class="sr-only" for="join-name">Ton pseudo</label><input id="join-name" maxlength="18" value="${ui.esc(localStorage.getItem('pf-name')||'')}" placeholder="Ton pseudo" autocomplete="nickname">${ui.btn('Rejoindre la bande','join','button primary')}</section>`;
  const root=$('#modal-root'),old=root.innerHTML;if(!html){if(old){root.innerHTML='';document.querySelector<HTMLButtonElement>('#controls button:not(:disabled)')?.focus({preventScroll:true});}return;}
  const wrapped=`<div class="modal-backdrop">${html}</div>`;if(root.innerHTML!==wrapped){root.innerHTML=wrapped;root.querySelector<HTMLElement>('button,input')?.focus({preventScroll:true});}
}
function saveName(value?:string){const name=(value??(document.getElementById('nickname') as HTMLInputElement|null)?.value??session.name).trim().slice(0,18)||'Julien';localStorage.setItem('pf-name',name);session.rename(name);}
document.addEventListener('click',async event=>{
  const el=(event.target as Element).closest<HTMLButtonElement>('[data-action]');if(!el||el.disabled)return;const action=el.dataset.action!;
  if(!audio&&!muted)try{audio=new AudioContext();}catch{}
  if(action==='start'){saveName();session.start();}
  else if(action==='replay'){dialog=null;session.backToLobby();}
  else if(action==='add-bot'){saveName();session.addBot();}
  else if(action.startsWith('remove:')){saveName();session.removeBot(action.slice(7));}
  else if(action==='close'){dialog=null;renderDialog();}
  else if(action==='role'){dialog='role';renderDialog();}
  else if(action==='invite'){dialog='invite';renderDialog();}
  else if(action==='create'){saveName();await session.createRoom();dialog='invite';renderDialog();}
  else if(action==='copy'){try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}#room=${snapshot.room}`);notify('Lien du salon copié !');}catch{const input=document.getElementById('invite-link') as HTMLInputElement|null;input?.select();notify('Sélectionne et copie le lien du salon.');}}
  else if(action==='join'){saveName((document.getElementById('join-name') as HTMLInputElement).value);dialog=null;session.join(new URLSearchParams(location.hash.slice(1)).get('room')!);}
  else if(action==='sound'){muted=!muted;localStorage.setItem('pf-muted',muted?'1':'0');render(snapshot);}
  else if(action.startsWith('target:')){target=action.slice(7);museum?.focusPlayer(target);render(snapshot);}
  else if(action.startsWith('choose:')){const a=action.slice(7) as 'work'|'scheme';command({type:'choose',action:a,...(a==='scheme'&&snapshot.view?.myOffer!=='grab'?{target}:{})});}
  else if(action.startsWith('signal:')){command({type:'signal',target:action.slice(7)});}
  else if(action.startsWith('vote:'))command({type:'vote',target:action.slice(5)});
  else if(action==='landscape'){try{await document.documentElement.requestFullscreen();}catch{}try{await (screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>}).lock?.('landscape');}catch{}updateOrientation();}
});
document.addEventListener('input',event=>{const el=event.target as HTMLInputElement;if(el.id==='nickname'){localStorage.setItem('pf-name',el.value.slice(0,18));session.name=el.value.slice(0,18);}});
document.addEventListener('submit',event=>{if((event.target as HTMLElement).id!=='chat-form')return;event.preventDefault();const input=$('#chat-text') as HTMLInputElement,text=input.value;input.value='';session.sendChat(text);});
document.addEventListener('keydown',event=>{if(!dialog)return;if(event.key==='Escape'&&dialog!=='join'){dialog=null;renderDialog();}if(event.key==='Tab'){const items=[...$('#modal-root').querySelectorAll<HTMLElement>('button:not(:disabled),input')];if(!items.length)return;const first=items[0],last=items.at(-1)!;if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}}});
function updateClock(){const v=snapshot?.view;if(!v)return;const seconds=Math.max(0,Math.ceil((v.deadline-Date.now())/1000));document.querySelectorAll<HTMLElement>('[data-countdown]').forEach(el=>{el.textContent=`${seconds}s`;el.classList.toggle('urgent',seconds<=10);});
  if(v.phase==='reveal'&&v.report){const fs=v.report.findings,index=Math.min(fs.length-1,Math.floor((Date.now()-v.phaseStarted)/(12000/fs.length))),f=fs[index];if(f&&index!==spotlightIndex){spotlightIndex=index;museum?.focusPlayer(f.id);}const spot=document.getElementById('spotlight');if(spot&&f){const p=v.players.find(p=>p.id===f.id)!;spot.innerHTML=`<strong>${ui.esc(p.name)} ${ui.coin(ui.signed(f.gain))}</strong><span>${ui.esc(ui.actionText(f,v.players))}${f.stole?` · ${f.stole} pièces prises`:''}${f.lost?` · ${f.lost} pièces perdues`:''}${f.saidWork&&f.action==='scheme'?' · « Je braque », qu’il disait !':''}</span>`;}}
}
const portraitQuery=matchMedia('(max-width: 1000px) and (orientation: portrait)');
function updateOrientation(){const blocked=portraitQuery.matches;$('#orientation-guard').hidden=!blocked;document.body.classList.toggle('portrait-required',blocked);$('#app').inert=blocked||!!dialog;}
portraitQuery.addEventListener('change',updateOrientation);window.addEventListener('resize',updateOrientation);setInterval(()=>{updateClock();updateOrientation();},200);
session.emit();if(new URLSearchParams(location.hash.slice(1)).get('room')){dialog='join';renderDialog();}updateOrientation();
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa'))import('./qa').then(m=>m.install(session));
