import { useEffect, useState, type FC } from "react";

type BootScreenProps = {
  /** When true, boot sequence may complete and fade out. */
  ready: boolean;
  /** Minimum time on screen so the boot animation feels intentional (ms). */
  minDurationMs?: number;
  /** Accent color from theme (optional). */
  accent?: string;
  onFinished?: () => void;
};

/**
 * Futuristic full-screen boot overlay.
 * Completes only after `ready` AND minDuration — never blocks real progress longer than needed.
 */
const BootScreen: FC<BootScreenProps> = ({
  ready,
  minDurationMs = 700,
  accent = "#915EFF",
  onFinished,
}) => {
  const [progress, setProgress] = useState(8);
  const [phase, setPhase] = useState("BOOT SEQUENCE");
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [started] = useState(() => performance.now());

  // Smooth progress while waiting; snap toward 100 when ready
  useEffect(() => {
    if (!visible || exiting) return;

    const id = window.setInterval(() => {
      setProgress((p) => {
        if (ready) return Math.min(100, p + 12);
        // Ease toward ~72% while hydrating so it never looks stuck at zero
        if (p >= 72) return p + (Math.random() * 0.3);
        return p + 1.8 + Math.random() * 2.2;
      });
    }, 50);

    return () => window.clearInterval(id);
  }, [ready, visible, exiting]);

  useEffect(() => {
    if (progress < 25) setPhase("HYDRATING CONFIG");
    else if (progress < 50) setPhase("LOADING MODULES");
    else if (progress < 80) setPhase("PREPARING SCENE");
    else if (progress < 100) setPhase("FINALIZING");
    else setPhase("SYSTEM ONLINE");
  }, [progress]);

  useEffect(() => {
    if (!ready || exiting || !visible) return;

    const elapsed = performance.now() - started;
    const wait = Math.max(0, minDurationMs - elapsed);

    const t = window.setTimeout(() => {
      setProgress(100);
      setPhase("SYSTEM ONLINE");
      setExiting(true);
    }, wait + 80);

    return () => window.clearTimeout(t);
  }, [ready, exiting, visible, started, minDurationMs]);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      onFinished?.();
    }, 420);
    return () => window.clearTimeout(t);
  }, [exiting, onFinished]);

  if (!visible) return null;

  const pct = Math.min(100, Math.round(progress));

  return (
    <div
      className={`boot-screen ${exiting ? "boot-screen--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      aria-label={`Loading portfolio, ${pct} percent`}
      style={{ ["--boot-accent" as string]: accent }}
    >
      <div className="boot-screen__grid" aria-hidden />
      <div className="boot-screen__scan" aria-hidden />

      <div className="boot-screen__core">
        <div className="boot-screen__ring" aria-hidden>
          <span className="boot-screen__ring-glow" />
        </div>

        <p className="boot-screen__brand">PORTFOLIO OS</p>
        <p className="boot-screen__phase">{phase}</p>

        <div className="boot-screen__bar" aria-hidden>
          <div
            className="boot-screen__bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="boot-screen__meta">
          <span className="boot-screen__hex">
            0x{pct.toString(16).toUpperCase().padStart(2, "0")}
          </span>
          <span className="boot-screen__pct">{pct}%</span>
        </div>

        <ul className="boot-screen__log" aria-hidden>
          <li className={pct >= 20 ? "is-on" : ""}>// config.store</li>
          <li className={pct >= 45 ? "is-on" : ""}>// theme.runtime</li>
          <li className={pct >= 70 ? "is-on" : ""}>// render.pipeline</li>
          <li className={pct >= 95 ? "is-on" : ""}>// ui.ready</li>
        </ul>
      </div>
    </div>
  );
};

export default BootScreen;
