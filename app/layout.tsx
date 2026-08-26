import './globals.css';
import './operator.css';
import './auth.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ice Cream Inventory',
  description: 'Cold-storage inventory and freezer tracking for ice cream production and sales.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
