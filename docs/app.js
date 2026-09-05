const state = {
  jobs: [],
  statuses: [],
  forecasts: [],
  activeView: "overview",
  searchQuery: "",
  matchFilter: "all",
  forecastFilter: "all",
  forecastSort: "soonest",
  geminiApiKey: localStorage.getItem("gemini_api_key") || "",
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
  // Grammar & Common stop words
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot",
  "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each",
  "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
  "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
  "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
  "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
  "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
  "you've", "your", "yours", "yourself", "yourselves", "still", "still'", "world's", "world", "replatforming",

  // Non-technical prose, marketing, and corporate culture words
  "stripe", "google", "amazon", "meta", "bloomberg", "company", "companies", "business", "businesses",
  "growth", "economic", "economy", "prosperity", "conditions", "improving", "focused", "programmable", "financial",
  "services", "rethinking", "principles", "start", "scale", "million", "millions", "trillion", "trillions",
  "dollars", "equivalent", "gdp", "frontier", "solo", "founders", "established", "enterprises", "united",
  "practical", "ambitious", "faster", "everyone", "better", "open", "markets", "variety", "role", "roles",
  "customer", "customers", "base", "quality", "diversity", "products", "increase", "craft", "creativity",
  "unleashed", "smallest", "niches", "wholly", "contingent", "success", "invest", "unusual", "rate",
  "upgrades", "every", "single", "day", "compounding", "gains", "maintain", "reliable", "internet",
  "entirely", "pieces", "ideas", "significant", "advances", "risk", "fraud", "years", "making", "safer",
  "accessible", "people", "tend", "seriously", "fairly", "serious", "depending", "livelihoods", "admire",
  "ambition", "intensity", "curiosity", "humility", "rigor", "effective", "knowledgeable", "domains",
  "besides", "applied", "exercise", "understanding", "aspect", "society", "market", "working", "especially",
  "innovative", "ones", "think", "best", "places", "learn", "works", "large", "enough", "individual",
  "projects", "rapidly", "deployed", "meaningful", "fraction", "small", "agency", "outsized", "impact",
  "teams", "center", "front", "meet", "moment", "urgency", "hard", "problems", "matter", "change", "build",
  "career", "solutions", "precedent", "solving", "consequences", "successful", "stripes", "deeply",
  "curious", "prefer", "joy", "discovery", "comfort", "certainty", "rigorous", "thinker", "appreciate",
  "things", "worth", "tackled", "adaptable", "solver", "adapt", "quickly", "treat", "obstacles",
  "opportunities", "embrace", "kindness", "encouraging", "measured", "risks", "act", "boldly", "absence",
  "consensus", "minimum", "requirements", "qualification", "qualifications", "preferred", "degree",
  "field", "obtained", "summer", "equivalent", "professional", "internship", "side", "classwork",
  "mostly", "believe", "learned", "fundamentals", "general", "knowledge", "present", "previous",
  "internships", "collaboratively", "multi-person", "coding", "setting", "ability", "unfamiliar", "systems",
  "form", "subject", "experts", "clear", "written", "communication", "skills", "explain",
  "stakeholders", "members", "leverage", "tools", "accelerate", "development", "critical", "thinking",
  "judgement", "review", "refine", "validate", "outputs", "one", "specialized", "balanced",
  "safely", "update", "navigating", "managing", "bases", "leading", "contributing",
  "alongside", "peers", "high", "complex", "obstacles", "independently", "knowing", "precisely",
  "unblock", "oneself", "ask", "help", "strong", "h2", "h3", "h4", "div", "span", "p", "li", "ul", "ol",
  "nbsp", "quot", "href", "amp", "looking", "move", "want", "great", "place", "builder", "energized",
  "building", "without", "right", "work", "like", "time", "creating", "around"
]);

const KNOWN_TECH_TERMS = new Set([
  "java", "python", "c++", "c#", "ruby", "javascript", "typescript", "scala", "go", "golang", "rust", "swift",
  "kotlin", "sql", "html", "css", "react", "node", "express", "next.js", "vue", "angular", "django", "flask",
  "fastapi", "spring", "rails", "aws", "gcp", "azure", "kubernetes", "docker", "terraform", "git", "github",
  "api", "apis", "graphql", "rest", "grpc", "microservices", "frontend", "backend", "fullstack", "infrastructure",
  "distributed", "concurrency", "multithreading", "algorithms", "data structures", "system design", "database",
  "postgresql", "mysql", "mongodb", "redis", "kafka", "ai", "ml", "machine learning", "deep learning", "nlp",
  "llm", "security", "cryptography", "testing", "unit testing", "ci/cd", "linux", "unix", "code review",
  "computer science", "bachelor", "bachelor's", "master", "master's", "phd", "side projects", "classwork",
  "collaborative", "production", "production systems", "large codebases"
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
  let text = String(htmlStr);
  for (let i = 0; i < 2; i++) {
    text = text
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&");
  }
  text = text
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
  return text;
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
  
  // Slicing exclusively starting from technical requirements & qualifications sections
  const reqMatch = plainText.match(/(minimum requirements|preferred qualifications|requirements|qualifications|responsibilities|tech stack)/i);
  const reqText = reqMatch ? plainText.slice(reqMatch.index) : plainText;

  const rawTokens = reqText.split(/[\s,;:()/\\–—•"'\`\[\]]+/);
  const seen = new Set();
  const techMatches = [];
  const domainMatches = [];

  for (let raw of rawTokens) {
    let clean = raw.replace(/^[^a-zA-Z0-9+#-]+|[^a-zA-Z0-9+#-]+$/g, "").replace(/\.+$|\,+$|:+$|;+$/g, "");
    if (!clean) continue;
    if (/^\d+$/.test(clean)) continue;
    
    const lower = clean.toLowerCase();
    if (STOP_WORDS.has(lower) || seen.has(lower)) continue;

    if (KNOWN_TECH_TERMS.has(lower)) {
      seen.add(lower);
      techMatches.push(clean);
    } else if (clean.length >= 4 && !STOP_WORDS.has(lower)) {
      seen.add(lower);
      domainMatches.push(clean);
    }
  }

  return [...techMatches, ...domainMatches].slice(0, 35);
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
  const hasKey = Boolean(state.geminiApiKey);

  return `
    <div class="card-box">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3>🤝 AI Referral Outreach Drafter</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem;">
            Generate human-sounding, highly personalized outreach notes tailored to recruiters, alumni, and engineering connections using Google Gemini AI.
          </p>
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.775rem; background: ${hasKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; border: 1px solid ${hasKey ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.35)'}; color: ${hasKey ? '#6ee7b7' : '#fde047'}; padding: 0.35rem 0.75rem; border-radius: 0.5rem; font-weight: 700;">
          ${hasKey ? '✨ Gemini AI Engine: Connected' : '🔑 Gemini Key Optional'}
        </div>
      </div>

      <!-- Gemini Key Connection Box -->
      <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.75rem; padding: 1.15rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
          <label for="geminiApiKeyInput" style="margin: 0; font-size: 0.875rem; color: #f1f5f9; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
            <span>⚡ Connect Free Google Gemini AI Key</span>
          </label>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style="font-size: 0.8rem; color: #60a5fa; text-decoration: underline;">
            Get a free key in 5s at Google AI Studio ↗
          </a>
        </div>
        <div style="display: flex; gap: 0.6rem; align-items: center;">
          <input type="password" id="geminiApiKeyInput" placeholder="Paste your free Gemini API key (e.g. AIzaSy...)" value="${escapeHtml(state.geminiApiKey)}" style="font-family: var(--font-mono); font-size: 0.85rem; padding: 0.65rem 0.85rem; background: rgba(3, 7, 18, 0.85); border-color: rgba(255, 255, 255, 0.12); flex: 1;">
          <button id="saveGeminiKeyBtn" class="btn-primary" style="font-size: 0.825rem; padding: 0.65rem 1.15rem;">
            ${hasKey ? 'Update Key' : 'Save Key'}
          </button>
        </div>
        <p style="font-size: 0.775rem; color: var(--text-subtle); margin-top: 0.5rem; line-height: 1.4;">
          🔒 Stored strictly in your browser's local storage. Never committed to GitHub or sent to any third-party servers.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.75rem;">
        <div>
          <label for="messageKind" style="margin-top: 0;">Outreach Goal / Type</label>
          <select id="messageKind" style="font-size: 0.9rem; padding: 0.75rem 0.9rem; background: rgba(3, 7, 18, 0.85);">
            <option value="connection">LinkedIn Connection Note (< 300 Chars)</option>
            <option value="referral">Direct Referral Request</option>
            <option value="follow_up">Application Follow-Up Note</option>
            <option value="thanks">Networking / Post-Interview Thank You</option>
          </select>

          <label for="recipientName">Recipient Name</label>
          <input type="text" id="recipientName" placeholder="e.g. Alex Chen" style="font-size: 0.9rem; padding: 0.75rem 0.9rem; background: rgba(3, 7, 18, 0.85);">

          <label for="recipientCompany">Company & Role (Optional)</label>
          <input type="text" id="recipientCompany" placeholder="e.g. Senior Software Engineer at Stripe" style="font-size: 0.9rem; padding: 0.75rem 0.9rem; background: rgba(3, 7, 18, 0.85);">

          <label for="messageFacts">Specific Facts / Personal Context to Mention</label>
          <textarea id="messageFacts" rows="5" placeholder="e.g. Georgia Tech alumni connection, saw your recent post on high-throughput distributed systems, applying for 2027 SWE New Grad role..." style="font-family: var(--font-sans); font-size: 0.875rem; line-height: 1.55; background: rgba(3, 7, 18, 0.85); color: #cbd5e1;"></textarea>

          <label for="messageTone">Tone & Persona</label>
          <select id="messageTone" style="font-size: 0.875rem; padding: 0.65rem 0.85rem; background: rgba(3, 7, 18, 0.85);">
            <option value="warm_alumni">Warm & Alumni-Focused (Georgia Tech CS)</option>
            <option value="professional_direct">Professional & Direct</option>
            <option value="casual_concise">Casual & Quick DM</option>
          </select>

          <button id="draftMessage" class="btn-primary" style="width: 100%; justify-content: center; font-size: 0.95rem; padding: 0.8rem 1.5rem; margin-top: 1.25rem;">
            ⚡ Generate AI Draft with Gemini
          </button>
        </div>

        <div>
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 800; color: #f1f5f9; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
            <span>Generated Outreach Drafts</span>
          </h4>

          <div id="messageDraftResult" style="background: rgba(3, 7, 18, 0.85); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 0.85rem; min-height: 440px;">
            <div style="text-align: center; color: var(--text-muted); padding: 4rem 1rem;">
              <div style="font-size: 2.75rem; margin-bottom: 0.5rem;">💌</div>
              <p style="font-weight: 600; color: #cbd5e1; font-size: 1rem;">Fill out the recipient details and click <strong>Generate AI Draft</strong></p>
              <p style="font-size: 0.825rem; margin-top: 0.35rem; color: var(--text-subtle);">Creates unique, human-sounding outreach messages powered by Gemini AI.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function settings() {
  const hasKey = Boolean(state.geminiApiKey);

  return `
    <div class="card-box">
      <h3>System Configuration & Privacy Settings</h3>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
        Configuration details loaded from local <code>config/companies.yaml</code> and <code>config/filters.yaml</code>.
      </p>

      <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.75rem; padding: 1.15rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
          <label for="settingsGeminiKeyInput" style="margin: 0; font-size: 0.875rem; color: #f1f5f9; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
            <span>🤖 Google Gemini AI Key Status</span>
          </label>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: ${hasKey ? '#34d399' : '#fbbf24'}; font-weight: 700;">
            ${hasKey ? '✓ Connected' : '⚠️ Not Connected'}
          </span>
        </div>
        <div style="display: flex; gap: 0.6rem; align-items: center;">
          <input type="password" id="settingsGeminiKeyInput" placeholder="Paste your Gemini API key..." value="${escapeHtml(state.geminiApiKey)}" style="font-family: var(--font-mono); font-size: 0.85rem; padding: 0.65rem 0.85rem; background: rgba(3, 7, 18, 0.85); border-color: rgba(255, 255, 255, 0.12); flex: 1;">
          <button id="settingsSaveGeminiKeyBtn" class="btn-primary" style="font-size: 0.825rem; padding: 0.65rem 1.15rem;">
            Save Key
          </button>
        </div>
      </div>

      <pre>
candidate:
  school: Georgia Institute of Technology
  degree: Bachelors/Masters (BS/MS) in Computer Science
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

    // HackerRank & ATS Scoring Rules
    const hasGithub = /github\.com\/[a-z0-9_-]+/i.test(source.value);
    const hasLinks = /https?:\/\/|github\.com|demo|app\./i.test(source.value);
    const hasIntern = /intern|co-op|coop/i.test(resumeText);
    const hasDevExp = /software engineer|developer|full-time/i.test(resumeText);
    const hasFounder = /founder|co-founder|early employee/i.test(resumeText);
    const hasDegree = /bachelor|master|bs\/ms|bs|ms|b\.s\.|m\.s\.|computer science/i.test(resumeText);
    const hasCompetitionsOrOS = /google summer of code|gsoc|maintainer|hackathon|competition|contest|award|winner|pull request|\bpr\b|open[- ]source|contributor|fellowship|1st place|first place|top \d+|finalist/i.test(resumeText);

    let osScore = hasGithub ? 8 : 0;
    if (/google summer of code|gsoc/i.test(resumeText)) osScore += 20;
    if (hasCompetitionsOrOS) osScore += 7;
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
    let bonus = (hasGithub ? 2 : 0) + (source.value.includes("linkedin.com") ? 1 : 0) + (hasFounder ? 3 : 0) + (hasDegree ? 2 : 0);
    bonus = Math.min(20, bonus);

    let deductions = 0;
    if (!hasLinks) deductions += 5;
    if (/todo list|calculator app/i.test(resumeText)) deductions += 3;

    const totalHackerRank = Math.max(0, Math.min(100, osScore + projScore + prodScore + skillsScore + bonus - deductions));

    // Generate Actionable Recommendations for Higher Score
    const recommendations = [];

    if (missing.length > 0) {
      const topMissingTech = missing.slice(0, 5).join(", ");
      recommendations.push({
        icon: "⚡",
        title: "Incorporate Missing High-Impact Keywords",
        detail: `Add these key missing technical terms into your Skills section or project bullet points: <strong>${escapeHtml(topMissingTech)}</strong>.`,
        gain: `+${Math.min(15, missing.length * 3)} pts`
      });
    }

    if (!hasGithub) {
      recommendations.push({
        icon: "🐙",
        title: "Add Active GitHub Profile URL",
        detail: "Include your GitHub profile link (e.g. <code>github.com/username</code>) in your contact header to satisfy the Open Source audit.",
        gain: "+8 pts"
      });
    }

    if (!hasLinks) {
      recommendations.push({
        icon: "🔗",
        title: "Include Live Demo or Repository Links",
        detail: "Add live demo URLs or GitHub project repository links to eliminate the missing links deduction.",
        gain: "+5 pts"
      });
    }

    if (!hasIntern && !hasDevExp) {
      recommendations.push({
        icon: "💼",
        title: "Highlight Software Engineering Title Keywords",
        detail: "Use explicit software engineering title terms like <em>'Software Engineer Intern'</em> or <em>'Full-Stack Developer'</em> in section headers.",
        gain: "+15 pts"
      });
    }

    if (!hasCompetitionsOrOS) {
      recommendations.push({
        icon: "🏆",
        title: "Highlight Competitions & Open-Source Achievements",
        detail: "Mention any hackathon awards, open-source pull requests, or technical competitions for maximum ATS tier-1 ranking.",
        gain: "+10 pts"
      });
    }

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

      <!-- Action Plan: Specific Changes Needed for Higher Score (PROMINENT AT TOP) -->
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 0.75rem; padding: 1.15rem; margin-bottom: 1.25rem; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15);">
        <div style="font-family: var(--font-heading); font-size: 1rem; font-weight: 800; color: #60a5fa; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 0.4rem;">
            <span>🚀 RECOMMENDED RESUME IMPROVEMENTS</span>
          </span>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; background: rgba(59, 130, 246, 0.25); border: 1px solid rgba(96, 165, 250, 0.3); padding: 0.25rem 0.6rem; border-radius: 0.4rem; color: #93c5fd; font-weight: 800;">
            +${100 - totalHackerRank} PTS POSSIBLE
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${recommendations.length ? recommendations.map((rec, idx) => `
            <div style="display: flex; align-items: flex-start; gap: 0.75rem; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.8rem 0.95rem; border-radius: 0.5rem;">
              <span style="font-size: 1.25rem; line-height: 1;">${rec.icon}</span>
              <div style="flex: 1; font-size: 0.85rem;">
                <div style="font-weight: 700; color: #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                  <span>Step ${idx + 1}: ${escapeHtml(rec.title)}</span>
                  <span style="font-family: var(--font-mono); font-size: 0.775rem; color: #34d399; font-weight: 800; background: rgba(16, 185, 129, 0.12); padding: 0.15rem 0.45rem; border-radius: 0.3rem;">${rec.gain}</span>
                </div>
                <div style="color: #cbd5e1; margin-top: 0.3rem; line-height: 1.45;">${rec.detail}</div>
              </div>
            </div>
          `).join('') : '<div style="font-size: 0.85rem; color: #34d399; font-weight: 600;">✓ Your resume meets all top ATS and HackerRank criteria!</div>'}
        </div>
      </div>

      <div style="margin-bottom: 1.15rem;">
        <div style="font-size: 0.825rem; font-weight: 700; color: #34d399; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>✓ Matching Technical Keywords (${present.length})</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Found in your resume</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 110px; overflow-y: auto; padding: 0.25rem;">
          ${present.length ? present.map(term => `<span class="reason-tag" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7;">✓ ${escapeHtml(term)}</span>`).join('') : '<span style="font-size: 0.8rem; color: var(--text-muted);">No keyword matches detected yet.</span>'}
        </div>
      </div>

      <div style="margin-bottom: 1.15rem;">
        <div style="font-size: 0.825rem; font-weight: 700; color: #fbbf24; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>⚠️ Missing High-Impact Keywords (${missing.length})</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Consider adding to resume</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 110px; overflow-y: auto; padding: 0.25rem;">
          ${missing.length ? missing.map(term => `<span class="reason-tag" style="background: rgba(245, 158, 11, 0.12); border-color: rgba(251, 191, 36, 0.25); color: #fde047;">+ ${escapeHtml(term)}</span>`).join('') : '<span style="font-size: 0.8rem; color: #34d399;">Perfect! All key job terms covered.</span>'}
        </div>
      </div>
    `;
  });
}

async function callGeminiAPI(apiKey, prompt) {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Unable to reach Gemini API. Check network or API key.");
}

function hydrateReferrals() {
  const saveBtn = document.querySelector("#saveGeminiKeyBtn");
  const keyInput = document.querySelector("#geminiApiKeyInput");
  if (saveBtn && keyInput) {
    saveBtn.addEventListener("click", () => {
      const val = keyInput.value.trim();
      state.geminiApiKey = val;
      localStorage.setItem("gemini_api_key", val);
      render("referrals");
    });
  }

  const draftBtn = document.querySelector("#draftMessage");
  const resultBox = document.querySelector("#messageDraftResult");

  if (!draftBtn || !resultBox) return;

  draftBtn.addEventListener("click", async () => {
    const name = document.querySelector("#recipientName")?.value.trim() || "Alex";
    const company = document.querySelector("#recipientCompany")?.value.trim() || "";
    const facts = document.querySelector("#messageFacts")?.value.trim() || "";
    const kind = document.querySelector("#messageKind")?.value || "connection";
    const tone = document.querySelector("#messageTone")?.value || "warm_alumni";

    const kindLabels = {
      connection: "LinkedIn Connection Note (< 300 Chars)",
      referral: "Direct Referral Request",
      follow_up: "Application Follow-Up Note",
      thanks: "Networking / Post-Interview Thank You"
    };

    resultBox.innerHTML = `
      <div style="text-align: center; color: #60a5fa; padding: 4rem 1rem;">
        <div style="font-size: 2.25rem; margin-bottom: 0.75rem; display: inline-block;">⚡</div>
        <p style="font-weight: 700; font-size: 1rem; color: #f1f5f9;">Generating Tailored Draft with Gemini AI...</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">Crafting custom outreach variations for ${escapeHtml(name)}</p>
      </div>
    `;

    if (state.geminiApiKey) {
      try {
        const promptText = `You are an expert career strategist and technical recruiter helping a candidate draft a professional, compelling, highly authentic outreach message.

Candidate Background:
- Candidate Name: Ishaan Goswami
- University: Georgia Institute of Technology (GT)
- Degree: Bachelors/Masters (BS/MS) in Computer Science (GPA 4.0)
- Target: 2027 Full-Time Software Engineering New Grad & Entry Level Roles

Target Recipient Details:
- Recipient Name: ${name}
- Target Role & Company: ${company || "Software Engineer / Tech Professional"}
- Outreach Category: ${kindLabels[kind]}
- User Specific Context & Facts to Mention: ${facts || "No specific details provided beyond alumni / tech connection"}
- Desired Tone & Style: ${tone}

Strict Instructions:
1. IF Outreach Category is "LinkedIn Connection Note (< 300 Chars)", Option 1 MUST be strictly under 280 characters total so it fits inside LinkedIn's invitation limit.
2. Avoid cringey sales fluff, generic opening clichés like "I hope this email finds you well", or robotic templates.
3. Make it sound genuine, sharp, polite, and human.
4. Output EXACTLY 2 distinct options in this clear format:

[OPTION 1: SHORT & DIRECT (Ideal for DMs & Connection Notes)]
(Your Option 1 text here)

[OPTION 2: DETAILED & PERSONALIZED (Ideal for Email & InMail)]
(Your Option 2 text here)`;

        const rawAiText = await callGeminiAPI(state.geminiApiKey, promptText);

        // Parse options
        let opt1 = rawAiText;
        let opt2 = "";
        if (rawAiText.includes("[OPTION 2:")) {
          const parts = rawAiText.split(/\[OPTION 2:[^\]]*\]/i);
          opt1 = parts[0].replace(/\[OPTION 1:[^\]]*\]/i, "").trim();
          opt2 = parts[1] ? parts[1].trim() : "";
        }

        resultBox.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 0.65rem; padding: 1.15rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                <span style="font-family: var(--font-heading); font-size: 0.875rem; font-weight: 800; color: #6ee7b7;">OPTION 1: SHORT & DIRECT (DMs / LinkedIn)</span>
                <button class="copy-btn btn-primary" data-target="opt1-text" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">📋 Copy</button>
              </div>
              <div id="opt1-text" style="font-size: 0.875rem; color: #f1f5f9; line-height: 1.55; white-space: pre-wrap; background: rgba(3, 7, 18, 0.6); padding: 0.85rem; border-radius: 0.4rem; font-family: var(--font-sans); border: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(opt1)}</div>
            </div>

            ${opt2 ? `
              <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 0.65rem; padding: 1.15rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                  <span style="font-family: var(--font-heading); font-size: 0.875rem; font-weight: 800; color: #60a5fa;">OPTION 2: DETAILED & PERSONALIZED (Email / InMail)</span>
                  <button class="copy-btn btn-primary" data-target="opt2-text" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">📋 Copy</button>
                </div>
                <div id="opt2-text" style="font-size: 0.875rem; color: #f1f5f9; line-height: 1.55; white-space: pre-wrap; background: rgba(3, 7, 18, 0.6); padding: 0.85rem; border-radius: 0.4rem; font-family: var(--font-sans); border: 1px solid rgba(255, 255, 255, 0.05);">${escapeHtml(opt2)}</div>
              </div>
            ` : ''}
          </div>
        `;

        document.querySelectorAll(".copy-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const el = document.getElementById(btn.dataset.target);
            if (el) {
              navigator.clipboard.writeText(el.innerText);
              btn.textContent = "✓ Copied!";
              setTimeout(() => { btn.textContent = "📋 Copy"; }, 2000);
            }
          });
        });
        return;
      } catch (err) {
        console.error("Gemini API Error:", err);
      }
    }

    // Fallback if no API key or API call failed
    const ctx = facts ? `I noticed ${facts}.` : "I came across your profile and wanted to connect!";
    const compStr = company ? ` at ${company}` : "";
    
    let opt1Fallback = "";
    let opt2Fallback = "";

    if (kind === "connection") {
      opt1Fallback = `Hi ${name}, I'm a CS student at Georgia Tech graduating Dec 2026. ${ctx} I'd love to connect!`;
      opt2Fallback = `Hi ${name}, I saw your work${compStr} and wanted to reach out. As a Georgia Tech CS student preparing for 2027 SWE roles, ${facts || "I'd love to follow your work and learn from your journey."} Hope to connect!`;
    } else if (kind === "referral") {
      opt1Fallback = `Hi ${name}, I'm applying for the 2027 New Grad SWE role${compStr}. ${ctx} If you're open to it, would you be willing to refer my application? Happy to share my resume!`;
      opt2Fallback = `Hi ${name},\n\nI hope you're having a great week! I'm a Georgia Tech CS BS/MS student graduating Dec 2026. ${ctx}\n\nI'm currently applying for 2027 New Grad Software Engineer positions${compStr}. Given your background, I would really appreciate any advice or a potential referral if you feel comfortable. No pressure at all either way!\n\nBest,\nIshaan`;
    } else {
      opt1Fallback = `Hi ${name}, following up on my application for the 2027 SWE role${compStr}. ${ctx} Thanks for your time!`;
      opt2Fallback = `Hi ${name},\n\nThank you so much for your time and guidance regarding ${company || "the SWE role"}. ${ctx}\n\nBest regards,\nIshaan`;
    }

    resultBox.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); padding: 0.85rem 1rem; border-radius: 0.6rem; font-size: 0.825rem; color: #fde047; margin-bottom: 1.15rem;">
        🔑 <strong>Connect Gemini API:</strong> Add your free Google Gemini key above to generate 100% unique, human-like AI outreach responses instantly! Below are smart context-aware drafts:
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.15rem;">
        <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.65rem; padding: 1.15rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
            <span style="font-family: var(--font-heading); font-size: 0.875rem; font-weight: 800; color: #6ee7b7;">OPTION 1: CONCISE (DMs / LinkedIn)</span>
            <button class="copy-btn btn-primary" data-target="fb1-text" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">📋 Copy</button>
          </div>
          <div id="fb1-text" style="font-size: 0.875rem; color: #f1f5f9; line-height: 1.55; white-space: pre-wrap; background: rgba(3, 7, 18, 0.6); padding: 0.85rem; border-radius: 0.4rem; font-family: var(--font-sans);">${escapeHtml(opt1Fallback)}</div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.65rem; padding: 1.15rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
            <span style="font-family: var(--font-heading); font-size: 0.875rem; font-weight: 800; color: #60a5fa;">OPTION 2: FULL NOTE (Email / InMail)</span>
            <button class="copy-btn btn-primary" data-target="fb2-text" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">📋 Copy</button>
          </div>
          <div id="fb2-text" style="font-size: 0.875rem; color: #f1f5f9; line-height: 1.55; white-space: pre-wrap; background: rgba(3, 7, 18, 0.6); padding: 0.85rem; border-radius: 0.4rem; font-family: var(--font-sans);">${escapeHtml(opt2Fallback)}</div>
        </div>
      </div>
    `;

    document.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const el = document.getElementById(btn.dataset.target);
        if (el) {
          navigator.clipboard.writeText(el.innerText);
          btn.textContent = "✓ Copied!";
          setTimeout(() => { btn.textContent = "📋 Copy"; }, 2000);
        }
      });
    });
  });
}

function hydrateSettingsEvents() {
  const saveBtn = document.querySelector("#settingsSaveGeminiKeyBtn");
  const keyInput = document.querySelector("#settingsGeminiKeyInput");
  if (saveBtn && keyInput) {
    saveBtn.addEventListener("click", () => {
      const val = keyInput.value.trim();
      state.geminiApiKey = val;
      localStorage.setItem("gemini_api_key", val);
      render("settings");
    });
  }
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
    if (view === "settings") hydrateSettingsEvents();
  }
}

document.querySelectorAll("nav button[data-view]").forEach((button) => {
  button.addEventListener("click", () => render(button.dataset.view));
});

load();
