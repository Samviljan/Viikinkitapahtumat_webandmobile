/**
 * /guide — renders the public user guide.
 *
 * Loads /docs/USER_GUIDE.md (a static asset built into /public) and renders it
 * with react-markdown + remark-gfm so the same source file can be:
 *   - read directly on GitHub
 *   - downloaded as a .zip
 *   - rendered in-app with the viking theme below.
 *
 * Image paths in the markdown use ./screenshots/*.jpeg which resolve to
 * /docs/screenshots/* once we rewrite via remark-stringify on the fly.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const GUIDE_URL = "/docs/USER_GUIDE.md";
const ZIP_URL = "/docs/viking-events-user-guide.zip";

export default function UserGuide() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(GUIDE_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(setContent)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16" data-testid="user-guide-page">
      {/* Header / download CTA */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <div className="text-overline mb-2">Help · Documentation</div>
          <h1 className="font-serif text-4xl lg:text-5xl text-viking-bone leading-tight">
            User Guide
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <a
            href={ZIP_URL}
            download="viking-events-user-guide.zip"
            data-testid="guide-download-zip"
          >
            <Button
              type="button"
              className="bg-viking-ember hover:bg-viking-ember/90 text-viking-bone w-full sm:w-auto h-11 px-5 rounded-sm font-rune text-xs uppercase tracking-wider"
            >
              <Download className="w-4 h-4 mr-2" />
              Download .zip
            </Button>
          </a>
          <a
            href={GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="guide-open-md"
          >
            <Button
              type="button"
              variant="outline"
              className="border-viking-gold/50 text-viking-gold hover:bg-viking-gold/10 w-full sm:w-auto h-11 px-5 rounded-sm font-rune text-xs uppercase tracking-wider"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open .md
            </Button>
          </a>
        </div>
      </div>

      {error ? (
        <div className="carved-card rounded-sm p-8 text-viking-ember">
          Could not load guide ({error}).
        </div>
      ) : !content ? (
        <div className="text-viking-stone font-rune text-xs tracking-widest">…</div>
      ) : (
        <article className="user-guide-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => {
                const href = props.href || "";
                if (href.startsWith("#") || href.startsWith("/")) {
                  return <Link to={href} {...props} />;
                }
                return <a target="_blank" rel="noopener noreferrer" {...props} />;
              },
              img: ({ node, src = "", ...props }) => (
                <img
                  src={src.startsWith("./") ? `/docs/${src.slice(2)}` : src}
                  loading="lazy"
                  className="rounded-sm border border-viking-edge my-6"
                  {...props}
                />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      )}

      {/* Bottom CTA */}
      <div className="mt-16 pt-8 border-t border-viking-edge text-center text-xs text-viking-stone">
        Need more help? Email{" "}
        <a
          href="mailto:admin@viikinkitapahtumat.fi"
          className="text-viking-gold hover:underline"
        >
          admin@viikinkitapahtumat.fi
        </a>
      </div>
    </div>
  );
}
