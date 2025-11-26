import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const agreementOptions = [
    {
      id: "create",
      title: "Create Agreement",
      description: "Create a new customer agreement with comprehensive service details and product selections",
      icon: "📝",
      action: () => navigate("/form-filling"),
      color: "#10b981",
      available: true,
    },
    {
      id: "extend",
      title: "Extend Agreement",
      description: "Extend an existing customer agreement with new terms and updated service packages",
      icon: "📅",
      action: () => alert("Extend Agreement - Coming Soon"),
      color: "#f59e0b",
      available: false,
    },
    {
      id: "edit",
      title: "Edit Agreement",
      description: "Modify existing agreement details, update services, or adjust product configurations",
      icon: "✏️",
      action: () => navigate("/saved-pdfs"),
      color: "#3b82f6",
      available: true,
    },
  ];

  return (
    <section className="home">
      {/* Hero Section */}
      <div className="home__hero">
        <div className="home__hero-content">
          <h1 className="home__title">Welcome to EnviroMaster</h1>
          <p className="home__subtitle">
            Professional Agreement Management System
          </p>
          <p className="home__description">
            Create, manage, and maintain customer service agreements with ease.
            Our comprehensive platform streamlines your workflow and ensures
            accuracy.
          </p>
        </div>
      </div>

      {/* Options Section */}
      <div className="home__container">
        <div className="home__section-header">
          <h2 className="home__section-title">Agreement Management</h2>
          <p className="home__section-subtitle">
            Choose an option below to get started
          </p>
        </div>

        <div className="home__cards">
          {agreementOptions.map((option) => (
            <div
              key={option.id}
              className={`home__card ${
                !option.available ? "home__card--disabled" : ""
              }`}
              onClick={option.available ? option.action : undefined}
              style={{ "--card-color": option.color } as React.CSSProperties}
            >
              <div className="home__card-icon">{option.icon}</div>
              <div className="home__card-content">
                <h3 className="home__card-title">{option.title}</h3>
                <p className="home__card-description">{option.description}</p>
              </div>
              <div className="home__card-footer">
                {option.available ? (
                  <button className="home__card-button">
                    Get Started →
                  </button>
                ) : (
                  <span className="home__card-badge">Coming Soon</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="home__stats">
          <div className="home__stat">
            <div className="home__stat-icon">📄</div>
            <div className="home__stat-content">
              <div className="home__stat-label">Total Agreements</div>
              <div className="home__stat-value">View All</div>
            </div>
          </div>
          <div className="home__stat">
            <div className="home__stat-icon">⏳</div>
            <div className="home__stat-content">
              <div className="home__stat-label">Pending Approval</div>
              <div className="home__stat-value">Admin Panel</div>
            </div>
          </div>
          <div className="home__stat">
            <div className="home__stat-icon">✅</div>
            <div className="home__stat-content">
              <div className="home__stat-label">Approved</div>
              <div className="home__stat-value">View Saved</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
