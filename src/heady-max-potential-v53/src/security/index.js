/**
 * Heady™ Latent OS v5.3.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 *
 * Security Layer — aggregated exports
 */
'use strict';

module.exports = {
  ...require('./csrf-protection'),
  ...require('./input-validator'),
  ...require('./secret-manager'),
  ...require('./cross-domain-auth'),
  ...require('./token-manager'),
  ...require('./security-headers'),
};
