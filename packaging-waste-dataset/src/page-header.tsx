import { ArrowRight, Bot, Download, ImageUp, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "./api";
import { useCategories } from "./categories";
import { photoTips } from "./photo-tips";

const formatNumber = new Intl.NumberFormat("en").format;

type HeaderProps = { canUpload: boolean; onUpload: () => void; onConnect: () => void };

export function Header({ canUpload, onUpload, onConnect }: HeaderProps) {
  return (
    <header className="bg-canvas/85 sticky top-0 z-20 border-b border-black/[0.05] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Logo />
        <span className="text-[14px] font-semibold tracking-tight">Packaging waste dataset</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onConnect}
            className="text-ink flex h-9 items-center gap-2 rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium transition hover:bg-black/[0.09]"
          >
            <Bot className="size-4" />
            <span className="hidden sm:inline">Connect agent</span>
          </button>
          <button
            onClick={onUpload}
            disabled={!canUpload}
            className="bg-ink flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)] transition hover:bg-black disabled:opacity-40"
          >
            <ImageUp className="size-4" />
            Upload photos
          </button>
        </div>
      </div>
    </header>
  );
}

type HeroProps = {
  photoCount: number;
  canUpload: boolean;
  onUpload: () => void;
  onConnect: () => void;
};

export function Hero({ photoCount, canUpload, onUpload, onConnect }: HeroProps) {
  const { categories } = useCategories();
  return (
    <section className="mx-auto max-w-[1600px] px-4 pt-10 pb-8 sm:px-6 sm:pt-14">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div>
          <span className="text-ink-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Open dataset from Nigeria
          </span>
          <h1 className="mt-4 max-w-xl text-[34px] leading-[1.08] font-semibold tracking-tight sm:text-[44px]">
            Photos of everyday packaging waste
          </h1>
          <p className="text-ink-2 mt-4 max-w-lg text-[15px] leading-relaxed">
            Casual, labelled photos of things like water bottles, pure water sachets and food
            wrappers, collected for data annotation. Anyone can add to it.
          </p>
          <div className="mt-6 flex items-center gap-6">
            <Stat value={formatNumber(photoCount)} label="photos" />
            <span className="h-8 w-px bg-black/[0.08]" />
            <Stat value={formatNumber(categories.length)} label="categories" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            icon={<ImageUp className="size-5" />}
            title="Upload photos"
            text="Pick up to 5 photos from your phone or computer and choose what they show."
            onClick={onUpload}
            disabled={!canUpload}
            primary
          />
          <ActionCard
            icon={<Bot className="size-5" />}
            title="Connect your AI agent"
            text="Claude, ChatGPT and other agents can search the web and add photos for you."
            onClick={onConnect}
            badges={["/apps/claude.png", "/apps/chatgpt.svg"]}
          />
        </div>
      </div>

      <ul className="mt-8 flex flex-wrap gap-2">
        {photoTips.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="text-ink-2 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] ring-1 ring-black/[0.05]"
          >
            <Icon className="text-ink-3 size-3.5" />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}

type CategoryBarProps = {
  selectedCategory: string;
  photoCounts: Map<string, number>;
  canDownload: boolean;
  onSelect: (category: string) => void;
  onManageCategories: () => void;
};

export function CategoryBar({
  selectedCategory,
  photoCounts,
  canDownload,
  onSelect,
  onManageCategories,
}: CategoryBarProps) {
  const { categories, categoryColor } = useCategories();
  const tabs = [
    {
      id: "all",
      label: "All",
      count: categories.reduce((sum, { id }) => sum + (photoCounts.get(id) ?? 0), 0),
    },
    ...categories.map(({ id, label }) => ({ id, label, count: photoCounts.get(id) ?? 0 })),
  ];

  return (
    <div className="bg-canvas/85 sticky top-14 z-10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2.5 sm:px-6">
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap transition ${selectedCategory === tab.id ? "bg-ink text-white" : "text-ink-2 hover:text-ink bg-white ring-1 ring-black/[0.05]"}`}
            >
              {tab.id !== "all" && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: categoryColor(tab.id) }}
                />
              )}
              {tab.label}
              <span
                className={`text-[11.5px] tabular-nums ${selectedCategory === tab.id ? "text-white/60" : "text-ink-3"}`}
              >
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
          <button
            onClick={onManageCategories}
            className="text-ink-2 hover:text-ink hover:border-ink/30 flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-black/20 px-3 text-[12.5px] font-medium transition"
          >
            <Settings2 className="size-3.5" />
            Categories
          </button>
        </nav>

        <a
          href={canDownload ? api.downloadLink(selectedCategory) : undefined}
          className={`text-ink flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-medium ring-1 ring-black/[0.05] transition hover:bg-black/[0.03] ${canDownload ? "" : "pointer-events-none opacity-40"}`}
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <span className="block text-[24px] leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-ink-3 mt-1 block text-[12px]">{label}</span>
    </div>
  );
}

type ActionCardProps = {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  badges?: string[];
};

function ActionCard({ icon, title, text, onClick, disabled, primary, badges }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col items-start rounded-3xl p-5 text-left transition disabled:opacity-40 ${primary ? "bg-ink text-white hover:bg-black" : "bg-white ring-1 ring-black/[0.05] hover:ring-black/15"}`}
    >
      <span className="flex w-full items-center justify-between">
        <span
          className={`grid size-10 place-items-center rounded-2xl ${primary ? "bg-white/10" : "bg-black/[0.05]"}`}
        >
          {icon}
        </span>
        {badges && (
          <span className="flex -space-x-1.5">
            {badges.map((badge) => (
              <img
                key={badge}
                src={badge}
                alt=""
                className="size-6 rounded-full bg-white p-0.5 ring-2 ring-white"
              />
            ))}
          </span>
        )}
      </span>
      <span className="mt-6 flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
        {title}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </span>
      <span
        className={`mt-1 text-[12.5px] leading-relaxed ${primary ? "text-white/65" : "text-ink-2"}`}
      >
        {text}
      </span>
    </button>
  );
}

function Logo() {
  const { categories, categoryColor } = useCategories();
  return (
    <span className="bg-ink grid size-8 place-items-center rounded-[10px]">
      <span className="flex h-3.5 items-end gap-[3px]">
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
