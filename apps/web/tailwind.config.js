/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B2D",
        paper: "#FAF7F2",
        accent: "#F26A1B",
        trust: "#0E9F6E",
        slate2: "#64748B",
      },
      borderRadius: { card: "12px", btn: "10px" },
      spacing: { 18: "4.5rem" },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
