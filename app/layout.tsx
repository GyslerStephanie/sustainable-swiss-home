import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sustainable Swiss Home — Reimagine",
  description:
    "Reimagine, renovate and finance sustainable Minergie homes in Zürich — live cost, energy and carbon impact as you redesign.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
