import { useState, useEffect, useRef } from "react";
import { useGoogleLogin } from "@react-oauth/google";

import {
  addTeam,
  addSubmission,
  joinTeam,
  getSubmissions,
  addReview,
  getReviews,
  getTeamMembers,
  getTeams,
  syncUserByEmail,
  addTeamMember
} from "./services/api";

import type { User, Team, Submission } from "./types/database";
import { AdminDashboard } from "./components/AdminDashboard";

const STORAGE_KEY_USER = "cc_logged_in_user";
const STORAGE_KEY_ADMIN = "cc_admin_logged_in";
const STORAGE_KEY_ADMIN_NAME = "cc_admin_username";

// Hardcoded review-panel admin accounts (not stored in the Sheet). Picking a
// name from the login dropdown resolves to one of these emails; anyone on
// this list gets admin access with the shared passcode below. The name is
// what gets recorded as Admin_Name on every score they submit, and is what
// the per-review edit lock (see scoreReviewRound effect / handleAdminScoreSubmit)
// checks against.
const REVIEWERS = [
  { name: "Aman Golani", email: "aman.golani2024@vitstudent.ac.in" },
  { name: "Rakshit Sinha", email: "rakshitsinha1444@gmail.com" },
  { name: "Parth Garg", email: "parth.garg2024@vitstudent.ac.in" },
  { name: "Sahil Sadhwani", email: "sahil.sadhwani2024@vitstudent.ac.in" },
  { name: "Vansh Arya", email: "vansh.arya2024@vitstudent.ac.in" },
  { name: "Parthiban", email: "phoenixknight18012007@gmail.com" },
].map((r) => ({ name: r.name, email: r.email.toLowerCase() }));
const ADMIN_PASSCODE = "tamreviewpanel_cc";

// The public event website (frontend/, a separate app) — "Home" and "Tracks" in
// the nav send visitors there instead of duplicating its content here.
// Local dev note: per CLAUDE.md, server/ and frontend/ both default to port
// 3000 — the convention is to start server/ first so it claims 3000, which
// bumps frontend/ to 3001. That's what this fallback assumes; override with
// VITE_EVENT_SITE_URL if your local setup differs.
const eventSiteUrl =
  import.meta.env.VITE_EVENT_SITE_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://codecortex.tamvit.in");

const RETRO_CHARACTERS = [
  { name: "luffy", label: "Luffy // Straw Hat", sprite: "/sprites/luffy.png", pos: { top: "9%", left: "7%" }, anim: "retro-char--anim-1" },
  { name: "zoro", label: "Zoro // Santoryu", sprite: "/sprites/zoro.png", pos: { top: "33%", left: "9%" }, anim: "retro-char--anim-2" },
  { name: "sanji", label: "Sanji // Cook", sprite: "/sprites/sanji.png", pos: { top: "56%", left: "6%" }, anim: "retro-char--anim-3" },
  { name: "robin", label: "Robin // Archeologist", sprite: "/sprites/robin.png", pos: { top: "78%", left: "10%" }, anim: "retro-char--anim-2" },
  { name: "usopp", label: "Usopp // Sniper King", sprite: "/sprites/usopp.png", pos: { top: "10%", right: "8%" }, anim: "retro-char--anim-4" },
  { name: "nami", label: "Nami // Navigator", sprite: "/sprites/nami.png", pos: { top: "34%", right: "9%" }, anim: "retro-char--anim-3" },
  { name: "chopper", label: "Chopper // Doctor", sprite: "/sprites/chopper.png", pos: { top: "56%", right: "6%" }, anim: "retro-char--anim-1" },
  { name: "brook", label: "Brook // Soul King", sprite: "/sprites/brook.png", pos: { top: "78%", right: "10%" }, anim: "retro-char--anim-2" },
  { name: "franky", label: "Franky // SUUUUPER!", sprite: "/sprites/franky.png", pos: { bottom: "4%", left: "24%" }, anim: "retro-char--anim-4" },
];

function RetroCharactersBackground() {
  return (
    <div className="retro-bg-characters" aria-hidden="true">
      {RETRO_CHARACTERS.map((char) => (
        <div
          key={char.name}
          className={`retro-char ${char.anim}`}
          style={{ ...char.pos }}
          title={char.label}
        >
          <img
            src={char.sprite}
            alt={char.name}
            className="retro-char__img"
            loading="eager"
          />
          <span className="retro-char__tag">{char.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  // =====================================================
  // APPLICATION STATE
  // =====================================================

  const [role, setRole] = useState<string>(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY_ADMIN) === "true") return "admin";
    } catch {
      // ignore
    }
    return "participant";
  });
  const [activePage, setActivePage] = useState("team-portal");

  const [showModal, setShowModal] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Helper to synchronize user session with localStorage
  const updateLoggedInUser = (user: User | null) => {
    setLoggedInUser(user);
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        if (user.Team_ID) {
          setTeamIdInput(user.Team_ID);
          setTeamLoggedIn(true);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
        setTeamLoggedIn(false);
        setTeamIdInput("");
        setTeamMembers([]);
        setTeamDetails(null);
      }
    } catch (e) {
      console.error("Failed to sync user session to localStorage:", e);
    }
  };

  const isGoogleConfigured = Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== "CLIENT_ID_MISSING" &&
    !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes("your_google_oauth")
  );
  const [showDevLogin, setShowDevLogin] = useState(!isGoogleConfigured);
  const [devName, setDevName] = useState("Demo Student 21BCE1234");
  const [devEmail, setDevEmail] = useState("demo.student2021@vitstudent.ac.in");

  // Asked once before login: internal (VIT) participants must sign in with a
  // @vitstudent.ac.in email and a VIT-format registration number; external
  // participants skip both requirements and get an "EC-" team code instead
  // of "CC-" so they're distinguishable in the Team sheet (Team_Type column).
  const [participantType, setParticipantType] = useState<"internal" | "external" | null>(null);
  const isExternalParticipant = participantType === "external";
  const regNoFormatRegex = /^\d{2}[a-zA-Z]{3}\d{4,5}$/;
  const isValidRegNo = (value: string) =>
    isExternalParticipant ? value.trim().length > 0 : regNoFormatRegex.test(value);

  const handleDevLogin = async () => {
    if (!devName.trim() || !devEmail.trim()) {
      showToast("Please enter a name and email.", "danger");
      return;
    }
    try {
      // Goes through the same server-authoritative find-or-create as real
      // Google sign-in — previously this fabricated a fresh {Team_ID: ""}
      // user locally every time, so logging in with an email that already
      // had a team never showed it, and the "already registered" guard
      // never had a chance to trip.
      const user = await syncUserByEmail(devEmail, devName);
      updateLoggedInUser(user);
      if (user.Name) setRegLeaderName(user.Name);
      if (!user.User_ID.startsWith("U-")) setRegLeaderRegNo(user.User_ID);
      setActivePage("team-portal");
      showToast(`Logged in as ${user.Name}`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Dev login failed.", "danger");
    }
  };

  // =====================================================
  // REGISTRATION
  // =====================================================

  const [regTeamName, setRegTeamName] = useState("");
  const [regTrack, setRegTrack] = useState("");
  const [regLeaderName, setRegLeaderName] = useState("");
  const [regLeaderRegNo, setRegLeaderRegNo] = useState("");
  const [regMembers, setRegMembers] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [teamMembersList, setTeamMembersList] = useState<{name: string, regNo: string, email: string}[]>([]);

  const handleRegMembersChange = (value: string) => {
    setRegMembers(value);
    const count = Number(value);
    if (Number.isInteger(count) && count >= 2 && count <= 4) {
      const requiredMembers = count - 1;
      setTeamMembersList(prev => {
        if (prev.length === requiredMembers) return prev;
        const newList = [...prev];
        while (newList.length < requiredMembers) {
          newList.push({ name: "", regNo: "", email: "" });
        }
        return newList.slice(0, requiredMembers);
      });
    } else {
      setTeamMembersList([]);
    }
  };

  const handleMemberChange = (index: number, field: keyof typeof teamMembersList[0], value: string) => {
    setTeamMembersList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  const [registrationSubmitted, setRegistrationSubmitted] =
    useState(false);

  const [newTeamId, setNewTeamId] = useState("");
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "danger" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "danger" | "info" = "danger") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // =====================================================
  // JOIN TEAM
  // =====================================================

  const [joinTeamId, setJoinTeamId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");


  // =====================================================
  // SUBMISSION
  // =====================================================

  const [subReviewRound, setSubReviewRound] = useState("Review 1");
  const [subGithub, setSubGithub] = useState("");
  const [subFigma, setSubFigma] = useState("");
  const [subDesc, setSubDesc] = useState("");

  const [projectSubmitted, setProjectSubmitted] =
    useState(false);

  // =====================================================
  // ADMIN
  // =====================================================

  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ADMIN) === "true";
    } catch {
      return false;
    }
  });

  const [adminUsername, setAdminUsername] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ADMIN_NAME) || "";
    } catch {
      return "";
    }
  });
  // Separate from adminUsername (which holds the *logged-in* reviewer's name)
  // — this is just the login form's dropdown selection before they submit it.
  const [adminLoginName, setAdminLoginName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [adminError, setAdminError] = useState<string | null>(null);
  const adminPasswordRef = useRef<HTMLInputElement | null>(null);

  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.location.pathname === "/admin";
  });

  const [adminTeamId, setAdminTeamId] = useState("");
  const [adminTeamFilter, setAdminTeamFilter] = useState("");

  // Admin data
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionIndex, setSelectedSubmissionIndex] = useState<number | null>(null);

  const [scoreApproach, setScoreApproach] = useState("");
  const [scoreScalability, setScoreScalability] = useState("");
  const [scoreDesign, setScoreDesign] = useState("");
  const [scoreTech, setScoreTech] = useState("");
  const [scoreUsp, setScoreUsp] = useState("");
  const [scoreReviewRound, setScoreReviewRound] = useState("Review 1");
  // Whoever's Admin_Name is on the existing score row for the selected
  // team + round, if any — null means nobody has scored this round yet.
  // Review 1 and Review 2 are tracked independently (eliminations mean the
  // team set per round differs), so this resets per (team, round) below.
  const [existingReviewOwner, setExistingReviewOwner] = useState<string | null>(null);

  // =====================================================
  // TEAM LOGIN
  // =====================================================

  const [teamLoggedIn, setTeamLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        const u = JSON.parse(saved) as User;
        return Boolean(u?.Team_ID);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [teamIdInput, setTeamIdInput] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        const u = JSON.parse(saved) as User;
        return u?.Team_ID || "";
      }
    } catch {
      // ignore
    }
    return "";
  });

  const [joinTeamError, setJoinTeamError] =
    useState<string | null>(null);

  const joinPasswordRef =
    useRef<HTMLInputElement | null>(null);

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamDetails, setTeamDetails] = useState<Team | null>(null);

  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRegNo, setNewMemberRegNo] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (!teamLoggedIn || !teamIdInput.trim()) return;

    let active = true;
    getTeamMembers(teamIdInput.trim())
      .then((members) => {
        if (active) setTeamMembers(members);
      })
      .catch((e) => console.error("Failed to load team members:", e));

    getTeams()
      .then((teams) => {
        if (!active) return;
        const current = teams.find((t) => String(t.Team_ID).trim() === String(teamIdInput).trim());
        if (current) setTeamDetails(current);
      })
      .catch((e) => console.error("Failed to load team details:", e));

    return () => {
      active = false;
    };
  }, [teamLoggedIn, teamIdInput]);

  const filteredSubmissions = submissions.filter((submission) => {
  const teamId = String(submission?.Team_ID || '').trim().toLowerCase();
  const name = String(submission?.['Team_Name '] || '').trim().toLowerCase();
  const filter = adminTeamFilter.trim().toLowerCase();

  if (!filter) return true;

  return (
    teamId.includes(filter) ||
    name.includes(filter)
  );
});

// =====================================================
// ADMIN TEAM / REVIEW SELECTION
// =====================================================

// Show each team only once
const uniqueTeams = Array.from(
  new Map(
    filteredSubmissions
      .filter((submission) => String(submission?.Team_ID || '').trim())
      .map((submission) => [
        String(submission.Team_ID).trim(),
        submission
      ])
  ).values()
);

// All submissions for the currently selected team
const selectedTeamSubmissions = submissions.filter(
  (submission) =>
    String(submission?.Team_ID || '').trim() ===
    String(adminTeamId || '').trim()
);

const selectedReviewSubmission =
  selectedTeamSubmissions.length > 0
    ? scoreReviewRound === 'Review 2'
      ? selectedTeamSubmissions[1] || selectedTeamSubmissions[0]
      : selectedTeamSubmissions[0]
    : undefined;

  // Fetch submissions for admin
  const fetchSubmissions = async (teamId?: string) => {
    try {
      const data = await getSubmissions(teamId);
      setSubmissions(data);
      if (selectedSubmissionIndex !== null && data[selectedSubmissionIndex]) {
        setAdminTeamId(data[selectedSubmissionIndex].Team_ID || '');
      }
    } catch (e) {
      console.error('Failed to fetch submissions:', e);
      setSubmissions([]);
    }
  };

  useEffect(() => {
    if (!adminLoggedIn) return;
    let active = true;

    getSubmissions()
      .then((data) => {
        if (!active) return;
        setSubmissions(data);
        if (selectedSubmissionIndex !== null && data[selectedSubmissionIndex]) {
          setAdminTeamId(data[selectedSubmissionIndex].Team_ID || '');
        }
      })
      .catch((e) => {
        console.error('Failed to fetch submissions:', e);
        if (active) setSubmissions([]);
      });

    return () => {
      active = false;
    };
  }, [adminLoggedIn, selectedSubmissionIndex]);

  // Load any existing score for the selected team + review round, so the
  // board can see/edit a prior review instead of always starting blank.
  useEffect(() => {
    if (!adminTeamId.trim()) {
      setExistingReviewOwner(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const existingReviews = await getReviews(adminTeamId);
        if (cancelled) return;

        // Mirror addReview()'s upsert matching exactly: prefer an explicit
        // Review_Round match, and only fall back to a legacy blank-round row
        // for "Review 1" if no explicit one exists. Without this exact same
        // two-step order, a legacy row can outrank a real reviewer's explicit
        // entry (both "match" Review 1 via the `|| 'Review 1'` fallback) and
        // the lock would key off the wrong row.
        const targetTeamId = adminTeamId.trim();
        const matchesTeam = (r: typeof existingReviews[number]) => r.Team_ID.trim() === targetTeamId;
        let existing = existingReviews.find(
          (r) => matchesTeam(r) && (r.Review_Round || '').trim() === scoreReviewRound
        );
        if (!existing && scoreReviewRound === 'Review 1') {
          existing = existingReviews.find((r) => matchesTeam(r) && !(r.Review_Round || '').trim());
        }

        setScoreApproach(existing?.['Approach (20)'] || '');
        setScoreScalability(existing?.['Scalability (10)'] || '');
        setScoreDesign(existing?.['Design (20)'] || '');
        setScoreTech(existing?.['Tech (30)'] || '');
        setScoreUsp(existing?.['USP (20)'] || '');
        setExistingReviewOwner(existing?.Admin_Name?.trim() || null);
      } catch (e) {
        console.error('Failed to fetch existing review scores:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminTeamId, scoreReviewRound]);


  const handleAdminScoreSubmit = async () => {
    // determine team id and selected submission
    const submission = selectedReviewSubmission;
    const teamId = (submission && submission.Team_ID) || adminTeamId.trim();

    if (!teamId) {
      alert('Please select a submission or enter a Team ID to score.');
      return;
    }

    if (existingReviewOwner && existingReviewOwner !== adminUsername) {
      alert(`${scoreReviewRound} for this team was already scored by ${existingReviewOwner}. Only they can edit it.`);
      return;
    }

    const approach = Number(scoreApproach || 0);
    const scalability = Number(scoreScalability || 0);
    const design = Number(scoreDesign || 0);
    const tech = Number(scoreTech || 0);
    const usp = Number(scoreUsp || 0);

    if (!Number.isFinite(approach) || approach < 0 || approach > 20) {
      alert('Approach score must be between 0 and 20.');
      return;
    }
    if (!Number.isFinite(scalability) || scalability < 0 || scalability > 10) {
      alert('Scalability score must be between 0 and 10.');
      return;
    }
    if (!Number.isFinite(design) || design < 0 || design > 20) {
      alert('Design score must be between 0 and 20.');
      return;
    }
    if (!Number.isFinite(tech) || tech < 0 || tech > 30) {
      alert('Tech score must be between 0 and 30.');
      return;
    }
    if (!Number.isFinite(usp) || usp < 0 || usp > 20) {
      alert('USP score must be between 0 and 20.');
      return;
    }

    const total = approach + scalability + design + tech + usp;

    try {
      await addReview({
        Team_ID: teamId,
        Team_Name: submission?.['Team_Name '] || teamId,
        Admin_Name: adminUsername,
        Review_Round: scoreReviewRound,
        'Approach (20)': String(approach),
        'Scalability (10)': String(scalability),
        'Design (20)': String(design),
        'Tech (30)': String(tech),
        'USP (20)': String(usp),
        Total_Score: String(total)
      });

      // clear scores
      setScoreApproach('');
      setScoreScalability('');
      setScoreDesign('');
      setScoreTech('');
      setScoreUsp('');
      setScoreReviewRound('Review 1');

      alert('Scores submitted successfully.');

      // Optionally refresh reviews/submissions
      fetchSubmissions();
    } catch (e) {
      console.error('Failed to submit review:', e);
      alert(e instanceof Error ? e.message : 'Failed to submit scores');
    }
  };

  // =====================================================
  // CONTACT
  // =====================================================

  const [contactSubmitted, setContactSubmitted] =
    useState(false);


  // =====================================================
  // STYLES
  // =====================================================

  const inputStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "2.5px solid #2d1f36",
    borderRadius: "8px",
    color: "#2d1f36",
    boxShadow: "3px 3px 0px rgba(45, 31, 54, 0.12)",
    fontFamily: "var(--body-pixel)",
    fontSize: "14px",
    padding: "9px 14px",
    outline: "none"
  };

  // =====================================================
  // TEAM REGISTRATION
  // =====================================================

const googleSignup = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    setGoogleAuthLoading(true);
    setGoogleAuthError(null);

    try {
      const profileRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`
          }
        }
      );

      if (!profileRes.ok) {
        throw new Error("Failed to fetch Google profile.");
      }

      const profile = await profileRes.json();
      const email = String(profile.email || "").trim();
      const name = String(profile.name || email);

      if (!email) {
        throw new Error("Google account did not return an email.");
      }

      if (!isExternalParticipant && !email.toLowerCase().endsWith("@vitstudent.ac.in")) {
        throw new Error("Only @vitstudent.ac.in emails are allowed for internal (VIT) participants.");
      }

      // Find-or-create against a fresh server read, not a cached client list
      // — this is what actually stops the same email registering twice (see
      // syncUserByEmail's doc comment for why the old approach could miss).
      const user = await syncUserByEmail(email, name);

      updateLoggedInUser(user);
      if (user.Name) setRegLeaderName(user.Name);
      setActivePage("team-portal");

    } catch (error) {
      console.error("Google sign-up error:", error);
      setGoogleAuthError(
        error instanceof Error ? error.message : "Google sign-up failed."
      );
    } finally {
      setGoogleAuthLoading(false);
    }
  },
  onError: () => {
    setGoogleAuthError("Google sign-up was cancelled or failed.");
  }
});
  const handleTeamSubmit = async () => {
    if (isSubmittingTeam) return;

    if (!regTeamName.trim()) {
      showToast("Please enter a team name.", "danger");
      return;
    }

    if (!regTrack) {
      showToast("Please select a track.", "danger");
      return;
    }

    if (!regLeaderName.trim()) {
      showToast("Please enter the Team Leader name.", "danger");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // External participants don't have a VIT reg number — email (already
    // captured at Google sign-in) is the only identifier we need from them.
    const leaderReg = isExternalParticipant
      ? ""
      : regLeaderRegNo.trim().toUpperCase();

    if (!isExternalParticipant && (!leaderReg || !isValidRegNo(leaderReg))) {
      showToast("Please enter a valid Team Leader Registration Number (e.g. 21BCE1234).", "danger");
      return;
    }

    const memberCount = Number(regMembers);

    if (
      !Number.isInteger(memberCount) ||
      memberCount < 2 ||
      memberCount > 4
    ) {
      showToast("Team size must be between 2 and 4 members.", "danger");
      return;
    }

    if (
      !regPassword ||
      regPassword.length < 4
    ) {
      showToast("Please enter a team password of at least 4 characters.", "danger");
      return;
    }

    if (!loggedInUser) {
      showToast("Please log in first.", "danger");
      return;
    }

    if (loggedInUser?.Team_ID) {
      showToast("You are already a member of a team and cannot create or join another team.", "danger");
      setActivePage("team-portal");
      return;
    }

    const seenRegNos = new Set<string>();
    if (!isExternalParticipant) seenRegNos.add(leaderReg);

    for (let i = 0; i < teamMembersList.length; i++) {
      const m = teamMembersList[i];
      if (!m.name.trim() || !m.email.trim() || (!isExternalParticipant && !m.regNo.trim())) {
        showToast(`Please fill all details for Member ${i + 2}.`, "danger");
        return;
      }
      if (!emailRegex.test(m.email.trim())) {
        showToast(`Invalid Email Address for Member ${i + 2}.`, "danger");
        return;
      }
      if (!isExternalParticipant) {
        const memberReg = m.regNo.trim().toUpperCase();
        if (!isValidRegNo(memberReg)) {
          showToast(`Invalid Registration Number for Member ${i + 2}. Expected format eg: 20ABC1234`, "danger");
          return;
        }
        if (memberReg === leaderReg) {
          showToast(`Registration Number for Member ${i + 2} cannot be the same as the Team Leader's.`, "danger");
          return;
        }
        if (seenRegNos.has(memberReg)) {
          showToast(`Duplicate Registration Number found: ${memberReg}.`, "danger");
          return;
        }
        seenRegNos.add(memberReg);
      }
    }

    setIsSubmittingTeam(true);
    try {
      const teamId =
        (isExternalParticipant ? "EC-" : "CC-") +
        Math.floor(1000 + Math.random() * 9000);

      // External members don't type a reg number (that field is hidden), but
      // the backend still needs a unique User_ID per person — mint one per
      // member rather than sending an empty string.
      const membersToSend = isExternalParticipant
        ? teamMembersList.map((m) => ({
            ...m,
            regNo: `EXT${Math.random().toString(36).slice(2, 8).toUpperCase()}`
          }))
        : teamMembersList;

      const effectiveUserId = isExternalParticipant
        ? loggedInUser.User_ID
        : (loggedInUser.User_ID && !loggedInUser.User_ID.startsWith("U-"))
          ? loggedInUser.User_ID
          : leaderReg;

      await addTeam(
        {
          Team_ID: teamId,
          "Team_ Name": regTeamName.trim(),
          Track: regTrack,
          Team_Leader: isExternalParticipant
            ? `${regLeaderName.trim()} (${loggedInUser.Email})`
            : `${regLeaderName.trim()} (${leaderReg})`,
          "No. of Members": String(memberCount),
          Team_Type: isExternalParticipant ? "External" : "Internal"
        },
        regPassword,
        effectiveUserId,
        membersToSend,
        loggedInUser.Email
      );

      updateLoggedInUser({
        ...loggedInUser,
        User_ID: effectiveUserId,
        Team_ID: teamId
      });

      setNewTeamId(teamId);
      setRegistrationSubmitted(true);
      showToast("Team registered successfully!", "success");

    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to submit registration.",
        "danger"
      );
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  // =====================================================
  // JOIN TEAM
  // =====================================================

  const handleJoinTeam = async () => {
    setJoinTeamError(null);

    if (!joinTeamId.trim() || !joinPassword) {
      setJoinTeamError("Please enter Team ID and Password.");

      setTimeout(() => {
        if (!joinTeamId.trim()) {
          document.getElementById("join-team-id-input")?.focus();
        } else {
          joinPasswordRef.current?.focus();
        }
      }, 50);

      return;
    }

    if (!loggedInUser) {
      setJoinTeamError("Please log in first.");
      return;
    }

    if (loggedInUser?.Team_ID) {
      setJoinTeamError("You are already a member of a team and cannot create or join another team.");
      return;
    }

    try {
      const success = await joinTeam(
        joinTeamId.trim(),
        joinPassword,
        loggedInUser.User_ID
      );

      if (!success) {
        throw new Error("Failed to join team. Please check the Team ID and Password.");
      }

      updateLoggedInUser({
        ...loggedInUser,
        Team_ID: joinTeamId.trim()
      });

      setTeamIdInput(joinTeamId.trim());
      setTeamLoggedIn(true);

      setJoinTeamError(null);
      setJoinPassword("");

      setActivePage("team-portal");
      showToast("Joined team successfully!", "success");

    } catch (error) {
      console.error("Join team error:", error);

      setJoinTeamError(
        error instanceof Error
          ? error.message
          : "Invalid Team ID or Password."
      );

      // Clear incorrect password
      setJoinPassword("");

      // Return cursor to password box
      setTimeout(() => {
        joinPasswordRef.current?.focus();
      }, 50);
    }
  };

  // =====================================================
  // TEAM LOGIN
  // =====================================================

  const handleAddMemberSubmit = async () => {
    // Existing-team member add happens in a later session than registration,
    // so go by the team's own stored Team_Type rather than the transient
    // participantType picked at login — that only applies to registration.
    const teamIsExternal = teamDetails?.Team_Type === "External";

    if (!newMemberName.trim() || !newMemberEmail.trim() || (!teamIsExternal && !newMemberRegNo.trim())) {
      showToast("Please fill in all member details.", "danger");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!teamIsExternal && !/^\d{2}[a-zA-Z]{3}\d{4,5}$/.test(newMemberRegNo.trim().toUpperCase())) {
      showToast("Invalid Registration Number format. Expected e.g. 20ABC1234", "danger");
      return;
    }
    if (!emailRegex.test(newMemberEmail.trim())) {
      showToast("Invalid Email Address.", "danger");
      return;
    }

    setIsAddingMember(true);
    try {
      await addTeamMember(teamIdInput.trim(), {
        name: newMemberName.trim(),
        regNo: teamIsExternal
          ? `EXT${Math.random().toString(36).slice(2, 8).toUpperCase()}`
          : newMemberRegNo.trim().toUpperCase(),
        email: newMemberEmail.trim()
      });
      // refresh member list
      const updatedMembers = await getTeamMembers(teamIdInput.trim());
      setTeamMembers(updatedMembers);
      
      setNewMemberName("");
      setNewMemberRegNo("");
      setNewMemberEmail("");
      setShowAddMemberForm(false);
      showToast("Member added successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to add member.", "danger");
    } finally {
      setIsAddingMember(false);
    }
  };

  // =====================================================
  // PROJECT SUBMISSION
  // =====================================================

  const handleProjectSubmit = async () => {
    if (!teamIdInput.trim()) {
      showToast("Team ID is missing.", "danger");
      return;
    }

    if (!subGithub.trim()) {
      showToast("Please enter your GitHub repository link.", "danger");
      return;
    }

    if (!subDesc.trim()) {
      showToast("Please enter a project description.", "danger");
      return;
    }

    try {
      const actualTeamName = teamDetails?.['Team_ Name'] || loggedInUser?.Name || teamIdInput;
      await addSubmission({
        Team_ID: teamIdInput.trim(),
        "Team_Name ": actualTeamName,
        Project_Description: `[${subReviewRound}] ${subDesc.trim()}`,
        "GitHub Link": subGithub.trim(),
        "Figma Link": subFigma.trim(),
        "Submission Time": new Date().toLocaleString()
      });

      setProjectSubmitted(true);
      showToast("Project details submitted successfully!", "success");

    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to submit project.",
        "danger"
      );
    }
  };

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  const handleAdminLogin = () => {
    const reviewer = REVIEWERS.find((r) => r.name === adminLoginName);
    const password = String(adminPassword ?? '').trim();

    if (!reviewer || !password) {
      setAdminError('Please select your name and enter the passcode.');
      return;
    }

    if (password === ADMIN_PASSCODE) {
      setAdminLoggedIn(true);
      setShowAdminLogin(false);
      setRole('admin');
      updateLoggedInUser(null);
      setActivePage('team-portal');
      setAdminError(null);
      setAdminUsername(reviewer.name);
      setAdminLoginName('');
      setAdminPassword('');
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN, "true");
        localStorage.setItem(STORAGE_KEY_ADMIN_NAME, reviewer.name);
      } catch {
        // ignore
      }
      showToast(`Authenticated as ${reviewer.name}.`, "success");
    } else {
      setAdminError('Invalid passcode!');
      setAdminPassword('');
      setTimeout(() => adminPasswordRef.current?.focus(), 0);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <div className="rectangular-tunnel">
        <div className="rect-frame"></div>
        <div className="rect-frame"></div>
        <div className="rect-frame"></div>
        <div className="rect-frame"></div>
        <div className="rect-frame"></div>
      </div>

      <div className="ui-protector"></div>
      <RetroCharactersBackground />

      <div className="main-content position-relative z-3 min-vh-100 d-flex flex-column">

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className="position-fixed top-0 start-50 translate-middle-x mt-4 px-4 py-2 rounded-pill shadow-lg border d-flex align-items-center gap-2 fade-in"
            style={{
              backgroundColor:
                toastMessage.type === "success"
                  ? "rgba(10, 50, 30, 0.95)"
                  : toastMessage.type === "danger"
                  ? "rgba(60, 15, 20, 0.95)"
                  : "rgba(10, 30, 60, 0.95)",
              borderColor:
                toastMessage.type === "success"
                  ? "var(--lime)"
                  : toastMessage.type === "danger"
                  ? "var(--coral)"
                  : "var(--cyan)",
              color: "#fff",
              zIndex: 9999,
              backdropFilter: "blur(8px)"
            }}
          >
            <span>{toastMessage.type === "success" ? "✓" : toastMessage.type === "danger" ? "⚠" : "ℹ"}</span>
            <span className="fw-semibold small">{toastMessage.text}</span>
            <button
              type="button"
              className="btn btn-sm btn-link text-white p-0 ms-2 text-decoration-none"
              onClick={() => setToastMessage(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            PARTICIPANT
        ================================================= */}

        {role === "participant" && (
          <>
            {(!loggedInUser && !teamLoggedIn) ? (

              <div className="d-flex justify-content-center align-items-center flex-grow-1 p-3 fade-in position-relative" style={{ minHeight: "85vh", zIndex: 10 }}>

                <div
                  className="retro-window w-100"
                  style={{ maxWidth: "520px" }}
                >
                  <div className="retro-window__header">
                    <div className="retro-window__title">
                      <span>■ CODE CORTEX</span>
                      <span style={{ opacity: 0.5 }}>//</span>
                      <span style={{ color: "#7d5a96" }}>USER_AUTHENTICATION</span>
                    </div>
                    <div className="retro-window__controls">
                      <span>_</span>
                      <span>🗖</span>
                      <span>✕</span>
                    </div>
                  </div>

                  <div className="retro-window__body text-center">
                    <div className="mb-2">
                      <span className="badge mb-3" style={{ background: "#fde88a", color: "#2d1f36", fontSize: "9px", padding: "6px 14px", border: "1.5px solid #2d1f36", boxShadow: "2px 2px 0px #2d1f36" }}>
                        ⚔️ GUILD ENTRY // STEP 01
                      </span>
                    </div>

                    <h2 className="glow-text mb-3 fw-bold" style={{ fontSize: "clamp(24px, 3.2vw, 32px)", letterSpacing: "-0.02em" }}>
                      Participant Login
                    </h2>

                    {participantType === null ? (
                      <>
                        <p className="mb-4" style={{ fontSize: "17.5px", color: "#4a3856", fontWeight: 500, lineHeight: 1.6 }}>
                          Are you a VIT student, or joining from outside VIT?
                        </p>
                        <div className="d-flex flex-column gap-3">
                          <button
                            type="button"
                            className="btn btn-lg-retro btn-primary w-100"
                            onClick={() => setParticipantType("internal")}
                          >
                            🎓 INTERNAL (VIT STUDENT)
                          </button>
                          <button
                            type="button"
                            className="btn btn-lg-retro btn-outline-info w-100"
                            onClick={() => setParticipantType("external")}
                          >
                            🌐 EXTERNAL PARTICIPANT
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mb-3" style={{ fontSize: "16px", color: "#4a3856", lineHeight: 1.6 }}>
                          Sign in with your Google account to access your dashboard or register a team.
                        </p>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1 px-3 mb-4"
                          style={{ fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() => setParticipantType(null)}
                        >
                          ← {participantType === "internal" ? "Internal (VIT)" : "External"} — CHANGE
                        </button>

                        {!isGoogleConfigured && (
                          <div className="alert alert-warning py-3 px-3 text-start mb-3" style={{ fontSize: "14px" }}>
                            <div className="fw-bold mb-1" style={{ fontFamily: "var(--pixel)", fontSize: "10px" }}>
                              ⚠️ Google OAuth Client ID Not Set
                            </div>
                            <div style={{ lineHeight: 1.5 }}>
                              Add <code>VITE_GOOGLE_CLIENT_ID</code> to your <code>.env</code> file for live Google Sign-In. Use <strong>Quick Dev Login</strong> below to test locally.
                            </div>
                          </div>
                        )}

                        {googleAuthError && (
                          <div className="alert alert-danger py-2 px-3 mb-3 text-start" style={{ fontSize: "13.5px" }}>
                            {googleAuthError}
                          </div>
                        )}

                        <button
                          className="btn btn-lg-retro btn-primary w-100 mb-3"
                          onClick={() => {
                            if (!isGoogleConfigured) {
                              showToast("VITE_GOOGLE_CLIENT_ID is not configured in .env. Use Quick Dev Login below to test.", "danger");
                              setShowDevLogin(true);
                            } else {
                              googleSignup();
                            }
                          }}
                          disabled={googleAuthLoading}
                        >
                          {googleAuthLoading ? "SIGNING IN..." : "CONTINUE WITH GOOGLE →"}
                        </button>

                        <div className="pt-3 border-top border-secondary mt-2">
                          {!showDevLogin ? (
                            <button
                              type="button"
                              className="btn btn-outline-info w-100 py-2"
                              style={{ fontSize: "10.5px" }}
                              onClick={() => setShowDevLogin(true)}
                            >
                              ⚡ QUICK DEV LOGIN (LOCAL TEST)
                            </button>
                          ) : (
                            <div className="text-start p-3 rounded" style={{ background: "#fdfbf7", border: "2px solid #2d1f36", boxShadow: "3px 3px 0px #2d1f36" }}>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-bold" style={{ fontFamily: "var(--pixel)", fontSize: "9px", color: "#d15676" }}>
                                  ⚡ QUICK DEV LOGIN
                                </span>
                                {isGoogleConfigured && (
                                  <button
                                    type="button"
                                    className="btn btn-sm text-secondary p-0 border-0 bg-transparent"
                                    style={{ fontSize: "10px", fontFamily: "var(--pixel)" }}
                                    onClick={() => setShowDevLogin(false)}
                                  >
                                    [CANCEL]
                                  </button>
                                )}
                              </div>
                              <div className="text-secondary mb-2" style={{ fontSize: "13.5px", lineHeight: 1.5 }}>
                                Simulates signing in with a student identity without requiring Google Cloud setup:
                              </div>
                              <input
                                type="text"
                                className="form-control form-control-sm mb-2"
                                style={inputStyle}
                                placeholder="Name (e.g. John Doe 21BCE1234)"
                                value={devName}
                                onChange={(e) => setDevName(e.target.value)}
                              />
                              <input
                                type="email"
                                className="form-control form-control-sm mb-3"
                                style={inputStyle}
                                placeholder="Student Email (@vitstudent.ac.in)"
                                value={devEmail}
                                onChange={(e) => setDevEmail(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-info w-100 fw-bold py-2"
                                style={{ fontSize: "11px" }}
                                onClick={handleDevLogin}
                              >
                                SIGN IN AS TEST STUDENT →
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

            ) : (

              <>
                {/* =================================================
                    NAVBAR
                ================================================= */}

                <div className="navbar-container d-flex justify-content-center align-items-center pt-4 w-100 position-relative px-3 px-md-5">

                  <div className="navbar-logo-left position-absolute start-0 ms-4 ms-md-5 d-none d-md-block">
                    <div style={{
                      background: "#2d1f36",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "2px solid #2d1f36",
                      boxShadow: "2.5px 2.5px 0px #7abcc4",
                      display: "inline-flex",
                      alignItems: "center"
                    }}>
                      <img
                        src="/tam-white-logo.png"
                        alt="TAM Logo"
                        style={{
                          height: "26px",
                          objectFit: "contain"
                        }}
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    </div>
                  </div>

                  <div className="floating-nav flex-wrap justify-content-center px-3 px-md-5 py-2 position-relative z-3">

                    <a href={eventSiteUrl} target="_blank" rel="noreferrer">
                      🏰 World Map ↗
                    </a>

                    <a href={`${eventSiteUrl}/#tracks`} target="_blank" rel="noreferrer">
                      ⚔️ Dungeons ↗
                    </a>

                    <a
                      onClick={() => setActivePage("team-portal")}
                      className={
                        activePage === "team-portal"
                          ? "active"
                          : ""
                      }
                    >
                      🛡️ Party Camp
                    </a>

                    {loggedInUser && (
                      <a
                        role="button"
                        onClick={() => {
                          updateLoggedInUser(null);
                          setTeamLoggedIn(false);
                          setTeamIdInput("");
                          setActivePage("team-portal");
                          showToast("Signed out successfully", "info");
                        }}
                        className="text-danger"
                        style={{ cursor: "pointer" }}
                      >
                        🚪 Exit
                      </a>
                    )}

                  </div>

                  <div className="navbar-logo-right position-absolute end-0 me-4 me-md-5 d-none d-md-block">
                    <img
                      src="/code-cortex-logo.png"
                      alt="Code Cortex Logo"
                      style={{
                        height: "40px",
                        objectFit: "contain",
                        filter: "drop-shadow(2px 3px 0px rgba(45, 31, 54, 0.2))"
                      }}
                      onError={(e) =>
                        (e.currentTarget.style.display = "none")
                      }
                    />
                  </div>

                </div>

                {/* =================================================
                    MAIN CONTENT
                ================================================= */}

                <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center mt-4 p-3">

                  {/* TEAM PORTAL */}

                  {activePage === "team-portal" && (
                    <div className="fade-in w-100 d-flex justify-content-center">

                      {!teamLoggedIn ? (

                        <div
                          className="retro-window w-100 fade-in text-center"
                          style={{ maxWidth: "480px" }}
                        >
                          <div className="retro-window__header">
                            <div className="retro-window__title">
                              <span>■ GUILD_GATE</span>
                              <span style={{ opacity: 0.5 }}>//</span>
                              <span style={{ color: "#7d5a96" }}>TEAM_PORTAL</span>
                            </div>
                            <div className="retro-window__controls">
                              <span>_</span>
                              <span>🗖</span>
                              <span>✕</span>
                            </div>
                          </div>

                          <div className="retro-window__body p-4 p-md-5 text-center">
                            <div className="mb-2">
                              <span className="chapter-badge mb-3">
                                🏰 GUILD ENTRANCE
                              </span>
                            </div>

                            <h2 className="glow-text mb-3 fw-bold" style={{ fontSize: "clamp(20px, 2.3vw, 26px)" }}>
                              Team Portal
                            </h2>

                            {!loggedInUser ? (
                              <>
                                <p className="text-secondary mb-4" style={{ fontSize: "15px" }}>
                                  Please sign in with your student Google account to access the Team Portal.
                                </p>
                                <button
                                  className="btn hero-pixel-btn hero-pixel-btn--primary w-100 py-3 fw-bold"
                                  onClick={() => googleSignup()}
                                >
                                  Sign in with Google →
                                </button>
                              </>
                            ) : (
                              <>
                                <p className="text-secondary mb-4" style={{ fontSize: "15px" }}>
                                  You are not currently a member of any guild team.
                                </p>
                                <div className="d-flex gap-3 flex-column flex-sm-row">
                                  <button
                                    className="btn hero-pixel-btn hero-pixel-btn--primary flex-grow-1"
                                    onClick={() => setActivePage("registration")}
                                  >
                                    Create Team
                                  </button>
                                  <button
                                    className="btn hero-pixel-btn hero-pixel-btn--secondary flex-grow-1"
                                    onClick={() => setActivePage("join-team")}
                                  >
                                    Join Existing
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                      ) : (

                        <div
                          className="retro-window w-100 fade-in"
                          style={{ maxWidth: "880px" }}
                        >
                          {/* Retro Window Header */}
                          <div className="retro-window__header">
                            <div className="retro-window__title">
                              <span>■ PARTY_CAMP</span>
                              <span style={{ opacity: 0.5 }}>//</span>
                              <span style={{ color: "#7d5a96" }}>GUILD_DASHBOARD</span>
                              <span style={{ opacity: 0.5 }}>//</span>
                              <span style={{ color: "#d15676" }}>{teamIdInput}</span>
                            </div>
                            <div className="retro-window__controls">
                              <span>_</span>
                              <span>🗖</span>
                              <span
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  updateLoggedInUser(null);
                                  setTeamLoggedIn(false);
                                  setTeamIdInput("");
                                  setActivePage("team-portal");
                                  showToast("Signed out successfully", "info");
                                }}
                                title="Exit Party Camp"
                              >
                                ✕
                              </span>
                            </div>
                          </div>

                          <div className="retro-window__body p-4 p-md-5">

                            {/* Top Header Row with Chapter Badge, Title & Status Pills */}
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 gap-3 border-bottom border-dark border-2">
                              <div>
                                <span className="chapter-badge mb-2">
                                  🛡️ CHAPTER 04 // GUILD HEADQUARTERS
                                </span>
                                <h2 className="glow-text fw-bold mb-1" style={{ fontSize: "clamp(20px, 2.3vw, 26px)" }}>
                                  TEAM DASHBOARD
                                </h2>
                                <div className="d-flex align-items-center gap-2 mt-2">
                                  <span className="text-secondary small">GUILD CODE:</span>
                                  <span
                                    className="px-2 py-1 rounded border border-dark fw-bold id-code"
                                    style={{
                                      background: "#fde88a",
                                      color: "#2d1f36",
                                      fontSize: "12px",
                                      boxShadow: "2px 2px 0px #2d1f36"
                                    }}
                                  >
                                    {teamIdInput}
                                  </span>
                                </div>
                              </div>

                              <div className="d-flex align-items-center flex-wrap gap-2">
                                <span className="mission-live-pill">
                                  ● ACTIVE
                                </span>
                                <span className="mission-tag">
                                  AWAITING REVIEW 1
                                </span>
                              </div>
                            </div>

                            <div className="row g-4">

                              {/* LEFT COLUMN: TEAM INFORMATION */}
                              <div className="col-lg-5 border-end border-dark border-2 pe-lg-4 text-start">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                  <span className="badge" style={{ background: "#ede5f5", color: "#2d1f36", fontSize: "8.5px" }}>
                                    📜 ROSTER
                                  </span>
                                  <h4 className="mb-0 fw-bold" style={{ fontSize: "15px", color: "#2d1f36" }}>
                                    Team Information
                                  </h4>
                                </div>

                                {/* Status Card */}
                                <div className="rpg-stat-card mb-3">
                                  <div className="form-label mb-1">
                                    CURRENT STATUS
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span style={{ color: "#15803d", fontSize: "14px" }}>●</span>
                                    <span className="fw-bold" style={{ fontSize: "14px", color: "#2d1f36" }}>
                                      Active — Awaiting Review 1
                                    </span>
                                  </div>
                                </div>

                                {/* Team Leader */}
                                <div className="rpg-stat-card mb-3">
                                  <div className="form-label mb-1">
                                    GUILD LEADER
                                  </div>
                                  <div className="fw-bold d-flex align-items-center gap-2" style={{ fontSize: "14.5px", color: "#2d1f36" }}>
                                    <span>👑</span>
                                    <span>{teamDetails?.Team_Leader || "Loading Leader..."}</span>
                                  </div>
                                </div>

                                {/* Assigned Track */}
                                {teamDetails?.Track && (
                                  <div className="rpg-stat-card mb-3">
                                    <div className="form-label mb-1">
                                      ASSIGNED TRACK
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                      <span
                                        className="badge px-2 py-1"
                                        style={{ background: "#7abcc4", color: "#2d1f36", fontSize: "9px" }}
                                      >
                                        ⚔️ {teamDetails.Track}
                                      </span>
                                      <a
                                        href={`${eventSiteUrl}/?track=${encodeURIComponent(teamDetails.Track)}#tracks`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-sm btn-outline-info"
                                        style={{ fontSize: "8px", padding: "4px 8px", margin: 0 }}
                                      >
                                        Track Brief ↗
                                      </a>
                                    </div>
                                  </div>
                                )}

                                {/* Team Members List */}
                                <div className="mb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="form-label mb-0">
                                      GUILD MEMBERS ({teamMembers.length}/4)
                                    </span>
                                  </div>

                                  {teamMembers.length > 0 ? (
                                    <div className="d-flex flex-column gap-2">
                                      {teamMembers.map((member, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 px-3 d-flex align-items-center justify-content-between rounded border border-dark"
                                          style={{
                                            background: "#ffffff",
                                            boxShadow: "2px 2px 0px rgba(45, 31, 54, 0.12)",
                                            fontSize: "13.5px"
                                          }}
                                        >
                                          <span className="fw-semibold" style={{ color: "#2d1f36" }}>
                                            👤 {member.Name}
                                          </span>
                                          {member.User_ID && member.User_ID !== member.Name && (
                                            <span
                                              className="badge"
                                              style={{ background: "#ede5f5", color: "#2d1f36", fontSize: "7.5px" }}
                                            >
                                              {member.User_ID}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-secondary small mb-3">Loading members...</p>
                                  )}
                                </div>

                                {/* Add Member Form & Toggle */}
                                {teamMembers.length > 0 && teamMembers.length < 4 && (
                                  <div className="mt-2 mb-2">
                                    {!showAddMemberForm ? (
                                      <button
                                        className="btn hero-pixel-btn hero-pixel-btn--secondary w-100"
                                        style={{ fontSize: "9px", padding: "9px 14px" }}
                                        onClick={() => setShowAddMemberForm(true)}
                                      >
                                        + RECRUIT MEMBER
                                      </button>
                                    ) : (
                                      <div
                                        className="p-3 rounded border border-dark border-2 mt-2"
                                        style={{ background: "#fdf8ea", boxShadow: "3px 3px 0px #2d1f36" }}
                                      >
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <span className="fw-bold" style={{ fontFamily: "var(--pixel)", fontSize: "9px", color: "#2d1f36" }}>
                                            + ADD NEW MEMBER
                                          </span>
                                        </div>
                                        <input
                                          type="text"
                                          className="form-control mb-2"
                                          placeholder="Full Name"
                                          value={newMemberName}
                                          onChange={e => setNewMemberName(e.target.value)}
                                        />
                                        {teamDetails?.Team_Type !== "External" && (
                                          <input
                                            type="text"
                                            className="form-control mb-2"
                                            placeholder="Reg No (e.g. 20ABC1234)"
                                            value={newMemberRegNo}
                                            onChange={e => setNewMemberRegNo(e.target.value)}
                                          />
                                        )}
                                        <input
                                          type="email"
                                          className="form-control mb-3"
                                          placeholder="Email Address"
                                          value={newMemberEmail}
                                          onChange={e => setNewMemberEmail(e.target.value)}
                                        />
                                        <div className="d-flex gap-2">
                                          <button
                                            className="btn hero-pixel-btn hero-pixel-btn--primary flex-grow-1"
                                            style={{ fontSize: "9px", padding: "8px 12px", margin: 0 }}
                                            onClick={handleAddMemberSubmit}
                                            disabled={isAddingMember}
                                          >
                                            {isAddingMember ? "Adding..." : "Save Member"}
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            style={{ fontSize: "9px", padding: "8px 12px", margin: 0 }}
                                            onClick={() => setShowAddMemberForm(false)}
                                            disabled={isAddingMember}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>

                              {/* RIGHT COLUMN: SUBMIT PROJECT DETAILS */}
                              <div className="col-lg-7 ps-lg-4 text-start">

                                {projectSubmitted ? (

                                  <div className="text-center py-5">
                                    <div className="rpg-lead-dialogue mb-4 text-start">
                                      <div className="d-flex align-items-center gap-2 mb-2">
                                        <span className="badge" style={{ background: "#dcfce7", color: "#15803d", fontSize: "9px" }}>
                                          ✓ LOGGED IN THE TOME
                                        </span>
                                      </div>
                                      <h3 className="fw-bold mb-2" style={{ color: "#2d1f36", fontSize: "18px" }}>
                                        Submission Received!
                                      </h3>
                                      <p className="mb-0" style={{ fontSize: "14px", color: "#606d7a" }}>
                                        Your project artifacts and progress details have been registered into the judging console for review.
                                      </p>
                                    </div>

                                    <button
                                      className="btn hero-pixel-btn hero-pixel-btn--secondary"
                                      onClick={() => setProjectSubmitted(false)}
                                    >
                                      ✏️ UPDATE SUBMISSION
                                    </button>
                                  </div>

                                ) : (

                                  <>
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                      <span className="badge" style={{ background: "#fde88a", color: "#2d1f36", fontSize: "8.5px" }}>
                                        📦 ARTIFACTS
                                      </span>
                                      <h4 className="mb-0 fw-bold" style={{ fontSize: "15px", color: "#2d1f36" }}>
                                        Submit Project Details
                                      </h4>
                                    </div>

                                    {/* Evaluation Round */}
                                    <div className="mb-3">
                                      <label className="form-label">
                                        EVALUATION ROUND
                                      </label>
                                      <select
                                        className="form-select mb-0"
                                        value={subReviewRound}
                                        onChange={(e) => setSubReviewRound(e.target.value)}
                                      >
                                        <option value="Review 1">
                                          Review 1 (Setup & Architecture)
                                        </option>
                                        <option value="Review 2">
                                          Review 2 (Midway Progress & Feasibility)
                                        </option>
                                      </select>
                                    </div>

                                    {/* GitHub Link */}
                                    <div className="mb-3">
                                      <label className="form-label">
                                        GITHUB REPOSITORY LINK
                                      </label>
                                      <div className="input-group">
                                        <span className="input-group-text">🔗</span>
                                        <input
                                          type="url"
                                          className="form-control mb-0"
                                          placeholder="https://github.com/organization/repository"
                                          value={subGithub}
                                          onChange={(e) => setSubGithub(e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    {/* Figma Link */}
                                    <div className="mb-3">
                                      <label className="form-label">
                                        FIGMA / DESIGN LINK (OPTIONAL)
                                      </label>
                                      <div className="input-group">
                                        <span className="input-group-text">🎨</span>
                                        <input
                                          type="url"
                                          className="form-control mb-0"
                                          placeholder="https://figma.com/file/..."
                                          value={subFigma}
                                          onChange={(e) => setSubFigma(e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-4">
                                      <label className="form-label">
                                        BRIEF PROGRESS DESCRIPTION
                                      </label>
                                      <textarea
                                        className="form-control mb-0"
                                        rows={3}
                                        placeholder="Describe your progress so far, architecture decisions, and deliverables..."
                                        value={subDesc}
                                        onChange={(e) => setSubDesc(e.target.value)}
                                        style={{ resize: "none" }}
                                      />
                                    </div>

                                    <button
                                      className="btn hero-pixel-btn hero-pixel-btn--primary w-100 fw-bold"
                                      style={{ fontSize: "11px", padding: "14px 20px" }}
                                      onClick={handleProjectSubmit}
                                    >
                                      ⚔️ SUBMIT TO JUDGES
                                    </button>
                                  </>
                                )}

                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* JOIN TEAM */}

                  {activePage === "join-team" && (
                    <div className="fade-in w-100 d-flex justify-content-center">

                      <div
                        className="retro-window w-100 text-center"
                        style={{ maxWidth: "480px" }}
                      >
                        <div className="retro-window__header">
                          <div className="retro-window__title">
                            <span>■ GUILD_RECRUIT</span>
                            <span style={{ opacity: 0.5 }}>//</span>
                            <span style={{ color: "#7d5a96" }}>JOIN_TEAM</span>
                          </div>
                          <div className="retro-window__controls">
                            <span>_</span>
                            <span>🗖</span>
                            <span
                              style={{ cursor: "pointer" }}
                              onClick={() => setActivePage("team-portal")}
                            >
                              ✕
                            </span>
                          </div>
                        </div>

                        <div className="retro-window__body p-4 p-md-5 text-center">
                          <div className="mb-2">
                            <span className="chapter-badge mb-3">
                              🛡️ GUILD INVITATION
                            </span>
                          </div>

                          <h2 className="glow-text mb-2 fw-bold" style={{ fontSize: "clamp(20px, 2.3vw, 26px)" }}>
                            Join Existing Team
                          </h2>

                          <p className="text-secondary mb-4" style={{ fontSize: "15px" }}>
                            Enter the details provided by your Team Leader.
                          </p>

                          <div className="text-start mb-3">
                            <label className="form-label">TEAM ID</label>
                            <input
                              id="join-team-id-input"
                              type="text"
                              className="form-control mb-0"
                              placeholder="Team ID (e.g. CC-104)"
                              value={joinTeamId}
                              onChange={(e) => {
                                setJoinTeamId(e.target.value);
                                setJoinTeamError(null);
                              }}
                            />
                          </div>

                          <div className="text-start mb-4">
                            <label className="form-label">TEAM PASSWORD</label>
                            <div className="position-relative">
                              <input
                                type={showJoinPassword ? "text" : "password"}
                                className="form-control pe-5 mb-0"
                                placeholder="Team Password"
                                value={joinPassword}
                                ref={joinPasswordRef}
                                onChange={(e) => {
                                  setJoinPassword(e.target.value);
                                  setJoinTeamError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleJoinTeam();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-sm text-secondary position-absolute end-0 top-50 translate-middle-y me-2 border-0 bg-transparent"
                                style={{ fontFamily: "var(--pixel)", fontSize: "9px" }}
                                onClick={() => setShowJoinPassword(!showJoinPassword)}
                              >
                                {showJoinPassword ? "HIDE" : "SHOW"}
                              </button>
                            </div>
                          </div>

                          {joinTeamError && (
                            <div className="alert alert-danger py-2 px-3 mb-3 text-start" style={{ fontSize: "13px" }}>
                              {joinTeamError}
                            </div>
                          )}

                          <button
                            className="btn hero-pixel-btn hero-pixel-btn--primary w-100 mb-2"
                            onClick={handleJoinTeam}
                          >
                            JOIN TEAM →
                          </button>

                          <button
                            className="btn btn-sm btn-outline-secondary w-100 mt-2"
                            style={{ fontSize: "10px" }}
                            onClick={() => setActivePage("team-portal")}
                          >
                            ← BACK TO PORTAL
                          </button>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* REGISTRATION */}

                  {activePage === "registration" && (
                    <div
                      className="fade-in w-100"
                      style={{ maxWidth: "860px" }}
                    >
                      <div className="retro-window">
                        <div className="retro-window-header">
                          <span className="retro-window-title">■ GUILD_FOUNDRY // REGISTER_PARTY</span>
                          <div className="retro-window-controls">
                            <span>_</span>
                            <span>🗖</span>
                            <span>✕</span>
                          </div>
                        </div>

                        <div className="retro-window-body p-3 p-md-5">
                          <div className="text-center mb-4">
                            <span className="chapter-badge d-inline-block mb-2">⚔️ CHAPTER 01 // GUILD REGISTRATION</span>
                            <h2 className="fw-bold tracking-wide text-uppercase mb-1" style={{ fontSize: "clamp(20px, 4vw, 28px)" }}>
                              REGISTER TEAM
                            </h2>
                            <p className="text-muted small mb-0" style={{ fontFamily: "var(--body-pixel)" }}>
                              Enlist your party in the Code Cortex quest
                            </p>
                          </div>

                          {registrationSubmitted ? (
                            <div className="text-center py-4 fade-in">
                              <div className="rpg-lead-dialogue mb-4 d-inline-block p-4" style={{ maxWidth: "560px" }}>
                                <div className="text-success fw-bold mb-2" style={{ fontFamily: "var(--font-heading)", fontSize: "16px" }}>
                                  ✨ PARTY ENROLLED!
                                </div>
                                <h4 className="mb-3" style={{ color: "var(--pixel-eggplant)", fontSize: "14px" }}>
                                  Your Guild ID is:
                                  <span className="d-block mt-2 id-code" style={{ fontSize: "22px", color: "var(--retro-teal-dark)" }}>
                                    {newTeamId}
                                  </span>
                                </h4>
                                <p className="text-muted mb-0 small" style={{ fontFamily: "var(--body-pixel)" }}>
                                  Please share this Guild ID and your Team Password with your fellow party members so they can join your team.
                                </p>
                              </div>
                              <div>
                                <button
                                  className="btn hero-pixel-btn hero-pixel-btn--primary px-4 py-2"
                                  onClick={() => {
                                    setActivePage("team-portal");
                                    setRegistrationSubmitted(false);
                                  }}
                                >
                                  GO TO TEAM PORTAL →
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="d-flex align-items-center gap-2 mb-3">
                                <span className="mission-tag">STEP 01</span>
                                <h4 className="mb-0" style={{ fontSize: "13px" }}>TEAM DETAILS</h4>
                              </div>

                              <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>TEAM NAME</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="Enter team name..."
                                    value={regTeamName}
                                    onChange={(e) => setRegTeamName(e.target.value)}
                                  />
                                </div>

                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>CHALLENGE TRACK</label>
                                  <select
                                    className="form-select"
                                    style={{
                                      ...inputStyle,
                                      cursor: "pointer"
                                    }}
                                    value={regTrack}
                                    onChange={(e) => setRegTrack(e.target.value)}
                                  >
                                    <option value="" disabled>
                                      Select Track...
                                    </option>
                                    <option>Finance</option>
                                    <option>Medicine & Healthcare</option>
                                    <option>Drone tech & aviation</option>
                                    <option>Security</option>
                                    <option>Open Innovation</option>
                                  </select>
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-2 mb-3">
                                <span className="mission-tag">STEP 02</span>
                                <h4 className="mb-0" style={{ fontSize: "13px" }}>LEADER & SECURITY DETAILS</h4>
                              </div>

                              <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>LEADER NAME</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="Full Name"
                                    value={regLeaderName}
                                    onChange={(e) => setRegLeaderName(e.target.value)}
                                  />
                                </div>

                                {!isExternalParticipant && (
                                  <div className="col-md-6">
                                    <label className="form-label" style={{ fontSize: "10px" }}>REGISTRATION NUMBER</label>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={inputStyle}
                                      placeholder="Leader Reg No (e.g. 21BCE1234)"
                                      value={regLeaderRegNo}
                                      onChange={(e) => setRegLeaderRegNo(e.target.value.toUpperCase())}
                                    />
                                  </div>
                                )}

                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>LEADER EMAIL</label>
                                  <input
                                    type="email"
                                    className="form-control"
                                    style={{
                                      ...inputStyle,
                                      backgroundColor: "rgba(224, 179, 200, 0.15)",
                                      cursor: "not-allowed"
                                    }}
                                    value={loggedInUser?.Email || ""}
                                    disabled
                                  />
                                </div>

                                <div className="col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>NUMBER OF MEMBERS (2-4)</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="4"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="No. of Members (2-4)"
                                    value={regMembers}
                                    onChange={(e) => handleRegMembersChange(e.target.value)}
                                  />
                                </div>

                                <div className="col-md-12">
                                  <label className="form-label" style={{ fontSize: "10px" }}>SET TEAM PASSWORD (MIN 4 CHARS)</label>
                                  <div className="position-relative">
                                    <input
                                      type={showRegPassword ? "text" : "password"}
                                      className="form-control pe-5"
                                      style={inputStyle}
                                      placeholder="Set Team Password"
                                      value={regPassword}
                                      onChange={(e) => setRegPassword(e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm text-secondary position-absolute end-0 top-50 translate-middle-y me-2 border-0 bg-transparent fw-bold"
                                      style={{ fontFamily: "var(--font-heading)", fontSize: "10px" }}
                                      onClick={() => setShowRegPassword(!showRegPassword)}
                                    >
                                      {showRegPassword ? "HIDE" : "SHOW"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {teamMembersList.length > 0 && (
                                <>
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className="mission-tag">STEP 03</span>
                                    <h4 className="mb-0" style={{ fontSize: "13px" }}>PARTY MEMBERS DETAILS</h4>
                                  </div>

                                  {teamMembersList.map((member, index) => (
                                    <div key={index} className="rpg-stat-card p-3 mb-3">
                                      <div className="fw-bold mb-2 text-uppercase" style={{ fontSize: "11px", color: "var(--retro-teal-dark)", fontFamily: "var(--font-heading)" }}>
                                        👤 Member {index + 2}
                                      </div>
                                      <div className="row g-3">
                                        <div className={isExternalParticipant ? "col-md-6" : "col-md-4"}>
                                          <label className="form-label" style={{ fontSize: "9px" }}>NAME</label>
                                          <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            style={inputStyle}
                                            placeholder="Full Name"
                                            value={member.name}
                                            onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                                          />
                                        </div>
                                        {!isExternalParticipant && (
                                          <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: "9px" }}>REG NO</label>
                                            <input
                                              type="text"
                                              className="form-control form-control-sm"
                                              style={inputStyle}
                                              placeholder="e.g. 21BCE1234"
                                              value={member.regNo}
                                              onChange={(e) => handleMemberChange(index, 'regNo', e.target.value)}
                                            />
                                          </div>
                                        )}
                                        <div className={isExternalParticipant ? "col-md-6" : "col-md-4"}>
                                          <label className="form-label" style={{ fontSize: "9px" }}>EMAIL</label>
                                          <input
                                            type="email"
                                            className="form-control form-control-sm"
                                            style={inputStyle}
                                            placeholder="Email Address"
                                            value={member.email}
                                            onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}

                              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-3 pt-3 border-top" style={{ borderColor: "#e0b3c8 !important" }}>
                                <button
                                  type="button"
                                  className="btn hero-pixel-btn hero-pixel-btn--secondary px-4 py-2"
                                  onClick={() => setShowModal(true)}
                                >
                                  📜 VIEW RULES
                                </button>

                                <button
                                  type="button"
                                  className="btn hero-pixel-btn hero-pixel-btn--primary px-4 py-2"
                                  onClick={handleTeamSubmit}
                                  disabled={isSubmittingTeam}
                                >
                                  {isSubmittingTeam ? "ENLISTING..." : "REGISTER TEAM →"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONTACT */}

                  {activePage === "contact" && (
                    <div
                      className="fade-in w-100"
                      style={{ maxWidth: "720px" }}
                    >
                      <div className="retro-window">
                        <div className="retro-window-header">
                          <span className="retro-window-title">■ POST_OFFICE // TRANSMIT_MESSAGE</span>
                          <div className="retro-window-controls">
                            <span>_</span>
                            <span>🗖</span>
                            <span>✕</span>
                          </div>
                        </div>

                        <div className="retro-window-body p-3 p-md-5">
                          <div className="text-center mb-4">
                            <span className="chapter-badge d-inline-block mb-2">📬 CHAPTER 05 // GET IN TOUCH</span>
                            <h2 className="fw-bold tracking-wide text-uppercase mb-1" style={{ fontSize: "clamp(20px, 4vw, 28px)" }}>
                              CONTACT GUILD
                            </h2>
                            <p className="text-muted small mb-0" style={{ fontFamily: "var(--body-pixel)" }}>
                              Have a query or need guidance? Send a dispatch to the organizers
                            </p>
                          </div>

                          {contactSubmitted ? (
                            <div className="text-center py-4 fade-in">
                              <div className="rpg-lead-dialogue mb-4 d-inline-block p-4" style={{ maxWidth: "520px" }}>
                                <div className="text-success fw-bold mb-2" style={{ fontFamily: "var(--font-heading)", fontSize: "15px" }}>
                                  🕊️ DISPATCH SENT!
                                </div>
                                <p className="mb-0 text-muted small" style={{ fontFamily: "var(--body-pixel)" }}>
                                  Your message has been delivered to the Code Cortex headquarters. Our guildmasters will reply promptly.
                                </p>
                              </div>
                              <div>
                                <button
                                  className="btn hero-pixel-btn hero-pixel-btn--secondary px-4 py-2"
                                  onClick={() => setContactSubmitted(false)}
                                >
                                  SEND ANOTHER DISPATCH
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="row g-3 mb-4">
                                <div className="col-12 col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>FIRST NAME</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="First Name"
                                  />
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>LAST NAME</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="Last Name"
                                  />
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>SUBJECT</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="Topic or Category"
                                  />
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label" style={{ fontSize: "10px" }}>EMAIL ADDRESS</label>
                                  <input
                                    type="email"
                                    className="form-control"
                                    style={inputStyle}
                                    placeholder="you@example.com"
                                  />
                                </div>

                                <div className="col-12">
                                  <label className="form-label" style={{ fontSize: "10px" }}>MESSAGE</label>
                                  <textarea
                                    className="form-control"
                                    style={{
                                      ...inputStyle,
                                      resize: "none"
                                    }}
                                    rows={4}
                                    placeholder="Write your dispatch here..."
                                  />
                                </div>
                              </div>

                              <div className="text-center pt-2">
                                <button
                                  type="button"
                                  className="btn hero-pixel-btn hero-pixel-btn--primary px-5 py-2"
                                  onClick={() => setContactSubmitted(true)}
                                >
                                  SEND DISPATCH →
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* FOOTER */}

                <div
                  className="py-4 w-100 px-4 px-md-5 row m-0 align-items-center"
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.7)"
                  }}
                >

                  <div className="col-12 col-md-4 d-none d-md-block"></div>

                  <div className="col-12 col-md-4 text-center mb-3 mb-md-0">
                    <span className="opacity-50">
                      Copyright © 2026 TAM-VIT.
                      All rights reserved
                    </span>
                  </div>

                  <div className="col-12 col-md-4 text-center text-md-end">

                    <span>
                      Follow us on Instagram:{" "}
                      <a
                        href="https://instagram.com/tam.vit_vellore"
                        target="_blank"
                        rel="noreferrer"
                        className="text-info text-decoration-none fw-bold"
                      >
                        @tam.vit_vellore
                      </a>
                    </span>

                  </div>

                </div>

                {/* RULES MODAL */}

                {showModal && (
                  <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
                    style={{
                      backgroundColor: "rgba(45, 31, 54, 0.7)",
                      backdropFilter: "blur(4px)",
                      zIndex: 1050
                    }}
                  >
                    <div
                      className="retro-window w-100 fade-in"
                      style={{ maxWidth: "600px" }}
                    >
                      <div className="retro-window-header">
                        <span className="retro-window-title">■ TOURNAMENT_CODEX // RULES</span>
                        <div className="retro-window-controls">
                          <span style={{ cursor: "pointer" }} onClick={() => setShowModal(false)}>✕</span>
                        </div>
                      </div>

                      <div className="retro-window-body p-4 p-md-5">
                        <div className="text-center mb-4">
                          <span className="chapter-badge d-inline-block mb-2">📜 TOURNAMENT BYLAWS</span>
                          <h3 className="fw-bold tracking-wide text-uppercase mb-1" style={{ fontSize: "18px" }}>
                            RULES & DETAILS
                          </h3>
                        </div>

                        <div className="lh-lg d-flex flex-column gap-3 fs-6" style={{ fontFamily: "var(--body-pixel)", color: "var(--pixel-eggplant)" }}>
                          <div className="rpg-stat-card p-3 d-flex align-items-start gap-2">
                            <span className="badge" style={{ background: "#7abcc4", color: "#2d1f36", border: "1.5px solid #2d1f36" }}>01</span>
                            <div>Ensure all team registration fields are filled completely and accurately.</div>
                          </div>

                          <div className="rpg-stat-card p-3 d-flex align-items-start gap-2">
                            <span className="badge" style={{ background: "#fde88a", color: "#2d1f36", border: "1.5px solid #2d1f36" }}>02</span>
                            <div>Party size is strictly limited to <strong>2 to 4 members</strong>.</div>
                          </div>

                          <div className="rpg-stat-card p-3 d-flex align-items-start gap-2">
                            <span className="badge" style={{ background: "#f8b4cb", color: "#2d1f36", border: "1.5px solid #2d1f36" }}>03</span>
                            <div>Upon registration, your team credentials (Team ID & Password) will be generated. Share them with your party.</div>
                          </div>

                          <div className="rpg-stat-card p-3 d-flex align-items-start gap-2">
                            <span className="badge" style={{ background: "#c4b5fd", color: "#2d1f36", border: "1.5px solid #2d1f36" }}>04</span>
                            <div>All project artifacts (GitHub & Figma) must be submitted before each review deadline.</div>
                          </div>
                        </div>

                        <div className="text-center mt-4 pt-3 border-top" style={{ borderColor: "#e0b3c8 !important" }}>
                          <button
                            type="button"
                            className="btn hero-pixel-btn hero-pixel-btn--primary px-4 py-2"
                            onClick={() => setShowModal(false)}
                          >
                            UNDERSTOOD ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}
          </>
        )}
      </div>

      {role === "admin" && adminLoggedIn && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 overflow-auto admin-portal-wrapper"
          style={{ zIndex: 1900 }}
        >
          {/* Admin Top Header */}
          <header className="admin-portal-header">
            <div className="container d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ maxWidth: "1240px" }}>
              <div className="d-flex align-items-center flex-wrap gap-3">
                <div className="admin-badge-pill">
                  <span style={{ width: 8, height: 8, background: "var(--lime)", border: "1.5px solid #2d1f36", display: "inline-block" }} />
                  <span>🛡️ CODE CORTEX // REVIEW PANEL</span>
                </div>
                <span className="text-secondary" style={{ fontSize: "14px" }}>
                  Evaluator: <strong style={{ color: "#2d1f36", fontFamily: "var(--pixel)", fontSize: "10.5px" }}>{adminUsername || "Admin"}</strong>
                </span>
              </div>

              <button
                className="btn btn-sm btn-danger py-2 px-3"
                style={{ fontSize: "10px" }}
                onClick={() => {
                  setAdminLoggedIn(false);
                  setRole('participant');
                  setAdminUsername('');
                  setAdminPassword('');
                  setAdminError(null);
                  setShowAdminLogin(false);
                  setActivePage('team-portal');
                  try {
                    localStorage.removeItem(STORAGE_KEY_ADMIN);
                    localStorage.removeItem(STORAGE_KEY_ADMIN_NAME);
                  } catch {
                    // ignore
                  }
                  showToast("Admin signed out", "info");
                }}
              >
                LOGOUT ✕
              </button>
            </div>
          </header>

          <div className="container py-2" style={{ maxWidth: "1240px", position: "relative", zIndex: 10 }}>
            <div className="row g-4 align-items-start">
              {/* Left Column: Submissions Queue */}
              <div className="col-lg-4">
                <div className="retro-window h-100">
                  <div className="retro-window__header">
                    <div className="retro-window__title">
                      <span>■ QUEUE</span>
                      <span style={{ opacity: 0.5 }}>//</span>
                      <span style={{ color: "#7d5a96" }}>SUBMISSIONS</span>
                    </div>
                    <span className="badge" style={{ background: "#fde88a", color: "#2d1f36", fontSize: "8px" }}>
                      {uniqueTeams.length} TEAMS
                    </span>
                  </div>

                  <div className="p-3">
                    <div className="small text-secondary mb-3" style={{ fontSize: "13px", lineHeight: 1.5 }}>
                      Filter teams by ID or name, then click a team card to score their project:
                    </div>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontSize: "9px" }}>FILTER BY TEAM ID</label>
                      <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        style={inputStyle}
                        placeholder="e.g. CC-101"
                        value={adminTeamFilter}
                        onChange={(e) => setAdminTeamFilter(e.target.value)}
                      />

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-info btn-sm flex-grow-1"
                          style={{ fontSize: "9.5px", padding: "8px 12px" }}
                          onClick={() => fetchSubmissions()}
                        >
                          🔄 REFRESH
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          style={{ fontSize: "9.5px", padding: "8px 12px" }}
                          onClick={() => {
                            setSelectedSubmissionIndex(null);
                            setAdminTeamId('');
                            setAdminTeamFilter('');
                          }}
                        >
                          CLEAR
                        </button>
                      </div>
                    </div>

                    <hr className="border-secondary my-3" />

                    <div style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                      {uniqueTeams.length === 0 ? (
                        <div className="p-3 text-center text-secondary" style={{ fontSize: "13.5px", background: "#fdfbf7", border: "1.5px dashed #2d1f36", borderRadius: "6px" }}>
                          No submissions found yet
                        </div>
                      ) : (
                        uniqueTeams.map((team) => {
                          const teamId = String(team?.Team_ID || '').trim();
                          const isSelected = adminTeamId.trim() === teamId;

                          return (
                            <div
                              key={teamId}
                              className={`admin-team-item ${isSelected ? 'admin-team-item--selected' : ''}`}
                              onClick={() => {
                                setAdminTeamId(teamId);
                                setAdminTeamFilter(teamId);
                                setScoreReviewRound('Review 1');

                                const firstIndex = submissions.findIndex(
                                  (item) => String(item?.Team_ID || '').trim() === teamId
                                );
                                setSelectedSubmissionIndex(firstIndex >= 0 ? firstIndex : null);
                              }}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-bold id-code" style={{ fontSize: "13.5px", color: "#2d1f36" }}>
                                  {teamId || 'Unknown Team'}
                                </span>
                                {isSelected && (
                                  <span className="badge" style={{ background: "#fde88a", color: "#2d1f36", fontSize: "8px" }}>
                                    SCORING
                                  </span>
                                )}
                              </div>
                              <div className="text-secondary" style={{ fontSize: "13px" }}>
                                {team?.['Team_Name '] || 'Unnamed Team'}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Scoring Console */}
              <div className="col-lg-8">
                <AdminDashboard
                  submission={selectedReviewSubmission}
                  approach={scoreApproach}
                  setApproach={setScoreApproach}
                  scalability={scoreScalability}
                  setScalability={setScoreScalability}
                  design={scoreDesign}
                  setDesign={setScoreDesign}
                  tech={scoreTech}
                  setTech={setScoreTech}
                  usp={scoreUsp}
                  setUsp={setScoreUsp}
                  reviewRound={scoreReviewRound}
                  setReviewRound={setScoreReviewRound}
                  onSubmit={async () => { await handleAdminScoreSubmit(); }}
                  adminName={adminUsername}
                  lockedByOther={
                    existingReviewOwner && existingReviewOwner !== adminUsername
                      ? existingReviewOwner
                      : null
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADMIN LOGIN
      ===================================================== */}

      {showAdminLogin && !adminLoggedIn && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{
            backgroundColor: "rgba(45, 31, 54, 0.45)",
            backdropFilter: "blur(8px)",
            zIndex: 2000
          }}
        >
          <div
            className="retro-window w-100"
            style={{ maxWidth: "480px" }}
          >
            <div className="retro-window__header">
              <div className="retro-window__title">
                <span>■ ADMIN_GATE</span>
                <span style={{ opacity: 0.5 }}>//</span>
                <span style={{ color: "#7d5a96" }}>AUTHENTICATE</span>
              </div>
              <div className="retro-window__controls">
                <span>_</span>
                <span>🗖</span>
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminUsername("");
                    setAdminLoginName("");
                    setAdminPassword("");
                    setAdminError(null);
                    if (window.location.pathname === '/admin') {
                      window.history.pushState({}, '', '/');
                    }
                  }}
                >
                  ✕
                </span>
              </div>
            </div>

            <div className="retro-window__body text-center">
              <div className="mb-2">
                <span className="badge mb-3" style={{ background: "#7abcc4", color: "#2d1f36", fontSize: "9px", padding: "6px 14px", border: "1.5px solid #2d1f36", boxShadow: "2px 2px 0px #2d1f36" }}>
                  🛡️ BOARD ACCESS ONLY
                </span>
              </div>

              <h2 className="glow-text mb-4 fw-bold" style={{ fontSize: "clamp(22px, 2.5vw, 28px)" }}>
                Admin Login
              </h2>

              <div className="text-start mb-3">
                <label className="form-label">SELECT REVIEWER</label>
                <select
                  className="form-select mb-0"
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={adminLoginName}
                  onChange={(e) => {
                    setAdminLoginName(e.target.value);
                    setAdminError(null);
                  }}
                >
                  <option value="" disabled>
                    Select Reviewer...
                  </option>
                  {REVIEWERS.map((r) => (
                    <option key={r.email} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-start mb-4">
                <label className="form-label">ADMIN PASSCODE</label>
                <div className="position-relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    className="form-control pe-5 mb-0"
                    style={inputStyle}
                    placeholder="Admin Passcode"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminError(null);
                    }}
                    ref={adminPasswordRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAdminLogin();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm text-secondary position-absolute end-0 top-50 translate-middle-y me-2 border-0 bg-transparent"
                    style={{ fontFamily: "var(--pixel)", fontSize: "9px" }}
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                  >
                    {showAdminPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="alert alert-danger py-2 px-3 mb-3 text-start" style={{ fontSize: "13px" }}>
                  {adminError}
                </div>
              )}

              <button
                className="btn btn-lg-retro btn-primary w-100 mb-2"
                onClick={handleAdminLogin}
              >
                AUTHENTICATE →
              </button>

              <button
                className="btn btn-sm btn-outline-secondary w-100 mt-2"
                style={{ fontSize: "10px" }}
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminUsername("");
                  setAdminLoginName("");
                  setAdminPassword("");
                  setAdminError(null);
                  if (window.location.pathname === '/admin') {
                    window.history.pushState({}, '', '/');
                  }
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}