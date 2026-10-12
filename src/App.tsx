import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { EnvironmentSwitchBar } from './components/common/EnvironmentSwitchBar';
import { WebsiteView } from './components/website/WebsiteView';
import { DesktopDashboard } from './components/dashboard/DesktopDashboard';
import { MobileDashboard } from './components/dashboard/MobileDashboard';
import { CustomerApp } from './components/customer/CustomerApp';
import { WaiterApp } from './components/waiter/WaiterApp';
import { KitchenKDSApp } from './components/kitchen/KitchenKDSApp';
import { TestGuideView } from './components/guide/TestGuideView';

const AppContent: React.FC = () => {
  const { currentView, toastMessage } = useApp();

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Test Environment & Role Switcher Bar */}
      <EnvironmentSwitchBar />

      {/* Main Viewport */}
      <div className="flex-1">
        {currentView === 'website' && <WebsiteView />}
        {currentView === 'dashboard-desktop' && <DesktopDashboard />}
        {currentView === 'dashboard-mobile' && <MobileDashboard />}
        {currentView === 'customer' && <CustomerApp />}
        {currentView === 'waiter' && <WaiterApp />}
        {currentView === 'kitchen' && <KitchenKDSApp />}
        {currentView === 'test-guide' && <TestGuideView />}
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1C1917]/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-600/60 backdrop-blur-md flex items-center gap-2.5 animate-bounce text-xs font-bold">
          <span className="material-symbols-outlined text-amber-400 text-base">notifications_active</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
