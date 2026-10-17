"""Original Art Deco museum, Blender 5.x. No downloaded assets.
Run: blender --background --python art/build_museum.py
Soft bevels, smooth turned metal, separated door pivots; static geometry batched by material.
"""
import bpy, os, math, json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.5):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
cream=mat('Limestone',(.63,.48,.30),0,.72);tile=mat('Ivory Marble',(.76,.68,.51),0,.32);tile2=mat('Smoked Marble',(.18,.23,.24),.12,.36)
walnut=mat('Walnut',(.105,.045,.031),0,.52);red=mat('Oxblood Velvet',(.19,.022,.033),0,.86);gold=mat('Brushed Brass',(.68,.40,.12),.78,.29)
iron=mat('Petrol Enamel',(.029,.10,.115),.5,.34);black=mat('Charcoal',(.014,.023,.027),.2,.55);green=mat('Jade',(.042,.27,.20),.15,.38)
light=mat('Warm Lamp',(.98,.80,.43),.1,.3);screen=mat('Terminal Phosphor',(.08,.64,.52),.15,.28);paper=mat('Artwork Ivory',(.89,.81,.62),0,.8);blue=mat('Artwork Teal',(.04,.32,.36),0,.7);orange=mat('Artwork Terracotta',(.65,.17,.055),0,.7)
groups={}
def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o
def cube(name,loc,size,m,bevel=.04,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.location=loc;o.scale=size;o.parent=parent
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Crafted edges','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    n=o.modifiers.new('Surface normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
    return o
def uv(name,loc,size,m,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=size;o.data.materials.append(m)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(name,loc,r,depth,m,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=depth);o=bpy.context.object;o.name=name;o.location=loc;o.parent=parent;o.data.materials.append(m)
    mod=o.modifiers.new('Lathed rim','BEVEL');mod.width=.025;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    return o
def curve(name,points,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(m);return o

# 12 x 8 metre dollhouse, front and right walls removed for a clear mobile view.
cube('MUS_Base',(0,0,-.25),(12.8,8.8,.48),walnut,.14)
cube('Brass foundation',(0,0,-.03),(12.5,8.5,.12),gold,.035)
for x in range(12):
    for y in range(8):cube('Marble inlay',(x-5.5,y-3.5,.045),(.99,.99,.09),tile if (x+y)%2 else tile2,.012)
cube('Back wall',(0,4,1.6),(12.3,.24,3.3),red,.045)
cube('Left cut wall',(-6,0,.65),(.24,8.2,1.4),red,.045)
for z in [.18,.36,1.05,2.85,3.12]:cube('Brass moulding',(0,3.82,z),(12.1,.09,.065),gold,.02)
for x in [-5.8,-2.3,2.1,5.8]:
    cube('Pilaster',(x,3.78,1.62),(.24,.22,2.98),cream,.025)
    cube('Capital',(x,3.7,2.94),(.48,.32,.18),gold,.025)
    cube('Column foot',(x,3.72,.32),(.45,.32,.24),walnut,.03)
# Framed original geometric paintings, relief kept shallow.
for i,x in enumerate([-4.35,-.35,4]):
    cube('Gilt frame',(x,3.64,2.03),(1.64,.16,1.44),gold,.065)
    cube('Frame inner',(x,3.53,2.03),(1.43,.07,1.23),walnut,.025)
    cube('Original artwork',(x,3.48,2.03),(1.31,.035,1.11),paper,.01)
    uv('Painted sun',(x-.25,3.445,2.22),(.3,.015,.3),orange if i!=1 else gold)
    for k in range(3):
        p=cube('Geometric brushstroke',(x+.12+k*.13,3.425,1.85+k*.12),(.2,.025,.65),blue if i!=2 else green,.012);p.rotation_euler[1]=-.4
    cyl('Picture lamp base',(x,3.43,2.96),.12,.1,gold).rotation_euler[0]=math.pi/2
    cube('Picture lamp',(x,3.34,2.86),(.8,.16,.10),gold,.035)
# Grand vault and a separate hinge and door.
vault=empty('POST_Vault',(-3.65,1.65,0));groups['vault']=vault
cube('Vault cabinet',(0,0,1.18),(2.25,1.4,2.3),iron,.15,vault)
cube('Vault inner darkness',(0,-.72,1.18),(1.9,.035,1.95),black,.08,vault)
for i in range(6):cube('Gold bar',((i%3-.9)*.42,-.47,.35+(i//3)*.23),(.38,.44,.2),gold,.025,vault)
hinge=empty('VaultDoorPivot',(-1,-.79,.12),vault)
cube('Vault door',(1,0,1.06),(2,.22,2.1),iron,.13,hinge)
cube('Door brass fillet',(1,-.13,1.06),(1.78,.06,1.86),gold,.09,hinge)
cube('Door inset',(1,-.18,1.06),(1.64,.06,1.72),iron,.08,hinge)
wheel=cyl('Vault wheel',(1,-.28,1.07),.39,.075,gold,hinge);wheel.rotation_euler[0]=math.pi/2
hub=cyl('Wheel hub',(1,-.36,1.07),.12,.15,black,hinge);hub.rotation_euler[0]=math.pi/2
for a in range(3):
    o=cube('Wheel spoke',(1,-.4,1.07),(.62,.07,.055),gold,.02,hinge);o.rotation_euler[1]=a*math.tau/3
for z in [.43,1.03,1.63]:cube('Visible deadbolt',(1.78,-.25,z),(.17,.12,.12),gold,.025,hinge)
empty('ANCHOR_drill',(-3.65,.65,2.5))
# One loot group, several cabinets, shared stock.
loot=empty('POST_Loot',(.5,1.5,0));groups['loot']=loot
for i in range(3):
    cube('Locker body',((i-1)*.65,0,.9),(.62,.85,1.75),walnut,.06,loot)
    for j in range(3):
        cube('Locker brass face',((i-1)*.65,-.46,.31+j*.56),(.54,.08,.49),gold,.035,loot)
        cube('Locker enamel inset',((i-1)*.65,-.51,.31+j*.56),(.46,.025,.4),iron,.025,loot)
        cyl('Locker keyhole',((i-1)*.65,-.54,.31+j*.56),.04,.025,black,loot).rotation_euler[0]=math.pi/2
empty('ANCHOR_loot',(.5,.9,2.0))
# Security group: desk, keyboard, screen, electrical box and articulated camera.
secure=empty('POST_Security',(4,-.4,0));groups['secure']=secure
cube('Console body',(0,0,.64),(1.75,1.1,1.2),walnut,.09,secure)
cube('Console top',(0,0,1.28),(1.88,1.22,.13),gold,.045,secure)
cube('Monitor',(0,.20,1.75),(1.15,.2,.72),black,.065,secure)
cube('Monitor glass',(0,.083,1.75),(.98,.025,.55),screen,.025,secure)
for j in range(3):cube('Screen scanline',(0,.066,1.57+j*.15),(.72,.012,.025),green,.003,secure)
cube('Keyboard',(0,-.3,1.39),(1.07,.34,.06),black,.025,secure)
for j in range(3):
    for i in range(10):cube('Key',(i*.089-.4,j*.085-.39,1.435),(.06,.06,.02),cream,.008,secure)
cube('Electrical box',(1.18,.10,1.17),(.58,.55,.8),iron,.06,secure)
cube('Electrical cover',(1.18,-.2,1.17),(.48,.06,.7),gold,.035,secure)
for z in [.98,1.17,1.36]:uv('Status LED',(1.18,-.24,z),(.045,.025,.045),screen,secure)
pole=cyl('Camera pole',(1.05,.38,1.7),.05,3.3,black,secure)
cam=empty('CameraPivot',(1.05,.38,3.2),secure)
cube('Camera housing',(-.2,-.1,0),(.65,.48,.34),cream,.085,cam)
cyl('Camera lens',(-.2,-.37,0),.115,.12,black,cam).rotation_euler[0]=math.pi/2
empty('ANCHOR_secure',(4,-.9,2.8))
# Exhibits and absurd original jade sculptures.
for x,y in [(-5,-.35),(2.5,2.35)]:
    cube('Exhibit pedestal',(x,y,.47),(.75,.75,.9),cream,.065)
    cube('Pedestal brass cap',(x,y,.96),(.84,.84,.09),gold,.025)
    uv('Jade pear',(x,y,1.28),(.27,.27,.35),green)
    uv('Pear top',(x+.07,y,1.54),(.16,.18,.18),green)
    curve('Pear stem',[(x+.07,y,1.68),(x+.12,y,1.83)],.035,gold)
for x,y in [(-1.4,3),(3.2,3)]:
    cube('Display plinth',(x,y,.55),(.85,.65,1.05),walnut,.06)
    cube('Display rim',(x,y,1.1),(.95,.75,.1),gold,.025)
    uv('Museum egg',(x,y,1.36),(.19,.19,.28),gold)
# Entry rug and bags, four original curved duffels.
cube('Entry carpet',(0,-2.55,.13),(7.9,1.85,.06),red,.06)
for y in [-3.39,-1.71]:cube('Carpet border',(0,y,.17),(7.65,.035,.012),gold,.005)
for i,c in enumerate([( .85,.46,.04),(.02,.46,.43),(.82,.23,.045),(.38,.12,.47)]):
    m=mat('Bag'+str(i),c,0,.8);bag=empty('PROP_Bag_'+str(i),(-3+i*1.8,-2.8,0));groups['bag'+str(i)]=bag
    cube('Duffel body',(0,0,.35),(.74,.49,.55),m,.17,bag)
    cube('Duffel end',(0,-.26,.34),(.54,.05,.35),black,.09,bag)
    cube('Name badge',(0,-.30,.38),(.20,.018,.13),gold,.02,bag)
    for x in [-.23,.23]:cube('Bag strap',(x,0,.38),(.06,.52,.59),black,.026,bag)
    uv('Handle',(0,0,.67),(.17,.045,.12),black,bag)
    empty('ANCHOR_bag'+str(i),(-3+i*1.8,-2.8,1.1))
for x in [-5.5,5.5]:
    cyl('Planter',(x,-2.45,.35),.32,.6,gold)
    for i in range(7):
        a=i*math.tau/7;leaf=uv('Plant leaf',(x+math.cos(a)*.19,-2.45+math.sin(a)*.19,.88),(.09,.09,.43),green);leaf.rotation_euler=(math.sin(a)*.5,math.cos(a)*.5,0)
for x in [-2,1.8]:
    cyl('Rope post',(x,-.5,.48),.045,.85,gold);cyl('Rope foot',(x,-.5,.12),.17,.10,gold);uv('Rope finial',(x,-.5,.95),(.095,.095,.095),gold)
curve('Velvet rope',[(-2,-.5,.91),(-.1,-.5,.65),(1.8,-.5,.91)],.035,red)
# Bench at left; escape van visible outside front edge.
cube('Bench cushion',(-4,-1.3,.48),(1.3,.55,.18),red,.08)
for x in [-4.48,-3.52]:cube('Bench leg',(x,-1.3,.25),(.09,.45,.45),gold,.025)
van=empty('PROP_Escape',(4.8,-4.7,0))
cube('Van body',(0,0,.66),(1.5,2.35,.94),iron,.18,van)
cube('Van cabin',(0,-.55,1.12),(1.4,1.05,.66),cream,.16,van)
cube('Windshield',(0,-1.05,1.2),(1.12,.03,.34),black,.06,van)
for x in [-.72,.72]:
    for y in [-.75,.75]:cyl('Van wheel',(x,y,.34),.28,.17,black,van).rotation_euler[1]=math.pi/2
for x in [-.48,.48]:uv('Headlight',(x,-1.2,.7),(.14,.035,.10),light,van)

# Convert curves and batch only root static meshes. Keep all gameplay pivots separate.
bpy.ops.object.select_all(action='DESELECT')
for o in list(bpy.context.scene.objects):
    if o.type=='CURVE':o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
for m in list(bpy.data.materials):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent is None and o.data.materials and o.data.materials[0]==m]
    if len(objects)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='MUS_Static_'+m.name
os.makedirs(os.path.join(ROOT,'art','source'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','source','museum-authoring.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models','museum.glb'),export_format='GLB',export_animations=False,export_extras=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
print('MUSEUM_EXPORTED',triangles,'triangles')
