export type Cue = "remove" | "blocked" | "match";
export type AudioChannel = "music" | "effects";

const MASTER_GAIN = 1.8;
const MUSIC_GAIN = 0.09;
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

function tone(context: BaseAudioContext, output: AudioNode, at: number, frequency: number,
  duration: number, volume: number, wave: OscillatorType = "sine", endFrequency = frequency) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.017, duration / 4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

// A new instrumental arrangement of Gruber's 1818 Silent Night melody.
// All voices are synthesized here; no recording or third-party samples are used.
export async function renderChristmasMusic() {
  const beat = 60 / 72, bar = beat * 3, sampleRate = 24000;
  const chords = [
    [36, 52, 55, 59], [36, 52, 55, 62], [36, 52, 55, 59], [36, 52, 55, 62],
    [43, 53, 57, 59], [43, 53, 57, 62], [36, 52, 55, 59], [36, 52, 55, 62],
    [41, 53, 57, 60], [41, 53, 57, 64], [36, 52, 55, 59], [36, 52, 55, 62],
    [41, 53, 57, 60], [41, 53, 57, 64], [36, 52, 55, 59], [36, 52, 55, 62],
    [43, 53, 57, 59], [43, 53, 57, 62], [36, 52, 55, 59], [45, 52, 55, 60],
    [36, 52, 55, 59], [43, 53, 57, 59], [36, 52, 55, 59], [36, 52, 55, 62],
  ];
  // Bars contain [MIDI pitch, duration in quarter-note beats]. Leave room
  // around the familiar phrases rather than playing a constant bright lead.
  const melody: [number, number][][] = [
    [[67,.75],[69,.25],[67,.5],[64,1.5]], [],
    [[67,.75],[69,.25],[67,.5],[64,1.5]], [],
    [[74,1],[74,.5],[71,1.5]], [], [[72,1],[72,.5],[67,1.5]], [],
    [[69,1],[69,.5],[72,.75],[71,.25],[69,.5]],
    [[67,.75],[69,.25],[67,.5],[64,1.5]], [], [],
    [[69,1],[69,.5],[72,.75],[71,.25],[69,.5]],
    [[67,.75],[69,.25],[67,.5],[64,1.5]], [], [],
    [[74,1],[74,.5],[77,.75],[74,.25],[71,.5]],
    [[72,3]], [[76,3]], [],
    [[72,.75],[67,.25],[64,.5],[67,.75],[65,.25],[62,.5]],
    [[60,3]], [], [],
  ];
  const length = Math.round(chords.length * bar * sampleRate), tail = 3;
  const context = new OfflineAudioContext(1, length + tail * sampleRate, sampleRate);
  const keys = context.createBiquadFilter(); keys.frequency.value = 1150;
  const bells = context.createBiquadFilter(); bells.frequency.value = 2800;
  keys.connect(context.destination); bells.connect(context.destination);
  const echo = context.createDelay(1), echoGain = context.createGain();
  echo.delayTime.value = beat * .75; echoGain.gain.value = .14;
  bells.connect(echo).connect(echoGain).connect(context.destination);
  const brush = context.createBuffer(1, Math.round(sampleRate * .12), sampleRate);
  const samples = brush.getChannelData(0); let seed = 19811224;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = (seed / 2147483648 - 1) * (1 - Math.exp(-i / 24)) * Math.exp(-i / 400);
  }
  for (const [index, [bass, ...notes]] of chords.entries()) {
    const at = index * bar + .02;
    for (const [voice, note] of notes.entries()) {
      tone(context, keys, at + voice * .025, hz(note), 2.1, .073, 'triangle');
      tone(context, keys, at + voice * .025, hz(note + 12) * 1.0015, 1.1, .009);
    }
    tone(context, keys, at, hz(bass), 1.4, .13);
    tone(context, keys, at + 2 * beat, hz(bass + 7), .65, .065);
    tone(context, keys, at, 78, .13, .075, 'sine', 40);
    for (const offset of [.98, 2.46]) {
      const source = context.createBufferSource(), gain = context.createGain();
      gain.gain.value = .025; source.buffer = brush;
      source.connect(gain).connect(keys); source.start(at + offset * beat);
    }
    let offset = 0;
    for (const [note, duration] of melody[index]) {
      tone(context, bells, at + offset * beat, hz(note), Math.max(.7, duration * beat * 1.35), .052);
      tone(context, bells, at + offset * beat, hz(note) * 2.002, .5, .005);
      offset += duration;
    }
    if (index % 4 === 3) tone(context, bells, at + 2.5 * beat, hz(84 + index % 3), .7, .007);
  }
  const rendered = await context.startRendering(), loop = context.createBuffer(1, length, sampleRate);
  const data = loop.getChannelData(0), full = rendered.getChannelData(0);
  data.set(full.subarray(0, length));
  // Fold the final note/echo tails into the opening for a continuous loop.
  for (let i = length; i < full.length; i++) data[i - length] += full[i];
  return loop;
}

export function createGameAudio() {
  const context = new AudioContext();
  const output = context.createGain();
  const musicGain = context.createGain();
  const effectsGain = context.createGain();
  output.connect(context.destination);
  musicGain.connect(output);
  effectsGain.connect(output);
  output.gain.value = 0;
  musicGain.gain.value = MUSIC_GAIN;
  let music: AudioBufferSourceNode | null = null;
  let playing = false;
  const muted = { music: false, effects: false };
  const lastCue = { remove: -Infinity, blocked: -Infinity };
  const track = renderChristmasMusic().catch(() => null);

  function updateVolume() {
    output.gain.setTargetAtTime(playing && !document.hidden ? MASTER_GAIN : 0, context.currentTime, 0.035);
  }
  document.addEventListener("visibilitychange", updateVolume);
  updateVolume();

  return {
    isRunning() { return context.state === "running"; },
    // Called directly from a Start or unmute gesture.
    unlock() { void context.resume().catch(() => {}); },
    setMuted(channel: AudioChannel, value: boolean) {
      muted[channel] = value;
      const gain = channel === "music" ? musicGain : effectsGain;
      gain.gain.setTargetAtTime(value ? 0 : channel === "music" ? MUSIC_GAIN : 1, context.currentTime, 0.035);
    },
    setPlaying(value: boolean) {
      if (playing === value) return;
      playing = value;
      updateVolume();
      if (!value) {
        music?.stop(context.currentTime + 0.15);
        music = null;
        return;
      }
      void track.then((buffer) => {
        if (!playing || music || !buffer || context.state === "closed") return;
        music = context.createBufferSource();
        music.buffer = buffer;
        music.loop = true;
        music.connect(musicGain);
        music.start();
      });
    },
    play(cue: Cue) {
      if (!playing || muted.effects || document.hidden || context.state !== "running") return;
      const at = context.currentTime;
      if (cue !== "match") {
        if (at - lastCue[cue] < 0.09) return;
        lastCue[cue] = at;
      }
      if (cue === "remove") {
        tone(context, effectsGain, at, 570, 0.085, 0.047, "triangle", 370);
        tone(context, effectsGain, at + 0.025, 760, 0.09, 0.021, "sine", 940);
      } else if (cue === "blocked") {
        tone(context, effectsGain, at, 186, 0.10, 0.065, "triangle", 102);
      } else {
        for (const [index, note] of [72, 76, 79].entries()) {
          tone(context, effectsGain, at + index * 0.065, hz(note), 0.28, 0.052);
        }
      }
    },
    close() {
      playing = false;
      document.removeEventListener("visibilitychange", updateVolume);
      void context.close().catch(() => {});
    },
  };
}
