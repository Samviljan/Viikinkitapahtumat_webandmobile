import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Newsletter subscriber management panel.
 *
 * Features:
 *  - Collapsible (subscriber lists can be long, default closed)
 *  - Search by email + filter by language
 *  - Hard-delete a subscriber via DELETE /api/admin/subscribers/{email}
 *  - Auto-refresh after delete
 */
export default function AdminSubscribersPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [langFilter, setLangFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/subscribers");
      setSubs(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t("admin.action_error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function remove(email) {
    if (!window.confirm(t("subs.confirm_delete").replace("{email}", email))) return;
    try {
      await api.delete(`/admin/subscribers/${encodeURIComponent(email)}`);
      toast.success(t("admin.action_ok"));
      setSubs((prev) => prev.filter((s) => s.email !== email));
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  const langs = useMemo(
    () => Array.from(new Set(subs.map((s) => s.lang || "fi"))).sort(),
    [subs],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return subs.filter((s) => {
      if (langFilter !== "all" && (s.lang || "fi") !== langFilter) return false;
      if (ql && !(s.email || "").toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [subs, q, langFilter]);

  const activeCount = subs.filter((s) => s.status === "active").length;

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="subscribers-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="subscribers-toggle"
        className="w-full flex items-center justify-between gap-4 text-left group"
        aria-expanded={open}
      >
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <Mail size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone group-hover:text-viking-gold transition-colors">
              {t("subs.title")}
            </h3>
            <p className="text-sm text-viking-stone mt-1">
              {t("subs.sub")} · {t("subs.active_count").replace("{n}", activeCount)} ·{" "}
              {t("subs.total_count").replace("{n}", subs.length)}
            </p>
          </div>
        </div>
        <span className="text-viking-stone group-hover:text-viking-gold transition-colors">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {open && (
        <div className="mt-6 border-t border-viking-edge pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-viking-stone"
              />
              <Input
                data-testid="subscribers-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("subs.search_placeholder")}
                className="pl-9 bg-viking-bg border-viking-edge text-viking-bone placeholder:text-viking-stone rounded-sm"
              />
            </div>
            <div className="flex gap-1 flex-wrap" data-testid="subscribers-lang-filter">
              {["all", ...langs].map((lng) => {
                const active = langFilter === lng;
                return (
                  <button
                    key={lng}
                    onClick={() => setLangFilter(lng)}
                    data-testid={`subs-lang-${lng}`}
                    className={`font-rune text-[10px] tracking-[0.16em] px-3 py-1.5 rounded-sm border transition-colors ${
                      active
                        ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                        : "border-viking-edge text-viking-stone hover:border-viking-gold hover:text-viking-gold"
                    }`}
                  >
                    {lng === "all" ? t("subs.lang_all") : lng.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              data-testid="subscribers-refresh"
              onClick={load}
              disabled={loading}
              className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px] tracking-[0.16em]"
            >
              <RefreshCw size={12} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              {t("subs.refresh")}
            </Button>
          </div>

          {loading ? (
            <p className="text-viking-stone text-sm py-6 text-center">{t("subs.loading")}</p>
          ) : filtered.length === 0 ? (
            <p
              data-testid="subscribers-empty"
              className="text-viking-stone text-sm py-6 text-center"
            >
              {t("subs.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table
                data-testid="subscribers-table"
                className="w-full text-sm text-viking-bone min-w-[600px]"
              >
                <thead>
                  <tr className="text-left font-rune text-[10px] tracking-[0.16em] text-viking-stone border-b border-viking-edge">
                    <th className="py-2 px-2">{t("subs.col_email")}</th>
                    <th className="py-2 px-2 w-16">{t("subs.col_lang")}</th>
                    <th className="py-2 px-2 w-24">{t("subs.col_status")}</th>
                    <th className="py-2 px-2 w-32 hidden sm:table-cell">
                      {t("subs.col_created")}
                    </th>
                    <th className="py-2 px-2 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.email}
                      data-testid={`subs-row-${s.email}`}
                      className="border-b border-viking-edge/40 hover:bg-viking-surface/40 transition-colors"
                    >
                      <td className="py-2 px-2 break-all">{s.email}</td>
                      <td className="py-2 px-2 font-rune text-[11px] text-viking-gold uppercase">
                        {s.lang || "fi"}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`inline-block font-rune text-[10px] tracking-[0.12em] px-2 py-0.5 rounded-sm border ${
                            s.status === "active"
                              ? "border-viking-gold/60 text-viking-gold"
                              : "border-viking-edge text-viking-stone"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-viking-stone hidden sm:table-cell">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          data-testid={`subs-delete-${s.email}`}
                          onClick={() => remove(s.email)}
                          aria-label={t("subs.delete_btn")}
                          title={t("subs.delete_btn")}
                          className="text-viking-stone hover:text-viking-ember transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}
