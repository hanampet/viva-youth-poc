import type { SessionStage } from '../../types/session';
import type { SessionAnalysis } from '../../types/analysis';
import { type ScenarioType, getAnalysisPrompt, getAnalysisStages } from '../../constants/systemPrompts';
import { getStagesForScenario } from '../../constants/sessionStages';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const getResponseSchema = (scenario: ScenarioType) => {
  return {
    type: 'object',
    properties: {
      currentStage: {
        type: 'string',
        enum: getAnalysisStages(scenario),
        description: '현재 세션 단계 (IDLE, OUTRO 제외)',
      },
      conversationMode: {
        type: 'string',
        description: '현재 대화 모드',
      },
      thinkingSummary: {
        type: 'string',
        description: 'AI thinking 요약 (있는 경우)',
      },
    },
    required: ['currentStage', 'conversationMode'],
  };
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AnalyzeOptions {
  messages: Message[];
  currentStage: SessionStage;
  scenario: ScenarioType;
  thinking?: string;
  aiResponse?: string;
}

export async function analyzeSession(
  apiKey: string,
  options: AnalyzeOptions
): Promise<SessionAnalysis | null> {
  const { messages, currentStage, scenario, thinking, aiResponse } = options;

  if (messages.length === 0) {
    console.log('[TextLLM] Skipped: no messages');
    return null;
  }

  // IDLE 단계에서는 분석하지 않음 (운영자가 제어)
  if (currentStage === 'IDLE') {
    console.log('[TextLLM] Skipped: IDLE stage');
    return null;
  }

  // 힐링룸: OUTRO 단계에서는 분석하지 않음 (영상 후 운영자가 전환)
  if (scenario === 'healing' && currentStage === 'OUTRO') {
    console.log('[TextLLM] Skipped: OUTRO stage (healing)');
    return null;
  }

  const stages = getStagesForScenario(scenario);
  const currentInfo = stages.find((s) => s.id === currentStage);
  const nextStageInfo = stages.find((s) => s.order === (currentInfo?.order ?? 0) + 1);

  console.log('[TextLLM] Stage info:', { currentStage, nextStage: nextStageInfo?.id });

  // 힐링룸: OUTRO 직전 단계(HEALING_PREP)면 분석하지 않음 (운영자가 전환)
  if (scenario === 'healing' && nextStageInfo?.id === 'OUTRO') {
    console.log('[TextLLM] Skipped: next is OUTRO (healing)');
    return null;
  }

  const conversationText = messages
    .slice(-6)
    .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  const userPrompt = `## 현재 상태
- 시나리오: ${scenario === 'interview' ? '면접연습' : '힐링룸'}
- 현재 세션 단계: ${currentStage} (${currentInfo?.label})
- 가능한 다음 단계: ${nextStageInfo ? `${nextStageInfo.id} (${nextStageInfo.label})` : '없음 (마지막 단계)'}

${aiResponse ? `## AI 응답 (가장 중요! 이것을 보고 단계를 파악하세요)\n${aiResponse}` : ''}

${thinking ? `## AI Thinking\n${thinking.slice(0, 500)}` : ''}

## 참고: 최근 대화
${conversationText}

**AI 응답 내용을 분석하여** AI가 지금 진행하고 있는 단계를 파악하세요.
- 힐링룸에서 "영상", "바다", "명상", "추천" 등의 키워드가 있으면 HEALING_PREP 단계입니다.
- 면접연습에서 마무리 인사, 격려, 응원의 말이 있으면 OUTRO 단계입니다.
currentStage는 현재 단계(${currentStage}) 또는 다음 단계(${nextStageInfo?.id || currentStage}) 중 하나만 선택하세요.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: getAnalysisPrompt(scenario) }] },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: getResponseSchema(scenario),
        },
      }),
    });

    if (!response.ok) {
      console.error('[TextLLM] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[TextLLM] No response text');
      return null;
    }

    const result = JSON.parse(text) as SessionAnalysis;

    // 단계 점프 방지: 한 단계씩만 진행 가능
    const resultStageInfo = stages.find((s) => s.id === result.currentStage);
    if (resultStageInfo && currentInfo) {
      const stageDiff = resultStageInfo.order - currentInfo.order;
      if (stageDiff > 1) {
        result.currentStage = nextStageInfo?.id || currentStage;
      } else if (stageDiff < 0) {
        result.currentStage = currentStage;
      }
    }

    // 힐링룸: OUTRO로 넘어가지 않도록 (운영자가 영상 후 전환)
    if (scenario === 'healing' && result.currentStage === 'OUTRO') {
      result.currentStage = currentStage;
    }

    return result;
  } catch (error) {
    console.error('[TextLLM] Analysis failed:', error);
    return null;
  }
}
