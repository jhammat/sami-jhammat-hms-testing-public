import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import {
  getWonFlowPublicAppConfiguration,
} from "@/lib/config/public-app-config.server";

import {
  ApplicationShellBoundary,
} from "@/components/shell";

import {
  PlatformAdministrationProvider,
} from "@/components/platform/platform-administration-context";

import {
  ClientStorageGuard,
} from "@/components/dev/client-storage-guard";

import {
  readSession,
} from "@/lib/auth/session-server";

import {
  WonFlowApplicationProvider,
  WonFlowRouteTransitionProvider,
  WonFlowSessionProvider,
} from "./_providers";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:
      "WonFlow Hospital Platform",
    template:
      "%s | WonFlow",
  },
  description:
    "WonFlow hospital operations and clinical care platform.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const configuration =
    getWonFlowPublicAppConfiguration();

  const session =
    await readSession();

  return (
    <html
      lang={configuration.application.defaultLocale}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ClientStorageGuard />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const marker="wonflow-data-cleanup-v1";const stalePrefix="wonflow-demo"+"-";if(localStorage.getItem(marker)!=="complete"){for(let index=localStorage.length-1;index>=0;index-=1){const key=localStorage.key(index);if(key?.startsWith(stalePrefix)){localStorage.removeItem(key)}}for(let index=sessionStorage.length-1;index>=0;index-=1){const key=sessionStorage.key(index);if(key?.startsWith(stalePrefix)){sessionStorage.removeItem(key)}}localStorage.setItem(marker,"complete")}}catch{}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("wonflow-color-theme")==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch{}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`,
          }}
        />
        <WonFlowApplicationProvider
          configuration={configuration}
        >
          <WonFlowSessionProvider
            session={session}
          >
            <PlatformAdministrationProvider>
              <WonFlowRouteTransitionProvider>
                <ApplicationShellBoundary>
                  {children}
                </ApplicationShellBoundary>
              </WonFlowRouteTransitionProvider>
            </PlatformAdministrationProvider>
          </WonFlowSessionProvider>
        </WonFlowApplicationProvider>
      </body>
    </html>
  );
}
