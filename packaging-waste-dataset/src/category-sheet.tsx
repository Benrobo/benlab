import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { api } from "./api";
import { Sheet, SheetButton } from "./sheet";

export function CategorySheet({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerms, setSearchTerms] = useState("");

  const addCategory = useMutation({
    mutationFn: () =>
      api.addCategory({
        label,
        description,
        subjects: searchTerms.split(",").map((term) => term.trim()),
      }),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Added ${category.label}`);
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const canSave = label.trim().length > 1 && description.trim().length > 4;

  return (
    <Sheet
      title="Add a category"
      subtitle="New kinds of packaging waste to collect"
      onClose={onClose}
      canClose={!addCategory.isPending}
    >
      <div className="space-y-4 px-5 pb-5">
        <Field label="Name">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Soft drink cans"
            className={inputClassName}
            autoFocus
          />
        </Field>
        <Field label="What counts" hint="People and AI agents label photos by this">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="an aluminium soft drink or beer can"
            rows={2}
            className={`${inputClassName} h-auto resize-none py-2.5`}
          />
        </Field>
        <Field label="Search terms" hint="Optional, separated by commas">
          <input
            value={searchTerms}
            onChange={(event) => setSearchTerms(event.target.value)}
            placeholder="empty soft drink can, crushed can litter"
            className={inputClassName}
          />
        </Field>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-black/[0.05] px-5 py-3.5">
        <SheetButton onClick={onClose} disabled={addCategory.isPending}>
          Cancel
        </SheetButton>
        <SheetButton
          onClick={() => addCategory.mutate()}
          disabled={!canSave || addCategory.isPending}
          primary
        >
          {addCategory.isPending && <LoaderCircle className="size-4 animate-spin" />}
          Add
        </SheetButton>
      </footer>
    </Sheet>
  );
}

const inputClassName =
  "text-ink placeholder:text-ink-3 mt-1 h-10 w-full rounded-xl bg-black/[0.04] px-3 text-[13px] outline-none focus:bg-black/[0.06]";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-ink-2 text-[12px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-ink-3 mt-1 block text-[11.5px]">{hint}</span>}
    </label>
  );
}
