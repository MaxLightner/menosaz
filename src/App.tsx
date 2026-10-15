import {NotificationControl} from './components/common/NotificationControl';
import {SessionReport} from './components/dashboard/SessionReport';
import {TeamAccess} from './components/dashboard/TeamAccess';
import {accountView} from './services/access';
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
  const { currentView, setCurrentView, toastMessage,showToast,servicePoints,hasAnyProducts,isFirebaseConnected } = useApp();
  const {account,logout,openSample,selectBusiness}=usePresentation();
  const [inboxOpen,setInboxOpen]=useState(false),[teamOpen,setTeamOpen]=useState(false),[sessionsOpen,setSessionsOpen]=useState(false),[profileDeferred,setProfileDeferred]=useState(false);
  useEffect(()=>{const resume=()=>setProfileDeferred(false);window.addEventListener('profile-resume',resume);return()=>window.removeEventListener('profile-resume',resume);},[]);
  useEffect(()=>{setProfileDeferred(false);},[account?.id,account?.phone]);
  const canManage=account?.role==='manager'||account?.role==='admin';
  useEffect(()=>{if(!account||!['waiter','kitchen'].includes(account.role||''))return;if(['dashboard-desktop','dashboard-mobile','admin','membership','checkout'].includes(currentView)||(currentView==='waiter'&&account.role!=='waiter')||(currentView==='kitchen'&&account.role!=='kitchen'))setCurrentView(accountView(account));},[account?.role,currentView]);
  useEffect(()=>{if(!BACKEND)return;let visitor=sessionStorage.getItem('menosaz-visitor');if(!visitor){visitor=crypto.randomUUID();sessionStorage.setItem('menosaz-visitor',visitor);}const ping=()=>{if(document.visibilityState==='visible')api('/presence',{visitor}).catch(()=>{});};ping();const t=setInterval(ping,60000);document.addEventListener('visibilitychange',ping);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',ping);};},[account?.phone]);
  const [appearanceOpen,setAppearanceOpen]=useState(false);
  const [mobileManager,setMobileManager]=useState(()=>window.matchMedia('(max-width: 899px)').matches);
  useEffect(()=>{const mq=window.matchMedia('(max-width: 899px)');const change=()=>setMobileManager(mq.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
  useEffect(()=>{const alert=(event:Event)=>useAlert((event as CustomEvent).detail?.message);function useAlert(message:string){if(message)showToast(message);}window.addEventListener('menosaz-alert',alert);return()=>window.removeEventListener('menosaz-alert',alert);},[]);
  const manager=['dashboard-desktop','dashboard-mobile'].includes(currentView);
  const restored=["customer","waiter","kitchen"].includes(currentView);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Test Environment & Role Switcher Bar */}
      {restored ? currentView!=='customer'&&import.meta.env.VITE_LOCAL_PREVIEW==='true'&&<nav className="restored-preview-nav" aria-label="نسخه‌های پیش‌نمایش">{(['customer','waiter','kitchen'] as const).map((view,i)=><button key={view} className={currentView===view?'active':''} onClick={()=>view==='customer'?openSample(null):setCurrentView(view)}>{['مشتری','گارسون','رستوران'][i]}</button>)}<button onClick={()=>setCurrentView('website')}>سایت</button>{account&&<button onClick={()=>logout()}>خروج از حساب</button>}</nav> : !['website','how','terms','membership','checkout','admin'].includes(currentView)&&!manager&&<EnvironmentSwitchBar />}

      {restored&&currentView!=='customer'&&account&&<nav className="manager-utility" aria-label="حساب کارکنان"><NotificationControl/><span>{account.businessRole==='waiter'?'گارسون':account.businessRole==='kitchen'?'آشپزخانه':'حساب مجموعه'}</span>{(account.memberships?.length||0)>1&&<select aria-label="انتخاب مجموعه" value={account.businessId} onChange={e=>selectBusiness(e.target.value).catch(error=>window.alert(error.message))}>{account.memberships?.map(m=><option key={m.businessId} value={m.businessId}>{m.name}</option>)}</select>}<button onClick={()=>logout()}>خروج از حساب</button></nav>}
      {/* Main Viewport */}
      <div className={manager?"flex-1 manager-shell":"flex-1"}>{manager&&account&&canManage&&<div className="manager-utility"><span>حساب مجموعه</span><button onClick={()=>setSessionsOpen(true)}>زمان حضور و تخلیه{servicePoints.filter(p=>p.activeSession&&p.activeSession.durationSeconds>=3600).length>0?' · نشست طولانی':''}</button>{(account.memberships?.length||0)>1&&<select aria-label="انتخاب مجموعه" value={account.businessId} onChange={e=>selectBusiness(e.target.value).catch(error=>window.alert(error.message))}>{account.memberships?.map(m=><option key={m.businessId} value={m.businessId}>{m.name}</option>)}</select>}{account.businessRole==='owner'&&<button onClick={()=>setTeamOpen(true)}>دسترسی کارکنان</button>}<button className="manager-subscription-button" onClick={()=>setCurrentView('membership')}><span className="material-symbols-outlined">workspace_premium</span> اشتراک</button><button onClick={()=>setInboxOpen(true)}>پیام‌های پشتیبانی</button><button onClick={()=>setAppearanceOpen(true)}>رنگ و پس‌زمینه منو</button><button onClick={()=>setCurrentView('website')}>صفحه اول سایت</button><button onClick={()=>logout()}>خروج از حساب</button></div>}
        {currentView==='membership'&&(account?<Membership/>:<WebsiteView/>)}
        {currentView==='checkout'&&<Checkout/>}
        {currentView === 'website' && <WebsiteView />}
        {(currentView==='how'||currentView==='terms')&&<WebsiteView page={currentView}/>}
        {currentView==='admin'&&(account?.role==='admin'?<><AdminPanel/><WebsiteContentAdmin/></>:<WebsiteView/>)}
        {currentView === 'dashboard-desktop' && (account&&canManage?(mobileManager?<MobileDashboard />:<DesktopDashboard />):<WebsiteView />)}
        {currentView === 'dashboard-mobile' && (account&&canManage?(<MobileDashboard />):<WebsiteView />)}
        {currentView === 'customer' && <CustomerApp />}
        {currentView === 'waiter' && (account||import.meta.env.VITE_LOCAL_PREVIEW==='true'?<WaiterApp />:<WebsiteView />)}
        {currentView === 'kitchen' && (account||import.meta.env.VITE_LOCAL_PREVIEW==='true'?<KitchenKDSApp />:<WebsiteView />)}
        {currentView === 'test-guide' && <TestGuideView />}
      </div>

      {inboxOpen&&account&&<OrderDialog title="پیام‌های پشتیبانی" onClose={()=>setInboxOpen(false)}><ManagerInbox/></OrderDialog>}
      {account?.needsProfile&&currentView!=='customer'&&!profileDeferred&&<CompleteProfile onClose={()=>setProfileDeferred(true)}/>}
      {account?.needsProfile&&currentView!=='customer'&&profileDeferred&&<div className="profile-resume"><button className="staff-primary" onClick={()=>setProfileDeferred(false)}>ادامهٔ تکمیل حساب</button></div>}
      {sessionsOpen&&canManage&&<OrderDialog title="نشست‌ها و زمان حضور" onClose={()=>setSessionsOpen(false)}><SessionReport/></OrderDialog>}
      {teamOpen&&account?.businessRole==='owner'&&<OrderDialog title="دسترسی کارکنان" onClose={()=>setTeamOpen(false)}><TeamAccess key={account.businessId}/></OrderDialog>}
      {appearanceOpen&&account&&<OrderDialog title="ظاهر منوی مشتری" onClose={()=>setAppearanceOpen(false)}><MenuAppearance onPreview={()=>setAppearanceOpen(false)} /></OrderDialog>}
      {manager&&account&&canManage&&!account.needsProfile&&isFirebaseConnected&&!hasAnyProducts&&<MenuSetupWizard/>}
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

