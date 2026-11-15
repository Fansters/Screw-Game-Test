import { useCallback, useEffect, useRef, useState } from "react";
import { createGameAudio } from "../game/audio";
import type { AudioChannel, Cue } from "../game/audio";

export function useGameAudio(playing: boolean) {
  const audio = useRef<ReturnType<typeof createGameAudio> | null>(null);
  const [muted, setMuted] = useState({ music: false, effects: false });

  useEffect(() => { audio.current?.setPlaying(playing); }, [playing]);
  useEffect(() => () => {
    audio.current?.close();
    audio.current = null;
  }, []);

  function enable(preferences = muted) {
    if (preferences.music && preferences.effects) return;
    try {
      if (!audio.current) {
        audio.current = createGameAudio();
        audio.current.setMuted("music", preferences.music);
        audio.current.setMuted("effects", preferences.effects);
      }
      if (!audio.current.isRunning()) audio.current.unlock();
      audio.current.setPlaying(playing);
    } catch {
      // The game remains playable when audio is unavailable.
    }
  }
  function toggle(channel: AudioChannel) {
    const next = { ...muted, [channel]: !muted[channel] };
    if (!next[channel] && playing) enable(next);
    audio.current?.setMuted(channel, next[channel]);
    setMuted(next);
  }
  const play = useCallback((cue: Cue) => audio.current?.play(cue), []);
  return { play, muted, enable, toggle };
}
