# Atamura Property Consultation Chatbot

> **Chatbot Konsultasi Properti Berbasis Hybrid Constraint-Aware Retrieval-Augmented Generation Menggunakan Model Open-Weight (Studi Kasus: KERUEN Atamura Group)**

[![CI / Production Quality Gate](https://github.com/nnavyy/atamura-chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/nnavyy/atamura-chatbot/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)
[![Groq LPU](https://img.shields.io/badge/Groq%20LPU-Hardware%20Accelerated-orange.svg)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An independent academic research prototype based on publicly accessible KERUEN catalog material (Almaty, Kazakhstan); not an official Atamura Group deployment or commercial endorsement. Supports trilingual property consultation across English (`EN`), Russian (`RU`), and Kazakh (`KK`).

---

## Main Controlled Benchmark (13 November 2026)

The primary empirical evaluation of this repository is the **1,200-call controlled factorial benchmark** (`revisi8-main-benchmark` @ `e062d25`, parent commit `c533d0d`):

- **Experimental Design (`1,200` Planned Calls):** `120` stratified trilingual test cases (`40` semantic scenarios x `3` languages: `EN`, `RU`, `KK`) evaluated across **`5` architectural arms** (`zero_shot`, `full_context`, `plus_prefilter`, `plus_calculator`, `proposed_hybrid`) and **`2` standalone open-weight models** on Groq LPU (`openai/gpt-oss-120b` and Groq `Preview`-tier `qwen/qwen3.8-27b` with `disableFallback=true`, `temperature=0.1`, `max_tokens=1024`).
- **Raw Archive & Deduplication Provenance:** The append-only raw log contains **`1,398` raw lines**, which deduplicate deterministically by `(caseId, requestedModel, config)` retaining the latest attempt into **`1,200` unique scheduled calls** (`198` superseded earlier lines: `123 ok` from pre-resume runs + `75 infra_error` transient retries). Of the `1,200` scheduled calls, **`1,191` (`99.25%`) returned valid responses** (`100%` verified with `requestedModel == actualModelUsed` and `usedFallback == false`) and **`9` (`0.75%`) failed permanently with HTTP 400 (`json_validate_failed` under `max_tokens=1024`)**.
- **Direct Links to Primary Benchmark Artifacts:**
  - Statistical & Cluster-Aware Report: [`benchmark/results/revisi8_main_1200_report.md`](benchmark/results/revisi8_main_1200_report.md) (`revisi8_main_1200_report.json`)
  - Re-Audit Reproducibility Guide (CRLF vs LF & Section G): [`benchmark/AUDIT_RAW_1200_README.md`](benchmark/AUDIT_RAW_1200_README.md)
  - Standalone Python Standard-Library Audit Script: [`benchmark/audit_raw_1200.py`](benchmark/audit_raw_1200.py) (run from repo root via `python benchmark/audit_raw_1200.py`)
  - Immutable Raw JSONL Log (`1,398` lines -> `1,200` calls): [`benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl`](benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl)
  - Evaluated Main Results Archive (`1,200` records): [`benchmark/results/eval_2026-11-13T09-05-53Z_main.json`](benchmark/results/eval_2026-11-13T09-05-53Z_main.json)

### Main 1,200-Call Controlled Benchmark Summary (Conditional on Valid & End-to-End Scheduled)

| Model & Architectural Arm | Valid / Sched | CSR (Cond. / E2E) | Faithfulness (Cond. / E2E) | Refusal Acc. (Cond. / E2E) | Financial Acc. `±2%` (Cond. / E2E) | Financial Acc. `0 KZT` Exact (`Section G`) | Mean / P95 Pipe Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`openai/gpt-oss-120b`** | | | | | | | |
| - `zero_shot` | `120/120` | `87.5% (105/120)` | `67.5% (81/120)` | `13.0% (7/54)` | `8.3% (2/24)` | `4.2% (1/24)` | `2,014 / 2,748` |
| - `full_context` | `116/120` | `97.4% (113/116)` / `94.2%` | `96.6% (112/116)` / `93.3%` | `90.7% (49/54)` | `95.0% (19/20)` / `79.2%` | `60.0% (12/20)` / `50.0%` | `1,766 / 2,727` |
| - `plus_prefilter` | `118/120` | `99.2% (117/118)` / `97.5%` | `99.2% (117/118)` / `97.5%` | `94.4% (51/54)` | `100.0% (22/22)` / `91.7%` | `63.6% (14/22)` / `58.3%` | `1,724 / 2,758` |
| - `plus_calculator` | `120/120` | `98.3% (118/120)` | `96.7% (116/120)` | `94.4% (51/54)` | `91.7% (22/24)` | `91.7% (22/24)` | `1,830 / 2,715` |
| - **`proposed_hybrid`** | **`120/120`** | **`100.0% (120/120)`** | **`100.0% (120/120)`** | **`100.0% (54/54)`** | **`100.0% (24/24)`** | **`100.0% (24/24)`** | **`1,797 / 2,677`** |
| **`qwen/qwen3.8-27b` (Groq Preview)** | | | | | | | |
| - `zero_shot` | `120/120` | `95.8% (115/120)`* | `76.7% (92/120)` | `48.1% (26/54)` | `8.3% (2/24)` | `0.0% (0/24)` | `1,465 / 2,550` |
| - `full_context` | `119/120` | `94.1% (112/119)` / `93.3%` | `84.9% (101/119)` / `84.2%` | `85.2% (46/54)` | `37.5% (9/24)` | `37.5% (9/24)` | `1,367 / 2,299` |
| - `plus_prefilter` | `119/120` | `97.5% (116/119)` / `96.7%` | `84.0% (100/119)` / `83.3%` | `92.6% (50/54)` | `33.3% (8/24)` | `33.3% (8/24)` | `1,268 / 2,335` |
| - `plus_calculator` | `119/120` | `98.3% (117/119)` / `97.5%` | `93.3% (111/119)` / `92.5%` | `96.3% (52/54)` | `75.0% (18/24)` | `75.0% (18/24)` | `1,402 / 2,290` |
| - **`proposed_hybrid`** | **`120/120`** | **`99.2% (119/120)`** | **`99.2% (119/120)`** | **`98.1% (53/54)`** | **`100.0% (24/24)`** | **`100.0% (24/24)`** | **`1,266 / 2,035`** |

*\*Methodological & Provenance Notes:*
1. **Automated Rule-Evaluator Parity vs Pending Tier 3 Human Validation:** The scores above are produced by the deterministic rule-based evaluator (`benchmark/evaluator.ts`) and verified with `0` mismatches (`1,191/1,191`) by the standalone Python port (`benchmark/audit_raw_1200.py`). Because `audit_raw_1200.py` replicates the exact rule definitions of `evaluator.ts`, these figures represent **Tier 1/2 automated evaluation** and **await independent human / native-speaker blind validation (Tier 3)** (e.g., on the single Russian waitlist clause case `AV-01-RU` in Qwen `proposed_hybrid`, the `60` Stage 6c sanitized pairs, and the `24` financial scenarios). In `zero_shot`, `qwen/qwen3.8-27b` achieves `95.8%` CSR because it abstains from naming specific unit codes (`recommendedUnits = []` on `66/66` non-refusal queries, yielding `0/66` active recommendations; see `Section C` of `benchmark/AUDIT_RAW_1200_README.md`).
2. **Dataset Metadata Tag (`status: "proposed_not_yet_pilot_verified"`):** Each line in `benchmark/benchmark_cases.jsonl` carries `"status": "proposed_not_yet_pilot_verified"`, which is a frozen design-phase label recorded when the 120-case corpus was authored prior to execution. The file was intentionally left unmodified after the 13 November 2026 run so its SHA-256 hash (`88b619396e28e6aed57f56187829fcce0a783cc0707960fda34fbbb9b17d60bc`) matches `datasetSha256` in `benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` (where actual run completion is recorded as `"status": "completed"`).
3. **Provenance of `gitDirty: true`:** In `run_2026-11-13T09-05-53Z_c533d0d_main.meta.json`, `"gitDirty": true` reflects that the benchmark runner and evaluation harness were executed over parent commit `c533d0d` before being archived in commit `e062d25` alongside 4 pre-existing local working-tree files. Exact code and data provenance is locked via the 6 SHA-256 digests in `provenanceHashes` inside `.meta.json`.

---

## System Architecture: 6-Pipeline Hybrid Constraint-Aware RAG

Conventional Large Language Models (LLMs) and standard Full-Context / Naive RAG architectures suffer from hallucinations and numerical constraint violations (e.g. recommending units exceeding strict client budgets, offering sold/reserved apartments, or miscalculating mortgage annuities). This prototype enforces a **6-Pipeline Hybrid Constraint-Aware RAG Architecture**:

```
[ User Query (EN / RU / KK) ]
              │
              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 1. Intent Classification & Trilingual Entity Extraction │ (intentClassifier.ts)
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 2. Relational Database Query / Catalog Snapshot Load    │ (schema.prisma / catalogSnapshot.ts)
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 3. Deterministic In-Memory Pre-Filtering (0% Tolerance) │ (rules.ts)
 │    - Excludes 'sold' (Unit 3B) & 'reserved' (Unit 2V)   │
 │    - Enforces strict priceMin <= budget                 │
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 4. Authoritative Financial Calculations & Prompt Build  │ (calculator.ts / knowledgeBase.ts)
 │    - 100% Cash: 3% Discount (ROUND_HALF_UP)             │
 │    - 0% Developer Installment: DP 30-70%, Tenor <= 36m  │
 │    - Bank Mortgage: 15-17% Annual Rate (up to 240m)     │
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 5. Groq LPU Hardware Inference (Open-Weight LLMs)       │ (groq.ts)
 │    - Benchmark Mode: Standalone model evaluation        │
 │      (disableFallback=true; 0% cross-model fallback)    │
 │    - Production Web Mode (/api/chat): Optional fallback │
 │      (openai/gpt-oss-120b -> qwen/qwen3.8-27b)          │
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 6. Fail-Closed Post-Validation (Core Pipeline 6)        │ (chatEngine.ts)
 │    - Stage 6a: recommendedUnits intersection filter     │
 │    - Stage 6b: Authoritative CalculationResult override │
 │    - Stage 6c: Prose consistency & refusal validation   │
 └────────────────────────────┬────────────────────────────┘
                              ├──────────────────────────────────────────────┐
                              ▼                                              ▼
 [ Core Output: Validated JSON + UnitCard & CalculationCard ]   [ Optional /api/chat Branch ]
                                                                (leadScoring.ts: Lead Qualification
                                                                 0-100 pts, outside core benchmark)
```

---

## Historical Pre-Fix Pilot (12 Cases, Initial Archived Trial - Superseded by the 1,200-Call Main Run)

> **Historical Provenance Note:** The table below preserves the initial 12-case pre-fix pilot trial (`benchmark/pilot_12_cases.jsonl`, archived on 12 November 2026 in `benchmark/archive/pilot_2026-11-12_original_raw.json`) conducted **before** the deterministic fixes (`P0.1..P0.5`) and **superseded by the 1,200-call main controlled benchmark above**.

| Model & Konfigurasi Arsitektur | CSR (0% Tol.) | Faithfulness | Refusal Acc. | Financial Acc. | Latensi Request (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **OpenAI GPT-OSS-120B (Groq LPU)** | | | | | |
| - Zero-Shot LLM (Tanpa Konteks) | 75.0% (9/12) | 50.0% (6/12) | 0.0% (0/8) | 0.0% (0/2) | 1.836,8 ms |
| - Full-Context / Naive Prompting | 100.0% (12/12) | 100.0% (12/12) | 100.0% (8/8) | 100.0% (2/2) | 1.169,9 ms |
| - **Proposed 6-Pipeline RAG (Pre-Fix)** | **100.0% (12/12)** | **91.7% (11/12)** | **87.5% (7/8)** | **50.0% (1/2)** | **3.572,0 ms** |
| **Qwen 3.8 27B (Groq LPU)** | | | | | |
| - Zero-Shot LLM (Tanpa Konteks) | 91.7% (11/12) | 66.7% (8/12) | 62.5% (5/8) | 0.0% (0/2) | 1.251,1 ms |
| - Full-Context / Naive Prompting | 83.3% (10/12) | 91.7% (11/12) | 75.0% (6/8) | 100.0% (2/2) | 706,3 ms |
| - **Proposed 6-Pipeline RAG (Pre-Fix)** | **100.0% (12/12)** | **91.7% (11/12)** | **100.0% (8/8)** | **50.0% (1/2)** | **3.240,4 ms** |

*Catatan Audit Ilmiah atas Pilot Historis 12 Kasus:*
- **Exact Binomial 95% Confidence Interval (Clopper-Pearson):** 12/12 = `[73,5% - 100,0%]`, 8/8 = `[63,1% - 100,0%]`, 1/2 = `[1,3% - 98,7%]`.
- Financial Accuracy 50.0% (1/2) pada pilot awal mencerminkan rekaman raw historis `F-07-KK` sebelum perbaikan pemisahan tenor produk (`getAllPaymentOptions` pada `calculator.ts`). Setelah perbaikan deterministik diterapkan dan diuji pada **1.200 panggilan utama (13 November 2026)**, `Proposed Hybrid` mencapai **100.0% (24/24)** baik pada toleransi `±2.0%` maupun toleransi nominal eksak `0 KZT` (`Section G`) di kedua model.

---

## Tech Stack & Production Modules

- **Full-Stack Framework:** Next.js 16 (App Router, React 19, Tailwind CSS v4)
- **Database & ORM:** PostgreSQL (NeonDB Serverless) with Prisma ORM v7.8.0
- **LPU Inference:** Groq API (`openai/gpt-oss-120b`, Groq `Preview`-tier `qwen/qwen3.8-27b`)
- **Key Modules:**
  - `src/lib/rules.ts`: Strict status, budget, room, and view constraint engine (`Pipeline 3`).
  - `src/lib/calculator.ts`: Deterministic mortgage, installment, and cash calculations with `ROUND_HALF_UP` integer precision (`Pipeline 4`).
  - `src/lib/chatEngine.ts`: Unified query orchestration and fail-closed post-validation (`Pipeline 6`: `Stage 6a/6b/6c`).
  - `src/lib/intentClassifier.ts`: Trilingual regex and intent detector (`Pipeline 1`).
  - `src/lib/leadScoring.ts`: Optional `/api/chat` conversational lead qualification branch (`0-100` pts: Cold, Warm, Hot; outside the core benchmark experiment).

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Python >= 3.10 (for running the standalone raw-archive audit script `benchmark/audit_raw_1200.py`)
- PostgreSQL database (NeonDB recommended for the web UI)

### 2. Environment Setup
Copy `.env.example` to `.env.local` and populate credentials:
```bash
cp .env.example .env.local
```

Required variables:
```env
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
GROQ_API_KEY="gsk_..."
```

### 3. Installation & Database Seeding
```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the chatbot interface and [http://localhost:3000/analytics](http://localhost:3000/analytics) for the Lead Management Dashboard.

---

## Testing, Re-Audit & Verification

### 1. Re-Auditing the 1,200-Call Raw Benchmark Archive (100% Python Standard Library)
```bash
python benchmark/audit_raw_1200.py
```
Verifies file SHA-256 provenance, `1,398 -> 1,200` deduplication, `1,191/1,191` (`0` mismatch) cross-language evaluator parity, parallel conditional vs end-to-end metrics, coverage/abstention matrix, `finish_reason="length"` sensitivity, `60`-case sanitizer before-vs-after counterfactuals, `AV-01-RU` forensics, and `Section G` (`0 KZT` exact integer financial sensitivity).

### 2. Running the TypeScript Unit & Evaluator Test Suites
```bash
npm test
```
This executes:
1. **Production Module Tests (`test-production-modules.ts`):** 37 test cases validating financial calculations (including 0% interest edge cases and product tenor decoupling), in-memory filtering, and trilingual intent extraction.
2. **Benchmark Evaluator Tests (`benchmark/test-evaluator.ts`):** 32 test cases verifying semantic refusal accuracy, numeric constraint satisfaction, cross-consistency text-vs-JSON checks, and multi-lingual prompt handling.

Typecheck:
```bash
npx tsc --noEmit
```

Linting:
```bash
npm run lint
```
