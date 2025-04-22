// src/types/index.ts

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
  }
  
  export interface DocumentTemplate {
    id: string;
    name: string;
    description: string;
    content: string;
    category: 'wniosek' | 'raport' | 'harmonogram' | 'budżet' | 'inne';
  }
  
  export interface KnowledgeItem {
    term: string;
    definition: string;
    category: string;
  }