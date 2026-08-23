import { useState, useEffect, useRef } from "react";

import {
  addTeam,
  addSubmission,
  syncAuth,
  authTeam,
  joinTeam,
  getSubmissions,
  addReview,
  getTeamMembers,
  getTeams
} from "./services/api";
import type { User } from "./types/database";
import { AdminDashboard } from "./components/AdminDashboard";
export default function App() {
  // =====================================================
  // APPLICATION STATE
  // =====================================================

  const [role, setRole] = useState<string | null>(null);
  const [activePage, setActivePage] = useState("home");

  const [showModal, setShowModal] = useState(false);

  const [loggedInUser, setLoggedInUser] =
    useState<User | null>(null);

  const [participantUsername, setParticipantUsername] =
    useState("");

  const [participantPassword, setParticipantPassword] =
    useState("");
  const [participantError, setParticipantError] = useState<string | null>(null);
  const participantPasswordRef = useRef<HTMLInputElement | null>(null);

  // =====================================================
  // REGISTRATION
  // =====================================================

  const [regTeamName, setRegTeamName] = useState("");
  const [regTrack, setRegTrack] = useState("");
  const [regLeaderName, setRegLeaderName] = useState("");
  const [regMembers, setRegMembers] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [registrationSubmitted, setRegistrationSubmitted] =
    useState(false);

  const [newTeamId, setNewTeamId] = useState("");

  // =====================================================
  // JOIN TEAM
  // =====================================================

  const [joinTeamId, setJoinTeamId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const [teamPasswordInput, setTeamPasswordInput] =
    useState("");

  // =====================================================
  // SUBMISSION
  // =====================================================

  const [subGithub, setSubGithub] = useState("");
  const [subFigma, setSubFigma] = useState("");
  const [subDesc, setSubDesc] = useState("");

  const [projectSubmitted, setProjectSubmitted] =
    useState(false);

  // =====================================================
  // ADMIN
  // =====================================================

  const [adminLoggedIn, setAdminLoggedIn] =
    useState(false);

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [adminError, setAdminError] = useState<string | null>(null);
  const adminPasswordRef = useRef<HTMLInputElement | null>(null);

  const [showAdminLogin, setShowAdminLogin] =
    useState(false);

  const [adminTeamId, setAdminTeamId] = useState("");
  const [adminTeamFilter, setAdminTeamFilter] = useState("");

  // Admin data
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissionIndex, setSelectedSubmissionIndex] = useState<number | null>(null);

  const [scoreApproach, setScoreApproach] = useState("");
  const [scoreScalability, setScoreScalability] = useState("");
  const [scoreDesign, setScoreDesign] = useState("");
  const [scoreTech, setScoreTech] = useState("");
  const [scoreUsp, setScoreUsp] = useState("");
  const [scoreReviewRound, setScoreReviewRound] = useState("Review 1");

  // =====================================================
  // TEAM LOGIN
  // =====================================================

  const [teamLoggedIn, setTeamLoggedIn] = useState(false);
const [teamIdInput, setTeamIdInput] = useState("");

const [teamLoginError, setTeamLoginError] =
  useState<string | null>(null);

const teamPasswordRef =
  useRef<HTMLInputElement | null>(null);

const [joinTeamError, setJoinTeamError] =
  useState<string | null>(null);

const joinPasswordRef =
  useRef<HTMLInputElement | null>(null);

const [teamMembers, setTeamMembers] = useState<any[]>([]);
const [teamDetails, setTeamDetails] = useState<any | null>(null);

useEffect(() => {
  if (teamLoggedIn && teamIdInput) {
    getTeamMembers(teamIdInput)
      .then(setTeamMembers)
      .catch((e) => console.error("Failed to load team members:", e));

    getTeams()
      .then(teams => {
        const current = teams.find(t => String(t.Team_ID).trim() === String(teamIdInput).trim());
        if (current) setTeamDetails(current);
      })
      .catch((e) => console.error("Failed to load team details:", e));
  } else {
    setTeamMembers([]);
    setTeamDetails(null);
  }
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
    if (adminLoggedIn) {
      fetchSubmissions();
    }
  }, [adminLoggedIn]);

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setShowAdminLogin(true);
    }
  }, []);


  const handleAdminScoreSubmit = async () => {
    // determine team id and selected submission
    const submission = selectedReviewSubmission;
    const teamId = (submission && submission.Team_ID) || adminTeamId.trim();

    if (!teamId) {
      alert('Please select a submission or enter a Team ID to score.');
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
  // INITIAL ROLE
  // =====================================================

  useEffect(() => {
    setRole("participant");
  }, []);

  useEffect(() => {
    if (loggedInUser?.Name) {
      setRegLeaderName(loggedInUser.Name);
    }
  }, [loggedInUser]);

  // =====================================================
  // STYLES
  // =====================================================

  const inputStyle = {
    background: "transparent",
    border: "none",
    borderBottom:
      "1px solid rgba(30, 90, 255, 0.4)",
    borderRadius: "0",
    color: "white",
    paddingLeft: "5px",
    boxShadow: "none"
  };

  // =====================================================
  // TRACKS
  // =====================================================

  const tracks = [
    {
      title: "Finance",
      desc:
        "Build AI/ML solutions that address challenges in the financial sector such as fraud detection, forecasting, and risk assessment.",
      file: "finance_dataset.zip"
    },
    {
      title: "Medicine and Healthcare",
      desc:
        "Develop AI/ML solutions that improve healthcare through intelligent analysis of medical data, imaging, and patient monitoring.",
      file: "healthcare_dataset.zip"
    },
    {
      title: "Drone tech and aviation",
      desc:
        "Develop AI/ML solutions for drone technology and aviation in the areas of autonomous systems, aerial analytics, and flight intelligence.",
      file: "aviation_dataset.zip"
    },
    {
      title: "Security",
      desc:
        "Build AI/ML solutions that enhance security across physical and digital environments including cybersecurity and anomaly detection.",
      file: "security_dataset.zip"
    },
    {
      title: "Open Innovation",
      desc:
        "Tackle any real-world problem using AI and ML. Participants are free to select their own dataset and build a unique AI/ML solution.",
      file: null
    }
  ];

  // =====================================================
  // TEAM REGISTRATION
  // =====================================================
const handleParticipantLogin = async () => {
  setParticipantError(null);

  const username = participantUsername.trim();
  const password = participantPassword;

  if (!username) {
    setParticipantError("Please enter your Student ID / Username.");

    return;
  }

  if (!password) {
    setParticipantError("Please enter your password.");

    requestAnimationFrame(() => {
      participantPasswordRef.current?.focus();
    });

    return;
  }

  try {
    const user = await syncAuth(username, password);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    setLoggedInUser(user);
    setParticipantError(null);

    setParticipantPassword("");

  } catch (error) {
    console.error("Participant login error:", error);

    setParticipantError(
      error instanceof Error
        ? error.message
        : "Invalid credentials"
    );

    // Clear wrong password
    setParticipantPassword("");

    // Let user immediately type a new password
    requestAnimationFrame(() => {
      participantPasswordRef.current?.focus();
    });
  }
};
  const handleTeamSubmit = async () => {
    if (!regTeamName.trim()) {
      alert("Please enter a team name.");
      return;
    }

    if (!regTrack) {
      alert("Please select a track.");
      return;
    }

    if (!regLeaderName.trim()) {
      alert("Please enter the Team Leader name.");
      return;
    }

    const memberCount = Number(regMembers);

    if (
      !Number.isInteger(memberCount) ||
      memberCount < 2 ||
      memberCount > 4
    ) {
      alert("Team size must be between 2 and 4 members.");
      return;
    }

    if (
      !regPassword ||
      regPassword.length < 4
    ) {
      alert(
        "Please enter a team password of at least 4 characters."
      );
      return;
    }

    if (!loggedInUser) {
      alert("Please log in first.");
      return;
    }

    try {
      const teamId =
        "CC-" +
        Math.floor(1000 + Math.random() * 9000);

      await addTeam(
  {
    Team_ID: teamId,
    "Team_ Name": regTeamName.trim(),
    Track: regTrack,
    Team_Leader: regLeaderName.trim(),
    "No. of Members": String(memberCount)
  },
  regPassword,
  loggedInUser.User_ID
);

      setLoggedInUser({
        ...loggedInUser,
        Team_ID: teamId
      });

      setNewTeamId(teamId);
      setRegistrationSubmitted(true);

    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit registration."
      );
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

  try {
    const success = await joinTeam(
      joinTeamId.trim(),
      joinPassword,
      loggedInUser.User_ID
    );

    if (!success) {
      throw new Error("Failed to join team. Please check the Team ID and Password.");
    }

    setLoggedInUser({
      ...loggedInUser,
      Team_ID: joinTeamId.trim()
    });

    setTeamIdInput(joinTeamId.trim());
    setTeamPasswordInput(joinPassword);
    setTeamLoggedIn(true);

    setJoinTeamError(null);
    setJoinPassword("");

    setActivePage("team-portal");

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

     const handleTeamLogin = async () => {
  setTeamLoginError(null);

  const teamId = teamIdInput.trim();
  const password = teamPasswordInput;

  if (!teamId) {
    setTeamLoginError("Please enter your Team ID.");

    setTimeout(() => {
      document.getElementById("team-id-input")?.focus();
    }, 50);

    return;
  }

  if (!password) {
    setTeamLoginError("Please enter your Team Password.");

    setTimeout(() => {
      teamPasswordRef.current?.focus();
    }, 50);

    return;
  }

  try {
    const success = await authTeam(teamId, password);

    if (!success) {
      throw new Error("Invalid credentials");
    }

    // Successful login
    setTeamLoggedIn(true);
    setTeamLoginError(null);

    // Keep the Team ID but clear the password
    setTeamPasswordInput("");

  } catch (error) {
    console.error("Team login error:", error);

    setTeamLoginError(
      error instanceof Error
        ? error.message
        : "Invalid credentials"
    );

    // Remove the incorrect password
    setTeamPasswordInput("");

    // Put cursor back into password field
    requestAnimationFrame(() => {
      teamPasswordRef.current?.focus();
    });
  }
};

  

  // =====================================================
  // PROJECT SUBMISSION
  // =====================================================

  const handleProjectSubmit = async () => {
    if (!teamIdInput.trim()) {
      alert("Team ID is missing.");
      return;
    }

    if (!subGithub.trim()) {
      alert("Please enter your GitHub repository link.");
      return;
    }

    if (!subDesc.trim()) {
      alert("Please enter a project description.");
      return;
    }

    try {
      await addSubmission({
        Team_ID: teamIdInput.trim(),
        "Team_Name ": loggedInUser?.Name || teamIdInput,
        Project_Description: subDesc.trim(),
        "GitHub Link": subGithub.trim(),
        "Figma Link": subFigma.trim(),
        "Submission Time":
          new Date().toLocaleString()
      });

      setProjectSubmitted(true);

    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit project."
      );
    }
  };

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  const handleAdminLogin = async () => {
    const email = String(adminUsername ?? '').trim();
    const password = String(adminPassword ?? '').trim();

    if (!email || !password) {
      setAdminError('Please enter the admin email and passcode.');
      return;
    }

    try {
      const user = await syncAuth(email, password);
      const role = String(user['Role (Participant/Admin)'] || '').trim();

      if (role.toLowerCase() === 'admin') {
        setAdminLoggedIn(true);
        setShowAdminLogin(false);
        setRole('admin');
        setLoggedInUser(null);
        setActivePage('home');
        setAdminError(null);
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setAdminError('Invalid Admin Email or Passcode!');
        setAdminPassword('');
        setTimeout(() => adminPasswordRef.current?.focus(), 0);
      }
    } catch (error) {
      const msg = error instanceof Error
        ? error.message
        : 'Invalid Admin Email or Passcode!';
      setAdminError(msg);
      setAdminPassword('');
      setTimeout(() => adminPasswordRef.current?.focus(), 0);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (!role) {
    return null;
  }

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

      <div className="main-content position-relative z-3 min-vh-100 d-flex flex-column">

        {/* Admin Login button removed */}

        {/* =================================================
            PARTICIPANT
        ================================================= */}

        {role === "participant" && (
          <>
            {!loggedInUser ? (

              <div className="d-flex justify-content-center align-items-center flex-grow-1 p-3 fade-in">

                <div
                  className="glass-card p-5 text-center"
                  style={{ maxWidth: "450px" }}
                >

                  <h2 className="glow-text mb-4 fw-bold">
                    Participant Login
                  </h2>

                  <p className="text-secondary mb-4">
                    Enter your participant credentials
                    to access the Code Cortex portal.
                  </p>

                  <input
                    type="text"
                    className="form-control mb-4 py-2"
                    style={inputStyle}
                    placeholder="Student ID / Username"
                    value={participantUsername}
                    onChange={(e) =>
                      setParticipantUsername(e.target.value)
                    }
                  />

                  <input
                    type="password"
                    className="form-control mb-4 py-2"
                    style={inputStyle}
                    placeholder="Password"
                    value={participantPassword}
                    onChange={(e) =>
                      setParticipantPassword(e.target.value)
                    }
                    ref={participantPasswordRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleParticipantLogin();
                      }
                    }}
                  />

                  {participantError && (
                    <div className="text-danger mb-3">{participantError}</div>
                  )}

                  <button
                    className="btn btn-gradient w-100 py-2 fw-bold"
                    onClick={handleParticipantLogin}
                  >
                    Login →
                  </button>

                  

                </div>
              </div>

            ) : (

              <>
                {/* =================================================
                    NAVBAR
                ================================================= */}

                <div className="d-flex justify-content-center align-items-center pt-4 w-100 position-relative">

                  <div className="position-absolute start-0 ms-4 ms-md-5">
                    <img
                      src="/TAM_WhiteLogo 1.png"
                      alt="TAM Logo"
                      style={{
                        height: "40px",
                        objectFit: "contain"
                      }}
                      onError={(e) =>
                        (e.currentTarget.style.display = "none")
                      }
                    />
                  </div>

                  <div className="floating-nav flex-wrap justify-content-center px-3 px-md-5 py-2 position-relative z-3">

                    <a
                      onClick={() => setActivePage("home")}
                      className={
                        activePage === "home"
                          ? "active"
                          : ""
                      }
                    >
                      Home
                    </a>

                    <a
                      onClick={() => setActivePage("tracks")}
                      className={
                        activePage === "tracks"
                          ? "active"
                          : ""
                      }
                    >
                      Tracks
                    </a>

                  

                    <a
  onClick={() => setActivePage("team-portal")}
  className={
    activePage === "team-portal"
      ? "active"
      : ""
  }
>
  Team Portal
</a>

                  </div>

                  <div className="position-absolute end-0 me-4 me-md-5">
                    <img
                      src="/vit_light 1.png"
                      alt="VIT Logo"
                      style={{
                        height: "45px",
                        objectFit: "contain"
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

                  {/* HOME */}

                  {activePage === "home" && (
                    <div className="text-center fade-in w-100">

                      <h3 className="fw-bold text-info tracking-wide mb-2">
                        graVITas'26
                      </h3>

                      <h2 className="fw-bold tracking-wide">
                        TAM-VIT
                      </h2>

                      <h4 className="fw-light mb-3 text-secondary">
                        welcomes you to
                      </h4>

                      <h1
                        className="display-4 display-md-1 fw-bold glow-text mb-5"
                        style={{ fontSize: "6rem" }}
                      >
                        Code Cortex 3.0
                      </h1>

                      <button
                        className="btn btn-gradient rounded-pill px-5 py-3 fs-5 mt-4 fw-bold"
                        onClick={() =>
                          setActivePage("tracks")
                        }
                      >
                        Discover Tracks
                      </button>

                      <div className="mt-5 pt-5">
                        <h3 className="fw-bold tracking-wide fs-5 fs-md-3">
                          SPONSORED BY
                        </h3>
                      </div>

                    </div>
                  )}

                  {/* TRACKS */}

                  {activePage === "tracks" && (
                    <div
                      className="text-center fade-in w-100"
                      style={{ maxWidth: "1200px" }}
                    >

                      <h1 className="fw-bold mb-4 mb-md-5 tracking-wide">
                        CODE CORTEX TRACKS
                      </h1>

                      <div className="row g-4 justify-content-center">

                        {tracks.map((track, idx) => (
                          <div
                            className="col-md-6 col-lg-4"
                            key={idx}
                          >

                            <div className="glass-card p-4 d-flex flex-column h-100">

                              <h4 className="glow-text my-3">
                                {track.title}
                              </h4>

                              <p className="text-secondary small mb-4 text-start lh-lg flex-grow-1">
                                {track.desc}
                              </p>

                              {track.file ? (
                                <a
                                  href={`/${track.file}`}
                                  download
                                  className="btn btn-outline-info btn-sm w-100 mt-3 rounded-pill"
                                >
                                  Download Dataset (.zip)
                                </a>
                              ) : (
                                <button
                                  className="btn btn-outline-secondary btn-sm w-100 mt-3 rounded-pill"
                                  disabled
                                >
                                  No Dataset Required
                                </button>
                              )}

                            </div>

                          </div>
                        ))}

                      </div>
                    </div>
                  )}

                  {/* TEAM PORTAL */}

                  {activePage === "team-portal" && (
                    <div className="fade-in w-100 d-flex justify-content-center">

                      {!teamLoggedIn ? (

                        <div
                          className="glass-card p-4 p-md-5 text-center w-100"
                          style={{ maxWidth: "450px" }}
                        >

                          <h2 className="fw-bold mb-2">
                            Team Login
                          </h2>

                          <p className="text-secondary mb-4">
                            Access your shared team dashboard.
                          </p>

                          <input
  id="team-id-input"
  type="text"
  className="form-control mb-4 py-2"
  style={inputStyle}
  placeholder="Team ID (e.g. CC-104)"
  value={teamIdInput}
  onChange={(e) => {
    setTeamIdInput(e.target.value);
    setTeamLoginError(null);
  }}
/>

                          <input
  type="password"
  className="form-control mb-4 py-2"
  style={inputStyle}
  placeholder="Team Password"
  value={teamPasswordInput}
  ref={teamPasswordRef}
  onChange={(e) => {
    setTeamPasswordInput(e.target.value);
    setTeamLoginError(null);
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      handleTeamLogin();
    }
  }}
/>
{teamLoginError && (
  <div className="text-danger mb-3">
    {teamLoginError}
  </div>
)}

                          <button
                            className="btn btn-gradient w-100 py-2 fw-bold"
                            onClick={handleTeamLogin}
                          >
                            Access Portal →
                          </button>

                          <>
  <hr className="border-secondary my-4" />

  <p className="text-white mb-2 fw-bold">
    Don't have a team yet?
  </p>

  <div className="d-flex gap-2">

    <button
      className="btn btn-outline-info btn-sm rounded-pill flex-grow-1"
      onClick={() => setActivePage("registration")}
    >
      Create Team
    </button>

    <button
      className="btn btn-outline-light btn-sm rounded-pill flex-grow-1"
      onClick={() => setActivePage("join-team")}
    >
      Join Existing
    </button>

  </div>
</>

                        </div>

                      ) : (

                        <div
                          className="glass-card p-4 p-md-5 w-100"
                          style={{ maxWidth: "800px" }}
                        >

                          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 border-bottom border-secondary pb-3 gap-3">

                            <h2 className="fw-bold text-info mb-0">
                              Dashboard:
                              <span className="text-white">
                                {" "}
                                {teamIdInput}
                              </span>
                            </h2>

                            <button
                              className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => {
                                setTeamLoggedIn(false);
                                setTeamPasswordInput("");
                              }}
                            >
                              Sign Out
                            </button>

                          </div>

                          <div className="row">

                            {/* TEAM INFORMATION */}

                            <div className="col-md-5 border-end border-secondary pe-md-4 mb-4 mb-md-0 text-start">

                              <h5 className="text-info mb-3">
                                Team Information
                              </h5>

                              <p className="text-secondary small mb-1">
                                Status:
                              </p>

                              <div
                                className="p-2 rounded mb-3"
                                style={{
                                  backgroundColor:
                                    "rgba(0, 150, 255, 0.1)"
                                }}
                              >
                                <p className="text-white mb-0 fw-bold">
                                  Active - Awaiting Review 1
                                </p>
                              </div>

                              <p className="text-secondary small mb-1">
                                Leader:
                              </p>

                              <p className="text-light mb-3">
                                {teamDetails?.Team_Leader || "Loading Leader..."}
                              </p>

                              <p className="text-secondary small mb-1">
                                Team ID:
                              </p>

                              <p className="text-info fw-bold mb-3">
                                {teamIdInput}
                              </p>

                              <p className="text-secondary small mb-2">
                                Team Members:
                              </p>
                              
                              {teamMembers.length > 0 ? (
                                <ul className="text-light small mb-3 ps-3">
                                  {teamMembers.map((member, idx) => (
                                    <li key={idx} className="mb-1">
                                      {member.Name} 
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-secondary small mb-3">Loading members...</p>
                              )}

                            </div>

                            {/* SUBMISSION */}

                            <div className="col-md-7 ps-md-4">

                              {projectSubmitted ? (

                                <div className="text-center py-5">

                                  <h3 className="text-success mb-3">
                                    Submission Received!
                                  </h3>

                                  <p className="text-secondary">
                                    Your project details have
                                    been submitted successfully.
                                  </p>

                                  <button
                                    className="btn btn-outline-info mt-4"
                                    onClick={() =>
                                      setProjectSubmitted(false)
                                    }
                                  >
                                    Update Submission
                                  </button>

                                </div>

                              ) : (

                                <>
                                  <h5 className="text-white mb-4">
                                    Submit Project Details
                                  </h5>

                                  <select className="form-select bg-dark text-white border-secondary mb-4">
                                    <option>
                                      Review 1
                                    </option>
                                    <option>
                                      Review 2
                                    </option>
                                  </select>

                                  <input
                                    type="url"
                                    className="form-control mb-4"
                                    style={inputStyle}
                                    placeholder="GitHub Repository Link"
                                    value={subGithub}
                                    onChange={(e) =>
                                      setSubGithub(
                                        e.target.value
                                      )
                                    }
                                  />

                                  <input
                                    type="url"
                                    className="form-control mb-4"
                                    style={inputStyle}
                                    placeholder="Figma / Design Link (Optional)"
                                    value={subFigma}
                                    onChange={(e) =>
                                      setSubFigma(
                                        e.target.value
                                      )
                                    }
                                  />

                                  <textarea
                                    className="form-control mb-4"
                                    style={{
                                      ...inputStyle,
                                      resize: "none"
                                    }}
                                    rows={3}
                                    placeholder="Brief Description of Progress..."
                                    value={subDesc}
                                    onChange={(e) =>
                                      setSubDesc(
                                        e.target.value
                                      )
                                    }
                                  />

                                  <button
                                    className="btn btn-gradient w-100 py-2 fw-bold"
                                    onClick={
                                      handleProjectSubmit
                                    }
                                  >
                                    Submit to Judges
                                  </button>
                                </>
                              )}

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
                        className="glass-card p-4 p-md-5 text-center w-100"
                        style={{ maxWidth: "450px" }}
                      >

                        <h2 className="fw-bold mb-2">
                          Join Existing Team
                        </h2>

                        <p className="text-secondary mb-4">
                          Enter the details provided by your
                          Team Leader.
                        </p>

                        <input
  id="join-team-id-input"
  type="text"
  className="form-control mb-4 py-2"
  style={inputStyle}
  placeholder="Team ID (e.g. CC-104)"
  value={joinTeamId}
  onChange={(e) => {
    setJoinTeamId(e.target.value);
    setJoinTeamError(null);
  }}
/>

                        <input
  type="password"
  className="form-control mb-4 py-2"
  style={inputStyle}
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

{joinTeamError && (
  <div className="text-danger mb-3">
    {joinTeamError}
  </div>
)}

                        <button
                          className="btn btn-gradient w-100 py-2 fw-bold"
                          onClick={handleJoinTeam}
                        >
                          Join Team →
                        </button>

                        <button
                          className="btn text-secondary mt-3 btn-sm"
                          onClick={() =>
                            setActivePage("team-portal")
                          }
                        >
                          ← Back
                        </button>

                      </div>
                    </div>
                  )}

                  {/* REGISTRATION */}

                  {activePage === "registration" && (
                    <div
                      className="fade-in w-100"
                      style={{ maxWidth: "800px" }}
                    >

                      <h1 className="fw-bold mb-4 mb-md-5 text-center tracking-wide text-uppercase">
                        REGISTER TEAM
                      </h1>

                      <div className="glass-card p-4 p-md-5">

                        {registrationSubmitted ? (

                          <div className="text-center py-5 fade-in">

                            <h2 className="text-success mb-3">
                              Team Registered!
                            </h2>

                            <h4 className="text-white mb-4">
                              Your Team ID is:
                              <span className="text-info fw-bold">
                                {" "}
                                {newTeamId}
                              </span>
                            </h4>

                            <p className="text-secondary mb-4">
                              Please share this ID and your
                              Team Password with your team
                              members so they can join.
                            </p>

                            <button
                              className="btn btn-outline-info mt-4"
                              onClick={() => {
                                setActivePage(
                                  "team-portal"
                                );
                                setRegistrationSubmitted(
                                  false
                                );
                              }}
                            >
                              Go to Team Portal
                            </button>

                          </div>

                        ) : (

                          <>
                            <h5 className="text-info mb-4">
                              1. Team Details
                            </h5>

                            <div className="row g-4">

                              <div className="col-md-6">

                                <input
                                  type="text"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="Team Name"
                                  value={regTeamName}
                                  onChange={(e) =>
                                    setRegTeamName(
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                              <div className="col-md-6">

                                <select
                                  className="form-select bg-dark text-white border-secondary"
                                  value={regTrack}
                                  onChange={(e) =>
                                    setRegTrack(
                                      e.target.value
                                    )
                                  }
                                >

                                  <option value="" disabled>
                                    Select Track...
                                  </option>

                                  <option>
                                    Finance
                                  </option>

                                  <option>
                                    Medicine & Healthcare
                                  </option>

                                  <option>
                                    Drone tech & aviation
                                  </option>

                                  <option>
                                    Security
                                  </option>

                                  <option>
                                    Open Innovation
                                  </option>

                                </select>

                              </div>
                            </div>

                            <h5 className="text-info mt-5 mb-4">
                              2. Leader & Security Details
                            </h5>

                            <div className="row g-4">

                              <div className="col-md-6">

                                <input
                                  type="text"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="Leader Name"
                                  value={regLeaderName}
                                  onChange={(e) =>
                                    setRegLeaderName(
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                              <div className="col-md-6">

                                <input
                                  type="email"
                                  className="form-control"
                                  style={{
                                    ...inputStyle,
                                    opacity: 0.7
                                  }}
                                  value={
                                    loggedInUser?.Email || ""
                                  }
                                  disabled
                                />

                              </div>

                              <div className="col-md-6">

                                <input
                                  type="number"
                                  min="2"
                                  max="4"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="No. of Members (2-4)"
                                  value={regMembers}
                                  onChange={(e) =>
                                    setRegMembers(
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                              <div className="col-md-6">

                                <input
                                  type="password"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="Set Team Password"
                                  value={regPassword}
                                  onChange={(e) =>
                                    setRegPassword(
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                            </div>

                            <div className="d-flex flex-column flex-md-row justify-content-between mt-4 gap-3">

                              <button
                                className="btn btn-outline-info px-4 py-2"
                                onClick={() =>
                                  setShowModal(true)
                                }
                              >
                                Rules
                              </button>

                              <button
                                className="btn btn-gradient px-4 py-2"
                                onClick={handleTeamSubmit}
                              >
                                Register
                              </button>

                            </div>

                          </>
                        )}

                      </div>
                    </div>
                  )}

                  {/* CONTACT */}

                  {activePage === "contact" && (
                    <div
                      className="fade-in w-100"
                      style={{ maxWidth: "700px" }}
                    >

                      <h1 className="fw-bold mb-4 mb-md-5 text-center tracking-wide">
                        CONTACT
                      </h1>

                      <div className="glass-card p-4 p-md-5">

                        {contactSubmitted ? (

                          <div className="text-center py-5 fade-in">

                            <h3 className="text-info mb-3">
                              Message Sent!
                            </h3>

                            <button
                              className="btn btn-outline-info mt-4"
                              onClick={() =>
                                setContactSubmitted(false)
                              }
                            >
                              Send Another Message
                            </button>

                          </div>

                        ) : (

                          <>
                            <div className="row g-4 mb-4">

                              <div className="col-12 col-md-6">
                                <input
                                  type="text"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="First Name"
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <input
                                  type="text"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="Last Name"
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <input
                                  type="text"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="Subject"
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <input
                                  type="email"
                                  className="form-control"
                                  style={inputStyle}
                                  placeholder="Email-id"
                                />
                              </div>

                              <div className="col-12 mt-2">
                                <textarea
                                  className="form-control"
                                  style={{
                                    ...inputStyle,
                                    resize: "none"
                                  }}
                                  rows={4}
                                  placeholder="Message"
                                />
                              </div>

                            </div>

                            <div className="text-center mt-5">

                              <button
                                className="btn btn-gradient px-5 py-2"
                                onClick={() =>
                                  setContactSubmitted(true)
                                }
                              >
                                Send Message →
                              </button>

                            </div>
                          </>
                        )}

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
                      backgroundColor:
                        "rgba(0,0,0,0.85)",
                      zIndex: 1050
                    }}
                  >

                    <div
                      className="glass-card p-4 p-md-5 position-relative w-100"
                      style={{ maxWidth: "600px" }}
                    >

                      <button
                        className="btn text-white position-absolute top-0 end-0 m-2 border-0 bg-transparent fs-3"
                        onClick={() =>
                          setShowModal(false)
                        }
                      >
                        ×
                      </button>

                      <h2 className="glow-text text-center mb-4 opacity-75 fs-4 fs-md-2">
                        RULES & DETAILS
                      </h2>

                      <div className="text-light lh-lg d-flex flex-column gap-2 gap-md-3 fs-6">

                        <p className="mb-0">
                          1. Fill up all the details mentioned.
                        </p>

                        <p className="mb-0">
                          2. Team size strictly restricted
                          to 2-4 members.
                        </p>

                        <p className="mb-0">
                          3. Upon registering, shared login
                          credentials will be generated for
                          your team.
                        </p>

                        <p className="mb-0">
                          4. Proceed to the payment gateway
                          to finalize registration.
                        </p>

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
          className="position-fixed top-0 start-0 w-100 h-100 overflow-auto p-3"
          style={{
            backgroundColor: "rgba(0,0,0,0.95)",
            zIndex: 1900
          }}
        >
          <div className="container py-4" style={{ maxWidth: "1200px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
              <div>
                <p className="text-secondary mb-1">Logged in as</p>
                <h2 className="glow-text fw-bold mb-0">{adminUsername || "Admin"}</h2>
              </div>

              <button
                className="btn btn-outline-danger btn-sm rounded-pill"
                onClick={() => {
                  setAdminLoggedIn(false);
                  setRole('participant');
                  setAdminUsername('');
                  setAdminPassword('');
                  setAdminError(null);
                  setShowAdminLogin(false);
                  setActivePage('home');
                }}
              >
                Logout
              </button>
            </div>

            <div className="glass-card p-4 p-md-5">
              <div className="row g-4 align-items-start">
                        <div className="col-lg-4">
                <div className="border border-info rounded p-3 h-100">
                  <h6 className="text-info mb-2">Submissions</h6>
                  <div className="small text-secondary mb-2">Type a team ID or name to filter, then click a submission to select it for scoring</div>

                  <div style={{ maxHeight: 320, overflow: 'auto' }}>
  {uniqueTeams.length === 0 ? (
    <div className="text-secondary small">
      No teams yet
    </div>
  ) : (
    uniqueTeams.map((team) => {
      const teamId = String(
        team?.Team_ID || ''
      ).trim();

      const isSelected =
        adminTeamId.trim() === teamId;

      return (
        <div
          key={teamId}
          className={`p-2 mb-2 rounded ${
            isSelected
              ? 'bg-dark border border-info'
              : 'bg-transparent'
          }`}
          style={{ cursor: 'pointer' }}
          onClick={() => {
  setAdminTeamId(teamId);
  setAdminTeamFilter(teamId);

  // Always start with Review 1 when a new team is selected
  setScoreReviewRound('Review 1');

  const firstIndex = submissions.findIndex(
    (item) =>
      String(item?.Team_ID || '').trim() === teamId
  );

  setSelectedSubmissionIndex(
    firstIndex >= 0 ? firstIndex : null
  );
}}
        >
          <div className="text-white fw-bold">
            {teamId || 'Unknown Team'}
          </div>

          <div className="text-secondary small">
            {team?.['Team_Name '] || ''}
          </div>
        </div>
      );
    })
  )}
</div>

                  <hr className="border-secondary my-3" />

                  <div className="text-secondary small mb-2">Filter / Select Team</div>
                  <input type="text" className="form-control mb-2" style={inputStyle} placeholder="Filter by Team ID" value={adminTeamFilter} onChange={(e) => setAdminTeamFilter(e.target.value)} />

                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-outline-info btn-sm" onClick={() => fetchSubmissions()}>Refresh</button>
                    <button className="btn btn-outline-light btn-sm" onClick={() => { setSelectedSubmissionIndex(null); setAdminTeamId(''); setAdminTeamFilter(''); }}>Clear</button>
                  </div>
                </div>
              </div>

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
                />
              </div>
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
            backgroundColor: "rgba(0,0,0,0.9)",
            zIndex: 2000
          }}
        >

          <div
            className="glass-card p-4 p-md-5 text-center w-100"
            style={{ maxWidth: "400px" }}
          >

            <h2 className="glow-text mb-4 fw-bold">
              Admin Login
            </h2>

            <input
              type="email"
              className="form-control mb-4 py-2"
              style={inputStyle}
              placeholder="Admin Email"
              value={adminUsername}
              onChange={(e) =>
                setAdminUsername(e.target.value)
              }
            />

            <input
  type="password"
  className="form-control mb-4 py-2"
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

            {adminError && (
              <div className="text-danger mb-3">{adminError}</div>
            )}

            <button
              className="btn btn-gradient w-100 py-2 fw-bold"
              onClick={handleAdminLogin}
            >
              Authenticate →
            </button>

            <button
              className="btn text-secondary mt-3 btn-sm"
              onClick={() => {
                setShowAdminLogin(false);
                setAdminUsername("");
                setAdminPassword("");
                setAdminError(null);
                if (window.location.pathname === '/admin') {
                  window.history.pushState({}, '', '/');
                }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}