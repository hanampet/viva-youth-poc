import { useCallback, useRef, useState, useEffect } from 'react';
import { AudioPlayback } from '../lib/audio/playback';

interface UseAudioPlaybackOptions {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRef = useRef<AudioPlayback | null>(null);

  useEffect(() => {
    playbackRef.current = new AudioPlayback({
      onPlaybackStart: () => {
        setIsPlaying(true);
        options.onPlaybackStart?.();
      },
      onPlaybackEnd: () => {
        setIsPlaying(false);
        options.onPlaybackEnd?.();
      },
      onVolumeChange: options.onVolumeChange,
    });

    playbackRef.current.init();

    return () => {
      playbackRef.current?.close();
    };
  }, []);

  const play = useCallback((base64Audio: string) => {
    playbackRef.current?.playBase64Audio(base64Audio);
  }, []);

  const stop = useCallback(() => {
    playbackRef.current?.stop();
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying };
}
