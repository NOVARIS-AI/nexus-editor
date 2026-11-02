import os, uuid, threading, time
from pathlib import Path
from typing import Any
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch
from diffusers import AutoPipelineForText2Image

TOKEN = os.environ.get("NEXUS_WORKER_TOKEN", "")
MODEL_ID = os.environ.get("NEXUS_IMAGE_MODEL", "stabilityai/sd-turbo")
BASE_URL = os.environ.get("NEXUS_PUBLIC_URL", "").rstrip("/")
OUT = Path(os.environ.get("NEXUS_OUTPUT_DIR", "/tmp/nexus-outputs"))
OUT.mkdir(parents=True, exist_ok=True)
if not TOKEN:
    raise RuntimeError("Set NEXUS_WORKER_TOKEN before starting the worker.")
if not torch.cuda.is_available():
    raise RuntimeError("No GPU detected. Enable a GPU accelerator in the notebook.")

dtype = torch.float16
pipe = AutoPipelineForText2Image.from_pretrained(MODEL_ID, torch_dtype=dtype, variant="fp16")
pipe.to("cuda")
pipe.set_progress_bar_config(disable=True)

app = FastAPI(title="NEXUS Temporary GPU Worker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])
jobs: dict[str, dict[str, Any]] = {}
lock = threading.Lock()

class JobRequest(BaseModel):
    engine: str = "image"
    prompt: str
    options: dict[str, Any] = {}

def authorized(value: str | None):
    if value != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid worker token.")

def run_job(job_id: str, prompt: str, options: dict[str, Any]):
    try:
        with lock:
            jobs[job_id].update(state="running", progress=5, message="Loading image generation")
        width = max(512, min(768, int(options.get("width", 512))))
        height = max(512, min(768, int(options.get("height", 512))))
        steps = max(1, min(4, int(options.get("steps", 2))))
        result = pipe(prompt=prompt, num_inference_steps=steps, guidance_scale=0.0, width=width, height=height)
        path = OUT / f"{job_id}.png"
        result.images[0].save(path)
        with lock:
            jobs[job_id].update(state="succeeded", progress=100, message="Image ready",
                output={"url": f"{BASE_URL}/outputs/{job_id}.png", "mimeType":"image/png"})
    except Exception as exc:
        with lock:
            jobs[job_id].update(state="failed", progress=0, message="Image generation failed", error=str(exc)[:500])

@app.get("/health")
def health():
    return {"ok": True, "gpu": torch.cuda.get_device_name(0), "model": MODEL_ID}

@app.post("/jobs", status_code=202)
def submit(req: JobRequest, authorization: str | None = Header(default=None)):
    authorized(authorization)
    if req.engine != "image":
        raise HTTPException(status_code=400, detail="This temporary worker currently supports image jobs only.")
    if not req.prompt.strip() or len(req.prompt) > 12000:
        raise HTTPException(status_code=400, detail="Prompt must contain 1 to 12000 characters.")
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"id":job_id, "engine":"image", "state":"queued", "progress":0, "message":"Queued"}
    threading.Thread(target=run_job, args=(job_id, req.prompt, req.options), daemon=True).start()
    return jobs[job_id]

@app.get("/jobs/{job_id}")
def status(job_id: str, authorization: str | None = Header(default=None)):
    authorized(authorization)
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found. The temporary notebook may have restarted.")
    return jobs[job_id]

@app.get("/outputs/{filename}")
def output(filename: str):
    if "/" in filename or not filename.endswith(".png"):
        raise HTTPException(status_code=404)
    path = OUT / filename
    if not path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(path, media_type="image/png")

