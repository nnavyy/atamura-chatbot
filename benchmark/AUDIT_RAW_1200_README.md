# Dokumentasi Reprodusibilitas: `audit_raw_1200.py` (`benchmark/` & `dokumen/`)

Dokumen ini menjelaskan spesifikasi teknis, asal-usul berkas (*provenance*), cara eksekusi lintas lingkungan, verifikasi *checksum* SHA-256, serta batasan metodologis atas skrip audit ulang arsip mentah `audit_raw_1200.py` dan berkas ringkasan keluarannya `raw_1200_audit_summary.json`.

---

## 1. Status Ketersediaan Repositori & Sinkronisasi Paket Skripsi

Secara transparan dan terverifikasi (`sync=True` *byte-for-byte*):
1. **Tersedia pada Cabang Publik GitHub (`revisi8-main-benchmark`) dan Paket Lampiran Skripsi Lokal (`dokumen/`):** Skrip `audit_raw_1200.py` dan dokumen panduan `AUDIT_RAW_1200_README.md` disimpan secara identik pada dua lokasi:
   - Repositori aplikasi: `benchmark/audit_raw_1200.py` dan `benchmark/AUDIT_RAW_1200_README.md` (cabang `revisi8-main-benchmark`).
   - Paket dokumentasi skripsi: `dokumen/audit_raw_1200.py` dan `dokumen/AUDIT_RAW_1200_README.md` (beserta keluaran `dokumen/raw_1200_audit_summary.json`).
2. **Pemisahan Tegas antara Commit Beku Eksekusi (`e062d25` / `c533d0d`) dan Commit Publikasi Aditif:**
   - Seluruh kode aplikasi inti, aturan evaluator (`benchmark/evaluator.ts`), korpus uji (`benchmark/benchmark_cases.jsonl`), dan arsip log eksekusi utama `1.200` panggilan (`benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl` serta `benchmark/results/eval_2026-11-13T09-05-53Z_main.json`) tetap berada dalam kondisi beku (*frozen*) pada *commit* `e062d25` (dengan *commit* induk `master` `c533d0d` dan *commit* inti domain `ed722ef`).
   - *Commit* lanjutan di atas `e062d25` pada cabang `revisi8-main-benchmark` bersifat murni aditif (*additive documentation commit*): hanya menambahkan `benchmark/audit_raw_1200.py` dan `benchmark/AUDIT_RAW_1200_README.md` tanpa mengubah satu baris pun kode aplikasi, aturan evaluator, maupun arsip data hasil eksperimen `1.200` panggilan.

---

## 2. Spesifikasi Lingkungan & Dependensi Eksekusi

Skrip `audit_raw_1200.py` dirancang menggunakan **100% Python Standard Library** tanpa memerlukan instalasi pustaka pihak ketiga melalui `pip` (`numpy`, `scipy`, maupun `pandas` tidak diperlukan).

- **Versi Python Terverifikasi:** `Python 3.12.13` (kompatibel dengan Python `>= 3.10` pada Windows, Linux, dan macOS)
- **Resolusi Jalur Portabel Otomatis:**
  - Apabila dijalankan dari dalam klon repositori `atamura-chatbot` (`python benchmark/audit_raw_1200.py`), skrip mendeteksi keberadaan direktori `benchmark/raw/` secara otomatis dan menetapkan akar repositori ke direktori induk (`Path(__file__).resolve().parent.parent`), serta menulis keluaran default ke `benchmark/results/raw_1200_audit_summary.json` (atau jalur kustom melalui `--out`).
  - Apabila dijalankan dari direktori paket skripsi (`python dokumen/audit_raw_1200.py`), skrip membaca arsip repositori secara *read-only* (melalui `--repo-dir`, variabel lingkungan `ATAMURA_REPO_DIR`, atau jalur default lokal) dan menulis keluaran ke `dokumen/raw_1200_audit_summary.json`.
- **Modul Pustaka Standar yang Digunakan:**
  - `argparse` & `os` (konfigurasi argumen CLI `--repo-dir` dan `--out` serta resolusi jalur lintas sistem operasi)
  - `hashlib` (perhitungan *checksum* SHA-256 atas berkas input)
  - `json` (pembacaan berkas `.jsonl` dan `.json` serta serialisasi keluaran)
  - `math` (`lgamma`, `exp`, `log`, `log1p`, `isnan` untuk distribusi binomial eksak Clopper-Pearson 95% CI dan uji McNemar eksak dua sisi)
  - `re` (pencocokan ekspresi reguler multibahasa `EN/RU/KK`)
  - `collections` (`Counter`, `defaultdict`)
  - `pathlib` (`Path`)
  - `typing` (`Any`, `Dict`, `List`, `Optional`, `Tuple`)

---

## 3. Checksum SHA-256 & Ukuran Berkas (Skrip, Keluaran, dan Input Read-Only)

### 3.1. Berkas Skrip Audit dan Ringkasan Keluaran (`benchmark/` <-> `dokumen/`, `sync=True`)

| Berkas | Lokasi Repositori & Paket Skripsi | Ukuran (Byte) | Checksum SHA-256 |
| :--- | :--- | ---: | :--- |
| `audit_raw_1200.py` | `benchmark/audit_raw_1200.py` & `dokumen/audit_raw_1200.py` (`sync=True`) | `99.283` | `D3A932220DDC97D47CF31A413A732CDDF32B41434A1B2EF96583CE02734E2C71` |
| `raw_1200_audit_summary.json` | `dokumen/raw_1200_audit_summary.json` (atau `--out`) | `671.637` | `B7E5A23DF506B0507063EFC1D04B72965C529A1DF00C4464C0C2C268AA4401A2` |

### 3.2. Enam Berkas Input Read-Only dari Repositori Eksperimen (`atamura-chatbot` @ `e062d25`)

Skrip memverifikasi *checksum* SHA-256 keenam berkas sumber berikut secara otomatis pada bagian `section_a_provenance_and_parity.files`:

| Kunci Audit | Berkas Input (`<repo_dir>/benchmark/...`) | Ukuran (Byte) | Checksum SHA-256 |
| :--- | :--- | ---: | :--- |
| `raw_jsonl` | `benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl` | `5.747.779` | `80D8C0AC112D3DC63902EADE5B335EC5373AA4078CF4E17AB3D33D1B202BE867` |
| `raw_meta_json` | `benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` | `1.907` | `66B2C91E6336EA7F90C6557E2AFE6E864DB59309CBA958EDED4CCD346D9D30FA` |
| `eval_main_json` | `benchmark/results/eval_2026-11-13T09-05-53Z_main.json` | `6.224.682` | `DA2AFED71B15B599522630D58F29C439B140FB335E11869F0A5D9C2807ECE066` |
| `revisi8_report_json` | `benchmark/results/revisi8_main_1200_report.json` | `322.740` | `E98C153C0BE8BBC1E58CF00CB230879E2686DD1E51D66F7992BF69CDD54B8C16` |
| `benchmark_cases_jsonl` | `benchmark/benchmark_cases.jsonl` | `121.833` | `88B619396E28E6AED57F56187829FCCE0A783CC0707960FDA34FBBB9B17D60BC` |
| `financial_ground_truth_json` | `benchmark/financial_ground_truth.json` | `2.751` | `DF7670EBBDF10375D8A001576E4F7005FBD6BAE19D63FAD53155BC1625494167` |

---

## 4. Perintah Eksekusi CLI Terverifikasi & Ringkasan Hasil Paritas

### Opsi A: Eksekusi Langsung dari Akar Repositori `atamura-chatbot`
```bash
python benchmark/audit_raw_1200.py
# atau dengan jalur keluaran khusus:
python benchmark/audit_raw_1200.py --out /tmp/raw_1200_audit_summary.json
```

### Opsi B: Eksekusi dari Direktori Paket Skripsi
```powershell
python dokumen/audit_raw_1200.py
# atau bila repositori berada di lokasi lain:
python dokumen/audit_raw_1200.py --repo-dir "/path/to/atamura-chatbot"
```

### Ringkasan Keluaran Terverifikasi:
1. **Deduplikasi Arsip JSONL Mentah (`Section A`):**
   - Total baris pada `run_2026-11-13T09-05-53Z_c533d0d_main.jsonl`: **`1.398` baris** (`1.314` berstatus `ok`, `84` berstatus `infra_error` yang terdiri atas `63` `http_400`, `19` `http_503`, dan `2` `router_rate_limit_503`).
   - Rekaman unik terjadwal setelah deduplikasi deterministik `(caseId, requestedModel, config)` (mengambil percobaan terakhir per kunci): **`1.200` panggilan** (`1.191` berstatus `ok` valid dan `9` gagal permanen `http_400` `json_validate_failed` karena batas token keluaran (`1.024` token) tidak mencukupi untuk menghasilkan JSON lengkap).
   - Sebanyak `198` baris percobaan awal yang tergantikan (*superseded*) terdiri atas `123` baris `ok` dari eksekusi awal sebelum *resume* dan `75` baris `infra_error` transien/percobaan ulang.
   - Pada seluruh `1.191` rekaman valid, terverifikasi `requestedModel == actualModelUsed` (`100%`) dan `usedFallback == False` (`100%`).
2. **Paritas Penilaian `1.191/1.191` (`0` Selisih):**
   - `python_port_vs_ts_evaluator_1191_mismatches = 0`: Seluruh `1.191` respons valid menghasilkan skor `csr`, `refusal`, `faithfulness`, `financialAccuracy`, `financialTextAccuracy`, `financialJsonAccuracy`, dan `financialConsistency` yang identik `100%` antara fungsi `evaluate_response_py()` di Python dan rekaman `eval_2026-11-13T09-05-53Z_main.json` dari TypeScript.
   - `eval_json_vs_report_json_parity_mismatches = 0`: Seluruh agregat pada `eval_2026-11-13T09-05-53Z_main.json` cocok `100%` dengan `revisi8_main_1200_report.json`.
3. **Metrik Paralel Bersyarat vs End-to-End, Matriks Abstensi, Sensitivitas Pemotongan (`finish_reason == "length"`), & Audit Sanitizer (`Section B-F`):**
   - Menghitung secara terpisah metrik bersyarat (*conditional given valid*) dan metrik *end-to-end* per panggilan terjadwal (`n=120`, `54` penolakan, `24` finansial) beserta rentang kepercayaan Clopper-Pearson 95% dan uji McNemar eksak tingkat kueri serta klaster (`40` keluarga kueri).
   - Membedah `60/240` kasus `Proposed Hybrid` yang mengalami pasca-sanitasi (`34/120` pada `openai/gpt-oss-120b` dan `26/120` pada `qwen/qwen3.8-27b`) beserta simulasi kontrafaktual apabila komponen *Stage 6a/6b/6c* dinonaktifkan.
   - Mendokumentasikan forensik batas kata ekspresi reguler kasus tunggal `AV-01-RU` pada `qwen/qwen3.8-27b` (`Proposed Hybrid`).

---

## 5. Penilaian Jujur Independensi Aturan Evaluasi (Methodological Transparency)

Untuk menjaga kejujuran ilmiah dan mencegah klaim berlebihan (*overclaiming*) mengenai sifat audit *Tier 1*:

1. **Apa yang Independen secara Komputasional:**
   - Skrip `audit_raw_1200.py` membaca ulang berkas log JSONL mentah (`1.398` baris -> `1.200` panggilan terjadwal) secara langsung dari disk menggunakan runtime Python standar, memverifikasi ulang *checksum* SHA-256 berkas, melakukan penguraian ulang (*re-parsing*) muatan JSON mentah (`parse_groq_json_response_py`), serta menghitung ulang interval kepercayaan binomial eksak Clopper-Pearson 95% dan uji signifikansi McNemar tanpa bergantung pada kode perhitungan agregat di TypeScript.
2. **Apa yang Merupakan Porting Aturan Lintas Bahasa (Bukan Validator Semantik Eksternal Manusia Tier 3):**
   - Fungsi penilaian tingkat respons `evaluate_response_py()` pada `audit_raw_1200.py` **merupakan porting lintas bahasa yang disengaja (*exact cross-language port*) dari aturan deterministik dan ekspresi reguler pada `benchmark/evaluator.ts`**.
   - Oleh karena itu, kecocokan `1.191/1.191` (`0` selisih) antara `audit_raw_1200.py` dan `eval_2026-11-13T09-05-53Z_main.json` **membuktikan paritas dan determinisme eksekusi lintas bahasa (Python vs TypeScript) atas spesifikasi aturan evaluator yang dibekukan**, serta memastikan tidak ada korupsi agregasi data antara log mentah dan tabel skripsi.
   - Sebaliknya, paritas `1.191/1.191` tersebut **bukan** merupakan validasi semantik eksternal manusia (*Tier 3*) yang independen dari definisi aturan `benchmark/evaluator.ts`. Keterbatasan bawaan pada aturan ekspresi reguler `evaluator.ts` (seperti *vacuous CSR pass* ketika `recommendedUnits = []` pada konfigurasi *Zero-Shot*, ketiadaan *flag* Unicode `/u` pada batas kata `\b` Sirilik bahasa Kazakh, maupun sensitivitas klausa daftar tunggu bersyarat pada `AV-01-RU`) tetap direproduksi secara identik oleh `evaluate_response_py()` dan oleh sebab itu dianalisis secara terpisah melalui matriks abstensi (`Section C`), analisis sensitivitas (`Section D-F`), serta lembar kerja validasi penutur asli (*Tier 3*).
