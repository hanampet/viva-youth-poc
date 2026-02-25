export type LogCategory = 'SYSTEM' | 'AUDIO' | 'ERROR' | 'GEMINI' | 'WARNING' | 'INFO' | 'MODE' | 'STAGE' | 'AI';

export interface LogEntry {
  id: string;
  timestamp: Date;
  category: LogCategory;
  message: string;
}
