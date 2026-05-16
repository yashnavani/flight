"use client";

import { motion } from "framer-motion";
import { HER_FULL_NAME } from "@/radar/constants";

function SmallAirplaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M24 6L32 20h8l-4 4h-6l-2 14h-8L18 24h-6l-4-4h8L24 6z"
        fill="currentColor"
        fillOpacity="0.92"
      />
      <path d="M10 22h28v2H10v-2z" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

type Props = {
  onEnter: () => void;
};

const WELCOME_SESSION_KEY = "flight-radar-welcome-v1";

export { WELCOME_SESSION_KEY };

/** First-open gate: full name, plane glyph, birthday line (no romance), enter CTA. */
export default function PrishaWelcomeScreen({ onEnter }: Props) {
  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-labelledby="welcome-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 px-6 text-center"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_32%_18%,rgba(165,243,252,0.42),transparent_52%),radial-gradient(ellipse_at_72%_82%,rgba(251,191,36,0.2),transparent_48%)]" />
      <div className="relative flex max-w-lg flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <SmallAirplaneIcon className="h-9 w-9 shrink-0 text-cyan-300/90 sm:h-11 sm:w-11" />
            <h1
              id="welcome-title"
              className="text-left text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-5xl"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, #a5f3fc 0%, #f8fafc 42%, #fde68a 88%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              {HER_FULL_NAME}
            </h1>
          </div>
          <p className="max-w-md text-pretty text-[15px] leading-relaxed text-slate-300 sm:text-base">
            Happy birthday, {HER_FULL_NAME} — nineteen May, steady wings, and a wide-open sky.
            Here&apos;s your live traffic picture when you&apos;re ready.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.45 }}
        >
          <button
            type="button"
            onClick={onEnter}
            className="rounded-full border border-cyan-400/45 bg-cyan-500/15 px-6 py-2.5 text-sm font-semibold tracking-wide text-cyan-50 shadow-lg shadow-cyan-500/10 outline-none ring-offset-2 ring-offset-slate-950 transition hover:border-cyan-300/60 hover:bg-cyan-500/25 focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:scale-[0.98]"
          >
            Enter radar
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
