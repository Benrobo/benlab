import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ImageUp } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { api } from "./api";
import { CategorySheet } from "./category-sheet";
import { ConnectSheet } from "./connect-sheet";
import { useCategories } from "./categories";
import { DropOverlay, useFileDrop } from "./file-drop";
import { CategoryBar, Header, Hero } from "./page-header";
import { PhotoGrid } from "./photo-grid";
import { PhotoViewer } from "./photo-viewer";
import { UploadSheet } from "./upload-sheet";

export function App() {
  const { categories } = useCategories();
  const queryClient = useQueryClient();
  const photosQuery = useQuery({
    queryKey: ["photos"],
    queryFn: api.getPhotos,
    refetchInterval: 3000,
  });

  const [chosenCategory, setSelectedCategory] = useState("all");
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [uploadSheet, setUploadSheet] = useState<{ id: number; files: File[] } | null>(null);

  const selectedCategory = categories.some(({ id }) => id === chosenCategory)
    ? chosenCategory
    : "all";
  const engineOnline = photosQuery.isSuccess;
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
  const visiblePhotos = useMemo(() => {
    const shownCategories = new Set(categories.map(({ id }) => id));
    return photos.filter((photo) =>
      selectedCategory === "all"
        ? shownCategories.has(photo.category)
        : photo.category === selectedCategory
    );
  }, [photos, categories, selectedCategory]);
  const handleRemove = engineOnline ? (id: string) => removePhoto.mutate(id) : undefined;

  return (
    <>
      <Header
        canUpload={engineOnline}
        onUpload={() => openUploadSheet()}
        onConnect={() => setIsConnectOpen(true)}
      />
      <Hero
        photoCount={photos.length}
        canUpload={engineOnline}
        onUpload={() => openUploadSheet()}
        onConnect={() => setIsConnectOpen(true)}
      />
      <CategoryBar
        selectedCategory={selectedCategory}
        photoCounts={photoCounts}
        canDownload={visiblePhotos.length > 0}
        onSelect={setSelectedCategory}
        onManageCategories={() => setIsCategorySheetOpen(true)}
      />

      <main className="mx-auto max-w-[1600px] px-4 pt-2 pb-16 sm:px-6">
        {photosQuery.isPending ? null : visiblePhotos.length ? (
          <PhotoGrid photos={visiblePhotos} onOpen={setOpenPhotoId} onRemove={handleRemove} />
        ) : (
          <EmptyState onUpload={() => openUploadSheet()} onConnect={() => setIsConnectOpen(true)} />
        )}
      </main>

      <AnimatePresence>
        {uploadSheet && (
          <UploadSheet
            key={uploadSheet.id}
            initialFiles={uploadSheet.files}
            initialCategory={selectedCategory === "all" ? "" : selectedCategory}
            onClose={() => setUploadSheet(null)}
          />
        )}
        {isConnectOpen && <ConnectSheet key="connect" onClose={() => setIsConnectOpen(false)} />}
        {isCategorySheetOpen && (
          <CategorySheet
            key="category"
            photoCounts={photoCounts}
            onClose={() => setIsCategorySheetOpen(false)}
          />
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

function EmptyState({ onUpload, onConnect }: { onUpload: () => void; onConnect: () => void }) {
  return (
    <div className="grid min-h-[40dvh] place-items-center rounded-3xl border-2 border-dashed border-black/[0.07]">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-ink-3 grid size-12 place-items-center rounded-2xl bg-white ring-1 ring-black/[0.05]">
          <ImageUp className="size-5" />
        </span>
        <p className="text-[14px] font-medium">No photos here yet</p>
        <div className="flex gap-2">
          <button
            onClick={onUpload}
            className="bg-ink flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white transition hover:bg-black"
          >
            <ImageUp className="size-4" />
            Upload photos
          </button>
          <button
            onClick={onConnect}
            className="text-ink flex h-9 items-center gap-2 rounded-full bg-black/[0.05] px-4 text-[13px] font-medium transition hover:bg-black/[0.09]"
          >
            <Bot className="size-4" />
            Connect agent
          </button>
        </div>
      </div>
    </div>
  );
}
