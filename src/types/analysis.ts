import type { SessionStage } from './session';

export interface SessionAnalysis {
  currentStage: SessionStage;
  conversationMode: string;
  thinkingSummary?: string;
}

export interface AnalysisState {
  currentStage: SessionStage;
  conversationMode: string;
  previousMode: string | null;
}
