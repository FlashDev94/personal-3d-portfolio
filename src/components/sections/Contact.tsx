import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";

import { EarthCanvas } from "../canvas";
import { SectionWrapper } from "../../hoc";
import { slideIn } from "../../utils/motion";
import { Header } from "../atoms/Header";
import { usePortfolio } from "../../context/PortfolioContext";

const emailjsConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  accessToken: import.meta.env.VITE_EMAILJS_ACCESS_TOKEN,
};

const Contact = () => {
  const { data } = usePortfolio();
  const { config } = data;
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !emailjsConfig.serviceId ||
      !emailjsConfig.templateId ||
      !emailjsConfig.accessToken
    ) {
      alert(
        "Contact form is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_ACCESS_TOKEN."
      );
      return;
    }

    setLoading(true);

    emailjs
      .send(
        emailjsConfig.serviceId,
        emailjsConfig.templateId,
        {
          form_name: form.name,
          to_name: config.html.fullName,
          from_email: form.email,
          to_email: config.html.email,
          message: form.message,
        },
        emailjsConfig.accessToken
      )
      .then(
        () => {
          setLoading(false);
          alert("Thank you. I will get back to you as soon as possible.");
          setForm({ name: "", email: "", message: "" });
        },
        (error) => {
          setLoading(false);
          console.error(error);
          alert("Something went wrong. Please try again later.");
        }
      );
  };

  const hasMeta =
    data.meta.phone ||
    data.meta.location ||
    data.meta.linkedin ||
    data.meta.github;

  return (
    <div className="flex flex-col-reverse gap-10 overflow-hidden xl:mt-12 xl:flex-row xl:items-stretch">
      <motion.div
        variants={slideIn("left", "tween", 0.2, 1)}
        className="bg-black-100 flex-[0.75] rounded-2xl p-8"
      >
        <Header useMotion={false} {...config.contact} />

        {hasMeta && (
          <div className="text-secondary mt-4 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            {data.meta.location && (
              <span className="whitespace-nowrap">{data.meta.location}</span>
            )}
            {data.meta.phone && (
              <a
                className="whitespace-nowrap text-[#915EFF] hover:underline"
                href={`tel:${data.meta.phone.replace(/\s/g, "")}`}
              >
                {data.meta.phone}
              </a>
            )}
            {data.meta.linkedin && (
              <a
                className="whitespace-nowrap text-[#915EFF] hover:underline"
                href={
                  data.meta.linkedin.startsWith("http")
                    ? data.meta.linkedin
                    : `https://${data.meta.linkedin}`
                }
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            )}
            {data.meta.github && (
              <a
                className="whitespace-nowrap text-[#915EFF] hover:underline"
                href={
                  data.meta.github.startsWith("http")
                    ? data.meta.github
                    : `https://${data.meta.github}`
                }
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            )}
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mt-12 flex flex-col gap-8"
        >
          {Object.keys(config.contact.form).map((input) => {
            const { span, placeholder } =
              config.contact.form[input as keyof typeof config.contact.form];
            const Component = input === "message" ? "textarea" : "input";

            return (
              <label key={input} className="flex flex-col">
                <span className="mb-4 font-medium text-white">{span}</span>
                <Component
                  type={input === "email" ? "email" : "text"}
                  name={input}
                  value={form[input as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="bg-tertiary placeholder:text-secondary rounded-lg border-none px-6 py-4 font-medium text-white outline-none"
                  {...(input === "message" && { rows: 7 })}
                />
              </label>
            );
          })}
          <button
            type="submit"
            className="bg-tertiary shadow-primary w-fit rounded-xl px-8 py-3 font-bold text-white shadow-md outline-none"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </motion.div>

      {/* Fixed aspect/height so the globe keeps a correct ratio on all breakpoints */}
      <motion.div
        variants={slideIn("right", "tween", 0.2, 1)}
        className="relative mx-auto h-[320px] w-full max-w-[520px] md:h-[450px] xl:mx-0 xl:h-auto xl:min-h-[500px] xl:max-w-none xl:flex-1"
      >
        <div className="absolute inset-0 xl:relative xl:h-full xl:min-h-[500px]">
          <EarthCanvas />
        </div>
      </motion.div>
    </div>
  );
};

export default SectionWrapper(Contact, "contact");
