/**
 * "Olen tapahtuman järjestäjä" -CTA — visible only to logged-in users
 * with organizer or admin role. Opens a modal form requesting
 * confirmation + name + contact info; submits to admin for approval.
 *
 * State machine (via /events/:id/organizer-requests/mine):
 *  - no request           → show "Pyydä järjestäjäksi" CTA
 *  - status=pending       → show "Pyyntö käsittelyssä" (disabled)
 *  - status=rejected      → show "Pyyntö hylätty — yritä uudelleen"
 *  - status=approved      → show "Olet hyväksytty järjestäjäksi"
 *  - already in event.organizer_user_ids → same as approved
 */
import React, { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function EventOrganizerRequestCTA({ eventId, organizerIds = [] }) {
  const { user } = useAuth();
  const [mine, setMine] = useState(undefined); // undefined=loading, null=none, obj=req
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", note: "" });

  const role = user?.role;
  const types = user?.user_types || [];
  const eligible =
    role === "admin" || types.includes("organizer");

  useEffect(() => {
    if (!user || !eligible) return;
    api
      .get(`/events/${eventId}/organizer-requests/mine`)
      .then((r) => setMine(r.data || null))
      .catch(() => setMine(null));
  }, [eventId, user, eligible]);

  if (!user || !eligible) return null;

  const isAlreadyOrganizer = organizerIds.includes(user.id);
  const status = isAlreadyOrganizer ? "approved" : mine?.status;

  const onOpen = () => {
    setForm({
      full_name: mine?.full_name || user?.name || user?.nickname || "",
      email: mine?.email || user?.email || "",
      phone: mine?.phone || "",
      note: mine?.note || "",
    });
    setConfirm(false);
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!confirm) {
      toast.error("Vahvista että olet aidosti tapahtuman järjestäjä");
      return;
    }
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Täytä nimi ja sähköposti");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post(`/events/${eventId}/organizer-requests`, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        note: form.note.trim(),
      });
      setMine(r.data);
      setOpen(false);
      toast.success("Pyyntö lähetetty — adminin hyväksyntä odottaa");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Pyynnön lähetys epäonnistui");
    } finally {
      setSubmitting(false);
    }
  };

  let label = "Pyydä järjestäjäksi";
  let disabled = false;
  let variant = "outline";
  if (status === "pending") {
    label = "Pyyntö käsittelyssä";
    disabled = true;
  } else if (status === "approved") {
    label = "Olet hyväksytty järjestäjä ✓";
    disabled = true;
    variant = "default";
  } else if (status === "rejected") {
    label = "Pyyntö hylätty — yritä uudelleen";
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={disabled || mine === undefined}
        onClick={onOpen}
        data-testid="organizer-request-cta"
        className="gap-2"
      >
        <ShieldCheck size={14} />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-viking-shadow border-viking-edge text-viking-bone max-w-md"
          data-testid="organizer-request-dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-viking-gold font-serif">
              Pyydä tapahtuman järjestäjäksi
            </DialogTitle>
            <DialogDescription className="text-viking-stone text-xs">
              Täytä yhteystietosi — admin tarkistaa ja hyväksyy pyynnön. Yhteen
              tapahtumaan voidaan hyväksyä enintään 3 järjestäjää.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="org-name" className="text-xs">
                Oikea nimi *
              </Label>
              <Input
                id="org-name"
                data-testid="organizer-form-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="bg-viking-shadow/60 border-viking-edge"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-email" className="text-xs">
                Yhteyssähköposti *
              </Label>
              <Input
                id="org-email"
                type="email"
                data-testid="organizer-form-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="bg-viking-shadow/60 border-viking-edge"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-phone" className="text-xs">
                Puhelin (valinnainen)
              </Label>
              <Input
                id="org-phone"
                type="tel"
                data-testid="organizer-form-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-viking-shadow/60 border-viking-edge"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-note" className="text-xs">
                Lisätiedot (valinnainen)
              </Label>
              <Textarea
                id="org-note"
                rows={3}
                data-testid="organizer-form-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Esim. roolisi tai tausta järjestäjänä"
                className="bg-viking-shadow/60 border-viking-edge text-sm"
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={confirm}
                onCheckedChange={(v) => setConfirm(!!v)}
                data-testid="organizer-form-confirm"
                className="mt-0.5"
              />
              <span className="text-xs text-viking-stone leading-snug">
                Vahvistan, että olen aidosti tämän tapahtuman järjestäjä ja
                edustan järjestäjätahoa virallisesti.
              </span>
            </label>

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
                disabled={submitting || !confirm}
                data-testid="organizer-form-submit"
                className="gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Lähetä pyyntö
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
