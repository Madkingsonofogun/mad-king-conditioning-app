import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mad King Conditioning",
  description: "Coaching app for combat sports and personal training",
  icons: {
    icon: "/mad-king-conditioning.png",
    apple: "/mad-king-conditioning.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
