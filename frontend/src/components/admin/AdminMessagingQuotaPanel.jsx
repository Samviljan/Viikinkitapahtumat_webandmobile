/**
 * Admin panel for the per-event messaging quota.
 *
 * Choices:
 *   A = 10 messages / event (default)
 *   B = 20
 *   C = 30
 *   D = custom (default 50, configurable)
 *
 * The quota is enforced server-side in POST /api/messages/send via
 * count_documents on message_log. It is NOT reset when a sender drops their
 * RSVP, so leaving and re-joining an event does not unlock more messages.
 */
import React, { useEffect, useState } from "react";
import { Save, Sliders } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const PRESETS = [
  { key: "A", value: 10, label: "A · 10" },
  { key: "B", value: 20, label: "B · 20" },
  { key: "C", value: 30, label: "C · 30" },
  { key: "D", value: null, label: "D · vapaa" },
];

export default function AdminMessagingQuotaPanel() {
  const [loaded, setLoaded] = useState(false);
  const [preset, setPreset] = useState("A");
  const [customValue, setCustomValue] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/messaging-quota")
      .then((res) => {
        if (cancelled) return;
        setPreset(res.data.preset || "A");
        setCustomValue(res.data.custom_value || 50);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(nextPreset = preset, nextCustom = customValue) {
    setSaving(true);
    try {
      const body = { preset: nextPreset };
      if (nextPreset === "D") body.custom_value = Math.max(1, parseInt(nextCustom, 10) || 1);
      const res = await api.patch("/admin/messaging-quota", body);
      setPreset(res.data.preset);
      setCustomValue(res.data.custom_value);
      toast.success(`Tallennettu — raja ${res.data.current_limit} viestiä / tapahtuma`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  function handlePreset(k) {
    setPreset(k);
    if (k !== "D") save(k, customValue);
  }

  if (!loaded) return null;

  const currentLimit = preset === "D" ? customValue : PRESETS.find((p) => p.key === preset)?.value;

  return (
    <div className="carved-card rounded-sm p-5 space-y-4" data-testid="admin-messaging-quota-panel">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
          <Sliders size={18} />
        </div>
        <div className="flex-1">
          <div className="font-rune text-xs uppercase tracking-wider text-viking-bone">
            Viestikiintiö per tapahtuma
          </div>
          <p className="text-xs text-viking-stone leading-relaxed mt-1">
            Kauppias / järjestäjä saa lähettää enintään{" "}
            <span className="text-viking-gold">{currentLimit}</span> push- tai
            sähköpostiviestiä yhteen tapahtumaan. Laskuri säilyy myös jos
            käyttäjä poistaa osallistumismerkintänsä ja palaa myöhemmin.
            Adminin viestit eivät kuluta kvootaa.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup">
        {PRESETS.map((p) => {
          const active = preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              data-testid={`quota-preset-${p.key}`}
              onClick={() => handlePreset(p.key)}
              role="radio"
              aria-checked={active}
              className={`px-4 py-2 rounded-sm text-sm font-rune uppercase tracking-wider border transition-colors ${
                active
                  ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                  : "border-viking-edge text-viking-stone hover:border-viking-gold/50 hover:text-viking-bone"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === "D" && (
        <div className="flex items-center gap-3" data-testid="quota-custom-row">
          <input
            type="number"
            min={1}
            max={500}
            value={customValue}
            onChange={(e) => setCustomValue(parseInt(e.target.value, 10) || 1)}
            data-testid="quota-custom-input"
            className="w-28 px-3 py-2 rounded-sm border border-viking-edge bg-viking-charcoal text-viking-bone text-sm focus:border-viking-gold focus:outline-none"
          />
          <span className="text-xs text-viking-stone">viestiä / tapahtuma</span>
          <button
            type="button"
            data-testid="quota-custom-save"
            onClick={() => save("D", customValue)}
            disabled={saving}
            className="ml-auto px-3 py-2 rounded-sm border border-viking-gold/60 text-viking-gold text-xs uppercase tracking-wider font-rune hover:bg-viking-gold/10 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Save size={12} /> Tallenna
          </button>
        </div>
      )}
    </div>
  );
}
