import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useMotionPolicy } from "../../utils/motionRuntime";

/**
 * Desktop magnetic cursor. Disabled on touch / reduced-motion / e2e.
 */
const CustomCursor = () => {
  const policy = useMotionPolicy();
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!policy.allowCursor) return;
    const cursor = cursorRef.current;
    if (!cursor) return;

    document.documentElement.classList.add("has-custom-cursor");
    let hover = false;
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const loop = () => {
      if (!hover) {
        pos.x += (mouse.x - pos.x) / 6;
        pos.y += (mouse.y - pos.y) / 6;
        gsap.set(cursor, { x: pos.x, y: pos.y });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener("mousemove", onMove, { passive: true });

    const onOver = (e: Event) => {
      const target = (e.target as HTMLElement)?.closest?.("[data-cursor]") as
        | HTMLElement
        | null;
      if (!target) return;
      const mode = target.dataset.cursor;
      if (mode === "disable") {
        cursor.classList.add("cursor-disable");
      } else if (mode === "icons") {
        cursor.classList.add("cursor-icons");
        const rect = target.getBoundingClientRect();
        hover = true;
        gsap.to(cursor, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          duration: 0.15,
        });
        cursor.style.setProperty("--cursorH", `${Math.max(rect.height, 28)}px`);
        cursor.style.setProperty("--cursorW", `${Math.max(rect.width, 28)}px`);
      }
    };
    const onOut = (e: Event) => {
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (related?.closest?.("[data-cursor]")) return;
      cursor.classList.remove("cursor-disable", "cursor-icons");
      hover = false;
    };

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [policy.allowCursor]);

  if (!policy.allowCursor) return null;

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      aria-hidden
    />
  );
};

export default CustomCursor;
