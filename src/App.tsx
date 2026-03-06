import { useState, useRef, useEffect } from 'react';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { Header } from './components/layout/Header';
import { ClientView } from './components/layout/ClientView';
import { OperatorView } from './components/layout/OperatorView';
import { useGeminiLive } from './hooks/useGeminiLive';
import { RESUME_PROMPT } from './constants/systemPrompts';

function AppContent() {
  const {
    isDebugMode,
    toggleDebugMode,
    isSessionActive,
    setSessionActive,
    isVideoPlaying,
    setVideoPlaying,
    setStage,
    clearMessages,
    addLog,
    messages,
  } = useSession();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { connect, disconnect } = useGeminiLive();

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsMenuOpen(false);
  };

  const handleTogglePause = async () => {
    if (!isVideoPlaying) {
      disconnect();
      setVideoPlaying(true);
      addLog('SYSTEM', 'Paused - Video playback');
    } else {
      setVideoPlaying(false);
      setStage('OUTRO');
      addLog('STAGE', '쉼 안내 → 마무리');
      addLog('SYSTEM', 'Resumed - Reconnecting with context...');

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
    setIsMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-surface-100">
      {isDebugMode && <Header />}
      <main className="flex-1 flex min-h-0">
        <ClientView />
        {isDebugMode && <OperatorView />}
      </main>

      {/* 하단 컨트롤 바 */}
      <div
        ref={menuRef}
        className={`fixed z-50 flex items-center gap-2 ${
          isDebugMode
            ? 'bottom-4 left-[calc(50%-5rem)]'
            : 'bottom-4 right-4'
        }`}
      >
        {/* 재생 컨트롤 버튼들 */}
        <div className="flex items-center gap-1">
          {/* 대기 상태: 재생 버튼만 */}
          {!isSessionActive && (
            <button
              onClick={handleToggleSession}
              className={`p-2 rounded-lg transition-all ${
                isDebugMode
                  ? 'bg-surface-200 hover:bg-surface-300 text-surface-600'
                  : 'bg-black/20 hover:bg-black/40 text-white/40 hover:text-white/70'
              }`}
              title="세션 시작"
            >
              {/* Play icon */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* 세션 진행 중 */}
          {isSessionActive && (
            <>
              {/* 일시정지 중이면 재생(재개) 버튼, 아니면 일시정지 버튼 */}
              {isVideoPlaying ? (
                <button
                  onClick={handleTogglePause}
                  className={`p-2 rounded-lg transition-all ${
                    isDebugMode
                      ? 'bg-surface-200 hover:bg-surface-300 text-surface-600'
                      : 'bg-black/20 hover:bg-black/40 text-white/40 hover:text-white/70'
                  }`}
                  title="재개"
                >
                  {/* Play icon */}
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleTogglePause}
                  className={`p-2 rounded-lg transition-all ${
                    isDebugMode
                      ? 'bg-surface-200 hover:bg-surface-300 text-surface-600'
                      : 'bg-black/20 hover:bg-black/40 text-white/40 hover:text-white/70'
                  }`}
                  title="일시정지"
                >
                  {/* Pause icon */}
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
              )}

              {/* 중지 버튼 */}
              <button
                onClick={handleToggleSession}
                className={`p-2 rounded-lg transition-all ${
                  isDebugMode
                    ? 'bg-surface-200 hover:bg-surface-300 text-surface-600'
                    : 'bg-black/20 hover:bg-black/40 text-white/40 hover:text-white/70'
                }`}
                title="세션 종료"
              >
                {/* Stop icon */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* 햄버거 메뉴 */}
        <div className="relative">
          {/* 메뉴 팝업 */}
          {isMenuOpen && (
            <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg border border-surface-200 py-2 min-w-36">
              <button
                onClick={() => { toggleDebugMode(); setIsMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-surface-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {isDebugMode ? '디버그 OFF' : '디버그 ON'}
              </button>
            </div>
          )}

          {/* 햄버거 버튼 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDebugMode
                ? 'bg-surface-200 hover:bg-surface-300 text-surface-600'
                : 'bg-black/20 hover:bg-black/40 text-white/40 hover:text-white/70'
            }`}
            title="메뉴"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
