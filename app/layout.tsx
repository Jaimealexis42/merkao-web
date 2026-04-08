import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Merkao — El marketplace peruano",
  description: "Compra y vende en Perú. Millones de productos con envío a todo el país.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.className} h-full antialiased`}>
      <head>
        <Script src="https://checkout.culqi.com/js/v4" strategy="beforeInteractive" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-100">{children}</body>
    </html>
  );
}
