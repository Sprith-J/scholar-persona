// A portable server-side adapter. The API key never enters a report or the UI.
export function deepseekProvider({ apiKey, model = 'deepseek-flash' }) {
  return {
    status: () => ({ configured: Boolean(apiKey) }),
    async chat(input, { fetch: fetcher = fetch, signal } = {}) {
      const response = await fetcher('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: input.message }],
          max_tokens: input.max_tokens,
          thinking: { type: 'disabled' },
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) throw new Error(`DeepSeek request failed (${response.status}).`);
      const data = await response.json();
      const choice = data.choices?.[0];
      if (typeof choice?.message?.content !== 'string') throw new Error('Missing model response.');
      return { text: choice.message.content, model: data.model, usage: data.usage,
        finish_reason: choice.finish_reason, truncated: choice.finish_reason === 'length' };
    },
  };
}
