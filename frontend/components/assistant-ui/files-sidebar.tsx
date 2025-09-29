"use client";

import { useMemo, useState } from "react";
import { FileTextIcon, FolderIcon, Maximize2Icon } from "lucide-react";

import { useFiles } from "@/components/assistant-ui/files-context";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_INLINE_PREVIEW = 220;

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

  const fileEntries = useMemo(() => Object.entries(files).sort(), [files]);

  if (fileEntries.length === 0) {
    return null;
  }

  return (
    <aside className="aui-files-sidebar hidden h-full w-72 shrink-0 border-l border-border/50 bg-gradient-to-b from-muted/20 via-background/40 to-muted/30 p-4 text-sm shadow-inner backdrop-blur lg:flex lg:flex-col lg:sticky lg:top-0 lg:overflow-y-auto xl:w-80">
      <header className="aui-files-sidebar-header sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
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
        <DialogContent className="aui-files-preview-dialog max-w-4xl gap-4 p-0 overflow-hidden">
          {previewFile ? (
            <>
              <DialogHeader className="px-6 pb-0 pt-6">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileTextIcon className="size-4 text-muted-foreground" />
                  <span className="truncate" title={previewFile.name}>
                    {previewFile.name}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="aui-files-preview-dialog-body max-h-[70vh] overflow-y-auto px-6 pb-6">
                <pre className="whitespace-pre-wrap break-words rounded-2xl bg-muted/40 p-4 text-xs leading-6 text-foreground/90 shadow-inner">
                  {previewFile.content}
                </pre>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </aside>
  );
};
