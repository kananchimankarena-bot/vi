import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Stable random data generated once at module load ────────────────────────

const STARS = Array.from({ length: 115 }, (_, i) => ({
  id: i,
  x: ((i * 137.508 + 43) % 97) + 1.5,
  y: ((i * 97.3 + 17) % 95) + 2,
  size: 0.4 + (i % 7) * 0.28,
  dur: (1.5 + (i % 9) * 0.28).toFixed(2),
  del: ((i * 0.37) % 5).toFixed(2),
}));

// Heart stars: positioned at final heart coordinates, animated in from random offsets
const HEART_STARS = Array.from({ length: 26 }, (_, i) => {
  const t = (i / 26) * Math.PI * 2;
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  // Final position in px within 390×844 canvas
  const ex = (50 + hx * 2.3) / 100 * 390;
  const ey = (38 + hy * 2.3) / 100 * 844;
  // Random scatter start position
  const sx = (((i * 83.1 + 11) % 88) + 6) / 100 * 390;
  const sy = (((i * 61.7 + 29) % 85) + 7) / 100 * 844;
  return {
    id: i,
    ex,
    ey,
    // Motion offset from final position to start position
    dx: sx - ex,
    dy: sy - ey,
    size: 1.8 + (i % 5) * 0.5,
    delay: (i % 8) * 0.09,
  };
});

const LETTER = [
  { s: "salutation", t: "Dear Vi," },
  { s: "body", t: "Somewhere along the way, I stopped seeing someone who looked like Vi... and started seeing my Vi." },
  { s: "list", t: "Your short hair.\nThose glasses.\nThe way you act dumb just to make me laugh.\nYour random \"Mai kya karu?\"\nYour terrible jokes that somehow become funny because they're yours." },
  { s: "body", t: "I also love the little things you've done without realizing how much they meant to me." },
  { s: "body", t: "You started cursing less because you knew I didn't like it." },
  { s: "body", t: "You started using cute stickers because I love them." },
  { s: "body", t: "I'm honestly trying to ignore the fact that you're becoming much better at sending cute stickers than me... and somehow even cuter than me." },
  { s: "aside", t: "I don't think that's fair. 😂" },
  { s: "em", t: "And my favorite..." },
  { s: "highlight", t: "Hearing you call me \"Dear.\"" },
  { s: "body", t: "Those moments probably don't seem important to anyone else, but they've become some of my favorite parts of the day." },
  { s: "em", t: "More than anything..." },
  { s: "body", t: "I love the way you make me feel." },
  { s: "list", t: "I don't have to pretend.\nI don't have to be someone else." },
  { s: "body", t: "I can simply be me when I'm with you." },
  { s: "closing", t: "And that's probably the biggest reason I fell for you." },
];

const CHAPTERS = [
  {
    num: "Chapter One",
    title: "The First Time",
    body: "The first time I noticed you...",
    sub: "...the world got a little quieter.",
  },
  {
    num: "Chapter Two",
    title: "The First Conversation",
    body: "Somehow one conversation became hours...",
    sub: "...and somehow...\n\nhours never felt enough.",
  },
  {
    num: "Chapter Three",
    title: "The Little Moments",
    body: "Somewhere between your bad jokes,\nyour 'Mai kya karu?',\nand the way you called me 'Dear',\n\nyou quietly became\nmy favourite notification.",
  },
];

const BUILDUP = [
  { t: "I'm ready", big: false },
  { t: "to be", big: false },
  { t: "your Caitlyn.", big: true },
  { t: "Will you...", big: false },
  { t: "be my Vi?", big: true },
];

const FLOAT_HEARTS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: ((i * 53.1 + 7) % 88) + 6,
  del: ((i * 0.28) % 3).toFixed(2),
  dur: (4 + (i % 7) * 0.45).toFixed(2),
  size: 12 + (i % 9) * 2.5,
}));

const CONFETTI = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: ((i * 71.3 + 13) % 96) + 2,
  del: ((i * 0.19) % 2.5).toFixed(2),
  dur: (4 + (i % 6) * 0.5).toFixed(2),
  color: ["#B57EDC", "#E9D5FF", "#9B5FC7", "#F0E6FF", "#D8B4FE", "#7B3FA7"][i % 6],
  w: 4 + (i % 8),
  h: 2 + (i % 4),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "landing" | "constellation" | "stories" | "letter" | "buildup" | "proposal" | "ending";

const MOON_GLOW: Record<Screen, number> = {
  landing: 0.28,
  constellation: 0.48,
  stories: 0.58,
  letter: 0.72,
  buildup: 0.86,
  proposal: 0.93,
  ending: 1.0,
};

// ─── Design primitives ────────────────────────────────────────────────────────

function Glass({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl ${className}`}
      style={{
        background: "rgba(23, 17, 38, 0.74)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(181, 126, 220, 0.17)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(181,126,220,0.09), inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled = false,
  full = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden py-4 rounded-2xl font-medium text-white transition-all duration-500 ${full ? "w-full" : "px-9"}`}
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "0.93rem",
        letterSpacing: "0.04em",
        background: disabled
          ? "rgba(181,126,220,0.18)"
          : "linear-gradient(135deg, #B57EDC 0%, #9660CC 100%)",
        boxShadow: disabled
          ? "none"
          : "0 0 28px rgba(181,126,220,0.42), 0 4px 18px rgba(0,0,0,0.35)",
        opacity: disabled ? 0.45 : 1,
        transform: disabled ? "none" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({
  children,
  onClick,
  full = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-4 rounded-2xl transition-all duration-300 ${full ? "w-full" : "px-9"}`}
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "0.88rem",
        background: "rgba(181,126,220,0.07)",
        border: "1px solid rgba(181,126,220,0.2)",
        color: "rgba(233,213,255,0.55)",
      }}
    >
      {children}
    </button>
  );
}

function Appear({
  children,
  delay = 0,
  className = "",
  y = 16,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Screen: Landing ──────────────────────────────────────────────────────────

function Landing({
  nameInput,
  isVi,
  onChange,
  onContinue,
}: {
  nameInput: string;
  isVi: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-12">
      <Appear delay={0.15}>
        <h1
          className="text-center"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2.8rem, 6vw, 5rem)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#ffffff",
            lineHeight: 1.28,
            textShadow: isVi
              ? "0 0 80px rgba(181,126,220,0.35)"
              : "0 0 40px rgba(181,126,220,0.12)",
            transition: "text-shadow 1.5s ease",
          }}
        >
          This little universe
          <br />
          was made
          <br />
          for one person.
        </h1>
      </Appear>

      <Appear delay={0.5} className="flex flex-col items-center gap-5 w-full max-w-md">
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.82rem",
            color: "#E9D5FF",
            opacity: 0.65,
            fontWeight: 300,
            letterSpacing: "0.06em",
          }}
        >
          What do I call you?
        </p>

        <input
          type="text"
          value={nameInput}
          onChange={onChange}
          placeholder="Your name..."
          className="w-full text-center text-white outline-none transition-all duration-700"
          style={{
            background: isVi
              ? "rgba(181,126,220,0.1)"
              : "rgba(181,126,220,0.06)",
            border: `1px solid ${isVi ? "rgba(181,126,220,0.55)" : "rgba(181,126,220,0.2)"}`,
            borderRadius: "20px",
            padding: "15px 24px",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.5rem",
            fontWeight: 400,
            color: "#fff",
            boxShadow: isVi
              ? "0 0 32px rgba(181,126,220,0.18), inset 0 0 20px rgba(181,126,220,0.06)"
              : "none",
          }}
        />

        <AnimatePresence>
          {isVi && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.7rem",
                color: "#B57EDC",
                letterSpacing: "0.07em",
                fontWeight: 400,
              }}
            >
              ✨ The stars seem happier tonight.
            </motion.p>
          )}
        </AnimatePresence>

        <PrimaryBtn onClick={onContinue} disabled={!isVi}>
          {isVi ? "✨ Welcome, Vi" : "Continue"}
        </PrimaryBtn>
      </Appear>
    </div>
  );
}

// ─── Screen: Constellation ────────────────────────────────────────────────────

function Constellation({
  phase,
  onContinue,
}: {
  phase: number;
  onContinue: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Heart stars — positioned at heart coords, fly in from random scatter */}
      <div className="absolute inset-0 pointer-events-none">
        {HEART_STARS.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full"
            initial={{ x: s.dx, y: s.dy, opacity: 0, scale: 0 }}
            animate={
              phase >= 1
                ? { x: 0, y: 0, opacity: 1, scale: 1 }
                : { x: s.dx, y: s.dy, opacity: 0, scale: 0 }
            }
            transition={{
              duration: 1.7,
              delay: s.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              left: s.ex - s.size / 2,
              top: s.ey - s.size / 2,
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: "#B57EDC",
              boxShadow: `0 0 ${s.size * 3}px #B57EDC, 0 0 ${s.size * 7}px rgba(181,126,220,0.35)`,
            }}
          />
        ))}

        {/* Connecting lines between heart points */}
        {phase >= 1 && (
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.18 }}>
            <polyline
              points={HEART_STARS.map((s) => `${s.ex},${s.ey}`).join(" ")}
              fill="none"
              stroke="#B57EDC"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Text at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-6 px-8 pb-20">
        <AnimatePresence mode="wait">
          {phase === 2 && (
            <motion.p
              key="t1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.8 }}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.65rem",
                fontStyle: "italic",
                color: "#E9D5FF",
                fontWeight: 300,
                textAlign: "center",
              }}
            >
              Every star has a story...
            </motion.p>
          )}
          {phase >= 3 && (
            <motion.div
              key="t2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-7"
            >
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.65rem",
                  fontStyle: "italic",
                  color: "#E9D5FF",
                  fontWeight: 300,
                  textAlign: "center",
                }}
              >
                Here's ours.
              </p>
              <PrimaryBtn onClick={onContinue}>Begin our story ✨</PrimaryBtn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Screen: Stories ──────────────────────────────────────────────────────────

function Stories({
  chIdx,
  setChIdx,
  onContinue,
}: {
  chIdx: number;
  setChIdx: (i: number) => void;
  onContinue: () => void;
}) {
  const ch = CHAPTERS[chIdx];
  const touchX = useRef<number | null>(null);
  const mouseX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 42) {
      if (dx > 0 && chIdx < 2) setChIdx(chIdx + 1);
      if (dx < 0 && chIdx > 0) setChIdx(chIdx - 1);
    }
    touchX.current = null;
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseX.current = e.clientX;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseX.current === null) return;
    const dx = mouseX.current - e.clientX;
    if (Math.abs(dx) > 42) {
      if (dx > 0 && chIdx < 2) setChIdx(chIdx + 1);
      if (dx < 0 && chIdx > 0) setChIdx(chIdx - 1);
    }
    mouseX.current = null;
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-7 select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={chIdx}
          initial={{ opacity: 0, x: 55 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -55 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl"
        >
          <Glass className="p-10 w-full">
            <div className="flex flex-col gap-6">
              <p
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.24em",
                  color: "#B57EDC",
                  fontWeight: 500,
                  textTransform: "uppercase",
                }}
              >
                {ch.num}
              </p>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(2rem, 4vw, 2.8rem)",
                  fontWeight: 400,
                  color: "#ffffff",
                  lineHeight: 1.15,
                }}
              >
                {ch.title}
              </h2>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(1.15rem, 2vw, 1.5rem)",
                  fontStyle: "italic",
                  color: "#E9D5FF",
                  lineHeight: 1.9,
                  whiteSpace: "pre-line",
                  fontWeight: 300,
                }}
              >
                {ch.body}
              </p>
              {ch.sub && (
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
                    fontStyle: "italic",
                    color: "rgba(233,213,255,0.52)",
                    lineHeight: 1.85,
                    whiteSpace: "pre-line",
                  }}
                >
                  {ch.sub}
                </p>
              )}
            </div>
          </Glass>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-2 items-center">
        {CHAPTERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setChIdx(i)}
            className="rounded-full transition-all duration-400"
            style={{
              width: i === chIdx ? "22px" : "6px",
              height: "6px",
              background:
                i === chIdx ? "#B57EDC" : "rgba(181,126,220,0.25)",
            }}
          />
        ))}
      </div>

      {chIdx === 0 && (
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.58rem",
            color: "rgba(181,126,220,0.42)",
            letterSpacing: "0.12em",
            marginTop: "-8px",
          }}
        >
          swipe to read on ›
        </p>
      )}

      {chIdx === 2 && (
        <Appear delay={0.15}>
          <PrimaryBtn onClick={onContinue}>The Little Things →</PrimaryBtn>
        </Appear>
      )}
    </div>
  );
}

// ─── Screen: Letter ───────────────────────────────────────────────────────────

const PARA_STYLE: Record<string, React.CSSProperties> = {
  salutation: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "clamp(1.55rem, 3vw, 2.1rem)",
    fontStyle: "italic",
    fontWeight: 400,
    color: "#E9D5FF",
    marginBottom: "6px",
    lineHeight: 1.4,
  },
  body: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: "clamp(0.9rem, 1.2vw, 1.05rem)",
    fontWeight: 300,
    color: "rgba(233,213,255,0.88)",
    lineHeight: 1.85,
    whiteSpace: "pre-line" as const,
  },
  list: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.83rem",
    fontWeight: 300,
    color: "rgba(233,213,255,0.72)",
    lineHeight: 1.9,
    whiteSpace: "pre-line" as const,
    paddingLeft: "4px",
  },
  em: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "1.1rem",
    fontStyle: "italic",
    fontWeight: 300,
    color: "#E9D5FF",
    lineHeight: 1.6,
  },
  highlight: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "1.25rem",
    fontStyle: "italic",
    fontWeight: 400,
    color: "#B57EDC",
    lineHeight: 1.5,
    textShadow: "0 0 20px rgba(181,126,220,0.25)",
  },
  aside: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.82rem",
    fontWeight: 300,
    fontStyle: "italic" as const,
    color: "rgba(233,213,255,0.62)",
    lineHeight: 1.85,
  },
  closing: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "1.12rem",
    fontStyle: "italic",
    fontWeight: 300,
    color: "#E9D5FF",
    lineHeight: 1.7,
  },
};

function Letter({
  revealed,
  onTap,
  onContinue,
}: {
  revealed: number;
  onTap: () => void;
  onContinue: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isComplete = revealed >= LETTER.length - 1;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [revealed]);

  return (
    <div
      className="absolute inset-0 flex flex-col"
      onClick={!isComplete ? onTap : undefined}
      style={{ cursor: isComplete ? "default" : "pointer" }}
    >
      <div className="px-6 pt-12 pb-3 flex-shrink-0">
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.58rem",
            letterSpacing: "0.26em",
            color: "#B57EDC",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          A Letter
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col items-center"
        style={{ scrollbarWidth: "none" }}
      >
        <Glass className="p-9 w-full max-w-xl">
          <div className="flex flex-col gap-4">
            {LETTER.slice(0, revealed + 1).map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.95, ease: "easeOut" }}
                style={PARA_STYLE[p.s] ?? PARA_STYLE.body}
              >
                {p.t}
              </motion.p>
            ))}

            {!isComplete && (
              <motion.div
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="flex gap-1 mt-1"
              >
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    className="w-1 h-1 rounded-full"
                    style={{ background: "#B57EDC" }}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </Glass>
      </div>

      {!isComplete && (
        <div className="px-6 pb-6 flex-shrink-0 flex justify-center">
          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.58rem",
              color: "rgba(181,126,220,0.38)",
              letterSpacing: "0.1em",
            }}
          >
            tap anywhere to continue reading
          </p>
        </div>
      )}

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-6 pb-12 flex-shrink-0 flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <PrimaryBtn onClick={onContinue}>Continue →</PrimaryBtn>
        </motion.div>
      )}
    </div>
  );
}

// ─── Screen: Buildup ──────────────────────────────────────────────────────────

function Buildup({ lines, onContinue }: { lines: number; onContinue: () => void }) {
  const showBtn = lines >= BUILDUP.length;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-5">
      {BUILDUP.slice(0, lines).map((l, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 22, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: l.big ? "clamp(2.8rem, 6vw, 4.5rem)" : "clamp(2rem, 4vw, 3rem)",
            fontWeight: l.big ? 400 : 300,
            fontStyle: "italic",
            color: i === 4 ? "#B57EDC" : "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            textShadow:
              i === 4
                ? "0 0 50px rgba(181,126,220,0.55)"
                : "0 0 20px rgba(255,255,255,0.05)",
          }}
        >
          {l.t}
        </motion.p>
      ))}

      {showBtn && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <PrimaryBtn onClick={onContinue}>Tell her →</PrimaryBtn>
        </motion.div>
      )}
    </div>
  );
}

// ─── Screen: Proposal ─────────────────────────────────────────────────────────

function Proposal({
  answer,
  onAnswer,
}: {
  answer: string | null;
  onAnswer: (a: string) => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-7 gap-11">
      <Appear delay={0.2}>
        <h1
          className="text-center"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(3rem, 6vw, 5rem)",
            fontWeight: 400,
            color: "#ffffff",
            lineHeight: 1.2,
            textShadow: "0 0 60px rgba(181,126,220,0.28)",
          }}
        >
          Will you be
          <br />
          <span style={{ color: "#B57EDC", fontStyle: "italic" }}>
            my girlfriend?
          </span>
        </h1>
      </Appear>

      <Appear delay={0.55} className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => onAnswer("yes")}
          className="w-full py-5 rounded-3xl text-white font-medium transition-all duration-300"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "1.05rem",
            letterSpacing: "0.04em",
            background:
              answer === "yes"
                ? "linear-gradient(135deg, #9B5FC7, #7A3DB0)"
                : "linear-gradient(135deg, #B57EDC 0%, #9660CC 100%)",
            boxShadow:
              "0 0 40px rgba(181,126,220,0.48), 0 8px 24px rgba(0,0,0,0.35)",
            transform: answer === "yes" ? "scale(0.97)" : "scale(1)",
          }}
        >
          💜 Yes
        </button>

        <GhostBtn onClick={() => onAnswer("time")} full>
          🌙 I need some time
        </GhostBtn>
      </Appear>

      <AnimatePresence>
        {answer === "time" && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: "1.07rem",
              color: "rgba(233,213,255,0.52)",
              lineHeight: 1.75,
            }}
          >
            That's okay.
            <br />
            I'll be here,
            <br />
            like a star that doesn't move.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Screen: Ending ───────────────────────────────────────────────────────────

function Ending() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-7 gap-8"
    >
      {/* Floating hearts */}
      {FLOAT_HEARTS.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${h.x}%`,
            bottom: "-50px",
            fontSize: `${h.size}px`,
            animation: `floatUp ${h.dur}s ease-out ${h.del}s infinite`,
          }}
        >
          💜
        </div>
      ))}

      {/* Confetti */}
      {CONFETTI.map((c) => (
        <div
          key={c.id}
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: `${c.x}%`,
            top: "-12px",
            width: `${c.w}px`,
            height: `${c.h}px`,
            background: c.color,
            animation: `confettiFall ${c.dur}s linear ${c.del}s infinite`,
            opacity: 0.85,
          }}
        />
      ))}

      {/* Content */}
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.4rem, 3vw, 2rem)",
          fontStyle: "italic",
          color: "#E9D5FF",
          textAlign: "center",
          fontWeight: 300,
          zIndex: 10,
        }}
      >
        Thank you for entering my universe.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.9 }}
        style={{ zIndex: 10, width: "100%", maxWidth: "520px" }}
      >
        <Glass className="p-10">
          <p
            className="text-center"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(1.25rem, 2.5vw, 1.7rem)",
              fontStyle: "italic",
              color: "#E9D5FF",
              lineHeight: 1.95,
              fontWeight: 300,
            }}
          >
            No matter where life takes us...
            <br />
            you'll always be
            <br />
            <span
              style={{
                color: "#B57EDC",
                fontSize: "clamp(1.5rem, 2.8vw, 2.1rem)",
                fontWeight: 400,
                textShadow: "0 0 30px rgba(181,126,220,0.45)",
              }}
            >
              the brightest star
            </span>
            <br />
            in my universe.
          </p>
        </Glass>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.3 }}
        style={{ fontSize: "2.2rem", zIndex: 10 }}
      >
        💜✨🌙
      </motion.div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [nameInput, setNameInput] = useState("");
  const [isVi, setIsVi] = useState(false);
  const [chIdx, setChIdx] = useState(0);
  const [letterRevealed, setLetterRevealed] = useState(0);
  const [buildupLines, setBuildupLines] = useState(0);
  const [proposalAnswer, setProposalAnswer] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [conPhase, setConPhase] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  audioRef.current = new Audio("/music/love.mp3");
  audioRef.current.loop = true;
  audioRef.current.volume = 0.35;

  return () => {
    audioRef.current?.pause();
  };
}, []);

const startMusic = () => {
  if (!audioRef.current) return;

  audioRef.current.play().catch(() => {});
};
  const moonGlow =
    screen === "landing" && isVi ? 0.5 : MOON_GLOW[screen] ?? 0.28;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNameInput(v);
    setIsVi(v.toLowerCase() === "vi");
  };

  const addRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(
      () => setRipples((prev) => prev.filter((r) => r.id !== id)),
      750
    );
  }, []);

  const go = (s: Screen) => {
  startMusic();
  setScreen(s);
};

  // Constellation phases
  useEffect(() => {
    if (screen !== "constellation") {
      setConPhase(0);
      return;
    }
    const t1 = setTimeout(() => setConPhase(1), 250);
    const t2 = setTimeout(() => setConPhase(2), 2200);
    const t3 = setTimeout(() => setConPhase(3), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [screen]);

  // Buildup auto-reveal
  useEffect(() => {
    if (screen !== "buildup") {
      setBuildupLines(0);
      return;
    }
    const delays = [600, 1550, 2500, 4100, 5350];
    const timers = delays.map((d, i) =>
      setTimeout(() => setBuildupLines(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [screen]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "#090611" }}
      onClick={(e) => addRipple(e)}
    >
        {/* Ambient background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 70% 8%, rgba(181,126,220,${moonGlow * 0.11}) 0%, transparent 60%)`,
            transition: "background 2.5s ease",
          }}
        />

        {/* Starfield */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {STARS.map((s) => (
            <div
              key={s.id}
              className="absolute rounded-full"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                background:
                  isVi || screen !== "landing"
                    ? `rgba(181,126,${180 + (s.id % 5) * 15},${0.45 + (s.id % 7) * 0.08})`
                    : `rgba(255,255,${230 + (s.id % 4) * 6},${0.3 + (s.id % 7) * 0.09})`,
                animation: `twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
                boxShadow:
                  isVi || screen !== "landing"
                    ? `0 0 ${s.size * 4}px rgba(181,126,220,0.55)`
                    : `0 0 ${s.size}px rgba(255,255,255,0.35)`,
                transition: "background 1.8s ease, box-shadow 1.8s ease",
              }}
            />
          ))}
        </div>

        {/* Moon */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px",
            right: "-50px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 36% 36%, #f8f0ff 0%, #d4aaf2 38%, #B57EDC 100%)",
            boxShadow: [
              `0 0 ${80 + moonGlow * 160}px ${50 + moonGlow * 100}px rgba(181,126,220,${0.14 + moonGlow * 0.27})`,
              `0 0 ${300 + moonGlow * 150}px ${100 + moonGlow * 130}px rgba(181,126,220,${0.04 + moonGlow * 0.13})`,
            ].join(", "),
            opacity: 0.8 + moonGlow * 0.2,
            transition: "box-shadow 2.2s ease, opacity 2.2s ease",
          }}
        />

        {/* Ripple effects */}
        {ripples.map((r) => (
          <div
            key={r.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: r.x - 18,
              top: r.y - 18,
              width: 36,
              height: 36,
              border: "1px solid rgba(181,126,220,0.35)",
              animation: "ripple 0.75s ease-out forwards",
            }}
          />
        ))}

        {/* Screen router */}
        <AnimatePresence mode="wait">
          {screen === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <Landing
                nameInput={nameInput}
                isVi={isVi}
                onChange={handleNameChange}
                onContinue={() => {
                startMusic();
                go("constellation");
}}
              />
            </motion.div>
          )}

          {screen === "constellation" && (
            <motion.div
              key="constellation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <Constellation
                phase={conPhase}
                onContinue={() => go("stories")}
              />
            </motion.div>
          )}

          {screen === "stories" && (
            <motion.div
              key="stories"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <Stories
                chIdx={chIdx}
                setChIdx={setChIdx}
                onContinue={() => go("letter")}
              />
            </motion.div>
          )}

          {screen === "letter" && (
            <motion.div
              key="letter"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <Letter
                revealed={letterRevealed}
                onTap={() =>
                  setLetterRevealed((n) =>
                    Math.min(n + 1, LETTER.length - 1)
                  )
                }
                onContinue={() => go("buildup")}
              />
            </motion.div>
          )}

          {screen === "buildup" && (
            <motion.div
              key="buildup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0"
            >
              <Buildup
                lines={buildupLines}
                onContinue={() => go("proposal")}
              />
            </motion.div>
          )}

          {screen === "proposal" && (
            <motion.div
              key="proposal"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <Proposal
                answer={proposalAnswer}
                onAnswer={(a) => {
                  setProposalAnswer(a);
                  if (a === "yes") setTimeout(() => go("ending"), 900);
                }}
              />
            </motion.div>
          )}

          {screen === "ending" && <Ending key="ending" />}
        </AnimatePresence>

        {/* Global CSS animations */}
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(0.85); }
            50%       { opacity: 1;   transform: scale(1.6);  }
          }
          @keyframes ripple {
            0%   { transform: scale(1); opacity: 0.65; }
            100% { transform: scale(6); opacity: 0;    }
          }
          @keyframes floatUp {
            0%   { transform: translateY(0)      rotate(-8deg);  opacity: 0.9; }
            100% { transform: translateY(-110vh) rotate(14deg);  opacity: 0;   }
          }
          @keyframes confettiFall {
            0%   { transform: translateY(-15px)  rotate(0deg);   opacity: 0.9; }
            100% { transform: translateY(110vh)  rotate(740deg); opacity: 0;   }
          }
          input::placeholder { color: rgba(181,126,220,0.3); }
          ::-webkit-scrollbar { display: none; }
        `}</style>
    </div>
  );
}
