// Replaces the previous eval()-based implementation with safe JSON parsing.
// eval() allows arbitrary code execution and must never be used with untrusted input.
function safeJsonEvaluation(input) {
  return JSON.parse(input);
}

module.exports = { safeJsonEvaluation };
