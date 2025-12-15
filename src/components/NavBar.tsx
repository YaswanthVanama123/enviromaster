import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./NavBar.css";
import logo from "../assets/em-logo.png";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const links = [
    { path: "/home", label: "Home" },
    { path: "/form-filling", label: "Form Filling" },
    { path: "/saved-pdfs", label: "Saved PDFs" },
    { path: "/trash", label: "Trash" },
    { path: "/admin-login", label: "Admin Panel" }
  ];

  return (
    <header className="topnav">
      <div className="topnav__brand">
        <img src={logo} alt="EM" className="topnav__logo" />
      </div>

      {/* Desktop */}
      <nav className="topnav__menu desktop">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`topnav__item ${
              location.pathname === link.path ? "topnav__item--active" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile */}
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
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`mobilemenu__item ${
              location.pathname === link.path ? "active" : ""
            }`}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {open && <div className="mobilemenu__backdrop" onClick={() => setOpen(false)} />}
    </header>
  );
}
