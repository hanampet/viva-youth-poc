import { useCallback, useRef } from 'react';
import { analyzeSession } from '../lib/gemini/textClient';
import { useSession } from '../contexts/SessionContext';
import { getStageInfo } from '../constants/sessionStages';

export function useSessionAnalyzer() {
  const {
    messages,
    stage,
    conversationMode,
    setStage,
    setConversationMode,
    addLog,
  } = useSession();

  const previousModeRef = useRef<string>(conversationMode);
  const isAnalyzingRef = useRef(false);

  const analyze = useCallback(async (thinking?: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || messages.length === 0 || isAnalyzingRef.current) {
      return;
    }

    isAnalyzingRef.current = true;

    try {
      const result = await analyzeSession(apiKey, {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        currentStage: stage,
        thinking,
      });

      if (!result) {
        isAnalyzingRef.current = false;
        return;
      }

      // 세션 단계 변경
      if (result.currentStage !== stage) {
        const prevInfo = getStageInfo(stage);
        const newInfo = getStageInfo(result.currentStage);
        setStage(result.currentStage);
        addLog('STAGE', `${prevInfo.label} → ${newInfo.label}`);
      }

      // 대화 모드 변경
      if (result.conversationMode !== previousModeRef.current) {
        addLog('MODE', `${previousModeRef.current} → ${result.conversationMode}`);
        previousModeRef.current = result.conversationMode;
        setConversationMode(result.conversationMode);
      }

      // AI thinking 요약
      if (result.thinkingSummary) {
        addLog('AI', result.thinkingSummary);
      }
    } catch (error) {
      console.error('[SessionAnalyzer] Analysis error:', error);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [messages, stage, setStage, setConversationMode, addLog]);

  return { analyze };
}
