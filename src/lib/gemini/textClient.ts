import type { SessionStage } from '../../types/session';
import type { SessionAnalysis } from '../../types/analysis';
import { SESSION_STAGES } from '../../constants/sessionStages';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// LLM이 판단하는 단계 (IDLE, OUTRO 제외)
const LLM_CONTROLLED_STAGES = SESSION_STAGES.filter(
  (s) => s.id !== 'IDLE' && s.id !== 'OUTRO'
);

const ANALYSIS_PROMPT = `당신은 AI 심리 케어 세션의 진행 단계를 **예측**하는 분석가입니다.

## 세션 단계
${LLM_CONTROLLED_STAGES.map((s) => `${s.order}. ${s.id}: ${s.label} (${s.description})`).join('\n')}

**주의: OUTRO(마무리) 단계는 운영자가 수동으로 전환합니다. 절대 OUTRO를 선택하지 마세요.**

## 핵심: AI Thinking 기반 예측
**AI의 thinking(내부 생각)을 보고 AI가 지금 어떤 단계를 진행하려는지 예측하세요.**
- thinking에 "환영", "호흡", "상담 만족도" 언급 → WELCOME
- thinking에 "마음 상태", "후련", "감정 해소" 언급 → EMOTION_RELEASE
- thinking에 "처음과 비교", "변화", "전후" 언급 → DEEP_EXPLORATION
- thinking에 "힐링 영상", "추천", "바다/숲/정원" 언급 → HEALING_PREP

## 분석 규칙
1. **AI thinking이 가장 중요한 판단 기준** - AI가 무엇을 하려는지 예측
2. **단계는 한 단계씩만 진행** - 건너뛰기 금지
3. AI의 thinking이 있다면 한국어로 한 문장 요약
4. **HEALING_PREP이 마지막** - 힐링 영상 추천 후 유지

## 대화 모드
- "상담": 일반적인 심리 상담 대화
- "기술 문의": 시스템, AI, 기술에 대한 질문
- "잡담": 상담과 무관한 일상 대화`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    currentStage: {
      type: 'string',
      enum: ['WELCOME', 'EMOTION_RELEASE', 'DEEP_EXPLORATION', 'HEALING_PREP'],
      description: '현재 세션 단계 (IDLE, OUTRO 제외)',
    },
    conversationMode: {
      type: 'string',
      description: '현재 대화 모드 (상담, 기술 문의, 시스템 설명, 잡담 등)',
    },
    thinkingSummary: {
      type: 'string',
      description: 'AI thinking 요약 (있는 경우)',
    },
  },
  required: ['currentStage', 'conversationMode'],
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AnalyzeOptions {
  messages: Message[];
  currentStage: SessionStage;
  thinking?: string;
}

export async function analyzeSession(
  apiKey: string,
  options: AnalyzeOptions
): Promise<SessionAnalysis | null> {
  const { messages, currentStage, thinking } = options;

  if (messages.length === 0) {
    return null;
  }

  // IDLE 또는 OUTRO 단계에서는 분석하지 않음 (운영자가 제어)
  if (currentStage === 'IDLE' || currentStage === 'OUTRO') {
    console.log('[TextLLM] Skipping analysis for operator-controlled stage:', currentStage);
    return null;
  }

  // 현재 단계 정보와 다음 단계 계산
  const currentInfo = SESSION_STAGES.find((s) => s.id === currentStage);
  const nextStageInfo = SESSION_STAGES.find((s) => s.order === (currentInfo?.order ?? 0) + 1);

  const conversationText = messages
    .slice(-6) // 최근 6개 메시지만
    .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  const userPrompt = `## 현재 상태
- 현재 세션 단계: ${currentStage} (${currentInfo?.label})
- 가능한 다음 단계: ${nextStageInfo ? `${nextStageInfo.id} (${nextStageInfo.label})` : '없음 (마지막 단계)'}

${thinking ? `## AI Thinking (중요! 이것을 보고 예측하세요)\n${thinking.slice(0, 500)}` : ''}

## 참고: 최근 대화
${conversationText}

**AI의 thinking을 분석하여** AI가 지금 진행하려는 단계를 예측하세요.
currentStage는 현재 단계(${currentStage}) 또는 다음 단계(${nextStageInfo?.id || currentStage}) 중 하나만 선택하세요.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: ANALYSIS_PROMPT }] },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
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
    const resultStageInfo = SESSION_STAGES.find((s) => s.id === result.currentStage);
    if (resultStageInfo && currentInfo) {
      const stageDiff = resultStageInfo.order - currentInfo.order;
      if (stageDiff > 1) {
        // 2단계 이상 점프 시 다음 단계로 제한
        console.log('[TextLLM] Stage jump detected, limiting to next stage');
        result.currentStage = nextStageInfo?.id || currentStage;
      } else if (stageDiff < 0) {
        // 뒤로 가는 것 방지
        console.log('[TextLLM] Stage regression detected, keeping current stage');
        result.currentStage = currentStage;
      }
    }

    // HEALING_PREP 이후로 넘어가지 않도록 (OUTRO는 운영자가 제어)
    if (result.currentStage === 'OUTRO') {
      console.log('[TextLLM] OUTRO stage detected, keeping HEALING_PREP');
      result.currentStage = 'HEALING_PREP';
    }

    return result;
  } catch (error) {
    console.error('[TextLLM] Analysis failed:', error);
    return null;
  }
}
