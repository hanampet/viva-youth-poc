import { useEffect, useRef } from 'react';
import { useSession } from '../../contexts/SessionContext';
import type { LogCategory } from '../../types/log';

const categoryColors: Record<LogCategory, string> = {
  SYSTEM: 'log-system',
  AUDIO: 'log-audio',
  ERROR: 'log-error',
  GEMINI: 'log-gemini',
  WARNING: 'log-warning',
  INFO: 'log-info',
  MODE: 'log-mode',
  STAGE: 'log-stage',
  AI: 'log-ai',
};

export function DebugConsole() {
  const { logs, clearLogs } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="h-24 flex flex-col bg-surface-900">
      <div className="px-4 py-2 border-b border-surface-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-300">디버그 콘솔</h3>
        <button
          onClick={clearLogs}
          className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 debug-console"
      >
        {logs.length === 0 ? (
          <p className="text-surface-500">시스템 로그가 여기에 표시됩니다</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 leading-relaxed">
              <span className="text-surface-500 shrink-0">[{formatTime(log.timestamp)}]</span>
              <span className={`shrink-0 ${categoryColors[log.category]}`}>
                [{log.category}]
              </span>
              <span className="text-surface-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
