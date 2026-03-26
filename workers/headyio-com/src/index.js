import { createEdgeWorker } from '../../shared/edge-worker.js';
export default createEdgeWorker({
  serviceName: 'headyio-com',
  cspPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.headyio.com; frame-ancestors 'none'",
});
