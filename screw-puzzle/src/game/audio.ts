export type Cue = "remove" | "blocked" | "match";
export type AudioChannel = "music" | "effects";

const MASTER_GAIN = 1.8;
const MUSIC_GAIN = 0.09;
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

function tone(context: BaseAudioContext, output: AudioNode, at: number, frequency: number,
  duration: number, volume: number, wave: OscillatorType = "sine", endFrequency = frequency, attack = 0.017) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(attack, duration / 4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

// A new instrumental arrangement of Gruber's 1818 Silent Night melody.
// All voices are synthesized here; no recording or third-party samples are used.
export async function renderChristmasMusic() {
  const beat = 60 / 64, bar = beat * 3, sampleRate = 24000;
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
  const length = Math.round(melody.length * bar * sampleRate), tail = 3;
  const context = new OfflineAudioContext(1, length + tail * sampleRate, sampleRate);
  const keys = context.createBiquadFilter(); keys.frequency.value = 1300;
  keys.connect(context.destination);
  // One quiet, piano-like carol voice. No accompaniment, bass, beats or echo.
  for (const [index, notes] of melody.entries()) {
    let offset = 0;
    for (const [note, duration] of notes) {
      const at = index * bar + offset * beat + .02, frequency = hz(note);
      tone(context, keys, at, frequency, Math.max(.8, duration * beat * 1.25), .16, "sine", frequency, .075);
      tone(context, keys, at, frequency * 2, .7, .008, "sine", frequency * 2, .06);
      offset += duration;
    }
  }
  const rendered = await context.startRendering(), loop = context.createBuffer(1, length, sampleRate);
  const data = loop.getChannelData(0), full = rendered.getChannelData(0);
  data.set(full.subarray(0, length));
  // Fold the final note tails into the opening for a continuous loop.
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
  let playing = false, disposed = false, generation = 0;
  const muted = { music: false, effects: false };
  const lastCue = { remove: -Infinity, blocked: -Infinity };
  const track = renderChristmasMusic().catch(() => null);

  function stopMusic() {
    const source = music; music = null;
    if (source) { source.stop(); source.disconnect(); }
  }

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
      if (disposed || playing === value) return;
      playing = value;
      const request = ++generation;
      updateVolume();
      if (!value) {
        stopMusic();
        return;
      }
      void track.then((buffer) => {
        if (request !== generation || !playing || music || !buffer || context.state === "closed") return;
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
      if (disposed) return;
      disposed = true; playing = false; generation++; stopMusic();
      document.removeEventListener("visibilitychange", updateVolume);
      void context.close().catch(() => {});
    },
  };
}
