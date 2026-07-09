import type { TPortfolioData } from "../types/portfolio";
import {
  backend,
  creator,
  css,
  docker,
  figma,
  git,
  html,
  javascript,
  mobile,
  mongodb,
  nodejs,
  reactjs,
  redux,
  tailwind,
  threejs,
  typescript,
  web,
} from "../assets";
import {
  makeInitialsIcon,
  makeProjectPlaceholder,
} from "../utils/icons";

export const STORAGE_KEY = "portfolio-config-v1";

/** Generic placeholder companies — no real brand trademarks. */
const companyIcon = (name: string, color: string) =>
  makeInitialsIcon(name, color);

export const defaultPortfolioData: TPortfolioData = {
  config: {
    html: {
      title: "Pradeep Singh — 3D Portfolio",
      fullName: "Pradeep Singh",
      email: "pradeepsingh1994@gmail.com",
    },
    hero: {
      name: "Pradeep",
      p: ["I build production-ready", "full stack web applications"],
    },
    contact: {
      p: "Get in touch",
      h2: "Contact.",
      form: {
        name: {
          span: "Your Name",
          placeholder: "What's your name?",
        },
        email: { span: "Your Email", placeholder: "What's your email?" },
        message: {
          span: "Your Message",
          placeholder: "What do you want to say?",
        },
      },
    },
    sections: {
      about: {
        p: "Introduction",
        h2: "Overview.",
        content:
          "Full stack software engineer with 8 years of experience building and operating production web applications with React, TypeScript, Node.js, and AWS. I ship generative AI features, design-system components, and accessibility improvements for SaaS products — with ownership from design through operational support.",
      },
      experience: {
        p: "What I have done so far",
        h2: "Work Experience.",
      },
      feedbacks: {
        p: "What others say",
        h2: "Testimonials.",
      },
      works: {
        p: "My work",
        h2: "Projects.",
        content:
          "Selected projects that highlight production impact across hiring platforms, marketplace integrations, and full-stack product work. Each item reflects real engineering ownership and measurable outcomes.",
      },
    },
  },
  navLinks: [
    { id: "about", title: "About" },
    { id: "work", title: "Work" },
    { id: "contact", title: "Contact" },
  ],
  services: [
    { title: "Full Stack Developer", icon: web },
    { title: "Frontend Developer", icon: mobile },
    { title: "Backend Developer", icon: backend },
    { title: "AI Engineer", icon: creator },
  ],
  technologies: [
    { name: "HTML 5", icon: html },
    { name: "CSS 3", icon: css },
    { name: "JavaScript", icon: javascript },
    { name: "TypeScript", icon: typescript },
    { name: "React JS", icon: reactjs },
    { name: "Redux Toolkit", icon: redux },
    { name: "Tailwind CSS", icon: tailwind },
    { name: "Node JS", icon: nodejs },
    { name: "MongoDB", icon: mongodb },
    { name: "Three JS", icon: threejs },
    { name: "git", icon: git },
    { name: "figma", icon: figma },
    { name: "docker", icon: docker },
  ],
  experiences: [
    {
      title: "Staff Engineer",
      companyName: "Netskope",
      icon: companyIcon("Netskope", "#383E56"),
      iconBg: "#383E56",
      date: "Dec 2025 – Jun 2026",
      points: [
        "Designed and implemented DRM services for policy and profile management with dependency validation across backend systems.",
        "Integrated Microsoft Teams via Bot Framework for automated incident reporting and enterprise security product APIs.",
      ],
    },
    {
      title: "Software Development Engineer 2",
      companyName: "HackerRank",
      icon: companyIcon("HackerRank", "#E6DEDD"),
      iconBg: "#E6DEDD",
      date: "Nov 2022 – Dec 2025",
      points: [
        "Led redesign of the test-taking experience in React and TypeScript, including proctoring flows and generative AI features.",
        "Built 20+ reusable design-system components with light/dark themes and improved WCAG accessibility across dozens of pages.",
      ],
    },
    {
      title: "Senior Engineer",
      companyName: "Nagarro",
      icon: companyIcon("Nagarro", "#915EFF"),
      iconBg: "#915EFF",
      date: "Nov 2021 – Oct 2022",
      points: [
        "Migrated a large portion of a legacy platform from Angular to React, improving performance across financial modules.",
        "Implemented internationalization for four languages and partnered directly with clients on feature delivery.",
      ],
    },
    {
      title: "Software Developer",
      companyName: "Cedcoss Technologies",
      icon: companyIcon("Cedcoss", "#151030"),
      iconBg: "#151030",
      date: "Jun 2018 – Nov 2021",
      points: [
        "Developed multiple live e-commerce applications with React, Redux, Node.js, and MongoDB.",
        "Built marketplace integrations and reduced cloud costs by migrating log/message processing workloads.",
      ],
    },
  ],
  // Empty by default — add via configurator when you have real quotes.
  testimonials: [],
  projects: [
    {
      name: "Hiring Platform Experience",
      description:
        "Design-system work, light/dark themes, and generative AI features integrated into an interview panel for a global SaaS hiring product.",
      tags: [
        { name: "react", color: "blue-text-gradient" },
        { name: "typescript", color: "green-text-gradient" },
        { name: "openai", color: "pink-text-gradient" },
      ],
      image: makeProjectPlaceholder("Hiring Platform", 0),
      sourceCodeLink: "https://github.com/FlashDev94",
    },
    {
      name: "Commerce Modules",
      description:
        "Dynamic forms, bundle builders, and payment integrations built with Next.js and Node.js for multi-brand commerce experiences.",
      tags: [
        { name: "nextjs", color: "blue-text-gradient" },
        { name: "nodejs", color: "green-text-gradient" },
        { name: "payments", color: "pink-text-gradient" },
      ],
      image: makeProjectPlaceholder("Commerce Modules", 1),
      sourceCodeLink: "https://github.com/FlashDev94",
    },
    {
      name: "Marketplace Integrations",
      description:
        "Full-stack product, order, and shipment workflows with real-time processing via message queues for major marketplaces.",
      tags: [
        { name: "react", color: "blue-text-gradient" },
        { name: "nodejs", color: "green-text-gradient" },
        { name: "mongodb", color: "pink-text-gradient" },
      ],
      image: makeProjectPlaceholder("Marketplace", 2),
      sourceCodeLink: "https://github.com/FlashDev94",
    },
  ],
  meta: {
    phone: "+91-9140082515",
    location: "Bengaluru, India",
    linkedin: "https://linkedin.com/in/pradeeps-dev",
    github: "https://github.com/FlashDev94",
  },
};
