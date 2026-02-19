import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SDKDrift",
  description: "Detect OpenAPI-to-SDK drift before users do."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
