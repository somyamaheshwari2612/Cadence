import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exposure Router | Atmospheric Activity Planner",
  description: "Plan your outdoor routines around localized air quality and meteorological forecast windows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">
                  E
                </div>
                <div>
                  <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                    Exposure Router
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      India
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400">Atmospheric Activity Scheduler & Eco-Streak</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gemini Flash-Lite Active
                </span>
                <a
                  href="https://www.cpcb.nic.in/aqi_bulletin.php"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors hidden md:inline"
                >
                  CPCB NAQI Portal ↗
                </a>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="border-t border-white/5 bg-slate-950/60 py-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>
                Environmental & Weather forecasts provided by{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white underline underline-offset-2"
                >
                  Open-Meteo
                </a>{" "}
                (CAMS Global Model).
              </p>
              <p className="text-slate-500 text-center sm:text-right">
                Forecasts are uncertain. Not a clinical medical assessment. See{" "}
                <a
                  href="https://www.cpcb.nic.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white"
                >
                  CPCB
                </a>{" "}
                for official Indian air quality bulletins.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
