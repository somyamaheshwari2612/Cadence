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
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        // Deep obsidian blacks layered with rich dark forest tones
        obsidian: {
          950: "#020403",
          900: "#030704",
          850: "#050b06",
          800: "#07120a",
          750: "#0a170e",
          700: "#0e1f13",
        },
        background: "#030704",
        surface: "#07120a",
        "surface-card": "rgba(7, 18, 11, 0.75)",
        "surface-border": "rgba(16, 185, 129, 0.15)",
        
        // Comprehensive Emerald & Jade green palette
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        accent: {
          mint: "#6ee7b7",
          lime: "#a3e635",
          amber: "#f59e0b",
          rose: "#f43f5e",
        }
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 30px -5px rgba(16, 185, 129, 0.25)",
        "glow-bright": "0 0 35px -2px rgba(52, 211, 153, 0.35)",
        "glow-subtle": "0 0 20px -5px rgba(16, 185, 129, 0.12)",
        "glow-amber": "0 0 25px -5px rgba(245, 158, 11, 0.25)",
      }
    },
  },
  plugins: [],
};
export default config;
