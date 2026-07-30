import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

export default function ModelVersionPanel() {
  const [models, setModels] = useState([]);
  const [changelog, setChangelog] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const problems = [];

      // These two endpoints may not exist. Report that plainly rather than
      // failing the whole panel.
      try {
        const res = await fetch(`${API}/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const available = data.models_available || [];
        const versions = data.versions || {};
        setModels(available.map((name) => ({ name, version: versions[name] || "unversioned" })));
      } catch (e) {
        problems.push(`/status: ${e.message}`);
      }

      try {
        const res = await fetch(`${API}/status/changelog`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setChangelog(data.changelog || []);
      } catch (e) {
        problems.push(`/status/changelog: ${e.message}`);
      }

      setNotes(problems);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading model information…</p>;
  }

  return (
    <div className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <section>
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          Registered models
        </h3>
        {models.length === 0 ? (
          <p className="text-sm text-neutral-500">
            None reported. Artifacts carry no version metadata yet — see{" "}
            <code className="text-neutral-400">/health</code> for what actually loaded.
          </p>
        ) : (
          <ul className="space-y-1">
            {models.map((m) => (
              <li key={m.name} className="flex items-baseline gap-3 font-mono text-xs">
                <span className="text-neutral-200">{m.name}</span>
                <span className="text-neutral-600">{m.version}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          Change log
        </h3>
        {changelog.length === 0 ? (
          <p className="text-sm text-neutral-500">No entries.</p>
        ) : (
          <ul className="space-y-2">
            {changelog.map((entry, i) => (
              <li key={i} className="border-l border-neutral-800 pl-3">
                <p className="font-mono text-xs text-neutral-200">
                  {entry.model} <span className="text-neutral-600">{entry.version}</span>{" "}
                  <span className="text-neutral-600">{entry.date}</span>
                </p>
                {entry.notes && (
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                    {entry.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {notes.length > 0 && (
        <p className="border-t border-neutral-800 pt-3 font-mono text-[11px] leading-relaxed text-neutral-600">
          {notes.join(" · ")}
        </p>
      )}
    </div>
  );
}