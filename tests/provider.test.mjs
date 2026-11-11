import test from 'node:test';
import assert from 'node:assert/strict';
import { deepseekProvider } from '../lib/provider.mjs';

test('portable provider keeps credentials server-side and requests JSON without retries', async () => {
  let calls = 0;
  const provider = deepseekProvider({ apiKey: 'test-only', model: 'deepseek-flash' });
  const result = await provider.chat({ message: 'Return JSON', max_tokens: 100 }, {
    fetch: async (url, init) => {
      calls++;
      assert.equal(url, 'https://api.deepseek.com/chat/completions');
      assert.equal(init.headers.Authorization, 'Bearer test-only');
      const body = JSON.parse(init.body);
      assert.equal(body.response_format.type, 'json_object');
      assert.equal(body.thinking.type, 'disabled');
      return Response.json({ model: body.model, choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }] });
    },
  });
  assert.equal(result.text, '{"ok":true}');
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result).includes('test-only'));
  await assert.rejects(provider.chat({ message: 'JSON', max_tokens: 100 }, { fetch: async () => { calls++; return new Response('', { status: 429 }); } }));
  assert.equal(calls, 2);
});
