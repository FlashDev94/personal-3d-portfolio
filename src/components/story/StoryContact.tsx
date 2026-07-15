import { FormEvent, useRef, useState } from "react";
import { MdArrowOutward, MdCopyright } from "react-icons/md";
import emailjs from "@emailjs/browser";
import { usePortfolio } from "../../context/PortfolioContext";

/**
 * Footer / contact — Akash 3-column layout (Connect | Social | Credit)
 * plus a full-width form row underneath (platform need, not crammed into col 1).
 */
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

  const socials: { label: string; href: string }[] = [];
  if (meta.github) socials.push({ label: "GitHub", href: meta.github });
  if (meta.linkedin) socials.push({ label: "LinkedIn", href: meta.linkedin });
  if (config.html.email)
    socials.push({ label: "Email", href: `mailto:${config.html.email}` });

  return (
    <footer className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>{config.contact.h2?.replace(/\.$/, "") || "Contact"}</h3>

        <div className="contact-flex">
          {/* Col 1 — Connect (text only, matches reference) */}
          <div className="contact-box contact-box-connect">
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
            ) : (
              <p className="contact-muted">Add email in Customize</p>
            )}
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
          </div>

          {/* Col 2 — Social links with outward arrows */}
          <div className="contact-box contact-box-social">
            <h4>Social</h4>
            {socials.length === 0 ? (
              <p className="contact-muted">Add social links in Customize</p>
            ) : (
              socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer"
                  data-cursor="disable"
                  className="contact-social"
                >
                  <span>{s.label}</span>
                  <MdArrowOutward aria-hidden />
                </a>
              ))
            )}
          </div>

          {/* Col 3 — Credit */}
          <div className="contact-box contact-box-credit">
            <h2>
              Designed and Developed <br /> by <span>{name}</span>
            </h2>
            <h5>
              <MdCopyright aria-hidden /> {year}
            </h5>
          </div>
        </div>

        {/* Form full-width under the three columns */}
        <div className="contact-form-panel">
          <h4 className="contact-form-title">Send a message</h4>
          {config.contact.p ? (
            <p className="contact-form-lead">{config.contact.p}</p>
          ) : null}
          <form
            ref={formRef}
            className="akash-contact-form"
            onSubmit={onSubmit}
            noValidate={false}
          >
            <div className="akash-contact-form-row">
              <label className="akash-field">
                <span>{config.contact.form.name.span}</span>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder={config.contact.form.name.placeholder}
                />
              </label>
              <label className="akash-field">
                <span>{config.contact.form.email.span}</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder={config.contact.form.email.placeholder}
                />
              </label>
            </div>
            <label className="akash-field">
              <span>{config.contact.form.message.span}</span>
              <textarea
                name="message"
                required
                rows={4}
                placeholder={config.contact.form.message.placeholder}
              />
            </label>
            <div className="akash-contact-form-actions">
              <button type="submit" data-cursor="disable" disabled={loading}>
                {loading ? "Sending…" : "Send message"}
              </button>
              {status ? (
                <p className="contact-form-status" role="status">
                  {status}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </footer>
  );
};

export default StoryContact;
