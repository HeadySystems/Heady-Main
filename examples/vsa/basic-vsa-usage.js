const pino = require('pino');
const logger = pino();
/**
 * @fileoverview Basic VSA Usage Example
 * @description Demonstrates core VSA operations
 */

const { Hypervector } = require('../src/vsa/hypervector');
const { VSACodebook } = require('../src/vsa/codebook');

logger.info('=== Heady VSA Basic Example ===\n');

// 1. Create random hypervectors
logger.info('1. Creating hypervectors...');
const catVector = Hypervector.random(4096);
const dogVector = Hypervector.random(4096);
const birdVector = Hypervector.random(4096);

logger.info(`   Cat vector: ${catVector.toString()}`);
logger.info(`   Dog vector: ${dogVector.toString()}`);
logger.info(`   Bird vector: ${birdVector.toString()}\n`);

// 2. Measure similarity (random vectors should be ~0)
logger.info('2. Measuring similarity...');
logger.info(`   Cat <-> Dog: ${catVector.similarity(dogVector).toFixed(4)}`);
logger.info(`   Cat <-> Bird: ${catVector.similarity(birdVector).toFixed(4)}`);
logger.info(`   Dog <-> Bird: ${dogVector.similarity(birdVector).toFixed(4)}\n`);

// 3. Binding operation (compositional)
logger.info('3. Binding CAT with DOG...');
const catDog = catVector.bind(dogVector);
logger.info(`   CAT ⊗ DOG similarity to CAT: ${catDog.similarity(catVector).toFixed(4)}`);
logger.info(`   CAT ⊗ DOG similarity to DOG: ${catDog.similarity(dogVector).toFixed(4)}`);
logger.info(`   CAT ⊗ DOG is orthogonal to both\n`);

// 4. Bundling operation (superposition)
logger.info('4. Bundling animals...');
const animals = catVector.bundle([dogVector, birdVector]);
logger.info(`   ANIMALS similarity to CAT: ${animals.similarity(catVector).toFixed(4)}`);
logger.info(`   ANIMALS similarity to DOG: ${animals.similarity(dogVector).toFixed(4)}`);
logger.info(`   ANIMALS similarity to BIRD: ${animals.similarity(birdVector).toFixed(4)}`);
logger.info(`   ANIMALS is similar to all constituents\n`);

// 5. Using a codebook
logger.info('5. Creating codebook...');
const codebook = new VSACodebook(4096);

// Add concepts
codebook.add('CAT', catVector);
codebook.add('DOG', dogVector);
codebook.add('BIRD', birdVector);
codebook.add('FISH', Hypervector.random(4096));

// Create composite
codebook.bundle('ANIMALS', ['CAT', 'DOG', 'BIRD']);

logger.info(`   Codebook contains: ${codebook.listConcepts().join(', ')}\n`);

// 6. Query the codebook
logger.info('6. Querying codebook...');
const query = animals; // Query with the bundled ANIMALS vector
const results = codebook.query(query, 0.3, 3);

logger.info(`   Top matches for ANIMALS query:`);
for (const result of results) {
  logger.info(`   - ${result.name}: ${result.similarity.toFixed(4)}`);
}

// 7. Phi-scale integration
logger.info('\n7. Phi-scale values...');
logger.info(`   CAT phi-value: ${catVector.toPhiScale().toFixed(4)}`);
logger.info(`   DOG phi-value: ${dogVector.toPhiScale().toFixed(4)}`);
logger.info(`   ANIMALS phi-value: ${animals.toPhiScale().toFixed(4)}`);

// 8. Truth values for CSL gates
logger.info('\n8. Truth values for CSL...');
logger.info(`   CAT truth-value: ${catVector.toTruthValue().toFixed(4)}`);
logger.info(`   ANIMALS truth-value: ${animals.toTruthValue().toFixed(4)}`);

logger.info('\n=== Example Complete ===');
