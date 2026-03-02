import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: "#faf7f2",
                white: "#fff",
                terra: "#f4845f",
                "terra-d": "#e06a43",
                sun: "#f9c74f",
                text: "#1a1a1a",
                body: "#6b6560",
                muted: "#b0a89e",
                filled: "#2d2d2d",
                crossed: "#d4c9bc",
                empty: "#ede8e1",
                bdr: "#ede8e1",
                ok: "#4caf88",
                warn: "#f9c74f",
                err: "#f4845f",
            },
            fontFamily: {
                sans: ["var(--font-dm-sans)"],
                serif: ["var(--font-fraunces)"],
                mono: ["var(--font-dm-mono)"],
                caveat: ["var(--font-caveat)"],
            },
            boxShadow: {
                DEFAULT: "0 2px 16px rgba(0, 0, 0, .07)",
                lg: "0 8px 32px rgba(0, 0, 0, .1)",
                xl: "0 4px 32px rgba(0, 0, 0, .1)",
            },
            borderRadius: {
                DEFAULT: "12px",
                lg: "20px",
                xl: "24px",
            }
        },
    },
    plugins: [],
};
export default config;
