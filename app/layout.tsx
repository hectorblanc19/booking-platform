import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowPayDR",
  description: "Booking platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>

      <body className="min-h-screen bg-gray-100 flex flex-col">
        {children}

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                window.addEventListener("load", async () => {
                  try {
                    const registration = await navigator.serviceWorker.register("/sw.js");

                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") return;

                    const subscription = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: "${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}"
                    });

                    const role = localStorage.getItem("flowpay_role");
                    const userId = localStorage.getItem("flowpay_user_id");

                    if (role && userId) {
                      await fetch("/api/push/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId,
                          role,
                          subscription
                        })
                      });
                    }
                  } catch (err) {
                    console.error("SW registration failed:", err);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
