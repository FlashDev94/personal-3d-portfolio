import {
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionPolicy } from "../../utils/motionRuntime";

gsap.registerPlugin(ScrollTrigger);

type Props = PropsWithChildren<{
  enabled?: boolean;
}>;

/**
 * Optional smooth scrolling. Uses ScrollSmoother when available in the GSAP
 * build; otherwise falls back to native scroll (still robust).
 */
const SmoothScroll = ({ children, enabled = true }: Props) => {
  const policy = useMotionPolicy();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const want = enabled && policy.allowSmoothScroll;
    if (!want) {
      setActive(false);
      return;
    }

    let smoother: { kill: () => void; paused: (v: boolean) => void } | null =
      null;
    let cancelled = false;

    (async () => {
      try {
        // ScrollSmoother may be Club-only depending on GSAP version; degrade gracefully.
        const mod = await import("gsap/ScrollSmoother").catch(() => null);
        if (!mod || cancelled) return;
        const ScrollSmoother = (mod as { ScrollSmoother?: unknown; default?: unknown })
          .ScrollSmoother as
          | {
              create: (opts: Record<string, unknown>) => {
                kill: () => void;
                paused: (v: boolean) => void;
              };
              register?: typeof gsap.registerPlugin;
            }
          | undefined;
        if (!ScrollSmoother?.create || !wrapperRef.current || !contentRef.current)
          return;
        gsap.registerPlugin(ScrollSmoother as unknown as gsap.Plugin);
        smoother = ScrollSmoother.create({
          wrapper: wrapperRef.current,
          content: contentRef.current,
          smooth: 1.2,
          effects: false,
          autoResize: true,
          ignoreMobileResize: true,
        });
        if (!cancelled) setActive(true);
      } catch {
        // Native scroll is fine
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        smoother?.kill();
      } catch {
        /* ignore */
      }
      ScrollTrigger.getAll().forEach((t) => {
        if (String(t.vars?.id || "").startsWith("smoother")) t.kill();
      });
      setActive(false);
    };
  }, [enabled, policy.allowSmoothScroll]);

  // Always render same DOM so layout is stable
  return (
    <div
      id="smooth-wrapper"
      ref={wrapperRef}
      className={active ? "smooth-wrapper-active" : undefined}
    >
      <div id="smooth-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export default SmoothScroll;
