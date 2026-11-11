import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicJSON } from './model.mjs';

const UA = 'ScholarPersona/0.2 (public historical biographies and licensed Wikimedia portraits)';
const pending = new Map();
const plain = (text, limit = 1200) => String(text ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
const qid = value => /^Q\d{1,14}$/.test(value ?? '') ? value : null;
const values = (entity, key) => (entity?.claims?.[key] ?? []).filter(c => c.rank !== 'deprecated' && c.mainsnak?.datavalue).sort((a, b) => Number(b.rank === 'preferred') - Number(a.rank === 'preferred'));
const yearOf = time => { const y = /^([+-])(\d{4,})-/.exec(time ?? ''); return y ? Number(y[2]) * (y[1] === '-' ? -1 : 1) : null; };
const bi = (object, fallback = '') => ({ en: plain(object?.en?.value ?? fallback, 800), zh: plain(object?.zh?.value ?? object?.['zh-hans']?.value ?? object?.['zh-cn']?.value ?? '', 800) });
export function rankAwards(awards) {
  const rank = a => a.kind === 'nobel' ? 100 : /\b(?:fields|turing|copley|abel|lasker|wolf)\b|\broyal medal\b/i.test(a.name.en) ? 80 : /\b(?:prize|medal|award|prix)\b/i.test(a.name.en) ? 60 : 20;
  return [...awards].sort((a, b) => rank(b) - rank(a));
}

async function getJSON(url, fetcher) {
  const response = await fetcher(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(18000), redirect: 'error' });
  if (!response.ok) throw new Error('Historical source unavailable');
  return response.json();
}

function wikiURL(language, params) {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  for (const [key,value] of Object.entries({action:'query',format:'json',...params})) url.searchParams.set(key,value);
  return url.href;
}

export async function resolvePersonSource(person, existing, fetcher = fetch) {
  if (qid(existing?.wikidata)) return existing;
  const name = plain(person?.name?.en,180), title = plain(person?.wikiTitle || name,180);
  if (!name && !title) return null;
  const lookup = async titles => {
    const data = await getJSON(wikiURL('en',{titles,redirects:'1',prop:'pageprops|extracts',ppprop:'wikibase_item|disambiguation',exintro:'1',explaintext:'1',exchars:'1200'}),fetcher);
    const page = Object.values(data.query?.pages ?? {}).find(p=>!p.missing&&p.pageprops?.disambiguation===undefined&&qid(p.pageprops?.wikibase_item));
    return page ? {title:page.title,summary:plain(page.extract,1200),url:`https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`,wikidata:page.pageprops.wikibase_item,checkedAt:new Date().toISOString()} : null;
  };
  try {
    const exact = await lookup([...new Set([title,name])].filter(Boolean).join('|'));
    if (exact) return exact;
    const search = await getJSON(wikiURL('en',{list:'search',srsearch:name,srlimit:'3'}),fetcher);
    for (const hit of search.query?.search ?? []) {
      const found = await lookup(hit.title);
      if (found) return found;
    }
  } catch {}
  return null;
}

export function selectNobelAwards(data, personQid) {
  const laureate = data?.laureates?.find(l => l.wikidata?.id === personQid || l.wikidata?.url?.endsWith('/' + personQid));
  if (!laureate) return [];
  const zhCategories = { Physics: '诺贝尔物理学奖', Chemistry: '诺贝尔化学奖', 'Physiology or Medicine': '诺贝尔生理学或医学奖', Literature: '诺贝尔文学奖', Peace: '诺贝尔和平奖', 'Economic Sciences': '瑞典中央银行纪念阿尔弗雷德·诺贝尔经济学奖' };
  return (laureate.nobelPrizes ?? []).filter(p => p.prizeStatus === 'received').map(p => ({
    name: { en: plain(p.categoryFullName?.en, 300), zh: zhCategories[p.category?.en] ?? '诺贝尔奖' },
    motivation: { en: plain(p.motivation?.en, 800), zh: '' },
    year: Number(p.awardYear) || null, kind: 'nobel',
    url: p.links?.find(l => l.rel === 'external' && l.href?.startsWith('https://www.nobelprize.org/') && l.href.includes('/facts/'))?.href
      ?? `https://www.nobelprize.org/laureate/${laureate.id}`,
    source: 'NobelPrize.org',
  }));
}

async function biographyFacts(profile, source, folder, fetcher) {
  if (profile.biographyFactsVersion === 1) return profile;
  let awards = rankAwards(profile.awards ?? []);
  if (awards.some(a => a.kind === 'nobel' && !a.motivation?.en)) {
    try {
      const url = new URL('https://api.nobelprize.org/2.1/laureates');
      url.searchParams.set('name',source.title||profile.name.en);url.searchParams.set('limit','20');
      const verified = selectNobelAwards(await getJSON(url.href,fetcher),profile.qid);
      awards = awards.map(a => a.kind === 'nobel' ? verified.find(v => v.year === a.year) ?? a : a);
    } catch {}
  }
  const updated = { ...profile, awards, biographyFactsVersion:1 };
  await atomicJSON(join(folder,'profile.json'),updated);
  return updated;
}

export function profileFacts(entity, related = {}, nobel = []) {
  const id = qid(entity.id);
  const introduction = bi(entity.descriptions);
  for (const language of ['en', 'zh']) introduction[language] = introduction[language].replace(/\s*[（(][\d\s?–—－-]{4,}[)）]\s*$/, '');
  const describe = (property, language, maximum) => values(entity, property).map(c => related[c.mainsnak.datavalue.value.id]).filter(Boolean).map(e => bi(e.labels)[language]).filter(Boolean).slice(0, maximum);
  if (!introduction.zh) {
    const countries = describe('P27', 'zh', 2), occupations = describe('P106', 'zh', 2);
    introduction.zh = occupations.join('、') || countries.join('／');
  }
  const notableWorks = values(entity, 'P800').map(c => related[c.mainsnak.datavalue.value.id]).filter(Boolean).slice(0, 3).map(e => ({
    id: e.id, name: bi(e.labels, e.id), description: bi(e.descriptions), url: `https://www.wikidata.org/wiki/${e.id}`,
  }));
  const awards = values(entity, 'P166').map(c => {
    const e = related[c.mainsnak.datavalue.value.id];
    return e ? { name: bi(e.labels, e.id), year: yearOf(c.qualifiers?.P585?.[0]?.datavalue?.value?.time),
      url: `https://www.wikidata.org/wiki/${e.id}`, source: 'Wikidata', kind: 'award' } : null;
  }).filter(Boolean).filter(a => !nobel.length || !/nobel/i.test(a.name.en)).map(a => /nobel/i.test(a.name.en) ? { ...a, kind: 'nobel' } : a);
  return { qid: id, name: bi(entity.labels), introduction,
    birthYear: yearOf(values(entity, 'P569')[0]?.mainsnak.datavalue.value.time),
    deathYear: yearOf(values(entity, 'P570')[0]?.mainsnak.datavalue.value.time),
    notableWorks, awards: rankAwards([...nobel, ...awards]).slice(0, 3),
    sourceUrl: `https://www.wikidata.org/wiki/${id}`,
  };
}

async function cachePortrait(imageName, info, entity, folder, fetcher, resolvedVia) {
  try {
    const meta = info?.extmetadata;
    const license = plain(meta?.LicenseShortName?.value, 100);
    // Only Commons assets with an explicit reusable license are cached.
    if (!info || !license || !/^(CC|Public domain|PD|Attribution|GFDL)/i.test(license)) return null;
    const source = new URL(info.thumburl ?? info.url);
    if (!['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(source.hostname) || source.protocol !== 'https:') return null;
    source.search = '';
    const response = await fetcher(source.href, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000), redirect: 'error' });
    const mime = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 1000 || bytes.length > 5000000) return null;
    await writeFile(join(folder, 'portrait.bin'), bytes);
    const portrait = { url: `/api/people/${entity.id}/portrait`, mime, width: info.thumbwidth ?? null, height: info.thumbheight ?? null,
      file: imageName, artist: plain(meta.Artist?.value, 600), license, licenseUrl: meta.LicenseUrl?.value ?? null,
      sourceUrl: info.descriptionurl, originUrl: source.href,
      title: plain(meta.ObjectName?.value ?? imageName, 300), resolvedVia, checkedAt: new Date().toISOString() };
    await atomicJSON(join(folder, 'portrait-provenance.json'), portrait);
    return portrait;
  } catch { return null; }
}

async function loadPortrait(entity, source, folder, fetcher) {
  const tried = new Set();
  const byFile = async (file,via) => {
    if (typeof file!=='string'||file.length>400||tried.has(file)) return null;
    tried.add(file);
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    for(const [k,v] of Object.entries({action:'query',titles:'File:'+file,prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'480',format:'json'}))url.searchParams.set(k,v);
    try {const d=await getJSON(url.href,fetcher);return await cachePortrait(file,Object.values(d.query?.pages??{})[0]?.imageinfo?.[0],entity,folder,fetcher,via);}catch{return null;}
  };
  for(const c of values(entity,'P18').slice(0,3)){
    const result=await byFile(c.mainsnak.datavalue.value,'wikidata-image');if(result)return result;
  }
  try{
    const title=entity.sitelinks?.enwiki?.title||source.title;
    const d=await getJSON(wikiURL('en',{titles:title,redirects:'1',prop:'pageimages',piprop:'name',pilicense:'free'}),fetcher);
    const file=Object.values(d.query?.pages??{})[0]?.pageimage;
    const result=await byFile(file,'wikipedia-page-image');if(result)return result;
  }catch{}
  try{
    const url=new URL('https://commons.wikimedia.org/w/api.php');
    for(const [k,v] of Object.entries({action:'query',generator:'search',gsrsearch:`haswbstatement:P180=${entity.id} filetype:bitmap`,gsrnamespace:'6',gsrlimit:'5',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'480',format:'json'}))url.searchParams.set(k,v);
    const d=await getJSON(url.href,fetcher);
    const pages=Object.values(d.query?.pages??{}).sort((a,b)=>Number(/portrait/i.test(b.title))-Number(/portrait/i.test(a.title)));
    for(const page of pages){const result=await cachePortrait(page.title.replace(/^File:/,''),page.imageinfo?.[0],entity,folder,fetcher,'commons-depicts');if(result)return result;}
  }catch{}
  return null;
}

export function achievementExcerpt(text, language) {
  const sentences=String(text??'').split(language==='zh'?/(?<=[。！？])/u:/(?<=[.!?])\s+(?=[A-Z])/u);
  const marker=language==='zh'?/闻名|聞名|著名|发明|發明|发现|發現|提出|創立|创立|著有|得主|贡献|貢獻/:/known for|remembered for|invented|discovered|developed|introduced|pioneer|formulated|contributions? to|founder|authored/i;
  const found=sentences.find(s=>marker.test(s));if(!found)return '';
  const value=plain(found,1200);
  if(language==='zh')return value.length>55?value.slice(0,55)+'…':value;
  const words=value.split(/\s+/);return words.length>24?words.slice(0,24).join(' ')+'…':value;
}

async function additionalAchievement(entity, fetcher) {
  const result={en:'',zh:'',sources:{}};
  await Promise.all(['en','zh'].map(async language=>{
    const title=entity.sitelinks?.[language+'wiki']?.title;if(!title)return;
    try{const d=await getJSON(wikiURL(language,{titles:title,redirects:'1',prop:'extracts',exintro:'1',explaintext:'1',exchars:'1200'}),fetcher);const page=Object.values(d.query?.pages??{})[0];result[language]=achievementExcerpt(page?.extract,language);if(result[language])result.sources[language]=`https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ','_'))}`;}catch{}
  }));
  return result.en||result.zh?result:null;
}

export async function getHistoricalProfile(source, { root, fetcher = fetch, refresh = false } = {}) {
  const id = qid(source?.wikidata);
  if (!id) return null;
  const folder = join(root, 'people', id);
  if (!refresh) {
    const cached = await readFile(join(folder, 'profile.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (cached?.version === 2 && cached.portrait && (cached.awards?.length || cached.notableWorks?.length || cached.achievement) && cached.sourceStatus?.labels !== 'failed') return biographyFacts(cached,source,folder,fetcher);
  }
  const key = folder;
  if (pending.has(key)) return pending.get(key);
  const work = (async () => {
    try {
      await mkdir(folder, { recursive: true });
      const data = await getJSON(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, fetcher);
      const entity = data.entities?.[id];
      if (!entity) return null;
      await atomicJSON(join(folder, 'wikidata-source.json'), entity);
      const relatedIds = [...new Set(['P800', 'P106', 'P27', 'P101', 'P166'].flatMap(p => values(entity, p).map(c => qid(c.mainsnak.datavalue.value.id)).filter(Boolean)))].slice(0, 40);
      const relatedURL = new URL('https://www.wikidata.org/w/api.php');
      for (const [k, v] of Object.entries({ action: 'wbgetentities', ids: relatedIds.join('|'), props: 'labels|descriptions', languages: 'en|zh|zh-hans', format: 'json' })) relatedURL.searchParams.set(k, v);
      const nobelURL = new URL('https://api.nobelprize.org/2.1/laureates');
      nobelURL.searchParams.set('name', source.title || entity.labels?.en?.value || ''); nobelURL.searchParams.set('limit', '20');
      const outcomes = await Promise.allSettled([
        relatedIds.length ? getJSON(relatedURL.href, fetcher) : Promise.resolve({ entities: {} }),
        getJSON(nobelURL.href, fetcher), loadPortrait(entity, source, folder, fetcher),
      ]);
      const related = outcomes[0].status === 'fulfilled' ? outcomes[0].value.entities ?? {} : {};
      const nobelData = outcomes[1].status === 'fulfilled' ? outcomes[1].value : null;
      const facts = profileFacts(entity, related, selectNobelAwards(nobelData, id));
      const achievement = !facts.notableWorks.length&&!facts.awards.length ? await additionalAchievement(entity,fetcher) : null;
      const profile = { version: 2, biographyFactsVersion:1, ...facts, portrait: outcomes[2].status === 'fulfilled' ? outcomes[2].value : null,
        achievement,
        sourceStatus: { labels: outcomes[0].status === 'fulfilled' ? 'checked' : 'failed', nobel: outcomes[1].status === 'fulfilled' ? 'checked' : 'failed' },
        biographyUrl: source.url, checkedAt: new Date().toISOString(), sources: [facts.sourceUrl, ...(nobelData ? [nobelURL.href] : [])] };
      await atomicJSON(join(folder, 'profile.json'), profile);
      return profile;
    } catch { return null; }
  })();
  pending.set(key, work);
  try { return await work; } finally { pending.delete(key); }
}

export async function enrichReportPerson(report, options) {
  const source = await resolvePersonSource(report.narrative?.person,report.historicalSources?.[0]?.source,options?.fetcher);
  const profile = await getHistoricalProfile(source, options);
  if(!profile)return report;
  const historicalSources=[...(report.historicalSources??[])];
  historicalSources[0]={...(historicalSources[0]??{}),name:report.narrative?.person?.name,source,status:'source-found'};
  return { ...report, historicalSources, personProfile: profile };
}
