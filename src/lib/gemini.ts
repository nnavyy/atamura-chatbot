import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage, LLMResponse, LLMProvider } from './llm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiProvider implements LLMProvider {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    unitContext: string
  ): Promise<LLMResponse> {
    const fullSystemPrompt = `${systemPrompt}\n\n--- AVAILABLE UNITS DATA ---\n${unitContext}\n--- END UNITS DATA ---`;

    // Build conversation as a single prompt for reliability
    const conversationHistory = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const finalPrompt = `${fullSystemPrompt}\n\n--- CONVERSATION ---\n${conversationHistory}\n--- END CONVERSATION ---\n\nRespond to the last user message. Remember to include the JSON block at the end of your response.`;

    // Retry logic with exponential backoff
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(finalPrompt);
        const responseText = result.response.text();
        return this.parseResponse(responseText);
      } catch (error: unknown) {
        const errorObj = error as { status?: number; message?: string };
        console.error(`Gemini attempt ${attempt + 1}/${maxRetries} failed:`, errorObj.message || error);
        
        if (errorObj.status === 429 && attempt < maxRetries - 1) {
          // Rate limited — wait and retry
          const waitMs = (attempt + 1) * 15000; // 15s, 30s, 45s
          console.log(`Rate limited. Waiting ${waitMs / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        
        if (attempt === maxRetries - 1) {
          // All retries exhausted — return a friendly fallback
          return this.getFallbackResponse(messages[messages.length - 1]?.content || '');
        }
      }
    }
    
    return this.getFallbackResponse(messages[messages.length - 1]?.content || '');
  }

  private getFallbackResponse(userMessage: string): LLMResponse {
    // Detect language from user message
    const hasRussian = /[а-яё]/i.test(userMessage);
    const hasKazakh = /[ұүқғәіңө]/i.test(userMessage);
    const lang = hasKazakh ? 'kz' : hasRussian ? 'ru' : 'en';

    const fallbackMessages = {
      en: 'Thank you for your interest in KERUEN! Our AI assistant is currently busy. In the meantime, I can share that we have 1BR apartments from 12,000,000 ₸, 2BR from 19,200,000 ₸, and 3BR from 32,500,000 ₸. For immediate assistance, please call +7 (700) 700 11 11 or visit atamuragroup.kz.',
      ru: 'Благодарим за интерес к ЖК KERUEN! Наш AI-ассистент сейчас загружен. Тем временем, хочу сообщить, что у нас есть 1-комнатные от 12 000 000 ₸, 2-комнатные от 19 200 000 ₸ и 3-комнатные от 32 500 000 ₸. Для быстрой связи звоните +7 (700) 700 11 11 или посетите atamuragroup.kz.',
      kz: 'KERUEN тұрғын үй кешеніне қызығушылығыңыз үшін рахмет! AI-көмекшіміз қазір бос емес. Бізде 1 бөлмелі пәтерлер 12 000 000 ₸-дан, 2 бөлмелі 19 200 000 ₸-дан, 3 бөлмелі 32 500 000 ₸-дан бар. Жылдам байланыс үшін +7 (700) 700 11 11 қоңырау шалыңыз.',
    };

    return {
      message: fallbackMessages[lang],
      recommendedUnits: ['1B', '2A', '3A'],
      detectedIntent: 'general_faq',
      extractedEntities: {},
      language: lang,
      options: ['Show me 1BR', 'I want to see 2BR', 'Tell me about installment'],
    };
  }

  private parseResponse(text: string): LLMResponse {
    // Try to extract JSON block from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          message: parsed.message || text.replace(/```json[\s\S]*?```/, '').trim(),
          recommendedUnits: parsed.recommendedUnits || [],
          calculation: (parsed.calculation && parsed.calculation.dp && parsed.calculation.unitCode) ? parsed.calculation : undefined,
          detectedIntent: parsed.detectedIntent || 'general_faq',
          extractedEntities: parsed.extractedEntities || {},
          language: parsed.language || 'en',
          options: parsed.options || [],
        };
      } catch {
        // JSON parse failed, fall through to plain text
      }
    }

    // Fallback: return plain text response (strip any partial JSON)
    const cleanText = text.replace(/```json[\s\S]*$/m, '').trim();
    return {
      message: cleanText || text,
      recommendedUnits: [],
      detectedIntent: 'general_faq',
      extractedEntities: {},
      language: 'en',
      options: [],
    };
  }
}

export const geminiProvider = new GeminiProvider();
