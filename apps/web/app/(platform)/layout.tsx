import { Sidebar as PlatformSidebar } from "../../components/platform-sidebar";
import { Topbar as PlatformTopbar } from "../../components/platform-topbar";
import { AuthProvider, AuthGuard, PlatformGuard } from "../../components/auth-provider";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <PlatformGuard>
          <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden">
            <PlatformSidebar />
            <div className="flex-1 flex flex-col relative">
              <PlatformTopbar />
              <main className="flex-1 pt-20 px-4 md:px-8 lg:ml-64 lg:max-w-[1600px] pb-10">
                {children}
              </main>
            </div>
          </div>
        </PlatformGuard>
      </AuthGuard>
    </AuthProvider>
  );
}
