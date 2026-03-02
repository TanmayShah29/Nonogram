import type { Metadata } from "next";
import { Fraunces, DM_Sans, DM_Mono, Caveat } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ['normal', 'italic'],
  weight: ['400', '600']
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  style: ['normal', 'italic'],
  weight: ['400', '500', '600']
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: 'Revelio — Hide a photo in a puzzle',
  description: 'Turn any photo into a nonogram puzzle. Share it with friends. Let them solve it to reveal the hidden image.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Revelio — Hide a photo in a puzzle',
    description: 'Turn any photo into a nonogram puzzle your friends will love solving',
    type: 'website',
    siteName: 'Revelio',
  },
  twitter: {
    card: 'summary_large_image',
  }
}

export const viewport: import("next").Viewport = {
  themeColor: '#faf7f2',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Revelio" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${dmMono.variable} ${caveat.variable} font-sans antialiased`}
      >
        <nav className="sticky top-0 z-50 bg-[#faf7f2]/90 backdrop-blur-md border-b border-[#ede8e1] px-5 py-3 flex items-center min-h-[56px] w-full">
          <a href="/" className="font-serif italic font-semibold text-[1.4rem] text-[#f4845f] tracking-tight cursor-pointer">
            Revelio
          </a>
        </nav>
        <div id="stage" className="relative overflow-hidden flex flex-col min-h-[calc(100vh-56px)]">
          {children}
        </div>
      </body>
    </html>
  );
}
