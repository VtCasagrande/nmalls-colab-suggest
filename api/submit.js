export const config = { runtime: 'edge' };

const DEFAULT_WEBHOOK =
  'https://nmalls-n8n.mpdjxf.easypanel.host/webhook/7236f7f9-df48-4803-a3f2-8638584e2a1c';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!payload || typeof payload !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK;

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('[submit] webhook HTTP', upstream.status, text.slice(0, 500));

      let hint =
        'Não foi possível conectar ao sistema de registro. Tente mais tarde ou avise a equipe técnica.';
      try {
        const j = JSON.parse(text);
        if (
          upstream.status === 404 ||
          (typeof j.message === 'string' && j.message.includes('not registered'))
        ) {
          hint =
            'O webhook do n8n não está ativo ou a URL mudou. No n8n, ative o fluxo (interruptor no canto superior direito) e confira a URL de produção do nó Webhook.';
        }
      } catch {
        /* ignore */
      }

      return new Response(JSON.stringify({ error: 'webhook_failed', hint }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[submit] upstream', err);
    return new Response(JSON.stringify({ error: 'Upstream unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
