"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  FolderIcon,
  Maximize2Icon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { useFiles } from "@/components/assistant-ui/files-context";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_INLINE_PREVIEW = 220;
const COPY_FEEDBACK_DURATION_MS = 2000;

const markdownComponents: Components = {
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "aui-files-preview-link font-medium text-primary underline underline-offset-4",
        className,
      )}
      {...props}
    />
  ),
  img: ({ className, src, alt, node, ...props }) => {
    void node;
    if (typeof src !== "string" || src.trim().length === 0) {
      return null;
    }

    return (
      <img
        alt={alt ?? ""}
        src={src}
        className={cn("aui-files-preview-image my-4", className)}
        {...props}
      />
    );
  },
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-files-preview-blockquote border-l-2 pl-4 text-muted-foreground/80 italic",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    return (
      <code
        className={cn(
          "aui-files-preview-code-block block w-full overflow-x-auto text-xs leading-6",
          className,
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-files-preview-ol my-4 ml-6 list-decimal [&>li]:mt-2",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "aui-files-preview-paragraph my-4 leading-6 text-foreground/90 first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "aui-files-preview-pre rounded-xl bg-muted/40 p-4 text-xs leading-6 break-words whitespace-pre-wrap text-foreground/90 shadow-inner",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="aui-files-preview-table-wrapper my-4 overflow-x-auto rounded-xl border border-border/60">
      <table
        className={cn(
          "aui-files-preview-table w-full border-collapse text-sm",
          className,
        )}
        {...props}
      />
    </div>
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-files-preview-td border-t border-border/50 px-4 py-2 align-top",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-files-preview-th border-b border-border/60 bg-muted/60 px-4 py-2 text-left font-semibold",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "aui-files-preview-ul my-4 ml-6 list-disc [&>li]:mt-2",
        className,
      )}
      {...props}
    />
  ),
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
};

export const FilesSidebar = () => {
  const { files } = useFiles();
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setIsCopied(false);
  }, [previewFile]);

  const fileEntries = useMemo(() => Object.entries(files).sort(), [files]);

  const handleCopy = () => {
    if (!previewFile || isCopied || !navigator.clipboard) return;

    navigator.clipboard
      .writeText(previewFile.content)
      .then(() => {
        setIsCopied(true);
        copyTimeoutRef.current = window.setTimeout(() => {
          setIsCopied(false);
          copyTimeoutRef.current = null;
        }, COPY_FEEDBACK_DURATION_MS);
      })
      .catch(() => {
        setIsCopied(false);
      });
  };

  if (fileEntries.length === 0) {
    return null;
  }

  return (
    <aside className="aui-files-sidebar hidden h-full w-72 shrink-0 border-l border-border/50 bg-gradient-to-b from-muted/20 via-background/40 to-muted/30 p-4 text-sm shadow-inner backdrop-blur lg:sticky lg:top-0 lg:flex lg:flex-col lg:overflow-y-auto xl:w-80">
      <header className="aui-files-sidebar-header sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
        <span className="flex items-center gap-2">
          <FolderIcon className="size-4 text-muted-foreground" /> Files
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground/90">
          {fileEntries.length}
        </span>
      </header>
      <div className="aui-files-sidebar-list space-y-2 overflow-y-auto pr-1">
        {fileEntries.map(([name, content]) => {
          return (
            <article
              key={name}
              className={cn(
                "aui-files-sidebar-item group rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm transition hover:border-border/40",
              )}
            >
              <button
                type="button"
                className="aui-files-sidebar-trigger flex w-full flex-col gap-2 text-left"
                onClick={() => setPreviewFile({ name, content })}
                aria-label={`Open ${name}`}
              >
                <header className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-foreground">
                    <FileTextIcon className="size-4 text-muted-foreground" />
                    <span className="truncate text-sm font-medium" title={name}>
                      {name}
                    </span>
                  </div>
                  <span
                    className="aui-files-sidebar-open inline-flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground transition group-hover:border-border/40 group-hover:text-foreground"
                    aria-hidden
                  >
                    <Maximize2Icon className="size-4" />
                  </span>
                </header>
                <div className="aui-files-sidebar-preview text-xs leading-5 text-muted-foreground">
                  <p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground/80">
                    {truncate(content, MAX_INLINE_PREVIEW)}
                  </p>
                </div>
              </button>
            </article>
          );
        })}
      </div>
      <Dialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
          }
        }}
      >
        <DialogContent className="aui-files-preview-dialog max-w-4xl gap-4 overflow-hidden p-0">
          {previewFile ? (
            <>
              <DialogHeader className="flex flex-row items-start justify-between gap-3 px-6 pt-6 pb-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileTextIcon className="size-4 text-muted-foreground" />
                  <span className="truncate" title={previewFile.name}>
                    {previewFile.name}
                  </span>
                </DialogTitle>
                <TooltipIconButton
                  tooltip={isCopied ? "Copied" : "Copy"}
                  aria-label={isCopied ? "File copied" : "Copy file contents"}
                  onClick={handleCopy}
                  className={cn(
                    "aui-files-preview-copy mr-4 size-8 rounded-full border border-border/60 text-muted-foreground transition",
                    "hover:border-border/40 hover:text-foreground",
                    "focus-visible:ring-1 focus-visible:ring-primary/60",
                  )}
                >
                  {isCopied ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </TooltipIconButton>
              </DialogHeader>
              <div className="aui-files-preview-dialog-body m-2 max-h-[70vh] overflow-y-auto rounded-sm border-1 px-6 py-6">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {previewFile.content}
                </ReactMarkdown>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </aside>
  );
};
