type Submission = {
  Team_ID: string;
  'Team_Name '?: string;
  Project_Description?: string;
  'GitHub Link'?: string;
  'Figma Link'?: string;
  'Submission Time'?: string;
};

type Props = {
  submission?: Submission | null;
  approach: string;
  setApproach: (v: string) => void;
  scalability: string;
  setScalability: (v: string) => void;
  design: string;
  setDesign: (v: string) => void;
  tech: string;
  setTech: (v: string) => void;
  usp: string;
  setUsp: (v: string) => void;
  reviewRound: string;
  setReviewRound: (v: string) => void;
  onSubmit: () => Promise<void>;
  adminName?: string;
  /** Another reviewer's name, if they already scored this team for the
   * currently selected round — scores are then read-only for everyone else. */
  lockedByOther?: string | null;
};

export const AdminDashboard = ({
  submission,
  approach,
  setApproach,
  scalability,
  setScalability,
  design,
  setDesign,
  tech,
  setTech,
  usp,
  setUsp,
  reviewRound,
  setReviewRound,
  onSubmit,
  lockedByOther
}: Props) => {
  const isLocked = !!lockedByOther;
  const totalScore =
    (Number(approach) || 0) +
    (Number(scalability) || 0) +
    (Number(design) || 0) +
    (Number(tech) || 0) +
    (Number(usp) || 0);

  return (
    <div className="retro-window w-100 fade-in">
      {/* Retro Window Header */}
      <div className="retro-window__header">
        <div className="retro-window__title">
          <span>■ EVALUATION CONSOLE</span>
          <span style={{ opacity: 0.5 }}>//</span>
          <span style={{ color: "#7d5a96" }}>SCORING_CRITERIA</span>
        </div>
        <div className="retro-window__controls">
          <span>_</span>
          <span>🗖</span>
          <span>✕</span>
        </div>
      </div>

      <div className="retro-window__body">
        {/* Top Header Row with Scoreboard */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <span className="badge mb-2" style={{ background: "#7abcc4", color: "#2d1f36", fontSize: "8.5px" }}>
              ⚔️ JUDGING RUBRIC
            </span>
            <h3 className="glow-text mb-1 fw-bold" style={{ fontSize: "clamp(18px, 2.2vw, 24px)" }}>
              BOARD JUDGING PORTAL
            </h3>
            <div className="d-flex align-items-center flex-wrap gap-2 mt-2">
              <span className="text-secondary" style={{ fontSize: "13.5px" }}>Evaluating Team:</span>
              <span
                className="id-code fw-bold px-2 py-1 rounded border border-dark"
                style={{ background: "#fde88a", color: "#2d1f36", fontSize: "13px" }}
              >
                {submission?.Team_ID || 'Pending Selection'}
              </span>
              {submission?.['Team_Name '] && (
                <span className="fw-semibold text-dark" style={{ fontSize: "14px" }}>
                  — {submission['Team_Name ']}
                </span>
              )}
            </div>
          </div>

          <div className="admin-score-badge">
            <div className="small mb-1 text-secondary" style={{ fontFamily: "var(--pixel)", fontSize: "8.5px" }}>
              LIVE SCORE TOTAL
            </div>
            <div className="fw-bold" style={{ fontFamily: "var(--pixel)", fontSize: "26px", color: "#2d1f36" }}>
              {totalScore}
              <span style={{ fontSize: "13px", color: "#7d5a96", marginLeft: "4px" }}>/ 100</span>
            </div>
          </div>
        </div>

        {/* Lock Warning for Other Reviewers */}
        {isLocked && (
          <div
            className="alert py-2 px-3 mb-4 d-flex align-items-center gap-2"
            style={{
              background: "#fde88a",
              color: "#2d1f36",
              border: "2px solid #2d1f36",
              boxShadow: "3px 3px 0px #2d1f36",
              fontSize: "13px"
            }}
          >
            <span style={{ fontSize: "16px" }}>🔒</span>
            <div>
              <strong>{reviewRound}</strong> for this team was already scored by{" "}
              <strong style={{ textDecoration: "underline" }}>{lockedByOther}</strong>.
              {" "}You can view their scores below, but only they can edit this round.
            </div>
          </div>
        )}

        {/* Selected Project Card */}
        {submission && (
          <div className="admin-score-card mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <span className="fw-bold" style={{ fontFamily: "var(--pixel)", fontSize: "9px", color: "#7d5a96" }}>
                📜 PROJECT DESCRIPTION & LINKS
              </span>
              <span className="text-secondary small" style={{ fontSize: "12px" }}>
                Submitted: {submission['Submission Time'] || 'N/A'}
              </span>
            </div>
            <div className="mb-3" style={{ fontSize: "14.5px", color: "#2d1f36", lineHeight: 1.6 }}>
              {submission.Project_Description || "No project description provided."}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {submission['GitHub Link'] && (
                <a
                  href={submission['GitHub Link']}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-info btn-sm"
                  style={{ fontSize: "10px", padding: "8px 14px" }}
                >
                  🔗 OPEN GITHUB REPO ↗
                </a>
              )}
              {submission['Figma Link'] && (
                <a
                  href={submission['Figma Link']}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: "10px", padding: "8px 14px" }}
                >
                  🎨 VIEW FIGMA BOARD ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Scoring Form Grid */}
        <div className="row g-3">
          <div className="col-12 mb-2">
            <label className="form-label">
              REVIEW ROUND SELECTOR
            </label>
            <select
              value={reviewRound}
              onChange={(e) => setReviewRound(e.target.value)}
              className="form-select"
              style={{ maxWidth: "340px", fontSize: "14px" }}
            >
              <option value="Review 1">Review 1 (Initial Setup & Architecture)</option>
              <option value="Review 2">Review 2 (Midway Progress & Feasibility)</option>
              <option value="Final Review">Final Review (Final Presentation & Polish)</option>
            </select>
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">Approach, Idea & Planning</label>
              <span className="badge" style={{ background: "#e8f3f5", color: "#2d1f36", fontSize: "8px" }}>0 - 20 PTS</span>
            </div>
            <input
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              type="number"
              max={20}
              min={0}
              disabled={isLocked}
              className="form-control"
              placeholder="Score 0 - 20"
            />
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">Scalability & Viability</label>
              <span className="badge" style={{ background: "#e8f3f5", color: "#2d1f36", fontSize: "8px" }}>0 - 10 PTS</span>
            </div>
            <input
              value={scalability}
              onChange={(e) => setScalability(e.target.value)}
              type="number"
              max={10}
              min={0}
              disabled={isLocked}
              className="form-control"
              placeholder="Score 0 - 10"
            />
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">Design UI/UX & Aesthetics</label>
              <span className="badge" style={{ background: "#e8f3f5", color: "#2d1f36", fontSize: "8px" }}>0 - 20 PTS</span>
            </div>
            <input
              value={design}
              onChange={(e) => setDesign(e.target.value)}
              type="number"
              max={20}
              min={0}
              disabled={isLocked}
              className="form-control"
              placeholder="Score 0 - 20"
            />
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">Technical Implementation</label>
              <span className="badge" style={{ background: "#e8f3f5", color: "#2d1f36", fontSize: "8px" }}>0 - 30 PTS</span>
            </div>
            <input
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              type="number"
              max={30}
              min={0}
              disabled={isLocked}
              className="form-control"
              placeholder="Score 0 - 30"
            />
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">USP & Innovation</label>
              <span className="badge" style={{ background: "#e8f3f5", color: "#2d1f36", fontSize: "8px" }}>0 - 20 PTS</span>
            </div>
            <input
              value={usp}
              onChange={(e) => setUsp(e.target.value)}
              type="number"
              max={20}
              min={0}
              disabled={isLocked}
              className="form-control"
              placeholder="Score 0 - 20"
            />
          </div>

          <div className="col-md-6 d-flex align-items-end">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLocked}
              className="btn btn-lg-retro btn-primary w-100 fw-bold"
              style={isLocked ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              {isLocked ? "🔒 LOCKED — READ ONLY" : "💾 SAVE EVALUATION"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};