import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SupportBot — Сообщения",
  description: "Admin panel for Telegram support messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
