import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Gotham, la tipografía de marca. Solo los pesos que la interfaz usa:
// cargar los dieciséis cortes penaliza el arranque sin dar nada a cambio.
const gotham = localFont({
  src: [
    { path: '../../public/font/Gotham-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../public/font/Gotham-Book.woff2', weight: '400', style: 'normal' },
    { path: '../../public/font/Gotham-BookItalic.woff2', weight: '400', style: 'italic' },
    { path: '../../public/font/Gotham-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/font/Gotham-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/font/Gotham-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--ws-display',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

// Los seriales y las fechas van en monoespacio: Gotham no trae cifras
// de ancho fijo y en columna se desalinean.
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
    <html lang="es" className={`h-full ${gotham.variable} ${mono.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
