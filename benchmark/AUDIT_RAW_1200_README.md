# Dokumentasi Reprodusibilitas: `audit_raw_1200.py` (`benchmark/` & `dokumen/`)

Dokumen ini menjelaskan spesifikasi teknis, asal-usul berkas (*provenance*), cara eksekusi lintas lingkungan (repositori GitHub publik vs paket lokal skripsi), kebijakan *line-ending* (`CRLF` vs `LF`) beserta tabel ganda *checksum* SHA-256, audit sensitivitas finansial nominal eksak (`Section G`), klarifikasi metadata korpus uji, serta batasan metodologis atas skrip `audit_raw_1200.py` dan keluaran `raw_1200_audit_summary.json`.

---

## 1. Perbedaan Tegas Jalur Repositori GitHub vs Paket Lokal Skripsi & Pemisahan Commit

Skrip `audit_raw_1200.py` dan panduan `AUDIT_RAW_1200_README.md` dipelihara secara identik (`sync=True` *byte-for-byte*) pada dua lokasi dengan konvensi pemanggilan berikut:

| Konteks Eksekusi | Lokasi Berkas Skrip | Perintah Eksekusi CLI Resmi | Lokasi Keluaran Default |
| :--- | :--- | :--- | :--- |
| **1. Klon Repositori Publik GitHub (`atamura-chatbot`, cabang `revisi8-main-benchmark`)** | `benchmark/audit_raw_1200.py` | `python benchmark/audit_raw_1200.py` (dijalankan dari akar klon repositori) | `benchmark/results/raw_1200_audit_summary.json` (atau jalur kustom via `--out <path>`) |
| **2. Paket Dokumentasi Skripsi Lokal (`dokumen/`)** | `dokumen/audit_raw_1200.py` | `python dokumen/audit_raw_1200.py` (atau `--repo-dir <path_to_atamura_chatbot>`) | `dokumen/raw_1200_audit_summary.json` |

### Pemisahan Tegas antara Commit Beku Eksekusi (`e062d25` / `c533d0d`) dan Commit Dokumentasi Aditif:
1. **Arsip Eksperimen dan Kode Inti Beku (`e062d25` / `c533d0d`):** Seluruh kode aplikasi produksi (`src/`), aturan evaluator (`benchmark/evaluator.ts`), korpus uji (`benchmark/benchmark_cases.jsonl`), parameter finansial (`benchmark/financial_ground_truth.json`), serta arsip log eksekusi utama `1.200` panggilan (`benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl` dan `benchmark/results/eval_2026-11-13T09-05-53Z_main.json`) tetap berada dalam kondisi beku (*frozen*) pada *commit* `e062d25` (*commit* induk `master` `c533d0d`, *commit* inti domain `ed722ef`).
2. **Commit Publikasi Aditif pada `revisi8-main-benchmark`:** *Commit* di atas `e062d25` (dimulai dari `5b439c8` beserta pemutakhiran dokumentasi dan `Section G` pada tanggal 14 November 2026) bersifat murni aditif (*additive audit & documentation commits*): hanya menambahkan/memperbarui `benchmark/audit_raw_1200.py`, `benchmark/AUDIT_RAW_1200_README.md`, `README.md`, dan `benchmark/README.md` tanpa mengubah satu baris pun kode aplikasi, aturan evaluator primer, maupun berkas arsip `.jsonl`/`.json` hasil eksperimen.

---

## 2. Spesifikasi Lingkungan & Dependensi Eksekusi

Skrip `audit_raw_1200.py` dirancang menggunakan **100% Python Standard Library** tanpa memerlukan instalasi pustaka pihak ketiga melalui `pip` (`numpy`, `scipy`, maupun `pandas` tidak diperlukan).

- **Versi Python Terverifikasi:** `Python 3.12.13` (kompatibel dengan Python `>= 3.10` pada Windows, Linux, dan macOS).
- **Resolusi Jalur Portabel Otomatis:**
  - Apabila dijalankan dari dalam klon repositori `atamura-chatbot` (`python benchmark/audit_raw_1200.py`), skrip mendeteksi keberadaan direktori `benchmark/raw/` secara otomatis (`(_SCRIPT_DIR / "raw").exists() == True`) dan menetapkan akar repositori ke direktori induk (`_SCRIPT_DIR.parent`).
  - Apabila dijalankan dari direktori paket skripsi (`python dokumen/audit_raw_1200.py`), skrip membaca arsip repositori secara *read-only* melalui `--repo-dir`, variabel lingkungan `ATAMURA_REPO_DIR`, atau jalur default lokal.
- **Modul Pustaka Standar yang Digunakan:** `argparse`, `hashlib`, `json`, `math`, `os`, `re`, `collections` (`Counter`, `defaultdict`), `pathlib` (`Path`), dan `typing`.

---

## 3. Kebijakan Line-Ending (`CRLF` vs `LF`) & Tabel Ganda Checksum SHA-256 (Windows vs GitHub/Linux)

### 3.1. Mengapa Ukuran Byte & SHA-256 Berbeda antara Disk Windows (`CRLF`) dan Git Blob GitHub/Linux (`LF`)?
Pada lingkungan pengembangan Windows dengan konfigurasi Git standar (`core.autocrlf=true`):
1. Berkas yang ditulis oleh **Python di Windows** (`audit_raw_1200.py`, `raw_1200_audit_summary.json`, dan `revisi8_main_1200_report.json`) menggunakan pemisah baris standar Windows **`CRLF` (`\r\n`, 2 byte per baris)** di disk lokal. Ketika berkas tersebut di-*commit* ke Git, Git secara otomatis menormalisasi objek *blob* di dalam repositori GitHub menjadi **`LF` (`\n`, 1 byte per baris)**. Akibatnya, ukuran *blob* GitHub/Linux lebih kecil tepat sebesar **jumlah baris berkas** tanpa perubahan satu karakter pun pada isi teks atau angka JSON:
   - Pada `revisi8_main_1200_report.json` (`11.428` baris): ukuran di disk Windows (`CRLF`) adalah **`322.740` byte** (`SHA-256: E98C153C...`), sedangkan ukuran *blob* Git/Linux (`LF`, diverifikasi melalui `git cat-file -p HEAD:benchmark/results/revisi8_main_1200_report.json`) adalah **`311.312` byte** (`SHA-256: FA1274EC...`), berselisih tepat **`11.428` byte** (`1` byte `\r` x `11.428` baris).
   - Pada `audit_raw_1200.py`: pada *commit* publikasi awal `5b439c8` (`1.776` baris), ukuran disk Windows (`CRLF`) adalah **`99.283` byte** (`SHA-256: D3A93222...`) dan ukuran *blob* Git/Linux (`LF`) adalah **`97.507` byte** (`SHA-256: DFA56F73...`), berselisih tepat **`1.776` byte**. Pada revisi saat ini yang memuat tambahan `Section G` (`2.487` baris), ukuran disk Windows (`CRLF`) adalah **`138.002` byte** (`SHA-256: 990D81F7...`) dan ukuran *blob* Git/Linux (`LF`) adalah **`135.515` byte** (`SHA-256: 65379DBE...`), berselisih tepat **`2.487` byte**.
2. Sebaliknya, kelima berkas arsip yang ditulis langsung oleh **Node.js (`fs.writeFileSync` / `fs.appendFileSync`)** saat eksekusi eksperimen (`run_2026-11-13T09-05-53Z_c533d0d_main.jsonl`, `run_2026-11-13T09-05-53Z_c533d0d_main.meta.json`, `eval_2026-11-13T09-05-53Z_main.json`, `benchmark_cases.jsonl`, dan `financial_ground_truth.json`) ditulis menggunakan pemisah baris **`LF` (`\n`)** baik di *working tree* asli maupun di *blob* GitHub (`HEAD`). Apabila pengguna di Windows melakukan `git clone` baru dengan `core.autocrlf=true`, Git akan mengonversi kelima berkas tersebut ke `CRLF` di disk lokal pengguna (atau tetap `LF` bila diklon dengan `git clone -c core.autocrlf=false`).
3. **Kebijakan Tanpa `.gitattributes` Retrospektif:** Untuk menjaga kemurnian arsip historis `e062d25`, repositori sengaja **tidak** menambahkan aturan renormalisasi `.gitattributes` yang dapat memicu modifikasi status *working tree* pada berkas arsip `.jsonl`/`.json` beku. Sebagai gantinya, kedua versi *checksum* (`LF` dan `CRLF`) didokumentasikan secara eksplisit pada Tabel 3.2 dan Tabel 3.3 di bawah ini. Pembacaan JSON/JSONL di Python (`splitlines()` / `json.loads()`) bersifat agnostik terhadap `CRLF` vs `LF` sehingga menghasilkan struktur data dan skor evaluasi yang `100%` identik.

### 3.2. Tabel Ganda Ukuran & SHA-256: Skrip Audit dan Ringkasan Keluaran (`benchmark/` <-> `dokumen/`, `sync=True`)

| Berkas & Versi | Ukuran Windows (`CRLF`) | SHA-256 Windows (`CRLF`) | Ukuran GitHub/Linux (`LF`) | SHA-256 GitHub/Linux (`LF`) | Selisih Byte (`CRLF - LF`) |
| :--- | ---: | :--- | ---: | :--- | ---: |
| `audit_raw_1200.py` (Revisi Saat Ini: `Section A..G`, `2.487` baris) | `138.002` B | `990D81F7F475930245ACBAFDF4F66A7264DC51B606B10084C9E8DC809FDB8FF2` | `135.515` B | `65379DBE9CD8AD9BD7EA27EE1DB5F38B01369B27348D8AB7C7F365CA2330FC4A` | `+2.487` B (`2.487` baris) |
| `raw_1200_audit_summary.json` (Revisi Saat Ini: `Section A..G`, `17.735` baris) | `759.033` B | `9F3663E50EE71A333AADA63002C3FF9E48CAF12AB537B8B137A91DEFEE6365C2` | `741.298` B | `893779A3444A12239D192434AE336D42BD5322BDE3FCA9E6F74A4980E5C733C0` | `+17.735` B (`17.735` baris) |
| `audit_raw_1200.py` (Arsip Commit `5b439c8`: `Section A..F`, `1.776` baris) | `99.283` B | `D3A932220DDC97D47CF31A413A732CDDF32B41434A1B2EF96583CE02734E2C71` | `97.507` B | `DFA56F73D35668763B6FADAE695FA677964B1315E754AEB24D5415FEBF803A24` | `+1.776` B (`1.776` baris) |
| `raw_1200_audit_summary.json` (Arsip Commit `5b439c8`: `Section A..F`, `15.431` baris) | `671.637` B | `B7E5A23DF506B0507063EFC1D04B72965C529A1DF00C4464C0C2C268AA4401A2` | `656.206` B | `8A70AE84621D6C514B1EC8DF8EFCDDC889ADFF383C44BB2641510C0AD825EB32` | `+15.431` B (`15.431` baris) |
| `AUDIT_RAW_1200_README.md` (Arsip Commit `5b439c8`, `104` baris)* | `10.769` B | `17E4943034C72821C50BB58C4C33C7E099EDB71A074F984BE8D2337A48FB42B2` | `10.665` B | `B66F02A8313C2D53BC02C3C29ACF382ED13C8EDBBECA60A0036651FE674E7885` | `+104` B (`104` baris) |

*\*Catatan: Karena berkas README tidak dapat memuat hash kriptografis SHA-256 dirinya sendiri secara melingkar (self-referential hash), checksum untuk revisi terbaru `AUDIT_RAW_1200_README.md` dapat diverifikasi langsung melalui `git ls-tree -l HEAD benchmark/AUDIT_RAW_1200_README.md` dan `sha256sum benchmark/AUDIT_RAW_1200_README.md`.*

### 3.3. Tabel Ganda Ukuran & SHA-256: Enam Berkas Input Read-Only (`atamura-chatbot` @ `e062d25`)

| Kunci Audit (`section_a`) | Berkas Input (`benchmark/...`) | Ukuran Git Blob / LF (`\n`) | SHA-256 Git Blob / LF (`\n`) | Ukuran Windows (`CRLF`, `\r\n`) | SHA-256 Windows (`CRLF`, `\r\n`) | Selisih Byte (`CRLF - LF`) |Format di Working Tree Asli |
| :--- | :--- | ---: | :--- | ---: | :--- | ---: | :---: |
| `raw_jsonl` | `raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl` | `5.747.779` B | `80D8C0AC112D3DC63902EADE5B335EC5373AA4078CF4E17AB3D33D1B202BE867` | `5.749.177` B | `0E23840B56F0B5C2B5AE698CB8FF423B275EC59847D7143F54A118EA907E1093` | `+1.398` B | `LF` (Node.js) |
| `raw_meta_json` | `raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` | `1.907` B | `66B2C91E6336EA7F90C6557E2AFE6E864DB59309CBA958EDED4CCD346D9D30FA` | `1.955` B | `E514F7FA7529CDAEB7F51107DBAECE0A099FD3D0A17CE5EE3AA26FF4DB4BFBCA` | `+48` B | `LF` (Node.js) |
| `eval_main_json` | `results/eval_2026-11-13T09-05-53Z_main.json` | `6.224.682` B | `DA2AFED71B15B599522630D58F29C439B140FB335E11869F0A5D9C2807ECE066` | `6.321.973` B | `09C5C295802C0A8998F8A07393C82C6F9B2A9EA73E6EFF9D73EDB2E34C09E856` | `+97.291` B | `LF` (Node.js) |
| `revisi8_report_json` | `results/revisi8_main_1200_report.json` | `311.312` B | `FA1274EC3924F0932A9AB773B4F65B1D7BE13751D85C7A0B90417B4D20CA2523` | `322.740` B | `E98C153C0BE8BBC1E58CF00CB230879E2686DD1E51D66F7992BF69CDD54B8C16` | `+11.428` B | `CRLF` (Python) |
| `benchmark_cases_jsonl` | `benchmark_cases.jsonl` | `121.833` B | `88B619396E28E6AED57F56187829FCCE0A783CC0707960FDA34FBBB9B17D60BC` | `121.953` B | `A0117A1863B7395F0CC8ACE6F82BCAA44B14392FDCE96A90156A4078BD003BD3` | `+120` B | `LF` (Node.js) |
| `financial_ground_truth_json` | `financial_ground_truth.json` | `2.751` B | `DF7670EBBDF10375D8A001576E4F7005FBD6BAE19D63FAD53155BC1625494167` | `2.859` B | `7EB61585C47EF5DB12629FA67EC8CFE67FDB32B1CE75BB6E9134A64992A527E7` | `+108` B | `LF` (Node.js) |

> **Tip Verifikasi Lintas Platform:** Untuk mendapatkan *working tree* yang seluruh berkasnya menggunakan `LF` persis seperti objek *blob* GitHub di Windows maupun Linux, jalankan `git clone -c core.autocrlf=false https://github.com/nnavyy/atamura-chatbot.git -b revisi8-main-benchmark`.

---

## 4. Perintah Eksekusi CLI Terverifikasi & Ringkasan Hasil (`Section A..G`)

### Opsi A: Eksekusi Publik dari Akar Klon Repositori `atamura-chatbot`
```bash
python benchmark/audit_raw_1200.py
# atau dengan jalur keluaran khusus:
python benchmark/audit_raw_1200.py --out /tmp/raw_1200_audit_summary.json
```

### Opsi B: Eksekusi dari Direktori Paket Skripsi Lokal (`dokumen/`)
```powershell
python dokumen/audit_raw_1200.py
# atau bila repositori berada di lokasi lain:
python dokumen/audit_raw_1200.py --repo-dir "B:\Projects\hh.jobs\Atamura Group\atamura-chatbot"
```

### Ringkasan Keluaran Terverifikasi (`Section A` s.d. `Section G`):
1. **Deduplikasi Arsip JSONL Mentah & Paritas `1.191/1.191` (`Section A`):**
   - Total baris pada `run_2026-11-13T09-05-53Z_c533d0d_main.jsonl`: **`1.398` baris** (`1.314` `ok`, `84` `infra_error` yang terdiri atas `63` `http_400`, `19` `http_503`, dan `2` `router_rate_limit_503`).
   - Rekaman unik terjadwal setelah deduplikasi deterministik `(caseId, requestedModel, config)` (mengambil percobaan terakhir per kunci): **`1.200` panggilan** (`1.191` `ok` valid [`99,25%`] dan `9` gagal permanen `http_400` `json_validate_failed` akibat `max_tokens=1024`). Sebanyak `198` baris percobaan awal yang tergantikan (*superseded*) terdiri atas `123` baris `ok` dari percobaan pra-*resume* dan `75` baris `infra_error`.
   - Pada seluruh `1.191` rekaman valid: `requestedModel == actualModelUsed` (`100%`), `usedFallback == False` (`100%`), `python_port_vs_ts_evaluator_1191_mismatches = 0`, dan `eval_json_vs_report_json_parity_mismatches = 0`.
2. **Metrik Paralel Bersyarat vs End-to-End, Matriks Abstensi, Sensitivitas Pemotongan (`finish_reason == "length"`), Audit Sanitizer, & Dossier `AV-01-RU` (`Section B..F`):**
   - Melaporkan metrik bersyarat (*conditional given valid*) dan metrik *end-to-end* per panggilan terjadwal (`n=120`, `54` penolakan, `24` finansial) beserta rentang kepercayaan Clopper-Pearson 95% dan uji McNemar eksak tingkat kueri serta klaster (`40` skenario semantik).
   - Membedah `60/240` kasus `Proposed Hybrid` yang mengalami pasca-sanitasi (`34/120` pada `openai/gpt-oss-120b`, `26/120` pada `qwen/qwen3.8-27b`) serta forensik batas kata ekspresi reguler kasus tunggal `AV-01-RU`.
3. **Audit Sensitivitas Finansial Nominal Eksak Offline (`Section G` - `section_g_secondary_exact_financial_audit`):**
   - Mengevaluasi ulang seluruh `24` kueri finansial (`F-01`..`F-08` x `EN/RU/KK`, `240` panggilan terjadwal = `234` valid + `6` HTTP 400) di bawah **toleransi nominal eksak `0%` (`0 KZT` selisih bulat)** dan **toleransi pembulatan `ROUND_HALF_UP` (`<= 1 KZT`)** secara *read-only* tanpa mengubah metrik primer beku (`±2,0%`):

| Model & Konfigurasi | Valid / 24 | Protokol Beku `±2,0%` (`Fin Acc`) | Eksak `0 KZT` (`0%` Tol. `Fin Acc`) | Teks Eksak `0 KZT` (Inti / Semua Field) | JSON Eksak `0 KZT` (Inti / Semua Field) | `ROUND_HALF_UP` (`<= 1 KZT`) | Selisih Kasus (`±2,0%` vs `0 KZT`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`openai/gpt-oss-120b`** | | | | | | | |
| - `zero_shot` | `24/24` | `2/24 (8,33%)` | `1/24 (4,17%)` | `1/24` / `1/24` | `N/A (0 JSON)` | `1/24 (4,17%)` | `+1` (`F-03-RU`) |
| - `full_context` | `20/24` | `19/20 (95,00%)` | `12/20 (60,00%)` | `13/20` / `9/20` | `7/15` / `7/15` | `14/20 (70,00%)` | `+7` (`2` selisih `1 KZT` + `5` anuitas KPR) |
| - `plus_prefilter` | `22/24` | `22/22 (100,00%)` | `14/22 (63,64%)` | `14/22` / `9/22` | `8/16` / `8/16` | `15/22 (68,18%)` | `+8` (`1` selisih `1 KZT` + `7` anuitas KPR) |
| - `plus_calculator` | `24/24` | `22/24 (91,67%)` | `22/24 (91,67%)` | `24/24` / `13/24` | `17/19` / `17/19` | `22/24 (91,67%)` | **`0` (Identik)** |
| - **`proposed_hybrid`** | **`24/24`** | **`24/24 (100,00%)`** | **`24/24 (100,00%)`** | **`24/24` / `24/24`** | **`24/24` / `24/24`** | **`24/24 (100,00%)`** | **`0` (Identik)** |
| **`qwen/qwen3.8-27b`** | | | | | | | |
| - `zero_shot` | `24/24` | `2/24 (8,33%)` | `0/24 (0,00%)` | `0/24` / `0/24` | `N/A (0 JSON)` | `0/24 (0,00%)` | `+2` (`F-05-RU`, `F-05-KK`) |
| - `full_context` | `24/24` | `9/24 (37,50%)` | `9/24 (37,50%)` | `15/24` / `13/24` | `9/24` / `9/24` | `9/24 (37,50%)` | **`0`** (`+1` pada sub-metrik teks `F-08-RU`) |
| - `plus_prefilter` | `24/24` | `8/24 (33,33%)` | `8/24 (33,33%)` | `13/24` / `10/24` | `7/22` / `7/22` | `8/24 (33,33%)` | **`0` (Identik)** |
| - `plus_calculator` | `24/24` | `18/24 (75,00%)` | `18/24 (75,00%)` | `24/24` / `23/24` | `18/24` / `18/24` | `18/24 (75,00%)` | **`0` (Identik)** |
| - **`proposed_hybrid`** | **`24/24`** | **`24/24 (100,00%)`** | **`24/24 (100,00%)`** | **`24/24` / `24/24`** | **`24/24` / `24/24`** | **`24/24 (100,00%)`** | **`0` (Identik)** |

   - **Temuan Kunci `Section G`:**
     1. Pada `Proposed Hybrid` (baik `openai/gpt-oss-120b` maupun `qwen/qwen3.8-27b`), seluruh **`24/24 (100,00%)`** respons cocok secara bulat **`0 KZT` (`0%` deviasi)** baik pada objek JSON `calculation` (`unitCode`, `method`, `price`/`basePriceKzt`, `dp`/`downPaymentKzt`, `dpPercent`, `monthly`/`monthlyKzt`, `total`/`contractTotalKzt`/`totalPaidKzt`/`totalKzt`, `tenor`/`termMonths`, `interestRate`/`interestPctAnnual`, `savings`/`discountKzt`) maupun pada teks narasi (bahkan sebelum *Stage 6c*, teks mentah LLM pada `plus_calculator` dan `proposed_hybrid` sudah mencapai `24/24 = 100,00%` kecocokan `0 KZT` pada `dp`, `monthly`, dan `tenor`).
     2. Sebaliknya, tanpa modul `calculator.ts`, akurasi finansial eksak `0 KZT` pada `openai/gpt-oss-120b` turun tajam dari `19/20 (95,00%)` menjadi **`12/20 (60,00%)`** pada `full_context` (uji McNemar berpasangan vs `proposed_hybrid`: `b=8, c=0, p=0,0078` bersyarat; `b=12, c=0, p=0,0005` *end-to-end*) dan dari `22/22 (100,00%)` menjadi **`14/22 (63,64%)`** pada `plus_prefilter` (`b=8, c=0, p=0,0078` bersyarat; `b=10, c=0, p=0,0020` *end-to-end*). Dengan demikian, toleransi `±2,0%` pada `evaluator.ts` bersifat **konservatif** karena memberikan kredit penuh kepada lengan *baseline* atas pembulatan antara (*intermediate floating-point rounding*) saat menghitung anuitas KPR 180-240 bulan.
     3. Di seluruh `951` respons valid berlengan katalog (`full_context`, `plus_prefilter`, `plus_calculator`, `proposed_hybrid`), **`0/951 (0,00%)`** menyingkat harga Unit 1A (`13.749.400 KZT`) menjadi `13,75 juta` / `13,7 млн` (`167/167` penyebutan harga Unit 1A menulis angka bulat eksak `13.749.400 KZT`), dan **`0/234`** respons finansial gagal uji `0 KZT` karena penyingkatan juta KZT.

---

## 5. Klarifikasi Metadata Historis (`proposed_not_yet_pilot_verified` & `gitDirty: true`)

1. **Field `"status": "proposed_not_yet_pilot_verified"` pada `benchmark/benchmark_cases.jsonl`:**
   - Setiap baris pada `benchmark/benchmark_cases.jsonl` memuat atribut metadata `"status": "proposed_not_yet_pilot_verified"`. Nilai string tersebut adalah **label pembekuan skema korpus (*dataset design freeze tag*)** yang ditulis saat ke-120 kueri dirancang sebelum eksekusi *pilot* maupun *main run* dimulai.
   - Karena berkas `benchmark_cases.jsonl` (`SHA-256 LF: 88B619396E28E6AED57F56187829FCCE0A783CC0707960FDA34FBBB9B17D60BC`) dikunci sebagai artefak input *read-only* yang dirujuk oleh `run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` (`datasetSha256`), label string di dalamnya sengaja tidak diubah pasca-eksekusi agar *checksum* SHA-256 korpus uji tetap terjaga `100%` utuh. Status eksekusi aktual (`completed`, `1.200/1.200` panggilan terjadwal selesai pada 13 November 2026) tercatat secara resmi di `benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` (`"status": "completed"`).
2. **Flag `"gitDirty": true` pada `run_2026-11-13T09-05-53Z_c533d0d_main.meta.json`:**
   - Saat *runner* `benchmark/run-benchmark.ts` dijalankan di atas *commit* `c533d0d`, *working tree* repositori memiliki modifikasi lokal untuk mendukung *runner* eksperimen utama yang kemudian di-*commit* secara permanen sebagai *commit* `e062d25` pada cabang `revisi8-main-benchmark`, ditambah 4 berkas lokal pra-eksisting (`benchmark/evaluator.ts`, `src/lib/groq.ts`, `test-benchmark-groq.ts`, dan `benchmark/results/eval_2026-11-13T02-03-10Z_pilot.json`).
   - Integritas tepat dari versi kode yang dieksekusi selama *main run* dijamin bukan oleh status bersih/kotornya pohon kerja Git semata, melainkan oleh **enam *checksum* SHA-256 tingkat berkas** yang direkam langsung di dalam `run_2026-11-13T09-05-53Z_c533d0d_main.meta.json` (`provenanceHashes`: `rawJsonlSha256`, `catalogSnapshotFileSha256`, `catalogSerializedSha256`, `evaluatorSha256`, `chatEngineSha256`, dan `financialGroundTruthSha256`).

---

## 6. Penilaian Jujur Independensi Aturan Evaluasi (Methodological Transparency)

1. **Apa yang Independen secara Komputasional:**
   - Skrip `audit_raw_1200.py` membaca ulang berkas log JSONL mentah (`1.398` baris -> `1.200` panggilan terjadwal) secara langsung dari disk menggunakan runtime Python standar, memverifikasi ulang *checksum* SHA-256 berkas, melakukan penguraian ulang (*re-parsing*) muatan JSON mentah (`parse_groq_json_response_py`), mengevaluasi sensitivitas finansial nominal eksak `0 KZT` (`Section G`), serta menghitung ulang interval kepercayaan binomial eksak Clopper-Pearson 95% dan uji signifikansi McNemar tanpa bergantung pada kode perhitungan agregat di TypeScript.
2. **Apa yang Merupakan Porting Aturan Lintas Bahasa (Bukan Validator Semantik Eksternal Manusia Tier 3):**
   - Fungsi penilaian primer `evaluate_response_py()` pada `audit_raw_1200.py` **merupakan porting lintas bahasa yang disengaja (*exact cross-language port*) dari aturan deterministik dan ekspresi reguler pada `benchmark/evaluator.ts`**.
   - Oleh karena itu, kecocokan `1.191/1.191` (`0` selisih) antara `audit_raw_1200.py` dan `eval_2026-11-13T09-05-53Z_main.json` **membuktikan paritas dan determinisme eksekusi lintas bahasa (Python vs TypeScript) atas spesifikasi aturan evaluator yang dibekukan**, namun **bukan** merupakan validasi semantik eksternal manusia (*Tier 3*). Keterbatasan bawaan pada aturan ekspresi reguler `evaluator.ts` (seperti *vacuous CSR pass* ketika `recommendedUnits = []` pada konfigurasi *Zero-Shot*, ketiadaan *flag* Unicode `/u` pada batas kata `\b` Sirilik bahasa Kazakh, maupun sensitivitas klausa daftar tunggu bersyarat pada `AV-01-RU`) tetap direproduksi secara identik oleh `evaluate_response_py()` dan oleh sebab itu dianalisis secara terpisah melalui matriks abstensi (`Section C`), analisis sensitivitas (`Section D..G`), serta paket instrumen validasi manusia independen (*Tier 3* pada `dokumen/tier3_human_audit/`).
