import React, { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, ExternalLink, Hammer, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

const EMPTY = { name: "", description: "", url: "", category: "gear", order_index: 0 };

export default function AdminMerchantsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | EMPTY | merchant
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/merchants");
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
        await api.put(`/admin/merchants/${form.id}`, form);
      } else {
        await api.post("/admin/merchants", form);
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

  async function remove(m) {
    if (!window.confirm(`${t("admin.confirm_delete_simple")} "${m.name}"?`)) return;
    try {
      await api.delete(`/admin/merchants/${m.id}`);
      toast.success(t("admin.action_ok"));
      reload();
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  const gear = items.filter((m) => m.category === "gear");
  const smiths = items.filter((m) => m.category === "smith");

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="admin-merchants-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <ShoppingBag size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone">{t("admin.merchants_title")}</h3>
            <p className="text-sm text-viking-stone mt-1">{t("admin.merchants_sub")}</p>
          </div>
        </div>
        <Button
          data-testid="merchant-add-btn"
          onClick={() => setEditing({ ...EMPTY })}
          className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px]"
        >
          <Plus size={12} className="mr-2" />
          {t("admin.add_merchant")}
        </Button>
      </div>

      <Section title={t("shops.gear_title")} icon={<ShoppingBag size={14} className="text-viking-gold" />}>
        {gear.map((m) => (
          <Row key={m.id} item={m} onEdit={() => setEditing(m)} onDelete={() => remove(m)} kind="merchant" />
        ))}
      </Section>

      <Section title={t("shops.smiths_title")} icon={<Hammer size={14} className="text-viking-ember" />}>
        {smiths.map((m) => (
          <Row key={m.id} item={m} onEdit={() => setEditing(m)} onDelete={() => remove(m)} kind="merchant" />
        ))}
      </Section>

      {editing && (
        <MerchantDialog
          item={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
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

export function Row({ item, onEdit, onDelete, kind }) {
  return (
    <div
      data-testid={`${kind}-row-${item.id}`}
      className="bg-viking-surface2/40 border border-viking-edge rounded-sm p-3 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="font-serif text-base text-viking-bone truncate">{item.name}</div>
        {(item.description || item.region) && (
          <div className="text-xs text-viking-stone mt-0.5 truncate">{item.description || item.region}</div>
        )}
      </div>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-viking-gold hover:text-viking-bone"
        >
          <ExternalLink size={14} />
        </a>
      )}
      <Button
        size="sm"
        variant="outline"
        data-testid={`${kind}-edit-${item.id}`}
        onClick={onEdit}
        className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm h-8 w-8 p-0"
      >
        <Pencil size={12} />
      </Button>
      <Button
        size="sm"
        variant="outline"
        data-testid={`${kind}-delete-${item.id}`}
        onClick={onDelete}
        className="border-viking-edge text-viking-ember hover:bg-viking-ember hover:text-viking-bone rounded-sm h-8 w-8 p-0"
      >
        <Trash2 size={12} />
      </Button>
    </div>
  );
}

function MerchantDialog({ item, busy, onCancel, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState(item);
  const update = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: typeof e === "string" ? e : e.target.value }));
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        data-testid="merchant-dialog"
        className="bg-viking-surface border-viking-edge text-viking-bone max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {form.id ? t("admin.edit_merchant") : t("admin.add_merchant")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {form.id ? t("admin.edit_merchant") : t("admin.add_merchant")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-overline">{t("admin.field_name")} *</Label>
            <Input data-testid="merchant-field-name" value={form.name} onChange={update("name")} className={fieldClass} />
          </div>
          <div>
            <Label className="text-overline">{t("admin.field_description")}</Label>
            <Textarea
              data-testid="merchant-field-desc"
              rows={2}
              value={form.description || ""}
              onChange={update("description")}
              className={fieldClass}
            />
          </div>
          <div>
            <Label className="text-overline">{t("admin.field_url")}</Label>
            <Input data-testid="merchant-field-url" value={form.url || ""} onChange={update("url")} className={fieldClass} placeholder="https://" />
          </div>
          <div>
            <Label className="text-overline">{t("admin.field_category")} *</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger data-testid="merchant-field-cat" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-viking-surface border-viking-edge text-viking-bone">
                <SelectItem value="gear">{t("shops.gear_title")}</SelectItem>
                <SelectItem value="smith">{t("shops.smiths_title")}</SelectItem>
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
            data-testid="merchant-save-btn"
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs ember-glow"
          >
            {busy ? "..." : t("admin.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
