/**
 * Commitlint Configuration — Conventional Commits
 * Author: Eric Haywood | HeadySystems Inc.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',       // New feature
        'fix',        // Bug fix
        'chore',      // Maintenance
        'docs',       // Documentation
        'perf',       // Performance
        'security',   // Security hardening
        'refactor',   // Code restructure
        'test',       // Tests
        'ci',         // CI/CD
        'build',      // Build system
        'revert',     // Revert
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 89],  // fib(11)
  },
};
