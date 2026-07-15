import React, { useRef } from "react";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";

import "react-vertical-timeline-component/style.min.css";

import { SectionWrapper } from "../../hoc";
import { Header } from "../atoms/Header";
import { TExperience } from "../../types";
import { usePortfolio } from "../../context/PortfolioContext";
import { cleanCompanyDisplayName } from "../../utils/icons";
import { useSectionScrub } from "../../hooks/useSectionScrub";

const ExperienceCard: React.FC<TExperience> = (experience) => {
  const company = cleanCompanyDisplayName(experience.companyName);
  const metaParts = [company, experience.location].filter(Boolean);
  const companyLine = metaParts.join(" · ");
  const focusLine =
    experience.subtitle?.trim() ||
    (experience.location ? undefined : company);

  return (
    <VerticalTimelineElement
      contentStyle={{
        background: "var(--color-timeline-card)",
        color: "var(--color-fg)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--color-card-shadow)",
      }}
      contentArrowStyle={{
        borderRight: "7px solid var(--color-timeline-arrow)",
      }}
      date={experience.date}
      iconStyle={{ background: experience.iconBg }}
      icon={
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
          <img
            src={experience.icon}
            alt={`${company} logo`}
            className="h-[70%] w-[70%] object-contain"
            loading="lazy"
          />
        </div>
      }
    >
      <div>
        <h3 className="text-[22px] font-bold leading-snug text-fg sm:text-[24px]">
          {experience.title}
        </h3>
        <p
          className="text-secondary text-[15px] font-semibold sm:text-[16px]"
          style={{ margin: 0 }}
        >
          {companyLine}
        </p>
        {focusLine && focusLine !== companyLine && (
          <p
            className="text-secondary mt-1 text-[13px] font-medium tracking-wide"
            style={{ marginBottom: 0 }}
          >
            {focusLine}
          </p>
        )}
      </div>

      <ul className="ml-5 mt-5 list-disc space-y-2">
        {experience.points.map((point, index) => (
          <li
            key={`experience-point-${index}`}
            className="text-white-100 pl-1 text-[14px] leading-relaxed tracking-wider"
          >
            {point}
          </li>
        ))}
      </ul>
    </VerticalTimelineElement>
  );
};

const Experience = () => {
  const { data } = usePortfolio();
  const { config, experiences } = data;
  const scrubRef = useRef<HTMLDivElement>(null);
  useSectionScrub(scrubRef, { itemSelector: "[data-scrub-item]" });

  return (
    <>
      <Header useMotion={true} {...config.sections.experience} />

      <div className="mt-20 flex flex-col" ref={scrubRef}>
        {experiences.length === 0 ? (
          <p className="text-secondary text-center text-[16px]">
            No experience added yet. Open Customize to add roles or upload a resume.
          </p>
        ) : (
          <VerticalTimeline>
            {experiences.map((experience, index) => (
              <div key={index} data-scrub-item>
                <ExperienceCard {...experience} />
              </div>
            ))}
          </VerticalTimeline>
        )}
      </div>
    </>
  );
};

export default SectionWrapper(Experience, "work");
