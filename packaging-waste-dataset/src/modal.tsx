import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type DragEvent, type ReactNode } from "react";

const desktopQuery = "(min-width: 640px)";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => matchMedia(desktopQuery).matches);
  useEffect(() => {
    const query = matchMedia(desktopQuery);
    const update = () => setIsDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

type ModalProps = {
  title: string;
  subtitle: ReactNode;
  onClose: () => void;
  canClose?: boolean;
  wide?: boolean;
  onDrop?: (event: DragEvent) => void;
  children: ReactNode;
};

export function Modal({
  title,
  subtitle,
  onClose,
  canClose = true,
  wide,
  onDrop,
  children,
}: ModalProps) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const hidden = isDesktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <motion.section
          role="dialog"
          aria-label={title}
          className={`pointer-events-auto max-h-[92dvh] w-full overflow-x-hidden overflow-y-auto rounded-t-[28px] bg-white shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.35)] sm:max-h-[86dvh] sm:rounded-[28px] sm:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.45)] ${wide ? "sm:max-w-xl" : "sm:max-w-lg"}`}
          initial={hidden}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={hidden}
          transition={
            isDesktop
              ? { duration: 0.18, ease: "easeOut" }
              : { type: "spring", stiffness: 420, damping: 40 }
          }
          onDragOver={onDrop && ((event) => event.preventDefault())}
          onDrop={onDrop}
        >
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-black/10 sm:hidden" />

          <header className="flex items-start justify-between gap-4 px-5 pt-3 pb-4 sm:px-6 sm:pt-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight sm:text-[17px]">{title}</h2>
              <p className="text-ink-2 mt-0.5 text-[12.5px] tabular-nums">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              disabled={!canClose}
              aria-label="Close"
              title="Close"
              className="text-ink-2 hover:text-ink grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.04] transition hover:bg-black/[0.08] disabled:opacity-30"
            >
              <X className="size-4" />
            </button>
          </header>

          {children}
        </motion.section>
      </div>
    </>
  );
}

type ModalButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
};

export function ModalButton({ onClick, disabled, primary, children }: ModalButtonProps) {
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
