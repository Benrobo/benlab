import { ImageUp } from "lucide-react";
import { useEffect, useState } from "react";

export function useFileDrop(onDrop: (files: File[]) => void, enabled: boolean) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let dragDepth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files");

    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth++;
      setIsDragging(true);
    };
    const handleDragLeave = () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) setIsDragging(false);
    };
    const handleDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      setIsDragging(false);
      onDrop([...(event.dataTransfer?.files ?? [])]);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [enabled, onDrop]);

  return isDragging;
}

export function DropOverlay() {
  return (
    <div className="bg-canvas/70 pointer-events-none fixed inset-0 z-50 grid place-items-center p-6 backdrop-blur-sm">
      <div className="border-ink/20 grid size-full max-h-[520px] max-w-2xl place-items-center rounded-[32px] border-2 border-dashed bg-white/70">
        <div className="bg-ink grid size-16 place-items-center rounded-full text-white shadow-[0_20px_40px_-16px_rgba(0,0,0,0.5)]">
          <ImageUp className="size-7" />
        </div>
      </div>
    </div>
  );
}
