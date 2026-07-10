// Appel Responses API avec les paramètres imposés + retries.
import { GEN_PARAMS, DEVELOPER_PROMPT, RESPONSE_FORMAT, userPrompt } from './article-schema.mjs';
import { extractJson } from './transform.mjs';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY manquant'); process.exit(1); }

export function buildRequestBody(post) {
  return {
    model: GEN_PARAMS.model,
    input: [
      { role: 'developer', content: DEVELOPER_PROMPT },
      { role: 'user', content: userPrompt(post) },
    ],
    reasoning: GEN_PARAMS.reasoning,
    text: { verbosity: GEN_PARAMS.text.verbosity, format: RESPONSE_FORMAT },
    max_output_tokens: GEN_PARAMS.max_output_tokens,
  };
}

export async function generateArticle(post, { tries = 3 } = {}) {
  const body = buildRequestBody(post);
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data).slice(0, 400)}`);
      if (data.status === 'incomplete') {
        throw new Error(`incomplete: ${data.incomplete_details?.reason || '?'}`);
      }
      const text = extractJson(data);
      if (!text) throw new Error('réponse vide');
      const parsed = JSON.parse(text);
      return { parsed, usage: data.usage };
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((res) => setTimeout(res, 2000 * 2 ** i));
    }
  }
  throw lastErr;
}
