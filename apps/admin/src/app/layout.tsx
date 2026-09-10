import type { Metadata } from 'next';
import { Bricolage_Grotesque, Schibsted_Grotesk, Martian_Mono } from 'next/font/google';
import './globals.css';

// Bricolage Grotesque: grotesca con recortes y ópticas raras, imposible
// de confundir con una fuente de sistema. Va en títulos y cifras.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--ws-display',
  axes: ['opsz', 'wdth'],
  display: 'swap',
});

// Schibsted Grotesk: nórdica, de prensa digital. Legible en cuerpos
// pequeños y con más personalidad que las grotescas de sistema.
const ui = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--ws-ui',
  display: 'swap',
});

// Martian Mono para seriales y fechas: ancha y técnica, se lee como dato.
const mono = Martian_Mono({
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
    <html
      lang="es"
      className={`h-full ${display.variable} ${ui.variable} ${mono.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
