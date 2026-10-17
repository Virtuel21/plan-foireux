"""Money Tour cash units. Run in Blender; creates its own scene, preserving others."""
import bpy, math
from mathutils import Vector

scene=bpy.data.scenes.new('05 · Money Tour wealth')
bpy.context.window.scene=scene
# Original Money Tour authoring geometry reused for Plan Foireux at Julien's request.
def mat(name,color,metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=.32 if metal else .65
    m.diffuse_color=(*color,1)
    return m
green=mat('Wealth · fresh banknotes',(.22,.56,.27))
edge=mat('Wealth · paper edges',(.67,.83,.43))
ink=mat('Wealth · note engraving',(.08,.30,.17))
band=mat('Wealth · paper strap',(.99,.85,.40))
gold=mat('Wealth · gold',(.96,.62,.09),.72)
mark=mat('Wealth · gold stamp',(.52,.26,.025),.65)
def root(name):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);return o
def box(name,loc,scale,material,parent=None,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new('Rounded edges','BEVEL');m.width=bevel;m.segments=2
    o.parent=parent;return o
note=root('banknote_bundle')
for i in range(8):
    box('Layered note', (0,0,.012+i*.026),(.70,.37,.025),edge if i%2 else green,note,.008)
box('Printed top note',(0,0,.212),(.67,.34,.006),green,note,.008)
for x in [-.285,.285]:box('Fine print',(x,0,.218),(.014,.27,.004),ink,note,.001)
for y in [-.14,.14]:box('Fine print',(0,y,.218),(.58,.01,.004),ink,note,.001)
box('Cream strap',(0,0,.117),(.115,.388,.24),band,note,.012)
bar=root('gold_bar')
v=[(-.34,-.18,0),(.34,-.18,0),(.34,.18,0),(-.34,.18,0),(-.27,-.125,.19),(.27,-.125,.19),(.27,.125,.19),(-.27,.125,.19)]
mesh=bpy.data.meshes.new('Beveled ingot');mesh.from_pydata(v,[],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]);mesh.update()
o=bpy.data.objects.new('Gold ingot',mesh);scene.collection.objects.link(o);o.parent=bar;o.data.materials.append(gold)
m=o.modifiers.new('Soft milled edges','BEVEL');m.width=.025;m.segments=3
for y in [-.045,.035]:box('Hallmark',(0,y,.192),(.19,.012,.006),mark,bar,.002)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.038,location=(.18,0,.191))
o=bpy.context.object;o.name='Mint seal';o.scale.z=.1;o.parent=bar;o.data.materials.append(mark)
bar.location.x=1.05

import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bar.location.x=0
# Apply bevels before compacting; all source layers and stamped materials stay editable.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','source','wealth-authoring.blend'))
for o in list(scene.objects):
    if o.type!='MESH':continue
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    if len(o.data.polygons)>20:
        mod=o.modifiers.new('Mobile wealth budget','DECIMATE');mod.ratio=.32;bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in o.data.polygons:poly.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','source','wealth.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models','wealth.glb'),export_format='GLB',export_animations=False)
print('WEALTH_EXPORTED',sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH'))
