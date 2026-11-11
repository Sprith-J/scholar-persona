export class AppError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

const OA = 'https://api.openalex.org';
const UA = 'ScholarPersona/0.1 (public scholarly metadata research prototype)';
const tidy = (s, max = 1000) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const authorId = value => {
  const match = /^(?:https:\/\/openalex\.org\/)?(A\d{5,16})$/i.exec(String(value ?? ''));
  if (!match) throw new AppError('invalid-author', 'Choose a researcher from the search results.');
  return match[1].toUpperCase();
};

export function validOrcid(value) {
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(value)) return false;
  const digits = value.replace(/-/g, '').toUpperCase();
  let total = 0;
  for (const digit of digits.slice(0, 15)) total = (total + Number(digit)) * 2;
  const check = (12 - total % 11) % 11;
  return digits[15] === (check === 10 ? 'X' : String(check));
}

export function parseIdentity(raw) {
  const input = String(raw ?? '').trim();
  if (!input || input.length > 500) throw new AppError('invalid-input', 'Enter a researcher name, Google Scholar profile, ORCID, or OpenAlex profile.');
  const orcid = /^(?:https?:\/\/(?:www\.)?orcid\.org\/)?(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\/?$/i.exec(input);
  if (orcid) {
    if (!validOrcid(orcid[1])) throw new AppError('invalid-orcid', 'That ORCID check digit is incorrect. Check the identifier and try again.');
    return { type: 'orcid', value: orcid[1].toUpperCase() };
  }
  if (/^(?:https:\/\/openalex\.org\/)?A\d+\/?$/i.test(input)) return { type: 'openalex', value: authorId(input.replace(/\/$/, '')) };
  if (/^(https?:\/\/|www\.)/i.test(input) || /^scholar\.google\./i.test(input)) {
    let url;
    try { url = new URL(/^https?:/.test(input) ? input : `https://${input}`); } catch { throw new AppError('invalid-url', 'Check the profile URL and try again.'); }
    if (/^scholar\.google\.(com|com\.hk|co\.uk|com\.sg|com\.cn|cn|de|fr|co\.jp|co\.in|ca|com\.au)$/.test(url.hostname)
      && url.pathname === '/citations' && /^[\w-]{5,40}$/.test(url.searchParams.get('user') ?? '')) {
      return { type: 'scholar', value: url.searchParams.get('user'), url: `https://scholar.google.com/citations?user=${encodeURIComponent(url.searchParams.get('user'))}&hl=en` };
    }
    throw new AppError('unsupported-url', 'Use a Google Scholar, ORCID, or OpenAlex researcher profile, or enter the researcher’s name.');
  }
  if (input.length < 2 || input.length > 140 || /[<>\u0000-\u001f]/.test(input)) throw new AppError('invalid-name', 'Enter a researcher’s name, for example “Jennifer Doudna”.');
  return { type: 'name', value: input };
}

export function abstractFromIndex(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) return '';
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) if (Number.isInteger(position) && position >= 0 && position < 3500) words[position] = word;
  }
  return tidy(words.join(' '), 5000);
}

async function json(url, { fetcher = fetch, signal, headers } = {}) {
  let response;
  try { response = await fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': UA, ...headers }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(18000)]) : AbortSignal.timeout(18000), redirect: 'error' }); }
  catch { throw new AppError('source-unavailable', 'The publication source did not respond. Please try again in a moment.', 503); }
  if (response.status === 404) return null;
  if (!response.ok) throw new AppError(response.status === 429 ? 'source-rate-limit' : 'source-unavailable', response.status === 429 ? 'The publication source is busy. Please try again shortly.' : 'The publication source is temporarily unavailable.', 503);
  try { return await response.json(); } catch { throw new AppError('source-unavailable', 'The publication source returned an unreadable response.', 503); }
}

function oaURL(path, params = {}, key) {
  const url = new URL(path, OA);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  if (key) url.searchParams.set('api_key', key);
  return url.href;
}

export function normalizeAuthor(a) {
  return {
    id: authorId(a.id), name: tidy(a.display_name, 200),
    institutions: (a.last_known_institutions ?? []).slice(0, 3).map(i => tidy(i.display_name, 180)),
    worksCount: Number(a.works_count) || 0, orcid: a.orcid || null,
    topics: (a.topics ?? []).slice(0, 3).map(t => tidy(t.display_name, 100)),
    source: a.id,
  };
}

export async function resolveIdentity(raw, options = {}) {
  const identity = parseIdentity(raw);
  let name = identity.value;
  let identityNote = null;
  if (identity.type === 'openalex' || identity.type === 'orcid') {
    const path = identity.type === 'orcid' ? `/authors/https://orcid.org/${identity.value}` : `/authors/${identity.value}`;
    const a = await json(oaURL(path, {}, options.apiKey), options);
    if (a?.id) return { candidates: [normalizeAuthor(a)], via: identity.type, identityNote, identitySource: identity.type === 'orcid' ? `https://orcid.org/${identity.value}` : a.id };
    if (identity.type === 'openalex') throw new AppError('author-not-found', 'That OpenAlex researcher could not be found.', 404);
    const person = await json(`https://pub.orcid.org/v3.0/${identity.value}/person`, options);
    name = [person?.name?.['given-names']?.value, person?.name?.['family-name']?.value].filter(Boolean).join(' ');
    if (!name) throw new AppError('author-not-found', 'No public name is available for that ORCID. Try the researcher’s name instead.', 404);
    identityNote = 'orcid-name-search';
  }
  if (identity.type === 'scholar') {
    let html = '';
    try {
      const response = await (options.fetcher ?? fetch)(identity.url, { signal: AbortSignal.timeout(12000), redirect: 'error', headers: { 'User-Agent': UA } });
      if (response.ok) html = await response.text();
    } catch {}
    const scholarName = /id=["']gsc_prf_in["'][^>]*>([^<]{2,300})</i.exec(html)?.[1];
    if (!scholarName) throw new AppError('scholar-blocked', 'Google Scholar did not expose this public profile. Enter the researcher’s name or ORCID instead.', 422);
    name = tidy(scholarName.replace(/&amp;/g, '&').replace(/&#39;/g, "'"), 140);
    identityNote = 'scholar-identity-only';
  }
  const data = await json(oaURL('/authors', { search: name, per_page: 8 }, options.apiKey), options);
  const candidates = (data?.results ?? []).filter(a => a.id && a.display_name).map(normalizeAuthor);
  return { candidates, via: identity.type, searchedName: name, identityNote, identitySource: identity.url ?? (identity.type === 'orcid' ? `https://orcid.org/${identity.value}` : null) };
}

export function normalizeWork(work, targetId) {
  const authorship = (work.authorships ?? []).find(a => a.author?.id?.endsWith('/' + targetId));
  if (!authorship || work.is_retracted || !work.title || !['article', 'review', 'preprint', 'book-chapter', 'book', 'proceedings-article'].includes(work.type)) return null;
  const id = /\/(W\d+)$/.exec(work.id ?? '')?.[1];
  if (!id) return null;
  const abstract = abstractFromIndex(work.abstract_inverted_index);
  return {
    id, title: tidy(work.title, 600), year: Number(work.publication_year) || null,
    doi: /^https:\/\/doi\.org\/10\./i.test(work.doi ?? '') ? work.doi : null,
    url: work.id, citedBy: Number(work.cited_by_count) || 0, type: work.type,
    abstract, abstractSource: abstract ? work.id : null,
    topics: (work.topics ?? []).slice(0, 3).map(t => ({ name: tidy(t.display_name, 160), field: tidy(t.field?.display_name, 120), domain: tidy(t.domain?.display_name, 120) })),
    venue: tidy(work.primary_location?.source?.display_name, 200),
    authorPosition: authorship.author_position ?? 'unknown', corresponding: Boolean(authorship.is_corresponding),
    authorsCount: (work.authorships ?? []).length,
  };
}

export function sampleWorks(works, limit = 24) {
  const seen = new Set();
  const unique = works.filter(w => {
    const key = (w.doi ?? w.title.toLowerCase()).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const picked = new Map();
  const add = (w, reason) => {
    if (picked.has(w.id)) { if (!picked.get(w.id).sampleReasons.includes(reason)) picked.get(w.id).sampleReasons.push(reason); }
    else if (picked.size < limit) picked.set(w.id, { ...w, sampleReasons: [reason] });
  };
  [...unique].sort((a, b) => b.citedBy - a.citedBy).slice(0, 8).forEach(w => add(w, 'influential'));
  [...unique].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 8).forEach(w => add(w, 'recent'));
  const fields = new Set();
  for (const w of unique) {
    const field = w.topics[0]?.name ?? w.type;
    if (!fields.has(field)) { add(w, 'breadth'); fields.add(field); }
  }
  unique.forEach(w => add(w, 'additional'));
  return [...picked.values()];
}

async function enrichAbstract(work, options) {
  if (work.abstract || !work.doi) return work;
  const doi = work.doi.slice('https://doi.org/'.length);
  try {
    const result = await json(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, options);
    const a = tidy(result?.message?.abstract, 5000);
    if (a && result.message.DOI?.toLowerCase() === doi.toLowerCase()) return { ...work, abstract: a, abstractSource: `https://api.crossref.org/works/${encodeURIComponent(doi)}` };
  } catch {}
  if (work.topics.some(t => /life sciences|health sciences/i.test(t.domain))) {
    try {
      const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
      url.searchParams.set('query', `DOI:"${doi.replace(/["\\]/g, '')}"`);
      url.searchParams.set('format', 'json'); url.searchParams.set('resultType', 'core'); url.searchParams.set('pageSize', '1');
      const d = await json(url.href, options);
      const p = d?.resultList?.result?.[0];
      if (p?.doi?.toLowerCase() === doi.toLowerCase() && p.abstractText) return { ...work, abstract: tidy(p.abstractText, 5000), abstractSource: url.href };
    } catch {}
  }
  return work;
}

export async function loadResearch(idValue, options = {}) {
  const id = authorId(idValue);
  options.onProgress?.('papers');
  const fields = 'id,title,doi,publication_year,cited_by_count,type,is_retracted,abstract_inverted_index,topics,authorships,primary_location';
  const [rawAuthor, influential, recent] = await Promise.all([
    json(oaURL(`/authors/${id}`, {}, options.apiKey), options),
    json(oaURL('/works', { filter: `author.id:${id}`, sort: 'cited_by_count:desc', per_page: 30, select: fields }, options.apiKey), options),
    json(oaURL('/works', { filter: `author.id:${id}`, sort: 'publication_date:desc', per_page: 30, select: fields }, options.apiKey), options),
  ]);
  if (!rawAuthor) throw new AppError('author-not-found', 'This researcher could not be found.', 404);
  const raw = [...(influential?.results ?? []), ...(recent?.results ?? [])];
  let papers = sampleWorks(raw.map(w => normalizeWork(w, id)).filter(Boolean));
  if (!papers.length) throw new AppError('too-few-papers', 'No public papers were found for this author. Try another profile.', 422);
  options.onProgress?.('abstracts');
  const missing = papers.filter(p => !p.abstract && p.doi).slice(0, 8);
  for (let start = 0; start < missing.length; start += 4) {
    const batch = await Promise.all(missing.slice(start, start + 4).map(w => enrichAbstract(w, options)));
    for (const paper of batch) papers = papers.map(p => p.id === paper.id ? paper : p);
  }
  const years = papers.map(p => p.year).filter(Boolean);
  return {
    version: 'research-evidence-0.1', author: normalizeAuthor(rawAuthor), fetchedAt: new Date().toISOString(),
    corpus: { source: 'OpenAlex', indexedWorks: Number(influential?.meta?.count ?? rawAuthor.works_count) || null,
      fetchedRecords: new Set(raw.map(w => w.id)).size, sampledWorks: papers.length,
      withAbstract: papers.filter(p => p.abstract).length, yearStart: Math.min(...years), yearEnd: Math.max(...years),
      sampling: 'Up to 30 most-cited and 30 newest records; deduplicated; up to 24 papers mixing influential, recent, and topic-diverse work. Retracted works are excluded.' },
    papers,
  };
}

export async function historicalSource(wikiTitle, options = {}) {
  if (typeof wikiTitle !== 'string' || !wikiTitle.trim() || wikiTitle.length > 180 || /[<>\/?#]/.test(wikiTitle)) return null;
  try {
    const d = await json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle.replaceAll(' ', '_'))}`, options);
    if (!d?.extract || d.type === 'disambiguation' || !d.wikibase_item) return null;
    return { title: tidy(d.title, 200), summary: tidy(d.extract, 1800), url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(d.title)}`, wikidata: d.wikibase_item, checkedAt: new Date().toISOString() };
  } catch { return null; }
}
