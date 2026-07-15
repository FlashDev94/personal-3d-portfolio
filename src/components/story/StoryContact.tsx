import { FormEvent, useRef, useState } from "react";
import { MdArrowOutward, MdCopyright } from "react-icons/md";
import emailjs from "@emailjs/browser";
import { usePortfolio } from "../../context/PortfolioContext";

const StoryContact = () => {
  const { data } = usePortfolio();
  const { config, meta } = data;
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const year = new Date().getFullYear();
  const name = config.html.fullName || config.hero.name;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    setLoading(true);
    setStatus(null);
    try {
      // Optional: only works if env vars set; otherwise soft-fail with mailto
      const service = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const template = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const key = import.meta.env.VITE_EMAILJS_ACCESS_TOKEN;
      if (service && template && key) {
        const fd = new FormData(formRef.current);
        await emailjs.send(
          service,
          template,
          {
            form_name: String(fd.get("name") || ""),
            to_name: config.html.fullName,
            from_email: String(fd.get("email") || ""),
            to_email: config.html.email,
            message: String(fd.get("message") || ""),
          },
          key
        );
        setStatus("Message sent — thanks!");
        formRef.current.reset();
      } else if (config.html.email) {
        const fd = new FormData(formRef.current);
        const body = encodeURIComponent(String(fd.get("message") || ""));
        const subject = encodeURIComponent(
          `Portfolio contact from ${fd.get("name") || "visitor"}`
        );
        window.location.href = `mailto:${config.html.email}?subject=${subject}&body=${body}`;
        setStatus("Opening your mail client…");
      } else {
        setStatus("Add an email in Customize → Profile to enable contact.");
      }
    } catch {
      setStatus("Could not send — try again or use the links.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>{config.contact.h2 || "Contact"}</h3>
        <div className="contact-flex">
          <div className="contact-box">
            <h4>Connect</h4>
            {meta.linkedin ? (
              <p>
                <a
                  href={meta.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="disable"
                >
                  LinkedIn
                </a>
              </p>
            ) : null}
            {config.html.email ? (
              <p>
                <a href={`mailto:${config.html.email}`} data-cursor="disable">
                  {config.html.email}
                </a>
              </p>
            ) : null}
            {meta.location ? (
              <>
                <h4>Location</h4>
                <p>{meta.location}</p>
              </>
            ) : null}
            {meta.phone ? (
              <>
                <h4>Phone</h4>
                <p>{meta.phone}</p>
              </>
            ) : null}

            <form
              ref={formRef}
              className="akash-contact-form"
              onSubmit={onSubmit}
            >
              <input
                type="text"
                name="name"
                required
                placeholder={config.contact.form.name.placeholder}
                aria-label={config.contact.form.name.span}
              />
              <input
                type="email"
                name="email"
                required
                placeholder={config.contact.form.email.placeholder}
                aria-label={config.contact.form.email.span}
              />
              <textarea
                name="message"
                required
                rows={4}
                placeholder={config.contact.form.message.placeholder}
                aria-label={config.contact.form.message.span}
              />
              <button type="submit" data-cursor="disable" disabled={loading}>
                {loading ? "Sending…" : "Send message"}
              </button>
              {status ? <p role="status">{status}</p> : null}
            </form>
          </div>

          <div className="contact-box">
            <h4>Social</h4>
            {meta.github ? (
              <a
                href={meta.github}
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
                className="contact-social"
              >
                GitHub <MdArrowOutward />
              </a>
            ) : null}
            {meta.linkedin ? (
              <a
                href={meta.linkedin}
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
                className="contact-social"
              >
                LinkedIn <MdArrowOutward />
              </a>
            ) : null}
            {config.html.email ? (
              <a
                href={`mailto:${config.html.email}`}
                data-cursor="disable"
                className="contact-social"
              >
                Email <MdArrowOutward />
              </a>
            ) : null}
          </div>

          <div className="contact-box">
            <h2>
              Designed and Developed <br /> by <span>{name}</span>
            </h2>
            <h5>
              <MdCopyright /> {year}
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryContact;
