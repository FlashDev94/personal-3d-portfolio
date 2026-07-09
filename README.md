# Personal 3D Portfolio

A configurable **React + Three.js** portfolio you can own and extend. Upload a PDF resume to auto-fill sections, or edit everything in the built-in configurator. Configuration is stored in the browser (`localStorage`).

> **Personal repo:** [FlashDev94/personal-3d-portfolio](https://github.com/FlashDev94/personal-3d-portfolio)

## Features

- Interactive 3D hero (desktop PC model) and contact globe
- **Resume PDF upload** — client-side parsing (no server upload)
- **Portfolio configurator** — profile, about, experience, skills (with **configurable icons**), projects, testimonials
- JSON import/export for backup and multi-device use
- Responsive layout; EmailJS-ready contact form

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`), then click **Customize** (bottom-right).

```bash
npm run build      # production build
npm run preview    # preview production build
npm run ts:check   # typecheck
npm run test:parser  # resume parser smoke test (sample PDF)
```

## Customize your portfolio

1. Click **Customize**
2. **Resume Upload** → choose a PDF or **Load sample resume**
3. Review **Profile / Experience / Skills / Projects**
4. For each skill, pick an icon (auto, built-in set, initials, upload, or URL)
5. Click **Apply to portfolio**

Sample resume ships at `public/sample-resume.pdf` (also mirrored as `pradeep_singh_fullstack.pdf` in the repo root for reference).

### EmailJS (optional)

Create a `.env` file:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_ACCESS_TOKEN=your_public_key
```

Without these, the contact form shows a clear configuration message instead of failing silently.

## Trademark & content policy

This is a **personal portfolio** repository. Defaults and demo assets avoid third-party brand logos (no Starbucks / Tesla / Meta / Shopify logo assets).

- Employer and product names that appear in **your resume** are factual career history only.
- They do **not** imply endorsement by those organizations.
- Prefer initials badges or your own icons for companies and projects.

## Project structure

```text
src/
  components/
    canvas/          # Three.js canvases (PC, Earth, balls, stars)
    configurator/    # Portfolio Configurator UI
    sections/        # Hero, About, Experience, Tech, Works, Contact
  constants/         # defaults, styles
  context/           # PortfolioProvider + localStorage
  utils/
    resumeParser.ts  # PDF text extraction + structured parse
    icons.ts         # tech/company/project icon helpers
public/
  desktop_pc/        # 3D model
  planet/            # 3D globe
  sample-resume.pdf
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve `dist/` |
| `npm run lint` | ESLint |
| `npm run test:parser` | Smoke-test resume parser against sample PDF |

## License & attribution

MIT — see [LICENSE](./LICENSE).

This project is derived from an open-source 3D portfolio template originally published under the MIT License (copyright Liron Abutbul). This fork rebrands the project for personal use, removes trademarked demo brand assets, and adds resume-driven configuration. The original copyright notice is retained as required by MIT.

## Contributing

Development on this repo follows a **pull-request workflow**:

1. Create a feature branch from `main`
2. Open a PR with a clear summary
3. Merge after review / CI checks
