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
      en: 'The research assistant is temporarily unavailable. Please try again later. No inventory or price information has been verified for this response.',
      ru: 'Исследовательский чат-бот временно недоступен. Попробуйте позже. Информация о наличии и ценах не подтверждена для этого ответа.',
      kz: 'Зерттеу чат-боты уақытша қолжетімсіз. Кейінірек қайталап көріңіз. Бұл жауап үшін пәтерлердің қолжетімділігі мен бағалары расталған жоқ.',
    };

    return {
      message: fallbackMessages[lang],
      recommendedUnits: [],
      detectedIntent: 'general_faq',
      extractedEntities: {},
      language: lang,
      options: [],
    };
  }

  private parseResponse(text: string): LLMResponse {
    // Try to extract JSON block from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          message: typeof parsed.message === 'string' ? parsed.message.slice(0, 8000) : text.replace(/```json[\s\S]*?```/, '').trim(),
          recommendedUnits: Array.isArray(parsed.recommendedUnits) ? parsed.recommendedUnits.filter((x: unknown) => typeof x === 'string').slice(0, 20) : [],
          calculation: (parsed.calculation && parsed.calculation.dp && parsed.calculation.unitCode) ? parsed.calculation : undefined,
          detectedIntent: parsed.detectedIntent || 'general_faq',
          extractedEntities: parsed.extractedEntities && typeof parsed.extractedEntities === 'object' && !Array.isArray(parsed.extractedEntities) ? parsed.extractedEntities : {},
          language: ['en', 'ru', 'kz'].includes(parsed.language) ? parsed.language : 'en',
          options: Array.isArray(parsed.options) ? parsed.options.filter((x: unknown) => typeof x === 'string').slice(0, 3) : [],
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
