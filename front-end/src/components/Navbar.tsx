import { NavLink } from "react-router-dom";
import { getUserId, setUserId } from "../lib/auth";
import { useState, useEffect, useRef } from "react";
import { Moon, LayoutDashboard, BarChart3, Settings, Menu, X } from "lucide-react";

const navLinks = [
  { to: "/home", label: "Dashboard", icon: LayoutDashboard },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const [username, setUsername] = useState(getUserId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setUsername(getUserId());
  }, []);

  // Close mobile menu on route change (via link click)
  const handleNavClick = () => setMobileOpen(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        mobileOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    setUserId(val);
  };

  return (
    <>
      {/* Skip to content link — first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-lg focus:shadow-lg focus:outline-2 focus:outline-primary"
      >
        Skip to content
      </a>

      <nav
        className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 md:px-6 z-20"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <NavLink
          to="/"
          onClick={handleNavClick}
          className="flex items-center gap-2 shrink-0 group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <Moon className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading text-xl text-foreground hidden sm:inline">
            Elara
          </span>
        </NavLink>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-1 ml-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "text-primary bg-primary-light"
                    : "text-foreground/70 hover:text-primary hover:bg-muted"
                }`
              }
              aria-current={({ isActive }: { isActive: boolean }) =>
                isActive ? "page" : undefined
              }
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Profile name input */}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="nav-user-id" className="text-xs text-text-soft hidden sm:inline">
            Profile
          </label>
          <input
            id="nav-user-id"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Your name"
            className="input-field w-28 sm:w-36 text-sm py-1.5"
            aria-label="Your profile name"
          />
        </div>

        {/* Mobile hamburger */}
        <button
          ref={btnRef}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden p-2 rounded-lg text-foreground/70 hover:text-primary hover:bg-muted transition-colors duration-150"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        ref={menuRef}
        className={`fixed top-16 left-0 right-0 bg-white border-b border-border shadow-lg z-10 sm:hidden transition-all duration-200 ease-out ${
          mobileOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        role="menu"
        aria-label="Mobile navigation"
      >
        <div className="p-3 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "text-primary bg-primary-light"
                    : "text-foreground/70 hover:text-primary hover:bg-muted"
                }`
              }
              aria-current={({ isActive }: { isActive: boolean }) =>
                isActive ? "page" : undefined
              }
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}