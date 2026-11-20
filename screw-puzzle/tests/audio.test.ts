import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { createGameAudio } from "../src/game/audio.ts";

const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
class FakeNode {
  gain = parameter(); frequency = parameter();
  connect<T>(destination: T) { return destination; }
  disconnect() {}
  start() {}
  stop() {}
}
class FakeSource extends FakeNode {
  active = false; disconnected = false; stopAt: number | undefined;
  override start() { this.active = true; }
  override stop(at?: number) { this.stopAt = at; if (at === undefined) this.active = false; }
  override disconnect() { this.disconnected = true; }
}
class FakeBase {
  currentTime = 1; state = "running"; destination = new FakeNode();
  createGain() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  createBuffer(_channels: number, length: number, rate: number) {
    const data = new Float32Array(length);
    return { duration: length / rate, getChannelData: () => data };
  }
}
class FakeOffline extends FakeBase {
  static pending: (() => void)[] = [];
  length: number; rate: number;
  constructor(_channels: number, length: number, rate: number) { super(); this.length = length; this.rate = rate; }
  startRendering() { return new Promise(resolve => FakeOffline.pending.push(() => resolve(this.createBuffer(1, this.length, this.rate)))); }
}
class FakeContext extends FakeBase {
  static instances: FakeContext[] = [];
  sources: FakeSource[] = []; closes = 0;
  constructor() { super(); FakeContext.instances.push(this); }
  createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source; }
  resume() { return Promise.resolve(); }
  close() { this.closes++; this.state = "closed"; return Promise.resolve(); }
}
function install(t: { after: (fn: () => void) => void }) {
  const globals = { AudioContext: FakeContext, OfflineAudioContext: FakeOffline, document: Object.assign(new EventTarget(), { hidden: false }) };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true });
  t.after(() => { for (const [key, original] of originals) { if (original) Object.defineProperty(globalThis, key, original); else Reflect.deleteProperty(globalThis, key); } });
  FakeContext.instances = []; FakeOffline.pending = [];
}

test("rapid music restarts keep one live loop and stop/disconnect the old source immediately", async t => {
  install(t); const audio = createGameAudio(), context = FakeContext.instances[0];
  t.after(() => audio.close());
  audio.setPlaying(true); audio.setPlaying(false); audio.setPlaying(true);
  FakeOffline.pending.shift()!(); await setImmediate();
  assert.equal(context.sources.length, 1); assert.equal(context.sources.filter(s => s.active).length, 1);
  audio.setPlaying(false);
  assert.equal(context.sources[0].active, false); assert.equal(context.sources[0].disconnected, true);
  assert.equal(context.sources[0].stopAt, undefined, "a delayed stop can overlap the next song");
  audio.setPlaying(true); await setImmediate(); audio.setPlaying(true);
  audio.setMuted("music", true); audio.setMuted("music", false);
  assert.equal(context.sources.length, 2); assert.equal(context.sources.filter(s => s.active).length, 1);
  audio.close(); audio.close();
  assert.equal(context.sources.filter(s => s.active).length, 0); assert.equal(context.closes, 1);
});

test("leaving while music is rendering prevents a late track starting after disposal", async t => {
  install(t); const audio = createGameAudio(), context = FakeContext.instances[0];
  audio.setPlaying(true); audio.close(); FakeOffline.pending.shift()!(); await setImmediate();
  audio.setPlaying(true); await setImmediate();
  assert.equal(context.sources.length, 0); assert.equal(context.state, "closed");
});
