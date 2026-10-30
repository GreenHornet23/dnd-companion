import { useEffect, useState } from "react";
import { useCampaign } from "../lib/hooks";
import { generatePortrait } from "../lib/server";
import { Field } from "./ui";

/** Generatore di ritratti con anteprima: il prompt si può modificare a mano e rigenerare finché il risultato piace. */
export function PortraitGen({ cid, autoPrompt, styles, style, onStyle, onUse }: {
  cid: string;
  autoPrompt: string;
  styles: { id: string; label: string }[];
  style: string;
  onStyle(id: string): void;
  onUse(blob: Blob, prompt: string): void | Promise<void>;
}) {
  const { campaign } = useCampaign();
  const sync = campaign?.sync;
  const [custom, setCustom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<{ blob: Blob; url: string; prompt: string } | null>(null);
  const shown = custom ?? autoPrompt;
  useEffect(() => () => { if (res) URL.revokeObjectURL(res.url); }, [res]);

  const generate = async () => {
    if (!sync) return;
    setBusy(true);
    setError("");
    try {
      const blob = await generatePortrait(sync, cid, shown);
      setRes({ blob, url: URL.createObjectURL(blob), prompt: shown });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="note">
      <b>Genera un ritratto con l'IA</b>
      {!sync && <p className="muted">Serve una campagna collegata al server del party (Impostazioni).</p>}
      <Field label="Stile">
        <select value={style} onChange={(e) => { onStyle(e.target.value); setCustom(null); }}>
          {styles.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Prompt (modificabile)" hint={custom !== null ? "Modificato a mano" : "Generato dai dati qui sopra"}>
        <textarea rows={4} value={shown} onChange={(e) => setCustom(e.target.value)} />
      </Field>
      <div className="row gap wrap">
        <button className="primary" disabled={!sync || busy || shown.trim().length < 5} onClick={generate}>{busy ? "Genero…" : res ? "✨ Rigenera" : "✨ Genera ritratto"}</button>
        {custom !== null && <button className="ghost" onClick={() => setCustom(null)}>Ripristina</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {res && (
        <figure>
          <img src={res.url} alt="Ritratto generato" style={{ maxWidth: "100%", borderRadius: 8 }} />
          <figcaption className="row gap wrap">
            <button className="primary" onClick={async () => { await onUse(res.blob, res.prompt); setRes(null); }}>Usa come ritratto</button>
            <button className="ghost" onClick={() => setRes(null)}>Scarta</button>
          </figcaption>
        </figure>
      )}
    </section>
  );
}
