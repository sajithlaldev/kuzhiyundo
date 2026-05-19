import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Caveat } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-handwriting' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Kuzhiyundo? | Avoid Potholes',
  description: 'Community-driven pothole tracking mapping. Report and avoid kuzhis (potholes) in your area with our interactive map.',
  keywords: 'potholes, road conditions, traffic, map, community tracking, kuzhi, Kerala roads',
  metadataBase: new URL('https://kuzhiyundo.com'),
  openGraph: {
    title: 'Kuzhiyundo? | Avoid Potholes',
    description: 'Community-driven pothole tracking mapping. Report and avoid kuzhis (potholes) in your area with our interactive map.',
    url: 'https://kuzhiyundo.com',
    siteName: 'Kuzhiyundo?',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Kuzhiyundo? — Community Pothole Tracker for Kerala',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kuzhiyundo? | Avoid Potholes',
    description: 'Community-driven pothole tracking map. Report and avoid kuzhis.',
    images: ['/twitter-image'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${caveat.variable}`}>
      <body suppressHydrationWarning className="font-sans bg-black text-white antialiased">{children}</body>
    </html>
  );
}
