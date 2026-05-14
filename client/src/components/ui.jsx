import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  FileText,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { fadeUp } from "./animations";

export function Button({
  children,
  className = "",
  variant = "primary",
  as: Component = "button",
  ...props
}) {
  const variants = {
    primary:
      "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700",
    secondary:
      "bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50",
    ghost: "text-slate-700 hover:bg-slate-100",
    success:
      "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700",
  };

  return (
    <Component
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}

export function Section({ eyebrow, title, description, children, className = "", ...props }) {
  return (
    <section
      className={["px-4 py-16 sm:px-6 lg:px-8", className].join(" ")}
      {...props}
    >
      <div className="mx-auto max-w-7xl">
        {(eyebrow || title || description) && (
          <motion.div
            {...fadeUp}
            className="mx-auto mb-10 max-w-3xl text-center"
          >
            {eyebrow && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-base leading-7 text-slate-600">
                {description}
              </p>
            )}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  );
}

export function StatusBadge({ children, tone = "indigo", icon: Icon = Sparkles }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        tones[tone],
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function LoadingState({ title = "Processing...", description }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-800">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-indigo-700">{description}</p>}
      </div>
    </div>
  );
}

export function ChatBubble({ sender, children, timestamp }) {
  const isUser = sender === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[86%] rounded-3xl px-4 py-3 text-sm shadow-sm sm:max-w-[72%]",
          isUser
            ? "rounded-br-md bg-indigo-600 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-900",
        ].join(" ")}
      >
        {children}
        {timestamp && (
          <div
            className={[
              "mt-2 text-[10px]",
              isUser ? "text-indigo-100" : "text-slate-400",
            ].join(" ")}
          >
            {timestamp}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function AppShell({ children, showFooter = true }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] text-slate-950">
      <Navbar />
      {children}
      {showFooter && <Footer />}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navItems = [
    { label: "Home", to: "/" },
    { label: "Features", to: "/#features" },
    { label: "Upload", to: "/upload" },
    { label: "Chat", to: "/chat" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-4 text-slate-950">
              Visa AI
            </p>
            <p className="text-xs text-slate-500">Assistant</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Button as={Link} to="/chat" className="hidden md:inline-flex">
          Start Application
        </Button>

        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white p-2 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            <Button as={Link} to="/chat" onClick={() => setOpen(false)}>
              Start Application
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/75 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <FileText className="h-4 w-4 text-indigo-600" />
          AI-Based Visa Form Assistant
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-indigo-600">GitHub</a>
          <a href="#" className="hover:text-indigo-600">Demo</a>
          <Link to="/chat" className="hover:text-indigo-600">Start</Link>
        </div>
      </div>
    </footer>
  );
}

export function SuccessMark({ className = "" }) {
  return (
    <div
      className={[
        "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600",
        className,
      ].join(" ")}
    >
      <CheckCircle2 className="h-9 w-9" />
    </div>
  );
}
