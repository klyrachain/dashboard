export function SingleLineFooter() {
    return (
      <footer className="w-full pt-4 mt-auto">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row text-xs text-muted-foreground bg-background/40 backdrop-blur-md rounded-2xl border border-white/10 px-6 py-3 shadow-sm">
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">© 2026 Morapay</span>
            <span className="hidden sm:inline text-muted-foreground/40">•</span>
            <span className="hidden sm:inline">Empowering modern commerce</span>
          </div>
  
          <nav className="flex items-center gap-6 font-medium">
            <a href="/support" className="transition-colors hover:text-primary">
              Support
            </a>
            <a href="/privacy" className="transition-colors hover:text-primary">
              Privacy Policy
            </a>
            <a href="/terms" className="transition-colors hover:text-primary">
              Terms of Service
            </a>
          </nav>
          
        </div>
      </footer>
    );
  }