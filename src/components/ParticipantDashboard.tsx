export const ParticipantDashboard = () => {
  return (
    <div className="container py-5 text-white fade-in">
      <h2 className="text-center glow-text mb-5">TEAM DASHBOARD</h2>
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="glass-card p-5">
            <h4 className="glow-text mb-4">Review 1 Submission</h4>
            <form>
              <div className="mb-3">
                <label className="form-label text-secondary">Team Name</label>
                <input type="text" className="form-control bg-dark text-white border-secondary" placeholder="Enter your team name" required />
              </div>
              <div className="mb-3">
                <label className="form-label text-secondary">Project Description</label>
                <textarea className="form-control bg-dark text-white border-secondary" rows={3} placeholder="Briefly describe your AI/ML solution..." required />
              </div>
              <div className="mb-3">
                <label className="form-label text-secondary">GitHub Repository Link</label>
                <input type="url" className="form-control bg-dark text-white border-secondary" placeholder="https://github.com/..." required />
              </div>
              <div className="mb-3">
                <label className="form-label text-secondary">Figma Prototype Link</label>
                <input type="url" className="form-control bg-dark text-white border-secondary" placeholder="https://figma.com/..." />
              </div>
              <button type="button" className="btn btn-gradient w-100 mt-4 py-2 fw-bold">
                SUBMIT PROJECT
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};