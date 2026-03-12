import type { SessionStage } from '../types/session';
import type { ScenarioType } from './systemPrompts';

export interface StageInfo {
  id: SessionStage;
  label: string;
  description: string;
  order: number;
}

// 힐링룸 시나리오 단계
export const HEALING_STAGES: StageInfo[] = [
  { id: 'IDLE', label: '대기', description: '세션 시작 대기', order: 0 },
  { id: 'WELCOME', label: '환영 인사', description: '환영 및 훈련 경험', order: 1 },
  { id: 'EMOTION_CHECK', label: '감정 확인', description: '전후 비교 + 감정 상태', order: 2 },
  { id: 'HEALING_PREP', label: '영상 추천', description: '힐링 영상 추천', order: 3 },
  { id: 'OUTRO', label: '마무리', description: '따뜻한 인사', order: 4 },
];

// 면접연습 시나리오 단계
export const INTERVIEW_STAGES: StageInfo[] = [
  { id: 'IDLE', label: '대기', description: '세션 시작 대기', order: 0 },
  { id: 'WELCOME', label: '인사', description: '첫 인사', order: 1 },
  { id: 'EMOTION_CHECK', label: '자기소개', description: '자기소개 연습', order: 2 },
  { id: 'HEALING_PREP', label: '질문연습', description: '지원동기/대처/출근', order: 3 },
  { id: 'OUTRO', label: '마무리', description: '격려 인사', order: 4 },
];

// 기본값 (힐링룸)
export const SESSION_STAGES = HEALING_STAGES;

// 시나리오별 단계 가져오기
export const getStagesForScenario = (scenario: ScenarioType): StageInfo[] => {
  return scenario === 'interview' ? INTERVIEW_STAGES : HEALING_STAGES;
};

export const getStageInfo = (stage: SessionStage, scenario?: ScenarioType): StageInfo => {
  const stages = scenario ? getStagesForScenario(scenario) : SESSION_STAGES;
  return stages.find((s) => s.id === stage) || stages[0];
};

export const getNextStage = (currentStage: SessionStage, scenario?: ScenarioType): SessionStage | null => {
  const stages = scenario ? getStagesForScenario(scenario) : SESSION_STAGES;
  const currentInfo = stages.find((s) => s.id === currentStage);
  const nextStage = stages.find((s) => s.order === (currentInfo?.order ?? 0) + 1);
  return nextStage?.id || null;
};
