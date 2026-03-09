import { useEffect } from 'react';
import { useSession, type VADSensitivityLevel, type AudioDevice } from '../../contexts/SessionContext';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import { useMicrophoneMonitor } from '../../hooks/useMicrophoneMonitor';
import { RESUME_PROMPT } from '../../constants/systemPrompts';

async function enumerateAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    // 권한 요청을 위해 임시로 마이크 접근
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `마이크 ${device.deviceId.slice(0, 8)}`,
      }));
  } catch {
    return [];
  }
}

const VAD_OPTIONS: { value: VADSensitivityLevel; label: string }[] = [
  { value: 'low', label: '낮음 (소음에 강함)' },
  { value: 'default', label: '기본값' },
  { value: 'high', label: '높음 (민감)' },
];

export function ControlPanel() {
  const {
    isSessionActive,
    setSessionActive,
    isVideoPlaying,
    setVideoPlaying,
    connectionStatus,
    setStage,
    clearMessages,
    addLog,
    messages,
    vadSensitivity,
    setVadSensitivity,
    selectedMicrophoneId,
    setSelectedMicrophone,
    availableMicrophones,
    setAvailableMicrophones,
    microphoneVolume,
    setMicrophoneVolume,
  } = useSession();

  // 마이크 모니터링 - 세션이 활성화되지 않았을 때만 독립적으로 동작
  useMicrophoneMonitor({
    deviceId: selectedMicrophoneId,
    onVolumeChange: setMicrophoneVolume,  // 이미 useCallback으로 감싸진 함수
    enabled: !isSessionActive,  // 세션 시작 전에만 모니터링
  });

  // 컴포넌트 마운트 시 마이크 목록 로드
  useEffect(() => {
    enumerateAudioInputDevices().then(devices => {
      setAvailableMicrophones(devices);
    });

    // 장치 변경 감지
    const handleDeviceChange = () => {
      enumerateAudioInputDevices().then(devices => {
        setAvailableMicrophones(devices);
      });
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [setAvailableMicrophones]);

  const { connect, disconnect } = useGeminiLive();

  const handleToggleSession = async () => {
    if (!isSessionActive) {
      clearMessages();
      setSessionActive(true);
      setStage('WELCOME');
      addLog('SYSTEM', 'Session started');
      await connect();
    } else {
      disconnect();
      setSessionActive(false);
      setStage('IDLE');
      setVideoPlaying(false);
      addLog('SYSTEM', 'Session ended');
    }
  };

  const handleTogglePause = async () => {
    if (!isVideoPlaying) {
      // 일시정지: Gemini 연결 해제, 외부 영상 시청
      disconnect();
      setVideoPlaying(true);
      addLog('SYSTEM', 'Paused - Video playback');
    } else {
      // 재개: OUTRO 단계로 이동 후 컨텍스트 복원하며 재연결
      setVideoPlaying(false);
      setStage('OUTRO');
      addLog('STAGE', '쉼 안내 → 마무리');
      addLog('SYSTEM', 'Resumed - Reconnecting with context...');

      // 최근 10개 메시지만 전송 (토큰 제한)
      const recentMessages = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await connect({
        restoreContext: {
          messages: recentMessages,
          resumePrompt: RESUME_PROMPT,
        },
      });
    }
  };

  return (
    <div className="p-4 border-t border-surface-200 bg-surface-50">
      <h3 className="text-sm font-medium text-surface-700 mb-3">운영자 제어</h3>

      <div className="space-y-3">
        {/* Session control - 하단 컨트롤 바로 대체되어 비활성화 */}
        {/* <div className="flex gap-2">
          <button
            onClick={handleToggleSession}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isSessionActive
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-500 hover:bg-primary-200'
                : 'bg-primary-600 hover:bg-primary-500 text-white'
            }`}
          >
            {isSessionActive ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                세션 종료
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                세션 시작
              </>
            )}
          </button>

          <button
            onClick={handleTogglePause}
            disabled={!isSessionActive}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              !isSessionActive
                ? 'bg-surface-200 text-surface-400 cursor-not-allowed'
                : isVideoPlaying
                  ? 'bg-primary-100 text-primary-700 border-2 border-primary-500 hover:bg-primary-200'
                  : 'bg-primary-600 hover:bg-primary-500 text-white'
            }`}
          >
            {isVideoPlaying ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                재개
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                일시정지(영상재생)
              </>
            )}
          </button>
        </div> */}

        {/* Audio Settings & Connection status - Single row */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-surface-200">
          {/* VAD Sensitivity */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-surface-500">음성 감도:</span>
            <select
              value={vadSensitivity}
              onChange={(e) => setVadSensitivity(e.target.value as VADSensitivityLevel)}
              disabled={isSessionActive}
              className={`text-xs px-2 py-1 rounded border ${
                isSessionActive
                  ? 'bg-surface-100 text-surface-400 cursor-not-allowed border-surface-200'
                  : 'bg-white text-surface-700 border-surface-300 hover:border-primary-400'
              }`}
            >
              {VAD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection - Compact width, full name in dropdown */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-surface-500 shrink-0">마이크:</span>
            <select
              value={selectedMicrophoneId}
              onChange={(e) => setSelectedMicrophone(e.target.value)}
              disabled={isSessionActive}
              className={`text-xs px-2 py-1 rounded border w-32 truncate ${
                isSessionActive
                  ? 'bg-surface-100 text-surface-400 cursor-not-allowed border-surface-200'
                  : 'bg-white text-surface-700 border-surface-300 hover:border-primary-400'
              }`}
              title={
                selectedMicrophoneId
                  ? availableMicrophones.find(d => d.deviceId === selectedMicrophoneId)?.label || ''
                  : '시스템 기본값'
              }
            >
              <option value="">시스템 기본값</option>
              {availableMicrophones.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Level Meter - Expanded (마이크 입력 전용) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0" title={`마이크 입력: ${Math.round(microphoneVolume * 100)}%`}>
            <svg className="w-3.5 h-3.5 text-surface-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  microphoneVolume > 0.7
                    ? 'bg-red-500'
                    : microphoneVolume > 0.4
                      ? 'bg-yellow-500'
                      : microphoneVolume > 0.05
                        ? 'bg-green-500'
                        : 'bg-surface-300'
                }`}
                style={{ width: `${Math.min(microphoneVolume * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Connection Status - Fixed right */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : connectionStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-surface-400'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                connectionStatus === 'connected'
                  ? 'text-green-600'
                  : connectionStatus === 'connecting'
                    ? 'text-yellow-600'
                    : connectionStatus === 'error'
                      ? 'text-red-600'
                      : 'text-surface-500'
              }`}
            >
              {connectionStatus === 'connected'
                ? 'ONLINE'
                : connectionStatus === 'connecting'
                  ? 'CONNECTING...'
                  : connectionStatus === 'error'
                    ? 'ERROR'
                    : 'OFFLINE'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
