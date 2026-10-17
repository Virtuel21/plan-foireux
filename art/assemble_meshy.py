"""Package Meshy originals without a Blender re-export or geometry/texture edits.

python art/assemble_meshy.py --sources PATH_TO_PRODUCTION
Only animation clips are added to the two native rigs. Every source bufferView,
including skin weights, UVs, normals and embedded PNGs, is retained byte for byte.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import shutil
import struct


def read_glb(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<III', raw) == (0x46546C67, 2, len(raw))
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + size])
    offset = 20 + size
    size = struct.unpack_from('<I', raw, offset)[0]
    return doc, bytearray(raw[offset + 8:offset + 8 + size])


def write_glb(path, doc, binary):
    binary.extend(b'\0' * (-len(binary) % 4))
    doc['buffers'] = [{'byteLength': len(binary)}]
    metadata = json.dumps(doc, separators=(',', ':')).encode()
    metadata += b' ' * (-len(metadata) % 4)
    path.write_bytes(struct.pack('<III', 0x46546C67, 2, 28 + len(metadata) + len(binary))
                     + struct.pack('<II', len(metadata), 0x4E4F534A) + metadata
                     + struct.pack('<II', len(binary), 0x004E4942) + binary)


def view_bytes(doc, binary, index):
    view = doc['bufferViews'][index]
    offset = view.get('byteOffset', 0)
    return binary[offset:offset + view['byteLength']]


def merge_clips(source, asset, target):
    original, original_binary = read_glb(source / f'{asset}-rig.glb')
    doc, binary = copy.deepcopy(original), bytearray(original_binary)
    doc['animations'] = []
    nodes = {n.get('name'): i for i, n in enumerate(doc['nodes'])}
    clips = ['idle'] if asset == 'guard' else ['idle', 'walk', 'drill']
    checks = []
    for name in clips:
        clip_doc, clip_binary = read_glb(source / f'{asset}-{name}.glb')
        assert clip_doc['nodes'] == original['nodes'], 'Different rig: never retarget implicitly'
        animation = copy.deepcopy(clip_doc['animations'][0])
        animation['name'] = name
        accessor_map, view_map = {}, {}

        def accessor(index):
            if index not in accessor_map:
                item = copy.deepcopy(clip_doc['accessors'][index])
                view_index = item['bufferView']
                if view_index not in view_map:
                    view = copy.deepcopy(clip_doc['bufferViews'][view_index])
                    data = view_bytes(clip_doc, clip_binary, view_index)
                    binary.extend(b'\0' * (-len(binary) % 4))
                    view['buffer'], view['byteOffset'] = 0, len(binary)
                    binary.extend(data)
                    view_map[view_index] = len(doc['bufferViews'])
                    doc['bufferViews'].append(view)
                    assert view_bytes(doc, binary, view_map[view_index]) == data
                item['bufferView'] = view_map[view_index]
                accessor_map[index] = len(doc['accessors'])
                doc['accessors'].append(item)
            return accessor_map[index]

        for sampler in animation['samplers']:
            sampler['input'], sampler['output'] = accessor(sampler['input']), accessor(sampler['output'])
        for channel in animation['channels']:
            channel['target']['node'] = nodes[clip_doc['nodes'][channel['target']['node']]['name']]
        doc['animations'].append(animation)
        checks.append({'clip': name, 'copiedBufferViews': len(view_map), 'bytesUnchanged': True})

    # These equality checks cover geometry, material settings, full-resolution images,
    # original rig and every original binary view. No root-motion rewrite either.
    for key in ['meshes', 'materials', 'images', 'textures', 'samplers', 'skins', 'nodes']:
        assert doc.get(key) == original.get(key), key
    assert binary[:len(original_binary)] == original_binary
    write_glb(target, doc, binary)
    reloaded, reloaded_binary = read_glb(target)
    for i in range(len(original['bufferViews'])):
        assert view_bytes(original, original_binary, i) == view_bytes(reloaded, reloaded_binary, i)
    return {'file': target.name, 'source': f'{asset}-rig.glb',
            'allOriginalBufferViewsIdentical': True, 'animationDataUnchanged': checks}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    parser.add_argument('--destination', type=Path, default=Path(__file__).resolve().parents[1] / 'public/models')
    args = parser.parse_args()
    sources, destination = args.sources.resolve(), args.destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    packaged = sources / 'models'
    packaged.mkdir(exist_ok=True)
    report = []
    for asset, filename in [('character-male', 'male.glb'), ('character-female', 'female.glb'), ('guard', 'guard.glb')]:
        target = packaged / filename
        report.append(merge_clips(sources / 'rigs', asset, target))
        shutil.copy2(target, destination / filename)
    for asset, filename in [('museum-complete', 'museum.glb'), ('safe-box', 'safe-box.glb'),
                            ('lockers', 'lockers.glb'), ('electrical-box', 'electrical-box.glb')]:
        source = sources / 'raw' / f'{asset}.glb'
        target = packaged / filename
        shutil.copy2(source, target)
        runtime_target = destination / filename if asset != 'electrical-box' else Path(__file__).resolve().parent / 'source/electrical-box.glb'
        shutil.copy2(source, runtime_target)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        assert digest == hashlib.sha256(runtime_target.read_bytes()).hexdigest()
        report.append({'file': filename, 'source': source.name, 'entireFileIdentical': True, 'sha256': digest})
    camera_box = Path(__file__).resolve().parents[1] / 'public/models/camera-box.glb'
    if camera_box.exists():
        shutil.copy2(camera_box, packaged / camera_box.name)
        report.append({'file': camera_box.name, 'source': 'art/build_camera_box.py', 'generatedLocally': True, 'credits': 0})
    for entry in report:
        entry['bytes'] = (packaged / entry['file']).stat().st_size
        entry['sha256'] = hashlib.sha256((packaged / entry['file']).read_bytes()).hexdigest()
    (sources / 'quality-preservation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
