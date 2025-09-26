#!/usr/bin/env python3
"""Small helper to build a TensorRT engine from an ONNX model.

This script is intentionally cautious: it detects whether TensorRT libs are available and
otherwise prints instructions. It supports serialization of an engine file.

Usage:
  python3 scripts/build_trt_engine.py --onnx models/toy_cnn.onnx --engine models/toy_cnn.plan --max_workspace=1G --fp16

Note: Requires TensorRT python bindings (tensorrt) available in the environment.
"""
import argparse
import os
import sys


def has_tensorrt():
    try:
        import tensorrt as trt  # type: ignore
        return True
    except Exception:
        return False


def build_engine(onnx_path: str, engine_path: str, max_workspace_size: int = 1<<30, fp16: bool = False):
    import tensorrt as trt  # type: ignore
    TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
    builder = trt.Builder(TRT_LOGGER)
    network_flags = (1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
    network = builder.create_network(network_flags)
    parser = trt.OnnxParser(network, TRT_LOGGER)

    with open(onnx_path, 'rb') as f:
        if not parser.parse(f.read()):
            print('Failed to parse ONNX model:')
            for i in range(parser.num_errors):
                print(parser.get_error(i))
            raise SystemExit(1)

    config = builder.create_builder_config()
    config.max_workspace_size = max_workspace_size
    if fp16:
        if builder.platform_has_fast_fp16:
            config.set_flag(trt.BuilderFlag.FP16)
        else:
            print('FP16 not supported on this platform, continuing with FP32')

    engine = builder.build_engine(network, config)
    if engine is None:
        raise SystemExit('Failed to build TensorRT engine')

    with open(engine_path, 'wb') as f:
        f.write(engine.serialize())
    print('Wrote engine to', engine_path)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--onnx', required=True)
    p.add_argument('--engine', required=True)
    p.add_argument('--max_workspace', default='1G')
    p.add_argument('--fp16', action='store_true')
    args = p.parse_args()

    if not has_tensorrt():
        print('TensorRT python bindings not found in this environment.')
        print('To use this script, run inside an environment/container with TensorRT installed.')
        sys.exit(2)

    # parse max_workspace (simple parser)
    s = args.max_workspace.upper()
    if s.endswith('G'):
        ws = int(float(s[:-1]) * (1<<30))
    elif s.endswith('M'):
        ws = int(float(s[:-1]) * (1<<20))
    else:
        ws = int(s)

    # Prefer centralized builder if pattern_engine exposes it
    try:
        from pattern_engine.trt_engine import build_engine as pattern_build  # type: ignore
        pattern_build(args.onnx, args.engine, max_workspace_size=ws, fp16=args.fp16)
    except Exception:
        # Fall back to local builder implementation (requires tensorrt)
        build_engine(args.onnx, args.engine, max_workspace_size=ws, fp16=args.fp16)
