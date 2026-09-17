import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cookie consent configurator",
  description: "Genereer custom.css, head- en footer-code voor het Flits cookie consent-script.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full bg-neutral-100 text-neutral-900">{children}</body>
    </html>
  );
}
