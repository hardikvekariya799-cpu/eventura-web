import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventura – CEO Console",
  description: "Internal operations console for Eventura",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
