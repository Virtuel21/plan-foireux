// Executes the actual Museum component and exported skeletal GLBs, without game timers.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PF_TEST_URL||'http://127.0.0.1:5187';
const out=process.env.PF_QA_DIR||'test-results/meshy';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/src/main.ts',route=>route.fulfill({contentType:'application/javascript',body:'import "/src/style.css";'}));
 await page.goto(base);
 await page.evaluate(async()=>{
  document.body.innerHTML='<div id="scene" style="position:fixed;inset:0;width:100vw;height:100vh"></div>';
  const {Museum}=await import('/src/scene.ts');const engine=await import('/src/engine.ts');
  const players=['Julien','Léa','Max','Sarah'].map((n,i)=>engine.player('p'+i,n,i));const game=engine.createGame(players,12,Date.now(),()=>.99);game.layout=0;game.phase='promise';
  window.qa={engine,game,museum:new Museum(document.querySelector('#scene'),id=>window.lastChoice=id)};qa.museum.update(engine.publicView(game,'p0'),game.players,null);
 });
 await page.waitForFunction(()=>qa.museum.actors.length===4&&qa.museum.ready&&qa.museum.drill&&qa.museum.wealth,{timeout:30000});
 await page.waitForTimeout(800);
 const initial=await page.evaluate(()=>{
  const m=qa.museum;return{clips:m.templates.map(t=>t.animations.map(a=>({name:a.name,duration:a.duration}))),independent:m.actors[0].parts.Head!==m.actors[2].parts.Head,bones:m.actors.map(a=>{let result=0;a.root.traverse(o=>{if(o.isSkinnedMesh)result=o.skeleton.bones.length;});return result;}),triangles:m.renderer.info.render.triangles,calls:m.renderer.info.render.calls};
 });
 assert(initial.independent);assert(initial.bones.every(n=>n===24));for(const clips of initial.clips){assert.deepEqual(clips.map(c=>c.name).sort(),['drill','idle','walk']);assert(clips.every(c=>c.duration>0));}
 const security=await page.evaluate(()=>{
  const m=qa.museum;
  const post=m.objects.POST_Security;
  const positions=[];
  for(const layout of [0,1,2]){qa.game.layout=layout;m.update(qa.engine.publicView(qa.game,'p0'),qa.game.players,null);positions.push(post.position.toArray());}
  qa.game.layout=0;m.update(qa.engine.publicView(qa.game,'p0'),qa.game.players,null);
  return {positions,closedBox:!!post.getObjectByName('CameraJunctionBox'),label:m.markers.get('secure').button.textContent};
 });
 assert(security.closedBox);assert(security.positions.every(p=>p.every((v,i)=>v===security.positions[0][i])));assert(security.label.includes('Désactiver les caméras'));
 for(const name of ['SecurityCameraPick','SecurityBoxPick']){
  const point=await page.evaluate(name=>{const m=qa.museum;const object=m.room.getObjectByName(name);const point=object.position.clone();object.getWorldPosition(point);point.project(m.camera);m.labels.style.display='none';return{x:(point.x*.5+.5)*innerWidth,y:(.5-point.y*.5)*innerHeight};},name);
  await page.mouse.click(point.x,point.y);assert.equal(await page.evaluate(()=>window.lastChoice),'secure',name+' must select the camera challenge');await page.evaluate(()=>{window.lastChoice=null;});
 }
 await page.evaluate(()=>{qa.museum.labels.style.display='';});
 await page.screenshot({path:out+'/idle-desktop.png'});
 const before=await page.evaluate(()=>qa.museum.actors[0].parts.Head.matrixWorld.toArray());await page.waitForTimeout(400);const after=await page.evaluate(()=>qa.museum.actors[0].parts.Head.matrixWorld.toArray());assert(before.some((v,i)=>Math.abs(v-after[i])>1e-6),'Idle skeleton must actually move');
 await page.evaluate(()=>{
  const {game:g,engine:e,museum:m}=qa;const actions=['drill','secure','loot','painting'];g.players.forEach((p,i)=>{g.choices[p.id]={action:actions[i]};g.successes[p.id]=true;g.wallets[p.id]=0;});g.report=e.resolve(g);g.phase='reveal';m.update(e.publicView(g,'p0'),g.players,null);
 });
 await page.waitForTimeout(180);const walking=await page.evaluate(()=>qa.museum.actors.map(a=>a.animation.current));assert(walking.includes('walk'));await page.screenshot({path:out+'/walking-desktop.png'});
 await page.waitForTimeout(2600);const drilling=await page.evaluate(()=>({clips:qa.museum.actors.map(a=>a.animation.current),tool:qa.museum.actors[0].root.getObjectByName('Held_Drill').visible}));assert.equal(drilling.clips[0],'drill');assert(drilling.tool);assert(drilling.clips.slice(1).every(c=>c==='idle'));await page.screenshot({path:out+'/drill-desktop.png'});
 const handBefore=await page.evaluate(()=>qa.museum.actors[0].parts.RightHand.matrixWorld.toArray());await page.waitForTimeout(350);const handAfter=await page.evaluate(()=>qa.museum.actors[0].parts.RightHand.matrixWorld.toArray());assert(handBefore.some((v,i)=>Math.abs(v-handAfter[i])>1e-6),'Drill clip must actually move');
 const nativeSafe=await page.evaluate(()=>{const m=qa.museum;const body=m.room.getObjectByName('SafeNativeBody');const leaf=m.room.getObjectByName('SafeNativeDoor');return{sharedPositions:body.geometry.attributes.position===leaf.geometry.attributes.position,sharedNormals:body.geometry.attributes.normal===leaf.geometry.attributes.normal,sharedUV:body.geometry.attributes.uv===leaf.geometry.attributes.uv,triangles:(body.geometry.index.count+leaf.geometry.index.count)/3,bodyMatrix:body.matrixWorld.toArray()};});
 assert(nativeSafe.sharedPositions&&nativeSafe.sharedNormals&&nativeSafe.sharedUV);assert.equal(nativeSafe.triangles,3026);
 await page.evaluate(()=>{qa.game.vault=8;qa.museum.update(qa.engine.publicView(qa.game,'p0'),qa.game.players,null);});await page.waitForTimeout(1200);const door=await page.evaluate(()=>({angle:qa.museum.objects.VaultDoorPivot.rotation.y,target:qa.museum.objects.VaultDoorPivot.userData.openAngle,bodyMatrix:qa.museum.room.getObjectByName('SafeNativeBody').matrixWorld.toArray()}));assert(Math.abs(door.angle-door.target)<.06);assert.deepEqual(door.bodyMatrix,nativeSafe.bodyMatrix);await page.screenshot({path:out+'/vault-open-desktop.png'});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(350);await page.screenshot({path:out+'/drill-landscape.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const reduced=await page.evaluate(()=>qa.museum.actors.map(a=>a.animation.current));assert(reduced.every(c=>c==='idle'));const still1=await page.evaluate(()=>qa.museum.actors[0].parts.Head.matrixWorld.toArray());await page.waitForTimeout(300);const still2=await page.evaluate(()=>qa.museum.actors[0].parts.Head.matrixWorld.toArray());assert(still1.every((v,i)=>Math.abs(v-still2[i])<1e-7));
 assert.deepEqual(errors,[]);const report={initial,security,nativeSafe,walking,drilling,door,reduced,errors,checks:['four independent 24-joint skeletons','exactly idle/walk/drill clips','idle and drill skeletons actually change','walk while moving','idle for other stations','held drill visible','native safe door opens while housing stays fixed','native safe positions normals UV shared without edits','camera challenge fixed in all three layouts','camera and closed box clickable in 3D','mobile landscape render','reduced-motion stable pose']};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
