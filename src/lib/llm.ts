// Swap-ready LLM abstraction layer
// Currently backed by Google Gemini, can be swapped to GPT/Claude by implementing this interface

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  message: string;
  recommendedUnits: string[];
  calculation?: {
    unitCode: string;
    method: string;
    dp: number;
    monthly: number;
    total: number;
    tenor: number;
  };
  detectedIntent: string;
  extractedEntities: Record<string, unknown>;
  language: 'en' | 'ru' | 'kz';
  options?: string[];
}

export interface LLMProvider {
  generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    unitContext: string
  ): Promise<LLMResponse>;
}

// Re-export for convenience
export type { ChatMessage as Message };
