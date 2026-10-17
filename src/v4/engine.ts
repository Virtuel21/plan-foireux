export const ACTIONS = ['work', 'scheme'] as const;
export type Action = typeof ACTIONS[number];
export type Phase = 'secret'|'reveal'|'vote'|'ended';
export type Role = 'burglar'|'agent';
export type Scheme = 'grab'|'pocket'|'trip';
export const COLORS = ['#ecac32','#28aaa5','#ee7836','#9d65b2','#5f8ce1','#df647c'];
export const ALARM_MAX=10, ROUNDS=9, CHOICE_MS=55_000, REVEAL_MS=12_000, VOTE_MS=40_000;
export type Player={id:string;name:string;color:string;bot:boolean;online:boolean;active:boolean;money:number;promise:Action|null;ready:boolean;exposed:Role|null};
export type Choice={action:Action;target?:string};
export type Command={type:string;action?:Action;target?:string;turn?:number};
export type Signal={id:string;kind:'work'|'help'|'watch';target?:string;at:number};
export type Finding={id:string;action:Action;scheme:Scheme|null;target:string|null;earned:number;stole:number;lost:number;gain:number;blocked:boolean;helped:boolean;saidWork:boolean};
export type Report={findings:Finding[];workers:number;needed:number;opened:boolean;alarmBefore:number;alarmAfter:number;noise:number;forced:number;text:string};
export type Check={round:number;target:string|null;role:Role|null;votes:number;needed:number};
export type Result={kind:'escape'|'caught'|'fbi';winners:string[];text:string;agentId:string};
export type Game={players:Player[];roles:Record<string,Role>;offers:Record<string,Scheme[]>;choices:Record<string,Choice>;votes:Record<string,string>;signals:Signal[];phase:Phase;round:number;alarm:number;report:Report|null;history:Finding[][];checks:Check[];deadline:number;started:number;phaseStarted:number;turn:number;result:Result|null;pending:'escape'|'fbi'|null;seed:number;initiative:string[][]};
export type View={players:Player[];phase:Phase;round:number;alarm:number;report:Report|null;history:Finding[][];checks:Check[];signals:Signal[];deadline:number;started:number;phaseStarted:number;turn:number;result:Result|null;myId:string;myRole:Role;myOffer:Scheme;myChoice:Action|null;myTarget:string|null;myVote:string|null;voteCount:number;needed:number};
export function random(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle<T>(values:T[],rng:()=>number){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function createGame(players:Player[],seed:number,now=Date.now()):Game{
  if(players.length<3||players.length>6||new Set(players.map(p=>p.id)).size!==players.length)throw Error('3 à 6 joueurs distincts requis');
  const rng=random(seed),agent=Math.floor(rng()*players.length);
  const offers:Record<string,Scheme[]>=Object.fromEntries(players.map(p=>[p.id,['grab',...shuffle<Scheme>(['grab','grab','grab','grab','pocket','pocket','trip','trip'],rng)] as Scheme[]]));
  return{players:players.map(p=>({...p,active:true,money:0,promise:null,ready:false,exposed:null})),roles:Object.fromEntries(players.map((p,i)=>[p.id,i===agent?'agent':'burglar'])),offers,choices:{},votes:{},signals:[],phase:'secret',round:0,alarm:0,report:null,history:[],checks:[],deadline:now+CHOICE_MS,started:now,phaseStarted:now,turn:1,result:null,pending:null,seed,initiative:Array.from({length:ROUNDS},()=>shuffle(players.map(p=>p.id),rng))};
}
export function publicView(g:Game,id:string):View{
  return structuredClone({players:g.players,phase:g.phase,round:g.round,alarm:g.alarm,report:g.report,history:g.history,checks:g.checks,signals:g.signals,deadline:g.deadline,started:g.started,phaseStarted:g.phaseStarted,turn:g.turn,result:g.result,myId:id,myRole:g.roles[id]??'burglar',myOffer:g.offers[id]?.[g.round]??'grab',myChoice:g.choices[id]?.action??null,myTarget:g.choices[id]?.target??null,myVote:g.votes[id]??null,voteCount:Object.keys(g.votes).length,needed:Math.ceil(g.players.length/2)});
}
export function apply(g:Game,id:string,c:Command,now=Date.now()):boolean{
  const p=g.players.find(p=>p.id===id);
  if(!p||!p.active||g.phase==='ended'||!c||typeof c!=='object'||Array.isArray(c)||c.turn!==g.turn)return false;
  if(Object.keys(c).some(k=>!['type','action','target','turn'].includes(k))||typeof c.type!=='string'||!Number.isSafeInteger(c.turn))return false;
  if(c.target!==undefined&&(typeof c.target!=='string'||c.target.length>80))return false;
  const only=(...keys:string[])=>Object.keys(c).every(k=>['type','turn',...keys].includes(k));
  if(c.type==='choose'){
    if(!only('action','target')||g.phase!=='secret'||p.ready||!ACTIONS.includes(c.action as Action))return false;
    const targeted=c.action==='scheme'&&g.offers[id][g.round]!=='grab';
    if(targeted?!g.players.some(t=>t.id===c.target&&t.id!==id):c.target!==undefined)return false;
    g.choices[id]={action:c.action!,...(targeted?{target:c.target}:{})};p.ready=true;return true;
  }
  if(c.type==='signal'){
    if(!only('target')||g.phase!=='secret')return false;
    const [kind,target,...extra]=(c.target??'').split(':');
    if(extra.length||!['work','help','watch'].includes(kind)||(kind==='watch'?!g.players.some(p=>p.id===target&&target!==id):target!==undefined))return false;
    const previous=g.signals.find(s=>s.id===id);if(previous&&now-previous.at<2500)return false;
    g.signals=g.signals.filter(s=>s.id!==id);g.signals.push({id,kind:kind as Signal['kind'],...(target?{target}:{}),at:now});
    if(kind==='work')p.promise='work';return true;
  }
  if(c.type==='vote'){
    if(!only('target')||g.phase!=='vote'||p.ready||!(c.target==='skip'||g.players.some(t=>t.id===c.target&&t.id!==id&&t.exposed!=='burglar')))return false;
    g.votes[id]=c.target!;p.ready=true;return true;
  }
  return false;
}
function finish(g:Game,kind:Result['kind']){
  const agentId=g.players.find(p=>g.roles[p.id]==='agent')!.id;
  const burglars=g.players.filter(p=>g.roles[p.id]==='burglar'),richest=Math.max(...burglars.map(p=>p.money));
  const winners=kind==='fbi'?[agentId]:burglars.filter(p=>p.money===richest).map(p=>p.id);
  if(kind==='fbi')g.players.forEach(p=>p.money=0);
  g.players.forEach(p=>{p.exposed=g.roles[p.id];p.ready=false;});
  g.result={kind,winners,agentId,text:kind==='fbi'?'La police a saisi les sacs. Le FBI gagne.':kind==='caught'?'Le FBI est démasqué. Les braqueurs filent avec leurs sacs !':'Le fourgon démarre. Le braqueur le plus riche gagne !'};
  g.pending=null;g.phase='ended';g.turn++;
}
export function resolveRound(g:Game,now=Date.now()){
  const ps=g.players,choice=(id:string)=>g.choices[id]??{action:'work' as Action},before=g.alarm;
  const trippers=ps.filter(p=>choice(p.id).action==='scheme'&&g.offers[p.id][g.round]==='trip');
  const blocked=new Set(trippers.map(p=>choice(p.id).target).filter((id):id is string=>!!id));
  const findings:Finding[]=ps.map(p=>{const c=choice(p.id),scheme=c.action==='scheme'?g.offers[p.id][g.round]:null,stopped=c.action==='work'&&blocked.has(p.id);return{id:p.id,action:c.action,scheme,target:c.target??null,earned:c.action==='work'?stopped?0:4:scheme==='grab'?8:0,stole:0,lost:0,gain:0,blocked:stopped,helped:c.action==='work'&&!stopped,saidWork:p.promise==='work'};});
  const moneyBefore=Object.fromEntries(ps.map(p=>[p.id,p.money]));
  // The victim's round earnings exist before theft, but incoming theft cannot fund an outgoing theft.
  // One coin per attacker in seeded order prevents first-network-message priority and fractional coins.
  for(const victim of ps){
    const own=findings.find(f=>f.id===victim.id)!;let remaining=victim.money+own.earned;
    const requests=g.initiative[g.round].map(id=>findings.find(f=>f.id===id)!).filter(f=>f.target===victim.id&&(f.scheme==='pocket'||f.scheme==='trip'));
    for(let coin=0;coin<5;coin++)for(const f of requests){const limit=f.scheme==='trip'?4:5;if(remaining>0&&f.stole<limit){f.stole++;own.lost++;remaining--;}}
  }
  for(const f of findings){const p=ps.find(p=>p.id===f.id)!;f.gain=f.earned+f.stole-f.lost;p.money=moneyBefore[p.id]+f.gain;}
  const workers=findings.filter(f=>f.helped).length,needed=Math.ceil(ps.length/2),opened=workers>=needed,noise=findings.filter(f=>f.action==='scheme').length,forced=opened?0:2;
  g.alarm=Math.max(0,Math.min(ALARM_MAX,before+noise-workers+forced));
  g.report={findings,workers,needed,opened,alarmBefore:before,alarmAfter:g.alarm,noise,forced,text:opened?'Passage ouvert !':'Pas assez de bras. On force le passage !'};
  g.history.push(findings);g.phase='reveal';g.phaseStarted=now;g.deadline=now+REVEAL_MS;g.turn++;
  ps.forEach(p=>p.ready=false);
  if(g.alarm>=ALARM_MAX)g.pending='fbi';else if(g.round===ROUNDS-1)g.pending='escape';
}
function nextRound(g:Game,now:number){g.round++;g.phase='secret';g.turn++;g.phaseStarted=now;g.deadline=now+CHOICE_MS;g.report=null;g.choices={};g.votes={};g.signals=[];g.players.forEach(p=>{p.ready=false;p.promise=null;});}
function resolveVote(g:Game,now:number){
  const needed=Math.floor(g.players.length/2)+1,counts:Record<string,number>={};for(const target of Object.values(g.votes))if(target!=='skip')counts[target]=(counts[target]??0)+1;
  const target=g.players.find(p=>(counts[p.id]??0)>=needed);
  g.checks.push({round:g.round,target:target?.id??null,role:target?g.roles[target.id]:null,votes:target?counts[target.id]:0,needed});
  if(target){target.exposed=g.roles[target.id];if(target.exposed==='agent'){finish(g,'caught');return;}}
  nextRound(g,now);
}
export function advance(g:Game,now=Date.now()):boolean{
  if(g.phase==='ended')return false;
  const expired=now>=g.deadline,allReady=g.players.every(p=>p.ready),elapsed=now-g.phaseStarted;
  if(g.phase==='secret'&&(expired||allReady&&elapsed>=5000)){
    for(const p of g.players)if(!g.choices[p.id])g.choices[p.id]={action:'work'};
    resolveRound(g,now);return true;
  }
  if(g.phase==='reveal'&&expired){
    if(g.pending){finish(g,g.pending);return true;}
    if(g.round===2||g.round===5){g.phase='vote';g.turn++;g.phaseStarted=now;g.deadline=now+VOTE_MS;g.votes={};g.players.forEach(p=>p.ready=false);}
    else nextRound(g,now);
    return true;
  }
  if(g.phase==='vote'&&(expired||allReady&&elapsed>=5000)){resolveVote(g,now);return true;}
  return false;
}
export function botCommand(g:Game,p:Player):Command|null{
  const v=publicView(g,p.id),turn=v.turn;if(p.ready||v.phase==='ended'||v.phase==='reveal')return null;
  const rng=random(g.seed+g.round*997+g.players.indexOf(p)*71+g.turn*13),others=v.players.filter(t=>t.id!==p.id),leader=[...others].sort((a,b)=>b.money-a.money)[0];
  if(v.phase==='vote'){
    const candidates=others.filter(t=>t.exposed!=='burglar');if(!candidates.length)return{type:'vote',target:'skip',turn};
    const suspicion=(id:string)=>v.history.reduce((score,round)=>{const f=round.find(f=>f.id===id)!;return score+(f.action==='scheme'?1:0)+(f.saidWork&&f.action==='scheme'?1.7:0)+(f.scheme==='trip'&&round.some(t=>t.id===f.target&&t.blocked)?1.2:0);},0);
    candidates.sort((a,b)=>suspicion(b.id)-suspicion(a.id));
    const target=v.myRole==='agent'?candidates.find(t=>t.id===leader.id)??candidates[0]:suspicion(candidates[0].id)>=3&&rng()<.76?candidates[0]:null;
    return{type:'vote',target:target?.id??'skip',turn};
  }
  const workers=v.players.filter(t=>t.id!==p.id&&t.promise==='work').length,ownIndex=v.players.indexOf(v.players.find(t=>t.id===p.id)!),assigned=ownIndex%v.players.length<v.needed;
  let help=v.alarm>=6||workers<v.needed&&assigned||p.money>=leader.money+5;
  if(v.myRole==='agent')help=g.round<2?rng()<.65:v.alarm<3?rng()<.25:false;
  else if(rng()<.13)help=!help;
  if(help&&p.promise!=='work')return{type:'signal',target:'work',turn};
  if(help)return{type:'choose',action:'work',turn};
  let target=leader.id;
  if(v.myOffer==='trip'&&v.myRole==='agent')target=others.find(t=>t.promise==='work'&&t.exposed!=='burglar')?.id??leader.id;
  return{type:'choose',action:'scheme',...(v.myOffer==='grab'?{}:{target}),turn};
}
