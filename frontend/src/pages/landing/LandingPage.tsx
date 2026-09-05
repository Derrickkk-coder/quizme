import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Star,
  Mail,
  GraduationCap,
} from "lucide-react";
import { Logo } from "../../components/Logo";
import { RevealGroup, RevealCard, RevealItem } from "../../components/motion/Reveal";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import heroBackground from "../../assets/background.jpg";

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
    accent: "brand" as const,
  },
  {
    icon: Library,
    title: "Powerful question banks",
    description: "Organize questions by subject, class, topic, and difficulty — then auto-generate quizzes in seconds.",
    accent: "brand" as const,
  },
  {
    icon: BarChart3,
    title: "Real performance analytics",
    description: "Class averages, pass rates, weakest topics, and student trends — calculated from real submitted data.",
    accent: "teal" as const,
  },
  {
    icon: ShieldCheck,
    title: "Built-in quiz integrity",
    description: "Randomized questions and options, attempt limits, and server-side grading and timing you can trust.",
    accent: "brand" as const,
  },
  {
    icon: Users,
    title: "Role-based for your school",
    description: "Dedicated, permission-scoped experiences for students, teachers, and administrators.",
    accent: "brand" as const,
  },
  {
    icon: Sparkles,
    title: "Instant, automatic grading",
    description: "Objective questions are graded the moment a quiz is submitted — no manual marking required.",
    accent: "teal" as const,
  },
];

const FAQS = [
  {
    q: "Is EduQuiz built specifically for JHS schools?",
    a: "Yes. EduQuiz focuses on quizzes and assessments for Junior High School — simpler and more focused than a full LMS, covering the subjects and class structure JHS schools already use.",
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

const SUBJECT_TICKER = [
  "Mathematics",
  "English Language",
  "Integrated Science",
  "Social Studies",
  "Computing",
  "Religious & Moral Education",
];

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Server-verified grading", accent: "brand" as const },
  { icon: Timer, label: "Anti-cheat by design", accent: "brand" as const },
  { icon: GraduationCap, label: "Built for JHS curriculum", accent: "brand" as const },
  { icon: Sparkles, label: "Instant results", accent: "teal" as const },
];

const heroWords = ["Learn.", "Practice.", "Improve."];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface">
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="sticky top-0 z-30 border-b border-ink-100 bg-surface/80 backdrop-blur"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <motion.div whileHover={{ rotate: [0, -6, 6, -3, 0] }} transition={{ duration: 0.5 }}>
            <Logo />
          </motion.div>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="group relative text-sm font-medium text-ink-600 hover:text-ink-900">
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-brand-600 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <Link to="/login" className="btn-secondary btn-sm">
              Student Login
            </Link>
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login" className="btn-primary btn-sm">
                Teacher Login
              </Link>
            </motion.div>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-ink-100 md:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                {NAV_LINKS.map((link) => (
                  <a key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50">
                    {link.label}
                  </a>
                ))}
                <Link to="/login" className="btn-primary btn-sm mt-2 w-full">
                  Log in
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-surface">
        <div className="pointer-events-none absolute inset-0">
          <img
            src={heroBackground}
            alt=""
            className="h-full w-full object-cover object-[center_28%] opacity-[0.55] saturate-[0.85] dark:opacity-[0.28] dark:saturate-[0.55]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_-5%,#e0e7ff90,transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(35%_30%_at_88%_15%,#ccfbf180,transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(35%_30%_at_8%_80%,#fef3c780,transparent)]" />
          {/* Protects text legibility over the now-clearer photo without dimming it at the edges. */}
          <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_38%,var(--color-surface)_0%,transparent_100%)] opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
        </div>

        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand-300/40 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute right-0 top-10 h-72 w-72 rounded-full bg-accent-300/40 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl animate-blob [animation-delay:4s]" />

        <div className="pointer-events-none absolute inset-0 hidden xl:block">
          {/* Quiz-in-progress preview */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -6 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 16 }}
            className="absolute left-[4%] top-[14%] animate-float [animation-duration:7s]"
          >
            <div className="w-52 rounded-2xl border border-ink-200 bg-surface/95 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between text-[10px] font-semibold text-ink-400">
                <span>QUESTION 3 OF 10</span>
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                  <Timer className="h-3 w-3" /> 04:12
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-ink-100">
                <div className="h-1.5 w-[30%] rounded-full bg-brand-500" />
              </div>
              <p className="mt-3 text-xs font-semibold text-ink-800">Which gas do plants absorb?</p>
              <div className="mt-2 space-y-1.5">
                <div className="rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-[11px] font-medium text-brand-700">
                  Carbon dioxide
                </div>
                <div className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-[11px] text-ink-600">Oxygen</div>
              </div>
            </div>
          </motion.div>

          {/* Analytics preview */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: 5 }}
            transition={{ delay: 0.65, type: "spring", stiffness: 120, damping: 16 }}
            className="absolute right-[6%] top-[10%] animate-float [animation-duration:8s] [animation-delay:0.4s]"
          >
            <div className="w-44 rounded-2xl border border-ink-200 bg-surface/95 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Class average</p>
                <BarChart3 className="h-3.5 w-3.5 text-accent-500" />
              </div>
              <p className="mt-1 text-2xl font-extrabold text-ink-900">
                82<span className="text-sm text-ink-400">%</span>
              </p>
              <div className="mt-3 flex h-12 items-end gap-1.5">
                {[40, 65, 50, 80, 60, 90].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-accent-400" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Result preview */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -4 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 120, damping: 16 }}
            className="absolute left-[9%] top-[58%] animate-float [animation-duration:6.5s] [animation-delay:0.8s]"
          >
            <div className="w-40 rounded-2xl border border-ink-200 bg-surface/95 p-4 text-center shadow-xl backdrop-blur">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="mt-2 text-lg font-extrabold text-ink-900">9/10</p>
              <p className="text-[11px] text-ink-600">Grade A · Passed</p>
            </div>
          </motion.div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="badge-brand"
            >
              <Sparkles className="h-3.5 w-3.5" /> Built for Junior High Schools
            </motion.span>

            <h1 className="mt-5 flex flex-wrap justify-center gap-x-3 text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
              {heroWords.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 150, damping: 14 }}
                  className={
                    i === heroWords.length - 1
                      ? "animate-gradient-x bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600 bg-clip-text text-transparent"
                      : ""
                  }
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mx-auto mt-5 max-w-xl text-lg font-medium text-ink-700"
            >
              A smarter way for schools to create, manage and take online quizzes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <motion.div className="relative" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                <span className="absolute inset-0 animate-ping rounded-lg bg-brand-400 opacity-40" />
                <Link to="/login" className="btn-primary relative px-6 py-3 text-base">
                  Teacher Login <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                  Student Login
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Subject ticker */}
        <div className="relative border-t border-brand-100/60 bg-white/60 py-5 backdrop-blur">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-500">Covers every core JHS subject</p>
          <div className="flex overflow-hidden">
            <div className="flex shrink-0 animate-marquee items-center gap-3 whitespace-nowrap pr-3">
              {[...SUBJECT_TICKER, ...SUBJECT_TICKER].map((subject, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-4 py-1.5 text-sm font-semibold text-ink-600 shadow-sm"
                >
                  <Star className="h-3.5 w-3.5 text-amber-400" /> {subject}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-ink-100 bg-surface py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TRUST_POINTS.map(({ icon: Icon, label, accent }) => (
              <RevealItem key={label} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    accent === "teal" ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-semibold text-ink-600 sm:text-sm">{label}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-ink-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink-900">How EduQuiz works</h2>
          <p className="mt-3 text-ink-600">From question bank to graded result, in four simple steps.</p>
        </div>
        <RevealGroup className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Build a question bank", description: "Teachers add questions by subject, topic, and difficulty." },
            { step: "2", title: "Create & schedule a quiz", description: "Set duration, attempts, and an opening/closing window." },
            { step: "3", title: "Students take the quiz", description: "A focused interface with a timer and live progress." },
            { step: "4", title: "Results, instantly", description: "Automatic grading and class-wide analytics appear right away." },
          ].map((s) => (
            <RevealCard key={s.step} className="card p-6 shadow-md transition-shadow duration-300 hover:shadow-2xl">
              <div
                className={`flex h-9 w-9 animate-pulse items-center justify-center rounded-full text-sm font-bold text-white ${
                  s.step === "4" ? "bg-accent-600" : "bg-brand-600"
                }`}
              >
                {s.step}
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{s.description}</p>
            </RevealCard>
          ))}
        </RevealGroup>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-ink-900">Everything a modern assessment platform needs</h2>
            <p className="mt-3 text-ink-600">Purpose-built for quizzes — not a bloated, generic school system.</p>
          </div>
          <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <RevealCard key={f.title} className="card p-6 shadow-md transition-shadow duration-300 hover:shadow-2xl">
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    f.accent === "teal" ? "bg-accent-100 text-accent-700" : "bg-brand-100 text-brand-600"
                  }`}
                >
                  <f.icon className="h-5 w-5" />
                </motion.div>
                <h3 className="mt-4 font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{f.description}</p>
              </RevealCard>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Audiences */}
      <section id="audiences" className="bg-ink-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink-900">Built for every role in your school</h2>
        </div>
        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
            <RevealCard key={a.title} className="card p-8 shadow-md transition-shadow duration-300 hover:shadow-2xl">
              <h3 className="text-lg font-bold text-ink-900">{a.title}</h3>
              <ul className="mt-4 space-y-3">
                {a.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-ink-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </RevealCard>
          ))}
        </RevealGroup>
        </div>
      </section>

      {/* Security */}
      <section className="relative overflow-hidden bg-brand-900 py-20 text-white">
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl animate-blob [animation-delay:3s]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 100, damping: 16 }}
          >
            <span className="badge bg-white/10 text-white">Secure by design</span>
            <h2 className="mt-4 text-3xl font-bold">Secure, server-verified assessments</h2>
            <p className="mt-4 text-brand-100">
              Timing, scoring, and attempt limits are all enforced on the server — never trusted from the browser. Questions and
              options can be randomized per student to protect quiz integrity.
            </p>
          </motion.div>
          <RevealGroup className="grid grid-cols-2 gap-4">
            {["Randomized questions", "Server-side timing", "Attempt limits", "Automatic submission"].map((item) => (
              <RevealCard key={item} className="rounded-xl bg-white/5 p-5">
                <ShieldCheck className="h-5 w-5 animate-pulse text-accent-400" />
                <p className="mt-3 text-sm font-medium">{item}</p>
              </RevealCard>
            ))}
          </RevealGroup>
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
                <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-ink-600">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Contact / CTA */}
      <section id="contact" className="relative overflow-hidden bg-ink-50 py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl animate-blob" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"
        >
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-accent-600 px-8 py-14 text-center shadow-2xl sm:px-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-5 text-3xl font-bold text-white">Ready to modernize your school's quizzes?</h2>
            <p className="mx-auto mt-3 max-w-lg text-brand-50">
              Log in if your school already uses EduQuiz, or contact your administrator to get access set up.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50">
                  Log in to EduQuiz <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                <a
                  href="mailto:akwaboahderrick1@gmail.com?subject=EduQuiz%20for%20our%20school"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Mail className="h-4 w-4" /> Contact Administrator
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-ink-100 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <Logo markClassName="h-7 w-7" />
          <p className="text-xs text-ink-500">&copy; {new Date().getFullYear()} EduQuiz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
