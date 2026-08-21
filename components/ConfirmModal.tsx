"use client";

import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-rise"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-panel border border-border rounded-2xl p-5 shadow-xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border ${
              danger ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-glow/10 border-glow/30 text-glow"
            }`}
          >
            <AlertTriangle size={16} />
          </div>
          <div className="pt-1">
            <h2 className="text-[15px] font-semibold text-text">{title}</h2>
            <p className="text-sm text-text-muted mt-1">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-sm px-3.5 py-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-panel2 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`text-sm px-3.5 py-2 rounded-lg font-medium transition-colors ${
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-glow hover:bg-glow-soft text-ink"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
