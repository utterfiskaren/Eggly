import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Eggly", template: "%s · Eggly" },
  description: "Ett spel där barn blir bättre på matte, svenska och engelska genom att ha roligt.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f3ff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-dvh">
        <a href="#innehall" className="hoppa">Hoppa till innehållet</a>
        {children}
      </body>
    </html>
  );
}
