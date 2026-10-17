import Peer, { type DataConnection } from 'peerjs';
import { createGame, publicView, apply, advance, botCommand, ACTIONS, COLORS, type Command, type Player, type Game, type View } from './engine';
export type Chat={id:string;name:string;text:string};
export type Snapshot={players:Player[];view:View|null;myId:string;host:boolean;room:string;status:string;chat:Chat[];error:string};
type MessageBudget={tokens:number;updated:number};
const uid=()=>crypto.randomUUID();
const PING_INTERVAL=5000, HEARTBEAT_TIMEOUT=18000, DISCONNECT_GRACE=20000, REVEAL_MIN=8000;
const COMMAND_TYPES=['promise','choose','vote','inspect','claim','continue'];
const COMMAND_FIELDS=['type','action','target','code','step','turn'];
function readCommand(raw:unknown):Command|null {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const c=raw as Record<string,unknown>;
  if(Object.keys(c).some(k=>!COMMAND_FIELDS.includes(k))||typeof c.type!=='string'||!COMMAND_TYPES.includes(c.type)||typeof c.turn!=='number'||!Number.isSafeInteger(c.turn)||c.turn<1)return null;
  if(c.action!==undefined&&(typeof c.action!=='string'||!ACTIONS.includes(c.action as Command['action']&string)))return null;
  if(c.target!==undefined&&(typeof c.target!=='string'||c.target.length>80))return null;
  if(c.code!==undefined&&(typeof c.code!=='string'||c.code.length>5))return null;
  if(c.step!==undefined&&(typeof c.step!=='number'||!Number.isInteger(c.step)||c.step<0||c.step>2))return null;
  return {type:c.type,turn:c.turn,...(c.action===undefined?{}:{action:c.action as Command['action']}),...(c.target===undefined?{}:{target:c.target as string}),...(c.code===undefined?{}:{code:c.code as string}),...(c.step===undefined?{}:{step:c.step as number})};
}
export class Session {
  players:Player[]=[];game:Game|null=null;view:View|null=null;myId='you';host=true;room='';status='local';error='';chat:Chat[]=[];
  peer:Peer|null=null;connection:DataConnection|null=null;connections=new Map<string,DataConnection>();tokens=new Map<string,string>();
  token=sessionStorage.getItem('pf-token')??uid();lastTurn=0;phaseStart=Date.now();lastSnapshot='';reconnectTimer:ReturnType<typeof setTimeout>|null=null;
  lastSeen=new Map<string,number>();commandBudgets=new Map<string,MessageBudget>();chatBudgets=new Map<string,MessageBudget>();disconnectedAt=new Map<string,number>();lastPingAt=0;lastHostSeen=0;destroyed=false;
  constructor(public name:string,public changed:(s:Snapshot)=>void) {sessionStorage.setItem('pf-token',this.token);this.resetPlayers();setInterval(()=>this.tick(),250);}
  resetPlayers() {this.myId='you';this.players=[this.makePlayer(this.myId,this.name,false,0),...['Léa','Max','Sarah'].map((n,i)=>this.makePlayer(`bot-${i}`,n,true,i+1))];}
  makePlayer(id:string,name:string,bot:boolean,index:number):Player{return {id,name:name.trim().slice(0,18)||'Braqueur',bot,online:true,color:COLORS[index%6],active:true,money:0,promise:null,ready:false,exposed:null};}
  snapshot():Snapshot{return {players:this.players,view:this.host&&this.game?publicView(this.game,this.myId):this.view,myId:this.myId,host:this.host,room:this.room,status:this.status,chat:this.chat,error:this.error};}
  emit(force=false) {
    const s=this.snapshot(),key=JSON.stringify(s);if(!force&&key===this.lastSnapshot)return;this.lastSnapshot=key;this.changed(s);
    if(this.host)for(const [id,conn]of this.connections)if(conn.open)try{conn.send({type:'snapshot',data:{...s,view:this.game?publicView(this.game,id):null,myId:id,host:false}});}catch{conn.close();}
  }
  async createRoom() {
    if(this.room||this.status==='connecting')return;this.error='';this.status='connecting';this.emit();
    const peer=new Peer(`pf-${uid().slice(0,12)}`);this.peer=peer;
    peer.on('connection',c=>this.accept(c));
    peer.on('open',id=>{this.room=id;this.status='online';this.host=true;history.replaceState(null,'',`${location.pathname}#room=${encodeURIComponent(id)}`);this.emit();});
    peer.on('disconnected',()=>{if(!peer.destroyed){this.status='reconnecting';this.emit();peer.reconnect();}});
    peer.on('error',err=>{this.error=`Le salon ne peut pas se connecter (${err.type}). Le mode solo reste disponible.`;this.status='error';this.emit();});
  }
  markOffline(id:string,now=Date.now()) {
    const p=this.players.find(p=>p.id===id);if(p)p.online=false;
    if(!this.disconnectedAt.has(id))this.disconnectedAt.set(id,now);
  }
  consumeBudget(budgets:Map<string,MessageBudget>,id:string,rate:number,capacity:number,now=Date.now()) {
    const budget=budgets.get(id)??{tokens:capacity,updated:now};
    budget.tokens=Math.min(capacity,budget.tokens+Math.max(0,now-budget.updated)*rate/1000);budget.updated=now;budgets.set(id,budget);
    if(budget.tokens<1)return false;budget.tokens--;return true;
  }
  accept(conn:DataConnection) {
    let assigned:string|null=null;let introduced=false;
    const expiry=setTimeout(()=>{if(!introduced)conn.close();},12000);
    conn.on('data',(raw:unknown)=>{
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;const msg=raw as Record<string,unknown>;
      if(msg.type==='hello'&&!introduced) {
        introduced=true;clearTimeout(expiry);if(typeof msg.token!=='string'||!msg.token.length||msg.token.length>80||typeof msg.name!=='string'||msg.name.length>80){conn.close();return;}
        const existing=this.tokens.get(msg.token);let replaced:DataConnection|undefined;
        if(existing){assigned=existing;replaced=this.connections.get(existing);}
        else {
          if(this.game){conn.send({type:'rejected',text:'La partie a déjà commencé. Rejoins le prochain casse.'});setTimeout(()=>conn.close(),300);return;}
          const humans=this.players.filter(p=>!p.bot);if(humans.length>=6){conn.send({type:'rejected',text:'Le salon est complet (6 joueurs).'});setTimeout(()=>conn.close(),300);return;}
          const bot=this.players.find(p=>p.bot);assigned=bot?.id??uid();const index=bot?this.players.indexOf(bot):this.players.length;
          const player=this.makePlayer(assigned,msg.name,false,index);if(bot)this.players[index]=player;else this.players.push(player);this.tokens.set(msg.token,assigned);
        }
        this.connections.set(assigned,conn);const p=this.players.find(p=>p.id===assigned);if(p)p.online=true;
        this.disconnectedAt.delete(assigned);this.lastSeen.set(assigned,Date.now());replaced?.close();this.emit(true);return;
      }
      if(!assigned||this.connections.get(assigned)!==conn)return;
      this.lastSeen.set(assigned,Date.now());
      if(msg.type==='ping'){if(conn.open)conn.send({type:'pong'});return;}
      if(msg.type==='command'&&this.game) {
        if(!this.consumeBudget(this.commandBudgets,assigned,12,6))return;
        const c=readCommand(msg.command);if(c&&apply(this.game,assigned,c))this.emit(true);
      }
      if(msg.type==='chat'&&typeof msg.text==='string'&&this.consumeBudget(this.chatBudgets,assigned,2,2))this.addChat(assigned,msg.text);
    });
    conn.on('close',()=>{clearTimeout(expiry);if(assigned&&this.connections.get(assigned)===conn){this.connections.delete(assigned);this.lastSeen.delete(assigned);this.markOffline(assigned);this.emit();}});
    conn.on('error',()=>conn.close());
  }
  join(room:string) {
    this.host=false;this.room=room;this.status='connecting';this.error='';this.game=null;this.players=[];this.emit();
    this.peer=new Peer();this.peer.on('open',()=>this.connect());this.peer.on('disconnected',()=>{if(this.peer&&!this.peer.destroyed)this.peer.reconnect();});
    this.peer.on('error',err=>{this.status='error';this.error=err.type==='peer-unavailable'?'Le salon est introuvable. L’hôte doit garder sa page ouverte.':`Connexion interrompue (${err.type}). Tu peux réessayer.`;this.emit();});
  }
  queueReconnect(conn:DataConnection) {
    if(this.connection!==conn||this.status==='rejected'||this.destroyed)return;
    if(this.reconnectTimer)return;this.status='reconnecting';
    this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null;this.connect();},3000);this.emit();
  }
  connect() {
    if(!this.peer||this.peer.destroyed||this.destroyed)return;
    if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    const previous=this.connection;this.connection=null;previous?.close();
    const conn=this.peer.connect(this.room,{reliable:true});this.connection=conn;this.lastHostSeen=Date.now();this.lastPingAt=0;
    conn.on('open',()=>{if(this.connection!==conn)return;this.status='connecting';this.error='';this.lastHostSeen=Date.now();conn.send({type:'hello',token:this.token,name:this.name});this.emit();});
    conn.on('data',(raw:unknown)=>{
      if(this.connection!==conn||!raw||typeof raw!=='object'||Array.isArray(raw))return;const msg=raw as Record<string,unknown>;
      if(msg.type==='pong'){this.lastHostSeen=Date.now();return;}
      if(msg.type==='snapshot'&&msg.data&&typeof msg.data==='object'){const s=msg.data as Snapshot;this.lastHostSeen=Date.now();this.players=s.players;this.view=s.view;this.myId=s.myId;this.chat=s.chat;this.status='online';this.error='';this.emit();}
      if(msg.type==='rejected'){this.lastHostSeen=Date.now();this.error=String(msg.text);this.status='rejected';this.emit();}
    });
    conn.on('close',()=>this.queueReconnect(conn));
    conn.on('error',()=>{if(this.connection!==conn)return;this.error='La connexion directe n’a pas abouti. Certains réseaux bloquent WebRTC. Réessaie sur un autre réseau.';conn.close();this.queueReconnect(conn);});
  }
  start() {
    if(!this.host)return;const seed=crypto.getRandomValues(new Uint32Array(1))[0];this.game=createGame(this.players,seed);this.players=this.game.players;this.lastTurn=0;this.emit();
  }
  backToLobby() {if(!this.host)return;this.game=null;this.view=null;this.players.forEach(p=>{p.active=true;p.exposed=null;p.money=0;p.promise=null;p.ready=false;});this.emit();}
  rename(name:string) {this.name=name.trim().slice(0,18)||'Julien';if(this.host&&!this.game){this.players[0].name=this.name;this.emit();}}
  addBot(){if(this.host&&!this.game&&this.players.length<6){const i=this.players.length;this.players.push(this.makePlayer(uid(),['Nico','Zoé'][i-4]??'Alex',true,i));this.emit();}}
  removeBot(id:string){if(this.host&&!this.game&&this.players.length>4){this.players=this.players.filter(p=>p.id!==id||!p.bot);this.emit();}}
  command(command:Command){const c=readCommand(command);if(!c)return;if(this.host&&this.game){if(apply(this.game,this.myId,c))this.emit(true);}else if(this.connection?.open)this.connection.send({type:'command',command:c});}
  sendChat(text:string){if(this.host)this.addChat(this.myId,text);else if(this.connection?.open)this.connection.send({type:'chat',text});}
  addChat(id:string,text:string){const p=this.players.find(p=>p.id===id);if(!p||!text.trim())return;this.chat.push({id:uid(),name:p.name,text:text.trim().slice(0,160)});this.chat=this.chat.slice(-30);this.emit();}
  tick() {
    const now=Date.now();
    if(!this.host){
      const conn=this.connection;if(!conn||this.status==='rejected'||this.destroyed)return;
      if(now-this.lastHostSeen>HEARTBEAT_TIMEOUT){conn.close();this.queueReconnect(conn);return;}
      if(conn.open&&now-this.lastPingAt>=PING_INTERVAL){this.lastPingAt=now;try{conn.send({type:'ping'});}catch{conn.close();this.queueReconnect(conn);}}
      return;
    }
    let networkChanged=false;
    for(const [id,conn]of this.connections)if(now-(this.lastSeen.get(id)??now)>HEARTBEAT_TIMEOUT){this.connections.delete(id);this.lastSeen.delete(id);this.markOffline(id,now);conn.close();networkChanged=true;}
    if(!this.game){if(networkChanged)this.emit();return;}const g=this.game;
    if(g.turn!==this.lastTurn){this.lastTurn=g.turn;this.phaseStart=now;}
    const elapsed=now-this.phaseStart,humanReady=this.players.filter(h=>!h.bot&&h.online&&h.active).every(h=>h.ready);
    let privateChanged=false;
    for(const p of this.players) {
      if(!p.active||(!p.bot&&p.online))continue;
      if(!p.bot){if(!this.disconnectedAt.has(p.id))this.disconnectedAt.set(p.id,now);if(now-this.disconnectedAt.get(p.id)!<DISCONNECT_GRACE)continue;}
      const delay=(g.phase==='reveal'?REVEAL_MIN:humanReady?1300:6500)+this.players.indexOf(p)*350;
      if(elapsed>=delay){const cmd=botCommand(g,p);if(cmd&&apply(g,p.id,cmd,now))privateChanged=true;}
    }
    if(g.phase!=='reveal'||elapsed>=REVEAL_MIN)advance(g,now);this.emit(privateChanged);
  }
}
