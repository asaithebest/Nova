// pages/login.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

/**
 * Simple front-end login page for NovaGPT
 * - Saves a simple user object to localStorage under "novagpt_user"
 * - Redirects to "/" when already logged in
 * - Replace `fakeAuth` with real API calls if you have a backend
 */

const STORAGE_KEY = "novagpt_user";

function FakeAuth({ email, password }) {
  // Very simple "fake" authentication for demo purposes.
  // Replace by calling your real /api/login endpoint.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!email) return reject(new Error("Email required"));
      // Accept any password — but enforce simple length for UX
      if (!password || password.length < 3) return reject(new Error("Password too short"));
      // Return a minimal user object
      resolve({
        id: "user_" + Date.now().toString(36),
        email,
        firstName: (email.split("@")[0] || "User").split(".")[0],
        createdAt: Date.now(),
        token: "local-demo-token-" + Math.random().toString(36).slice(2, 10),
      });
    }, 600);
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If already logged in, go home
    try {
      const u = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (u && u.token) {
        router.replace("/");
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await FakeAuth({ email: email.trim().toLowerCase(), password });
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        // store in session (cleared on tab close)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }
      // small delay for UX
      setTimeout(() => {
        router.replace("/");
      }, 150);
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onDemo = async () => {
    setError("");
    setLoading(true);
    try {
      const demoUser = {
        id: "demo_user",
        email: "demo@novagpt.local",
        firstName: "Demo",
        createdAt: Date.now(),
        token: "demo-token",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login — NovaGPT</title>
        <meta name="description" content="Log in to NovaGPT (demo)" />
      </Head>

      <div className="page">
        <main className="card">
          <div className="brand">
            <img src="/logo.png" alt="Nova logo" className="logo" />
            <div>
              <h1>NovaGPT</h1>
              <p className="muted">Log in to continue — local/demo auth</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="form" aria-label="Login form">
            <label className="label">
              <span className="label-title">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </label>

            <label className="label">
              <span className="label-title">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={3}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter a password (demo)"
              />
            </label>

            <div className="row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="link"
                onClick={() => {
                  const help = `This demo stores a minimal user object locally. Replace login page to call your real API for production.`;
                  alert(help);
                }}
              >
                Help
              </button>
            </div>

            {error && <div role="alert" className="error">{error}</div>}

            <div className="actions">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={onDemo}
                aria-label="Use demo account"
                disabled={loading}
              >
                Demo account
              </button>
            </div>

            <p className="small muted">
              By continuing you accept this demo's local-only auth. For real login replace this with your
              API or OAuth flow.
            </p>
          </form>
        </main>
      </div>

      <style jsx>{`
        :root {
          --bg: #f6f6f6;
          --card: #fff;
          --muted: #666;
          --accent: #111;
          --border: #e6e6e6;
        }
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, var(--bg), #ffffff);
          padding: 24px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }
        .card {
          width: 100%;
          max-width: 480px;
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 6px 28px rgba(16,24,40,0.06);
          border: 1px solid var(--border);
          padding: 20px;
        }
        .brand {
          display:flex;
          gap:12px;
          align-items:center;
          margin-bottom:18px;
        }
        .logo { width:44px; height:44px; object-fit:contain; filter:grayscale(100%); }
        h1 { margin:0; font-size:20px; color:var(--accent); }
        .muted { color:var(--muted); margin:0; font-size:13px; }

        .form { display:flex; flex-direction:column; gap:12px; margin-top:6px; }
        .label { display:flex; flex-direction:column; gap:6px; }
        .label-title { font-size:13px; color:#222; }
        .input {
          padding:10px 12px;
          border-radius:8px;
          border:1px solid var(--border);
          font-size:15px;
          outline:none;
          background: #fff;
        }
        .input:focus { box-shadow:0 0 0 3px rgba(0,0,0,0.03); border-color:#ccc; }

        .row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .checkbox { display:flex; gap:8px; align-items:center; color:var(--muted); font-size:14px; }
        .checkbox input { width:16px; height:16px; }

        .link { background:transparent; border:none; color:var(--muted); cursor:pointer; font-size:13px; }

        .actions { display:flex; gap:10px; margin-top:6px; }
        .btn { padding:10px 14px; border-radius:10px; border:1px solid var(--border); cursor:pointer; font-weight:600; }
        .btn.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
        .btn.ghost { background:transparent; color:var(--accent); }

        .small { font-size:13px; color:var(--muted); margin-top:8px; }

        .error { color:#8b1e1e; background:#ffecec; padding:8px 10px; border-radius:8px; font-size:13px; border:1px solid #f1caca; }

        @media (max-width: 520px) {
          .card { padding:16px; border-radius:10px; }
          .actions { flex-direction:column-reverse; }
          .btn { width:100%; }
        }
      `}</style>
    </>
  );
}
