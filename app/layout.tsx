import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventura OS – Internal Console",
  description: "Eventura OS for CEO, Core Team and Staff",
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
