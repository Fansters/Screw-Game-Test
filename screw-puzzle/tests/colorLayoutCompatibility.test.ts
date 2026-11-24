import '../src/game/allLevels.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { generateSoloPuzzle } from '../src/game/soloLevels.ts';
import { isScrewAccessible, removeScrew } from '../src/game/rules.ts';
import type { LevelId } from '../src/game/types.ts';

// Captured from 0.1.45 BEFORE changing extraction checks: seed, screw colours,
// initial boxes, queue and full solution order. Existing cloud saves store seeds.
const before = [
  {
    "level": "jungle",
    "seed": 1,
    "digest": "03bfd1206d765edac8315b27c181e2bed60da90559ab2c9be5bee36957cdaba0"
  },
  {
    "level": "jungle",
    "seed": 42,
    "digest": "5c05ee15c404bc5ee3751329fd2e1fbd5d418e9750c6e1020cdbf8a8b61a7092"
  },
  {
    "level": "jungle",
    "seed": 245,
    "digest": "3cabf7707bab9be638b1ba5229a7b69754c298de035ac7395737609d8403b589"
  },
  {
    "level": "jungle",
    "seed": 2654435761,
    "digest": "a95f5976cd687cfa1b919ae61eb4e359a68c273d895bb95b83bbfb4488543d17"
  },
  {
    "level": "campsite",
    "seed": 1,
    "digest": "393a4639f1247f1b6f5736e72e901fe08ded52d78f593ecf2863db84a70ed118"
  },
  {
    "level": "campsite",
    "seed": 42,
    "digest": "7cf5dc7dc2061b5ed1c3c6e42443d6f6e40867cbd8d37bc7f79dfae5a142f1ee"
  },
  {
    "level": "campsite",
    "seed": 245,
    "digest": "5160f3acf970c0d5228e7b939366afed0650aa52286faa9a44ff723e8fea6ae2"
  },
  {
    "level": "campsite",
    "seed": 2654435761,
    "digest": "fccd50d2779a26a82deae4eaa3ca8b779d3e849a39075129184a67ca0544d6c7"
  }
];
test('false-cover repairs preserve existing Jungle/Camp colours, box queues and complete winning sequences', () => {
  for (const fixture of before) {
    const p = generateSoloPuzzle(fixture.level as LevelId, fixture.seed), s = p.state;
    const digest = createHash('sha256').update(JSON.stringify({ seed: p.seed, colors: s.screws.map(s => s.color), boxes: s.boxes.map(b => b?.color), queue: s.boxQueue.map(b => b.color), solution: p.solution })).digest('hex');
    assert.equal(digest, fixture.digest, fixture.level + ':' + fixture.seed);
    assert.equal(p.solution.reduce(removeScrew, s).status, 'won');
  }
  const s = generateSoloPuzzle('jungle', 245).state;
  for (const part of ['jungle-stairs-0', 'jungle-golden-frog']) {
    const screw = s.screws.find(s => s.attachedTo === part)!;
    assert.deepEqual(screw.obstructedBy, []);
    assert.ok(isScrewAccessible(s, screw), part + ' is playable with crown/lilies still present');
  }
});
