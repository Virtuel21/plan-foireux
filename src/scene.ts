import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { View, Player } from './engine';
import { COLORS } from './engine';

const mat=(color:T.ColorRepresentation,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,roughness,metalness});
type Actor = {id:string;root:T.Object3D;parts:Record<string,T.Object3D>;pose:Record<string,T.Euler>;target:T.Vector3;label:HTMLDivElement;status:HTMLSpanElement;reward:HTMLDivElement;link:HTMLDivElement;labelPosition:{x:number;y:number}|null;index:number;action:string|null;searchSpot:string|null};
type Interaction = {target:string;object:T.Object3D;anchor:T.Vector3;button:HTMLButtonElement;line:HTMLDivElement;available:boolean};
type CaperFinding={id:string;action:string;scheme:string|null;target:string|null;blocked:boolean;stole:number;lost:number;gain:number};
type CaperSignal={id:string;kind:string;target?:string;at:number};
export class Museum {
  scene=new T.Scene(); camera:T.OrthographicCamera; renderer:T.WebGLRenderer; world=new T.Group(); props=new T.Group(); crew=new T.Group();
  actors:Actor[]=[];
  base:T.Group|null=null; view:View|null=null; clock=new T.Clock(); lastLayout=''; labels:HTMLDivElement; zoom=1;
  interactionLayer:HTMLDivElement;interactions=new Map<string,Interaction>();objects:Record<string,T.Object3D>={};
  raycaster=new T.Raycaster();pointer=new T.Vector2();pointerStart:{x:number;y:number}|null=null;
  focusedId:string|null=null;focusHalo:T.Mesh;focusLight:T.PointLight;cameraAim=new T.Vector3(0,1.15,0);
  nextBadgeLayout=0;actorLayoutKey='';
  caperFindings:CaperFinding[]=[];caperSignals:CaperSignal[]=[];caperKey='';flyingCoins:{mesh:T.Mesh;from:string;to:string;offset:number}[]=[];
  roster:Player[]=this.previewPlayers();guard:T.Group|null=null;
  reduced=matchMedia('(prefers-reduced-motion: reduce)').matches; ready=false;
  gold=mat('#d8a345',.65,.32); stone=mat('#ba9c7a'); iron=mat('#34434a',.6,.48); red=mat('#743b40'); black=mat('#202c36');
  constructor(public container:HTMLElement,public onInteract?:(target:string)=>void) {
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
    this.renderer.setClearColor('#102737');container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','Musée 3D : choisissez les objets avec les boutons ancrés dans le décor.');this.renderer.domElement.setAttribute('role','img');
    this.camera=new T.OrthographicCamera(-8,8,5,-5,.1,80);this.camera.position.set(10,10,16);this.camera.lookAt(0,1.15,0);
    this.labels=document.createElement('div');this.labels.className='world-labels';container.append(this.labels);
    this.interactionLayer=document.createElement('div');this.interactionLayer.className='museum-interactions';
    Object.assign(this.interactionLayer.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden',zIndex:'2'});
    this.interactionLayer.setAttribute('role','group');this.interactionLayer.setAttribute('aria-label','Objets du musée');container.append(this.interactionLayer);
    this.scene.add(this.world);this.world.add(this.props,this.crew);
    this.focusHalo=new T.Mesh(new T.RingGeometry(.62,.73,48),new T.MeshBasicMaterial({color:'#ffe5a0',transparent:true,opacity:.95,side:T.DoubleSide,depthWrite:false}));
    this.focusHalo.rotation.x=-Math.PI/2;this.focusHalo.visible=false;this.world.add(this.focusHalo);
    this.focusLight=new T.PointLight('#ffe6ac',0,5,2);this.world.add(this.focusLight);
    this.scene.add(new T.HemisphereLight('#dae9ff','#685042',2.0));
    const sun=new T.DirectionalLight('#ffe0a1',4.4);sun.position.set(-4,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:30});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;this.scene.add(sun);
    const fill=new T.DirectionalLight('#8eacdf',1.7);fill.position.set(6,5,-4);this.scene.add(fill);
    this.renderer.domElement.addEventListener('pointerdown',event=>{this.pointerStart={x:event.clientX,y:event.clientY};});
    this.renderer.domElement.addEventListener('pointerup',event=>{const start=this.pointerStart;this.pointerStart=null;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8)this.interactAt(event);});
    this.renderer.domElement.addEventListener('pointercancel',()=>{this.pointerStart=null;});
    this.renderer.domElement.addEventListener('pointermove',event=>{this.renderer.domElement.style.cursor=this.pickInteraction(event)?'pointer':'';});
    this.buildRoom();new ResizeObserver(()=>this.resize()).observe(container);this.resize();
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/burglar.glb`,g=>{this.base=g.scene;this.ready=true;this.setPlayers(this.view?.players??this.roster);this.addGuard();},undefined,()=>{container.insertAdjacentHTML('beforeend','<p class="scene-error">Le modèle n’a pas chargé. Recharge la page pour réessayer.</p>');});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.clock.getDelta();});this.animate();
  }
  previewPlayers():Player[]{return ['Julien','Léa','Max','Sarah'].map((name,i)=>({id:String(i),name,color:COLORS[i],bot:true,online:true,active:true,money:0,promise:null,ready:false,exposed:null}));}
  removeInteraction(target:string) {const entry=this.interactions.get(target);if(entry){entry.button.remove();entry.line.remove();this.interactions.delete(target);}}
  bindInteraction(target:string,object:T.Object3D,label:string,anchor=new T.Vector3(0,1.7,0)) {
    this.removeInteraction(target);const button=document.createElement('button');button.type='button';button.textContent=label;button.className='museum-object';
    button.dataset.target=target;button.setAttribute('aria-label',label);button.title=label;
    Object.assign(button.style,{position:'absolute',left:'0',top:'0',minHeight:'44px',minWidth:'44px',maxWidth:'142px',padding:'8px 10px',borderRadius:'9px',border:`2px solid ${target.startsWith('spot:')?'#ffd071':'#bfa26b'}`,background:target.startsWith('spot:')?'#fff2d4f7':'#182f3df2',color:target.startsWith('spot:')?'#332313':'#fff2d4',fontFamily:'inherit',fontSize:'12px',fontWeight:'800',lineHeight:'1.15',boxShadow:'0 3px 12px #0005',whiteSpace:'normal',pointerEvents:'auto',cursor:'pointer',display:'none',textAlign:'center',transition:'background 140ms, box-shadow 140ms'});
    button.style.zIndex='1';button.addEventListener('focus',()=>{button.style.outline='3px solid #fff';button.style.outlineOffset='3px';button.style.zIndex='3';});
    button.addEventListener('blur',()=>{button.style.outline='';button.style.outlineOffset='';button.style.zIndex='1';});
    button.addEventListener('click',event=>{event.stopPropagation();if(this.interactions.get(target)?.available)this.onInteract?.(target);});
    const line=document.createElement('div');line.className='museum-link';line.dataset.target=target;Object.assign(line.style,{position:'absolute',height:'2px',background:'#ffe6a8b0',transformOrigin:'0 50%',pointerEvents:'none',display:'none'});this.interactionLayer.append(line,button);this.interactions.set(target,{target,object,anchor,button,line,available:false});this.syncInteractions();
  }
  syncInteractions() {
    const v=this.view,me=v?.players.find(p=>p.id===v.myId),choosing=!!v&&!!me?.active&&(v.phase==='promise'||v.phase==='secret'&&v.myChoice===null);
    for(const entry of this.interactions.values()) {
      let available=choosing;
      if(entry.target.startsWith('spot:')) {const spot=v?.spots.find(s=>s.id===entry.target.slice(5));available=choosing&&v?.phase==='secret'&&!!spot&&v.roomIndex>=spot.unlockRoom&&v.roomIndex<4;}
      if(entry.target==='vault')available=choosing&&v?.roomIndex===3;
      entry.available=available;entry.button.hidden=!available;entry.button.style.display=available?'block':'none';entry.line.style.display=available?'block':'none';entry.button.disabled=!available;
    }
    this.nextBadgeLayout=0;
  }
  layoutBadges() {
    const w=this.container.clientWidth,h=this.container.clientHeight,bounds=this.container.getBoundingClientRect(),padding=9;
    type Rect={x:number;y:number;w:number;h:number};
    const taken:Rect[]=[...this.container.parentElement!.querySelectorAll<HTMLElement>('.location-tag,.scene-tools,.secret-ribbon,.objective-box,.scene-bottom-right')].map(el=>{const r=el.getBoundingClientRect();return {x:r.left-bounds.left-5,y:r.top-bounds.top-5,w:r.width+10,h:r.height+10};}).filter(r=>r.w>10&&r.h>10);
    const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.w+7&&a.x+a.w+7>b.x&&a.y<b.y+b.h+7&&a.y+a.h+7>b.y;
    for(const entry of this.interactions.values()){
      if(!entry.available)continue;const point=entry.object.localToWorld(entry.anchor.clone()).project(this.camera),sx=(point.x*.5+.5)*w,sy=(-point.y*.5+.5)*h;
      const bw=entry.button.offsetWidth,bh=entry.button.offsetHeight,home={x:T.MathUtils.clamp(sx-bw/2,padding,w-bw-padding),y:T.MathUtils.clamp(sy-bh-10,padding,h-bh-padding),w:bw,h:bh};
      let best:Rect|null=null,bestScore=Infinity;
      for(let y=padding;y<=h-bh-padding;y+=13)for(let x=padding;x<=w-bw-padding;x+=13){const rect={x,y,w:bw,h:bh};if(taken.some(obstacle=>overlaps(rect,obstacle)))continue;const score=(x-home.x)**2+(y-home.y)**2;if(score<bestScore){best=rect;bestScore=score;}}
      const rect=best??home;taken.push(rect);entry.button.style.transform=`translate(${rect.x}px,${rect.y}px)`;
      const cx=rect.x+bw/2,cy=rect.y+bh/2,dx=sx-cx,dy=sy-cy;entry.line.style.left=`${cx}px`;entry.line.style.top=`${cy}px`;entry.line.style.width=`${Math.hypot(dx,dy)}px`;entry.line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    }
  }
  layoutActorLabels() {
    const w=this.container.clientWidth,h=this.container.clientHeight,reveal=this.view?.phase==='reveal',bounds=this.container.getBoundingClientRect();
    const visible=this.actors.filter(a=>a.root.visible&&a.label.style.display!=='none');
    if(!reveal){this.actorLayoutKey='';this.labels.classList.remove('labels-tight');for(const a of this.actors){a.link.hidden=true;a.labelPosition=null;a.label.style.visibility='';}for(const a of visible){const point=a.root.position.clone().add(new T.Vector3(0,2.7,0)).project(this.camera);a.label.style.transform=`translate(-50%,-100%) translate(${(point.x*.5+.5)*w}px,${(-point.y*.5+.5)*h}px)`;}return;}
    type Rect={x:number;y:number;w:number;h:number};
    const obstacles=[...this.container.parentElement!.querySelectorAll<HTMLElement>('.location-tag,.scene-tools,.cinema-focus')].map(el=>{const r=el.getBoundingClientRect();return {x:r.left-bounds.left-3,y:r.top-bounds.top-3,w:r.width+6,h:r.height+6};}).filter(r=>r.w>6&&r.h>6);
    const key=`${w}:${h}:${this.view?.turn}:${visible.map(a=>`${a.id}:${a.label.offsetWidth}:${a.label.offsetHeight}`).join('|')}:${obstacles.map(r=>`${Math.round(r.x)}:${Math.round(r.y)}:${Math.round(r.w)}:${Math.round(r.h)}`).join('|')}`;
    if(key!==this.actorLayoutKey){
      const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
      const place=(packed=false)=>{
        const taken:Rect[]=[...obstacles];let complete=true;
        for(const a of visible){
          const point=a.target.clone().add(new T.Vector3(0,2.7,0)).project(this.camera),bw=a.label.offsetWidth,bh=a.label.offsetHeight;
          const home={x:T.MathUtils.clamp((point.x*.5+.5)*w-bw/2,4,w-bw-4),y:T.MathUtils.clamp((-point.y*.5+.5)*h-bh-7,4,h-bh-4),w:bw,h:bh};
          let best:Rect|null=null,bestScore=Infinity;
          const step=packed?2:6;
          for(let y=4;y<=h-bh-4;y+=step)for(let x=4;x<=w-bw-4;x+=step){const rect={x,y,w:bw,h:bh};if(taken.some(r=>overlaps(rect,r)))continue;const score=packed?y*w+x:(x-home.x)**2+(y-home.y)**2;if(score<bestScore){best=rect;bestScore=score;}}
          if(!best){complete=false;a.labelPosition=null;continue;}
          taken.push(best);a.labelPosition={x:best.x,y:best.y};
        }
        return complete;
      };
      if(this.labels.classList.contains('labels-tight'))place(true);
      else if(!place()){this.labels.classList.add('labels-tight');place(true);}
      this.actorLayoutKey=`${w}:${h}:${this.view?.turn}:${visible.map(a=>`${a.id}:${a.label.offsetWidth}:${a.label.offsetHeight}`).join('|')}:${obstacles.map(r=>`${Math.round(r.x)}:${Math.round(r.y)}:${Math.round(r.w)}:${Math.round(r.h)}`).join('|')}`;
    }
    for(const a of this.actors){
      if(!a.root.visible||!a.labelPosition){a.link.hidden=true;if(a.root.visible)a.label.style.visibility='hidden';continue;}
      a.label.style.visibility='';const rect=a.labelPosition;a.label.style.transform=`translate(${rect.x}px,${rect.y}px)`;
      const point=a.root.position.clone().add(new T.Vector3(0,2.35,0)).project(this.camera),sx=(point.x*.5+.5)*w,sy=(-point.y*.5+.5)*h;
      const x=T.MathUtils.clamp(sx,rect.x+4,rect.x+a.label.offsetWidth-4),y=T.MathUtils.clamp(sy,rect.y+4,rect.y+a.label.offsetHeight-4),dx=sx-x,dy=sy-y;
      a.link.hidden=false;a.link.style.left=`${x}px`;a.link.style.top=`${y}px`;a.link.style.width=`${Math.hypot(dx,dy)}px`;a.link.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    }
  }
  pickInteraction(event:PointerEvent) {
    const bounds=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);const entries=[...this.interactions.values()].filter(entry=>entry.available);
    const hits=this.raycaster.intersectObjects(entries.map(entry=>entry.object),true);
    for(const hit of hits){let object:T.Object3D|null=hit.object;while(object){const entry=entries.find(entry=>entry.object===object);if(entry)return entry;object=object.parent;}}
    return null;
  }
  interactAt(event:PointerEvent) {const entry=this.pickInteraction(event);if(entry)this.onInteract?.(entry.target);}
  configurePostInteractions() {
    this.removeInteraction('post:a');this.removeInteraction('post:b');this.removeInteraction('vault');
    if(!this.view)return;const room=this.view.rooms[this.view.roomIndex];
    for(const action of ['a','b'] as const){const task=room[action];const node=task.icon==='eye'?this.objects.camera:task.icon==='shield'?this.guard:task.icon==='grid'?this.objects.gate:task.icon==='laser'?this.objects.panel:task.icon==='users'?this.objects.bust:task.icon==='lock'?this.objects.vault:task.icon==='van'?this.objects.exit:this.objects.panel;
      if(node){const target=task.icon==='lock'?'vault':`post:${action}`;const anchor=task.icon==='eye'?new T.Vector3(0,-.6,.2):task.icon==='van'?new T.Vector3(0,1.5,.4):new T.Vector3(0,2.0,.3);this.bindInteraction(target,node,`${action.toUpperCase()} · ${task.short}`,anchor);}}
  }
  box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,r=.035) {const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  ball(parent:T.Object3D,x:number,y:number,z:number,s:number,m:T.Material,scale=[1,1,1]) {const o=new T.Mesh(new T.SphereGeometry(s,20,12),m);o.position.set(x,y,z);o.scale.set(...scale as [number,number,number]);o.castShadow=true;parent.add(o);return o;}
  rod(parent:T.Object3D,a:number[],b:number[],r:number,m:T.Material) {const av=new T.Vector3(...a as [number,number,number]),bv=new T.Vector3(...b as [number,number,number]);const o=new T.Mesh(new T.CylinderGeometry(r,r,av.distanceTo(bv),12),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());o.castShadow=true;parent.add(o);return o;}
  group(parent:T.Object3D,x:number,y:number,z:number,rot=0) {const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rot;parent.add(g);return g;}
  painting(x:number,z:number,variant:number,rotation=0) {
    const g=this.group(this.world,x,2.35,z,rotation);
    this.box(g,0,0,0,1.55,1.9,.12,this.gold,.035);this.box(g,0,0,.07,1.36,1.7,.03,mat('#392e28'),.01);
    const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d')!;
    const rand=(n:number)=>((Math.sin(n*12.98+variant*43.1)*43758.54)%1+1)%1;
    ctx.fillStyle=['#84a2ac','#c39f71','#596f82'][variant%3];ctx.fillRect(0,0,256,320);
    for(let l=0;l<5;l++){ctx.fillStyle=['#d6b77d','#789080','#5d7971','#3f5d54','#294847'][l];ctx.beginPath();ctx.moveTo(0,320);for(let x=0;x<=256;x+=8)ctx.lineTo(x,140+l*24+Math.sin(x*.016+l*2)*26);ctx.lineTo(256,320);ctx.fill();}
    ctx.fillStyle='#ead297';ctx.beginPath();ctx.arc(180,63,24,0,Math.PI*2);ctx.fill();
    for(let i=0;i<150;i++){ctx.fillStyle=`rgba(238,214,163,${rand(i)*.12})`;ctx.fillRect(rand(i+8)*256,rand(i+91)*320,3+rand(i+2)*17,2);}
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;this.box(g,0,0,.10,1.25,1.58,.03,new T.MeshStandardMaterial({map:texture,roughness:1}),.005);
    for(const sx of [-.69,.69])for(const sy of [-.85,.85])this.ball(g,sx,sy,.09,.09,this.gold,[1.1,1,.5]);
    this.box(g,0,-1.12,.015,.38,.16,.04,this.gold,.01);
    return g;
  }
  buildRoom() {
    this.box(this.world,0,-.26,0,13.6,.5,10.0,mat('#705d4d'),.12);
    const tilegeo=new T.BoxGeometry(.975,.07,.975),materials=['#aa927a','#b9a18b','#c2ab91','#a58c77'].map(c=>mat(c));
    for(let k=0;k<4;k++){const tiles=new T.InstancedMesh(tilegeo,materials[k],40);let n=0;for(let i=0;i<13;i++)for(let j=0;j<9;j++)if((i+j*3)%4===k){const o=new T.Object3D();o.position.set(i-6,.015,j-4);o.updateMatrix();tiles.setMatrixAt(n++,o.matrix);}tiles.count=n;tiles.receiveShadow=true;this.world.add(tiles);}
    this.box(this.world,0,2.05,-4.65,13.4,4.3,.34,this.red,.03);this.box(this.world,-6.65,2.05,0,.34,4.3,9.5,this.red,.03);
    for(const y of [.25,.47,3.88,4.13]){this.box(this.world,0,y,-4.40,13.35,.16,.20,this.stone);this.box(this.world,-6.40,y,0,.20,.16,9.4,this.stone);}
    for(const x of [-6.1,-2.7,2.7,6.1]) {
      this.box(this.world,x,1.8,-4.30,.45,3.6,.45,this.stone);this.box(this.world,x,.20,-4.25,.66,.38,.63,this.stone);this.box(this.world,x,3.65,-4.25,.72,.35,.65,this.stone);
      for(let y=.75;y<3.5;y+=.55)this.box(this.world,x,y,-4.05,.46,.025,.012,mat('#917a65'),.005);
    }
    this.objects.frame=this.painting(-4.45,-4.35,0);this.painting(4.4,-4.35,1);this.painting(-6.35,-1.6,2,Math.PI/2);
    this.bindInteraction('spot:frame',this.objects.frame,'Fouiller le cadre',new T.Vector3(0,-.35,.2));
    for(const x of [-2.4,2.4]) {
      this.box(this.world,x,2.85,-4.05,.15,.35,.22,this.gold);this.ball(this.world,x,3.03,-3.95,.11,mat('#ffe4a5'),[.7,1.7,.7]);
      const lamp=new T.PointLight('#ffbc5a',7,5,2);lamp.position.set(x,2.9,-3.5);this.world.add(lamp);
    }
    // Side exit with a rounded arch and recessed timber door.
    const door=this.group(this.world,-6.22,0,2.05,Math.PI/2);
    this.box(door,0,1.35,0,1.55,2.7,.12,mat('#473c33'),.06);
    for(let x=-.60;x<=.60;x+=.24)this.box(door,x,1.3,.08,.022,2.5,.03,mat('#322d29'),.005);
    for(const x of [-.99,.99])this.box(door,x,1.35,.08,.30,2.7,.40,this.stone);
    const arch=new T.Mesh(new T.TorusGeometry(.99,.15,8,24,Math.PI),this.stone);arch.position.set(0,2.7,.08);door.add(arch);this.ball(door,.46,1.2,.18,.055,this.gold);
    this.objects.exit=door;
    // Benches, ropes and museum sculptures.
    this.bench(-4.2,.8);this.bench(4.6,2.8);
    for(const x of [-4.8,4.8])this.rope(x,2.0,1.9);
    this.objects.bust=this.statue(-4.8,-1.7);this.bindInteraction('spot:bust',this.objects.bust,'Fouiller la statue',new T.Vector3(0,1.75,.45));
    this.plant(-5.6,-3.5);this.plant(5.5,-3.5);
    this.objects.desk=this.desk(4.45,-2.85);this.bindInteraction('spot:desk',this.objects.desk,'Fouiller le bureau',new T.Vector3(0,1.25,.65));
    const securityCamera=this.group(this.world,5.9,2.9,-1.4);this.objects.camera=securityCamera;
    this.box(securityCamera,0,0,0,.45,.25,.65,mat('#c6bbae'),.05).rotation.y=-.4;
    this.ball(securityCamera,-.1,0,.35,.12,this.black,[1,1,.6]);
    const repair=this.group(this.world,-2.95,0,-3.65);this.objects.repair=repair;
    this.box(repair,0,.8,0,.65,1.6,.38,this.iron,.05);this.box(repair,0,.92,.22,.5,1.13,.06,mat('#41545a'),.025);
    for(let i=0;i<3;i++){this.box(repair,-.12,.62+i*.26,.28,.08,.16,.05,this.black,.01);this.box(repair,.08,.62+i*.26,.3,.14,.06,.06,i===1?mat('#db743f'):mat('#a7c574'),.01);}
    this.bindInteraction('repair',repair,'Réparer · −2 alarme',new T.Vector3(0,1.75,.2));
    const banner=this.group(this.world,6.1,0,-4.38);this.box(banner,0,2.45,0,.7,1.55,.03,mat('#913637'));this.box(banner,0,2.45,.03,.57,1.4,.012,this.gold,.01);this.box(banner,0,2.47,.045,.50,1.32,.012,this.red,.01);
    for(let i=0;i<3;i++)this.box(banner,(i-1)*.13,2.55,.065,.10,.23,.025,this.gold,.01);
    this.buildProps(0);
  }
  bench(x:number,z:number) {const g=this.group(this.world,x,0,z);this.box(g,0,.57,0,1.75,.19,.64,mat('#803b3e'),.08);for(const a of [-.68,.68])for(const b of [-.20,.20])this.box(g,a,.28,b,.1,.50,.1,mat('#6d4d2b'));this.box(g,0,.44,0,1.7,.13,.60,this.gold);}
  rope(x:number,z:number,length:number) {for(const a of [-length/2,length/2]) {this.rod(this.world,[x+a,0,z],[x+a,1.0,z],.045,this.gold);this.ball(this.world,x+a,1.02,z,.095,this.gold);this.box(this.world,x+a,.04,z,.30,.08,.30,this.gold,.04);}const curve=new T.CatmullRomCurve3([new T.Vector3(x-length/2,.93,z),new T.Vector3(x,.65,z),new T.Vector3(x+length/2,.93,z)]);const o=new T.Mesh(new T.TubeGeometry(curve,20,.037,6,false),mat('#8b283d'));this.world.add(o);}
  statue(x:number,z:number) {const g=this.group(this.world,x,0,z);this.box(g,0,.48,0,.85,.96,.8,this.stone);this.box(g,0,1.0,0,1.0,.13,.95,this.stone);const marble=mat('#d6ccba');this.ball(g,0,1.65,0,.26,marble,[.85,1.7,.7]);this.ball(g,0,2.23,0,.20,marble,[.9,1.15,1]);this.ball(g,0,2.36,.04,.20,marble);for(const s of [-1,1])this.rod(g,[s*.19,1.95,0],[s*.30,1.45,.1],.075,marble);return g;}
  desk(x:number,z:number) {const g=this.group(this.world,x,0,z),wood=mat('#78513a'),drawer=mat('#92684b');
    this.box(g,0,1.03,0,1.75,.15,1.0,wood,.05);this.box(g,0,.53,-.05,1.6,.91,.78,wood,.04);
    for(let i=0;i<3;i++){this.box(g,0,.29+i*.28,.38,1.43,.23,.08,drawer,.015);this.box(g,0,.29+i*.28,.44,.25,.045,.055,this.gold,.01);}
    for(const a of [-.67,.67])for(const b of [-.3,.3])this.box(g,a,.12,b,.11,.24,.11,wood,.01);
    this.box(g,-.4,1.135,.05,.45,.025,.4,mat('#eee1bc'),.005);this.rod(g,[.15,1.13,.15],[.4,1.15,.3],.02,this.gold);return g;}
  plant(x:number,z:number) {const g=this.group(this.world,x,0,z);this.ball(g,0,.38,0,.31,mat('#94806c'),[1,1.2,1]);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=this.ball(g,Math.cos(a)*.22,.9+Math.sin(i)*.1,Math.sin(a)*.22,.19,mat('#537552'),[.35,1.7,.8]);leaf.rotation.z=Math.cos(a)*.6;}}
  clearProps() {for(const target of ['post:a','post:b','loot','vault'])this.removeInteraction(target);this.props.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();}});this.props.clear();}
  buildProps(layout:number) {
    this.clearProps();const offset=[0,-1.15,1.1][layout];
    // Vault and grille as separate objects placed on valid module anchors.
    const vault=this.group(this.props,offset,.05,-3.22);this.objects.vault=vault;this.box(vault,0,1.3,0,2.5,2.6,1.7,mat('#7a7d77',.6,.42),.14);
    const door=this.group(vault,-1.10,1.38,.9);door.name='VaultDoor';this.box(door,1.10,0,0,2.17,2.25,.13,mat('#b4aa8f',.65,.36),.06);this.box(door,1.10,0,.09,1.9,2.0,.07,mat('#676e6b',.7,.3));
    const ring=new T.Mesh(new T.TorusGeometry(.48,.045,8,32),this.gold);ring.position.set(1.1,.12,.17);door.add(ring);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;this.rod(door,[1.1,.12,.19],[1.1+Math.sin(a)*.47,.12+Math.cos(a)*.47,.19],.028,this.gold);}
    this.ball(door,1.1,.12,.2,.1,this.gold);for(const x of [.15,2.05])for(const y of [-.9,.87])this.ball(door,x,y,.16,.055,this.gold);
    const gate=this.group(this.props,offset,0,-1.9);this.objects.gate=gate;for(const x of [-1.62,1.62]){this.box(gate,x,1.65,0,.4,3.3,.5,this.stone);this.box(gate,x,3.3,0,.61,.26,.65,this.stone);}this.box(gate,0,3.25,0,3.1,.30,.5,this.stone);
    const bars=this.group(gate,0,0,0);bars.name='GateBars';
    for(let x=-1.33;x<1.5;x+=.33)this.box(bars,x,1.55,0,.065,2.95,.10,this.iron,.01);
    for(const y of [.4,2.6])this.box(bars,0,y,.02,2.85,.14,.15,this.iron);
    // Emissive laser beams and emitters.
    const beam=new T.MeshBasicMaterial({color:'#ff354c'});
    const lasers=this.group(gate,0,0,0);lasers.name='Lasers';
    for(const y of [.8,1.45,2.1]){this.box(gate,-1.43,y,.24,.18,.19,.24,this.iron);this.rod(lasers,[-1.32,y,.26],[1.32,y,.26],.014,beam);this.ball(lasers,-1.32,y,.26,.04,beam);}
    const panel=this.group(this.props,offset+2.15,0,-1.6,-.1);this.objects.panel=panel;this.box(panel,0,.65,0,.46,1.3,.35,this.iron);this.box(panel,0,1.4,.05,.66,.8,.18,this.black);this.box(panel,0,1.57,.16,.45,.19,.02,new T.MeshBasicMaterial({color:'#a9c574'}));for(let i=0;i<6;i++)this.ball(panel,((i%3)-1)*.13,1.32-Math.floor(i/3)*.12,.18,.038,i===1?beam:this.gold);
    // Glass case, crown and loot separate from the vault.
    const exhibit=this.group(this.props,layout===1?3.5:4,0,-.5);
    this.objects.loot=exhibit;this.bindInteraction('loot',exhibit,'Rafler la vitrine · 18 à partager',new T.Vector3(0,2.4,.3));
    this.box(exhibit,0,.6,0,1.2,1.2,1.0,this.stone);this.box(exhibit,0,1.25,0,1.4,.18,1.2,this.stone);
    const glass=new T.MeshPhysicalMaterial({color:'#b8e1df',transparent:true,opacity:.12,roughness:.10,metalness:0,depthWrite:false});this.box(exhibit,0,1.82,0,1.15,1.0,.95,glass,.01);
    for(const x of [-.56,.56])for(const z of [-.46,.46])this.rod(exhibit,[x,1.3,z],[x,2.3,z],.018,this.gold);
    const treasure=this.group(exhibit,0,0,0);treasure.name='Treasure';const objective=this.view?.rooms[this.view.roomIndex].objective??'la Couronne du roi';
    if(objective.includes('Diamant')){const gem=new T.Mesh(new T.OctahedronGeometry(.34),new T.MeshPhysicalMaterial({color:'#29b3db',metalness:.35,roughness:.12}));gem.position.set(0,1.65,0);gem.scale.y=1.25;treasure.add(gem);}
    else if(objective.includes('Masque')){this.ball(treasure,0,1.65,0,.28,this.gold,[.85,1.25,.35]);for(const s of [-1,1])this.ball(treasure,s*.10,1.73,.08,.055,this.black,[1,.45,.5]);}
    else {const crown=new T.Mesh(new T.CylinderGeometry(.29,.26,.18,20,1,true),this.gold);crown.position.set(0,1.53,0);treasure.add(crown);
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const point=new T.Mesh(new T.ConeGeometry(.07,.24,5),this.gold);point.position.set(Math.cos(a)*.25,1.73,Math.sin(a)*.25);treasure.add(point);this.ball(treasure,Math.cos(a)*.26,1.57,Math.sin(a)*.26,.047,mat(i%2?'#d83035':'#1b92ae',.4,.3));}}
    const bag=this.group(this.props,3.0,.05,2.1);this.ball(bag,0,.33,0,.32,mat('#29363d'),[1,1.2,.8]);this.rod(bag,[-.12,.58,0],[.12,.58,0],.035,this.gold);
    for(let i=0;i<6;i++){this.box(this.props,2.6+i*.13,.075,2.7+Math.sin(i)*.13,.11,.05,.08,this.gold,.015);}
    this.configurePostInteractions();
  }
  setPlayers(players:Player[]) {
    this.roster=players;
    if(!this.base)return;
    this.crew.clear();this.labels.innerHTML='';this.actors=[];
    players.forEach((p,i)=>{
      const root=this.base!.clone(true);root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name==='Cloth'){o.material=o.material.clone();o.material.color.set(p.color);}}});
      root.scale.setScalar(.94);root.rotation.y=-.2;const start=this.idlePosition(i);root.position.copy(start);this.crew.add(root);
      const parts:Record<string,T.Object3D>={};['Head','ArmL','ArmR','LegL','LegR'].forEach(n=>{const o=root.getObjectByName(n);if(o)parts[n]=o;});
      const pose=Object.fromEntries(Object.entries(parts).map(([name,part])=>[name,part.rotation.clone()]));
      const label=document.createElement('div');label.className='name-tag';label.style.background=p.color;
      const name=document.createElement('span');name.className='scene-player-name';name.textContent=p.name;
      const status=document.createElement('span');status.className='scene-betrayal';status.hidden=true;
      const reward=document.createElement('div');reward.className='scene-reward';reward.hidden=true;
      const link=document.createElement('div');link.className='actor-callout-link';link.hidden=true;link.setAttribute('aria-hidden','true');
      label.append(name,status,reward);this.labels.append(link,label);
      this.actors.push({id:p.id,root,parts,pose,target:start.clone(),label,status,reward,link,labelPosition:null,index:i,action:null,searchSpot:null});
    });
    if(this.view)this.update(this.view);
    this.presentCaper(this.caperFindings,this.caperSignals);
  }
  addGuard(){if(!this.base)return;this.guard=this.base.clone(true);this.guard.scale.setScalar(.85);this.guard.position.set(-4.8,.07,-2.5);this.guard.rotation.y=.4;
    this.guard.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;if(o.material.name==='Cloth'){o.material=o.material.clone();o.material.color.set('#39627d');}if(/DominoMask|MaskBridge|MaskStrap|Backpack|PackPocket|PackFlap|PackHandle|ShoulderStrap|StrapBuckle/.test(o.name))o.visible=false;}});if(this.view)this.guard.position.set([-4.8,-3.8,4.8][this.view.rooms[this.view.roomIndex].layout],.07,-2.8);this.world.add(this.guard);this.configurePostInteractions();
  }
  idlePosition(i:number) {return new T.Vector3([-2.1,.1,2.5,3.9,-3.2,1.4][i],.08,[1.25,2.05,1.2,2.25,2.5,3.0][i]);}
  update(v:View|null) {
    const old=this.view;this.view=v;
    if(v&&(!old||v.players.map(p=>`${p.id}:${p.name}`).join()!==old.players.map(p=>`${p.id}:${p.name}`).join()))this.setPlayers(v.players);
    if(!v){this.focusPlayer(null);if(old){this.lastLayout='';this.buildProps(0);if(this.guard)this.guard.position.set(-4.8,.07,-2.5);}this.actors.forEach((actor,i)=>{actor.target.copy(this.idlePosition(i));actor.action=null;actor.searchSpot=null;actor.root.visible=true;actor.label.style.display='';actor.label.style.visibility='';actor.label.classList.remove('is-betrayer','is-agent','is-revealing');actor.status.hidden=true;actor.reward.hidden=true;actor.link.hidden=true;actor.label.removeAttribute('aria-label');});this.syncInteractions();return;}
    const key=`${v.rooms[v.roomIndex].layout}:${v.roomIndex}`;if(key!==this.lastLayout){this.lastLayout=key;this.buildProps(v.rooms[v.roomIndex].layout);if(this.guard)this.guard.position.set([-4.8,-3.8,4.8][v.rooms[v.roomIndex].layout],.07,-2.8);}
    const door=this.props.getObjectByName('VaultDoor');if(door)door.rotation.y=v.objective?-1.45:0;
    const treasure=this.props.getObjectByName('Treasure');if(treasure)treasure.visible=!v.objective;
    const room=v.rooms[v.roomIndex],revealed=v.phase==='reveal'||v.phase==='ended';
    const succeeded=(short:string)=>revealed&&v.report&&!v.report.incidents.some(i=>i.startsWith(short+' :'));
    for(const task of [room.a,room.b]){if(task.icon==='grid'){const bars=this.props.getObjectByName('GateBars');if(bars)bars.position.y=succeeded(task.short)?1.6:0;}if(task.icon==='laser'){const lasers=this.props.getObjectByName('Lasers');if(lasers)lasers.visible=!succeeded(task.short);}}
    this.actors.forEach((actor,i)=>{
      const p=v.players[i],finding=v.phase==='reveal'?v.report?.findings.find(f=>f.id===p.id):undefined,agent=v.phase==='ended'&&p.exposed==='agent';
      actor.label.style.display=p.active||agent?'':'none';actor.root.visible=p.active||agent;actor.target.copy(this.idlePosition(i));actor.action=null;actor.searchSpot=null;
      const harmful=!!finding&&(finding.betrayed||finding.action==='loot');
      actor.label.classList.toggle('is-betrayer',harmful);actor.label.classList.toggle('is-agent',agent);
      actor.label.classList.toggle('is-revealing',v.phase==='reveal');actor.label.style.visibility='';
      actor.status.hidden=!harmful&&!agent;actor.status.textContent=agent?'Agent infiltré · FBI':finding?.betrayed?'Promesse rompue':'Vol du butin';
      actor.reward.hidden=!finding;
      if(finding){const amount=`${finding.gain>=0?'+':''}${finding.gain}`;actor.reward.innerHTML=`<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="13" ry="12" fill="#a86d12"/><circle cx="16" cy="15" r="12" fill="#ffd154" stroke="#e4a624" stroke-width="2"/><circle cx="16" cy="15" r="8.5" fill="none" stroke="#fff0a6" stroke-width="1.4"/><path d="M18.7 10.5c-4-2-7 4.5-2.7 4.5s1.3 6.5-2.7 4.5M16 8.5v13" fill="none" stroke="#a76c12" stroke-width="2" stroke-linecap="round"/><path d="m7 8 2-2" stroke="#fff8d6" stroke-width="2" stroke-linecap="round"/></svg><strong>${amount}</strong>`;actor.label.setAttribute('aria-label',`${p.name}${finding.betrayed?', promesse rompue':''}, ${amount} pièces`);}
      else if(agent)actor.label.setAttribute('aria-label',`${p.name}, agent infiltré du FBI`);else actor.label.removeAttribute('aria-label');
      if((v.phase==='reveal'||v.phase==='vote'||v.phase==='ended')&&v.report){const f=v.report.findings.find(f=>f.id===p.id);if(f){
        actor.action=f.action;const others=v.report.findings.filter(a=>a.action===f.action&&(f.action!=='search'||a.target===f.target)),n=others.findIndex(a=>a.id===p.id);
        if(f.action==='search'){const detail=f.detail.toLowerCase(),target=(f as typeof f&{target?:string}).target;actor.searchSpot=target??(p.id===v.myId?v.myTarget:null)??(detail.includes('cadre')?'frame':detail.includes('bureau')?'desk':detail.includes('statue')?'bust':v.spots[Math.min(v.roomIndex,2)]?.id??'frame');}
        this.actionPosition(actor,f.action,n,others.length,room);
      }}
    });
    if(v.phase!=='reveal'&&v.phase!=='ended')this.focusPlayer(null);this.syncInteractions();
  }
  actionPosition(actor:Actor,action:string,index:number,count:number,room:View['rooms'][number]) {
    const task=action==='a'?room.a:room.b;
    const taskObject=task.icon==='eye'?this.objects.camera:task.icon==='shield'?this.guard:task.icon==='grid'?this.objects.gate:task.icon==='laser'?this.objects.panel:task.icon==='users'?this.objects.bust:task.icon==='lock'?this.objects.vault:task.icon==='van'?this.objects.exit:this.objects.panel;
    const object=action==='search'?this.objects[actor.searchSpot??'frame']:action==='loot'?this.objects.loot:action==='repair'?this.objects.repair:action==='cover'?this.objects.gate:taskObject;
    if(object){const position=object.getWorldPosition(new T.Vector3()),spread=(index%3-(Math.min(count,3)-1)/2)*.7,side=object===this.objects.bust?(action==='search'?-.45:.45):0;
      actor.target.set(T.MathUtils.clamp(position.x+spread+side,-5.7,5.7),.08,position.z+(action==='cover'?3.1:action==='search'?1.15:action==='loot'?1.35:1)+Math.floor(index/3)*.8);}
  }
  focusPlayer(id:string|null) {this.focusedId=id;this.focusHalo.visible=!!id;this.focusLight.intensity=id?4:0;if(!id){this.focusHalo.visible=false;}}
  presentCaper(findings:CaperFinding[],signals:CaperSignal[]=[]){
    this.caperFindings=findings;this.caperSignals=signals;
    const homes=new Map(this.actors.map(a=>[a.id,a.target.clone()]));
    for(const a of this.actors){const f=findings.find(f=>f.id===a.id),signal=signals.find(s=>s.id===a.id);
      a.label.classList.toggle('is-victim',!!f&&(f.blocked||f.lost>0));
      if(f){a.status.hidden=false;a.status.textContent=f.blocked?'Patatras !':f.scheme==='trip'?'Croche-pied !':f.scheme==='pocket'?'Les mains dans le sac !':f.scheme==='grab'?'Tout pour moi !':'Au travail';
        if(f.target&&homes.has(f.target))a.target.copy(homes.get(f.target)!).add(new T.Vector3(.65,0,.45));
        if(f.blocked)a.action='fallen';else if(f.scheme==='trip')a.action='trip';else if(f.scheme==='pocket')a.action='pocket';
        a.reward.classList.toggle('negative',f.gain<0);const amount=a.reward.querySelector('strong');if(amount)amount.textContent=`${f.gain>=0?'+':''}${f.gain}`;
      }else if(signal){a.status.hidden=false;a.status.textContent=signal.kind==='work'?'« Je braque ! »':signal.kind==='help'?'« Besoin d’aide ! »':'« Je te surveille ! »';}
    }
    const key=findings.length?`${this.view?.turn}:${findings.map(f=>`${f.id}:${f.stole}`).join()}`:'';
    if(key!==this.caperKey){this.caperKey=key;for(const c of this.flyingCoins){this.world.remove(c.mesh);c.mesh.geometry.dispose();}this.flyingCoins=[];
      for(const f of findings)if(f.target&&f.stole>0)for(let i=0;i<Math.min(f.stole,5);i++){const mesh=new T.Mesh(new T.CylinderGeometry(.12,.12,.04,14),this.gold);mesh.rotation.x=Math.PI/2;this.world.add(mesh);this.flyingCoins.push({mesh,from:f.target,to:f.id,offset:i*.19});}
    }
  }
  setZoom(delta:number){this.zoom=T.MathUtils.clamp(this.zoom+delta,.8,1.5);this.resize();}
  resize() {const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;const ratio=w/h;const height=Math.max(8.7,15.5/ratio)/this.zoom;this.camera.left=-height*ratio/2;this.camera.right=height*ratio/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.nextBadgeLayout=0;}
  animate=()=>{
    requestAnimationFrame(this.animate);if(document.hidden)return;const dt=Math.min(this.clock.getDelta(),.05),time=this.clock.elapsedTime;
    this.actors.forEach((a,i)=>{const distance=a.root.position.distanceTo(a.target);a.root.position.lerp(a.target,this.reduced?1:Math.min(1,dt*3));const work=distance<.1&&(this.view?.phase==='reveal');
      for(const [name,part] of Object.entries(a.parts))part.rotation.copy(a.pose[name]);a.root.rotation.set(0,-.2,0);a.root.scale.setScalar(a.id===this.focusedId?1.01:.94);
      const walking=distance>.15,motion=this.reduced?0:Math.sin(time*(walking?11:work?7:2)+i)*(walking?.48:work?.25:.025);
      const rotate=(name:string,axis:'x'|'y'|'z',angle:number)=>{if(a.parts[name])a.parts[name].rotation[axis]+=angle;};
      if(walking){rotate('ArmL','x',motion);rotate('ArmR','x',-motion);rotate('LegL','x',-motion);rotate('LegR','x',motion);}
      else if(work||this.view?.phase==='ended'&&a.action){
        if(a.action==='fallen'){a.root.rotation.z=this.reduced?.9:1.0+Math.sin(time*3)*.1;rotate('ArmL','z',-1.6);rotate('ArmR','z',1.6);rotate('LegL','x',.5);rotate('Head','z',-.3);}
        else if(a.action==='trip'){rotate('LegR','z',-.9);rotate('ArmL','z',-.65);rotate('Head','y',.5);}
        else if(a.action==='pocket'){a.root.rotation.y=-1;rotate('ArmR','x',-1.4+motion*.3);rotate('ArmL','x',-.6);rotate('Head','y',-.5);}
        else if(a.action==='search'){a.root.rotation.x=.18;rotate('Head','x',.3);rotate('ArmL','x',-.8+motion);rotate('ArmR','x',-1.12-motion);rotate('LegR','x',.2);}
        else if(a.action==='loot'){a.root.rotation.z=motion*.18;rotate('ArmL','x',-1.1+motion);rotate('ArmR','x',-.45-motion);rotate('Head','x',.18);}
        else if(a.action==='repair'){a.root.rotation.x=.12;rotate('Head','x',.3);rotate('ArmL','x',-.65);rotate('ArmR','x',-1.25+motion*.8);rotate('ArmR','z',-.15);}
        else if(a.action==='cover'){rotate('ArmL','z',-.62-motion*.25);rotate('ArmR','z',.62+motion*.25);rotate('Head','y',motion);}
        else if(a.action==='a'){rotate('ArmL','x',-1.35+motion*.3);rotate('ArmR','x',-1.35-motion*.3);rotate('Head','x',-.13);}
        else {rotate('ArmL','z',-.35);rotate('ArmR','z',1.2+motion);rotate('Head','y',motion*.5);}
      }else {rotate('ArmL','x',motion);rotate('ArmR','x',-motion);rotate('Head','z',motion);}
      a.label.style.boxShadow=a.id===this.focusedId?'0 0 0 3px #fff3c5,0 4px 20px #0008':'';
    });
    const focus=this.actors.find(actor=>actor.id===this.focusedId&&actor.root.visible);this.focusHalo.visible=!!focus;
    const aim=focus?new T.Vector3(focus.root.position.x*.32,1.15,focus.root.position.z*.22):new T.Vector3(0,1.15,0);this.cameraAim.lerp(aim,this.reduced?1:Math.min(1,dt*3));this.camera.position.set(10+this.cameraAim.x,10,16+this.cameraAim.z);this.camera.lookAt(this.cameraAim);
    const cameraZoom=T.MathUtils.lerp(this.camera.zoom,focus?1.08:1,this.reduced?1:Math.min(1,dt*3));if(Math.abs(this.camera.zoom-cameraZoom)>.00005){this.camera.zoom=cameraZoom;this.camera.updateProjectionMatrix();}
    if(focus){this.focusHalo.position.copy(focus.root.position);this.focusHalo.position.y=.105;this.focusLight.position.copy(focus.root.position).add(new T.Vector3(0,2.6,1));this.focusLight.intensity=4;}else this.focusLight.intensity=0;
    for(const c of this.flyingCoins){const from=this.actors.find(a=>a.id===c.from),to=this.actors.find(a=>a.id===c.to);if(from&&to){const progress=this.reduced?.5:((time*.55+c.offset)%1);c.mesh.position.lerpVectors(from.root.position,to.root.position,progress);c.mesh.position.y+=1.3+Math.sin(progress*Math.PI)*1.3;c.mesh.rotation.z=this.reduced?0:time*3;}}
    this.renderer.render(this.scene,this.camera);this.layoutActorLabels();if(time>=this.nextBadgeLayout){this.layoutBadges();this.nextBadgeLayout=time+.12;}
  };
}
