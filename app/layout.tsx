import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.flowpaydr.com"),

  title: {
    default: "FlowPayDR Booking",
    template: "%s | FlowPayDR Booking",
  },

  description:
    "Reservas fáciles para clientes y negocios. Encuentra negocios y profesionales, reserva citas online y administra servicios, clientes y horarios con FlowPayDR Booking.",

  applicationName: "FlowPayDR Booking",

  openGraph: {
    title: "FlowPayDR Booking",
    description:
      "Reserva citas online con negocios y profesionales. Fácil para el cliente y fácil para el negocio.",
    url: "https://www.flowpaydr.com",
    siteName: "FlowPayDR Booking",
    type: "website",
    locale: "es_DO",

    images: [
      {
        url: "/flowpaydr-preview.png",
        width: 1200,
        height: 630,
        alt: "FlowPayDR Booking",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "FlowPayDR Booking",
    description:
      "Reserva citas online con negocios y profesionales de forma fácil y rápida.",
    images: ["/flowpaydr-preview.png"],
  },

  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>

      <body className="min-h-screen bg-gray-100">
        <div className="flex flex-col min-h-screen">{children}</div>
      </body>
    </html>
  );
}