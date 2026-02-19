import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdkdrift.vercel.app"),
  title: {
    default: "SDKDrift",
    template: "%s | SDKDrift"
  },
  description: "Detect OpenAPI-to-SDK drift before users do.",
  openGraph: {
    title: "SDKDrift",
    description: "Never ship a stale SDK again.",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "SDKDrift",
    description: "Detect OpenAPI-to-SDK drift before users do."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
