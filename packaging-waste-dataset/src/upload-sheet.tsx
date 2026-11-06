import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Focus, ImageUp, LoaderCircle, Plus, Recycle, UserX, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { categories, uploadLimit } from "../config";
import { api, categoryColor, categoryLabel, rejectionMessage } from "./data";

type UploadStatus = "ready" | "too-large" | "checking" | "accepted" | "rejected";

type Upload = {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  message?: string;
};

type Step = "choose" | "review" | "checking" | "finished";

const maxMegabytes = uploadLimit.bytes / 1024 / 1024;

const photoTips = [
  { icon: Camera, text: "Casual phone photo" },
  { icon: Recycle, text: "Empty or thrown away" },
  { icon: UserX, text: "No people in the shot" },
  { icon: Focus, text: "One kind of item" },
];

function createUpload(file: File): Upload {
  const isTooLarge = file.size > uploadLimit.bytes;
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: isTooLarge ? "too-large" : "ready",
    message: isTooLarge ? rejectionMessage("too-large") : undefined,
  };
}

const onlyImages = (files: File[]) => files.filter((file) => file.type.startsWith("image/"));

type UploadSheetProps = { initialFiles: File[]; onClose: () => void };

export function UploadSheet({ initialFiles, onClose }: UploadSheetProps) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>(() =>
    onlyImages(initialFiles).slice(0, uploadLimit.files).map(createUpload)
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const readyUploads = uploads.filter((upload) => upload.status === "ready");
  const acceptedCount = uploads.filter((upload) => upload.status === "accepted").length;
  const step: Step = !uploads.length
    ? "choose"
    : isFinished
      ? "finished"
      : isChecking
        ? "checking"
        : "review";

  const addFiles = (files: File[]) => {
    if (step !== "choose" && step !== "review") return;
    const freeSlots = uploadLimit.files - uploads.length;
    setUploads((current) => [
      ...current,
      ...onlyImages(files).slice(0, freeSlots).map(createUpload),
    ]);
  };

  const removeUpload = (id: string) => {
    setUploads((current) =>
      current.filter((upload) => {
        if (upload.id === id) URL.revokeObjectURL(upload.previewUrl);
        return upload.id !== id;
      })
    );
  };

  const startOver = () => {
    for (const upload of uploads) URL.revokeObjectURL(upload.previewUrl);
    setUploads([]);
    setIsChecking(false);
    setIsFinished(false);
  };

  const close = () => {
    if (isChecking) return;
    for (const upload of uploads) URL.revokeObjectURL(upload.previewUrl);
    onClose();
  };

  const checkUploads = async () => {
    const checkingIds = readyUploads.map((upload) => upload.id);
    setIsChecking(true);
    setUploads((current) =>
      current.map((upload) =>
        checkingIds.includes(upload.id) ? { ...upload, status: "checking" } : upload
      )
    );

    const results = await api
      .uploadPhotos(readyUploads.map((upload) => upload.file))
      .catch(() => null);

    setUploads((current) =>
      current.map((upload) => {
        const index = checkingIds.indexOf(upload.id);
        if (index < 0) return upload;
        const result = results?.[index];
        if (!result) return { ...upload, status: "rejected", message: "The engine didn't respond" };
        return result.accepted
          ? {
              ...upload,
              status: "accepted",
              message: `Added to ${categoryLabel(result.category ?? "")}`,
            }
          : { ...upload, status: "rejected", message: rejectionMessage(result.reason) };
      })
    );
    setIsChecking(false);
    setIsFinished(true);
    queryClient.invalidateQueries({ queryKey: ["photos"] });
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    addFiles([...event.dataTransfer.files]);
  };

  const subtitle = {
    choose: `Up to ${uploadLimit.files} photos, ${maxMegabytes} MB each`,
    review: `${readyUploads.length} ready to check`,
    checking: "Checking your photos",
    finished: `${acceptedCount} of ${uploads.length} added`,
  }[step];

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />

      <motion.section
        role="dialog"
        aria-label="Add photos"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-[28px] bg-white shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.35)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 40 }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-black/10" />

        <header className="flex items-start justify-between gap-4 px-5 pt-3 pb-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Add photos</h2>
            <p className="text-ink-2 mt-0.5 text-[12.5px] tabular-nums">{subtitle}</p>
          </div>
          <button
            onClick={close}
            disabled={isChecking}
            aria-label="Close"
            title="Close"
            className="text-ink-2 hover:text-ink grid size-8 place-items-center rounded-full bg-black/[0.04] transition hover:bg-black/[0.08] disabled:opacity-30"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="px-5">
          {step === "choose" && <ChooseStep onBrowse={() => fileInput.current?.click()} />}

          {(step === "review" || step === "checking") && (
            <div className="grid grid-cols-5 gap-2 pb-5">
              {uploads.map((upload) => (
                <UploadThumbnail
                  key={upload.id}
                  upload={upload}
                  onRemove={step === "review" ? () => removeUpload(upload.id) : undefined}
                />
              ))}
              {step === "review" && uploads.length < uploadLimit.files && (
                <button
                  onClick={() => fileInput.current?.click()}
                  aria-label="Add more"
                  title="Add more"
                  className="text-ink-3 hover:border-ink/25 hover:text-ink grid aspect-square place-items-center rounded-xl border-2 border-dashed border-black/10 transition"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
          )}

          {step === "finished" && (
            <ul className="space-y-1 pb-4">
              {uploads.map((upload) => (
                <UploadResultRow key={upload.id} upload={upload} />
              ))}
            </ul>
          )}
        </div>

        {step !== "choose" && (
          <footer className="flex items-center justify-end gap-2 border-t border-black/[0.05] px-5 py-3.5">
            {step === "finished" ? (
              <>
                <SheetButton onClick={startOver}>Add more</SheetButton>
                <SheetButton onClick={close} primary>
                  Done
                </SheetButton>
              </>
            ) : (
              <>
                <SheetButton onClick={startOver} disabled={isChecking}>
                  Clear
                </SheetButton>
                <SheetButton
                  onClick={checkUploads}
                  disabled={isChecking || !readyUploads.length}
                  primary
                >
                  {isChecking && <LoaderCircle className="size-4 animate-spin" />}
                  {isChecking
                    ? "Checking"
                    : `Check ${readyUploads.length} ${readyUploads.length === 1 ? "photo" : "photos"}`}
                </SheetButton>
              </>
            )}
          </footer>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </motion.section>
    </>
  );
}

function ChooseStep({ onBrowse }: { onBrowse: () => void }) {
  return (
    <>
      <button
        onClick={onBrowse}
        className="bg-canvas/70 hover:border-ink/25 hover:bg-canvas flex w-full flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed border-black/10 px-6 py-7 transition"
      >
        <span className="bg-ink grid size-11 place-items-center rounded-full text-white">
          <ImageUp className="size-5" />
        </span>
        <span className="text-[14px] font-medium">Drop photos or browse</span>
        <span className="text-ink-3 text-[12px]">JPG, PNG or WebP</span>
      </button>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {categories.map(({ id, label }) => (
          <span
            key={id}
            className="text-ink-2 flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium"
          >
            <span className="size-1.5 rounded-full" style={{ background: categoryColor(id) }} />
            {label}
          </span>
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 pb-5">
        {photoTips.map(({ icon: Icon, text }) => (
          <li key={text} className="text-ink-2 flex items-center gap-2 text-[12.5px]">
            <Icon className="text-ink-3 size-3.5 shrink-0" />
            {text}
          </li>
        ))}
      </ul>
    </>
  );
}

function UploadThumbnail({ upload, onRemove }: { upload: Upload; onRemove?: () => void }) {
  return (
    <div className="bg-canvas relative aspect-square overflow-hidden rounded-xl">
      <img
        src={upload.previewUrl}
        alt=""
        className={`size-full object-cover ${upload.status === "too-large" ? "opacity-40 grayscale" : ""}`}
      />
      {upload.status === "checking" && (
        <div className="absolute inset-0 grid place-items-center bg-white/40 backdrop-blur-[1px]">
          <LoaderCircle className="text-ink size-5 animate-spin" />
        </div>
      )}
      {upload.status === "too-large" && (
        <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-rose-500 px-1 py-0.5 text-center text-[10px] font-medium text-white">
          Over {maxMegabytes} MB
        </span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          title="Remove"
          className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

function UploadResultRow({ upload }: { upload: Upload }) {
  const isAccepted = upload.status === "accepted";
  return (
    <li className="flex items-center gap-3 rounded-2xl p-1.5">
      <img src={upload.previewUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{upload.file.name}</p>
        <p className={`truncate text-[12px] ${isAccepted ? "text-emerald-600" : "text-rose-500"}`}>
          {upload.message}
        </p>
      </div>
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className={`grid size-6 shrink-0 place-items-center rounded-full text-white ${isAccepted ? "bg-emerald-500" : "bg-rose-500"}`}
      >
        {isAccepted ? (
          <Check className="size-3.5" strokeWidth={2.5} />
        ) : (
          <X className="size-3.5" strokeWidth={2.5} />
        )}
      </motion.span>
    </li>
  );
}

type SheetButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
};

function SheetButton({ onClick, disabled, primary, children }: SheetButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "bg-ink flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
          : "text-ink-2 hover:text-ink h-10 rounded-full px-4 text-[13px] font-medium transition hover:bg-black/[0.04] disabled:opacity-30"
      }
    >
      {children}
    </button>
  );
}
