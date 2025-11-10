import { useState, useEffect } from "react";
import "./NavBar.css";
import logo from "../assets/em-logo.png";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <header className="topnav">
      <div className="topnav__brand">
        <img src={logo} alt="EM" className="topnav__logo" />
      </div>

      <nav className="topnav__menu desktop">
        <button className="topnav__item topnav__item--active" type="button">
          Form Filling
        </button>
        <button className="topnav__item" type="button" disabled>
          Saved PDFs
        </button>
        <button className="topnav__item" type="button" disabled>
          Admin Panel
        </button>
      </nav>

      <button
        className="topnav__hamburger mobile"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`mobilemenu ${open ? "mobilemenu--open" : ""}`}>
        <button className="mobilemenu__item active" type="button" onClick={() => setOpen(false)}>
          Form Filling
        </button>
        <button className="mobilemenu__item" type="button" disabled>
          Saved PDFs
        </button>
        <button className="mobilemenu__item" type="button" disabled>
          Admin Panel
        </button>
      </div>

      {open && <div className="mobilemenu__backdrop" onClick={() => setOpen(false)} />}
    </header>
  );
}
