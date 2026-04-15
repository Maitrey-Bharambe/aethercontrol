import type { Metadata, Viewport } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AetherControl — Elemental Reality Engine',
  description: 'Control particles, fluid, energy and solid objects with your hands in real-time.',
  keywords: ['Computer Graphics', 'Hand Tracking', 'Three.js', 'MediaPipe', 'Interactive'],
  authors: [{ name: 'Maitrey Bharambe' }],
  openGraph: {
    title: 'AetherControl — Elemental Reality Engine',
    description: 'Control particles, fluid, energy and solid objects with your hands in real-time.',
    images: ['/og-image.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AetherControl',
    description: 'Real-time hand-controlled graphics engine.',
    images: ['/og-image.jpg'],
  },
  robots: 'index, follow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
