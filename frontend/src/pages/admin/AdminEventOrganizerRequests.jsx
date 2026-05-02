/**
 * Admin: Event organizer activation requests inbox.
 *
 * Lists pending requests submitted via the EventDetail "Pyydä järjestäjäksi"
 * CTA. Each row shows the requester's confirmed name + contact info and
 * the target event. Approve adds the user to events.organizer_user_ids
 * (max 3 per event, server enforces). Reject includes an optional note.
 */
import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Inbox, Loader2, ShieldCheck, Mail, Phone, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import ManualAddOrganizerDialog from "@/components/admin/ManualAddOrganizerDialog";

const TABS = ["pending", "approved", "rejected"];

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminEventOrganizerRequests() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  const reload = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/admin/event-organizer-requests?status=${status}`,
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
      await api.post(`/admin/event-organizer-requests/${id}/approve`);
      toast.success("Hyväksytty — käyttäjä on nyt tapahtuman järjestäjä");
      reload(tab);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Hyväksyntä epäonnistui");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const reject = async (id) => {
    const note = window.prompt("Hylkäyksen syy (valinnainen):");
    if (note === null) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.post(`/admin/event-organizer-requests/${id}/reject`, { note });
      toast.success("Pyyntö hylätty");
      reload(tab);
    } catch {
      toast.error("Hylkäys epäonnistui");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const sync = async () => {
    if (
      !window.confirm(
        "Synkronoi kaikki hyväksytyt järjestäjät tapahtumiin? Idempotentti — turvallista ajaa milloin vain.",
      )
    )
      return;
    setBusy((b) => ({ ...b, __sync__: true }));
    try {
      const { data } = await api.post("/admin/event-organizer-requests/sync");
      const added = data?.added_count || 0;
      const ok = data?.already_ok || 0;
      const missing = (data?.missing_events || []).length;
      toast.success(
        `Synkronoitu: ${added} lisätty, ${ok} oli jo synkissä` +
          (missing ? `, ${missing} tapahtumaa puuttuu` : ""),
      );
      reload(tab);
    } catch {
      toast.error("Synkronointi epäonnistui");
    } finally {
      setBusy((b) => ({ ...b, __sync__: false }));
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-event-organizer-requests">
      <header className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-viking-gold" />
          <h1 className="text-2xl font-serif text-viking-bone">
            Tapahtumajärjestäjien pyynnöt
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={sync}
            disabled={!!busy.__sync__}
            data-testid="sync-organizers-btn"
            className="flex items-center gap-1 px-3 py-2 text-xs uppercase tracking-wider border border-viking-edge rounded-sm text-viking-stone hover:text-viking-gold hover:border-viking-gold/60 disabled:opacity-50"
            title="Tarkista että jokaisen hyväksytyn järjestäjän user_id on tapahtuman organizer_user_ids -listalla"
          >
            {busy.__sync__ ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Synkronoi
          </button>
          <ManualAddOrganizerDialog onAdded={() => reload(tab)} />
        </div>
      </header>

      <div className="flex gap-2 border-b border-viking-edge">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            data-testid={`tab-${s}`}
            className={`px-4 py-2 text-xs uppercase tracking-wider border-b-2 transition-colors ${
              tab === s
                ? "border-viking-gold text-viking-gold"
                : "border-transparent text-viking-stone hover:text-viking-bone"
            }`}
          >
            {s === "pending" ? "Odottaa" : s === "approved" ? "Hyväksytyt" : "Hylätyt"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-viking-stone">
          <Loader2 className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-viking-stone">
          <Inbox size={32} />
          <p className="text-sm">Ei pyyntöjä.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              data-testid={`request-row-${r.id}`}
              className="border border-viking-edge rounded-sm p-4 bg-viking-shadow/40 space-y-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-viking-bone text-base">
                      {r.full_name}
                    </span>
                    <span className="text-xs text-viking-stone">
                      ({r.user_nickname || r.user_email})
                    </span>
                  </div>
                  <Link
                    to={`/events/${r.event_id}`}
                    className="text-xs text-viking-gold hover:underline"
                  >
                    → {r.event_title}
                    {r.event_start_date ? ` · ${r.event_start_date}` : ""}
                  </Link>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    <a
                      href={`mailto:${r.email}`}
                      className="flex items-center gap-1 text-xs text-viking-stone hover:text-viking-gold"
                    >
                      <Mail size={11} />
                      {r.email}
                    </a>
                    {r.phone && (
                      <a
                        href={`tel:${r.phone}`}
                        className="flex items-center gap-1 text-xs text-viking-stone hover:text-viking-gold"
                      >
                        <Phone size={11} />
                        {r.phone}
                      </a>
                    )}
                  </div>
                  {r.note && (
                    <p className="text-xs text-viking-stone italic mt-2 whitespace-pre-wrap">
                      {r.note}
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-viking-stone/60 text-right whitespace-nowrap">
                  {formatWhen(r.created_at)}
                </div>
              </div>

              {r.admin_note && (
                <p className="text-[11px] text-viking-stone bg-viking-shadow/60 p-2 rounded-sm">
                  <span className="text-viking-gold">Adminin huomio:</span> {r.admin_note}
                </p>
              )}

              {tab === "pending" ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => approve(r.id)}
                    disabled={!!busy[r.id]}
                    data-testid={`approve-${r.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-viking-gold/10 text-viking-gold border border-viking-gold/40 rounded-sm hover:bg-viking-gold/20 disabled:opacity-50"
                  >
                    {busy[r.id] ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Hyväksy
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(r.id)}
                    disabled={!!busy[r.id]}
                    data-testid={`reject-${r.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-viking-stone border border-viking-edge rounded-sm hover:text-viking-bone disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Hylkää
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-viking-stone/60">
                  Käsitelty: {formatWhen(r.processed_at)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
