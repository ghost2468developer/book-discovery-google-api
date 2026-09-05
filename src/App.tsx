import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookMarked,
  BookOpen,
  ChevronDown,
  Clock3,
  ExternalLink,
  Feather,
  Flame,
  Landmark,
  Library,
  LoaderCircle,
  MoonStar,
  Palette,
  Quote,
  ScrollText,
  Search,
  Sparkles,
  Star,
  Telescope,
  X,
} from "lucide-react";

type ImageLinks = {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
};

type Volume = {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: ImageLinks;
    language?: string;
    previewLink?: string;
    infoLink?: string;
  };
  accessInfo?: {
    embeddable?: boolean;
    viewability?: string;
    webReaderLink?: string;
  };
};

type SearchField = "all" | "title" | "author" | "isbn";
type SortOrder = "relevance" | "newest";

declare global {
  interface Window {
    google?: {
      books?: {
        load: (options?: { language?: string }) => void;
        setOnLoadCallback: (callback: () => void) => void;
        DefaultViewer: new (element: HTMLElement) => {
          load: (identifier: string, notFound?: (() => void) | null, success?: (() => void) | null) => void;
        };
      };
    };
  }
}

const API_URL = "https://www.googleapis.com/books/v1/volumes";
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;

const HERO_IMAGE =
  "https://images.pexels.com/photos/36734598/pexels-photo-36734598.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=2200";
const HALL_IMAGE =
  "https://images.pexels.com/photos/28436227/pexels-photo-28436227.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400";
const SHELF_TEXTURE =
  "https://images.pexels.com/photos/2952871/pexels-photo-2952871.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=1200";

const FIELD_TABS: { id: SearchField; label: string; hint: string }[] = [
  { id: "all", label: "All stacks", hint: "Titles, authors, subjects" },
  { id: "title", label: "Title", hint: "intitle:" },
  { id: "author", label: "Author", hint: "inauthor:" },
  { id: "isbn", label: "ISBN", hint: "isbn:" },
];

const ROOMS = [
  {
    numeral: "I",
    label: "Fiction Rotunda",
    blurb: "Novels that built other worlds — step under the dome.",
    query: "Literary Fiction",
    icon: Feather,
  },
  {
    numeral: "II",
    label: "Observatory of Science",
    blurb: "Stars, cells, machines and beautiful questions.",
    query: "Science",
    icon: Telescope,
  },
  {
    numeral: "III",
    label: "Gallery of Lives",
    blurb: "Memoirs and biographies, hung like portraits.",
    query: "Biography",
    icon: ScrollText,
  },
  {
    numeral: "IV",
    label: "Salon of Art",
    blurb: "Colour, craft and design in oversized folios.",
    query: "Art Design",
    icon: Palette,
  },
  {
    numeral: "V",
    label: "Vault of History",
    blurb: "Empires, revolutions and quiet centuries.",
    query: "History",
    icon: Landmark,
  },
  {
    numeral: "VI",
    label: "Alcove of Verse",
    blurb: "Low lamps, soft chairs, poems after midnight.",
    query: "Poetry",
    icon: MoonStar,
  },
];

const QUOTES = [
  "“A room without books is like a body without a soul.” — Cicero",
  "“I have always imagined that Paradise will be a kind of library.” — Borges",
  "“Once you learn to read, you will be forever free.” — Frederick Douglass",
  "“Books are a uniquely portable magic.” — Stephen King",
  "“There is no friend as loyal as a book.” — Hemingway",
  "“Reading is to the mind what exercise is to the body.” — Addison",
];

const QUICK_PICKS = ["Piranesi", "Octavia Butler", "Braiding Sweetgrass", "Mary Oliver", "Dune"];

const coverTints = [
  "from-[#12332b] to-[#2a6b57]",
  "from-[#4a1d18] to-[#9a4632]",
  "from-[#17263f] to-[#3c6492]",
  "from-[#5a3a12] to-[#c08a2e]",
  "from-[#2e1c3d] to-[#75519b]",
  "from-[#1d2a12] to-[#5c742f]",
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ---------------- motion presets ---------------- */
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE } },
  exit: { opacity: 0, scale: 0.94, y: 12, transition: { duration: 0.28 } },
};

const letterVariants: Variants = {
  hidden: { y: "118%", rotate: 6, opacity: 0 },
  show: { y: "0%", rotate: 0, opacity: 1, transition: { duration: 0.75, ease: EASE } },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

function getCover(volume: Volume) {
  const links = volume.volumeInfo.imageLinks;
  return links?.large || links?.medium || links?.small || links?.thumbnail || links?.smallThumbnail;
}
function cleanImageUrl(url?: string) {
  return url?.replace(/^http:/, "https:").replace("&zoom=1", "&zoom=3").replace("&edge=curl", "");
}
function stripHtml(value?: string) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
}
function publicationYear(date?: string) {
  return date?.slice(0, 4) || "n.d.";
}

/* ---------------- atmosphere ---------------- */
function Dust({ count = 26 }: { count?: number }) {
  const motes = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${(i * 37.7 + 11) % 100}%`,
        bottom: `${(i * 23.3) % 40}%`,
        size: 3 + ((i * 7) % 5),
        duration: `${7 + ((i * 13) % 9)}s`,
        delay: `${-((i * 1.7) % 9)}s`,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {motes.map((m) => (
        <span
          key={m.id}
          className="dust"
          style={{ left: m.left, bottom: m.bottom, width: m.size, height: m.size, animationDuration: m.duration, animationDelay: m.delay }}
        />
      ))}
    </div>
  );
}

function Embers({ count = 12 }: { count?: number }) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${(i * 53.3 + 7) % 100}%`,
        bottom: `-4%`,
        size: 3 + ((i * 5) % 4),
        duration: `${6 + ((i * 11) % 7)}s`,
        delay: `${-((i * 2.3) % 8)}s`,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {embers.map((e) => (
        <span
          key={e.id}
          className="ember"
          style={{ left: e.left, bottom: e.bottom, width: e.size, height: e.size, animationDuration: e.duration, animationDelay: e.delay }}
        />
      ))}
    </div>
  );
}

function Twinkles({ count = 14 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${(i * 61.7 + 5) % 100}%`,
        top: `${(i * 29.3 + 4) % 55}%`,
        size: 2 + ((i * 3) % 3),
        delay: `${(i * 0.45) % 3}s`,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className="animate-twinkle absolute rounded-full bg-[#ffe9b8]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, boxShadow: "0 0 8px rgba(255,233,184,0.9)" }}
        />
      ))}
    </div>
  );
}

function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden="true">
      <motion.div
        className="hairline flex-1 origin-left"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <motion.span
        className="font-display text-xl text-[#c9a35c]"
        initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        ❦
      </motion.span>
      <motion.div
        className="hairline flex-1 origin-right"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
      />
    </div>
  );
}

function Reveal({ children, delay = 0, y = 30, className = "" }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedLetters({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <motion.span
      className={`inline-flex ${className}`}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: delay } } }}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {text.split("").map((ch, i) => (
        <span key={i} className="mask-line" aria-hidden="true">
          <motion.span variants={letterVariants} className="inline-block will-change-transform">
            {ch === " " ? " " : ch}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 55, damping: 18 });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      unsub();
    };
  }, [spring]);
  return <span className="tabular-nums">{display.toLocaleString()}</span>;
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-[linear-gradient(90deg,#8a6a35,#ecd096,#fff3d0,#ecd096,#8a6a35)]"
      aria-hidden="true"
    />
  );
}

function IntroOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2100);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0a0704] px-6 text-center"
      exit={{ y: "-100%" }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div className="lamp-glow absolute left-1/2 top-0 h-64 w-[120%] -translate-x-1/2" />
      <Dust count={18} />
      <motion.p
        className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#c9a35c]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        The Endless Library presents
      </motion.p>
      <div className="font-display mt-4 text-[clamp(3rem,12vw,6.5rem)] leading-none tracking-wide text-[#f5e9c8]">
        <AnimatedLetters text="ATHENÆUM" delay={0.25} />
      </div>
      <motion.div
        className="hairline mt-7 w-56 origin-center"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
      />
      <motion.p
        className="font-fell mt-5 text-lg italic text-[#f1e6c8]/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        unlocking the great doors…
      </motion.p>
      <motion.div
        className="mt-8 h-10 w-10 rounded-full border border-[#ecd096]/40 border-t-[#ecd096]"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 850);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.85 }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.35, ease: EASE }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-[#ecd096]/50 bg-[#0e0b07]/90 text-[#ecd096] shadow-[0_12px_36px_rgba(0,0,0,0.55)] backdrop-blur transition-colors hover:bg-[#ecd096] hover:text-black"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ---------------- cover ---------------- */
function Cover({ volume, className = "" }: { volume: Volume; className?: string }) {
  const [failed, setFailed] = useState(false);
  const image = cleanImageUrl(getCover(volume));
  const tint = coverTints[volume.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % coverTints.length];
  useEffect(() => setFailed(false), [image]);

  return (
    <div className={`book-spine book-pages group relative overflow-hidden bg-gradient-to-br ${tint} ${className}`}>
      <div className="absolute inset-0 flex flex-col justify-between p-[11%] pl-[20%] text-[#f5e9c8]">
        <span className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#f5e9c8]/60">Athenæum Press</span>
        <span className="font-display line-clamp-5 text-[clamp(0.95rem,2.2vw,1.7rem)] leading-[1.04]">
          {volume.volumeInfo.title}
        </span>
        <span className="border-t border-[#f5e9c8]/30 pt-2 text-[8px] uppercase tracking-[0.2em] text-[#f5e9c8]/70">
          {volume.volumeInfo.authors?.[0] || "Anonymous"}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(105deg,transparent_40%,rgba(255,244,214,0.18)_48%,transparent_60%)]" />
      <div className="sheen" aria-hidden="true" />
      {image && !failed && (
        <motion.img
          src={image}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      )}
    </div>
  );
}

/* ---------------- embedded preview ---------------- */
let viewerScriptPromise: Promise<void> | null = null;
function loadViewerScript() {
  if (window.google?.books) return Promise.resolve();
  if (viewerScriptPromise) return viewerScriptPromise;
  viewerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.google.com/books/jsapi.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Viewer unavailable")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.google.com/books/jsapi.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Viewer unavailable"));
    document.head.appendChild(script);
  });
  return viewerScriptPromise;
}

function EmbeddedPreview({ volume }: { volume: Volume }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadViewerScript()
      .then(() => {
        if (cancelled || !window.google?.books || !viewerRef.current) return;
        window.google.books.load({ language: "en" });
        window.google.books.setOnLoadCallback(() => {
          if (cancelled || !viewerRef.current || !window.google?.books) return;
          viewerRef.current.innerHTML = "";
          const viewer = new window.google.books.DefaultViewer(viewerRef.current);
          viewer.load(
            volume.id,
            () => !cancelled && setStatus("error"),
            () => !cancelled && setStatus("ready")
          );
        });
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [volume.id]);

  return (
    <div className="relative h-full min-h-[440px] w-full overflow-hidden rounded-lg bg-[#14100a]">
      <div className="lamp-glow animate-glow-pulse pointer-events-none absolute -top-10 left-1/2 z-10 h-40 w-[130%] -translate-x-1/2" />
      <AnimatePresence>
        {status === "loading" && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#14100a] text-[#ecd096]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="relative flex h-16 w-16 items-center justify-center"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="h-8 w-8" strokeWidth={1.3} />
              <motion.span
                className="absolute inset-0 rounded-full border border-[#ecd096]/30 border-t-[#ecd096]"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Lighting the lamp…</p>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-1/2 rounded-full bg-[#ecd096]"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#14100a] px-10 text-center text-[#f1e6c8]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              <BookOpen className="mb-5 h-9 w-9 text-[#c9a35c]" strokeWidth={1.4} />
            </motion.div>
            <h3 className="font-display text-3xl">This folio will not open here</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#f1e6c8]/60">
              The publisher keeps this preview behind glass in your region. Try the Google Books reading room instead.
            </p>
            {volume.volumeInfo.previewLink && (
              <a
                href={volume.volumeInfo.previewLink}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex items-center gap-2 border-b border-[#c9a35c] pb-1 text-sm font-semibold text-[#ecd096]"
              >
                Open on Google Books <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        ref={viewerRef}
        className="h-full min-h-[440px] w-full"
        aria-label={`Preview of ${volume.volumeInfo.title}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: status === "ready" ? 1 : 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      />
    </div>
  );
}

/* ---------------- detail folio ---------------- */
function BookDetail({
  volume,
  onClose,
  onAuthor,
  onCategory,
}: {
  volume: Volume;
  onClose: () => void;
  onAuthor: (author: string) => void;
  onCategory: (category: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const description = stripHtml(volume.volumeInfo.description);
  const canPreview = Boolean(volume.accessInfo?.embeddable);
  const externalPreview = volume.volumeInfo.previewLink || volume.accessInfo?.webReaderLink;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`${volume.volumeInfo.title} details`}
    >
      <motion.div
        initial={{ y: 70, opacity: 0, scale: 0.97, rotateX: 7 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
        exit={{ y: 60, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="parchment grain relative mx-auto my-6 w-full max-w-4xl overflow-hidden rounded-xl shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        style={{ transformPerspective: 1200 }}
      >
        <div className="wood relative flex items-center justify-between gap-4 px-5 py-4 text-[#f1e6c8] sm:px-8">
          <motion.div
            className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          >
            <motion.span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ecd096]/50 bg-black/30"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Library className="h-4 w-4 text-[#ecd096]" />
            </motion.span>
            <span className="hidden sm:inline">Athenæum · Retrieval slip</span>
            <span className="sm:hidden">Retrieval slip</span>
          </motion.div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {showPreview && (
                <motion.button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ecd096]/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition hover:bg-[#ecd096] hover:text-black"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Folio
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              onClick={onClose}
              aria-label="Close"
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ecd096]/40 transition hover:bg-[#ecd096] hover:text-black"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
          <Dust count={8} />
        </div>

        <AnimatePresence mode="wait">
          {showPreview ? (
            <motion.div
              key="preview"
              className="bg-[#0e0b07] p-4 sm:p-7"
              initial={{ opacity: 0, x: 42 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[#f1e6c8]">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a35c]">
                  <Flame className="animate-flicker h-4 w-4" /> Reading by lamplight
                </p>
                <p className="font-fell text-sm italic text-[#f1e6c8]/60">turn pages slowly — the binding is old</p>
              </div>
              <EmbeddedPreview volume={volume} />
            </motion.div>
          ) : (
            <motion.div
              key="folio"
              className="grid gap-0 md:grid-cols-[300px_1fr]"
              initial={{ opacity: 0, x: -26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 26 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div className="wood-dark relative flex flex-col items-center gap-6 p-7 text-[#f1e6c8] sm:p-8">
                <motion.div
                  className="w-full max-w-[220px] perspective-1000"
                  initial={{ rotateY: -24, opacity: 0, x: -22 }}
                  animate={{ rotateY: 0, opacity: 1, x: 0 }}
                  transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                >
                  <motion.div
                    animate={{ y: [0, -9, 0] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Cover volume={volume} className="gold-frame aspect-[2/3] w-full -rotate-2 rounded-[4px]" />
                  </motion.div>
                  <div className="shelf-plank mt-4 w-[112%] -translate-x-[5%]" />
                </motion.div>
                <motion.div
                  className="w-full rounded-md border border-dashed border-[#c9a35c]/50 bg-[#f1e6c8] p-4 text-[#241b0e]"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
                >
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a2e1f]">
                    <Clock3 className="h-3.5 w-3.5" /> Due-date slip
                  </p>
                  <div className="font-fell mt-3 grid grid-cols-2 gap-2 text-sm">
                    <span className="border-b border-[#241b0e]/20 pb-1">
                      Published
                      <br />
                      <strong>{volume.volumeInfo.publishedDate || "Unknown"}</strong>
                    </span>
                    <span className="border-b border-[#241b0e]/20 pb-1">
                      Pages
                      <br />
                      <strong>{volume.volumeInfo.pageCount || "—"}</strong>
                    </span>
                    <span className="col-span-2 pt-1 text-[13px] italic opacity-70">
                      {volume.volumeInfo.publisher || "Private press"} · {volume.volumeInfo.language?.toUpperCase() || "EN"}
                    </span>
                  </div>
                  {volume.volumeInfo.averageRating && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
                      <Star className="h-4 w-4 fill-[#9a6a1c] text-[#9a6a1c]" />
                      {volume.volumeInfo.averageRating.toFixed(1)}
                      <span className="font-normal opacity-60">· {volume.volumeInfo.ratingsCount || 0} readers</span>
                    </p>
                  )}
                </motion.div>
                <p className="font-fell text-center text-[13px] italic leading-5 text-[#f1e6c8]/55">
                  “Handle with clean hands.
                  <br />
                  Return with a full heart.”
                </p>
              </div>

              <motion.div
                className="relative p-7 sm:p-10"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.p variants={fadeUpVariants} className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7a2e1f]">
                  {volume.volumeInfo.categories?.[0] || "General stacks"}
                </motion.p>
                <motion.h2
                  variants={fadeUpVariants}
                  className="font-display mt-3 text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.95] tracking-tight text-[#1d1408]"
                >
                  {volume.volumeInfo.title}
                </motion.h2>
                {volume.volumeInfo.subtitle && (
                  <motion.p variants={fadeUpVariants} className="font-fell mt-3 text-lg italic text-[#5a4a2e]">
                    {volume.volumeInfo.subtitle}
                  </motion.p>
                )}
                <motion.div variants={fadeUpVariants} className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-[#3d2f1a]">
                  <span className="font-fell italic opacity-70">by</span>
                  {volume.volumeInfo.authors?.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onAuthor(a)}
                      className="font-display border-b border-[#7a2e1f]/40 text-lg font-semibold transition-colors hover:border-[#7a2e1f] hover:text-[#7a2e1f]"
                    >
                      {a}
                    </button>
                  )) || <span>Unknown hand</span>}
                </motion.div>

                <motion.div variants={fadeUpVariants}>
                  <Ornament className="my-7" />
                </motion.div>

                <motion.h3 variants={fadeUpVariants} className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7a2e1f]">
                  From the catalogue
                </motion.h3>
                <motion.p variants={fadeUpVariants} className="font-fell mt-4 max-w-xl text-[1.05rem] leading-8 text-[#2e2311]">
                  {description || "No catalogue entry survives for this edition — all the more reason to open it."}
                </motion.p>

                {volume.volumeInfo.categories && (
                  <motion.div variants={fadeUpVariants} className="mt-6 flex flex-wrap gap-2">
                    {volume.volumeInfo.categories.slice(0, 4).map((c, i) => (
                      <motion.button
                        key={c}
                        type="button"
                        onClick={() => onCategory(c)}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.55 + i * 0.08, duration: 0.4, ease: EASE }}
                        whileHover={{ scale: 1.06, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-full border border-[#7a2e1f]/30 bg-[#7a2e1f]/5 px-4 py-1.5 text-xs font-semibold text-[#7a2e1f] transition-colors hover:bg-[#7a2e1f] hover:text-[#f4ead0]"
                      >
                        {c}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                <motion.div variants={fadeUpVariants} className="mt-9 flex flex-col gap-3 sm:flex-row">
                  {canPreview && (
                    <motion.button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1d1408] px-7 text-sm font-semibold text-[#f4ead0] shadow-lg transition-colors hover:bg-[#7a2e1f]"
                    >
                      <BookOpen className="h-4 w-4 text-[#ecd096]" /> Open the preview
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </motion.button>
                  )}
                  {externalPreview && (
                    <motion.a
                      href={externalPreview}
                      target="_blank"
                      rel="noreferrer"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#1d1408]/30 px-7 text-sm font-semibold text-[#1d1408] transition-colors hover:border-[#1d1408] hover:bg-[#1d1408] hover:text-[#f4ead0]"
                    >
                      Google Books <ExternalLink className="h-4 w-4" />
                    </motion.a>
                  )}
                </motion.div>

                <motion.div
                  className="pointer-events-none absolute right-6 top-6 hidden sm:flex"
                  aria-hidden="true"
                  initial={{ scale: 2.6, opacity: 0, rotate: -32 }}
                  animate={{ scale: 1, opacity: 1, rotate: 12 }}
                  transition={{ type: "spring", stiffness: 210, damping: 13, delay: 0.65 }}
                >
                  <span className="font-display flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#b0513a,#7a2e1f_60%,#4d1a10)] text-2xl text-[#f4ead0] shadow-[0_8px_20px_rgba(77,26,16,0.5)] ring-4 ring-[#7a2e1f]/20">
                    Æ
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- shelf tile ---------------- */
function BookTile({
  volume,
  onSelect,
  onAuthor,
}: {
  volume: Volume;
  onSelect: () => void;
  onAuthor: (a: string) => void;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 220, damping: 18 });

  const handleMove = (e: unknown) => {
    if (reduce) return;
    const evt = e as { clientX: number; clientY: number; currentTarget: HTMLDivElement };
    const rect = evt.currentTarget.getBoundingClientRect();
    mx.set((evt.clientX - rect.left) / rect.width);
    my.set((evt.clientY - rect.top) / rect.height);
  };
  const handleLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  const author = volume.volumeInfo.authors?.[0];
  return (
    <motion.article variants={tileVariants} exit="exit" layout className="group min-w-0">
      <button type="button" onClick={onSelect} className="block w-full text-left" aria-label={`Open ${volume.volumeInfo.title}`}>
        <div className="perspective-1000 relative px-3 pt-2" onMouseMove={handleMove} onMouseLeave={handleLeave}>
          <motion.div
            className="lamp-glow pointer-events-none absolute -top-6 left-1/2 h-16 w-[120%] -translate-x-1/2 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden="true"
          />
          <motion.div style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }} className="preserve-3d">
            <motion.div whileHover={reduce ? undefined : { y: -10, rotate: -1 }} transition={{ duration: 0.45, ease: EASE }}>
              <Cover
                volume={volume}
                className="relative aspect-[2/3] w-full rounded-[3px] shadow-[0_18px_40px_rgba(0,0,0,0.55)] ring-1 ring-[#ecd096]/20 transition-shadow duration-500 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.65)]"
              />
            </motion.div>
          </motion.div>
          <div className="shelf-plank mt-3" />
          <motion.div
            className="absolute inset-x-6 bottom-8 flex items-center justify-center"
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: 10 }}
          >
            <span className="flex items-center gap-1.5 rounded-full bg-[#0e0b07]/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ecd096] opacity-0 ring-1 ring-[#ecd096]/40 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <BookMarked className="h-3 w-3" /> Retrieve
            </span>
          </motion.div>
        </div>
        <h3 className="font-display mt-4 line-clamp-2 px-1 text-[1.25rem] leading-[1.12] text-[#f1e6c8] transition-colors group-hover:text-[#ecd096] group-hover:underline group-hover:decoration-[#c9a35c]/60 group-hover:underline-offset-4">
          {volume.volumeInfo.title}
        </h3>
      </button>
      <div className="mt-1.5 flex items-start justify-between gap-2 px-1 text-xs leading-5 text-[#f1e6c8]/55">
        {author ? (
          <button
            type="button"
            onClick={() => onAuthor(author)}
            className="truncate text-left transition-colors hover:text-[#ecd096] hover:underline"
          >
            {volume.volumeInfo.authors?.join(", ")}
          </button>
        ) : (
          <span className="font-fell italic">Unknown hand</span>
        )}
        <span className="shrink-0 tabular-nums">{publicationYear(volume.volumeInfo.publishedDate)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 px-1">
        {volume.accessInfo?.embeddable ? (
          <motion.span
            className="inline-flex items-center gap-1 rounded-full bg-[#2e4a38]/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#bfe3c8] ring-1 ring-[#7fa88d]/40"
            animate={reduce ? undefined : { boxShadow: ["0 0 0 rgba(127,168,141,0)", "0 0 14px rgba(127,168,141,0.45)", "0 0 0 rgba(127,168,141,0)"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-3 w-3" /> Preview
          </motion.span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f1e6c8]/40 ring-1 ring-white/10">
            No preview
          </span>
        )}
        {volume.volumeInfo.averageRating && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ecd096]">
            <Star className="h-3 w-3 fill-current" /> {volume.volumeInfo.averageRating.toFixed(1)}
          </span>
        )}
      </div>
    </motion.article>
  );
}

/* ---------------- app ---------------- */
export default function App() {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<SearchField>("all");
  const [activeQuery, setActiveQuery] = useState("subject:fiction");
  const [activeLabel, setActiveLabel] = useState("The Fiction Rotunda");
  const [activeCategory, setActiveCategory] = useState("Literary Fiction");
  const [sort, setSort] = useState<SortOrder>("relevance");
  const [books, setBooks] = useState<Volume[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Volume | null>(null);
  const [clock, setClock] = useState("");
  const [intro, setIntro] = useState(true);
  const resultsRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef as never, offset: ["start start", "end start"] });
  const heroBgY = useTransform(heroProgress, [0, 1], ["0%", "22%"]);
  const heroBgScale = useTransform(heroProgress, [0, 1], [1, 1.16]);
  const heroContentY = useTransform(heroProgress, [0, 1], [0, 90]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.75], [1, 0]);

  useEffect(() => {
    if (reduceMotion) setIntro(false);
  }, [reduceMotion]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchBooks = async (searchQuery: string, startIndex = 0, append = false, signal?: AbortSignal) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        printType: "books",
        maxResults: "20",
        startIndex: String(startIndex),
        orderBy: sort,
        projection: "full",
      });
      if (API_KEY) params.set("key", API_KEY);
      const response = await fetch(`${API_URL}?${params.toString()}`, { signal });
      if (!response.ok) throw new Error(`Google Books returned ${response.status}`);
      const data = (await response.json()) as { items?: Volume[]; totalItems?: number };
      const next = data.items || [];
      setBooks((cur) => (append ? [...cur, ...next] : next));
      setTotalItems(data.totalItems || 0);
      if (!append && next.length === 0) setError("The shelves are bare on this subject. Try a broader title, author, or topic.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("The library hatch is stuck — we could not reach the stacks. Check your connection and try again.");
      if (!append) setBooks([]);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchBooks(activeQuery, 0, false, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery, sort]);

  const moveToResults = () => {
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  };

  const runSearch = (apiQuery: string, label: string, category = "") => {
    setActiveLabel(label);
    setActiveCategory(category);
    setActiveQuery(apiQuery);
    setSelected(null);
    moveToResults();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const prefix: Record<SearchField, string> = { all: "", title: "intitle:", author: "inauthor:", isbn: "isbn:" };
    const apiQuery = field === "all" ? trimmed : `${prefix[field]}"${trimmed}"`;
    const label = field === "author" ? `Books by ${trimmed}` : field === "title" ? `“${trimmed}”` : trimmed;
    runSearch(apiQuery, label);
  };

  const searchAuthor = (author: string) => {
    setQuery(author);
    setField("author");
    runSearch(`inauthor:"${author}"`, `Books by ${author}`);
  };
  const searchCategory = (category: string) => runSearch(`subject:"${category}"`, category, category);

  const featured = useMemo(() => books.find((b) => b.accessInfo?.embeddable) || books[0] || null, [books]);

  return (
    <div className="relative min-h-screen bg-[#0e0b07] text-[#f1e6c8]">
      <ScrollProgress />
      <AnimatePresence>{intro && !reduceMotion && <IntroOverlay onDone={() => setIntro(false)} />}</AnimatePresence>
      <BackToTop />

      <motion.div
        className="wood relative z-20 flex items-center justify-center gap-3 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f1e6c8]/90"
        initial={{ y: -36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: reduceMotion ? 0 : 2, ease: EASE }}
      >
        <span className="hidden sm:inline">Est. MCMXCII · The Endless Library</span>
        <motion.span
          className="h-1 w-1 rounded-full bg-[#ecd096]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span>Open stacks till midnight</span>
        <motion.span
          className="h-1 w-1 rounded-full bg-[#ecd096]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
        <span className="tabular-nums text-[#ecd096]">{clock}</span>
      </motion.div>

      {/* HERO */}
      <section ref={heroRef} className="grain relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={
            reduceMotion
              ? { backgroundImage: `url(${HERO_IMAGE})` }
              : { backgroundImage: `url(${HERO_IMAGE})`, y: heroBgY, scale: heroBgScale }
          }
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease: EASE }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,3,0.72),rgba(10,7,3,0.55)_35%,rgba(10,7,3,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,5,2,0.88)_0%,rgba(8,5,2,0.5)_55%,rgba(8,5,2,0.25)_100%)]" />
        <div className="vignette absolute inset-0" />
        <Dust />
        <Embers count={10} />
        <Twinkles />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden justify-center gap-24 md:flex" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center"
              style={{ transformOrigin: "top center" }}
              animate={reduceMotion ? undefined : { rotate: [-2.4, 2.4, -2.4] }}
              transition={{ duration: 5 + i * 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="h-16 w-px bg-[#c9a35c]/50" />
              <div className="lamp-glow animate-flicker h-20 w-40 rounded-full" style={{ animationDelay: `${i * 0.7}s` }} />
              <motion.div
                className="-mt-12 h-8 w-14 rounded-t-full border border-[#ecd096]/60 bg-[#2e4a38]/80 shadow-[0_0_30px_rgba(255,196,110,0.45)]"
                animate={reduceMotion ? undefined : { opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 3.4 + i * 0.5, repeat: Infinity }}
              />
            </motion.div>
          ))}
        </div>

        <motion.header
          className="relative z-20 mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: reduceMotion ? 0.1 : 2.15, ease: EASE }}
        >
          <a href="#top" className="group flex items-center gap-3" aria-label="Athenæum home">
            <motion.span
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ecd096]/60 bg-black/50 shadow-[0_0_24px_rgba(201,163,92,0.35)]"
              whileHover={{ rotate: 12, scale: 1.08 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Library className="h-5 w-5 text-[#ecd096]" />
            </motion.span>
            <span className="leading-none">
              <span className="font-display block text-[1.45rem] tracking-wide">ATHENÆUM</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.32em] text-[#c9a35c]">The Endless Library</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f1e6c8]/75 lg:flex" aria-label="Primary">
            {[
              ["Reading rooms", "#rooms"],
              ["The stacks", "#stacks"],
              ["Visit", "#visit"],
            ].map(([label, href]) => (
              <motion.a key={href} href={href} className="relative transition hover:text-[#ecd096]" whileHover={{ y: -2 }} transition={{ duration: 0.25 }}>
                {label}
                <motion.span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-[#ecd096] transition-transform duration-300 hover:scale-x-100" />
              </motion.a>
            ))}
          </nav>
          <motion.a
            href="#catalogue"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group inline-flex items-center gap-2 rounded-full border border-[#ecd096]/50 bg-black/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ecd096] backdrop-blur transition-colors hover:bg-[#ecd096] hover:text-black"
          >
            <BookMarked className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-12" /> Reader's card
          </motion.a>
        </motion.header>

        <motion.div
          id="top"
          style={reduceMotion ? undefined : { y: heroContentY, opacity: heroContentOpacity }}
          className="relative z-10 mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[1.25fr_0.85fr] lg:items-end lg:px-12 lg:pb-24"
        >
          <div>
            <motion.p
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ecd096]/30 bg-black/45 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#ecd096] backdrop-blur"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: reduceMotion ? 0.1 : 2.25, ease: EASE }}
            >
              <motion.span animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.25, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
                <Sparkles className="h-3.5 w-3.5" />
              </motion.span>
              Hall I — The Grand Stacks
            </motion.p>
            <h1 className="font-display text-[clamp(3.4rem,9vw,7.8rem)] leading-[0.88] tracking-tight">
              <AnimatedLetters text="Every book" delay={reduceMotion ? 0 : 2.3} />
              <br />
              <span className="inline-flex items-baseline gap-4">
                <AnimatedLetters text="is" delay={reduceMotion ? 0 : 2.55} />
                <em className="font-fell gold-shimmer pr-2 font-normal italic">
                  <AnimatedLetters text="a door." delay={reduceMotion ? 0 : 2.65} />
                </em>
              </span>
            </h1>
            <motion.p
              className="font-fell mt-6 max-w-xl text-xl italic leading-8 text-[#f1e6c8]/80"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: reduceMotion ? 0.2 : 2.9, ease: EASE }}
            >
              Push one open. Search millions of volumes, follow an author down a dark aisle, or let the librarian choose for you.
            </motion.p>

            <motion.form
              id="catalogue"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: reduceMotion ? 0.3 : 3.05, ease: EASE }}
              className="wood grain relative mt-9 max-w-2xl scroll-mt-28 rounded-xl p-2 shadow-[0_30px_80px_rgba(0,0,0,0.6)] ring-1 ring-[#ecd096]/25 transition-transform duration-300 focus-within:scale-[1.012]"
            >
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                {FIELD_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setField(t.id)}
                    className="relative rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition"
                    aria-pressed={field === t.id}
                  >
                    {field === t.id && (
                      <motion.span
                        layoutId="field-pill"
                        className="absolute inset-0 rounded-full bg-[#ecd096] shadow"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className={`relative z-10 transition-colors ${field === t.id ? "text-black" : "text-[#f1e6c8]/70 hover:text-[#ecd096]"}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="parchment flex flex-col gap-2 rounded-lg p-2 sm:flex-row sm:items-center">
                <label className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3">
                  <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
                    <Search className="h-5 w-5 shrink-0 text-[#7a2e1f]" />
                  </motion.span>
                  <span className="sr-only">Search the catalogue (press / to focus)</span>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="search"
                    placeholder={
                      field === "author" ? "Try “Le Guin, Butler, Borges…”" : field === "isbn" ? "Try “9780143127741…”" : "Title, author, ISBN, or subject…  ( / )"
                    }
                    className="w-full bg-transparent text-[15px] font-medium text-[#241b0e] outline-none placeholder:text-[#8a7a55]"
                  />
                </label>
                <motion.button
                  type="submit"
                  disabled={!query.trim()}
                  whileHover={query.trim() ? { scale: 1.03 } : undefined}
                  whileTap={query.trim() ? { scale: 0.96 } : undefined}
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#1d1408] px-7 text-xs font-bold uppercase tracking-[0.18em] text-[#f4ead0] transition-colors hover:bg-[#7a2e1f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Consult
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </motion.button>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-2.5 text-xs">
                <span className="font-fell italic text-[#f1e6c8]/60">The librarian suggests —</span>
                {QUICK_PICKS.map((p, i) => (
                  <motion.button
                    key={p}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (reduceMotion ? 0 : 3.2) + i * 0.07, duration: 0.45, ease: EASE }}
                    whileHover={{ scale: 1.07, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setQuery(p);
                      setField("all");
                      runSearch(p, p);
                    }}
                    className="rounded-full border border-[#ecd096]/25 px-3 py-1 text-[#ecd096]/90 transition-colors hover:border-[#ecd096] hover:bg-[#ecd096]/10"
                  >
                    {p}
                  </motion.button>
                ))}
              </div>
            </motion.form>

            <motion.div
              className="mt-8 flex flex-wrap gap-8 text-sm"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {[
                ["2M+", "volumes indexed"],
                ["VI", "reading rooms"],
                ["∞", "dust motes"],
              ].map(([n, l]) => (
                <motion.div key={l} variants={fadeUpVariants} className="flex items-baseline gap-2">
                  <motion.span
                    className="font-display gold-text text-3xl"
                    animate={reduceMotion ? undefined : { textShadow: ["0 0 0 rgba(236,208,150,0)", "0 0 22px rgba(236,208,150,0.45)", "0 0 0 rgba(236,208,150,0)"] }}
                    transition={{ duration: 3.4, repeat: Infinity }}
                  >
                    {n}
                  </motion.span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f1e6c8]/55">{l}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 50, rotate: 1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 1, delay: reduceMotion ? 0.4 : 3.2, ease: EASE }}
            className="relative hidden lg:block"
            aria-label="Librarian's pick"
          >
            <div className="lamp-glow animate-glow-pulse absolute -top-16 left-1/2 h-44 w-[120%] -translate-x-1/2" />
            <motion.div
              className="relative rounded-2xl border border-[#ecd096]/25 bg-black/55 p-6 backdrop-blur-md"
              animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ecd096]">
                <Flame className="animate-flicker h-4 w-4" /> Now on the lectern
              </p>
              <AnimatePresence mode="wait">
                {featured ? (
                  <motion.button
                    key={featured.id}
                    type="button"
                    onClick={() => setSelected(featured)}
                    className="group mt-5 flex w-full gap-5 text-left"
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -22 }}
                    transition={{ duration: 0.55, ease: EASE }}
                    whileHover={{ scale: 1.015 }}
                  >
                    <motion.div whileHover={{ rotate: 0, scale: 1.05 }} className="shrink-0">
                      <Cover volume={featured} className="gold-frame aspect-[2/3] w-32 -rotate-2 rounded-[4px] transition-transform duration-500 group-hover:rotate-0" />
                    </motion.div>
                    <span>
                      <span className="font-display block text-2xl leading-tight text-[#f5e9c8] transition-colors group-hover:text-[#ecd096]">
                        {featured.volumeInfo.title}
                      </span>
                      <span className="font-fell mt-2 block text-sm italic text-[#f1e6c8]/65">
                        {featured.volumeInfo.authors?.join(", ") || "Unknown hand"} · {publicationYear(featured.volumeInfo.publishedDate)}
                      </span>
                      <span className="mt-3 line-clamp-3 block text-[13px] leading-6 text-[#f1e6c8]/60">
                        {stripHtml(featured.volumeInfo.description) || "A curious volume, freshly returned to the desk."}
                      </span>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ecd096]">
                        Open the folio
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </motion.button>
                ) : (
                  <motion.p
                    key="empty"
                    className="font-fell mt-5 italic text-[#f1e6c8]/60"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    Dusting the lectern…
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="hairline my-5" />
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-[#f1e6c8]/50">
                <span>{loading ? "Searching…" : <><AnimatedCount value={totalItems} /> matches</>}</span>
                <motion.a href="#stacks" className="inline-flex items-center gap-1 text-[#ecd096] hover:underline" whileHover={{ y: 2 }}>
                  Browse <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>↓</motion.span>
                </motion.a>
              </div>
            </motion.div>
            <div className="wood mx-8 h-5 rounded-b-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />
            <div className="mx-auto h-16 w-10 bg-gradient-to-b from-[#3c2413] to-[#140d05]" />
          </motion.aside>
        </motion.div>

        <motion.a
          href="#rooms"
          className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#ecd096]/70 transition-colors hover:text-[#ecd096] md:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0.5 : 3.6, duration: 0.8 }}
          aria-label="Scroll to reading rooms"
        >
          Descend
          <span className="flex h-11 w-7 items-start justify-center rounded-full border border-[#ecd096]/40 p-1.5">
            <motion.span className="h-2.5 w-2.5 rounded-full bg-[#ecd096]" animate={{ y: [0, 14, 0], opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
          </span>
        </motion.a>
      </section>

      {/* marquee */}
      <div className="marquee-hover marquee-mask relative overflow-hidden border-y border-[#c9a35c]/25 bg-[#120d06] py-3.5" aria-hidden="true">
        <div className="animate-marquee flex w-max gap-12 whitespace-nowrap pr-12">
          {[...QUOTES, ...QUOTES].map((q, i) => (
            <motion.span
              key={i}
              className="font-fell text-[15px] italic text-[#ecd096]/75"
              whileHover={{ scale: 1.06, color: "#fff3d0" }}
            >
              {q} <span className="mx-6 inline-block text-[#c9a35c]">❦</span>
            </motion.span>
          ))}
        </div>
      </div>

      {/* READING ROOMS */}
      <section id="rooms" className="grain relative scroll-mt-10 overflow-hidden bg-[#0e0b07] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          initial={{ scale: 1.12 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE }}
        >
          <img src={HALL_IMAGE} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e0b07] via-transparent to-[#0e0b07]" />
        </motion.div>
        <div className="relative mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <p className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c9a35c]">
                <motion.span className="h-px w-10 bg-[#c9a35c]/60" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} />
                Choose a reading room
              </p>
              <h2 className="font-display max-w-2xl text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                <AnimatedLetters text="Six doors," delay={0.1} />
                <br />
                <em className="font-fell gold-text font-normal">six moods of quiet.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="font-fell max-w-sm text-lg italic leading-7 text-[#f1e6c8]/60">
                Each room keeps its own shelves. Enter one and the stacks rearrange themselves around you.
              </p>
            </Reveal>
          </div>

          <motion.div
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            {ROOMS.map((room) => {
              const Icon = room.icon;
              const isActive = activeCategory === room.query;
              return (
                <motion.button
                  key={room.label}
                  type="button"
                  onClick={() => searchCategory(room.query)}
                  variants={tileVariants}
                  whileHover={{ y: -10, scale: 1.018 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  aria-pressed={isActive}
                  className={`arch group relative overflow-hidden border px-6 pb-7 pt-10 text-center ${
                    isActive
                      ? "border-[#ecd096] bg-[linear-gradient(180deg,rgba(236,208,150,0.16),rgba(20,14,7,0.9))] shadow-[0_0_50px_rgba(201,163,92,0.25)]"
                      : "border-[#c9a35c]/25 bg-[linear-gradient(180deg,rgba(30,22,12,0.92),rgba(12,8,4,0.94))] hover:border-[#ecd096]/70 hover:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  <motion.div
                    className="lamp-glow absolute -top-8 left-1/2 h-28 w-[130%] -translate-x-1/2"
                    animate={isActive ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.6 }}
                    transition={isActive ? { duration: 2.4, repeat: Infinity } : { duration: 0.4 }}
                  />
                  {isActive && (
                    <motion.span
                      layoutId="room-halo"
                      className="absolute inset-0 rounded-[inherit] ring-1 ring-[#ecd096]/60"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <motion.span
                    className="font-display relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#ecd096]/40 bg-black/50"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <Icon className="h-6 w-6 text-[#ecd096] transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
                    {isActive && (
                      <motion.span
                        className="absolute inset-0 rounded-full border border-[#ecd096]/60"
                        animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                    )}
                  </motion.span>
                  <span className="font-display mt-5 block text-sm tracking-[0.3em] text-[#c9a35c]">· {room.numeral} ·</span>
                  <span className="font-display mt-2 block text-[1.7rem] leading-tight">{room.label}</span>
                  <span className="font-fell mt-2 block text-[15px] italic leading-6 text-[#f1e6c8]/60">{room.blurb}</span>
                  <span
                    className={`mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                      isActive ? "bg-[#ecd096] text-black" : "border border-[#ecd096]/30 text-[#ecd096] group-hover:bg-[#ecd096] group-hover:text-black"
                    }`}
                  >
                    {isActive ? "You are here" : "Enter room"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* STACKS */}
      <section ref={resultsRef} id="stacks" className="wood-dark grain relative scroll-mt-6 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <img src={SHELF_TEXTURE} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-[#0e0b07]/72" />
        </div>
        <div className="relative mx-auto max-w-[1440px]">
          <Reveal>
            <div className="flex flex-col justify-between gap-6 border-b border-[#ecd096]/20 pb-7 lg:flex-row lg:items-end">
              <div>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c9a35c]">
                  <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Quote className="h-3.5 w-3.5" />
                  </motion.span>
                  {loading ? (
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
                      The runner is in the stacks…
                    </motion.span>
                  ) : (
                    <span>
                      <AnimatedCount value={totalItems} /> volumes retrieved
                    </span>
                  )}
                </p>
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={activeLabel}
                    className="font-display max-w-3xl text-4xl leading-[0.95] tracking-tight sm:text-6xl"
                    initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                    transition={{ duration: 0.55, ease: EASE }}
                  >
                    {activeLabel}
                  </motion.h2>
                </AnimatePresence>
                <p className="font-fell mt-3 text-lg italic text-[#f1e6c8]/55">
                  {activeCategory ? `Shelf mark: ${activeCategory}` : "Pulled fresh from the catalogue"} · click a spine to open it
                </p>
              </div>
              <motion.label
                className="relative flex w-fit items-center gap-3 rounded-full border border-[#ecd096]/25 bg-black/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <span className="text-[#f1e6c8]/50">Order</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOrder)}
                  className="appearance-none bg-transparent pr-6 text-[#ecd096] outline-none"
                >
                  <option value="relevance" className="text-black">
                    Most relevant
                  </option>
                  <option value="newest" className="text-black">
                    Newest first
                  </option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-[#ecd096]" />
              </motion.label>
            </div>
          </Reveal>

          {loading ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 pt-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="px-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                >
                  <div className="skeleton aspect-[2/3] rounded-[3px] ring-1 ring-white/10" />
                  <div className="shelf-plank mt-3 opacity-60" />
                  <div className="skeleton mx-1 mt-4 h-4 w-4/5 rounded" />
                  <div className="skeleton mx-1 mt-2 h-3 w-3/5 rounded" />
                </motion.div>
              ))}
            </div>
          ) : error ? (
            <motion.div
              className="flex min-h-80 flex-col items-center justify-center py-16 text-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <motion.span
                className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ecd096]/30 bg-black/40"
                animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <BookOpen className="h-7 w-7 text-[#ecd096]" strokeWidth={1.4} />
              </motion.span>
              <h3 className="font-display mt-6 text-4xl">A quiet shelf</h3>
              <p className="font-fell mt-3 max-w-md text-lg italic text-[#f1e6c8]/60">{error}</p>
              <motion.button
                type="button"
                onClick={() => fetchBooks(activeQuery)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-8 rounded-full bg-[#ecd096] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white"
              >
                Send the runner again
              </motion.button>
            </motion.div>
          ) : (
            <>
              <motion.div
                key={`${activeQuery}-${sort}`}
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="grid grid-cols-2 gap-x-6 gap-y-12 pt-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              >
                <AnimatePresence mode="popLayout">
                  {books.map((book) => (
                    <BookTile key={book.id} volume={book} onSelect={() => setSelected(book)} onAuthor={searchAuthor} />
                  ))}
                </AnimatePresence>
              </motion.div>
              {books.length < totalItems && books.length > 0 && (
                <motion.div
                  className="mt-16 flex flex-col items-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <motion.button
                    type="button"
                    onClick={() => fetchBooks(activeQuery, books.length, true)}
                    disabled={loadingMore}
                    whileHover={loadingMore ? undefined : { scale: 1.04, y: -2 }}
                    whileTap={loadingMore ? undefined : { scale: 0.96 }}
                    className="group inline-flex min-h-13 items-center gap-3 rounded-full border border-[#ecd096]/40 bg-black/40 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-[#ecd096] backdrop-blur transition-colors hover:bg-[#ecd096] hover:text-black disabled:opacity-50"
                  >
                    {loadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />}
                    {loadingMore ? "Fetching the next cart…" : "Wheel in the next cart"}
                  </motion.button>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#f1e6c8]/40">
                    Showing {books.length} of {totalItems.toLocaleString()}
                  </p>
                  <div className="h-1 w-52 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-[#ecd096]"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.min(100, (books.length / Math.max(totalItems, 1)) * 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: EASE }}
                    />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      {/* VISIT / FOOTER */}
      <footer id="visit" className="grain relative scroll-mt-10 border-t border-[#c9a35c]/25 bg-[#0a0704] px-5 pb-10 pt-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <Reveal>
              <div className="flex items-center gap-3">
                <motion.span
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ecd096]/50 bg-black/60"
                  whileHover={{ rotate: 14, scale: 1.08 }}
                >
                  <Library className="h-5 w-5 text-[#ecd096]" />
                </motion.span>
                <div>
                  <p className="font-display text-3xl leading-none">ATHENÆUM</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#c9a35c]">Silence, please</p>
                </div>
              </div>
              <p className="font-fell mt-6 max-w-md text-lg italic leading-7 text-[#f1e6c8]/60">
                A small endless library for the incurably curious. Come for one book; leave at midnight with six.
              </p>
              <motion.form
                onSubmit={handleSubmit}
                className="mt-7 flex max-w-md overflow-hidden rounded-full border border-[#ecd096]/25 bg-white/5 p-1.5 backdrop-blur transition-all duration-300 focus-within:scale-[1.02] focus-within:border-[#ecd096]/60"
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Whisper a title…"
                  aria-label="Quick search"
                  className="w-full bg-transparent px-4 text-sm outline-none placeholder:text-[#f1e6c8]/35"
                />
                <motion.button
                  type="submit"
                  aria-label="Search"
                  whileHover={{ scale: 1.1, rotate: -8 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ecd096] text-black transition-colors hover:bg-white"
                >
                  <Search className="h-4 w-4" />
                </motion.button>
              </motion.form>
            </Reveal>
            <Reveal delay={0.12}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c9a35c]">Opening hours</h3>
              <ul className="mt-5 space-y-3 text-sm text-[#f1e6c8]/70">
                {[
                  ["Mon — Thu", "9:00 — 23:00"],
                  ["Friday", "9:00 — midnight"],
                  ["Saturday", "10:00 — midnight"],
                  ["Sunday", "12:00 — 22:00"],
                ].map(([d, h], i) => (
                  <motion.li
                    key={d}
                    className="flex items-center justify-between gap-6 border-b border-white/8 pb-3"
                    initial={{ opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                    whileHover={{ x: 4 }}
                  >
                    <span>{d}</span>
                    <span className="tabular-nums text-[#ecd096]">{h}</span>
                  </motion.li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.2}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c9a35c]">Colophon</h3>
              <p className="mt-5 text-sm leading-6 text-[#f1e6c8]/60">
                Catalogue & previews by Google Books. Type set in Cormorant Garamond & IM Fell English. Bound in code, candlelight and dust.
              </p>
              <motion.p
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#ecd096]/25 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ecd096]/80"
                animate={{ boxShadow: ["0 0 0 rgba(236,208,150,0)", "0 0 18px rgba(236,208,150,0.25)", "0 0 0 rgba(236,208,150,0)"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Clock3 className="h-3.5 w-3.5" /> {clock} · lamps still lit
              </motion.p>
            </Reveal>
          </div>
          <Ornament className="my-10 opacity-70" />
          <motion.div
            className="flex flex-col items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f1e6c8]/40 sm:flex-row"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span>© MMXXVI The Athenæum Library</span>
            <motion.span className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
              <motion.span animate={{ rotate: [0, 12, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <Feather className="h-3.5 w-3.5" />
              </motion.span>
              Designed for curious readers
            </motion.span>
          </motion.div>
        </div>
      </footer>

      <AnimatePresence>
        {selected && (
          <BookDetail key={selected.id} volume={selected} onClose={() => setSelected(null)} onAuthor={searchAuthor} onCategory={searchCategory} />
        )}
      </AnimatePresence>
    </div>
  );
}
