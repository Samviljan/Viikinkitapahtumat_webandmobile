import React, { useRef, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

/**
 * ImageUploadField — combined URL field + local file picker. Posts the file
 * to /api/uploads/events and stores the returned absolute URL (built from
 * REACT_APP_BACKEND_URL) into the parent form state via `onChange`.
 *
 * Props:
 *   value      string  current image URL (or "")
 *   onChange   (url:string) => void
 *   testIdPrefix string  e.g. "edit-image" or "field-image"
 *   placeholder optional override
 */
export default function ImageUploadField({
  value,
  onChange,
  testIdPrefix = "image",
  placeholder = "https://",
}) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const backend = process.env.REACT_APP_BACKEND_URL || "";

  // Resolve a stored relative URL ("/api/uploads/...") to an absolute URL for
  // the <img> preview. External URLs are returned as-is.
  const previewSrc = value
    ? value.startsWith("http")
      ? value
      : `${backend}${value}`
    : "";

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast.error(t("upload.too_large"));
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads/events", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // store relative URL — frontend resolves it against REACT_APP_BACKEND_URL
      onChange(data.url);
      toast.success(t("upload.success"));
    } catch (err) {
      toast.error(
        formatApiErrorDetail(err.response?.data?.detail) || t("upload.error")
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-stretch">
        <Input
          data-testid={`${testIdPrefix}-url`}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} flex-1`}
          placeholder={placeholder}
        />
        <Button
          type="button"
          data-testid={`${testIdPrefix}-upload-btn`}
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px] flex-shrink-0"
        >
          <Upload size={12} className="mr-1.5" />
          {busy ? "..." : t("upload.choose")}
        </Button>
        <input
          ref={fileRef}
          data-testid={`${testIdPrefix}-file-input`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onPickFile}
        />
      </div>
      {previewSrc && (
        <div className="flex items-center gap-3" data-testid={`${testIdPrefix}-preview`}>
          <img
            src={previewSrc}
            alt=""
            className="h-16 w-24 object-cover rounded-sm border border-viking-edge"
            onError={(e) => {
              e.currentTarget.style.opacity = "0.3";
            }}
          />
          <button
            type="button"
            data-testid={`${testIdPrefix}-clear`}
            onClick={() => onChange("")}
            className="font-rune text-[10px] tracking-[0.2em] text-viking-stone hover:text-viking-ember uppercase inline-flex items-center gap-1"
          >
            <X size={11} />
            {t("upload.clear")}
          </button>
        </div>
      )}
    </div>
  );
}
