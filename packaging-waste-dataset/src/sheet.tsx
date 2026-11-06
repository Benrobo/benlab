import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, type DragEvent, type ReactNode } from "react";

type SheetProps = {
  title: string;
  subtitle: ReactNode;
  onClose: () => void;
  canClose?: boolean;
  onDrop?: (event: DragEvent) => void;
  children: ReactNode;
};

export function Sheet({ title, subtitle, onClose, canClose = true, onDrop, children }: SheetProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.section
        role="dialog"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.35)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 40 }}
        onDragOver={onDrop && ((event) => event.preventDefault())}
        onDrop={onDrop}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-black/10" />

        <header className="flex items-start justify-between gap-4 px-5 pt-3 pb-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="text-ink-2 mt-0.5 text-[12.5px] tabular-nums">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={!canClose}
            aria-label="Close"
            title="Close"
            className="text-ink-2 hover:text-ink grid size-8 place-items-center rounded-full bg-black/[0.04] transition hover:bg-black/[0.08] disabled:opacity-30"
          >
            <X className="size-4" />
          </button>
        </header>

        {children}
      </motion.section>
    </>
  );
}

type SheetButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
};

export function SheetButton({ onClick, disabled, primary, children }: SheetButtonProps) {
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
