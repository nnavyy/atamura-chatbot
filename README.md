# Atamura Property Consultation Chatbot

> **Chatbot Konsultasi Properti Berbasis Hybrid Constraint-Aware Retrieval-Augmented Generation Menggunakan Model Open-Weight (Studi Kasus: KERUEN Atamura Group)**

[![CI / Production Quality Gate](https://github.com/nnavyy/atamura-chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/nnavyy/atamura-chatbot/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)
[![Groq LPU](https://img.shields.io/badge/Groq%20LPU-Hardware%20Accelerated-orange.svg)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, trilingual (English, Russian, Kazakh) consultative property chatbot for **Atamura Group** (Almaty, Kazakhstan) operating on the **KERUEN Residential Complex** portfolio.

---

## 🏛️ System Architecture: 6-Pipeline Hybrid Constraint-Aware RAG

Conventional Large Language Models (LLMs) and standard Naive RAG architectures suffer from hallucinations and numerical constraint violation (e.g. recommending units exceeding strict client budgets or offering sold/reserved apartments). This system enforces a **6-Pipeline Hybrid Constraint-Aware RAG Architecture**:

```
[ User Query (EN / RU / KZ) ]
              │
              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 1. Intent Classification & Trilingual Entity Extraction │ (intentClassifier.ts)
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 2. Relational Database Query (PostgreSQL / Prisma ORM)  │ (schema.prisma / NeonDB)
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
 │    - 100% Cash: 3% Discount                             │
 │    - 0% Developer Installment: DP 30-70%, Tenor <= 36m  │
 │    - Bank Mortgage: Otbasy / Freedom Finance (to 240m)  │
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 5. Groq LPU Hardware Inference (Open-Weight LLMs)       │ (groq.ts)
 │    - Primary: openai/gpt-oss-120b                       │
 │    - Fallback: qwen/qwen3.8-27b                         │
 └────────────────────────────┬────────────────────────────┘
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 6. Post-Inference Sanitization & Lead Scoring (0-100)   │ (chatEngine.ts / leadScoring.ts)
 └────────────────────────────┬────────────────────────────┘
                              ▼
[ Structured JSON + Interactive Cards (UnitCard & CalculationCard) ]
```

---

## 📊 Empirical Pilot Benchmark Evaluation (Groq LPU Accelerator)

Evaluated against the stratified 12-case pilot benchmark (`benchmark/pilot_12_cases.jsonl`) balancing Strict Budgeting, Unit Attributes, Financial Inquiries, and Adversarial Trick Questions across English, Russian, and Kazakh.

| Model & Konfigurasi Arsitektur | CSR (0% Tol.) | Faithfulness | Refusal Acc. | Financial Acc. | Latensi Request (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **OpenAI GPT-OSS-120B (Groq LPU)** | | | | | |
| • Zero-Shot LLM (Tanpa Konteks) | 75.0% (9/12) | 50.0% (6/12) | 0.0% (0/8) | 0.0% (0/2) | 1.836,8 ms |
| • Full-Context / Naive Prompting | 100.0% (12/12) | 100.0% (12/12) | 100.0% (8/8) | 100.0% (2/2) | 1.169,9 ms |
| • **Proposed 6-Pipeline RAG** | **100.0% (12/12)** | **91.7% (11/12)** | **87.5% (7/8)** | **50.0% (1/2)** | **3.572,0 ms** |
| **Qwen 3.8 27B (Groq LPU)** | | | | | |
| • Zero-Shot LLM (Tanpa Konteks) | 91.7% (11/12) | 66.7% (8/12) | 62.5% (5/8) | 0.0% (0/2) | 1.251,1 ms |
| • Full-Context / Naive Prompting | 83.3% (10/12) | 91.7% (11/12) | 75.0% (6/8) | 100.0% (2/2) | 706,3 ms |
| • **Proposed 6-Pipeline RAG** | **100.0% (12/12)** | **91.7% (11/12)** | **100.0% (8/8)** | **50.0% (1/2)** | **3.240,4 ms** |

*Catatan Audit Ilmiah:*
- **Exact Binomial 95% Confidence Interval (Clopper-Pearson):** 12/12 = `[73,5% – 100,0%]`, 8/8 = `[63,1% – 100,0%]`, 1/2 = `[1,3% – 98,7%]`.
- Financial Accuracy 50.0% (1/2) mencerminkan rekaman raw historis F-07-KK di mana narasi teks dan objek JSON memiliki perbedaan parameter tenor (36m vs 24m). Masalah ini telah diperbaiki secara deterministik pada kode sumber dan diverifikasi pada 37 unit test produksi dan 32 unit test evaluator.

---

## 🛠️ Tech Stack & Production Modules

- **Full-Stack Framework:** Next.js 16 (App Router, React 19, Tailwind CSS v4)
- **Database & ORM:** PostgreSQL (NeonDB Serverless) with Prisma ORM v7.8.0
- **LPU Inference:** Groq API (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`)
- **Key Modules:**
  - `src/lib/rules.ts`: Strict status, budget, room, and view constraint engine.
  - `src/lib/calculator.ts`: Deterministic mortgage, installment, and cash calculations with non-zero interest safeguards.
  - `src/lib/chatEngine.ts`: Unified query orchestration with post-sanitization.
  - `src/lib/intentClassifier.ts`: Multi-lingual regex and intent detector.
  - `src/lib/leadScoring.ts`: Multi-factor conversational lead qualification (0-100 pts: Cold, Warm, Hot).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL database (NeonDB recommended)

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

## 🧪 Testing & Verification

Run the comprehensive unit test suites:
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
