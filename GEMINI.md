# GEMINI.md

## Frontend & Client-Side Directives

- **Styling:** Strictly use Vanilla CSS via `public/assets/css/style.css`. No external CSS frameworks (e.g., Tailwind, Bootstrap). Maintain a cohesive visual design consistent with existing assets.
- **Client-Side Logic:** Keep browser-side JavaScript in `public/assets/js/script.js` minimal and unobtrusive. Ensure compatibility with the rendered EJS views.
- **Templates:** Use EJS files in the `views/` directory. Maintain clean separation between layouts and partials (e.g., `views/partials/`).
- **Performance:** Optimize image assets (found in `public/assets/img/`) and minimize CSS/JS load times.
- **Accessibility:** Ensure semantic HTML usage in EJS templates to maintain accessibility standards.
- **Consistency:** Use consistent naming conventions and spacing across all UI elements. If introducing new UI patterns, ensure they integrate seamlessly with the existing design system.
