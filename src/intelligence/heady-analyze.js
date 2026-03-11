/**
 * Heady™ HeadyAnalyze — Deep Root Cause Analysis Engine
 * CSL-gated diagnostics with 384D embedding comparison and symptom→cause graph traversal.
 * Receives drift/failure events from HeadyPatterns, performs multi-layer root cause
 * analysis, and produces actionable diagnosis reports for HeadyMC strategy evaluation.
 *
 * All numeric constants derived from φ — zero magic numbers.
 *
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents
 * @module heady-analyze
 * @version 1.0.0
 */

'use strict';

const {
  PHI, PSI, PSI_SQ, PSI_CUBE,
  fibonacci, phiThreshold, phiBackoff, phiFusionWeights,
  CSL_THRESHOLDS, TIMING, SERVICE_PORTS,
  cosineSimilarity, cslGate, cslBlend, adaptiveTemperature,
  cslAND, cslOR, cslNOT, cslIMPLY, cslCONSENSUS,
  SIZING, POOL_SIZES, PHI_TEMPERATURE,
  phiPriorityScore, phiAdaptiveInterval,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');
const { createHealthCheck } = require('../../shared/health');

const logger = createLogger('heady-analyze');

// ═══════════════════════════════════════════════════════════
// CONSTANTS — All Phi/Fibonacci Derived
// ═══════════════════════════════════════════════════════════

const MAX_CAUSAL_DEPTH = fibonacci(6);              // 8 levels deep in cause chain
const MAX_SYMPTOMS_PER_ANALYSIS = fibonacci(8);     // 21 symptoms per investigation
const MAX_HYPOTHESES = fibonacci(7);                // 13 competing hypotheses
const ANALYSIS_TIMEOUT_MS = fibonacci(13) * 1000;   // 233 seconds
const HISTORY_BUFFER_SIZE = fibonacci(14);           // 377 past analyses
const EVIDENCE_CACHE_SIZE = fibonacci(16);           // 987 evidence entries
const CORRELATION_WINDOW_MS = fibonacci(11) * 1000;  // 89 seconds for temporal correlation
const MIN_EVIDENCE_STRENGTH = CSL_THRESHOLDS.LOW;   // ≈ 0.691 — minimum to consider evidence
const DIAGNOSIS_CONFIDENCE_THRESHOLD = CSL_THRESHOLDS.MEDIUM; // ≈ 0.809 — confident diagnosis
const ROOT_CAUSE_THRESHOLD = CSL_THRESHOLDS.HIGH;   // ≈ 0.882 — root cause identification

// Analysis dimensions — phi-weighted importance
const ANALYSIS_DIMENSIONS = Object.freeze({
  temporal:    { weight: phiFusionWeights(5)[0], label: 'Temporal Correlation' },    // ≈ 0.387
  structural:  { weight: phiFusionWeights(5)[1], label: 'Structural Proximity' },   // ≈ 0.239
  semantic:    { weight: phiFusionWeights(5)[2], label: 'Semantic Similarity' },     // ≈ 0.148
  behavioral:  { weight: phiFusionWeights(5)[3], label: 'Behavioral Pattern' },      // ≈ 0.092
  statistical: { weight: phiFusionWeights(5)[4], label: 'Statistical Anomaly' },     // ≈ 0.057
});

const DIMENSION_KEYS = Object.keys(ANALYSIS_DIMENSIONS);

// Symptom categories
const SYMPTOM_TYPES = Object.freeze({
  LATENCY_SPIKE:      'latency_spike',
  ERROR_BURST:        'error_burst',
  THROUGHPUT_DROP:     'throughput_drop',
  MEMORY_PRESSURE:    'memory_pressure',
  CONNECTION_FAILURE:  'connection_failure',
  COHERENCE_DRIFT:    'coherence_drift',
  EMBEDDING_ANOMALY:  'embedding_anomaly',
  CASCADE_FAILURE:    'cascade_failure',
  RESOURCE_EXHAUSTION: 'resource_exhaustion',
  CONFIG_MISMATCH:    'config_mismatch',
  AUTH_FAILURE:       'auth_failure',
  DATA_CORRUPTION:    'data_corruption',
  TIMEOUT:            'timeout',
});

// ═══════════════════════════════════════════════════════════
// EVIDENCE COLLECTOR
// ═══════════════════════════════════════════════════════════

class EvidenceCollector {
  constructor() {
    this._cache = new Map();
    this._temporalIndex = [];
  }

  /**
   * Record a piece of evidence.
   * @param {Object} evidence
   * @param {string} evidence.source — originating service/component
   * @param {string} evidence.type — symptom type
   * @param {number} evidence.timestamp — when observed
   * @param {number} evidence.severity — 0..1 severity score
   * @param {Object} [evidence.metadata] — additional context
   * @param {Array<number>} [evidence.embedding] — 384D embedding
   */
  record(evidence) {
    const id = `${evidence.source}:${evidence.type}:${evidence.timestamp}`;
    const entry = {
      id,
      ...evidence,
      timestamp: evidence.timestamp || Date.now(),
      recordedAt: Date.now(),
    };

    this._cache.set(id, entry);
    this._temporalIndex.push(entry);

    // Evict oldest if over capacity
    if (this._cache.size > EVIDENCE_CACHE_SIZE) {
      const oldest = this._temporalIndex.shift();
      if (oldest) this._cache.delete(oldest.id);
    }

    return entry;
  }

  /**
   * Get evidence within a time window.
   * @param {number} windowMs — time window in milliseconds
   * @param {string} [source] — filter by source
   * @returns {Array<Object>}
   */
  getRecent(windowMs = CORRELATION_WINDOW_MS, source = null) {
    const cutoff = Date.now() - windowMs;
    return this._temporalIndex.filter(e =>
      e.timestamp >= cutoff && (!source || e.source === source)
    );
  }

  /**
   * Find evidence correlated with a given event.
   * @param {Object} event — the primary event
   * @param {number} [windowMs] — correlation window
   * @returns {Array<Object>}
   */
  findCorrelated(event, windowMs = CORRELATION_WINDOW_MS) {
    const start = event.timestamp - windowMs;
    const end = event.timestamp + windowMs;
    return this._temporalIndex.filter(e =>
      e.timestamp >= start && e.timestamp <= end && e.id !== event.id
    );
  }

  get size() { return this._cache.size; }

  clear() {
    this._cache.clear();
    this._temporalIndex = [];
  }
}

// ═══════════════════════════════════════════════════════════
// HYPOTHESIS ENGINE
// ═══════════════════════════════════════════════════════════

class Hypothesis {
  /**
   * @param {string} cause — proposed root cause description
   * @param {string} category — cause category
   * @param {Array<Object>} supportingEvidence — evidence supporting this hypothesis
   */
  constructor(cause, category, supportingEvidence = []) {
    this.id = `hyp-${Date.now()}-${Math.random().toString(36).substring(2, fibonacci(6))}`;
    this.cause = cause;
    this.category = category;
    this.evidence = supportingEvidence;
    this.scores = {};
    this.compositeScore = 0;
    this.refutations = [];
    this.createdAt = Date.now();
  }

  /**
   * Score this hypothesis across all analysis dimensions.
   * @param {Object} dimensionScores — { temporal: 0.8, structural: 0.6, ... }
   */
  scoreDimensions(dimensionScores) {
    this.scores = { ...dimensionScores };
    // Composite = phi-weighted fusion of dimension scores
    const weights = DIMENSION_KEYS.map(k => ANALYSIS_DIMENSIONS[k].weight);
    const values = DIMENSION_KEYS.map(k => dimensionScores[k] || 0);
    this.compositeScore = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  }

  /**
   * Add refuting evidence.
   * @param {string} reason
   * @param {number} strength — 0..1
   */
  refute(reason, strength) {
    this.refutations.push({ reason, strength, timestamp: Date.now() });
    // Reduce composite score by refutation strength × ψ
    this.compositeScore *= (1 - strength * PSI);
  }

  toJSON() {
    return {
      id: this.id,
      cause: this.cause,
      category: this.category,
      scores: this.scores,
      compositeScore: Math.round(this.compositeScore * 1000) / 1000,
      evidenceCount: this.evidence.length,
      refutationCount: this.refutations.length,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// CAUSAL GRAPH
// ═══════════════════════════════════════════════════════════

class CausalGraph {
  constructor() {
    this._nodes = new Map(); // cause → { cause, effects: Set, parents: Set, depth, embedding }
    this._edges = [];        // { from, to, strength, type }
  }

  /**
   * Add a causal relationship.
   * @param {string} cause
   * @param {string} effect
   * @param {number} strength — 0..1 causal strength
   * @param {string} [type='direct'] — direct, indirect, amplifying, masking
   */
  addEdge(cause, effect, strength, type = 'direct') {
    if (!this._nodes.has(cause)) {
      this._nodes.set(cause, { cause, effects: new Set(), parents: new Set(), depth: 0, embedding: null });
    }
    if (!this._nodes.has(effect)) {
      this._nodes.set(effect, { cause: effect, effects: new Set(), parents: new Set(), depth: 0, embedding: null });
    }

    this._nodes.get(cause).effects.add(effect);
    this._nodes.get(effect).parents.add(cause);
    this._edges.push({ from: cause, to: effect, strength, type });
  }

  /**
   * Traverse from symptom to root causes (backward chaining).
   * @param {string} symptom
   * @param {number} [maxDepth=MAX_CAUSAL_DEPTH]
   * @returns {Array<{cause: string, path: Array<string>, strength: number}>}
   */
  traceRootCauses(symptom, maxDepth = MAX_CAUSAL_DEPTH) {
    const results = [];
    const visited = new Set();

    const dfs = (node, path, cumulativeStrength, depth) => {
      if (depth > maxDepth || visited.has(node)) return;
      visited.add(node);

      const nodeData = this._nodes.get(node);
      if (!nodeData) return;

      if (nodeData.parents.size === 0 && path.length > 0) {
        // This is a root cause (no parents)
        results.push({ cause: node, path: [...path], strength: cumulativeStrength });
        return;
      }

      for (const parent of nodeData.parents) {
        const edge = this._edges.find(e => e.from === parent && e.to === node);
        const edgeStrength = edge ? edge.strength : PSI;
        dfs(parent, [...path, node], cumulativeStrength * edgeStrength, depth + 1);
      }
    };

    dfs(symptom, [], 1.0, 0);

    // Sort by cumulative strength descending
    results.sort((a, b) => b.strength - a.strength);
    return results;
  }

  /**
   * Traverse from cause to all effects (forward chaining).
   * @param {string} cause
   * @param {number} [maxDepth=MAX_CAUSAL_DEPTH]
   * @returns {Array<{effect: string, depth: number, strength: number}>}
   */
  traceEffects(cause, maxDepth = MAX_CAUSAL_DEPTH) {
    const results = [];
    const visited = new Set();

    const bfs = (queue) => {
      while (queue.length > 0) {
        const { node, depth, strength } = queue.shift();
        if (depth > maxDepth || visited.has(node)) continue;
        visited.add(node);

        const nodeData = this._nodes.get(node);
        if (!nodeData) continue;

        if (depth > 0) {
          results.push({ effect: node, depth, strength });
        }

        for (const effect of nodeData.effects) {
          const edge = this._edges.find(e => e.from === node && e.to === effect);
          const edgeStrength = edge ? edge.strength : PSI;
          queue.push({ node: effect, depth: depth + 1, strength: strength * edgeStrength });
        }
      }
    };

    bfs([{ node: cause, depth: 0, strength: 1.0 }]);
    return results;
  }

  /**
   * Find the single most likely root cause for a symptom.
   */
  findPrimaryRootCause(symptom) {
    const roots = this.traceRootCauses(symptom);
    return roots.length > 0 ? roots[0] : null;
  }

  get nodeCount() { return this._nodes.size; }
  get edgeCount() { return this._edges.length; }
}

// ═══════════════════════════════════════════════════════════
// HEADY ANALYZE — MAIN ENGINE
// ═══════════════════════════════════════════════════════════

class HeadyAnalyze {
  /**
   * @param {Object} options
   * @param {Object} [options.pgClient] — PgVectorClient for embedding queries
   * @param {Object} [options.conductor] — HeadyConductor for service topology
   * @param {Object} [options.patterns] — HeadyPatterns for drift classification
   */
  constructor(options = {}) {
    this.pgClient = options.pgClient || null;
    this.conductor = options.conductor || null;
    this.patterns = options.patterns || null;

    this.evidenceCollector = new EvidenceCollector();
    this.causalGraph = new CausalGraph();
    this.analysisHistory = [];
    this._heartbeatInterval = null;
    this._active = false;

    // Build known causal relationships
    this._buildKnownCausalGraph();

    logger.info({ msg: 'HeadyAnalyze initialized', knownCauses: this.causalGraph.nodeCount });
  }

  /**
   * Pre-populate the causal graph with known system relationships.
   * These are architectural invariants — if A fails, B is affected.
   */
  _buildKnownCausalGraph() {
    const g = this.causalGraph;

    // Infrastructure → Service cascades
    g.addEdge('pgvector_down', 'memory_service_failure', CSL_THRESHOLDS.CRITICAL);
    g.addEdge('pgvector_down', 'embedding_search_failure', CSL_THRESHOLDS.HIGH);
    g.addEdge('nats_down', 'event_delivery_failure', CSL_THRESHOLDS.CRITICAL);
    g.addEdge('nats_down', 'swarm_coordination_failure', CSL_THRESHOLDS.HIGH);
    g.addEdge('redis_down', 'cache_miss_spike', CSL_THRESHOLDS.HIGH);
    g.addEdge('redis_down', 'session_lookup_failure', CSL_THRESHOLDS.HIGH);

    // Memory cascades
    g.addEdge('memory_service_failure', 'coherence_drift', CSL_THRESHOLDS.HIGH);
    g.addEdge('memory_service_failure', 'context_assembly_failure', CSL_THRESHOLDS.CRITICAL);
    g.addEdge('embedding_search_failure', 'retrieval_quality_drop', CSL_THRESHOLDS.HIGH);

    // Orchestration cascades
    g.addEdge('conductor_overload', 'task_routing_delay', CSL_THRESHOLDS.HIGH);
    g.addEdge('conductor_overload', 'backpressure_spike', CSL_THRESHOLDS.MEDIUM);
    g.addEdge('swarm_coordination_failure', 'consensus_timeout', CSL_THRESHOLDS.HIGH);
    g.addEdge('bee_factory_failure', 'worker_spawn_failure', CSL_THRESHOLDS.HIGH);

    // Resource exhaustion
    g.addEdge('connection_pool_exhausted', 'pgvector_down', CSL_THRESHOLDS.HIGH, 'indirect');
    g.addEdge('memory_pressure_critical', 'oom_kill', CSL_THRESHOLDS.CRITICAL);
    g.addEdge('oom_kill', 'service_restart', CSL_THRESHOLDS.CRITICAL);

    // Colab cascades
    g.addEdge('colab_runtime_disconnect', 'gpu_inference_failure', CSL_THRESHOLDS.CRITICAL);
    g.addEdge('gpu_inference_failure', 'embedding_fallback_to_cpu', CSL_THRESHOLDS.HIGH);
    g.addEdge('embedding_fallback_to_cpu', 'latency_spike', CSL_THRESHOLDS.MEDIUM);

    // Auth cascades
    g.addEdge('firebase_auth_failure', 'session_creation_failure', CSL_THRESHOLDS.CRITICAL);
    g.addEdge('session_creation_failure', 'user_lockout', CSL_THRESHOLDS.HIGH);
    g.addEdge('mtls_cert_expired', 'inter_service_auth_failure', CSL_THRESHOLDS.CRITICAL);

    // Quality cascades
    g.addEdge('quality_gate_failure', 'deployment_blocked', CSL_THRESHOLDS.HIGH);
    g.addEdge('assurance_cert_expired', 'deployment_blocked', CSL_THRESHOLDS.MEDIUM);
  }

  /**
   * Perform a full root cause analysis for a set of symptoms.
   * @param {Array<Object>} symptoms — observed symptoms
   * @param {Object} [context] — additional context (service graph, recent changes, etc.)
   * @returns {Object} — analysis report with hypotheses, root cause, and recommendations
   */
  async analyze(symptoms, context = {}) {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, fibonacci(6))}`;
    const startTime = Date.now();

    logger.info({
      analysisId,
      symptomCount: symptoms.length,
      msg: 'Starting root cause analysis',
    });

    // Record all symptoms as evidence
    for (const symptom of symptoms.slice(0, MAX_SYMPTOMS_PER_ANALYSIS)) {
      this.evidenceCollector.record({
        source: symptom.source || 'unknown',
        type: symptom.type || SYMPTOM_TYPES.ERROR_BURST,
        timestamp: symptom.timestamp || Date.now(),
        severity: symptom.severity || PSI,
        metadata: symptom.metadata || {},
        embedding: symptom.embedding || null,
      });
    }

    // Phase 1: Temporal correlation — find co-occurring events
    const temporalCorrelations = this._analyzeTemporalCorrelation(symptoms);

    // Phase 2: Structural analysis — map symptoms to service topology
    const structuralAnalysis = this._analyzeStructuralProximity(symptoms, context);

    // Phase 3: Semantic analysis — compare symptom embeddings
    const semanticAnalysis = await this._analyzeSemanticSimilarity(symptoms);

    // Phase 4: Behavioral pattern matching — check against known patterns
    const behavioralAnalysis = this._analyzeBehavioralPatterns(symptoms);

    // Phase 5: Statistical anomaly detection
    const statisticalAnalysis = this._analyzeStatisticalAnomalies(symptoms);

    // Phase 6: Generate hypotheses
    const hypotheses = this._generateHypotheses(
      symptoms, temporalCorrelations, structuralAnalysis,
      semanticAnalysis, behavioralAnalysis, statisticalAnalysis
    );

    // Phase 7: Score and rank hypotheses
    for (const hyp of hypotheses) {
      hyp.scoreDimensions({
        temporal: temporalCorrelations.scores[hyp.category] || 0,
        structural: structuralAnalysis.scores[hyp.category] || 0,
        semantic: semanticAnalysis.scores[hyp.category] || 0,
        behavioral: behavioralAnalysis.scores[hyp.category] || 0,
        statistical: statisticalAnalysis.scores[hyp.category] || 0,
      });
    }

    // Sort by composite score
    hypotheses.sort((a, b) => b.compositeScore - a.compositeScore);

    // Phase 8: Graph traversal — trace root causes
    const graphResults = [];
    for (const symptom of symptoms.slice(0, fibonacci(5))) {
      const typeKey = symptom.type || 'unknown';
      const roots = this.causalGraph.traceRootCauses(typeKey);
      if (roots.length > 0) {
        graphResults.push({ symptom: typeKey, rootCauses: roots });
      }
    }

    // Phase 9: Build diagnosis report
    const topHypothesis = hypotheses[0] || null;
    const isConfident = topHypothesis && topHypothesis.compositeScore >= DIAGNOSIS_CONFIDENCE_THRESHOLD;
    const isRootCauseIdentified = topHypothesis && topHypothesis.compositeScore >= ROOT_CAUSE_THRESHOLD;

    const report = {
      analysisId,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      symptomCount: symptoms.length,
      diagnosis: {
        confident: isConfident,
        rootCauseIdentified: isRootCauseIdentified,
        primaryHypothesis: topHypothesis ? topHypothesis.toJSON() : null,
        alternativeHypotheses: hypotheses.slice(1, fibonacci(5)).map(h => h.toJSON()),
        confidenceScore: topHypothesis ? topHypothesis.compositeScore : 0,
      },
      dimensions: {
        temporal: temporalCorrelations.summary,
        structural: structuralAnalysis.summary,
        semantic: semanticAnalysis.summary,
        behavioral: behavioralAnalysis.summary,
        statistical: statisticalAnalysis.summary,
      },
      causalGraph: {
        tracedPaths: graphResults,
        knownNodes: this.causalGraph.nodeCount,
        knownEdges: this.causalGraph.edgeCount,
      },
      recommendations: this._generateRecommendations(topHypothesis, graphResults, isRootCauseIdentified),
    };

    // Store in history
    this.analysisHistory.push(report);
    if (this.analysisHistory.length > HISTORY_BUFFER_SIZE) {
      this.analysisHistory = this.analysisHistory.slice(-HISTORY_BUFFER_SIZE);
    }

    logger.info({
      analysisId,
      confident: isConfident,
      rootCauseIdentified: isRootCauseIdentified,
      primaryCause: topHypothesis?.cause,
      score: topHypothesis?.compositeScore,
      duration: report.duration,
      msg: 'Root cause analysis complete',
    });

    return report;
  }

  // ─── Phase 1: Temporal Correlation ───

  _analyzeTemporalCorrelation(symptoms) {
    const scores = {};
    const clusters = [];

    // Group symptoms by time proximity
    const sorted = [...symptoms].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    let currentCluster = [];

    for (let i = 0; i < sorted.length; i++) {
      if (currentCluster.length === 0) {
        currentCluster.push(sorted[i]);
        continue;
      }

      const lastTs = currentCluster[currentCluster.length - 1].timestamp || 0;
      const thisTs = sorted[i].timestamp || 0;

      if (thisTs - lastTs <= CORRELATION_WINDOW_MS) {
        currentCluster.push(sorted[i]);
      } else {
        if (currentCluster.length > 1) clusters.push([...currentCluster]);
        currentCluster = [sorted[i]];
      }
    }
    if (currentCluster.length > 1) clusters.push(currentCluster);

    // Score categories based on cluster co-occurrence
    for (const cluster of clusters) {
      const types = new Set(cluster.map(s => s.type || 'unknown'));
      for (const type of types) {
        scores[type] = Math.min(
          (scores[type] || 0) + cluster.length / MAX_SYMPTOMS_PER_ANALYSIS,
          1.0
        );
      }
    }

    return {
      scores,
      summary: {
        clusterCount: clusters.length,
        largestCluster: clusters.reduce((max, c) => Math.max(max, c.length), 0),
        correlationWindow: CORRELATION_WINDOW_MS,
      },
    };
  }

  // ─── Phase 2: Structural Proximity ───

  _analyzeStructuralProximity(symptoms, context) {
    const scores = {};
    const serviceGraph = context.serviceGraph || {};

    // Group symptoms by source service
    const bySource = {};
    for (const s of symptoms) {
      const source = s.source || 'unknown';
      if (!bySource[source]) bySource[source] = [];
      bySource[source].push(s);
    }

    // Score based on service connectivity — if multiple affected services share a dependency, that dependency scores higher
    const sourceCounts = Object.keys(bySource).length;
    for (const [source, syms] of Object.entries(bySource)) {
      const category = syms[0]?.type || 'unknown';
      // More sources affected → higher structural score
      const structuralScore = cslGate(
        syms.length / MAX_SYMPTOMS_PER_ANALYSIS,
        sourceCounts / fibonacci(5),
        CSL_THRESHOLDS.MINIMUM,
        PHI_TEMPERATURE
      );
      scores[category] = Math.max(scores[category] || 0, structuralScore);
    }

    return {
      scores,
      summary: {
        affectedSources: sourceCounts,
        symptomsBySource: Object.fromEntries(
          Object.entries(bySource).map(([k, v]) => [k, v.length])
        ),
      },
    };
  }

  // ─── Phase 3: Semantic Similarity ───

  async _analyzeSemanticSimilarity(symptoms) {
    const scores = {};

    // Compare symptom embeddings pairwise
    const withEmbeddings = symptoms.filter(s => s.embedding && s.embedding.length > 0);

    if (withEmbeddings.length < 2) {
      return { scores, summary: { pairsCompared: 0, averageSimilarity: 0 } };
    }

    let totalSim = 0;
    let pairCount = 0;

    for (let i = 0; i < withEmbeddings.length - 1; i++) {
      for (let j = i + 1; j < withEmbeddings.length; j++) {
        const sim = cosineSimilarity(withEmbeddings[i].embedding, withEmbeddings[j].embedding);
        totalSim += sim;
        pairCount++;

        // If highly similar symptoms from different sources → common cause
        if (sim >= CSL_THRESHOLDS.HIGH) {
          const category = withEmbeddings[i].type || 'unknown';
          scores[category] = Math.max(scores[category] || 0, sim);
        }
      }
    }

    return {
      scores,
      summary: {
        pairsCompared: pairCount,
        averageSimilarity: pairCount > 0 ? Math.round((totalSim / pairCount) * 1000) / 1000 : 0,
        highSimilarityPairs: Object.values(scores).filter(s => s >= CSL_THRESHOLDS.HIGH).length,
      },
    };
  }

  // ─── Phase 4: Behavioral Patterns ───

  _analyzeBehavioralPatterns(symptoms) {
    const scores = {};

    // Known behavioral signatures
    const SIGNATURES = {
      cascade_failure: {
        pattern: (syms) => {
          // Multiple services failing within seconds → cascade
          const sources = new Set(syms.map(s => s.source));
          return sources.size >= fibonacci(3) && syms.length >= fibonacci(5);
        },
      },
      resource_exhaustion: {
        pattern: (syms) => {
          // Increasing severity over time
          const sorted = [...syms].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          let increasing = 0;
          for (let i = 1; i < sorted.length; i++) {
            if ((sorted[i].severity || 0) > (sorted[i - 1].severity || 0)) increasing++;
          }
          return sorted.length > 1 && increasing / (sorted.length - 1) > PSI;
        },
      },
      periodic_failure: {
        pattern: (syms) => {
          // Regular intervals between failures
          if (syms.length < fibonacci(4)) return false;
          const sorted = [...syms].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const intervals = [];
          for (let i = 1; i < sorted.length; i++) {
            intervals.push((sorted[i].timestamp || 0) - (sorted[i - 1].timestamp || 0));
          }
          if (intervals.length === 0) return false;
          const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const variance = intervals.reduce((s, v) => s + (v - avg) ** 2, 0) / intervals.length;
          const cv = Math.sqrt(variance) / avg;
          return cv < PSI_SQ; // Low coefficient of variation → periodic
        },
      },
    };

    for (const [name, sig] of Object.entries(SIGNATURES)) {
      if (sig.pattern(symptoms)) {
        scores[name] = CSL_THRESHOLDS.HIGH;
      }
    }

    return {
      scores,
      summary: {
        matchedPatterns: Object.keys(scores),
        patternCount: Object.keys(scores).length,
      },
    };
  }

  // ─── Phase 5: Statistical Anomalies ───

  _analyzeStatisticalAnomalies(symptoms) {
    const scores = {};

    if (symptoms.length === 0) {
      return { scores, summary: { anomalyCount: 0, meanSeverity: 0, stdDevSeverity: 0 } };
    }

    const severities = symptoms.map(s => s.severity || 0);
    const mean = severities.reduce((a, b) => a + b, 0) / severities.length;
    const variance = severities.reduce((s, v) => s + (v - mean) ** 2, 0) / severities.length;
    const stdDev = Math.sqrt(variance);

    // Flag anomalous symptoms (> φ standard deviations from mean)
    let anomalyCount = 0;
    for (const s of symptoms) {
      const z = stdDev > 0 ? Math.abs((s.severity || 0) - mean) / stdDev : 0;
      if (z > PHI) {
        anomalyCount++;
        const category = s.type || 'unknown';
        scores[category] = Math.max(scores[category] || 0, Math.min(z / PHI, 1.0));
      }
    }

    return {
      scores,
      summary: {
        anomalyCount,
        meanSeverity: Math.round(mean * 1000) / 1000,
        stdDevSeverity: Math.round(stdDev * 1000) / 1000,
        zThreshold: PHI,
      },
    };
  }

  // ─── Phase 6: Hypothesis Generation ───

  _generateHypotheses(symptoms, temporal, structural, semantic, behavioral, statistical) {
    const hypotheses = [];

    // Extract unique symptom types
    const types = [...new Set(symptoms.map(s => s.type || 'unknown'))];

    // Hypothesis from temporal clusters
    if (temporal.summary.clusterCount > 0) {
      hypotheses.push(new Hypothesis(
        'Correlated failure — multiple symptoms co-occurring suggest shared root cause',
        'cascade_failure',
        symptoms,
      ));
    }

    // Hypothesis from structural proximity
    if (structural.summary.affectedSources >= fibonacci(3)) {
      hypotheses.push(new Hypothesis(
        `Multi-service failure across ${structural.summary.affectedSources} sources — infrastructure dependency likely`,
        'infrastructure_failure',
        symptoms,
      ));
    }

    // Hypothesis from behavioral patterns
    for (const pattern of behavioral.summary.matchedPatterns) {
      hypotheses.push(new Hypothesis(
        `Behavioral pattern match: ${pattern}`,
        pattern,
        symptoms,
      ));
    }

    // Hypothesis from statistical anomalies
    if (statistical.summary.anomalyCount > 0) {
      hypotheses.push(new Hypothesis(
        `Statistical anomaly — ${statistical.summary.anomalyCount} symptoms exceed φ standard deviations`,
        'statistical_anomaly',
        symptoms.filter(s => (s.severity || 0) > statistical.summary.meanSeverity + PHI * statistical.summary.stdDevSeverity),
      ));
    }

    // Hypothesis per symptom type
    for (const type of types) {
      const typeSymptoms = symptoms.filter(s => s.type === type);
      if (typeSymptoms.length >= fibonacci(3)) {
        hypotheses.push(new Hypothesis(
          `Recurring ${type} — ${typeSymptoms.length} occurrences suggest systematic issue`,
          type,
          typeSymptoms,
        ));
      }
    }

    // Causal graph-derived hypotheses
    for (const type of types) {
      const roots = this.causalGraph.traceRootCauses(type);
      for (const root of roots.slice(0, fibonacci(3))) {
        hypotheses.push(new Hypothesis(
          `Graph-traced root cause: ${root.cause} → ${type} (path length: ${root.path.length})`,
          root.cause,
          symptoms.filter(s => s.type === type),
        ));
      }
    }

    return hypotheses.slice(0, MAX_HYPOTHESES);
  }

  // ─── Phase 9: Recommendations ───

  _generateRecommendations(topHypothesis, graphResults, isRootCauseIdentified) {
    const recommendations = [];

    if (!topHypothesis) {
      recommendations.push({
        action: 'gather_more_data',
        description: 'Insufficient evidence for diagnosis — collect more symptoms and retry',
        urgency: PSI,
      });
      return recommendations;
    }

    if (isRootCauseIdentified) {
      recommendations.push({
        action: 'fix_root_cause',
        description: `Address root cause: ${topHypothesis.cause}`,
        urgency: topHypothesis.compositeScore,
      });
    }

    // Check if graph reveals cascade potential
    if (graphResults.length > 0) {
      const cascadeTargets = [];
      for (const gr of graphResults) {
        for (const rc of gr.rootCauses) {
          const effects = this.causalGraph.traceEffects(rc.cause);
          if (effects.length >= fibonacci(3)) {
            cascadeTargets.push({ cause: rc.cause, affectedCount: effects.length });
          }
        }
      }

      if (cascadeTargets.length > 0) {
        recommendations.push({
          action: 'circuit_break',
          description: `Isolate cascade source — ${cascadeTargets[0].cause} affects ${cascadeTargets[0].affectedCount} downstream components`,
          urgency: CSL_THRESHOLDS.HIGH,
        });
      }
    }

    // Strategy recommendation for HeadyMC
    recommendations.push({
      action: 'evaluate_strategies',
      description: 'Forward to HeadyMC for Monte Carlo strategy evaluation',
      urgency: topHypothesis.compositeScore * PSI,
      strategies: this._suggestStrategies(topHypothesis),
    });

    return recommendations;
  }

  _suggestStrategies(hypothesis) {
    const strategies = [];
    const cat = hypothesis.category;

    if (cat.includes('failure') || cat.includes('down')) {
      strategies.push('restart', 'rollback', 'reroute');
    }
    if (cat.includes('exhaustion') || cat.includes('pressure')) {
      strategies.push('scale_out', 'reroute', 'quarantine');
    }
    if (cat.includes('drift') || cat.includes('anomaly')) {
      strategies.push('hot_patch', 'rollback', 'quarantine');
    }
    if (cat.includes('cascade')) {
      strategies.push('circuit_break', 'quarantine', 'scale_out');
    }

    return strategies.length > 0 ? strategies : ['restart', 'rollback', 'reroute'];
  }

  // ─── Service Lifecycle ───

  async start() {
    if (this._active) return;
    this._active = true;

    this._heartbeatInterval = setInterval(() => {
      logger.info({
        evidenceCount: this.evidenceCollector.size,
        analysisCount: this.analysisHistory.length,
        causalNodes: this.causalGraph.nodeCount,
        msg: 'HeadyAnalyze heartbeat',
      });
    }, TIMING.HEARTBEAT_MS);

    logger.info({ msg: 'HeadyAnalyze started' });
  }

  async stop() {
    this._active = false;
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
    logger.info({ msg: 'HeadyAnalyze stopped' });
  }

  health() {
    return {
      service: 'heady-analyze',
      status: this._active ? 'healthy' : 'stopped',
      evidenceCache: this.evidenceCollector.size,
      analysisCount: this.analysisHistory.length,
      causalGraph: { nodes: this.causalGraph.nodeCount, edges: this.causalGraph.edgeCount },
    };
  }
}

module.exports = { HeadyAnalyze, EvidenceCollector, CausalGraph, Hypothesis, SYMPTOM_TYPES };
