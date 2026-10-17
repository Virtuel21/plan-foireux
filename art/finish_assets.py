"""Reproducible mobile export pass. Keep editable original meshes in source files.
Run after build_museum.py; reuses the original shared character and Cloth variants.
"""
import bpy, os, math
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def finish(source,destination,ratio):
    bpy.ops.wm.open_mainfile(filepath=source)
    for o in list(bpy.context.scene.objects):
        if o.type not in ['MESH','CURVE']:continue
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        bpy.ops.object.convert(target='MESH')
        if len(o.data.polygons)>80:
            m=o.modifiers.new('Mobile silhouette budget','DECIMATE');m.ratio=ratio;bpy.ops.object.modifier_apply(modifier=m.name)
    buckets={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and len(o.data.materials)==1:
            key=(o.parent.name if o.parent else '',o.data.materials[0].name);buckets.setdefault(key,[]).append(o)
    for key,objects in buckets.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=(key[0]+'_'+key[1]).replace(' ','_')
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','source',destination+'.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public','models',destination+'.glb'),export_format='GLB',export_animations=False)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    print('FINISHED',destination,triangles,'triangles',len([o for o in bpy.context.scene.objects if o.type=='MESH']),'draw meshes')
finish(os.path.join(ROOT,'art','source','museum-authoring.blend'),'museum',.65)
finish(os.path.join(ROOT,'art','burglar.blend'),'burglar',.22)
