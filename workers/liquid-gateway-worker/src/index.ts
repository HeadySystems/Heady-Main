const providers = ['openai', 'anthropic', 'google', 'groq', 'perplexity'];

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health/providers') {
      return Response.json({ providers, strategy: 'fastest-wins' });
    }
    if (url.pathname === '/v1/chat' || url.pathname === '/v1/embed') {
      return Response.json({ accepted: true, providers, strategy: 'race_and_failover' });
    }
    return new Response('Not Found', { status: 404 });
  }
};
