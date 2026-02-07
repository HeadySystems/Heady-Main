// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: backend/src/services/chatService.js
// LAYER: intelligence
// HEADY_BRAND:END

/**
 * Core HeadyBuddy Intelligence Service
 * Handles:
 * 1. Input classification (Overwhelm detection)
 * 2. LLM Orchestration
 * 3. Memory context injection
 */

const OVERWHELM_THRESHOLD = 10; // HCFP_03: Hard limit for "Today" surface

class ChatService {
  constructor() {
    this.memory = null; // Placeholder for Vector Store
  }

  async processMessage({ userId, message, context = {} }) {
    // 1. Detect Overwhelm Trigger
    const isOverwhelmed = this.detectOverwhelm(message, context.taskCount);
    
    if (isOverwhelmed) {
      return this.triggerOverwhelmProtocol();
    }

    // 2. Normal Companion Flow
    // In a real implementation, this calls the LLM with context
    return {
      type: "chat",
      content: `I hear you saying: "${message}". How can I help move one small stone today?`,
      metadata: { mode: "companion" }
    };
  }

  detectOverwhelm(text, taskCount = 0) {
    const panicPhrases = [
      "million things", "drowning", "too much", "overwhelmed", "can't do it", 
      "impossible", "everything at once"
    ];
    
    const hasPanicPhrase = panicPhrases.some(p => text.toLowerCase().includes(p));
    const hasTooManyTasks = taskCount > OVERWHELM_THRESHOLD;

    return hasPanicPhrase || hasTooManyTasks;
  }

  triggerOverwhelmProtocol() {
    return {
      type: "overwhelm_intervention",
      content: "I hear the volume. It feels heavy. We are not doing 100 things. We are doing **one**. Let's pick the one that makes the most noise stop. I've hidden the rest for now—they are safe, just not here.",
      metadata: {
        mode: "overwhelm",
        action: "narrow_focus",
        visible_tasks_cap: 3
      }
    };
  }
}

export default new ChatService();
