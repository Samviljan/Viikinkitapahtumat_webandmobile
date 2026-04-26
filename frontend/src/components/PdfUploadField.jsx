import React, { useRef, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUp, X, FileText } from "lucide-react";
import { toast } from "sonner";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

/**
 * PdfUploadField — file picker + URL field for an event programme PDF.
 * Mirrors ImageUploadField's UX. Posts the file to
 * /api/uploads/event-programs and stores the returned relative URL (e.g.
 * "/api/uploads/event-programs/<uuid>.pdf") via `onChange`.
 *
 * Props:
 *   value         string   current PDF URL (or "")
 *   onChange      (url:string) => void
 *   testIdPrefix  string   e.g. "submit-program" or "edit-program"
 */
export default function PdfUploadField({
  value,
  onChange,
  testIdPrefix = "program",
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const backend = process.env.REACT_APP_BACKEND_URL || "";

  const previewSrc = value
    ? value.startsWith("http")
      ? value
      : `${backend}${value}`
    : "";

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      (file.name || "").toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Vain PDF-tiedosto sallittu");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF-tiedosto liian suuri (max 10 MB)");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads/event-programs", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success("Ohjelma ladattu");
    } catch (err) {
      toast.error(
        formatApiErrorDetail(err.response?.data?.detail) || "Lataus epäonnistui"
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
          placeholder="https://… tai lataa PDF"
        />
        <Button
          type="button"
          data-testid={`${testIdPrefix}-upload-btn`}
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px] flex-shrink-0"
        >
          <FileUp size={12} className="mr-1.5" />
          {busy ? "..." : "PDF"}
        </Button>
        <input
          ref={fileRef}
          data-testid={`${testIdPrefix}-file-input`}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onPickFile}
        />
      </div>
      <p className="text-xs text-viking-stone">
        Vain PDF-tiedosto. Maksimikoko 10 MB.
      </p>
      {previewSrc && (
        <div
          className="flex items-center gap-3 text-sm"
          data-testid={`${testIdPrefix}-preview`}
        >
          <a
            href={previewSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-viking-gold hover:text-viking-bone underline-offset-4 hover:underline"
          >
            <FileText size={14} /> Avaa ladattu ohjelma
          </a>
          <button
            type="button"
            data-testid={`${testIdPrefix}-clear`}
            onClick={() => onChange("")}
            className="font-rune text-[10px] tracking-[0.2em] text-viking-stone hover:text-viking-ember uppercase inline-flex items-center gap-1"
          >
            <X size={11} /> Poista
          </button>
        </div>
      )}
    </div>
  );
}
