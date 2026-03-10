---
name: heady-perplexity-code-review
description: Reviews code for bugs, security vulnerabilities, performance issues, and best practices in the Heady platform context (Drupal, Firebase, JavaScript, PHP, Python, CSS). Use when the user asks to review, audit, check, refactor, QA, or improve code. Triggers on phrases like "review this code", "check my function", "audit this module", "find bugs in", "is this secure", "refactor this", "code review", or when code is pasted/attached.
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: engineering
---

# Heady Perplexity Code Review

## When to Use This Skill

Use this skill when the user asks to:

- Review code files, functions, or modules for correctness
- Audit code for security vulnerabilities
- Identify performance bottlenecks
- Check adherence to project coding standards
- Suggest refactoring improvements
- Validate Drupal module architecture or Firebase rules
- Review CSS/SCSS for correctness and specificity issues
- Pre-merge code review for pull/merge requests

## Review Dimensions

Every review covers these dimensions, scaled to the code's complexity and risk:

| Dimension | Focus |
|---|---|
| **Correctness** | Logic errors, off-by-one, null handling, type mismatches |
| **Security** | Injection, XSS, CSRF, insecure deserialization, over-exposure |
| **Performance** | N+1 queries, unnecessary re-renders, blocking calls, memory leaks |
| **Maintainability** | Naming, comments, function size, duplication, complexity |
| **Standards** | Project conventions, framework idioms, style guide compliance |
| **Test Coverage** | Missing edge cases, no error path tests, stubs vs. real assertions |

## Instructions

### 1. Intake

1. Identify the language(s) and framework(s) in the submitted code.
2. Ask (or infer) the intended purpose of the code if not obvious.
3. Note the Heady platform context: Drupal 10+, Firebase, React/JS front-end, PHP backend, or Python scripts.
4. Confirm whether this is a new feature, bug fix, or refactor — each has different risk profiles.

### 2. Static Analysis Pass

Read through the entire code before writing feedback:
1. Trace all data flows: where data enters, how it's transformed, where it exits.
2. Identify all external calls: DB queries, API requests, file I/O, cache reads/writes.
3. Map error handling: are exceptions caught? Are errors surfaced or swallowed?
4. Note all user-controlled inputs and how they're sanitized.

### 3. Security Audit

Check for:
- **SQL Injection**: parameterized queries used? No string concatenation in queries.
- **XSS**: all output properly escaped? `#markup` in Drupal uses `Xss::filter()`?
- **CSRF**: state-modifying routes protected with tokens?
- **Auth/Authz**: permission checks present before privileged operations?
- **Secrets**: no hardcoded API keys, passwords, or tokens in code.
- **Firebase Rules**: rules are not open (`allow read, write: if true`)? User-scoped access?
- **Dependency Risk**: no known-vulnerable package versions referenced.

### 4. Performance Review

- Drupal: avoid `\Drupal::entityQuery()` inside loops; use bulk loads with `loadMultiple()`.
- Firebase: avoid unbounded reads; use queries with `.limit()`; prefer Firestore over RTDB for complex queries.
- JavaScript: check for synchronous blocking in async contexts; avoid `document.querySelector` inside render loops.
- CSS: avoid deeply nested selectors (>3 levels); check for forced layout reflows (reading `offsetWidth` after style change).

### 5. Feedback Format

Organize feedback by severity:

**CRITICAL** — Must fix before merge; security or data integrity risk
**WARNING** — Should fix; functional correctness or significant performance impact
**SUGGESTION** — Recommended improvement; maintainability, readability, or minor performance
**PRAISE** — Note well-written patterns worth keeping

Each item includes:
```
[SEVERITY] Line N — Short title
Description of the issue.
Recommended fix:
```code
// corrected example
```
```

### 6. Summary

End every review with:
- Total issues by severity
- Overall code health score (1–10)
- Top 3 highest-priority actions
- Any follow-up questions needed for full review

## Platform-Specific Checklists

### Drupal
- [ ] Hook implementations follow naming convention `MODULE_hookname()`
- [ ] User input sanitized with `Html::escape()`, `Xss::filter()`, or Form API
- [ ] Cache tags and contexts set correctly
- [ ] Services injected via DI container, not `\Drupal::service()`
- [ ] Database queries use DBTNG (not raw SQL)

### Firebase
- [ ] Firestore security rules tested via Firebase Emulator
- [ ] Cloud Functions use typed input validation
- [ ] Auth tokens verified server-side before privileged actions
- [ ] Indexes defined for all composite queries

### JavaScript / React
- [ ] No direct DOM manipulation in React components
- [ ] `useEffect` dependencies array complete
- [ ] Error boundaries present for async data fetching
- [ ] No `console.log` left in production paths

## Examples

**Input:** PHP function that queries Drupal database

**Output:**
```
[CRITICAL] Line 14 — SQL Injection Risk
$query uses direct string concatenation with user input `$_GET['uid']`.
Recommended fix: Use \Drupal::database()->select() with condition() and typed arguments.

[WARNING] Line 28 — Missing Cache Tags
Entity data loaded without cache tags; stale data may be served after entity updates.

[SUGGESTION] Line 8 — Use Dependency Injection
Replace \Drupal::service('entity_type.manager') with constructor injection.

Summary: 1 Critical, 1 Warning, 1 Suggestion. Code health: 5/10.
```
