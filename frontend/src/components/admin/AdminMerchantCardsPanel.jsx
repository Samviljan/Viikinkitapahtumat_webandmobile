import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Star, Power, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

function fmt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fi-FI", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Admin panel for managing merchant CARDS (the new user-card system).
 * Distinct from `AdminMerchantsPanel`, which CRUDs the legacy `merchants`
 * collection. Lists every user with a `merchant_card` sub-document and
 * lets admin toggle enabled / featured / renew the 12-month subscription.
 */
export default function AdminMerchantCardsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/merchant-cards");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load merchant cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const enable = async (userId) => {
    setBusy(userId);
    try {
      await api.post(`/admin/users/${userId}/merchant-card/enable`);
      toast.success("Kauppiaskortti aktivoitu (12 kk)");
      await reload();
    } catch {
      toast.error("Aktivointi epäonnistui");
    } finally {
      setBusy(null);
    }
  };

  const disable = async (userId) => {
    if (!window.confirm("Poista käytöstä?")) return;
    setBusy(userId);
    try {
      await api.post(`/admin/users/${userId}/merchant-card/disable`);
      toast.success("Kauppiaskortti pois käytöstä");
      await reload();
    } catch {
      toast.error("Toiminto epäonnistui");
    } finally {
      setBusy(null);
    }
  };

  const toggleFeatured = async (userId, current) => {
    setBusy(userId);
    try {
      await api.patch(`/admin/users/${userId}/merchant-card/featured`, { featured: !current });
      await reload();
    } catch {
      toast.error("Toiminto epäonnistui");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      data-testid="admin-merchant-cards-panel"
      className="carved-card rounded-sm p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-serif text-xl text-viking-bone">
            Kauppiaskortit (uusi järjestelmä)
          </h2>
          <p className="text-xs text-viking-stone mt-1 max-w-xl">
            Aktivoi käyttäjille 12 kk:n kauppiastilaus. Korotettuna “Featured” näkyy
            Kaupat-sivulla kärkenä. Aktivoinnin myötä rooli <code>merchant</code> lisätään
            automaattisesti, jos puuttuu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reload}
          data-testid="admin-merchant-cards-refresh"
          className="border-viking-edge text-viking-stone hover:text-viking-gold"
        >
          <RefreshCw size={12} className="mr-2" />
          Päivitä
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-viking-stone">…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-viking-stone">
          Ei kauppiaskortteja. Käyttäjä saa kortin kun aktivoit sen alta —
          käyttäjä näkyy listassa vasta kun hänellä on jo aktivoitu kortti.
          Käytä yllä olevaa <strong>Käyttäjät</strong>-välilehteä uuden kortin myöntämiseen.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-viking-stone border-b border-viking-edge">
              <tr>
                <th className="py-2 pr-4">Kauppa</th>
                <th className="py-2 pr-4">Käyttäjä</th>
                <th className="py-2 pr-4">Tila</th>
                <th className="py-2 pr-4">Voimassa</th>
                <th className="py-2 pr-4 text-right">Toiminnot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.user_id}
                  data-testid={`merchant-card-row-${r.user_id}`}
                  className="border-b border-viking-edge/40 hover:bg-viking-surface2/30"
                >
                  <td className="py-3 pr-4 align-top">
                    <div className="font-serif text-viking-bone">
                      {r.shop_name || <em className="text-viking-stone">(tyhjä)</em>}
                    </div>
                    <div className="text-[11px] text-viking-stone uppercase tracking-wider mt-0.5">
                      {r.category}
                    </div>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <div className="text-viking-bone">{r.email}</div>
                    {r.nickname && (
                      <div className="text-[11px] text-viking-stone">{r.nickname}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <span
                      className={`inline-flex items-center gap-1 text-xs rounded-sm px-2 py-0.5 ${
                        r.enabled
                          ? "bg-viking-gold/20 text-viking-gold"
                          : "bg-viking-shadow text-viking-stone"
                      }`}
                    >
                      {r.enabled ? "Aktiivinen" : "Pois"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 align-top text-viking-stone">
                    {fmt(r.merchant_until)}
                  </td>
                  <td className="py-3 pr-4 align-top text-right">
                    <div className="inline-flex items-center gap-2 flex-wrap justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy === r.user_id || !r.enabled}
                        onClick={() => toggleFeatured(r.user_id, r.featured)}
                        data-testid={`merchant-card-toggle-featured-${r.user_id}`}
                        className={`border-viking-edge ${
                          r.featured
                            ? "text-viking-gold border-viking-gold/60"
                            : "text-viking-stone hover:text-viking-gold"
                        }`}
                      >
                        <Star size={12} className={r.featured ? "fill-viking-gold mr-1" : "mr-1"} />
                        {r.featured ? "Featured" : "Nosta"}
                      </Button>
                      {r.enabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy === r.user_id}
                          onClick={() => disable(r.user_id)}
                          data-testid={`merchant-card-disable-${r.user_id}`}
                          className="border-viking-edge text-viking-stone hover:text-viking-ember"
                        >
                          <Power size={12} className="mr-1" />
                          Pois
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy === r.user_id}
                          onClick={() => enable(r.user_id)}
                          data-testid={`merchant-card-enable-${r.user_id}`}
                          className="bg-viking-gold text-viking-shadow hover:bg-viking-gold/90"
                        >
                          <Power size={12} className="mr-1" />
                          Aktivoi 12 kk
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
