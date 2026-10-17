export type Action = 'a' | 'b' | 'loot';
export type Phase = 'promise' | 'secret' | 'reveal' | 'vote' | 'ended';
export type Role = 'burglar' | 'agent';
export const COLORS = ['#ecac32','#28aaa5','#ee7836','#9d65b2','#5f8ce1','#df647c'];
export type Player = { id:string; name:string; color:string; bot:boolean; online:boolean; active:boolean; money:number; promise:Action|null; ready:boolean; exposed:Role|null };
export type Task = { name:string; short:string; detail:string; need:number; icon:string };
export type Room = { title:string; subtitle:string; a:Task; b:Task; layout:number; clue:number; objective:string };
export type Finding = { id:string; action:Action; promise:Action|null; gain:number; betrayed:boolean };
export type Report = { findings:Finding[]; incidents:string[]; alarmAdded:number; text:string };
export type Game = { players:Player[]; roles:Record<string,Role>; choices:Record<string,{action:Action;code?:string}>; votes:Record<string,string>; phase:Phase; roomIndex:number; rooms:Room[]; alarm:number; pool:number; code:string; clues:(string|null)[]; objective:boolean; report:Report|null; history:{id:string;betrayed:boolean}[]; log:string[]; deadline:number; turn:number; result:null|{kind:'escape'|'fbi'|'police'|'missed'; winners:string[]; text:string}; agentExposed:boolean; rng:()=>number };
export type View = Omit<Game,'roles'|'choices'|'votes'|'code'|'rng'|'history'> & { myRole:Role; myChoice:Action|null; myVote:string|null; voteCount:number; myId:string };
export function random(seed:number) { return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
export function makeRooms(seed:number, count:number):Room[] {
  const r=random(seed), heavy=Math.max(1,Math.min(2,count-2));
  const objective=['la Couronne du roi','le Diamant bleu','le Masque d’or'][Math.floor(r()*3)];
  const task=(name:string,short:string,detail:string,need:number,icon:string):Task=>({name,short,detail,need,icon});
  const pairs=[
    [task('Brouiller les caméras','Caméras','Coupe la surveillance de l’entrée.',1,'eye'),task('Occuper le gardien','Gardien','Une diversion, et on entre sans bruit.',1,'shield')],
    [task('Soulever la grille','Grille','Maintenez la grille ensemble.',heavy,'grid'),task('Couper les lasers','Lasers','Désactive le panneau de sécurité.',1,'laser')],
    [task('Neutraliser l’alarme','Alarme','Débranche le détecteur de mouvement.',1,'laser'),task('Déplacer la statue','Statue','Dégagez le passage vers le trésor.',heavy,'users')],
    [task('Ouvrir le coffre','Coffre','Saisis le code trouvé dans les indices.',1,'lock'),task('Surveiller le couloir','Guet','Garde un œil sur le gardien.',1,'eye')],
    [task('Conduire le fourgon','Volant','Laisse le moteur tourner !',1,'van'),task('Faire diversion','Diversion','Attire la sécurité de l’autre côté.',1,'shield')]
  ];
  if(r()>.5) [pairs[1],pairs[2]]=[pairs[2],pairs[1]];
  return pairs.map((p,i)=>({title:['Entrer sans se faire voir','Traverser la galerie','Atteindre la réserve','Ouvrir la salle du trésor','Tout le monde au fourgon !'][i],subtitle:['Le hall des antiquités','La galerie des portraits','La réserve interdite','Le grand coffre','La cour du musée'][i],a:p[0],b:p[1],layout:Math.floor(r()*3),clue:Math.min(i,2),objective}));
}
export function createGame(players:Player[],seed:number,now=Date.now()):Game {
  if(players.length<3||players.length>6)throw Error('3 à 6 joueurs requis');
  const rng=random(seed), agent=Math.floor(rng()*players.length);
  return {players:players.map(p=>({...p,active:true,money:0,promise:null,ready:false,exposed:null})),roles:Object.fromEntries(players.map((p,i)=>[p.id,i===agent?'agent':'burglar'])),choices:{},votes:{},phase:'promise',roomIndex:0,rooms:makeRooms(Math.floor(rng()*0xffffffff),players.length),alarm:0,pool:0,code:String(100+Math.floor(rng()*900)),clues:[null,null,null],objective:false,report:null,history:[],log:['Le musée ferme ses portes. À vous de jouer.'],deadline:now+45000,turn:1,result:null,agentExposed:false,rng};
}
export function publicView(g:Game,id:string):View {
  const {roles,choices,votes,code,rng,history,...safe}=g;
  return structuredClone({...safe,myRole:roles[id],myChoice:choices[id]?.action??null,myVote:votes[id]??null,voteCount:Object.keys(votes).length,myId:id});
}
const active=(g:Game)=>g.players.filter(p=>p.active);
function end(g:Game,kind:NonNullable<Game['result']>['kind'],text:string) {
  const survivors=active(g), agent=survivors.find(p=>g.roles[p.id]==='agent');
  let winners:string[]=[];
  if(kind==='escape') {
    survivors.forEach(p=>p.money+=g.pool/survivors.length);
    const burglars=survivors.filter(p=>g.roles[p.id]==='burglar');
    const max=Math.max(...burglars.map(p=>p.money));winners=burglars.filter(p=>Math.abs(p.money-max)<1e-8).map(p=>p.id);
  } else {g.players.forEach(p=>p.money=0);if(kind==='fbi'&&agent)winners=[agent.id];}
  g.players.forEach(p=>p.exposed=g.roles[p.id]);g.result={kind,text,winners};g.phase='ended';g.turn++;
}
export function apply(g:Game,id:string,command:{type:string;action?:Action;target?:string;code?:string;turn?:number},now=Date.now()):boolean {
  const p=g.players.find(p=>p.id===id);if(!p?.active||g.phase==='ended'||command.turn!==g.turn)return false;
  if(command.type==='clue' && g.roomIndex<4) {const requested=Number(command.target);const c=command.target!==undefined&&Number.isInteger(requested)&&requested>=0&&requested<=Math.min(2,g.roomIndex)?requested:g.rooms[g.roomIndex].clue;g.clues[c]=g.code[c];return true;}
  if(command.type==='promise'&&g.phase==='promise'&&['a','b','loot'].includes(command.action??'')) {p.promise=command.action!;p.ready=true;return true;}
  if(command.type==='choose'&&g.phase==='secret'&&['a','b','loot'].includes(command.action??'')) {if(g.choices[id])return false;g.choices[id]={action:command.action!,code:command.code?.slice(0,3)};p.ready=true;return true;}
  if(command.type==='vote'&&g.phase==='vote') {if(g.votes[id]||!(command.target==='skip'||active(g).some(t=>t.id===command.target&&t.id!==id)))return false;g.votes[id]=command.target!;p.ready=true;return true;}
  return false;
}
export function resolveRoom(g:Game) {
  const room=g.rooms[g.roomIndex],ps=active(g);let alarmAdded=0;
  const incidents:string[]=[];const findings:Finding[]=[];
  for(const action of ['a','b'] as const) {
    const contributors=ps.filter(p=>g.choices[p.id]?.action===action && !(g.roomIndex===3&&action==='a'&&g.choices[p.id].code!==g.code));
    if(contributors.length<room[action].need) {alarmAdded++;incidents.push(`${room[action].short} : ${contributors.length}/${room[action].need}. +1 alarme.`);}
    if(g.roomIndex===3&&action==='a'&&contributors.length>=room.a.need)g.objective=true;
  }
  const looters=ps.filter(p=>g.choices[p.id]?.action==='loot');g.pool+=16-(looters.length?12:0);
  ps.forEach(p=>{const c=g.choices[p.id];let gain=c?.action==='loot'?12/looters.length:4;if(g.roomIndex===3&&c?.action==='a'&&c.code!==g.code)gain=0;p.money+=gain;
    const betrayed=p.promise!==c?.action;findings.push({id:p.id,action:c?.action??'loot',promise:p.promise,gain,betrayed});g.history.push({id:p.id,betrayed});});
  g.alarm=Math.min(3,g.alarm+alarmAdded);
  const text=incidents.length?'Le plan a pris un coup. Qui a changé d’avis ?':'Du beau travail. Tout le monde a pu passer.';
  g.report={findings,incidents,alarmAdded,text};g.log.unshift(`${g.roomIndex===4?'Fuite':`Salle ${g.roomIndex+1}`} : ${alarmAdded?`+${alarmAdded} alarme`:'passage discret'}.`);
  g.phase='reveal';g.deadline=Date.now()+7000;g.players.forEach(p=>p.ready=false);g.turn++;
  if(g.alarm>=3)end(g,active(g).some(p=>g.roles[p.id]==='agent')?'fbi':'police','La police est entrée. Le butin est perdu.');
  else if(g.roomIndex===4) {if(g.objective)end(g,'escape','Le fourgon est parti. Le plus riche des braqueurs remporte le casse !');else end(g,'missed','Vous êtes sortis les mains vides : le trésor est resté dans le coffre.');}
}
function nextRoom(g:Game,now:number) {g.roomIndex++;g.phase='promise';g.choices={};g.votes={};g.report=null;g.players.forEach(p=>{p.promise=null;p.ready=false;});g.turn++;g.deadline=now+45000;}
export function resolveVote(g:Game,now=Date.now()) {
  const ps=active(g), needed=Math.floor(ps.length/2)+1;
  const counts:Record<string,number>={};Object.values(g.votes).forEach(id=>{if(id!=='skip')counts[id]=(counts[id]||0)+1;});
  const out=ps.find(p=>(counts[p.id]||0)>=needed);
  if(out) {out.active=false;out.money=0;out.exposed=g.roles[out.id];g.log.unshift(`${out.name} a été éjecté·e : ${out.exposed==='agent'?'agent du FBI !':'braqueur innocent.'}`);if(out.exposed==='agent')g.agentExposed=true;}
  else g.log.unshift('Aucune majorité. Le groupe reste au complet.');
  if(!g.agentExposed&&active(g).length<=2)end(g,'fbi','Il ne reste qu’un braqueur face à l’agent. Le FBI gagne.');
  else nextRoom(g,now);
}
export function advance(g:Game,now=Date.now(),force=false) {
  if(g.phase==='ended')return;
  const allReady=active(g).every(p=>p.ready),elapsed=now>=g.deadline;
  if(g.phase==='promise'&&(allReady||elapsed)) {active(g).forEach(p=>{p.promise??='loot';p.ready=false;});g.phase='secret';g.turn++;g.deadline=now+35000;}
  else if(g.phase==='secret'&&(allReady||elapsed)) {active(g).forEach(p=>g.choices[p.id]??={action:p.promise??'loot'});resolveRoom(g);}
  else if(g.phase==='reveal'&&(elapsed||force)) {if(g.agentExposed)nextRoom(g,now);else {g.phase='vote';g.turn++;g.deadline=now+45000;g.votes={};}}
  else if(g.phase==='vote'&&(allReady||elapsed)) {resolveVote(g,now);}
}
export function botCommand(g:Game,p:Player) {
  if(!p.active||p.ready)return null;const room=g.rooms[g.roomIndex], r=g.rng;
  if(g.phase==='promise') {
    const counts={a:g.players.filter(t=>t.promise==='a'&&t.active).length,b:g.players.filter(t=>t.promise==='b'&&t.active).length};
    const action:Action=counts.a<room.a.need?'a':counts.b<room.b.need?'b':'loot';
    return {type:'promise',action,turn:g.turn};
  }
  if(g.phase==='secret') {
    let action=p.promise??'loot';const agent=g.roles[p.id]==='agent';
    if(agent&&action!=='loot'&&r()<.55)action='loot';
    else if(!agent&&g.alarm===0&&action!=='loot'&&r()<.1)action='loot';
    return {type:'choose',action,code:g.clues.every(Boolean)?g.code:'',turn:g.turn};
  }
  if(g.phase==='vote') {
    const suspects=active(g).filter(t=>t.id!==p.id).map(t=>({p:t,n:g.history.filter(h=>h.id===t.id&&h.betrayed).length})).sort((a,b)=>b.n-a.n);
    const target=suspects[0]?.n>=1&&r()<.74?suspects[0].p.id:'skip';return {type:'vote',target,turn:g.turn};
  }
  return null;
}
