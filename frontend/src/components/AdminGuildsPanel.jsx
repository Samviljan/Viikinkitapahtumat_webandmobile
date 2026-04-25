import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Crown } from "lucide-react";
import { toast } from "sonner";
import { Row } from "@/components/AdminMerchantsPanel";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

const EMPTY = { name: "", region: "", url: "", category: "other", order_index: 0 };

export default function AdminGuildsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/guilds");
      setItems(data || []);
    } catch {
      toast.error(t("admin.action_error"));
    }
  }, [t]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function save(form) {
    setBusy(true);
    try {
      if (form.id) {
        await api.put(`/admin/guilds/${form.id}`, form);
      } else {
        await api.post("/admin/guilds", form);
      }
      toast.success(t("admin.action_ok"));
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || t("admin.action_error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(g) {
    if (!window.confirm(`${t("admin.confirm_delete_simple")} "${g.name}"?`)) return;
    try {
      await api.delete(`/admin/guilds/${g.id}`);
      toast.success(t("admin.action_ok"));
      reload();
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  const svtl = items.filter((g) => g.category === "svtl_member");
  const others = items.filter((g) => g.category === "other");

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="admin-guilds-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <Users size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone">{t("admin.guilds_title")}</h3>
            <p className="text-sm text-viking-stone mt-1">{t("admin.guilds_sub")}</p>
          </div>
        </div>
        <Button
          data-testid="guild-add-btn"
          onClick={() => setEditing({ ...EMPTY })}
          className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px]"
        >
          <Plus size={12} className="mr-2" />
          {t("admin.add_guild")}
        </Button>
      </div>

      <Section title={t("guilds.members_title")} icon={<Crown size={14} className="text-viking-gold" />}>
        {svtl.map((g) => (
          <Row key={g.id} item={g} onEdit={() => setEditing(g)} onDelete={() => remove(g)} kind="guild" />
        ))}
      </Section>

      <Section title={t("guilds.others_title")} icon={<Users size={14} className="text-viking-stone" />}>
        {others.map((g) => (
          <Row key={g.id} item={g} onEdit={() => setEditing(g)} onDelete={() => remove(g)} kind="guild" />
        ))}
      </Section>

      {editing && (
        <GuildDialog item={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 text-overline mb-3">
        {icon}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function GuildDialog({ item, busy, onCancel, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState(item);
  const update = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: typeof e === "string" ? e : e.target.value }));
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        data-testid="guild-dialog"
        className="bg-viking-surface border-viking-edge text-viking-bone max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {form.id ? t("admin.edit_guild") : t("admin.add_guild")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {form.id ? t("admin.edit_guild") : t("admin.add_guild")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-overline">{t("admin.field_name")} *</Label>
            <Input data-testid="guild-field-name" value={form.name} onChange={update("name")} className={fieldClass} />
          </div>
          <div>
            <Label className="text-overline">{t("admin.field_region")}</Label>
            <Input data-testid="guild-field-region" value={form.region || ""} onChange={update("region")} className={fieldClass} />
          </div>
          <div>
            <Label className="text-overline">{t("admin.field_url")}</Label>
            <Input data-testid="guild-field-url" value={form.url || ""} onChange={update("url")} className={fieldClass} placeholder="https://" />
          </div>
          <div>
            <Label className="text-overline">{t("admin.field_category")} *</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger data-testid="guild-field-cat" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-viking-surface border-viking-edge text-viking-bone">
                <SelectItem value="svtl_member">{t("guilds.members_title")}</SelectItem>
                <SelectItem value="other">{t("guilds.others_title")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-viking-edge text-viking-bone rounded-sm font-rune text-xs"
          >
            {t("admin.cancel")}
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={busy || !form.name}
            data-testid="guild-save-btn"
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs ember-glow"
          >
            {busy ? "..." : t("admin.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
