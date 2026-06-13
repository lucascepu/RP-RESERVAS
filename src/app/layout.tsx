import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RP + Reservas · Argentina',
  description: 'Seguimiento de Riesgo País, Reservas BCRA y Compras de divisas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
