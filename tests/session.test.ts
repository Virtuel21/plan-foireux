import {after, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type Peer from 'peerjs';
import type {DataConnection} from 'peerjs';
import {Session, type Snapshot} from '../src/session';
import {createGame, publicView, resolveRoom} from '../src/engine';

// These are transport integration tests, not a real WebRTC/network test.
const realNow=Date.now,realTimeout=setTimeout,realClearTimeout=clearTimeout,realInterval=setInterval;
const storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
let now=1_000_000,nextTimer=1;
const timers=new Map<number,{callback:()=>void;delay:number}>();
beforeEach(()=>{
  now=1_000_000;nextTimer=1;timers.clear();Date.now=()=>now;
  globalThis.setTimeout=((callback:()=>void,delay:number)=>{const id=nextTimer++;timers.set(id,{callback,delay});return id;}) as unknown as typeof setTimeout;
  globalThis.clearTimeout=((id:unknown)=>{timers.delete(Number(id));}) as typeof clearTimeout;
  globalThis.setInterval=(()=>0) as unknown as typeof setInterval;
  const storage=new Map<string,string>();
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
});
after(()=>{
  Date.now=realNow;globalThis.setTimeout=realTimeout;globalThis.clearTimeout=realClearTimeout;globalThis.setInterval=realInterval;
  if(storageDescriptor)Object.defineProperty(globalThis,'sessionStorage',storageDescriptor);else Reflect.deleteProperty(globalThis,'sessionStorage');
});
class Connection extends EventEmitter {
  open=true;sent:{type:string;data?:Snapshot}[]=[];
  send(message:unknown){assert.ok(this.open,'sending on a closed transport');this.sent.push(structuredClone(message) as {type:string;data?:Snapshot});}
  close(){if(!this.open)return;this.open=false;this.emit('close');}
  snapshot(){const result=this.sent.filter(message=>message.type==='snapshot').at(-1)?.data;assert.ok(result);return result;}
  transport(){return this as unknown as DataConnection;}
}
function setupGuest(){
  const host=new Session('Host',()=>{}),connection=new Connection();
  host.accept(connection.transport());connection.emit('data',{type:'hello',token:'seat-token',name:'Guest'});
  const id=host.tokens.get('seat-token')!;host.start();assert.ok(host.game);
  host.game.phase='secret';host.game.turn++;host.game.deadline=now+40_000;host.emit();
  return {host,connection,id,game:host.game};
}

test('accepted private searches reach their guest without exposing them to the host view',()=>{
  const {host,connection,game}=setupGuest(),before=JSON.stringify(publicView(game,'you')),count=connection.sent.length;
  connection.emit('data',{type:'command',command:{type:'inspect',target:'frame',step:0,turn:game.turn}});
  assert.equal(connection.sent.length,count+1);
  assert.equal(JSON.stringify(publicView(game,'you')),before);
  assert.deepEqual(connection.snapshot().view?.mySearch?.opened,[0]);
  const afterCount=connection.sent.length;
  const invalid=[
    {type:'inspect',target:'frame',step:'1',turn:game.turn},
    {type:'inspect',target:'frame',step:3,turn:game.turn},
    {type:'choose',action:'bad',turn:game.turn},
    {type:'clue',turn:game.turn},
    {type:'choose',action:'loot',code:'123456',turn:game.turn},
    {type:'inspect',target:'frame',step:1,turn:NaN},
    {type:'inspect',target:'frame',step:1,extra:true,turn:game.turn},
    {type:'inspect',target:'frame',step:1,turn:game.turn-1},
  ];
  for(const command of invalid){now+=101;connection.emit('data',{type:'command',command});}
  assert.equal(connection.sent.length,afterCount,'rejected commands must not force emission');
  assert.equal(host.game,game);
});

test('command burst accepts fast inspections and claims, independently of chat and pings',()=>{
  const {host,connection,id,game}=setupGuest();
  for(const step of [0,1,2])connection.emit('data',{type:'command',command:{type:'inspect',target:'frame',step,turn:game.turn}});
  assert.deepEqual(connection.snapshot().view?.mySearch?.opened,[0,1,2]);
  game.privateClues[id]=[{spotId:'frame',index:0,value:'4'}];
  for(const code of ['4','5','6'])connection.emit('data',{type:'command',command:{type:'claim',target:'0',code,turn:game.turn}});
  assert.equal(game.claims.find(claim=>claim.id===id)?.value,'6','six rapid commands fit in the burst');
  connection.emit('data',{type:'command',command:{type:'claim',target:'0',code:'7',turn:game.turn}});
  assert.equal(game.claims.find(claim=>claim.id===id)?.value,'6','seventh instantaneous command is rate limited');
  for(const text of ['one','two','three'])connection.emit('data',{type:'chat',text});
  assert.deepEqual(host.chat.map(message=>message.text),['one','two']);
  const pongs=connection.sent.filter(message=>message.type==='pong').length;
  for(let i=0;i<8;i++)connection.emit('data',{type:'ping'});
  assert.equal(connection.sent.filter(message=>message.type==='pong').length,pongs+8);
  now+=84;connection.emit('data',{type:'command',command:{type:'claim',target:'0',code:'7',turn:game.turn}});
  assert.equal(game.claims.find(claim=>claim.id===id)?.value,'7','12 tokens per second refill a command after 84ms');
  connection.emit('data',{type:'chat',text:'still limited'});assert.equal(host.chat.length,2);
  now+=416;connection.emit('data',{type:'chat',text:'refilled'});assert.equal(host.chat.length,3);
});

test('reconnection retains seat and private progress while ignoring replaced channels',()=>{
  const {host,connection,id,game}=setupGuest();
  connection.emit('data',{type:'command',command:{type:'inspect',target:'frame',step:0,turn:game.turn}});
  const replacement=new Connection();host.accept(replacement.transport());replacement.emit('data',{type:'hello',token:'seat-token',name:'Guest again'});
  assert.equal(connection.open,false);assert.equal(host.connections.get(id),replacement);
  assert.equal(replacement.snapshot().myId,id);assert.deepEqual(replacement.snapshot().view?.mySearch?.opened,[0]);
  const player=game.players.find(p=>p.id===id)!;assert.ok(player.online);assert.equal(host.disconnectedAt.has(id),false);
  game.phase='promise';game.turn++;game.players.forEach(p=>{p.ready=false;p.promise=null;});
  connection.emit('data',{type:'command',command:{type:'promise',action:'a',turn:game.turn}});assert.equal(player.promise,null);
  replacement.emit('data',{type:'command',command:{type:'promise',action:'cover',turn:game.turn}});assert.equal(player.promise,'cover');
  host.game=null;now+=18_001;host.tick();
  assert.equal(replacement.open,false);assert.equal(player.online,false);assert.equal(host.disconnectedAt.get(id),now);
});

test('offline takeover waits twenty seconds from disconnection rather than phase start',()=>{
  const session=new Session('Host',()=>{});session.players.forEach(p=>{p.bot=false;p.online=true;});
  session.game=createGame(session.players,42,now);session.players=session.game.players;
  const player=session.players[1];session.game.deadline=now+999_999;session.lastTurn=session.game.turn;session.phaseStart=now-30_000;session.markOffline(player.id,now);
  session.tick();assert.equal(player.promise,null);
  now+=19_999;session.tick();assert.equal(player.promise,null);
  session.game.turn++;session.lastTurn=session.game.turn;session.phaseStart=now-10_000;now+=2;session.tick();
  assert.notEqual(player.promise,null,'a turn change must not reset an elapsed disconnection grace');
});

test('the room reveal remains visible for eight seconds despite unanimous continue',()=>{
  const session=new Session('Host',()=>{});session.game=createGame(session.players,123,now);session.players=session.game.players;
  for(const p of session.players){p.bot=false;session.game.choices[p.id]={action:'cover'};}resolveRoom(session.game,now);
  session.players.forEach(p=>p.ready=true);session.lastTurn=session.game.turn;session.phaseStart=now;
  now+=7999;session.tick();assert.equal(session.game.phase,'reveal');
  now++;session.tick();assert.notEqual(session.game.phase,'reveal');
});

test('guest heartbeat reconnects once and ignores snapshots from the former connection',()=>{
  const guest=new Session('Guest',()=>{});guest.host=false;guest.room='pf-room';let active=new Connection();
  guest.peer={destroyed:false,connect:()=>active=new Connection()} as unknown as Peer;
  guest.connect();const previous=active;previous.emit('open');
  const snapshot={...guest.snapshot(),players:[],view:null,myId:'guest-seat',host:false};
  previous.emit('data',{type:'snapshot',data:snapshot});assert.equal(guest.status,'online');assert.equal(guest.myId,'guest-seat');
  now+=10_000;previous.emit('data',{type:'pong'});guest.tick();assert.equal(previous.open,true);
  now+=18_001;guest.tick();const retry=guest.reconnectTimer;
  assert.equal(previous.open,false);assert.equal(guest.status,'reconnecting');assert.notEqual(retry,null);
  now+=1000;guest.tick();assert.equal(guest.reconnectTimer,retry,'timer must not be postponed every tick');
  guest.connect();assert.equal(timers.has(Number(retry)),false);
  previous.emit('data',{type:'snapshot',data:{...snapshot,myId:'stale'}});assert.equal(guest.myId,'guest-seat');
});
