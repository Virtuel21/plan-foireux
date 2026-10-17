"""Fit the native safe via its parent; inspect the sill and door sweep.

blender --background museum-originals.blend --python art/fit_safe_in_arch.py -- OUT --save --render
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index('--') + 1:]
out = Path(args[0]).resolve()
placement_file = Path(__file__).resolve().parents[1] / 'scenes/safe-placement.json'
if not placement_file.exists():
    placement_file = Path(__file__).with_name('safe-placement.json')
placement = json.loads(placement_file.read_text(encoding='utf-8-sig'))
scene = bpy.context.scene
safe = next(o for o in scene.objects if o.name.startswith('POST_Vault') and o.parent is None)
px, py, pz = placement['position']
sx, sy, sz = placement['scale']
safe.location = (px, -pz, py)
safe.rotation_euler.z = placement['rotationY']
safe.scale = (sx, sz, sy)
bpy.context.view_layer.update()
body = next(o for o in safe.children_recursive if o.name.startswith('SafeNativeBody'))
leaf = next(o for o in safe.children_recursive if o.name.startswith('SafeNativeDoor'))
pivot = next(o for o in safe.children_recursive if o.name.startswith('VaultDoorPivot'))
decor = next(o for o in scene.objects if o.parent is None and o.name.startswith('Meshy original museum'))
background = next(o for o in decor.children_recursive if o.type == 'MESH')

def tree(obj):
    return BVHTree.FromPolygons([obj.matrix_world @ v.co for v in obj.data.vertices],
                                [tuple(p.vertices) for p in obj.data.polygons], all_triangles=True)

bg_tree = tree(background)
contacts = bg_tree.overlap(tree(body))
contact_heights = [max((background.matrix_world @ background.data.vertices[i].co).z
                      for i in background.data.polygons[a].vertices) for a, b in contacts]
assert all(z < py + .015 for z in contact_heights), 'Case intersects museum above sill contact'
old_rotation = pivot.rotation_quaternion.copy()
sweep = []
for i in range(17):
    angle = -1.384 * i / 16
    pivot.rotation_quaternion = Quaternion((0, 0, 1), angle)
    bpy.context.view_layer.update()
    hits = len(bg_tree.overlap(tree(leaf)))
    sweep.append({'degrees': math.degrees(angle), 'museumTriangleContacts': hits})
    assert hits == 0, 'Door strikes the arch or the plant'
pivot.rotation_quaternion = old_rotation
bpy.context.view_layer.update()
points = [body.matrix_world @ v.co for v in body.data.vertices]
low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
inverse = background.matrix_world.inverted()
supports = []
for x in [low.x + .02, (low.x + high.x) / 2, high.x - .02]:
    for y in [low.y + .04, (low.y + high.y) / 2, high.y - .04]:
        hit, loc, normal, face = background.ray_cast(inverse @ Vector((x, y, .4)),
                                    (inverse.to_3x3() @ Vector((0, 0, -1))).normalized())
        assert hit
        height = (background.matrix_world @ loc).z
        supports.append({'point': [x, y], 'sillHeight': height, 'baseGap': low.z - height})
assert all(abs(p['baseGap']) < .012 for p in supports), 'Case overhangs or floats above the sill'
report = {'placement': placement, 'bodyBoundsBlender': {'min': list(low), 'max': list(high)},
          'caseMuseumContacts': len(contacts), 'contactMeaning': 'Stone sill only, all below safe base + 15 mm',
          'supports': supports, 'doorSweep': sweep, 'meshChanges': False, 'textureChanges': False}
folder = out / 'validation/safe-placement'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'blender-placement.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
if '--save' in args:
    scene.render.filepath = str(out / 'renders/museum-originals.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'sources/museum-originals.blend'))
if '--render' in args:
    bpy.ops.render.render(write_still=True)
print('SAFE_FIT_VERIFIED', json.dumps(report), flush=True)
