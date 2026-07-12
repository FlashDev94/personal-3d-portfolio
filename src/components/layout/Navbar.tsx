import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { styles } from "../../constants/styles";
import { logo, menu, close } from "../../assets";
import { usePortfolio } from "../../context/PortfolioContext";
import { clampTheme3d, resolveThemeTokens } from "../../constants/theme3d";

const Navbar = () => {
  const { data, updateData } = usePortfolio();
  const { config, navLinks } = data;
  const isLight = data.theme3d.colorMode === "light";
  const [active, setActive] = useState<string | null>();
  const [toggle, setToggle] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleColorMode = () => {
    const next = isLight ? "dark" : "light";
    const tokens = resolveThemeTokens({
      palette: data.theme3d.palette,
      colorMode: next,
    });
    updateData({
      theme3d: clampTheme3d({
        ...data.theme3d,
        colorMode: next,
        starsColor: tokens.starsDefault,
      }),
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      if (scrollTop > 100) {
        setScrolled(true);
      } else {
        setScrolled(false);
        setActive("");
      }
    };

    window.addEventListener("scroll", handleScroll);

    const navbarHighlighter = () => {
      const sections = document.querySelectorAll("section[id]");

      sections.forEach((current) => {
        const sectionId = current.getAttribute("id");
        // @ts-expect-error offsetHeight exists on HTMLElement
        const sectionHeight = current.offsetHeight;
        const sectionTop =
          current.getBoundingClientRect().top - sectionHeight * 0.2;

        if (sectionTop < 0 && sectionTop + sectionHeight > 0) {
          setActive(sectionId);
        }
      });
    };

    window.addEventListener("scroll", navbarHighlighter);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", navbarHighlighter);
    };
  }, []);

  return (
    <nav
      className={`${styles.paddingX} fixed top-0 z-20 flex w-full items-center py-5 transition-colors duration-200 ${
        scrolled ? "backdrop-blur-md" : "bg-transparent"
      }`}
      style={
        scrolled
          ? { backgroundColor: "var(--color-nav-scrolled)" }
          : undefined
      }
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => {
            window.scrollTo(0, 0);
          }}
        >
          <img src={logo} alt="logo" className="h-9 w-9 object-contain" />
          <p className="max-w-[12rem] cursor-pointer truncate text-[18px] font-bold text-fg sm:max-w-xs">
            {config.html.fullName || config.html.title}
          </p>
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          <ul className="flex list-none flex-row gap-10">
            {navLinks.map((nav) => (
              <li
                key={nav.id}
                className={`${
                  active === nav.id ? "text-fg" : "text-secondary"
                } hover:text-fg cursor-pointer text-[18px] font-medium`}
              >
                <a href={`#${nav.id}`}>{nav.title}</a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={toggleColorMode}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition hover:scale-105"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-fg)",
              background: "var(--color-tertiary)",
            }}
            aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
            title={isLight ? "Dark mode" : "Light mode"}
          >
            {isLight ? "Dark" : "Light"}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:hidden">
          <button
            type="button"
            onClick={toggleColorMode}
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-fg)",
              background: "var(--color-tertiary)",
            }}
            aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          >
            {isLight ? "Dark" : "Light"}
          </button>
          <img
            src={toggle ? close : menu}
            alt="menu"
            className={`h-[28px] w-[28px] cursor-pointer object-contain ${
              isLight ? "brightness-0" : ""
            }`}
            onClick={() => setToggle(!toggle)}
          />

          <div
            className={`${
              !toggle ? "hidden" : "flex"
            } absolute right-0 top-20 z-10 mx-4 my-2 min-w-[140px] rounded-xl border p-6`}
            style={{
              background: "var(--color-tertiary)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--color-card-shadow)",
            }}
          >
            <ul className="flex flex-1 list-none flex-col items-start justify-end gap-4">
              {navLinks.map((nav) => (
                <li
                  key={nav.id}
                  className={`font-poppins cursor-pointer text-[16px] font-medium ${
                    active === nav.id ? "text-fg" : "text-secondary"
                  }`}
                  onClick={() => {
                    setToggle(!toggle);
                  }}
                >
                  <a href={`#${nav.id}`}>{nav.title}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
