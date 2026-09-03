const app = document.querySelector("#app");
const state = {
  jobs: [],
  statuses: [],
  forecasts: [],
  activeView: "overview",
  searchQuery: "",
  matchFilter: "all",
};

const STOP_WORDS = new Set([
  "and", "are", "for", "from", "have", "that", "the", "this", "with", "you", "your", "will", "our", "work", "team"
]);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function formatDate(isoStr) {
  if (!isoStr) return "Recently";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoStr;
  }
}

function keywords(text) {
  const seen = new Set();
  return Array.from(String(text).matchAll(/[A-Za-z][A-Za-z0-9+#.-]{2,}/g))
    .map((match) => match[0])
    .filter((word) => {
      const key = word.toLowerCase();
      if (STOP_WORDS.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}

async function load() {
  for (const [key, file] of Object.entries({
    jobs: "jobs.json",
    statuses: "check_status.json",
    forecasts: "forecasts.json",
  })) {
    try {
      state[key] = await fetch(`data/${file}`).then((res) => res.ok ? res.json() : []);
    } catch {
      state[key] = [];
    }
  }

  // Update badge counts in header
  const jobsBadge = document.querySelector("#jobs-count-badge");
  if (jobsBadge) jobsBadge.textContent = state.jobs.length;
  
  const compBadge = document.querySelector("#companies-count-badge");
  if (compBadge) compBadge.textContent = state.statuses.length;

  render("overview");
}

function overview() {
  const healthyCount = state.statuses.filter(s => s.status === "success").length;
  const lastCheck = state.statuses.length ? formatDate(state.statuses[0].checked_at) : "N/A";
  const topJobs = [...state.jobs].sort((a, b) => b.match_score - a.match_score).slice(0, 5);

  return `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="val" style="color: #60a5fa;">${state.jobs.length}</div>
        <div class="lbl">Open 2027 SWE Roles</div>
      </div>
      <div class="metric-card">
        <div class="val" style="color: #34d399;">${healthyCount} / ${state.statuses.length}</div>
        <div class="lbl">Healthy Official Sources</div>
      </div>
      <div class="metric-card">
        <div class="val" style="color: #a78bfa;">${lastCheck}</div>
        <div class="lbl">Last Monitor Check</div>
      </div>
    </div>

    <div class="card-box">
      <h3>Active Companies Health Overview</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
        Monitor relies exclusively on legitimate, unauthenticated public ATS APIs (Ashby, Greenhouse, Amazon Jobs API). Protected career sites are safely categorized as unsupported.
      </p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Status</th>
              <th>Official Source Engine</th>
              <th>Records Processed</th>
              <th>Matching Roles</th>
            </tr>
          </thead>
          <tbody>
            ${state.statuses.map(s => `
              <tr>
                <td><strong>${escapeHtml(s.company_id.toUpperCase())}</strong></td>
                <td>
                  <span class="status-badge ${s.status === 'success' ? 'success' : 'unsupported'}">
                    ${s.status === 'success' ? '✓ Healthy Source' : '⚠️ Source Unsupported'}
                  </span>
                </td>
                <td>${escapeHtml(s.source_type || '-')}${s.parser_version ? ` (${escapeHtml(s.parser_version)})` : ''}</td>
                <td>${s.records_parsed ?? 0} parsed / ${s.records_received ?? 0} fetched</td>
                <td><strong style="color: ${s.matching_jobs > 0 ? '#34d399' : 'inherit'};">${s.matching_jobs}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card-box">
      <h3>Top Discovered Matching Roles</h3>
      <div class="jobs-list" style="margin-top: 1rem;">
        ${topJobs.map(job => renderJobCard(job)).join('')}
      </div>
    </div>
  `;
}

function renderJobCard(job) {
  const matchClass = job.match_score >= 80 ? 'high' : 'mid';
  const reasons = (job.match_reasons || []).map(r => `<span class="reason-tag">✓ ${escapeHtml(r)}</span>`).join('');
  
  return `
    <div class="job-card">
      <div class="job-header">
        <div class="job-title-group">
          <h3><a href="${escapeHtml(job.official_url)}" target="_blank" rel="noopener">${escapeHtml(job.title)}</a></h3>
          <div class="job-meta">
            <span class="company-tag">${escapeHtml(job.company_name)}</span>
            <span>•</span>
            <span>📍 ${escapeHtml(job.location || "Remote / Unspecified")}</span>
            <span>•</span>
            <span>Discovered ${formatDate(job.discovered_at)}</span>
          </div>
        </div>
        <div class="match-pill ${matchClass}">
          ${Math.round(job.match_score)}% Match
        </div>
      </div>
      
      ${reasons ? `<div class="match-reasons-list">${reasons}</div>` : ''}

      <div class="job-actions">
        <span style="font-size: 0.8rem; color: var(--text-subtle);">Source: ${escapeHtml(job.source_type)} engine</span>
        <a href="${escapeHtml(job.official_url)}" target="_blank" rel="noopener" class="btn-apply">
          Apply on Official Site ↗
        </a>
      </div>
    </div>
  `;
}

function jobs() {
  let filtered = state.jobs;

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(j => 
      j.title.toLowerCase().includes(q) || 
      j.company_name.toLowerCase().includes(q) || 
      (j.location && j.location.toLowerCase().includes(q))
    );
  }

  if (state.matchFilter === 'high') {
    filtered = filtered.filter(j => j.match_score >= 80);
  } else if (state.matchFilter === 'new_grad') {
    filtered = filtered.filter(j => 
      (j.match_reasons || []).some(r => r.toLowerCase().includes('new grad') || r.toLowerCase().includes('graduate'))
    );
  }

  return `
    <div class="filter-bar">
      <div class="search-box">
        <input type="text" id="jobSearchInput" placeholder="Filter by title, company, or location..." value="${escapeHtml(state.searchQuery)}">
      </div>
      <div class="chip-filters">
        <button class="chip ${state.matchFilter === 'all' ? 'active' : ''}" data-filter="all">All (${state.jobs.length})</button>
        <button class="chip ${state.matchFilter === 'high' ? 'active' : ''}" data-filter="high">High Match 80%+</button>
        <button class="chip ${state.matchFilter === 'new_grad' ? 'active' : ''}" data-filter="new_grad">Explicit New Grad</button>
      </div>
    </div>

    ${filtered.length ? `
      <div class="jobs-list">
        ${filtered.map(job => renderJobCard(job)).join('')}
      </div>
    ` : `
      <div class="notice-box">
        No jobs matched your filter criteria. Try clearing the search query or adjusting the filters.
      </div>
    `}
  `;
}

function companies() {
  return `
    <div class="card-box">
      <h3>Tracked Company Career Sources</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
        The monitor checks these 14 companies periodically. Official ATS endpoints retrieve current active postings directly from company career portals.
      </p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Official Status</th>
              <th>Engine / Adapter</th>
              <th>Last Checked</th>
              <th>Records Processed</th>
              <th>Matching Roles</th>
              <th>Details / Note</th>
            </tr>
          </thead>
          <tbody>
            ${state.statuses.map(s => `
              <tr>
                <td>
                  <strong style="font-size: 0.95rem;">${escapeHtml(s.company_id.toUpperCase())}</strong>
                  <br>
                  <a href="${escapeHtml(s.source_url)}" target="_blank" rel="noopener" style="font-size: 0.8rem; color: var(--text-muted);">Career Site ↗</a>
                </td>
                <td>
                  <span class="status-badge ${s.status === 'success' ? 'success' : 'unsupported'}">
                    ${s.status === 'success' ? '✓ Healthy' : '⚠️ Unsupported'}
                  </span>
                </td>
                <td>
                  <strong>${escapeHtml(s.source_type)}</strong>
                  <br>
                  <span style="font-size: 0.775rem; color: var(--text-subtle);">${escapeHtml(s.parser_version || 'N/A')}</span>
                </td>
                <td>${formatDate(s.checked_at)}</td>
                <td>${s.records_parsed ?? 0} parsed / ${s.records_received ?? 0} fetched</td>
                <td><strong style="color: ${s.matching_jobs > 0 ? '#34d399' : 'inherit'}">${s.matching_jobs}</strong></td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(s.warning || s.error || "Official public source verified")}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function forecast() {
  const cards = state.forecasts.map(f => `
    <div class="metric-card" style="border-top: 3px solid ${f.confidence.includes('Confirmed') ? '#34d399' : (f.confidence === 'Active' ? '#a78bfa' : '#60a5fa')};">
      <div style="font-size: 1.1rem; font-weight: 700; color: #f8fafc;">${escapeHtml(f.company_name)}</div>
      <div style="color: #34d399; font-weight: 600; margin-top: 0.25rem;">📅 ${escapeHtml(f.expected_opening_date)}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem;">${escapeHtml(f.historical_cycle)}</div>
      <div class="lbl" style="margin-top: 0.5rem;">Confidence: ${escapeHtml(f.confidence)}</div>
    </div>
  `).join('');

  return `
    <div class="card-box">
      <h3>Targeted 2027 New-Grad Role Opening Timeline</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
        Exact targeted opening dates and historical cycle predictions for 2027 full-time SWE graduate roles.
      </p>

      <div class="metrics-grid">
        ${cards || '<div class="notice-box">No forecast data loaded.</div>'}
      </div>
    </div>
  `;
}

function resume() {
  const options = state.jobs.map((job, index) => (
    `<option value="${index}">${escapeHtml(job.company_name)} - ${escapeHtml(job.title)}</option>`
  )).join("");

  return `
    <div class="card-box">
      <h3>Resume Tailoring & Keyword Alignment</h3>
      <div class="notice-box">
        🔒 <strong>Strict Grounding Guarantee:</strong> This tool only highlights existing matching skills and missing JD keywords. It <em>never fabricates experience or invents unverified achievements</em>.
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
        <div>
          <label for="resumeJob">Discovered Matching Role</label>
          <select id="resumeJob">${options || "<option>No jobs available</option>"}</select>

          <label for="jobDescription">Job Description Text</label>
          <textarea id="jobDescription" rows="8" placeholder="Job description content will auto-populate here..."></textarea>

          <label for="resumeSource">Paste LaTeX / Plaintext Resume</label>
          <textarea id="resumeSource" rows="10" placeholder="Paste your LaTeX resume source code here..."></textarea>

          <button id="analyzeResume" class="btn-primary">Analyze Alignment in Browser</button>
        </div>

        <div>
          <h4 style="margin-bottom: 0.5rem; color: #f1f5f9;">Alignment Analysis</h4>
          <div id="resumeResult" style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 0.5rem; min-height: 250px; font-size: 0.9rem;">
            Select a job and click <strong>Analyze Alignment</strong> to see verified keyword coverage.
          </div>
        </div>
      </div>
    </div>
  `;
}

function referrals() {
  return `
    <div class="card-box">
      <h3>Referral Outreach Drafter</h3>
      <div class="notice-box">
        🔒 <strong>Local Data Protection:</strong> All referral contact details, names, and outreach history are stored strictly in local private files (<code>config/candidate_profile.yaml</code> and <code>private/referrals.json</code>) and are excluded from GitHub.
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
        <div>
          <label for="messageKind">Outreach Type</label>
          <select id="messageKind">
            <option value="connection">LinkedIn Connection Note</option>
            <option value="referral">Initial Referral Request</option>
            <option value="follow_up">Follow-Up Note</option>
            <option value="thanks">Thank You Note</option>
          </select>

          <label for="recipientName">Recipient Name</label>
          <input type="text" id="recipientName" placeholder="e.g. Alex">

          <label for="messageFacts">Specific Facts / Context to Mention</label>
          <textarea id="messageFacts" rows="5" placeholder="e.g. Alumni connection, shared interest in AI infra, or application link..."></textarea>

          <button id="draftMessage" class="btn-primary">Generate Draft</button>
        </div>

        <div>
          <h4 style="margin-bottom: 0.5rem; color: #f1f5f9;">Generated Local Message</h4>
          <div id="messageDraft" style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 0.5rem; min-height: 200px; font-size: 0.9rem; font-family: var(--font-sans);">
            Drafts will appear here. No messages are sent automatically.
          </div>
        </div>
      </div>
    </div>
  `;
}

function settings() {
  return `
    <div class="card-box">
      <h3>System Configuration & Privacy Settings</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
        Configuration details loaded from local <code>config/companies.yaml</code> and <code>config/filters.yaml</code>.
      </p>

      <pre>
candidate:
  graduation_date: "2026-12"
  preferred_start_date: "2027-01"
  target_graduation_years: [2026]
  target_start_years: [2027]

notifications:
  provider: discord
  discord:
    webhook_env: DISCORD_WEBHOOK_URL
      </pre>
    </div>
  `;
}

function hydrateJobsEvents() {
  const searchInput = document.querySelector("#jobSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      render("jobs");
      // keep focus
      const updatedInput = document.querySelector("#jobSearchInput");
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
      }
    });
  }

  document.querySelectorAll(".chip[data-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      state.matchFilter = chip.dataset.filter;
      render("jobs");
    });
  });
}

function hydrateResume() {
  const select = document.querySelector("#resumeJob");
  const description = document.querySelector("#jobDescription");
  const source = document.querySelector("#resumeSource");
  const result = document.querySelector("#resumeResult");

  if (!select || !description || !source || !result) return;

  const fillDescription = () => {
    const job = state.jobs[Number(select.value)];
    description.value = job?.description || "";
  };

  select.addEventListener("change", fillDescription);
  fillDescription();

  document.querySelector("#analyzeResume").addEventListener("click", () => {
    const terms = keywords(description.value);
    const resumeText = source.value.toLowerCase();
    const present = terms.filter((term) => resumeText.includes(term.toLowerCase()));
    const missing = terms.filter((term) => !resumeText.includes(term.toLowerCase()));
    const rate = terms.length ? Math.round((present.length / terms.length) * 100) : 0;

    // HackerRank Scoring Rules
    const hasGithub = /github\.com\/[a-z0-9_-]+/i.test(source.value);
    const hasLinks = /https?:\/\/|github\.com|demo|app\./i.test(source.value);
    const hasIntern = /intern|co-op|coop/i.test(resumeText);
    const hasDevExp = /software engineer|developer|full-time/i.test(resumeText);
    const hasFounder = /founder|co-founder|early employee/i.test(resumeText);

    let osScore = hasGithub ? 8 : 0;
    if (/google summer of code|gsoc/i.test(resumeText)) osScore += 20;
    osScore = Math.min(35, osScore);

    let projScore = 15;
    if (hasLinks) projScore += 10;
    projScore = Math.min(30, projScore);

    let prodScore = 0;
    if (hasIntern) prodScore += 15;
    if (hasDevExp) prodScore += 5;
    if (hasFounder) prodScore += 5;
    prodScore = Math.min(25, prodScore);

    const skillsScore = Math.min(10, Math.max(5, Math.round(rate / 10)));
    let bonus = (hasGithub ? 2 : 0) + (source.value.includes("linkedin.com") ? 1 : 0) + (hasFounder ? 3 : 0);
    bonus = Math.min(20, bonus);

    let deductions = 0;
    if (!hasLinks) deductions += 5;
    if (/todo list|calculator app/i.test(resumeText)) deductions += 3;

    const totalHackerRank = Math.max(0, Math.min(100, osScore + projScore + prodScore + skillsScore + bonus - deductions));

    result.innerHTML = `
      <p style="margin-bottom: 0.75rem;"><strong>Keyword Alignment:</strong> <span style="font-size: 1.25rem; font-weight: 800; color: #60a5fa;">${rate}%</span></p>
      
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 0.5rem; padding: 0.85rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #f8fafc; font-size: 1rem;">HackerRank ATS Scorecard</strong>
          <span style="font-size: 1.2rem; font-weight: 800; color: ${totalHackerRank >= 70 ? '#34d399' : '#fbbf24'};">${totalHackerRank} / 100 pts</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.65rem; font-size: 0.8rem; color: #cbd5e1;">
          <div>• Open Source: <strong>${osScore}/35</strong></div>
          <div>• Self Projects: <strong>${projScore}/30</strong></div>
          <div>• Production Exp: <strong>${prodScore}/25</strong></div>
          <div>• Tech Skills: <strong>${skillsScore}/10</strong></div>
          <div>• Bonus Points: <strong style="color: #34d399;">+${bonus}</strong></div>
          <div>• Deductions: <strong style="color: #f87171;">-${deductions}</strong></div>
        </div>
      </div>

      <p style="margin-bottom: 0.5rem; color: #34d399;"><strong>✓ Verified Matching Keywords (${present.length}):</strong><br>${escapeHtml(present.slice(0, 25).join(", ") || "None detected")}</p>
      <p style="margin-bottom: 0.5rem; color: #fbbf24;"><strong>⚠️ Unsupported / Missing Keywords (${missing.length}):</strong><br>${escapeHtml(missing.slice(0, 25).join(", ") || "None detected")}</p>
      
      <div class="notice-box" style="margin-top: 1rem; font-size: 0.8rem;">
        HackerRank Rule: Includes <strong>${hasGithub ? '✓ GitHub URL detected' : '⚠️ No GitHub URL detected'}</strong> & <strong>${hasLinks ? '✓ Active Links detected' : '⚠️ Missing links penalty (-5 pts)'}</strong>.
      </div>
    `;
  });
}

function hydrateReferrals() {
  const button = document.querySelector("#draftMessage");
  if (!button) return;

  button.addEventListener("click", () => {
    const name = document.querySelector("#recipientName").value || "there";
    const facts = document.querySelector("#messageFacts").value;
    const kind = document.querySelector("#messageKind").value;
    const context = "I'm a CS student graduating December 2026, looking for early-2027 new-grad software engineering roles.";
    
    const templates = {
      connection: `Hi ${name}, ${context} ${facts} I'd love to connect!`,
      referral: `Hi ${name}, ${context} ${facts} If you feel comfortable, would you be open to referring me for a 2027 SWE role? No pressure at all either way.`,
      follow_up: `Hi ${name}, just following up on my earlier note regarding ${facts}. Thanks again for your time!`,
      thanks: `Hi ${name}, thank you so much for your guidance and support with my application. I really appreciate it!`,
    };

    document.querySelector("#messageDraft").textContent = templates[kind];
  });
}

function render(view) {
  state.activeView = view;
  
  document.querySelectorAll("nav button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  const views = { overview, jobs, companies, forecast, resume, referrals, settings };
  if (views[view]) {
    app.innerHTML = views[view]();
    if (view === "jobs") hydrateJobsEvents();
    if (view === "resume") hydrateResume();
    if (view === "referrals") hydrateReferrals();
  }
}

document.querySelectorAll("nav button[data-view]").forEach((button) => {
  button.addEventListener("click", () => render(button.dataset.view));
});

load();
