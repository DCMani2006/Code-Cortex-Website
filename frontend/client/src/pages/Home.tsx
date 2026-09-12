// Design direction: playful digital maximalism — midnight navy, electric cyan, cobalt, coral, citrus, oversized display type, layered objects, and tactile controls.
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, useGLTF } from "@react-three/drei";
import * as THREE from "three";
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

const sirenTrack = "/manus-storage/code-cortex-siren-ambience_89aed583.wav";
const codeCortexLogo = "/codecortex-3.0.svg";
const polyfabLogo = "/manus-storage/polyfab-logo_54e76553.png";
const tamWhiteLogo = "/manus-storage/tam-white-logo_5a224019.png";
const orbitArt = "/manus-storage/devjams-orbit-sphere_1b14088e.png";
const trackArt = "/manus-storage/devjams-track-objects_36355203.png";
const tamMascot = "/manus-storage/TAM3DMascot_0757ee95.glb";

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

const tracks = [
  {
    name: "Finance",
    sponsor: "Open track",
    eyebrow: "Track 01",
    description:
      "Design a calmer, clearer future for money. Turn complex financial moments into tools people can actually understand and trust.",
    color: "cyan",
    icon: Database,
    glyph: "₹",
  },
  {
    name: "Medicine & Healthcare",
    sponsor: "Open track",
    eyebrow: "Track 02",
    description:
      "Build for better care. Reimagine the tools, systems, and small human moments that make health support more accessible and useful.",
    color: "coral",
    icon: HeartPulse,
    glyph: "+",
  },
  {
    name: "Drone Tech & Aviation",
    sponsor: "Open track",
    eyebrow: "Track 03",
    description:
      "Take the idea airborne. Explore navigation, autonomy, logistics, safety, and the next generation of movement through the sky.",
    color: "lime",
    icon: Plane,
    glyph: "✈",
  },
  {
    name: "Security",
    sponsor: "Open track",
    eyebrow: "Track 04",
    description:
      "Make the digital world harder to break and easier to trust. Build tools that protect people, systems, and the ideas inside them.",
    color: "blue",
    icon: ShieldCheck,
    glyph: "///",
  },
  {
    name: "Open Innovation",
    sponsor: "Open track",
    eyebrow: "Track 05",
    description:
      "No box, no brief, no ceiling. Bring the strange idea, the stubborn problem, or the tiny detail that deserves a much bigger solution.",
    color: "violet",
    icon: Sparkles,
    glyph: "∞",
  },
];

const nominationOptions = [
  { id: "deep-water", title: "Deep Water Drift", note: "Slow synths, wide reverb, midnight focus.", votes: 86, color: "cyan" },
  { id: "neon-ruins", title: "Neon Ruins", note: "A pulse for late-night builds and brave demos.", votes: 64, color: "coral" },
  { id: "sunrise-loop", title: "Sunrise Loop", note: "Warm, hopeful, and ready for the final stretch.", votes: 51, color: "lime" },
  { id: "wild-card", title: "Wild Card", note: "Nominate your own song in the community chat.", votes: 39, color: "yellow" },
];

const faqs = {
  General: [
    ["What is Code cortex?", "Code cortex is TAM-VIT’s flagship 30-hour hackathon: a focused sprint to explore an idea, find your people, and leave with something that works."],
    ["Who can participate?", "Students and early builders are welcome. Form a team, pick a direction, and bring the curiosity — we will help with the rest."],
    ["Do I need a finished idea?", "Not at all. A rough hunch is enough. The tracks, mentors, and community are there to help you turn a spark into a buildable plan."],
  ],
};

type TrackColor = (typeof tracks)[number]["color"];

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <a className={compact ? "brand brand--compact" : "brand"} href="#home" aria-label="Code cortex home">
      <img src={tamWhiteLogo} alt="TAM" className="brand__tam-logo" />
      <span className="brand__copy">
        <span className="brand__top">TAM-VIT</span>
        <span className="brand__bottom">CODE CORTEX</span>
      </span>
    </a>
  );
}

function SectionLabel({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="section-label">
      <span className="section-label__number">{number}</span>
      <span className="section-label__line" />
      <span>{children}</span>
    </div>
  );
}

function MascotModel({ pointer, reducedMotion }: { pointer: { x: number; y: number }; reducedMotion: boolean }) {
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
    const targetX = reducedMotion ? 0 : THREE.MathUtils.clamp(pointer.y * 0.032, -0.04, 0.04);
    const targetY = reducedMotion ? 0 : THREE.MathUtils.clamp(pointer.x * 0.032, -0.028, 0.028);
    const head = headRef.current;
    if (head) {
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetX, 0.08);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetY, 0.08);
    }
    if (smileRef.current) {
      smileRef.current.rotation.x = THREE.MathUtils.lerp(smileRef.current.rotation.x, targetX, 0.08);
      smileRef.current.rotation.y = THREE.MathUtils.lerp(smileRef.current.rotation.y, targetY, 0.08);
    }
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, reducedMotion ? 0 : Math.sin(Date.now() * 0.0014) * 0.08, 0.06);
  });

  useEffect(() => {
    let head: THREE.Object3D | null = null;
    model.traverse((node) => {
      if (!head && /^(cube|head|face|visor)$/i.test(node.name)) head = node;
    });
    headRef.current = head;
    return () => { headRef.current = null; };
  }, [model]);

  return (
    <group ref={groupRef}>
      <primitive object={model} />
      <group ref={smileRef} position={[0, -0.34, 1.16]}>
        <Line points={[[-0.28, 0.06, 0], [-0.2, -0.01, 0], [-0.1, -0.065, 0], [0, -0.085, 0], [0.1, -0.065, 0], [0.2, -0.01, 0], [0.28, 0.06, 0]]} color="#48d9ff" lineWidth={3.2} dashed={false} />
      </group>
    </group>
  );
}

function MascotFallback() {
  return <mesh position={[0, 0, 0]}><icosahedronGeometry args={[1.25, 2]} /><meshStandardMaterial color="#48d9ff" roughness={0.48} metalness={0.28} wireframe /></mesh>;
}

function TransitionRibbons() {
  const clubMarks = ["TAM", "THE AIML CLUB", "TAM", "THE AIML CLUB", "TAM", "THE AIML CLUB"];
  const codeMarks = ["CODE CORTEX", "CODE CORTEX", "CODE CORTEX", "CODE CORTEX"];
  return (
    <div className="transition-ribbons" aria-label="TAM The AIML Club and Code Cortex">
      <div className="transition-ribbon transition-ribbon--upper">
        <div className="transition-ribbon__track transition-ribbon__track--forward" aria-hidden="true">
          {clubMarks.map((mark, index) => <span key={`club-${index}`} className={index % 2 === 0 ? "transition-ribbon__mark" : "transition-ribbon__submark"}>{mark}</span>)}
        </div>
      </div>
      <div className="transition-ribbon transition-ribbon--lower">
        <div className="transition-ribbon__track transition-ribbon__track--reverse" aria-hidden="true">
          {codeMarks.map((mark, index) => <span key={`code-${index}`} className={index % 2 === 0 ? "transition-ribbon__mark" : "transition-ribbon__submark"}>{mark}</span>)}
        </div>
      </div>
    </div>
  );
}

function StackShowcase() {
  return (
    <div className="stack-showcase" aria-label="Code cortex hardware stack">
      <div className="stack-showcase__grid" aria-hidden="true" />
      <span className="stack-showcase__caption" aria-hidden="true">BUILD / TEST / SHIP</span>
      <span className="stack-showcase__orbit stack-showcase__orbit--one" aria-hidden="true" />
      <span className="stack-showcase__orbit stack-showcase__orbit--two" aria-hidden="true" />
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
      if (event.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  return <span ref={tracerRef} className={`cursor-tracer${disabled ? " cursor-tracer--disabled" : ""}`} aria-hidden="true" />;
}

function HeadingIcon({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return <span className="heading-with-icon__icon" aria-label={label}><Icon size={32} strokeWidth={1.5} aria-hidden="true" /></span>;
}

function GridDoodle() {
  return (
    <div className="grid-doodle" aria-hidden="true">
      <span className="grid-doodle__halo" />
      <span className="grid-doodle__cross grid-doodle__cross--one" />
      <span className="grid-doodle__cross grid-doodle__cross--two" />
      <span className="grid-doodle__dot grid-doodle__dot--one" />
      <span className="grid-doodle__dot grid-doodle__dot--two" />
      <span className="grid-doodle__label">BUILD<br />SOMETHING<br />UNEXPECTED</span>
    </div>
  );
}

function TrackGlyph({ track, large = false }: { track: (typeof tracks)[number]; large?: boolean }) {
  const Icon = track.icon;
  return (
    <div className={`track-glyph track-glyph--${track.color}${large ? " track-glyph--large" : ""}`}>
      <span className="track-glyph__ring" />
      <span className="track-glyph__glyph">{track.glyph}</span>
      <Icon className="track-glyph__icon" size={large ? 54 : 28} strokeWidth={1.2} />
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
  const [selectedNomination, setSelectedNomination] = useState<string | null>(null);
  const [mascotPointer, setMascotPointer] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [nominationVotes, setNominationVotes] = useState(() => Object.fromEntries(nominationOptions.map((option) => [option.id, option.votes])) as Record<string, number>);
  const [authPanel, setAuthPanel] = useState<"participant-login" | "participant-register" | "admin" | null>(null);
  const [teamIdInput, setTeamIdInput] = useState("");
  const [teamNameInput, setTeamNameInput] = useState("");
  const [teamPasswordInput, setTeamPasswordInput] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [participantTeam, setParticipantTeam] = useState<{ teamId: string; teamName: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user: ownerUser } = useAuth();
  const teamRegisterMutation = trpc.teams.register.useMutation();
  const teamLoginMutation = trpc.teams.login.useMutation();
  const participantMeQuery = trpc.teams.me.useQuery();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    const onPointerMove = (event: PointerEvent) => {
      if (window.scrollY > 32 || window.matchMedia("(pointer: coarse)").matches) return;
      setMascotPointer({ x: (event.clientX / window.innerWidth - 0.5) * 2, y: (event.clientY / window.innerHeight - 0.5) * 2 });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    if (participantMeQuery.data) setParticipantTeam(participantMeQuery.data);
  }, [participantMeQuery.data]);

  useEffect(() => {
    const savedNomination = window.localStorage.getItem("code-cortex-song-nomination");
    if (savedNomination) {
      setSelectedNomination(savedNomination);
      setHasVoted(true);
    }
  }, []);

  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || Boolean(authPanel) ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, authPanel]);

  const activeTrack = tracks[trackIndex];
  const faqItems = useMemo(() => faqs[faqMode], [faqMode]);

  const moveTrack = (direction: number) => {
    setTrackIndex((current) => (current + direction + tracks.length) % tracks.length);
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

  const openAuthPanel = (mode: "participant-login" | "participant-register" | "admin") => {
    setAuthMessage(null);
    setAuthPanel(mode);
  };

  const submitParticipantAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage(null);
    try {
      const team = authPanel === "participant-register"
        ? await teamRegisterMutation.mutateAsync({ teamId: teamIdInput, teamName: teamNameInput, password: teamPasswordInput })
        : await teamLoginMutation.mutateAsync({ teamId: teamIdInput, password: teamPasswordInput });
      setParticipantTeam(team);
      setAuthMessage(authPanel === "participant-register" ? "Team registered. Your participant session is active." : "Welcome back. Your participant session is active.");
      setTeamPasswordInput("");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "We could not complete that request. Try again.");
    }
  };

  const voteForSong = (songId: string) => {
    if (hasVoted) return;
    setSelectedNomination(songId);
    setHasVoted(true);
    setNominationVotes((current) => ({ ...current, [songId]: (current[songId] ?? 0) + 1 }));
    window.localStorage.setItem("code-cortex-song-nomination", songId);
  };

  const jumpTo = (href: string) => {
    setMenuOpen(false);
    window.setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  return (
    <div className="site-shell">
      <audio ref={audioRef} src={sirenTrack} loop preload="metadata" onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)} />
      <CursorTracer disabled={coarsePointer || reducedMotion} />
      <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
        <Mark />
        <div className="header-actions">
          <button className={`music-toggle ${musicPlaying ? "music-toggle--active" : ""}`} onClick={toggleMusic} aria-pressed={musicPlaying} aria-label={musicPlaying ? "Turn music off" : "Turn music on"}>
            <span className="music-toggle__panel" aria-hidden="true"><span className="music-toggle__waveform">{Array.from({ length: 17 }, (_, index) => <i key={index} />)}</span></span>
            <span className="music-toggle__state">({musicPlaying ? "ON" : "OFF"})</span>
          </button>
          <button className="participant-trigger" onClick={() => openAuthPanel("participant-login")} aria-label={participantTeam ? `Signed in as ${participantTeam.teamName}` : "Open participant login"}>
            <UsersRound size={16} aria-hidden="true" /><span className="header-action__label">{participantTeam ? "TEAM / ON" : "TEAM LOGIN"}</span>
          </button>
          <button className="admin-switch" onClick={() => openAuthPanel("admin")} aria-label="Open admin login"><Shield size={16} aria-hidden="true" /><span className="header-action__label">ADMIN</span></button>
        </div>
      </header>
      <div className="menu-rail">
        <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <span className="menu-trigger__word">MENU</span>
          <span className="menu-trigger__icon"><Menu size={22} strokeWidth={1.8} /></span>
        </button>
      </div>

      <div className={`auth-panel-backdrop ${authPanel ? "auth-panel-backdrop--open" : ""}`} onClick={() => setAuthPanel(null)} aria-hidden={!authPanel} />
      <aside className={`auth-panel ${authPanel ? "auth-panel--open" : ""}`} aria-hidden={!authPanel} aria-label="Account access panel">
        <div className="auth-panel__topline"><span>ACCESS / {authPanel === "admin" ? "OWNER" : "PARTICIPANT"}</span><button onClick={() => setAuthPanel(null)} aria-label="Close account access"><X size={22} /></button></div>
        {authPanel === "admin" ? (
          <div className="auth-panel__body">
            <SectionLabel number="A1">ADMIN SWITCH</SectionLabel>
            <h2>Owner<br /><span>access.</span></h2>
            <p className="auth-panel__intro">Admin access is linked to the existing TAM-VIT owner account. No separate admin password is stored in this app.</p>
            {ownerUser?.role === "admin" ? <div className="auth-panel__owner-card"><span>OWNER SESSION ACTIVE</span><strong>{ownerUser.name || ownerUser.email || "TAM-VIT owner"}</strong><small>{ownerUser.email || "Role verified by Manus OAuth"}</small></div> : <><p className="auth-panel__intro">{ownerUser ? "This account is not marked as the TAM-VIT owner. Switch to the owner account to continue." : "Continue to the existing TAM-VIT owner sign-in. Admin access is granted only when that account carries the admin role."}</p><button className="auth-panel__submit" onClick={() => startLogin()}>CONTINUE WITH OWNER SIGN IN <ArrowUpRight size={18} /></button></>}
          </div>
        ) : (
          <div className="auth-panel__body">
            <SectionLabel number="A0">TEAM ACCESS</SectionLabel>
            <h2>{authPanel === "participant-register" ? <>Register<br /><span>your team.</span></> : <>Welcome<br /><span>back.</span></>}</h2>
            <p className="auth-panel__intro">Use your team ID and password to enter the participant area. Team names are checked for duplicates during registration.</p>
            <form className="auth-form" onSubmit={submitParticipantAuth}>
              <label>TEAM ID<input value={teamIdInput} onChange={(event) => setTeamIdInput(event.target.value)} placeholder="team-alpha" autoComplete="username" required /></label>
              {authPanel === "participant-register" && <label>TEAM NAME<input value={teamNameInput} onChange={(event) => setTeamNameInput(event.target.value)} placeholder="Team Alpha" autoComplete="organization" required /></label>}
              <label>PASSWORD<input type="password" value={teamPasswordInput} onChange={(event) => setTeamPasswordInput(event.target.value)} placeholder="Minimum 8 characters" autoComplete={authPanel === "participant-register" ? "new-password" : "current-password"} required /></label>
              <button className="auth-panel__submit" type="submit" disabled={teamRegisterMutation.isPending || teamLoginMutation.isPending}>{teamRegisterMutation.isPending || teamLoginMutation.isPending ? "WORKING..." : authPanel === "participant-register" ? "REGISTER TEAM" : "SIGN IN"} <ArrowUpRight size={18} /></button>
            </form>
            {authMessage && <p className="auth-panel__message" role="status">{authMessage}</p>}
            <button className="auth-panel__switch" onClick={() => openAuthPanel(authPanel === "participant-register" ? "participant-login" : "participant-register")}>{authPanel === "participant-register" ? "Already have a team? Sign in" : "New team? Register here"}</button>
          </div>
        )}
      </aside>

      <div className={`menu-panel ${menuOpen ? "menu-panel--open" : ""}`} aria-hidden={!menuOpen}>
        <div className="menu-panel__topline">
          <Mark compact />
          <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
            <span>CLOSE</span><X size={24} strokeWidth={1.6} />
          </button>
        </div>
        <div className="menu-panel__body">
          <span className="menu-panel__side-note">NAV / CODE CORTEX</span>
          <nav className="menu-panel__nav">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <a href={item.href} key={item.href} onClick={(event) => { event.preventDefault(); jumpTo(item.href); }}>
                  <span className="menu-panel__index">0{index + 1}</span>
                  <Icon className="menu-panel__item-icon" size={22} strokeWidth={1.6} aria-hidden="true" />
                  <span className="menu-panel__item-label">{item.label}</span>
                  <ArrowUpRight className="menu-panel__item-arrow" size={22} strokeWidth={1.4} />
                </a>
              );
            })}
          </nav>
        </div>
        <div className="menu-panel__footer"><span>30 HOURS / ONE BIG IDEA</span><span>TAM-VIT · 2026</span></div>
      </div>

      <main>
        <section id="home" className="hero section-dark">
          <div className="hero__noise" />
          <div className="hero__grid" />
          <div className="hero__topline page-pad">
            <span>TAM-VIT</span>
            <span>TAM-VIT / INDIA</span>
          </div>
          <div className={`hero__mascot ${scrolled ? "hero__mascot--hidden" : ""}`} aria-hidden="true" onPointerMove={(event) => { if (!scrolled && !coarsePointer) setMascotPointer({ x: (event.clientX / window.innerWidth - 0.5) * 2, y: (event.clientY / window.innerHeight - 0.5) * 2 }); }}>
            <Canvas camera={{ position: [0, 0.15, 4.5], fov: 35 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
              <ambientLight intensity={1.8} />
              <directionalLight position={[2, 3, 4]} intensity={2.5} color="#48d9ff" />
              <directionalLight position={[-3, 1, 2]} intensity={1.4} color="#d9f45b" />
              <Suspense fallback={<MascotFallback />}><MascotModel pointer={mascotPointer} reducedMotion={reducedMotion || coarsePointer} /></Suspense>
            </Canvas>
          </div>
          <div className="hero__copy page-pad">
            <p className="eyebrow eyebrow--bright"><span className="eyebrow__pulse" /> 30 HOURS / ONE IDEA / ZERO LIMITS</p>
            <img className="hero__logo" src={codeCortexLogo} alt="Code cortex 3.0" />
              <div className="hero__headline-row">
              <div className="heading-with-icon heading-with-icon--hero"><HeadingIcon icon={HomeIcon} label="Home" /><h1>30 Hours.<br /><em>One Idea.<br />Zero Limits.</em></h1></div>
              <a className="round-cta" href="#tracks" onClick={(event) => { event.preventDefault(); jumpTo("#tracks"); }}>
                <span>Explore<br />Tracks</span> <ArrowUpRight size={22} />
              </a>
            </div>
          </div>
          <div className="hero__orb hero__orb--one" />
          <div className="hero__orb hero__orb--two" />
          <div className="hero__stamp"><span>MAKE</span><span>IT</span><span>WEIRD</span></div>
          <div className="hero__bottom page-pad">
            <a className="scroll-cue" href="#about"><span className="scroll-cue__line" /> Scroll to explore</a>
            <span className="hero__location">// 30 HOURS / ONE IDEA / ZERO LIMITS</span>
          </div>
        </section>

        <TransitionRibbons />

        <section id="about" className="about section-light page-pad" data-reveal>
          <div className="about__intro">
            <SectionLabel number="01">ABOUT THE JAM</SectionLabel>
            <div className="heading-with-icon"><HeadingIcon icon={Info} label="About" /><h2>The build<br /><span>starts here.</span></h2></div>
            <p className="lead-copy">A high-energy 30 hour hackathon fostering innovation and collaboration, where participants address real-world challenges, showcase their coding skills, and develop groundbreaking solutions, judged by industry experts.</p>
            <a className="text-link" href="#tracks" onClick={(event) => { event.preventDefault(); jumpTo("#tracks"); }}>Find your track <ArrowRight size={18} /></a>
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
              <img src={orbitArt} alt="Abstract wireframe sphere" />
              <span className="map-card__caption">A SMALL DOT<br />WITH BIG IDEAS</span>
            </div>
          </div>
        </section>

        <section className="manifesto section-dark page-pad" data-reveal>
          <div className="manifesto__side"><GridDoodle /></div>
          <div className="manifesto__content">
            <SectionLabel number="02">WHO WE ARE</SectionLabel>
            <div className="manifesto__columns">
              <div>
                <div className="heading-with-icon"><HeadingIcon icon={Sparkles} label="Who we are" /><h2>Curiosity<br /><span>with a deadline.</span></h2></div>
              </div>
              <div>
                <p>The AI &amp; ML Club is a student-led initiative committed to exploring the transformative potential of AI and ML across diverse domains such as healthcare, finance, and education. Through interactive workshops, seminars with industry professionals, and hands-on projects, we empower students to deepen their technical knowledge, solve real-world challenges, and drive innovation.</p>
                <p>Together, we aim to shape the future of technology while fostering collaboration and a passion for AI and ML. Our mission is to educate, inspire, and support students in pursuing their passion for AI and ML, providing a platform to grow, innovate, make meaningful contributions, and to be a part of something extraordinary.</p>
                <span className="manifesto__signature">TAM-VIT / 2026</span>
              </div>
            </div>
          </div>
        </section>

        <section className="duo-story page-pad" data-reveal>
          <article className="duo-card duo-card--vit">
            <div className="duo-card__top"><SectionLabel number="03">ABOUT VIT</SectionLabel><Globe size={24} /></div>
            <h3>A campus<br />with <em>range.</em></h3>
            <p><strong>Renowned Institution.</strong> VIT is a distinguished private university renowned for delivering world-class engineering education, pioneering technological innovation, and conducting cutting-edge research.</p>
            <p><strong>Top Ranked.</strong> VIT holds the 9th position nationally according to NIRF, ranks 11th in India for Engineering and 150th in Asia per QS World Rankings, and maintains a distinguished NAAC A++ accreditation with a score of 3.66/4.0.</p>
            <span className="duo-card__footer">12°58′N / 79°09′E <ArrowUpRight size={18} /></span>
          </article>
          <article className="duo-card duo-card--gdg">
            <div className="duo-card__top"><SectionLabel number="04">ABOUT TAM-VIT</SectionLabel><Cpu size={24} /></div>
            <h3>Build<br /><em>together.</em></h3>
            <p>People with different tabs open in their heads, making room for one another at the same table. That is the whole point.</p>
            <span className="duo-card__footer">COMMUNITY / ALWAYS OPEN <ArrowUpRight size={18} /></span>
          </article>
        </section>

        <section id="tracks" className="tracks section-blue page-pad" data-reveal>
          <div className="tracks__header">
            <SectionLabel number="05">PICK A DIRECTION</SectionLabel>
            <div className="tracks__arrows"><button onClick={() => moveTrack(-1)} aria-label="Previous track"><ChevronLeft /></button><button onClick={() => moveTrack(1)} aria-label="Next track"><ChevronRight /></button></div>
          </div>
          <div className="tracks__title-row"><div className="heading-with-icon"><HeadingIcon icon={Layers} label="Tracks" /><h2>Five ways<br /><span>to go deep.</span></h2></div><p>Follow the thing you cannot stop thinking about. Every track is a different excuse to make something useful, expressive, or beautifully unnecessary.</p></div>
          <div className="tracks__canvas">
            <div className="tracks__object-image"><img src={trackArt} alt="Abstract collection of track objects" /></div>
            <div className="tracks__active-card">
              <div className="tracks__active-card-top"><span>{activeTrack.eyebrow}</span><span>{activeTrack.sponsor}</span></div>
              <TrackGlyph track={activeTrack} large />
              <h3>{activeTrack.name}</h3>
              <p>{activeTrack.description}</p>
              <a className="text-link text-link--dark" href="#faqs" onClick={(event) => { event.preventDefault(); jumpTo("#faqs"); }}>Read the brief <ArrowUpRight size={18} /></a>
            </div>
          </div>
          <div className="tracks__rail" role="tablist" aria-label="Hackathon tracks">
            {tracks.map((track, index) => (
              <button key={track.name} className={`track-tab track-tab--${track.color} ${index === trackIndex ? "track-tab--active" : ""}`} onClick={() => setTrackIndex(index)} role="tab" aria-selected={index === trackIndex}>
                <span className="track-tab__number">0{index + 1}</span><span>{track.name}</span><ArrowUpRight size={17} />
              </button>
            ))}
          </div>
          <div className="tracks__dots">{tracks.map((track, index) => <button key={track.name} className={index === trackIndex ? "is-active" : ""} onClick={() => setTrackIndex(index)} aria-label={`Go to track ${index + 1}`} />)}</div>
        </section>

        <section id="nominate" className="nominate section-dark page-pad" data-reveal>
          <div className="nominate__header"><SectionLabel number="06">THE IN-BETWEEN SET</SectionLabel><span className="nominate__live"><span /> LIVE NOMINATION</span></div>
          <div className="nominate__title-row"><div className="heading-with-icon"><HeadingIcon icon={Music2} label="Nominate" /><h2>Pick the next<br /><span>soundtrack.</span></h2></div><div><p>What should carry us through the next build sprint? Vote for one mood. The room gets the final call when the playlist changes.</p><p className="nominate__note"><Music2 size={16} /> Voting is saved on this device.</p></div></div>
          <div className="nominate__grid">
            {nominationOptions.map((option) => {
              const totalVotes = Object.values(nominationVotes).reduce((sum, value) => sum + value, 0);
              const percent = Math.round((nominationVotes[option.id] / totalVotes) * 100);
              const isSelected = selectedNomination === option.id;
              return (
                <button key={option.id} className={`nomination-card nomination-card--${option.color} ${isSelected ? "nomination-card--selected" : ""}`} onClick={() => voteForSong(option.id)} disabled={hasVoted} aria-pressed={isSelected}>
                  <span className="nomination-card__top"><span>0{nominationOptions.indexOf(option) + 1}</span><span>{isSelected ? "YOUR PICK" : "NOMINATE"}</span></span>
                  <span className="nomination-card__title">{option.title}</span>
                  <span className="nomination-card__note">{option.note}</span>
                  <span className="nomination-card__bar"><span style={{ width: `${percent}%` }} /></span>
                  <span className="nomination-card__bottom"><span>{nominationVotes[option.id]} votes</span><strong>{percent}%</strong></span>
                </button>
              );
            })}
          </div>
          <div className="nominate__footer"><span>{hasVoted ? "Your nomination is locked in. Let the room decide." : "Choose one to cast your vote."}</span><span>04 OPTIONS / 01 CHOICE</span></div>
        </section>

        <section id="gallery" className="events section-light page-pad" data-reveal>
          <div className="events__header"><SectionLabel number="07">BEFORE THE JAM</SectionLabel><span className="events__header-note">A LITTLE ARCHIVE / BIG ENERGY</span></div>
          <div className="events__title-row"><div className="heading-with-icon"><HeadingIcon icon={ImageIcon} label="Gallery" /><h2>We’ve been<br /><span>busy.</span></h2></div><p>Three past builds. A growing archive of proof that the most interesting work starts before anybody knows what to call it.</p></div>
          <div className="event-grid">
            <article className="event-card event-card--triangle"><div className="event-card__shape event-card__shape--triangle">△</div><div className="event-card__meta"><span>PAST EVENT / 01</span><ArrowUpRight size={19} /></div><h3>Bida<br />thon</h3><p>A fast-moving build where ideas compete, evolve, and find their sharpest form.</p></article>
            <article className="event-card event-card--circle"><div className="event-card__shape event-card__shape--circle">◎</div><img className="event-card__cover" src="/manus-storage/data-alchemy-cover_5c835fc4.webp" alt="TAM-VIT team gathered in a classroom for Data Alchemy" loading="lazy" /><div className="event-card__meta"><span>PAST EVENT / 02</span><ArrowUpRight size={19} /></div><h3>Data<br />Alchemy</h3><p>Turn messy questions into clear insights, useful tools, and unexpected directions.</p></article>
            <article className="event-card event-card--flower"><div className="event-card__shape event-card__shape--flower">✽</div><div className="event-card__meta"><span>PAST EVENT / 03</span><ArrowUpRight size={19} /></div><h3>Red<br />handed</h3><p>A sharp, playful challenge for fast thinking and ideas that leave a mark.</p></article>
          </div>
        </section>

        <section id="sponsors" className="sponsors section-dark page-pad" data-reveal>
          <div className="sponsors__header"><SectionLabel number="08">POWERED BY</SectionLabel><span>THANK YOU, INTERNET</span></div>
          <div className="sponsors__title-row"><div className="heading-with-icon"><HeadingIcon icon={HandHeart} label="Sponsors" /><h2>Good ideas<br /><span>need friends.</span></h2></div><p>We are grateful to the teams that make room for new builders, new questions, and the occasional delightfully over-engineered side project.</p></div>
          <div className="sponsor-grid">
            <a className="sponsor-card sponsor-card--polyfab" href="https://polyfab.co.in/" target="_blank" rel="noreferrer" aria-label="Visit POLYFAB website">
              <span className="sponsor-card__rank">OFFICIAL SPONSOR</span>
              <img className="sponsor-card__logo" src={polyfabLogo} alt="POLYFAB" />
              <span className="sponsor-card__name">POLYFAB</span>
              <span className="sponsor-card__arrow"><ArrowUpRight /></span>
            </a>
          </div>
          <div className="sponsors__sun"><span>THE<br />SUN IS<br />ON.</span></div>
        </section>

        <section id="faqs" className="faq section-light page-pad" data-reveal>
          <div className="faq__side"><SectionLabel number="09">NO SILLY QUESTIONS</SectionLabel><div className="heading-with-icon"><HeadingIcon icon={HelpCircle} label="FAQs" /><h2>Let’s break<br /><span>it down.</span></h2></div><p>Still curious? That is a good sign. Pick a tab and find the practical bits.</p><div className="faq__doodle"><span>?</span><span>!</span><span>↗</span></div></div>
          <div className="faq__main">
            <div className="faq__tabs">{(Object.keys(faqs) as Array<keyof typeof faqs>).map((mode) => <button key={mode} className={faqMode === mode ? "is-active" : ""} onClick={() => { setFaqMode(mode); setFaqOpen(0); }}>{mode}</button>)}</div>
            <div className="faq__list">{faqItems.map(([question, answer], index) => <div className={`faq-item ${faqOpen === index ? "faq-item--open" : ""}`} key={question}><button onClick={() => setFaqOpen(faqOpen === index ? -1 : index)} aria-expanded={faqOpen === index}><span>0{index + 1}</span><strong>{question}</strong><ChevronDown size={21} /></button><div className="faq-item__answer"><p>{answer}</p></div></div>)}</div>
            <a className="discord-link" href="#contact" onClick={(event) => { event.preventDefault(); jumpTo("#contact"); }}>For more queries, raise a ticket on Discord <ArrowUpRight size={18} /></a>
          </div>
        </section>
      </main>

      <footer id="contact" className="footer section-dark page-pad" data-reveal>
        <div className="footer__main"><div className="footer__statement"><SectionLabel number="10">SAY HELLO</SectionLabel><div className="heading-with-icon"><HeadingIcon icon={Mail} label="Contact" /><h2>Let’s explore<br /><span>stack<span className="footer__cursor">→</span></span></h2></div></div><div className="footer__contact"><a href="mailto:varshithisworking@gmail.com"><Mail size={17} /> varshithisworking@gmail.com</a><a href="tel:+919686352426"><Phone size={17} /> +91 96863 52426</a><a href="mailto:reenubiju10@gmail.com"><Mail size={17} /> reenubiju10@gmail.com</a><a href="tel:+919656463672"><Phone size={17} /> +91 96564 63672</a></div></div>
          <StackShowcase />
          <div className="footer__bottom"><div className="footer__brand-lockup"><Mark compact /><img src={codeCortexLogo} alt="Code cortex 3.0" /></div><div className="footer__socials"><a href="https://www.instagram.com/tam.vit_vellore?igsi=ZDNlZDc0MzIxNw==" target="_blank" rel="noreferrer" aria-label="TAM on Instagram"><Instagram size={20} /></a><a href="https://github.com/Tam" target="_blank" rel="noreferrer" aria-label="TAM on GitHub"><Github size={20} /></a><a href="https://www.linkedin.com/company/tamsystems" target="_blank" rel="noreferrer" aria-label="TAM on LinkedIn"><Linkedin size={20} /></a></div><span className="footer__legal">© 2026 TAM-VIT / BUILT WITH TOO MUCH COFFEE</span></div>
      </footer>
    </div>
  );
}
