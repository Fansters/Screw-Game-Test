type Cue = "remove" | "blocked" | "match";

const MASTER_GAIN = 1.2;
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

async function renderMusic() {
  const beat = 60 / 76;
  const bar = 4 * beat;
  const chords = [
    [41, 57, 60, 64, 67], [40, 55, 59, 62, 67], [38, 53, 57, 60, 64], [43, 53, 57, 59, 64],
    [36, 55, 59, 62, 64], [45, 55, 59, 60, 64], [38, 53, 57, 60, 67], [43, 53, 57, 59, 62],
  ];
  const sampleRate = 22050;
  const context = new OfflineAudioContext(1, Math.round(chords.length * bar * sampleRate), sampleRate);
  const keys = context.createBiquadFilter();
  keys.frequency.value = 900;
  keys.connect(context.destination);
  const brush = context.createBuffer(1, Math.round(sampleRate * 0.14), sampleRate);
  const samples = brush.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - Math.exp(-index / 30)) * Math.exp(-index / 600);
  }
  for (const [index, [bass, ...notes]] of chords.entries()) {
    const at = index * bar + 0.015;
    for (const offset of [0, 1.62]) {
      for (const [voice, note] of notes.entries()) {
        const time = at + offset * beat + voice * 0.023;
        tone(context, keys, time, hz(note), offset === 0 ? 1.7 : 1.2, 0.11, "triangle");
        tone(context, keys, time, hz(note + 12) * 1.002, 0.65, 0.022);
      }
    }
    tone(context, keys, at, hz(bass), 1.3, 0.2);
    tone(context, keys, at + 2.6 * beat, hz(bass + (index % 2 ? 7 : 12)), 0.65, 0.12);
    for (const offset of [0, 2.3]) tone(context, context.destination, at + offset * beat, 92, 0.15, 0.16, "sine", 42);
    for (const offset of [0.58, 1.03, 2.61, 3.03]) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = offset % 1 < 0.1 ? 0.095 : 0.033;
      source.buffer = brush;
      source.connect(gain).connect(keys);
      source.start(at + offset * beat);
    }
  }
  return context.startRendering();
}

export function createGameAudio() {
  const context = new AudioContext();
  const output = context.createGain();
  const musicGain = context.createGain();
  output.connect(context.destination);
  musicGain.connect(output);
  musicGain.gain.value = 0.09;
  let music: AudioBufferSourceNode | null = null;
  let playing = false;
  let muted = false;
  const lastCue = { remove: -Infinity, blocked: -Infinity };
  const track = renderMusic().catch(() => null);

  function updateVolume() {
    output.gain.setTargetAtTime(playing && !muted && !document.hidden ? MASTER_GAIN : 0, context.currentTime, 0.035);
  }
  document.addEventListener("visibilitychange", updateVolume);
  updateVolume();

  return {
    // Called directly from a Start or unmute gesture.
    unlock() { void context.resume().catch(() => {}); },
    setMuted(value: boolean) { muted = value; updateVolume(); },
    setPlaying(value: boolean) {
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
      if (!playing || muted || document.hidden || context.state !== "running") return;
      const at = context.currentTime;
      if (cue !== "match") {
        if (at - lastCue[cue] < 0.09) return;
        lastCue[cue] = at;
      }
      if (cue === "remove") {
        tone(context, output, at, 570, 0.085, 0.047, "triangle", 370);
        tone(context, output, at + 0.025, 760, 0.09, 0.021, "sine", 940);
      } else if (cue === "blocked") {
        tone(context, output, at, 186, 0.10, 0.065, "triangle", 102);
      } else {
        for (const [index, note] of [72, 76, 79].entries()) {
          tone(context, output, at + index * 0.065, hz(note), 0.28, 0.052);
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
