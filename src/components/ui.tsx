import { type ReactNode, useEffect } from "react";
import { create } from "zustand";
import { useAssetUrl } from "../lib/hooks";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-label={title}>
        <header>
          <h3>{title}</h3>
          <button className="ghost" onClick={onClose} aria-label="Chiudi">✕</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function AssetImage({ cid, assetId, alt, className }: { cid: string; assetId?: string; alt: string; className?: string }) {
  const { url } = useAssetUrl(cid, assetId);
  if (!url) return <div className={"img-ph " + (className ?? "")} aria-label={alt}>⚔</div>;
  return <img className={className} src={url} alt={alt} />;
}

/* Dialoghi dell'app: alert/confirm del browser non sono affidabili nelle webview di Tauri */
interface DialogState {
  dlg?: { msg: string; onYes?: () => void };
  close(): void;
}
const useDialog = create<DialogState>((set) => ({ close: () => set({ dlg: undefined }) }));

export function confirmDo(msg: string, fn: () => void) {
  useDialog.setState({ dlg: { msg, onYes: fn } });
}
export function notify(msg: string) {
  useDialog.setState({ dlg: { msg } });
}

export function DialogHost() {
  const { dlg, close } = useDialog();
  if (!dlg) return null;
  return (
    <Modal title={dlg.onYes ? "Conferma" : "Attenzione"} onClose={close}>
      <p className="prewrap">{dlg.msg}</p>
      <div className="row end">
        {dlg.onYes ? (
          <>
            <button onClick={close}>Annulla</button>
            <button className="primary" autoFocus onClick={() => { const f = dlg.onYes; close(); f?.(); }}>Conferma</button>
          </>
        ) : (
          <button className="primary" autoFocus onClick={close}>OK</button>
        )}
      </div>
    </Modal>
  );
}
