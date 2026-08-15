import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import loginIllustration from "../../assets/login-illustration.png";
import { useAuth } from "../../context/AuthContext";
import { roleHomePath } from "../../routes/ProtectedRoute";
import { apiErrorMessage } from "../../api/client";
import { Logo, LogoMark } from "../../components/Logo";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    const redirectTo = (location.state as { from?: string })?.from ?? roleHomePath(user.role);
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(roleHomePath(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile / tablet — soft neumorphic layout */}
      <div className="neu-surface relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-12 lg:hidden">
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 bg-gradient-to-tr from-brand-700 to-brand-400"
          style={{ clipPath: "polygon(0 100%, 55% 100%, 0 40%)" }}
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-accent-300/40 to-brand-300/40 blur-2xl"
        />

        <div className="relative z-10 w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <div className="neu-raised flex h-20 w-20 items-center justify-center rounded-3xl bg-ink-50">
              <LogoMark className="h-11 w-11" />
            </div>
            <p className="mt-3 text-xs font-bold tracking-wide text-ink-400">QUIZME</p>

            <h1 className="mt-4 text-2xl font-bold text-ink-900">Welcome Back</h1>
            <p className="mt-1 text-sm text-ink-500">Login to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</div>}

            <div className="neu-inset flex items-center gap-3 rounded-2xl bg-ink-50 px-4 py-3.5">
              <Mail className="h-4 w-4 shrink-0 text-ink-400" />
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="Email address"
                className="w-full bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="neu-inset flex items-center gap-3 rounded-2xl bg-ink-50 px-4 py-3.5">
              <Lock className="h-4 w-4 shrink-0 text-ink-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Password"
                className="w-full bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="shrink-0 text-ink-400 hover:text-ink-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neu-button w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>
        </div>
      </div>

      {/* Desktop — split panel layout */}
      <div className="hidden w-1/2 flex-col justify-center px-12 py-12 lg:flex lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <a href="/">
            <Logo />
          </a>

          <h2 className="mt-8 text-2xl font-bold text-ink-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-500">Log in to continue to your dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@quizme.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-600 to-accent-600 lg:block">
        <img
          src={loginIllustration}
          alt="Illustration of a student with a question mark"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/30 to-brand-900/10" />

        <div className="relative z-10 flex h-full flex-col justify-end px-10 pb-16">
          <span className="badge w-fit bg-white/15 text-white">Built for JHS schools</span>
          <h3 className="mt-5 max-w-md text-3xl font-bold leading-tight text-white">Learn. Practice. Improve.</h3>
          <p className="mt-4 max-w-sm text-brand-100">
            QUIZME helps JHS students and teachers create, manage, and take quizzes online — with instant grading and clear
            performance insights.
          </p>
        </div>
      </div>
    </div>
  );
}
