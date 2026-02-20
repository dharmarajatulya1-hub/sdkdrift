import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdkdrift.vercel.app"),
  title: {
    default: "SDKDrift",
    template: "%s | SDKDrift"
  },
  description: "Detect SDK drift between OpenAPI and generated clients before production.",
  openGraph: {
    title: "SDKDrift",
    description: "Detect SDK drift before users do.",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "SDKDrift",
    description: "Detect SDK drift between OpenAPI and generated clients."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
