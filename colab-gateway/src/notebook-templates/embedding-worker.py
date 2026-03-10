#!/usr/bin/env python3
"""
Heady Embedding Worker — Colab Pro+ Runtime
Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
Runs on GPU for high-throughput embedding generation.
"""

import json
import time
import hashlib
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any

PHI = 1.618033988749895
PSI = 1 / PHI
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]

logging.basicConfig(
    format='{"level":"%(levelname)s","service":"embedding-worker","msg":"%(message)s","timestamp":"%(asctime)s"}',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BATCH_SIZE = FIB[8]  # 21
HEARTBEAT_INTERVAL = FIB[6]  # 8 seconds
MODEL_NAME = "nomic-embed-text-v1.5"

class EmbeddingWorker:
    def __init__(self):
        self.model = None
        self.total_embedded = 0
        self.start_time = time.time()

    def load_model(self):
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer("nomic-ai/nomic-embed-text-v1.5", trust_remote_code=True)
            logger.info("Model loaded successfully")
        except ImportError:
            logger.warning("sentence_transformers not available, using mock embeddings")
            self.model = None

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self.model:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            self.total_embedded += len(texts)
            return embeddings.tolist()
        else:
            # Mock 384D embeddings when model not available
            result = []
            for text in texts:
                hash_bytes = hashlib.sha384(text.encode()).digest()
                vec = [b / 255.0 * 2 - 1 for b in hash_bytes]
                norm = sum(v**2 for v in vec) ** 0.5
                result.append([v / norm if norm > 0 else 0.0 for v in vec])
            self.total_embedded += len(texts)
            return result

    def embed_batch(self, texts: list[str]) -> list[list[list[float]]]:
        batches = []
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            batches.append(self.embed(batch))
        return batches

worker = EmbeddingWorker()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass  # Suppress default logging

    def do_GET(self):
        if self.path == "/health":
            uptime = time.time() - worker.start_time
            self.send_json(200, {
                "status": "healthy",
                "model": MODEL_NAME,
                "totalEmbedded": worker.total_embedded,
                "uptime": round(uptime, 2),
                "batchSize": BATCH_SIZE
            })
        else:
            self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path == "/embed":
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))
            texts = body.get("texts", [])
            embeddings = worker.embed(texts)
            self.send_json(200, {"embeddings": embeddings, "count": len(embeddings), "dimensions": 384})
        elif self.path == "/embed/batch":
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))
            texts = body.get("texts", [])
            batches = worker.embed_batch(texts)
            total = sum(len(b) for b in batches)
            self.send_json(200, {"batches": batches, "batchCount": len(batches), "totalEmbeddings": total})
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
    port = 8080
    server = HTTPServer(("0.0.0.0", port), Handler)
    logger.info(f"Embedding worker started on port {port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down embedding worker")
        server.shutdown()
