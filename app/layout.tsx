import type { Metadata, Viewport } from 'next'
import { Fraunces, DM_Sans, DM_Mono, Caveat } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#faf7f2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  ),
  title: {
    default: 'Revelio — Hide a photo in a puzzle',
    template: '%s · Revelio',
  },
  description:
    'Turn any photo into a nonogram puzzle. Share it with friends. Let them solve it to reveal the hidden image.',
  keywords: ['nonogram', 'picross', 'puzzle', 'photo', 'share'],
  authors: [{ name: 'Revelio' }],
  creator: 'Revelio',
  openGraph: {
    type: 'website',
    siteName: 'Revelio',
    title: 'Revelio — Hide a photo in a puzzle',
    description: 'Turn any photo into a nonogram puzzle your friends will love solving',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revelio — Hide a photo in a puzzle',
    description: 'Turn any photo into a nonogram puzzle your friends will love solving',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Revelio',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`
        ${fraunces.variable}
        ${dmSans.variable}
        ${dmMono.variable}
        ${caveat.variable}
      `}
    >
      <body>{children}</body>
    </html>
  )
}
