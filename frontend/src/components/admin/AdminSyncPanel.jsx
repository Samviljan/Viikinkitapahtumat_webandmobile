import React, { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin panel: triggers a manual prod → preview events sync.
 * Calls POST /api/admin/sync-prod-events. Shows the resulting event count.
 *
 * Background: the same sync runs automatically twice daily (06:00 + 18:00
 * Europe/Helsinki) but admins can refresh on demand from this card.
 */
export default function AdminSyncPanel() {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function runSync() {
    if (
      !window.confirm(
        "Synkkaa tuotannon tapahtumat tähän testitietokantaan? Nykyiset tapahtumat ylikirjoitetaan."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/admin/sync-prod-events");
      setLastResult(data);
      toast.success(`Synkattu — ${data.events_in_db} tapahtumaa testikannassa`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Synkkaus epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="sync-panel">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <Database size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone">
              Tuotanto → testikanta -synkkaus
            </h3>
            <p className="text-sm text-viking-stone mt-1 max-w-2xl">
              Hakee tuotannon julkaistut tapahtumat ja korvaa testikannan tällä
              hetkellä näkyvät tapahtumat. Aikataulutettu pyörimään
              automaattisesti kahdesti vuorokaudessa klo 06:00 ja 18:00
              (Europe/Helsinki). Voit myös käynnistää sen manuaalisesti.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            data-testid="sync-now-btn"
            disabled={busy}
            onClick={runSync}
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px] ember-glow"
          >
            <RefreshCw size={12} className={`mr-2 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Synkataan..." : "Synkkaa nyt"}
          </Button>
        </div>
      </div>
      {lastResult && (
        <div className="mt-5 border-t border-viking-edge pt-4 text-sm text-viking-stone">
          <span className="text-overline mr-3">Tulos</span>
          <span className="text-viking-bone font-medium">
            {lastResult.events_in_db}
          </span>{" "}
          tapahtumaa nyt testikannassa.
        </div>
      )}
    </div>
  );
}
