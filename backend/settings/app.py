"""
Copilot:
* FastAPI SettingsService (dev stub). Keep it minimal and testable. TODOs: add persistence and auth for production.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Settings Service")


class ConfigItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


# in-memory store for demo
_STORE = {}


@app.get('/health')
async def health():
    return {"ok": True}


@app.get('/configs', response_model=List[ConfigItem])
async def list_configs():
    return [ConfigItem(key=k, value=v['value'], description=v.get('description')) for k, v in _STORE.items()]


@app.post('/configs', response_model=ConfigItem)
async def create_config(cfg: ConfigItem):
    _STORE[cfg.key] = {"value": cfg.value, "description": cfg.description}
    return cfg


@app.get('/configs/{key}', response_model=ConfigItem)
async def get_config(key: str):
    v = _STORE.get(key)
    if not v:
        return ConfigItem(key=key, value='', description=None)
    return ConfigItem(key=key, value=v['value'], description=v.get('description'))
