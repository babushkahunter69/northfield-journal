export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500">
        © {new Date().getFullYear()} Northfield Journal
      </div>
    </footer>
  );
}