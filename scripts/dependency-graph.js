#!/usr/bin/env node

/**
 * Heady™ Dependency Graph Generator
 * Scans all package.json files in services/ and packages/
 * Builds dependency graph of internal @heady/* packages
 * Outputs as Mermaid diagram format
 */

const fs = require('fs');
const path = require('path');

const HEADY_SCOPE = '@heady';

/**
 * Recursively find all package.json files
 */
function findPackageJsonFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findPackageJsonFiles(fullPath));
      } else if (entry.name === 'package.json') {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Silently skip directories we can't read
  }
  return files;
}

/**
 * Parse package.json and extract name and dependencies
 */
function parsePackageJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(content);

    const name = pkg.name || path.basename(path.dirname(filePath));
    const deps = new Set();

    // Collect all internal @heady dependencies
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    };

    for (const dep of Object.keys(allDeps || {})) {
      if (dep.startsWith(`${HEADY_SCOPE}/`)) {
        deps.add(dep);
      }
    }

    return { name, deps };
  } catch (err) {
    return null;
  }
}

/**
 * Build dependency graph
 */
function buildDependencyGraph(packageJsonFiles) {
  const graph = new Map();

  // First pass: collect all packages
  const packages = new Map();
  for (const filePath of packageJsonFiles) {
    const parsed = parsePackageJson(filePath);
    if (parsed) {
      packages.set(parsed.name, { filePath, deps: parsed.deps });
    }
  }

  // Second pass: build graph only for @heady packages
  for (const [pkgName, pkgData] of packages) {
    // Only include @heady packages or packages that depend on @heady packages
    if (pkgName.startsWith(HEADY_SCOPE) || pkgData.deps.size > 0) {
      const deps = new Set();
      for (const dep of pkgData.deps) {
        if (packages.has(dep)) {
          deps.add(dep);
        }
      }
      graph.set(pkgName, deps);
    }
  }

  return graph;
}

/**
 * Generate Mermaid diagram from dependency graph
 */
function generateMermaidDiagram(graph) {
  const lines = ['graph TD'];

  // Create nodes with safe IDs
  const nodeIds = new Map();
  let counter = 0;
  for (const [pkg, _] of graph) {
    nodeIds.set(pkg, `N${counter++}`);
  }

  // Add nodes with labels
  for (const [pkg, id] of nodeIds) {
    const label = pkg
      .replace(`${HEADY_SCOPE}/`, '')
      .replace(/-/g, '_')
      .replace(/@/g, '');
    lines.push(`    ${id}["${label}"]`);
  }

  // Add edges
  const edges = new Set();
  for (const [pkg, deps] of graph) {
    const fromId = nodeIds.get(pkg);
    for (const dep of deps) {
      const toId = nodeIds.get(dep);
      if (toId && fromId) {
        edges.add(`${fromId} --> ${toId}`);
      }
    }
  }

  for (const edge of edges) {
    lines.push(`    ${edge}`);
  }

  // Add styling
  lines.push('');
  lines.push('    classDef heady fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff');
  lines.push('    classDef internal fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff');

  // Apply styles
  for (const [pkg, id] of nodeIds) {
    if (pkg.startsWith(HEADY_SCOPE)) {
      lines.push(`    class ${id} heady`);
    } else {
      lines.push(`    class ${id} internal`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate JSON format output
 */
function generateJsonGraph(graph) {
  const json = {
    generated: new Date().toISOString(),
    packages: Array.from(graph.entries()).map(([pkg, deps]) => ({
      name: pkg,
      dependencies: Array.from(deps),
      count: deps.size,
    })),
  };

  json.summary = {
    totalPackages: graph.size,
    headyPackages: Array.from(graph.keys()).filter((pkg) =>
      pkg.startsWith(HEADY_SCOPE)
    ).length,
    internalPackages: Array.from(graph.keys()).filter(
      (pkg) => !pkg.startsWith(HEADY_SCOPE)
    ).length,
  };

  return json;
}

/**
 * Main function
 */
function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const servicesPath = path.join(repoRoot, 'services');
  const packagesPath = path.join(repoRoot, 'packages');

  // Collect package.json files
  let files = [];
  if (fs.existsSync(servicesPath)) {
    files = [...files, ...findPackageJsonFiles(servicesPath)];
  }
  if (fs.existsSync(packagesPath)) {
    files = [...files, ...findPackageJsonFiles(packagesPath)];
  }

  if (files.length === 0) {
    console.error('No package.json files found in services/ or packages/');
    process.exit(1);
  }

  // Build graph
  const graph = buildDependencyGraph(files);

  // Determine output format
  const args = process.argv.slice(2);
  const formatFlag = args.find((arg) => arg === '--json' || arg === '--mermaid');
  const format = formatFlag ? formatFlag.replace('--', '') : 'mermaid';

  // Output
  if (format === 'json') {
    const json = generateJsonGraph(graph);
    console.log(JSON.stringify(json, null, 2));
  } else {
    const diagram = generateMermaidDiagram(graph);
    console.log(diagram);
  }
}

main();
