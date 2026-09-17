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
    <div className="container py-2 text-white fade-in">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0 text-info">
          BOARD JUDGING PORTAL
        </h4>
        <div className="px-3 py-1 rounded border border-info" style={{ backgroundColor: "rgba(0, 150, 255, 0.15)" }}>
          <span className="text-secondary small me-2">TOTAL SCORE:</span>
          <span className="fs-5 fw-bold text-info">{totalScore}</span>
          <span className="text-secondary small"> / 100</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="small text-secondary">Evaluating Team:</div>
        <div className="text-white fw-bold">{submission?.Team_ID || 'Pending Selection'}</div>
        <div className="text-secondary small">{submission?.['Team_Name '] || ''}</div>
      </div>

      {isLocked && (
        <div className="alert alert-warning py-2 px-3 small mb-3">
          🔒 {reviewRound} for this team was already scored by <strong>{lockedByOther}</strong>.
          You can see their scores below, but only they can edit this round.
        </div>
      )}

      {submission && (
        <div className="mb-3">
          <div className="text-secondary small">Project Description</div>
          <div className="text-white mb-2">{submission.Project_Description}</div>

          <div className="text-secondary small">Submitted at: {submission['Submission Time']}</div>
        </div>
      )}

      <div className="glass-card p-3">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label glow-text">Review Round</label>
            <select value={reviewRound} onChange={(e) => setReviewRound(e.target.value)} className="form-select bg-dark text-white border-secondary">
              <option value="Review 1">Review 1</option>
              <option value="Review 2">Review 2</option>
              <option value="Final Review">Final Review</option>
            </select>
            {submission && (
  <div className="d-flex gap-2 mt-3 mb-2">
    {submission['GitHub Link'] && (
      <a
        href={submission['GitHub Link']}
        target="_blank"
        rel="noreferrer"
        className="btn btn-outline-info btn-sm"
      >
        🔗 GitHub
      </a>
    )}

    {submission['Figma Link'] && (
      <a
        href={submission['Figma Link']}
        target="_blank"
        rel="noreferrer"
        className="btn btn-outline-secondary btn-sm"
      >
        🎨 Figma
      </a>
    )}
  </div>
)}
            
          </div>

          <div className="col-md-6 d-flex flex-column justify-content-center align-items-md-end">
            <div className="p-3 rounded border border-info text-center w-100" style={{ backgroundColor: "rgba(0, 150, 255, 0.1)", maxWidth: "260px" }}>
              <div className="text-secondary small text-uppercase fw-semibold">Live Score Total</div>
              <div className="fs-3 fw-bold text-info">{totalScore} <span className="fs-6 text-secondary">/ 100</span></div>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label glow-text">Approach, Idea & Planning (20 pts)</label>
            <input value={approach} onChange={(e) => setApproach(e.target.value)} type="number" max={20} min={0} disabled={isLocked} className="form-control bg-dark text-white border-secondary" placeholder="Score 0-20" />
          </div>

          <div className="col-md-6">
            <label className="form-label glow-text">Scalability & Viability (10 pts)</label>
            <input value={scalability} onChange={(e) => setScalability(e.target.value)} type="number" max={10} min={0} disabled={isLocked} className="form-control bg-dark text-white border-secondary" placeholder="Score 0-10" />
          </div>

          <div className="col-md-6">
            <label className="form-label glow-text">Design UI/UX (20 pts)</label>
            <input value={design} onChange={(e) => setDesign(e.target.value)} type="number" max={20} min={0} disabled={isLocked} className="form-control bg-dark text-white border-secondary" placeholder="Score 0-20" />
          </div>

          <div className="col-md-6">
            <label className="form-label glow-text">Technical Implementation (30 pts)</label>
            <input value={tech} onChange={(e) => setTech(e.target.value)} type="number" max={30} min={0} disabled={isLocked} className="form-control bg-dark text-white border-secondary" placeholder="Score 0-30" />
          </div>

          <div className="col-md-6">
            <label className="form-label glow-text">USP (20 pts)</label>
            <input value={usp} onChange={(e) => setUsp(e.target.value)} type="number" max={20} min={0} disabled={isLocked} className="form-control bg-dark text-white border-secondary" placeholder="Score 0-20" />
          </div>

          <div className="col-md-6 d-flex align-items-end">
            <button type="button" onClick={onSubmit} disabled={isLocked} className="btn btn-gradient w-100 py-2 fw-bold">
              {isLocked ? "Locked — Read Only" : "Save Evaluation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};