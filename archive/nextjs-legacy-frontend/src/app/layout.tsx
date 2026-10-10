import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Menu, MapPin, Navigation, Home, Calendar, MoreHorizontal } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Cadence | Atmospheric Activity Planner & Astronomical Dashboard",
  description: "Plan your outdoor routines around localized air quality, meteorology, and astronomical cycles with deep obsidian and emerald aesthetics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200`}>
        <div className="flex flex-col min-h-screen text-emerald-100">
          <header className="pt-6 pb-2 sm:pt-8 sm:pb-4 z-50 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* DESKTOP HEADER */}
              <div className="hidden lg:flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold tracking-tight text-white font-serif">Cadence</span>
                  <span className="text-emerald-500/40">/</span>
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Exposure Router</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-emerald-300/90">
                  <span className="italic font-serif text-emerald-200">Find your window.</span>
                </div>
              </div>

              {/* MOBILE HEADER */}
              <div className="flex lg:hidden items-center justify-between">
                <button className="p-2 -ml-2 text-emerald-400 hover:text-white transition-colors">
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Mathura, Uttar Pradesh</span>
                </div>
                <button className="p-2 -mr-2 text-emerald-400 hover:text-white transition-colors">
                  <Navigation className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 mb-20 lg:mb-0">
            {children}
          </main>

          <footer className="hidden lg:block border-t border-emerald-500/10 bg-obsidian-950/90 py-6 text-xs text-emerald-400/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>
                Atmospheric & Celestial telemetry provided by{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-200 underline underline-offset-2"
                >
                  Open-Meteo
                </a>{" "}
                (CAMS Global) & Astronomical Shifting Engine.
              </p>
              <p className="text-emerald-400/80 text-center sm:text-right">
                Forecasts are subject to atmospheric variance. Consult{" "}
                <a
                  href="https://www.cpcb.nic.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 hover:text-white"
                >
                  CPCB
                </a>{" "}
                for official Indian air quality bulletins.
              </p>
            </div>
          </footer>

          {/* MOBILE BOTTOM NAV */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-obsidian-950/90 backdrop-blur-xl border-t border-emerald-500/15 pb-safe">
            <div className="flex items-center justify-between px-6 py-4">
              <button className="flex flex-col items-center gap-1.5 text-emerald-400">
                <Home className="h-5 w-5" />
                <span className="text-[10px] font-medium">Home</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 text-emerald-500/50 hover:text-emerald-400 transition-colors">
                <Calendar className="h-5 w-5" />
                <span className="text-[10px] font-medium">Forecast</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 text-emerald-500/50 hover:text-emerald-400 transition-colors">
                <MapPin className="h-5 w-5" />
                <span className="text-[10px] font-medium">Map</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 text-emerald-500/50 hover:text-emerald-400 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
