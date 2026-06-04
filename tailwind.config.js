/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          violet: "#8B3FD6",
          orange: "#F5921E",
          magenta: "#EC2D8E",
          blue: "#2E7FE8",
        },
        light: {
          bg: "#F7F7F9",
          card: "#FFFFFF",
          text: "#1B1B1F",
        },
        dark: {
          bg: "#121212",
          card: "#1E1E1E",
          text: "#F7F7F9",
        },
      },
    },
  },
  plugins: [],
};
