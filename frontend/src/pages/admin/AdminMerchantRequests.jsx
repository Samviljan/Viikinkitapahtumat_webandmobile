/**
 * Admin: Merchant card requests inbox.
 *
 * Lists pending applications submitted via the public Shops CTA. Each row
 * has Approve (auto-activates the user's merchant card with the requested
 * details) and Reject (with optional admin note) actions.
 */
import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUSES = [
  { key: "pending", icon: Loader2 },
  { key: "approved", icon: CheckCircle2 },
  { key: "rejected", icon: XCircle },
];

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminMerchantRequests() {
  const { t } = useI18n();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  const reload = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/admin/merchant-card-requests?status=${status}`,
      );
      setRows(data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload(tab);
  }, [tab]);

  const approve = async (id) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.post(`/admin/merchant-card-requests/${id}/approve`);
      toast.success(t("admin.merchant_requests.approved_toast"));
      reload(tab);
    } catch {
      toast.error(t("account.error_generic"));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const reject = async (id) => {
    const note = window.prompt(t("admin.merchant_requests.reject_prompt"));
    if (note === null) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.post(`/admin/merchant-card-requests/${id}/reject`, { note });
      toast.success(t("admin.merchant_requests.rejected_toast"));
      reload(tab);
    } catch {
      toast.error(t("account.error_generic"));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-merchant-requests">
      <div>
        <h2 className="font-serif text-2xl text-viking-bone">
          {t("admin.merchant_requests.title")}
        </h2>
        <p className="text-sm text-viking-stone mt-1">
          {t("admin.merchant_requests.lead")}
        </p>
      </div>

      <div className="flex gap-1 border-b border-viking-edge" role="tablist">
        {STATUSES.map(({ key, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`admin-mr-tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-rune uppercase tracking-wider transition-colors border-b-2 ${
                active
                  ? "border-viking-gold text-viking-gold"
                  : "border-transparent text-viking-stone hover:text-viking-bone"
              }`}
            >
              <Icon size={14} />
              {t(`admin.merchant_requests.tab_${key}`)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-viking-stone text-center py-10">
          {t("messages.loading")}
        </p>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <Inbox size={28} className="text-viking-gold/60 mx-auto mb-3" />
          <p className="text-viking-stone">
            {t("admin.merchant_requests.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              data-testid={`admin-mr-row-${r.id}`}
              className="carved-card rounded-sm p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg text-viking-bone">
                    {r.shop_name}
                  </h3>
                  <div className="text-[11px] text-viking-stone uppercase mt-1 tracking-wider">
                    {t(`merchant_cta.cat_${r.category}`)} ·{" "}
                    <span className="text-viking-gold">{r.user_email}</span> ·{" "}
                    {formatWhen(r.created_at)}
                  </div>
                  {r.website ? (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-viking-gold hover:underline mt-1 inline-block"
                    >
                      {r.website}
                    </a>
                  ) : null}
                  {r.description ? (
                    <p className="text-sm text-viking-stone mt-2 leading-relaxed whitespace-pre-wrap">
                      {r.description}
                    </p>
                  ) : null}
                  {r.admin_note ? (
                    <div className="text-xs text-viking-ember mt-2 italic">
                      {t("admin.merchant_requests.note_label")}: {r.admin_note}
                    </div>
                  ) : null}
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid={`admin-mr-approve-${r.id}`}
                      onClick={() => approve(r.id)}
                      disabled={!!busy[r.id]}
                      className="inline-flex items-center gap-1.5 bg-viking-gold/20 hover:bg-viking-gold/30 disabled:opacity-50 text-viking-gold border border-viking-gold/40 text-xs font-rune uppercase tracking-wider h-9 px-3 rounded-sm"
                    >
                      <CheckCircle2 size={12} />
                      {t("admin.merchant_requests.approve")}
                    </button>
                    <button
                      type="button"
                      data-testid={`admin-mr-reject-${r.id}`}
                      onClick={() => reject(r.id)}
                      disabled={!!busy[r.id]}
                      className="inline-flex items-center gap-1.5 bg-viking-ember/15 hover:bg-viking-ember/25 disabled:opacity-50 text-viking-ember border border-viking-ember/40 text-xs font-rune uppercase tracking-wider h-9 px-3 rounded-sm"
                    >
                      <XCircle size={12} />
                      {t("admin.merchant_requests.reject")}
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-viking-stone uppercase tracking-wider whitespace-nowrap">
                    {t(`admin.merchant_requests.status_${r.status}`)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
