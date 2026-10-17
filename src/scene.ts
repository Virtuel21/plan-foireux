import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { View, Player } from './engine';
import { COLORS } from './engine';

const mat=(color:T.ColorRepresentation,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,roughness,metalness});
export class Museum {
  scene=new T.Scene(); camera:T.OrthographicCamera; renderer:T.WebGLRenderer; world=new T.Group(); props=new T.Group(); crew=new T.Group();
  actors:{root:T.Object3D;parts:Record<string,T.Object3D>;target:T.Vector3;label:HTMLDivElement;index:number}[]=[];
  base:T.Group|null=null; view:View|null=null; clock=new T.Clock(); lastLayout=''; labels:HTMLDivElement; zoom=1;
  reduced=matchMedia('(prefers-reduced-motion: reduce)').matches; ready=false;
  gold=mat('#d8a345',.65,.32); stone=mat('#ba9c7a'); iron=mat('#34434a',.6,.48); red=mat('#743b40'); black=mat('#202c36');
  constructor(public container:HTMLElement) {
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
    this.renderer.setClearColor('#102737');container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','Musée 3D : coffre, obstacles et braqueurs animés');this.renderer.domElement.setAttribute('role','img');
    this.camera=new T.OrthographicCamera(-8,8,5,-5,.1,80);this.camera.position.set(10,10,16);this.camera.lookAt(0,1.15,0);
    this.labels=document.createElement('div');this.labels.className='world-labels';container.append(this.labels);
    this.scene.add(this.world);this.world.add(this.props,this.crew);
    this.scene.add(new T.HemisphereLight('#dae9ff','#685042',2.0));
    const sun=new T.DirectionalLight('#ffe0a1',4.4);sun.position.set(-4,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:30});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;this.scene.add(sun);
    const fill=new T.DirectionalLight('#8eacdf',1.7);fill.position.set(6,5,-4);this.scene.add(fill);
    this.buildRoom();new ResizeObserver(()=>this.resize()).observe(container);this.resize();
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/burglar.glb`,g=>{this.base=g.scene;this.ready=true;this.setPlayers(this.view?.players??this.previewPlayers());},undefined,()=>{container.insertAdjacentHTML('beforeend','<p class="scene-error">Le modèle n’a pas chargé. Recharge la page pour réessayer.</p>');});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.clock.getDelta();});this.animate();
  }
  previewPlayers():Player[]{return ['Julien','Léa','Max','Sarah'].map((name,i)=>({id:String(i),name,color:COLORS[i],bot:true,online:true,active:true,money:0,promise:null,ready:false,exposed:null}));}
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
    this.painting(-4.45,-4.35,0);this.painting(4.4,-4.35,1);this.painting(-6.35,-1.6,2,Math.PI/2);
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
    // Benches, ropes and museum sculptures.
    this.bench(-4.2,.8);this.bench(4.6,2.8);
    for(const x of [-4.8,4.8])this.rope(x,2.0,1.9);
    this.statue(-4.8,-1.7);this.plant(-5.6,-3.5);this.plant(5.5,-3.5);
    this.box(this.world,5.9,2.9,-1.4,.45,.25,.65,mat('#c6bbae'),.05).rotation.y=-.4;
    this.ball(this.world,5.8,2.9,-1.05,.12,this.black,[1,1,.6]);
    const banner=this.group(this.world,6.1,0,-4.38);this.box(banner,0,2.45,0,.7,1.55,.03,mat('#913637'));this.box(banner,0,2.45,.03,.57,1.4,.012,this.gold,.01);this.box(banner,0,2.47,.045,.50,1.32,.012,this.red,.01);
    for(let i=0;i<3;i++)this.box(banner,(i-1)*.13,2.55,.065,.10,.23,.025,this.gold,.01);
    this.buildProps(0);
  }
  bench(x:number,z:number) {const g=this.group(this.world,x,0,z);this.box(g,0,.57,0,1.75,.19,.64,mat('#803b3e'),.08);for(const a of [-.68,.68])for(const b of [-.20,.20])this.box(g,a,.28,b,.1,.50,.1,mat('#6d4d2b'));this.box(g,0,.44,0,1.7,.13,.60,this.gold);}
  rope(x:number,z:number,length:number) {for(const a of [-length/2,length/2]) {this.rod(this.world,[x+a,0,z],[x+a,1.0,z],.045,this.gold);this.ball(this.world,x+a,1.02,z,.095,this.gold);this.box(this.world,x+a,.04,z,.30,.08,.30,this.gold,.04);}const curve=new T.CatmullRomCurve3([new T.Vector3(x-length/2,.93,z),new T.Vector3(x,.65,z),new T.Vector3(x+length/2,.93,z)]);const o=new T.Mesh(new T.TubeGeometry(curve,20,.037,6,false),mat('#8b283d'));this.world.add(o);}
  statue(x:number,z:number) {const g=this.group(this.world,x,0,z);this.box(g,0,.48,0,.85,.96,.8,this.stone);this.box(g,0,1.0,0,1.0,.13,.95,this.stone);const marble=mat('#d6ccba');this.ball(g,0,1.65,0,.26,marble,[.85,1.7,.7]);this.ball(g,0,2.23,0,.20,marble,[.9,1.15,1]);this.ball(g,0,2.36,.04,.20,marble);for(const s of [-1,1])this.rod(g,[s*.19,1.95,0],[s*.30,1.45,.1],.075,marble);}
  plant(x:number,z:number) {const g=this.group(this.world,x,0,z);this.ball(g,0,.38,0,.31,mat('#94806c'),[1,1.2,1]);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=this.ball(g,Math.cos(a)*.22,.9+Math.sin(i)*.1,Math.sin(a)*.22,.19,mat('#537552'),[.35,1.7,.8]);leaf.rotation.z=Math.cos(a)*.6;}}
  clearProps() {this.props.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();}});this.props.clear();}
  buildProps(layout:number) {
    this.clearProps();const offset=[0,-1.15,1.1][layout];
    // Vault and grille as separate objects placed on valid module anchors.
    const vault=this.group(this.props,offset,.05,-3.22);this.box(vault,0,1.3,0,2.5,2.6,1.7,mat('#7a7d77',.6,.42),.14);this.box(vault,0,1.38,.9,2.17,2.25,.13,mat('#b4aa8f',.65,.36),.06);this.box(vault,0,1.38,.99,1.9,2.0,.07,mat('#676e6b',.7,.3));
    const ring=new T.Mesh(new T.TorusGeometry(.48,.045,8,32),this.gold);ring.position.set(0,1.5,1.07);vault.add(ring);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;this.rod(vault,[0,1.5,1.09],[Math.sin(a)*.47,1.5+Math.cos(a)*.47,1.09],.028,this.gold);}
    this.ball(vault,0,1.5,1.1,.1,this.gold);for(const x of [-.95,.95])for(const y of [.48,2.25])this.ball(vault,x,y,1.06,.055,this.gold);
    const gate=this.group(this.props,offset,0,-1.9);for(const x of [-1.62,1.62]){this.box(gate,x,1.65,0,.4,3.3,.5,this.stone);this.box(gate,x,3.3,0,.61,.26,.65,this.stone);}this.box(gate,0,3.25,0,3.1,.30,.5,this.stone);
    for(let x=-1.33;x<1.5;x+=.33)this.box(gate,x,1.55,0,.065,2.95,.10,this.iron,.01);
    for(const y of [.4,2.6])this.box(gate,0,y,.02,2.85,.14,.15,this.iron);
    // Emissive laser beams and emitters.
    const beam=new T.MeshBasicMaterial({color:'#ff354c'});
    for(const y of [.8,1.45,2.1]){this.box(gate,-1.43,y,.24,.18,.19,.24,this.iron);this.rod(gate,[-1.32,y,.26],[1.32,y,.26],.014,beam);this.ball(gate,-1.32,y,.26,.04,beam);}
    const panel=this.group(this.props,offset+2.15,0,-1.6,-.1);this.box(panel,0,.65,0,.46,1.3,.35,this.iron);this.box(panel,0,1.4,.05,.66,.8,.18,this.black);this.box(panel,0,1.57,.16,.45,.19,.02,new T.MeshBasicMaterial({color:'#a9c574'}));for(let i=0;i<6;i++)this.ball(panel,((i%3)-1)*.13,1.32-Math.floor(i/3)*.12,.18,.038,i===1?beam:this.gold);
    // Glass case, crown and loot separate from the vault.
    const exhibit=this.group(this.props,layout===1?3.5:4,0,-.5);
    this.box(exhibit,0,.6,0,1.2,1.2,1.0,this.stone);this.box(exhibit,0,1.25,0,1.4,.18,1.2,this.stone);
    const glass=new T.MeshPhysicalMaterial({color:'#b8e1df',transparent:true,opacity:.12,roughness:.10,metalness:0,depthWrite:false});this.box(exhibit,0,1.82,0,1.15,1.0,.95,glass,.01);
    for(const x of [-.56,.56])for(const z of [-.46,.46])this.rod(exhibit,[x,1.3,z],[x,2.3,z],.018,this.gold);
    const crown=new T.Mesh(new T.CylinderGeometry(.29,.26,.18,20,1,true),this.gold);crown.position.set(0,1.53,0);exhibit.add(crown);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const point=new T.Mesh(new T.ConeGeometry(.07,.24,5),this.gold);point.position.set(Math.cos(a)*.25,1.73,Math.sin(a)*.25);exhibit.add(point);this.ball(exhibit,Math.cos(a)*.26,1.57,Math.sin(a)*.26,.047,mat(i%2?'#d83035':'#1b92ae',.4,.3));}
    const bag=this.group(this.props,3.0,.05,2.1);this.ball(bag,0,.33,0,.32,mat('#29363d'),[1,1.2,.8]);this.rod(bag,[-.12,.58,0],[.12,.58,0],.035,this.gold);
    for(let i=0;i<6;i++){this.box(this.props,2.6+i*.13,.075,2.7+Math.sin(i)*.13,.11,.05,.08,this.gold,.015);}
  }
  setPlayers(players:Player[]) {
    if(!this.base)return;
    this.crew.clear();this.labels.innerHTML='';this.actors=[];
    players.forEach((p,i)=>{
      const root=this.base!.clone(true);root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name==='Cloth'){o.material=o.material.clone();o.material.color.set(p.color);}}});
      root.scale.setScalar(.94);root.rotation.y=-.2;const start=this.idlePosition(i);root.position.copy(start);this.crew.add(root);
      const parts:Record<string,T.Object3D>={};['Head','ArmL','ArmR','LegL','LegR'].forEach(n=>{const o=root.getObjectByName(n);if(o)parts[n]=o;});
      const label=document.createElement('div');label.className='name-tag';label.style.background=p.color;label.textContent=p.name;this.labels.append(label);
      this.actors.push({root,parts,target:start.clone(),label,index:i});
    });
  }
  idlePosition(i:number) {return new T.Vector3([-2.1,.1,2.5,3.9,-3.2,1.4][i],.08,[1.25,2.05,1.2,2.25,2.5,3.0][i]);}
  update(v:View|null) {
    const old=this.view;this.view=v;
    if(v&&(!old||v.players.map(p=>`${p.id}:${p.name}`).join()!==old.players.map(p=>`${p.id}:${p.name}`).join()))this.setPlayers(v.players);
    if(!v)return;const key=`${v.rooms[v.roomIndex].layout}:${v.roomIndex}`;if(key!==this.lastLayout){this.lastLayout=key;this.buildProps(v.rooms[v.roomIndex].layout);}
    this.actors.forEach((actor,i)=>{
      const p=v.players[i];actor.label.style.opacity=p.active?'1':'.35';actor.root.visible=p.active;actor.target.copy(this.idlePosition(i));
      if((v.phase==='reveal'||v.phase==='ended')&&v.report){const f=v.report.findings.find(f=>f.id===p.id);if(f){const x=[0,-1.15,1.1][v.rooms[v.roomIndex].layout];const others=v.report.findings.filter(a=>a.action===f.action),n=others.findIndex(a=>a.id===p.id);actor.target.set(f.action==='a'?x-1+n*.85:f.action==='b'?x+2.1+n*.8:3.2+n*.55,.08,f.action==='loot'?.45:-.15);}}
    });
  }
  setZoom(delta:number){this.zoom=T.MathUtils.clamp(this.zoom+delta,.8,1.5);this.resize();}
  resize() {const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;const ratio=w/h;const height=Math.max(8.7,15.5/ratio)/this.zoom;this.camera.left=-height*ratio/2;this.camera.right=height*ratio/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
  animate=()=>{
    requestAnimationFrame(this.animate);if(document.hidden)return;const dt=Math.min(this.clock.getDelta(),.05),time=this.clock.elapsedTime;
    this.actors.forEach((a,i)=>{const distance=a.root.position.distanceTo(a.target);a.root.position.lerp(a.target,this.reduced?1:Math.min(1,dt*3));const work=distance<.1&&(this.view?.phase==='reveal');
      if(!this.reduced){const walking=distance>.15;const motion=walking?Math.sin(time*11)*.48:work?Math.sin(time*7)*.25:Math.sin(time*2+i)*.025;
        if(a.parts.ArmL)a.parts.ArmL.rotation.x=motion+(work?-.8:0);if(a.parts.ArmR)a.parts.ArmR.rotation.x=-motion+(work?-.8:0);if(a.parts.LegL)a.parts.LegL.rotation.x=walking?-motion:0;if(a.parts.LegR)a.parts.LegR.rotation.x=walking?motion:0;if(a.parts.Head)a.parts.Head.rotation.z=Math.sin(time*1.7+i)*.025;
      }
      const screen=a.root.position.clone().add(new T.Vector3(0,2.7,0)).project(this.camera);a.label.style.transform=`translate(-50%,-100%) translate(${(screen.x*.5+.5)*this.container.clientWidth}px,${(-screen.y*.5+.5)*this.container.clientHeight}px)`;
    });this.renderer.render(this.scene,this.camera);
  };
}
