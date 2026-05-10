import { Sidebar as AdminSidebar } from "../../components/admin-sidebar";
import { Topbar as AdminTopbar } from "../../components/admin-topbar";
import { AuthProvider } from "../../components/auth-provider";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col lg:flex-row pb-safe overflow-x-hidden">
        <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative">
        <AdminTopbar />
        <main className="flex-1 pt-20 px-4 md:px-6 lg:ml-64 pb-24 lg:pb-8">
          {children}
        </main>
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-zinc-950/95 border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
          <Link href="/pos" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
            <span className="material-symbols-outlined text-[24px]">calculate</span>
            <span className="font-inter text-[10px] uppercase font-bold mt-1">POS</span>
          </Link>
          <Link href="/inventory" className="flex flex-col items-center justify-center text-violet-500 scale-110 active:bg-violet-500/20 p-2 rounded-lg transition-all">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
            <span className="font-inter text-[10px] uppercase font-bold mt-1">Stock</span>
          </Link>
          <Link href="/" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
            <span className="material-symbols-outlined text-[24px]">search</span>
            <span className="font-inter text-[10px] uppercase font-bold mt-1">Buscar</span>
          </Link>
          <Link href="/menu" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
            <span className="material-symbols-outlined text-[24px]">menu</span>
            <span className="font-inter text-[10px] uppercase font-bold mt-1">Menú</span>
          </Link>
        </nav>
      </div>
    </div>
    </AuthProvider>
  );
}
