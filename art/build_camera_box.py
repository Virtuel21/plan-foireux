"""Small closed camera junction box, made directly at its final polygon count.
No Meshy credits; no simplification of an existing model.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, colour, metallic=0, roughness=.55):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*colour, 1)
    material.use_nodes = True
    node = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*colour, 1)
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Roughness'].default_value = roughness
    return material


cream = mat('Ivory enamel', (.72, .58, .37))
lid = mat('Ivory lid', (.88, .74, .50))
gold = mat('Brass fittings', (.83, .44, .085), .75, .3)
dark = mat('Seal and warning', (.025, .03, .03))
yellow = mat('Warning yellow', (.98, .64, .025))
conduit = mat('Metal conduit', (.30, .31, .29), .5)


def cube(name, location, dimensions, material, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new('Small edge bevel', 'BEVEL')
        modifier.width, modifier.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def cylinder(name, location, radius, depth, material, front=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if front:
        obj.rotation_euler.x = math.pi / 2
    obj.data.materials.append(material)
    return obj


cube('Housing', (0, 0, .36), (.49, .22, .72), cream, .025)
cube('Door seal', (0, -.119, .36), (.425, .018, .65), dark, .025)
cube('Closed lid', (0, -.139, .36), (.425, .032, .65), lid, .025)
cube('Raised lid border', (0, -.16, .36), (.36, .009, .585), cream, .018)
cube('Lid inset', (0, -.167, .36), (.335, .01, .56), lid, .016)
for z in [.16, .56]:
    cylinder('Brass hinge', (-.215, -.125, z), .024, .11, gold)
    cube('Hinge leaf', (-.185, -.158, z), (.055, .022, .075), gold, .004)
    cylinder('Lid latch', (.16, -.19, z), .022, .022, gold, True)
    cube('Latch slot', (.16, -.204, z), (.004, .002, .02), dark, 0)
for x in [-.18, .18]:
    for z in [.09, .63]:
        cylinder('Cover screw', (x, -.181, z), .009, .008, gold, True)
cylinder('Cable gland', (0, .02, .74), .044, .05, cream)
cylinder('Conduit', (0, .02, .99), .018, .48, conduit)
for z in [.80, 1.19]:
    cylinder('Conduit clamp', (0, .02, z), .024, .025, conduit)


def flat(name, points, y, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(x, y, z) for x, z in points], [], [tuple(range(len(points)))])
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)


flat('Warning border', [(-.12, .25), (.12, .25), (0, .485)], -.177, dark)
flat('Warning triangle', [(-.098, .262), (.098, .262), (0, .46)], -.179, yellow)
flat('Lightning bolt', [(.007, .437), (-.044, .345), (-.005, .345), (-.015, .286), (.05, .375), (.013, .375)], -.181, dark)

# Batch this new asset by material; no reduction or remeshing is involved.
for material in [cream, lid, gold, dark, yellow, conduit]:
    objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.data.materials[0] == material]
    if not objects:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = 'CameraBox_' + material.name

root = bpy.data.objects.new('CameraJunctionBox', None)
bpy.context.collection.objects.link(root)
for obj in list(bpy.context.scene.objects):
    if obj != root:
        obj.parent = root
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/source/camera-box.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'public/models/camera-box.glb'), export_format='GLB', export_animations=False)
triangles = sum(sum(len(face.vertices) - 2 for face in obj.data.polygons) for obj in root.children if obj.type == 'MESH')
print('CAMERA_BOX_TRIANGLES', triangles, flush=True)
