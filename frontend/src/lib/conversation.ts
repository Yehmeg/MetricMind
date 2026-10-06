import type { QueryRequest, QueryResponse, PlanResponse } from '@/types/api';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'streaming' | 'complete' | 'error';
  plan?: PlanResponse;
  query?: QueryRequest;
  response?: QueryResponse;
  error?: string;
}

export interface ConversationState {
  messages: ConversationMessage[];
  isProcessing: boolean;
  currentRequestId?: string;
}

export type ConversationAction =
  | { type: 'ADD_USER_MESSAGE'; payload: { content: string } }
  | { type: 'ADD_ASSISTANT_MESSAGE'; payload: Omit<ConversationMessage, 'id' | 'role'> }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ConversationMessage> } }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'RETRY_MESSAGE'; payload: { id: string } };

export const initialConversationState: ConversationState = {
  messages: [],
  isProcessing: false,
};

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE': {
      const newMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: action.payload.content,
        timestamp: new Date(),
        status: 'sent',
      };
      return {
        ...state,
        messages: [...state.messages, newMessage],
      };
    }
    case 'ADD_ASSISTANT_MESSAGE': {
      const newMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        ...action.payload,
      };
      return {
        ...state,
        messages: [...state.messages, newMessage],
      };
    }
    case 'UPDATE_MESSAGE': {
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };
    }
    case 'SET_PROCESSING': {
      return { ...state, isProcessing: action.payload };
    }
    case 'CLEAR_CONVERSATION': {
      return initialConversationState;
    }
    case 'RETRY_MESSAGE': {
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, status: 'streaming' as const, error: undefined } : msg
        ),
      };
    }
    default:
      return state;
  }
}