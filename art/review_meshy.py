"""Import the original GLBs into editable Blender scenes. Never re-export assets.

blender --background --factory-startup --python art/review_meshy.py -- PRODUCTION
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

OUT = Path(sys.argv[sys.argv.index('--') + 1]).resolve()


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = set(bpy.data.objects) - before
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for obj in imported:
        if obj.parent not in imported:
            obj.parent = root
    return root, imported


def bounds(objects):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objects if o.type == 'MESH' for c in o.bound_box]
    return Vector(tuple(min(p[i] for p in pts) for i in range(3))), Vector(tuple(max(p[i] for p in pts) for i in range(3)))


def fit(path, name, location, height):
    root, imported = load(path, name)
    low, high = bounds(imported)
    scale = height / (high.z - low.z)
    content = bpy.data.objects.new(name + '_Placement', None)
    bpy.context.collection.objects.link(content)
    content.parent = root
    for obj in imported:
        if obj.parent == root:
            obj.parent = content
    content.scale = (scale,) * 3
    content.location = (-(low.x + high.x) * scale / 2, -(low.y + high.y) * scale / 2, -low.z * scale)
    root.location = location
    return root


def studio(target, scale, room=False):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x = 1440 if room else 900
    scene.render.resolution_y = 960 if room else 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world = bpy.data.worlds.new('Originals review world')
    scene.world.use_nodes = True
    background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    background.inputs[0].default_value = (.08, .11, .13, 1)
    background.inputs[1].default_value = .8
    for loc, power, size in [((-5, -7, 12), 1800 if room else 500, 8), ((8, -2, 10), 1200 if room else 400, 6), ((0, 6, 10), 1400 if room else 500, 6)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        obj = bpy.context.object
        obj.data.energy, obj.data.size = power, size
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = 'Review camera'
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = scale
    camera.location = Vector(target) + Vector((8.2, -15.5, 10.4) if room else (.65, -4, .55))
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    scene.view_settings.view_transform = 'AgX'


reset()
decor, imported = load(OUT / 'raw/museum-complete.glb', 'Meshy original museum')
low, high = bounds(imported)
sx, sy = 12 / (high.x - low.x), 8 / (high.y - low.y)
decor.scale = (sx, sy, sx)
decor.location = (-(low.x + high.x) * sx / 2, -(low.y + high.y) * sy / 2, .14 - -.244910535 * sx)
safe, imported = load(OUT / 'sources/safe-hinged.glb', 'POST_Vault')
safe.location = (-5.22, 1.85, .325)
fit(OUT / 'raw/lockers.glb', 'POST_Loot', (.8, 2.2, .15), 1.6)
camera_box, imported = load(OUT / 'models/camera-box.glb', 'CameraClosedBox')
camera_box.location = (5.2, 3.3, 1.65)
guard, imported = load(OUT / 'models/guard.glb', 'Meshy original guard')
guard.location = (-2.4, 1.75, .15)
bpy.context.scene.frame_set(10)
studio((0, 0, 1.0), 16.8, True)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        assert all(mod.type == 'ARMATURE' for mod in obj.modifiers), 'No simplification modifiers allowed'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'sources/museum-originals.blend'))
bpy.context.scene.render.filepath = str(OUT / 'renders/museum-originals.png')
bpy.ops.render.render(write_still=True)

for name in ['male', 'female']:
    reset()
    root, imported = load(OUT / 'models' / f'{name}.glb', 'Meshy original ' + name)
    for obj in imported:
        if obj.animation_data:
            for track in obj.animation_data.nla_tracks:
                track.mute = 'idle' not in track.name.lower()
    bpy.context.scene.frame_set(10)
    studio((0, 0, .84), 2.1)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'sources' / f'{name}-original.blend'))
    bpy.context.scene.render.filepath = str(OUT / 'renders' / f'{name}-original.png')
    bpy.ops.render.render(write_still=True)
print('ORIGINAL_SCENES_SAVED', flush=True)
