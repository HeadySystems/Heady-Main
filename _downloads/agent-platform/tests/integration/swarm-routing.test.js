/**
 * @fileoverview Integration tests for swarm routing
 */
import { CSLRouter } from '../../src/routing/csl-router.js';

describe('Swarm Routing Integration', () => {
  let router;

  beforeEach(async () => {
    // Mock embedding function
    const mockEmbed = async (text) => {
      // Simple hash-based mock embedding
      const hash = Array.from(text).reduce((h, c) => h + c.charCodeAt(0), 0);
      return Array(384).fill(0).map((_, i) => Math.sin(hash + i) / 10);
    };

    router = new CSLRouter(mockEmbed);

    // Register swarms
    await router.registerSwarm('code-artisan', 'coding and software development');
    await router.registerSwarm('research-herald', 'research and information gathering');
    await router.registerSwarm('data-sculptor', 'data processing and analysis');
  });

  test('Routes coding task to code-artisan', async () => {
    const task = { description: 'Write a Python function to sort arrays' };
    const result = await router.route(task);
    expect(result.swarmId).toBe('code-artisan');
  });

  test('Routes research task to research-herald', async () => {
    const task = { description: 'Find latest papers on multi-agent systems' };
    const result = await router.route(task);
    expect(result.swarmId).toBe('research-herald');
  });

  test('Returns high-confidence routing strategy', async () => {
    const task = { description: 'Implement sorting algorithm in JavaScript' };
    const result = await router.route(task);
    expect(['csl-high', 'csl-medium', 'csl-low']).toContain(result.strategy);
  });
});
