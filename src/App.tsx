import {UndoProduct} from './components/dashboard/UndoProduct';
import {StaffManager} from './components/dashboard/StaffManager';
import {FeedbackReports} from './components/dashboard/FeedbackReports';
import {PhoneLogin} from './components/common/PhoneLogin';
import {BrandLogo} from './components/common/BrandLogo';
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
import {BillingSettingsEditor} from './components/dashboard/BillingSettingsEditor';
import {OrderDialog} from './components/common/OrderDialog';
import {PresentationProvider,usePresentation} from './context/PresentationContext';
import React,{useState,useEffect} from 'react';
import { AppProvider, useApp } from './context/AppContext';
import {PublicWebsite as WebsiteView} from './components/website/PublicWebsite';
import { DesktopDashboard } from './components/dashboard/DesktopDashboard';
import { MobileDashboard } from './components/dashboard/MobileDashboard';
import { RestoredCustomerApp as CustomerApp } from './components/customer/RestoredCustomerApp';
import { RestoredWaiterApp as WaiterApp } from './components/waiter/RestoredWaiterApp';
import { RestoredKitchenApp as KitchenKDSApp } from './components/kitchen/RestoredKitchenApp';
import {MenuSetupWizard} from './components/dashboard/MenuSetupWizard';
import {WebsiteContentAdmin} from './components/dashboard/WebsiteContentAdmin';

const AppContent: React.FC = () => {
  const { currentView, setCurrentView, toastMessage,showToast,servicePoints,hasAnyProducts,isServerConnected,categories,activeMenuId } = useApp();
  const {account,logout,openSample,selectBusiness}=usePresentation();
  const [inboxOpen,setInboxOpen]=useState(false),[teamOpen,setTeamOpen]=useState(false),[sessionsOpen,setSessionsOpen]=useState(false),[staffOpen,setStaffOpen]=useState(false),[reportMode,setReportMode]=useState<'feedback'|'club'|null>(null),[profileDeferred,setProfileDeferred]=useState(false);
  useEffect(()=>{const resume=()=>setProfileDeferred(false);window.addEventListener('profile-resume',resume);return()=>window.removeEventListener('profile-resume',resume);},[]);
  useEffect(()=>{setProfileDeferred(false);},[account?.id,account?.phone]);
  const canManage=account?.role==='manager'||account?.role==='admin';
  const staffBusinessId=new URLSearchParams(window.location.search).get('business')||'';
  useEffect(()=>{if(!account||!['waiter','kitchen'].includes(account.role||''))return;if(['dashboard-desktop','dashboard-mobile','admin','membership','checkout'].includes(currentView)||(currentView==='waiter'&&account.role!=='waiter')||(currentView==='kitchen'&&account.role!=='kitchen'))setCurrentView(accountView(account));},[account?.role,currentView]);
  useEffect(()=>{if(!BACKEND)return;let visitor=sessionStorage.getItem('menosaz-visitor');if(!visitor){visitor=crypto.randomUUID();sessionStorage.setItem('menosaz-visitor',visitor);}const ping=()=>{if(document.visibilityState==='visible')api('/presence',{visitor}).catch(()=>{});};ping();const t=setInterval(ping,60000);document.addEventListener('visibilitychange',ping);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',ping);};},[account?.phone]);
  const [appearanceOpen,setAppearanceOpen]=useState(false);
  const [billingOpen,setBillingOpen]=useState(false);
  const [mobileManager,setMobileManager]=useState(()=>window.matchMedia('(max-width: 899px)').matches);
  useEffect(()=>{const mq=window.matchMedia('(max-width: 899px)');const change=()=>setMobileManager(mq.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
  useEffect(()=>{const alert=(event:Event)=>useAlert((event as CustomEvent).detail?.message);function useAlert(message:string){if(message)showToast(message);}window.addEventListener('menosaz-alert',alert);return()=>window.removeEventListener('menosaz-alert',alert);},[]);
  const manager=['dashboard-desktop','dashboard-mobile'].includes(currentView);
  const restored=["customer","waiter","kitchen"].includes(currentView);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Test Environment & Role Switcher Bar */}

      {restored&&currentView!=='customer'&&account&&<nav className="manager-utility" aria-label="حساب کارکنان"><BrandLogo compact/><NotificationControl/>{canManage&&<button onClick={()=>setCurrentView(accountView(account))}>بازگشت به مدیریت</button>}<span>{account.businessRole==='waiter'?(account.name||'گارسون'):account.businessRole==='kitchen'?'آشپزخانه':'حساب مجموعه'}</span>{(account.memberships?.length||0)>1&&<select aria-label="انتخاب مجموعه" value={account.businessId} onChange={e=>selectBusiness(e.target.value).catch(error=>window.alert(error.message))}>{account.memberships?.map(m=><option key={m.businessId} value={m.businessId}>{m.name}</option>)}</select>}<button onClick={()=>logout()}>خروج از حساب</button></nav>}
      {/* Main Viewport */}
      <div className={manager?"flex-1 manager-shell":"flex-1"}>{manager&&account&&canManage&&<div className="manager-utility"><BrandLogo compact/><button onClick={()=>setCurrentView('website')}>صفحه اول سایت</button><span>حساب مجموعه</span><button onClick={()=>setSessionsOpen(true)}>زمان حضور و تخلیه{servicePoints.filter(p=>p.activeSession&&p.activeSession.durationSeconds>=3600).length>0?' · نشست طولانی':''}</button>{(account.memberships?.length||0)>1&&<select aria-label="انتخاب مجموعه" value={account.businessId} onChange={e=>selectBusiness(e.target.value).catch(error=>window.alert(error.message))}>{account.memberships?.map(m=><option key={m.businessId} value={m.businessId}>{m.name}</option>)}</select>}<button onClick={()=>setStaffOpen(true)}>مدیریت گارسون‌ها</button><button onClick={()=>setReportMode('feedback')}>نظرات مشتریان</button><button onClick={()=>setReportMode('club')}>باشگاه مشتریان</button>{account.businessRole==='owner'&&<button onClick={()=>setTeamOpen(true)}>دسترسی کارکنان</button>}<button className="manager-subscription-button" onClick={()=>setCurrentView('membership')}><span className="material-symbols-outlined">workspace_premium</span> اشتراک</button><button onClick={()=>setInboxOpen(true)}>پیام‌های پشتیبانی</button><button onClick={()=>setAppearanceOpen(true)}>رنگ و پس‌زمینه منو</button><button onClick={()=>setBillingOpen(true)}>مالیات و خدمات</button><button onClick={()=>logout()}>خروج از حساب</button></div>}
        {currentView==='membership'&&(account?<Membership/>:<WebsiteView/>)}
        {currentView==='checkout'&&<Checkout/>}
        {currentView === 'website' && <WebsiteView />}
        {(currentView==='how'||currentView==='terms')&&<WebsiteView page={currentView}/>}
        {currentView==='admin'&&(account?.role==='admin'?<><AdminPanel/><WebsiteContentAdmin/></>:<WebsiteView/>)}
        {currentView === 'dashboard-desktop' && (account&&canManage?(mobileManager?<MobileDashboard />:<DesktopDashboard />):<WebsiteView />)}
        {currentView === 'dashboard-mobile' && (account&&canManage?(<MobileDashboard />):<WebsiteView />)}
        {currentView === 'customer' && <CustomerApp />}
        {currentView === 'waiter' && (account?.businessRole==='waiter'&&(!staffBusinessId||account.businessId===staffBusinessId)?<WaiterApp />:account?<section className="staff-entry-screen"><h2>ورود گارسون</h2><p>برای ورود به پنل گارسون همین مجموعه، ابتدا از حساب فعلی خارج شوید.</p><button className="staff-primary" onClick={async()=>{await logout();window.location.assign(window.location.pathname+'?view=waiter&business='+encodeURIComponent(staffBusinessId));}}>خروج و ورود با شماره گارسون</button></section>:<section className="staff-entry-screen"><h2>ورود گارسون به رستوران</h2>{staffBusinessId?<PhoneLogin staffBusinessId={staffBusinessId} onDone={()=>{}}/>:<p>لینک ورود گارسون را از QR مدیر رستوران باز کنید.</p>}</section>)}
        {currentView === 'kitchen' && (account?.businessRole==='kitchen'&&(!staffBusinessId||account.businessId===staffBusinessId)?<KitchenKDSApp />:account?<section className="staff-entry-screen"><h2>ورود آشپزخانه</h2><p>برای ورود به پنل آشپزخانه باید با شماره‌ای که مالک مجموعه مجاز کرده وارد شوید.</p><button className="staff-primary" onClick={async()=>{await logout();window.location.assign(window.location.pathname+'?view=kitchen&business='+encodeURIComponent(staffBusinessId));}}>خروج و ورود با شماره آشپزخانه</button></section>:<section className="staff-entry-screen"><h2>ورود کارکنان آشپزخانه</h2><PhoneLogin staffBusinessId={staffBusinessId||undefined} onDone={()=>{}}/></section>)}
      </div>

      {inboxOpen&&account&&<OrderDialog title="پیام‌های پشتیبانی" onClose={()=>setInboxOpen(false)}><ManagerInbox/></OrderDialog>}
      {account?.needsProfile&&currentView!=='customer'&&!profileDeferred&&<CompleteProfile onClose={()=>setProfileDeferred(true)}/>}
      {account?.needsProfile&&currentView!=='customer'&&profileDeferred&&<div className="profile-resume"><button className="staff-primary" onClick={()=>setProfileDeferred(false)}>ادامهٔ تکمیل حساب</button></div>}
      {sessionsOpen&&canManage&&<OrderDialog title="نشست‌ها و زمان حضور" onClose={()=>setSessionsOpen(false)}><SessionReport/></OrderDialog>}
      {staffOpen&&canManage&&<OrderDialog title="مدیریت گارسون‌ها" onClose={()=>setStaffOpen(false)}><StaffManager/></OrderDialog>}
      {reportMode&&canManage&&<OrderDialog title={reportMode==='feedback'?'ارزیابی مشتریان':'باشگاه مشتریان'} onClose={()=>setReportMode(null)}><FeedbackReports mode={reportMode}/></OrderDialog>}
      {teamOpen&&account?.businessRole==='owner'&&<OrderDialog title="دسترسی کارکنان" onClose={()=>setTeamOpen(false)}><TeamAccess key={account.businessId}/></OrderDialog>}
      {billingOpen&&account&&canManage&&<OrderDialog title="تنظیمات مالیات و خدمات" onClose={()=>setBillingOpen(false)}><BillingSettingsEditor/></OrderDialog>}
      {appearanceOpen&&account&&<OrderDialog title="ظاهر منوی مشتری" onClose={()=>setAppearanceOpen(false)}><MenuAppearance onPreview={()=>setAppearanceOpen(false)} /></OrderDialog>}
      {manager&&account&&canManage&&!account.needsProfile&&isServerConnected&&!hasAnyProducts&&categories.length===0&&<MenuSetupWizard key={activeMenuId}/>}
      <UndoProduct/>
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

