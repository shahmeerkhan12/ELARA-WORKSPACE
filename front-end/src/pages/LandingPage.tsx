import { Link } from "react-router-dom";
import {
  Moon,
  Activity,
  Heart,
  Sparkles,
  BarChart3,
  UserCircle,
  Calendar,
  Smile,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Cycle Intelligence",
    desc: "Know where you are in your cycle with accurate phase detection, fertile windows, and personalized period predictions.",
    gradient: "from-secondary/20 to-primary-light/30",
  },
  {
    icon: Heart,
    title: "Mood & Wellness Tracking",
    desc: "Log your daily mood with expressive icons and journal entries. Discover correlations between your cycle and emotional patterns.",
    gradient: "from-primary-light/30 to-accent-light/30",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    desc: "Get personalized recommendations, thoughtful responses from Elara AI, and actionable wellness tips based on your unique data.",
    gradient: "from-accent-light/30 to-sage-light/30",
  },
  {
    icon: BarChart3,
    title: "Cycle Report Card",
    desc: "Visualize trends across cycles — mood averages, phase patterns, and symptom tracking — to better understand your body.",
    gradient: "from-sage-light/30 to-secondary/20",
  },
];

const steps = [
  {
    icon: UserCircle,
    title: "Set your profile",
    desc: "Enter your name to start. No email, no password — just you and your insights, stored securely.",
    color: "text-primary",
    bg: "bg-primary-light",
  },
  {
    icon: Calendar,
    title: "Log your period",
    desc: "Add your cycle start date and duration. Elara learns your unique rhythm with every entry.",
    color: "text-secondary-foreground",
    bg: "bg-secondary/20",
  },
  {
    icon: Smile,
    title: "Check in daily",
    desc: "Tap the feeling that matches your mood, add a note, and receive a thoughtful reply from Elara AI.",
    color: "text-accent",
    bg: "bg-accent-light",
  },
  {
    icon: Sparkles,
    title: "Unlock insights",
    desc: "View predictions, trends, and personalized tips as your data grows. Your body, beautifully understood.",
    color: "text-primary-dark",
    bg: "bg-primary-light",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-lg focus:shadow-lg focus:outline-2 focus:outline-primary"
      >
        Skip to content
      </a>

      {/* ============ HERO ============ */}
      <section
        id="main-content"
        className="relative overflow-hidden min-h-[90vh] flex items-center px-4 pt-20 pb-16 md:pt-28 md:pb-24"
      >
        {/* Layered atmosphere — radial gradients for depth */}
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(70% 45% at 30% 20%, color-mix(in oklch, var(--color-primary) 18%, transparent), transparent),
              radial-gradient(50% 40% at 70% 60%, color-mix(in oklch, var(--color-secondary) 20%, transparent), transparent),
              radial-gradient(40% 35% at 50% 80%, color-mix(in oklch, var(--color-accent) 12%, transparent), transparent)
            `,
          }}
        />

        {/* Floating decorative orbs — animated via transform, not background-position */}
        <div
          className="absolute top-12 left-[8%] w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none"
          style={{ animation: "drift1 14s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-16 right-[10%] w-80 h-80 rounded-full bg-secondary/15 blur-3xl pointer-events-none"
          style={{ animation: "drift2 18s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 left-[60%] w-48 h-48 rounded-full bg-accent/12 blur-3xl pointer-events-none"
          style={{ animation: "drift3 12s ease-in-out infinite" }}
        />

        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124, 77, 188, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 77, 188, 0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Hero content */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Brand icon */}
          <div className="mb-8 inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/20">
              <Moon className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-foreground mb-6 leading-tight">
            Your cycle,
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-dark to-accent bg-clip-text text-transparent">
              intelligently understood
            </span>
          </h1>

          <p className="text-lg md:text-xl text-text-soft max-w-2xl mx-auto mb-10 leading-relaxed">
            Elara AI is a cycle intelligence and wellness platform designed for women.
            Track your period, log your moods, and discover the beautiful patterns
            that make you, you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/home"
              className="btn-primary text-base md:text-lg px-8 py-3.5 group"
            >
              Start your journey
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="btn-secondary text-base md:text-lg px-8 py-3.5"
            >
              Learn more
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          {/* Trust indicator */}
          <p className="mt-10 text-xs text-text-soft/60">
            No account needed · No email required · Your data stays yours
          </p>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section
        id="features"
        className="relative px-4 py-20 md:py-28"
      >
        {/* Subtle top separator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
              Everything you need
            </h2>
            <p className="text-text-soft text-lg max-w-lg mx-auto">
              Elara combines cycle science with AI to give you the insights you deserve.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <article
                  key={i}
                  className="group card !p-0 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${0.1 + i * 0.12}s both`,
                  }}
                >
                  <div className={`p-1.5 bg-gradient-to-br ${f.gradient}`}>
                    <div className="bg-white/80 backdrop-blur-sm rounded-[10px] p-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-heading text-xl text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
                        {f.title}
                      </h3>
                      <p className="text-text-soft leading-relaxed text-sm md:text-base">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="relative px-4 py-20 md:py-28 bg-white border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
              How it works
            </h2>
            <p className="text-text-soft text-lg max-w-lg mx-auto">
              Getting started takes just a minute.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="text-center"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${0.15 + i * 0.1}s both`,
                  }}
                >
                  {/* Step number */}
                  <div className="relative mb-5 inline-flex">
                    <div
                      className={`w-16 h-16 rounded-2xl ${s.bg} flex items-center justify-center mx-auto`}
                    >
                      <Icon className={`w-7 h-7 ${s.color}`} />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-2">{s.title}</h3>
                  <p className="text-text-soft text-sm leading-relaxed max-w-[240px] mx-auto">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-[4.5rem] left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-primary/20 via-secondary/30 to-accent/20 pointer-events-none" />
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative px-4 py-20 md:py-28 overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 50% at 50% 50%, color-mix(in oklch, var(--color-primary) 12%, transparent), transparent)",
          }}
        />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
            Ready to understand your cycle?
          </h2>
          <p className="text-text-soft text-lg mb-8 max-w-lg mx-auto">
            Start tracking today — no account needed, no email required. Just you and your insights.
          </p>
          <Link
            to="/home"
            className="btn-primary text-lg px-10 py-3.5 group"
          >
            Get started free
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative px-4 py-12 border-t border-border bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Moon className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading text-base text-foreground">Elara AI</span>
          </div>
          <p className="text-text-soft text-xs text-center">
            Cycle Intelligence &amp; Wellness Platform · Built with care for every body.
          </p>
          <p className="text-text-soft/50 text-[0.65rem]">© {new Date().getFullYear()} Elara AI</p>
        </div>
      </footer>

      {/* ============ KEYFRAMES ============ */}
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(30px, -25px, 0); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-20px, 30px, 0); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(15px, 15px, 0); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
