# Atamura KERUEN — Constraint-Aware Retrieval + Gemini Research Prototype

> **Independent research and portfolio prototype — not an official Atamura Group website, sales channel or inventory system.** Property details may originate from publicly available promotional material; **prices, unit status and financing parameters in the seeded PostgreSQL database are representative/simulated**, not confirmed commercial offers. Never use this demonstration to make a purchase or financing decision.

This is a trilingual (English, Russian, Kazakh) property-assistance web application developed with Next.js, TypeScript, Prisma, PostgreSQL, and Google's Gemini 2.5 Flash. It retrieves structured rows from PostgreSQL, filters them deterministically before injecting them as context for an LLM, and captures research/demo leads. It is designed as a case study for **relational/structured retrieval-augmented generation** — **not** embedding-based semantic document search.

## Current architecture

```text
Browser chat widget
    | POST /api/chat
    v
Intent + entity extraction (regex) / language detection
    |
Prisma/PostgreSQL -> available Unit rows
    |
Rule-based filtering by budget, rooms, unit code, purpose, view, min area
    |
Dynamic serialisation of matching rows into the Gemini prompt
    |
Gemini 2.5 Flash (text + JSON, possible fallback)
    |
Deterministic allowlist of unit codes from filtered DB rows
    |                         |
Server-side payment calculator  |
    |                         |
Response UI + persisted ChatHistory / rule-based lead score
```

There is **no vector database, embeddings, semantic-similarity retriever, FAISS, ChromaDB or pgvector** in the current code. The six-stage pipeline in the accompanying thesis is a *conceptual grouping*, not six independent retrieval components. The LLM's natural-language answer is not independently fact-checked; property recommendation cards are restricted to database-approved rows.

### Modules

| Path | Responsibility |
| --- | --- |
| `src/app/api/chat/route.ts` | Orchestrate chat; retrieval, guardrail and persistence |
| `src/lib/intentClassifier.ts` | Regex intent and entity parsing |
| `src/lib/rules.ts` | Strict pre-generation unit filtering |
| `src/lib/recommendationGuard.ts` | Validate suggested unit codes and generate grounded unit summaries |
| `src/lib/knowledgeBase.ts` | Prompt and structured-to-text serialization |
| `src/lib/gemini.ts` | Gemini integration and failure response |
| `src/lib/calculator.ts` | Deterministic payment *simulations* |
| `src/lib/leadScoring.ts` | Heuristic (not sales-validated) lead scoring |
| `src/lib/adminAuth.ts` | Prototype administrator bearer-key check |
| `prisma/schema.prisma` | Unit, Lead, ChatHistory relational models |
| `prisma/seed.ts` | Eight **representative** unit types for research |

**Important filtering change:** recommendations are restricted to `status === 'available'`, with a **strict budget ceiling** (`priceMin <= budget`). The previous 20% budget tolerance is removed; any study comparing against the earlier method must identify the version change and must not silently combine observations from both systems. Reserved units are excluded alongside sold units.

## Local setup

Requirements: a Node.js version supported by the checked-in Next.js release (Node.js 20.9+), npm, an accessible PostgreSQL database, and a Google Gemini API key.

```bash
git clone https://github.com/nnavyy/atamura-chatbot.git
cd atamura-chatbot
# To review refactor before it is merged:
git switch research/constraint-aware-rag-rework

npm ci
```

Create `.env.local` **locally** (never commit it):

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
GEMINI_API_KEY="YOUR_OWN_KEY"
ADMIN_API_KEY="A_LONG_RANDOM_SECRET_FOR_RESEARCH_ADMIN_ACCESS"
```

Set `DATABASE_URL` for Prisma CLI as well (e.g. copy the same value into a local `.env`; it is ignored by Git). Use a **dedicated test database**, never production customer data, when running database sync and seed commands.

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
npm test
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`. The seed creates representative KERUEN apartment types 1A–3B, including reserved and sold examples. **Do not run seeding over a live property catalogue:** upsert intentionally overwrites records with demonstration values.

### Available endpoints

| Endpoint | Method | Access | Notes |
| --- | --- | --- | --- |
| `/api/units` | GET | Public | Research dataset/catalogue |
| `/api/chat` | POST | Public | Chat; persists conversation history |
| `/api/leads` | POST | Public with explicit form consent | Save demo contact |
| `/api/leads` | GET | **Admin** | Personal lead records; bearer key |
| `/api/analytics` | GET | **Admin** | Aggregate stats from chat/lead records |
| `/analytics` | Page | Admin key prompt | Prototype-only auth in browser memory |

To query the protected APIs locally:

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:3000/api/analytics
```

**Security caveat:** the dashboard currently accepts an administrator key from the browser and sends it only over request headers; this is a research/demo solution, **not a production authentication design**. The public chat is not rate-limited; consent, retention/deletion policy, session authorization, server-side sessions and access controls must be hardened before real users or customer data are handled. Never paste administrator keys into a public or shared browser.

## Development and tests

```bash
npm test             # deterministic unit tests; does not call Gemini
npm run lint
npm run build
```

The repository's test suite checks filters, budget parsing, calculator arithmetic and response allowlisting. It does **not** establish accuracy percentages for the overall chatbot. To obtain publishable results, record fixed version/commit, a frozen dataset snapshot, documented test cases and gold labels, equal Gemini model/settings across baseline variants, and raw response logs. Reports must distinguish `zero-shot LLM`, `relational retrieval without constraints`, and `constraint-aware relational retrieval`.

Suggested empirical metrics: test-scenario success rate, unit-availability violation rate, budget and room constraint satisfaction, numeric calculation agreement, entity Precision/Recall/F1, grounded factual correctness, refusal accuracy, per-language consistency, and median/p95 latency. **No fabricated 500-query, ROUGE, faithfulness, F1 or JMeter results should be presented as measured experiments.**

## Data provenance and limitations

- Unit names, floorplans and general descriptions were assembled from public marketing information; confirm each externally if cited.
- Seeded `priceMin`, `status` and payment defaults are not proof of live inventory or official banking conditions.
- Mortgage calculations are simplified annuity simulations. They exclude fees, eligibility, promotions and rate changes.
- The three-language UI and regex functionality are implemented, but fluency/naturalness has **not** been validated by native speakers. Machine translation/back-translation is an aid, not a substitute for that validation.
- Lead score weights are developer heuristics, not a validated predictor of actual purchase conversion.
- The project is not affiliated with, commissioned or endorsed by Atamura Group.

## Academic use

The thesis and journal article are separate documents. Use DOI-checked references (IEEE style where the journal requires it), declare the *relational* form of RAG explicitly, and keep measured results distinct from proposals and synthetic demonstrations. Journal SINTA ranking applies to Indonesian journals, not to international ACM/IEEE/ACL venues. To reproduce a published experiment, include the frozen dataset (without personal information), code commit SHA, test scripts, model configuration, and results.

## Responsible deployment checklist

1. Restrict analytics and lead data; replace the demo bearer-key access with server-side sessions/RBAC.
2. Implement rate limiting, anti-abuse protection, data-retention and deletion mechanisms.
3. Obtain explicit, appropriately localized consent before persisting conversations or contacts.
4. Review legal/licensing implications of company naming, floorplan images and third-party marketing content.
5. Validate all unit and price details against a current authoritative dataset before any commercial use.
6. Run `npm test`, `npm run lint` and `npm run build` and inspect logs prior to deployment.

License and permission to redistribute third-party marketing assets are not established by this repository.
