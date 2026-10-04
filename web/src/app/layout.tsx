import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Agriculture Radar', description: 'Explore global wheat, maize, and rice production, yield histories, and benchmark prices. Every number links to its source.', icons: { icon: '/icon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
