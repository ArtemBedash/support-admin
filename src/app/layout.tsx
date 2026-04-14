import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const heading = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "New Era AI Support Board",
  description: "Luxury-style admin panel for Telegram support messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // CSS-переменные шрифтов выставляются на уровне html и используются в globals.css.
    <html lang="ru" className={`${heading.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
