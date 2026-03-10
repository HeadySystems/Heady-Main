/**
 * CompressionMiddleware — Brotli + Gzip Response Compression
 * Automatic content encoding negotiation with φ-scaled threshold.
 * All constants φ-derived. ESM only.
 * Author: Eric Haywood
 */
import { createBrotliCompress, createGzip, constants as zlibConstants } from 'zlib';
import { createHash } from 'crypto';

const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function hashSHA256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// Compressible MIME types
const COMPRESSIBLE_TYPES = new Set([
  'text/html', 'text/css', 'text/javascript', 'text/plain', 'text/xml',
  'application/json', 'application/javascript', 'application/xml',
  'application/ld+json', 'application/manifest+json',
  'image/svg+xml', 'application/wasm',
]);

class CompressionMiddleware {
  constructor(config = {}) {
    this.minSize = config.minSize ?? FIB[16]; // 987 bytes minimum
    this.brotliQuality = config.brotliQuality ?? Math.round(PHI * PHI * PHI); // ~4
    this.gzipLevel = config.gzipLevel ?? Math.round(PHI * PHI * PHI); // ~4
    this.totalCompressed = 0;
    this.totalSavedBytes = 0;
  }

  _acceptsEncoding(req, encoding) {
    const accept = req.headers['accept-encoding'] ?? '';
    return accept.includes(encoding);
  }

  _isCompressible(contentType) {
    if (!contentType) return false;
    const base = contentType.split(';')[0].trim().toLowerCase();
    return COMPRESSIBLE_TYPES.has(base);
  }

  middleware() {
    const self = this;
    return (req, res, next) => {
      // Skip if no accept-encoding or SSE
      if (!req.headers['accept-encoding'] || req.headers.accept === 'text/event-stream') {
        next?.();
        return;
      }

      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);
      let chunks = [];
      let encoding = null;

      // Determine encoding preference: brotli > gzip
      if (self._acceptsEncoding(req, 'br')) {
        encoding = 'br';
      } else if (self._acceptsEncoding(req, 'gzip')) {
        encoding = 'gzip';
      }

      if (!encoding) {
        next?.();
        return;
      }

      // Intercept write/end to buffer and compress
      res.write = function(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };

      res.end = function(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

        const body = Buffer.concat(chunks);
        const contentType = res.getHeader('content-type');

        // Skip compression for small bodies or non-compressible types
        if (body.length < self.minSize || !self._isCompressible(contentType)) {
          res.setHeader('Content-Length', body.length);
          originalWrite(body);
          return originalEnd();
        }

        // Compress
        const compressor = encoding === 'br'
          ? createBrotliCompress({ params: { [zlibConstants.BROTLI_PARAM_QUALITY]: self.brotliQuality } })
          : createGzip({ level: self.gzipLevel });

        const compressed = [];
        compressor.on('data', (chunk) => compressed.push(chunk));
        compressor.on('end', () => {
          const result = Buffer.concat(compressed);
          self.totalCompressed++;
          self.totalSavedBytes += body.length - result.length;

          res.removeHeader('Content-Length');
          res.setHeader('Content-Encoding', encoding);
          res.setHeader('Content-Length', result.length);
          res.setHeader('Vary', 'Accept-Encoding');
          originalWrite(result);
          originalEnd();
        });

        compressor.write(body);
        compressor.end();
      };

      next?.();
    };
  }

  health() {
    return {
      totalCompressed: this.totalCompressed,
      totalSavedBytes: this.totalSavedBytes,
      minSize: this.minSize,
      brotliQuality: this.brotliQuality,
      gzipLevel: this.gzipLevel,
    };
  }
}

export default CompressionMiddleware;
export { CompressionMiddleware, COMPRESSIBLE_TYPES };
