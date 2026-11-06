import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, KeyRound, LoaderCircle, Pencil, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import type { Category } from "../config";
import { useHasAdminToken } from "./admin-token";
import { AdminTokenForm, tokenSubtitle, tokenTitle } from "./admin-token-modal";
import { api } from "./api";
import { useCategories } from "./categories";
import { Modal, ModalButton } from "./modal";

const formatNumber = new Intl.NumberFormat("en").format;

type CategoryModalProps = { photoCounts: Map<string, number>; onClose: () => void };

export function CategoryModal({ photoCounts, onClose }: CategoryModalProps) {
  const { allCategories } = useCategories();
  const isAdmin = useHasAdminToken();
  const [view, setView] = useState<"list" | "add" | "token" | Category>("list");
  const backToList = () => setView("list");

  const activeCategories = allCategories.filter(({ archived }) => !archived);
  const archivedCategories = allCategories.filter(({ archived }) => archived);

  return (
    <Modal
      title={
        view === "list"
          ? "Categories"
          : view === "add"
            ? "New category"
            : view === "token"
              ? tokenTitle
              : `Edit ${view.label}`
      }
      subtitle={
        view === "token"
          ? tokenSubtitle
          : view === "list"
            ? isAdmin
              ? "Add new kinds of packaging waste, edit them, or archive ones you no longer collect"
              : "The kinds of packaging waste in the dataset"
            : "Only kinds of packaging waste, described plainly"
      }
      onClose={onClose}
    >
      <AnimatePresence mode="wait" initial={false}>
        {view === "token" ? (
          <Slide key="token" direction={1}>
            <AdminTokenForm onDone={backToList} onCancel={backToList} />
          </Slide>
        ) : view !== "list" ? (
          <Slide key={view === "add" ? "add" : view.id} direction={1}>
            <CategoryForm category={view === "add" ? undefined : view} onBack={backToList} />
          </Slide>
        ) : (
          <Slide key="list" direction={-1}>
            <div className="space-y-5 px-5 pb-5">
              <CategoryList
                categories={activeCategories}
                photoCounts={photoCounts}
                onEdit={isAdmin ? setView : undefined}
              />
              {archivedCategories.length > 0 && (
                <div className="space-y-2">
                  <span className="text-ink-3 text-[11.5px] font-semibold tracking-wide uppercase">
                    Archived
                  </span>
                  <CategoryList
                    categories={archivedCategories}
                    photoCounts={photoCounts}
                    onEdit={isAdmin ? setView : undefined}
                  />
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-black/[0.05] px-5 py-3.5">
              <ModalButton onClick={onClose}>Done</ModalButton>
              {isAdmin ? (
                <ModalButton onClick={() => setView("add")} primary>
                  <Plus className="size-4" />
                  New category
                </ModalButton>
              ) : (
                <ModalButton onClick={() => setView("token")} primary>
                  <KeyRound className="size-4" />
                  Enter admin token
                </ModalButton>
              )}
            </footer>
          </Slide>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function Slide({ direction, children }: { direction: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 * direction }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 * direction }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

type CategoryListProps = {
  categories: Category[];
  photoCounts: Map<string, number>;
  onEdit?: (category: Category) => void;
};

function CategoryList({ categories, photoCounts, onEdit }: CategoryListProps) {
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
          {onEdit && (
            <button
              onClick={() => onEdit(category)}
              aria-label={`Edit ${category.label}`}
              title="Edit"
              className="text-ink-2 hover:text-ink grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.04] transition hover:bg-black/[0.08]"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {onEdit && <ArchiveButton category={category} />}
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

function CategoryForm({ category, onBack }: { category?: Category; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(category?.label ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [searchTerms, setSearchTerms] = useState(category?.subjects.join(", ") ?? "");

  const addCategory = useMutation({
    mutationFn: () => {
      const text = {
        label,
        description,
        subjects: searchTerms.split(",").map((term) => term.trim()),
      };
      return category ? api.editCategory(category.id, text) : api.addCategory(text);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(category ? `Saved ${saved.label}` : `Added ${saved.label}`);
      onBack();
    },
    onError: (error) => toast.error(error.message),
  });

  const canSave = label.trim().length > 1 && description.trim().length > 4;

  return (
    <>
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
        <ModalButton onClick={onBack} disabled={addCategory.isPending}>
          Back
        </ModalButton>
        <ModalButton
          onClick={() => addCategory.mutate()}
          disabled={!canSave || addCategory.isPending}
          primary
        >
          {addCategory.isPending && <LoaderCircle className="size-4 animate-spin" />}
          {category ? "Save" : "Add category"}
        </ModalButton>
      </footer>
    </>
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
