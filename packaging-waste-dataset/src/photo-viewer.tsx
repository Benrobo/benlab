import { ChevronLeft, ChevronRight, ExternalLink, Trash2, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import type { PhotoWithUrl } from "../engine/types/dataset.types";
import { useCategories } from "./categories";

type PhotoViewerProps = {
  photos: PhotoWithUrl[];
  openPhotoId: string | null;
  onOpen: (id: string | null) => void;
  onRemove?: (id: string) => void;
};

const domainOf = (url: string) => URL.parse(url)?.hostname.replace(/^www\./, "") ?? url;

export function PhotoViewer({ photos, openPhotoId, onOpen, onRemove }: PhotoViewerProps) {
  const { categoryLabel } = useCategories();
  const index = photos.findIndex((photo) => photo.id === openPhotoId);
  const photo = photos[index];

  const showNeighbour = (step: number) => {
    const neighbour = photos[index + step];
    if (neighbour) onOpen(neighbour.id);
  };

  useEffect(() => {
    if (!openPhotoId) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpen(null);
      if (event.key === "ArrowRight") showNeighbour(1);
      if (event.key === "ArrowLeft") showNeighbour(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!photo) return null;

  const sourceLink = photo.page ?? (photo.source === "upload" ? null : photo.url);

  const removeAndMoveOn = () => {
    if (photos.length === 1) onOpen(null);
    else showNeighbour(photos[index + 1] ? 1 : -1);
    onRemove?.(photo.id);
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md sm:p-10"
      onClick={() => onOpen(null)}
    >
      <figure
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-canvas flex min-h-0 flex-1 items-center justify-center">
          <img
            src={photo.imageUrl}
            alt={categoryLabel(photo.category)}
            className="max-h-[72dvh] w-auto object-contain"
          />
        </div>

        <figcaption className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{categoryLabel(photo.category)}</p>
            {sourceLink ? (
              <a
                href={sourceLink}
                target="_blank"
                rel="noreferrer"
                className="text-ink-2 hover:text-ink flex items-center gap-1 truncate text-[13px]"
              >
                {domainOf(sourceLink)}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-ink-2 text-[13px]">Uploaded</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-ink-3 mr-1 text-[13px] tabular-nums">
              {index + 1} / {photos.length}
            </span>
            <RoundButton label="Previous" onClick={() => showNeighbour(-1)} disabled={index === 0}>
              <ChevronLeft className="size-4" />
            </RoundButton>
            <RoundButton
              label="Next"
              onClick={() => showNeighbour(1)}
              disabled={index === photos.length - 1}
            >
              <ChevronRight className="size-4" />
            </RoundButton>
            {onRemove && (
              <RoundButton label="Remove" onClick={removeAndMoveOn} danger>
                <Trash2 className="size-4" />
              </RoundButton>
            )}
            <RoundButton label="Close" onClick={() => onOpen(null)}>
              <X className="size-4" />
            </RoundButton>
          </div>
        </figcaption>
      </figure>
    </div>
  );
}

type RoundButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
};

function RoundButton({ label, onClick, disabled, danger, children }: RoundButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid size-10 place-items-center rounded-full bg-black/[0.05] transition disabled:opacity-30 ${danger ? "hover:bg-rose-500 hover:text-white" : "hover:bg-black/[0.09]"}`}
    >
      {children}
    </button>
  );
}
