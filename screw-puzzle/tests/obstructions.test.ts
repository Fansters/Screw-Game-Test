import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, PlaneGeometry } from 'three';
import { registerModel, releaseModel } from '../src/scene/levelModels.ts';
import { findScrewObstructions } from '../src/scene/obstructions.ts';
import { SCREW_SCALE } from '../src/game/screwScale.ts';
import type { Piece } from '../src/scene/houseModel.ts';

const screw = { attachedTo: 'space-fixing' as const, position: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };
function fixture(pieces: Piece[]) {
  releaseModel('space');
  registerModel('space', { pieces, pivots: {}, parts: ['space-cover'] });
}
const panel = (z: number): Piece => ({ part: 'space-cover', geometry: new PlaneGeometry(2, 2), kind: 'box', position: [0, 0, z], size: [1, 1, 1], color: '#fff' });

test('a distant back-facing/open decoration is not an enclosing cover, but a nearby panel blocks extraction', t => {
  t.after(() => releaseModel('space'));
  fixture([panel(4)]);
  assert.deepEqual(findScrewObstructions(screw, SCREW_SCALE), []);
  fixture([panel(.16)]);
  assert.deepEqual(findScrewObstructions(screw, SCREW_SCALE), ['space-cover']);
});

test('a genuinely buried head stays blocked even when its enclosing solid exits beyond the pull distance', t => {
  t.after(() => releaseModel('space'));
  fixture([{ ...panel(0), geometry: new BoxGeometry(2, 2, 3) }]);
  assert.deepEqual(findScrewObstructions(screw, SCREW_SCALE), ['space-cover']);
});

test('loose-cover checks retain composed transforms and use each piece, not an assembly-wide enclosing box', t => {
  t.after(() => releaseModel('space'));
  fixture([panel(0)]);
  const root = new Group(); root.position.z = 4;
  assert.deepEqual(findScrewObstructions(screw, SCREW_SCALE, { root, part: 'space-cover' }), []);
  root.position.z = .16;
  assert.deepEqual(findScrewObstructions(screw, SCREW_SCALE, { root, part: 'space-cover' }), ['space-cover']);
  fixture([panel(4), { ...panel(-4), geometry: new BoxGeometry(1, 1, .1) }]);
  assert.deepEqual(findScrewObstructions(screw, SCREW_SCALE), []);
});
