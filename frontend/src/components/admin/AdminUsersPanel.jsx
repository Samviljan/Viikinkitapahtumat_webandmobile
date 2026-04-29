/**
 * Admin panel: list registered users and toggle the paid_messaging_enabled
 * flag (which unlocks the merchant/organizer messaging feature).
 *
 * Uses /api/admin/users (GET) and /api/admin/users/{id}/paid-messaging (PATCH).
 */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import AdminUserCreateDialog from "@/components/admin/AdminUserCreateDialog";
import AdminUserProfileDialog from "@/components/admin/AdminUserProfileDialog";

export default function AdminUsersPanel() {
  const { t } = useI18n();
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all"); // all | merchant | organizer | admin
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // user obj or null
  const [deleting, setDeleting] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);

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

  async function deleteUser(u) {
    setConfirmDelete(u);
  }

  async function performDelete() {
    const u = confirmDelete;
    if (!u) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(t("admin.users.delete_success"));
      setConfirmDelete(null);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : t("admin.action_error"));
    } finally {
      setDeleting(false);
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
        <div className="flex gap-2 flex-wrap items-center">
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
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="bg-viking-ember hover:bg-viking-ember/90 ml-2"
            data-testid="admin-add-admin-btn"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            {t("admin.users.add_admin_btn")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-overline border-b border-viking-edge">
              <th className="text-left py-2 pr-3">{t("admin.users.col_user")}</th>
              <th className="text-left py-2 pr-3">{t("admin.users.col_role")}</th>
              <th className="text-left py-2 pr-3">{t("admin.users.col_types")}</th>
              <th className="text-right py-2 px-3">{t("admin.users.col_paid")}</th>
              <th className="text-right py-2 pl-3 w-12">{t("admin.users.col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
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
                  onClick={() => setProfileUserId(u.id)}
                  className="border-b border-viking-edge/40 hover:bg-viking-surface2/30 cursor-pointer transition-colors"
                  title={t("admin.user_profile.open_hint") || "Avaa profiili"}
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
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      data-testid={`toggle-paid-${u.id}`}
                      checked={!!u.paid_messaging_enabled}
                      onCheckedChange={() => toggle(u)}
                    />
                  </td>
                  <td className="py-3 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => deleteUser(u)}
                      disabled={u.id === currentAdmin?.id}
                      title={
                        u.id === currentAdmin?.id
                          ? t("admin.users.cannot_delete_self")
                          : t("admin.users.delete_btn")
                      }
                      data-testid={`delete-user-${u.id}`}
                      className="p-1.5 rounded-sm border border-viking-edge text-viking-stone hover:text-red-400 hover:border-red-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AdminUserCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => load()}
      />
      <AdminUserProfileDialog
        userId={profileUserId}
        open={!!profileUserId}
        onOpenChange={(open) => {
          if (!open) setProfileUserId(null);
        }}
      />
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent
          className="bg-viking-bg border-viking-edge"
          data-testid="confirm-delete-user-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-viking-bone">
              {t("admin.users.delete_btn")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-viking-stone text-sm">
              {(t("admin.users.confirm_delete") || "")
                .replace(
                  "{user}",
                  confirmDelete?.email || confirmDelete?.nickname || "",
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              data-testid="confirm-delete-cancel"
              className="border-viking-edge text-viking-stone"
            >
              {t("admin.action_cancel") || t("common.cancel") || "Peruuta"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={performDelete}
              data-testid="confirm-delete-confirm"
              className="bg-red-700 hover:bg-red-700/90 text-white"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t("admin.users.delete_btn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
