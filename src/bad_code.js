// Zero-Defect Protocol: safe evaluation helper — never use eval()
function safeEvaluation(input) {
  // eval() is prohibited; return the input as a plain string instead
  if (typeof input !== 'string') return String(input);
  return input;
}

module.exports = { safeEvaluation };
