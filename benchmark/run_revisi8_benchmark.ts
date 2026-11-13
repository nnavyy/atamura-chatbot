import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  evaluateResponse,
  EvalScore,
  FinancialGroundTruthCase,
  PilotCase,
  Unit,
} from './evaluator';
import { getAllPaymentOptions, PaymentMethod } from '../src/lib/calculator';
import { KERUEN_CATALOG_SNAPSHOT } from '../src/lib/catalogSnapshot';
import { processPropertyQuery, ProcessPropertyQueryOptions } from '../src/lib/chatEngine';
import { detectLanguage } from '../src/lib/i18n';
import { extractEntities, maskPhoneNumbers, stripPhoneNumbers } from '../src/lib/intentClassifier';
import { buildSystemPrompt, buildUnitContext } from '../src/lib/knowledgeBase';
import { ChatMessage, LLMProvider, LLMResponse } from '../src/lib/llm';
import { extractCriteria, filterUnits } from '../src/lib/rules';

// ============================================================================
// Constants & Controlled Hyperparameters (Uniform across ALL configurations)
// ============================================================================

const DIRECT_GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
let activeGroqApiUrl = process.env.GROQ_API_URL || 'http://127.0.0.1:20128/v1/chat/completions';
const isLocalRouterUrl = (url: string): boolean => /localhost|127\.0\.0\.1/.test(url);
const normalizeModelId = (m?: string): string => (m ? m.replace(/^groq\//, '') : '');
const BENCHMARK_TEMPERATURE = 0.1;
const BENCHMARK_MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 10;

const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'] as const;

export type BenchmarkMode = 'pilot' | 'main' | 'ablation';
export type ArchitectureConfig =
  | 'zero_shot'
  | 'full_context'
  | 'plus_prefilter'
  | 'plus_calculator'
  | 'proposed_hybrid';

const ALL_CONFIGS: ArchitectureConfig[] = [
  'zero_shot',
  'full_context',
  'plus_prefilter',
  'plus_calculator',
  'proposed_hybrid',
];

const MODE_DEFAULT_CONFIGS: Record<BenchmarkMode, ArchitectureConfig[]> = {
  pilot: ['zero_shot', 'full_context', 'proposed_hybrid'],
  main: ['zero_shot', 'full_context', 'proposed_hybrid'],
  ablation: ['full_context', 'plus_prefilter', 'plus_calculator', 'proposed_hybrid'],
};

const INSTALLMENT_MAX_MONTHS = 36;
const MORTGAGE_MAX_MONTHS = 240;

const CYRILLIC_TO_LATIN_UNIT: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'V',
};

// ============================================================================
// Types
// ============================================================================

interface UsageTelemetry {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  queue_time?: number;
  prompt_time?: number;
  completion_time?: number;
  total_time?: number;
}

interface RateLimitTelemetry {
  limitRequests: number | null;
  limitTokens: number | null;
  remainingRequests: number | null;
  remainingTokens: number | null;
  resetRequestsRaw: string | null;
  resetTokensRaw: string | null;
  resetRequestsMs: number;
  resetTokensMs: number;
}

interface GroqCallOutcome {
  ok: boolean;
  statusCode: number;
  retries: number;
  errorType: string | null;
  errorMessage: string | null;
  apiLatencyMs: number;
  totalWallMs: number;
  requestedModel: string;
  actualModelUsed: string;
  rawContent: string;
  reasoning: string | null;
  finishReason: string | null;
  usage: UsageTelemetry | null;
  rateLimitHeaders: RateLimitTelemetry | null;
}

export interface RawTrialRecord {
  runId: string;
  timestamp: string;
  mode: BenchmarkMode;
  caseId: string;
  semanticScenarioId: string;
  category: PilotCase['category'];
  language: PilotCase['language'];
  appLanguageExpected: string;
  query: string;
  requestedModel: string;
  actualModelUsed: string;
  config: ArchitectureConfig;
  hyperparams: {
    temperature: number;
    max_tokens: number;
    reasoning_effort: string;
  };
  status: 'ok' | 'infra_error';
  infraError: boolean;
  statusCode: number;
  retries: number;
  errorType: string | null;
  errorMessage: string | null;
  usedFallback: boolean;
  sanitized: boolean | null;
  validationError: string | null;
  seededFromRunId?: string;
  apiLatencyMs: number;
  pipelineLatencyMs: number;
  totalWallMs: number;
  usage: UsageTelemetry | null;
  rateLimitHeaders: RateLimitTelemetry | null;
  finishReason: string | null;
  response: {
    text: string;
    rawContent: string;
    reasoning: string | null;
    recommendedUnits: string[] | null;
    calculation: Record<string, unknown> | null;
    detectedIntent: string | null;
    extractedEntities: Record<string, unknown> | null;
    language: string | null;
    options: string[];
  };
}

interface RunMetadata {
  schemaVersion: string;
  runId: string;
  mode: BenchmarkMode;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt: string | null;
  dryRun: boolean;
  dataset: 'pilot' | 'main';
  datasetPath: string;
  datasetSha256: string;
  totalCases: number;
  totalPlannedCalls: number;
  completedCalls: number;
  okCalls: number;
  infraErrorCalls: number;
  configs: ArchitectureConfig[];
  models: string[];
  hyperparams: {
    temperature: number;
    max_tokens: number;
    reasoning_effort: string;
  };
  gitCommit: string;
  gitDirty: boolean;
  nodeVersion: string;
  provenanceHashes: {
    rawJsonlSha256: string | null;
    catalogSnapshotFileSha256: string;
    catalogSerializedSha256: string;
    evaluatorSha256: string;
    chatEngineSha256: string;
    financialGroundTruthSha256: string;
  };
  legacyConfigMapping: Record<string, string>;
  seededFromRuns?: Array<{
    runId: string;
    rawJsonlFile: string;
    rawJsonlSha256: string;
    importedCount: number;
  }>;
  rawJsonlFile: string;
  metaFile: string;
}

// ============================================================================
// CLI & Utility Helpers
// ============================================================================

interface CliArgs {
  mode: BenchmarkMode;
  dataset?: 'pilot' | 'main';
  configs?: ArchitectureConfig[];
  models: string[];
  reasoningEffort: string;
  resumePath?: string;
  seedFromPaths: string[];
  fresh: boolean;
  evalOnlyPath?: string;
  dryRun: boolean;
  concurrency: number;
  retryInfraErrors: boolean;
  limitCases?: number;
}

function parseCliArgs(argv: string[]): CliArgs {
  const argsMap = new Map<string, string>();
  const flags = new Set<string>();

  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eqIdx = raw.indexOf('=');
    if (eqIdx === -1) {
      flags.add(raw.slice(2));
    } else {
      argsMap.set(raw.slice(2, eqIdx), raw.slice(eqIdx + 1));
    }
  }

  const modeRaw = (argsMap.get('mode') || 'pilot') as BenchmarkMode;
  if (!['pilot', 'main', 'ablation'].includes(modeRaw)) {
    throw new Error(`Invalid --mode="${modeRaw}". Expected pilot | main | ablation.`);
  }

  let configs: ArchitectureConfig[] | undefined;
  if (argsMap.has('configs')) {
    const rawList = argsMap.get('configs')!;
    if (rawList === 'all') {
      configs = [...ALL_CONFIGS];
    } else {
      configs = rawList.split(',').map((s) => s.trim()) as ArchitectureConfig[];
      for (const c of configs) {
        if (!ALL_CONFIGS.includes(c)) {
          throw new Error(`Invalid config "${c}". Allowed: ${ALL_CONFIGS.join(', ')}`);
        }
      }
    }
  }

  let dataset: 'pilot' | 'main' | undefined;
  if (argsMap.has('dataset')) {
    const d = argsMap.get('dataset')!;
    if (d !== 'pilot' && d !== 'main') {
      throw new Error(`Invalid --dataset="${d}". Expected pilot | main.`);
    }
    dataset = d;
  }

  const models = argsMap.has('models')
    ? argsMap
      .get('models')!
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)
    : [...DEFAULT_MODELS];

  const reasoningEffort = argsMap.get('reasoning-effort') || 'default';
  const concurrency = Math.max(1, Math.min(8, parseInt(argsMap.get('concurrency') || '2', 10) || 2));
  const limitCases = argsMap.has('limit') ? parseInt(argsMap.get('limit')!, 10) : undefined;
  const seedFromPaths = argsMap.has('seed-from')
    ? argsMap
      .get('seed-from')!
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    : [];

  return {
    mode: modeRaw,
    dataset,
    configs,
    models,
    reasoningEffort,
    resumePath: argsMap.get('resume'),
    seedFromPaths,
    fresh: flags.has('fresh'),
    evalOnlyPath: argsMap.get('eval-only'),
    dryRun: flags.has('dry-run'),
    concurrency,
    retryInfraErrors: flags.has('retry-infra-errors'),
    limitCases,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sha256Text(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function sha256File(filePath: string): string {
  return sha256Text(fs.readFileSync(filePath));
}

function getGitProvenance(repoRoot: string): { commit: string; dirty: boolean } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
    const statusOut = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' }).trim();
    return { commit: commit || 'unknown', dirty: statusOut.length > 0 };
  } catch {
    return { commit: 'unknown', dirty: true };
  }
}

function makeFileTimestamp(d: Date = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}

function parseDurationMs(raw: string | null): number {
  if (!raw) return 0;
  let totalMs = 0;
  const minMatch = raw.match(/(\d+(?:\.\d+)?)m(?!s)/i);
  const secMatch = raw.match(/(\d+(?:\.\d+)?)s/i);
  const msMatch = raw.match(/(\d+(?:\.\d+)?)ms/i);
  if (minMatch) totalMs += parseFloat(minMatch[1]) * 60_000;
  if (secMatch) totalMs += parseFloat(secMatch[1]) * 1_000;
  if (msMatch) totalMs += parseFloat(msMatch[1]);
  if (!minMatch && !secMatch && !msMatch) {
    const plain = parseFloat(raw);
    if (!isNaN(plain)) totalMs = plain * 1_000;
  }
  return Math.ceil(totalMs);
}

function parseRateLimitHeaders(headers: Headers): RateLimitTelemetry {
  const toNum = (v: string | null): number | null => {
    if (v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const resetRequestsRaw = headers.get('x-ratelimit-reset-requests');
  const resetTokensRaw = headers.get('x-ratelimit-reset-tokens');
  return {
    limitRequests: toNum(headers.get('x-ratelimit-limit-requests')),
    limitTokens: toNum(headers.get('x-ratelimit-limit-tokens')),
    remainingRequests: toNum(headers.get('x-ratelimit-remaining-requests')),
    remainingTokens: toNum(headers.get('x-ratelimit-remaining-tokens')),
    resetRequestsRaw,
    resetTokensRaw,
    resetRequestsMs: parseDurationMs(resetRequestsRaw),
    resetTokensMs: parseDurationMs(resetTokensRaw),
  };
}

// ============================================================================
// Per-Model Adaptive Rate Limiter (8,000 TPM & 1,000 RPD safe pacing)
// ============================================================================

class ModelRateLimiter {
  private readonly stateByModel = new Map<
    string,
    {
      limitTokens: number;
      remainingTokens: number;
      resetTokensMs: number;
      updatedAt: number;
    }
  >();

  async paceBeforeRequest(model: string, estimatedTokensNeeded: number): Promise<void> {
    if (isLocalRouterUrl(activeGroqApiUrl)) return;
    const st = this.stateByModel.get(model);
    if (!st) return;

    const elapsedMs = Date.now() - st.updatedAt;
    // Token bucket refills continuously over 60s on Groq
    const refillRatePerMs = st.limitTokens / 60_000;
    const estimatedRemaining = Math.min(st.limitTokens, st.remainingTokens + elapsedMs * refillRatePerMs);

    if (estimatedRemaining < estimatedTokensNeeded) {
      const deficit = estimatedTokensNeeded - estimatedRemaining;
      const waitByRefill = Math.ceil(deficit / refillRatePerMs) + 350;
      const waitByHeader = st.resetTokensMs > elapsedMs ? st.resetTokensMs - elapsedMs + 350 : 0;
      const waitMs = Math.min(65_000, Math.max(waitByRefill, waitByHeader, 500));
      await sleep(waitMs);
    }
  }

  updateFromHeaders(model: string, rl: RateLimitTelemetry | null): void {
    if (!rl || rl.remainingTokens === null) return;
    this.stateByModel.set(model, {
      limitTokens: rl.limitTokens || 8_000,
      remainingTokens: rl.remainingTokens,
      resetTokensMs: rl.resetTokensMs,
      updatedAt: Date.now(),
    });
  }
}

// ============================================================================
// Controlled Groq Single-Model Transport (NO silent model fallback!)
// ============================================================================

async function callGroqSingleModel(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  jsonMode: boolean;
  reasoningEffort: string;
  rateLimiter: ModelRateLimiter;
  estimatedTokensNeeded: number;
  dryRun?: boolean;
  dryRunMeta?: { tc: PilotCase; config: ArchitectureConfig };
}): Promise<GroqCallOutcome> {
  const {
    apiKey,
    model,
    messages,
    jsonMode,
    reasoningEffort,
    rateLimiter,
    estimatedTokensNeeded,
    dryRun,
    dryRunMeta,
  } = params;

  if (dryRun) {
    const fake = simulateDryRunResponse(model, dryRunMeta?.tc, dryRunMeta?.config, jsonMode);
    return fake;
  }

  const wallStart = Date.now();
  let retries = 0;
  let lastStatusCode = 0;
  let lastErrorType: string | null = null;
  let lastErrorMessage: string | null = null;
  let lastRl: RateLimitTelemetry | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await rateLimiter.paceBeforeRequest(model, estimatedTokensNeeded);

    const wireModel =
      isLocalRouterUrl(activeGroqApiUrl) && !model.startsWith('groq/') ? `groq/${model}` : model;
    const payload: Record<string, unknown> = {
      model: wireModel,
      messages,
      temperature: BENCHMARK_TEMPERATURE,
      max_tokens: BENCHMARK_MAX_TOKENS,
    };
    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }
    if (reasoningEffort !== 'default') {
      payload.reasoning_effort = reasoningEffort;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const reqStart = Date.now();

    try {
      const response = await fetch(activeGroqApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const apiLatencyMs = Date.now() - reqStart;

      const rl = parseRateLimitHeaders(response.headers);
      lastRl = rl;
      rateLimiter.updateFromHeaders(model, rl);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        lastStatusCode = response.status;
        lastErrorMessage = errorText.slice(0, 500);

        const isRouterRateLimit =
          response.status === 503 && /\[429\]|rate_limit|reset after|try again in/i.test(errorText);

        if (response.status === 429 || isRouterRateLimit) {
          lastErrorType = isRouterRateLimit ? 'router_rate_limit_503' : 'rate_limit_429';
          const matchReset = errorText.match(/reset after (?:(\d+)m\s*)?(\d+)s/i);
          const matchSec = errorText.match(/try again in ([0-9.]+)s/i);
          const matchMs = errorText.match(/try again in ([0-9.]+)ms/i);
          const retryAfter = response.headers.get('retry-after');
          let waitMs = rl.resetTokensMs > 0 ? rl.resetTokensMs + 1000 : 12_000;
          if (matchReset) {
            const mins = parseInt(matchReset[1] || '0', 10);
            const secs = parseInt(matchReset[2] || '0', 10);
            waitMs = Math.max(waitMs, (mins * 60 + secs) * 1000 + 1500);
          } else if (matchSec) {
            waitMs = Math.max(waitMs, Math.ceil(parseFloat(matchSec[1]) * 1000) + 1200);
          } else if (matchMs) {
            waitMs = Math.max(waitMs, Math.ceil(parseFloat(matchMs[1])) + 1200);
          } else if (retryAfter && !isNaN(Number(retryAfter))) {
            waitMs = Math.max(waitMs, Number(retryAfter) * 1000 + 1000);
          }
          if (isLocalRouterUrl(activeGroqApiUrl)) {
            waitMs = isRouterRateLimit
              ? Math.min(65_000, Math.max(waitMs, 12_000))
              : attempt < 2
                ? Math.min(waitMs, 1500)
                : Math.min(65_000, waitMs);
          }
          if (attempt < MAX_RETRIES - 1) {
            retries++;
            console.warn(
              `[${response.status} rate-limit] ${model} attempt ${attempt + 1}/${MAX_RETRIES} waiting ${waitMs}ms...`
            );
            await sleep(waitMs);
            continue;
          }
          break;
        }

        if (response.status >= 500) {
          lastErrorType = `http_${response.status}`;
          if (attempt < MAX_RETRIES - 1) {
            retries++;
            const waitMs = (attempt + 1) * 3000;
            console.warn(`[${response.status}] ${model} retry ${attempt + 1}/${MAX_RETRIES} in ${waitMs}ms...`);
            await sleep(waitMs);
            continue;
          }
          break;
        }

        // Non-retryable 4xx (e.g. 400, 401, 404)
        lastErrorType = `http_${response.status}`;
        return {
          ok: false,
          statusCode: response.status,
          retries,
          errorType: lastErrorType,
          errorMessage: lastErrorMessage,
          apiLatencyMs,
          totalWallMs: Date.now() - wallStart,
          requestedModel: model,
          actualModelUsed: model,
          rawContent: '',
          reasoning: null,
          finishReason: null,
          usage: null,
          rateLimitHeaders: rl,
        };
      }

      const rawResponseText = await response.text();
      const cleanedResponseText = rawResponseText.replace(/\r?\n\s*data:\s*\[DONE\]\s*$/i, '').trim();
      const data = JSON.parse(cleanedResponseText) as {
        model?: string;
        choices?: Array<{
          finish_reason?: string;
          message?: { content?: string; reasoning?: string };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          queue_time?: number;
          prompt_time?: number;
          completion_time?: number;
          total_time?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        };
      };

      const msg = data.choices?.[0]?.message;
      const rawContent = msg?.content || '';
      const finishReason = data.choices?.[0]?.finish_reason || null;

      if (!rawContent) {
        lastStatusCode = 200;
        lastErrorType = 'empty_content';
        lastErrorMessage = `Empty content returned (finish_reason=${finishReason})`;
        if (attempt < MAX_RETRIES - 1) {
          retries++;
          await sleep(1500);
          continue;
        }
        return {
          ok: false,
          statusCode: 200,
          retries,
          errorType: lastErrorType,
          errorMessage: lastErrorMessage,
          apiLatencyMs,
          totalWallMs: Date.now() - wallStart,
          requestedModel: model,
          actualModelUsed: normalizeModelId(data.model) || model,
          rawContent: '',
          reasoning: msg?.reasoning || null,
          finishReason,
          usage: data.usage
            ? {
              prompt_tokens: data.usage.prompt_tokens || 0,
              completion_tokens: data.usage.completion_tokens || 0,
              total_tokens: data.usage.total_tokens || 0,
              reasoning_tokens: data.usage.completion_tokens_details?.reasoning_tokens || 0,
              queue_time: data.usage.queue_time,
              prompt_time: data.usage.prompt_time,
              completion_time: data.usage.completion_time,
              total_time: data.usage.total_time,
            }
            : null,
          rateLimitHeaders: rl,
        };
      }

      return {
        ok: true,
        statusCode: 200,
        retries,
        errorType: null,
        errorMessage: null,
        apiLatencyMs,
        totalWallMs: Date.now() - wallStart,
        requestedModel: model,
        actualModelUsed: normalizeModelId(data.model) || model,
        rawContent,
        reasoning: msg?.reasoning || null,
        finishReason,
        usage: data.usage
          ? {
            prompt_tokens: data.usage.prompt_tokens || 0,
            completion_tokens: data.usage.completion_tokens || 0,
            total_tokens: data.usage.total_tokens || 0,
            reasoning_tokens: data.usage.completion_tokens_details?.reasoning_tokens || 0,
            queue_time: data.usage.queue_time,
            prompt_time: data.usage.prompt_time,
            completion_time: data.usage.completion_time,
            total_time: data.usage.total_time,
          }
          : null,
        rateLimitHeaders: rl,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const e = err as { name?: string; message?: string };
      lastStatusCode = 0;
      lastErrorType = e?.name === 'AbortError' ? 'timeout' : 'network_error';
      lastErrorMessage = e?.message || String(err);
      if (attempt < MAX_RETRIES - 1) {
        retries++;
        const waitMs = (attempt + 1) * 2500;
        console.warn(`[${lastErrorType}] ${model} retry ${attempt + 1}/${MAX_RETRIES} in ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
    }
  }

  return {
    ok: false,
    statusCode: lastStatusCode,
    retries,
    errorType: lastErrorType || 'retries_exhausted',
    errorMessage: lastErrorMessage || 'All retries exhausted',
    apiLatencyMs: 0,
    totalWallMs: Date.now() - wallStart,
    requestedModel: model,
    actualModelUsed: 'error',
    rawContent: '',
    reasoning: null,
    finishReason: null,
    usage: null,
    rateLimitHeaders: lastRl,
  };
}

function simulateDryRunResponse(
  model: string,
  tc: PilotCase | undefined,
  config: ArchitectureConfig | undefined,
  jsonMode: boolean
): GroqCallOutcome {
  const cands = tc?.groundTruth.candidateUnitCodes || [];
  const lang = tc?.appLanguageExpected || 'en';
  let message = 'Dry-run placeholder response.';

  if (tc?.groundTruth.mustExplicitlySayNoMatch) {
    message =
      lang === 'ru'
        ? 'К сожалению, нет доступных квартир, соответствующих вашим критериям.'
        : lang === 'kz'
          ? 'Өкінішке орай, көрсетілген талаптарға сәйкес келетін бос пәтерлер жоқ.'
          : 'Unfortunately, there are no available units in KERUEN matching your specified criteria.';
  } else if (tc?.groundTruth.requiredRefusals?.includes('do_not_offer_3B_sold')) {
    message =
      lang === 'ru'
        ? 'Квартира 3B продана и недоступна. Доступен вариант 3A.'
        : lang === 'kz'
          ? '3B пәтері сатылып кеткен және қолжетімді емес. 3A пәтері қолжетімді.'
          : 'Unit 3B is sold out and not available. Unit 3A is available.';
  } else if (tc?.groundTruth.requiredRefusals?.includes('do_not_offer_2V_reserved')) {
    message =
      lang === 'ru'
        ? 'Квартира 2V забронирована и недоступна. Доступны 2A и 2B.'
        : lang === 'kz'
          ? '2V пәтері брондалған және қолжетімді емес. 2A және 2B қолжетімді.'
          : 'Unit 2V is reserved and not available. Units 2A and 2B are available.';
  } else if (tc?.groundTruth.requiredRefusals?.includes('politely_decline_out_of_scope')) {
    message =
      lang === 'ru'
        ? 'Я AI-консультант по недвижимости ЖК KERUEN от Atamura Group и могу помочь только с вопросами недвижимости.'
        : lang === 'kz'
          ? 'Мен Atamura Group KERUEN жылжымайтын мүлік кеңесшісімін, тек пәтерлер бойынша көмектесе аламын.'
          : 'I am an Atamura Group KERUEN real estate consultant and can only assist with property inquiries.';
  } else if (tc?.groundTruth.requiredRefusals?.includes('do_not_claim_bank_approval')) {
    message =
      lang === 'ru'
        ? 'Я не могу подтвердить одобрение ипотеки банком под 5% без проверки банка.'
        : lang === 'kz'
          ? 'Банк тексеруінсіз 5% ипотека мақұлданғанын растай алмаймын.'
          : 'I cannot confirm or guarantee that a bank has approved a 5% mortgage without bank verification.';
  } else if (tc?.category === 'finance' && tc.groundTruth.calculation) {
    const g = tc.groundTruth.calculation;
    if (g.method === 'full') {
      message = `Unit ${g.unitCode} full payment price after 3% discount is ${g.totalKzt} KZT.`;
    } else {
      message = `Unit ${g.unitCode}: DP ${g.downPaymentKzt} KZT, monthly ${g.monthlyKzt} KZT for ${g.termMonths} months.`;
    }
  } else if (cands.length > 0) {
    message = `Available matching units: ${cands.map((u) => `Unit ${u}`).join(', ')}.`;
  }

  let rawContent = message;
  if (jsonMode) {
    const calcObj =
      tc?.category === 'finance' && tc.groundTruth.calculation
        ? {
          unitCode: tc.groundTruth.calculation.unitCode,
          method: tc.groundTruth.calculation.method,
          dp: tc.groundTruth.calculation.downPaymentKzt ?? tc.groundTruth.calculation.totalKzt ?? 0,
          monthly: tc.groundTruth.calculation.monthlyKzt ?? 0,
          total:
            tc.groundTruth.calculation.totalPaidKzt ??
            tc.groundTruth.calculation.contractTotalKzt ??
            tc.groundTruth.calculation.totalKzt ??
            0,
          tenor: tc.groundTruth.calculation.termMonths ?? 0,
        }
        : null;
    rawContent = JSON.stringify({
      message,
      recommendedUnits: tc?.groundTruth.mustExplicitlySayNoMatch ? [] : cands.slice(0, 2),
      calculation: calcObj,
      detectedIntent: tc?.category === 'finance' ? 'dp_calculation' : 'unit_recommendation',
      extractedEntities: {},
      language: lang,
      options: [],
    });
  }

  return {
    ok: true,
    statusCode: 200,
    retries: 0,
    errorType: null,
    errorMessage: null,
    apiLatencyMs: config === 'zero_shot' ? 120 : 180,
    totalWallMs: config === 'zero_shot' ? 120 : 180,
    requestedModel: model,
    actualModelUsed: model,
    rawContent,
    reasoning: model.includes('gpt-oss') ? 'dry-run-reasoning' : null,
    finishReason: 'stop',
    usage: {
      prompt_tokens: config === 'zero_shot' ? 40 : 950,
      completion_tokens: 95,
      total_tokens: (config === 'zero_shot' ? 40 : 950) + 95,
      reasoning_tokens: model.includes('gpt-oss') ? 35 : 0,
    },
    rateLimitHeaders: {
      limitRequests: 1000,
      limitTokens: 8000,
      remainingRequests: 999,
      remainingTokens: 7000,
      resetRequestsRaw: '1m26.4s',
      resetTokensRaw: '5.0s',
      resetRequestsMs: 86400,
      resetTokensMs: 5000,
    },
  };
}

// ============================================================================
// Shared Prompt & Parsing Helpers (Aligned with src/lib/groq.ts & chatEngine.ts)
// ============================================================================

function buildJsonSystemPrompt(systemPrompt: string, unitContext: string): string {
  return `${systemPrompt}\n\n--- AVAILABLE UNITS DATA ---\n${unitContext}\n--- END UNITS DATA ---\n\nIMPORTANT: You MUST respond with a valid JSON object matching the following structure:\n{\n  "message": "Your helpful response here in the user's language",\n  "recommendedUnits": ["1B", "2A"],\n  "calculation": null,\n  "detectedIntent": "unit_recommendation",\n  "extractedEntities": {},\n  "language": "en",\n  "options": ["Show me 1BR", "What is the down payment?"]\n}\nStrict Availability Rule: Only recommend units with status 'available'. Unit 2V is RESERVED and Unit 3B is SOLD OUT. Never recommend 2V or 3B.\nStrict Budget Rule: Never recommend units whose price exceeds the user's budget. If no available units match the budget, recommendedUnits must be [].`;
}

function parseGroqJsonResponse(text: string, userMessage: string, model: string): LLMResponse {
  let rawObj: unknown = null;
  try {
    rawObj = JSON.parse(text);
  } catch {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      try {
        rawObj = JSON.parse(fenceMatch[1]);
      } catch {
        // ignore
      }
    }
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

  const defaultLang = detectLanguage(userMessage);

  if (rawObj && typeof rawObj === 'object') {
    const p = rawObj as Record<string, unknown>;
    const recommendedUnits = Array.isArray(p.recommendedUnits)
      ? p.recommendedUnits.filter((u): u is string => typeof u === 'string')
      : [];
    const language: 'en' | 'ru' | 'kz' =
      p.language === 'kz' || p.language === 'ru' || p.language === 'en' ? p.language : defaultLang;

    let calculation: LLMResponse['calculation'] = undefined;
    if (p.calculation && typeof p.calculation === 'object' && !Array.isArray(p.calculation)) {
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

    const options = Array.isArray(p.options)
      ? p.options.filter((o): o is string => typeof o === 'string')
      : [];
    const message =
      typeof p.message === 'string' && p.message.trim().length > 0
        ? p.message.trim()
        : text.replace(/```(?:json)?[\s\S]*?```/g, '').trim() || text;

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
      modelUsed: model,
    };
  }

  const cleanText = text.replace(/```(?:json)?[\s\S]*$/m, '').trim();
  return {
    message: cleanText || text,
    recommendedUnits: [],
    calculation: undefined,
    detectedIntent: 'general_faq',
    extractedEntities: {},
    language: defaultLang,
    options: [],
    modelUsed: model,
  };
}

function buildPrefilterUnitContext(query: string, allUnits: Unit[], includeCalculator: boolean): string {
  const entities = extractEntities(query);
  const phoneFreeQuery = stripPhoneNumbers(query, { preserveOfficialHotline: false });

  let matchedUnitCode = entities.unit_code as string | undefined;
  if (!matchedUnitCode) {
    const m =
      phoneFreeQuery.match(/(?:unit|квартира|блок|тип|пәтер|№)\s*([123]\s*[ABVабв])(?![\p{L}\p{N}])/iu) ||
      phoneFreeQuery.match(/(?<![\p{L}\p{N}])([123][ABVабв])(?![\p{L}\p{N}])/iu);
    if (m) {
      const raw = m[1].replace(/\s+/g, '').toUpperCase();
      matchedUnitCode = `${raw[0]}${CYRILLIC_TO_LATIN_UNIT[raw[1]] || raw[1]}`;
      entities.unit_code = matchedUnitCode;
    }
  }

  const availableUnits = allUnits.filter(
    (u) => u.status === 'available' && u.code !== '2V' && u.code !== '3B'
  );
  const minAvailablePrice =
    availableUnits.length > 0 ? Math.min(...availableUnits.map((u) => u.priceMin)) : 12_000_000;

  const targetUnit = matchedUnitCode
    ? allUnits.find((u) => u.code.toUpperCase() === matchedUnitCode!.toUpperCase()) || null
    : null;

  const criteria = extractCriteria(entities);
  const strictEligibleUnits = filterUnits(allUnits as any, criteria);
  const eligibleAlternatives = filterUnits(allUnits as any, { ...criteria, unitCode: undefined });
  const sameTypeEligibleAlternatives = targetUnit
    ? eligibleAlternatives.filter((u) => u.rooms === targetUnit.rooms)
    : [];

  const hasFilterConstraints = Boolean(
    criteria.budget !== undefined ||
    criteria.rooms !== undefined ||
    criteria.purpose ||
    criteria.view ||
    criteria.minArea !== undefined ||
    matchedUnitCode
  );

  const customDP = typeof entities.custom_dp === 'number' ? entities.custom_dp : undefined;
  const customTenor = typeof entities.custom_tenor === 'number' ? entities.custom_tenor : undefined;
  const customRate = typeof entities.custom_rate === 'number' ? entities.custom_rate : undefined;
  const invalidTenor = entities.invalid_tenor;

  const queryHasFull = /\bfull\b|\bcash\b|100%|lunas|полн(?:ой|ая)\s*оплат|наличн|біржола|толық\s*төлем/i.test(
    phoneFreeQuery
  );
  const queryHasMortgage = /mortgage|ипотек|несие|kpr|отбасы|otbasy|freedom\s*finance|bank\s*loan/i.test(
    phoneFreeQuery
  );
  const queryHasInstallment =
    /installment|рассрочк|бөліп\s*төлеу|0%\s*(?:interest|пайыз|переплат)|developer\s*plan|cicilan/i.test(
      phoneFreeQuery
    );

  const intendedMethod: PaymentMethod = queryHasFull
    ? 'full'
    : queryHasMortgage
      ? 'mortgage'
      : queryHasInstallment || customRate === 0
        ? 'installment'
        : customRate !== undefined && customRate > 0
          ? 'mortgage'
          : customTenor !== undefined && customTenor > INSTALLMENT_MAX_MONTHS && customTenor <= MORTGAGE_MAX_MONTHS
            ? 'mortgage'
            : 'installment';

  let tenorValid = true;
  let tenorReason = '';
  if (invalidTenor !== undefined) {
    tenorValid = false;
    tenorReason = `invalid_tenor:${String(invalidTenor)}`;
  } else if (customTenor !== undefined) {
    if (!Number.isInteger(customTenor) || customTenor <= 0) {
      tenorValid = false;
      tenorReason = `invalid_tenor:${String(customTenor)}`;
    } else if (intendedMethod === 'installment' && customTenor > INSTALLMENT_MAX_MONTHS) {
      tenorValid = false;
      tenorReason = `installment_tenor_exceeds_${INSTALLMENT_MAX_MONTHS}`;
    } else if (intendedMethod === 'mortgage' && customTenor > MORTGAGE_MAX_MONTHS) {
      tenorValid = false;
      tenorReason = `mortgage_tenor_exceeds_${MORTGAGE_MAX_MONTHS}`;
    }
  }

  const eligibleForPrompt =
    strictEligibleUnits.length > 0
      ? strictEligibleUnits
      : targetUnit && (targetUnit.status === 'sold' || targetUnit.status === 'reserved')
        ? sameTypeEligibleAlternatives
        : [];

  let unitContext: string;
  if (!tenorValid) {
    unitContext =
      `[VALIDATION CRITICAL: The user specified an invalid payment tenor (${tenorReason}). Do NOT calculate or invent any monthly payment figures. Politely ask for a valid positive integer tenor (1-${INSTALLMENT_MAX_MONTHS} months for 0% installment, or 1-${MORTGAGE_MAX_MONTHS} months for mortgage).]\n\n` +
      buildUnitContext(eligibleForPrompt);
  } else if (targetUnit && (targetUnit.status === 'sold' || targetUnit.code === '3B')) {
    const altNames =
      sameTypeEligibleAlternatives.length > 0
        ? sameTypeEligibleAlternatives.map((u) => `Unit ${u.code}`).join(', ')
        : 'NONE (no available units match all active user criteria; set recommendedUnits to [])';
    unitContext =
      `[STATUS CRITICAL: Unit ${targetUnit.code} is strictly SOLD OUT (status: sold). You MUST explicitly state that Unit ${targetUnit.code} is sold out and NOT available for purchase. Eligible alternatives under user constraints: ${altNames}. Do NOT recommend any unit outside the eligible list.]\n\n` +
      buildUnitContext(eligibleForPrompt);
  } else if (targetUnit && (targetUnit.status === 'reserved' || targetUnit.code === '2V')) {
    const altNames =
      sameTypeEligibleAlternatives.length > 0
        ? sameTypeEligibleAlternatives.map((u) => `Unit ${u.code}`).join(', ')
        : 'NONE (no available units match all active user criteria; set recommendedUnits to [])';
    unitContext =
      `[STATUS CRITICAL: Unit ${targetUnit.code} is currently RESERVED (status: reserved). It CANNOT be recommended for immediate purchase. Eligible alternatives under user constraints: ${altNames}. Do NOT recommend any unit outside the eligible list.]\n\n` +
      buildUnitContext(eligibleForPrompt);
  } else if (hasFilterConstraints && strictEligibleUnits.length === 0) {
    unitContext =
      `[STATUS CRITICAL: ZERO available units match the user's filter criteria${criteria.budget ? ` (budget: ${criteria.budget.toLocaleString('ru-RU')} ₸)` : ''}. The minimum price in KERUEN is ${minAvailablePrice.toLocaleString('ru-RU')} ₸. You MUST state clearly that NO units match these criteria, set recommendedUnits to [], and NEVER recommend unavailable, reserved (2V), sold (3B), or out-of-criteria units.]\n\n` +
      buildUnitContext([]);
  } else {
    unitContext = buildUnitContext(strictEligibleUnits.length > 0 ? strictEligibleUnits : availableUnits);
  }

  if (includeCalculator) {
    const primaryUnit =
      strictEligibleUnits.length > 0
        ? targetUnit && strictEligibleUnits.some((u) => u.code.toUpperCase() === targetUnit.code.toUpperCase())
          ? targetUnit
          : strictEligibleUnits[0]
        : undefined;

    if (
      tenorValid &&
      primaryUnit &&
      primaryUnit.status === 'available' &&
      primaryUnit.code !== '2V' &&
      primaryUnit.code !== '3B'
    ) {
      const paymentOptions = getAllPaymentOptions(
        primaryUnit.priceMin,
        primaryUnit.code,
        customDP,
        customTenor,
        customRate
      );
      unitContext +=
        `\n\n[DETERMINISTIC FINANCIAL CALCULATION FOR UNIT ${primaryUnit.code} (${primaryUnit.priceMin.toLocaleString('ru-RU')} ₸)]:\n` +
        `- Developer Installment (0% interest, ${paymentOptions.installment.tenor} mos): Down Payment (${paymentOptions.installment.dpPercent}%) = ${paymentOptions.installment.dp.toLocaleString('ru-RU')} ₸, Monthly Payment = ${paymentOptions.installment.monthly.toLocaleString('ru-RU')} ₸/mo, Total = ${paymentOptions.installment.total.toLocaleString('ru-RU')} ₸\n` +
        `- Bank Mortgage (${paymentOptions.mortgage.interestRate}% p.a., ${paymentOptions.mortgage.tenor} mos): Down Payment (${paymentOptions.mortgage.dpPercent}%) = ${paymentOptions.mortgage.dp.toLocaleString('ru-RU')} ₸, Monthly Annuity = ${paymentOptions.mortgage.monthly.toLocaleString('ru-RU')} ₸/mo, Total = ${paymentOptions.mortgage.total.toLocaleString('ru-RU')} ₸\n` +
        `- Full Cash Payment (3% discount): Total = ${paymentOptions.full.total.toLocaleString('ru-RU')} ₸ (Savings: ${paymentOptions.full.savings.toLocaleString('ru-RU')} ₸)\n` +
        `If the user asks for financial calculations, down payments, or installments, you MUST cite these EXACT computed values without alteration.`;
    }
  }

  return unitContext;
}

// ============================================================================
// Trial Execution Per Architecture
// ============================================================================

async function executeTrial(params: {
  runId: string;
  mode: BenchmarkMode;
  tc: PilotCase;
  model: string;
  config: ArchitectureConfig;
  allUnits: Unit[];
  apiKey: string;
  reasoningEffort: string;
  rateLimiter: ModelRateLimiter;
  dryRun: boolean;
}): Promise<RawTrialRecord> {
  const { runId, mode, tc, model, config, allUnits, apiKey, reasoningEffort, rateLimiter, dryRun } = params;
  const timestamp = new Date().toISOString();
  const maskedQuery = maskPhoneNumbers(tc.query, { preserveOfficialHotline: true });
  const baseHyperparams = {
    temperature: BENCHMARK_TEMPERATURE,
    max_tokens: BENCHMARK_MAX_TOKENS,
    reasoning_effort: reasoningEffort,
  };

  if (config === 'proposed_hybrid') {
    let lastOutcome: GroqCallOutcome | null = null;
    let fallbackBlockedError: string | null = null;

    const strictProvider: LLMProvider = {
      async generateResponse(
        messages: ChatMessage[],
        systemPrompt: string,
        unitContext: string,
        targetModel?: string
      ): Promise<LLMResponse> {
        const requested = targetModel || model;
        if (requested !== model) {
          fallbackBlockedError = `Fallback blocked: chatEngine attempted model switch to ${requested}`;
          throw new Error(fallbackBlockedError);
        }

        const fullSystem = buildJsonSystemPrompt(systemPrompt, unitContext);
        const apiMessages = [
          { role: 'system' as const, content: fullSystem },
          ...messages.map((m) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content,
          })),
        ];

        const outcome = await callGroqSingleModel({
          apiKey,
          model,
          messages: apiMessages,
          jsonMode: true,
          reasoningEffort,
          rateLimiter,
          estimatedTokensNeeded: 2300,
          dryRun,
          dryRunMeta: { tc, config },
        });
        lastOutcome = outcome;

        if (!outcome.ok) {
          throw new Error(`Groq infra error [${outcome.statusCode}/${outcome.errorType}]: ${outcome.errorMessage}`);
        }

        return parseGroqJsonResponse(outcome.rawContent, tc.query, outcome.actualModelUsed);
      },
    };

    const tStart = Date.now();
    const engineOpts: ProcessPropertyQueryOptions = {
      query: tc.query,
      allUnits: allUnits as any,
      model,
      provider: strictProvider,
      disableFallback: true,
    };

    try {
      const result = await processPropertyQuery(engineOpts);
      const wallMs = Date.now() - tStart;
      const out = lastOutcome as GroqCallOutcome | null;

      // Guard: if provider failed AND chatEngine caught it into deterministic fallback, treat strictly as infra_error!
      const isInfra =
        Boolean(fallbackBlockedError) ||
        !out ||
        !out.ok ||
        result.usedFallback ||
        result.modelUsed === 'fallback' ||
        result.modelUsed !== model;

      if (isInfra) {
        return {
          runId,
          timestamp,
          mode,
          caseId: tc.id,
          semanticScenarioId: tc.semanticScenarioId,
          category: tc.category,
          language: tc.language,
          appLanguageExpected: tc.appLanguageExpected,
          query: tc.query,
          requestedModel: model,
          actualModelUsed: out?.actualModelUsed || result.modelUsed || 'error',
          config,
          hyperparams: baseHyperparams,
          status: 'infra_error',
          infraError: true,
          statusCode: out?.statusCode ?? 503,
          retries: out?.retries ?? 0,
          errorType: out && !out.ok ? out.errorType : fallbackBlockedError ? 'fallback_blocked' : 'fallback_triggered',
          errorMessage: out && !out.ok ? out.errorMessage : fallbackBlockedError || 'Engine triggered fallback response',
          usedFallback: Boolean(result.usedFallback),
          sanitized: result.sanitized,
          validationError: result.validationError || null,
          apiLatencyMs: out?.apiLatencyMs ?? 0,
          pipelineLatencyMs: result.latencyMs,
          totalWallMs: out?.totalWallMs ?? wallMs,
          usage: out?.usage || null,
          rateLimitHeaders: out?.rateLimitHeaders || null,
          finishReason: out?.finishReason || null,
          response: {
            text: result.message,
            rawContent: out?.rawContent || '',
            reasoning: out?.reasoning || null,
            recommendedUnits: result.recommendedUnits,
            calculation: (result.calculation as unknown as Record<string, unknown>) || null,
            detectedIntent: result.detectedIntent,
            extractedEntities: result.extractedEntities,
            language: result.language,
            options: result.options || [],
          },
        };
      }

      // Compute clean pipeline latency excluding retry sleep overhead
      const retryOverheadMs = Math.max(0, out.totalWallMs - out.apiLatencyMs);
      const cleanPipelineLatencyMs = Math.max(out.apiLatencyMs, result.latencyMs - retryOverheadMs);

      return {
        runId,
        timestamp,
        mode,
        caseId: tc.id,
        semanticScenarioId: tc.semanticScenarioId,
        category: tc.category,
        language: tc.language,
        appLanguageExpected: tc.appLanguageExpected,
        query: tc.query,
        requestedModel: model,
        actualModelUsed: out.actualModelUsed,
        config,
        hyperparams: baseHyperparams,
        status: 'ok',
        infraError: false,
        statusCode: 200,
        retries: out.retries,
        errorType: null,
        errorMessage: null,
        usedFallback: false,
        sanitized: result.sanitized,
        validationError: result.validationError || null,
        apiLatencyMs: out.apiLatencyMs,
        pipelineLatencyMs: cleanPipelineLatencyMs,
        totalWallMs: out.totalWallMs,
        usage: out.usage,
        rateLimitHeaders: out.rateLimitHeaders,
        finishReason: out.finishReason,
        response: {
          text: result.message,
          rawContent: out.rawContent,
          reasoning: out.reasoning,
          recommendedUnits: result.recommendedUnits,
          calculation: (result.calculation as unknown as Record<string, unknown>) || null,
          detectedIntent: result.detectedIntent,
          extractedEntities: result.extractedEntities,
          language: result.language,
          options: result.options || [],
        },
      };
    } catch (err: unknown) {
      const wallMs = Date.now() - tStart;
      const out = lastOutcome as GroqCallOutcome | null;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        runId,
        timestamp,
        mode,
        caseId: tc.id,
        semanticScenarioId: tc.semanticScenarioId,
        category: tc.category,
        language: tc.language,
        appLanguageExpected: tc.appLanguageExpected,
        query: tc.query,
        requestedModel: model,
        actualModelUsed: out?.actualModelUsed || 'error',
        config,
        hyperparams: baseHyperparams,
        status: 'infra_error',
        infraError: true,
        statusCode: out?.statusCode ?? 0,
        retries: out?.retries ?? 0,
        errorType: out?.errorType || 'engine_exception',
        errorMessage: out?.errorMessage || msg,
        usedFallback: false,
        sanitized: null,
        validationError: null,
        apiLatencyMs: out?.apiLatencyMs ?? 0,
        pipelineLatencyMs: 0,
        totalWallMs: out?.totalWallMs ?? wallMs,
        usage: out?.usage || null,
        rateLimitHeaders: out?.rateLimitHeaders || null,
        finishReason: out?.finishReason || null,
        response: {
          text: '',
          rawContent: out?.rawContent || '',
          reasoning: out?.reasoning || null,
          recommendedUnits: null,
          calculation: null,
          detectedIntent: null,
          extractedEntities: null,
          language: null,
          options: [],
        },
      };
    }
  }

  // Direct controlled configurations: zero_shot | full_context | plus_prefilter | plus_calculator
  const pipeStart = Date.now();
  let systemContent: string;
  let jsonMode = false;
  let estimatedTokens = 2100;

  if (config === 'zero_shot') {
    systemContent =
      'You are an AI real estate sales assistant in Almaty, Kazakhstan. Answer the user query directly in the same language as the user (English, Russian, or Kazakh).';
    jsonMode = false;
    estimatedTokens = 800;
  } else if (config === 'full_context') {
    systemContent = buildJsonSystemPrompt(buildSystemPrompt(), buildUnitContext(allUnits));
    jsonMode = true;
    estimatedTokens = 2800;
  } else if (config === 'plus_prefilter') {
    systemContent = buildJsonSystemPrompt(
      buildSystemPrompt(),
      buildPrefilterUnitContext(tc.query, allUnits, false)
    );
    jsonMode = true;
    estimatedTokens = 2300;
  } else {
    // plus_calculator
    systemContent = buildJsonSystemPrompt(
      buildSystemPrompt(),
      buildPrefilterUnitContext(tc.query, allUnits, true)
    );
    jsonMode = true;
    estimatedTokens = 2400;
  }

  const preLatencyMs = Date.now() - pipeStart;
  const outcome = await callGroqSingleModel({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: maskedQuery },
    ],
    jsonMode,
    reasoningEffort,
    rateLimiter,
    estimatedTokensNeeded: estimatedTokens,
    dryRun,
    dryRunMeta: { tc, config },
  });

  if (!outcome.ok) {
    return {
      runId,
      timestamp,
      mode,
      caseId: tc.id,
      semanticScenarioId: tc.semanticScenarioId,
      category: tc.category,
      language: tc.language,
      appLanguageExpected: tc.appLanguageExpected,
      query: tc.query,
      requestedModel: model,
      actualModelUsed: outcome.actualModelUsed,
      config,
      hyperparams: baseHyperparams,
      status: 'infra_error',
      infraError: true,
      statusCode: outcome.statusCode,
      retries: outcome.retries,
      errorType: outcome.errorType,
      errorMessage: outcome.errorMessage,
      usedFallback: false,
      sanitized: null,
      validationError: null,
      apiLatencyMs: outcome.apiLatencyMs,
      pipelineLatencyMs: 0,
      totalWallMs: outcome.totalWallMs,
      usage: outcome.usage,
      rateLimitHeaders: outcome.rateLimitHeaders,
      finishReason: outcome.finishReason,
      response: {
        text: '',
        rawContent: outcome.rawContent,
        reasoning: outcome.reasoning,
        recommendedUnits: null,
        calculation: null,
        detectedIntent: null,
        extractedEntities: null,
        language: null,
        options: [],
      },
    };
  }

  if (config === 'zero_shot') {
    return {
      runId,
      timestamp,
      mode,
      caseId: tc.id,
      semanticScenarioId: tc.semanticScenarioId,
      category: tc.category,
      language: tc.language,
      appLanguageExpected: tc.appLanguageExpected,
      query: tc.query,
      requestedModel: model,
      actualModelUsed: outcome.actualModelUsed,
      config,
      hyperparams: baseHyperparams,
      status: 'ok',
      infraError: false,
      statusCode: 200,
      retries: outcome.retries,
      errorType: null,
      errorMessage: null,
      usedFallback: false,
      sanitized: false,
      validationError: null,
      apiLatencyMs: outcome.apiLatencyMs,
      pipelineLatencyMs: preLatencyMs + outcome.apiLatencyMs,
      totalWallMs: outcome.totalWallMs,
      usage: outcome.usage,
      rateLimitHeaders: outcome.rateLimitHeaders,
      finishReason: outcome.finishReason,
      response: {
        text: outcome.rawContent,
        rawContent: outcome.rawContent,
        reasoning: outcome.reasoning,
        recommendedUnits: null, // Unstructured text -> evaluator extracts recommended units semantically
        calculation: null,
        detectedIntent: null,
        extractedEntities: null,
        language: detectLanguage(outcome.rawContent),
        options: [],
      },
    };
  }

  const parsed = parseGroqJsonResponse(outcome.rawContent, tc.query, outcome.actualModelUsed);
  return {
    runId,
    timestamp,
    mode,
    caseId: tc.id,
    semanticScenarioId: tc.semanticScenarioId,
    category: tc.category,
    language: tc.language,
    appLanguageExpected: tc.appLanguageExpected,
    query: tc.query,
    requestedModel: model,
    actualModelUsed: outcome.actualModelUsed,
    config,
    hyperparams: baseHyperparams,
    status: 'ok',
    infraError: false,
    statusCode: 200,
    retries: outcome.retries,
    errorType: null,
    errorMessage: null,
    usedFallback: false,
    sanitized: false,
    validationError: null,
    apiLatencyMs: outcome.apiLatencyMs,
    pipelineLatencyMs: preLatencyMs + outcome.apiLatencyMs,
    totalWallMs: outcome.totalWallMs,
    usage: outcome.usage,
    rateLimitHeaders: outcome.rateLimitHeaders,
    finishReason: outcome.finishReason,
    response: {
      text: parsed.message,
      rawContent: outcome.rawContent,
      reasoning: outcome.reasoning,
      recommendedUnits: parsed.recommendedUnits,
      calculation: (parsed.calculation as unknown as Record<string, unknown>) || null,
      detectedIntent: parsed.detectedIntent,
      extractedEntities: parsed.extractedEntities,
      language: parsed.language,
      options: parsed.options || [],
    },
  };
}

// ============================================================================
// Evaluation Runner (Separated cleanly from Raw Archive JSONL)
// ============================================================================

interface EvaluatedTrial extends RawTrialRecord {
  eval: EvalScore | null;
}

export function evaluateRawArchive(params: {
  rawJsonlPath: string;
  meta: RunMetadata | null;
  cases: PilotCase[];
  allUnits: Unit[];
  finGroundTruth: FinancialGroundTruthCase[];
  outEvalPath: string;
}): void {
  const { rawJsonlPath, meta, cases, allUnits, finGroundTruth, outEvalPath } = params;

  const caseById = new Map(cases.map((c) => [c.id, c]));
  const lines = fs
    .readFileSync(rawJsonlPath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Deduplicate by (caseId, requestedModel, config), keeping the latest record
  const latestMap = new Map<string, RawTrialRecord>();
  for (const line of lines) {
    try {
      const rec = JSON.parse(line) as RawTrialRecord;
      latestMap.set(`${rec.caseId}::${rec.requestedModel}::${rec.config}`, rec);
    } catch {
      // ignore partial trailing line if any
    }
  }

  const evaluatedRecords: EvaluatedTrial[] = [];
  for (const rec of latestMap.values()) {
    const tc = caseById.get(rec.caseId);
    if (!tc) {
      throw new Error(`Case ID ${rec.caseId} from raw archive not found in dataset.`);
    }
    if (rec.status !== 'ok' || rec.infraError) {
      evaluatedRecords.push({ ...rec, eval: null });
      continue;
    }

    const evalScore = evaluateResponse(
      tc,
      {
        text: rec.response.text,
        recommendedUnits: rec.response.recommendedUnits ?? undefined,
        calculation: rec.response.calculation ?? undefined,
        latencyMs: rec.apiLatencyMs,
        statusCode: rec.statusCode,
      },
      allUnits,
      finGroundTruth
    );
    evaluatedRecords.push({ ...rec, eval: evalScore });
  }

  // Summary per (model, config) separating infra errors from accuracy failures
  const summary: Record<string, Record<string, unknown>> = {};
  const models = Array.from(new Set(evaluatedRecords.map((r) => r.requestedModel)));
  const configs = Array.from(new Set(evaluatedRecords.map((r) => r.config)));

  for (const model of models) {
    summary[model] = {};
    for (const config of configs) {
      const group = evaluatedRecords.filter((r) => r.requestedModel === model && r.config === config);
      const valid = group.filter((r) => r.status === 'ok' && r.eval !== null);
      const infra = group.filter((r) => r.status !== 'ok' || r.infraError);

      const csrPass = valid.filter((r) => r.eval!.csr === 100).length;
      const faithPass = valid.filter((r) => r.eval!.faithfulness === 100).length;
      const refRuns = valid.filter((r) => r.eval!.refusal !== null);
      const refPass = refRuns.filter((r) => r.eval!.refusal === 100).length;
      const finRuns = valid.filter((r) => r.eval!.financialAccuracy !== null);
      const finPass = finRuns.filter((r) => r.eval!.financialAccuracy === 100).length;

      const avgApiLatencyMs =
        valid.length > 0
          ? +(valid.reduce((s, r) => s + r.apiLatencyMs, 0) / valid.length).toFixed(1)
          : null;
      const avgPipelineLatencyMs =
        valid.length > 0
          ? +(valid.reduce((s, r) => s + r.pipelineLatencyMs, 0) / valid.length).toFixed(1)
          : null;

      summary[model][config] = {
        totalRecords: group.length,
        validCount: valid.length,
        infraErrorCount: infra.length,
        csr: valid.length > 0 ? +((csrPass / valid.length) * 100).toFixed(1) : null,
        csrCount: `${csrPass}/${valid.length}`,
        faithfulness: valid.length > 0 ? +((faithPass / valid.length) * 100).toFixed(1) : null,
        faithfulnessCount: `${faithPass}/${valid.length}`,
        refusal: refRuns.length > 0 ? +((refPass / refRuns.length) * 100).toFixed(1) : null,
        refusalCount: `${refPass}/${refRuns.length}`,
        financialAccuracy: finRuns.length > 0 ? +((finPass / finRuns.length) * 100).toFixed(1) : null,
        financialCount: `${finPass}/${finRuns.length}`,
        avgApiLatencyMs,
        avgPipelineLatencyMs,
        promptTokensTotal: valid.reduce((s, r) => s + (r.usage?.prompt_tokens || 0), 0),
        completionTokensTotal: valid.reduce((s, r) => s + (r.usage?.completion_tokens || 0), 0),
      };
    }
  }

  const output = {
    schemaVersion: 'revisi8-eval-v1',
    evaluatedAt: new Date().toISOString(),
    provenance: {
      rawJsonlFile: path.relative(path.resolve(__dirname, '..'), rawJsonlPath).replace(/\\/g, '/'),
      rawJsonlSha256: sha256File(rawJsonlPath),
      metaFile: meta ? path.basename(meta.metaFile) : null,
      catalogSnapshotSha256: meta?.provenanceHashes.catalogSerializedSha256 || sha256Text(JSON.stringify(allUnits)),
      evaluatorSha256: sha256File(path.join(__dirname, 'evaluator.ts')),
      gitCommit: meta?.gitCommit || getGitProvenance(path.resolve(__dirname, '..')).commit,
      hyperparams: meta?.hyperparams || {
        temperature: BENCHMARK_TEMPERATURE,
        max_tokens: BENCHMARK_MAX_TOKENS,
        reasoning_effort: 'default',
      },
      legacyConfigMapping: {
        naive_rag: 'full_context (Full-Context Prompting — static catalog/company context, no vector DB)',
      },
    },
    summary,
    records: evaluatedRecords,
  };

  fs.mkdirSync(path.dirname(outEvalPath), { recursive: true });
  fs.writeFileSync(outEvalPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nComputed evaluation written to: ${outEvalPath}`);
}

// ============================================================================
// Auto-Resume & Checkpoint Loading
// ============================================================================

function loadExistingCheckpoints(rawJsonlPath: string): Map<string, RawTrialRecord> {
  const done = new Map<string, RawTrialRecord>();
  if (!fs.existsSync(rawJsonlPath)) return done;
  const lines = fs.readFileSync(rawJsonlPath, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    try {
      const rec = JSON.parse(trimmed) as RawTrialRecord;
      if (rec.caseId && rec.requestedModel && rec.config) {
        done.set(`${rec.caseId}::${rec.requestedModel}::${rec.config}`, rec);
      }
    } catch {
      console.warn(`Warning: Skipped malformed/truncated JSONL line ${i + 1} in ${rawJsonlPath}`);
    }
  }
  return done;
}

function loadValidatedSeedRecords(params: {
  repoRoot: string;
  seedFromPaths: string[];
  targetMeta: RunMetadata;
  plannedKeys: Set<string>;
}): {
  importedRecords: RawTrialRecord[];
  seededFromRuns: NonNullable<RunMetadata['seededFromRuns']>;
} {
  const { repoRoot, seedFromPaths, targetMeta, plannedKeys } = params;
  const importedRecords: RawTrialRecord[] = [];
  const seededFromRuns: NonNullable<RunMetadata['seededFromRuns']> = [];
  const seenKeys = new Set<string>();

  for (const rawSeedPath of seedFromPaths) {
    const seedJsonlPath = path.isAbsolute(rawSeedPath)
      ? rawSeedPath
      : path.resolve(repoRoot, rawSeedPath);
    const seedMetaPath = seedJsonlPath.replace(/\.jsonl$/, '.meta.json');

    if (!fs.existsSync(seedJsonlPath)) {
      throw new Error(`Seed JSONL not found: ${seedJsonlPath}`);
    }
    if (!fs.existsSync(seedMetaPath)) {
      throw new Error(`Seed metadata (.meta.json) required for experimental equivalence validation: ${seedMetaPath}`);
    }

    const seedMeta = JSON.parse(fs.readFileSync(seedMetaPath, 'utf8')) as RunMetadata;
    const mismatches: string[] = [];
    if (seedMeta.dryRun !== targetMeta.dryRun) {
      mismatches.push(`dryRun (${seedMeta.dryRun} !== ${targetMeta.dryRun})`);
    }
    if (seedMeta.dataset !== targetMeta.dataset || seedMeta.datasetSha256 !== targetMeta.datasetSha256) {
      mismatches.push(`dataset/SHA (${seedMeta.datasetSha256} !== ${targetMeta.datasetSha256})`);
    }
    if (seedMeta.gitCommit !== targetMeta.gitCommit) {
      mismatches.push(`gitCommit (${seedMeta.gitCommit} !== ${targetMeta.gitCommit})`);
    }
    if (seedMeta.provenanceHashes?.catalogSerializedSha256 !== targetMeta.provenanceHashes.catalogSerializedSha256) {
      mismatches.push('catalogSerializedSha256');
    }
    if (seedMeta.provenanceHashes?.chatEngineSha256 !== targetMeta.provenanceHashes.chatEngineSha256) {
      mismatches.push('chatEngineSha256');
    }
    if (seedMeta.provenanceHashes?.financialGroundTruthSha256 !== targetMeta.provenanceHashes.financialGroundTruthSha256) {
      mismatches.push('financialGroundTruthSha256');
    }
    if (
      seedMeta.hyperparams?.temperature !== targetMeta.hyperparams.temperature ||
      seedMeta.hyperparams?.max_tokens !== targetMeta.hyperparams.max_tokens ||
      seedMeta.hyperparams?.reasoning_effort !== targetMeta.hyperparams.reasoning_effort
    ) {
      mismatches.push(
        `hyperparams (${JSON.stringify(seedMeta.hyperparams)} !== ${JSON.stringify(targetMeta.hyperparams)})`
      );
    }

    if (mismatches.length > 0) {
      throw new Error(
        `Seed provenance mismatch in ${seedMetaPath}: ${mismatches.join(', ')}. Run fresh calls instead of mixing mismatched archives.`
      );
    }

    const seedCheckpoints = loadExistingCheckpoints(seedJsonlPath);
    let importedFromThisFile = 0;
    for (const [key, rec] of seedCheckpoints.entries()) {
      if (!plannedKeys.has(key) || seenKeys.has(key)) continue;
      if (rec.status !== 'ok' || rec.infraError) continue;
      seenKeys.add(key);
      importedRecords.push({
        ...rec,
        seededFromRunId: rec.seededFromRunId ?? rec.runId,
      });
      importedFromThisFile++;
    }

    seededFromRuns.push({
      runId: seedMeta.runId,
      rawJsonlFile: seedJsonlPath,
      rawJsonlSha256: sha256File(seedJsonlPath),
      importedCount: importedFromThisFile,
    });
  }

  return { importedRecords, seededFromRuns };
}

function findAutoResumeRun(params: {
  rawDir: string;
  mode: BenchmarkMode;
  dataset: 'pilot' | 'main';
  datasetSha256: string;
  configs: ArchitectureConfig[];
  models: string[];
  reasoningEffort: string;
  gitCommit: string;
  dryRun: boolean;
}): RunMetadata | null {
  if (!fs.existsSync(params.rawDir)) return null;
  const metaFiles = fs
    .readdirSync(params.rawDir)
    .filter((f) => f.endsWith('.meta.json'))
    .sort()
    .reverse();

  for (const mf of metaFiles) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(params.rawDir, mf), 'utf8')) as RunMetadata;
      if (meta.status !== 'in_progress') continue;
      if (meta.mode !== params.mode || meta.dataset !== params.dataset) continue;
      if (meta.dryRun !== params.dryRun) continue;
      if (meta.datasetSha256 !== params.datasetSha256) continue;
      if (meta.gitCommit !== params.gitCommit) continue;
      if (meta.hyperparams.reasoning_effort !== params.reasoningEffort) continue;
      if (JSON.stringify(meta.configs) !== JSON.stringify(params.configs)) continue;
      if (JSON.stringify(meta.models) !== JSON.stringify(params.models)) continue;
      if (fs.existsSync(meta.rawJsonlFile)) {
        return meta;
      }
    } catch {
      // ignore corrupt meta
    }
  }
  return null;
}

// ============================================================================
// Main Orchestrator
// ============================================================================

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, '..');
  const rawDir = path.join(__dirname, 'raw');
  const resultsDir = path.join(__dirname, 'results');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });

  const allUnits = KERUEN_CATALOG_SNAPSHOT;
  const finGtPath = path.join(__dirname, 'financial_ground_truth.json');
  const finGroundTruth: FinancialGroundTruthCase[] = JSON.parse(fs.readFileSync(finGtPath, 'utf8')).cases;

  // Eval-only mode (re-evaluate existing immutable raw JSONL archive)
  if (cli.evalOnlyPath) {
    const absRaw = path.isAbsolute(cli.evalOnlyPath)
      ? cli.evalOnlyPath
      : path.resolve(repoRoot, cli.evalOnlyPath);
    if (!fs.existsSync(absRaw)) {
      throw new Error(`Raw JSONL file not found: ${absRaw}`);
    }
    const guessedMetaPath = absRaw.replace(/\.jsonl$/, '.meta.json');
    const meta = fs.existsSync(guessedMetaPath)
      ? (JSON.parse(fs.readFileSync(guessedMetaPath, 'utf8')) as RunMetadata)
      : null;

    const datasetKind: 'pilot' | 'main' =
      cli.dataset || meta?.dataset || (absRaw.includes('pilot') ? 'pilot' : 'main');
    const casesPath = path.join(
      __dirname,
      datasetKind === 'pilot' ? 'pilot_12_cases.jsonl' : 'benchmark_cases.jsonl'
    );
    const cases: PilotCase[] = fs
      .readFileSync(casesPath, 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((l) => JSON.parse(l));

    const ts = makeFileTimestamp();
    const outEvalPath = path.join(resultsDir, `eval_${ts}_${meta?.mode || cli.mode}.json`);
    evaluateRawArchive({
      rawJsonlPath: absRaw,
      meta,
      cases,
      allUnits,
      finGroundTruth,
      outEvalPath,
    });
    return;
  }

  let apiKey = isLocalRouterUrl(activeGroqApiUrl)
    ? process.env.NINE_ROUTER_API_KEY || process.env.GROQ_API_KEY || ''
    : process.env.GROQ_API_KEY || '';

  if (!cli.dryRun && isLocalRouterUrl(activeGroqApiUrl)) {
    const healthOrigin = new URL(activeGroqApiUrl).origin;
    try {
      const hc = await fetch(`${healthOrigin}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(2000),
      });
      if (!hc.ok) throw new Error(`HTTP ${hc.status}`);
      console.log(`Routing Groq requests via 9router: ${activeGroqApiUrl}`);
    } catch {
      if (process.env.GROQ_API_KEY) {
        console.warn(`9router unreachable at ${healthOrigin}; falling back to direct Groq API.`);
        activeGroqApiUrl = DIRECT_GROQ_API_URL;
        apiKey = process.env.GROQ_API_KEY;
      } else {
        throw new Error(`9router is unreachable at ${healthOrigin} and GROQ_API_KEY is missing.`);
      }
    }
  }

  if (!cli.dryRun && !apiKey) {
    throw new Error('NINE_ROUTER_API_KEY / GROQ_API_KEY is missing in .env.local or environment.');
  }

  const datasetKind: 'pilot' | 'main' = cli.dataset || (cli.mode === 'pilot' ? 'pilot' : 'main');
  const configs: ArchitectureConfig[] = cli.configs || MODE_DEFAULT_CONFIGS[cli.mode];
  const casesPath = path.join(
    __dirname,
    datasetKind === 'pilot' ? 'pilot_12_cases.jsonl' : 'benchmark_cases.jsonl'
  );
  let cases: PilotCase[] = fs
    .readFileSync(casesPath, 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((l) => JSON.parse(l));

  if (cli.limitCases && cli.limitCases > 0) {
    cases = cases.slice(0, cli.limitCases);
  }

  const datasetSha256 = sha256File(casesPath);
  const { commit: gitCommit, dirty: gitDirty } = getGitProvenance(repoRoot);

  let rawJsonlPath: string;
  let metaPath: string;
  let meta: RunMetadata;

  if (cli.resumePath) {
    if (cli.seedFromPaths.length > 0) {
      throw new Error('Cannot combine --resume with --seed-from; pass --fresh to create a newly seeded archive or omit --seed-from when resuming.');
    }
    rawJsonlPath = path.isAbsolute(cli.resumePath)
      ? cli.resumePath
      : path.resolve(repoRoot, cli.resumePath);
    metaPath = rawJsonlPath.replace(/\.jsonl$/, '.meta.json');
    if (!fs.existsSync(rawJsonlPath)) {
      throw new Error(`Resume JSONL not found: ${rawJsonlPath}`);
    }
    meta = fs.existsSync(metaPath)
      ? (JSON.parse(fs.readFileSync(metaPath, 'utf8')) as RunMetadata)
      : ({
        schemaVersion: 'revisi8-raw-v1',
        runId: path.basename(rawJsonlPath, '.jsonl'),
        mode: cli.mode,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        completedAt: null,
        dryRun: cli.dryRun,
        dataset: datasetKind,
        datasetPath: path.relative(repoRoot, casesPath).replace(/\\/g, '/'),
        datasetSha256,
        totalCases: cases.length,
        totalPlannedCalls: cases.length * cli.models.length * configs.length,
        completedCalls: 0,
        okCalls: 0,
        infraErrorCalls: 0,
        configs,
        models: cli.models,
        hyperparams: {
          temperature: BENCHMARK_TEMPERATURE,
          max_tokens: BENCHMARK_MAX_TOKENS,
          reasoning_effort: cli.reasoningEffort,
        },
        gitCommit,
        gitDirty,
        nodeVersion: process.version,
        provenanceHashes: {
          rawJsonlSha256: null,
          catalogSnapshotFileSha256: sha256File(path.join(repoRoot, 'src', 'lib', 'catalogSnapshot.ts')),
          catalogSerializedSha256: sha256Text(JSON.stringify(allUnits)),
          evaluatorSha256: sha256File(path.join(__dirname, 'evaluator.ts')),
          chatEngineSha256: sha256File(path.join(repoRoot, 'src', 'lib', 'chatEngine.ts')),
          financialGroundTruthSha256: sha256File(finGtPath),
        },
        legacyConfigMapping: {
          naive_rag: 'full_context (Full-Context Prompting — static catalog/company context, no vector DB)',
        },
        rawJsonlFile: rawJsonlPath,
        metaFile: metaPath,
      } satisfies RunMetadata);
    meta.status = 'in_progress';
    console.log(`Resuming explicit archive: ${rawJsonlPath}`);
  } else {
    const autoCandidate = !cli.fresh
      ? findAutoResumeRun({
        rawDir,
        mode: cli.mode,
        dataset: datasetKind,
        datasetSha256,
        configs,
        models: cli.models,
        reasoningEffort: cli.reasoningEffort,
        gitCommit,
        dryRun: cli.dryRun,
      })
      : null;

    const canAutoResume =
      autoCandidate &&
      (cli.seedFromPaths.length === 0 || (autoCandidate.seededFromRuns?.length ?? 0) > 0);

    if (canAutoResume && autoCandidate) {
      meta = autoCandidate;
      rawJsonlPath = meta.rawJsonlFile;
      metaPath = meta.metaFile;
      console.log(`Auto-resuming incomplete run: ${rawJsonlPath}`);
    } else {
      const ts = makeFileTimestamp();
      const modeSuffix = cli.dryRun ? `${cli.mode}_dryrun` : cli.mode;
      const runId = `run_${ts}_${gitCommit}_${modeSuffix}`;
      rawJsonlPath = path.join(rawDir, `${runId}.jsonl`);
      metaPath = path.join(rawDir, `${runId}.meta.json`);
      meta = {
        schemaVersion: 'revisi8-raw-v1',
        runId,
        mode: cli.mode,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        completedAt: null,
        dryRun: cli.dryRun,
        dataset: datasetKind,
        datasetPath: path.relative(repoRoot, casesPath).replace(/\\/g, '/'),
        datasetSha256,
        totalCases: cases.length,
        totalPlannedCalls: cases.length * cli.models.length * configs.length,
        completedCalls: 0,
        okCalls: 0,
        infraErrorCalls: 0,
        configs,
        models: cli.models,
        hyperparams: {
          temperature: BENCHMARK_TEMPERATURE,
          max_tokens: BENCHMARK_MAX_TOKENS,
          reasoning_effort: cli.reasoningEffort,
        },
        gitCommit,
        gitDirty,
        nodeVersion: process.version,
        provenanceHashes: {
          rawJsonlSha256: null,
          catalogSnapshotFileSha256: sha256File(path.join(repoRoot, 'src', 'lib', 'catalogSnapshot.ts')),
          catalogSerializedSha256: sha256Text(JSON.stringify(allUnits)),
          evaluatorSha256: sha256File(path.join(__dirname, 'evaluator.ts')),
          chatEngineSha256: sha256File(path.join(repoRoot, 'src', 'lib', 'chatEngine.ts')),
          financialGroundTruthSha256: sha256File(finGtPath),
        },
        legacyConfigMapping: {
          naive_rag: 'full_context (Full-Context Prompting — static catalog/company context, no vector DB)',
        },
        rawJsonlFile: rawJsonlPath,
        metaFile: metaPath,
      };

      if (cli.seedFromPaths.length > 0) {
        const plannedKeys = new Set<string>();
        for (const tc of cases) {
          for (const model of cli.models) {
            for (const config of configs) {
              plannedKeys.add(`${tc.id}::${model}::${config}`);
            }
          }
        }
        const { importedRecords, seededFromRuns } = loadValidatedSeedRecords({
          repoRoot,
          seedFromPaths: cli.seedFromPaths,
          targetMeta: meta,
          plannedKeys,
        });
        meta.seededFromRuns = seededFromRuns;
        meta.completedCalls = importedRecords.length;
        meta.okCalls = importedRecords.length;
        const seededJsonl =
          importedRecords.length > 0
            ? importedRecords.map((r) => JSON.stringify(r)).join('\n') + '\n'
            : '';
        fs.writeFileSync(rawJsonlPath, seededJsonl, 'utf8');
        console.log(
          `Seeded ${importedRecords.length} validated OK trials into ${rawJsonlPath} from ${seededFromRuns.map((s) => `${s.runId}(${s.importedCount})`).join(', ')}`
        );
      } else {
        fs.writeFileSync(rawJsonlPath, '', 'utf8');
      }
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    }
  }

  const checkpoints = loadExistingCheckpoints(rawJsonlPath);
  const rateLimiter = new ModelRateLimiter();

  console.log('========================================================================');
  console.log(`  REVISI 8 CONTROLLED BENCHMARK RUNNER (${cli.mode.toUpperCase()}${cli.dryRun ? ' - DRY RUN' : ''})`);
  console.log(`  Dataset: ${datasetKind} (${cases.length} cases) | Configs: [${configs.join(', ')}]`);
  console.log(`  Models : [${cli.models.join(', ')}] | Temp=${BENCHMARK_TEMPERATURE}, MaxTok=${BENCHMARK_MAX_TOKENS}, Reasoning=${cli.reasoningEffort}`);
  console.log(`  Archive: ${rawJsonlPath}`);
  console.log(`  Checkpoints already completed: ${checkpoints.size}/${meta.totalPlannedCalls}`);
  console.log('========================================================================\n');

  const writeCheckpoint = (rec: RawTrialRecord) => {
    fs.appendFileSync(rawJsonlPath, JSON.stringify(rec) + '\n', 'utf8');
    checkpoints.set(`${rec.caseId}::${rec.requestedModel}::${rec.config}`, rec);
  };

  const updateMetaCounts = (final: boolean) => {
    const allRecs = Array.from(checkpoints.values());
    meta.completedCalls = allRecs.length;
    meta.okCalls = allRecs.filter((r) => r.status === 'ok' && !r.infraError).length;
    meta.infraErrorCalls = allRecs.filter((r) => r.status !== 'ok' || r.infraError).length;
    if (final) {
      meta.status = 'completed';
      meta.completedAt = new Date().toISOString();
      meta.provenanceHashes.rawJsonlSha256 = sha256File(rawJsonlPath);
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  };

  // Run independent queues per model with optional intra-model concurrency for multi-key 9router pools
  const runModelQueue = async (model: string, workersPerModel: number) => {
    const pendingTasks: Array<{ tc: PilotCase; config: ArchitectureConfig }> = [];
    for (let i = 0; i < cases.length; i++) {
      const tc = cases[i];
      for (const config of configs) {
        const key = `${tc.id}::${model}::${config}`;
        const existing = checkpoints.get(key);
        if (existing) {
          if (!cli.retryInfraErrors || (existing.status === 'ok' && !existing.infraError)) {
            continue;
          }
        }
        pendingTasks.push({ tc, config });
      }
    }

    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(workersPerModel, pendingTasks.length || 1));
    const runWorker = async () => {
      while (true) {
        const idx = nextIndex++;
        if (idx >= pendingTasks.length) break;
        const { tc, config } = pendingTasks[idx];

        const record = await executeTrial({
          runId: meta.runId,
          mode: cli.mode,
          tc,
          model,
          config,
          allUnits,
          apiKey,
          reasoningEffort: cli.reasoningEffort,
          rateLimiter,
          dryRun: cli.dryRun,
        });

        writeCheckpoint(record);
        const tag = record.status === 'ok' ? 'OK' : `INFRA_ERR(${record.statusCode}:${record.errorType})`;
        const tokStr = record.usage
          ? `${record.usage.prompt_tokens}+${record.usage.completion_tokens}=${record.usage.total_tokens}tok`
          : '0tok';
        console.log(
          `[${checkpoints.size}/${meta.totalPlannedCalls}] ${model} | ${tc.id} | ${config} -> ${tag} (http=${record.statusCode}, ${tokStr}, ${record.apiLatencyMs}ms, retries=${record.retries})`
        );

        if (checkpoints.size % 10 === 0) {
          updateMetaCounts(false);
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  };

  if (cli.concurrency >= 2 && cli.models.length > 1) {
    const workersPerModel = Math.max(1, Math.floor(cli.concurrency / cli.models.length));
    await Promise.all(cli.models.map((m) => runModelQueue(m, workersPerModel)));
  } else {
    for (const m of cli.models) {
      await runModelQueue(m, cli.concurrency);
    }
  }

  updateMetaCounts(true);

  const evalTs = meta.startedAt ? makeFileTimestamp(new Date(meta.startedAt)) : makeFileTimestamp();
  const evalSuffix = cli.dryRun ? `${cli.mode}_dryrun` : cli.mode;
  const outEvalPath = path.join(resultsDir, `eval_${evalTs}_${evalSuffix}.json`);
  evaluateRawArchive({
    rawJsonlPath,
    meta,
    cases,
    allUnits,
    finGroundTruth,
    outEvalPath,
  });

  console.log('\n========================================================================');
  console.log(`Run completed. Raw SHA-256: ${meta.provenanceHashes.rawJsonlSha256}`);
  console.log(`Meta file: ${metaPath}`);
  console.log(`Eval file: ${outEvalPath}`);
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('Benchmark runner failed:', err);
  process.exit(1);
});
