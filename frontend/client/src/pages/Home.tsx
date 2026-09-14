// Design direction: playful digital maximalism — midnight navy, electric cyan, cobalt, coral, citrus, oversized display type, layered objects, and tactile controls.
import { trpc } from "@/lib/trpc";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Github,
  Globe,
  HandHeart,
  HeartPulse,
  Home as HomeIcon,
  Shield,
  Image as ImageIcon,
  Instagram,
  Layers,
  Linkedin,
  Info,
  Mail,
  Menu,
  Music2,
  Phone,
  HelpCircle,
  Plane,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

const sirenTrack = "/audio/siren-ambience.m4a";
const codeCortexLogo = "/codecortex-3.0.svg";
// The registration/team/admin app — a separate app (src/App.tsx), not part of this site.
const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || "http://localhost:5173";
const polyfabLogo = "/polyfab-logo.png";
const tamWhiteLogo = "/tam-white-logo.png";
const tamMascot = "/tam-mascot.glb";

const navItems = [
  { label: "Home", href: "#home", icon: HomeIcon },
  { label: "About", href: "#about", icon: Info },
  { label: "Tracks", href: "#tracks", icon: Layers },
  { label: "Nominate", href: "#nominate", icon: Music2 },
  { label: "Gallery", href: "#gallery", icon: ImageIcon },
  { label: "Sponsors", href: "#sponsors", icon: HandHeart },
  { label: "FAQs", href: "#faqs", icon: HelpCircle },
  { label: "Contact", href: "#contact", icon: Mail },
];

// dataset: link to the track's dataset (hosted on Google Drive — large files,
// not committed to this repo). "file" links are converted to Drive's direct
// -download form; "folder" links can only open Drive's folder view (Drive has
// no single-URL way to force-download a whole folder), so those are labeled
// differently. undefined dataset = not published yet.
type Dataset = { url: string; kind: "file" | "folder" } | "pick-your-own" | undefined;

function driveFileDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

const tracks = [
  {
    name: "Finance",
    sponsor: "Open track",
    eyebrow: "Track 01",
    description:
      "Design a calmer, clearer future for money. Turn complex financial moments into tools people can actually understand and trust.",
    brief:
      "The finance industry generates vast amounts of structured and unstructured data every day — from transaction records and market trends to customer behaviour and financial documents. Build AI/ML solutions that address challenges in the financial sector. Projects may focus on areas such as fraud detection, forecasting, customer analytics, risk assessment, document understanding, or any other finance-related application.\n\nDataset — The provided dataset is a ZIP archive containing multiple forms of finance-related data, including structured numerical data, documents, images, time-series data, and other relevant files. Participants are encouraged to explore the dataset, identify a problem of their choice, and develop an AI/ML solution using one or more of the provided data types.",
    color: "cyan",
    icon: Database,
    glyph: "₹",
    dataset: {
      url: driveFileDownloadUrl("1xQLIojKL6i61hGeb5GBFGYyqmocijlOM"),
      kind: "file",
    } as Dataset,
  },
  {
    name: "Medicine & Healthcare",
    sponsor: "Open track",
    eyebrow: "Track 02",
    description:
      "Build for better care. Reimagine the tools, systems, and small human moments that make health support more accessible and useful.",
    brief:
      "Healthcare systems generate enormous volumes of medical data ranging from diagnostic images and patient records to physiological signals and laboratory reports. Develop AI/ML solutions that improve healthcare through intelligent analysis of medical data. Projects may focus on disease detection, diagnosis support, medical imaging, patient monitoring, healthcare analytics, or any other healthcare application.\n\nDataset — The provided dataset is a ZIP archive containing various healthcare-related data formats such as medical images, clinical records, physiological signals, text reports, and structured datasets. Teams are free to utilize any combination of the available data to build an AI/ML solution of their choice.",
    color: "coral",
    icon: HeartPulse,
    glyph: "+",
    dataset: {
      url: "https://drive.google.com/drive/folders/1Ae1XNCUQvK5qYsUOa6Vd8LJsgGtxWmEV",
      kind: "folder",
    } as Dataset,
  },
  {
    name: "Drone Tech & Aviation",
    sponsor: "Open track",
    eyebrow: "Track 03",
    description:
      "Take the idea airborne. Explore navigation, autonomy, logistics, safety, and the next generation of movement through the sky.",
    brief:
      "Today's drones and aviation systems rely on AI for autonomous navigation, surveillance, mapping, object detection, predictive maintenance, and airspace management. As more aerial imagery, flight telemetry, and sensor data are available, AI is vital for safety and efficiency. Develop AI/ML solutions for drone technology and aviation in the areas of autonomous systems, aerial analytics, surveillance, navigation, predictive maintenance, and flight intelligence.\n\nDataset — The provided dataset is a ZIP archive containing multiple aviation-related data types such as aerial images, videos, telemetry logs, sensor readings, maps, and structured datasets. Participants may use any portion of the dataset to develop an AI/ML project relevant to the domain.",
    color: "lime",
    icon: Plane,
    glyph: "✈",
    dataset: {
      url: driveFileDownloadUrl("1HwdMYH2x74hpUCEmy-RhBbpNKUfnddeX"),
      kind: "file",
    } as Dataset,
  },
  {
    name: "Security",
    sponsor: "Open track",
    eyebrow: "Track 04",
    description:
      "Make the digital world harder to break and easier to trust. Build tools that protect people, systems, and the ideas inside them.",
    brief:
      "Security today extends beyond physical systems into cybersecurity, surveillance, identity verification, anomaly detection, and threat intelligence. Build AI/ML solutions that enhance security across physical and digital environments. Projects may focus on surveillance, cybersecurity, anomaly detection, threat analysis, identity verification, or other security applications.\n\nDataset — The dataset provided is a ZIP archive of security-related data, including images, videos, network logs, structured data, documents, and sensor data. Teams are encouraged to use the dataset and develop any AI/ML solution that addresses a security challenge.",
    color: "blue",
    icon: ShieldCheck,
    glyph: "///",
    dataset: {
      url: "https://drive.google.com/drive/folders/10NtZCAx14aOyayinlQaFUS68WBnQpCXj",
      kind: "folder",
    } as Dataset,
  },
  {
    name: "Open Innovation",
    sponsor: "Open track",
    eyebrow: "Track 05",
    description:
      "No box, no brief, no ceiling. Bring the strange idea, the stubborn problem, or the tiny detail that deserves a much bigger solution.",
    brief:
      "Open Innovation is for teams who want to tackle any real-world problem using Artificial Intelligence and Machine Learning. Unlike domain-specific tracks, participants are free to select their own dataset, formulate the problem statement, and build a unique AI/ML solution.\n\nDataset — No dataset will be provided for this track. Participants are expected to source their own dataset(s) and build an AI/ML solution based on a problem of their choice.",
    color: "violet",
    icon: Sparkles,
    glyph: "∞",
    dataset: "pick-your-own" as Dataset,
  },
];

const nominationCardColors = ["", "coral", "lime", "yellow"] as const;

const faqs = {
  General: [
    [
      "What is Code cortex?",
      "Code cortex is TAM-VIT’s flagship 30-hour hackathon: a focused sprint to explore an idea, find your people, and leave with something that works.",
    ],
    [
      "Who can participate?",
      "Students and early builders are welcome. Form a team, pick a direction, and bring the curiosity — we will help with the rest.",
    ],
    [
      "Do I need a finished idea?",
      "Not at all. A rough hunch is enough. The tracks, mentors, and community are there to help you turn a spark into a buildable plan.",
    ],
  ],
};

type TrackColor = (typeof tracks)[number]["color"];

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={compact ? "brand brand--compact" : "brand"}
      href="#home"
      aria-label="Code cortex home"
    >
      <img src={tamWhiteLogo} alt="TAM" className="brand__tam-logo" />
      <span className="brand__copy">
        <span className="brand__top">TAM-VIT</span>
        <span className="brand__bottom">CODE CORTEX</span>
      </span>
    </a>
  );
}

function SectionLabel({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <div className="section-label">
      <span className="section-label__number">{number}</span>
      <span className="section-label__line" />
      <span>{children}</span>
    </div>
  );
}

function MascotModel({
  pointer,
  reducedMotion,
}: {
  pointer: { x: number; y: number };
  reducedMotion: boolean;
}) {
  const { scene } = useGLTF(tamMascot);
  const groupRef = useRef<THREE.Group>(null);
  const smileRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Object3D | null>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 2.4 / Math.max(size.x, size.y, size.z, 0.001);
    clone.position.sub(center);
    clone.scale.setScalar(scale);
    return clone;
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;
    const targetX = reducedMotion
      ? 0
      : THREE.MathUtils.clamp(pointer.y * 0.032, -0.04, 0.04);
    const targetY = reducedMotion
      ? 0
      : THREE.MathUtils.clamp(pointer.x * 0.032, -0.028, 0.028);
    const head = headRef.current;
    if (head) {
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetX, 0.08);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetY, 0.08);
    }
    if (smileRef.current) {
      smileRef.current.rotation.x = THREE.MathUtils.lerp(
        smileRef.current.rotation.x,
        targetX,
        0.08,
      );
      smileRef.current.rotation.y = THREE.MathUtils.lerp(
        smileRef.current.rotation.y,
        targetY,
        0.08,
      );
    }
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      reducedMotion ? 0 : Math.sin(Date.now() * 0.0014) * 0.08,
      0.06,
    );
  });

  useEffect(() => {
    let head: THREE.Object3D | null = null;
    model.traverse((node) => {
      if (!head && /^(cube|head|face|visor)$/i.test(node.name)) head = node;
    });
    headRef.current = head;
    return () => {
      headRef.current = null;
    };
  }, [model]);

  return (
    <group ref={groupRef}>
      <primitive object={model} />
      <group ref={smileRef} position={[0, -0.34, 1.16]}>
        <Line
          points={[
            [-0.28, 0.06, 0],
            [-0.2, -0.01, 0],
            [-0.1, -0.065, 0],
            [0, -0.085, 0],
            [0.1, -0.065, 0],
            [0.2, -0.01, 0],
            [0.28, 0.06, 0],
          ]}
          color="#48d9ff"
          lineWidth={3.2}
          dashed={false}
        />
      </group>
    </group>
  );
}

function MascotFallback() {
  return (
    <mesh position={[0, 0, 0]}>
      <icosahedronGeometry args={[1.25, 2]} />
      <meshStandardMaterial
        color="#48d9ff"
        roughness={0.48}
        metalness={0.28}
        wireframe
      />
    </mesh>
  );
}

function TransitionRibbons() {
  const clubMarks = [
    "TAM",
    "THE AIML CLUB",
    "TAM",
    "THE AIML CLUB",
    "TAM",
    "THE AIML CLUB",
  ];
  const codeMarks = [
    "CODE CORTEX",
    "CODE CORTEX",
    "CODE CORTEX",
    "CODE CORTEX",
  ];
  return (
    <div
      className="transition-ribbons"
      aria-label="TAM The AIML Club and Code Cortex"
    >
      <div className="transition-ribbon transition-ribbon--upper">
        <div
          className="transition-ribbon__track transition-ribbon__track--forward"
          aria-hidden="true"
        >
          {clubMarks.map((mark, index) => (
            <span
              key={`club-${index}`}
              className={
                index % 2 === 0
                  ? "transition-ribbon__mark"
                  : "transition-ribbon__submark"
              }
            >
              {mark}
            </span>
          ))}
        </div>
      </div>
      <div className="transition-ribbon transition-ribbon--lower">
        <div
          className="transition-ribbon__track transition-ribbon__track--reverse"
          aria-hidden="true"
        >
          {codeMarks.map((mark, index) => (
            <span
              key={`code-${index}`}
              className={
                index % 2 === 0
                  ? "transition-ribbon__mark"
                  : "transition-ribbon__submark"
              }
            >
              {mark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StackShowcase() {
  return (
    <div className="stack-showcase" aria-label="Code cortex hardware stack">
      <div className="stack-showcase__grid" aria-hidden="true" />
      <span className="stack-showcase__caption" aria-hidden="true">
        BUILD / TEST / SHIP
      </span>
      <span
        className="stack-showcase__orbit stack-showcase__orbit--one"
        aria-hidden="true"
      />
      <span
        className="stack-showcase__orbit stack-showcase__orbit--two"
        aria-hidden="true"
      />
      <div className="stack-showcase__core">
        <div className="stack-showcase__logo-shell">
          <img src={codeCortexLogo} alt="Code cortex 3.0" />
        </div>
        <span>CODE CORTEX 3.0 / 2026</span>
      </div>
    </div>
  );
}

function CursorTracer({ disabled }: { disabled: boolean }) {
  const tracerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tracer = tracerRef.current;
    if (!tracer || disabled) return;
    let frame = 0;
    let x = 0;
    let y = 0;

    const hide = () => tracer.classList.remove("is-visible");
    const move = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" ||
        window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      x = event.clientX;
      y = event.clientY;
      tracer.classList.add("is-visible");
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        tracer.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        frame = 0;
      });
    };
    const leaveWindow = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leaveWindow, { passive: true });
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leaveWindow);
      window.removeEventListener("blur", hide);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [disabled]);

  return (
    <span
      ref={tracerRef}
      className={`cursor-tracer${disabled ? " cursor-tracer--disabled" : ""}`}
      aria-hidden="true"
    />
  );
}

function HeadingIcon({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="heading-with-icon__icon" aria-label={label}>
      <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

function GridDoodle() {
  return (
    <div className="grid-doodle" aria-hidden="true">
      <span className="grid-doodle__halo" />
      <span className="grid-doodle__cross grid-doodle__cross--one" />
      <span className="grid-doodle__cross grid-doodle__cross--two" />
      <span className="grid-doodle__dot grid-doodle__dot--one" />
      <span className="grid-doodle__dot grid-doodle__dot--two" />
      <span className="grid-doodle__label">
        BUILD
        <br />
        SOMETHING
        <br />
        UNEXPECTED
      </span>
    </div>
  );
}

function WireframeStamp({
  words,
  size = "large",
}: {
  words: string[];
  size?: "large" | "small";
}) {
  return (
    <div
      className={`wireframe-stamp wireframe-stamp--${size}`}
      aria-hidden="true"
    >
      {words.map((word) => (
        <span key={word}>{word}</span>
      ))}
    </div>
  );
}

function TrackGlyph({
  track,
  large = false,
}: {
  track: (typeof tracks)[number];
  large?: boolean;
}) {
  const Icon = track.icon;
  return (
    <div
      className={`track-glyph track-glyph--${track.color}${large ? " track-glyph--large" : ""}`}
    >
      <span className="track-glyph__ring" />
      <span className="track-glyph__glyph">{track.glyph}</span>
      <Icon
        className="track-glyph__icon"
        size={large ? 54 : 28}
        strokeWidth={1.2}
      />
      <span className="track-glyph__dot" />
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [faqMode, setFaqMode] = useState<keyof typeof faqs>("General");
  const [faqOpen, setFaqOpen] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [mascotPointer, setMascotPointer] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [menuNudgeVisible, setMenuNudgeVisible] = useState(false);
  const [mobileNoticeDismissed, setMobileNoticeDismissed] = useState(false);
  const isMobile = useIsMobile();
  const [songQuery, setSongQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const leaderboardQuery = trpc.spotify.leaderboard.useQuery();
  const searchQuery = trpc.spotify.search.useQuery(
    { query: songQuery },
    { enabled: false },
  );
  const voteMutation = trpc.spotify.vote.useMutation({
    onSuccess: () => leaderboardQuery.refetch(),
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let visited = false;
    try {
      visited = window.localStorage.getItem("cc-visited") === "1";
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the nudge.
      return;
    }
    if (visited) return;

    setMenuNudgeVisible(true);
    const dismiss = () => {
      setMenuNudgeVisible(false);
      try {
        window.localStorage.setItem("cc-visited", "1");
      } catch {
        // ignore write failures
      }
    };

    const onScroll = () => dismiss();
    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    const timer = window.setTimeout(dismiss, 6000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const wantedTrack = new URLSearchParams(window.location.search)
      .get("track")
      ?.trim()
      .toLowerCase();
    if (!wantedTrack) return;
    const matchIndex = tracks.findIndex(
      (track) => track.name.toLowerCase() === wantedTrack,
    );
    if (matchIndex >= 0) setTrackIndex(matchIndex);
  }, []);

  useEffect(() => {
    // A URL hash (e.g. "#tracks" from the root SPA's nav, or from the "View
    // track brief" dashboard link) only auto-scrolls on load for static HTML
    // — this is a client-rendered SPA, so the browser tries to jump to it
    // before React has even mounted the section, finds nothing, and gives
    // up. Do it ourselves once the target exists — as an instant jump, not
    // smooth, since the hero's images/3D model are still loading and
    // reflowing the page at this point, which fights a mid-animation smooth
    // scroll and leaves it short. Re-run once on "load" too, to correct for
    // any layout shift from assets that finish after the first attempt.
    const hash = window.location.hash;
    if (!hash) return;
    const scrollToHash = () => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "instant" });
    };
    const timer = window.setTimeout(scrollToHash, 300);
    window.addEventListener("load", scrollToHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", scrollToHash);
    };
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("cc-mobile-notice-seen") === "1") {
        setMobileNoticeDismissed(true);
      }
    } catch {
      // ignore — just show the notice if we can't remember it was dismissed
    }
  }, []);

  const dismissMobileNotice = () => {
    setMobileNoticeDismissed(true);
    try {
      window.sessionStorage.setItem("cc-mobile-notice-seen", "1");
    } catch {
      // ignore write failures
    }
  };

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    const onPointerMove = (event: PointerEvent) => {
      if (window.scrollY > 32 || window.matchMedia("(pointer: coarse)").matches)
        return;
      setMascotPointer({
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    const revealTargets =
      document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const activeTrack = tracks[trackIndex];
  const faqItems = useMemo(() => faqs[faqMode], [faqMode]);

  const moveTrack = (direction: number) => {
    setTrackIndex(
      (current) => (current + direction + tracks.length) % tracks.length,
    );
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
      return;
    }
    try {
      await audio.play();
      setMusicPlaying(true);
    } catch {
      setMusicPlaying(false);
    }
  };

  const submitSongSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (songQuery.trim().length < 1) return;
    searchQuery.refetch();
  };

  const nominateTrack = (track: {
    id: string;
    name: string;
    artist: string;
    albumArt: string | null;
  }) => {
    voteMutation.mutate(track);
  };

  const jumpTo = (href: string) => {
    setMenuOpen(false);
    window.setTimeout(
      () =>
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }),
      80,
    );
  };

  const openMenu = () => {
    setMenuOpen(true);
    setMenuNudgeVisible(false);
    try {
      window.localStorage.setItem("cc-visited", "1");
    } catch {
      // ignore write failures
    }
  };

  return (
    <div className="site-shell">
      {isMobile && !mobileNoticeDismissed && (
        <div className="mobile-notice" role="dialog" aria-label="Best viewed on a laptop">
          <div className="mobile-notice__card">
            <p className="mobile-notice__eyebrow">A quick note, dev to dev</p>
            <h2>This one's built laptop-first.</h2>
            <p>
              Somewhere a UX designer is crying about the mascot on a 6-inch
              screen. Grab a laptop for the full build when you can — or just
              keep going, we won't judge (much).
            </p>
            <button type="button" onClick={dismissMobileNotice}>
              Continue on phone anyway <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      )}
      <audio
        ref={audioRef}
        src={sirenTrack}
        loop
        preload="metadata"
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
      />
      <CursorTracer disabled={coarsePointer || reducedMotion} />
      <header
        className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}
      >
        <Mark />
        <div className="header-actions">
          <button
            className={`music-toggle ${musicPlaying ? "music-toggle--active" : ""}`}
            onClick={toggleMusic}
            aria-pressed={musicPlaying}
            aria-label={musicPlaying ? "Turn music off" : "Turn music on"}
          >
            <span className="music-toggle__panel" aria-hidden="true">
              <span className="music-toggle__waveform">
                {Array.from({ length: 17 }, (_, index) => (
                  <i key={index} />
                ))}
              </span>
            </span>
            <span className="music-toggle__state">
              ({musicPlaying ? "ON" : "OFF"})
            </span>
          </button>
        </div>
      </header>
      <div className="menu-rail">
        <button
          className={`menu-trigger ${menuNudgeVisible ? "menu-trigger--nudge" : ""}`}
          onClick={openMenu}
          aria-label="Open menu"
        >
          <span className="menu-trigger__word">MENU</span>
          <span className="menu-trigger__icon">
            <Menu size={22} strokeWidth={1.8} />
          </span>
        </button>
        {menuNudgeVisible && (
          <span className="menu-trigger__nudge-hint" aria-hidden="true">
            Tap to explore ↗
          </span>
        )}
      </div>

      <div
        className={`menu-panel ${menuOpen ? "menu-panel--open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="menu-panel__topline">
          <Mark compact />
          <button
            className="menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <span>CLOSE</span>
            <X size={24} strokeWidth={1.6} />
          </button>
        </div>
        <div className="menu-panel__body">
          <span className="menu-panel__side-note">NAV / CODE CORTEX</span>
          <nav className="menu-panel__nav">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  href={item.href}
                  key={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    jumpTo(item.href);
                  }}
                >
                  <span className="menu-panel__index">0{index + 1}</span>
                  <Icon
                    className="menu-panel__item-icon"
                    size={22}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="menu-panel__item-label">{item.label}</span>
                  <ArrowUpRight
                    className="menu-panel__item-arrow"
                    size={22}
                    strokeWidth={1.4}
                  />
                </a>
              );
            })}
            <a
              href={mainAppUrl}
              target="_blank"
              rel="noreferrer"
              className="menu-panel__login-link"
            >
              <span className="menu-panel__index">TL</span>
              <UsersRound
                className="menu-panel__item-icon"
                size={22}
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="menu-panel__item-label">Team Login</span>
              <ArrowUpRight
                className="menu-panel__item-arrow"
                size={22}
                strokeWidth={1.4}
              />
            </a>
            <a
              href={`${mainAppUrl}/admin`}
              target="_blank"
              rel="noreferrer"
              className="menu-panel__login-link"
            >
              <span className="menu-panel__index">AD</span>
              <Shield
                className="menu-panel__item-icon"
                size={22}
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="menu-panel__item-label">Admin</span>
              <ArrowUpRight
                className="menu-panel__item-arrow"
                size={22}
                strokeWidth={1.4}
              />
            </a>
          </nav>
        </div>
        <div className="menu-panel__footer">
          <span>30 HOURS / ONE BIG IDEA</span>
          <span>TAM-VIT · 2026</span>
        </div>
      </div>

      <main>
        <section id="home" className="hero section-dark">
          <div className="hero__noise" />
          <div className="hero__grid" />
          <div className="hero__topline page-pad">
            <span>TAM-VIT</span>
            <span>TAM-VIT / INDIA</span>
          </div>
          <div
            className={`hero__mascot ${scrolled ? "hero__mascot--hidden" : ""}`}
            aria-hidden="true"
            onPointerMove={(event) => {
              if (!scrolled && !coarsePointer)
                setMascotPointer({
                  x: (event.clientX / window.innerWidth - 0.5) * 2,
                  y: (event.clientY / window.innerHeight - 0.5) * 2,
                });
            }}
          >
            <Canvas
              camera={{ position: [0, 0.15, 4.5], fov: 35 }}
              dpr={[1, 1.5]}
              gl={{ alpha: true, antialias: true }}
            >
              <ambientLight intensity={1.8} />
              <directionalLight
                position={[2, 3, 4]}
                intensity={2.5}
                color="#48d9ff"
              />
              <directionalLight
                position={[-3, 1, 2]}
                intensity={1.4}
                color="#d9f45b"
              />
              <Suspense fallback={<MascotFallback />}>
                <MascotModel
                  pointer={mascotPointer}
                  reducedMotion={reducedMotion || coarsePointer}
                />
              </Suspense>
            </Canvas>
          </div>
          <div className="hero__copy page-pad">
            <p className="eyebrow eyebrow--bright">
              <span className="eyebrow__pulse" /> 30 HOURS / ONE IDEA / ZERO
              LIMITS
            </p>
            <img
              className="hero__logo"
              src={codeCortexLogo}
              alt="Code cortex 3.0"
            />
            <div className="hero__headline-row">
              <div className="heading-with-icon heading-with-icon--hero">
                <HeadingIcon icon={HomeIcon} label="Home" />
                <h1>
                  30 Hours.
                  <br />
                  <em>
                    One Idea.
                    <br />
                    Zero Limits.
                  </em>
                </h1>
              </div>
              <a
                className="round-cta"
                href="#tracks"
                onClick={(event) => {
                  event.preventDefault();
                  jumpTo("#tracks");
                }}
              >
                <span>
                  Explore
                  <br />
                  Tracks
                </span>{" "}
                <ArrowUpRight size={22} />
              </a>
            </div>
          </div>
          <div className="hero__orb hero__orb--one" />
          <div className="hero__orb hero__orb--two" />
          <div className="hero__stamp">
            <span>MAKE</span>
            <span>IT</span>
            <span>WEIRD</span>
          </div>
          <div className="hero__bottom page-pad">
            <a className="scroll-cue" href="#about">
              <span className="scroll-cue__line" /> Scroll to explore
            </a>
            <span className="hero__location">
              // 30 HOURS / ONE IDEA / ZERO LIMITS
            </span>
          </div>
        </section>

        <TransitionRibbons />

        <section
          id="about"
          className="about section-light page-pad"
          data-reveal
        >
          <div className="about__intro">
            <SectionLabel number="01">ABOUT THE JAM</SectionLabel>
            <div className="heading-with-icon">
              <HeadingIcon icon={Info} label="About" />
              <h2>
                The build
                <br />
                <span>starts here.</span>
              </h2>
            </div>
            <p className="lead-copy">
              A high-energy 30 hour hackathon fostering innovation and
              collaboration, where participants address real-world challenges,
              showcase their coding skills, and develop groundbreaking
              solutions, judged by industry experts.
            </p>
            <a
              className="text-link"
              href="#tracks"
              onClick={(event) => {
                event.preventDefault();
                jumpTo("#tracks");
              }}
            >
              Find your track <ArrowRight size={18} />
            </a>
          </div>
          <div className="about__visual">
            <div className="about__visual-label">VIT / 12°58′N 79°09′E</div>
            <div className="map-card">
              <div className="map-card__rings" />
              <div className="map-card__route map-card__route--one" />
              <div className="map-card__route map-card__route--two" />
              <span className="map-card__pin map-card__pin--one" />
              <span className="map-card__pin map-card__pin--two" />
              <span className="map-card__pin map-card__pin--three" />
              <WireframeStamp words={["MAKE", "IT", "USEFUL"]} size="large" />
              <span className="map-card__caption">
                A SMALL DOT
                <br />
                WITH BIG IDEAS
              </span>
            </div>
          </div>
        </section>

        <section className="manifesto section-dark page-pad" data-reveal>
          <div className="manifesto__side">
            <GridDoodle />
          </div>
          <div className="manifesto__content">
            <SectionLabel number="02">WHO WE ARE</SectionLabel>
            <div className="manifesto__columns">
              <div>
                <div className="heading-with-icon">
                  <HeadingIcon icon={Sparkles} label="Who we are" />
                  <h2>
                    Curiosity
                    <br />
                    <span>with a deadline.</span>
                  </h2>
                </div>
              </div>
              <div>
                <p>
                  The AI &amp; ML Club is a student-led initiative committed to
                  exploring the transformative potential of AI and ML across
                  diverse domains such as healthcare, finance, and education.
                  Through interactive workshops, seminars with industry
                  professionals, and hands-on projects, we empower students to
                  deepen their technical knowledge, solve real-world challenges,
                  and drive innovation.
                </p>
                <p>
                  Together, we aim to shape the future of technology while
                  fostering collaboration and a passion for AI and ML. Our
                  mission is to educate, inspire, and support students in
                  pursuing their passion for AI and ML, providing a platform to
                  grow, innovate, make meaningful contributions, and to be a
                  part of something extraordinary.
                </p>
                <span className="manifesto__signature">TAM-VIT / 2026</span>
              </div>
            </div>
          </div>
        </section>

        <section className="duo-story page-pad" data-reveal>
          <article className="duo-card duo-card--vit">
            <div className="duo-card__top">
              <SectionLabel number="03">ABOUT VIT</SectionLabel>
              <Globe size={24} />
            </div>
            <h3>
              A campus
              <br />
              with <em>range.</em>
            </h3>
            <p>
              <strong>Renowned Institution.</strong> VIT is a distinguished
              private university renowned for delivering world-class engineering
              education, pioneering technological innovation, and conducting
              cutting-edge research.
            </p>
            <p>
              <strong>Top Ranked.</strong> VIT holds the 9th position nationally
              according to NIRF, ranks 11th in India for Engineering and 150th
              in Asia per QS World Rankings, and maintains a distinguished NAAC
              A++ accreditation with a score of 3.66/4.0.
            </p>
            <span className="duo-card__footer">
              12°58′N / 79°09′E <ArrowUpRight size={18} />
            </span>
          </article>
          <article className="duo-card duo-card--gdg">
            <div className="duo-card__top">
              <SectionLabel number="04">ABOUT TAM-VIT</SectionLabel>
              <Cpu size={24} />
            </div>
            <h3>
              Build
              <br />
              <em>together.</em>
            </h3>
            <p>
              People with different tabs open in their heads, making room for
              one another at the same table. That is the whole point.
            </p>
            <span className="duo-card__footer">
              COMMUNITY / ALWAYS OPEN <ArrowUpRight size={18} />
            </span>
          </article>
        </section>

        <section
          id="tracks"
          className="tracks section-blue page-pad"
          data-reveal
        >
          <div className="tracks__header">
            <SectionLabel number="05">PICK A DIRECTION</SectionLabel>
            <div className="tracks__arrows">
              <button onClick={() => moveTrack(-1)} aria-label="Previous track">
                <ChevronLeft />
              </button>
              <button onClick={() => moveTrack(1)} aria-label="Next track">
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="tracks__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={Layers} label="Tracks" />
              <h2>
                Five ways
                <br />
                <span>to go deep.</span>
              </h2>
            </div>
            <p>
              Follow the thing you cannot stop thinking about. Every track is a
              different excuse to make something useful, expressive, or
              beautifully unnecessary.
            </p>
          </div>
          <div className="tracks__canvas">
            <div
              className="tracks__rail"
              role="tablist"
              aria-label="Hackathon tracks"
            >
              {tracks.map((track, index) => (
                <button
                  key={track.name}
                  className={`track-tab track-tab--${track.color} ${index === trackIndex ? "track-tab--active" : ""}`}
                  onClick={() => setTrackIndex(index)}
                  role="tab"
                  aria-selected={index === trackIndex}
                >
                  <span className="track-tab__number">0{index + 1}</span>
                  <span>{track.name}</span>
                  <ArrowUpRight size={20} />
                </button>
              ))}
            </div>
            <div className="tracks__active-card">
              <div className="tracks__active-card-top">
                <span>{activeTrack.eyebrow}</span>
                <span>{activeTrack.sponsor}</span>
              </div>
              <TrackGlyph track={activeTrack} large />
              <h3>{activeTrack.name}</h3>
              <p>{activeTrack.description}</p>
              <div className="tracks__active-card-actions">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-link text-link--dark track-brief-trigger"
                    >
                      Know more <ArrowUpRight size={18} />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="track-brief-dialog">
                    <DialogHeader>
                      <DialogTitle className="track-brief-dialog__title">
                        {activeTrack.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="track-brief-dialog__body">
                      {activeTrack.brief.split("\n\n").map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                {activeTrack.dataset === "pick-your-own" ? (
                  <span className="tracks__dataset-note">
                    Pick your own dataset for this track.
                  </span>
                ) : activeTrack.dataset ? (
                  <a
                    className="tracks__dataset-download"
                    href={activeTrack.dataset.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {activeTrack.dataset.kind === "folder"
                      ? "Open dataset folder"
                      : "Download dataset"}{" "}
                    {activeTrack.dataset.kind === "folder" ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                  </a>
                ) : (
                  <span className="tracks__dataset-note">
                    Dataset coming soon.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="tracks__dots">
            {tracks.map((track, index) => (
              <button
                key={track.name}
                className={index === trackIndex ? "is-active" : ""}
                onClick={() => setTrackIndex(index)}
                aria-label={`Go to track ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <section
          id="nominate"
          className="nominate section-dark page-pad"
          data-reveal
        >
          <div className="nominate__header">
            <SectionLabel number="06">THE IN-BETWEEN SET</SectionLabel>
            <span className="nominate__live">
              <span /> LIVE NOMINATION
            </span>
          </div>
          <div className="nominate__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={Music2} label="Nominate" />
              <h2>
                Pick the next
                <br />
                <span>soundtrack.</span>
              </h2>
            </div>
            <div>
              <p>
                Search Spotify's catalog and nominate a track. The leaderboard
                below is live and shared — whoever runs the room's queue picks
                from the top of it.
              </p>
              <p className="nominate__note">
                <Music2 size={16} /> One vote per visitor, change it anytime.
              </p>
            </div>
          </div>

          <form className="nominate-search" onSubmit={submitSongSearch}>
            <input
              value={songQuery}
              onChange={(event) => setSongQuery(event.target.value)}
              placeholder="Search for a song or artist"
              aria-label="Search Spotify"
            />
            <button type="submit" disabled={searchQuery.isFetching}>
              {searchQuery.isFetching ? "SEARCHING..." : "SEARCH"}
            </button>
          </form>
          {searchQuery.error && (
            <p className="nominate-search__error" role="alert">
              {searchQuery.error.message}
            </p>
          )}
          {searchQuery.data && (
            <ul className="nominate-results">
              {searchQuery.data.length === 0 && (
                <li className="nominate-results__empty">
                  No tracks found — try another search.
                </li>
              )}
              {searchQuery.data.map((track) => (
                <li key={track.id}>
                  {track.albumArt ? (
                    <img src={track.albumArt} alt="" />
                  ) : (
                    <span className="nominate-results__art-placeholder" />
                  )}
                  <span className="nominate-results__meta">
                    <strong>{track.name}</strong>
                    <span>{track.artist}</span>
                  </span>
                  <button
                    onClick={() => nominateTrack(track)}
                    disabled={voteMutation.isPending}
                  >
                    NOMINATE
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="nominate__grid">
            {(leaderboardQuery.data?.tracks ?? []).map((track, index) => {
              const totalVotes = (leaderboardQuery.data?.tracks ?? []).reduce(
                (sum, item) => sum + item.votes,
                0,
              );
              const percent = totalVotes
                ? Math.round((track.votes / totalVotes) * 100)
                : 0;
              const isSelected = leaderboardQuery.data?.myVote === track.id;
              const color =
                nominationCardColors[index % nominationCardColors.length];
              return (
                <button
                  key={track.id}
                  className={`nomination-card ${color ? `nomination-card--${color}` : ""} ${isSelected ? "nomination-card--selected" : ""}`}
                  onClick={() => nominateTrack(track)}
                  aria-pressed={isSelected}
                >
                  <span className="nomination-card__top">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{isSelected ? "YOUR PICK" : "NOMINATE"}</span>
                  </span>
                  <span className="nomination-card__title">{track.name}</span>
                  <span className="nomination-card__note">{track.artist}</span>
                  <span className="nomination-card__bar">
                    <span style={{ width: `${percent}%` }} />
                  </span>
                  <span className="nomination-card__bottom">
                    <span>{track.votes} votes</span>
                    <strong>{percent}%</strong>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="nominate__footer">
            <span>
              {leaderboardQuery.data?.myVote
                ? "Your nomination is live. The room decides the rest."
                : "Search above and nominate a track to see it here."}
            </span>
            <span>{leaderboardQuery.data?.tracks.length ?? 0} NOMINATED</span>
          </div>
        </section>

        <section
          id="gallery"
          className="events section-light page-pad"
          data-reveal
        >
          <div className="events__header">
            <SectionLabel number="07">BEFORE THE JAM</SectionLabel>
            <span className="events__header-note">
              A LITTLE ARCHIVE / BIG ENERGY
            </span>
          </div>
          <div className="events__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={ImageIcon} label="Gallery" />
              <h2>
                We’ve been
                <br />
                <span>busy.</span>
              </h2>
            </div>
            <p>
              Three past builds. A growing archive of proof that the most
              interesting work starts before anybody knows what to call it.
            </p>
          </div>
          <div className="event-grid">
            <article className="event-card event-card--triangle">
              <div className="event-card__shape event-card__shape--triangle">
                △
              </div>
              <div className="event-card__meta">
                <span>PAST EVENT / 01</span>
                <ArrowUpRight size={19} />
              </div>
              <h3>
                Bida
                <br />
                thon
              </h3>
              <p>
                A fast-moving build where ideas compete, evolve, and find their
                sharpest form.
              </p>
            </article>
            <article className="event-card event-card--circle">
              <div className="event-card__shape event-card__shape--circle">
                ◎
              </div>
              <img
                className="event-card__cover"
                src="/data-alchemy-cover.webp"
                alt="TAM-VIT team gathered in a classroom for Data Alchemy"
                loading="lazy"
              />
              <div className="event-card__meta">
                <span>PAST EVENT / 02</span>
                <ArrowUpRight size={19} />
              </div>
              <h3>
                Data
                <br />
                Alchemy
              </h3>
              <p>
                Turn messy questions into clear insights, useful tools, and
                unexpected directions.
              </p>
            </article>
            <article className="event-card event-card--flower">
              <div className="event-card__shape event-card__shape--flower">
                ✽
              </div>
              <div className="event-card__meta">
                <span>PAST EVENT / 03</span>
                <ArrowUpRight size={19} />
              </div>
              <h3>
                Red
                <br />
                handed
              </h3>
              <p>
                A sharp, playful challenge for fast thinking and ideas that
                leave a mark.
              </p>
            </article>
          </div>
        </section>

        <section
          id="sponsors"
          className="sponsors section-dark page-pad"
          data-reveal
        >
          <div className="sponsors__header">
            <SectionLabel number="08">POWERED BY</SectionLabel>
            <span>THANK YOU, INTERNET</span>
          </div>
          <div className="sponsors__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={HandHeart} label="Sponsors" />
              <h2>
                Good ideas
                <br />
                <span>need friends.</span>
              </h2>
            </div>
            <p>
              We are grateful to the teams that make room for new builders, new
              questions, and the occasional delightfully over-engineered side
              project.
            </p>
          </div>
          <div className="sponsor-grid">
            <a
              className="sponsor-card sponsor-card--polyfab"
              href="https://polyfab.co.in/"
              target="_blank"
              rel="noreferrer"
              aria-label="Visit POLYFAB website"
            >
              <span className="sponsor-card__rank">OFFICIAL SPONSOR</span>
              <img
                className="sponsor-card__logo"
                src={polyfabLogo}
                alt="POLYFAB"
              />
              <span className="sponsor-card__name">POLYFAB</span>
              <span className="sponsor-card__arrow">
                <ArrowUpRight />
              </span>
            </a>
          </div>
          <div className="sponsors__sun">
            <span>
              THE
              <br />
              SUN IS
              <br />
              ON.
            </span>
          </div>
        </section>

        <section id="faqs" className="faq section-light page-pad" data-reveal>
          <div className="faq__side">
            <SectionLabel number="09">NO SILLY QUESTIONS</SectionLabel>
            <div className="heading-with-icon">
              <HeadingIcon icon={HelpCircle} label="FAQs" />
              <h2>
                Let’s break
                <br />
                <span>it down.</span>
              </h2>
            </div>
            <p>
              Still curious? That is a good sign. Pick a tab and find the
              practical bits.
            </p>
            <div className="faq__doodle">
              <span>?</span>
              <span>!</span>
              <span>↗</span>
            </div>
          </div>
          <div className="faq__main">
            <div className="faq__tabs">
              {(Object.keys(faqs) as Array<keyof typeof faqs>).map((mode) => (
                <button
                  key={mode}
                  className={faqMode === mode ? "is-active" : ""}
                  onClick={() => {
                    setFaqMode(mode);
                    setFaqOpen(0);
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="faq__list">
              {faqItems.map(([question, answer], index) => (
                <div
                  className={`faq-item ${faqOpen === index ? "faq-item--open" : ""}`}
                  key={question}
                >
                  <button
                    onClick={() => setFaqOpen(faqOpen === index ? -1 : index)}
                    aria-expanded={faqOpen === index}
                  >
                    <span>0{index + 1}</span>
                    <strong>{question}</strong>
                    <ChevronDown size={21} />
                  </button>
                  <div className="faq-item__answer">
                    <p>{answer}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              className="discord-link"
              href="#contact"
              onClick={(event) => {
                event.preventDefault();
                jumpTo("#contact");
              }}
            >
              For more queries, raise a ticket on Discord{" "}
              <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
      </main>

      <footer id="contact" className="footer section-dark page-pad" data-reveal>
        <div className="footer__main">
          <div className="footer__statement">
            <SectionLabel number="10">SAY HELLO</SectionLabel>
            <div className="heading-with-icon">
              <HeadingIcon icon={Mail} label="Contact" />
              <h2>
                Let’s explore
                <br />
                <span>
                  stack<span className="footer__cursor">→</span>
                </span>
              </h2>
            </div>
          </div>
          <div className="footer__contact">
            <a href="mailto:varshithisworking@gmail.com">
              <Mail size={17} /> varshithisworking@gmail.com
            </a>
            <a href="tel:+919686352426">
              <Phone size={17} /> +91 96863 52426
            </a>
            <a href="mailto:reenubiju10@gmail.com">
              <Mail size={17} /> reenubiju10@gmail.com
            </a>
            <a href="tel:+919656463672">
              <Phone size={17} /> +91 96564 63672
            </a>
          </div>
        </div>
        <StackShowcase />
        <div className="footer__bottom">
          <div className="footer__brand-lockup">
            <Mark compact />
            <img src={codeCortexLogo} alt="Code cortex 3.0" />
          </div>
          <div className="footer__socials">
            <a
              href="https://www.instagram.com/tam.vit_vellore?igsi=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noreferrer"
              aria-label="TAM on Instagram"
            >
              <Instagram size={20} />
            </a>
            <a
              href="https://github.com/Tam"
              target="_blank"
              rel="noreferrer"
              aria-label="TAM on GitHub"
            >
              <Github size={20} />
            </a>
            <a
              href="https://www.linkedin.com/company/tamsystems"
              target="_blank"
              rel="noreferrer"
              aria-label="TAM on LinkedIn"
            >
              <Linkedin size={20} />
            </a>
          </div>
          <span className="footer__legal">
            © 2026 TAM-VIT / BUILT WITH TOO MUCH COFFEE
          </span>
        </div>
      </footer>
    </div>
  );
}
