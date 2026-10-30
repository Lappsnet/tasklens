/** @type {import('tailwindcss').Config} */
const withVars = (name) => `var(--${name})`;

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blueprint tokens (U1). Legacy aliases kept so pre-U7 screens keep working.
        bg: withVars("bg"),
        surface: withVars("surface"),
        ink: withVars("ink"),
        muted: withVars("muted"),
        line: withVars("line"),
        blueprint: withVars("blueprint"),
        signal: withVars("signal"),
        verified: withVars("verified"),
        warning: withVars("warning"),
        paper: withVars("bg"),
        accent: withVars("signal"),
        trust: withVars("verified"),
        slate2: withVars("muted"),
      },
      borderRadius: { card: "16px", btn: "10px", input: "6px", sheet: "28px" },
      spacing: { 18: "4.5rem" },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lifted: "var(--shadow-lifted)",
      },
      transitionDuration: { 120: "120ms", 200: "200ms", 320: "320ms", 600: "600ms" },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
