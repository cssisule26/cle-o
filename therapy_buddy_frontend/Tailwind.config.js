module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        fontFamily: {
          display: ["'Playfair Display'", "serif"],
          body: ["'DM Sans'", "sans-serif"],
          mono: ["'DM Mono'", "monospace"],
        },
        colors: {
          sage: {
            50: "#f4f7f4",
            100: "#e6ede6",
            200: "#cddcce",
            300: "#a9c2ab",
            400: "#7da182",
            500: "#5a845f",
            600: "#466849",
            700: "#39543c",
            800: "#2f4431",
            900: "#27382a",
          },
          cream: {
            50: "#fdfcf8",
            100: "#faf7ef",
            200: "#f4edda",
            300: "#ebdfc0",
            400: "#deca97",
          },
          stone: {
            850: "#1c1917",
          }
        },
        animation: {
          "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          "float": "float 6s ease-in-out infinite",
          "ripple": "ripple 1.5s linear infinite",
        },
        keyframes: {
          float: {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-8px)" },
          },
          ripple: {
            "0%": { transform: "scale(1)", opacity: 1 },
            "100%": { transform: "scale(2.5)", opacity: 0 },
          }
        }
      },
    },
    plugins: [],
  };