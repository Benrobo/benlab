import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, LoaderCircle, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import type { Category } from "../config";
import { api } from "./api";
import { useCategories } from "./categories";
import { Sheet, SheetButton } from "./sheet";

const formatNumber = new Intl.NumberFormat("en").format;

type CategorySheetProps = { photoCounts: Map<string, number>; onClose: () => void };

export function CategorySheet({ photoCounts, onClose }: CategorySheetProps) {
  const { allCategories } = useCategories();
  const [isAdding, setIsAdding] = useState(false);

  const activeCategories = allCategories.filter(({ archived }) => !archived);
  const archivedCategories = allCategories.filter(({ archived }) => archived);

  if (isAdding) return <AddCategory onBack={() => setIsAdding(false)} onClose={onClose} />;

  return (
    <Sheet
      title="Categories"
      subtitle="Add new kinds of packaging waste, or archive ones you no longer collect"
      onClose={onClose}
    >
      <div className="space-y-5 px-5 pb-5">
        <CategoryList categories={activeCategories} photoCounts={photoCounts} />
        {archivedCategories.length > 0 && (
          <div className="space-y-2">
            <span className="text-ink-3 text-[11.5px] font-semibold tracking-wide uppercase">
              Archived
            </span>
            <CategoryList categories={archivedCategories} photoCounts={photoCounts} />
          </div>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-black/[0.05] px-5 py-3.5">
        <SheetButton onClick={onClose}>Done</SheetButton>
        <SheetButton onClick={() => setIsAdding(true)} primary>
          <Plus className="size-4" />
          New category
        </SheetButton>
      </footer>
    </Sheet>
  );
}

type CategoryListProps = { categories: Category[]; photoCounts: Map<string, number> };

function CategoryList({ categories, photoCounts }: CategoryListProps) {
  const { categoryColor } = useCategories();
  return (
    <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-2xl ring-1 ring-black/[0.05]">
      {categories.map((category) => (
        <li
          key={category.id}
          className={`flex items-center gap-3 bg-white px-3.5 py-3 ${category.archived ? "opacity-60" : ""}`}
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: categoryColor(category.id) }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-ink text-[13px] font-medium">{category.label}</p>
            <p className="text-ink-3 truncate text-[12px]">{category.description}</p>
          </div>
          <span className="text-ink-2 shrink-0 text-[12px] tabular-nums">
            {formatNumber(photoCounts.get(category.id) ?? 0)}
          </span>
          <ArchiveButton category={category} />
        </li>
      ))}
    </ul>
  );
}

function ArchiveButton({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const archive = useMutation({
    mutationFn: () => api.setCategoryArchived(category.id, !category.archived),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(saved.archived ? `Archived ${saved.label}` : `Restored ${saved.label}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <button
      onClick={() => archive.mutate()}
      disabled={archive.isPending}
      className="text-ink-2 hover:text-ink flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-[12px] font-medium transition hover:bg-black/[0.08] disabled:opacity-40"
    >
      {category.archived ? (
        <ArchiveRestore className="size-3.5" />
      ) : (
        <Archive className="size-3.5" />
      )}
      {category.archived ? "Restore" : "Archive"}
    </button>
  );
}

function AddCategory({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
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
      onBack();
    },
    onError: (error) => toast.error(error.message),
  });

  const canSave = label.trim().length > 1 && description.trim().length > 4;

  return (
    <Sheet
      title="New category"
      subtitle="A new kind of packaging waste to collect"
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
        <Field
          label="Search terms"
          hint="Optional, separated by commas. Agents use these to search"
        >
          <input
            value={searchTerms}
            onChange={(event) => setSearchTerms(event.target.value)}
            placeholder="empty soft drink can, crushed can litter"
            className={inputClassName}
          />
        </Field>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-black/[0.05] px-5 py-3.5">
        <SheetButton onClick={onBack} disabled={addCategory.isPending}>
          Back
        </SheetButton>
        <SheetButton
          onClick={() => addCategory.mutate()}
          disabled={!canSave || addCategory.isPending}
          primary
        >
          {addCategory.isPending && <LoaderCircle className="size-4 animate-spin" />}
          Add category
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
