# Development Server Maintenance

This document describes routine cleanup and maintenance tasks developers can run on a WSL/dev server to keep disk, memory, and other resources under control. Keep this file small and pragmatic — the steps are safe to run on a development machine and can be automated in CI or scheduled via cron/systemd timers for long-running developer hosts.

Summary (quick):
- Free large build artifacts (Rust/Cargo targets, Python build caches, node build artifacts)
- Prune unused Docker images/containers/volumes
- Rotate and trim logs and temporary files
- Periodically vacuum databases used for development

Important: these commands reclaim space by deleting build artifacts or unused data. Rebuilds may be required after cleaning.

1) Inspect disk usage

  - Show filesystem summary:

    df -h --output=source,fstype,size,used,avail,pcent,target -x tmpfs -x devtmpfs

  - Check home and workspace size:

    du -sh ~
    du -sh ~/trading-ai | sort -h

2) Rust/Cargo artifacts (pattern_engine, pyo3 wrapper, other Rust crates)

  Why: Rust `target/` directories and incremental build caches can be hundreds of MB — removing them reclaims space safely (you'll rebuild when needed).

  Safe options:

  - Per-project `cargo clean` (recommended):

      cd /path/to/project
      cargo clean

  - Manual remove (immediate):

      rm -rf /path/to/project/target
      rm -rf /path/to/project/*/target

  - Safer: move to a temporary backup before deletion:

      mv /path/to/project/target /tmp/project_target_backup_$(date +%Y%m%d%H%M)

3) Python environment cleanup

  - Remove __pycache__ folders if you want to reclaim a bit of space (low impact):

      find . -name __pycache__ -type d -exec rm -rf {} +

  - Remove virtualenvs you no longer use (be careful):

      rm -rf ~/.venv

4) Node / npm artifacts

  - Remove local build artifacts and node_modules if you need to reclaim space (reinstall with npm/yarn later):

      rm -rf frontend/node_modules
      rm -rf frontend/dist

  - To remove global npm cache (safe but will re-download packages later):

      npm cache clean --force

5) Docker cleanup (if Docker is used on the host)

  - Show Docker disk usage:

      docker system df

  - Prune unused objects (images, containers, networks, caches):

      docker system prune -a

  - Remove unused volumes (careful with name/value):

      docker volume prune

6) Logs, temp files and Windows mounts (WSL specific notes)

  - Trim large logs under /var/log (rotate or delete old logs):

      sudo journalctl --vacuum-size=200M
      sudo journalctl --vacuum-time=7d

  - Clean apt cache (for Debian/Ubuntu based images):

      sudo apt-get clean
      sudo apt-get autoremove -y

  - On WSL, Windows drives are mounted under /mnt — large files there count against Windows disk. Inspect /mnt/c /mnt/d usage if present.

7) Developer database maintenance (local SQLite/Postgres used for dev)

  - SQLite: vacuum the DB file to reclaim space:

      sqlite3 dev.db "VACUUM;"

  - Postgres (dev docker/postgres): run VACUUM (or pg_repack) in the DB to reclaim space.

8) Scheduling and automation (suggested)

  - Example: weekly cron for cargo clean and docker prune (developer machine):

      # this is a sample crontab entry (edit with crontab -e)
      0 3 * * 0 /usr/bin/bash -lc 'cd ~/trading-ai/pattern_engine && cargo clean && cd ~/trading-ai && docker system prune -af'

  - Or create systemd timers for more controlled maintenance.

9) Quick heuristics (what to remove first)

  - 1) Project `target/` directories (Rust builds)
  - 2) `pyo3_wrapper/target` and other local extension build directories
  - 3) `frontend/node_modules` and `frontend/dist` (if low on space and you can re-run npm install)
  - 4) Docker images/unused volumes
  - 5) Old virtualenvs and caches

10) Safety checklist before cleaning

  - Confirm you have backups for important data (DBs, models).
  - If unsure, move directories to /tmp (or compress) before permanent deletion.
  - Rebuild instructions: refer to `docs/development/BUILD_INSTRUCTIONS.md` and per-subproject READMEs.

11) Troubleshooting

  - If a service fails after cleaning, rebuild per its README (example: `pattern_engine` requires `cargo build` or `maturin build` for pyo3 bindings).
  - For Docker-based dev environments, re-run compose scripts in `hostexecs/` (see `hostexecs/dev_up.sh`) to restore runtime images.

12) Example one-liners

  - Free Rust targets in `pattern_engine` and `pyo3_wrapper`:

      rm -rf ~/trading-ai/pattern_engine/target ~/trading-ai/pattern_engine/pyo3_wrapper/target

  - Run cargo clean for all workspace crates (quick):

      find . -name Cargo.toml -execdir cargo clean \;

  - Prune Docker and remove dangling images:

      docker system prune -af && docker volume prune -f

13) Maintainer notes

  - Keep this file concise and link from main READMEs so developers can find it easily.
  - Add service-specific maintenance notes in each service README if they require extra steps (for example, TensorRT caches, ONNX runtime bundles, or model weights stored outside the repo).

Last updated: 2025-10-02T15:51:10Z
