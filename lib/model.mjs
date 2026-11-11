import { mkdir, readFile, writeFile, rename, unlink, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { AppError } from './research.mjs';
import { makeMessages, validateNarrative, parseNarrative, PROMPT_VERSION } from './prompt.mjs';
import { deepseekProvider } from './provider.mjs';

export const CALL_LIMIT = 30;
let imported;
let queue = Promise.resolve();
async function readLedger(root) {
  let ledger;
  try { ledger = JSON.parse(await readFile(join(root, 'call-budget.json'), 'utf8')); }
  catch (e) {
    if (e.code === 'ENOENT') return { task: 'scholar-persona-20261111', limit: CALL_LIMIT, calls: [] };
    throw new AppError('budget-unreadable', 'The generation allowance record could not be read. No new request was sent.', 503);
  }
  if (!Array.isArray(ledger.calls) || ledger.calls.some(c => !Number.isSafeInteger(c.number))) throw new AppError('budget-unreadable', 'The generation allowance record could not be read. No new request was sent.', 503);
  return ledger;
}
export async function atomicJSON(path, value) {
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(tmp, path);
}
async function bridgeModule() {
  if (process.env.DEEPSEEK_API_KEY) return deepseekProvider({ apiKey: process.env.DEEPSEEK_API_KEY, model: process.env.DEEPSEEK_MODEL || 'deepseek-flash' });
  imported ??= import(pathToFileURL(process.env.DEEPSEEK_BRIDGE_PATH || join(homedir(), '.codex', 'tools', 'deepseek-bridge', 'bridge.mjs')).href).catch(() => null);
  return imported;
}
export async function modelStatus(root) {
  const bridge = await bridgeModule();
  const ledger = await readLedger(root);
  return { configured: process.env.SCHOLAR_DISABLE_MODEL !== '1' && Boolean(bridge?.status?.().configured), calls: ledger.calls.length, limit: CALL_LIMIT, remaining: Math.max(0, CALL_LIMIT - ledger.calls.length) };
}
export async function reserveCall(root, reportId) {
  const work = async () => {
    await mkdir(root, { recursive: true });
    const lockPath = join(root, 'budget.lock');
    let lock;
    try { lock = await open(lockPath, 'wx', 0o600); }
    catch { throw new AppError('budget-locked', 'Another portrait is reserving a generation. Please try again shortly.', 409); }
    try {
      const ledger = await readLedger(root);
      if (ledger.calls.length >= CALL_LIMIT) throw new AppError('budget-exhausted', 'The authorized generation allowance has been used. Saved portraits are still available.', 429);
      const entry = { number: ledger.calls.length + 1, reportId, startedAt: new Date().toISOString() };
      ledger.calls.push(entry);
      await atomicJSON(join(root, 'call-budget.json'), ledger);
      return entry;
    } finally { await lock.close(); await unlink(lockPath); }
  };
  const result = queue.then(work, work);
  queue = result.catch(() => {});
  return result;
}

export async function generateNarrative(research, { root, folder, reportId, signal, bridge: injectedBridge } = {}) {
  const bridge = injectedBridge ?? await bridgeModule();
  if (!bridge?.chat || process.env.SCHOLAR_DISABLE_MODEL === '1' || (!injectedBridge && !bridge.status?.().configured)) throw new AppError('model-unavailable', 'Portrait generation is not connected. You can still explore saved examples.', 503);
  const messages = makeMessages(research);
  const sessionId = 'scholar-' + randomUUID();
  const trace = { promptVersion: PROMPT_VERSION, reportId, request: { model: 'deepseek-flash', messages, max_tokens: 7800, thinking: 'disabled', response_format: { type: 'json_object' } }, startedAt: new Date().toISOString() };
  await atomicJSON(join(folder, 'request.json'), trace);
  const reservation = await reserveCall(root, reportId);
  const start = performance.now();
  let raw;
  try {
    raw = await bridge.chat({ session_id: sessionId, message: messages[1].content, model: 'deepseek-flash', thinking: 'disabled', max_tokens: 7800 }, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(165000)]) : AbortSignal.timeout(165000),
      fetch: async (url, init) => {
        const body = JSON.parse(init.body);
        body.messages = messages;
        body.response_format = { type: 'json_object' };
        return fetch(url, { ...init, body: JSON.stringify(body) });
      },
    });
    await atomicJSON(join(folder, 'response.json'), { ...raw, session_id: undefined, call: reservation.number, durationMs: Math.round(performance.now() - start) });
    if (raw.truncated || raw.finish_reason === 'length') throw new AppError('model-truncated', 'The portrait was cut short. Please explicitly try again to create a new one.', 502);
    let value, normalized;
    try { normalized = parseNarrative(raw.text, research.author.name); value = normalized.value; }
    catch { throw new AppError('model-format', 'The portrait returned in an unreadable format. Please try again.', 502); }
    const validation = { ...validateNarrative(value, research.papers, research.author.name), normalizations: normalized.fixes };
    await atomicJSON(join(folder, 'validation.json'), validation);
    if (!validation.ok) throw new AppError('model-evidence', 'The portrait did not pass its paper-reference checks. Please try again.', 502);
    return { narrative: value, generation: { mode: injectedBridge ? 'simulation' : 'ai', model: raw.model, usage: raw.usage, call: reservation.number, promptVersion: PROMPT_VERSION, durationMs: Math.round(performance.now() - start) } };
  } catch (e) {
    if (!raw) await atomicJSON(join(folder, 'response.json'), { call: reservation.number, failed: true, code: e.code ?? 'provider-error', durationMs: Math.round(performance.now() - start) });
    if (e instanceof AppError) throw e;
    throw new AppError('model-failed', 'Portrait generation did not finish. Please try again when you are ready; no automatic retry was made.', 502);
  } finally {
    if (bridge?.STATE) await unlink(join(bridge.STATE, 'sessions', sessionId + '.json')).catch(() => {});
  }
}
