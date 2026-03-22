// HEADY_BRAND:BEGIN
// FILE: src/hc_semantic_hasher.js
// LAYER: backend/src
// HEADY_BRAND:END

/**
 * Heady Semantic Hasher
 * Synchronizes deterministically with Python's process_data.py
 * ensuring that data indexed in Python and Node.js yields the exact same similarityHash.
 */

const crypto = require('crypto');

function extractPatterns(content) {
  // Determine if it's JS or Python roughly based on content
  const isPython = content.includes('def ') || content.includes('import ') || content.includes('class ');
  let contentNoComments = content;

  if (isPython) {
    // Python-style comments
    contentNoComments = contentNoComments.replace(/#.*/g, '');
    contentNoComments = contentNoComments.replace(/""".*?"""/gs, '');
  } else {
    // JS-style comments
    contentNoComments = contentNoComments.replace(/(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '');
  }

  // Normalize whitespace: remove all spaces, tabs, newlines
  const normalized = contentNoComments.replace(/\s+/g, '');

  // Create a similarity hash of the normalized content
  const similarityHash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');

  // Identify basic pattern type (heuristic mirroring Python)
  let patternId = "generic_code";
  let description = "Standard code block";

  if (content.includes('def ') || content.includes('class ')) {
    patternId = "python_logic";
    description = "Python functional or class definition";
  } else if (content.includes('import ') || content.includes('from ')) {
    patternId = "module_imports";
    description = "Module import structure";
  } else if (content.includes('const ') || content.includes('async function')) {
    patternId = "javascript_logic";
    description = "JavaScript functional logic";
  }

  return {
    patternId,
    description,
    similarityHash
  };
}

module.exports = { extractPatterns };
