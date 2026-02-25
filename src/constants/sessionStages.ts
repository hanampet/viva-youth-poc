import type { SessionStage } from '../types/session';

export interface StageInfo {
  id: SessionStage;
  label: string;
  description: string;
  order: number;
}

export const SESSION_STAGES: StageInfo[] = [
  { id: 'IDLE', label: '대기', description: '세션 시작 대기', order: 0 },
  { id: 'WELCOME', label: '맞이', description: '환영 및 상담 확인', order: 1 },
  { id: 'EMOTION_RELEASE', label: '마음 살핌', description: '감정 해소 확인', order: 2 },
  { id: 'DEEP_EXPLORATION', label: '변화 느끼기', description: '전후 비교 성찰', order: 3 },
  { id: 'HEALING_PREP', label: '쉼 안내', description: '힐링 영상 추천', order: 4 },
  { id: 'OUTRO', label: '마무리', description: '따뜻한 인사', order: 5 },
];

export const getStageInfo = (stage: SessionStage): StageInfo => {
  return SESSION_STAGES.find((s) => s.id === stage) || SESSION_STAGES[0];
};

export const getNextStage = (currentStage: SessionStage): SessionStage | null => {
  const currentInfo = getStageInfo(currentStage);
  const nextStage = SESSION_STAGES.find((s) => s.order === currentInfo.order + 1);
  return nextStage?.id || null;
};
