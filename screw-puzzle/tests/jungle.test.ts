import '../src/game/allLevels.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from 'three';
import { JUNGLE_MODEL } from '../src/game/allLevels.ts';
import { generateSoloPuzzle, soloLevelTemplate } from '../src/game/soloLevels.ts';
import { createInitialState, removeScrew, isScrewAccessible } from '../src/game/rules.ts';
import { findExposedScrews } from '../src/scene/exposure.ts';
import { headGeometry } from '../src/components/screwGeometry.ts';
import { pickSceneTarget } from '../src/scene/picking.ts';
import { SCREW_HEAD_FACE_Z } from '../src/scene/screwDimensions.ts';
import { JUNGLE_BLOCKERS, JUNGLE_EXPOSED_IDS } from '../src/scene/jungleAudit.ts';
import { EASY_PROFILE } from '../src/game/difficultyProfiles.ts';
import { SCREW_SCALE } from '../src/game/screwScale.ts';
import { findScrewObstructions } from '../src/scene/obstructions.ts';
import { createPartPhysics, initPartPhysics } from '../src/scene/partPhysics.ts';
import { restoreSoloSave } from '../src/game/soloSave.ts';
import { newRunId } from '../src/game/runId.ts';
const t = soloLevelTemplate('jungle');
test('Jungle Temple has a detailed, removable 144-screw Easy scene and preserves generous openings across fresh puzzles', () => {
    assert.equal(t.length, 144);
    assert.equal(JUNGLE_MODEL.parts.length, 144);
    assert.equal(new Set(t.map(s => s.color)).size, 6);
    assert.ok(JUNGLE_EXPOSED_IDS.length >= Math.round(.30 * t.length) && JUNGLE_EXPOSED_IDS.length <= Math.round(.40 * t.length));
    assert.deepEqual(new Set(findExposedScrews(createInitialState(t), 'jungle')), new Set(JUNGLE_EXPOSED_IDS));
    const triangles = JUNGLE_MODEL.pieces.reduce((sum, p) => sum + (p.geometry!.index?.count ?? p.geometry!.getAttribute('position').count) / 3, 0);
    assert.ok(triangles >= 250000 && triangles <= 350000, String(triangles));
    assert.deepEqual(new Set(t.map(s => s.attachedTo)), new Set(JUNGLE_MODEL.parts));
    for (const name of ['sun-mask', 'sun-crown', 'golden-idol', 'tree-left-trunk', 'tree-left-crown', 'bridge-deck-1', 'fall-1', 'statue-head', 'tent-roof-left', 'toucan', 'map-scroll'])
        assert.ok(JUNGLE_MODEL.parts.includes(`jungle-${name}`));
    const distinct = new Set();
    for (let i = 0; i < 30; i++) {
        const p = generateSoloPuzzle('jungle', Math.imul(i + 1, 2654435761) >>> 0);
        distinct.add(p.seed);
        let s = p.state, peak = 0;
        for (const box of s.boxes) {
            const count = s.screws.filter(screw => JUNGLE_EXPOSED_IDS.includes(screw.id as typeof JUNGLE_EXPOSED_IDS[number]) && screw.color === box!.color).length;
            assert.ok(count >= EASY_PROFILE.openingMatches[0], String(count));
        }
        for (const id of p.solution) {
            assert.ok(isScrewAccessible(s, s.screws.find(a => a.id === id)!));
            s = removeScrew(s, id);
            peak = Math.max(peak, s.tray.length);
        }
        assert.equal(s.status, 'won');
        assert.equal(peak, 0);
        assert.equal(s.removedParts.length, 144);
    }
    assert.ok(distinct.size > 20);
});
test('the exposed stair and small statue heads can actually be picked with the distant crown and lilies present', () => {
    const material = new MeshBasicMaterial({ side: DoubleSide });
    try {
        for (const part of ['jungle-stairs-0', 'jungle-golden-frog']) {
            const removedParts = part === 'jungle-golden-frog' ? ['jungle-stairs-0', 'jungle-stairs-1', 'jungle-stairs-2'] as const : [];
            const game = { ...createInitialState(t), removedParts: [...removedParts] };
            const screw = game.screws.find(s => s.attachedTo === part)!;
            assert.ok(isScrewAccessible(game, screw));
            const scene = new Group();
            for (const p of JUNGLE_MODEL.pieces.filter(p => !game.removedParts.includes(p.part as typeof removedParts[number]))) {
                const mesh = new Mesh(p.geometry!, material);
                mesh.position.set(...p.position); mesh.scale.set(...p.size);
                if (p.rotation) mesh.rotation.set(...p.rotation);
                mesh.userData = { part: p.part, pickBlocker: true }; scene.add(mesh);
            }
            const head = new Mesh(headGeometry, material), normal = new Vector3(...screw.normal);
            head.position.set(...screw.position); head.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal));
            head.scale.setScalar(SCREW_SCALE); head.userData = { screwId: screw.id }; scene.add(head); scene.updateMatrixWorld(true);
            const face = head.position.clone().addScaledVector(normal, SCREW_SCALE * SCREW_HEAD_FACE_Z);
            const camera = new PerspectiveCamera(42, 1, .01, 50);
            camera.position.copy(face).addScaledVector(normal, 1.2); camera.lookAt(face); camera.updateMatrixWorld();
            assert.deepEqual(pickSceneTarget(scene, camera, { left: 0, top: 0, width: 1000, height: 1000 }, [500, 500], game, 0), { kind: 'screw', id: screw.id });
        }
    } finally { material.dispose(); }
});
test('jungle heads are attached, comfortably spaced and genuinely visible along a complete winning route', () => {
    assert.deepEqual(t.map(s => findScrewObstructions(s, SCREW_SCALE)), JUNGLE_BLOCKERS);
    const crowded: string[] = [];
    for (let i = 0; i < t.length; i++)
        for (let j = i + 1; j < t.length; j++) {
            const a = t[i], b = t[j];
            if (a.obstructedBy?.includes(b.attachedTo!) || b.obstructedBy?.includes(a.attachedTo!))
                continue;
            const d = new Vector3(...a.position).sub(new Vector3(...b.position)), n = new Vector3(...a.normal), same = n.dot(new Vector3(...b.normal)) > .8 && Math.abs(d.dot(n)) < .28 * SCREW_SCALE;
            if (d.length() < (same ? 1.8 : 1.1) * .5 * SCREW_SCALE - 1e-6)
                crowded.push(`${a.id} ${a.attachedTo} / ${b.id} ${b.attachedTo}`);
        }
    assert.deepEqual(crowded, []);
    const material = new MeshBasicMaterial({ side: DoubleSide }), ray = new Raycaster(), objects = JUNGLE_MODEL.pieces.map(p => { const mesh = new Mesh(p.geometry!, material); mesh.position.set(...p.position); mesh.scale.set(...p.size); if (p.rotation)
        mesh.rotation.set(...p.rotation); mesh.updateMatrixWorld(); return { mesh, part: p.part }; });
    // The rear/side seam must be solid across its full height, and that new
    // stonework must leave with the lower roof instead of becoming permanent.
    for (const y of [4.72, 4.84, 4.96]) {
        const skirt = objects.filter(o => o.part === 'jungle-pyramid-lower');
        for (const [origin, direction] of [
            [[1, y, -8], [0, 0, 1]],
            [[-7, y, -3.05], [1, 0, 0]],
            [[7, y, -3.05], [-1, 0, 0]],
        ]) {
            ray.set(new Vector3(...origin), new Vector3(...direction)); ray.far = 10;
            assert.ok(skirt.some(o => ray.intersectObject(o.mesh, false).length), 'Temple wall/roof seam is closed');
        }
    }
    // Representative previously-empty points: landing into the temple, solid
    // stone beneath all three flights, and the ground-level approach step.
    for (const [part, y, z] of [
        ['jungle-stairs-0', 2.3, -1.49],
        ['jungle-stairs-0', 1.1, -.48],
        ['jungle-stairs-0', .16, -.48],
        ['jungle-stairs-1', .8, .44],
        ['jungle-stairs-1', .16, .44],
        ['jungle-stairs-2', .3, 1.36],
        ['jungle-stairs-2', .16, 1.36],
        ['jungle-stairs-2', .15, 2.31],
    ] as const) {
        ray.set(new Vector3(-3, y, z), new Vector3(1, 0, 0)); ray.far = 6;
        assert.ok(objects.filter(o => o.part === part).some(o => ray.intersectObject(o.mesh, false).length), `${part}: stair/landing has real removable stone support`);
    }
    const offsets: Vector3[] = [];
    for (const e of [-1.45, -1.1, -.5, 0, .35, .7, 1.1, 1.45])
        for (let a = 0; a < 24; a++)
            offsets.push(new Vector3(Math.cos(a * Math.PI / 12) * Math.cos(e) * 10, Math.sin(e) * 10, Math.sin(a * Math.PI / 12) * Math.cos(e) * 10));
    const puzzle = generateSoloPuzzle('jungle', 245);
    let state = puzzle.state;
    const detached: string[] = [], hidden: string[] = [];
    for (const id of puzzle.solution) {
        const s = state.screws.find(s => s.id === id)!, n = new Vector3(...s.normal), face = new Vector3(...s.position).addScaledVector(n, SCREW_SCALE * .144);
        ray.set(face, n.clone().negate());
        ray.far = .26;
        if (!objects.filter(o => o.part === s.attachedTo).some(o => ray.intersectObject(o.mesh, false).length))
            detached.push(`${id} ${s.attachedTo}`);
        const standing = objects.filter(o => !state.removedParts.includes(o.part));
        if (!offsets.some(d => { if (d.dot(n) < d.length() * .08)
            return false; ray.set(face.clone().add(d), d.clone().negate().normalize()); ray.far = d.length() - .002; return !standing.some(o => ray.intersectObject(o.mesh, false).length); }))
            hidden.push(`${id} ${s.attachedTo}`);
        state = removeScrew(state, id);
    }
    material.dispose();
    assert.deepEqual({ detached, hidden }, { detached: [], hidden: [] });
});
test('every jungle assembly has Rapier collision/one-second poof and its cloud checkpoint restores', async () => { await initPartPhysics(); const physics = createPartPhysics([], 'jungle'); try {
    let now = 1000;
    for (const part of JUNGLE_MODEL.parts) {
        physics.release(part, now);
        assert.ok(physics.read()[part]);
        physics.advance(now + 1050);
        assert.equal(physics.read()[part]?.poof?.at, now + 1000, part);
        now += 2500;
    }
}
finally {
    physics.free();
} const p = generateSoloPuzzle('jungle', 42), moves = p.solution.slice(0, 60), runId = newRunId(); const restored = restoreSoloSave('jungle', { seed: p.seed, runId, moves, elapsedMs: 60000, findReadyAt: 1795450000000 })!; assert.deepEqual(restored.game, moves.reduce(removeScrew, p.state)); assert.equal(restored.checkpoint.runId, runId); assert.equal(restored.checkpoint.elapsedBefore, 60000); });
