import {
  useCallback,
  useRef,
  type FC,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "framer-motion";
import { github } from "../../assets";
import { fadeIn } from "../../utils/motion";
import type { TProject } from "../../types";

type Props = { index: number } & TProject;

/**
 * CSS holographic project card — foil sheen, scanlines, pointer tilt.
 * No WebGL; cheap, mobile-friendly, production-safe.
 */
const HoloProjectCard: FC<Props> = ({
  index,
  name,
  description,
  tags,
  image,
  sourceCodeLink,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 14;
    const ry = (x - 0.5) * 18;
    el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
    el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
  }, []);

  const onLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <motion.div
      variants={fadeIn("up", "spring", Math.min(index * 0.15, 0.45), 0.55)}
      className="w-full sm:w-[320px]"
    >
      <div
        ref={cardRef}
        className="holo-card"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div className="holo-card__shine" aria-hidden />
        <div className="holo-card__glare" aria-hidden />
        <div className="holo-card__scan" aria-hidden />

        <div className="holo-card__body">
          <div className="holo-card__media">
            <img
              src={image}
              alt={name}
              className="holo-card__img"
              loading="lazy"
              decoding="async"
            />
            <div className="holo-card__media-overlay" aria-hidden />
            <button
              type="button"
              onClick={() => window.open(sourceCodeLink, "_blank", "noopener,noreferrer")}
              className="holo-card__gh"
              aria-label={`Open source for ${name}`}
            >
              <img src={github} alt="" className="h-1/2 w-1/2 object-contain" />
            </button>
          </div>

          <div className="holo-card__content">
            <h3 className="holo-card__title">{name}</h3>
            <p className="holo-card__desc">{description}</p>
            <div className="holo-card__tags">
              {tags.map((tag) => (
                <span key={tag.name} className={`text-[13px] ${tag.color}`}>
                  #{tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HoloProjectCard;
