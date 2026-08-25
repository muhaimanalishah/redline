import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif-4",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Redline Editor",
  description: "Distraction-free Markdown editor with revision redlines and eye-friendly themes",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("redline-theme");
    var theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${sourceSerif4.variable} ${ibmPlexMono.variable} ${plusJakartaSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          offset={20}
          expand={false}
          toastOptions={{
            duration: 2500,
            style: {
              background: "var(--float-bg)",
              color: "var(--ink)",
              border: "1px solid var(--float-border)",
              boxShadow: "var(--shadow-md)",
            },
          }}
        />
      </body>
    </html>
  );
}

