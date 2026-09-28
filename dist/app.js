const STORAGE_KEY = 'applyguard.v2';
const MAX_STORED_JOBS = 200;
const NOW = () => new Date().toISOString();
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const $ = (selector) => document.querySelector(selector);

const DEFAULT_STATE = {
  resume: { text: '', fileName: '', updatedAt: null },
  profile: { name: '', roles: '', industries: '', location: '', authorization: '', signals: [], evidence: [] },
  jobs: [], decisions: {}, packet: null, audit: [], lastRun: null,
  weights: { skills: 55, industry: 25, seniority: 20 },
  sourceRuns: []
};
let state = load();
state.jobs = compactJobs(state.jobs || []);
state.weights = { ...DEFAULT_STATE.weights, ...Object.fromEntries(Object.entries(state.weights || {}).filter(([key]) => key in DEFAULT_STATE.weights)) };
if (Object.values(state.weights).reduce((sum, value) => sum + value, 0) !== 100) allocateWeight('skills', state.weights.skills);

function load() {
  try { return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return structuredClone(DEFAULT_STATE); }
}
function persist(event, detail = '') {
  if (event) state.audit.unshift({ at: NOW(), event, detail });
  state.audit = state.audit.slice(0, 100);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch (error) { console.error('ApplyGuard could not save local data:', error); return false; }
}
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
function tokens(value = '') { return value.toLowerCase().replace(/[^a-z0-9+#/ ]/g, ' ').split(/\s+/).filter(x => x.length > 2); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function setStatus(id, message, bad = false) { const el = $(id); el.textContent = message; el.style.color = bad ? 'var(--red)' : ''; }
function containsSignal(text, term) {
  if (term === 'ai' || term === 'ml') return new RegExp(`\\b${term}\\b`, 'i').test(text);
  return text.includes(term);
}
function compactJobs(jobs) {
  return [...jobs].sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt)).slice(0, MAX_STORED_JOBS)
    .map(job => ({ ...job, description: String(job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500) }));
}

const SIGNALS = {
  'Product strategy': ['product strategy', 'roadmap', 'product vision', 'priorit'],
  'Experimentation': ['a/b', 'experiment', 'hypothesis', 'conversion', 'funnel'],
  'Analytics': ['analytics', 'sql', 'metrics', 'dashboard', 'data analysis'],
  'User research': ['user research', 'interview', 'usability', 'persona', 'discovery'],
  'Growth': ['growth', 'acquisition', 'retention', 'activation', 'engagement'],
  'AI / ML': ['ai', 'machine learning', 'ml', 'llm', 'nlp', 'model', 'ocr', 'ner'],
  'Search / discovery': ['search', 'discovery', 'relevance', 'query', 'recommendation'],
  'Platform / B2B': ['api', 'platform', 'saas', 'b2b', 'enterprise'],
  'Consumer product': ['consumer', 'b2c', 'ecommerce', 'marketplace', 'mobile app'],
  'Cross-functional delivery': ['engineering', 'design', 'stakeholder', 'cross-functional', 'agile']
};
const INDUSTRIES = {
  'Consumer / ecommerce': ['ecommerce', 'consumer', 'marketplace', 'retail', 'd2c'],
  'Health-tech': ['health', 'healthcare', 'doctor', 'patient', 'medical'],
  'Fintech': ['fintech', 'payments', 'banking', 'financial'],
  'SaaS / B2B': ['saas', 'enterprise', 'b2b', 'platform'],
  'AI products': ['ai', 'machine learning', 'llm', 'nlp', 'model']
};

function inferProfile(text) {
  const lower = text.toLowerCase();
  const signals = Object.entries(SIGNALS).filter(([, terms]) => terms.some(t => containsSignal(lower, t))).map(([name]) => name);
  const industries = Object.entries(INDUSTRIES).filter(([, terms]) => terms.some(t => containsSignal(lower, t))).map(([name]) => name);
  const roles = unique([
    lower.includes('growth') ? 'Growth Product Manager' : '',
    containsSignal(lower, 'ai') || containsSignal(lower, 'ml') || lower.includes('llm') ? 'AI Product Manager' : '',
    lower.includes('platform') || lower.includes('api') ? 'Platform Product Manager' : '',
    'Product Manager'
  ]);
  const lines = text.split(/\n|(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
  const evidence = lines.filter(line => /\d|%|increased|improved|grew|launched|built|led|owned|shipped|reduced/i.test(line) && line.length > 28)
    .slice(0, 6).map((text, index) => ({ id: uid(), title: `Resume evidence ${index + 1}`, text, verified: false }));
  const firstUseful = lines.find(x => x.length < 70 && !/resume|curriculum|experience|education|skills/i.test(x));
  const name = firstUseful && /^[A-Za-z .'-]+$/.test(firstUseful) ? firstUseful : '';
  return { name, signals, industries, roles, evidence };
}

async function parseResumeFile(file) {
  if (/text\/|\.txt$|\.md$/i.test(file.type + file.name)) return file.text();
  if (/\.pdf$|application\/pdf/i.test(file.type + file.name)) {
    const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber); const content = await page.getTextContent();
      pages.push(content.items.map(item => item.str).join(' '));
    }
    return pages.join('\n');
  }
  if (/\.docx$|officedocument/i.test(file.type + file.name)) {
    if (!window.mammoth) await new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
      script.onload = resolve; script.onerror = () => reject(new Error('The DOCX parser could not be downloaded.')); document.head.appendChild(script);
    });
    const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); return result.value;
  }
  throw new Error('Use a TXT, Markdown, PDF, or DOCX resume.');
}

function renderProfile() {
  const p = state.profile;
  const ready = Boolean(p.evidence?.length || state.resume.text);
  $('#resumeText').value = state.resume.text || '';
  $('#profileEmpty').hidden = ready; $('#profileSummary').hidden = !ready; $('#ledgerCard').hidden = !ready;
  if (!ready) return;
  $('#candidateName').textContent = p.name || 'Candidate';
  $('#initials').textContent = (p.name || 'PM').split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
  $('#candidateHeadline').textContent = p.roles || 'Product professional';
  $('#experienceSignals').textContent = p.signals?.join(' · ') || 'Review your resume signals';
  $('#targetRoles').textContent = p.roles || 'Add target roles';
  $('#targetIndustries').textContent = p.industries || 'Add target industries';
  $('#rolesInput').value = p.roles || ''; $('#industriesInput').value = p.industries || '';
  $('#locationInput').value = p.location || ''; $('#authorizationInput').value = p.authorization || '';
  $('#signalsList').innerHTML = (p.signals || []).map(signal => `<label><input type="checkbox" data-signal="${escapeHtml(signal)}" checked> ${escapeHtml(signal)}</label>`).join('') || '<span class="muted small">No strong signals were inferred. Add evidence manually if useful.</span>';
  $('#evidenceList').innerHTML = p.evidence.map(item => `<div class="evidence-item"><div><label>Evidence label ${item.verified ? '<span class="tag good">Verified</span>' : '<span class="tag gap">Review needed</span>'}<input data-evidence-title="${item.id}" value="${escapeHtml(item.title)}"></label><label class="small">Candidate-provided fact or achievement<textarea rows="3" data-evidence-text="${item.id}">${escapeHtml(item.text)}</textarea></label></div><button class="icon-button" data-delete-evidence="${item.id}" aria-label="Remove evidence">Remove</button></div>`).join('') || '<p class="muted">Add one or more evidence items before ranking jobs.</p>';
}

function saveProfile() {
  state.profile.roles = $('#rolesInput').value.trim(); state.profile.industries = $('#industriesInput').value.trim();
  state.profile.location = $('#locationInput').value.trim(); state.profile.authorization = $('#authorizationInput').value.trim();
  state.profile.signals = [...document.querySelectorAll('[data-signal]:checked')].map(input => input.dataset.signal);
  state.profile.evidence = state.profile.evidence.map(x => ({ ...x, title: $(`[data-evidence-title="${x.id}"]`)?.value.trim() || x.title, text: $(`[data-evidence-text="${x.id}"]`)?.value.trim() || x.text, verified: true })).filter(x => x.text);
  persist('Profile saved', 'Candidate reviewed profile and evidence ledger'); renderProfile(); renderJobs(); setStatus('#profileStatus', 'Profile saved. All current evidence is now marked verified.');
}

function normalizeJob(raw, source) {
  const date = raw.date || raw.publication_date || raw.created_at || raw.createdAt || NOW();
  return { id: `${source}:${raw.id || raw.url || raw.jobUrl || raw.title}`, source, title: raw.title || raw.position || 'Untitled Product role', company: raw.company_name || raw.company || raw.companyName || 'Unknown company', location: raw.candidate_required_location || raw.location || 'Not specified', url: raw.url || raw.jobUrl || raw.redirect_url || '', description: String(raw.description || raw.job_description || raw.snippet || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500), postedAt: date, tags: raw.tags || raw.category || [] };
}

async function runSearch() {
  if (!state.profile.evidence?.length) { alert('Build and save your evidence ledger before running a search.'); location.hash = '#profile'; return; }
  $('#runSearch').disabled = true; $('#runSearch').textContent = 'Searching public feeds…'; setStatus('#searchStatus', 'Checking public job sources…');
  const sources = [
    { name: 'Remotive', url: 'https://remotive.com/api/remote-jobs?category=product', parse: x => x.jobs || [] },
    { name: 'Arbeitnow', url: 'https://www.arbeitnow.com/api/job-board-api', parse: x => x.data || [] },
    { name: 'Remote OK', url: 'https://remoteok.com/api', parse: x => Array.isArray(x) ? x.slice(1) : [] }
  ];
  try {
    const results = await Promise.allSettled(sources.map(async s => {
      const response = await fetch(s.url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json(); return { name: s.name, jobs: s.parse(data).map(x => normalizeJob(x, s.name)) };
    }));
    const runs = results.map((r, i) => r.status === 'fulfilled' ? { name: sources[i].name, status: 'ok', count: r.value.jobs.length, message: `${r.value.jobs.length} roles received` } : { name: sources[i].name, status: 'warn', count: 0, message: 'Unavailable in this browser right now' });
    const jobs = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.jobs).filter(isProductJob);
    state.jobs = compactJobs(dedupeJobs(jobs)); state.sourceRuns = runs; state.lastRun = NOW(); persist('Job search run', `${state.jobs.length} stored product roles from public feeds`);
    renderSources(); renderJobs(); setStatus('#searchStatus', `Search complete: ${state.jobs.length} product roles found before your date filter.`);
  } catch (error) { setStatus('#searchStatus', `Search could not finish: ${error.message}`, true); }
  finally { $('#runSearch').disabled = false; $('#runSearch').textContent = 'Run today’s search'; }
}
function isProductJob(job) { return /product manager|product owner|product lead|product analyst|product director|growth product/i.test(`${job.title} ${job.description}`); }
function dedupeJobs(jobs) { const seen = new Set(); return jobs.filter(job => { const key = `${job.company}|${job.title}|${job.location}`.toLowerCase().replace(/\s+/g,' '); if (seen.has(key)) return false; seen.add(key); return true; }); }
function recentJobs() { const days = Number($('#dateFilter')?.value || 1); const threshold = Date.now() - days * 86400000; return state.jobs.filter(job => { const timestamp = Date.parse(job.postedAt); return !Number.isNaN(timestamp) && timestamp >= threshold; }); }

function assess(job) {
  const profile = state.profile; const all = `${job.title} ${job.description} ${job.tags}`.toLowerCase();
  const signalHits = (profile.signals || []).filter(signal => (SIGNALS[signal] || []).some(term => all.includes(term)));
  const evidenceHits = (profile.evidence || []).filter(item => tokens(item.text).some(term => term.length > 4 && all.includes(term))).slice(0, 3);
  const targetRoles = (profile.roles || '').split(',').map(role => role.trim().toLowerCase()).filter(Boolean);
  const roleHit = !targetRoles.length || targetRoles.some(role => job.title.toLowerCase().includes(role));
  const industries = tokens(profile.industries); const industryHit = industries.some(term => all.includes(term));
  const location = (profile.location || '').toLowerCase(); const locationHit = !location || (/remote/i.test(job.location) && /remote/i.test(location)) || tokens(location).some(term => job.location.toLowerCase().includes(term));
  const skills = Math.min(state.weights.skills, Math.round((signalHits.length / Math.max(profile.signals?.length || 1, 3)) * state.weights.skills) + Math.min(10, evidenceHits.length * 4));
  const industry = industryHit ? state.weights.industry : Math.round(state.weights.industry * .45);
  const seniority = /senior|lead|principal|director|head of/i.test(job.title) && !(profile.roles || '').toLowerCase().includes('senior') ? Math.round(state.weights.seniority * .55) : state.weights.seniority;
  const hardFailures = [];
  if (!roleHit) hardFailures.push(`Title does not match your target role(s): ${profile.roles}.`);
  if (!locationHit) hardFailures.push(`Location does not match your requirement: ${profile.location}.`);
  const score = Math.min(100, skills + industry + seniority);
  const gaps = [];
  if (!signalHits.length) gaps.push('No explicit skill signal overlap was found in the verified profile.');
  if (/ai|machine learning|llm|nlp/i.test(all) && !(profile.signals || []).includes('AI / ML')) gaps.push('The role mentions AI/ML; verify direct experience before applying.');
  if (/search|relevance|query/i.test(all) && !(profile.signals || []).includes('Search / discovery')) gaps.push('The role mentions search/discovery; the profile has no explicit evidence of it.');
  if (!industryHit && profile.industries) gaps.push('The industry does not clearly match the industries you selected.');
  const verdict = hardFailures.length ? 'Does not meet hard filters' : score >= 75 ? 'Strong apply' : score >= 55 ? 'Selective apply' : 'Review before applying';
  return { score, verdict, components: { skills, industry, seniority }, signalHits, evidenceHits, gaps, hardFailures, hardPass: !hardFailures.length };
}

function renderSources() { const target = $('#sourceStatus'); const sourceRuns = state.sourceRuns.length ? state.sourceRuns : [{name:'Remotive',status:'warn',message:'Run a search to query'},{name:'Arbeitnow',status:'warn',message:'Run a search to query'},{name:'Remote OK',status:'warn',message:'Run a search to query'}]; target.innerHTML = sourceRuns.map(s => `<div class="source ${s.status}"><strong>${s.status === 'ok' ? '●' : '○'} ${escapeHtml(s.name)}</strong><span>${escapeHtml(s.message)}</span></div>`).join(''); $('#lastRun').textContent = state.lastRun ? `Last run: ${new Date(state.lastRun).toLocaleString()}` : 'No search run yet'; }
function renderWeights() { const total = Object.values(state.weights).reduce((sum, value) => sum + value, 0); $('#weights').innerHTML = `<section class="hard-filter-note"><strong>Hard filters</strong><span>Target role and location are configured in your profile. Jobs that fail either are excluded before scoring.</span></section><p class="small muted">${total}% allocated across soft signals. Compensation is intentionally unscored until a source provides a comparable salary range.</p>` + Object.entries(state.weights).map(([key, value]) => `<div class="weight"><label>${key[0].toUpperCase()+key.slice(1)} <span>${value}%</span><input type="range" min="0" max="100" value="${value}" data-weight="${key}"></label></div>`).join(''); }
function allocateWeight(changedKey, requested) {
  const keys = Object.keys(state.weights); const next = Math.max(0, Math.min(100, requested)); const others = keys.filter(key => key !== changedKey);
  if (next === 100) { others.forEach(key => { state.weights[key] = 0; }); state.weights[changedKey] = 100; return; }
  const remaining = 100 - next; const previousTotal = others.reduce((sum, key) => sum + state.weights[key], 0);
  let assigned = 0;
  others.forEach((key, index) => { const value = index === others.length - 1 ? remaining - assigned : Math.round((previousTotal ? state.weights[key] / previousTotal : 1 / others.length) * remaining); state.weights[key] = value; assigned += value; });
  state.weights[changedKey] = next;
}
function renderJobs() {
  const target = $('#jobsList'); const assessed = recentJobs().map(job => ({ job, match: assess(job) })); const excluded = assessed.filter(item => !item.match.hardPass); const jobs = assessed.filter(item => item.match.hardPass).sort((a,b) => b.match.score - a.match.score);
  $('#jobCount').textContent = jobs.length ? `${jobs.length} eligible roles${excluded.length ? ` · ${excluded.length} excluded by hard filters` : ''}` : '';
  if (!jobs.length) { target.innerHTML = '<div class="empty-state">No qualifying roles are available for this date window. Try a broader filter, run a search, or load illustrative demo jobs.</div>'; return; }
  target.innerHTML = jobs.map(({job,match}) => {
    const decision = state.decisions[job.id];
    return `<article class="job-card ${decision === 'approved' ? 'selected' : ''}"><div class="job-top"><div><div class="job-title">${escapeHtml(job.title)}</div><div class="job-company">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</div></div><div class="score-circle" style="--score:${match.score * 3.6}deg"><b>${match.score}</b></div></div><div class="job-meta"><span class="tag good">${escapeHtml(match.verdict)}</span><span class="tag">${escapeHtml(job.source)}</span><span class="tag">${formatDate(job.postedAt)}</span></div><div class="match-reason"><p><strong>Why it may fit:</strong> ${match.signalHits.length ? escapeHtml(match.signalHits.join(' · ')) : 'Role/title alignment only; validate skills.'}</p><p><strong>Verified evidence:</strong> ${match.evidenceHits.length ? escapeHtml(match.evidenceHits.map(x=>x.title).join(' · ')) : 'No direct keyword evidence was found—review before using a claim.'}</p>${match.gaps.length ? `<p><strong>Gaps to review:</strong> ${escapeHtml(match.gaps.join(' '))}</p>` : ''}</div><div class="job-actions"><button class="secondary" data-open="${escapeHtml(job.id)}">View role ↗</button><button class="secondary" data-decision="reject" data-job="${escapeHtml(job.id)}">${decision === 'rejected' ? 'Rejected' : 'Reject'}</button><button class="primary" data-decision="approve" data-job="${escapeHtml(job.id)}">${decision === 'approved' ? 'Approved — view packet' : 'Approve & create packet'}</button></div></article>`;
  }).join('');
}
function formatDate(date) { const d = new Date(date); return Number.isNaN(d) ? 'Date unavailable' : `Posted ${d.toLocaleDateString()}`; }

function decide(jobId, decision) {
  state.decisions[jobId] = decision; const job = state.jobs.find(x => x.id === jobId);
  if (!job) { setStatus('#searchStatus', 'That role is no longer available in the current result set. Run the search again.', true); return; }
  if (decision === 'approved') { state.packet = { jobId, summary: makeSummary(job), answers: {}, savedAt: null }; persist('Job approved', `${job.title} at ${job.company}`); renderPacket(); renderJobs(); location.hash = '#packet'; }
  else persist('Job rejected', job?.title || 'Job'); renderJobs();
}
function makeSummary(job) { const assessment = assess(job); const evidence = assessment.evidenceHits; const support = evidence.length ? evidence.map(x=>x.text).join(' ') : 'My verified profile contains relevant product-management experience.'; return `I am interested in the ${job.title} role because it aligns with my verified experience in ${assessment.signalHits.join(', ') || 'product management'}. ${support} I would be transparent about any domain-specific gaps identified in the review.`; }
function renderPacket() {
  const p = state.packet; const job = p && state.jobs.find(x => x.id === p.jobId); $('#packetEmpty').hidden = Boolean(job); $('#packetCard').hidden = !job; if (!job) return;
  const assessment = assess(job); $('#packetTitle').textContent = job.title; $('#packetCompany').textContent = `${job.company} · ${job.location}`; $('#tailoredSummary').value = p.summary || '';
  $('#packetEvidence').innerHTML = assessment.evidenceHits.length ? assessment.evidenceHits.map(x => `<div class="evidence-item"><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.text)}</span></div></div>`).join('') : '<p class="muted small">No direct evidence was found. Do not add a claim until you have verified it.</p>';
  const required = [['Full name', state.profile.name], ['Location', state.profile.location], ['Work authorization', state.profile.authorization], ['Portfolio / LinkedIn URL', p.answers.portfolio || '']];
  $('#fieldChecklist').innerHTML = required.map(([label, value]) => `<label class="check"><input type="checkbox" ${value ? 'checked' : ''} data-field-check="${label}" disabled><span><strong>${label}</strong><small>${value ? escapeHtml(value) : 'Missing — add it before using this packet.'}</small>${label === 'Portfolio / LinkedIn URL' ? `<input data-answer="portfolio" placeholder="https://…" value="${escapeHtml(p.answers.portfolio || '')}">` : ''}</span></label>`).join('');
  const ready = required.every(([,value]) => value); $('#packetState').textContent = ready ? 'Ready for review' : 'Blocked: information missing'; $('#packetState').className = `state ${ready ? 'ready' : 'blocked'}`;
  const events = state.audit.filter(x => x.detail.includes(job.title)).slice(0,3); $('#packetAudit').textContent = events.length ? `Audit log · ${events.map(x => `${new Date(x.at).toLocaleString()}: ${x.event}`).join(' · ')}` : 'Audit log · no external action taken';
}
function savePacket() { if (!state.packet) return; state.packet.summary = $('#tailoredSummary').value.trim(); const portfolio = $('[data-answer="portfolio"]'); if (portfolio) state.packet.answers.portfolio = portfolio.value.trim(); state.packet.savedAt = NOW(); persist('Application packet saved', state.jobs.find(x=>x.id===state.packet.jobId)?.title || ''); renderPacket(); }

const DEMO_JOBS = [
  {id:'demo:1',source:'Illustrative demo',title:'Growth Product Manager',company:'Consumer Commerce Co.',location:'Remote · India',postedAt:NOW(),url:'https://example.com',tags:['consumer','growth'],description:'Own acquisition and activation funnels for a consumer marketplace. Partner with design, engineering and analytics; run A/B tests and improve conversion.'},
  {id:'demo:2',source:'Illustrative demo',title:'Product Manager, AI Discovery',company:'Search Studio',location:'Bengaluru',postedAt:NOW(),url:'https://example.com',tags:['ai','search'],description:'Lead discovery experiences using search relevance, NLP and model evaluation. Work with ML, data science and product design.'},
  {id:'demo:3',source:'Illustrative demo',title:'Platform Product Manager',company:'Workflow Systems',location:'Remote',postedAt:new Date(Date.now()-36e5*18).toISOString(),url:'https://example.com',tags:['B2B','API'],description:'Own B2B platform capabilities, developer APIs and enterprise onboarding. Define roadmap with engineering and customer teams.'}
];

function bind() {
  $('#resumeFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return; setStatus('#resumeStatus', `Reading ${file.name} in this browser…`);
    try { $('#resumeText').value = await parseResumeFile(file); state.resume.fileName = file.name; setStatus('#resumeStatus', `${file.name} loaded locally. Analyze it when ready.`); }
    catch (error) { setStatus('#resumeStatus', `${file.name} could not be parsed locally: ${error.message} Paste its text instead.`, true); }
  });
  $('#saveResume').addEventListener('click', () => { state.resume.text = $('#resumeText').value.trim(); state.resume.updatedAt = NOW(); persist('Resume draft saved', state.resume.fileName || 'Pasted resume'); setStatus('#resumeStatus', 'Resume text saved locally in this browser.'); });
  $('#analyseProfile').addEventListener('click', () => { const text = $('#resumeText').value.trim(); if (text.length < 40) { setStatus('#resumeStatus', 'Paste more resume text before analyzing it.', true); return; } const profile = inferProfile(text); state.resume = { ...state.resume, text, updatedAt: NOW() }; state.profile = { ...state.profile, name: profile.name || state.profile.name, signals: profile.signals, roles: profile.roles.join(', '), industries: profile.industries.join(', '), evidence: profile.evidence }; persist('Resume analyzed locally', `${profile.evidence.length} evidence candidates generated`); renderProfile(); setStatus('#resumeStatus', 'Profile suggestions created. Review the evidence ledger and save it to verify claims.'); });
  $('#addEvidence').addEventListener('click', () => { state.profile.evidence.push({id:uid(),title:'Candidate-provided evidence',text:'Edit this evidence item to add a verified achievement, responsibility, or skill.',verified:false}); renderProfile(); });
  $('#evidenceList').addEventListener('click', e => { const id = e.target.dataset.deleteEvidence; if (id) { state.profile.evidence = state.profile.evidence.filter(x=>x.id!==id); renderProfile(); } });
  $('#saveProfile').addEventListener('click', saveProfile); $('#runSearch').addEventListener('click', runSearch); $('#dateFilter').addEventListener('change', renderJobs);
  $('#weights').addEventListener('input', e => { const key=e.target.dataset.weight; if (key) { allocateWeight(key, Number(e.target.value)); persist(); renderWeights(); renderJobs(); } });
  $('#resetDemo').addEventListener('click', () => { state.jobs = structuredClone(DEMO_JOBS); state.sourceRuns = [{name:'Illustrative demo',status:'ok',message:'3 sample roles loaded'},{name:'Public sources',status:'warn',message:'Use Run today’s search for live feeds'}]; state.lastRun = NOW(); persist('Illustrative jobs loaded', 'Demo data only'); renderSources(); renderJobs(); });
  $('#jobsList').addEventListener('click', e => { const button = e.target instanceof Element ? e.target.closest('button') : null; if (!button) return; const id = button.dataset.job; if (id && button.dataset.decision) decide(id, button.dataset.decision); const open = button.dataset.open; if (open) { const job=state.jobs.find(x=>x.id===open); if(job?.url) window.open(job.url, '_blank', 'noopener'); } });
  $('#savePacket').addEventListener('click', savePacket); $('#openJob').addEventListener('click', () => { const job=state.jobs.find(x=>x.id===state.packet?.jobId); if(job?.url) { savePacket(); persist('Official job page opened', job.title); window.open(job.url, '_blank', 'noopener'); renderPacket(); } });
  $('#exportData').addEventListener('click', () => { const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='applyguard-local-data.json';a.click();URL.revokeObjectURL(url); });
  $('#deleteData').addEventListener('click', () => { if(confirm('Delete your resume text, profile, job decisions, packets, and audit history from this browser? This cannot be undone.')) { localStorage.removeItem(STORAGE_KEY); state=structuredClone(DEFAULT_STATE); location.reload(); } });
}

function init() { renderProfile(); renderSources(); renderWeights(); renderJobs(); renderPacket(); bind(); }
init();
