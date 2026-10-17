import Peer, { type DataConnection } from 'peerjs';
import { createGame, publicView, apply, advance, botCommand, COLORS, type Player, type Game, type View } from './engine';
export type Chat={id:string;name:string;text:string};
export type Snapshot={players:Player[];view:View|null;myId:string;host:boolean;room:string;status:string;chat:Chat[];error:string};
const uid=()=>crypto.randomUUID();
export class Session {
  players:Player[]=[];game:Game|null=null;view:View|null=null;myId='you';host=true;room='';status='local';error='';chat:Chat[]=[];
  peer:Peer|null=null;connection:DataConnection|null=null;connections=new Map<string,DataConnection>();tokens=new Map<string,string>();
  token=sessionStorage.getItem('pf-token')??uid();lastTurn=0;phaseStart=Date.now();lastSnapshot='';reconnectTimer:ReturnType<typeof setTimeout>|null=null;
  lastSeen=new Map<string,number>();lastMessage=new Map<string,number>();destroyed=false;
  constructor(public name:string,public changed:(s:Snapshot)=>void) {sessionStorage.setItem('pf-token',this.token);this.resetPlayers();setInterval(()=>this.tick(),250);}
  resetPlayers() {this.myId='you';this.players=[this.makePlayer(this.myId,this.name,false,0),...['Léa','Max','Sarah'].map((n,i)=>this.makePlayer(`bot-${i}`,n,true,i+1))];}
  makePlayer(id:string,name:string,bot:boolean,index:number):Player{return {id,name:name.trim().slice(0,18)||'Braqueur',bot,online:true,color:COLORS[index%6],active:true,money:0,promise:null,ready:false,exposed:null};}
  snapshot():Snapshot{return {players:this.players,view:this.host&&this.game?publicView(this.game,this.myId):this.view,myId:this.myId,host:this.host,room:this.room,status:this.status,chat:this.chat,error:this.error};}
  emit(force=false) {
    const s=this.snapshot(),key=JSON.stringify(s);if(!force&&key===this.lastSnapshot)return;this.lastSnapshot=key;this.changed(s);
    if(this.host)for(const [id,conn]of this.connections)if(conn.open)conn.send({type:'snapshot',data:{...s,view:this.game?publicView(this.game,id):null,myId:id,host:false}});
  }
  async createRoom() {
    if(this.room)return;this.error='';this.status='connecting';this.emit();
    this.peer=new Peer(`pf-${uid().slice(0,12)}`);
    this.peer.on('open',id=>{this.room=id;this.status='online';this.host=true;this.peer!.on('connection',c=>this.accept(c));history.replaceState(null,'',`${location.pathname}#room=${encodeURIComponent(id)}`);this.emit();});
    this.peer.on('disconnected',()=>{if(this.peer&&!this.peer.destroyed){this.status='reconnecting';this.emit();this.peer.reconnect();}});
    this.peer.on('error',err=>{this.error=`Le salon ne peut pas se connecter (${err.type}). Le mode solo reste disponible.`;this.status='error';this.emit();});
  }
  accept(conn:DataConnection) {
    let assigned:string|null=null;let introduced=false;
    const expiry=setTimeout(()=>{if(!introduced)conn.close();},12000);
    conn.on('data',(raw:unknown)=>{
      if(!raw||typeof raw!=='object')return;const msg=raw as Record<string,unknown>;
      if(msg.type==='hello'&&!introduced) {
        introduced=true;clearTimeout(expiry);if(typeof msg.token!=='string'||msg.token.length>80||typeof msg.name!=='string'){conn.close();return;}
        const existing=this.tokens.get(msg.token);
        if(existing){assigned=existing;this.connections.get(existing)?.close();}
        else {
          if(this.game){conn.send({type:'rejected',text:'La partie a déjà commencé. Rejoins le prochain casse.'});setTimeout(()=>conn.close(),300);return;}
          const humans=this.players.filter(p=>!p.bot);if(humans.length>=6){conn.send({type:'rejected',text:'Le salon est complet (6 joueurs).'});setTimeout(()=>conn.close(),300);return;}
          const bot=this.players.find(p=>p.bot);assigned=bot?.id??uid();const index=bot?this.players.indexOf(bot):this.players.length;
          const player=this.makePlayer(assigned,msg.name,false,index);if(bot)this.players[index]=player;else this.players.push(player);this.tokens.set(msg.token,assigned);
        }
        this.connections.set(assigned,conn);const p=this.players.find(p=>p.id===assigned);if(p)p.online=true;this.lastSeen.set(assigned,Date.now());this.emit(true);return;
      }
      if(!assigned)return;
      if(msg.type==='ping'){this.lastSeen.set(assigned,Date.now());conn.send({type:'pong'});return;}
      if(Date.now()-(this.lastMessage.get(assigned)??0)<100)return;this.lastMessage.set(assigned,Date.now());
      if(msg.type==='command'&&this.game&&msg.command&&typeof msg.command==='object') {
        const c=msg.command as Record<string,unknown>;
        if(typeof c.type!=='string'||!['promise','choose','vote','clue'].includes(c.type)||typeof c.turn!=='number'||(c.action!==undefined&&!['a','b','loot'].includes(String(c.action)))||(c.target!==undefined&&typeof c.target!=='string')||(c.code!==undefined&&typeof c.code!=='string'))return;
        apply(this.game,assigned,c as Parameters<typeof apply>[2]);this.emit();
      }
      if(msg.type==='chat'&&typeof msg.text==='string')this.addChat(assigned,msg.text);
    });
    conn.on('close',()=>{clearTimeout(expiry);if(assigned&&this.connections.get(assigned)===conn){this.connections.delete(assigned);const p=this.players.find(p=>p.id===assigned);if(p)p.online=false;this.emit();}});
    conn.on('error',()=>conn.close());
  }
  join(room:string) {
    this.host=false;this.room=room;this.status='connecting';this.error='';this.game=null;this.players=[];this.emit();
    this.peer=new Peer();this.peer.on('open',()=>this.connect());this.peer.on('disconnected',()=>{if(this.peer&&!this.peer.destroyed)this.peer.reconnect();});
    this.peer.on('error',err=>{this.status='error';this.error=err.type==='peer-unavailable'?'Le salon est introuvable. L’hôte doit garder sa page ouverte.':`Connexion interrompue (${err.type}). Tu peux réessayer.`;this.emit();});
  }
  connect() {
    if(!this.peer||this.peer.destroyed)return;this.connection?.close();const conn=this.peer.connect(this.room,{reliable:true});this.connection=conn;
    conn.on('open',()=>{this.status='online';this.error='';conn.send({type:'hello',token:this.token,name:this.name});this.emit();});
    conn.on('data',(raw:unknown)=>{if(!raw||typeof raw!=='object')return;const msg=raw as Record<string,unknown>;
      if(msg.type==='snapshot'&&msg.data&&typeof msg.data==='object'){const s=msg.data as Snapshot;this.players=s.players;this.view=s.view;this.myId=s.myId;this.chat=s.chat;this.status='online';this.error='';this.emit();}
      if(msg.type==='rejected'){this.error=String(msg.text);this.status='rejected';this.emit();}
    });
    conn.on('close',()=>{if(this.connection!==conn||this.status==='rejected'||this.destroyed)return;this.status='reconnecting';this.emit();if(this.reconnectTimer)clearTimeout(this.reconnectTimer);this.reconnectTimer=setTimeout(()=>this.connect(),3000);});
    conn.on('error',()=>{this.status='error';this.error='La connexion directe n’a pas abouti. Certains réseaux bloquent WebRTC. Réessaie sur un autre réseau.';this.emit();});
  }
  start() {
    if(!this.host)return;const seed=crypto.getRandomValues(new Uint32Array(1))[0];this.game=createGame(this.players,seed);this.players=this.game.players;this.lastTurn=0;this.emit();
  }
  backToLobby() {if(!this.host)return;this.game=null;this.view=null;this.players.forEach(p=>{p.active=true;p.exposed=null;p.money=0;p.promise=null;p.ready=false;});this.emit();}
  rename(name:string) {this.name=name.trim().slice(0,18)||'Julien';if(this.host&&!this.game){this.players[0].name=this.name;this.emit();}}
  addBot(){if(this.host&&!this.game&&this.players.length<6){const i=this.players.length;this.players.push(this.makePlayer(uid(),['Nico','Zoé'][i-4]??'Alex',true,i));this.emit();}}
  removeBot(id:string){if(this.host&&!this.game&&this.players.length>4){this.players=this.players.filter(p=>p.id!==id||!p.bot);this.emit();}}
  command(command:Parameters<typeof apply>[2]){if(this.host&&this.game){apply(this.game,this.myId,command);this.emit();}else if(this.connection?.open)this.connection.send({type:'command',command});}
  sendChat(text:string){if(this.host)this.addChat(this.myId,text);else this.connection?.send({type:'chat',text});}
  addChat(id:string,text:string){const p=this.players.find(p=>p.id===id);if(!p||!text.trim())return;this.chat.push({id:uid(),name:p.name,text:text.trim().slice(0,160)});this.chat=this.chat.slice(-30);this.emit();}
  tick() {
    if(!this.host){if(this.connection?.open&&Date.now()%5000<300)this.connection.send({type:'ping'});return;}
    if(!this.game)return;const g=this.game;
    if(g.turn!==this.lastTurn){this.lastTurn=g.turn;this.phaseStart=Date.now();}
    const elapsed=Date.now()-this.phaseStart;
    for(const p of this.players) {
      if(!p.bot&&!p.online&&elapsed<20000)continue;
      if(!(p.bot||!p.online))continue;
      const humanReady=this.players.filter(h=>!h.bot&&h.online&&h.active).every(h=>h.ready);
      if(elapsed>(humanReady?1300:6500)+this.players.indexOf(p)*350) {
        if(g.roomIndex<3&&g.phase==='promise')apply(g,p.id,{type:'clue',turn:g.turn});
        const cmd=botCommand(g,p);if(cmd)apply(g,p.id,cmd);
      }
    }
    advance(g);this.emit();
  }
}
