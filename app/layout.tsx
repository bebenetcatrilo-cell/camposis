import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Serif_Display } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Campos SIS · Software de gestión para el agro',
  description:
    'Sistema integral para productores agropecuarios. Cereales, hacienda, ventas y administración — todo en un solo lugar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${jakarta.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
