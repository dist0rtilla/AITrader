FROM nvcr.io/nvidia/tensorrt:23.11-py3

LABEL org.opencontainers.image.source="https://github.com/dist0rtilla/AITrader"
LABEL maintainer="team@example.com"

# Small image showing how to run the pattern_engine with TensorRT runtime preinstalled.
WORKDIR /workspace
COPY . /workspace

# Install minimal Python deps for running TRTEngine smoke scripts in the container
RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir pycuda numpy || true

# Default: open a shell. For automated runs, mount the repo and run the build/test commands
CMD ["/bin/bash"]
