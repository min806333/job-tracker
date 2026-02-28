"use client";

import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";

function SignupPageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [debug, setDebug] = useState("");

  async function handleSignup() {
    setErrorMsg("");
    setSuccessMsg("");
    setDebug("Validating input...");

    const em = email.trim();
    const pw = password;

    if (!em || !pw) {
      setErrorMsg("Please enter your email and password.");
      setDebug("Validation failed: missing email or password.");
      return;
    }
    if (pw.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setDebug("Validation failed: password too short.");
      return;
    }
    if (pw !== password2) {
      setErrorMsg("Passwords do not match.");
      setDebug("Validation failed: password confirmation mismatch.");
      return;
    }

    setLoading(true);
    setDebug("Calling Supabase signUp...");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
      });

      if (error) {
        setErrorMsg(error.message);
        setDebug(`signUp failed: ${error.message}`);
        return;
      }

      if (!data.session) {
        setSuccessMsg("Sign-up complete. Please check your email to log in.");
        setDebug("signUp succeeded: no session (email confirmation required).");
        return;
      }

      setSuccessMsg("Sign-up complete. Redirecting to dashboard...");
      setDebug("signUp succeeded: session active, redirecting.");
      router.push(nextPath);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "An unknown error occurred during sign-up.");
      setDebug(`Exception: ${err?.message ?? String(err)}`);
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
            Create your account and start tracking today.
            <br />
            Keep deadlines, follow-ups, and next actions in one place.
          </p>
          <div className="mt-8 space-y-3 text-zinc-300">
            <div>- Daily focus with Today view</div>
            <div>- Never miss deadlines or follow-ups</div>
            <div>- Organize with kanban-style stages</div>
          </div>
        </div>

        {/* Right: signup card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-8 shadow-xl">
            <h2 className="text-xl font-semibold">Create account</h2>

            {errorMsg ? <div className="mt-4 text-sm text-red-400">{errorMsg}</div> : null}

            {successMsg ? <div className="mt-4 text-sm text-emerald-300">{successMsg}</div> : null}

            {debug ? <div className="mt-3 text-xs text-zinc-400">Debug: {debug}</div> : null}

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
                placeholder="Password (min 6)"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <input
                type="password"
                placeholder="Confirm password"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSignup();
                  }
                }}
              />

              <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium py-3 hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </div>

            <div className="mt-6 text-sm text-zinc-400 text-center">
              Already have an account?{" "}
              <a href="/login" className="text-white hover:underline">
                Log in
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 text-zinc-100" />}>
      <SignupPageContent />
    </Suspense>
  );
}
