"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface WorkHistory {
  company: string; role: string; duration: string; description: string;
}
interface Education {
  degree: string; institution: string; year: string;
}
interface Profile {
  full_name: string; email: string; phone: string;
  city: string; state: string; country: string;
  linkedin_url: string; github_url: string; portfolio_url: string;
  skills: string[]; experience_years: number; summary: string;
  work_history: WorkHistory[]; education: Education[];
  resume_path: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem("token") || "";
  const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/auth"); return; }
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const r = await fetch("/api/profile/me", { headers: getHeaders() });
      if (r.status === 404) setProfile(null);
      else if (r.status === 401) router.push("/auth");
      else setProfile(await r.json());
    } catch { showToast("Failed to load profile"); }
    finally { setLoading(false); }
  }

  async function uploadResume(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/profile/upload-resume", {
        method: "POST",
        headers: getHeaders(),
        body: form,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail);
      showToast("✓ Resume parsed — " + (d.profile?.skills?.length || 0) + " skills extracted");
      await fetchProfile();
    } catch (e: any) {
      showToast("Upload failed: " + (e.message || "unknown error"));
    } finally { setUploading(false); }
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const r = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          city: profile.city,
          country: profile.country,
          linkedin_url: profile.linkedin_url,
          github_url: profile.github_url,
        }),
      });
      if (!r.ok) throw new Error();
      showToast("✓ Profile saved");
    } catch { showToast("Save failed"); }
    finally { setSaving(false); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  function updateField(key: keyof Profile, value: any) {
    setProfile(prev => prev ? { ...prev, [key]: value } : prev);
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
    </main>
  );

  return (
    <main className="min-h-screen py-8 px-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 glass text-sm px-5 py-3 rounded-xl z-50 animate-slide-in-right"
          style={{ border: "1px solid var(--border)", color: "var(--text)", boxShadow: "var(--shadow-lg)" }}>
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6 stagger">
        {/* Header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/")}
                className="btn-ghost w-9 h-9 rounded-xl flex items-center justify-center text-sm">
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Your profile</h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Resume, skills, and experience</p>
              </div>
            </div>
            <button onClick={() => { localStorage.clear(); router.push("/auth"); }}
              className="btn-ghost text-xs px-4 py-2 rounded-xl">
              Sign out
            </button>
          </div>
        </div>

        {/* Resume upload */}
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Resume</p>

          {profile?.resume_path ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}>
                  📄
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Resume uploaded</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {profile.skills?.length || 0} skills · {profile.work_history?.length || 0} jobs extracted
                  </p>
                </div>
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="text-xs px-4 py-2 rounded-xl"
                style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent)" }}>
                Replace PDF
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full rounded-xl p-12 text-center transition-all group disabled:opacity-60"
              style={{ border: "2px dashed var(--border)" }}>
              <div className="text-4xl mb-4">{uploading ? "⏳" : "📎"}</div>
              <p className="text-sm font-medium transition"
                style={{ color: "var(--text-secondary)" }}>
                {uploading ? "AI is parsing your resume..." : "Upload your resume PDF"}
              </p>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                {uploading ? "Extracting skills, experience, education..." : "AI extracts all your details automatically"}
              </p>
            </button>
          )}

          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => e.target.files?.[0] && uploadResume(e.target.files[0])} />
        </div>

        {/* Profile fields */}
        {profile && (
          <div className="glass rounded-2xl p-6 space-y-5">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Personal info</p>

            <div className="grid grid-cols-2 gap-4">
              {([
                ["Full name",    "full_name"],
                ["Phone",        "phone"],
                ["City",         "city"],
                ["Country",      "country"],
                ["LinkedIn URL", "linkedin_url"],
                ["GitHub URL",   "github_url"],
              ] as [string, keyof Profile][]).map(([label, key]) => (
                <div key={key as string}>
                  <label className="block text-[11px] mb-1.5 uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}>{label}</label>
                  <input
                    value={(profile[key] as string) || ""}
                    onChange={e => updateField(key, e.target.value)}
                    className="input w-full h-10 px-3 rounded-xl text-sm" />
                </div>
              ))}
            </div>

            {/* Extracted skills */}
            {(profile.skills?.length > 0) && (
              <div>
                <p className="text-[11px] mb-3 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}>Extracted skills ({profile.skills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map(s => (
                    <span key={s} className="tag-skill" style={{ fontSize: 12, padding: "4px 10px", borderRadius: 9999 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Work history */}
            {(profile.work_history?.length > 0) && (
              <div>
                <p className="text-[11px] mb-3 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}>Work history</p>
                <div className="space-y-2">
                  {profile.work_history.map((w, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{w.role}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{w.company} · {w.duration}</p>
                      {w.description && (
                        <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>{w.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {(profile.education?.length > 0) && (
              <div>
                <p className="text-[11px] mb-3 uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}>Education</p>
                <div className="space-y-2">
                  {profile.education.map((e, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{e.degree}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{e.institution} · {e.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={saveProfile} disabled={saving}
              className="btn-primary w-full h-12 rounded-xl text-sm flex items-center justify-center gap-2">
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : "Save changes"}
            </button>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => router.push("/")}
          className="btn-primary w-full h-12 rounded-xl text-sm flex items-center justify-center gap-2">
          Start searching jobs →
        </button>
      </div>
    </main>
  );
}
