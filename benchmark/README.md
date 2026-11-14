# Atamura Chatbot Benchmark Suite (Groq LPU Accelerator)

This directory contains the automated evaluation framework, ground truth oracles, raw append-only JSONL execution logs, standalone Python re-audit scripts, and evaluated benchmark records for the **KERUEN Residential Complex** consultation prototype (an independent academic research prototype based on publicly accessible KERUEN catalog material; not an official Atamura Group deployment or commercial endorsement).

---

## Main Controlled Benchmark (13 November 2026)

The authoritative evaluation in this suite is the **1,200-call controlled factorial benchmark** (`revisi8-main-benchmark` @ `e062d25`, parent commit `c533d0d`):

- **Design & Scale (`1,200` Planned Calls):** `120` stratified trilingual test cases (`40` semantic scenarios x `3` languages: `EN`, `RU`, `KK`) x **`5` architectural arms** (`zero_shot`, `full_context`, `plus_prefilter`, `plus_calculator`, `proposed_hybrid`) x **`2` standalone open-weight models** on Groq LPU (`openai/gpt-oss-120b` and Groq `Preview`-tier `qwen/qwen3.8-27b` with `disableFallback=true`, `temperature=0.1`, `max_tokens=1024`).
- **Raw JSONL Deduplication & Completion:** The append-only raw log (`benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl`) contains **`1,398` raw lines**, deduplicated deterministically by `(caseId, requestedModel, config)` retaining the latest attempt (`198` superseded earlier lines = `123 ok` from pre-resume runs + `75 infra_error` transient retries), yielding **`1,200` unique scheduled calls**: **`1,191` valid (`99.25%`)** (`100%` verified with `requestedModel == actualModelUsed` and `usedFallback == false`) and **`9` permanent HTTP 400 (`json_validate_failed` under `max_tokens=1024`)**.
- **Direct Links to Primary Benchmark Artifacts:**
  - Statistical & Cluster-Aware Report: [`benchmark/results/revisi8_main_1200_report.md`](results/revisi8_main_1200_report.md) (`results/revisi8_main_1200_report.json`)
  - Re-Audit Reproducibility Guide (CRLF vs LF & Section G): [`benchmark/AUDIT_RAW_1200_README.md`](AUDIT_RAW_1200_README.md)
  - Standalone Python Standard-Library Audit Script: [`benchmark/audit_raw_1200.py`](audit_raw_1200.py) (run from repo root via `python benchmark/audit_raw_1200.py`)
  - Immutable Raw JSONL Log (`1,398` lines -> `1,200` calls): [`benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl`](raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl)
  - Evaluated Main Results Archive (`1,200` records): [`benchmark/results/eval_2026-11-13T09-05-53Z_main.json`](results/eval_2026-11-13T09-05-53Z_main.json)

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
1. **Automated Evaluator Replication vs Pending Tier 3 Human Validation:** The scores above replicate the deterministic rule-based evaluator (`benchmark/evaluator.ts` and its exact Python port `benchmark/audit_raw_1200.py`, `1,191/1,191` parity) and **await independent human / native-speaker validation (Tier 3)**. Under `Section G` (`0 KZT` exact integer tolerance), `Proposed Hybrid` achieves `24/24 (100.0%)` across both JSON `calculation` and narrative text on both models, whereas `openai/gpt-oss-120b` drops to `12/20 (60.0%)` on `full_context` (`p = 0.0078` conditional, `p = 0.0005` E2E) and `14/22 (63.6%)` on `plus_prefilter` (`p = 0.0078` conditional, `p = 0.0020` E2E).
2. **Dataset Metadata Tag (`status: "proposed_not_yet_pilot_verified"`):** Each JSON line in `benchmark/benchmark_cases.jsonl` carries `"status": "proposed_not_yet_pilot_verified"`, which is a frozen initial design-phase label authored before the pilot/main runs. It was deliberately left untouched so the file's SHA-256 (`88b619396e28e6aed57f56187829fcce0a783cc0707960fda34fbbb9b17d60bc`) matches `datasetSha256` in `raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` (where actual execution completion on 13 November 2026 is recorded as `"status": "completed"`).
3. **Provenance of `gitDirty: true`:** In `raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json`, `"gitDirty": true` reflects that the benchmark runner was executed over parent commit `c533d0d` prior to archiving the run in commit `e062d25` alongside 4 pre-existing local working-tree files. Exact file-level reproducibility is locked by the 6 SHA-256 digests in `provenanceHashes` inside `.meta.json`.

---

## File Structure

- `benchmark_cases.jsonl`: Frozen 120-case stratified test dataset (`40` semantic scenarios x `3` languages: `EN`, `RU`, `KK`; SHA-256 LF: `88b619396e28e6aed57f56187829fcce0a783cc0707960fda34fbbb9b17d60bc`).
- `raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl` & `.meta.json`: Immutable append-only raw execution log (`1,398` lines -> `1,200` unique scheduled calls) and provenance metadata for the 13 November 2026 main run.
- `results/eval_2026-11-13T09-05-53Z_main.json`: Evaluated per-record and per-cell results for the 1,200-call main run.
- `results/revisi8_main_1200_report.md` & `results/revisi8_main_1200_report.json`: Statistical report with Clopper-Pearson 95% CIs, query-level McNemar tests, and 40-cluster bootstrap/permutation tests.
- `audit_raw_1200.py` & `AUDIT_RAW_1200_README.md`: Standalone 100% Python Standard Library re-audit script and dual `CRLF`/`LF` reproducibility guide (`Sections A..G`).
- `evaluator.ts`: Multi-stage deterministic evaluation oracle enforcing:
  1. `CSR` (Constraint Satisfaction Rate) with 0% budget tolerance and strict availability check.
  2. `Faithfulness`: Rule-based factual checking against frozen source truth.
  3. `Refusal Accuracy`: Strict refusal detection on unavailable units (`3B` sold, `2V` reserved), zero-match budgets, out-of-scope prompts, and unverified bank approval claims.
  4. `Financial Accuracy`: Cross-consistency audit checking whether text numbers and structured JSON `calculation` fields match `financial_ground_truth.json`.
- `test-evaluator.ts`: 32 unit tests validating `evaluator.ts`.
- `catalog_snapshot_seed.json`, `financial_parameters.json`, & `financial_ground_truth.json`: Independent catalog and `ROUND_HALF_UP` financial ground truth oracles.
- `pilot_12_cases.jsonl`, `benchmark_results_groq.json`, & `archive/pilot_2026-11-12_original_raw.json`: Historical 12-case pre-fix pilot artifacts preserved for provenance.

---

## Historical Pre-Fix Pilot (12 Cases, Initial Archived Trial - Superseded by the 1,200-Call Main Run)

> **Historical Provenance Note:** The summary below preserves the initial 12-case pre-fix pilot (`pilot_12_cases.jsonl` / `archive/pilot_2026-11-12_original_raw.json`) executed on 12 November 2026 prior to the deterministic pipeline fixes and **superseded by the 1,200-call main controlled benchmark above**.

### 1. OpenAI GPT-OSS-120B on Groq LPU (Historical 12-Case Pre-Fix Pilot)
- **Zero-Shot LLM:** CSR 75.0% (9/12), Faithfulness 50.0% (6/12), Refusal 0.0% (0/8), Financial 0.0% (0/2), Latency 1,836.8 ms
- **Full-Context (Naive):** CSR 100.0% (12/12), Faithfulness 100.0% (12/12), Refusal 100.0% (8/8), Financial 100.0% (2/2), Latency 1,169.9 ms
- **Proposed 6-Pipeline RAG (Pre-Fix):** CSR 100.0% (12/12), Faithfulness 91.7% (11/12), Refusal 87.5% (7/8), Financial 50.0% (1/2), Latency 3,572.0 ms

### 2. Qwen 3.8 27B on Groq LPU (Historical 12-Case Pre-Fix Pilot)
- **Zero-Shot LLM:** CSR 91.7% (11/12), Faithfulness 66.7% (8/12), Refusal 62.5% (5/8), Financial 0.0% (0/2), Latency 1,251.1 ms
- **Full-Context (Naive):** CSR 83.3% (10/12), Faithfulness 91.7% (11/12), Refusal 75.0% (6/8), Financial 100.0% (2/2), Latency 706.3 ms
- **Proposed 6-Pipeline RAG (Pre-Fix):** CSR 100.0% (12/12), Faithfulness 91.7% (11/12), Refusal 100.0% (8/8), Financial 50.0% (1/2), Latency 3,240.4 ms

---

## How to Run the Re-Audit & Evaluator Suite

To run the standalone Python raw-archive re-audit (`Sections A..G`, 100% Python Standard Library) from the repository root:
```bash
python benchmark/audit_raw_1200.py
# Or write output to a custom path:
python benchmark/audit_raw_1200.py --out /tmp/check_audit_repo.json
```

To run the TypeScript evaluator unit test suite (`32` tests):
```bash
npx tsx benchmark/test-evaluator.ts
```

To re-evaluate the historical 12-case pilot archive (`archive/pilot_2026-11-12_original_raw.json`):
```bash
npx tsx benchmark/eval-archive.ts
```
