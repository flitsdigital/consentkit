import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "dialkit/styles.css";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Consentkit",
  description: "Genereer custom.css, head- en footer-code voor het Flits cookie consent-script.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-bg text-fg">{children}</body>
    </html>
  );
}
