// Design direction: playful digital maximalism — midnight navy, electric cyan, cobalt, coral, citrus, oversized display type, layered objects, and tactile controls.
import { trpc } from "@/lib/trpc";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, ContactShadows, Float } from "@react-three/drei";
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
const codeCortexLogo = "/code-cortex-logo.png";
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
    tag: "CURRENCY & ECONOMY",
    catImage: "/cat_coins.png",
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
    tag: "HEALTH & HEALING",
    catImage: "/cat_drink.png",
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
    tag: "AUTONOMOUS FLIGHT",
    catImage: "/cat_rocket.png",
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
    tag: "CYBER & DEFENSE",
    catImage: "/cat_standing.png",
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
    tag: "UNBOUNDED REALM",
    catImage: "/cat_walk.png",
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
      className={compact ? "brand brand--compact" : "brand brand--pixel-flashy"}
      href="#home"
      aria-label="Code cortex home"
    >
      <div className="brand-logo-frame">
        <span className="brand-sparkle-star">✦</span>
        <img src={tamWhiteLogo} alt="TAM" className="brand__tam-logo" />
      </div>
      <span className="brand__copy">
        <span className="brand__top">TAM-VIT</span>
        <span className="brand__bottom">THE AI & ML CLUB</span>
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
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(tamMascot);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (actions && !reducedMotion) {
      Object.values(actions).forEach((action) => {
        action?.reset().play();
      });
    }
  }, [actions, reducedMotion]);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 2.45 / Math.max(size.x, size.y, size.z, 0.001);
    clone.position.sub(center);
    clone.scale.setScalar(scale);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.roughness = Math.min(mat.roughness ?? 0.5, 0.52);
          mat.metalness = Math.max(mat.metalness ?? 0.2, 0.22);
        }
      }
    });

    return clone;
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;
    // Natural 3D isometric orientation so facets, bevels, top crest, and side bolts pop:
    const idleAngleY = 0.16;
    const idleAngleX = 0.06;
    const targetX = reducedMotion
      ? idleAngleX
      : idleAngleX + THREE.MathUtils.clamp(pointer.y * 0.35, -0.38, 0.38);
    const targetY = reducedMotion
      ? idleAngleY
      : idleAngleY + THREE.MathUtils.clamp(pointer.x * 0.45, -0.48, 0.48);
    const targetZ = reducedMotion
      ? 0
      : THREE.MathUtils.clamp(pointer.x * -0.1, -0.12, 0.12);

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      0.09,
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      0.09,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetZ,
      0.09,
    );
  });

  return (
    <group ref={groupRef} position={[0, 0.06, 0]}>
      <primitive object={model} />
    </group>
  );
}

function MascotFallback() {
  return (
    <mesh position={[0, 0, 0]}>
      <icosahedronGeometry args={[1.25, 2]} />
      <meshStandardMaterial
        color="#caa6fe"
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
    "THE AI & ML CLUB",
    "TAM",
    "THE AI & ML CLUB",
    "TAM",
    "THE AI & ML CLUB",
  ];
  const codeMarks = [
    "CODE CORTEX 3.0",
    "CODE CORTEX 3.0",
    "CODE CORTEX 3.0",
    "CODE CORTEX 3.0",
  ];
  return (
    <div
      className="transition-ribbons"
      aria-label="TAM The AI & ML Club and Code Cortex"
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

const CAMPFIRE_TOASTS = [
  "🪵 Stoked the fire! Crackle crackle ⚡",
  "✨ Rested by the fire. HP & Mana restored!",
  "🔥 Sparks swirl into the midnight sky ✨",
  "☕ Brewing warm coffee by the embers ☕",
  "🏕️ Safety checkpoint saved // Ready to hack!",
  "🌲 Pine trees rustling in the night breeze...",
];

function CampfireNightScene() {
  const [warmth, setWarmth] = useState(100);
  const [burstKey, setBurstKey] = useState(0);
  const [toastIndex, setToastIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleStoke = () => {
    setWarmth((prev) => (prev >= 180 ? 100 : prev + 15));
    setToastIndex((prev) => (prev + 1) % CAMPFIRE_TOASTS.length);
    setShowToast(true);
    setBurstKey((prev) => prev + 1);
  };

  return (
    <div
      className={`campfire-night-station ${isHovered ? "campfire-night-station--glow" : ""}`}
      role="region"
      aria-label="Interactive pixel art campfire in the pine forest with crackling flames and swaying trees"
      onClick={handleStoke}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Station HUD */}
      <div className="campfire-hud">
        <div className="campfire-hud__tag">
          <span className="campfire-hud-dot" />
          <span>CC_CAMPFIRE // REST_POINT</span>
        </div>
        <div className="campfire-hud__stats">
          <span className="campfire-hud-chip" title="Click to stoke the fire!">
            ♨️ {warmth}% WARMTH
          </span>
          <span className="campfire-hud-chip campfire-hud-chip--weather">
            🍃 BREEZY
          </span>
        </div>
      </div>

      {/* Main Pixel Canvas Wrapper */}
      <div className="campfire-stage">
        {/* Interactive Speech / Status Toast */}
        {showToast && (
          <div className="campfire-toast" key={burstKey}>
            <span>{CAMPFIRE_TOASTS[toastIndex]}</span>
          </div>
        )}

        {/* Base Campfire Pixel Artwork */}
        <div className="campfire-img-container">
          <img
            className="campfire-img"
            src="/campfire_scene.png"
            alt="Pixel campfire in a starry pine forest"
            width={736}
            height={736}
            loading="lazy"
          />

          {/* Twinkling Pixel Stars in Night Canopy */}
          <div className="campfire-stars-layer" aria-hidden="true">
            <span className="campfire-star star-1" />
            <span className="campfire-star star-2" />
            <span className="campfire-star star-3" />
            <span className="campfire-star star-4" />
            <span className="campfire-star star-5" />
          </div>

          {/* Left Forest Tree Sway Silhouette / Light Overlay */}
          <div className="campfire-trees-sway campfire-trees-sway--left" aria-hidden="true" />

          {/* Right Forest Tree Sway Silhouette / Light Overlay */}
          <div className="campfire-trees-sway campfire-trees-sway--right" aria-hidden="true" />

          {/* Wind Breeze Streaks */}
          <div className="campfire-breeze" aria-hidden="true">
            <span className="breeze-line breeze-1" />
            <span className="breeze-line breeze-2" />
          </div>

          {/* Warm Hearth Ground Illumination Glow */}
          <div className="campfire-hearth-glow" aria-hidden="true" />

          {/* Animated Crackling Pixel Flame Tongue Core */}
          <div className="campfire-flame-core" aria-hidden="true">
            <div className="flame-tongue flame-tongue--outer" />
            <div className="flame-tongue flame-tongue--inner" />
            <div className="flame-spark-core" />
          </div>

          {/* Continuously Rising Pixel Embers & Sparks */}
          <div className="campfire-embers-stream" aria-hidden="true">
            <span className="campfire-ember ember-1" />
            <span className="campfire-ember ember-2" />
            <span className="campfire-ember ember-3" />
            <span className="campfire-ember ember-4" />
            <span className="campfire-ember ember-5" />
            <span className="campfire-ember ember-6" />
            <span className="campfire-ember ember-7" />
            <span className="campfire-ember ember-8" />
          </div>

          {/* Stoke Burst Sparks (active when clicked) */}
          {burstKey > 0 && (
            <div className="campfire-burst-sparks" key={burstKey} aria-hidden="true">
              <span className="burst-spark spark-a" />
              <span className="burst-spark spark-b" />
              <span className="burst-spark spark-c" />
              <span className="burst-spark spark-d" />
              <span className="burst-spark spark-e" />
              <span className="burst-spark spark-f" />
            </div>
          )}
        </div>

        {/* Hover Cue Hint */}
        <div className="campfire-click-cue" aria-hidden="true">
          🪵 CLICK TO STOKE FIRE (+WARMTH)
        </div>
      </div>
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

function BuilderForgeAnimation() {
  return (
    <div
      className="builder-forge-stage"
      role="img"
      aria-label="Pixel builder animated in a 4-frame loop swinging a pickaxe to break and fracture a laptop"
    >
      <div className="forge-hud">
        <span>⚡ TAM BUILDER // BREAK_HARDWARE.EXE</span>
        <div className="forge-hud__live">
          <div className="forge-hud__live-dot" />
          <span>FORGE ACTIVE</span>
        </div>
      </div>

      <div className="forge-ground" />
      <div className="forge-desk" />

      <div className="forge-actor">
        <img
          className="forge-actor__sprite"
          src="/builder_sprite.png"
          alt="TAM Builder"
          width="145"
          height="275"
          loading="lazy"
        />
        <div className="forge-pickaxe">
          <img
            src="/pickaxe_sprite.png"
            alt="Pickaxe"
            width="110"
            height="110"
            loading="lazy"
          />
        </div>
      </div>

      <div className="forge-target">
        <img
          className="forge-target__laptop forge-target__laptop--pristine"
          src="/laptop_sprite.png"
          alt="Laptop Intact"
          width="185"
          height="160"
          loading="lazy"
        />
        <img
          className="forge-target__laptop forge-target__laptop--cracked"
          src="/laptop_cracked_sprite.png"
          alt="Laptop Cracked"
          width="185"
          height="160"
          loading="lazy"
        />
      </div>

      <div className="forge-impact">
        <svg viewBox="0 0 100 100" fill="none">
          <polygon
            points="50,5 62,35 95,25 72,50 95,75 62,65 50,95 38,65 5,75 28,50 5,25 38,35"
            fill="#fde047"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <polygon
            points="50,20 58,40 80,35 65,50 80,65 58,60 50,80 42,60 20,65 35,50 20,35 42,40"
            fill="#f97316"
          />
        </svg>
      </div>

      <div className="forge-sparks">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <rect x="5" y="10" width="4" height="4" fill="#67e8f9" />
          <rect x="25" y="5" width="5" height="5" fill="#fde047" />
          <rect x="30" y="25" width="4" height="4" fill="#ffffff" />
          <rect x="12" y="28" width="5" height="5" fill="#f97316" />
        </svg>
      </div>

      <div className="forge-caption">
        <span>BUILD_CYCLE // 4 FRAMES</span>
        <span>STATUS: REPEAT LOOP ⚡</span>
      </div>
    </div>
  );
}

function WizardOverworldScene() {
  return (
    <div
      className="wizard-overworld-scene"
      role="img"
      aria-label="Pixelated wizard roaming in an open grassy field with animated flying birds, swaying grass, and wildflowers"
    >
      {/* Flying Pixel Birds */}
      <div className="overworld-birds" aria-hidden="true">
        <div className="pixel-bird pixel-bird--one">
          <svg className="bird-svg" viewBox="0 0 24 14" fill="none">
            <rect x="0" y="2" width="4" height="3" fill="#1e293b" />
            <rect x="4" y="0" width="4" height="3" fill="#1e293b" />
            <rect x="8" y="3" width="8" height="5" fill="#334155" />
            <rect x="16" y="0" width="4" height="3" fill="#1e293b" />
            <rect x="20" y="2" width="4" height="3" fill="#1e293b" />
            <rect x="11" y="8" width="4" height="4" fill="#0f172a" />
          </svg>
        </div>
        <div className="pixel-bird pixel-bird--two">
          <svg className="bird-svg" viewBox="0 0 24 14" fill="none">
            <rect x="0" y="2" width="4" height="3" fill="#334155" />
            <rect x="4" y="0" width="4" height="3" fill="#334155" />
            <rect x="8" y="3" width="8" height="5" fill="#475569" />
            <rect x="16" y="0" width="4" height="3" fill="#334155" />
            <rect x="20" y="2" width="4" height="3" fill="#334155" />
            <rect x="11" y="8" width="4" height="4" fill="#1e293b" />
          </svg>
        </div>
      </div>

      {/* Drifting Leaves / Wind Particles */}
      <div className="overworld-particle leaf--1" aria-hidden="true" />
      <div className="overworld-particle leaf--2" aria-hidden="true" />
      <div className="overworld-particle leaf--3" aria-hidden="true" />

      {/* Ground Dotted Pixel Path */}
      <div className="overworld-ground" aria-hidden="true" />

      {/* Swaying Pixel Grass Tufts */}
      <div className="overworld-grass-layer" aria-hidden="true">
        <svg className="grass-tuft grass-tuft--1" width="28" height="24" viewBox="0 0 28 24">
          <rect x="2" y="10" width="4" height="14" fill="#65a30d" />
          <rect x="6" y="4" width="4" height="20" fill="#84cc16" />
          <rect x="10" y="0" width="4" height="24" fill="#4d7c0f" />
          <rect x="14" y="6" width="4" height="18" fill="#84cc16" />
          <rect x="18" y="12" width="4" height="12" fill="#65a30d" />
        </svg>

        <svg className="grass-tuft grass-tuft--2" width="24" height="20" viewBox="0 0 24 20">
          <rect x="0" y="8" width="4" height="12" fill="#4d7c0f" />
          <rect x="4" y="2" width="4" height="18" fill="#84cc16" />
          <rect x="8" y="0" width="4" height="20" fill="#65a30d" />
          <rect x="12" y="5" width="4" height="15" fill="#84cc16" />
          <rect x="16" y="10" width="4" height="10" fill="#4d7c0f" />
        </svg>

        <svg className="grass-tuft grass-tuft--3" width="28" height="24" viewBox="0 0 28 24">
          <rect x="2" y="10" width="4" height="14" fill="#65a30d" />
          <rect x="6" y="4" width="4" height="20" fill="#84cc16" />
          <rect x="10" y="0" width="4" height="24" fill="#4d7c0f" />
          <rect x="14" y="6" width="4" height="18" fill="#84cc16" />
          <rect x="18" y="12" width="4" height="12" fill="#65a30d" />
        </svg>

        <svg className="grass-tuft grass-tuft--4" width="24" height="20" viewBox="0 0 24 20">
          <rect x="0" y="8" width="4" height="12" fill="#4d7c0f" />
          <rect x="4" y="2" width="4" height="18" fill="#84cc16" />
          <rect x="8" y="0" width="4" height="20" fill="#65a30d" />
          <rect x="12" y="5" width="4" height="15" fill="#84cc16" />
        </svg>
      </div>

      {/* Swaying Pixel Wildflowers */}
      <svg className="overworld-flower flower--red" width="16" height="26" viewBox="0 0 16 26" aria-hidden="true">
        <rect x="6" y="12" width="3" height="14" fill="#65a30d" />
        <rect x="2" y="4" width="12" height="8" fill="#f43f5e" />
        <rect x="4" y="2" width="8" height="12" fill="#e11d48" />
        <rect x="6" y="6" width="4" height="4" fill="#fde047" />
      </svg>

      <svg className="overworld-flower flower--blue" width="16" height="24" viewBox="0 0 16 24" aria-hidden="true">
        <rect x="6" y="10" width="3" height="14" fill="#4d7c0f" />
        <rect x="2" y="4" width="12" height="8" fill="#38bdf8" />
        <rect x="4" y="2" width="8" height="12" fill="#0284c7" />
        <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
      </svg>

      <svg className="overworld-flower flower--gold" width="16" height="25" viewBox="0 0 16 25" aria-hidden="true">
        <rect x="6" y="11" width="3" height="14" fill="#65a30d" />
        <rect x="2" y="4" width="12" height="8" fill="#fbbf24" />
        <rect x="4" y="2" width="8" height="12" fill="#f59e0b" />
        <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
      </svg>

      {/* The Roaming Pixel Wizard */}
      <div className="wizard-actor">
        <div className="wizard-interact-bubble">✦ TALK [E]</div>
        <img
          className="wizard-sprite-img"
          src="/wizard_sprite.png"
          alt="Mentor Archie Pixel Wizard"
          width="145"
          height="182"
          loading="lazy"
        />

        {/* Staff tip magic spark pulse */}
        <div className="wizard-staff-magic" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <polygon points="10,0 12,7 19,10 12,13 10,20 8,13 1,10 8,7" fill="#67e8f9" />
            <circle cx="10" cy="10" r="3" fill="#ffffff" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const CAT_DIALOGUES = [
  "meow(); // compiling code... 🐾",
  "it works on my machine! 💻",
  "coffee -> code -> repeat ☕",
  "git commit -m 'fixed bugs with paws' 🚀",
  "30-hr hackathon? plenty of nap time 💤",
  "purr-fect build detected! ✨",
  "debugging at 3 AM with 100% caffeine ⚡",
];

function CoderCatStation() {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const [coffeeCount, setCoffeeCount] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const handleCatClick = () => {
    setDialogueIndex((prev) => (prev + 1) % CAT_DIALOGUES.length);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 260);
  };

  const handleCoffeeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoffeeCount((prev) => prev + 1);
  };

  return (
    <div
      className={`coder-cat-station ${isHovered ? "coder-cat-station--turbo" : ""}`}
      role="region"
      aria-label="Interactive pixel art dev cat coding at computer desk"
      onClick={handleCatClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Station HUD Header */}
      <div className="cat-station-hud">
        <div className="cat-station-hud__tag">
          <span className="cat-hud-dot" />
          <span>CC_DEV_CAT.EXE // ACTIVE</span>
        </div>
        <div className="cat-station-hud__stats">
          <span className="cat-hud-chip" onClick={handleCoffeeClick} title="Click to sip coffee!">
            ☕ {coffeeCount} CUPS
          </span>
          <span className="cat-hud-chip cat-hud-chip--speed">
            {isHovered ? "⚡ 420 WPM (TURBO)" : "⌨️ 120 WPM"}
          </span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className={`cat-stage ${isBouncing ? "cat-stage--bounce" : ""}`}>
        {/* Interactive Speech Bubble */}
        <div className="cat-speech-bubble" key={dialogueIndex}>
          <span className="cat-speech-bubble__text">{CAT_DIALOGUES[dialogueIndex]}</span>
          <div className="cat-speech-bubble__tail" aria-hidden="true" />
        </div>

        {/* Turbo Mode Badge */}
        {isHovered && (
          <div className="cat-turbo-badge" aria-hidden="true">
            ⚡ TURBO HACKING MODE ACTIVATED!
          </div>
        )}

        {/* Pixel Sprite Canvas Wrapper */}
        <div className="cat-sprite-container">
          <img
            className="cat-sprite-img"
            src="/coder_cat_sprite.png"
            alt="Pixel art dev cat coding on computer"
            width={457}
            height={275}
            loading="lazy"
          />

          {/* Animated Coffee Steam rising from the red mug */}
          <div
            className="cat-coffee-steam-area"
            onClick={handleCoffeeClick}
            title="Sip hot coffee!"
            aria-hidden="true"
          >
            <div className="cat-steam-particle steam-p1" />
            <div className="cat-steam-particle steam-p2" />
            <div className="cat-steam-particle steam-p3" />
          </div>

          {/* CRT Monitor Code Stream Screen */}
          <div className="cat-crt-overlay" aria-hidden="true">
            <div className="cat-crt-scanline" />
            <div className="cat-crt-code">
              <span className="code-line line-1">&gt; hack.ts</span>
              <span className="code-line line-2">&gt; dev 200</span>
              <span className="code-line line-3">&gt; purr()</span>
              <span className="code-line line-4">&gt; pass ⚡</span>
            </div>
            <div className="cat-crt-led" />
          </div>

          {/* Stepped Typing Spark Particles */}
          <div className="cat-typing-sparks" aria-hidden="true">
            <span className="spark spark-1">✦</span>
            <span className="spark spark-2">⚡</span>
            <span className="spark spark-3">✦</span>
          </div>

          {/* Click Hint */}
          <div className="cat-click-cue">
            <span>✦ CLICK CAT TO TALK</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const COFFEE_TOASTS = [
  "☕ Warm sip... HP & focus fully restored! ✨",
  "🎵 Listening to the arcade jukebox beats 🎧",
  "☕ Fresh roast brewed // Ready to hack through the night!",
  "🌿 Cozy tavern rest point unlocked 💤",
  "🥐 Taking five. Breathe in, breathe out...",
  "✨ Steam swirls in the warm morning sunbeam ☀️",
];

function CozyCoffeeScene() {
  const [sips, setSips] = useState(1);
  const [toastIndex, setToastIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleSip = () => {
    setSips((prev) => prev + 1);
    setToastIndex((prev) => (prev + 1) % COFFEE_TOASTS.length);
    setShowToast(true);
    setBurstKey((prev) => prev + 1);
  };

  return (
    <div
      className={`cozy-coffee-station ${isHovered ? "cozy-coffee-station--hover" : ""}`}
      role="region"
      aria-label="Interactive pixel art coffee cup steaming in warm sunlight at the tavern rest point"
      onClick={handleSip}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Station HUD */}
      <div className="cozy-coffee-hud">
        <div className="cozy-coffee-hud__tag">
          <span className="cozy-coffee-hud-dot" />
          <span>☕ TAVERN_CAFE // REST_POINT</span>
        </div>
        <div className="cozy-coffee-hud__stats">
          <span className="cozy-coffee-hud-chip" title="Click to sip coffee!">
            ♨️ {sips} {sips === 1 ? "CUP" : "CUPS"}
          </span>
          <span className="cozy-coffee-hud-chip cozy-coffee-hud-chip--vibes">
            🎵 LO-FI VIBES
          </span>
        </div>
      </div>

      {/* Main Pixel Canvas Wrapper */}
      <div className="cozy-coffee-stage">
        {/* Interactive Speech / Status Toast */}
        {showToast && (
          <div className="cozy-coffee-toast" key={burstKey}>
            <span>{COFFEE_TOASTS[toastIndex]}</span>
          </div>
        )}

        {/* Base Coffee Artwork */}
        <div className="cozy-coffee-img-container">
          <img
            className="cozy-coffee-img"
            src="/cozy_coffee.jpg"
            alt="Pixel art cup of coffee steaming in warm sunlight on a wooden table"
            width={736}
            height={736}
            loading="lazy"
          />

          {/* Warm Sunbeam Ambient Light Sheen */}
          <div className="cozy-coffee-sunbeam-overlay" aria-hidden="true" />

          {/* Floating Sunbeam Dust Motes (Warm golden drifting particles) */}
          <div className="cozy-coffee-motes" aria-hidden="true">
            <span className="coffee-mote mote-1" />
            <span className="coffee-mote mote-2" />
            <span className="coffee-mote mote-3" />
            <span className="coffee-mote mote-4" />
            <span className="coffee-mote mote-5" />
            <span className="coffee-mote mote-6" />
          </div>

          {/* Gentle Rising Steam Plumes */}
          <div className="cozy-coffee-steam" aria-hidden="true">
            <span className="steam-wisp wisp-1" />
            <span className="steam-wisp wisp-2" />
            <span className="steam-wisp wisp-3" />
            <span className="steam-wisp wisp-4" />
            <span className="steam-wisp wisp-5" />
          </div>

          {/* Sip Burst Floating Pill (active when clicked) */}
          {burstKey > 0 && (
            <div className="cozy-coffee-burst" key={burstKey} aria-hidden="true">
              <span className="burst-sip-pill">+1 HP RESTORED ✨</span>
            </div>
          )}
        </div>

        {/* Hover Cue */}
        <div className="cozy-coffee-click-cue" aria-hidden="true">
          ☕ CLICK CUP TO TAKE A SIP (+HP)
        </div>
      </div>
    </div>
  );
}

const FROG_TOASTS = [
  "🐸 *Ribbit!* You tugged the blade... It didn't budge!",
  "⚔️ Ancient guild runes hum softly along the steel ✨",
  "🐸 *happy open-mouth ribbit* The frog approves of your bravery!",
  "🗡️ Guild Master Polyfab forged this sacred blade!",
  "✨ A shimmering emerald sparkle dances across the plinth!",
  "🐸 The guardian frog bestows a lucky clover upon you 🍀",
  "💪 Guild ATK +5! Train on, valiant adventurer!",
];

function FrogShrineScene() {
  const [pulls, setPulls] = useState(0);
  const [toastIndex, setToastIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [isJiggling, setIsJiggling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handlePull = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPulls((prev) => prev + 1);
    setToastIndex((prev) => (prev + 1) % FROG_TOASTS.length);
    setShowToast(true);
    setBurstKey((prev) => prev + 1);
    setIsJiggling(true);
    setTimeout(() => setIsJiggling(false), 450);
  };

  return (
    <div
      className={`frog-shrine ${isHovered ? "frog-shrine--hover" : ""} ${isJiggling ? "frog-shrine--jiggle" : ""}`}
      role="region"
      aria-label="Ancient sword in the stone shrine guarded by a cute green pixel frog"
      onClick={handlePull}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top HUD Bar */}
      <div className="frog-shrine-hud">
        <div className="frog-shrine-hud__tag">
          <span className="frog-shrine-hud-dot" />
          <span>🐸 ANCIENT SHRINE // FROG GUARDIAN</span>
        </div>
        <div className="frog-shrine-hud__stats">
          <span className="frog-shrine-hud-chip" title="Click to attempt drawing the blade!">
            ⚔️ {pulls} {pulls === 1 ? "PULL" : "PULLS"}
          </span>
          <span className="frog-shrine-hud-chip frog-shrine-hud-chip--relic">
            ✨ LVL 99
          </span>
        </div>
      </div>

      {/* Main Pixel Canvas Stage */}
      <div className="frog-shrine-stage">
        {/* Floating Dialogue Toast */}
        {showToast && (
          <div className="frog-shrine-toast" key={burstKey}>
            <span>{FROG_TOASTS[toastIndex]}</span>
          </div>
        )}

        {/* Artwork Container */}
        <div className="frog-shrine-img-container">
          <img
            className="frog-shrine-img"
            src="/frog_sword.jpg"
            alt="Pixel art of a legendary sword thrust into a stone plinth guarded by a cute green frog in an enchanted forest"
            width={640}
            height={438}
            loading="lazy"
          />

          {/* Enchanted Forest Sunbeam Light Sweep */}
          <div className="frog-shrine-light-overlay" aria-hidden="true" />

          {/* Shimmering Sword Glint */}
          <div className="frog-shrine-sword-glint" aria-hidden="true" />

          {/* Floating Forest Firefly Motes */}
          <div className="frog-shrine-fireflies" aria-hidden="true">
            <span className="frog-firefly firefly-1" />
            <span className="frog-firefly firefly-2" />
            <span className="frog-firefly firefly-3" />
            <span className="frog-firefly firefly-4" />
          </div>

          {/* Click Burst Pill */}
          {burstKey > 0 && (
            <div className="frog-shrine-burst" key={burstKey} aria-hidden="true">
              <span className="burst-frog-pill">🐸 RIBBIT! +5 ATK ✨</span>
            </div>
          )}
        </div>

        {/* Action Cue / Footer */}
        <div className="frog-shrine-click-cue" aria-hidden="true">
          ⚔️ CLICK TO PULL THE BLADE (RIBBIT!)
        </div>
      </div>
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

  useEffect(() => {
    // A URL hash (e.g. "#tracks" from the root SPA's nav, or from the "View
    // track brief" dashboard link) only auto-scrolls on load for static HTML
    // — this is a client-rendered SPA, so the browser tries to jump to it
    // before React has even mounted the section and gives up. Re-create that
    // jump ourselves, using the exact same smooth scroll as the "Explore
    // Tracks" button (jumpTo) — fired on "load" so the hero's images/3D
    // model have already finished reflowing the page by the time it runs.
    const hash = window.location.hash;
    if (!hash) return;
    const scrollToHash = () => jumpTo(hash);
    if (document.readyState === "complete") {
      const timer = window.setTimeout(scrollToHash, 150);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener("load", scrollToHash);
    return () => window.removeEventListener("load", scrollToHash);
  }, []);

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
      <header
        className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}
      >
        <div className="site-header__left">
          <Mark />
        </div>

        <div className="site-header__center">
          <button
            className={`pixel-cassette ${musicPlaying ? "pixel-cassette--playing" : ""}`}
            onClick={toggleMusic}
            aria-pressed={musicPlaying}
            aria-label={musicPlaying ? "Pause cassette audio" : "Play cassette audio"}
          >
            <div className="cassette-body">
              <div className="cassette-label-strip">
                <span className="cassette-title">SIDE A · BGM</span>
                <span className={`cassette-led ${musicPlaying ? "cassette-led--active" : ""}`} />
              </div>
              <div className="cassette-window">
                <div className={`cassette-spool ${musicPlaying ? "is-spinning" : ""}`}>
                  <span className="spool-core" />
                </div>
                <div className="cassette-tape-roll" />
                <div className={`cassette-spool ${musicPlaying ? "is-spinning" : ""}`}>
                  <span className="spool-core" />
                </div>
              </div>
              <div className="cassette-status">
                {musicPlaying ? "▶ TAPE PLAYING" : "■ TAPE STOPPED"}
              </div>
            </div>
          </button>
        </div>

        <div className="site-header__right">
          <button
            className="pixel-nav-menu-btn"
            onClick={openMenu}
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={2.4} />
            <span>MENU</span>
          </button>
        </div>
      </header>

      <div
        className={`menu-panel ${menuOpen ? "menu-panel--open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="menu-panel__water-bg" aria-hidden="true" />
        <div className="menu-panel__grid-overlay" aria-hidden="true" />
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

          <div className="hero-grid-container page-pad">
            <div className="hero-left-col">
              <div className="hero-ticket-tag">
                <span className="ticket-punch-hole" />
                <span className="ticket-label">EVENT // 30 HOURS · ONE IDEA · ZERO LIMITS</span>
              </div>

              <div className="hero-logo-wrapper">
                <img
                  className="hero__logo"
                  src={codeCortexLogo}
                  alt="Code cortex 3.0"
                />
              </div>

              <div className="hero-headline-block">
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
              </div>

              <div className="hero-actions-row">
                <a
                  className="hero-pixel-btn hero-pixel-btn--primary"
                  href="#tracks"
                  onClick={(event) => {
                    event.preventDefault();
                    jumpTo("#tracks");
                  }}
                >
                  <span>⚔️ EXPLORE TRACKS</span>
                  <ArrowUpRight size={18} />
                </a>
                <a
                  className="hero-pixel-btn hero-pixel-btn--secondary"
                  href={mainAppUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>⚡ TEAM PORTAL</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div className="hero-right-col">
              <div className="retro-pc-monitor">
                <div className="monitor-bezel-top">
                  <span className="monitor-title">★ CC_MASCOT.EXE [BUILD v3.0]</span>
                  <div className="monitor-buttons">
                    <span>_</span>
                    <span>🗖</span>
                    <span>✕</span>
                  </div>
                </div>
                <div
                  className="monitor-screen"
                  aria-hidden="true"
                  onPointerMove={(event) => {
                    if (!scrolled && !coarsePointer) {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setMascotPointer({
                        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
                        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
                      });
                    }
                  }}
                >
                  <div className="screen-scanlines" />
                  <Canvas
                    camera={{ position: [0.15, 0.2, 4.3], fov: 36 }}
                    dpr={[1, 1.5]}
                    gl={{ alpha: true, antialias: true }}
                    shadows
                  >
                    {/* Ambient base fill */}
                    <ambientLight intensity={1.3} color="#d8eff2" />

                    {/* Key light from top-right creating crisp voxel facet highlights */}
                    <directionalLight
                      position={[3.5, 4.5, 3.5]}
                      intensity={3.2}
                      color="#ffffff"
                      castShadow
                    />

                    {/* Fill light from bottom-left */}
                    <directionalLight
                      position={[-3, -0.5, 2.5]}
                      intensity={1.4}
                      color="#9391bc"
                    />

                    {/* Powerful Rim / Backlight carving out 3D silhouette from dark background */}
                    <directionalLight
                      position={[-3.5, 3.5, -2.5]}
                      intensity={4.5}
                      color="#7abcc4"
                    />

                    {/* Top crest rim light for TAM logo */}
                    <directionalLight
                      position={[0, 4, -2]}
                      intensity={3.0}
                      color="#ffffff"
                    />

                    <Suspense fallback={<MascotFallback />}>
                      <Float
                        speed={2.2}
                        rotationIntensity={0.2}
                        floatIntensity={0.35}
                        floatingRange={[-0.07, 0.07]}
                      >
                        <MascotModel
                          pointer={mascotPointer}
                          reducedMotion={reducedMotion || coarsePointer}
                        />
                      </Float>
                      {/* Ground contact shadow providing tangible 3D physical depth */}
                      <ContactShadows
                        position={[0, -1.22, 0]}
                        opacity={0.55}
                        scale={4.2}
                        blur={1.6}
                        far={3.2}
                        color="#2d1f36"
                      />
                    </Suspense>
                  </Canvas>
                </div>
                <div className="monitor-bezel-bottom">
                  <div className="monitor-floppy-slot" />
                  <span className="monitor-brand-badge">TAM-VIT · 2026</span>
                  <div className="monitor-power-led" />
                </div>
                <div className="monitor-stand" />
                <div className="monitor-base" />
              </div>

              <div className="mascot-story-bubble">
                <div className="story-speaker">TAM BOT</div>
                <p>
                  "Greetings builder! Ready to construct something extraordinary?"
                  <span className="dialogue-arrow">▼</span>
                </p>
              </div>
            </div>
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
          className="about section-light page-pad tavern-scene"
          data-reveal
        >
          {/* ROW 1: THE BUILD STARTS HERE (LEFT: INTRO TITLE ⟷ RIGHT: BUILDER FORGE) */}
          <div className="tavern-row tavern-row--forge">
            <div className="tavern-col tavern-col--intro">
              <span className="chapter-badge">⚔️ CHAPTER 01 // THE HACKER'S TAVERN</span>
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
                A high-energy 30-hour hackathon where curiosity turns into production code. Gather your guild, pick your domain, and craft groundbreaking solutions judged by industry experts.
              </p>
              <div className="tavern-intro-actions">
                <a
                  className="hero-pixel-btn"
                  href="#tracks"
                  onClick={(event) => {
                    event.preventDefault();
                    jumpTo("#tracks");
                  }}
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  <span>⚔️ EXPLORE 5 TRACKS</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className="tavern-col tavern-col--builder">
              <BuilderForgeAnimation />
            </div>
          </div>

          {/* ROW 2: THE DEV DEN (LEFT: CODER CAT WORKSTATION ⟷ RIGHT: MISSION & QUESTS) */}
          <div className="tavern-row tavern-row--dev-den">
            <div className="tavern-col tavern-col--cat">
              <CoderCatStation />
            </div>

            <div className="tavern-col tavern-col--mission">
              <div className="tavern-mission-card">
                <div className="tavern-mission-card__header">
                  <span className="mission-tag">📜 THE TAVERN QUESTS</span>
                  <span className="mission-live-pill">LIVE ARENA</span>
                </div>
                <h3 className="tavern-mission-title">
                  Three Pillars of the Forge
                </h3>
                <p className="tavern-mission-desc">
                  Step into the arena where ideas transform into working MVPs. Over 30 continuous hours, your squad will tackle real industry challenges, unlock mentor checkpoints, and pitch before a panel of tech leaders.
                </p>
                <div className="tavern-quest-grid">
                  <div className="tavern-quest-item">
                    <span className="quest-item-icon">⏱️</span>
                    <div className="quest-item-text">
                      <strong>30 HOURS SPRINT</strong>
                      <span>From zero to deployed prototype</span>
                    </div>
                  </div>
                  <div className="tavern-quest-item">
                    <span className="quest-item-icon">⚔️</span>
                    <div className="quest-item-text">
                      <strong>5 DUNGEON TRACKS</strong>
                      <span>Aviation, AI/ML, Security, Open Tech</span>
                    </div>
                  </div>
                  <div className="tavern-quest-item">
                    <span className="quest-item-icon">🏆</span>
                    <div className="quest-item-text">
                      <strong>EPIC PRIZES &amp; BOUNTIES</strong>
                      <span>Cash prizes, swag &amp; network access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: THE OVERWORLD ENCOUNTER (LEFT: WIZARD OVERWORLD ⟷ RIGHT: MENTOR ARCHIE) */}
          <div className="tavern-row tavern-row--encounter">
            <div className="tavern-col tavern-col--wizard">
              <WizardOverworldScene />
            </div>

            <div className="tavern-col tavern-col--dialogue">
              <div className="tavern-mentor-card rpg-dialogue-box rpg-dialogue-box--from-left">
                <div className="rpg-dialogue-tail rpg-dialogue-tail--left" aria-hidden="true" />
                <div className="tavern-mentor-header">
                  <div className="mentor-avatar">🧙‍♂️</div>
                  <div>
                    <span className="mentor-nameplate">MENTOR ARCHIE</span>
                    <span className="mentor-title">Master Hacker &amp; Tavern Guide</span>
                  </div>
                  <span className="rpg-dialogue-tag">NPC // TAVERN GUIDE</span>
                </div>
                <p className="rpg-dialogue-text">
                  "Welcome to the tavern, traveler! The 30-hour clock starts ticking the moment you enter the arena. Choose your direction wisely and forge your masterpiece."
                  <span className="rpg-dialogue-cursor">▼</span>
                </p>
                <div className="tavern-quest-pouches">
                  <span className="quest-pouch">⚔️ QUEST READY</span>
                  <span className="quest-pouch">🧙‍♂️ MENTORS ON CALL</span>
                  <span className="quest-pouch">✨ ZERO LIMITS</span>
                </div>
                <a
                  className="text-link"
                  href="#tracks"
                  onClick={(event) => {
                    event.preventDefault();
                    jumpTo("#tracks");
                  }}
                  style={{ marginTop: "20px", display: "inline-flex" }}
                >
                  Find your dungeon track <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="manifesto section-dark page-pad" data-reveal>
          <div className="manifesto__side">
            <CampfireNightScene />
          </div>
          <div className="manifesto__content">
            <span className="chapter-badge">📜 CHAPTER 02 // THE ANCIENT TOME OF RULES</span>
            <SectionLabel number="02">WHO WE ARE</SectionLabel>
            <div className="ancient-tome">
              <div className="tome-bookmark" />
              <div className="tome-header">
                <div className="heading-with-icon">
                  <HeadingIcon icon={Sparkles} label="Who we are" />
                  <h2>
                    Curiosity <span>with a deadline.</span>
                  </h2>
                </div>
              </div>
              <div className="tome-parchment-body">
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
                <span className="manifesto__signature">📜 TAM-VIT GUILD CHARTER / 2026</span>
              </div>
            </div>
          </div>
        </section>

        <section className="duo-story page-pad" data-reveal>
          <article className="duo-card duo-card--vit">
            <div>
              <div className="duo-card__top">
                <span className="chapter-badge" style={{ marginBottom: 0 }}>🏰 CHAPTER 03 // THE CITADEL</span>
                <Globe size={20} />
              </div>
              <SectionLabel number="03">ABOUT VIT</SectionLabel>
              <h3>
                The Citadel with <em>range.</em>
              </h3>
              <p>
                <strong>Renowned Institution.</strong> VIT is a distinguished
                private university renowned for delivering world-class engineering
                education, pioneering technological innovation, and cutting-edge research.
              </p>
              <p>
                <strong>Top Ranked.</strong> Ranked 9th nationally by NIRF and 11th
                in India for Engineering, VIT holds NAAC A++ accreditation (3.66/4.0)
                and ranks 150th in Asia per QS World Rankings.
              </p>
              <div className="duo-stat-chips">
                <span className="duo-stat-chip">🏛️ NIRF #9 UNIVERSITY</span>
                <span className="duo-stat-chip">⭐ NAAC A++ (3.66/4.0)</span>
              </div>
            </div>
            <span className="duo-card__footer">
              ROYAL REALM // VELLORE CAMPUS <ArrowUpRight size={16} />
            </span>
          </article>

          <article className="duo-card duo-card--gdg">
            <div>
              <div className="duo-card__top">
                <span className="chapter-badge" style={{ marginBottom: 0 }}>🛡️ CHAPTER 04 // THE GUILD</span>
                <Cpu size={20} />
              </div>
              <SectionLabel number="04">ABOUT TAM-VIT</SectionLabel>
              <h3>
                The Guild <em>HQ.</em>
              </h3>
              <p>
                <strong>Student-Led Initiative.</strong> People with different tabs
                open in their heads, making room for one another at the same table.
                We bridge curiosity with real production systems.
              </p>
              <p>
                <strong>Community Powered.</strong> From interactive AI/ML workshops
                to national hackathons, we empower ambitious developers to build,
                ship, and solve real-world industry challenges together.
              </p>
              <div className="duo-stat-chips">
                <span className="duo-stat-chip duo-stat-chip--gold">🏆 VETERANS OF CODE CORTEX</span>
                <span className="duo-stat-chip">⚡ 500+ GUILD MEMBERS</span>
              </div>
            </div>
            <span className="duo-card__footer">
              GUILD HALL // DOORS ALWAYS OPEN <ArrowUpRight size={16} />
            </span>
          </article>
        </section>

        <section
          id="tracks"
          className="tracks section-blue page-pad"
          data-reveal
        >
          <div className="tracks__header">
            <span className="chapter-badge">🚪 CHAPTER 05 // SELECT YOUR DUNGEON PATH</span>
            <SectionLabel number="05">PICK A DIRECTION</SectionLabel>
            <div className="tracks__arrows">
              <button onClick={() => moveTrack(-1)} aria-label="Previous dungeon track">
                <ChevronLeft />
              </button>
              <button onClick={() => moveTrack(1)} aria-label="Next dungeon track">
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="tracks__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={Layers} label="Tracks" />
              <h2>
                Five dungeons
                <br />
                <span>to conquer.</span>
              </h2>
            </div>
          </div>
          <div className="tracks__canvas">
            {/* Left Column: Dungeon Realm Selector with Pixel Cat Avatars */}
            <div
              className="tracks__nav-panel"
              role="tablist"
              aria-label="Hackathon dungeon tracks"
            >
              <div className="tracks__nav-panel-header">
                <span className="tracks__nav-panel-title">⚔️ DUNGEON REALMS</span>
                <span className="tracks__nav-panel-count">5 GATES</span>
              </div>
              <div className="tracks__nav-list">
                {tracks.map((track, index) => {
                  const isActive = index === trackIndex;
                  return (
                    <button
                      key={track.name}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`track-nav-btn track-nav-btn--${track.color} ${isActive ? "track-nav-btn--active" : ""}`}
                      onClick={() => setTrackIndex(index)}
                    >
                      <div className="track-nav-btn__avatar">
                        <img
                          src={track.catImage}
                          alt={`${track.name} mascot`}
                          className="track-nav-btn__cat-img"
                          width={48}
                          height={48}
                          loading="lazy"
                        />
                      </div>
                      <div className="track-nav-btn__info">
                        <div className="track-nav-btn__meta">
                          <span className="track-nav-btn__gate">GATE 0{index + 1}</span>
                          <span className="track-nav-btn__tag">{track.tag}</span>
                        </div>
                        <span className="track-nav-btn__name">{track.name}</span>
                      </div>
                      <div className="track-nav-btn__status">
                        {isActive ? (
                          <span className="track-nav-btn__pill">ACTIVE ⚔️</span>
                        ) : (
                          <ArrowUpRight className="track-nav-btn__arrow" size={16} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Dungeon Description Card with Retro Window Header and Cat Companion */}
            <div className="tracks__active-card">
              <div className="tracks__window-bar">
                <div className="tracks__window-title">
                  <span className="tracks__window-icon">■</span>
                  <span>QUEST LOG // GATE 0{trackIndex + 1}: {activeTrack.name.toUpperCase()}</span>
                </div>
                <div className="tracks__window-controls" aria-hidden="true">
                  <span>_</span>
                  <span>🗖</span>
                  <span>✕</span>
                </div>
              </div>

              <div className="tracks__active-card-body">
                {/* Hero Spotlight Stage: Pixel Cat Companion + Meta */}
                <div className="tracks__hero-stage">
                  <div className="tracks__cat-spotlight">
                    <div className="tracks__cat-spotlight-halo" />
                    <img
                      key={activeTrack.name}
                      src={activeTrack.catImage}
                      alt={`${activeTrack.name} Cat Companion`}
                      className="tracks__active-cat-img"
                      width={110}
                      height={110}
                    />
                    <span className="tracks__cat-badge">COMPANION // LVL 30</span>
                  </div>

                  <div className="tracks__hero-details">
                    <div className="tracks__hero-meta">
                      <span className="tracks__hero-gate">GATE 0{trackIndex + 1}</span>
                      <span className="tracks__hero-sponsor">{activeTrack.sponsor}</span>
                    </div>
                    <div className="tracks__hero-tag">{activeTrack.tag}</div>
                    <h3 className="tracks__active-title">{activeTrack.name}</h3>
                  </div>
                </div>

                <p className="tracks__active-desc">{activeTrack.description}</p>

                <div className="tracks__active-card-actions">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="tracks__btn tracks__btn--briefing track-brief-trigger"
                      >
                        Enter dungeon briefing <ArrowUpRight size={17} />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="track-brief-dialog">
                      <DialogHeader>
                        <DialogTitle className="track-brief-dialog__title">
                          ⚔️ {activeTrack.name} — QUEST BRIEFING
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
                      🎒 Pick your own custom loot dataset for this dungeon.
                    </span>
                  ) : activeTrack.dataset ? (
                    <a
                      className="tracks__btn tracks__btn--dataset"
                      href={activeTrack.dataset.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {activeTrack.dataset.kind === "folder"
                        ? "Open dataset armory"
                        : "Download quest data"}{" "}
                      {activeTrack.dataset.kind === "folder" ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <Download size={16} />
                      )}
                    </a>
                  ) : (
                    <span className="tracks__dataset-note">
                      ⏳ Dungeon dataset coming soon.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="nominate"
          className="nominate section-dark page-pad"
          data-reveal
        >
          <div className="nominate__header">
            <span className="chapter-badge">🕹️ CHAPTER 06 // THE 8-BIT ARCADE JUKEBOX</span>
            <SectionLabel number="06">THE IN-BETWEEN SET</SectionLabel>
            <span className="nominate__live">
              <span /> ● LIVE NOMINATION
            </span>
          </div>
          <div className="nominate__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={Music2} label="Nominate" />
              <h2>
                Arcade
                <br />
                <span>soundtrack.</span>
              </h2>
            </div>
          </div>

          <div className="nominate__action-row">
            <div className="nominate__search-col">
              <form className="nominate-search" onSubmit={submitSongSearch}>
                <input
                  value={songQuery}
                  onChange={(event) => setSongQuery(event.target.value)}
                  placeholder="Search Spotify catalog for track or artist..."
                  aria-label="Search Spotify"
                />
                <button type="submit" disabled={searchQuery.isFetching}>
                  {searchQuery.isFetching ? "INSERTING COIN..." : "🪙 INSERT COIN / SEARCH"}
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
                      No tracks found in the arcade catalog — try another title.
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
                        ▶ NOMINATE
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="nominate__coffee-col">
              <CozyCoffeeScene />
            </div>
          </div>

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
                    <span>RANK #{String(index + 1).padStart(2, "0")}</span>
                    <span>{isSelected ? "⭐ YOUR PICK" : "▲ VOTE"}</span>
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
                ? "Your coin is in the arcade. The room decides the soundtrack."
                : "Search above and nominate a track to see it in the arcade."}
            </span>
            <span>{leaderboardQuery.data?.tracks.length ?? 0} NOMINATED</span>
          </div>
        </section>

        <section
          id="sponsors"
          className="sponsors section-dark page-pad"
          data-reveal
        >
          <div className="sponsors__header">
            <span className="chapter-badge">🎪 CHAPTER 07 // THE MERCHANT BAZAAR</span>
            <SectionLabel number="07">POWERED BY</SectionLabel>
            <span>SUPPLYING THE REALM</span>
          </div>
          <div className="sponsors__title-row">
            <div className="heading-with-icon">
              <HeadingIcon icon={HandHeart} label="Sponsors" />
              <h2>
                Merchant
                <br />
                <span>allies.</span>
              </h2>
            </div>
          </div>
          <div className="sponsor-grid">
            <a
              className="sponsor-card sponsor-card--polyfab"
              href="https://polyfab.co.in/"
              target="_blank"
              rel="noreferrer"
              aria-label="Visit POLYFAB website"
            >
              <span className="sponsor-card__rank">OFFICIAL GUILD PARTNER</span>
              <img
                className="sponsor-card__logo"
                src={polyfabLogo}
                alt="POLYFAB"
              />
              <span className="sponsor-card__arrow">
                <ArrowUpRight />
              </span>
            </a>
            <FrogShrineScene />
          </div>
        </section>

        <section id="faqs" className="faq section-light page-pad" data-reveal>
          <div className="faq__side">
            <span className="chapter-badge">⛺ CHAPTER 08 // THE WISE ELDER'S TENT</span>
            <SectionLabel number="08">NO SILLY QUESTIONS</SectionLabel>
            <div className="heading-with-icon">
              <HeadingIcon icon={HelpCircle} label="FAQs" />
              <h2>
                Campfire
                <br />
                <span>counsel.</span>
              </h2>
            </div>
            <div className="faq__doodle">
              <span>🔥</span>
              <span>📜</span>
              <span>⚔️</span>
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
                  📜 {mode}
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
              For deeper counsel, summon an elder on Discord{" "}
              <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
      </main>

      <footer id="contact" className="footer section-dark page-pad" data-reveal>
        <div className="footer__main">
          <div className="footer__statement">
            <span className="chapter-badge">🌌 CHAPTER 09 // WARP PORTAL &amp; CREDITS</span>
            <SectionLabel number="09">SAY HELLO</SectionLabel>
            <div className="heading-with-icon">
              <HeadingIcon icon={Mail} label="Contact" />
              <h2>
                Town Exit
                <br />
                <span>
                  Portal<span className="footer__cursor">→</span>
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
              title="Instagram Guild Rune"
            >
              <Instagram size={20} />
            </a>
            <a
              href="https://github.com/TAM-VIT"
              target="_blank"
              rel="noreferrer"
              aria-label="TAM on GitHub"
              title="GitHub Guild Rune"
            >
              <Github size={20} />
            </a>
            <a
              href="https://www.linkedin.com/company/tam-vit"
              target="_blank"
              rel="noreferrer"
              aria-label="TAM on LinkedIn"
              title="LinkedIn Guild Rune"
            >
              <Linkedin size={20} />
            </a>
          </div>
          <span className="footer__legal">
            © 2026 TAM-VIT // FORGED WITH TOO MUCH COFFEE // QUEST ON
          </span>
        </div>
      </footer>
    </div>
  );
}
