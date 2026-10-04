"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Job {
  title: string;
  company: string;
  score: number;
  url: string;
  skills: string[];
  location?: string;
  salary?: string;
  source?: string;
}

interface LogEntry {
  type: "log" | "complete" | "error";
  message?: string;
  node?: string;
  status?: string;
  result?: { report: string; jobs: Job[] };
}

const SITES = [
  { id: "linkedin",    label: "LinkedIn",    color: "#0A66C2", icon: "in" },
  { id: "remoteok",    label: "RemoteOK",    color: "#10b981", icon: "R" },
  { id: "indeed",      label: "Indeed",      color: "#2563eb", icon: "i" },
  { id: "naukri",      label: "Naukri",      color: "#f97316", icon: "N" },
  { id: "wellfound",   label: "Wellfound",   color: "#a855f7", icon: "W" },
  { id: "ycombinator", label: "YC Jobs",     color: "#f97316", icon: "Y" },
];

const PIPELINE_STEPS = [
  { key: "planner",   label: "Plan",    icon: "🧠" },
  { key: "browser",   label: "Search",  icon: "🌐" },
  { key: "extractor", label: "Extract", icon: "📄" },
  { key: "ranker",    label: "Rank",    icon: "⬇️" },
  { key: "summary",   label: "Report",  icon: "📊" },
];

type StepState = "idle" | "active" | "done";

export default function Home() {
  const router = useRouter();
  const [query, setQuery]             = useState("");
  const [skillInput, setSkillInput]   = useState("");
  const [skills, setSkills]           = useState(["Python", "JavaScript", "React", "SQL"]);
  const [experience, setExperience]   = useState(2);
  const [market, setMarket]           = useState("global");
  const [activeSites, setActiveSites] = useState(["linkedin", "remoteok", "indeed"]);
  const [logs, setLogs]               = useState<string[]>([]);
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [report, setReport]           = useState("");
  const [status, setStatus]           = useState<"idle"|"running"|"done"|"error">("idle");
  const [pipelineSteps, setPipelineSteps] = useState<Record<string, StepState>>({});
  const [sortBy, setSortBy]           = useState<"score"|"company">("score");
  const [isLoggedIn, setIsLoggedIn]   = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const v = skillInput.trim();
      if (v && !skills.includes(v)) setSkills(prev => [...prev, v]);
      setSkillInput("");
    }
  };

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s));

  const toggleSite = (id: string) =>
    setActiveSites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const setPipStep = (name: string, state: StepState) =>
    setPipelineSteps(prev => ({ ...prev, [name]: state }));

  const sortedJobs = [...jobs].sort((a, b) =>
    sortBy === "score"
      ? (b.score || 0) - (a.score || 0)
      : (a.company || "").localeCompare(b.company || "")
  );

  const userSkillsLow  = skills.map(s => s.toLowerCase());
  const matchedSkills  = new Set<string>();
  const missingSkills  = new Set<string>();
  jobs.forEach(j => (j.skills || []).forEach(s => {
    if (userSkillsLow.includes(s.toLowerCase())) matchedSkills.add(s);
    else missingSkills.add(s);
  }));

  async function startSearch() {
    if (!query.trim()) return;
    setLogs([]); setJobs([]); setReport("");
    setStatus("running"); setPipelineSteps({});

    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query, skills, experience_years: experience,
          sites: activeSites, market,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { workflow_id } = await res.json();

      const ws = new WebSocket(`ws://localhost:8000/ws/execution/${workflow_id}`);

      ws.onmessage = (e) => {
        const data: LogEntry = JSON.parse(e.data);
        if (data.type === "log" && data.message) {
          const msg = data.message;
          setLogs(prev => [...prev, msg]);
          if (msg.includes("[Planner]"))   { setPipStep("planner","done");    setPipStep("browser","active"); }
          if (msg.includes("[Browser]"))     setPipStep("browser","active");
          if (msg.includes("[Extractor]")) { setPipStep("browser","done");    setPipStep("extractor","active"); }
          if (msg.includes("[Ranker]"))    { setPipStep("extractor","done");  setPipStep("ranker","active"); }
          if (msg.includes("[Summary]"))   { setPipStep("ranker","done");     setPipStep("summary","active"); }
        }
        if (data.type === "complete") {
          PIPELINE_STEPS.forEach(s => setPipStep(s.key, "done"));
          setStatus(data.status === "done" ? "done" : "error");
          if (data.result) {
            setJobs(data.result.jobs || []);
            setReport(data.result.report || "");
          }
          ws.close();
        }
      };

      ws.onerror = () => pollForResults(workflow_id);

    } catch (err) {
      setStatus("error");
      setLogs(prev => [...prev, `Error: ${String(err)}`]);
    }
  }

  async function pollForResults(wid: string) {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/job-results/${wid}`);
        const d = await r.json();
        if (d.logs) setLogs(d.logs);
        if (d.status === "done") {
          clearInterval(iv); setStatus("done");
          if (d.result) { setJobs(d.result.jobs || []); setReport(d.result.report || ""); }
        }
        if (d.status === "error") { clearInterval(iv); setStatus("error"); }
      } catch { clearInterval(iv); }
    }, 1500);
  }

  const scoreColor = (s: number) =>
    s >= 0.65 ? "tag-matched" :
    s >= 0.35 ? "bg-[var(--amber-soft)] text-[var(--amber)]" :
    "tag";

  const scoreBarGrad = (s: number) =>
    s >= 0.65 ? "score-high" :
    s >= 0.35 ? "score-medium" :
    "score-low";

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6 stagger">

        {/* Hero */}
        <div className="glass rounded-2xl p-8 relative overflow-hidden animate-border-glow">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
               style={{ background: "var(--accent-soft)" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/30">
                  U
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                    Up<span style={{ color: "var(--accent)" }}>Hired</span>
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    AI-powered job search across 6 platforms
                  </p>
                </div>
              </div>
              {!isLoggedIn && (
                <button onClick={() => router.push("/auth")} className="btn-primary text-sm px-5 py-2 rounded-xl">
                  Sign in
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { n: "6",                    l: "Job sites" },
                { n: String(jobs.length || "—"), l: "Jobs found" },
                { n: "5",                    l: "AI agents" },
                { n: "∞",                    l: "Queries" },
              ].map(({ n, l }) => (
                <div key={l} className="rounded-xl p-3" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <div className="text-xl font-bold" style={{ color: "var(--text)" }}>{n}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-ring" style={{ background: "var(--accent)" }} />
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Search</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              What role are you looking for?
            </label>
            <input
              className="input w-full h-12 px-4 rounded-xl text-sm"
              placeholder="e.g. Software Engineer, Data Scientist, DevOps..."
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startSearch()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Your skills
              </label>
              <input
                className="input w-full h-10 px-3 rounded-xl text-sm"
                placeholder="Type and press Enter"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
              />
              <div className="flex flex-wrap gap-1.5 mt-2 min-h-7">
                {skills.map(s => (
                  <span key={s}
                    onClick={() => removeSkill(s)}
                    className="tag-skill inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition"
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999 }}>
                    {s} <span style={{ opacity: 0.5 }}>&times;</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  Experience
                </label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={20} value={experience}
                    onChange={e => setExperience(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1" />
                  <span className="text-sm font-mono px-2 py-1 rounded-lg min-w-[3rem] text-center"
                    style={{ color: "var(--text)", background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                    {experience}y
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Market</label>
                <select value={market} onChange={e => setMarket(e.target.value)}
                  className="select w-full h-10 px-3 rounded-xl text-sm">
                  <option value="global">Global / Remote</option>
                  <option value="india">India (+ Naukri)</option>
                  <option value="us">United States</option>
                  <option value="uk">United Kingdom</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>Platforms</label>
            <div className="grid grid-cols-3 gap-2">
              {SITES.map(site => (
                <button key={site.id} onClick={() => toggleSite(site.id)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200"
                  style={{
                    border: activeSites.includes(site.id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: activeSites.includes(site.id) ? "var(--accent-soft)" : "var(--bg-input)",
                    color: activeSites.includes(site.id) ? "var(--accent)" : "var(--text-muted)",
                  }}>
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: site.color }}>
                    {site.icon}
                  </span>
                  {site.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={startSearch} disabled={status === "running" || !query.trim()}
            className="btn-primary w-full h-12 rounded-xl text-sm flex items-center justify-center gap-2.5">
            {status === "running" ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching across platforms...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Find my next role
              </>
            )}
          </button>
        </div>

        {/* Pipeline */}
        {status !== "idle" && (
          <div className="glass rounded-2xl p-6 space-y-4 animate-fade-in-up">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Pipeline</p>
            <div className="flex items-center gap-0">
              {PIPELINE_STEPS.map((step, i) => {
                const state = pipelineSteps[step.key] || "idle";
                const cls = state === "done" ? "pipe-done" : state === "active" ? "pipe-active animate-pulse" : "pipe-idle";
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center gap-2 relative">
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className={`absolute top-3 left-[calc(50%+12px)] w-[calc(100%-24px)] h-px transition-colors duration-500 ${
                        state === "done" ? "pipe-line-done" : "pipe-line-idle"
                      }`} />
                    )}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs z-10 transition-all duration-300 border ${cls}`}>
                      {state === "done" ? "✓" : step.icon}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${
                      state === "done" ? "pipe-done" : state === "active" ? "pipe-active" : ""
                    }`} style={state === "idle" ? { color: "var(--text-muted)" } : {}}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {logs.length > 0 && (
              <div className="log-terminal rounded-xl p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-0.5">
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${
                    log.includes("✗") || log.includes("Error") || log.includes("crashed") ? "log-err" :
                    log.includes("✓") || log.includes("complete") ? "log-ok" : "log-info"
                  }`}>
                    <span className="shrink-0 text-[10px] pt-px" style={{ color: "var(--border-strong)" }}>
                      {new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                    </span>
                    <span>{log}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {jobs.length > 0 && (
          <div className="glass rounded-2xl p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                </p>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>found across platforms</span>
              </div>
              <div className="flex gap-1.5">
                {(["score", "company"] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      border: sortBy === s ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: sortBy === s ? "var(--accent-soft)" : "transparent",
                      color: sortBy === s ? "var(--accent)" : "var(--text-muted)",
                    }}>
                    {s === "score" ? "⭐ Best match" : "🏢 Company"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {sortedJobs.map((job, i) => {
                const pct = Math.round((job.score || 0) * 100);

                return (
                  <div key={i}
                    className="rounded-xl p-4 transition-all duration-200 group"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-card-hover)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm leading-snug transition-colors"
                          style={{ color: "var(--text)" }}>
                          {job.title || "Untitled"}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{job.company}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${scoreColor(job.score || 0)}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {job.location && <span>📍 {job.location}</span>}
                      {job.salary   && <span>💰 {job.salary}</span>}
                      {job.source   && (
                        <span className="tag capitalize px-2 py-0.5">{job.source}</span>
                      )}
                    </div>

                    {job.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {job.skills.slice(0, 8).map(s => (
                          <span key={s}
                            className={userSkillsLow.includes(s.toLowerCase()) ? "tag-matched" : "tag"}
                            style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999 }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className={`h-full rounded-full animate-score-bar ${scoreBarGrad(job.score || 0)}`}
                        style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          className="btn-primary text-xs px-4 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          Apply now
                        </a>
                      )}
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          className="btn-ghost text-xs px-3 py-1.5 rounded-lg inline-flex items-center">
                          View page ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skill Gap */}
        {(matchedSkills.size > 0 || missingSkills.size > 0) && (
          <div className="glass rounded-2xl p-6 animate-fade-in-up">
            <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              Skill Analysis
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: "var(--green-soft)", border: "1px solid var(--green)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-3 font-semibold" style={{ color: "var(--green)" }}>
                  You have ({matchedSkills.size})
                </p>
                <div className="flex flex-wrap gap-1">
                  {[...matchedSkills].slice(0, 10).map(s => (
                    <span key={s} className="tag-matched" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--amber-soft)", border: "1px solid var(--amber)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-3 font-semibold" style={{ color: "var(--amber)" }}>
                  Consider learning ({missingSkills.size})
                </p>
                <div className="flex flex-wrap gap-1">
                  {[...missingSkills].slice(0, 10).map(s => (
                    <span key={s} className="tag" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: "var(--amber-soft)", color: "var(--amber)", borderColor: "transparent" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Report */}
        {report && (
          <div className="glass rounded-2xl p-6 animate-fade-in-up">
            <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>AI Analysis</p>
            <div className="rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {report}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
