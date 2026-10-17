import './style.css';
import { Museum } from './scene';
import { Session, type Snapshot } from './session';
import { ALARM_MAX, type Action, type Command } from './engine';
import { icon } from './icons';
import * as ui from './views';

const $=(selector:string)=>document.querySelector<HTMLElement>(selector)!;
type Dialog={kind:'role'|'rules'|'notebook'|'search'|'safe'|'join'|'invite';spotId?:string};
let museum:Museum|null=null,snapshot:Snapshot,selected:Action|null=null,selectedTurn=0,code='';
let muted=localStorage.getItem('pf-muted')==='1',sound:AudioContext|null=null,roleVisible=false,seenGame=false,sceneRoster='';
let dialog:Dialog|null=null,lastFocusAction='',revealIndex=0,revealStarted=0,lastDialogHTML='';
let pendingClaim:{index:number;value:string}|null=null;
const session=new Session(localStorage.getItem('pf-name')||'Julien',render);
try { museum=new Museum($('#scene'),onSceneInteract); }
catch { $('#scene').innerHTML='<p class="scene-error">Le rendu 3D nécessite WebGL. Active l’accélération graphique du navigateur puis recharge la page.</p>'; }

function notify(text:string){$('#toast').textContent=text;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
function command(c:Omit<Command,'turn'>){if(snapshot.view){const clean=Object.fromEntries(Object.entries(c).filter(([,value])=>value!==undefined));session.command({...clean,turn:snapshot.view.turn}as Command);}}
function chime(phase:string){
  if(muted||!sound)return;
  const osc=sound.createOscillator(),gain=sound.createGain();osc.connect(gain);gain.connect(sound.destination);
  osc.frequency.value=phase==='reveal'?180:phase==='ended'?660:330;
  if(phase==='reveal')osc.frequency.exponentialRampToValueAtTime(520,sound.currentTime+.25);
  gain.gain.setValueAtTime(.04,sound.currentTime);gain.gain.exponentialRampToValueAtTime(.001,sound.currentTime+.35);osc.start();osc.stop(sound.currentTime+.35);
}
type Focus={id:string;action:string;value:string;selection:number|null};
function captureFocus():Focus|null{const e=document.activeElement as HTMLInputElement|null;return e?{id:e.id,action:e.dataset.action??'',value:e.value??'',selection:e.selectionStart??null}:null;}
function restoreFocus(f:Focus|null){
  if(!f)return;
  const e=(f.id?document.getElementById(f.id):f.action?document.querySelector(`[data-action="${f.action}"]`):null)as HTMLInputElement|null;
  if(!e||e.disabled)return;
  if(e.tagName==='INPUT'&&f.id!=='nickname')e.value=f.value;
  e.focus({preventScroll:true});if(f.selection!==null&&e.tagName==='INPUT')try{e.setSelectionRange(f.selection,f.selection);}catch{}
}
function render(s:Snapshot){
  const focus=captureFocus(),v=s.view;snapshot=s;ui.setHost(s.host);
  if(v&&v.turn!==selectedTurn){
    selectedTurn=v.turn;selected=v.myChoice??(v.phase==='secret'?ui.me(v).promise:null);code=v.myCode||'';
    revealIndex=0;revealStarted=Date.now();chime(v.phase);
    if(dialog?.kind==='search'||dialog?.kind==='safe')closeDialog(false);
  }
  if(!v){seenGame=false;roleVisible=false;selectedTurn=0;selected=null;code='';}
  if(v&&ui.me(v).ready&&(dialog?.kind==='search'||dialog?.kind==='safe'))closeDialog(false);
  const chatOpen=document.querySelector('details.chat')?.hasAttribute('open')??false;
  $('#top').innerHTML=ui.header(s,muted);$('#scene-ui').innerHTML=ui.sceneOverlay(v);$('#crew').innerHTML=ui.crew(s,roleVisible,chatOpen);
  $('#controls').innerHTML=v?ui.gameControls(v,selected,code):ui.lobbyControls(s,session.name);
  $('#footer').innerHTML=`<span>« Je vous avais pourtant dit de me faire confiance. »</span><span>Prototype 0.2 · ${v?`Sac commun : ${ui.money(v.pool)} pièces`:'Fouille · mensonge · coups bas'}</span>`;
  museum?.update(v);const roster=s.players.map(p=>`${p.id}:${p.name}`).join();
  if(!v&&roster!==sceneRoster){sceneRoster=roster;museum?.setPlayers(s.players);}
  if(v&&!seenGame){seenGame=true;if(v.phase!=='ended')dialog={kind:'role'};}
  renderDialog();restoreFocus(focus);updateTimer();updateCinema();
  if(v&&pendingClaim&&v.claims.some(c=>c.id===v.myId&&c.index===pendingClaim!.index&&c.value===pendingClaim!.value)){const sent=pendingClaim;pendingClaim=null;notify(`Annonce confirmée : chiffre ${sent.index+1} = ${sent.value}.`);}
}
function roleContent(){const v=snapshot.view!;const agent=v.myRole==='agent';return `<div class="role-card ${v.myRole}">${icon(agent?'shield':'mask')}<h2 id="modal-title">${agent?'Tu es l’agent du FBI.':'Tu es un braqueur.'}</h2><p>${agent?`Fais monter l’alarme à ${ALARM_MAX}, ou reste seul face à un braqueur. Gagne leur confiance, abandonne un poste au bon moment et mens sur les chiffres que tu trouves.`:'Ouvre le trésor et échappe-toi avec plus d’argent que les autres. Voler peut rapporter 18 pièces, tenir un poste 3. Mais sans fuite, tu ne gardes rien.'}</p><small>${agent?'Tes actions sont les mêmes que celles des braqueurs : un gourmand peut te servir de couverture.':'Le FBI n’est pas le seul à avoir une bonne raison de te trahir.'}</small>${ui.button('Compris, je garde mon rôle secret','close-modal','primary')}</div>`;}
function rulesContent(){return `<span class="stamp">Le plan a changé</span><h2 id="modal-title">La confiance a un prix.</h2><p>Le groupe doit récupérer le trésor et fuir. Parmi les braqueurs qui s’échappent, le plus riche gagne. Le FBI veut faire rater le casse.</p><ol class="rules"><li><strong>Négociez les postes.</strong> Annoncez ce que vous comptez faire. Les promesses sont publiques ; les décisions réelles restent secrètes.</li><li><strong>Choisissez votre intérêt.</strong> Un poste rapporte 3. Les voleurs se partagent 18, mais ajoutent 1 alarme et retirent 8 au sac commun. Un poste incomplet ajoute 2 alarmes.</li><li><strong>Fouillez vraiment.</strong> Touchez un cadre, un bureau ou une statue, puis manipulez ses parties pour trouver l’enveloppe. Consacrez votre action à la fouille pour obtenir le chiffre privé et +2 ; le premier découvreur reçoit une prime de +4.</li><li><strong>Racontez ce que vous voulez.</strong> Partagez le vrai chiffre, annoncez un faux, ou taisez-vous. Un autre joueur peut consacrer une fouille à vérifier la même cache.</li><li><strong>Sauvez le plan.</strong> Réparer rapporte 1 et retire 2 alarmes (un effet par salle). Couvrir remplace au maximum une personne manquante et partage une prime de 6 si le sauvetage est utile.</li><li><strong>Regardez les conséquences.</strong> La révélation montre les promesses, gestes, gains et incidents. Discutez puis votez ; une majorité absolue éjecte le suspect et révèle son rôle.</li><li><strong>Composez le code.</strong> Au coffre, saisissez les trois chiffres. Un code erroné n’ouvre rien. Le forcer coûte +2 alarme et −18 au sac. Le trésor ouvert ajoute 48 au sac. Un échec donne une seconde tentative, puis il faut fuir. Sans trésor, le FBI encore infiltré gagne.</li></ol><p><strong>Alarme à ${ALARM_MAX} : la police entre.</strong> Tout l’argent est provisoire jusqu’à la fuite. Éjecter l’agent ne dispense pas de terminer le casse. Les votes cessent une fois le FBI découvert.</p>${ui.button('J’ai compris les enjeux','close-modal','primary')}`;}
function renderDialog(){
  const root=$('#modal-root');$('#app').inert=!!dialog;
  if(!dialog){root.innerHTML='';lastDialogHTML='';return;}
  const v=snapshot?.view;let content='';
  if(dialog.kind==='rules')content=rulesContent();
  if(dialog.kind==='role'&&v)content=roleContent();
  if(dialog.kind==='notebook'&&v)content=ui.notebook(v);
  if(dialog.kind==='search'&&v&&dialog.spotId)content=ui.searchModal(v,dialog.spotId);
  if(dialog.kind==='safe'&&v)content=ui.safeModal(v,code);
  if(dialog.kind==='join')content=`<h2 id="modal-title">Tu rejoins le casse.</h2><p>Choisis ton pseudo et prépare ton meilleur alibi.</p><form id="join-form"><label for="join-name">Ton pseudo<input id="join-name" maxlength="18" value="${ui.esc(session.name)}" required></label><button class="primary">Rejoindre le salon ${icon('arrow')}</button></form>`;
  if(dialog.kind==='invite')content=`<h2 id="modal-title">Inviter tes complices</h2><p>Copie ce lien et envoie-le à tes amis.</p><label for="invite-url">Lien du salon<input id="invite-url" readonly value="${ui.esc(inviteURL())}"></label>`;
  const html=`<div class="modal-backdrop"><section class="modal ${dialog.kind==='safe'?'wide-modal':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${ui.button(icon('close'),'close-modal','modal-close icon-button','aria-label="Fermer"')}${content}</section></div>`;
  if(html===lastDialogHTML)return;const focus=captureFocus();root.innerHTML=html;lastDialogHTML=html;restoreFocus(focus);
  if(!root.contains(document.activeElement))root.querySelector<HTMLElement>('button,input')?.focus({preventScroll:true});
}
function openDialog(next:Dialog){if(!dialog)lastFocusAction=(document.activeElement as HTMLElement)?.dataset.action??'';dialog=next;lastDialogHTML='';renderDialog();}
function closeDialog(restore=true){dialog=null;renderDialog();if(restore&&lastFocusAction)document.querySelector<HTMLElement>(`[data-action="${lastFocusAction}"]`)?.focus({preventScroll:true});}
function selectAction(action:Action){
  const v=snapshot.view;if(!v||!ui.me(v).active||ui.me(v).ready||!['promise','secret'].includes(v.phase))return;
  if(action==='search'&&v.roomIndex===4){notify('Le musée est derrière vous : il faut maintenant fuir.');return;}
  selected=action;render(snapshot);
  if(v.phase==='secret'&&action==='search')notify('Touche une cache du musée, puis trouve son enveloppe.');
  if(v.phase==='secret'&&action==='a'&&v.roomIndex===3)openDialog({kind:'safe'});
}
function inspectObject(spotId:string){
  const v=snapshot.view;if(!v||v.phase!=='secret'||ui.me(v).ready){notify('La fouille se joue pendant le choix secret. Elle remplace ton action de la salle.');return;}
  if(v.roomIndex===4||!v.spots.some(s=>s.id===spotId&&s.unlockRoom<=v.roomIndex))return;
  selected='search';render(snapshot);openDialog({kind:'search',spotId});
}
function onSceneInteract(target:string){const [kind,id]=target.split(':');if(kind==='spot'&&id){inspectObject(id);return;}if(kind==='post'&&(id==='a'||id==='b')){selectAction(id);return;}if(kind==='vault'){selectAction('a');return;}if(kind==='loot')selectAction('loot');if(kind==='repair')selectAction('repair');}
function confirmChoice(){
  const v=snapshot.view;if(!v||!selected)return;
  if(v.phase==='promise'){command({type:'promise',action:selected});return;}
  if(v.phase==='secret'&&selected==='search'&&!v.mySearch?.found){notify('Trouve d’abord l’enveloppe dans une cache du musée.');return;}
  if(v.phase==='secret'&&selected==='a'&&v.roomIndex===3&&code!=='FORCE'&&!/^\d{3}$/.test(code)){openDialog({kind:'safe'});return;}
  command({type:'choose',action:selected,target:selected==='search'?v.mySearch?.spotId:undefined,code:selected==='a'?code:undefined});
}
function inviteURL(){return `${location.origin}${location.pathname}?v=0.2#room=${encodeURIComponent(session.room)}`;}
async function invite(){
  if(snapshot.view&&!session.room){notify('Crée le salon avant de lancer le prochain braquage.');return;}
  if(!session.room){await session.createRoom();notify('Création du salon en cours…');return;}
  try{await navigator.clipboard.writeText(inviteURL());notify('Invitation copiée. Envoie-la à tes complices !');}catch{openDialog({kind:'invite'});}
}
function updateTimer(){const v=snapshot?.view,el=document.getElementById('countdown');if(el&&v){const secs=Math.max(0,Math.ceil((v.deadline-Date.now())/1000));el.textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}}
function updateCinema(){
  const v=snapshot?.view;if(!v||v.phase!=='reveal'||!v.report){museum?.focusPlayer(null);return;}
  revealIndex=Math.max(0,Math.min(v.report.findings.length-1,Math.floor((Date.now()-revealStarted)/2600)));
  const container=document.getElementById('cinema');if(container&&container.dataset.index!==String(revealIndex)){container.innerHTML=ui.cinema(v,revealIndex);container.dataset.index=String(revealIndex);museum?.focusPlayer(v.report.findings[revealIndex]?.id??null);}
  document.querySelectorAll<HTMLElement>('[data-reveal-index]').forEach(e=>e.classList.toggle('in-spotlight',Number(e.dataset.revealIndex)===revealIndex));
}

document.addEventListener('click',async event=>{
  const target=(event.target as Element).closest<HTMLElement>('[data-action]');if(!target||target.hasAttribute('disabled'))return;
  const [action,value,step]=target.dataset.action!.split(':');const v=snapshot.view;
  if(action==='select')selectAction(value as Action);if(action==='confirm')confirmChoice();if(action==='search')inspectObject(value);
  if(action==='inspect')command({type:'inspect',target:value,step:Number(step)});
  if(action==='lock-search'){selected='search';confirmChoice();closeDialog();}
  if(action==='safe'&&v)openDialog({kind:'safe'});
  if(action==='key'){if(code==='FORCE')code='';code=value==='clear'?'':value==='back'?code.slice(0,-1):code.length<3?code+value:code;renderDialog();}
  if(action==='use-code'){selected='a';closeDialog();render(snapshot);}
  if(action==='force-safe'){selected='a';code='FORCE';closeDialog();render(snapshot);}
  if(action==='continue')command({type:'continue'});if(action==='vote')command({type:'vote',target:value});
  if(action==='start'){const name=document.getElementById('nickname')as HTMLInputElement|null;if(name)session.rename(name.value);sound??=new AudioContext();void sound.resume();session.start();}
  if(['create','copy','invite'].includes(action))await invite();
  if(action==='add-bot')session.addBot();if(action==='remove')session.removeBot(value);
  if(action==='rematch'){closeDialog();session.backToLobby();}
  if(action==='rules')openDialog({kind:'rules'});if(action==='notebook')openDialog({kind:'notebook'});
  if(action==='role'){roleVisible=!roleVisible;render(snapshot);}
  if(action==='sound'){muted=!muted;localStorage.setItem('pf-muted',muted?'1':'0');sound??=new AudioContext();void sound.resume();render(snapshot);}
  if(action==='zoom-in')museum?.setZoom(.1);if(action==='zoom-out')museum?.setZoom(-.1);
  if(action==='close-modal')closeDialog();if(action==='reconnect')session.connect();
});
document.addEventListener('change',event=>{const input=event.target as HTMLInputElement;if(input.id==='nickname'){localStorage.setItem('pf-name',input.value.trim().slice(0,18));session.rename(input.value);}});
document.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;
  if(form.id==='chat-form'){event.preventDefault();const input=$('#chat-text')as HTMLInputElement;const text=input.value;input.value='';session.sendChat(text);}
  if(form.classList.contains('claim-form')){event.preventDefault();const input=form.querySelector<HTMLInputElement>('input')!,v=snapshot.view;if(v&&ui.me(v).active&&v.phase!=='ended'&&!(v.phase==='secret'&&ui.me(v).ready)&&/^\d$/.test(input.value)){pendingClaim={index:Number(form.dataset.index),value:input.value};command({type:'claim',target:form.dataset.index,code:input.value});}}
  if(form.id==='join-form'){event.preventDefault();const name=($('#join-name')as HTMLInputElement).value.trim().slice(0,18)||'Complice';session.name=name;localStorage.setItem('pf-name',name);closeDialog();const room=new URLSearchParams(location.hash.slice(1)).get('room');if(room)session.join(room);}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')closeDialog();
  if(event.key==='Tab'&&dialog){const items=[...document.querySelectorAll<HTMLElement>('.modal button:not([disabled]),.modal input:not([disabled])')];const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
setInterval(()=>{updateTimer();updateCinema();},200);session.emit(true);
const room=new URLSearchParams(location.hash.slice(1)).get('room');if(room&&/^pf-[a-z0-9-]{8,40}$/.test(room))openDialog({kind:'join'});
