import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Download, ImageUp, Play, ScanSearch, Square } from "lucide-react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import type { CollectionStatus } from "../engine/types/dataset.types";
import { api } from "./api";
import { useCategories } from "./categories";

const formatNumber = new Intl.NumberFormat("en").format;

type ControlBarProps = {
  collection: CollectionStatus | undefined;
  photoCounts: Map<string, number>;
  selectedCategory: string;
  canDownload: boolean;
  onUploadClick: () => void;
};

export function ControlBar({
  collection,
  photoCounts,
  selectedCategory,
  canDownload,
  onUploadClick,
}: ControlBarProps) {
  const { categories, categoryColor } = useCategories();
  const queryClient = useQueryClient();
  const engineOnline = Boolean(collection);
  const isCollecting = collection?.running ?? false;
  const totalChecked = collection?.jobs.reduce((sum, job) => sum + job.checked, 0) ?? 0;
  const totalAdded = collection?.jobs.reduce((sum, job) => sum + job.added, 0) ?? 0;

  const toggleCollecting = useMutation({
    mutationFn: () => (isCollecting ? api.stopCollecting() : api.startCollecting()),
    onSuccess: (status) => queryClient.setQueryData(["collection"], status),
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-white/90 p-1 shadow-[0_20px_50px_-18px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl">
        <button
          onClick={() => toggleCollecting.mutate()}
          disabled={!engineOnline || toggleCollecting.isPending}
          title={isCollecting ? "Stop" : "Collect"}
          aria-label={isCollecting ? "Stop" : "Collect"}
          className="bg-ink relative grid size-10 place-items-center rounded-full text-white transition hover:bg-black disabled:opacity-30"
        >
          {isCollecting && (
            <span className="bg-ink/25 absolute inset-0 animate-ping rounded-full" />
          )}
          {isCollecting ? (
            <Square className="size-3.5 fill-current" />
          ) : (
            <Play className="size-4 translate-x-px fill-current" />
          )}
        </button>

        <div className="flex items-center gap-3 px-3">
          {categories.map(({ id, label }, _, all) => {
            const largestCount = Math.max(
              1,
              ...all.map((category) => photoCounts.get(category.id) ?? 0)
            );
            const count = photoCounts.get(id) ?? 0;
            const isRunning =
              collection?.jobs.find((job) => job.categoryId === id)?.state === "running";
            return (
              <div
                key={id}
                title={`${label} ${formatNumber(count)}`}
                className="flex items-center gap-2"
              >
                <span
                  className={`size-2 rounded-full ${isRunning ? "animate-pulse" : ""}`}
                  style={{ background: categoryColor(id) }}
                />
                <span className="hidden h-1 w-12 overflow-hidden rounded-full bg-black/[0.06] sm:block">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${(count / largestCount) * 100}%`,
                      background: categoryColor(id),
                    }}
                  />
                </span>
                <span className="text-ink-2 text-[11.5px] tabular-nums">{formatNumber(count)}</span>
              </div>
            );
          })}
        </div>

        {isCollecting && (
          <div className="text-ink-2 hidden items-center gap-3 border-l border-black/[0.06] px-3 text-[11.5px] tabular-nums md:flex">
            <span className="flex items-center gap-1.5" title="Checked">
              <ScanSearch className="size-3.5" />
              {formatNumber(totalChecked)}
            </span>
            <span className="flex items-center gap-1.5" title="Added">
              <CircleCheck className="size-3.5 text-emerald-500" />
              {formatNumber(totalAdded)}
            </span>
          </div>
        )}

        <span className="mx-0.5 h-6 w-px bg-black/[0.08]" />
        <BarButton label="Upload" onClick={onUploadClick} disabled={!engineOnline}>
          <ImageUp className="size-4" />
        </BarButton>
        <BarButton
          label="Download"
          href={api.downloadLink(selectedCategory)}
          disabled={!engineOnline || !canDownload}
        >
          <Download className="size-4" />
        </BarButton>
      </div>
    </div>
  );
}

type BarButtonProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: ReactNode;
};

function BarButton({ label, onClick, href, disabled, children }: BarButtonProps) {
  const className = `grid size-9 place-items-center rounded-full text-ink transition hover:bg-black/[0.05] ${disabled ? "pointer-events-none opacity-30" : ""}`;

  if (href) {
    return (
      <a href={disabled ? undefined : href} title={label} aria-label={label} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={className}
    >
      {children}
    </button>
  );
}
