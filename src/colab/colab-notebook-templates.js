/**
 * Heady™ Colab Notebook Template Generator v5.0
 * Generates valid .ipynb notebooks for 3 specialized Colab Pro+ runtimes
 * Alpha: Inference & Embedding | Beta: Vector Memory & Search | Gamma: Training & Evolution
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const {
  PHI, PSI, fib, EMBEDDING_DIM, HNSW_PARAMS, COLAB_RUNTIMES,
  CSL_THRESHOLDS, TIMING, BACKOFF_SEQUENCE, SERVICE_PORTS,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('colab-notebook-templates');

function makeCell(cellType, source, metadata = {}) {
  return {
    cell_type: cellType,
    metadata: { ...metadata },
    source: Array.isArray(source) ? source : source.split('\n').map((l, i, arr) => i < arr.length - 1 ? l + '\n' : l),
    ...(cellType === 'code' ? { execution_count: null, outputs: [] } : {}),
  };
}

function makeNotebook(cells) {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.10.12' },
      accelerator: 'GPU',
      gpuClass: 'premium',
      colab: { provenance: [], gpuType: 'A100' },
    },
    cells,
  };
}

class NotebookTemplateGenerator {
  constructor() {
    this.gpuMemoryGB = COLAB_RUNTIMES.GPU_MEMORY_GB;
    this.batchSize = COLAB_RUNTIMES.BATCH_SIZE;
    this.embeddingBatch = COLAB_RUNTIMES.EMBEDDING_BATCH;
    this.checkpointInterval = COLAB_RUNTIMES.CHECKPOINT_INTERVAL_S;
    this.vectorCacheSize = COLAB_RUNTIMES.VECTOR_CACHE_SIZE;
  }

  generateAlphaNotebook() {
    const cells = [
      makeCell('markdown', `# Heady™ Runtime Alpha — Inference & Embedding Engine\n\n**GPU**: A100 ${this.gpuMemoryGB}GB | **Role**: Model serving, embedding generation\n\n**Author**: Eric Haywood — HeadySystems Inc.`),

      makeCell('code', `# === Setup ===
!pip install -q torch transformers sentence-transformers numpy requests fastapi uvicorn

import torch
import numpy as np
import requests
import json
import time
import os
from datetime import datetime

# Phi constants — Sacred Geometry foundation
PHI = (1 + 5**0.5) / 2   # ≈ 1.618
PSI = 1 / PHI              # ≈ 0.618
EMBEDDING_DIM = ${EMBEDDING_DIM}
BATCH_SIZE = ${this.embeddingBatch}    # fib(12) = 144
CHECKPOINT_INTERVAL = ${this.checkpointInterval}  # fib(13) = 233 seconds
GPU_MEMORY_GB = ${this.gpuMemoryGB}    # fib(10) = 55
HEARTBEAT_INTERVAL = ${fib(7)}        # fib(7) = 13 seconds
HEALTH_ENDPOINT = "http://localhost:${SERVICE_PORTS.HEADY_HEALTH}/health"

print(json.dumps({"level": "INFO", "service": "colab-alpha", "message": "setup_complete", "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"}))`),

      makeCell('code', `# === GPU Memory Management ===
def get_gpu_stats():
    if not torch.cuda.is_available():
        return {"gpu_available": False}
    return {
        "gpu_name": torch.cuda.get_device_name(0),
        "memory_allocated_gb": round(torch.cuda.memory_allocated(0) / 1e9, 3),
        "memory_reserved_gb": round(torch.cuda.memory_reserved(0) / 1e9, 3),
        "memory_total_gb": round(torch.cuda.get_device_properties(0).total_mem / 1e9, 3),
        "utilization": round(torch.cuda.memory_allocated(0) / torch.cuda.get_device_properties(0).total_mem, 4),
    }

# Set memory fraction — phi-scaled allocation
if torch.cuda.is_available():
    torch.cuda.set_per_process_memory_fraction(${PSI.toFixed(4)})  # PSI ≈ 0.618
    print(json.dumps({"level": "INFO", "service": "colab-alpha", "message": "gpu_configured", **get_gpu_stats()}))`),

      makeCell('code', `# === Embedding Model ===
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')  # 384-dim output
model = model.to('cuda' if torch.cuda.is_available() else 'cpu')

def batch_embed(texts, batch_size=BATCH_SIZE):
    """Generate embeddings in phi-sized batches"""
    all_embeddings = []
    start = time.time()
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        with torch.no_grad():
            embeddings = model.encode(batch, convert_to_numpy=True, normalize_embeddings=True)
        all_embeddings.extend(embeddings.tolist())
    
    latency = (time.time() - start) * 1000
    print(json.dumps({
        "level": "INFO", "service": "colab-alpha",
        "message": "batch_embed_complete",
        "count": len(texts), "batches": (len(texts) + batch_size - 1) // batch_size,
        "latency_ms": round(latency, 2),
    }))
    return all_embeddings

# Smoke test
test_embeddings = batch_embed(["Heady Sacred Geometry", "Phi-based scaling"])
print(json.dumps({"level": "INFO", "service": "colab-alpha", "message": "embedding_test_pass", "dim": len(test_embeddings[0])}))`),

      makeCell('code', `# === Inference Loop with Phi-Backoff ===
BACKOFF_SEQUENCE = ${JSON.stringify(BACKOFF_SEQUENCE)}  # ms

def inference_loop():
    """Main inference loop with health reporting"""
    attempt = 0
    last_checkpoint = time.time()
    
    while True:
        try:
            # Check for pending inference requests
            # In production: poll NATS JetStream for tasks
            gpu_stats = get_gpu_stats()
            
            # Checkpoint at phi-scaled intervals
            if time.time() - last_checkpoint > CHECKPOINT_INTERVAL:
                print(json.dumps({
                    "level": "INFO", "service": "colab-alpha",
                    "message": "checkpoint", **gpu_stats,
                    "timestamp": datetime.utcnow().isoformat(),
                }))
                last_checkpoint = time.time()
            
            # Report health
            try:
                requests.post(HEALTH_ENDPOINT, json={
                    "service": "colab-alpha",
                    "status": "HEALTHY",
                    "gpu": gpu_stats,
                    "timestamp": datetime.utcnow().isoformat(),
                }, timeout=5)
            except Exception:
                pass  # Health reporting is best-effort
            
            attempt = 0
            time.sleep(HEARTBEAT_INTERVAL)
            
        except torch.cuda.OutOfMemoryError:
            torch.cuda.empty_cache()
            delay = BACKOFF_SEQUENCE[min(attempt, len(BACKOFF_SEQUENCE) - 1)] / 1000
            print(json.dumps({
                "level": "ERROR", "service": "colab-alpha",
                "message": "oom_recovery", "attempt": attempt, "delay_s": delay,
            }))
            time.sleep(delay)
            attempt += 1
            
        except Exception as e:
            delay = BACKOFF_SEQUENCE[min(attempt, len(BACKOFF_SEQUENCE) - 1)] / 1000
            print(json.dumps({
                "level": "ERROR", "service": "colab-alpha",
                "message": "inference_error", "error": str(e), "attempt": attempt,
            }))
            time.sleep(delay)
            attempt += 1

# Uncomment to run: inference_loop()`),
    ];

    const nb = makeNotebook(cells);
    logger.info('notebook_generated', { runtime: 'alpha', role: 'inference-embedding', cells: cells.length });
    return nb;
  }

  generateBetaNotebook() {
    const cells = [
      makeCell('markdown', `# Heady™ Runtime Beta — Vector Memory & Search Engine\n\n**GPU**: A100 ${this.gpuMemoryGB}GB | **Role**: HNSW index ops, batch similarity, vector memory\n\n**Author**: Eric Haywood — HeadySystems Inc.`),

      makeCell('code', `# === Setup ===
!pip install -q numpy hnswlib psycopg2-binary pgvector requests

import numpy as np
import hnswlib
import json
import time
import os
from datetime import datetime

PHI = (1 + 5**0.5) / 2
PSI = 1 / PHI
EMBEDDING_DIM = ${EMBEDDING_DIM}
HNSW_M = ${HNSW_PARAMS.M}                    # fib(8) = 21
HNSW_EF_CONSTRUCTION = ${HNSW_PARAMS.EF_CONSTRUCTION}  # fib(12) = 144
HNSW_EF_SEARCH = ${HNSW_PARAMS.EF_SEARCH}             # fib(11) = 89
VECTOR_CACHE_SIZE = ${this.vectorCacheSize}    # fib(20) = 6765
CHECKPOINT_INTERVAL = ${this.checkpointInterval}
HEALTH_ENDPOINT = "http://localhost:${SERVICE_PORTS.HEADY_HEALTH}/health"

print(json.dumps({"level": "INFO", "service": "colab-beta", "message": "setup_complete"}))`),

      makeCell('code', `# === HNSW Index Manager ===
class VectorMemoryIndex:
    def __init__(self, dim=EMBEDDING_DIM, max_elements=${this.vectorCacheSize}):
        self.dim = dim
        self.index = hnswlib.Index(space='cosine', dim=dim)
        self.index.init_index(
            max_elements=max_elements,
            M=HNSW_M,
            ef_construction=HNSW_EF_CONSTRUCTION,
        )
        self.index.set_ef(HNSW_EF_SEARCH)
        self.id_map = {}
        self.next_id = 0
        self.insert_count = 0
        self.search_count = 0
        
    def insert(self, vectors, ids=None):
        start = time.time()
        if ids is None:
            ids = list(range(self.next_id, self.next_id + len(vectors)))
            self.next_id += len(vectors)
        
        vectors_np = np.array(vectors, dtype=np.float32)
        int_ids = np.array(range(self.insert_count, self.insert_count + len(vectors)))
        self.index.add_items(vectors_np, int_ids)
        
        for i, ext_id in enumerate(ids):
            self.id_map[int(int_ids[i])] = ext_id
        
        self.insert_count += len(vectors)
        latency = (time.time() - start) * 1000
        print(json.dumps({
            "level": "INFO", "service": "colab-beta",
            "message": "vectors_inserted",
            "count": len(vectors), "total": self.insert_count, "latency_ms": round(latency, 2),
        }))
        return ids
    
    def search(self, query_vector, k=${fib(7)}):
        start = time.time()
        query_np = np.array([query_vector], dtype=np.float32)
        int_ids, distances = self.index.knn_query(query_np, k=min(k, self.insert_count))
        
        results = []
        for idx, dist in zip(int_ids[0], distances[0]):
            ext_id = self.id_map.get(int(idx), str(idx))
            results.append({"id": ext_id, "similarity": round(1 - dist, 6)})
        
        self.search_count += 1
        latency = (time.time() - start) * 1000
        return {"results": results, "latency_ms": round(latency, 2), "k": k}
    
    def get_stats(self):
        return {
            "total_vectors": self.insert_count,
            "search_count": self.search_count,
            "max_elements": self.index.get_max_elements(),
            "ef_search": HNSW_EF_SEARCH,
            "M": HNSW_M,
        }

vmi = VectorMemoryIndex()
print(json.dumps({"level": "INFO", "service": "colab-beta", "message": "index_ready", **vmi.get_stats()}))`),

      makeCell('code', `# === Batch Similarity & Drift Detection ===
CSL_THRESHOLDS = {
    "MINIMUM": ${CSL_THRESHOLDS.MINIMUM.toFixed(6)},
    "LOW": ${CSL_THRESHOLDS.LOW.toFixed(6)},
    "MEDIUM": ${CSL_THRESHOLDS.MEDIUM.toFixed(6)},
    "HIGH": ${CSL_THRESHOLDS.HIGH.toFixed(6)},
    "CRITICAL": ${CSL_THRESHOLDS.CRITICAL.toFixed(6)},
}

def batch_similarity(vectors_a, vectors_b):
    """Compute pairwise cosine similarities"""
    a = np.array(vectors_a, dtype=np.float32)
    b = np.array(vectors_b, dtype=np.float32)
    # Normalize
    a_norm = a / np.linalg.norm(a, axis=1, keepdims=True)
    b_norm = b / np.linalg.norm(b, axis=1, keepdims=True)
    return (a_norm @ b_norm.T).tolist()

def detect_drift(current_embedding, reference_embedding):
    """Detect semantic drift using CSL threshold"""
    sim = float(np.dot(current_embedding, reference_embedding) / 
                (np.linalg.norm(current_embedding) * np.linalg.norm(reference_embedding)))
    drifted = sim < CSL_THRESHOLDS["MEDIUM"]
    if drifted:
        print(json.dumps({
            "level": "WARN", "service": "colab-beta",
            "message": "semantic_drift_detected",
            "similarity": round(sim, 6),
            "threshold": CSL_THRESHOLDS["MEDIUM"],
        }))
    return {"similarity": round(sim, 6), "drifted": drifted}

print(json.dumps({"level": "INFO", "service": "colab-beta", "message": "drift_detection_ready"}))`),
    ];

    const nb = makeNotebook(cells);
    logger.info('notebook_generated', { runtime: 'beta', role: 'vector-memory-search', cells: cells.length });
    return nb;
  }

  generateGammaNotebook() {
    const cells = [
      makeCell('markdown', `# Heady™ Runtime Gamma — Training & Evolution Engine\n\n**GPU**: A100 ${this.gpuMemoryGB}GB | **Role**: Fine-tuning, Monte Carlo simulations, evolution\n\n**Author**: Eric Haywood — HeadySystems Inc.`),

      makeCell('code', `# === Setup ===
!pip install -q torch numpy scipy requests

import torch
import numpy as np
from scipy import stats
import json
import time
import random
from datetime import datetime

PHI = (1 + 5**0.5) / 2
PSI = 1 / PHI
EMBEDDING_DIM = ${EMBEDDING_DIM}
MONTE_CARLO_SIMS = ${fib(8)}           # fib(8) = 21 simulations
EVOLUTION_POPULATION = ${fib(9)}        # fib(9) = 34 candidates
MUTATION_RATE = ${PSI_SQ.toFixed(6)}    # PSI^2 ≈ 0.382
CROSSOVER_RATE = ${PSI.toFixed(6)}      # PSI ≈ 0.618
MAX_GENERATIONS = ${fib(7)}             # fib(7) = 13
CHECKPOINT_INTERVAL = ${this.checkpointInterval}

print(json.dumps({"level": "INFO", "service": "colab-gamma", "message": "setup_complete"}))`),

      makeCell('code', `# === Monte Carlo Simulation Engine ===
class MonteCarloEngine:
    def __init__(self, num_sims=MONTE_CARLO_SIMS):
        self.num_sims = num_sims
        self.results_history = []
    
    def simulate(self, scenario_fn, params, confidence=${CSL_THRESHOLDS.HIGH.toFixed(6)}):
        """Run Monte Carlo simulation with phi-scaled parameters"""
        start = time.time()
        results = []
        
        for i in range(self.num_sims):
            result = scenario_fn(params, seed=i)
            results.append(result)
        
        results_np = np.array(results)
        mean = float(np.mean(results_np))
        std = float(np.std(results_np))
        ci = stats.norm.interval(confidence, loc=mean, scale=std / np.sqrt(len(results)))
        
        output = {
            "mean": round(mean, 6),
            "std": round(std, 6),
            "confidence_interval": [round(ci[0], 6), round(ci[1], 6)],
            "confidence_level": confidence,
            "num_simulations": self.num_sims,
            "min": round(float(np.min(results_np)), 6),
            "max": round(float(np.max(results_np)), 6),
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
        self.results_history.append(output)
        print(json.dumps({"level": "INFO", "service": "colab-gamma", "message": "mc_simulation_complete", **output}))
        return output

mc = MonteCarloEngine()

# Test simulation
def test_scenario(params, seed=0):
    rng = np.random.RandomState(seed)
    return rng.normal(params.get("mu", 0), params.get("sigma", 1))

mc.simulate(test_scenario, {"mu": PHI, "sigma": PSI})`),

      makeCell('code', `# === Evolution Engine ===
class EvolutionEngine:
    def __init__(self, dim=EMBEDDING_DIM, pop_size=EVOLUTION_POPULATION):
        self.dim = dim
        self.pop_size = pop_size
        self.generation = 0
        self.best_fitness = -float('inf')
        self.best_individual = None
    
    def initialize_population(self):
        pop = np.random.randn(self.pop_size, self.dim).astype(np.float32)
        norms = np.linalg.norm(pop, axis=1, keepdims=True)
        return pop / norms
    
    def evaluate(self, population, fitness_fn):
        return np.array([fitness_fn(ind) for ind in population])
    
    def select(self, population, fitness):
        # Phi-weighted tournament selection
        selected = []
        for _ in range(self.pop_size):
            candidates = random.sample(range(len(population)), min(${fib(5)}, len(population)))
            winner = max(candidates, key=lambda i: fitness[i])
            selected.append(population[winner].copy())
        return np.array(selected)
    
    def crossover(self, parent1, parent2):
        if random.random() > CROSSOVER_RATE:
            return parent1.copy()
        # Phi-point crossover
        point = int(self.dim * PSI)
        child = np.concatenate([parent1[:point], parent2[point:]])
        norm = np.linalg.norm(child)
        return child / norm if norm > 0 else child
    
    def mutate(self, individual):
        if random.random() > MUTATION_RATE:
            return individual
        # Gaussian mutation scaled by PSI^2
        noise = np.random.randn(self.dim).astype(np.float32) * float(PSI ** 2)
        mutated = individual + noise
        norm = np.linalg.norm(mutated)
        return mutated / norm if norm > 0 else mutated
    
    def evolve(self, fitness_fn, max_generations=MAX_GENERATIONS):
        start = time.time()
        population = self.initialize_population()
        
        for gen in range(max_generations):
            fitness = self.evaluate(population, fitness_fn)
            best_idx = np.argmax(fitness)
            
            if fitness[best_idx] > self.best_fitness:
                self.best_fitness = float(fitness[best_idx])
                self.best_individual = population[best_idx].copy()
            
            selected = self.select(population, fitness)
            new_pop = []
            for i in range(0, self.pop_size, 2):
                p1, p2 = selected[i], selected[min(i+1, self.pop_size-1)]
                c1 = self.mutate(self.crossover(p1, p2))
                c2 = self.mutate(self.crossover(p2, p1))
                new_pop.extend([c1, c2])
            
            population = np.array(new_pop[:self.pop_size])
            self.generation = gen + 1
        
        return {
            "best_fitness": round(self.best_fitness, 6),
            "generations": self.generation,
            "population_size": self.pop_size,
            "dimension": self.dim,
            "latency_ms": round((time.time() - start) * 1000, 2),
        }

evo = EvolutionEngine()
result = evo.evolve(lambda ind: -float(np.sum((ind - np.ones(${EMBEDDING_DIM}) / np.sqrt(${EMBEDDING_DIM}))**2)))
print(json.dumps({"level": "INFO", "service": "colab-gamma", "message": "evolution_test_complete", **result}))`),
    ];

    const nb = makeNotebook(cells);
    logger.info('notebook_generated', { runtime: 'gamma', role: 'training-evolution', cells: cells.length });
    return nb;
  }

  generateAll() {
    return {
      alpha: this.generateAlphaNotebook(),
      beta: this.generateBetaNotebook(),
      gamma: this.generateGammaNotebook(),
    };
  }

  saveAll(basePath) {
    const fs = require('fs');
    const path = require('path');
    const notebooks = this.generateAll();

    const files = {};
    for (const [name, nb] of Object.entries(notebooks)) {
      const filePath = path.join(basePath, `heady-runtime-${name}.ipynb`);
      fs.writeFileSync(filePath, JSON.stringify(nb, null, 2), 'utf8');
      files[name] = filePath;
      logger.info('notebook_saved', { runtime: name, path: filePath });
    }

    return files;
  }
}

module.exports = { NotebookTemplateGenerator };
