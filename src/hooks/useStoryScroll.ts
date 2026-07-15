import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionPolicy } from "../utils/motionRuntime";

gsap.registerPlugin(ScrollTrigger);

/**
 * Page-level scrub storytelling ported from akashrmalhotra GsapScroll.setAllTimeline
 * + landing fade. Targets reference CSS class names.
 * Character bone timeline lives on Option C.
 */
export function useStoryScroll(enabled: boolean) {
  const policy = useMotionPolicy();

  useEffect(() => {
    if (!enabled || !policy.allowScrub) {
      // Ensure what-box-in is visible when scrub is off
      document.querySelectorAll(".what-box-in").forEach((el) => {
        (el as HTMLElement).style.display = "flex";
      });
      return;
    }

    const ctx = gsap.context(() => {
      // Landing fade (reference tl1 content-only half)
      if (document.querySelector(".landing-container")) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".landing-section",
              start: "top top",
              end: "bottom top",
              scrub: true,
              id: "story-landing",
              invalidateOnRefresh: true,
            },
          })
          .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
          .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
          .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

        if (policy.isDesktop && document.querySelector(".story-hero-stage")) {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: ".landing-section",
                start: "top top",
                end: "bottom top",
                scrub: true,
                id: "story-hero-shift",
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              ".story-hero-stage",
              { x: "0%" },
              { x: "-18%", duration: 1 },
              0
            );
        }
      }

      // About parallax fade
      if (document.querySelector(".about-section")) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".about-section",
              start: "center 55%",
              end: "bottom top",
              scrub: true,
              id: "story-about",
              invalidateOnRefresh: true,
            },
          })
          .to(".about-section", { y: "30%", duration: 6 }, 0)
          .to(".about-section", { opacity: 0, delay: 3, duration: 2 }, 0);
      }

      // Reveal What I Do cards (reference shows them mid-scroll)
      if (document.querySelector(".what-box-in")) {
        if (policy.isDesktop) {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: ".whatIDO",
                start: "top 40%",
                end: "top top",
                scrub: true,
                id: "story-what-reveal",
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              ".what-box-in",
              { display: "none" },
              { display: "flex", duration: 0.1 },
              0
            );
        } else {
          gsap.set(".what-box-in", { display: "flex" });
          gsap.timeline({
            scrollTrigger: {
              trigger: ".what-box-in",
              start: "top 70%",
              end: "bottom top",
              id: "story-what-mobile",
            },
          });
        }
      }

      // Career timeline growth — exact setAllTimeline
      if (document.querySelector(".career-section")) {
        const careerTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: ".career-section",
            start: "top 30%",
            end: "100% center",
            scrub: true,
            id: "story-career",
            invalidateOnRefresh: true,
          },
        });
        careerTimeline
          .fromTo(
            ".career-timeline",
            { maxHeight: "10%" },
            { maxHeight: "100%", duration: 0.5 },
            0
          )
          .fromTo(
            ".career-timeline",
            { opacity: 0 },
            { opacity: 1, duration: 0.1 },
            0
          )
          .fromTo(
            ".career-info-box",
            { opacity: 0 },
            { opacity: 1, stagger: 0.1, duration: 0.5 },
            0
          )
          .fromTo(
            ".career-dot",
            { animationIterationCount: "infinite" },
            {
              animationIterationCount: "1",
              delay: 0.3,
              duration: 0.1,
            },
            0
          );

        if (policy.isDesktop) {
          careerTimeline.fromTo(
            ".career-section",
            { y: 0 },
            { y: "20%", duration: 0.5, delay: 0.2 },
            0
          );
        }
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll()
        .filter((t) => String(t.vars?.id || "").startsWith("story-"))
        .forEach((t) => t.kill());
    };
  }, [enabled, policy.allowScrub, policy.isDesktop]);
}
