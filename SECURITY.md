# Security Policy — Heady Systems

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x (current) | ✅ Active support |
| < 1.0 | ❌ No longer supported |

## Reporting a Vulnerability

If you discover a security vulnerability in any Heady Systems project, **do not open a public issue**.

### Responsible Disclosure

1. **Email**: Send a detailed report to **<security@headysystems.com>**
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)
3. **Response timeline**:
   - **Acknowledgment**: Within 24 hours
   - **Initial assessment**: Within 72 hours
   - **Fix + disclosure**: Within 14 days for critical, 30 days for moderate

### Scope

The following are in scope for responsible disclosure:

- All Heady repositories under the HeadyMe GitHub organization
- headysystems.com, headymcp.com, headyme.com, headybuddy.org and all subdomains
- HeadyManager API endpoints
- heady-hive-sdk package
- Cloudflare Workers and edge infrastructure

### Out of Scope

- Social engineering attacks
- Denial of service attacks
- Issues in third-party dependencies (report these upstream, but notify us)

## Security Measures

Heady implements the following security controls:

- **Pre-commit secret scanning** — 16 pattern types blocked before commit
- **mTLS** — Mutual TLS for inter-service communication
- **API key timing-safe authentication** — Constant-time comparison
- **Governance policies** — Enforced via `governance-policies.yaml`
- **Human-in-the-loop** — Required for destructive operations
- **HeadyBattle validation** — Multi-node consensus for code changes
- **Immutable audit logs** — All routing decisions and agent actions logged

## Bug Bounty

We are exploring a formal bug bounty program. If you find a critical vulnerability, we will acknowledge your contribution publicly (with your permission) and work toward financial recognition.
