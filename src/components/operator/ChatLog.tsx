import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../contexts/SessionContext';

export function ChatLog() {
  const { messages, interimTranscript } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const text = sortedMessages
      .map((m) => `[${formatTime(m.timestamp)}] ${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-48 border-b border-surface-200">
      <div className="px-4 py-2 border-b border-surface-200 flex items-center justify-between bg-surface-50">
        <h3 className="text-sm font-medium text-surface-700">대화 로그</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">{messages.length} messages</span>
          <button
            onClick={handleCopy}
            disabled={messages.length === 0}
            className={`p-1 rounded transition-colors ${
              messages.length === 0
                ? 'text-surface-300 cursor-not-allowed'
                : copied
                  ? 'text-green-500'
                  : 'text-surface-400 hover:text-surface-600 hover:bg-surface-200'
            }`}
            title={copied ? '복사됨!' : '대화 로그 복사'}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
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
            {[...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map((message) => (
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
