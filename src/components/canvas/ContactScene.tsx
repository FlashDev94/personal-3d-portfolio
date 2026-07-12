import { usePortfolio } from "../../context/PortfolioContext";
import { useThemeRuntime } from "../../utils/themeRuntime";
import EarthCanvas from "./Earth";
import AbstractCoreCanvas from "./AbstractCore";

const ContactScene = () => {
  const { data } = usePortfolio();
  const runtime = useThemeRuntime(data.theme3d);

  if (!runtime.webglEnabled || data.theme3d.contactScene === "none") {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1430] to-[#0b0918]"
        aria-hidden
      >
        <div
          className="h-32 w-32 rounded-full opacity-40 blur-2xl"
          style={{ background: runtime.palette.accent }}
        />
      </div>
    );
  }

  const common = {
    autoRotate: runtime.autoRotate,
    motionSpeed: runtime.motionSpeed || 1,
    allowOrbit: runtime.allowOrbit,
    dpr: runtime.dpr,
    antialias: runtime.antialias,
  };

  if (data.theme3d.contactScene === "planet") {
    return <EarthCanvas {...common} />;
  }

  if (data.theme3d.contactScene === "abstract_core") {
    return (
      <AbstractCoreCanvas
        {...common}
        accent={runtime.palette.accent}
        scale={1.25}
      />
    );
  }

  return null;
};

export default ContactScene;
