export type SessionStage =
  | 'IDLE'
  | 'WELCOME'
  | 'EMOTION_RELEASE'
  | 'DEEP_EXPLORATION'
  | 'HEALING_PREP'
  | 'OUTRO';

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
