import { useSession } from '../../contexts/SessionContext';
import { useGeminiLive } from '../../hooks/useGeminiLive';

const RESUME_PROMPT = `[시스템 안내] 사용자가 힐링 영상 시청을 마쳤습니다.
위의 대화 맥락을 참고하여, 따뜻한 마무리 인사를 해주세요.
"오늘 이 시간이 당신의 마음에 작은 쉼표가 되었기를 바랍니다. 조심히 돌아가세요. 당신의 내일을 응원하겠습니다." 와 같은 마무리 멘트를 자연스럽게 전달해주세요.`;

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
  } = useSession();

  const { connect, disconnect, isConnected } = useGeminiLive();

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
        {/* Session control - Two buttons side by side */}
        <div className="flex gap-2">
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
                일시정지
              </>
            )}
          </button>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-surface-200">
          <span className="text-sm text-surface-600">Gemini 연결</span>
          <div className="flex items-center gap-2">
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

        {/* Quick actions */}
        {isSessionActive && isConnected && (
          <div className="pt-2 border-t border-surface-200">
            <p className="text-xs text-surface-500 mb-2">빠른 단계 전환</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStage('EMOTION_RELEASE')}
                className="flex-1 px-2 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded text-xs transition-colors"
              >
                마음 살핌
              </button>
              <button
                onClick={() => setStage('DEEP_EXPLORATION')}
                className="flex-1 px-2 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded text-xs transition-colors"
              >
                변화 느끼기
              </button>
              <button
                onClick={() => setStage('HEALING_PREP')}
                className="flex-1 px-2 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded text-xs transition-colors"
              >
                쉼 안내
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
