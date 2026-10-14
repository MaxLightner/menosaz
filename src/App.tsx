import {Membership,Checkout} from './components/common/Plans';
import {ManagerInbox} from './components/dashboard/ManagerInbox';
import {api,BACKEND} from './services/backend';
import {CompleteProfile} from './components/common/CompleteProfile';
import {AdminPanel} from './components/dashboard/AdminPanel';
import {MenuAppearance} from './components/dashboard/MenuAppearance';
import {OrderDialog} from './components/common/OrderDialog';
import {PresentationProvider,usePresentation} from './context/PresentationContext';
import React,{useState,useEffect} from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { EnvironmentSwitchBar } from './components/common/EnvironmentSwitchBar';
import {PublicWebsite as WebsiteView} from './components/website/PublicWebsite';
import { DesktopDashboard } from './components/dashboard/DesktopDashboard';
import { MobileDashboard } from './components/dashboard/MobileDashboard';
import { RestoredCustomerApp as CustomerApp } from './components/customer/RestoredCustomerApp';
import { RestoredWaiterApp as WaiterApp } from './components/waiter/RestoredWaiterApp';
import { RestoredKitchenApp as KitchenKDSApp } from './components/kitchen/RestoredKitchenApp';
import { TestGuideView } from './components/guide/TestGuideView';
import {MenuSetupWizard} from './components/dashboard/MenuSetupWizard';
import {WebsiteContentAdmin} from './components/dashboard/WebsiteContentAdmin';

const AppContent: React.FC = () => {
  const { currentView, setCurrentView, toastMessage,hasAnyProducts,isFirebaseConnected } = useApp();
  const {account,logout,openSample}=usePresentation();
  const [inboxOpen,setInboxOpen]=useState(false);
  useEffect(()=>{if(!BACKEND)return;let visitor=sessionStorage.getItem('menosaz-visitor');if(!visitor){visitor=crypto.randomUUID();sessionStorage.setItem('menosaz-visitor',visitor);}const ping=()=>{if(document.visibilityState==='visible')api('/presence',{visitor}).catch(()=>{});};ping();const t=setInterval(ping,60000);document.addEventListener('visibilitychange',ping);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',ping);};},[account?.phone]);
  const [appearanceOpen,setAppearanceOpen]=useState(false);
  const [mobileManager,setMobileManager]=useState(()=>window.matchMedia('(max-width: 899px)').matches);
  useEffect(()=>{const mq=window.matchMedia('(max-width: 899px)');const change=()=>setMobileManager(mq.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
  const manager=['dashboard-desktop','dashboard-mobile'].includes(currentView);
  const restored=["customer","waiter","kitchen"].includes(currentView);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Test Environment & Role Switcher Bar */}
      {restored ? currentView!=='customer'&&import.meta.env.VITE_LOCAL_PREVIEW==='true'&&<nav className="restored-preview-nav" aria-label="نسخه‌های پیش‌نمایش">{(['customer','waiter','kitchen'] as const).map((view,i)=><button key={view} className={currentView===view?'active':''} onClick={()=>view==='customer'?openSample(null):setCurrentView(view)}>{['مشتری','گارسون','رستوران'][i]}</button>)}<button onClick={()=>setCurrentView('website')}>سایت</button>{account&&<button onClick={()=>logout()}>خروج از حساب</button>}</nav> : !['website','how','terms','membership','checkout','admin'].includes(currentView)&&!manager&&<EnvironmentSwitchBar />}

      {/* Main Viewport */}
      <div className={manager?"flex-1 manager-shell":"flex-1"}>{manager&&account&&<div className="manager-utility"><span>حساب مجموعه</span><button className="manager-subscription-button" onClick={()=>setCurrentView('membership')}><span className="material-symbols-outlined">workspace_premium</span> اشتراک</button><button onClick={()=>setInboxOpen(true)}>پیام‌های پشتیبانی</button><button onClick={()=>setAppearanceOpen(true)}>رنگ و پس‌زمینه منو</button><button onClick={()=>setCurrentView('website')}>صفحه اول سایت</button><button onClick={()=>logout()}>خروج از حساب</button></div>}
        {currentView==='membership'&&(account?<Membership/>:<WebsiteView/>)}
        {currentView==='checkout'&&<Checkout/>}
        {currentView === 'website' && <WebsiteView />}
        {(currentView==='how'||currentView==='terms')&&<WebsiteView page={currentView}/>}
        {currentView==='admin'&&(account?.role==='admin'?<><AdminPanel/><WebsiteContentAdmin/></>:<WebsiteView/>)}
        {currentView === 'dashboard-desktop' && (account?(mobileManager?<MobileDashboard />:<DesktopDashboard />):<WebsiteView />)}
        {currentView === 'dashboard-mobile' && (account?(<MobileDashboard />):<WebsiteView />)}
        {currentView === 'customer' && <CustomerApp />}
        {currentView === 'waiter' && (account||import.meta.env.VITE_LOCAL_PREVIEW==='true'?<WaiterApp />:<WebsiteView />)}
        {currentView === 'kitchen' && (account||import.meta.env.VITE_LOCAL_PREVIEW==='true'?<KitchenKDSApp />:<WebsiteView />)}
        {currentView === 'test-guide' && <TestGuideView />}
      </div>

      {inboxOpen&&account&&<OrderDialog title="پیام‌های پشتیبانی" onClose={()=>setInboxOpen(false)}><ManagerInbox/></OrderDialog>}
      {account?.needsProfile&&<CompleteProfile/>}
      {appearanceOpen&&account&&<OrderDialog title="ظاهر منوی مشتری" onClose={()=>setAppearanceOpen(false)}><MenuAppearance onPreview={()=>setAppearanceOpen(false)} /></OrderDialog>}
      {manager&&account&&isFirebaseConnected&&!hasAnyProducts&&<MenuSetupWizard/>}
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1C1917]/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-600/60 backdrop-blur-md flex items-center gap-2.5 text-base font-bold">
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
      <PresentationProvider><AppContent /></PresentationProvider>
    </AppProvider>
  );
}

