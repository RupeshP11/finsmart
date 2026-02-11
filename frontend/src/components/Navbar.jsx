import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";

function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    subscription: "Free",
    subscriptionExpiry: "",
  });
  const [formData, setFormData] = useState(userData);

  const token = localStorage.getItem("token");

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const res = await fetch("http://127.0.0.1:8000/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const user = {
          name: data.full_name || "User",
          email: data.email || "user@finsmart.com",
          phone: data.phone || "Not provided",
          subscription: data.subscription_plan || "Free",
          subscriptionExpiry: data.subscription_expiry || "Lifetime",
        };
        setUserData(user);
        setFormData(user);
      }
    } catch (err) {
      console.error("Failed to fetch user data", err);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.name,
          phone: formData.phone,
        }),
      });
      if (res.ok) {
        setUserData(formData);
        setShowEditModal(false);
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  }

  const getInitials = () => userData.name.split(" ")[0][0] || "U";

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button
          type="button"
          className="navbar__logo"
          onClick={() => navigate("/dashboard")}
          title="Go to Dashboard"
          aria-label="Go to Dashboard"
        >
          Fin<span className="navbar__logo-accent">Smart</span>
        </button>

        <nav className="navbar__links" aria-label="Primary">
          {[
            { path: "/dashboard", label: "Dashboard" },
            { path: "/transactions", label: "Transactions" },
            { path: "/budget", label: "Budget" },
            { path: "/auto-savings", label: "Auto Savings" },
            { path: "/analytics", label: "Analytics" },
            { path: "/insights", label: "Insights" },
            { path: "/sip", label: "SIP Calculator" },
            { path: "/investment", label: "Investment Advisor" },
          ].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() =>
                isActive(item.path)
                  ? "navbar__link navbar__link--active"
                  : "navbar__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="navbar__right">
        <button
          type="button"
          className="navbar__profile"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="User profile"
        >
          <span className="navbar__avatar">{getInitials()}</span>
          <span className="navbar__profile-text">Profile</span>
        </button>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar__header">
              <h3>User Profile</h3>
              <button
                type="button"
                className="sidebar__close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            <div className="sidebar__content">
              <div className="sidebar__avatar-large">
                <span>{getInitials()}</span>
              </div>
              
              {/* Profile Info Card */}
              <div className="sidebar__card">
                <h4 className="sidebar__card-title">Profile Information</h4>
                <div className="sidebar__info">
                  <div className="sidebar__info-item">
                    <label>Name</label>
                    <p>{userData.name}</p>
                  </div>
                  <div className="sidebar__info-item">
                    <label>Email</label>
                    <p>{userData.email}</p>
                  </div>
                  <div className="sidebar__info-item">
                    <label>Phone</label>
                    <p>{userData.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="sidebar__edit-btn"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit Profile
                </button>
              </div>

              {/* Subscription Card */}
              <div className="sidebar__card">
                <h4 className="sidebar__card-title">Subscription</h4>
                <div className="sidebar__subscription">
                  <div className="subscription__plan">
                    <span className="subscription__label">Current Plan</span>
                    <span className="subscription__value">{userData.subscription}</span>
                  </div>
                  <div className="subscription__expiry">
                    <span className="subscription__label">Valid Until</span>
                    <span className="subscription__value">{userData.subscriptionExpiry}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="sidebar__edit-btn"
                  onClick={() => setShowSubscriptionModal(true)}
                >
                  Manage Subscription
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  onLogout();
                }}
                className="sidebar__logout-btn"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Edit Profile</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="modal__form">
              <div className="form__group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form__group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  placeholder="Email cannot be changed"
                />
              </div>
              <div className="form__group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="modal-overlay" onClick={() => setShowSubscriptionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Subscription Settings</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowSubscriptionModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal__content">
              <div className="subscription-card">
                <h4>Current Plan: <span className="plan-badge">{userData.subscription}</span></h4>
                <p>Valid until: <strong>{userData.subscriptionExpiry}</strong></p>
                <div className="subscription-features">
                  <p>✓ Basic expense tracking</p>
                  <p>✓ Budget management</p>
                  <p>✓ Monthly reports</p>
                </div>
              </div>
              <div className="upgrade-options">
                <h4>Upgrade to Premium</h4>
                <p>Get advanced analytics, AI insights, and more!</p>
                <button className="btn btn-primary">Upgrade Now</button>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSubscriptionModal(false)}
                style={{ width: "100%" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
