import React from "react";
import "./Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <a href="https://www.analytix.com">
              <img
                src="/images/analytix-solutions-logo.png"
                alt="Analytix Solutions"
                title="Analytix Solutions"
                width="180"
                height="36"
              />
            </a>
          </div>
          <div className="navbar-title">
            Business Transformation | Chatbot Assistant
          </div>
        </div>

        <div className="navbar-actions">
          <button className="navbar-button">Schedule Meeting</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
