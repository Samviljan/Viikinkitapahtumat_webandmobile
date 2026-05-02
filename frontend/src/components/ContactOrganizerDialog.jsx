/**
 * Public "Ask the organizer" dialog — visitor types a message that is
 * routed server-side to the organizer's real email (never exposed on
 * the public event page). Used by EventOrganizers clickable names.
 */
import React, { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactOrganizerDialog({
  open,
  onOpenChange,
  eventId,
  organizerUserId,
  organizerName,
}) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    from_name: user?.name || user?.nickname || "",
    from_email: user?.email || "",
    subject: "",
    body: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = {
      from_name: form.from_name.trim(),
      from_email: form.from_email.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
    };
    if (
      !trimmed.from_name ||
      !trimmed.from_email ||
      !trimmed.subject ||
      !trimmed.body
    ) {
      toast.error("Täytä kaikki kentät");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        `/events/${eventId}/organizers/${organizerUserId}/contact`,
        trimmed,
      );
      toast.success("Viesti lähetetty järjestäjälle");
      setForm({ ...form, subject: "", body: "" });
      onOpenChange?.(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Lähetys epäonnistui");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-viking-shadow border-viking-edge text-viking-bone max-w-md"
        data-testid="contact-organizer-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-viking-gold font-serif">
            Lähetä viesti järjestäjälle
          </DialogTitle>
          <DialogDescription className="text-viking-stone text-xs">
            Viesti toimitetaan <strong>{organizerName}</strong>:lle sähköpostitse.
            Sähköpostisi näkyy vastaanottajalle vain jotta hän voi vastata
            sinulle suoraan — osoitetta ei tallenneta julkisesti.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="contact-name" className="text-xs">
              Nimesi *
            </Label>
            <Input
              id="contact-name"
              data-testid="contact-name"
              value={form.from_name}
              onChange={(e) => setForm({ ...form, from_name: e.target.value })}
              required
              className="bg-viking-shadow/60 border-viking-edge"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact-email" className="text-xs">
              Sähköpostisi (vastausta varten) *
            </Label>
            <Input
              id="contact-email"
              type="email"
              data-testid="contact-email"
              value={form.from_email}
              onChange={(e) => setForm({ ...form, from_email: e.target.value })}
              required
              className="bg-viking-shadow/60 border-viking-edge"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact-subject" className="text-xs">
              Aihe *
            </Label>
            <Input
              id="contact-subject"
              data-testid="contact-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              maxLength={200}
              required
              className="bg-viking-shadow/60 border-viking-edge"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact-body" className="text-xs">
              Viesti *
            </Label>
            <Textarea
              id="contact-body"
              data-testid="contact-body"
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              maxLength={4000}
              required
              className="bg-viking-shadow/60 border-viking-edge"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting}
            >
              Peruuta
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              data-testid="contact-submit"
              className="gap-2"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Lähetä viesti
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
