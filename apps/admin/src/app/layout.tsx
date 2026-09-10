import type { Metadata } from 'next';
import { Poppins, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Poppins: geométrica, la más cercana en aire a Gotham dentro de lo
// libre. Se usa en títulos, cifras e interfaz.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--ws-display',
  display: 'swap',
});

// Los seriales y las fechas van en monoespacio: en Poppins, a 11px, los
// dígitos se confunden entre sí.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--ws-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aural · Admin',
  description: 'Portal administrativo Aural',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${poppins.variable} ${mono.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
