import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CalendarX, Mail, Bell, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/**
 * RSVP / "I'm attending" button + notification preferences.
 *
 * - Anonymous users see a "Sign in to attend" CTA pointing at /login.
 * - Logged-in users see an "Attend" button. Once attending, two toggles
 *   appear (email reminder, push reminder) which sync to backend immediately.
 * - State is fetched from /api/events/{id}/attend on mount and kept in sync.
 */
export default function AttendButton({ eventId }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState({
    attending: false,
    notify_email: true,
    notify_push: false,
  });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch current attendance once auth is resolved.
  useEffect(() => {
    if (authLoading || !user || !user.role) {
      setLoaded(true);
      return;
    }
    api
      .get(`/events/${eventId}/attend`)
      .then((r) => setState(r.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [authLoading, user, eventId]);

  if (authLoading || !loaded) return null;

  // Anonymous → sign-in CTA.
  if (!user || !user.role) {
    return (
      <Link
        to="/login"
        state={{ from: `/events/${eventId}` }}
        data-testid="attend-signin"
      >
        <Button
          variant="outline"
          className="border-viking-gold/60 text-viking-gold hover:bg-viking-gold/10 hover:text-viking-gold rounded-sm font-rune text-xs"
        >
          <LogIn size={14} className="mr-2" />
          {t("attend.sign_in_to_attend")}
        </Button>
      </Link>
    );
  }

  async function attend() {
    setBusy(true);
    try {
      const { data } = await api.post(`/events/${eventId}/attend`, {
        notify_email: state.notify_email,
        notify_push: state.notify_push,
      });
      setState(data);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api.delete(`/events/${eventId}/attend`);
      setState((s) => ({ ...s, attending: false }));
    } finally {
      setBusy(false);
    }
  }

  async function togglePref(field) {
    const next = { ...state, [field]: !state[field] };
    setState(next);
    try {
      await api.post(`/events/${eventId}/attend`, {
        notify_email: next.notify_email,
        notify_push: next.notify_push,
      });
    } catch {
      // revert on failure
      setState(state);
    }
  }

  return (
    <div className="w-full" data-testid="attend-block">
      <div className="flex flex-wrap items-center gap-3">
        {state.attending ? (
          <Button
            variant="outline"
            data-testid="attend-cancel"
            onClick={cancel}
            disabled={busy}
            className="border-viking-gold text-viking-gold hover:bg-viking-ember/15 hover:border-viking-ember hover:text-viking-ember rounded-sm font-rune text-xs"
          >
            <CalendarCheck size={14} className="mr-2" />
            {t("attend.attending")}
          </Button>
        ) : (
          <Button
            data-testid="attend-confirm"
            onClick={attend}
            disabled={busy}
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs ember-glow"
          >
            <CalendarCheck size={14} className="mr-2" />
            {t("attend.mark_attending")}
          </Button>
        )}
      </div>

      {state.attending && (
        <div
          className="mt-4 p-4 border border-viking-edge rounded-sm bg-viking-surface/40"
          data-testid="attend-prefs"
        >
          <div className="text-overline mb-3">{t("attend.notify_title")}</div>
          <p className="text-[12px] text-viking-stone mb-3 leading-relaxed">
            {t("attend.notify_help")}
          </p>
          <div className="flex flex-col gap-2">
            <Toggle
              testId="attend-notify-email"
              icon={Mail}
              active={state.notify_email}
              onChange={() => togglePref("notify_email")}
              label={t("attend.notify_email")}
            />
            <Toggle
              testId="attend-notify-push"
              icon={Bell}
              active={state.notify_push}
              onChange={() => togglePref("notify_push")}
              label={t("attend.notify_push")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ testId, icon: Icon, active, onChange, label }) {
  return (
    <button
      type="button"
      onClick={onChange}
      data-testid={testId}
      className={`flex items-center gap-3 px-3 py-2 rounded-sm border text-left transition-colors ${
        active
          ? "border-viking-gold/60 bg-viking-gold/10 text-viking-bone"
          : "border-viking-edge text-viking-stone hover:border-viking-gold/40"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-sm border flex items-center justify-center ${
          active ? "border-viking-gold bg-viking-gold/20" : "border-viking-edge"
        }`}
      >
        {active && <span className="block h-2 w-2 bg-viking-gold rounded-sm" />}
      </span>
      <Icon size={14} className={active ? "text-viking-gold" : "text-viking-stone"} />
      <span className="text-sm">{label}</span>
    </button>
  );
}
