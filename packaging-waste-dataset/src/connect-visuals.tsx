import { MousePointer2, Plus, SendHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export type Visual =
  | { type: "menu"; items: string[]; selected: string; action: string }
  | { type: "form"; fields: { label: string; value: string }[]; action: string }
  | { type: "toggle"; items: string[]; selected: string; toggle: string }
  | { type: "tools"; menu: string[]; tool: string }
  | { type: "chat"; tool: string; prompt: string }
  | { type: "terminal"; lines: string[] }
  | { type: "file"; name: string; content: string };

export function StepVisual({ visual }: { visual: Visual }) {
  if (visual.type === "menu") {
    return (
      <Window>
        <div className="flex h-full">
          <SettingsSidebar items={visual.items} selected={visual.selected} />
          <div className="grid flex-1 place-items-center">
            <Target>
              <span className="bg-ink rounded-lg px-3 py-1.5 text-[11px] font-medium text-white">
                {visual.action}
              </span>
            </Target>
          </div>
        </div>
      </Window>
    );
  }

  if (visual.type === "toggle") {
    return (
      <Window>
        <div className="flex h-full">
          <SettingsSidebar items={visual.items} selected={visual.selected} />
          <div className="grid flex-1 place-items-center px-3">
            <div className="flex w-full items-center justify-between rounded-lg bg-black/[0.03] px-3 py-2">
              <span className="text-ink text-[11px] font-medium">{visual.toggle}</span>
              <Target>
                <span className="flex h-4 w-7 items-center justify-end rounded-full bg-emerald-500 px-0.5">
                  <span className="size-3 rounded-full bg-white" />
                </span>
              </Target>
            </div>
          </div>
        </div>
      </Window>
    );
  }

  if (visual.type === "form") {
    return (
      <Window>
        <div className="flex h-full flex-col justify-center gap-2 px-4">
          {visual.fields.map(({ label, value }) => (
            <div key={label}>
              <span className="text-ink-3 block text-[9.5px] font-medium">{label}</span>
              <span className="text-ink block truncate rounded-md bg-black/[0.04] px-2 py-1 font-mono text-[10px]">
                {value}
              </span>
            </div>
          ))}
          <div className="flex justify-end">
            <Target>
              <span className="bg-ink rounded-lg px-3 py-1 text-[11px] font-medium text-white">
                {visual.action}
              </span>
            </Target>
          </div>
        </div>
      </Window>
    );
  }

  if (visual.type === "tools") {
    return (
      <Window>
        <div className="flex h-full flex-col justify-end gap-1.5 p-3">
          <div className="ml-6 w-44 space-y-0.5 rounded-lg bg-white p-1 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.06]">
            {visual.menu.map((item) => (
              <span key={item} className="text-ink-2 block rounded-md px-2 py-1 text-[10.5px]">
                {item}
              </span>
            ))}
            <div className="flex items-center justify-between rounded-md bg-black/[0.04] px-2 py-1">
              <span className="text-ink truncate text-[10.5px] font-medium">{visual.tool}</span>
              <Target>
                <span className="flex h-3.5 w-6 items-center justify-end rounded-full bg-emerald-500 px-0.5">
                  <span className="size-2.5 rounded-full bg-white" />
                </span>
              </Target>
            </div>
          </div>
          <ChatInput />
        </div>
      </Window>
    );
  }

  if (visual.type === "chat") {
    return (
      <Window>
        <div className="flex h-full flex-col justify-end gap-2 p-3">
          <span className="bg-ink ml-auto line-clamp-4 max-w-[85%] rounded-xl rounded-br-sm px-2.5 py-1.5 text-[10.5px] leading-snug text-white">
            {visual.prompt}
          </span>
          <span className="text-ink-2 flex w-fit items-center gap-1.5 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px]">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {visual.tool}
          </span>
        </div>
      </Window>
    );
  }

  if (visual.type === "terminal") {
    return (
      <Window dark>
        <div className="space-y-1 p-3 font-mono text-[10.5px] leading-relaxed">
          {visual.lines.map((line) => (
            <p key={line} className="break-all text-white/85">
              <span className="text-emerald-400">$ </span>
              {line}
            </p>
          ))}
          <span className="inline-block h-3 w-1.5 animate-pulse bg-white/70" />
        </div>
      </Window>
    );
  }

  return (
    <Window title={visual.name}>
      <pre className="text-ink-2 overflow-hidden p-3 font-mono text-[10px] leading-relaxed">
        {visual.content}
      </pre>
    </Window>
  );
}

function Window({
  children,
  dark,
  title,
}: {
  children: ReactNode;
  dark?: boolean;
  title?: string;
}) {
  return (
    <div
      className={`h-40 overflow-hidden rounded-xl ring-1 ${dark ? "bg-[#1c1c1a] ring-black/20" : "bg-canvas ring-black/[0.06]"}`}
    >
      <div
        className={`flex h-6 items-center gap-1 px-2.5 ${dark ? "bg-white/[0.06]" : "bg-black/[0.03]"}`}
      >
        {["#f87171", "#fbbf24", "#34d399"].map((color) => (
          <span key={color} className="size-1.5 rounded-full" style={{ background: color }} />
        ))}
        {title && <span className="text-ink-3 ml-2 font-mono text-[9.5px]">{title}</span>}
      </div>
      <div className="h-[calc(100%-1.5rem)]">{children}</div>
    </div>
  );
}

function SettingsSidebar({ items, selected }: { items: string[]; selected: string }) {
  return (
    <div className="w-24 space-y-0.5 border-r border-black/[0.05] p-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={`block truncate rounded-md px-2 py-1 text-[10.5px] ${item === selected ? "text-ink bg-white font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-ink-3"}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ChatInput() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 ring-1 ring-black/[0.06]">
      <span className="text-ink-2 grid size-5 place-items-center rounded-full bg-black/[0.05]">
        <Plus className="size-3" />
      </span>
      <span className="text-ink-3 flex-1 text-[10.5px]">Reply…</span>
      <SendHorizontal className="text-ink-3 size-3" />
    </div>
  );
}

function Target({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex">
      <span className="absolute -inset-1 animate-pulse rounded-xl ring-2 ring-[#3b82f6]/50" />
      {children}
      <MousePointer2 className="text-ink absolute -right-3 -bottom-3 size-4 fill-white" />
    </span>
  );
}
