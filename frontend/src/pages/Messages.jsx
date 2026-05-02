/**
 * Unified `/messages` page — 3 tabs:
 *   • Saapuneet  — inbox grouped by event with unread counts
 *   • Lähetetyt  — sent batches grouped by event (visible to anyone with sends)
 *   • Lähetä uusi — embeds the existing SendMessage compose form
 *
 * Visible to any logged-in user. Compose tab itself self-gates on
 * paid-messaging permission (renders blocked notice if the user lacks it).
 */
import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Inbox, Send, PlusCircle, Trash2, X, Mail, Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import SendMessage from "@/pages/SendMessage";

const TABS = [
  { key: "inbox", icon: Inbox },
  { key: "sent", icon: Send },
  { key: "compose", icon: PlusCircle },
];

function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function MessageDetailDialog({ message, role, open, onClose, onDelete, t }) {
  if (!message) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="message-detail"
        className="bg-viking-surface border-viking-edge text-viking-bone max-w-xl"
      >
        <DialogTitle className="font-serif text-xl text-viking-bone pr-8">
          {message.subject || t("messages.no_subject")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("messages.detail_a11y")}
        </DialogDescription>
        <div className="text-[11px] text-viking-stone uppercase tracking-wider">
          {role === "recipient" ? t("messages.from") : t("messages.to_recipients")}
          {": "}
          <span className="text-viking-gold">
            {role === "recipient"
              ? message.sender_label || ""
              : (message.recipients ?? "?") + " " + t("messages.recipients_unit")}
          </span>
          <span className="ml-3 text-viking-stone">{formatWhen(message.created_at)}</span>
        </div>
        <div
          data-testid="message-body"
          className="text-sm text-viking-bone whitespace-pre-wrap leading-relaxed mt-2 max-h-[60vh] overflow-auto"
        >
          {message.body}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-viking-edge/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(t("messages.delete_confirm"))) onDelete(message.id);
            }}
            data-testid="message-delete"
            className="text-viking-ember hover:text-viking-emberHover hover:bg-transparent"
          >
            <Trash2 size={14} className="mr-2" />
            {t("messages.delete")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            data-testid="message-close"
            className="bg-viking-surface2 hover:bg-viking-surface text-viking-bone border border-viking-edge"
          >
            <X size={14} className="mr-2" />
            {t("messages.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventGroupRow({ group, lang, expanded, onToggle, badge, testid }) {
  const ev = group.event || {};
  const title = ev[`title_${lang}`] || ev.title_fi || ev.title || ev.id;
  const date = ev.start_date || "";
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid={testid}
      className="w-full flex items-center gap-4 p-4 carved-card rounded-sm text-left hover:border-viking-gold/40 transition-colors"
    >
      {ev.image_url ? (
        <img
          src={ev.image_url.startsWith("http") ? ev.image_url : `${process.env.REACT_APP_BACKEND_URL}${ev.image_url}`}
          alt=""
          className="h-16 w-16 object-cover rounded-sm flex-shrink-0"
        />
      ) : (
        <div className="h-16 w-16 rounded-sm bg-viking-surface2 border border-viking-edge flex items-center justify-center flex-shrink-0">
          <Mail size={20} className="text-viking-gold/60" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-serif text-base text-viking-bone truncate">{title}</div>
        {date ? (
          <div className="text-[11px] text-viking-stone uppercase">{date}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {badge}
        <span className="text-viking-gold font-rune text-xs">
          {expanded ? "▾" : "▸"}
        </span>
      </div>
    </button>
  );
}

function InboxTab() {
  const { t, lang } = useI18n();
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState({});
  const [openMsg, setOpenMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/messages/inbox");
      setGroups(data || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const expand = async (eventId) => {
    if (expanded === eventId) {
      setExpanded(null);
      return;
    }
    setExpanded(eventId);
    if (!items[eventId]) {
      try {
        const { data } = await api.get(`/messages/inbox/${eventId}`);
        setItems((prev) => ({ ...prev, [eventId]: data || [] }));
      } catch {
        setItems((prev) => ({ ...prev, [eventId]: [] }));
      }
    }
  };

  const openMessage = async (id) => {
    try {
      const { data } = await api.get(`/messages/${id}`);
      setOpenMsg(data);
      // Optimistically mark this row read in our local copy
      setItems((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].map((m) => (m.id === id ? { ...m, read_at: data.read_at } : m));
        }
        return next;
      });
      // Refresh group counts
      reload();
    } catch {
      toast.error(t("account.error_generic"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/messages/${id}`);
      setOpenMsg(null);
      // Remove from local list and reload groups for accurate counts
      setItems((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].filter((m) => m.id !== id);
        }
        return next;
      });
      toast.success(t("messages.deleted_toast"));
      reload();
    } catch {
      toast.error(t("account.error_generic"));
    }
  };

  if (loading) {
    return <p className="text-viking-stone text-center py-8">{t("messages.loading")}</p>;
  }
  if (groups.length === 0) {
    return (
      <div data-testid="inbox-empty" className="py-16 text-center">
        <Inbox size={32} className="text-viking-gold/60 mx-auto mb-3" />
        <p className="text-viking-stone">{t("messages.inbox_empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.event.id || Math.random()}>
          <EventGroupRow
            group={g}
            lang={lang}
            expanded={expanded === g.event.id}
            onToggle={() => expand(g.event.id)}
            testid={`inbox-event-${g.event.id}`}
            badge={
              g.unread > 0 ? (
                <span
                  data-testid={`inbox-unread-${g.event.id}`}
                  className="bg-viking-ember text-viking-bone text-xs rounded-full px-2 py-0.5 font-rune"
                >
                  {g.unread}
                </span>
              ) : (
                <span className="text-viking-stone text-xs">
                  {g.total} {t("messages.total_unit")}
                </span>
              )
            }
          />
          {expanded === g.event.id ? (
            <div className="mt-2 space-y-2 pl-4 border-l border-viking-edge/60">
              {(items[g.event.id] || []).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openMessage(m.id)}
                  data-testid={`inbox-msg-${m.id}`}
                  className="w-full text-left p-3 rounded-sm bg-viking-surface hover:bg-viking-surface2 border border-viking-edge transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {!m.read_at ? (
                      <span className="h-2 w-2 rounded-full bg-viking-ember flex-shrink-0" />
                    ) : null}
                    <span className={`flex-1 truncate font-serif ${m.read_at ? "text-viking-stone" : "text-viking-bone"}`}>
                      {m.subject || t("messages.no_subject")}
                    </span>
                    <span className="text-[10px] text-viking-stone">
                      {formatWhen(m.created_at).split(",")[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-viking-stone mt-1 truncate">
                    {t("messages.from")}: {m.sender_label}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <MessageDetailDialog
        message={openMsg}
        role="recipient"
        open={!!openMsg}
        onClose={() => setOpenMsg(null)}
        onDelete={handleDelete}
        t={t}
      />
    </div>
  );
}

function SentTab() {
  const { t, lang } = useI18n();
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState({});
  const [openMsg, setOpenMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/messages/sent");
      setGroups(data || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const expand = async (eventId) => {
    if (expanded === eventId) {
      setExpanded(null);
      return;
    }
    setExpanded(eventId);
    if (!items[eventId]) {
      try {
        const { data } = await api.get(`/messages/sent/${eventId}`);
        setItems((prev) => ({ ...prev, [eventId]: data || [] }));
      } catch {
        setItems((prev) => ({ ...prev, [eventId]: [] }));
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/messages/${id}`);
      setOpenMsg(null);
      // Sender delete soft-removes the entire batch from sent view; reload.
      setItems({});
      toast.success(t("messages.deleted_toast"));
      reload();
    } catch {
      toast.error(t("account.error_generic"));
    }
  };

  if (loading) {
    return <p className="text-viking-stone text-center py-8">{t("messages.loading")}</p>;
  }
  if (groups.length === 0) {
    return (
      <div data-testid="sent-empty" className="py-16 text-center">
        <Send size={32} className="text-viking-gold/60 mx-auto mb-3" />
        <p className="text-viking-stone">{t("messages.sent_empty")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.event.id || Math.random()}>
          <EventGroupRow
            group={g}
            lang={lang}
            expanded={expanded === g.event.id}
            onToggle={() => expand(g.event.id)}
            testid={`sent-event-${g.event.id}`}
            badge={
              <span className="text-viking-gold/80 text-xs">
                {g.batches} {t("messages.batches_unit")}
              </span>
            }
          />
          {expanded === g.event.id ? (
            <div className="mt-2 space-y-2 pl-4 border-l border-viking-edge/60">
              {(items[g.event.id] || []).map((m) => (
                <button
                  key={m.batch_id}
                  type="button"
                  onClick={() => setOpenMsg(m)}
                  data-testid={`sent-msg-${m.batch_id}`}
                  className="w-full text-left p-3 rounded-sm bg-viking-surface hover:bg-viking-surface2 border border-viking-edge transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate font-serif text-viking-bone">
                      {m.subject}
                    </span>
                    <span className="text-[10px] text-viking-stone">
                      {formatWhen(m.created_at).split(",")[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-viking-stone mt-1">
                    {m.recipients} {t("messages.recipients_unit")} · {t(`messaging.ch_${m.channel}`)}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <MessageDetailDialog
        message={openMsg}
        role="sender"
        open={!!openMsg}
        onClose={() => setOpenMsg(null)}
        onDelete={handleDelete}
        t={t}
      />
    </div>
  );
}

export default function Messages() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("inbox");
  // Total unread counter is shown next to the tab label as a small pill.
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .get("/messages/inbox")
      .then((r) => {
        const total = (r.data || []).reduce((acc, g) => acc + (g.unread || 0), 0);
        setUnread(total);
      })
      .catch(() => setUnread(0));
  }, [user, tab]);

  if (loading) return null;
  if (!user || !user.role) {
    return <Navigate to="/login" replace state={{ from: "/messages" }} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
          <Megaphone size={20} />
        </div>
        <div>
          <div className="text-overline">{t("messages.feature")}</div>
          <h1 className="font-serif text-2xl sm:text-3xl text-viking-bone">
            {t("messages.title")}
          </h1>
        </div>
      </div>

      <div className="flex border-b border-viking-edge mb-6 gap-1" role="tablist">
        {TABS.map(({ key, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              data-testid={`messages-tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-rune uppercase tracking-wider transition-colors border-b-2 ${
                active
                  ? "border-viking-gold text-viking-gold"
                  : "border-transparent text-viking-stone hover:text-viking-bone"
              }`}
            >
              <Icon size={14} />
              {t(`messages.tab_${key}`)}
              {key === "inbox" && unread > 0 ? (
                <span
                  data-testid="messages-unread-total"
                  className="bg-viking-ember text-viking-bone text-[10px] rounded-full px-1.5 py-0.5 font-rune"
                >
                  {unread}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "inbox" ? <InboxTab /> : null}
      {tab === "sent" ? <SentTab /> : null}
      {tab === "compose" ? (
        <div data-testid="messages-tab-compose-pane">
          <SendMessage />
        </div>
      ) : null}
    </div>
  );
}
