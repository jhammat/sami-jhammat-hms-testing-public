import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
  // No `icons` here on purpose. `app/icon.png` and `app/apple-icon.png` are
  // file conventions and Next serves those in preference to anything declared
  // in metadata, so declaring both means only one of them is ever true. Both
  // files used to be the 1080x1350 brand plate - the right artwork at the
  // wrong shape for a tab or a home screen - and are now square cuts of the
  // same mark the installed-app manifest uses.
  manifest: "/manifest.webmanifest",

  // iOS has no manifest support worth relying on; these are what make an
  // "Add to Home Screen" open without Safari's chrome around it.
  appleWebApp: {
    capable: true,
    title: "WonFlow",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // The installed app fills the whole device, notch included, and the theme
  // colour follows the theme the viewer chose rather than being pinned light.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <head>
        <Script
          id="wonflow-data-cleanup"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{const marker="wonflow-data-cleanup-v1";const stalePrefix="wonflow-demo"+"-";if(localStorage.getItem(marker)!=="complete"){for(let index=localStorage.length-1;index>=0;index-=1){const key=localStorage.key(index);if(key?.startsWith(stalePrefix)){localStorage.removeItem(key)}}for(let index=sessionStorage.length-1;index>=0;index-=1){const key=sessionStorage.key(index);if(key?.startsWith(stalePrefix)){sessionStorage.removeItem(key)}}localStorage.setItem(marker,"complete")}}catch{}`,
          }}
        />
        <Script
          id="wonflow-color-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("wonflow-color-theme")==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch{}`,
          }}
        />
        <Script
          id="wonflow-sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ClientStorageGuard />
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
