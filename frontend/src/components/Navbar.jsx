import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAuthenticated, logout } from "../utils/auth";
import { toast } from "react-toastify";
import {
  FaHome,
  FaPlus,
  FaHistory,
  FaSignOutAlt,
  FaNotesMedical,
  FaBars,
} from "react-icons/fa";

function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = isAuthenticated();

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out");
    navigate("/login");
  };

  const NavLink = ({ to, icon: Icon, label }) => (
    <Link
      to={to}
      className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200"
      onClick={() => setMobileOpen(false)}
    >
      <Icon className="mr-2" />
      {label}
    </Link>
  );

  return (
    <nav className="bg-gray-900/80 border-b border-gray-700/50 backdrop-blur-md fixed top-0 w-full z-50 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <FaNotesMedical className="text-white text-2xl" />
            <span className="text-white font-bold text-xl">
              Medizinische Berichte
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-between flex-1 ml-10">
            <div className="flex space-x-4">
              {isLoggedIn && (
                <>
                  <NavLink to="/" icon={FaHome} label="Dashboard" />
                  <NavLink to="/reports/new" icon={FaPlus} label="Neuer Bericht" />
                  <NavLink
                    to="/reports/history"
                    icon={FaHistory}
                    label="Historie"
                  />
                  <NavLink
                    to="/templates"
                    icon={FaNotesMedical}
                    label="Vorlagen"
                  />
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 transition-colors duration-200"
                  title="Abmelden"
                >
                  <FaSignOutAlt />
                </button>
              ) : (
                <>
                  <NavLink to="/login" icon={FaHome} label="Anmelden" />
                </>
              )}
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-gray-300 hover:text-white text-xl"
            >
              <FaBars />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden animate-fade-in py-3 space-y-2 border-t border-gray-700">
            {isLoggedIn ? (
              <>
                <NavLink to="/" icon={FaHome} label="Dashboard" />
                <NavLink to="/reports/new" icon={FaPlus} label="Neuer Bericht" />
                <NavLink
                  to="/reports/history"
                  icon={FaHistory}
                  label="Historie"
                />
                <NavLink
                  to="/templates"
                  icon={FaNotesMedical}
                  label="Vorlagen"
                />
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                >
                  <FaSignOutAlt className="mr-2" />
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" icon={FaHome} label="Anmelden" />
                <NavLink to="/register" icon={FaPlus} label="Register" />
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
