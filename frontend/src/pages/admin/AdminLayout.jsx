/**
 * Admin layout shell — sidebar nav + nested route outlet.
 *
 * Splits the previously single-page admin dashboard into focused sub-pages
 * (overview, events, users, messages, newsletter, content, system).
 *
 * Route mapping lives in App.js: <Route path="/admin" element={<AdminLayout/>}>.
 */
import React, { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Megaphone,
  Mail,
  Store,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

const SECTIONS = [
  { to: "/admin", end: true, key: "admin.nav.overview", icon: LayoutDashboard },
  { to: "/admin/events", key: "admin.nav.events", icon: CalendarDays },
  { to: "/admin/users", key: "admin.nav.users", icon: Users },
  { to: "/admin/messages", key: "admin.nav.messages", icon: Megaphone },
  { to: "/admin/newsletter", key: "admin.nav.newsletter", icon: Mail },
  { to: "/admin/content", key: "admin.nav.content", icon: Store },
  { to: "/admin/merchant-requests", key: "admin.nav.merchant_requests", icon: ShoppingBag, withBadge: "merchantRequests" },
  { to: "/admin/system", key: "admin.nav.system", icon: Settings },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [pendingMR, setPendingMR] = useState(0);

  // Poll pending merchant-card request count once per route change so the
  // sidebar badge stays fresh after admin approves/rejects a row.
  useEffect(() => {
    if (!user || (user.role !== "admin" && !user.is_moderator)) return;
    let cancelled = false;
    api
      .get("/admin/merchant-card-requests/pending-count")
      .then((r) => {
        if (cancelled) return;
        setPendingMR(r.data?.pending || 0);
      })
      .catch(() => !cancelled && setPendingMR(0));
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  if (loading) return <div className="p-10 text-viking-stone">...</div>;
  // Admin shell is accessible to full admins AND moderators. Individual admin
  // actions enforce finer-grained rules server-side (e.g. moderators can't
  // delete admin accounts, can't create new admins, can't toggle paid-messaging).
  const canAccess = !!user && (user.role === "admin" || user.is_moderator);
  if (!canAccess) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12" data-testid="admin-shell">
      <div className="mb-6 lg:mb-10">
        <div className="text-overline mb-2">{user.email}</div>
        <h1 className="font-serif text-3xl lg:text-4xl text-viking-bone">
          {t("admin.dashboard")}
        </h1>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6 lg:gap-10">
        {/* Sidebar */}
        <aside
          data-testid="admin-sidebar"
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <nav
            className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0 border-b lg:border-b-0 border-viking-edge/60"
            aria-label="Admin sections"
          >
            {SECTIONS.map(({ to, end, key, icon: Icon, withBadge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                data-testid={`admin-nav-${to.replace(/^\/admin\/?/, "") || "overview"}`}
                className={({ isActive }) =>
                  [
                    "relative flex items-center gap-2.5 px-3 py-2.5 rounded-sm",
                    "text-xs font-rune uppercase tracking-wider whitespace-nowrap",
                    "border lg:border-r-0 transition-colors",
                    isActive
                      ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                      : "border-transparent lg:border-viking-edge/40 text-viking-stone hover:text-viking-bone hover:border-viking-gold/40",
                  ].join(" ")
                }
              >
                <Icon size={14} className="shrink-0" />
                <span>{t(key)}</span>
                {withBadge === "merchantRequests" && pendingMR > 0 ? (
                  <span
                    data-testid="admin-mr-badge"
                    className="ml-1 inline-flex min-w-[18px] h-[18px] px-1.5 items-center justify-center bg-viking-ember text-viking-bone text-[10px] rounded-full font-rune"
                  >
                    {pendingMR}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </section>
  );
}
