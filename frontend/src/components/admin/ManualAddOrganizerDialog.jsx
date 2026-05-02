/**
 * Admin-only dialog to manually register an existing user as an approved
 * event organizer, bypassing the self-service request form. Useful when
 * admin is onboarding a known organizer who doesn't have app experience.
 *
 * Flow:
 *  1. Admin picks an approved event (searchable select — title).
 *  2. Admin picks an existing user (searchable select — email/nickname).
 *  3. Admin enters the official name, contact email, and phone.
 *  4. POST /admin/event-organizers → creates a synthetic approved request
 *     and adds user_id to events.organizer_user_ids.
 *
 * Server enforces max 3 organizers / event and dedupe.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ManualAddOrganizerDialog({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [evQ, setEvQ] = useState("");
  const [userQ, setUserQ] = useState("");
  const [selectedEv, setSelectedEv] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      api.get("/events?status=approved"),
      api.get("/admin/users"),
    ])
      .then(([evRes, usrRes]) => {
        setEvents(Array.isArray(evRes.data) ? evRes.data : []);
        setUsers(Array.isArray(usrRes.data) ? usrRes.data : []);
      })
      .catch(() => {
        toast.error("Latauksessa virhe");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filteredEvents = useMemo(() => {
    const q = evQ.trim().toLowerCase();
    if (!q) return events.slice(0, 20);
    return events
      .filter((e) => {
        const t =
          (e.title_fi || "") + " " + (e.title_en || "") + " " + (e.location || "");
        return t.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [events, evQ]);

  const filteredUsers = useMemo(() => {
    const q = userQ.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users
      .filter((u) => {
        const t = (u.email || "") + " " + (u.nickname || "") + " " + (u.name || "");
        return t.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [users, userQ]);

  const onPickUser = (u) => {
    setSelectedUser(u);
    setForm((f) => ({
      full_name: f.full_name || u.name || u.nickname || "",
      email: f.email || u.email || "",
      phone: f.phone,
    }));
  };

  const reset = () => {
    setEvQ("");
    setUserQ("");
    setSelectedEv(null);
    setSelectedUser(null);
    setForm({ full_name: "", email: "", phone: "" });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEv) {
      toast.error("Valitse tapahtuma");
      return;
    }
    if (!selectedUser) {
      toast.error("Valitse käyttäjä");
      return;
    }
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Nimi ja sähköposti ovat pakollisia");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/admin/event-organizers", {
        user_id: selectedUser.id,
        event_id: selectedEv.id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Järjestäjä lisätty tapahtumaan");
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Lisäys epäonnistui");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="manual-add-organizer-btn"
          className="gap-2"
        >
          <Plus size={14} />
          Lisää järjestäjä manuaalisesti
        </Button>
      </DialogTrigger>
      <DialogContent
        className="bg-viking-shadow border-viking-edge text-viking-bone max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="manual-add-organizer-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-viking-gold font-serif">
            Lisää järjestäjä tapahtumaan
          </DialogTitle>
          <DialogDescription className="text-viking-stone text-xs">
            Käytä tätä ohittaaksesi käyttäjän itsepalvelupyyntö. Käyttäjän
            pitää olla jo rekisteröitynyt sivustolle. Enintään 3 järjestäjää /
            tapahtuma.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-viking-stone">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Event picker */}
            <div className="space-y-1">
              <Label className="text-xs">Tapahtuma *</Label>
              {selectedEv ? (
                <div className="flex items-center justify-between gap-2 border border-viking-gold/50 bg-viking-gold/10 rounded-sm p-2">
                  <div className="text-sm">
                    <span className="font-serif text-viking-bone">
                      {selectedEv.title_fi || selectedEv.title_en}
                    </span>
                    {selectedEv.start_date && (
                      <span className="text-[11px] text-viking-stone ml-2">
                        {selectedEv.start_date}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEv(null)}
                    className="text-xs text-viking-stone hover:text-viking-bone"
                  >
                    Vaihda
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2 top-2.5 text-viking-stone"
                    />
                    <Input
                      placeholder="Etsi tapahtumaa…"
                      value={evQ}
                      onChange={(e) => setEvQ(e.target.value)}
                      data-testid="event-search"
                      className="bg-viking-shadow/60 border-viking-edge pl-7"
                    />
                  </div>
                  <ul className="max-h-40 overflow-y-auto border border-viking-edge rounded-sm mt-1 divide-y divide-viking-edge/60">
                    {filteredEvents.length === 0 ? (
                      <li className="p-2 text-xs text-viking-stone">
                        Ei osumia.
                      </li>
                    ) : (
                      filteredEvents.map((ev) => (
                        <li key={ev.id}>
                          <button
                            type="button"
                            data-testid={`ev-pick-${ev.id}`}
                            onClick={() => setSelectedEv(ev)}
                            className="w-full text-left p-2 text-xs hover:bg-viking-gold/10"
                          >
                            <span className="font-serif text-viking-bone">
                              {ev.title_fi || ev.title_en || ev.id}
                            </span>
                            {ev.start_date && (
                              <span className="text-viking-stone ml-2">
                                {ev.start_date}
                              </span>
                            )}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>

            {/* User picker */}
            <div className="space-y-1">
              <Label className="text-xs">Käyttäjä *</Label>
              {selectedUser ? (
                <div className="flex items-center justify-between gap-2 border border-viking-gold/50 bg-viking-gold/10 rounded-sm p-2">
                  <div className="text-sm">
                    <span className="font-serif text-viking-bone">
                      {selectedUser.nickname || selectedUser.name || selectedUser.email}
                    </span>
                    <span className="text-[11px] text-viking-stone ml-2">
                      {selectedUser.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setForm({ full_name: "", email: "", phone: "" });
                    }}
                    className="text-xs text-viking-stone hover:text-viking-bone"
                  >
                    Vaihda
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2 top-2.5 text-viking-stone"
                    />
                    <Input
                      placeholder="Etsi sähköpostilla tai nimellä…"
                      value={userQ}
                      onChange={(e) => setUserQ(e.target.value)}
                      data-testid="user-search"
                      className="bg-viking-shadow/60 border-viking-edge pl-7"
                    />
                  </div>
                  <ul className="max-h-40 overflow-y-auto border border-viking-edge rounded-sm mt-1 divide-y divide-viking-edge/60">
                    {filteredUsers.length === 0 ? (
                      <li className="p-2 text-xs text-viking-stone">
                        Ei osumia.
                      </li>
                    ) : (
                      filteredUsers.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            data-testid={`user-pick-${u.id}`}
                            onClick={() => onPickUser(u)}
                            className="w-full text-left p-2 text-xs hover:bg-viking-gold/10"
                          >
                            <span className="font-serif text-viking-bone">
                              {u.nickname || u.name || u.email}
                            </span>
                            <span className="text-viking-stone ml-2">
                              {u.email}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>

            {/* Contact fields */}
            <div className="space-y-1">
              <Label className="text-xs">Virallinen nimi *</Label>
              <Input
                data-testid="manual-form-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="bg-viking-shadow/60 border-viking-edge"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Yhteyssähköposti *</Label>
              <Input
                type="email"
                data-testid="manual-form-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="bg-viking-shadow/60 border-viking-edge"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Puhelin (valinnainen)</Label>
              <Input
                type="tel"
                data-testid="manual-form-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-viking-shadow/60 border-viking-edge"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Peruuta
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !selectedEv || !selectedUser}
                data-testid="manual-form-submit"
                className="gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Lisää järjestäjäksi
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
