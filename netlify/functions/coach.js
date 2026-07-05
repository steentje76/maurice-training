// Server-side AI-proxy — sleutel staat hier als environment variable,
// nooit in de browser. Vervangt de rechtstreekse client-call naar
// api.anthropic.com die de sleutel in localStorage nodig had.
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY niet ingesteld op Netlify' } }) };
  }
  try {
    const payload = JSON.parse(event.body || '{}');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: payload.model || 'claude-sonnet-4-5',
        max_tokens: payload.max_tokens || 1000,
        system: payload.system,
        messages: payload.messages
      })
    });
    const data = await res.json();
    return { statusCode: res.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Proxy-fout: ' + e.message } }) };
  }
};
