import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const outfit = Outfit({
  variable: "--font-landing",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteDescription =
  "An AI assistant built for sharp thinking - with room to create, launch, and explore.";

export const metadata: Metadata = {
  title: "Another Intelligence",
  description: siteDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Another Intelligence",
    description: siteDescription,
    type: "website",
    siteName: "Another Intelligence",
  },
  twitter: {
    card: "summary_large_image",
    title: "Another Intelligence",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} ${outfit.variable} min-h-dvh bg-[#121214] text-zinc-100 antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
