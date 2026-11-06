import { Check, Copy, Plug } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Sheet, SheetButton } from "./sheet";

const serverName = "packaging-waste-dataset";
const examplePrompt =
  "Check which categories in the packaging waste dataset still need photos, then find casual photos taken in Nigeria for each of them and add the ones that follow the guidelines.";

type App = {
  id: string;
  label: string;
  icon?: string;
  steps: (url: string) => { text: string; copy?: string }[];
};

const apps: App[] = [
  {
    id: "claude",
    label: "Claude",
    icon: "/apps/claude.png",
    steps: (url) => [
      { text: "In Claude, open Settings, then Connectors, then Add custom connector." },
      { text: `Name it ${serverName} and paste this URL.`, copy: url },
      {
        text: "In a chat, turn the connector on from the tools menu and ask it to collect photos.",
      },
    ],
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    icon: "/apps/chatgpt.svg",
    steps: (url) => [
      {
        text: "In ChatGPT, open Settings, then Apps, then Advanced settings, and turn on Developer mode.",
      },
      {
        text: "Create an app, paste this URL as the MCP server URL and pick No authentication.",
        copy: url,
      },
      { text: "In a new chat, pick Developer mode, add the app and ask it to collect photos." },
    ],
  },
  {
    id: "claude-code",
    label: "Claude Code",
    icon: "/apps/claude.png",
    steps: (url) => [
      {
        text: "Run this in your terminal.",
        copy: `claude mcp add --transport http ${serverName} ${url}`,
      },
      { text: "Start Claude Code and ask it to collect photos." },
    ],
  },
  {
    id: "other",
    label: "Other",
    steps: (url) => [
      {
        text: "Add this to your app's MCP config, for example in Cursor or Windsurf.",
        copy: JSON.stringify({ mcpServers: { [serverName]: { url } } }, null, 2),
      },
    ],
  },
];

export function ConnectSheet({ onClose }: { onClose: () => void }) {
  const [appId, setAppId] = useState(apps[0]!.id);

  const url = `${location.origin}/api/mcp`;

  return (
    <Sheet
      title="Connect an AI agent"
      subtitle="Let Claude or ChatGPT find and add photos"
      onClose={onClose}
    >
      <div className="space-y-4 px-5 pb-5">
        <p className="text-ink-2 text-[12.5px] leading-relaxed">
          The agent searches the web, looks at each photo itself and adds the ones that follow the
          same rules our classifier uses.
        </p>

        <nav className="flex gap-0.5 rounded-full bg-black/[0.04] p-[3px]">
          {apps.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setAppId(id)}
              className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition ${appId === id ? "text-ink bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-ink-2 hover:text-ink"}`}
            >
              {icon ? (
                <img src={icon} alt="" className="size-3.5 rounded-[4px]" />
              ) : (
                <Plug className="size-3.5" />
              )}
              {label}
            </button>
          ))}
        </nav>

        <div className="grid">
          {apps.map((app) => (
            <ol
              key={app.id}
              aria-hidden={app.id !== appId}
              className={`space-y-3 [grid-area:1/1] ${app.id === appId ? "" : "invisible"}`}
            >
              {app.steps(url).map((step, index) => (
                <li key={step.text} className="flex gap-3">
                  <span className="text-ink-2 grid size-5 shrink-0 place-items-center rounded-full bg-black/[0.05] text-[11px] font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-ink text-[13px] leading-snug">{step.text}</p>
                    {step.copy && <CopyBlock value={step.copy} />}
                  </div>
                </li>
              ))}
            </ol>
          ))}
        </div>

        <div className="space-y-2">
          <span className="text-ink-2 text-[12px] font-medium">Try asking</span>
          <CopyBlock value={examplePrompt} wrap />
        </div>
      </div>

      <footer className="flex justify-end border-t border-black/[0.05] px-5 py-3.5">
        <SheetButton onClick={onClose} primary>
          Done
        </SheetButton>
      </footer>
    </Sheet>
  );
}

function CopyBlock({ value, wrap }: { value: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative rounded-xl bg-black/[0.04]">
      <pre
        className={`text-ink-2 px-3 py-2.5 pr-11 text-[12px] leading-relaxed ${wrap ? "font-sans whitespace-pre-wrap" : "overflow-x-auto font-mono"}`}
      >
        {value}
      </pre>
      <button
        onClick={copy}
        aria-label="Copy"
        title="Copy"
        className="text-ink-2 hover:text-ink absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
