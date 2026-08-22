import { tracks, schedule } from "../data";

export const LandingPage = () => {
  return (
    <div className="container pb-5 text-white fade-in">
      <div className="text-center d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <h2 className="fw-bold mb-2 tracking-wide">TAM-VIT</h2>
        <h4 className="fw-light mb-3 text-secondary">welcomes you to</h4>
        <h1 className="display-2 fw-bold glow-text mb-5" style={{ fontSize: "5rem" }}>
          CodeCortex 3.0
        </h1>
        <button className="btn btn-gradient rounded-pill px-5 py-3 fs-5">
          Discover Tracks
        </button>
      </div>

      <div className="text-center my-5 py-5">
        <h2 className="fw-bold tracking-wide">SPONSORED BY</h2>
        <div className="d-flex justify-content-center gap-4 mt-4 opacity-50">
          <h5>[ Sponsor 1 ]</h5>
          <h5>[ Sponsor 2 ]</h5>
          <h5>[ Sponsor 3 ]</h5>
        </div>
      </div>

      <h2 className="text-center fw-bold mb-5 mt-5">TRACKS</h2>
      <div className="row g-4 justify-content-center">
        {tracks.map((track, index) => (
          <div className="col-md-4" key={index}>
            <div className="glass-card p-5 h-100 text-center d-flex flex-column justify-content-center">
              <h5 className="fw-bold text-info mb-3">{track.title}</h5>
              <p className="text-secondary mb-0">{track.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-center fw-bold mb-4 mt-5 pt-5">EVENT FLOW</h2>
      <div className="glass-card p-4 mx-auto" style={{ maxWidth: "800px" }}>
        {schedule.map((item, index) => (
          <div className="border-bottom border-secondary p-4" key={index}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="fw-bold text-white mb-0">{item.title}</h5>
              <span className="badge rounded-pill" style={{ backgroundColor: "#1e3c72" }}>{item.time}</span>
            </div>
            <p className="text-secondary mb-0">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};