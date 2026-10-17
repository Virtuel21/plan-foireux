"""Original articulated-hand prop, smooth beveled drill with visible chuck and vents."""
import bpy, math, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.38;return m
gold=material('Drill Enamel',(.78,.39,.055));dark=material('Rubber Grip',(.025,.044,.05));steel=material('Drill Steel',(.4,.47,.49),.8)
def cube(name,loc,size,m,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.location=loc;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    b=o.modifiers.new('Rounded casing','BEVEL');b.width=bevel;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
    for p in o.data.polygons:p.use_smooth=True
    n=o.modifiers.new('Machined normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
    return o
cube('POST_Drill',(0,-.035,.10),(.16,.29,.17),gold,.035)
cube('Grip',(0,.015,-.035),(.105,.11,.20),dark,.025)
cube('Battery',(0,.025,-.13),(.18,.15,.08),gold,.018)
for i in range(4):cube('Motor vent',(.083,.04-i*.035,.1),(.009,.012,.085),dark,.004)
for y,r,d in [(-.21,.06,.06),(-.30,.025,.15)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=r,depth=d,location=(0,y,.1));o=bpy.context.object;o.rotation_euler[0]=math.pi/2;o.data.materials.append(steel)
    for p in o.data.polygons:p.use_smooth=True
for m in [gold,dark,steel]:
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==m];bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=m.name.replace(' ','_')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','source','drill.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models','drill.glb'),export_format='GLB',export_animations=False)
print('DRILL_EXPORTED')
