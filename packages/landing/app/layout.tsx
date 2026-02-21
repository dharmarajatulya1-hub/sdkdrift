import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdkdrift.vercel.app"),
  title: {
    default: "SDKDrift",
    template: "%s | SDKDrift"
  },
  description: "Detect SDK drift before users do. OpenAPI vs SDK contract validation for CI teams.",
  openGraph: {
    title: "SDKDrift",
    description: "Catch missing endpoints, param drift, and spec-SDK mismatches before release.",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "SDKDrift",
    description: "SDK contract checks for CI and release gating."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
