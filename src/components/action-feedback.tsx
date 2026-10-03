import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-[#0a0a0a] p-5 shadow-2xl">
        <div>
          <h2 id="confirm-dialog-title" className="text-sm font-semibold text-white">{title}</h2>
          <p id="confirm-dialog-message" className="mt-2 text-xs leading-5 text-neutral-400">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:text-white disabled:opacity-50">Batal</button>
          <button type="button" onClick={onConfirm} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-red-900/70 bg-red-950/50 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-950 disabled:opacity-50">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ActionToast({ type, message }: { type: "success" | "error"; message: string }) {
  if (!message) return null;
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div role={type === "success" ? "status" : "alert"} className="action-toast fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-4 py-3 text-xs text-neutral-200 shadow-2xl">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 break-words">{message}</span>
    </div>
  );
}