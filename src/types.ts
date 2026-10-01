export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SavedResource {
  id: string;
  title: string;
  content: string;
  category?: string;
  zipCode?: string;
  savedAt: string;
  sourceMessageId?: string;
  notes?: string;
}
