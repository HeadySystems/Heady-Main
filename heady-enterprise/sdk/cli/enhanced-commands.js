const pino = require('pino');
const logger = pino();
#!/usr/bin/env node
'use strict';

/**
 * @file enhanced-commands.js
 * @description CLI enhancements for Heady™OS. Extends bin/heady-cli.js.
 *
 * Commands:
 *   heady init              — Initialize a new HeadyOS project
 *   heady deploy            — Deploy to HeadyOS cloud
 *   heady logs              — Stream service logs
 *   heady agent:create      — Interactive agent creation
 *   heady agent:test        — Test an agent with a sample prompt
 *   heady memory:store      — Store to vector memory
 *   heady memory:search     — Search vector memory
 *   heady task:submit       — Submit a Conductor task
 *   heady task:status       — Check task status
 *   heady config            — View/set configuration
 *   heady health            — Check API health
 *
 * Uses commander.js patterns consistent with bin/heady-cli.js
 */

const { Command } = require('commander');
const readline   = require('readline');
const path       = require('path');
const fs         = require('fs');

const PHI = 1.618033988749895;
const fib = (n) => {
  const seq = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
  return seq[n] ?? Math.round(seq[16] * PHI ** (n - 16));
};

const program = new Command();

// ---------------------------------------------------------------------------
// Config Management
// ---------------------------------------------------------------------------

const CONFIG_FILE = path.join(process.env.HOME || process.cwd(), '.heady', 'config.json');

const loadConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
};

const saveConfig = (config) => {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
};

const getApiKey = () => process.env.HEADY_API_KEY || loadConfig().apiKey;

// ---------------------------------------------------------------------------
// API Client Helper
// ---------------------------------------------------------------------------

const apiCall = async (method, path, body) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.error('❌ No API key found. Run: heady config --set-key YOUR_API_KEY');
    process.exit(1);
  }
  const baseUrl = process.env.HEADY_BASE_URL || loadConfig().baseUrl || 'https://api.headyme.com/v1';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Heady-SDK': 'cli/1.0.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
};

const prompt = (question) => new Promise(resolve => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, (answer) => { rl.close(); resolve(answer); });
});

// ---------------------------------------------------------------------------
// Program Setup
// ---------------------------------------------------------------------------

program
  .name('heady')
  .description('HeadyOS CLI — Multi-agent AI orchestration platform')
  .version('1.0.0')
  .option('--json', 'Output as JSON')
  .option('--debug', 'Enable debug mode')
  .option('--tenant <id>', 'Tenant ID for multi-tenant deployments');

// ---------------------------------------------------------------------------
// heady init
// ---------------------------------------------------------------------------

program
  .command('init')
  .description('Initialize a new HeadyOS project in the current directory')
  .option('--name <name>', 'Project name')
  .option('--template <template>', 'Template: basic, multi-agent, research, slack-bot', 'basic')
  .action(async (options) => {
    logger.info('🚀 Initializing HeadyOS project...\n');

    const name = options.name || await prompt('Project name: ');
    const template = options.template;

    const projectConfig = {
      name,
      version: '1.0.0',
      heady: {
        version: '1.0.0',
        template,
        baseUrl: 'https://api.headyme.com/v1',
        defaultTemperature: Math.round(1000 / PHI) / 1000, // ≈ 0.618
        defaultMaxIterations: fib(7), // 13
        memoryTtlDays: fib(13), // 233
        agentMaxSteps: fib(8), // 21
      },
      agents: [],
      memory: { defaultNamespace: name.toLowerCase().replace(/\s+/g, '-') },
    };

    fs.writeFileSync('heady.config.json', JSON.stringify(projectConfig, null, 2));
    logger.info(`✅ Created heady.config.json`);

    // Create .env.example
    const envExample = [
      '# HeadyOS Configuration',
      'HEADY_API_KEY=hdy_your_api_key_here',
      `HEADY_TENANT_ID=${name.toLowerCase().replace(/\s+/g, '-')}`,
      'HEADY_BASE_URL=https://api.headyme.com/v1',
    ].join('\n');
    fs.writeFileSync('.env.example', envExample);
    logger.info('✅ Created .env.example');

    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', '.env\n.heady/\nnode_modules/\n');
    }

    logger.info(`\n✅ HeadyOS project "${name}" initialized!`);
    logger.info('\nNext steps:');
    logger.info('  1. Copy .env.example to .env and add your API key');
    logger.info('  2. Run: heady health');
    logger.info('  3. Run: heady agent:create');
  });

// ---------------------------------------------------------------------------
// heady deploy
// ---------------------------------------------------------------------------

program
  .command('deploy')
  .description('Deploy HeadyOS agents and configuration to cloud')
  .option('--config <file>', 'Config file path', 'heady.config.json')
  .option('--env <environment>', 'Target environment: production, staging', 'production')
  .option('--dry-run', 'Preview deployment without executing')
  .action(async (options) => {
    logger.info(`\n🚀 Deploying to HeadyOS (${options.env})...\n`);

    let config;
    try {
      config = JSON.parse(fs.readFileSync(options.config, 'utf8'));
    } catch {
      logger.error(`❌ Config file not found: ${options.config}`);
      logger.error('Run: heady init');
      process.exit(1);
    }

    if (options.dryRun) {
      logger.info('DRY RUN — Would deploy:');
      logger.info(JSON.stringify(config, null, 2));
      return;
    }

    try {
      const result = await apiCall('POST', '/deploy', {
        config,
        environment: options.env,
      });
      logger.info(`✅ Deployed successfully!`);
      logger.info(`   Deployment ID: ${result.deploymentId}`);
      logger.info(`   Status: ${result.status}`);
      logger.info(`   Dashboard: https://headyme.com/dashboard/${result.deploymentId}`);
    } catch (err) {
      logger.error(`❌ Deploy failed: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady logs
// ---------------------------------------------------------------------------

program
  .command('logs')
  .description('Stream HeadyOS service logs')
  .option('--service <name>', 'Service name (e.g., heady-brain, heady-conductor)')
  .option('--since <duration>', 'Start time (e.g., 1h, 30m, 1d)', '1h')
  .option('--level <level>', 'Log level: debug, info, warn, error', 'info')
  .option('--follow', 'Follow log output (like tail -f)', false)
  .action(async (options) => {
    logger.info(`📋 Fetching logs${options.service ? ` for ${options.service}` : ''} (since ${options.since})...\n`);

    try {
      const params = new URLSearchParams({
        since: options.since,
        level: options.level,
        ...(options.service && { service: options.service }),
      });

      const logs = await apiCall('GET', `/logs?${params}`);
      if (Array.isArray(logs.entries)) {
        for (const entry of logs.entries) {
          const color = entry.level === 'error' ? '\x1b[31m' : entry.level === 'warn' ? '\x1b[33m' : '\x1b[0m';
          logger.info(`${color}[${entry.timestamp}] [${entry.service || 'system'}] [${entry.level.toUpperCase()}] ${entry.message}\x1b[0m`);
        }
        logger.info(`\n${logs.entries.length} log entries displayed.`);
      }

      if (options.follow) {
        logger.info('\n📡 Following logs (Ctrl+C to stop)...');
        // In production: open WebSocket for real-time log streaming
        const interval = setInterval(async () => {
          const recent = await apiCall('GET', `/logs?since=5s&level=${options.level}${options.service ? `&service=${options.service}` : ''}`).catch(() => ({ entries: [] }));
          if (recent.entries?.length > 0) {
            for (const entry of recent.entries) {
              logger.info(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
            }
          }
        }, Math.round(1000 * PHI)); // Refresh every φ seconds ≈ 1618ms
        process.on('SIGINT', () => { clearInterval(interval); process.exit(0); });
      }
    } catch (err) {
      logger.error(`❌ Failed to fetch logs: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady agent:create
// ---------------------------------------------------------------------------

program
  .command('agent:create')
  .description('Interactively create a new AI agent')
  .option('--name <name>', 'Agent name')
  .option('--file <file>', 'Create from JSON config file')
  .action(async (options) => {
    logger.info('🤖 Creating new HeadyOS agent...\n');

    let agentConfig;

    if (options.file) {
      agentConfig = JSON.parse(fs.readFileSync(options.file, 'utf8'));
    } else {
      const name = options.name || await prompt('Agent name: ');
      const description = await prompt('Description (optional): ');
      const systemPrompt = await prompt('System prompt: ');
      const capabilitiesInput = await prompt(`Capabilities (comma-separated: mcp_tools, memory_read, memory_write, web_search, code_execution) [default: mcp_tools,memory_read]: `);
      const capabilities = capabilitiesInput.trim()
        ? capabilitiesInput.split(',').map(c => c.trim()).filter(Boolean)
        : ['mcp_tools', 'memory_read'];

      agentConfig = {
        name,
        description: description || undefined,
        systemPrompt,
        capabilities,
        maxIterations: fib(7), // 13
        temperature: Math.round(1000 / PHI) / 1000, // 0.618
      };
    }

    logger.info('\nCreating agent:', agentConfig.name);

    try {
      const agent = await apiCall('POST', '/agents', agentConfig);
      logger.info(`\n✅ Agent created!`);
      logger.info(`   ID:     ${agent.id}`);
      logger.info(`   Name:   ${agent.name}`);
      logger.info(`   Status: ${agent.status}`);
      if (program.opts().json) {
        logger.info(JSON.stringify(agent, null, 2));
      }
    } catch (err) {
      logger.error(`❌ Failed to create agent: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady agent:test
// ---------------------------------------------------------------------------

program
  .command('agent:test')
  .description('Test an agent with a sample prompt')
  .argument('<agentId>', 'Agent ID to test')
  .option('--prompt <prompt>', 'Test prompt', 'What can you help me with today?')
  .option('--verbose', 'Show full response details')
  .action(async (agentId, options) => {
    logger.info(`\n🧪 Testing agent ${agentId}...\n`);
    logger.info(`Prompt: "${options.prompt}"\n`);

    try {
      const response = await apiCall('POST', '/brain/chat', {
        messages: [{ role: 'user', content: options.prompt }],
        agentId,
        temperature: 1 / PHI, // ≈ 0.618
      });

      logger.info(`📤 Response:`);
      logger.info(response.message?.content || JSON.stringify(response));

      if (options.verbose) {
        logger.info('\n📊 Stats:');
        logger.info(`   Model:         ${response.model}`);
        logger.info(`   Latency:       ${response.latencyMs}ms`);
        logger.info(`   Tokens (in):   ${response.usage?.promptTokens}`);
        logger.info(`   Tokens (out):  ${response.usage?.completionTokens}`);
        logger.info(`   Finish Reason: ${response.finishReason}`);
      }
    } catch (err) {
      logger.error(`❌ Test failed: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady memory:store
// ---------------------------------------------------------------------------

program
  .command('memory:store')
  .description('Store a key-value pair in HeadyOS vector memory')
  .requiredOption('--key <key>', 'Memory key')
  .requiredOption('--value <value>', 'Value to store')
  .option('--namespace <ns>', 'Memory namespace', 'default')
  .option('--ttl <days>', 'TTL in days', String(fib(13)))
  .action(async (options) => {
    try {
      const entry = await apiCall('POST', '/memory', {
        key: options.key,
        value: options.value,
        namespace: options.namespace,
        ttlDays: parseInt(options.ttl, 10),
      });
      logger.info(`✅ Stored: ${entry.key} → ${entry.namespace}`);
      logger.info(`   ID: ${entry.id}`);
    } catch (err) {
      logger.error(`❌ Store failed: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady memory:search
// ---------------------------------------------------------------------------

program
  .command('memory:search')
  .description('Semantic search in HeadyOS vector memory')
  .argument('<query>', 'Search query')
  .option('--namespace <ns>', 'Namespace to search', 'default')
  .option('--top-k <k>', 'Number of results', String(fib(5))) // fib(5)=5
  .option('--min-score <score>', 'Minimum similarity score', String(Math.round(1000 / (PHI * PHI)) / 1000))
  .action(async (query, options) => {
    try {
      const results = await apiCall('POST', '/memory/search', {
        query,
        namespace: options.namespace,
        topK: parseInt(options.topK, 10),
        minScore: parseFloat(options.minScore),
      });

      logger.info(`\n🔍 Search results for: "${query}" (${results.totalFound} found)\n`);
      if (!results.results?.length) {
        logger.info('No results found above the minimum similarity threshold.');
        return;
      }
      for (const entry of results.results) {
        logger.info(`[${entry.score?.toFixed(3) || '?'}] ${entry.key}`);
        logger.info(`       ${entry.value.substring(0, fib(9))}...`); // fib(9)=34 chars preview
        logger.info();
      }
      logger.info(`Latency: ${results.searchLatencyMs}ms`);
    } catch (err) {
      logger.error(`❌ Search failed: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady task:submit
// ---------------------------------------------------------------------------

program
  .command('task:submit')
  .description('Submit a Conductor orchestration task')
  .requiredOption('--type <type>', 'Task type')
  .option('--input <json>', 'Task input as JSON string')
  .option('--agent-id <id>', 'Agent ID to handle the task')
  .option('--priority <priority>', 'Priority: low, normal, high, critical', 'normal')
  .option('--wait', 'Wait for task completion')
  .action(async (options) => {
    let input;
    try {
      input = options.input ? JSON.parse(options.input) : {};
    } catch {
      logger.error('❌ Invalid JSON in --input');
      process.exit(1);
    }

    try {
      const task = await apiCall('POST', '/conductor/tasks', {
        type: options.type,
        input,
        agentId: options.agentId,
        priority: options.priority,
        maxSteps: fib(8), // 21
      });

      logger.info(`✅ Task submitted!`);
      logger.info(`   Task ID: ${task.taskId}`);
      logger.info(`   Status:  ${task.status}`);

      if (options.wait) {
        logger.info('\n⏳ Waiting for completion...');
        let status = task;
        let attempt = 0;
        while (!['completed', 'failed', 'cancelled'].includes(status.status)) {
          const delay = Math.min(Math.round(1000 * PHI ** attempt++), Math.round(1000 * PHI ** 8));
          await new Promise(r => setTimeout(r, delay));
          status = await apiCall('GET', `/conductor/tasks/${task.taskId}`);
          process.stdout.write(`\r   Status: ${status.status} (${Math.round((status.progress || 0) * 100)}%)  `);
        }
        logger.info(`\n\n✅ Task ${status.status}!`);
        if (status.result) {
          logger.info('Result:', typeof status.result === 'string' ? status.result : JSON.stringify(status.result, null, 2));
        }
      }
    } catch (err) {
      logger.error(`❌ Task submission failed: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// heady config
// ---------------------------------------------------------------------------

program
  .command('config')
  .description('View or set HeadyOS CLI configuration')
  .option('--set-key <apiKey>', 'Set API key')
  .option('--set-tenant <tenantId>', 'Set tenant ID')
  .option('--set-url <baseUrl>', 'Set base URL')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    const config = loadConfig();

    if (options.setKey) {
      config.apiKey = options.setKey;
      saveConfig(config);
      logger.info('✅ API key saved');
    }
    if (options.setTenant) {
      config.tenantId = options.setTenant;
      saveConfig(config);
      logger.info('✅ Tenant ID saved');
    }
    if (options.setUrl) {
      config.baseUrl = options.setUrl;
      saveConfig(config);
      logger.info('✅ Base URL saved');
    }
    if (options.show || Object.keys(options).filter(k => k.startsWith('set')).every(k => !options[k])) {
      logger.info('Current configuration:');
      logger.info(`  Config file: ${CONFIG_FILE}`);
      logger.info(`  API Key:     ${config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'not set (use env: HEADY_API_KEY)'}`);
      logger.info(`  Tenant ID:   ${config.tenantId || 'not set'}`);
      logger.info(`  Base URL:    ${config.baseUrl || 'https://api.headyme.com/v1 (default)'}`);
    }
  });

// ---------------------------------------------------------------------------
// heady health
// ---------------------------------------------------------------------------

program
  .command('health')
  .description('Check HeadyOS API health and authentication')
  .action(async () => {
    try {
      const start = Date.now();
      const health = await apiCall('GET', '/health');
      const latency = Date.now() - start;
      logger.info(`\n✅ HeadyOS API Health Check`);
      logger.info(`   Status:  ${health.status}`);
      logger.info(`   Version: ${health.version}`);
      logger.info(`   Latency: ${latency}ms`);
      logger.info(`   API Key: ${getApiKey() ? '✓ Set' : '✗ Not set'}`);
    } catch (err) {
      logger.error(`❌ Health check failed: ${err.message}`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Parse and Run
// ---------------------------------------------------------------------------

program.parse(process.argv);

// If no command, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

module.exports = { program };
