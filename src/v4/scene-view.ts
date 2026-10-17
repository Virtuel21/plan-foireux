import { makeRooms, type View as SceneView, type Player as ScenePlayer } from '../engine';
import type { View, Player } from './engine';

// The museum is a renderer. No old gameplay rules enter the v4 authority.
export const scenePlayers=(ps:Player[]):ScenePlayer[]=>ps.map(p=>({...p,promise:p.promise?'a':null}));
export function sceneView(v:View):SceneView {
  const roomIndex=Math.min(4,Math.floor(v.round/2)),rooms=makeRooms(104,v.players.length);
  return {players:scenePlayers(v.players),phase:v.phase,roomIndex,rooms,alarm:v.alarm,pool:0,
    objective:v.round>=7&&(v.phase==='reveal'||v.phase==='ended'),
    report:v.report?{findings:v.report.findings.map(f=>({id:f.id,action:f.action==='work'?'a':'loot',promise:null,gain:f.gain,betrayed:false,detail:f.scheme??'Braquer',...(f.target?{target:f.target}:{})})),incidents:v.report.opened?[]:[`${rooms[roomIndex].a.short} : forcé`],alarmAdded:v.report.alarmAfter-v.report.alarmBefore,text:v.report.text,alarmBefore:v.report.alarmBefore,alarmAfter:v.report.alarmAfter,poolBefore:0,poolAfter:0}:null,
    log:[],deadline:v.deadline,turn:v.turn,result:v.result?{kind:v.result.kind==='fbi'?'fbi':'escape',winners:v.result.winners,text:v.result.text}:null,agentExposed:v.checks.some(c=>c.role==='agent'),myRole:v.myRole,
    // Disable legacy world commands; v4's two cards and portrait targets own input.
    myChoice:'a',myVote:v.myVote,voteCount:v.voteCount,myId:v.myId,spots:[],discoveries:[],claims:[],myClues:[],mySearch:null,myTarget:null,myCode:'',vaultRetries:0};
}
