import { NavLink, Link, Navigate } from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import GlassBar from "../GlassBar";
import AccountMenu from "../Header/AccountMenu";
import ThemeToggle from "../ThemeToggle";
import { Bell } from "./Bell";
import { firstName, useAccount } from "../../lib/account";
import { asset } from '../../lib/asset'

const NAV = [
  { to: "/jobs", label: "Jobs" },
  { to: "/profile", label: "Profile" },
  { to: "/applications", label: "Applications" },
  { to: "/settings", label: "Settings" },
];

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 0);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  return scrolled;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Studio({ children }: { children: ReactNode }) {
  const account = useAccount();
  const scrolled = useScrolled();

  if (!account) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <GlassBar bare={!scrolled}>
          <div className="flex h-18 w-full items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              to="/"
              aria-label="SYNC Hub, home"
              className="inline-flex items-center gap-2.5"
            >
              <img
                src={asset("/sync-logo.png")}
                alt=""
                className="size-8 object-contain"
              />
              <span className="hidden text-[15px] font-semibold tracking-[-0.01em] text-ink sm:inline">
                SYNC Hub
              </span>
            </Link>
            <nav
              aria-label="Your account"
              className="flex items-center gap-5 sm:gap-7"
            >
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors duration-300 ease-[var(--ease-standard)] ${isActive ? "text-teal-600 dark:text-teal-400" : "text-ink-muted hover:text-ink"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <Bell />
              <ThemeToggle />
              <AccountMenu enabled>
                <span
                  aria-label={account.name || firstName(account)}
                  className="ml-1 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-teal-500/15 text-xs font-semibold text-teal-700 ring-1 ring-teal-500/25 dark:text-teal-300"
                >
                  {initials(account.name || account.email)}
                </span>
              </AccountMenu>
            </div>
          </div>
        </GlassBar>
      </header>
      <div className="min-h-dvh pt-24 pb-32">{children}</div>
    </>
  );
}
