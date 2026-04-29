/**
 * Admin panel: shows the current translation gap status and lets admins
 * trigger a sweep manually. Hooked into AdminSystem.
 */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Languages, Loader2, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function AdminTranslationsPanel() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/translations/health");
      setData(data);
    } catch {
      toast.error(t("admin.action_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function runSweep() {
    setRunning(true);
    try {
      const { data: summary } = await api.post(
        "/admin/translations/sweep?max_events=50",
      );
      toast.success(
        `OK: ${summary.fields_filled} kenttää täytetty (${summary.processed}/${summary.candidates} tapahtumaa)`,
      );
      await load();
    } catch {
      toast.error(t("admin.action_error"));
    } finally {
      setRunning(false);
    }
  }

  const total = data?.total_events_with_gaps ?? 0;
  const langs = data?.supported_langs ?? [];

  return (
    <section className="carved-card p-6 sm:p-8 rounded-sm" data-testid="admin-translations-panel">
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <Languages className="text-viking-gold" size={18} />
        <h2 className="font-serif text-lg text-viking-bone flex-1">
          {t("admin.translations.title") || "Käännösten kattavuus"}
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          data-testid="translations-refresh"
          className="border-viking-edge text-viking-stone hover:text-viking-gold rounded-sm font-rune text-[10px]"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {t("admin.refresh") || "Päivitä"}
        </Button>
      </header>

      <p className="text-xs text-viking-stone mb-4 leading-relaxed">
        {t("admin.translations.help") ||
          "Tapahtumalle luodaan automaattisesti käännökset kaikkiin tuettuihin kieliin (FI, EN, SV, DA, DE, ET, PL). Tausta-ajo tarkistaa puuttuvat käännökset 6 tunnin välein, mutta voit ajaa tarkistuksen myös käsin alla olevasta painikkeesta."}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat
          label={t("admin.translations.supported_langs") || "Tuetut kielet"}
          value={langs.length}
        />
        <Stat
          label={t("admin.translations.events_with_gaps") || "Aukkoja tapahtumissa"}
          value={total}
          warn={total > 0}
        />
      </div>

      <Button
        onClick={runSweep}
        disabled={running || total === 0}
        data-testid="translations-run-sweep"
        className="bg-viking-ember hover:bg-viking-ember/90 text-viking-bone rounded-sm font-rune text-[11px]"
      >
        {running ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 mr-1.5" />
        )}
        {t("admin.translations.run_btn") || "Aja käännöstarkistus nyt"}
      </Button>

      {total > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-xs text-viking-stone hover:text-viking-gold">
            {t("admin.translations.show_gaps") ||
              "Näytä puuttuvat käännökset"}
          </summary>
          <ul
            className="mt-3 space-y-1.5 text-xs"
            data-testid="translations-gap-list"
          >
            {(data?.events_with_gaps || []).slice(0, 50).map((ev) => (
              <li
                key={ev.id}
                className="border-l-2 border-viking-gold/40 pl-3 py-1"
              >
                <div className="text-viking-bone font-medium truncate">
                  {ev.title_fi || ev.title_en || ev.id}
                  {ev.status !== "approved" && (
                    <span className="ml-2 text-[10px] text-viking-stone">
                      [{ev.status}]
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-viking-stone mt-0.5">
                  {ev.missing.length} puuttuu: {ev.missing.slice(0, 6).join(", ")}
                  {ev.missing.length > 6 ? "…" : ""}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div
      className={`p-3 border rounded-sm ${
        warn
          ? "border-viking-ember/50 bg-viking-ember/5"
          : "border-viking-edge bg-viking-surface2/30"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-viking-stone">
        {label}
      </p>
      <p
        className={`font-serif text-2xl mt-1 ${
          warn ? "text-viking-ember" : "text-viking-gold"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
