export type SessionStage =
  | 'IDLE'           // 대기
  | 'WELCOME'        // 환영 인사
  | 'EMOTION_CHECK'  // 감정 확인 (LLM 판단)
  | 'HEALING_PREP'   // 힐링 영상 추천 (LLM 판단)
  | 'OUTRO';         // 마무리

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type OrbState = 'idle' | 'listening' | 'speaking' | 'thinking';

export interface SessionState {
  stage: SessionStage;
  connectionStatus: ConnectionStatus;
  orbState: OrbState;
  isSessionActive: boolean;
  isVideoPlaying: boolean;
  currentVolume: number;
}
