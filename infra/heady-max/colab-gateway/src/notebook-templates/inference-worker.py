#!/usr/bin/env python3
"""
Heady Inference Worker — Colab Pro+ Runtime
Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
Runs local LLMs (Llama, Mistral) for inference without external API calls.
"""

import json
import time
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any

PHI = 1.618033988749895
PSI = 1 / PHI
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]

logging.basicConfig(
    format='{"level":"%(levelname)s","service":"inference-worker","msg":"%(message)s","timestamp":"%(asctime)s"}',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

MAX_TOKENS = FIB[12] * FIB[3]  # 144 * 2 = 288 tokens default
TEMPERATURE = PSI  # 0.618 — balanced creativity via golden ratio

class InferenceWorker:
    def __init__(self):
        self.model = None
        self.model_name = "meta-llama/Llama-3.2-3B-Instruct"
        self.total_inferences = 0
        self.start_time = time.time()

    def load_model(self):
        logger.info(f"Loading inference model: {self.model_name}")
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM
            import torch
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16,
                device_map="auto"
            )
            logger.info("Model loaded successfully")
        except (ImportError, Exception) as e:
            logger.warning(f"Model not available: {e}, using mock inference")
            self.model = None

    def infer(self, prompt: str, max_tokens: int = MAX_TOKENS, temperature: float = TEMPERATURE) -> str:
        self.total_inferences += 1
        if self.model and hasattr(self, 'tokenizer'):
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=max(temperature, 0.01),
                do_sample=True,
                top_p=PSI + PSI * PSI  # ≈ 0.854
            )
            return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        else:
            return f"[Mock inference] Processed prompt of length {len(prompt)} with temperature={temperature}"

worker = InferenceWorker()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {
                "status": "healthy",
                "model": worker.model_name,
                "totalInferences": worker.total_inferences,
                "uptime": round(time.time() - worker.start_time, 2),
                "defaultTemperature": TEMPERATURE,
                "defaultMaxTokens": MAX_TOKENS
            })
        else:
            self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path == "/infer":
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))
            prompt = body.get("prompt", "")
            max_tokens = body.get("max_tokens", MAX_TOKENS)
            temperature = body.get("temperature", TEMPERATURE)
            start = time.time()
            result = worker.infer(prompt, max_tokens, temperature)
            duration_ms = round((time.time() - start) * 1000, 2)
            self.send_json(200, {"result": result, "durationMs": duration_ms, "model": worker.model_name})
        else:
            self.send_json(404, {"error": "not_found"})

    def send_json(self, status: int, data: dict[str, Any]):
        response = json.dumps(data)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(response.encode())

if __name__ == "__main__":
    worker.load_model()
    port = 8081
    server = HTTPServer(("0.0.0.0", port), Handler)
    logger.info(f"Inference worker started on port {port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down inference worker")
        server.shutdown()
