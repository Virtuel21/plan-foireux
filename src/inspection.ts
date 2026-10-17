import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type InspectionState = { spotId:string; mark:number; value:string; found:boolean };

/** A private, rotatable prop. `rotate` receives radians; no automatic rotation is used. */
export class ObjectInspection {
  private renderer:T.WebGLRenderer;
  private scene=new T.Scene();
  private camera=new T.OrthographicCamera(-2.5,2.5,2.5,-2.5,.1,30);
  private pivot=new T.Group();
  private model=new T.Group();
  private marker:T.Mesh|null=null;
  private markNormal=new T.Vector3(0,0,1);
  private initial=new T.Quaternion();
  private raycaster=new T.Raycaster();
  private observer:ResizeObserver;
  private status:HTMLDivElement;
  private key='';
  private reported=false;
  private disposed=false;
  private frame=0;
  private radius=2;
  private pointer:{id:number;x:number;y:number}|null=null;
  private priorTouchAction:string;
  private priorPosition:string;
  private geometries=new Set<T.BufferGeometry>();
  private materials=new Set<T.Material>();
  private textures=new Set<T.Texture>();

  constructor(private container:HTMLElement,private onFound:()=>void) {
    this.priorTouchAction=container.style.touchAction;
    this.priorPosition=container.style.position;
    container.style.touchAction='none';
    if(getComputedStyle(container).position==='static')container.style.position='relative';
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.15;
    this.renderer.setClearColor('#122a38',0);
    const canvas=this.renderer.domElement;
    Object.assign(canvas.style,{width:'100%',height:'100%',display:'block',touchAction:'none',cursor:'grab',outlineOffset:'-4px'});
    canvas.tabIndex=0;
    canvas.setAttribute('role','group');
    canvas.setAttribute('aria-label','Objet à examiner. Glisse pour le faire pivoter ou utilise les flèches du clavier. Toutes ses faces peuvent cacher le chiffre.');
    container.append(canvas);
    this.status=document.createElement('div');
    this.status.className='inspection-feedback';
    this.status.setAttribute('aria-live','polite');
    Object.assign(this.status.style,{position:'absolute',bottom:'10px',left:'12px',right:'12px',pointerEvents:'none',fontSize:'12px',fontWeight:'800',textAlign:'center',color:'#fff4d6',textShadow:'0 1px 4px #071b26',padding:'5px 8px',borderRadius:'8px',background:'#0d253bc9'});
    this.status.textContent='Glisse pour retourner l’objet. Cherche un chiffre gravé.';
    container.append(this.status);
    this.camera.position.set(0,0,8);
    this.camera.lookAt(0,0,0);
    this.scene.add(this.pivot);
    this.pivot.add(this.model);
    this.scene.add(new T.HemisphereLight('#eaf1ff','#684b37',2.4));
    const keyLight=new T.DirectionalLight('#ffe3ae',3.7);keyLight.position.set(-3,5,6);this.scene.add(keyLight);
    const fill=new T.DirectionalLight('#9dc8ff',1.7);fill.position.set(5,1,2);this.scene.add(fill);
    const rim=new T.DirectionalLight('#f3b54e',2.2);rim.position.set(-2,3,-4);this.scene.add(rim);
    canvas.addEventListener('pointerdown',this.pointerDown);
    canvas.addEventListener('pointermove',this.pointerMove);
    canvas.addEventListener('pointerup',this.pointerEnd);
    canvas.addEventListener('pointercancel',this.pointerEnd);
    canvas.addEventListener('lostpointercapture',this.pointerEnd);
    canvas.addEventListener('keydown',this.keyDown);
    this.observer=new ResizeObserver(()=>this.resize());
    this.observer.observe(container);
    this.resize();
  }

  update(state:InspectionState) {
    if(this.disposed)return;
    const mark=((Math.trunc(state.mark)%12)+12)%12;
    const nextKey=`${state.spotId}:${mark}:${state.value}`;
    if(nextKey===this.key) {
      if(state.found){this.reported=true;this.status.textContent='Chiffre repéré ! Il est conservé dans ton carnet privé.';}
      return;
    }
    this.key=nextKey;this.reported=state.found;
    this.clearModel();
    this.model.position.set(0,0,0);
    const face=Math.floor(mark/2),side=mark%2===0?-1:1;
    let anchor:T.Vector3,normal:T.Vector3,size:number;
    if(state.spotId==='frame') {
      this.buildFrame();
      size=face===0?.36:.43;
      const positions=[
        new T.Vector3(side*.72,-1.11,.378),new T.Vector3(side*.72,.25,-.365),
        new T.Vector3(-1.508,side*.68,0),new T.Vector3(1.508,side*.68,0),
        new T.Vector3(side*.72,1.308,0),new T.Vector3(side*.72,-1.308,0),
      ];
      anchor=positions[face];
    } else if(state.spotId==='bust') {
      this.buildBust();size=face===4?.3:.38;
      const positions=[
        new T.Vector3(side*.43,-1.12,.758),new T.Vector3(side*.43,-1.12,-.758),
        new T.Vector3(-.958,-1.12,side*.3),new T.Vector3(.958,-1.12,side*.3),
        new T.Vector3(side*.8,-.665,-.55),new T.Vector3(side*.43,-1.453,0),
      ];
      anchor=positions[face];
    } else {
      this.buildDrawer();size=.45;
      const positions=[
        new T.Vector3(side*.76,-.25,.885),new T.Vector3(side*.7,.15,-.813),
        new T.Vector3(-1.313,0,side*.43),new T.Vector3(1.313,0,side*.43),
        new T.Vector3(side*.72,.813,0),new T.Vector3(side*.72,-.813,0),
      ];
      anchor=positions[face];
    }
    normal=[new T.Vector3(0,0,1),new T.Vector3(0,0,-1),new T.Vector3(-1,0,0),new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,-1,0)][face];
    this.markNormal.copy(normal);
    this.marker=this.plate(state.value,size);
    this.marker.position.copy(anchor);
    this.marker.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);
    this.model.add(this.marker);
    const bounds=new T.Box3().setFromObject(this.model),center=bounds.getCenter(new T.Vector3());
    this.radius=bounds.getBoundingSphere(new T.Sphere()).radius;
    this.model.position.copy(center).multiplyScalar(-1);
    // Start with the marked face turned away. Even a front marking requires a real turn.
    const initialAngles=[new T.Euler(.12,Math.PI-.26,.02),new T.Euler(.12,-.26,.02),new T.Euler(.1,-.8,.02),new T.Euler(.1,.8,.02),new T.Euler(-.8,-.15,.02),new T.Euler(.8,-.15,.02)];
    this.pivot.quaternion.setFromEuler(initialAngles[face]);
    this.initial.copy(this.pivot.quaternion);
    this.status.textContent=state.found?'Chiffre repéré ! Il est conservé dans ton carnet privé.':'Glisse pour retourner l’objet. Cherche un chiffre gravé.';
    this.resize();
  }

  /** Rotate the object around screen Y and X axes, in radians. */
  rotate(dx:number,dy:number) {
    if(this.disposed||!this.key||!Number.isFinite(dx)||!Number.isFinite(dy))return;
    const yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),T.MathUtils.clamp(dx,-Math.PI,Math.PI));
    const pitch=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.clamp(dy,-Math.PI,Math.PI));
    this.pivot.quaternion.premultiply(yaw).premultiply(pitch).normalize();
    this.checkFound();this.draw();
  }

  private pointerDown=(event:PointerEvent)=>{
    if(this.pointer||event.button!==0)return;
    event.preventDefault();
    this.pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.renderer.domElement.focus({preventScroll:true});
    this.renderer.domElement.style.cursor='grabbing';
  };
  private pointerMove=(event:PointerEvent)=>{
    const start=this.pointer;if(!start||start.id!==event.pointerId)return;
    event.preventDefault();
    this.rotate((event.clientX-start.x)*.009,(event.clientY-start.y)*.009);
    start.x=event.clientX;start.y=event.clientY;
  };
  private pointerEnd=(event:PointerEvent)=>{
    if(this.pointer?.id!==event.pointerId)return;
    this.pointer=null;this.renderer.domElement.style.cursor='grab';
    if(this.renderer.domElement.hasPointerCapture(event.pointerId))this.renderer.domElement.releasePointerCapture(event.pointerId);
  };
  private keyDown=(event:KeyboardEvent)=>{
    const moves:Record<string,[number,number]>={ArrowLeft:[-.3,0],ArrowRight:[.3,0],ArrowUp:[0,-.3],ArrowDown:[0,.3]};
    const move=moves[event.key];if(!move)return;
    event.preventDefault();this.rotate(...move);
  };

  private checkFound() {
    if(this.reported||!this.marker||this.pivot.quaternion.angleTo(this.initial)<.6)return;
    this.scene.updateMatrixWorld(true);
    const normal=this.markNormal.clone().applyQuaternion(this.pivot.quaternion);
    const markPosition=this.marker.getWorldPosition(new T.Vector3());
    const direction=this.camera.getWorldDirection(new T.Vector3()).negate();
    if(normal.dot(direction)<.86)return;
    // Do not discover a plate through the statue or the drawer: its centre must be visible.
    this.raycaster.set(markPosition.clone().addScaledVector(direction,20),direction.clone().negate());
    const hit=this.raycaster.intersectObject(this.model,true)[0];
    if(hit?.object!==this.marker)return;
    this.reported=true;
    this.status.textContent='Chiffre repéré ! Il est conservé dans ton carnet privé.';
    this.onFound();
  }

  private resize() {
    if(this.disposed)return;
    const width=Math.max(1,this.container.clientWidth),height=Math.max(1,this.container.clientHeight),aspect=width/height;
    const extent=this.radius*1.08;
    this.camera.top=extent*Math.max(1,1/aspect);this.camera.bottom=-this.camera.top;
    this.camera.right=this.camera.top*aspect;this.camera.left=-this.camera.right;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);this.draw();
  }
  private draw() {
    if(this.disposed||this.frame)return;
    this.frame=requestAnimationFrame(()=>{this.frame=0;if(!this.disposed)this.renderer.render(this.scene,this.camera);});
  }
  private material(color:string,metalness=0,roughness=.65) {
    const material=new T.MeshStandardMaterial({color,metalness,roughness});this.materials.add(material);return material;
  }
  private mesh(geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0) {
    this.geometries.add(geometry);this.materials.add(material);
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);this.model.add(mesh);return mesh;
  }
  private box(w:number,h:number,d:number,material:T.Material,x=0,y=0,z=0,r=.035) {
    return this.mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),material,x,y,z);
  }
  private sphere(radius:number,material:T.Material,x:number,y:number,z:number,scale:[number,number,number]=[1,1,1]) {
    const mesh=this.mesh(new T.SphereGeometry(radius,28,20),material,x,y,z);mesh.scale.set(...scale);return mesh;
  }
  private texture(canvas:HTMLCanvasElement) {
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.textures.add(texture);return texture;
  }
  private plate(value:string,size:number) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#d3a347';ctx.fillRect(0,0,256,256);
    ctx.fillStyle='#263e42';ctx.fillRect(10,10,236,236);
    ctx.strokeStyle='#edcf80';ctx.lineWidth=3;ctx.strokeRect(19,19,218,218);
    ctx.fillStyle='#fff1b8';ctx.font='900 174px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(/^\d$/.test(value)?value:'?',128,136);
    // An underline keeps 6 and 9 unambiguous even when the prop is upside down.
    ctx.fillStyle='#d3a347';ctx.fillRect(95,222,66,5);
    const material=new T.MeshBasicMaterial({map:this.texture(canvas),toneMapped:false,side:T.FrontSide});
    this.materials.add(material);const geometry=new T.PlaneGeometry(size,size);this.geometries.add(geometry);
    return new T.Mesh(geometry,material);
  }

  private buildFrame() {
    const wood=this.material('#67412c'),gold=this.material('#c79b44',.62,.3),back=this.material('#78563b');
    this.box(3,2.6,.65,wood);
    this.box(2.8,2.4,.035,back,0,0,-.333,.01);
    this.box(3,.38,.15,gold,0,1.11,.29);this.box(3,.38,.15,gold,0,-1.11,.29);
    this.box(.28,2.25,.15,gold,-1.36,0,.29);this.box(.28,2.25,.15,gold,1.36,0,.29);
    for(const x of [-1.35,1.35])for(const y of [-1.15,1.15])this.sphere(.09,gold,x,y,.39,[1,1,.5]);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=448;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#244c56';ctx.fillRect(0,0,512,448);
    ctx.fillStyle='#37666c';ctx.beginPath();ctx.arc(256,205,174,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b76b45';ctx.beginPath();ctx.ellipse(256,448,150,149,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#efbb7e';ctx.beginPath();ctx.ellipse(256,211,93,115,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#542d25';ctx.beginPath();ctx.ellipse(256,112,99,52,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(161,102,190,31);
    ctx.fillStyle='#263541';ctx.fillRect(177,188,158,40);
    ctx.fillStyle='#f8ddb0';ctx.beginPath();ctx.ellipse(211,207,19,9,0,0,Math.PI*2);ctx.ellipse(299,207,19,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#202c37';ctx.beginPath();ctx.ellipse(216,208,6,8,0,0,Math.PI*2);ctx.ellipse(294,208,6,8,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#7d432e';ctx.lineWidth=8;ctx.beginPath();ctx.arc(256,263,27,.15,Math.PI-.15);ctx.stroke();
    ctx.fillStyle='#e3ad4e';for(const x of [65,447])for(const y of [56,392]){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();}
    const material=new T.MeshStandardMaterial({map:this.texture(canvas),roughness:.86});this.materials.add(material);
    this.mesh(new T.PlaneGeometry(2.38,1.78),material,0,0,.374);
    // Slotted fastenings make the rear recognisable when it is turned over.
    const dark=this.material('#3c3029');for(const x of [-1.2,1.2])for(const y of [-.95,.95])this.box(.12,.04,.012,dark,x,y,-.357,.005);
  }
  private buildBust() {
    const stone=this.material('#e0c18d',.08,.42),shade=this.material('#a38862'),eyes=this.material('#534d40'),gold=this.material('#b88d3f',.5,.38);
    this.box(1.9,.65,1.5,shade,0,-1.12,0);
    this.box(2,.12,1.6,gold,0,-.735,0);
    this.mesh(new T.CylinderGeometry(.5,.6,.34,32),stone,0,-.51,0);
    this.sphere(.75,stone,0,-.02,0,[1.03,.76,.67]);
    this.mesh(new T.CylinderGeometry(.27,.34,.65,24),stone,0,.42,0);
    this.sphere(.7,stone,0,1.08,0,[.78,1.03,.83]);
    this.sphere(.16,stone,-.55,1.02,0,[.5,1,.85]);this.sphere(.16,stone,.55,1.02,0,[.5,1,.85]);
    this.box(.15,.27,.22,stone,0,1.02,.57,.035);
    for(const x of [-.22,.22]){this.box(.17,.045,.04,eyes,x,1.18,.53,.01);this.box(.25,.09,.09,stone,x,1.28,.51,.025);}
    this.box(.24,.035,.045,eyes,0,.8,.54,.009);
    for(let i=0;i<9;i++){const angle=i/9*Math.PI*2;this.sphere(.18,stone,Math.cos(angle)*.43,1.64+Math.sin(angle)*.03,Math.sin(angle)*.38,[1,.75,1]);}
    // A draped shoulder gives the silhouette a sculpted rather than mannequin look.
    const drape=this.box(.18,.75,.93,stone,-.54,-.02,.04,.07);drape.rotation.z=-.22;
  }
  private buildDrawer() {
    const wood=this.material('#825434'),dark=this.material('#543b2d'),gold=this.material('#c9a455',.6,.32),lining=this.material('#26404b');
    this.box(2.6,1.6,1.6,wood);
    this.box(2.33,1.27,.055,dark,0,0,.805);
    this.box(2.19,1.12,.06,wood,0,0,.842);
    this.box(2.35,.09,1.45,dark,0,.62,0);this.box(2.35,.09,1.45,dark,0,-.62,0);
    this.box(.48,.09,.13,gold,0,.21,.943);
    for(const x of [-.27,.27])this.box(.07,.19,.07,gold,x,.21,.9);
    this.box(.18,.27,.035,gold,0,-.22,.888,.03);this.box(.04,.1,.02,lining,0,-.23,.911,.008);
    // Steel corner strips and wood seams remain visible from every angle.
    for(const x of [-1.22,1.22]){this.box(.12,1.6,1.62,gold,x,0,0,.018);}
    for(const y of [-.4,.4])this.box(2.38,.025,.013,dark,0,y,-.81,.004);
  }

  private clearModel() {
    this.model.clear();this.marker=null;
    for(const geometry of this.geometries)geometry.dispose();this.geometries.clear();
    for(const material of this.materials)material.dispose();this.materials.clear();
    for(const texture of this.textures)texture.dispose();this.textures.clear();
  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true;cancelAnimationFrame(this.frame);this.frame=0;this.observer.disconnect();
    const canvas=this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this.pointerDown);canvas.removeEventListener('pointermove',this.pointerMove);
    canvas.removeEventListener('pointerup',this.pointerEnd);canvas.removeEventListener('pointercancel',this.pointerEnd);canvas.removeEventListener('lostpointercapture',this.pointerEnd);canvas.removeEventListener('keydown',this.keyDown);
    if(this.pointer&&canvas.hasPointerCapture(this.pointer.id))canvas.releasePointerCapture(this.pointer.id);this.pointer=null;
    this.clearModel();this.renderer.renderLists.dispose();this.renderer.dispose();this.renderer.forceContextLoss();canvas.remove();this.status.remove();
    this.container.style.touchAction=this.priorTouchAction;this.container.style.position=this.priorPosition;
  }
}
