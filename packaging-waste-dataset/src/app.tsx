import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ImageUp, Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ControlBar } from "./control-bar";
import { api } from "./api";
import { CategorySheet } from "./category-sheet";
import { ConnectSheet } from "./connect-sheet";
import { useCategories } from "./categories";
import { DropOverlay, useFileDrop } from "./file-drop";
import { PhotoGrid } from "./photo-grid";
import { PhotoViewer } from "./photo-viewer";
import { UploadSheet } from "./upload-sheet";

const formatNumber = new Intl.NumberFormat("en").format;

export function App() {
  const { categories, categoryColor, goal } = useCategories();
  const queryClient = useQueryClient();
  const photosQuery = useQuery({
    queryKey: ["photos"],
    queryFn: api.getPhotos,
    refetchInterval: 3000,
  });
  const collectionQuery = useQuery({
    queryKey: ["collection"],
    queryFn: api.getCollection,
    refetchInterval: 1500,
    retry: false,
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [uploadSheet, setUploadSheet] = useState<{ id: number; files: File[] } | null>(null);

  const engineOnline = collectionQuery.isSuccess;
  const openUploadSheet = useCallback(
    (files: File[] = []) => setUploadSheet({ id: Date.now(), files }),
    []
  );
  const isDraggingFiles = useFileDrop(openUploadSheet, engineOnline && !uploadSheet);

  const removePhoto = useMutation({
    mutationFn: api.removePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      toast.success("Removed");
    },
    onError: (error) => toast.error(error.message),
  });

  const photos = photosQuery.data ?? [];
  const photoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const photo of photos) counts.set(photo.category, (counts.get(photo.category) ?? 0) + 1);
    return counts;
  }, [photos]);
  const visiblePhotos = useMemo(
    () =>
      photos.filter((photo) => selectedCategory === "all" || photo.category === selectedCategory),
    [photos, selectedCategory]
  );
  const handleRemove = engineOnline ? (id: string) => removePhoto.mutate(id) : undefined;

  const tabs = [
    { id: "all", label: "All", count: photos.length },
    ...categories.map(({ id, label }) => ({ id, label, count: photoCounts.get(id) ?? 0 })),
  ];

  return (
    <>
      <header className="bg-canvas/80 sticky top-0 z-10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-[14px] font-semibold tracking-tight">
              Packaging waste dataset
            </span>
          </div>

          <nav className="order-last flex w-full gap-0.5 overflow-x-auto rounded-full bg-black/[0.04] p-[3px] md:order-none md:mx-auto md:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap transition ${selectedCategory === tab.id ? "text-ink bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-ink-2 hover:text-ink"}`}
              >
                {tab.id !== "all" && (
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: categoryColor(tab.id) }}
                  />
                )}
                {tab.label}
                <span className="text-ink-3 text-[11.5px] tabular-nums">
                  {formatNumber(tab.count)}
                </span>
              </button>
            ))}
            <button
              onClick={() => setIsCategorySheetOpen(true)}
              aria-label="Add a category"
              title="Add a category"
              className="bg-ink ml-1 grid size-7 shrink-0 place-items-center rounded-full text-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition hover:bg-black"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </button>
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div
              className="flex items-center gap-2"
              title={`${formatNumber(photos.length)} of ${formatNumber(goal)}`}
            >
              <ProgressRing progress={photos.length / goal} />
              <span className="text-ink-2 text-[12.5px] tabular-nums">
                <span className="text-ink font-semibold">{formatNumber(photos.length)}</span> /{" "}
                {formatNumber(goal)}
              </span>
            </div>
            <button
              onClick={() => setIsConnectOpen(true)}
              aria-label="Connect an AI agent"
              title="Connect an AI agent"
              className="text-ink-2 hover:text-ink grid size-8 place-items-center rounded-full bg-black/[0.04] transition hover:bg-black/[0.08]"
            >
              <Bot className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pt-1 pb-28 sm:px-6">
        {photosQuery.isPending ? null : visiblePhotos.length ? (
          <PhotoGrid photos={visiblePhotos} onOpen={setOpenPhotoId} onRemove={handleRemove} />
        ) : (
          <div className="grid min-h-[60dvh] place-items-center">
            <div className="text-ink-3 grid size-16 place-items-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
              <ImageUp className="size-6" />
            </div>
          </div>
        )}
      </main>

      <ControlBar
        collection={collectionQuery.data}
        photoCounts={photoCounts}
        selectedCategory={selectedCategory}
        canDownload={visiblePhotos.length > 0}
        onUploadClick={() => openUploadSheet()}
      />

      <AnimatePresence>
        {uploadSheet && (
          <UploadSheet
            key={uploadSheet.id}
            initialFiles={uploadSheet.files}
            onClose={() => setUploadSheet(null)}
          />
        )}
        {isConnectOpen && <ConnectSheet key="connect" onClose={() => setIsConnectOpen(false)} />}
        {isCategorySheetOpen && (
          <CategorySheet key="category" onClose={() => setIsCategorySheetOpen(false)} />
        )}
      </AnimatePresence>

      <PhotoViewer
        photos={visiblePhotos}
        openPhotoId={openPhotoId}
        onOpen={setOpenPhotoId}
        onRemove={handleRemove}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 13,
            color: "#1c1c1a",
            background: "#fff",
            boxShadow: "0 12px 32px -12px rgba(0,0,0,0.3)",
            border: "1px solid rgba(0,0,0,0.05)",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#f43f5e", secondary: "#fff" } },
        }}
      />

      {isDraggingFiles && <DropOverlay />}
    </>
  );
}

function Logo() {
  const { categories, categoryColor } = useCategories();
  return (
    <span className="bg-ink grid size-7 place-items-center rounded-[9px]">
      <span className="flex h-3 items-end gap-[3px]">
        {categories.slice(0, 3).map(({ id }, index) => (
          <span
            key={id}
            className="w-[3px] rounded-full"
            style={{ background: categoryColor(id), height: `${55 + index * 22}%` }}
          />
        ))}
      </span>
    </span>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  const circumference = 2 * Math.PI * 9;
  return (
    <svg viewBox="0 0 24 24" className="size-5 -rotate-90">
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="stroke-black/[0.07]" />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-ink transition-[stroke-dashoffset] duration-700"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, progress))}
      />
    </svg>
  );
}
