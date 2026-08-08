const app = document.querySelector("#app");
const state = { jobs: [], statuses: [], forecasts: [] };

const STOP_WORDS = new Set([
  "and", "are", "for", "from", "have", "that", "the", "this", "with", "you", "your",
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
      state[key] = await fetch(`data/${file}`).then((response) => response.ok ? response.json() : []);
    } catch {
      state[key] = [];
    }
  }
  render("overview");
}

function overview() {
  return `
    <h2>Overview</h2>
    <div class="metrics">
      <div class="card"><b>${state.jobs.length}</b><span>matching public roles</span></div>
      <div class="card"><b>${state.statuses.length}</b><span>company checks</span></div>
      <div class="card"><b>${state.forecasts.length}</b><span>verified forecast records</span></div>
    </div>
    <div class="card">
      <h3>Privacy boundary</h3>
      <p>Public Pages contains job data, monitor status, and aggregate forecasts only. Resume content, referral contacts, notes, notification secrets, and outreach drafts stay local/private.</p>
    </div>`;
}

function jobs() {
  if (!state.jobs.length) return "<h2>Open Jobs</h2><p class=\"notice\">No public matching jobs yet. Scheduled checks will populate this view.</p>";
  return `
    <h2>Open Jobs</h2>
    <table>
      <tr><th>Company</th><th>Role</th><th>Location</th><th>Match</th><th>Reasons</th></tr>
      ${state.jobs.map((job) => `
        <tr>
          <td>${escapeHtml(job.company_name)}</td>
          <td><a href="${escapeHtml(job.official_url)}">${escapeHtml(job.title)}</a></td>
          <td>${escapeHtml(job.location || "-")}</td>
          <td>${escapeHtml(job.match_score)}</td>
          <td>${escapeHtml((job.match_reasons || []).join(", "))}</td>
        </tr>`).join("")}
    </table>`;
}

function companies() {
  if (!state.statuses.length) return "<h2>Companies</h2><p class=\"notice\">Check status will appear after the first monitor run.</p>";
  return `
    <h2>Companies</h2>
    <table>
      <tr><th>Company ID</th><th>Status</th><th>Source</th><th>Checked</th><th>Records</th><th>Matches</th><th>Warning</th></tr>
      ${state.statuses.map((status) => `
        <tr>
          <td>${escapeHtml(status.company_id)}</td>
          <td>${escapeHtml(statusLabel(status))}</td>
          <td>${escapeHtml(status.source_type || "-")}<br><small>${escapeHtml(status.parser_version || "-")}</small></td>
          <td>${escapeHtml(status.checked_at)}</td>
          <td>${escapeHtml(status.records_parsed ?? 0)} / ${escapeHtml(status.records_received ?? 0)}</td>
          <td>${escapeHtml(status.matching_jobs)}</td>
          <td>${escapeHtml(status.warning || status.error || "")}</td>
        </tr>`).join("")}
    </table>`;
}

function statusLabel(status) {
  if (status.status === "unsupported") return "Source not verified";
  if (status.source_type === "generic_html" && (status.records_parsed ?? 0) === 0) return "Source not verified";
  return status.status || "-";
}

function forecast() {
  return `
    <h2>Opening Forecast</h2>
    <p class="notice">Forecasts display verified full-time new-grad observations separately from internships. Empty data means no estimate is shown.</p>
    ${state.forecasts.length ? `<pre>${escapeHtml(JSON.stringify(state.forecasts, null, 2))}</pre>` : "<p>No verified observations yet.</p>"}`;
}

function resume() {
  const options = state.jobs.map((job, index) => (
    `<option value="${index}">${escapeHtml(job.company_name)} - ${escapeHtml(job.title)}</option>`
  )).join("");
  return `
    <h2>Resume Tailoring</h2>
    <p class="notice">Browser-only analysis: pasted LaTeX is processed in memory and is not uploaded, saved, or committed. Local command output is written under ignored <code>generated/resumes/</code>.</p>
    <div class="grid">
      <section>
        <label>Discovered job<select id="resumeJob">${options || "<option>No discovered jobs yet</option>"}</select></label>
        <label>Complete job description<textarea id="jobDescription" rows="8"></textarea></label>
        <label>Paste LaTeX resume source<textarea id="resumeSource" rows="10"></textarea></label>
        <button id="analyzeResume">Analyze in browser</button>
      </section>
      <section>
        <h3>Local command</h3>
        <pre>job-watcher tailor-resume --tex ~/resume.tex --job-slug company-role --job-description-file job.txt</pre>
        <h3>Analysis</h3>
        <div id="resumeResult" class="card">Select a job or paste a description, then run local browser analysis.</div>
      </section>
    </div>`;
}

function referrals() {
  return `
    <h2>Referrals</h2>
    <p class="notice">Private/local-only tracker. Contact names, profile notes, emails, and referral history are excluded from Pages and Git by default.</p>
    <div class="grid">
      <section>
        <label>Message type<select id="messageKind">
          <option value="connection">LinkedIn connection note</option>
          <option value="referral">Initial referral outreach</option>
          <option value="follow_up">Follow-up request</option>
          <option value="thanks">Thank-you message</option>
        </select></label>
        <label>Recipient name<input id="recipientName" placeholder="First name"></label>
        <label>Explicit facts to include<textarea id="messageFacts" rows="5" placeholder="Shared class, alumni connection, role link, or reason for reaching out"></textarea></label>
        <button id="draftMessage">Draft message</button>
      </section>
      <section>
        <h3>Tracking fields</h3>
        <p>Company, relevant roles, deadline, referral status, contact name, contact role, profile URL, relationship, date contacted, follow-up date, response, referral submitted, notes.</p>
        <h3>Draft</h3>
        <div id="messageDraft" class="card">Drafts are generated locally and never sent automatically.</div>
      </section>
    </div>`;
}

function settings() {
  return `
    <h2>Settings</h2>
    <p>GitHub Pages is static. Edit versioned YAML locally or generate snippets here, then commit only public-safe configuration.</p>
    <pre>${escapeHtml(`candidate:
  graduation_date: "2026-12"
  preferred_start_date: "2027-01"
  target_graduation_years: [2026]
  target_start_years: [2027]
notifications:
  provider: discord
  discord:
    webhook_env: DISCORD_WEBHOOK_URL`)}</pre>
    <p>Companies: <code>config/companies.yaml</code>. Match filters: <code>config/filters.yaml</code>. Discord secret: <code>DISCORD_WEBHOOK_URL</code>.</p>`;
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
    result.innerHTML = `
      <p><b>${rate}%</b> keyword coverage before tailoring. After coverage is unchanged in the conservative MVP unless you approve supported edits locally.</p>
      <p><b>Existing evidence:</b> ${escapeHtml(present.slice(0, 30).join(", ") || "None detected")}</p>
      <p><b>Unsupported requirements:</b> ${escapeHtml(missing.slice(0, 30).join(", ") || "None detected")}</p>
      <p class="notice">Unsupported terms are not qualifications. Add only facts already true and supportable.</p>`;
  });
}

function hydrateReferrals() {
  const button = document.querySelector("#draftMessage");
  if (!button) return;
  button.addEventListener("click", () => {
    const name = document.querySelector("#recipientName").value || "there";
    const facts = document.querySelector("#messageFacts").value;
    const kind = document.querySelector("#messageKind").value;
    const context = "I'm a Georgia Tech Computer Science student graduating December 2026, looking for early-2027 new-grad software engineering roles.";
    const templates = {
      connection: `Hi ${name}, ${context} ${facts} Would you be open to connecting?`,
      referral: `Hi ${name}, ${context} ${facts} If you think my background could be a fit, would you be comfortable referring me for the role? No pressure either way.`,
      follow_up: `Hi ${name}, just following up on my earlier note. ${facts} Thanks for considering it.`,
      thanks: `Hi ${name}, thank you for your help with my application. I really appreciate your time and support.`,
    };
    document.querySelector("#messageDraft").textContent = templates[kind];
  });
}

function render(view) {
  app.innerHTML = ({ overview, jobs, companies, forecast, resume, referrals, settings }[view])();
  hydrateResume();
  hydrateReferrals();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => render(button.dataset.view));
});

load();
