import { createServiceApp } from '@heady-ai/service-runtime';
        import type { ServiceManifest } from '@heady-ai/contract-types';

        const manifest: ServiceManifest = {
          "name": "hcfullpipeline-executor",
          "version": "0.1.0",
          "port": 4314,
          "summary": "21-stage pipeline execution and stage-level checkpointing.",
          "routes": [
                    "/pipeline/run",
                    "/pipeline/status"
          ],
          "dependencies": [
                    "contract-types",
                    "csl-gate"
          ]
} as ServiceManifest;
        const app = createServiceApp(manifest);


            app.post('/pipeline/run', async (request) => ({ runId: crypto.randomUUID(), accepted: true, request: request.body }));
            app.get('/pipeline/status', async () => ({ state: 'idle', stages: 21, hotPoolReserved: 13 }));


        const port = Number(process.env.PORT ?? 4314);
        app.listen({ port, host: '0.0.0.0' }).then(() => {
          app.log.info(`hcfullpipeline-executor listening on ${port}`);
        }).catch((error) => {
          app.log.error(error);
          process.exit(1);
        });
