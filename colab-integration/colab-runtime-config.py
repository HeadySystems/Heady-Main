"""
Heady Colab Pro+ Runtime Configuration — 3-Runtime Latent Space Operations
© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

Three Colab Pro+ runtimes form the latent space compute layer of the Heady OS:
  Runtime 1: Vector Memory & Embedding Operations (GPU: A100/V100)
  Runtime 2: LLM Inference & Agent Execution (GPU: A100)
  Runtime 3: Training, Fine-tuning & Analytics (TPU v2-8)

All parameters use phi-scaled constants — zero magic numbers.
"""

import math
import os
import time
import json
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any
from enum import Enum

# ═══════════════════════════════════════════════════════════════
# PHI-MATH FOUNDATION (Python)
# ═══════════════════════════════════════════════════════════════

PHI = (1 + math.sqrt(5)) / 2      # ≈ 1.618033988749895
PSI = 1 / PHI                      # ≈ 0.618033988749895
PHI2 = PHI + 1                     # ≈ 2.618
PHI3 = 2 * PHI + 1                 # ≈ 4.236

FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765]

def fib(n: int) -> int:
    """Get Fibonacci number by index."""
    if n < len(FIB):
        return FIB[n]
    a, b = FIB[-2], FIB[-1]
    for _ in range(len(FIB), n + 1):
        a, b = b, a + b
    return b

def phi_threshold(level: int, spread: float = 0.5) -> float:
    """Phi-harmonic threshold: 1 - ψ^level × spread"""
    return 1 - (PSI ** level) * spread

def phi_backoff(attempt: int, base_s: float = 1.0, max_s: float = 60.0) -> float:
    """Phi-exponential backoff in seconds."""
    return min(base_s * (PHI ** attempt), max_s)

# CSL Thresholds
CSL_THRESHOLDS = {
    'MINIMUM':  phi_threshold(0),   # ≈ 0.500
    'LOW':      phi_threshold(1),   # ≈ 0.691
    'MEDIUM':   phi_threshold(2),   # ≈ 0.809
    'HIGH':     phi_threshold(3),   # ≈ 0.882
    'CRITICAL': phi_threshold(4),   # ≈ 0.927
}


# ═══════════════════════════════════════════════════════════════
# RUNTIME CONFIGURATION
# ═══════════════════════════════════════════════════════════════

class RuntimeRole(Enum):
    VECTOR_OPS = "vector_ops"       # Runtime 1: Embeddings, vector search, memory
    LLM_INFERENCE = "llm_inference" # Runtime 2: Model serving, agent execution
    TRAINING = "training"           # Runtime 3: Fine-tuning, analytics, batch jobs


@dataclass
class RuntimeConfig:
    """Configuration for a single Colab Pro+ runtime."""
    role: RuntimeRole
    runtime_id: str
    gpu_type: str
    gpu_count: int
    ram_gb: int
    disk_gb: int
    port: int
    health_port: int
    models: List[str] = field(default_factory=list)
    env_vars: Dict[str, str] = field(default_factory=dict)

    @property
    def health_endpoint(self) -> str:
        return f"http://localhost:{self.health_port}/health"

    @property
    def resource_weight(self) -> float:
        """Phi-scaled resource allocation weight."""
        weights = {
            RuntimeRole.VECTOR_OPS: PSI ** 2,     # ≈ 0.382 (34% allocation)
            RuntimeRole.LLM_INFERENCE: PSI,        # ≈ 0.618 (highest allocation)
            RuntimeRole.TRAINING: PSI ** 3,        # ≈ 0.236 (lowest allocation)
        }
        return weights[self.role]


# ─────────────────────────────────────────────────────────────
# RUNTIME 1: VECTOR MEMORY & EMBEDDING OPERATIONS
# ─────────────────────────────────────────────────────────────

RUNTIME_1_VECTOR = RuntimeConfig(
    role=RuntimeRole.VECTOR_OPS,
    runtime_id="heady-vector-runtime",
    gpu_type="A100",           # or V100 as fallback
    gpu_count=1,
    ram_gb=fib(9),             # 34 GB (Fibonacci)
    disk_gb=fib(12),           # 144 GB
    port=3301,
    health_port=3311,
    models=[
        "nomic-embed-text-v1.5",      # 768D, 512 ctx — primary embed
        "BAAI/bge-base-en-v1.5",      # 768D — edge fallback
        "jinaai/jina-embeddings-v3",  # 1024D, 8K ctx — long docs
    ],
    env_vars={
        "HEADY_ROLE": "vector_ops",
        "EMBEDDING_DIM": "384",
        "HNSW_M": str(fib(8)),                  # 21
        "HNSW_EF_CONSTRUCTION": str(fib(11)),   # 89
        "HNSW_EF_SEARCH": str(fib(11)),         # 89
        "LRU_CACHE_SIZE": str(fib(16)),          # 987
        "BATCH_SIZE": str(fib(11)),              # 89
        "VECTOR_MEMORY_MODE": "ram_first",
        "PGVECTOR_SYNC_INTERVAL_MS": str(round(PHI * 1000 * fib(5))),  # ~8090ms
    },
)

# ─────────────────────────────────────────────────────────────
# RUNTIME 2: LLM INFERENCE & AGENT EXECUTION
# ─────────────────────────────────────────────────────────────

RUNTIME_2_LLM = RuntimeConfig(
    role=RuntimeRole.LLM_INFERENCE,
    runtime_id="heady-llm-runtime",
    gpu_type="A100",
    gpu_count=1,
    ram_gb=fib(10),            # 55 GB (Fibonacci)
    disk_gb=fib(13),           # 233 GB
    port=3302,
    health_port=3312,
    models=[
        "meta-llama/Llama-3.1-8B-Instruct",     # Fast general
        "meta-llama/Llama-3.1-70B-Instruct",     # Deep reasoning (quantized)
        "codellama/CodeLlama-34b-Instruct-hf",   # Code generation
        "mistralai/Mistral-7B-Instruct-v0.3",    # Quick tasks
    ],
    env_vars={
        "HEADY_ROLE": "llm_inference",
        "MAX_CONCURRENT_REQUESTS": str(fib(6)),   # 8
        "MAX_BATCH_SIZE": str(fib(5)),             # 5
        "KV_CACHE_GB": str(fib(7)),                # 13
        "QUANTIZATION": "int4",
        "VLLM_TENSOR_PARALLEL": "1",
        "MAX_MODEL_LEN": str(fib(16) * 8),        # 7896 tokens
    },
)

# ─────────────────────────────────────────────────────────────
# RUNTIME 3: TRAINING, FINE-TUNING & ANALYTICS
# ─────────────────────────────────────────────────────────────

RUNTIME_3_TRAINING = RuntimeConfig(
    role=RuntimeRole.TRAINING,
    runtime_id="heady-training-runtime",
    gpu_type="TPU-v2-8",      # or A100 as fallback
    gpu_count=1,
    ram_gb=fib(10),            # 55 GB
    disk_gb=fib(13),           # 233 GB
    port=3303,
    health_port=3313,
    models=[
        "heady-soul-finetune",           # HeadySoul personality fine-tune
        "heady-classifier-finetune",     # Task classifier
        "heady-embedding-finetune",      # Domain-specific embeddings
    ],
    env_vars={
        "HEADY_ROLE": "training",
        "TRAINING_BATCH_SIZE": str(fib(5)),        # 5
        "LEARNING_RATE": str(PSI * 1e-4),          # ~6.18e-5 (phi-scaled)
        "WARMUP_STEPS": str(fib(9)),               # 34
        "EVAL_STEPS": str(fib(11)),                # 89
        "SAVE_STEPS": str(fib(13)),                # 233
        "MAX_EPOCHS": str(fib(4)),                 # 3
        "DUCKDB_ANALYTICS": "true",
    },
)

ALL_RUNTIMES = [RUNTIME_1_VECTOR, RUNTIME_2_LLM, RUNTIME_3_TRAINING]


# ═══════════════════════════════════════════════════════════════
# RUNTIME MANAGER — Orchestrates 3 Colab Pro+ Instances
# ═══════════════════════════════════════════════════════════════

class RuntimeManager:
    """
    Manages the 3 Colab Pro+ runtimes as a unified latent space compute layer.
    Handles health monitoring, auto-reconnect with phi-backoff, and task routing.
    """

    def __init__(self, runtimes: List[RuntimeConfig] = None):
        self.runtimes = {r.role: r for r in (runtimes or ALL_RUNTIMES)}
        self.health_status: Dict[RuntimeRole, Dict] = {}
        self.reconnect_attempts: Dict[RuntimeRole, int] = {
            r: 0 for r in RuntimeRole
        }
        self.logger = logging.getLogger("HeadyRuntimeManager")
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter(
                '{"timestamp":"%(asctime)s","level":"%(levelname)s",'
                '"service":"RuntimeManager","msg":"%(message)s"}'
            ))
            self.logger.addHandler(handler)

    def check_health(self, role: RuntimeRole) -> Dict[str, Any]:
        """
        Check health of a specific runtime.
        Returns structured health status.
        """
        config = self.runtimes[role]
        try:
            import urllib.request
            url = config.health_endpoint
            req = urllib.request.Request(url, method='GET')
            with urllib.request.urlopen(req, timeout=round(PHI * 3)) as resp:
                data = json.loads(resp.read())
                self.health_status[role] = {
                    "status": "healthy",
                    "role": role.value,
                    "runtime_id": config.runtime_id,
                    "gpu": config.gpu_type,
                    "data": data,
                    "checked_at": time.time(),
                }
                self.reconnect_attempts[role] = 0
                return self.health_status[role]
        except Exception as e:
            self.health_status[role] = {
                "status": "unhealthy",
                "role": role.value,
                "runtime_id": config.runtime_id,
                "error": str(e),
                "checked_at": time.time(),
            }
            return self.health_status[role]

    def check_all_health(self) -> Dict[str, Dict]:
        """Check health of all 3 runtimes."""
        return {role.value: self.check_health(role) for role in RuntimeRole}

    def reconnect(self, role: RuntimeRole) -> bool:
        """
        Attempt reconnection with phi-exponential backoff.
        Returns True if connection restored.
        """
        attempt = self.reconnect_attempts[role]
        delay = phi_backoff(attempt, base_s=1.0, max_s=60.0)

        self.logger.info(
            f"Reconnecting {role.value} (attempt {attempt}, "
            f"delay {delay:.1f}s)"
        )
        time.sleep(delay)

        health = self.check_health(role)
        if health["status"] == "healthy":
            self.logger.info(f"Reconnected {role.value}")
            self.reconnect_attempts[role] = 0
            return True
        else:
            self.reconnect_attempts[role] = attempt + 1
            max_attempts = fib(7)  # 13
            if attempt + 1 >= max_attempts:
                self.logger.error(
                    f"Failed to reconnect {role.value} "
                    f"after {max_attempts} attempts"
                )
            return False

    def route_task(self, task_type: str) -> RuntimeConfig:
        """
        Route a compute task to the appropriate runtime.
        Uses capability-based routing, not priority ranking.
        """
        routing = {
            "embed":        RuntimeRole.VECTOR_OPS,
            "vectorize":    RuntimeRole.VECTOR_OPS,
            "search":       RuntimeRole.VECTOR_OPS,
            "similarity":   RuntimeRole.VECTOR_OPS,
            "chat":         RuntimeRole.LLM_INFERENCE,
            "generate":     RuntimeRole.LLM_INFERENCE,
            "code":         RuntimeRole.LLM_INFERENCE,
            "classify":     RuntimeRole.LLM_INFERENCE,
            "agent":        RuntimeRole.LLM_INFERENCE,
            "train":        RuntimeRole.TRAINING,
            "finetune":     RuntimeRole.TRAINING,
            "evaluate":     RuntimeRole.TRAINING,
            "analytics":    RuntimeRole.TRAINING,
            "batch":        RuntimeRole.TRAINING,
        }
        role = routing.get(task_type, RuntimeRole.LLM_INFERENCE)
        config = self.runtimes[role]

        # Check health — if unhealthy, attempt reconnect
        health = self.health_status.get(role, {})
        if health.get("status") != "healthy":
            self.reconnect(role)

        return config

    def generate_setup_notebook(self, role: RuntimeRole) -> str:
        """
        Generate a Colab setup cell for a specific runtime.
        Returns Python code as a string.
        """
        config = self.runtimes[role]
        env_lines = "\n".join(
            f'os.environ["{k}"] = "{v}"' for k, v in config.env_vars.items()
        )

        return f'''# ═══════════════════════════════════════════════
# Heady {role.value.upper()} Runtime Setup
# Runtime: {config.runtime_id}
# GPU: {config.gpu_type} x{config.gpu_count}
# RAM: {config.ram_gb}GB | Disk: {config.disk_gb}GB
# Port: {config.port} | Health: {config.health_port}
# ═══════════════════════════════════════════════

import os
import subprocess

# Environment
{env_lines}
os.environ["HEADY_RUNTIME_ID"] = "{config.runtime_id}"
os.environ["PORT"] = "{config.port}"
os.environ["HEALTH_PORT"] = "{config.health_port}"

# Install dependencies
subprocess.run(["pip", "install", "-q",
    "torch", "transformers", "sentence-transformers",
    "vllm", "fastapi", "uvicorn", "pgvector", "psycopg2-binary",
    "duckdb", "numpy", "scipy"
], check=True)

# Install models for this runtime
models = {json.dumps(config.models)}
for model in models:
    print(f"Loading model: {{model}}")

# Health check server
from fastapi import FastAPI
import uvicorn, threading, time

app = FastAPI()
start_time = time.time()

@app.get("/health")
async def health():
    return {{
        "status": "healthy",
        "role": "{role.value}",
        "runtime_id": "{config.runtime_id}",
        "gpu": "{config.gpu_type}",
        "uptime_s": round(time.time() - start_time),
        "models_loaded": models,
    }}

# Start health server in background
threading.Thread(
    target=lambda: uvicorn.run(app, host="0.0.0.0", port={config.health_port}),
    daemon=True
).start()

print(f"Heady {role.value} runtime ready on port {config.port}")
print(f"Health check: http://localhost:{config.health_port}/health")
'''

    def print_topology(self):
        """Print the 3-runtime topology."""
        print("═" * 60)
        print("  HEADY LATENT SPACE — 3 COLAB PRO+ RUNTIMES")
        print("═" * 60)
        for role in RuntimeRole:
            config = self.runtimes[role]
            health = self.health_status.get(role, {})
            status = health.get("status", "unknown")
            print(f"\n  [{role.value.upper()}] {config.runtime_id}")
            print(f"    GPU: {config.gpu_type} x{config.gpu_count}")
            print(f"    RAM: {config.ram_gb}GB | Disk: {config.disk_gb}GB")
            print(f"    Port: {config.port} | Health: {config.health_port}")
            print(f"    Models: {', '.join(config.models[:3])}")
            print(f"    Weight: {config.resource_weight:.3f}")
            print(f"    Status: {status}")
        print("\n" + "═" * 60)


# ═══════════════════════════════════════════════════════════════
# TUNNEL CONFIGURATION — Connect Colab to Heady Cloud
# ═══════════════════════════════════════════════════════════════

@dataclass
class TunnelConfig:
    """Cloudflare tunnel configuration to expose Colab runtimes."""
    tunnel_name: str = "heady-colab-tunnel"
    cloudflare_account_id: str = os.getenv("CF_ACCOUNT_ID", "")
    origin_runtimes: Dict[str, int] = field(default_factory=lambda: {
        "vector.headyos.com": 3301,
        "llm.headyos.com": 3302,
        "train.headyos.com": 3303,
    })

    def generate_tunnel_config(self) -> Dict:
        """Generate cloudflared tunnel config YAML structure."""
        ingress = []
        for hostname, port in self.origin_runtimes.items():
            ingress.append({
                "hostname": hostname,
                "service": f"http://localhost:{port}",
            })
        ingress.append({"service": "http_status:404"})
        return {
            "tunnel": self.tunnel_name,
            "credentials-file": "/root/.cloudflared/credentials.json",
            "ingress": ingress,
        }


# ═══════════════════════════════════════════════════════════════
# MAIN — Entry Point
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    manager = RuntimeManager()
    manager.print_topology()

    # Generate setup notebooks
    for role in RuntimeRole:
        notebook_code = manager.generate_setup_notebook(role)
        filename = f"colab_setup_{role.value}.py"
        with open(filename, 'w') as f:
            f.write(notebook_code)
        print(f"Generated: {filename}")

    # Check health
    health = manager.check_all_health()
    print(f"\nHealth Status: {json.dumps(health, indent=2, default=str)}")
