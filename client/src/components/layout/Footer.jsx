export default function Footer() {
  return (
    <footer className="bg-primary border-t border-border">
      <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
            <span className="text-white font-bold text-[8px]">Ai</span>
          </div>
          <span className="text-xs text-text-secondary">
            © 2026 AiKupon. Tüm hakları saklıdır.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-text-muted">
            Hakkımızda
          </span>
          <span className="text-[10px] text-text-muted">
            Gizlilik
          </span>
          <span className="text-[10px] text-text-muted">
            Kullanım Şartları
          </span>
        </div>
      </div>
    </footer>
  );
}
