import { useEffect, useRef } from 'react';
import { useSession } from '../../contexts/SessionContext';

export function ChatLog() {
  const { messages, interimTranscript } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-b border-surface-200">
      <div className="px-4 py-2 border-b border-surface-200 flex items-center justify-between bg-surface-50">
        <h3 className="text-sm font-medium text-surface-700">대화 로그</h3>
        <span className="text-xs text-surface-500">{messages.length} messages</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-50"
      >
        {messages.length === 0 && !interimTranscript ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-400 text-sm">대화가 시작되면 여기에 표시됩니다</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-white text-surface-800 rounded-bl-md shadow-sm border border-surface-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-primary-200' : 'text-surface-400'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                    {message.isStreaming && (
                      <span className="ml-2 inline-flex items-center">
                        <span className="w-1 h-1 bg-current rounded-full animate-pulse" />
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {/* Interim transcript - user is currently speaking */}
            {interimTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-primary-300 text-white rounded-br-md opacity-70">
                  <p className="text-sm whitespace-pre-wrap">{interimTranscript}</p>
                  <p className="text-xs mt-1 text-primary-100 flex items-center gap-1">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <span className="ml-1">말하는 중...</span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
