# Atamura Chatbot Benchmark Suite (Groq LPU Accelerator)

This directory contains the automated evaluation framework, ground truth oracles, and audited pilot benchmark records for the **Atamura Real Estate Chatbot** on the **KERUEN Residential Complex** dataset.

---

## 📁 File Structure

- `benchmark_cases.jsonl`: Design dataset of 120 stratified test cases (40 scenarios × 3 languages: English, Russian, Kazakh).
- `pilot_12_cases.jsonl`: Frozen 12-case stratified pilot trial dataset used for the empirical ablation study on Groq LPU.
- `benchmark_results_groq.json`: The authoritative evaluated results file containing per-case outcomes and aggregated metrics for OpenAI GPT-OSS-120B and Qwen 3.8 27B across Zero-Shot, Full-Context, and Proposed 6-Pipeline RAG.
- `archive/pilot_2026-11-12_original_raw.json`: Immutable raw responses generated on Groq LPU on 2026-11-12. Preserved for academic provenance.
- `evaluator.ts`: Multi-stage evaluation oracle enforcing:
  1. `CSR` (Constraint Satisfaction Rate) with 0% budget tolerance and strict availability check.
  2. `Faithfulness`: Rule-based factual checking against frozen source truth.
  3. `Refusal Accuracy`: Strict refusal detection on adversarial trick questions (sold Unit 3B, reserved Unit 2V, 4BR non-existent, out-of-domain).
  4. `Financial Accuracy`: Cross-consistency audit checking whether text numbers match the structured JSON `calculation` object.
- `test-evaluator.ts`: 32 comprehensive unit tests validating the correctness, edge-case resilience, and multilingual support of `evaluator.ts`.
- `eval-archive.ts`: Script that parses `archive/pilot_2026-11-12_original_raw.json` with the validated evaluator and generates `benchmark_results_groq.json`.
- `catalog_snapshot_seed.json`: Independent snapshot of the 8 KERUEN units (1A to 3B).
- `financial_parameters.json` & `financial_ground_truth.json`: Independent financial validation parameters.

---

## 🎯 Evaluated Benchmark Metrics Summary

### 1. OpenAI GPT-OSS-120B on Groq LPU
- **Zero-Shot LLM:** CSR 75.0% (9/12), Faithfulness 50.0% (6/12), Refusal 0.0% (0/8), Financial 0.0% (0/2), Latency 1,836.8 ms
- **Full-Context (Naive):** CSR 100.0% (12/12), Faithfulness 100.0% (12/12), Refusal 100.0% (8/8), Financial 100.0% (2/2), Latency 1,169.9 ms
- **Proposed 6-Pipeline RAG:** CSR 100.0% (12/12), Faithfulness 91.7% (11/12), Refusal 87.5% (7/8), Financial 50.0% (1/2), Latency 3,572.0 ms

### 2. Qwen 3.8 27B on Groq LPU
- **Zero-Shot LLM:** CSR 91.7% (11/12), Faithfulness 66.7% (8/12), Refusal 62.5% (5/8), Financial 0.0% (0/2), Latency 1,251.1 ms
- **Full-Context (Naive):** CSR 83.3% (10/12), Faithfulness 91.7% (11/12), Refusal 75.0% (6/8), Financial 100.0% (2/2), Latency 706.3 ms
- **Proposed 6-Pipeline RAG:** CSR 100.0% (12/12), Faithfulness 91.7% (11/12), Refusal 100.0% (8/8), Financial 50.0% (1/2), Latency 3,240.4 ms

---

## 🔬 How to Run the Evaluator Suite

To test the evaluator logic:
```bash
npx tsx benchmark/test-evaluator.ts
```

To re-evaluate the raw historical responses from `archive/pilot_2026-11-12_original_raw.json`:
```bash
npx tsx benchmark/eval-archive.ts
```
