"use client";
import { useState, useEffect } from "react";

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    const saved = localStorage.getItem("theme");
    const prefersDark = saved ? saved === "dark" : true;
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function handleSignOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    window.location.href = "/";
  }

  return (
    <nav className="sticky top-0 z-40 border-b transition-colors duration-300"
      style={{ background: "var(--nav-bg)", borderColor: "var(--border)", backdropFilter: "blur(16px)" }}>
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-5">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            U
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Up<span style={{ color: "var(--accent)" }}>Hired</span>
          </span>
        </a>

        <div className="flex items-center gap-1">
          <a href="/"
            className="text-sm px-3.5 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Search
          </a>
          <a href="/profile"
            className="text-sm px-3.5 py-1.5 rounded-lg transition-all duration-200"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Profile
          </a>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-200 ml-1"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☀️" : "🌙"}
          </button>

          {isLoggedIn ? (
            <button
              onClick={handleSignOut}
              className="text-sm ml-1 px-4 py-1.5 rounded-lg transition-all duration-200 btn-ghost"
            >
              Sign out
            </button>
          ) : (
            <a href="/auth"
              className="text-sm ml-1 px-4 py-1.5 rounded-lg btn-primary">
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
