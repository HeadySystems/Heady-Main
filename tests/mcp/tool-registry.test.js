// vitest globals: describe, it, expect, beforeAll are provided by vitest config
const { default: ToolRegistry } = await import('../../src/mcp/tool-registry.js');
const toolRegistry = new ToolRegistry();

describe('MCP Tool Registry', () => {
  beforeAll(() => {
    toolRegistry.register({ name: 'heady_chat', description: 'desc', inputSchema: {} });
  });

  it('should list registered tools', () => {
    const tools = toolRegistry.list();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0]).toHaveProperty('name');
    expect(tools[0]).toHaveProperty('description');
  });

  it('should get a specific tool', () => {
    const tool = toolRegistry.get('heady_chat');
    expect(tool).toBeDefined();
    expect(tool.name).toBe('heady_chat');
  });

  it('should return undefined for unknown tool', () => {
    const tool = toolRegistry.get('nonexistent');
    expect(tool).toBeUndefined();
  });
});
