"""Original Plan Foireux character. Run with Blender --background --python this_file."""
import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, 'public', 'models'), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.65, metallic=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Roughness'].default_value=roughness; n.inputs['Metallic'].default_value=metallic
    return m
skin=material('Skin',(.69,.36,.16),.68)
cloth=material('Cloth',(.95,.52,.055),.88)
knit=cloth
dark=material('Mask',(.006,.009,.013),.98)
bag=material('Backpack',(.10,.12,.13),.85)
edge=material('BagTrim',(.17,.19,.19),.76)
pants=material('Trousers',(.055,.074,.095),.95)
white=material('Ivory',(.95,.91,.78),.4)
iris=material('Iris',(.12,.065,.028),.35)
lip=material('Smile',(.18,.045,.028),.85)
sole=material('Sole',(.43,.40,.33),.9)
metal=material('Zipper',(.67,.57,.33),.4,.6)

def group(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o)
    o.location=loc; o.parent=parent; return o
hero=group('Burglar')
def sphere(name,loc,scale,mat,parent=hero,segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=12,location=(0,0,0))
    o=bpy.context.object; o.name=name; o.parent=parent; o.location=loc; o.scale=scale
    o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cube(name,loc,scale,mat,parent=hero,bevel=.07):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o=bpy.context.object; o.name=name; o.parent=parent; o.location=loc; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    mod=o.modifiers.new('Soft sewn edge','BEVEL');mod.width=bevel;mod.segments=3
    mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def curve(name,points,radius,mat,parent=hero):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent;c.materials.append(mat);return o

# Rounded jacket with hem, pouch pocket, hood and drawstrings.
sphere('Hoodie',(0,0,1.13),(.34,.245,.43),cloth)
sphere('Hood',(0,.105,1.47),(.29,.235,.16),cloth)
cube('Hem',(0,-.005,.80),(.51,.34,.10),cloth,bevel=.045)
cube('KangarooPocket',(0,-.23,1.03),(.34,.055,.19),cloth,bevel=.045)
for x in [-.10,.10]:curve('Drawstring',[(x,-.23,1.47),(x*.85,-.26,1.35),(x*1.05,-.245,1.30)],.009,white)
curve('PocketSeam',[(-.16,-.267,1.06),(0,-.278,.98),(.16,-.267,1.06)],.004,metal)

# Independent limb pivots used by runtime animation. Front is -Y in Blender.
for sign,suffix in [(-1,'L'),(1,'R')]:
    leg=group('Leg'+suffix,(sign*.17,0,.80),hero)
    sphere('Trouser'+suffix,(0,0,-.245),(.135,.15,.33),pants,leg)
    cube('Sneaker'+suffix,(0,-.055,-.67),(.25,.39,.19),dark,leg,.06)
    cube('Sole'+suffix,(0,-.07,-.755),(.265,.41,.055),sole,leg,.02)
    for y in [-.15,-.11,-.07]:curve('Lace'+suffix,[(-.065,y,-.567),(.065,y,-.567)],.009,white,leg)
    arm=group('Arm'+suffix,(sign*.30,0,1.40),hero)
    sleeve=sphere('Sleeve'+suffix,(sign*.075,-.015,-.20),(.135,.14,.29),cloth,arm)
    sleeve.rotation_euler[1]=-sign*.20
    sphere('Glove'+suffix,(sign*.13,-.055,-.45),(.105,.11,.135),dark,arm)
    sphere('Thumb'+suffix,(sign*.055,-.12,-.43),(.05,.065,.075),dark,arm,16)

head=group('Head',(0,0,1.91),hero)
sphere('Face',(0,-.015,0),(.405,.32,.435),skin,head,32)
for s in [-1,1]:
    sphere('Ear',(s*.39,-.005,-.015),(.095,.07,.135),skin,head)
    sphere('EarInside',(s*.415,-.061,-.015),(.042,.016,.063),lip,head,16)
    # Black elliptical eye surrounds with actual open centers, curved across face.
    cx=s*.166
    verts=[]; faces=[]
    for radius in [1,.65]:
        for i in range(32):
            a=i*math.tau/32;x=cx+math.cos(a)*.203*radius;z=.07+math.sin(a)*.138*radius
            y=-.34+abs(x)**2*.30
            verts.append((x,y,z))
    for i in range(32):faces.append((i,(i+1)%32,(i+1)%32+32,i+32))
    mesh=bpy.data.meshes.new('MaskRing');mesh.from_pydata(verts,[],faces);mesh.materials.append(dark)
    o=bpy.data.objects.new('DominoMask',mesh);bpy.context.collection.objects.link(o);o.parent=head
    mod=o.modifiers.new('MaskThickness','SOLIDIFY');mod.thickness=.003
    sphere('EyeWhite',(cx,-.334,.075),(.104,.013,.045),white,head)
    sphere('Iris',(cx+.018,-.347,.075),(.033,.007,.037),iris,head)
    sphere('Pupil',(cx+.022,-.354,.075),(.019,.004,.028),dark,head,16)
    sphere('EyeShine',(cx+.009,-.360,.092),(.008,.003,.010),white,head,12)
    curve('Brow',[(cx-.09,-.29,.235),(cx,-.327,.255),(cx+.085,-.291,.235)],.022,dark,head)
cube('MaskBridge',(0,-.35,.075),(.15,.026,.078),dark,head,.02)
curve('MaskStrap',[(-.36,-.12,.07),(-.39,.10,.07),(0,.31,.07),(.39,.10,.07),(.36,-.12,.07)],.028,dark,head)
sphere('Nose',(0,-.353,-.045),(.079,.078,.081),skin,head)
sphere('Smile',(0,-.280,-.210),(.165,.029,.076),lip,head)
sphere('Teeth',(0,-.306,-.185),(.133,.012,.025),white,head)
curve('Cheek',[(-.21,-.281,-.16),(-.225,-.278,-.20)],.011,lip,head)
curve('Cheek',[(.21,-.281,-.16),(.225,-.278,-.20)],.011,lip,head)
# Oversized knitted beanie, folded cuff and individual soft ribs.
sphere('Beanie',(0,.013,.32),(.426,.345,.29),knit,head,32)
sphere('BeanieSlouch',(-.13,.05,.51),(.26,.25,.14),knit,head)
for i in range(40):
    a=i*math.tau/40
    curve('KnitRib',[(math.cos(a)*.407,math.sin(a)*.323,.27),(math.cos(a)*.408,math.sin(a)*.323,.38),(math.cos(a)*.34,math.sin(a)*.28,.48)],.008,knit,head)
# cuff torus oriented around vertical axis
bpy.ops.mesh.primitive_torus_add(major_radius=.35,minor_radius=.062,major_segments=40,minor_segments=8)
o=bpy.context.object;o.name='BeanieCuff';o.parent=head;o.location=(0,0,.23);o.scale=(1.10,.91,1.25);o.data.materials.append(knit)
cube('BeanieLabel',(.16,-.334,.235),(.11,.02,.07),dark,head,.008)
cube('LabelStitch',(.16,-.348,.235),(.065,.009,.011),white,head,.003)

# Bulky backpack with pockets, handle, zipper and visible straps.
cube('Backpack',(0,.285,1.18),(.56,.29,.62),bag,hero,.105)
cube('PackPocket',(0,.46,1.07),(.41,.105,.25),edge,hero,.045)
cube('PackFlap',(0,.45,1.39),(.48,.08,.13),edge,hero,.035)
curve('PackHandle',[(-.10,.29,1.48),(-.08,.29,1.60),(.08,.29,1.60),(.10,.29,1.48)],.026,bag)
for s in [-1,1]:
    curve('ShoulderStrap',[(s*.20,.22,1.46),(s*.235,-.13,1.43),(s*.23,-.24,1.17),(s*.22,.14,.91)],.035,bag)
    cube('StrapBuckle',(s*.23,-.245,1.18),(.063,.03,.085),metal,hero,.01)

for o in bpy.context.scene.objects:
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','burglar.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models','burglar.glb'),export_format='GLB',export_animations=False)
print('PLAN_FOIREUX_CHARACTER_EXPORTED')

# Portraits of the exact same model for the player list, with no second asset design.
portrait_dir=os.path.join(ROOT,'public','portraits');os.makedirs(portrait_dir,exist_ok=True)
scene=bpy.context.scene;scene.render.resolution_x=160;scene.render.resolution_y=192;scene.render.resolution_percentage=100
scene.render.film_transparent=True
formats=[i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
scene.render.image_settings.file_format=next(i for i in formats if i=='PNG')
scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.28,.28,.28)
bpy.ops.object.camera_add(location=(2.6,-7.5,3.5))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.88))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1.42;scene.camera=camera
for loc,power,size in [((-3,-4,6),450,4),((4,1,5),600,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(Vector((0,0,1.5))-light.location).to_track_quat('-Z','Y').to_euler()
colors=['ecac32','28aaa5','ee7836','9d65b2','5f8ce1','df647c']
for i,color in enumerate(colors):
    srgb=[int(color[k:k+2],16)/255 for k in (0,2,4)]
    rgb=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb]
    next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*rgb,1)
    scene.render.filepath=os.path.join(portrait_dir,f'{i}.png');bpy.ops.render.render(write_still=True)
print('PLAN_FOIREUX_PORTRAITS_RENDERED')
