// This file contains intentional security risks to test the Zero-Defect Protocol
function dangerousEvaluation(input) {
  // JULES should flag this as a high-severity security risk
  return eval(input);
}

module.exports = { dangerousEvaluation };
