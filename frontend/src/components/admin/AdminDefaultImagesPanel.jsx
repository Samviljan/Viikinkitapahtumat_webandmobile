import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Trash2, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";

const API = process.env.REACT_APP_BACKEND_URL || "";

const CATEGORIES = ["market", "training_camp", "course", "festival", "meetup", "other"];
const CATEGORY_LABELS = {
  market: "Markkinat",
  training_camp: "Harjoitusleiri",
  course: "Kurssi",
  festival: "Festivaali",
  meetup: "Kokoontuminen",
  other: "Muu",
};

function fullUrl(u) {
  if (!u) return null;
  if (u.startsWith("http")) return u;
  return `${API}${u}`;
}

/**
 * Admin panel — manage the AI-generated default category images that are
 * auto-assigned to events whose organizer didn't upload their own picture.
 *
 * Flow:
 *  - Page load → GET /api/admin/default-event-images → counts + thumbnails per category
 *  - "Generoi puuttuvat" → POST /api/admin/default-event-images/generate (no category) → background job fills every category up to 10
 *  - "Generoi tähän kategoriaan" → POST .../generate?category=X&count=N
 *  - Trash icon per thumbnail → DELETE .../generate/{id}
 *
 * Generation runs in the background — UI just shows a toast that it queued.
 * Refresh button re-fetches counts so the admin can watch the pool fill.
 */
export default function AdminDefaultImagesPanel() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/default-event-images");
      setData(data || {});
    } catch {
      toast.error("Lataus epäonnistui");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const generateAll = async () => {
    if (
      !window.confirm(
        "Generoidaanko puuttuvat oletuskuvat? (Maks. 10 per kategoria, taustalla, n. 1–3 min/kategoria)",
      )
    ) {
      return;
    }
    setBusy("all");
    try {
      const { data: r } = await api.post(
        "/admin/default-event-images/generate?count=10",
      );
      const planned = (r.plan || []).reduce((s, p) => s + (p.to_generate || 0), 0);
      toast.success(`${planned} kuvaa jonossa — generointi käynnissä taustalla.`);
      // Give the worker a head start before refresh
      setTimeout(reload, 8000);
    } catch (err) {
      toast.error("Generointi epäonnistui");
    } finally {
      setBusy(null);
    }
  };

  const generateCategory = async (cat, n = 10) => {
    setBusy(cat);
    try {
      await api.post(
        `/admin/default-event-images/generate?category=${cat}&count=${n}`,
      );
      toast.success(`${n} kuvaa jonossa kategoriaan "${CATEGORY_LABELS[cat]}".`);
      setTimeout(reload, 8000);
    } catch {
      toast.error("Generointi epäonnistui");
    } finally {
      setBusy(null);
    }
  };

  const deleteImage = async (id) => {
    if (!window.confirm("Poista kuva pysyvästi?")) return;
    try {
      await api.delete(`/admin/default-event-images/${id}`);
      await reload();
    } catch {
      toast.error("Poisto epäonnistui");
    }
  };

  return (
    <section
      data-testid="admin-default-images-panel"
      className="carved-card rounded-sm p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="min-w-0 max-w-xl">
          <h2 className="font-serif text-xl text-viking-bone flex items-center gap-2">
            <ImageIcon size={18} className="text-viking-gold" />
            Tapahtumien oletuskuvat
          </h2>
          <p className="text-xs text-viking-stone mt-1 leading-relaxed">
            10 AI-generoitua oletuskuvaa per kategoria. Käyttäjän luodessa
            tapahtuman ilman omaa kuvaa, järjestelmä valitsee satunnaisesti
            yhden ja tallentaa sen pysyvästi tapahtumaan.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            data-testid="default-images-refresh"
            className="border-viking-edge text-viking-stone hover:text-viking-gold"
          >
            <RefreshCw size={12} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Päivitä
          </Button>
          <Button
            size="sm"
            onClick={generateAll}
            disabled={busy === "all"}
            data-testid="default-images-generate-all"
            className="bg-viking-gold text-viking-shadow hover:bg-viking-gold/90"
          >
            <Sparkles size={12} className="mr-2" />
            {busy === "all" ? "Jonossa…" : "Generoi puuttuvat"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const entry = data[cat] || { count: 0, items: [] };
          const target = 10;
          const missing = Math.max(0, target - entry.count);
          return (
            <div
              key={cat}
              data-testid={`default-images-cat-${cat}`}
              className="border border-viking-edge rounded-sm p-4 bg-viking-shadow/40"
            >
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <h3 className="font-serif text-base text-viking-bone">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <p className="text-xs text-viking-stone mt-0.5">
                    {entry.count} / {target}
                    {missing > 0 ? (
                      <span className="text-viking-ember/80 ml-2">
                        ({missing} puuttuu)
                      </span>
                    ) : (
                      <span className="text-viking-gold/80 ml-2">✓ täynnä</span>
                    )}
                  </p>
                </div>
                {missing > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateCategory(cat, missing)}
                    disabled={busy === cat}
                    data-testid={`default-images-gen-${cat}`}
                    className="border-viking-gold/50 text-viking-gold hover:bg-viking-gold/10"
                  >
                    <Sparkles size={11} className="mr-2" />
                    {busy === cat ? "Jonossa…" : `Generoi ${missing} kpl`}
                  </Button>
                ) : null}
              </div>
              {entry.items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {entry.items.map((it) => (
                    <div
                      key={it.id}
                      className="relative group aspect-[16/9] rounded-sm overflow-hidden bg-viking-shadow/60 border border-viking-edge"
                    >
                      <img
                        src={fullUrl(it.image_url)}
                        alt={it.variant || cat}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => deleteImage(it.id)}
                        title="Poista"
                        data-testid={`default-image-delete-${it.id}`}
                        className="absolute top-1 right-1 p-1 rounded-sm bg-viking-shadow/80 text-viking-ember opacity-0 group-hover:opacity-100 hover:bg-viking-shadow transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                      {it.variant ? (
                        <span className="absolute bottom-1 left-1 right-1 text-[9px] text-viking-bone bg-viking-shadow/80 px-1 py-0.5 rounded-sm truncate">
                          {it.variant}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-viking-stone italic">
                  Ei vielä oletuskuvia.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
