import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sprix: {
          blue: "#01008A",
          "blue-dark": "#000066",
          "blue-deep": "#00004D",
          "blue-light": "#F4F7FC",
          "blue-subtle": "#E8EFF9",
          "blue-border": "#C7D7F0",
          pink: "#FF0198",
          "pink-hover": "#E60087",
          "pink-light": "#FFF0F8",
          "pink-subtle": "#FFE0F3",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 25px -5px rgba(1, 0, 138, 0.08), 0 8px 10px -6px rgba(1, 0, 138, 0.04)",
        modal: "0 20px 35px -5px rgba(1, 0, 138, 0.15), 0 10px 10px -5px rgba(1, 0, 138, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
