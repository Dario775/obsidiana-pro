/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-fixed-dim": "#ffb784",
        "inverse-on-surface": "#313030",
        "surface-tint": "#d2bbff",
        "on-tertiary": "#4f2500",
        "on-tertiary-fixed": "#301400",
        "surface-container-highest": "#353534",
        "on-secondary": "#00344d",
        "on-primary": "#3f008e",
        "surface-dim": "#131313",
        "tertiary-fixed": "#ffdcc6",
        "on-secondary-container": "#00344e",
        "surface-container-lowest": "#0e0e0e",
        "on-tertiary-container": "#ffe0cd",
        "tertiary": "#ffb784",
        "inverse-surface": "#e5e2e1",
        "tertiary-container": "#a15100",
        "surface": "#131313",
        "on-surface-variant": "#ccc3d8",
        "on-primary-container": "#ede0ff",
        "primary-fixed": "#eaddff",
        "on-error": "#690005",
        "on-primary-fixed": "#25005a",
        "on-secondary-fixed": "#001e2f",
        "on-surface": "#e5e2e1",
        "surface-variant": "#353534",
        "surface-container-low": "#1c1b1b",
        "inverse-primary": "#732ee4",
        "background": "#131313",
        "surface-container-high": "#2a2a2a",
        "on-secondary-fixed-variant": "#004c6e",
        "secondary-container": "#00a2e6",
        "on-background": "#e5e2e1",
        "outline": "#958da1",
        "secondary-fixed": "#c9e6ff",
        "secondary-fixed-dim": "#89ceff",
        "primary-fixed-dim": "#d2bbff",
        "on-tertiary-fixed-variant": "#713700",
        "error-container": "#93000a",
        "secondary": "#89ceff",
        "error": "#ffb4ab",
        "on-primary-fixed-variant": "#5a00c6",
        "on-error-container": "#ffdad6",
        "primary-container": "#7c3aed",
        "surface-bright": "#393939",
        "primary": "#d2bbff",
        "surface-container": "#201f1f",
        "outline-variant": "#4a4455"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "xs": "4px",
        "xl": "40px",
        "sm": "8px",
        "md": "16px",
        "base": "4px",
        "margin": "24px",
        "lg": "24px",
        "gutter": "16px"
      },
      fontFamily: {
        "data-tabular": ["Inter"],
        "body-sm": ["Inter"],
        "headline-md": ["Inter"],
        "body-lg": ["Inter"],
        "headline-xl": ["Inter"],
        "label-md": ["Inter"]
      },
      fontSize: {
        "data-tabular": ["14px", { "lineHeight": "20px", "fontWeight": "500" }],
        "body-sm": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0em", "fontWeight": "400" }],
        "headline-xl": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }]
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries")
  ],
};
