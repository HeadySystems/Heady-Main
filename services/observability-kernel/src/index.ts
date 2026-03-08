import { createServiceApp } from '@heady-ai/service-runtime';
        import type { ServiceManifest } from '@heady-ai/contract-types';

        const manifest: ServiceManifest = {
          "name": "observability-kernel",
          "version": "0.1.0",
          "port": 4302,
          "summary": "Structured logs, traces, health aggregation, and metrics snapshots.",
          "routes": [
                    "/metrics/snapshot",
                    "/events/ingest"
          ],
          "dependencies": [
                    "observability-client"
          ]
} as ServiceManifest;
        const app = createServiceApp(manifest);


            app.get('/metrics/snapshot', async () => ({
              serviceCount: 15,
              warningThreshold: 0.618,
              criticalThreshold: 0.854,
              checkedAt: new Date().toISOString(),
            }));

            app.post('/events/ingest', async (request) => ({ accepted: true, body: request.body }));


        const port = Number(process.env.PORT ?? 4302);
        app.listen({ port, host: '0.0.0.0' }).then(() => {
          app.log.info(`observability-kernel listening on ${port}`);
        }).catch((error) => {
          app.log.error(error);
          process.exit(1);
        });
