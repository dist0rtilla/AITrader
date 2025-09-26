import numpy as np
from pattern_engine.trt_engine import TRTEngine, has_tensorrt
print("has_tensorrt=", has_tensorrt())
eng = TRTEngine("models/toy_mlp.engine")
print('engine loaded, bindings:', eng.bindings)
inp_idx = eng.input_binding_idxs[0]
shape = eng.bindings[inp_idx]['shape'] or (1,)
print('input shape', shape)
dummy = np.ones(tuple(max(1,int(s)) for s in shape), dtype=eng.bindings[inp_idx]['dtype'])
try:
    out = eng.infer(dummy)
    print('inference output shape', out.shape)
    print('out sample', out.ravel()[:10])
except Exception as e:
    print('infer failed:', e)
