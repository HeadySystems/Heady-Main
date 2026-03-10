# ADR-004: Auth Architecture (httpOnly Cookies)

## Status
Accepted

## Date
2026-03-10

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Context
XSS attacks can exfiltrate tokens stored in localStorage or sessionStorage. httpOnly cookies are inaccessible to JavaScript, providing defense-in-depth against client-side attacks. RS256 enables asymmetric key verification.

## Decision
Authentication uses httpOnly cookies + RS256 JWT + PKCE OAuth2. localStorage is NEVER used for token storage under any circumstances.

## Consequences
All services validate sessions through auth-session-server. Cross-domain auth requires careful cookie domain configuration. SameSite policies must be tuned per deployment.

## Related ADRs
ADR-001, ADR-002, ADR-003, ADR-005, ADR-006, ADR-007, ADR-008
