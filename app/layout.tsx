import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Caveat } from 'next/font/google';
import './globals.css'; // Global styles
import { ThemeProvider } from '@/components/ThemeProvider';

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
  title: 'Kuzhiyundo? | Community Pothole Tracker for Kerala',
  description: 'Community-driven pothole tracking map for Kerala. Report and avoid kuzhis (potholes) in your area with our interactive map.',
  keywords: 'potholes, road conditions, traffic, map, community tracking, kuzhi, Kerala roads, pothole tracker, road damage, LSGD, PWD, Kerala',
  metadataBase: new URL('https://kuzhiyundo.com'),
  alternates: {
    canonical: 'https://kuzhiyundo.com',
  },
  openGraph: {
    title: 'Kuzhiyundo? | Community Pothole Tracker for Kerala',
    description: 'Community-driven pothole tracking map for Kerala. Report and avoid kuzhis (potholes) in your area with our interactive map.',
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
    title: 'Kuzhiyundo? | Community Pothole Tracker for Kerala',
    description: 'Community-driven pothole tracking map. Report and avoid kuzhis.',
    images: ['/twitter-image'],
    site: '@kuzhiyundo',
    creator: '@kuzhiyundo',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  category: 'travel',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Kuzhiyundo?",
  url: "https://kuzhiyundo.com",
  description: "Community-driven pothole tracking map for Kerala. Report and avoid kuzhis (potholes) with an interactive map.",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  areaServed: { "@type": "State", name: "Kerala", containedInPlace: { "@type": "Country", name: "India" } },
  inLanguage: ["en", "ml"],
  creator: { "@type": "Organization", name: "Kuzhiyundo", url: "https://kuzhiyundo.com" },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${caveat.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body suppressHydrationWarning className="font-sans bg-black text-white antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
