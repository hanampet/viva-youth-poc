export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-white">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Ailix" className="h-8" />
        <div>
          <p className="text-xs text-surface-500">AI 심리 케어 시스템</p>
        </div>
      </div>
    </header>
  );
}
