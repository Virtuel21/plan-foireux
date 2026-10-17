"""Render the original open junction box for the cable mini-game only."""
import bpy
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'art/source/electrical-box.glb'))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
center = (low + high) / 2
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x, scene.render.resolution_y = 1200, 650
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('Junction box studio')
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs[0].default_value = (.25, .25, .25, 1)
background.inputs[1].default_value = .7
for location, power in [((-3, -4, 5), 500), ((4, -2, 3), 300), ((0, 3, 4), 400)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy, light.data.size = power, 4
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.location = center + Vector((0, -5, 0))
camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type, camera.data.ortho_scale = 'ORTHO', 2.5
scene.camera = camera
scene.view_settings.view_transform = 'AgX'
(ROOT / 'public/images').mkdir(exist_ok=True)
scene.render.filepath = str(ROOT / 'public/images/electrical-board.png')
bpy.ops.render.render(write_still=True)
print('ORIGINAL_ELECTRICAL_MINIGAME_RENDER_SAVED', flush=True)
