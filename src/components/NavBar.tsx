import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./NavBar.css";
import logo from "../assets/em-logo.png";
import { useAuthContext } from "./auth";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuthContext();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { path: "/home", label: "Home" },
    { path: "/form-filling", label: "Form Filling" },
    { path: "/saved-pdfs", label: "Saved PDFs" },
    { path: "/my-commissions", label: "My Commissions" },
    { path: "/my-quota", label: "My Quota" },
    { path: "/my-inside-sales", label: "Inside Sales" },
    { path: "/trash", label: "Trash" },
    
    ...(isAdmin ? [
      { path: "/admin-commissions", label: "Employee Commissions" },
      { path: "/admin-panel", label: "Admin Panel" }
    ] : [])
  ];

  return (
    <header className="topnav">
      <div className="topnav__brand">
        <img src={logo} alt="EM" className="topnav__logo" />
      </div>

      <nav className="topnav__menu desktop">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`topnav__item ${
              location.pathname === link.path || location.pathname.startsWith(link.path + "/")
                ? "topnav__item--active"
                : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {}
      <div className="topnav__user desktop">
        {user && (
          <>
            <span className="topnav__username">{user.fullName || user.username}</span>
            <span className={`topnav__role-badge topnav__role-badge--${isAdmin ? 'admin' : 'employee'}`}>
              {isAdmin ? 'Admin' : 'Employee'}
            </span>
            <button
              className="topnav__logout-btn"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </>
        )}
      </div>

      <button
        className="topnav__hamburger mobile"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`mobilemenu ${open ? "mobilemenu--open" : ""}`}>
        {}
        {user && (
          <div className="mobilemenu__user">
            <span className="mobilemenu__username">{user.fullName || user.username}</span>
            <span className={`mobilemenu__role-badge mobilemenu__role-badge--${isAdmin ? 'admin' : 'employee'}`}>
              {isAdmin ? 'Admin' : 'Employee'}
            </span>
          </div>
        )}

        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`mobilemenu__item ${
              location.pathname === link.path || location.pathname.startsWith(link.path + "/")
                ? "active"
                : ""
            }`}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}

        {}
        {user && (
          <button
            className="mobilemenu__logout-btn"
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            type="button"
          >
            Logout
          </button>
        )}
      </div>

      {open && <div className="mobilemenu__backdrop" onClick={() => setOpen(false)} />}
    </header>
  );
}
