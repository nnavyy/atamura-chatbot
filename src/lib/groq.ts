import { ChatMessage, LLMResponse, LLMProvider } from './llm';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const PRIMARY_MODEL = 'openai/gpt-oss-120b';
export const FALLBACK_MODEL = 'qwen/qwen3.8-27b';

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

export class GroqProvider implements LLMProvider {
  private getApiKey(): string {
    return process.env.GROQ_API_KEY || '';
  }

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    unitContext: string,
    targetModel?: string
  ): Promise<LLMResponse> {
    const apiKey = this.getApiKey();
    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    if (!apiKey) {
      console.error('GroqProvider: GROQ_API_KEY environment variable is missing.');
      return this.getFallbackResponse(lastUserMessage);
    }

    const fullSystemPrompt = `${systemPrompt}\n\n--- AVAILABLE UNITS DATA ---\n${unitContext}\n--- END UNITS DATA ---\n\nIMPORTANT: You MUST respond with a valid JSON object matching the following structure:\n{\n  "message": "Your helpful response here in the user's language",\n  "recommendedUnits": ["1B", "2A"],\n  "calculation": null,\n  "detectedIntent": "unit_recommendation",\n  "extractedEntities": {},\n  "language": "en",\n  "options": ["Show me 1BR", "What is the down payment?"]\n}\nStrict Availability Rule: Only recommend units with status 'available'. Unit 2V is RESERVED and Unit 3B is SOLD OUT. Never recommend 2V or 3B.\nStrict Budget Rule: Never recommend units whose price exceeds the user's budget. If no available units match the budget, recommendedUnits must be [].`;

    const apiMessages = [
      { role: 'system' as const, content: fullSystemPrompt },
      ...messages.map((msg) => ({
        role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      })),
    ];

    // Multi-tier model routing: try target/primary model first, fallback to secondary model
    const candidateModels = targetModel
      ? [targetModel, ...(targetModel === PRIMARY_MODEL ? [FALLBACK_MODEL] : [PRIMARY_MODEL])]
      : [PRIMARY_MODEL, FALLBACK_MODEL];

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const model = candidateModels[mIdx];
      const maxRetries = 5;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: apiMessages,
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.warn(
              `Groq API request failed [model: ${model}, attempt: ${attempt + 1}/${maxRetries}, status: ${response.status}]:`,
              errorText
            );

            // Handle rate limit (429) with exact delay from Groq error message
            if (response.status === 429) {
              let waitMs = 5000;
              const matchSec = errorText.match(/try again in ([0-9.]+)s/i);
              if (matchSec) {
                waitMs = Math.ceil(parseFloat(matchSec[1]) * 1000) + 1500;
              }
              console.warn(`[GroqProvider 429] Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue;
            }

            // Handle transient server errors (500, 502, 503, 504)
            if (response.status >= 500) {
              const waitMs = (attempt + 1) * 3000;
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue;
            }

            // If primary model failed after retries, break to fallback model
            break;
          }

          const data: GroqChatCompletionResponse = await response.json();
          const rawContent = data.choices?.[0]?.message?.content;

          if (!rawContent) {
            console.warn(`Groq API returned empty content [model: ${model}]`);
            if (attempt < maxRetries - 1) continue;
            break;
          }

          const parsed = this.parseResponse(rawContent, lastUserMessage, model);
          return parsed;
        } catch (error: unknown) {
          const err = error as { name?: string; message?: string };
          console.error(
            `Groq attempt ${attempt + 1}/${maxRetries} failed [model: ${model}]:`,
            err?.message || error
          );

          if (attempt < maxRetries - 1) {
            const backoffMs = (attempt + 1) * 2000;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
    }

    console.warn('GroqProvider: All candidates and retries exhausted. Returning fallback response.');
    return this.getFallbackResponse(lastUserMessage);
  }

  private parseResponse(text: string, userMessage: string, model: string): LLMResponse {
    let rawObj: unknown = null;

    // 1. Try parsing directly as JSON
    try {
      rawObj = JSON.parse(text);
    } catch {
      // 2. Try extracting from markdown ```json ... ``` code fence
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) {
        try {
          rawObj = JSON.parse(fenceMatch[1]);
        } catch {
          // ignore
        }
      }

      // 3. Try finding any outer JSON object {...}
      if (!rawObj) {
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            rawObj = JSON.parse(objMatch[0]);
          } catch {
            // ignore
          }
        }
      }
    }

    // Determine fallback language from user message
    const hasRussian = /[а-яё]/i.test(userMessage);
    const hasKazakh = /[ұүқғәіңө]/i.test(userMessage);
    const defaultLang: 'en' | 'ru' | 'kz' = hasKazakh ? 'kz' : hasRussian ? 'ru' : 'en';

    if (rawObj && typeof rawObj === 'object') {
      const p = rawObj as Record<string, unknown>;

      // Sanitize recommended units
      let recommendedUnits: string[] = [];
      if (Array.isArray(p.recommendedUnits)) {
        recommendedUnits = p.recommendedUnits.filter((u): u is string => typeof u === 'string');
      }

      // Sanitize language
      let language: 'en' | 'ru' | 'kz' = defaultLang;
      if (p.language === 'kz' || p.language === 'ru' || p.language === 'en') {
        language = p.language;
      }

      // Sanitize calculation object
      let calculation: LLMResponse['calculation'] = undefined;
      if (
        p.calculation &&
        typeof p.calculation === 'object' &&
        !Array.isArray(p.calculation)
      ) {
        const c = p.calculation as Record<string, unknown>;
        if (typeof c.unitCode === 'string' && typeof c.dp === 'number') {
          calculation = {
            unitCode: c.unitCode,
            method: typeof c.method === 'string' ? c.method : 'installment',
            dp: Number(c.dp) || 0,
            monthly: Number(c.monthly) || 0,
            total: Number(c.total) || 0,
            tenor: Number(c.tenor) || 36,
          };
        }
      }

      // Sanitize options
      let options: string[] = [];
      if (Array.isArray(p.options)) {
        options = p.options.filter((o): o is string => typeof o === 'string');
      }

      // Sanitize message
      let message = '';
      if (typeof p.message === 'string' && p.message.trim().length > 0) {
        message = p.message.trim();
      } else {
        message = text.replace(/```(?:json)?[\s\S]*?```/g, '').trim() || text;
      }

      return {
        message,
        recommendedUnits,
        calculation,
        detectedIntent: typeof p.detectedIntent === 'string' ? p.detectedIntent : 'general_faq',
        extractedEntities:
          p.extractedEntities && typeof p.extractedEntities === 'object' && !Array.isArray(p.extractedEntities)
            ? (p.extractedEntities as Record<string, unknown>)
            : {},
        language,
        options,
        modelUsed: model as 'openai/gpt-oss-120b' | 'qwen/qwen3.8-27b' | 'fallback',
      };
    }

    // Fallback if parsing failed completely
    const cleanText = text.replace(/```(?:json)?[\s\S]*$/m, '').trim();
    return {
      message: cleanText || text,
      recommendedUnits: [],
      calculation: undefined,
      detectedIntent: 'general_faq',
      extractedEntities: {},
      language: defaultLang,
      options: [],
      modelUsed: model as 'openai/gpt-oss-120b' | 'qwen/qwen3.8-27b' | 'fallback',
    };
  }

  private getFallbackResponse(userMessage: string): LLMResponse {
    const hasRussian = /[а-яё]/i.test(userMessage);
    const hasKazakh = /[ұүқғәіңө]/i.test(userMessage);
    const lang: 'en' | 'ru' | 'kz' = hasKazakh ? 'kz' : hasRussian ? 'ru' : 'en';

    const fallbackMessages = {
      en: 'Thank you for your interest in KERUEN! Our AI assistant is currently busy. In the meantime, I can share that we have 1BR apartments from 12,000,000 ₸, 2BR from 19,500,000 ₸, and 3BR from 32,500,000 ₸. For immediate assistance, please call +7 (700) 700 11 11 or visit atamuragroup.kz.',
      ru: 'Благодарим за интерес к ЖК KERUEN! Наш AI-ассистент сейчас загружен. Тем временем, хочу сообщить, что у нас есть 1-комнатные от 12 000 000 ₸, 2-комнатные от 19 500 000 ₸ и 3-комнатные от 32 500 000 ₸. Для быстрой связи звоните +7 (700) 700 11 11 или посетите atamuragroup.kz.',
      kz: 'KERUEN тұрғын үй кешеніне қызығушылығыңыз үшін рахмет! AI-көмекшіміз қазір бос емес. Бізде 1 бөлмелі пәтерлер 12 000 000 ₸-дан, 2 бөлмелі 19 500 000 ₸-дан, 3 бөлмелі 32 500 000 ₸-дан бар. Жылдам байланыс үшін +7 (700) 700 11 11 қоңырау шалыңыз.',
    };

    return {
      message: fallbackMessages[lang],
      recommendedUnits: [],
      calculation: undefined,
      detectedIntent: 'general_faq',
      extractedEntities: {},
      language: lang,
      options: ['Show me 1BR', 'I want to see 2BR', 'Tell me about installment'],
      modelUsed: 'fallback',
    };
  }
}

export const groqProvider = new GroqProvider();
