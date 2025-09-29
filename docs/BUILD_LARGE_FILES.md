This document describes how to generate, build or obtain the large binary/model artifacts that are intentionally excluded from version control.

Purpose
-------
Some repository artifacts (ONNX models, TensorRT engines, prebuilt Rust artifacts, large Docker image tarballs) are large and are excluded via `.gitignore`. This document explains how to produce them locally or obtain them from a central artifact storage so other contributors can reproduce builds.

Common large artifacts and how to produce them
--------------------------------------------
1) ONNX models
- Location(s): `models/`, `pattern_engine/onnx/`
- How to build:
  - Many models are produced from training code or converted from PyTorch. See the `models/` subproject README for model-specific scripts.
  - Example (pseudo):

    ```bash
    # from the repository root
    python models/convert_to_onnx.py --checkpoint path/to/checkpoint.pt --output pattern_engine/onnx/my_model.onnx
    ```

- Alternative: download prebuilt ONNX files from your artifact server (S3/GCS/internal HTTP) and place them under `pattern_engine/onnx/`.

2) TensorRT engines (.trt, .engine, .plan)
- Location(s): `pattern_engine/` or `tensorrt_runner/`
- How to build:
  - Requires NVIDIA TensorRT and compatible CUDA toolkit installed on the host.
  - Example:

    ```bash
    # convert ONNX to TensorRT (example)
    trtexec --onnx=pattern_engine/onnx/my_model.onnx --saveEngine=pattern_engine/my_model.engine --fp16
    ```

  - Or use the repo helper script when present (e.g., `scripts/build_trt_engine.py` or `scripts/build_trt_engine.sh`).

3) Rust native builds and artifacts
- Location(s): `pattern_engine/target/` and `pattern_engine/native/target/`
- How to build:

    ```bash
    # in pattern_engine/
    cargo build --release
    # or for Python bindings via maturin/pyo3
    maturin build --release
    ```

4) Docker images and large image tarballs
- Docker images are not stored in git. If you need an image tarball:

    ```bash
    # build image then save to tarball
    docker build -t my-image:local -f Dockerfile .
    docker save my-image:local -o artifacts/my-image-local.tar
    ```

- If you see references to vendor images (e.g. NVIDIA/TensorRT), pull them directly from the vendor registry:

    ```bash
    docker pull nvcr.io/nvidia/tensorrt:23.11-py3
    ```

5) Other large artifacts (checkpoints, preprocessed datasets)
- Location(s): `data/`, `models/`, or project-specific folders.
- How to obtain:
  - Prefer to download from secure artifact storage or shared network location.
  - If the repo contains scripts to generate the data, follow those scripts; they are typically expensive (time/compute) and can be run on a machine with GPU resources.

Notes and best practices
------------------------
- Keep the build instructions in the subproject README when they are specific to a model or component (e.g., `pattern_engine/README.md`). This top-level document is intended as a quick reference.
- Use an artifact registry (S3, GCS, Artifactory) to share large files rather than committing them to git.
- When possible, provide checksums for downloaded files to validate integrity.

If you'd like, I can:
- Add specific download URLs (S3/GCS) and checksums to this document if you provide them.
- Add helper scripts (e.g., `scripts/fetch_artifacts.sh`) that download required large files into the right paths.
