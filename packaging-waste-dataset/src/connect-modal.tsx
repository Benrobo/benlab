import { Check, Copy, Plug } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { engineUrl } from "../config";
import { StepVisual, type Visual } from "./connect-visuals";
import { Modal, ModalButton } from "./modal";

const serverName = "packaging-waste-dataset";
const url = `${engineUrl}/mcp`;
const examplePrompt =
  "Find casual photos of packaging waste taken in Nigeria for each category in the packaging waste dataset, and add the ones that follow the guidelines.";

type Step = { title: string; text: string; visual?: Visual; copy?: string };

type App = { id: string; label: string; icon?: string; steps: Step[] };

const askStep = (tool: string): Step => ({
  title: "Ask it to collect photos",
  text: "Paste this, or ask in your own words. It reads the dataset rules first.",
  visual: { type: "chat", tool, prompt: examplePrompt },
  copy: examplePrompt,
});

const apps: App[] = [
  {
    id: "claude",
    label: "Claude",
    icon: "/apps/claude.png",
    steps: [
      {
        title: "Open Connectors",
        text: "In Claude on the web or desktop, open Settings, go to Connectors and click Add custom connector.",
        visual: {
          type: "menu",
          items: ["General", "Account", "Connectors", "Capabilities"],
          selected: "Connectors",
          action: "Add custom connector",
        },
      },
      {
        title: "Add the server",
        text: "Name it, paste this URL and click Add. No sign in is needed.",
        visual: {
          type: "form",
          fields: [
            { label: "Name", value: serverName },
            { label: "Remote MCP server URL", value: url },
          ],
          action: "Add",
        },
        copy: url,
      },
      {
        title: "Turn it on in a chat",
        text: "In a new chat, open the tools menu next to the message box and switch the connector on.",
        visual: { type: "tools", menu: ["Add files", "Research"], tool: serverName },
      },
      askStep(serverName),
    ],
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    icon: "/apps/chatgpt.svg",
    steps: [
      {
        title: "Turn on Developer mode",
        text: "In ChatGPT, open Settings, go to Apps, open Advanced settings and switch Developer mode on.",
        visual: {
          type: "toggle",
          items: ["General", "Personalization", "Apps", "Security"],
          selected: "Apps",
          toggle: "Developer mode",
        },
      },
      {
        title: "Create the app",
        text: "Click Create app, paste this URL, pick No authentication and click Create.",
        visual: {
          type: "form",
          fields: [
            { label: "MCP server URL", value: url },
            { label: "Authentication", value: "No authentication" },
          ],
          action: "Create",
        },
        copy: url,
      },
      {
        title: "Add it to a chat",
        text: "In a new chat, open the + menu, pick Developer mode and add the app.",
        visual: { type: "tools", menu: ["Add photos & files", "Developer mode"], tool: serverName },
      },
      askStep(serverName),
    ],
  },
  {
    id: "claude-code",
    label: "Claude Code",
    icon: "/apps/claude.png",
    steps: [
      {
        title: "Add the server",
        text: "Run this once in your terminal.",
        visual: {
          type: "terminal",
          lines: [`claude mcp add --transport http ${serverName} ${url}`],
        },
        copy: `claude mcp add --transport http ${serverName} ${url}`,
      },
      {
        title: "Ask it to collect photos",
        text: "Start Claude Code and paste this, or ask in your own words.",
        visual: { type: "terminal", lines: ["claude", examplePrompt] },
        copy: examplePrompt,
      },
    ],
  },
  {
    id: "other",
    label: "Other",
    steps: [
      {
        title: "Add it to your MCP config",
        text: "Any app that supports remote MCP servers works, like Cursor or Windsurf. Add this to its MCP config.",
        visual: {
          type: "file",
          name: "mcp.json",
          content: JSON.stringify({ mcpServers: { [serverName]: { url } } }, null, 2),
        },
        copy: JSON.stringify({ mcpServers: { [serverName]: { url } } }, null, 2),
      },
      {
        title: "Ask it to collect photos",
        text: "Paste this, or ask in your own words.",
        copy: examplePrompt,
      },
    ],
  },
];

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const [appId, setAppId] = useState(apps[0]!.id);
  const [stepIndex, setStepIndex] = useState(0);

  const app = apps.find(({ id }) => id === appId)!;
  const isLastStep = stepIndex === app.steps.length - 1;

  const chooseApp = (id: string) => {
    setAppId(id);
    setStepIndex(0);
  };

  return (
    <Modal
      title="Connect an AI agent"
      subtitle="Your agent finds, checks and adds photos for you"
      onClose={onClose}
      wide
    >
      <div className="space-y-4 px-5 pb-5">
        <nav className="flex gap-0.5 rounded-full bg-black/[0.04] p-[3px]">
          {apps.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => chooseApp(id)}
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

        <div className="grid grid-cols-[minmax(0,1fr)]">
          {apps.flatMap(({ id, steps }) =>
            steps.map((step, index) => {
              const isShown = id === appId && index === stepIndex;
              return (
                <section
                  key={`${id}-${index}`}
                  aria-hidden={!isShown}
                  className={`space-y-3 [grid-area:1/1] ${isShown ? "" : "invisible"}`}
                >
                  {step.visual && <StepVisual visual={step.visual} />}
                  <div className="flex gap-3">
                    <span className="bg-ink grid size-6 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold text-white tabular-nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-ink text-[14px] font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-ink-2 text-[12.5px] leading-relaxed">{step.text}</p>
                      {step.copy && (
                        <CopyBlock value={step.copy} wrap={step.copy === examplePrompt} />
                      )}
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-black/[0.05] px-5 py-3.5">
        <div className="flex gap-1.5">
          {app.steps.map((step, index) => (
            <button
              key={step.title}
              onClick={() => setStepIndex(index)}
              aria-label={`Step ${index + 1}`}
              className={`h-1.5 rounded-full transition-all ${index === stepIndex ? "bg-ink w-5" : "w-1.5 bg-black/15 hover:bg-black/30"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <ModalButton onClick={() => setStepIndex(stepIndex - 1)}>Back</ModalButton>
          )}
          <ModalButton
            onClick={() => (isLastStep ? onClose() : setStepIndex(stepIndex + 1))}
            primary
          >
            {isLastStep ? "Done" : "Next"}
          </ModalButton>
        </div>
      </footer>
    </Modal>
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
    <div className="group relative min-w-0 rounded-xl bg-black/[0.04]">
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
