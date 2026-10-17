// Loaded only by Vite DEV with ?qa. Never shipped in the production bundle.
import type { Session } from './session';
import { apply,advance,createGame } from './engine';
export function install(session:Session){
  const bar=document.createElement('div');bar.id='qa-tools';Object.assign(bar.style,{position:'fixed',left:'10px',top:'50px',zIndex:'200',display:'flex',gap:'4px',padding:'5px',background:'#080a'});
  for(const [label,action] of [['QA coup','round'],['QA poches','pocket'],['QA croche-pied','trip'],['QA FBI','agent'],['QA contrôle','vote'],['QA fuite','escape'],['QA police','raid'],['QA 6 joueurs','six']]){const b=document.createElement('button');b.textContent=label;Object.assign(b.style,{fontSize:'10px',color:'#102737'});b.addEventListener('click',()=>run(action));bar.append(b);}document.body.append(bar);
  function run(action:string){if(!session.host||session.room)return;let g=session.game;
    if(action==='six'){while(session.players.length<6)session.addBot();return;}
    if(action==='agent'){session.game=createGame(session.players,8);g=session.game;g.roles=Object.fromEntries(g.players.map(p=>[p.id,p.id===session.myId?'agent':'burglar']));session.players=g.players;session.emit(true);return;}
    if(!g)return;
    if(action==='pocket'||action==='trip'){g.phase='secret';g.turn++;g.round=1;g.phaseStarted=Date.now();g.deadline=Date.now()+55000;g.choices={};g.report=null;g.pending=null;g.players.forEach(p=>{p.ready=false;p.money=10;});g.offers[session.myId][1]=action;session.emit(true);return;}
    if(action==='vote'){g.phase='vote';g.turn++;g.phaseStarted=Date.now();g.deadline=Date.now()+40000;g.votes={};g.players.forEach(p=>p.ready=false);session.emit(true);return;}
    if(action==='escape'||action==='raid'){g.phase='reveal';g.deadline=Date.now();g.pending=action==='escape'?'escape':'fbi';advance(g);session.emit(true);return;}
    if(g.phase==='secret'){g.players.forEach((p,i)=>{if(g!.choices[p.id])return;g!.offers[p.id][g!.round]=i===1?'pocket':i===2?'trip':'grab';apply(g!,p.id,{type:'choose',action:i===0||i===3?'work':'scheme',...(i===1||i===2?{target:session.myId}:{}),turn:g!.turn});});g.phaseStarted=Date.now()-5001;advance(g);}
    else if(g.phase==='vote'){g.players.forEach(p=>{if(!p.ready)apply(g!,p.id,{type:'vote',target:'skip',turn:g!.turn});});g.phaseStarted=Date.now()-5001;advance(g);}
    else if(g.phase==='reveal'){g.deadline=Date.now();advance(g);}
    session.emit(true);
  }
}
