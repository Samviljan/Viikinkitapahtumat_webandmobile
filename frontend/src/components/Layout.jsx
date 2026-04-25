import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Menu, X, Globe2, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { to: "/events", key: "nav.events" },
  { to: "/submit", key: "nav.submit" },
  { to: "/courses", key: "nav.courses" },
  { to: "/guilds", key: "nav.guilds" },
  { to: "/shops", key: "nav.shops" },
  { to: "/about", key: "nav.about" },
];

const LANGS = [
  { code: "fi", label: "Suomi" },
  { code: "en", label: "English" },
  { code: "sv", label: "Svenska" },
];

function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="lang-switcher"
          className="flex items-center gap-2 px-3 py-2 rounded-sm border border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold transition-colors"
        >
          <Globe2 size={16} />
          <span className="font-rune text-xs">{lang.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-viking-surface border-viking-edge text-viking-bone min-w-[140px]"
      >
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            data-testid={`lang-option-${l.code}`}
            onClick={() => setLang(l.code)}
            className={`cursor-pointer focus:bg-viking-surface2 focus:text-viking-gold ${
              lang === l.code ? "text-viking-gold" : ""
            }`}
          >
            <span className="font-rune text-[10px] mr-2 w-6">{l.code.toUpperCase()}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Brand() {
  const { t } = useI18n();
  return (
    <Link to="/" data-testid="brand-link" className="flex items-center gap-3 group">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center border border-viking-gold/60 text-viking-gold font-accent text-lg rounded-sm group-hover:border-viking-ember group-hover:text-viking-ember transition-colors"
      >
        ᚠ
      </span>
      <div className="flex flex-col leading-none">
        <span className="font-accent text-sm sm:text-base text-viking-bone tracking-[0.2em]">
          {t("site.name").toUpperCase()}
        </span>
        <span className="hidden sm:block text-[10px] text-viking-stone tracking-wider mt-1">
          {t("site.tagline")}
        </span>
      </div>
    </Link>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-header border-b border-viking-edge">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 h-16 flex items-center justify-between">
          <Brand />

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.to.slice(1)}`}
                className={({ isActive }) =>
                  `font-rune text-[11px] px-3 py-2 rounded-sm transition-colors ${
                    isActive
                      ? "text-viking-gold"
                      : "text-viking-bone hover:text-viking-gold"
                  }`
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user && user.role === "admin" ? (
              <>
                <Link to="/admin" data-testid="nav-admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-viking-gold hover:text-viking-bone hover:bg-viking-surface2 hidden md:inline-flex"
                  >
                    <Shield size={14} className="mr-2" />
                    {t("nav.admin")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="logout-btn"
                  onClick={logout}
                  className="text-viking-stone hover:text-viking-ember hidden md:inline-flex"
                >
                  <LogOut size={14} />
                </Button>
              </>
            ) : null}
            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setOpen((o) => !o)}
              className="lg:hidden p-2 text-viking-bone"
              aria-label="Toggle menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-viking-edge bg-viking-bg/95">
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  data-testid={`mnav-${item.to.slice(1)}`}
                  className={({ isActive }) =>
                    `font-rune text-xs px-3 py-3 rounded-sm border-b border-viking-edge/40 ${
                      isActive
                        ? "text-viking-gold"
                        : "text-viking-bone hover:text-viking-gold"
                    }`
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
              {user && user.role === "admin" && (
                <>
                  <NavLink
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="font-rune text-xs px-3 py-3 text-viking-gold"
                  >
                    {t("nav.admin")}
                  </NavLink>
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="font-rune text-xs px-3 py-3 text-left text-viking-ember"
                  >
                    {t("admin.logout")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1" data-testid="page-main" key={location.pathname}>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-viking-edge mt-20 py-12 bg-viking-surface/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-viking-gold font-accent text-xl">ᚠ</span>
            <div>
              <p className="font-accent tracking-[0.2em] text-sm text-viking-bone">
                {t("site.name").toUpperCase()}
              </p>
              <p className="text-xs text-viking-stone mt-1">{t("footer.contact")}</p>
            </div>
          </div>
          <div className="text-xs text-viking-stone">
            © {new Date().getFullYear()} {t("site.name")} · {t("footer.rights")}
          </div>
          <Link
            to="/admin/login"
            data-testid="admin-login-link"
            className="text-[10px] font-rune text-viking-stone hover:text-viking-gold transition-colors"
          >
            {t("nav.admin")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
