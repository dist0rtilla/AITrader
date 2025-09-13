# AITrader

Lightweight experimental trading/AI environment — snapshot: 2025-09-14

---

## Repository Layout

```

/ (repo root)
├─ .gitignore            # files/dirs excluded from git
├─ README.md             # this file
├─ requirements.txt      # pinned Python dependencies
├─ config/
│  └─ .env.example       # template for DB config
├─ db/
│  ├─ init\_db.py         # initialize schema in Postgres
│  └─ schema.sql         # schema definition (idempotent)
├─ test\_db.py            # DB smoke test (inserts dummy trade)
├─ test\_cuda.py          # simple CUDA check
├─ small\_gpu\_test.py     # quick GPU compute test
└─ venv/                 # (local virtualenv, should not be committed)

````

⚠️ If you see `venv/` in the repo, delete it and recreate it locally. The `.gitignore` already excludes it.

---

## Setup (Fresh Environment)

1. **Create and activate venv:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
````

2. **Configure PostgreSQL**
   Create a database `trading` and a user `trader` with password `trader`.
   Or adjust values in `config/.env`.

Example `.env`:

```ini
DB_NAME=trading
DB_USER=trader
DB_PASS=trader
DB_HOST=localhost
DB_PORT=5432
```

Apply schema:

```bash
python db/init_db.py
```

3. **Quick tests:**

```bash
python test_db.py       # insert dummy trade
python test_cuda.py     # check torch + GPU
python small_gpu_test.py
```

---

## Expected Outputs

**DB test:**

```text
DB config -> {'DB_NAME': 'trading', 'DB_USER': 'trader', 'DB_HOST': 'localhost', 'DB_PORT': '5432'}
✅ Dummy trade inserted. trade_id=1
```

**CUDA test:**

```text
Torch version: 2.5.1+cu121
CUDA available: True
Device: NVIDIA GeForce GTX 1050
```

**Small GPU test:**

```text
tensor(89384.4297, device='cuda:0')
```

---

## Notes on CUDA / Torch

* Tested on:

  * Ubuntu 22.04 (WSL2)
  * NVIDIA GTX 1050
  * Driver: 581.29
  * CUDA version: 13.0
* Requirements include CUDA-enabled PyTorch wheels:

```text
torch==2.5.1+cu121
torchvision==0.20.1+cu121
torchaudio==2.5.1+cu121
```

If CUDA setup fails, reinstall with:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

---

## Troubleshooting

* If DB connection fails:

  * Check Postgres is running (`sudo service postgresql status`)
  * Verify user, password, and database exist.
  * From `psql`:

```sql
CREATE USER trader WITH PASSWORD 'trader';
CREATE DATABASE trading OWNER trader;
GRANT ALL PRIVILEGES ON DATABASE trading TO trader;
```

* If CUDA is not detected in WSL2:

  * Ensure NVIDIA drivers are up to date on Windows.
  * Check `nvidia-smi` works inside WSL2.
  * Verify WSL2 GPU compute is enabled.

---

## Next Steps

* Add CI harness (Dockerized Postgres for integration tests).
* Replace schema bootstrapper with Alembic (for migrations).
* Add trading strategy modules and logging.
* Add LICENSE file (MIT/Apache recommended).

---

```

---
