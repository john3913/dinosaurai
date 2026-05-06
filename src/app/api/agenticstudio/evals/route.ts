export const runtime = 'nodejs';

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });

  const { model = 'claude-haiku-4-5-20251001', userMessage, response, system } = await req.json();

  const evalPrompt = `You are an expert AI response evaluator. Evaluate the AI assistant response below and return only valid JSON — no prose, no markdown fences.

${system ? `System prompt: ${system}\n` : ''}User message: ${userMessage}
Response to evaluate: ${response}

Score each criterion 0–10 and provide brief reasoning. Return exactly:
{"scores":{"correctness":N,"completeness":N,"clarity":N,"conciseness":N,"helpfulness":N},"reasoning":{"correctness":"...","completeness":"...","clarity":"...","conciseness":"...","helpfulness":"..."},"overall":N,"summary":"one sentence"}`;

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: evalPrompt }],
    }),
  });

  if (!upstream.ok) return Response.json({ error: 'API error' }, { status: upstream.status });

  const data = await upstream.json();
  const text = data.content?.[0]?.text ?? '{}';
  try {
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({ error: 'Could not parse evaluation JSON', raw: text }, { status: 500 });
  }
}
