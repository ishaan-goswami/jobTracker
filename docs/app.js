const state = {
  jobs: [],
  statuses: [],
  forecasts: [],
  activeView: "overview",
  searchQuery: "",
  matchFilter: "all",
  forecastFilter: "all",
  forecastSort: "soonest",
};

function getDynamicCountdown(item) {
  const isCurrentlyOpen = (item.confidence || "").includes("Active") || (item.expected_opening_date || "").includes("🟢");
  if (isCurrentlyOpen) {
    return {
      badgeClass: "active",
      badgeText: "🟢 OPEN NOW",
      daysText: "Currently Active",
      sortScore: -1,
    };
  }

  const startDateStr = item.target_start_date;
  const endDateStr = item.target_end_date;
  
  if (!startDateStr) {
    return {
      badgeClass: "imminent",
      badgeText: "⏳ Date TBD",
      daysText: "Date TBD",
      sortScore: 999,
    };
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  
  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const startDate = Date.UTC(sY, sM - 1, sD);
  
  const [eY, eM, eD] = (endDateStr || startDateStr).split("-").map(Number);
  const endDate = Date.UTC(eY, eM - 1, eD);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysStart = Math.ceil((startDate - todayUtc) / msPerDay);
  const daysEnd = Math.ceil((endDate - todayUtc) / msPerDay);

  if (daysStart <= 0 && daysEnd >= 0) {
    return {
      badgeClass: "imminent",
      badgeText: `⚡ Active Window (Within ~${daysEnd}d)`,
      daysText: `Expected any day within ${daysEnd} day${daysEnd !== 1 ? 's' : ''}`,
      sortScore: 0,
    };
  } else if (daysStart > 0) {
    const rangeStr = daysStart === daysEnd ? `~${daysStart} days` : `~${daysStart}–${daysEnd} days`;
    return {
      badgeClass: "upcoming",
      badgeText: `⏳ Opens in ${rangeStr}`,
      daysText: `Opening in roughly ${rangeStr}`,
      sortScore: daysStart,
    };
  } else {
    return {
      badgeClass: "imminent",
      badgeText: `⚡ Expected Any Day`,
      daysText: `Opening period has arrived`,
      sortScore: 0,
    };
  }
}

function forecast() {
  let list = state.forecasts.map(f => ({ ...f, countdown: getDynamicCountdown(f) }));

  if (state.forecastFilter === "active") {
    list = list.filter(f => f.countdown.badgeClass === "active");
  } else if (state.forecastFilter === "upcoming") {
    list = list.filter(f => f.countdown.badgeClass !== "active");
  }

  if (state.forecastSort === "alphabetical") {
    list.sort((a, b) => a.company_name.localeCompare(b.company_name));
  } else {
    // default: soonest opening
    list.sort((a, b) => a.countdown.sortScore - b.countdown.sortScore);
  }

  const openCount = state.forecasts.filter(f => getDynamicCountdown(f).badgeClass === "active").length;
  const upcomingCount = state.forecasts.filter(f => getDynamicCountdown(f).badgeClass !== "active").length;

  return `
    <div class="card-box">
      <h3>Targeted 2027 New-Grad Role Opening Timeline</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
        Real-time dynamic countdowns and target opening dates for 2027 full-time software engineering university graduate programs.
      </p>

      <div class="filter-bar" style="margin-bottom: 1.5rem;">
        <div class="chip-filters">
          <button class="chip ${state.forecastFilter === 'all' ? 'active' : ''}" data-ffilter="all">All (${state.forecasts.length})</button>
          <button class="chip ${state.forecastFilter === 'upcoming' ? 'active' : ''}" data-ffilter="upcoming">Upcoming Countdowns (${upcomingCount})</button>
          <button class="chip ${state.forecastFilter === 'active' ? 'active' : ''}" data-ffilter="active">🟢 Open Now (${openCount})</button>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.825rem; color: var(--text-muted);">
          <span>Sort by:</span>
          <select id="forecastSortSelect" style="width: auto; padding: 0.35rem 0.65rem; font-size: 0.8rem;">
            <option value="soonest" ${state.forecastSort !== 'alphabetical' ? 'selected' : ''}>⏳ Soonest Opening</option>
            <option value="alphabetical" ${state.forecastSort === 'alphabetical' ? 'selected' : ''}>🔤 Company (A–Z)</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem;">
        ${list.length ? list.map(f => `
          <div class="forecast-card" style="border-top: 3px solid ${f.confidence.includes('Confirmed') ? '#34d399' : (f.confidence.includes('Active') ? '#a78bfa' : '#60a5fa')};">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                <span class="company-tag company-${escapeHtml((f.company_id || f.company_name).toLowerCase())}">${escapeHtml(f.company_name)}</span>
                <span class="forecast-countdown-badge ${f.countdown.badgeClass}">
                  ${escapeHtml(f.countdown.badgeText)}
                </span>
              </div>
              
              <div style="color: #f1f5f9; font-weight: 700; font-size: 1.05rem; margin-top: 0.5rem;">
                📅 Target: ${escapeHtml(f.expected_opening_date)}
              </div>
              
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem; line-height: 1.4;">
                ${escapeHtml(f.historical_cycle)}
              </div>
            </div>

            <div style="padding-top: 0.65rem; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 0.775rem; color: var(--text-subtle); display: flex; justify-content: space-between;">
              <span>Confidence: <strong style="color: var(--text-muted);">${escapeHtml(f.confidence)}</strong></span>
              <span>Window: ${escapeHtml(f.expected_opening_window)}</span>
            </div>
          </div>
        `).join('') : '<div class="notice-box">No forecast entries match your filter.</div>'}
      </div>
    </div>
  `;
}


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

function stripHtml(htmlStr) {
  if (!htmlStr) return "";
  let text = String(htmlStr)
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  return text.replace(/\n\s*\n/g, "\n\n").trim();
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
  const plainText = stripHtml(text);
  const seen = new Set();
  const htmlTagTokens = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "p", "li", "ul", "ol", "div", "span", "br", "href", "amp", "nbsp", "quot", "http", "https", "www", "com"]);
  return Array.from(String(plainText).matchAll(/[A-Za-z][A-Za-z0-9+#.-]{2,}/g))
    .map((match) => match[0])
    .filter((word) => {
      const key = word.toLowerCase();
      if (STOP_WORDS.has(key) || htmlTagTokens.has(key) || seen.has(key) || key.length < 3) return false;
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
      state[key] = await fetch(`data/${file}?t=${Date.now()}`, { cache: "no-store" }).then((res) => res.ok ? res.json() : []);
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
            <span class="company-tag company-${escapeHtml((job.company_id || job.company_name).toLowerCase())}">${escapeHtml(job.company_name)}</span>
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
        The monitor checks these ${state.statuses.length || 16} target companies periodically. Official ATS endpoints retrieve current active postings directly from company career portals.
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



function resume() {
  const options = state.jobs.map((job, index) => (
    `<option value="${index}">${escapeHtml(job.company_name)} — ${escapeHtml(job.title)} (${escapeHtml(job.location || 'US')})</option>`
  )).join("");

  return `
    <div class="card-box">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3>📄 Resume Tailoring & Keyword Alignment Evaluator</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem;">
            Cross-reference your resume against official job descriptions to optimize ATS match rate & HackerRank scorecard.
          </p>
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.775rem; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); color: #60a5fa; padding: 0.35rem 0.75rem; border-radius: 0.5rem; font-weight: 700;">
          🔒 LOCAL IN-BROWSER EVALUATION
        </div>
      </div>

      <div class="notice-box" style="margin-bottom: 1.5rem;">
        🔒 <strong>Strict Grounding Guarantee:</strong> This tool highlights real matching skills and missing JD keywords. It <em>never fabricates unverified experience</em>. All job descriptions are auto-cleaned into readable plaintext.
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.75rem;">
        <div>
          <label for="resumeJob" style="margin-top: 0;">Target Role</label>
          <select id="resumeJob" style="font-size: 0.9rem; padding: 0.75rem 0.9rem; background: rgba(3, 7, 18, 0.85);">${options || "<option>No active jobs available</option>"}</select>

          <label for="jobDescription">Target Job Description (Cleaned Plaintext)</label>
          <textarea id="jobDescription" rows="9" placeholder="Job description will auto-populate cleanly here..." style="font-family: var(--font-sans); font-size: 0.85rem; line-height: 1.55; color: #cbd5e1; background: rgba(3, 7, 18, 0.85); border-color: rgba(255, 255, 255, 0.1);"></textarea>

          <label for="resumeSource">Your Resume (LaTeX Source / Plaintext)</label>
          <textarea id="resumeSource" rows="10" placeholder="Paste your LaTeX resume or plain text resume content here..." style="font-family: var(--font-mono); font-size: 0.825rem; line-height: 1.45; color: #a5b4fc; background: rgba(3, 7, 18, 0.85); border-color: rgba(255, 255, 255, 0.1);"></textarea>

          <button id="analyzeResume" class="btn-primary" style="width: 100%; justify-content: center; font-size: 0.95rem; padding: 0.8rem 1.5rem; margin-top: 1.25rem;">
            ⚡ Run Alignment Analysis & HackerRank Audit
          </button>
        </div>

        <div>
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 800; color: #f1f5f9; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📊 Live Alignment Scorecard</span>
          </h4>

          <div id="resumeResult" style="background: rgba(3, 7, 18, 0.85); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 0.85rem; min-height: 480px;">
            <div style="text-align: center; color: var(--text-muted); padding: 4rem 1rem;">
              <div style="font-size: 2.75rem; margin-bottom: 0.5rem;">🎯</div>
              <p style="font-weight: 600; color: #cbd5e1; font-size: 1rem;">Select a role and click <strong>Run Alignment Analysis</strong></p>
              <p style="font-size: 0.825rem; margin-top: 0.35rem; color: var(--text-subtle);">Calculates keyword coverage % and HackerRank ATS scoring.</p>
            </div>
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
    const cleanDesc = stripHtml(job?.description || "");
    description.value = cleanDesc;
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div>
          <div style="font-size: 0.775rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Keyword Match Rate</div>
          <div style="font-family: var(--font-mono); font-size: 2.5rem; font-weight: 900; color: ${rate >= 60 ? '#34d399' : '#60a5fa'}; line-height: 1;">${rate}%</div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 0.775rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">HackerRank ATS Score</div>
          <div style="font-family: var(--font-mono); font-size: 2.5rem; font-weight: 900; color: ${totalHackerRank >= 70 ? '#34d399' : (totalHackerRank >= 50 ? '#fbbf24' : '#f87171')}; line-height: 1;">${totalHackerRank} <span style="font-size: 0.9rem; color: var(--text-muted);">/ 100</span></div>
        </div>
      </div>

      <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="font-family: var(--font-mono); font-size: 0.775rem; font-weight: 700; color: #a5b4fc; margin-bottom: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em;">
          HackerRank Score Breakdown
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.8rem; font-family: var(--font-mono);">
          <div style="background: rgba(255, 255, 255, 0.03); padding: 0.4rem 0.65rem; border-radius: 0.4rem;">• Open Source: <strong>${osScore}/35</strong></div>
          <div style="background: rgba(255, 255, 255, 0.03); padding: 0.4rem 0.65rem; border-radius: 0.4rem;">• Projects: <strong>${projScore}/30</strong></div>
          <div style="background: rgba(255, 255, 255, 0.03); padding: 0.4rem 0.65rem; border-radius: 0.4rem;">• Production Exp: <strong>${prodScore}/25</strong></div>
          <div style="background: rgba(255, 255, 255, 0.03); padding: 0.4rem 0.65rem; border-radius: 0.4rem;">• Tech Skills: <strong>${skillsScore}/10</strong></div>
          <div style="background: rgba(16, 185, 129, 0.1); padding: 0.4rem 0.65rem; border-radius: 0.4rem; color: #34d399;">• Bonus: <strong>+${bonus} pts</strong></div>
          <div style="background: rgba(244, 63, 94, 0.1); padding: 0.4rem 0.65rem; border-radius: 0.4rem; color: #f87171;">• Deductions: <strong>-${deductions} pts</strong></div>
        </div>
      </div>

      <div style="margin-bottom: 1.15rem;">
        <div style="font-size: 0.825rem; font-weight: 700; color: #34d399; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>✓ Matching Keywords (${present.length})</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Found in your resume</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 120px; overflow-y: auto; padding: 0.25rem;">
          ${present.length ? present.map(term => `<span class="reason-tag" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7;">✓ ${escapeHtml(term)}</span>`).join('') : '<span style="font-size: 0.8rem; color: var(--text-muted);">No keyword matches detected yet.</span>'}
        </div>
      </div>

      <div style="margin-bottom: 1rem;">
        <div style="font-size: 0.825rem; font-weight: 700; color: #fbbf24; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>⚠️ Missing / High Impact Keywords (${missing.length})</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Consider adding to resume</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 140px; overflow-y: auto; padding: 0.25rem;">
          ${missing.length ? missing.map(term => `<span class="reason-tag" style="background: rgba(245, 158, 11, 0.12); border-color: rgba(251, 191, 36, 0.25); color: #fde047;">+ ${escapeHtml(term)}</span>`).join('') : '<span style="font-size: 0.8rem; color: #34d399;">Perfect! All key job terms covered.</span>'}
        </div>
      </div>

      <div style="font-size: 0.775rem; color: var(--text-muted); background: rgba(255, 255, 255, 0.03); border-radius: 0.5rem; padding: 0.65rem 0.85rem; margin-top: 1rem;">
        💡 <strong>Audit Tip:</strong> ${hasGithub ? '✓ GitHub link detected.' : '⚠️ Add your GitHub profile URL to earn +8 HackerRank points.'} ${hasLinks ? '✓ Live project links detected.' : '⚠️ Include live demo/app links to avoid missing links deduction (-5 pts).'}
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

function hydrateForecastEvents() {
  document.querySelectorAll(".chip[data-ffilter]").forEach(chip => {
    chip.addEventListener("click", () => {
      state.forecastFilter = chip.dataset.ffilter;
      render("forecast");
    });
  });

  const select = document.querySelector("#forecastSortSelect");
  if (select) {
    select.addEventListener("change", (e) => {
      state.forecastSort = e.target.value;
      render("forecast");
    });
  }
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
    if (view === "forecast") hydrateForecastEvents();
    if (view === "resume") hydrateResume();
    if (view === "referrals") hydrateReferrals();
  }
}

document.querySelectorAll("nav button[data-view]").forEach((button) => {
  button.addEventListener("click", () => render(button.dataset.view));
});

load();
