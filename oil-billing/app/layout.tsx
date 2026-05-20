import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oil Billing App",
  description: "Oil billing and customer management app",

  manifest: "/manifest.webmanifest",

  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },

  themeColor: "#ff7a1a",
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