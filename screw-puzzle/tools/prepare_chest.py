"""Build the editable and game-ready chest from the original Sketchfab GLB.

Run with Blender: blender --background --python-exit-code 1 --python tools/prepare_chest.py
"""

import json
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
SOURCE = ASSETS / "treasure_chest.glb"
TARGET = ASSETS / "treasure_chest_parts.glb"
EDITABLE = ROOT / "art" / "treasure-chest.blend"
PARTS = ("chest", "chest-lid", "chest-lock")
SCALE = 1.26 / 91.108
SEAM = 34 * SCALE
PIVOTS = {
    "chest": Vector((0, 0, 0.22)),
    "chest-lid": Vector((0, 0.38, SEAM)),
    "chest-lock": Vector((0, -0.4, 0.34)),
}
CHANGE_NOTE = "Split at the lid seam into body, lid and lock; normalized size and axes, added part origins, and resized textures."


def glb_chunks(path):
    data = path.read_bytes()
    size = struct.unpack_from("<I", data, 12)[0]
    return json.loads(data[20:20 + size]), data[20 + size:]


def preserve_credits(path, credits):
    document, binary = glb_chunks(path)
    document["asset"]["extras"] = credits
    header = json.dumps(document, separators=(",", ":")).encode()
    header += b" " * (-len(header) % 4)
    path.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20 + len(header) + len(binary), len(header), 0x4E4F534A) + header + binary)


def lock_vertices(obj):
    """Identify the front clasp, pin and loop, including vertices split at UV seams."""
    coords = [obj.matrix_world @ v.co for v in obj.data.vertices]
    parent = list(range(len(coords)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    same = {}
    for i, point in enumerate(coords):
        key = tuple(round(n, 4) for n in point)
        if key in same:
            parent[root(i)] = root(same[key])
        same[key] = i
    for edge in obj.data.edges:
        a, b = edge.vertices
        parent[root(a)] = root(b)
    islands = {}
    for i, point in enumerate(coords):
        islands.setdefault(root(i), []).append(point)
    clasp = {i for i, points in islands.items() if min(p.x for p in points) > 26 and max(abs(p.y) for p in points) < 6.5}
    return {i for i in range(len(coords)) if root(i) in clasp}


def clip(corners, above):
    """Cut a triangle at the seam while interpolating its UVs and corner normals."""
    output = []
    for a, b in zip(corners, corners[1:] + corners[:1]):
        a_inside = a[0].z >= SEAM if above else a[0].z <= SEAM
        b_inside = b[0].z >= SEAM if above else b[0].z <= SEAM
        if a_inside:
            output.append(a)
        if a_inside != b_inside:
            t = (SEAM - a[0].z) / (b[0].z - a[0].z)
            output.append((a[0].lerp(b[0], t), a[1].lerp(b[1], t).normalized(), a[2].lerp(b[2], t)))
    return output


def mesh_part(part, faces):
    vertices, polygons, corners, slots = [], [], [], []
    lookup = {}
    for material, face in faces:
        polygon = []
        for point, normal, uv in face:
            key = tuple(round(n, 7) for n in point)
            if key not in lookup:
                lookup[key] = len(vertices)
                vertices.append(point - PIVOTS[part])
            polygon.append(lookup[key])
        if len(set(polygon)) != len(polygon):
            continue
        polygons.append(polygon)
        corners.extend(face)
        slots.append(material)
    mesh = bpy.data.meshes.new(part + " geometry")
    mesh.from_pydata(vertices, [], polygons)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for i, (_, _, uv) in enumerate(corners):
        uv_layer.data[i].uv = uv
    material_slots = {}
    for poly, material in zip(mesh.polygons, slots):
        if material.name not in material_slots:
            material_slots[material.name] = len(mesh.materials)
            copy = material.copy()
            copy.name = f"{part} / {material.name}"
            mesh.materials.append(copy)
        poly.material_index = material_slots[material.name]
        poly.use_smooth = True
    mesh.normals_split_custom_set([normal for _, normal, _ in corners])
    mesh.update()
    obj = bpy.data.objects.new(part, mesh)
    obj.location = PIVOTS[part]
    obj["partId"] = part
    bpy.context.collection.objects.link(obj)
    return obj


def game_vector(point):
    return [round(point.x, 6), round(point.z, 6), round(-point.y, 6)]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    source_objects = list(bpy.context.scene.objects)
    # Original +X is the front. Point it towards glTF +Z and fit the cottage footprint.
    transform = Matrix(((0, SCALE, 0, 0), (-SCALE, 0, 0, 0), (0, 0, SCALE, 0.02 * SCALE), (0, 0, 0, 1)))
    faces = {part: [] for part in PARTS}
    for obj in source_objects:
        if obj.type != "MESH":
            continue
        clasp = lock_vertices(obj) if "Box met" in obj.name else set()
        matrix = transform @ obj.matrix_world
        normal_matrix = matrix.to_3x3().inverted().transposed()
        mesh = obj.data
        uv_layer = mesh.uv_layers.active
        for poly in mesh.polygons:
            corners = [(matrix @ mesh.vertices[mesh.loops[i].vertex_index].co,
                        (normal_matrix @ mesh.corner_normals[i].vector).normalized(), uv_layer.data[i].uv.copy()) for i in poly.loop_indices]
            material = mesh.materials[poly.material_index]
            if "Zamok" in obj.name or poly.vertices[0] in clasp:
                faces["chest-lock"].append((material, corners))
            else:
                for part, above in (("chest", False), ("chest-lid", True)):
                    section = clip(corners, above)
                    if len(section) >= 3:
                        faces[part].append((material, section))
    parts = [mesh_part(part, faces[part]) for part in PARTS]
    for obj in source_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.orphans_purge(do_recursive=True)
    for image in bpy.data.images:
        if max(image.size) > 512:
            factor = 512 / max(image.size)
            image.scale(*(max(1, round(size * factor)) for size in image.size))
            image.pack()
    credits = {**glb_chunks(SOURCE)[0]["asset"]["extras"], "changes": CHANGE_NOTE}
    bpy.data.texts.new("Asset credits").write("\n".join(f"{key}: {value}" for key, value in credits.items()))
    bpy.ops.file.pack_all()
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    # Open the source in a useful material-colored view instead of the original huge scale.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_location = (0, 0, 0.42)
                area.spaces.active.region_3d.view_distance = 2.5
                area.spaces.active.shading.color_type = "TEXTURE"
    EDITABLE.parent.mkdir(exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE))
    export_parts(parts, credits)


def export_parts(parts, credits):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj["partId"] = obj.name
        obj.select_set(True)
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format="GLB", export_extras=True, use_selection=True, export_apply=True)
    preserve_credits(TARGET, credits)

    # Offline collision data lets the solver use the same surfaces before WebGL loads.
    collision = {}
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in parts:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        matrix = evaluated.matrix_world
        mesh.calc_loop_triangles()
        collision[obj.name] = {
            "pivot": game_vector(matrix.translation),
            "positions": [value for v in mesh.vertices for value in game_vector(matrix @ v.co)],
            "indices": [i for triangle in mesh.loop_triangles for i in triangle.vertices],
        }
        print("CHEST", obj.name, len(mesh.loop_triangles), "triangles")
        evaluated.to_mesh_clear()
    (ASSETS / "treasure_chest_collision.json").write_text(json.dumps(collision, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if "--export-edited" in sys.argv:
        bpy.ops.wm.open_mainfile(filepath=str(EDITABLE))
        credits = {**glb_chunks(SOURCE)[0]["asset"]["extras"], "changes": CHANGE_NOTE}
        export_parts([bpy.data.objects[name] for name in PARTS], credits)
    else:
        main()
