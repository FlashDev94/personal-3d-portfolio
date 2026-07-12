import { Html, useProgress } from "@react-three/drei";

/**
 * In-canvas 3D asset loader — compact futuristic readout for GLTF progress.
 */
const Loader = () => {
  const { progress, active } = useProgress();
  const pct = Math.min(100, Math.round(progress || 0));

  if (!active && pct >= 100) return null;

  return (
    <Html center>
      <div
        className="flex flex-col items-center gap-2 rounded-xl border px-4 py-3 backdrop-blur-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "color-mix(in srgb, var(--color-tertiary) 92%, transparent)",
          boxShadow: "var(--color-card-shadow)",
        }}
        role="status"
        aria-live="polite"
        aria-label={`Loading 3D assets ${pct}%`}
      >
        <div
          className="h-8 w-8 rounded-full border-2"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
            borderTopColor: "var(--accent)",
            animation: "boot-spin 0.8s linear infinite",
          }}
        />
        <p
          className="font-mono text-[11px] font-semibold tracking-widest"
          style={{ color: "var(--color-fg)" }}
        >
          {pct}% · SCENE
        </p>
        <div
          className="h-0.5 w-24 overflow-hidden rounded-full"
          style={{ background: "var(--color-border)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </div>
      </div>
    </Html>
  );
};

export default Loader;
