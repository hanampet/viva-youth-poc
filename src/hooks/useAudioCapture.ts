import { useCallback, useRef, useState } from 'react';
import { AudioCapture } from '../lib/audio/capture';

interface UseAudioCaptureOptions {
  onAudioData: (base64Audio: string) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const captureRef = useRef<AudioCapture | null>(null);

  const start = useCallback(async () => {
    if (captureRef.current?.running) return;

    captureRef.current = new AudioCapture({
      onAudioData: options.onAudioData,
      onVolumeChange: options.onVolumeChange,
      onError: options.onError,
    });

    await captureRef.current.start();
    setIsCapturing(true);
  }, [options.onAudioData, options.onVolumeChange, options.onError]);

  const stop = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    setIsCapturing(false);
  }, []);

  return { start, stop, isCapturing };
}
