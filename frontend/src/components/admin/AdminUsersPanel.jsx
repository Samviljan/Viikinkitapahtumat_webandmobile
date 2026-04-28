/**
 * Admin panel: list registered users and toggle the paid_messaging_enabled
 * flag (which unlocks the merchant/organizer messaging feature).
 *
 * Uses /api/admin/users (GET) and /api/admin/users/{id}/paid-messaging (PATCH).
 */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function AdminUsersPanel() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all"); // all | merchant | organizer | admin

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data || []);
    } catch {
      toast.error(t("admin.load_error"));
    } finally {
      setLoaded(true);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(u) {
    const next = !u.paid_messaging_enabled;
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, paid_messaging_enabled: next } : x)),
    );
    try {
      await api.patch(`/admin/users/${u.id}/paid-messaging`, { enabled: next });
      toast.success(
        next ? t("admin.users.paid_on_toast") : t("admin.users.paid_off_toast"),
      );
    } catch {
      // revert on failure
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, paid_messaging_enabled: !next } : x,
        ),
      );
      toast.error(t("account.error_generic"));
    }
  }

  const visible = users.filter((u) => {
    if (filter === "all") return true;
    if (filter === "admin") return u.role === "admin";
    return (u.user_types || []).includes(filter);
  });

  if (!loaded) return null;

  return (
    <div className="carved-card rounded-sm p-6" data-testid="admin-users-panel">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h3 className="font-serif text-base text-viking-bone">
          {t("admin.users.title")} <span className="text-viking-stone text-xs ml-2">({users.length})</span>
        </h3>
        <div className="flex gap-2 flex-wrap">
          {["all", "merchant", "organizer", "admin"].map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`users-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-sm text-xs font-rune border transition-colors ${
                filter === f
                  ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                  : "border-viking-edge text-viking-stone hover:border-viking-gold/60"
              }`}
            >
              {t(`admin.users.filter_${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-overline border-b border-viking-edge">
              <th className="text-left py-2 pr-3">{t("admin.users.col_user")}</th>
              <th className="text-left py-2 pr-3">{t("admin.users.col_role")}</th>
              <th className="text-left py-2 pr-3">{t("admin.users.col_types")}</th>
              <th className="text-right py-2 pl-3">{t("admin.users.col_paid")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-viking-stone italic text-xs"
                >
                  —
                </td>
              </tr>
            ) : (
              visible.map((u) => (
                <tr
                  key={u.id}
                  data-testid={`user-row-${u.id}`}
                  className="border-b border-viking-edge/40 hover:bg-viking-surface2/30"
                >
                  <td className="py-3 pr-3">
                    <div className="text-viking-bone font-rune text-xs">
                      {u.nickname || u.name || "—"}
                    </div>
                    <div className="text-[11px] text-viking-stone break-all">
                      {u.email}
                    </div>
                    {u.merchant_name ? (
                      <div className="text-[11px] text-viking-gold/80 mt-0.5">
                        🏪 {u.merchant_name}
                      </div>
                    ) : null}
                    {u.organizer_name ? (
                      <div className="text-[11px] text-viking-gold/80 mt-0.5">
                        🛡 {u.organizer_name}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`text-[11px] uppercase tracking-wider ${
                        u.role === "admin" ? "text-viking-gold" : "text-viking-stone"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.user_types || []).map((tp) => (
                        <span
                          key={tp}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-viking-edge text-viking-stone"
                        >
                          {tp}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <Switch
                      data-testid={`toggle-paid-${u.id}`}
                      checked={!!u.paid_messaging_enabled}
                      onCheckedChange={() => toggle(u)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
