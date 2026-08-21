import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Redline Editor",
  description: "Distraction-free Markdown editor with revision redlines and eye-friendly themes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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

