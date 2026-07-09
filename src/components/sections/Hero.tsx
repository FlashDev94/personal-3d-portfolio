import { motion } from "framer-motion";

import { styles } from "../../constants/styles";
import { ComputersCanvas } from "../canvas";
import { usePortfolio } from "../../context/PortfolioContext";
import ErrorBoundary from "../layout/ErrorBoundary";

const Hero = () => {
  const { data } = usePortfolio();
  const { config } = data;
  const line1 = config.hero.p[0] || "";
  const line2 = config.hero.p[1] || "";

  return (
    <section className="relative mx-auto h-screen w-full overflow-hidden">
      {/* Text layer — always visible; never unmounted by canvas failures */}
      <div
        className={`absolute inset-0 top-[120px] z-10 mx-auto max-w-7xl ${styles.paddingX} pointer-events-none flex flex-row items-start gap-5`}
      >
        <div className="mt-5 flex flex-col items-center justify-center">
          <div className="h-5 w-5 rounded-full bg-[#915EFF]" />
          <div className="violet-gradient h-40 w-1 sm:h-80" />
        </div>

        <div className="max-w-xl lg:max-w-2xl">
          <h1 className={`${styles.heroHeadText} text-white`}>
            Hi, I&apos;m{" "}
            <span className="break-words text-[#915EFF]">
              {config.hero.name}
            </span>
          </h1>
          <p
            className={`${styles.heroSubText} text-white-100 mt-2 max-w-lg break-words`}
          >
            {line1}
            {line2 ? (
              <>
                <br className="hidden sm:block" />
                <span className="sm:ml-0"> {line2}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* 3D layer — isolated so WebGL errors cannot blank the hero text */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary
          name="Hero canvas"
          fallback={<div className="h-full w-full" aria-hidden />}
        >
          <ComputersCanvas />
        </ErrorBoundary>
      </div>

      <div className="xs:bottom-10 absolute bottom-32 z-10 flex w-full items-center justify-center">
        <a href="#about" className="pointer-events-auto">
          <div className="border-secondary flex h-[64px] w-[35px] items-start justify-center rounded-3xl border-4 p-2">
            <motion.div
              animate={{
                y: [0, 24, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              className="bg-secondary mb-1 h-3 w-3 rounded-full"
            />
          </div>
        </a>
      </div>
    </section>
  );
};

export default Hero;
