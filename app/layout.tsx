import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Merkao — El marketplace peruano",
  description: "Compra y vende en Perú. Millones de productos con envío a todo el país.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.className} h-full antialiased`}>
      <head>
        <Script src="https://checkout.culqi.com/js/v4" strategy="beforeInteractive" />
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        {children}
        <Script id="tawkto" strategy="afterInteractive">
          {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/69d7917a03af4e1c38194370/1jlp10hp1';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
