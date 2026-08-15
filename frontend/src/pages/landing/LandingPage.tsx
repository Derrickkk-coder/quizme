import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Timer,
  BarChart3,
  Library,
  Users,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { Logo } from "../../components/Logo";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "For everyone", href: "#audiences" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  {
    icon: Timer,
    title: "Distraction-free quiz taking",
    description: "Countdown timers, question navigation, progress tracking, and automatic submission keep assessments fair and focused.",
  },
  {
    icon: Library,
    title: "Powerful question banks",
    description: "Organize questions by subject, class, topic, and difficulty — then auto-generate quizzes in seconds.",
  },
  {
    icon: BarChart3,
    title: "Real performance analytics",
    description: "Class averages, pass rates, weakest topics, and student trends — calculated from real submitted data.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in quiz integrity",
    description: "Randomized questions and options, attempt limits, and server-side grading and timing you can trust.",
  },
  {
    icon: Users,
    title: "Role-based for your school",
    description: "Dedicated, permission-scoped experiences for students, teachers, and administrators.",
  },
  {
    icon: Sparkles,
    title: "Instant, automatic grading",
    description: "Objective questions are graded the moment a quiz is submitted — no manual marking required.",
  },
];

const FAQS = [
  {
    q: "Is QUIZME built specifically for JHS schools?",
    a: "Yes. QUIZME focuses on quizzes and assessments for Junior High School — simpler and more focused than a full LMS, covering the subjects and class structure JHS schools already use.",
  },
  {
    q: "Can students see their answers were correct?",
    a: "Teachers control this per quiz — they choose whether correct answers, explanations, and results are shown immediately or held back.",
  },
  {
    q: "What stops students from cheating during a quiz?",
    a: "Questions and answer options can be randomized per student, attempts and time limits are enforced on the server, and the timer and score are never trusted from the browser alone.",
  },
  {
    q: "Can a teacher reuse questions across multiple quizzes?",
    a: "Yes — every question lives in a searchable, filterable question bank and can be added to any number of quizzes, or used to auto-generate a new one.",
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-ink-600 hover:text-ink-900">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="btn-secondary btn-sm">
              Teacher Login
            </Link>
            <Link to="/login" className="btn-primary btn-sm">
              Student Login
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="space-y-1 border-t border-ink-100 px-4 py-3 md:hidden">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">
                {link.label}
              </a>
            ))}
            <Link to="/login" className="btn-primary btn-sm mt-2 w-full">
              Log in
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="badge-brand">Built for Junior High Schools</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
              Learn. Practice. <span className="text-brand-600">Improve.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-600">
              A smarter way for schools to create, manage and take online quizzes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login" className="btn-primary px-6 py-3 text-base">
                Student Login <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                Teacher Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink-900">How QUIZME works</h2>
          <p className="mt-3 text-ink-500">From question bank to graded result, in four simple steps.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Build a question bank", description: "Teachers add questions by subject, topic, and difficulty." },
            { step: "2", title: "Create & schedule a quiz", description: "Set duration, attempts, and an opening/closing window." },
            { step: "3", title: "Students take the quiz", description: "A focused interface with a timer and live progress." },
            { step: "4", title: "Results, instantly", description: "Automatic grading and class-wide analytics appear right away." },
          ].map((s) => (
            <div key={s.step} className="card p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{s.step}</div>
              <h3 className="mt-4 font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-ink-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-ink-900">Everything a modern assessment platform needs</h2>
            <p className="mt-3 text-ink-500">Purpose-built for quizzes — not a bloated, generic school system.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="audiences" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink-900">Built for every role in your school</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            {
              title: "For Students",
              points: ["A clear view of assigned and upcoming quizzes", "Distraction-free quiz taking with a live timer", "Instant results and subject-by-subject performance"],
            },
            {
              title: "For Teachers",
              points: ["Reusable question banks by topic and difficulty", "Full control over scheduling, attempts, and grading", "Class analytics: weakest topics, most-missed questions"],
            },
            {
              title: "For Administrators",
              points: ["Manage users, classes, and subjects in one place", "School-wide analytics and exportable reports", "A full audit log of important platform activity"],
            },
          ].map((a) => (
            <div key={a.title} className="card p-8">
              <h3 className="text-lg font-bold text-ink-900">{a.title}</h3>
              <ul className="mt-4 space-y-3">
                {a.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-ink-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="bg-brand-900 py-20 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="badge bg-white/10 text-white">Secure by design</span>
            <h2 className="mt-4 text-3xl font-bold">Secure, server-verified assessments</h2>
            <p className="mt-4 text-brand-100">
              Timing, scoring, and attempt limits are all enforced on the server — never trusted from the browser. Questions and
              options can be randomized per student to protect quiz integrity.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["Randomized questions", "Server-side timing", "Attempt limits", "Automatic submission"].map((item) => (
              <div key={item} className="rounded-xl bg-white/5 p-5">
                <ShieldCheck className="h-5 w-5 text-accent-400" />
                <p className="mt-3 text-sm font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-ink-900">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-medium text-ink-800">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-sm text-ink-500">{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Contact / CTA */}
      <section id="contact" className="bg-ink-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-ink-900">Ready to bring QUIZME to your school?</h2>
          <p className="mt-3 text-ink-500">Reach out to your school administrator to get access, or log in if you already have an account.</p>
          <div className="mt-8">
            <Link to="/login" className="btn-primary px-6 py-3 text-base">
              Log in to QUIZME
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <Logo markClassName="h-7 w-7" />
          <p className="text-xs text-ink-400">&copy; {new Date().getFullYear()} QUIZME. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
