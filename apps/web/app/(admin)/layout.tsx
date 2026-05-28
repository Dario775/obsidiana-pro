'use client';

import React, { useState } from "react";
import { Sidebar as AdminSidebar } from "../../components/admin-sidebar";
import { Topbar as AdminTopbar } from "../../components/admin-topbar";
import { AuthProvider, AuthGuard } from "../../components/auth-provider";
import { ChatbotAssistant } from "../../components/chatbot-assistant";
import { AdminBottomNav } from "../../components/admin-bottom-nav";
import { PWAInstallPrompt } from "../../components/pwa-install-prompt";
import { TenantProvider } from "../../hooks/use-tenant";
import { OnboardingWizard } from "../../components/onboarding-wizard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard>
        <TenantProvider>
          <div className="min-h-screen flex flex-col lg:flex-row pb-safe overflow-x-hidden">
            <AdminSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
            <div className="flex-1 flex flex-col relative">
              <AdminTopbar isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
              <main className={`flex-1 pt-20 px-4 md:px-6 pb-24 lg:pb-8 transition-all duration-300 ease-in-out ${
                isSidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'
              }`}>
                {children}
              </main>
              <ChatbotAssistant />
              <AdminBottomNav />
              <PWAInstallPrompt />
            </div>
          </div>
          {/* Wizard de onboarding — aparece automáticamente para nuevos tenants */}
          <OnboardingWizard />
        </TenantProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
