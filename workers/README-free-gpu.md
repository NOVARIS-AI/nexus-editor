# NEXUS temporary free GPU worker (image generation)

This is a development/test worker, not an always-on production service. It currently supports **image generation only** using the public `stabilityai/sd-turbo` Diffusers pipeline. It does not provide video generation.

## Run in Colab or Kaggle

1. Open a GPU notebook and enable its GPU accelerator.
2. Clone this repository (or upload `free_gpu_worker.py` and `requirements-free-gpu.txt`).
3. Install dependencies: `pip install -r requirements-free-gpu.txt`.
4. Create a long random worker token in the notebook session and set it as `NEXUS_WORKER_TOKEN`. Do not commit it or share it in chat.
5. Start the API with `uvicorn free_gpu_worker:app --host 0.0.0.0 --port 7860`.
6. Expose port 7860 through a temporary HTTPS tunnel. Set `NEXUS_PUBLIC_URL` to that exact HTTPS tunnel origin before starting the worker, so output links are correct.
7. Keep the notebook running while jobs are being processed.

The service exposes:
- `GET /health`
- `POST /jobs` with Bearer token and JSON `{ "engine":"image", "prompt":"...", "options":{} }`
- `GET /jobs/{id}` with Bearer token
- `GET /outputs/{id}.png` for generated output

## Connect to Vercel

Set these project environment variables for Preview (and Production only after testing):
- `NEXUS_IMAGE_ENGINE_URL`: the temporary HTTPS tunnel origin, without a trailing slash
- `NEXUS_IMAGE_ENGINE_TOKEN`: the same random token created in the notebook

Redeploy after changing Vercel environment variables. The tunnel URL and token change when a notebook session restarts, so update the Vercel variables each time. Never expose the token in browser code.

## Important limits

Colab and Kaggle GPU sessions are temporary, quota-limited and may disconnect. This worker keeps job state and generated files in notebook memory/disk, so restarting the notebook loses them. It is suitable for development and small tests, not reliable public APK production. Kaggle/Colab access, GPU type and available VRAM vary. SD-Turbo is a lightweight test model; quality and speed are not comparable to larger hosted models. Check the model card and license before commercial use.
