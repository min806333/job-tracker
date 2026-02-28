"use client";

import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin() {
    setErrorMsg("");

    const em = email.trim();
    const pw = password;

    if (!em || !pw) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      router.push(nextPath);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 px-6">
        {/* Left: product intro */}
        <div className="hidden md:flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Job Tracker</h1>
          <p className="mt-6 text-zinc-400 text-lg leading-relaxed">
            Keep your applications from slipping through the cracks today.
            <br />
            Track deadlines, follow-ups, and next actions in one place.
          </p>
          <div className="mt-8 space-y-3 text-zinc-300">
            <div>- Daily focus with Today view</div>
            <div>- Never miss deadlines or follow-ups</div>
            <div>- Organize with kanban-style stages</div>
          </div>
        </div>

        {/* Right: login card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-8 shadow-xl">
            <h2 className="text-xl font-semibold">Log in</h2>

            {errorMsg ? <div className="mt-4 text-sm text-red-400">{errorMsg}</div> : null}

            <div className="mt-6 space-y-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium py-3 hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </div>

            <div className="mt-6 text-sm text-zinc-400 text-center">
              Do not have an account?{" "}
              <a href="/signup" className="text-white hover:underline">
                Sign up
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 text-zinc-100" />}>
      <LoginPageContent />
    </Suspense>
  );
}
