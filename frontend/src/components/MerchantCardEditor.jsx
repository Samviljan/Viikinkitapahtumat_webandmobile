import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Save, ExternalLink, Store, Hammer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

const API = process.env.REACT_APP_BACKEND_URL || "";
const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

function imgSrc(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

function formatExpiry(iso, locale) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale || "fi-FI", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Owner-side editor for the user's `merchant_card` sub-document. Visible on
 * /profile only when admin has set `merchant_card.enabled=true`. The
 * subscription expiry (`merchant_until`) is read-only; admin renews it.
 */
export default function MerchantCardEditor() {
  const { user, refresh } = useAuth();
  const { t, lang } = useI18n();
  const card = user?.merchant_card || null;
  const enabled = !!(card && card.enabled);

  const [shopName, setShopName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("gear");
  const [imageUrl, setImageUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (card) {
      setShopName(card.shop_name || "");
      setWebsite(card.website || "");
      setPhone(card.phone || "");
      setEmail(card.email || "");
      setDescription(card.description || "");
      setCategory(card.category || "gear");
      setImageUrl(card.image_url || null);
    }
  }, [card]);

  if (!card) return null;

  const expiryStr = formatExpiry(card.merchant_until, lang === "fi" ? "fi-FI" : lang);

  if (!enabled) {
    return (
      <section
        data-testid="merchant-card-disabled"
        className="carved-card rounded-sm p-6"
      >
        <h2 className="font-serif text-xl text-viking-bone mb-2">
          {t("merchant_card.title")}
        </h2>
        <p className="text-sm text-viking-stone">{t("merchant_card.not_enabled")}</p>
      </section>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error(t("merchant_card.shop_name") + ": ?");
      return;
    }
    setSaving(true);
    try {
      await api.put("/users/me/merchant-card", {
        shop_name: shopName.trim(),
        website: website.trim(),
        phone: phone.trim(),
        email: email.trim(),
        description: description.trim().slice(0, 1000),
        category,
      });
      toast.success(t("merchant_card.saved"));
      await refresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || t("merchant_card.save_failed");
      toast.error(typeof msg === "string" ? msg : t("merchant_card.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const onImagePick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/users/me/merchant-card/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageUrl(data.url);
      await refresh();
      toast.success(t("merchant_card.saved"));
    } catch (err) {
      const msg = err?.response?.data?.detail || t("merchant_card.save_failed");
      toast.error(typeof msg === "string" ? msg : t("merchant_card.save_failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const charCount = description.length;
  const overLimit = charCount > 1000;

  return (
    <section data-testid="merchant-card-editor" className="carved-card rounded-sm p-6">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-serif text-xl text-viking-bone flex items-center gap-2">
            {category === "smith" ? <Hammer size={18} className="text-viking-ember" /> : <Store size={18} className="text-viking-gold" />}
            {t("merchant_card.title")}
          </h2>
          <p className="text-xs text-viking-stone mt-1">{t("merchant_card.subtitle")}</p>
          {expiryStr && (
            <p className="text-xs text-viking-gold/80 mt-2">
              {t("merchant_card.subscription_until")}: <strong>{expiryStr}</strong>
            </p>
          )}
        </div>
        {shopName && (
          <Link
            to={`/shops/${user.id}`}
            data-testid="merchant-card-preview-link"
            className="inline-flex items-center gap-1 text-xs text-viking-gold hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={12} /> {t("merchant_card.preview")}
          </Link>
        )}
      </header>

      <form onSubmit={submit} className="space-y-4">
        {/* Image */}
        <div>
          <Label className="text-viking-stone text-xs uppercase tracking-wider">
            {t("merchant_card.image")}
          </Label>
          <div className="mt-2 flex items-start gap-4">
            <div className="w-28 h-28 rounded-sm bg-viking-surface border border-viking-edge overflow-hidden flex-shrink-0">
              {imageUrl ? (
                <img src={imgSrc(imageUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-viking-stone">
                  <Camera size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImagePick(e.target.files?.[0])}
                data-testid="merchant-card-image-input"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                data-testid="merchant-card-image-upload-btn"
                className="border-viking-edge text-viking-bone hover:border-viking-gold/60"
              >
                <Camera size={14} className="mr-2" />
                {uploading ? "…" : t("merchant_card.image_upload")}
              </Button>
              <p className="text-[10px] text-viking-stone mt-2">{t("merchant_card.image_help")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="merchant-shop-name" className="text-viking-stone text-xs uppercase tracking-wider">
              {t("merchant_card.shop_name")} *
            </Label>
            <Input
              id="merchant-shop-name"
              data-testid="merchant-card-shop-name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={120}
              required
              className={`mt-1 ${fieldClass}`}
            />
          </div>
          <div>
            <Label htmlFor="merchant-category" className="text-viking-stone text-xs uppercase tracking-wider">
              {t("merchant_card.category")}
            </Label>
            <select
              id="merchant-category"
              data-testid="merchant-card-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`mt-1 w-full h-10 px-3 rounded-sm ${fieldClass}`}
            >
              <option value="gear">{t("merchant_card.category_gear")}</option>
              <option value="smith">{t("merchant_card.category_smith")}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="merchant-website" className="text-viking-stone text-xs uppercase tracking-wider">
              {t("merchant_card.website")}
            </Label>
            <Input
              id="merchant-website"
              data-testid="merchant-card-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              className={`mt-1 ${fieldClass}`}
            />
          </div>
          <div>
            <Label htmlFor="merchant-phone" className="text-viking-stone text-xs uppercase tracking-wider">
              {t("merchant_card.phone")}
            </Label>
            <Input
              id="merchant-phone"
              data-testid="merchant-card-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
          </div>
          <div>
            <Label htmlFor="merchant-email" className="text-viking-stone text-xs uppercase tracking-wider">
              {t("merchant_card.email")}
            </Label>
            <Input
              id="merchant-email"
              data-testid="merchant-card-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="merchant-description" className="text-viking-stone text-xs uppercase tracking-wider">
            {t("merchant_card.description")}
          </Label>
          <Textarea
            id="merchant-description"
            data-testid="merchant-card-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className={`mt-1 ${fieldClass}`}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-viking-stone">{t("merchant_card.description_help")}</span>
            <span className={`text-[10px] ${overLimit ? "text-viking-ember" : "text-viking-stone"}`}>
              {charCount} / 1000
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={saving || overLimit || !shopName.trim()}
            data-testid="merchant-card-save-btn"
            className="bg-viking-gold text-viking-shadow hover:bg-viking-gold/90 font-rune text-xs"
          >
            <Save size={14} className="mr-2" />
            {saving ? "…" : t("merchant_card.save")}
          </Button>
        </div>
      </form>
    </section>
  );
}
