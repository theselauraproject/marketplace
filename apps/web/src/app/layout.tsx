import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Selaura Marketplace",
  description:
    "Discover mods, addons, resource packs, worlds, and more for Minecraft Bedrock.",
};

const themeScript = `
(function () {
    try {
        const stored = localStorage.getItem("theme");

        const theme =
            stored === "light" || stored === "dark"
                ? stored
                : window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";

        document.documentElement.dataset.theme = theme;
    } catch {
        document.documentElement.dataset.theme = "light";
    }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body className={`${poppins.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Header />

          <main className="flex-1">{children}</main>

          <Footer />
        </div>
      </body>
    </html>
  );
}
