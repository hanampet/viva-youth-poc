import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { SessionStage, ConnectionStatus, OrbState, SessionState } from '../types/session';
import type { ChatMessage } from '../types/chat';
import type { LogEntry, LogCategory } from '../types/log';

interface SessionContextState extends SessionState {
  messages: ChatMessage[];
  logs: LogEntry[];
  interimTranscript: string;
  conversationMode: string;
}

type SessionAction =
  | { type: 'SET_STAGE'; payload: SessionStage }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_ORB_STATE'; payload: OrbState }
  | { type: 'SET_SESSION_ACTIVE'; payload: boolean }
  | { type: 'SET_VIDEO_PLAYING'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE_BY_ID'; payload: { id: string; content: string } }
  | { type: 'SET_INTERIM_TRANSCRIPT'; payload: string }
  | { type: 'SET_CONVERSATION_MODE'; payload: string }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'CLEAR_LOGS' };

const initialState: SessionContextState = {
  stage: 'IDLE',
  connectionStatus: 'disconnected',
  orbState: 'idle',
  isSessionActive: false,
  isVideoPlaying: false,
  currentVolume: 0,
  messages: [],
  logs: [],
  interimTranscript: '',
  conversationMode: '상담',
};

function sessionReducer(state: SessionContextState, action: SessionAction): SessionContextState {
  switch (action.type) {
    case 'SET_STAGE':
      return { ...state, stage: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_ORB_STATE':
      return { ...state, orbState: action.payload };
    case 'SET_SESSION_ACTIVE':
      return { ...state, isSessionActive: action.payload };
    case 'SET_VIDEO_PLAYING':
      return { ...state, isVideoPlaying: action.payload };
    case 'SET_VOLUME':
      return { ...state, currentVolume: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload], interimTranscript: '' };
    case 'UPDATE_MESSAGE_BY_ID': {
      const messages = state.messages.map((msg) =>
        msg.id === action.payload.id
          ? { ...msg, content: msg.content + action.payload.content }
          : msg
      );
      return { ...state, messages };
    }
    case 'SET_INTERIM_TRANSCRIPT':
      return { ...state, interimTranscript: action.payload };
    case 'SET_CONVERSATION_MODE':
      return { ...state, conversationMode: action.payload };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs.slice(-100), action.payload] };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], interimTranscript: '' };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    default:
      return state;
  }
}

interface SessionContextValue extends SessionContextState {
  setStage: (stage: SessionStage) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setOrbState: (state: OrbState) => void;
  setSessionActive: (active: boolean) => void;
  setVideoPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  addMessage: (role: 'user' | 'assistant', content: string, isStreaming?: boolean) => string;
  updateMessageById: (id: string, content: string) => void;
  setInterimTranscript: (transcript: string) => void;
  setConversationMode: (mode: string) => void;
  addLog: (category: LogCategory, message: string) => void;
  clearMessages: () => void;
  clearLogs: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const setStage = useCallback((stage: SessionStage) => {
    dispatch({ type: 'SET_STAGE', payload: stage });
  }, []);

  const setConnectionStatus = useCallback((status: ConnectionStatus) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const setOrbState = useCallback((orbState: OrbState) => {
    dispatch({ type: 'SET_ORB_STATE', payload: orbState });
  }, []);

  const setSessionActive = useCallback((active: boolean) => {
    dispatch({ type: 'SET_SESSION_ACTIVE', payload: active });
  }, []);

  const setVideoPlaying = useCallback((playing: boolean) => {
    dispatch({ type: 'SET_VIDEO_PLAYING', payload: playing });
  }, []);

  const setVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);

  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string, isStreaming = false): string => {
      const id = crypto.randomUUID();
      const message: ChatMessage = {
        id,
        role,
        content,
        timestamp: new Date(),
        isStreaming,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      return id;
    },
    []
  );

  const updateMessageById = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_MESSAGE_BY_ID', payload: { id, content } });
  }, []);

  const setInterimTranscript = useCallback((transcript: string) => {
    dispatch({ type: 'SET_INTERIM_TRANSCRIPT', payload: transcript });
  }, []);

  const setConversationMode = useCallback((mode: string) => {
    dispatch({ type: 'SET_CONVERSATION_MODE', payload: mode });
  }, []);

  const addLog = useCallback((category: LogCategory, message: string) => {
    const log: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      category,
      message,
    };
    dispatch({ type: 'ADD_LOG', payload: log });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_LOGS' });
  }, []);

  const value: SessionContextValue = {
    ...state,
    setStage,
    setConnectionStatus,
    setOrbState,
    setSessionActive,
    setVideoPlaying,
    setVolume,
    addMessage,
    updateMessageById,
    setInterimTranscript,
    setConversationMode,
    addLog,
    clearMessages,
    clearLogs,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
