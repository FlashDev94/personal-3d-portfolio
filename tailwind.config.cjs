/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        tertiary: "var(--color-tertiary)",
        "black-100": "var(--color-black-100)",
        "black-200": "var(--color-black-200)",
        "white-100": "var(--color-white-100)",
        fg: "var(--color-fg)",
        "fg-muted": "var(--color-fg-muted)",
      },
      boxShadow: {
        card: "var(--color-card-shadow)",
      },
      screens: {
        xs: "450px",
      },
      backgroundImage: {
        "hero-pattern": "url('/src/assets/herobg.png')",
      },
    },
  },
  plugins: [],
};
