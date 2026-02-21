import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Incident Flight Recorder',
  description: 'A flight-recorder + replay screen for cloud incidents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
            <div className="container mx-auto flex h-14 items-center pl-4">
              <div className="mr-4 flex">
                <a className="mr-6 flex items-center space-x-2" href="/">
                  <div className="h-6 w-6 rounded-sm bg-red-600 flex items-center justify-center font-bold text-xs">
                    IFR
                  </div>
                  <span className="hidden font-bold sm:inline-block">
                    Incident Flight Recorder
                  </span>
                </a>
              </div>
              <div className="flex flex-1 items-center space-x-2 justify-end pr-4">
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <a className="transition-colors hover:text-foreground/80 text-foreground" href="/">Dashboard</a>
                  <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="#">Settings</a>
                </nav>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="container mx-auto p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
