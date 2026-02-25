import type { SessionStage } from '../../types/session';
import type { SessionAnalysis } from '../../types/analysis';
import { SESSION_STAGES } from '../../constants/sessionStages';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// LLM이 판단하는 단계 (IDLE, OUTRO 제외)
const LLM_CONTROLLED_STAGES = SESSION_STAGES.filter(
  (s) => s.id !== 'IDLE' && s.id !== 'OUTRO'
);

const ANALYSIS_PROMPT = `당신은 AI 심리 케어 세션의 대화를 분석하는 분석가입니다.

## 세션 단계 (LLM이 판단하는 단계만)
${LLM_CONTROLLED_STAGES.map((s) => `${s.order}. ${s.id}: ${s.label} (${s.description})`).join('\n')}

**주의: OUTRO(마무리) 단계는 운영자가 수동으로 전환합니다. 절대 OUTRO를 선택하지 마세요.**

## 대화 모드 (권장)
- "상담": 일반적인 심리 상담 대화
- "기술 문의": 시스템, AI, 기술에 대한 질문
- "시스템 설명": AI가 자신이나 시스템을 설명
- "잡담": 상담과 무관한 일상 대화
- 기타 상황에 맞는 모드를 자유롭게 생성 가능

## 중요 분석 규칙
1. **단계는 한 단계씩만 진행** - 현재 단계에서 바로 다음 단계로만 넘어갈 수 있습니다. 건너뛰기 금지!
   - 예: WELCOME(1) → EMOTION_RELEASE(2) ✓
   - 예: WELCOME(1) → HEALING_PREP(4) ✗ (불가)
2. **보수적으로 판단** - 확실히 다음 단계로 넘어갔을 때만 변경하세요
3. AI의 발화 내용을 기준으로 단계를 판단하세요 (AI가 어떤 질문/안내를 했는지)
4. AI의 thinking이 있다면 한국어로 한 문장 요약하세요
5. **HEALING_PREP이 마지막** - 힐링 영상 추천 후에는 HEALING_PREP을 유지하세요

## 단계별 판단 기준
- WELCOME: AI가 환영 인사, 호흡 안내, 상담 만족도 질문을 하고 있음
- EMOTION_RELEASE: AI가 "지금 마음 상태는 어떠신가요?" 류의 질문을 함
- DEEP_EXPLORATION: AI가 "처음과 비교해서 어떻게 변했나요?" 류의 질문을 함
- HEALING_PREP: AI가 힐링 영상(희망의 바다/치유의 숲/비 오는 정원)을 추천함`;

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

## 최근 대화
${conversationText}

${thinking ? `## AI Thinking\n${thinking.slice(0, 500)}` : ''}

위 대화를 분석해서 currentStage는 현재 단계(${currentStage}) 또는 다음 단계(${nextStageInfo?.id || currentStage}) 중 하나만 선택하세요.`;

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
