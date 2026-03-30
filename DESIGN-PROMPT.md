## Design Prompt For FamiljDokument

Use this prompt with an AI coding assistant to redesign the frontend of this repo:

```text
You are improving the visual design of an existing web app called FamiljDokument.

Context:
- The app is a private family document archive for receipts and documents.
- It is built with React, Vite, Tailwind CSS, and shadcn-style UI components.
- The app is mobile-first and should feel excellent on phones, while still looking polished on desktop.
- Existing pages include login, dashboard, upload, gallery, trash, and document view.
- The current design is clean but too plain and utility-focused. I want it to feel more premium, calm, trustworthy, and intentionally designed.

Design goals:
- Keep the app simple, safe, and easy for non-technical family members.
- Create a warm Scandinavian-inspired interface with a premium archival feel.
- Make the product feel more like a thoughtful family vault than an admin panel.
- Increase visual hierarchy, whitespace, typography quality, card treatment, and page structure.
- Keep accessibility strong: good contrast, clear focus states, readable text, and touch-friendly controls.

Visual direction:
- Use a calm, elegant palette built around soft paper tones, muted slate, deep forest/teal accents, and subtle warm highlights.
- Avoid generic SaaS styling, flat white surfaces, and overly bright colors.
- Avoid purple-heavy gradients and avoid making it look like a finance dashboard.
- Use layered backgrounds, soft depth, tasteful borders, and restrained shadows.
- Typography should feel refined and editorial, not default. Keep body text highly readable.
- Add a subtle “archival” character: document-inspired surfaces, gallery framing, and careful spacing.

Product-specific UX goals:
- Login page should feel welcoming, secure, and premium.
- Dashboard should have a stronger hero/welcome section, better grouping of stats, and more intentional quick actions.
- Upload page should feel guided and reassuring, especially around camera/file upload.
- Gallery should feel more like a curated library than a raw file grid.
- Empty states should be elegant and encouraging rather than generic.
- Mobile bottom navigation and header should feel more polished and integrated into the theme.

Implementation constraints:
- Preserve the existing app structure and routing.
- Reuse the existing component system where reasonable instead of replacing everything.
- Keep the current functionality intact.
- Prefer improving layout, styling, and composition over rewriting logic.
- Use CSS variables and Tailwind classes in a clean, maintainable way.
- Maintain both light and dark mode, but make light mode the strongest, most polished experience.
- Make the design consistent across login, dashboard, upload, gallery, and document detail views.

What I want you to do:
1. Review the current frontend structure and identify the main visual weaknesses.
2. Propose a cohesive visual direction tailored to this app.
3. Implement the redesign directly in the relevant frontend files.
4. Improve spacing, typography, surfaces, cards, buttons, header, navigation, and page-level composition.
5. Add tasteful background treatments and subtle motion where it improves perceived quality.
6. Keep the result realistic, production-friendly, and not overdesigned.

Important:
- Do not produce an “AI-generic” redesign.
- Do not break the mobile experience.
- Do not introduce heavy animations or visual noise.
- Do not remove clarity in the name of style.
- Favor a confident, crafted look over a flashy one.

When done, summarize:
- the visual concept,
- which files were changed,
- and the biggest UX/design improvements.
```

Shorter version:

```text
Redesign this React + Vite + Tailwind family document app to feel premium, calm, and beautifully structured. Keep it mobile-first, preserve functionality and routing, and reuse the existing shadcn-style component system. Aim for a warm Scandinavian archival aesthetic with soft paper-like backgrounds, muted slate tones, deep teal/forest accents, refined typography, tasteful shadows, stronger visual hierarchy, and more polished cards, navigation, forms, and empty states. Make the dashboard feel welcoming, the upload flow guided, the gallery curated, and the login page secure and elegant. Avoid generic SaaS styling, purple gradients, flat white layouts, and overdesigned effects. Improve the existing frontend files directly and keep the result accessible, production-friendly, and cohesive in both light and dark mode.
```
