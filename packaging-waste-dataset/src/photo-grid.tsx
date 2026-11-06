import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { PhotoWithUrl } from "../engine/types/dataset.types";
import { categoryColor, categoryLabel } from "./data";

const tileSize = 170;
const gap = 8;

type PhotoGridProps = {
  photos: PhotoWithUrl[];
  onOpen: (id: string) => void;
  onRemove?: (id: string) => void;
};

export function PhotoGrid({ photos, onOpen, onRemove }: PhotoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [gridTop, setGridTop] = useState(0);

  const columns = Math.max(2, Math.floor((gridWidth + gap) / (tileSize + gap)));
  const columnWidth = (gridWidth - gap * (columns - 1)) / columns;

  const rows = useWindowVirtualizer({
    count: Math.ceil(photos.length / columns),
    estimateSize: () => columnWidth + gap,
    overscan: 3,
    scrollMargin: gridTop,
  });

  useLayoutEffect(() => {
    const grid = gridRef.current!;
    const observer = new ResizeObserver(() => setGridWidth(grid.clientWidth));
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setGridTop(gridRef.current!.offsetTop);
  });

  useLayoutEffect(() => {
    rows.measure();
  }, [rows, columnWidth]);

  return (
    <div ref={gridRef} className="relative" style={{ height: rows.getTotalSize() }}>
      {gridWidth > 0 &&
        rows.getVirtualItems().map((row) => (
          <div
            key={row.key}
            className="absolute inset-x-0 top-0 grid"
            style={{
              transform: `translateY(${row.start - gridTop}px)`,
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap,
            }}
          >
            {photos.slice(row.index * columns, (row.index + 1) * columns).map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                height={columnWidth}
                onOpen={() => onOpen(photo.id)}
                onRemove={onRemove && (() => onRemove(photo.id))}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

type PhotoTileProps = {
  photo: PhotoWithUrl;
  height: number;
  onOpen: () => void;
  onRemove?: () => void;
};

function PhotoTile({ photo, height, onOpen, onRemove }: PhotoTileProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]"
      style={{ height }}
    >
      <button onClick={onOpen} className="size-full" aria-label={categoryLabel(photo.category)}>
        <img
          src={photo.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-2.5 opacity-0 transition duration-300 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-white">
          <span
            className="size-1.5 rounded-full"
            style={{ background: categoryColor(photo.category) }}
          />
          {categoryLabel(photo.category)}
        </span>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove"
          aria-label="Remove"
          className="text-ink absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-white/85 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:bg-rose-500 hover:text-white"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}
