const $ = selector => document.querySelector(selector);
const demo = $('meta[name="scholar-mode"]')?.content === 'demo';
const appBase = new URL('.', document.baseURI);
const appPath = path => new URL(path.replace(/^\//,''), appBase).href;
const reportPath = id => appPath(demo ? `?report=${encodeURIComponent(id)}` : `report/${encodeURIComponent(id)}`);
const reportAtLocation = () => demo ? new URL(location.href).searchParams.get('report') : /^\/report\/([0-9a-f-]{36})$/.exec(location.pathname)?.[1];
const dictionary = {
  en: {
    method:'The idea', heading:'Who thinks<br><em>like you?</em>', deck:'Your research has a character of its own.\nMeet a mind from history that shares it.',
    inputLabel:'Researcher name or profile', placeholder:'Your name, Scholar profile, or ORCID', find:'Find my kindred mind', searching:'Finding your research…',
    inputHelp:'Enter a name, Google Scholar, ORCID, or OpenAlex profile.', tryExample:demo ? 'Explore a portrait:' : 'Or explore a portrait:',
    demoNote:'Explore three research portraits. Live generation is available in the source project.', viewSource:'Source on GitHub',
    choose:'Choose the right researcher', dismiss:'Dismiss', noCandidates:'No researchers found. Try a full name or an ORCID.',
    methodHeading:'A likeness, with footnotes.', methodCopy:'We look at how you ask questions, build tools, and weigh evidence. A selection of your papers and available abstracts connects your approach to a mind from history, with sources you can explore.',
    loadingHeading:'Reading between<br><em>the papers.</em>',
    papers:'Gathering a body of work', abstracts:'Looking for the methods behind the titles', reading:'Finding an intellectual connection', sources:'Checking the historical sources',
    readingDetail:'{count} papers in the reading sample · {abstracts} with abstracts', publicDetail:'Reading public publication records and available abstracts.',
    authorProfile:'OpenAlex profile', orcidProfile:'ORCID record', indexed:'{count} indexed works', readWork:'Read this work', noInstitution:'Affiliation not listed',
    scholarNote:'Scholar was used to identify the researcher. Publications will be read from OpenAlex and available abstract sources. Please confirm the right author.',
    orcidNote:'This ORCID is not linked in OpenAlex. These are name matches, so please check the author and affiliation.',
    confirmNote:'Check the name, affiliation, and research topics before creating a portrait.',
    back:'Back to search', download:'Save portrait', print:'Print / PDF', reportOf:'Research portrait of', profileSource:'Research profile',
    matchPrefix:'An intellectual kinship with', connection:'Why this connection', observations:'The character of the work', boundary:'Where the analogy stops',
    knownFor:'Known for', honours:'Major honours', imageSource:'Image source', portraitAlt:'Portrait of {name}', factsSource:'Life and achievements', aboutPerson:'About {name}',
    alternatives:'Other echoes', sourcesHeading:'The papers behind the portrait', sampleSummary:'{count} papers · {abstracts} with abstracts · {start}–{end}',
    sourceMethod:'How this reading was made', sourceMethodText:'The source is OpenAlex, with available abstracts supplemented by Crossref and Europe PMC. We fetch up to 30 influential and 30 recent records, deduplicate them, then select up to 24 papers to include recent, influential, and topic-diverse work. This is a sample, not an exhaustive career review.',
    reportScope:'This portrait draws on sampled publication titles, research topics, and available abstracts, rather than a full-text review.',
    attribution:'These are coauthored publications. The reading describes patterns in the work; authorship order alone does not establish an individual’s contribution. Titles and abstracts do not provide the full methods or results.',
    biographyNote:'Biographical links document the person’s identity and background. The comparison itself is an interpretation, not a finding from that biography.',
    sourceFound:'Biographical source', sourceUnavailable:'Biographical source could not be checked for this portrait.',
    abstract:'Available abstract', noAbstract:'No abstract was available for this paper. The reading used its title and publication metadata.',
    abstractWithheld:'An abstract was used in the original analysis. This public example links to the source rather than redistributing its text.',
    metadataOnly:'Title and metadata', abstractAvailable:'Abstract available', paperLink:'Read paper', recordLink:'OpenAlex record', abstractLink:'Abstract source',
    generated:'Generated {date}', aiLabel:'AI interpretation · DeepSeek', savedExample:'Saved example · real publication records',
    lastPortrait:'Continue your last portrait', loadingReport:'Opening your saved portrait', saveSuccess:'Portrait saved.', wait:'Please let this portrait finish first.',
    errors: {
      'invalid-input':'Enter a researcher name, Google Scholar profile, ORCID, or OpenAlex profile.',
      'invalid-orcid':'That ORCID check digit is incorrect. Check the identifier and try again.',
      'invalid-name':'Enter a researcher’s full name, for example “Jennifer Doudna”.',
      'unsupported-url':'Use a Google Scholar, ORCID, or OpenAlex researcher profile, or enter the researcher’s name.',
      'invalid-url':'Check the profile URL and try again.',
      'scholar-blocked':'Google Scholar did not expose this public profile. Enter the researcher’s name or ORCID instead.',
      'author-not-found':'No public researcher record was found. Try a full name or a different profile.',
      'source-unavailable':'The publication source did not respond. Please try again in a moment.',
      'source-rate-limit':'The publication source is busy. Please try again shortly.',
      'too-few-papers':'No public papers were found for this author. Try another profile.',
      'model-unavailable':'Portrait generation is not connected. You can still explore the saved examples.',
      'budget-exhausted':'The authorized generation allowance has been used. Saved portraits are still available.',
      'budget-unreadable':'The generation allowance record could not be read. No new request was sent.',
      'model-failed':'Portrait generation did not finish. Please try again when you are ready.',
      'model-format':'The portrait returned in an unreadable format. Please explicitly try again.',
      'model-evidence':'The portrait did not pass its paper-reference checks. Please explicitly try again.',
      'model-truncated':'The portrait was cut short. Please explicitly try again.',
      'report-not-found':'This portrait could not be found on this device. You can start a new one below.',
      'network':'The connection was interrupted. Please check your connection and try again.',
      'unexpected':'This portrait could not be completed. Please try again.',
    },
  },
  zh: {
    method:'关于这个想法', heading:'你的研究，<br><em>像谁？</em>', deck:'每一组研究，都有自己的气质。\n在历史中，遇见与你思路相通的人。',
    inputLabel:'研究者姓名或主页', placeholder:'姓名、Google Scholar 主页或 ORCID', find:'寻找我的学术知音', searching:'正在查找研究资料…',
    inputHelp:'输入姓名、Google Scholar、ORCID 或 OpenAlex 作者主页。', tryExample:demo ? '阅读研究画像：' : '也可以先读一份画像：',
    demoNote:'浏览三份研究画像。实时生成功能可通过源码项目运行。', viewSource:'GitHub 源码',
    choose:'哪一位是你要找的研究者？', dismiss:'收起', noCandidates:'未找到研究者。试试完整姓名或 ORCID。',
    methodHeading:'有相似，也有依据。', methodCopy:'从部分论文与可获取的摘要中，阅读你如何提问、构建工具与衡量证据，再寻找与你思路相通的历史人物。每条观察，都附上可查阅的来源。',
    loadingHeading:'在论文之间，<br><em>读出你的思路。</em>',
    papers:'正在收集研究论文', abstracts:'正在查找标题背后的研究方法', reading:'正在寻找思想与方法上的共鸣', sources:'正在核对历史人物资料',
    readingDetail:'本次阅读 {count} 篇论文，其中 {abstracts} 篇含摘要', publicDetail:'读取公开的论文记录与可获取的摘要。',
    authorProfile:'OpenAlex 主页', orcidProfile:'ORCID 记录', indexed:'收录 {count} 篇作品', readWork:'解读这些研究', noInstitution:'未提供机构信息',
    scholarNote:'已通过 Scholar 识别姓名。论文将从 OpenAlex 及可获取的摘要来源读取，请确认具体作者。',
    orcidNote:'这个 ORCID 尚未与 OpenAlex 关联。以下为同名搜索结果，请核对姓名与机构。',
    confirmNote:'生成画像前，请核对作者姓名、机构与研究方向。',
    back:'返回搜索', download:'保存画像', print:'打印 / PDF', reportOf:'研究画像', profileSource:'作者资料',
    matchPrefix:'与你的研究思路相通的人', connection:'为什么是这位人物', observations:'研究中呈现的气质', boundary:'这个类比止于何处',
    knownFor:'代表成就', honours:'重要荣誉', imageSource:'肖像来源', portraitAlt:'{name}的肖像', factsSource:'生平与成就来源', aboutPerson:'人物简介',
    alternatives:'其他思想回响', sourcesHeading:'画像背后的论文', sampleSummary:'{count} 篇论文 · {abstracts} 篇含摘要 · {start}–{end}',
    sourceMethod:'这份解读如何形成', sourceMethodText:'论文来源为 OpenAlex，并通过 Crossref 与 Europe PMC 补充可获取的摘要。分别获取最多 30 篇高被引与 30 篇近期记录，去重后选取最多 24 篇，兼顾近期研究、代表性成果与不同主题。这是一次抽样解读，并非完整学术生涯评估。',
    reportScope:'本次画像依据抽样论文的标题、研究主题与可获取的摘要，未进行全文评阅。',
    attribution:'这些论文可能由多人合作完成。解读针对这批研究呈现的特征；作者排序本身不能证明个人贡献。标题和摘要也不等于全文中的完整方法与结果。',
    biographyNote:'人物资料链接用于核对身份和背景；研究与人物之间的联系，是本次解读提出的类比。',
    sourceFound:'人物资料来源', sourceUnavailable:'本次未能核对到可用的人物资料页面。',
    abstract:'可获取的摘要', noAbstract:'本篇未获取到摘要，解读使用了标题与论文元数据。',
    abstractWithheld:'原始分析使用了这篇论文的摘要。公开案例保留来源链接，不转载摘要全文。',
    metadataOnly:'标题与元数据', abstractAvailable:'含摘要', paperLink:'阅读论文', recordLink:'OpenAlex 记录', abstractLink:'摘要来源',
    generated:'生成于 {date}', aiLabel:'AI 解读 · DeepSeek', savedExample:'已保存案例 · 真实论文记录',
    lastPortrait:'继续阅读上次的画像', loadingReport:'正在打开已保存的画像', saveSuccess:'画像已保存。', wait:'请先等待本次画像完成。',
    errors: {
      'invalid-input':'请输入研究者姓名、Google Scholar 主页、ORCID 或 OpenAlex 主页。',
      'invalid-orcid':'ORCID 校验位不正确，请检查后重试。',
      'invalid-name':'请输入研究者的完整姓名，例如 “Jennifer Doudna”。',
      'unsupported-url':'请使用 Google Scholar、ORCID 或 OpenAlex 作者主页，也可以直接输入姓名。',
      'invalid-url':'请检查主页链接后重试。',
      'scholar-blocked':'Google Scholar 未向本次请求提供公开主页。请改用研究者姓名或 ORCID。',
      'author-not-found':'未找到公开作者记录。请尝试完整姓名或其他主页。',
      'source-unavailable':'论文数据源暂时未响应，请稍后重试。',
      'source-rate-limit':'论文数据源目前较忙，请稍后重试。',
      'too-few-papers':'这份作者资料中未找到公开论文，请尝试其他主页。',
      'model-unavailable':'画像生成暂未连接，仍可阅读已保存的案例。',
      'budget-exhausted':'本项目授权的生成次数已用完，已保存的画像仍可阅读。',
      'budget-unreadable':'暂时无法读取调用额度记录，本次没有发送新的模型请求。',
      'model-failed':'画像未能生成完成。准备好后可手动重试。',
      'model-format':'返回的画像格式无法读取，请手动重试。',
      'model-evidence':'画像未通过论文引用校验，请手动重试。',
      'model-truncated':'画像内容未完整返回，请手动重试。',
      'report-not-found':'本机未找到这份画像，可以在下方重新开始。',
      'network':'连接中断，请检查网络后重试。',
      'unexpected':'本次画像未能完成，请重试。',
    },
  },
};

const storedLanguage = localStorage.getItem('scholar-language');
let lang = storedLanguage === 'zh' ? 'zh' : 'en';
let busy = false, currentReport = null, candidates = [], identity = null, exampleData = [], stage = 'papers', readingCount = null;
let activeError = null;
const t = (key, values = {}) => {
  let text = dictionary[lang][key] ?? dictionary.en[key] ?? key;
  for (const [name, value] of Object.entries(values)) text = text.replaceAll('{' + name + '}', String(value));
  return text;
};
const bi = value => value?.[lang] || value?.en || '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href = value => /^https?:\/\//i.test(value ?? '') ? esc(value) : '#';
const externalIcon = '<svg class="external-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M5 15 15 5M5 5h10v10"/></svg>';
const disclosureIcon = '<svg class="disclosure-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h14"/><path class="icon-vertical" d="M10 3v14"/></svg>';
const external = (url, label, cls = '', withIcon = false) => `<a href="${href(url)}" target="_blank" rel="noopener noreferrer" class="${cls}">${esc(label)}${withIcon ? externalIcon : ''}</a>`;
const number = value => new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(value);
const date = value => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { year:'numeric', month:'short', day:'numeric', timeZone:'Asia/Shanghai' }).format(new Date(value));
const historicalYear = value => value < 0 ? lang === 'zh' ? `公元前${Math.abs(value)}年` : `${Math.abs(value)} BCE` : String(value);
function personFacts(profile) {
  if (!profile) return '';
  const life = profile.birthYear ? `${historicalYear(profile.birthYear)}${profile.deathYear ? '–' + historicalYear(profile.deathYear) : ''}` : '';
  const known = profile.notableWorks?.slice(0,2) ?? [];
  if (!known.length && profile.achievement) known.push({ name: profile.achievement, description:{en:'',zh:''}, url:profile.achievement.sources?.[lang]??profile.achievement.sources?.en??profile.biographyUrl });
  const allAwards = profile.awards ?? [];
  const nobelAwards = allAwards.filter(a => a.kind === 'nobel');
  const awards = nobelAwards.length ? nobelAwards : allAwards.slice(0,2);
  return `${life ? `<p class="person-introduction person-years">${esc(life)}</p>` : ''}
    ${(known.length || awards.length) ? `<dl class="person-achievements">${known.length ? `<div><dt>${esc(t('knownFor'))}</dt><dd>${known.map(w => `<span class="notable-work">${external(w.url,bi(w.name),'',true)}${bi(w.description) ? `<span class="notable-description">${esc(bi(w.description))}</span>` : ''}</span>`).join('')}</dd></div>` : ''}${awards.length ? `<div><dt>${esc(t('honours'))}</dt><dd>${awards.map(a => `<span class="person-award${a.kind === 'nobel' ? ' nobel-award' : ''}">${a.year ? `<span class="honour-year">${esc(historicalYear(a.year))}</span>` : ''}${external(a.url,bi(a.name),'',true)}</span>`).join('')}</dd></div>` : ''}</dl>` : ''}`;
}
function personPicture(profile, name) {
  const p = profile?.portrait;
  if (!p) return '';
  const artist = p.artist?.replace(/\b(Unknown author)(?:\s+Unknown author)+\b/gi,'$1');
  return `<figure class="person-picture"><img src="${esc(p.url)}" width="${p.width || 480}" height="${p.height || 600}" alt="${esc(t('portraitAlt',{name}))}" decoding="async"><figcaption>${artist ? `<span>${esc(artist)}</span>` : ''}${external(p.sourceUrl,t('imageSource'))}<span class="image-license">${p.licenseUrl ? external(p.licenseUrl,p.license) : esc(p.license)}</span></figcaption></figure>`;
}

function personBiography(report) {
  const p=report.personProfile,name=bi(report.narrative.person.name);
  if(!p)return '';
  const role=bi(p.introduction).replace(/[。.]$/,'');
  const parts=[];
  if(role)parts.push(lang==='zh'?`${name}是${role}。`:`${name} ${p.deathYear?'was':'is'} ${/^(a|an)\s/i.test(role)?'':/^[aeiou]/i.test(role)?'an ':'a '}${role}.`);
  const award=(p.awards??[]).find(a=>a.kind==='nobel')??p.awards?.[0];
  if(award?.kind==='nobel'&&lang==='en'&&award.motivation?.en){
    const reason=award.motivation.en.replace(/^(for|in recognition of)\s+/i,'').replace(/[.!]$/,'');
    parts.push(`The ${award.year?award.year+' ':''}${award.name.en.replace(/^The\s+/i,'')} recognised ${reason}.`);
  }else{
    const works=(p.notableWorks??[]).slice(0,2).map(w=>bi(w.name));
    if(works.length)parts.push(lang==='zh'?`其代表成果包括${works.join('、')}。`:`Notable works and contributions include ${works.join(' and ')}.`);
    if(award)parts.push(lang==='zh'?`${award.year?award.year+'年，':''}${name}获得${bi(award.name)}。`:`${award.year?'In '+award.year+', ':''}${name} received ${bi(award.name).replace(/^The\s+/i,'the ')}.`);
  }
  return parts.join(lang==='zh'?'':' ');
}

function show(view) { for (const key of ['home','loading','report']) $('#' + key).hidden = key !== view; }
function setBusy(value) {
  busy = value;
  $('#search-button').disabled = value;
  $('#researcher').disabled = value;
  $('#search-button span').textContent = t(value && !$('#home').hidden ? 'searching' : 'find');
  $('#search-form').setAttribute('aria-busy', String(value));
  document.querySelectorAll('.candidate button').forEach(b => b.disabled = value);
}
function renderError() {
  $('#search-error').hidden = !activeError;
  $('#search-error').textContent = activeError ? dictionary[lang].errors[activeError.code] ?? activeError.message ?? dictionary[lang].errors.unexpected : '';
}
function error(value) { activeError = value; renderError(); }
function loadingText() {
  $('#loading-stage').textContent = t(stage);
  $('#loading-detail').textContent = readingCount ? t('readingDetail', readingCount) : t('publicDetail');
}
function setLanguage(next) {
  lang = next; localStorage.setItem('scholar-language', lang); document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  $('#researcher').placeholder = t('placeholder');
  $('#lang-en').setAttribute('aria-pressed', String(lang === 'en')); $('#lang-zh').setAttribute('aria-pressed', String(lang === 'zh'));
  document.title = lang === 'zh' ? 'Scholar Persona — 寻找你的学术知音' : 'Scholar Persona — Find your kindred mind';
  $('.skip-link').textContent = lang === 'zh' ? '跳转到正文' : 'Skip to content';
  $('.language-switch').setAttribute('aria-label', lang === 'zh' ? '语言' : 'Language');
  $('.site-header nav').setAttribute('aria-label', lang === 'zh' ? '主导航' : 'Main navigation');
  renderCandidates(); renderExamples(); renderError(); loadingText();
  if (currentReport) renderReport(currentReport);
  const last = localStorage.getItem('scholar-last-report');
  $('#recent-link').hidden = !last || busy || demo;
  if (last) { $('#recent-link').textContent = t('lastPortrait'); $('#recent-link').href = reportPath(last); }
  if (busy) setBusy(true);
}

function renderExamples() {
  $('#examples').hidden = !exampleData.length;
  $('#example-links').innerHTML = exampleData.map(ex => `<a href="${esc(reportPath(ex.id))}" data-example="${esc(ex.id)}">${esc(ex.authorName)}</a>`).join('');
}
function renderCandidates() {
  $('#candidate-view').hidden = !identity;
  if (!identity) return;
  $('#no-candidates').hidden = Boolean(candidates.length);
  const note = identity.identityNote === 'scholar-identity-only' ? 'scholarNote' : identity.identityNote === 'orcid-name-search' ? 'orcidNote' : 'confirmNote';
  $('#identity-note').textContent = t(note); $('#identity-note').hidden = false;
  $('#candidate-list').innerHTML = candidates.map(a => `<div class="candidate"><div><h3>${esc(a.name)}</h3><p>${esc(a.institutions.join(' · ') || t('noInstitution'))}</p>${a.topics.length ? `<p class="candidate-topics">${esc(a.topics.join(' · '))}</p>` : ''}<div class="candidate-links"><span>${esc(t('indexed',{count:number(a.worksCount)}))}</span>${external(a.source,t('authorProfile'))}${a.orcid ? external(a.orcid,t('orcidProfile')) : ''}</div></div><button type="button" data-author="${esc(a.id)}">${esc(t('readWork'))}<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h13m-5-5 5 5-5 5"/></svg></button></div>`).join('');
}

async function requestJSON(url, options = {}) {
  if (demo) url = url === '/api/examples' ? 'data/examples.json' : url.replace('/api/reports/','data/reports/') + '.json';
  let response;
  try { response = await fetch(appPath(url), options); } catch { throw {code:'network'}; }
  let data;
  try { data = await response.json(); } catch { throw {code:'network'}; }
  if (!response.ok) throw data;
  return data;
}
$('#search-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  error(null); identity = null; candidates = []; renderCandidates();
  setBusy(true);
  try {
    identity = await requestJSON('/api/resolve', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:$('#researcher').value})});
    candidates = identity.candidates; renderCandidates();
    $('#candidate-view').scrollIntoView({behavior:'smooth',block:'nearest'});
  } catch (e) { error(e); }
  finally { setBusy(false); if(candidates.length) $('#candidate-list button')?.focus({preventScroll:true}); }
});

$('#candidate-list').addEventListener('click', event => {
  const button = event.target.closest('[data-author]');
  if (button && !busy) analyze(button.dataset.author);
});
$('#clear-results').addEventListener('click', () => { if (busy) return; identity = null; candidates = []; renderCandidates(); $('#researcher').focus(); });
$('#lang-en').addEventListener('click', () => setLanguage('en'));
$('#lang-zh').addEventListener('click', () => setLanguage('zh'));

async function analyze(authorId) {
  setBusy(true); error(null); currentReport = null; readingCount = null; stage = 'papers'; loadingText();
  $('#loading-name').textContent = candidates.find(a => a.id === authorId)?.name ?? '';
  show('loading'); window.scrollTo({top:0,behavior:'instant'});
  try {
    let response;
    try { response = await fetch(appPath('/api/analyze'), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({authorId,actionId:crypto.randomUUID()})}); }
    catch { throw {code:'network'}; }
    if (!response.ok) throw await response.json();
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = '', result = null;
    const consume = line => {
      if (!line.trim()) return;
      const item = JSON.parse(line);
      if (item.type === 'error') throw item;
      if (item.type === 'progress') { stage = item.stage; if (item.count) readingCount = {count:item.count,abstracts:item.abstracts}; loadingText(); }
      if (item.type === 'result') result = item.report;
    };
    while (true) { const {value,done} = await reader.read(); buffer += decoder.decode(value ?? new Uint8Array(), {stream:!done}); const lines = buffer.split('\n'); buffer = lines.pop(); for (const line of lines) consume(line); if (done) break; }
    if (buffer.trim()) consume(buffer);
    if (!result) throw {code:'network'};
    currentReport = result; history.pushState({},'',reportPath(result.id)); localStorage.setItem('scholar-last-report', result.id);
    renderReport(result); show('report'); $('#report').setAttribute('tabindex','-1'); $('#report').focus({preventScroll:true});
  } catch (e) { show('home'); error(e); $('#search-form').scrollIntoView({block:'center'}); }
  finally { setBusy(false); }
}

function renderReport(report) {
  const openPapers = new Set([...document.querySelectorAll('.paper[open]')].map(p => p.id));
  const n = report.narrative, paperNumber = new Map(report.papers.map((p,i) => [p.id,i+1]));
  const refs = list => `<span class="refs">${[...new Set(list)].map(id => `<a class="ref" href="#paper-${esc(id)}" data-paper="${esc(id)}" aria-label="${lang === 'zh' ? '查看论文' : 'View paper'} ${paperNumber.get(id)}">[${paperNumber.get(id)}]</a>`).join('')}</span>`;
  const prose = text => esc(text).replace(/\bW\d{5,18}\b/g, id => paperNumber.has(id) ? refs([id]) : id);
  const biography = (index, cls = '') => {
    const source = report.historicalSources?.[index]?.source;
    return source ? external(source.url,t('sourceFound'),cls,true) : `<span class="${cls}">${esc(t('sourceUnavailable'))}</span>`;
  };
  $('#report').innerHTML = `
    <div class="report-toolbar"><button type="button" class="text-button" data-action="back">${esc(t('back'))}</button><div class="toolbar-actions"><button type="button" class="text-button" data-action="download">${esc(t('download'))}</button><button type="button" class="text-button" data-action="print">${esc(t('print'))}</button></div></div>
    <header class="report-author"><div><h1>${esc(report.author.name)}</h1><p>${esc(report.author.institutions.join(' · '))}</p></div>${external(report.author.source,t('profileSource'),'author-source',true)}</header>
    <section class="portrait-opening"><div class="portrait-identity${report.personProfile?.portrait ? ' has-picture' : ''}"><div><h2><span class="match-prefix">${esc(t('matchPrefix'))}</span>${esc(bi(n.person.name))}${lang === 'en' ? '.' : '。'}</h2>${personFacts(report.personProfile)}</div>${personPicture(report.personProfile,bi(n.person.name))}${personBiography(report)?`<div class="person-bio"><p class="portrait-lead">${esc(personBiography(report))}</p></div>`:''}</div></section>
    <section class="connection"><h2>${esc(t('connection'))}</h2><div><p class="prose">${prose(bi(n.person.connection))}${refs(n.person.paperIds)}</p>${report.personProfile ? external(report.personProfile.biographyUrl || report.personProfile.sourceUrl,t('factsSource'),'source-link',true) : biography(0,'source-link')}</div></section>
    <section class="trait-section"><h2>${esc(t('observations'))}</h2><div class="traits">${n.traits.map(trait => `<section class="trait"><h3>${esc(bi(trait.title))}</h3><p class="prose">${prose(bi(trait.body))}${refs(trait.paperIds)}</p></section>`).join('')}</div></section>
    <aside class="boundary"><strong>${esc(t('boundary'))}</strong><p>${prose(bi(n.person.boundary))}</p></aside>
    ${n.alternatives.length ? `<section class="alternatives"><h2>${esc(t('alternatives'))}</h2>${n.alternatives.map((a,i) => `<section class="alternative"><div><h3>${esc(bi(a.name))}</h3>${biography(i+1,'bio-link')}</div><p class="prose">${prose(bi(a.reason))}${refs(a.paperIds)}</p></section>`).join('')}</section>` : ''}
    <section class="source-section" id="paper-sources"><h2>${esc(t('sourcesHeading'))}</h2><p class="corpus-summary">${esc(t('sampleSummary',{count:report.corpus.sampledWorks,abstracts:report.corpus.withAbstract,start:report.corpus.yearStart,end:report.corpus.yearEnd}))} · ${esc(bi(n.field))}</p>
    <details class="source-notes"><summary>${esc(t('sourceMethod'))}${disclosureIcon}</summary><div class="source-note-content"><p>${esc(t('sourceMethodText'))}</p><p>${esc(t('attribution'))}</p><p>${esc(t('aiLabel'))} · ${esc(t('generated',{date:date(report.createdAt)}))}</p></div></details>
    <div class="paper-list">${report.papers.map((p,i) => `<details class="paper" id="paper-${esc(p.id)}" ${openPapers.has('paper-' + p.id) ? 'open' : ''}><summary><span class="paper-number">${i+1}.</span><span class="paper-title">${esc(p.title)}<span class="paper-meta">${esc(p.year)}${p.venue ? ' · ' + esc(p.venue) : ''} · ${esc(t(p.abstract || p.abstractWithheld ? 'abstractAvailable' : 'metadataOnly'))}</span></span><span class="paper-toggle" aria-hidden="true">${disclosureIcon}</span></summary><div class="paper-detail"><span class="abstract-label">${esc(t(p.abstract || p.abstractWithheld ? 'abstract' : 'metadataOnly'))}</span><p>${esc(p.abstract || t(p.abstractWithheld ? 'abstractWithheld' : 'noAbstract'))}</p><div class="paper-links">${p.doi ? external(p.doi,t('paperLink'),'',true) : ''}${external(p.url,t('recordLink'),'',true)}${p.abstractSource && p.abstractSource !== p.url ? external(p.abstractSource,t('abstractLink'),'',true) : ''}</div></div></details>`).join('')}</div></section>`;
}

$('#report').addEventListener('click', event => {
  const ref = event.target.closest('[data-paper]');
  if (ref) { event.preventDefault(); const paper = $('#paper-' + ref.dataset.paper); if (paper) { paper.open = true; paper.scrollIntoView({behavior:'smooth',block:'start'}); paper.querySelector('summary').focus({preventScroll:true}); } }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'back') goHome();
  if (action === 'print') window.print();
  if (action === 'download') downloadReport();
});

function downloadReport() {
  if (!currentReport) return;
  const r = currentReport, n = r.narrative;
  const list = ids => ids.map(id => `[${r.papers.findIndex(p=>p.id === id)+1}]`).join(' ');
  const text = [r.author.name, `${t('matchPrefix')} ${bi(n.person.name)}`, t('aboutPerson',{name:bi(n.person.name)}), personBiography(r),
    ...(r.personProfile ? [bi(r.personProfile.introduction),t('knownFor'),...(r.personProfile.notableWorks??[]).map(w=>`${bi(w.name)}${bi(w.description)?': '+bi(w.description):''}\n${w.url}`),t('honours'),...(r.personProfile.awards??[]).map(a=>`${a.year||''} ${bi(a.name)}\n${a.url}`),r.personProfile.portrait ? `${t('imageSource')}: ${r.personProfile.portrait.sourceUrl} — ${r.personProfile.portrait.artist} · ${r.personProfile.portrait.license}` : ''] : []),
    t('connection'), bi(n.person.connection) + ' ' + list(n.person.paperIds),
    ...n.traits.flatMap(p => [bi(p.title),bi(p.body) + ' ' + list(p.paperIds)]), t('boundary'),bi(n.person.boundary),
    t('alternatives'), ...n.alternatives.flatMap(p => [bi(p.name),bi(p.reason) + ' ' + list(p.paperIds)]),
    t('sourcesHeading'),t('reportScope'), t('sourceMethodText'),t('attribution'),
    ...r.papers.map((p,i)=>`[${i+1}] ${p.title} (${p.year})\n${p.doi || p.url}`),
    ...r.historicalSources.filter(s=>s.source).map(s=>`${bi(s.name)}: ${s.source.url}`),
    t('aiLabel'),t('generated',{date:date(r.createdAt)}),
  ].join('\n\n').replace(/\bW\d{5,18}\b/g,id=>{const index=r.papers.findIndex(p=>p.id===id);return index>=0?`[${index+1}]`:id;});
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href=url; a.download=`Scholar-Persona-${r.author.name.replace(/[^\p{L}\p{N} -]/gu,'')}-${lang}.txt`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000); toast(t('saveSuccess'));
}
function toast(text) { $('#toast').textContent=text; $('#toast').hidden=false; setTimeout(()=>$('#toast').hidden=true,2600); }
function goHome() {
  if (busy) return toast(t('wait'));
  currentReport=null; show('home'); history.pushState({},'',appBase.href); error(null); setLanguage(lang); window.scrollTo({top:0,behavior:'instant'}); $(demo ? '#home-heading' : '#researcher').focus({preventScroll:true});
}
$('.wordmark').addEventListener('click', e=>{e.preventDefault();goHome();});
$('.method-link').addEventListener('click', e=>{if($('#home').hidden){e.preventDefault();if(busy)return toast(t('wait'));goHome();$('#method').scrollIntoView({behavior:'smooth'});}});

async function openReport(id) {
  error(null); stage='loadingReport';readingCount=null;loadingText();$('#loading-name').textContent='';show('loading');
  try { currentReport=await requestJSON('/api/reports/'+encodeURIComponent(id));renderReport(currentReport);show('report'); }
  catch(e){show('home');error(e);}
}
window.addEventListener('popstate',()=>{const id=reportAtLocation();if(id)openReport(id);else {currentReport=null;show('home');}});
$('#search-form').hidden = demo;
$('#demo-note').hidden = !demo;
$('#home-heading').tabIndex = -1;
setLanguage(lang);
requestJSON('/api/examples').then(data=>{exampleData=data;renderExamples();}).catch(()=>{});
const initialReport=reportAtLocation();
if(initialReport)openReport(initialReport);
