import { Topbar as PosTopbar } from "../../components/pos-topbar";
import { Sidebar as PosSidebar } from "../../components/pos-sidebar";
import { BottomNav as PosBottomNav } from "../../components/pos-bottom-nav";
import { AuthProvider } from "../../components/auth-provider";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col md:flex-row overflow-hidden font-body-sm">
        <PosTopbar />
        <PosSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden pt-16 md:pt-0 pb-[68px] md:pb-0 relative z-10 bg-surface">
          {children}
        </main>
        <PosBottomNav />
      </div>
    </AuthProvider>
  );
}
