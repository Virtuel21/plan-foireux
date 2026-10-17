"""Identify the disconnected native Meshy door pieces; never rewrite the GLB.
The output only describes which original triangles belong to the moving leaf.
"""
import collections
import hashlib
import json
from pathlib import Path
import struct
import argparse
import copy
import math
from assemble_meshy import write_glb

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'public/models/safe-box.glb'
raw = path.read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + size])
binary = raw[28 + size:]


def values(index, fmt, stride):
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    stride = view.get('byteStride', stride)
    return [struct.unpack_from(fmt, binary, offset + i * stride) for i in range(accessor['count'])]


primitive = doc['meshes'][0]['primitives'][0]
positions = values(primitive['attributes']['POSITION'], '<fff', 12)
indices = [v[0] for v in values(primitive['indices'], '<I', 4)]
parents = list(range(len(positions)))


def find(index):
    while parents[index] != index:
        parents[index] = parents[parents[index]]
        index = parents[index]
    return index


def union(a, b):
    parents[find(a)] = find(b)


# UV seams may duplicate a position. This lookup is for connectivity analysis
# only: original vertex positions, indices, normals and UVs remain untouched.
lookup = {}
for i, point in enumerate(positions):
    key = tuple(round(v, 5) for v in point)
    if key in lookup:
        union(i, lookup[key])
    else:
        lookup[key] = i
for i in range(0, len(indices), 3):
    union(indices[i], indices[i + 1])
    union(indices[i], indices[i + 2])
groups = collections.defaultdict(list)
for i in range(0, len(indices), 3):
    groups[find(indices[i])].append(i // 3)
door = []
for triangles in groups.values():
    vertices = {index for t in triangles for index in indices[t * 3:t * 3 + 3]}
    if min(positions[index][2] for index in vertices) > -.04:
        door.extend(triangles)
body = set(range(len(indices) // 3)) - set(door)
assert body and door and not body.intersection(door)
assert len(body) + len(door) == len(indices) // 3 == 3026
report = {
    'sourceTaskId': '01a14b42-b599-7523-ac3f-5750a26f8139',
    'sourceSha256': hashlib.sha256(raw).hexdigest(),
    'triangles': len(indices) // 3, 'bodyTriangles': len(body),
    'doorTriangles': sorted(door),
    'sourceHinge': [.18, 0, -.075], 'mountedHinge': [-.245, 0, -.075],
    'closedAngle': 1.384, 'targetHeight': 1.55,
    'bodyMin': [-.3156740069389343, -.3425289988517761, -.4821780025959015],
    'bodyMax': [.3151859939098358, .3415530025959015, -.08178699761629105],
    'preservation': 'Every original triangle appears exactly once. Native POSITION/NORMAL/TEXCOORD_0 shared. Door pieces mounted to the left hinges using parent transforms only.'
}
(ROOT / 'scenes/safe-hinge.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
assert path.read_bytes() == raw
print(json.dumps({k: v for k, v in report.items() if k != 'doorTriangles'}))

parser = argparse.ArgumentParser()
parser.add_argument('--preview', type=Path)
args = parser.parse_args()
if args.preview:
    assembled = copy.deepcopy(doc)
    data = bytearray(binary)
    meshes = []
    for name, selected in [('SafeNativeBody', sorted(body)), ('SafeNativeDoor', sorted(door))]:
        part_indices = [index for triangle in selected for index in indices[triangle * 3:triangle * 3 + 3]]
        data.extend(b'\0' * (-len(data) % 4))
        view = len(assembled['bufferViews'])
        payload = struct.pack('<' + 'I' * len(part_indices), *part_indices)
        assembled['bufferViews'].append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(payload), 'target': 34963})
        data.extend(payload)
        accessor = len(assembled['accessors'])
        assembled['accessors'].append({'bufferView': view, 'componentType': 5125, 'count': len(part_indices), 'type': 'SCALAR'})
        prim = copy.deepcopy(primitive)
        prim['indices'] = accessor
        meshes.append({'name': name, 'primitives': [prim]})
    scale = report['targetHeight'] / (report['bodyMax'][1] - report['bodyMin'][1])
    position = [-(report['bodyMin'][0] + report['bodyMax'][0]) * scale / 2,
                -report['bodyMin'][1] * scale,
                -(report['bodyMin'][2] + report['bodyMax'][2]) * scale / 2]
    assembled['meshes'] = meshes
    assembled['nodes'] = [
        {'name': 'SafeAssembly', 'scale': [scale] * 3, 'translation': position, 'children': [1, 2]},
        {'name': 'SafeNativeBody', 'mesh': 0},
        {'name': 'SafeHingeRest', 'translation': report['mountedHinge'], 'rotation': [0, math.sin(report['closedAngle'] / 2), 0, math.cos(report['closedAngle'] / 2)], 'children': [3]},
        {'name': 'VaultDoorPivot', 'children': [4], 'extras': {'openAngle': -report['closedAngle']}},
        {'name': 'SafeNativeDoor', 'mesh': 1, 'translation': [-v for v in report['sourceHinge']]}
    ]
    assembled['scene'] = 0
    assembled['scenes'] = [{'nodes': [0]}]
    assert data[:len(binary)] == binary
    args.preview.parent.mkdir(parents=True, exist_ok=True)
    write_glb(args.preview, assembled, data)
    print('LOSSLESS_ASSEMBLY_PREVIEW', args.preview)
