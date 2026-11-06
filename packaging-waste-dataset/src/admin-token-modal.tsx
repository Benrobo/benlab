import { KeyRound } from "lucide-react";
import { useState } from "react";
import { answerAdminToken } from "./admin-token";
import { Modal, ModalButton } from "./modal";

export function AdminTokenModal() {
  const [token, setToken] = useState("");
  const save = () => token.trim() && answerAdminToken(token.trim());

  return (
    <Modal
      title="Admin token"
      subtitle="Deleting photos and archiving categories needs the admin token"
      onClose={() => answerAdminToken(null)}
    >
      <div className="space-y-2 px-5 pb-5 sm:px-6">
        <label className="flex h-11 items-center gap-2.5 rounded-xl bg-black/[0.04] px-3 focus-within:bg-black/[0.06]">
          <KeyRound className="text-ink-3 size-4 shrink-0" />
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && save()}
            type="password"
            placeholder="Paste the token you were given"
            autoFocus
            autoComplete="off"
            className="text-ink placeholder:text-ink-3 w-full bg-transparent font-mono text-[13px] outline-none"
          />
        </label>
        <p className="text-ink-3 text-[11.5px]">
          It's saved in this browser, so you only enter it once.
        </p>
      </div>

      <footer className="flex justify-end gap-2 border-t border-black/[0.05] px-5 py-3.5">
        <ModalButton onClick={() => answerAdminToken(null)}>Cancel</ModalButton>
        <ModalButton onClick={save} disabled={!token.trim()} primary>
          Continue
        </ModalButton>
      </footer>
    </Modal>
  );
}
