import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        surface: "#111827",
        "surface-card": "rgba(17, 24, 39, 0.75)",
        "surface-border": "rgba(255, 255, 255, 0.08)",
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        accent: {
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          amber: "#f59e0b",
          rose: "#f43f5e",
        }
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(16, 185, 129, 0.25)",
        "glow-amber": "0 0 25px -5px rgba(245, 158, 11, 0.25)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.25)",
      }
    },
  },
  plugins: [],
};
export default config;
