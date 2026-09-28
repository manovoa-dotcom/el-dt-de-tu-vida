import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "El DT de tu vida",
  description:
    "El WhatsApp organiza el partido. La cancha genera los resultados. La app convierte esos resultados en un campeonato.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#08190f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`notranslate ${bebas.variable} ${inter.variable}`}
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>{children}</body>
    </html>
  );
}