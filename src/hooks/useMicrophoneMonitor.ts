import { useEffect, useRef, useCallback } from 'react';

interface UseMicrophoneMonitorOptions {
  deviceId: string;
  onVolumeChange: (volume: number) => void;
  enabled: boolean;
}

// 전역 cleanup 완료 대기용
let cleanupPromise: Promise<void> | null = null;

export async function waitForMonitorCleanup(): Promise<void> {
  if (cleanupPromise) {
    await cleanupPromise;
  }
}

export function useMicrophoneMonitor({ deviceId, onVolumeChange, enabled }: UseMicrophoneMonitorOptions) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const closeContext = async () => {
        if (audioContextRef.current) {
          try {
            await audioContextRef.current.close();
          } catch {
            // ignore
          }
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        onVolumeChange(0);
        resolve();
      };

      closeContext();
    });
  }, [onVolumeChange]);

  const startMonitoring = useCallback(async () => {
    // 기존 리소스 정리
    await cleanup();

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? { deviceId: { exact: deviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // AudioContext가 suspended 상태일 수 있으므로 resume
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // RMS 계산
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const volume = Math.min(rms / 128, 1);

        onVolumeChange(volume);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (error) {
      console.error('Microphone monitoring failed:', error);
      onVolumeChange(0);
    }
  }, [deviceId, onVolumeChange, cleanup]);

  useEffect(() => {
    if (enabled) {
      startMonitoring();
      cleanupPromise = null;
    } else {
      cleanupPromise = cleanup();
    }

    return () => {
      cleanupPromise = cleanup();
    };
  }, [enabled, deviceId, startMonitoring, cleanup]);

  return {
    restart: startMonitoring,
    cleanup,
  };
}
