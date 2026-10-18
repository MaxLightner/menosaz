import {BrandLogo} from '../common/BrandLogo';
import {ProductPriceEditor} from './ProductPriceEditor';
import {EditProductImage} from '../modals/EditProductImage';
import type {Product} from '../../types';
import {localProductImage} from '../../services/menuPresentation';
import {MenusManager} from './MenusManager';
import {usePresentation} from '../../context/PresentationContext';
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {printQrStands} from '../../lib/printQrStands';
import { useApp } from '../../context/AppContext';
import { AddDishModal } from '../modals/AddDishModal';
import { AllQRAccessModal } from '../modals/AllQRAccessModal';

export const DesktopDashboard: React.FC = () => {
  const { 
    business,menus,activeMenuId,assignProductMenu, 
    updateBusinessSettings, 
    products, 
    toggleProductAvailability,
    archiveProduct,
    orders, 
    servicePoints, 
    toggleTableOccupancy,
    setCurrentView, 
    setSelectedTableNumber,
    isNetworkOnline,
    isServerConnected,
    showToast
  } = useApp();
  const {openSample}=usePresentation();

  const [isAllQrModalOpen, setIsAllQrModalOpen] = useState(false);
  const [allQrModalTab, setAllQrModalTab] = useState<'tables' | 'waiter' | 'kitchen'>('tables');
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [selectedHubTable, setSelectedHubTable] = useState<number>(4);
  const [menuSearch, setMenuSearch] = useState('');
  const [editingImage,setEditingImage]=useState<Product|null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'tables' | 'three_apps_qr'>(()=>{try{const saved=sessionStorage.getItem('mizato-desktop-panel');return ["overview","menu","tables","three_apps_qr"].includes(saved||'')?saved as 'overview' | 'menu' | 'tables' | 'three_apps_qr':'menu';}catch{return 'menu';}});
  useEffect(()=>{try{sessionStorage.setItem('mizato-desktop-panel',activeTab);}catch{}},[activeTab]);

  // Hub QR Codes URLs
  const [hubTableQrUrl, setHubTableQrUrl] = useState<string>('');
  const [hubWaiterQrUrl, setHubWaiterQrUrl] = useState<string>('');
  const [hubKitchenQrUrl, setHubKitchenQrUrl] = useState<string>('');

  const baseUrl = (import.meta.env.VITE_PUBLIC_URL||window.location.origin).replace(/\/$/,'');
  const point = servicePoints.find(p=>p.tableNumber===selectedHubTable);
  const currentTableUrl = point?.qrCodeUrl||`${baseUrl}/?view=customer&business=${business.id}&table=${selectedHubTable}`;
  const currentWaiterUrl = `${baseUrl}/?view=waiter`;
  const currentKitchenUrl = `${baseUrl}/?view=kitchen`;

  useEffect(() => {
    // 1. Table QR
    QRCode.toDataURL(currentTableUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel:'L',
      color: { dark: '#465B3F', light: '#FFFFFF' }
    }).then(setHubTableQrUrl).catch(console.error);

    // 2. Waiter QR
    QRCode.toDataURL(currentWaiterUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel:'L',
      color: { dark: '#465B3F', light: '#FFFFFF' }
    }).then(setHubWaiterQrUrl).catch(console.error);

    // 3. Kitchen QR
    QRCode.toDataURL(currentKitchenUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel:'L',
      color: { dark: '#B45309', light: '#FFFFFF' }
    }).then(setHubKitchenQrUrl).catch(console.error);
  }, [currentTableUrl, currentWaiterUrl, currentKitchenUrl, selectedHubTable]);

  const printAllTableStands=()=>printQrStands(servicePoints,business.name,baseUrl,showToast);

  const [archivingId,setArchivingId]=useState<string|null>(null);
  async function removeProductFromMenu(product:Product){
    if(!window.confirm('«'+product.name+'» از منوی مشتری حذف و به آرشیو خصوصی منتقل شود؟'))return;
    setArchivingId(product.id);
    try{await archiveProduct(product.id);}
    catch(error){showToast((error as Error).message||'حذف از منو انجام نشد.');}
    finally{setArchivingId(null);}
  }
  // Filtered products for quick editor
  const filteredProducts = products.filter(p => 
    menuSearch.trim() === '' || 
    p.name.includes(menuSearch) || 
    p.description.includes(menuSearch)
  );

  // Active / urgent orders
  const pendingOrders = orders.filter(o => o.status === 'pending_waiter');
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'ready' || (o.status === 'cooking' && o.deliveryStatus === 'pending'));

  // Calculate live daily revenue from all non-cancelled orders
  const todayRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const occupiedTablesCount = servicePoints.filter(sp => sp.isOccupied).length;

  const copyLink = async (url: string, name: string) => {
    try { await navigator.clipboard.writeText(url); showToast(`لینک مستقیم ${name} با موفقیت کپی شد`); }
    catch { showToast('کپی لینک انجام نشد؛ دسترسی کلیپ‌بورد مرورگر را بررسی کن.'); }
  };

  return (
    <div className="h-screen bg-[#F6F7F4] text-[#29372E] flex overflow-hidden font-sans">
      
      {/* 1. PERSISTENT RTL SIDE NAVIGATION (w-64) */}
      <aside className="w-64 flex-shrink-0 bg-[#FFFFFF] border-l border-[#DBE2D5] flex flex-col justify-between h-full z-30 select-none shadow-sm">
        {/* Top Brand & Venue Header */}
        <div className="p-3.5 border-b border-[#DBE2D5]">
          {/* Platform Brand */}
          <div className="flex items-center justify-between mb-3.5">
            <button 
              onClick={() => setCurrentView('website')}
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
            >
              <BrandLogo compact/>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f0ede9] text-[#465B3F] text-[11px] border border-[#DBE2D5] font-bold">
              پنل مدیریت
            </span>
          </div>

          {/* Restaurant Active Profile Card */}
          <div className="bg-[#EEF2E8]/60 border border-[#DBE2D5] rounded-xl p-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#DBE2D5] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[#465B3F] text-[24px]">storefront</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm truncate text-[#29372E] font-bold">{business.name}</h2>
                <p className="text-xs text-[#506354] truncate">{business.branchName}</p>
              </div>
            </div>

            {/* Online Status Indicator */}
            <div className="mt-2.5 pt-2 border-t border-[#DBE2D5]/70 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span className="text-[11px] text-[#465B3F] font-semibold">منوی دیجیتال آنلاین است</span>
              </div>

            </div>
          </div>
        </div>

        {/* Navigation Tab Links */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
          {/* 3. Menu Management */}
          <button 
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              activeTab === 'menu'
                ? 'bg-gradient-to-l from-[#465B3F]/15 to-transparent border-r-4 border-[#465B3F] text-[#29372E] font-bold'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#506354]">restaurant_menu</span>
              <span>غذاها و منوهای مجموعه</span>
            </div>
            <span className="text-[11px] text-[#506354] bg-[#EEF2E8] px-2 py-0.5 rounded-full border border-[#DBE2D5]">
              {products.length} آیتم
            </span>
          </button>

          {/* 1. Overview */}
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-l from-[#465B3F]/15 to-transparent border-r-4 border-[#465B3F] text-[#29372E]'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#465B3F]">receipt_long</span>
              <span>سفارش‌ها و گزارش کوتاه</span>
            </div>
            {orders.length > 0 && (
              <span className="bg-[#465B3F] text-white text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold">
                {orders.length}
              </span>
            )}
          </button>

          {/* 4. Tables & Service Points */}
          <button 
            onClick={() => setActiveTab('tables')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              activeTab === 'tables'
                ? 'bg-gradient-to-l from-[#465B3F]/15 to-transparent border-r-4 border-[#465B3F] text-[#29372E] font-bold'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#506354]">table_restaurant</span>
              <span>میزها و نقاط سالن ({servicePoints.length})</span>
            </div>
            <span className="text-[#506354] text-[11px] bg-[#EEF2E8] px-2 py-0.5 rounded-full border border-[#DBE2D5]">
              {occupiedTablesCount} اشغال
            </span>
          </button>

          {/* Direct Role Jumpers */}
          <div className="pt-2 border-t border-[#DBE2D5] space-y-1">
            <div className="px-3 py-1 text-[11px] font-bold text-[#64715E]">
              ورود سریع به نمای اپ‌ها:
            </div>
            <button 
              onClick={() => setCurrentView('waiter')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[#59413d] hover:bg-[#f6f3ee] text-xs transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#465B3F]">person_apron</span>
                <span>اپلیکیشن گارسون</span>
              </div>
              {pendingOrders.length > 0 && (
                <span className="bg-[#465B3F] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                  {pendingOrders.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setCurrentView('kitchen')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[#59413d] hover:bg-[#f6f3ee] text-xs transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#B45309]">soup_kitchen</span>
                <span>مانیتور آشپزخانه (KDS)</span>
              </div>
              {cookingOrders.length > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {cookingOrders.length}
                </span>
              )}
            </button>
          </div>
        </nav>

        <div className="manager-sidebar-support"><a href="tel:09152061541">تماس با پشتیبانی ↗</a><small>میزاتو · مدیریت مجموعه</small></div>
      </aside>

      {/* MAIN WORKSPACE & DASHBOARD CANVAS */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F6F7F4]">
        
        {/* 2. TOP APP BAR (HEADER) */}
        <header className="h-14 bg-[#FFFFFF] border-b border-[#DBE2D5] px-5 flex items-center justify-between flex-shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-4">
            {/* Acceptance Toggle */}
            <div className="flex items-center gap-2.5 bg-emerald-50/90 border border-emerald-200/90 px-3 py-1 rounded-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-xs text-emerald-950 font-medium">پذیرش سفارش از میزها:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={business.orderAcceptanceActive}
                  onChange={(e) => updateBusinessSettings({ orderAcceptanceActive: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:right-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-700"></div>
              </label>
              <span className="text-[11px] text-emerald-800 font-bold">
                {business.orderAcceptanceActive ? 'فعال' : 'غیرفعال'}
              </span>
            </div>

            <div className="hidden lg:flex items-center text-[#506354] text-xs gap-1.5 border-r border-[#DBE2D5] pr-3">
              <span className={"material-symbols-outlined text-[16px] "+(isServerConnected?"text-emerald-600":"text-amber-600")}>{isServerConnected?'cloud_done':'cloud_off'}</span>
              <span>{isServerConnected?'ارتباط با سرور برقرار است':'در انتظار اتصال به سرور'}</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button type="button" className="px-2 py-1.5 rounded-lg border border-[#DBE2D5] text-xs" onClick={()=>window.history.state?.mizatoView?window.history.back():setCurrentView('website')} title="بازگشت به صفحه قبل">
              <span className="material-symbols-outlined text-base align-middle">arrow_forward</span> بازگشت
            </button>
            <select aria-label="جابجایی بین بخش‌های پنل" value={activeTab} onChange={e=>setActiveTab(e.target.value as typeof activeTab)} className="max-w-36 border border-[#DBE2D5] rounded-lg bg-white text-xs px-2 py-2">
              <option value="menu">مدیریت منو</option><option value="overview">سفارش‌ها</option><option value="tables">میزها</option><option value="three_apps_qr">QR و اپلیکیشن‌ها</option>
            </select>
            <button
              onClick={() => {
                setAllQrModalTab('tables');
                setIsAllQrModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2E8] border border-[#E2D5C3] text-[#465B3F] rounded-xl text-xs font-bold hover:bg-[#F2DECC] transition-colors"
            >
              <span className="material-symbols-outlined text-base">qr_code_2</span>
              <span>کیو آر کد ۳ اپلیکیشن</span>
            </button>

            <button 
              onClick={() => setIsAddDishModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>افزودن غذای جدید</span>
            </button>
          </div>
        </header>

        {/* 3. SCROLLABLE DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          
          {/* VIEW TAB A: THREE DEDICATED APPS & QR CONTROL CENTER */}
          {activeTab === 'three_apps_qr' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#EEF2E8] via-[#FFFFFF] to-[#F7F2E9] border border-[#DBE2D5] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#465B3F] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">
                      مرکز مدیریت ۳ اپلیکیشن اختصاصی و کیو آر کدهای پایدار پیچ شمرون
                    </h2>
                    <p className="text-xs text-[#64715E] mt-1 leading-relaxed">
                      هر سرویس‌پوینت (میز) دارای یک QR اختصاصی پایدار، اپلیکیشن گارسون یک QR، و اپلیکیشن عملیاتی رستوران (KDS) هم دارای یک QR مستقل است. تمام اپلیکیشن‌ها به بک‌اند و دیتابیس مشترک متصل‌اند.
                    </p>
                  </div>
                </div>
              </div>

              {/* Three Big Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* 1. Customer App Card */}
                <div className="bg-[#FFFFFF] border-2 border-[#DBE2D5] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#465B3F]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#DBE2D5]">
                      <div className="flex items-center gap-2 text-[#465B3F]">
                        <span className="material-symbols-outlined text-2xl">table_restaurant</span>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">۱. اپلیکیشن مشتری (سر میز)</h3>
                      </div>
                      <span className="bg-[#EEF2E8] text-[#465B3F] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {servicePoints.length} میز مستقل
                      </span>
                    </div>

                    <p className="text-xs text-[#64715E] mt-2.5 leading-relaxed">
                      مشتری با اسکن این کیو آر کد، منوی منتشرشده رستوران را مشاهده و سفارش مستقل خود را بدون نیاز به ساخت حساب ثبت می‌کند.
                    </p>

                    {/* Table selector for live QR display */}
                    <div className="mt-3 bg-[#F6F7F4] p-2.5 rounded-xl border border-[#DBE2D5] space-y-2">
                      <label className="text-[11px] font-bold text-[#1C1917] block">
                        تغییر شماره میز برای تولید QR اختصاصی:
                      </label>
                      <div className="grid grid-cols-8 gap-1">
                        {servicePoints.map((sp) => (
                          <button
                            key={sp.id}
                            onClick={() => setSelectedHubTable(sp.tableNumber)}
                            className={`p-1 rounded text-xs font-bold transition-all ${
                              selectedHubTable === sp.tableNumber 
                                ? 'bg-[#465B3F] text-white shadow-xs' 
                                : 'bg-white border border-[#DBE2D5] text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {sp.tableNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Preview Box */}
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-[#F6F7F4] rounded-2xl border border-dashed border-[#DBE2D5]">
                      {hubTableQrUrl ? (
                        <img src={hubTableQrUrl} alt={`QR میز ${selectedHubTable}`} className="w-40 h-40 object-contain shadow-xs bg-white p-2 rounded-xl" />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-bold text-[#465B3F] mt-2">
                        کیو آر کد اختصاصی میز {selectedHubTable} ({business.name})
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono mt-0.5 break-all text-center">
                        /?view=customer&table={selectedHubTable}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#DBE2D5]">
                    <button
                      onClick={() => {
                        setSelectedTableNumber(selectedHubTable);
                        openSample(null);
                      }}
                      className="w-full py-2.5 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>مشاهده زنده نمای مشتری (میز {selectedHubTable})</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentTableUrl, `منوی میز ${selectedHubTable}`)}
                        className="py-2 bg-[#EEF2E8] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      {hubTableQrUrl && (
                        <a
                          href={hubTableQrUrl}
                          download={`QR-PichShemroon-Table-${selectedHubTable}.png`}
                          className="py-2 bg-[#EEF2E8] hover:bg-[#F2DECC] text-[#465B3F] border border-[#F2DECC] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>دانلود تصویر QR</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Waiter App Card */}
                <div className="bg-[#FFFFFF] border-2 border-[#DBE2D5] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#465B3F]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#DBE2D5]">
                      <div className="flex items-center gap-2 text-[#465B3F]">
                        <span className="material-symbols-outlined text-2xl">person_apron</span>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">۲. اپلیکیشن گارسون و سالن‌دار</h3>
                      </div>
                      <span className="bg-[#EAF2EC] text-[#465B3F] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        شیفت سالن
                      </span>
                    </div>

                    <p className="text-xs text-[#64715E] mt-2.5 leading-relaxed">
                      گارسون با گوشی سفارش‌های ثبت‌شده میزها را می‌بیند، تایید کرده و تحویل به میز را ثبت می‌نماید. همچنین امکان ثبت سفارش دستی سر میز را دارد.
                    </p>

                    {/* Waiter Status Badge */}
                    <div className="mt-3 bg-[#F6F7F4] p-3 rounded-xl border border-[#DBE2D5] flex items-center justify-between text-xs">
                      <span className="text-[#506354]">سفارشات معلق نیاز به تایید:</span>
                      <span className="font-bold text-[#465B3F] font-mono">{pendingOrders.length} سفارش</span>
                    </div>

                    {/* QR Preview Box */}
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-[#F6F7F4] rounded-2xl border border-dashed border-[#DBE2D5]">
                      {hubWaiterQrUrl ? (
                        <img src={hubWaiterQrUrl} alt="QR اپ گارسون" className="w-40 h-40 object-contain shadow-xs bg-white p-2 rounded-xl" />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-bold text-[#465B3F] mt-2">
                        کیو آر کد اختصاصی ورود گارسون
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono mt-0.5 break-all text-center">
                        /?view=waiter
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#DBE2D5]">
                    <button
                      onClick={() => setCurrentView('waiter')}
                      className="w-full py-2.5 bg-[#465B3F] hover:bg-[#324235] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود و مشاهده نمای اپلیکیشن گارسون</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentWaiterUrl, 'اپلیکیشن گارسون')}
                        className="py-2 bg-[#EEF2E8] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      {hubWaiterQrUrl && (
                        <a
                          href={hubWaiterQrUrl}
                          download="QR-PichShemroon-Waiter.png"
                          className="py-2 bg-[#EAF2EC] hover:bg-[#D8E8DC] text-[#465B3F] border border-[#C5E3CE] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>دانلود تصویر QR</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Kitchen KDS Card */}
                <div className="bg-[#FFFFFF] border-2 border-[#DBE2D5] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#B45309]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#DBE2D5]">
                      <div className="flex items-center gap-2 text-[#B45309]">
                        <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">۳. اپلیکیشن رستوران و آشپزخانه (KDS)</h3>
                      </div>
                      <span className="bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        پخت و بار
                      </span>
                    </div>

                    <p className="text-xs text-[#64715E] mt-2.5 leading-relaxed">
                      مانیتور عملیات آشپزخانه با تایمرهای تاخیر پخت، تفکیک مستقل تحویل از تسویه، و پایداری کامل در زمان قطعی وای‌فای با کش IndexedDB.
                    </p>

                    {/* KDS Status Badge */}
                    <div className="mt-3 bg-[#F6F7F4] p-3 rounded-xl border border-[#DBE2D5] flex items-center justify-between text-xs">
                      <span className="text-[#506354]">غذاهای در حال پخت:</span>
                      <span className="font-bold text-[#B45309] font-mono">{cookingOrders.length} تیکت</span>
                    </div>

                    {/* QR Preview Box */}
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-[#F6F7F4] rounded-2xl border border-dashed border-[#DBE2D5]">
                      {hubKitchenQrUrl ? (
                        <img src={hubKitchenQrUrl} alt="QR اپ رستوران KDS" className="w-40 h-40 object-contain shadow-xs bg-white p-2 rounded-xl" />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-bold text-[#B45309] mt-2">
                        کیو آر کد اختصاصی مانیتور آشپزخانه
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono mt-0.5 break-all text-center">
                        /?view=kitchen
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#DBE2D5]">
                    <button
                      onClick={() => setCurrentView('kitchen')}
                      className="w-full py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود و مشاهده مانیتور آشپزخانه (KDS)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentKitchenUrl, 'اپلیکیشن آشپزخانه (KDS)')}
                        className="py-2 bg-[#EEF2E8] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      {hubKitchenQrUrl && (
                        <a
                          href={hubKitchenQrUrl}
                          download="QR-PichShemroon-Kitchen-KDS.png"
                          className="py-2 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>دانلود تصویر QR</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB B: OVERVIEW (DEFAULT) */}
          {activeTab === 'overview' && (
            <>
              {/* TOP KPI CARDS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Daily Sales */}
                <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">فروش امروز</span>
                    <div className="text-xl font-extrabold text-[#29372E] font-mono mt-1">
                      {todayRevenue.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[#506354]">تومان</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-bold mt-1 inline-block">
                      {orders.filter(o => o.status !== 'cancelled').length} فاکتور ثبت‌شده
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#EEF2E8] text-[#465B3F] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                </div>

                {/* 2. Table Occupancy */}
                <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">ضریب اشغال میزها</span>
                    <div className="text-xl font-extrabold text-[#29372E] font-mono mt-1">
                      {occupiedTablesCount} <span className="text-xs font-normal text-[#506354]">از ۱۶ میز</span>
                    </div>
                    <span className="text-[11px] text-[#506354] mt-1 inline-block">
                      {16 - occupiedTablesCount} میز آماده پذیرش مهمان
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#EAF2EC] text-[#465B3F] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">table_restaurant</span>
                  </div>
                </div>

                {/* 3. Waiter In-Queue */}
                <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">سفارشات در صف تایید</span>
                    <div className="text-xl font-extrabold text-[#465B3F] font-mono mt-1">
                      {pendingOrders.length} <span className="text-xs font-normal text-[#506354]">سفارش جدید</span>
                    </div>
                    <span className="text-[11px] text-[#465B3F] font-bold mt-1 inline-block">
                      نیازمند تایید سالن‌دار
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-[#465B3F] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">notifications_active</span>
                  </div>
                </div>

                {/* 4. Kitchen Cooking */}
                <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">تیکت‌های پخت در آشپزخانه</span>
                    <div className="text-xl font-extrabold text-[#B45309] font-mono mt-1">
                      {cookingOrders.length} <span className="text-xs font-normal text-[#506354]">در حال آماده‌سازی</span>
                    </div>
                    <span className="text-[11px] text-amber-800 font-bold mt-1 inline-block">
                      {readyOrders.length} غذا آماده تحویل به سالن
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
                  </div>
                </div>
              </section>

              {/* THREE DEDICATED APPS ACCESS BANNER */}
              <section className="bg-gradient-to-r from-[#EEF2E8] via-[#FFFFFF] to-[#F7F2E9] border border-[#E2D5C3] rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#DBE2D5]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#465B3F] text-xl">qr_code_2</span>
                    <h3 className="text-sm font-extrabold text-[#1C1917]">
                      درگاه‌های اختصاصی ۳ اپلیکیشن پلتفرم (مشتری، گارسون، آشپزخانه)
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('three_apps_qr')}
                    className="text-xs font-bold text-[#465B3F] hover:underline flex items-center gap-1"
                  >
                    <span>مشاهده مرکز کامل QR کدها</span>
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white border border-[#DBE2D5] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">۱. منوی مشتری (میز {selectedHubTable})</span>
                      <span className="text-[11px] text-[#64715E]">اسکن QR سر میز بدون لاگین</span>
                    </div>
                    <button
                      onClick={() => { setSelectedTableNumber(selectedHubTable); openSample(null); }}
                      className="px-2.5 py-1.5 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود</span>
                    </button>
                  </div>

                  <div className="bg-white border border-[#DBE2D5] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">۲. اپلیکیشن گارسون</span>
                      <span className="text-[11px] text-[#64715E]">تایید سفارشات و تحویل میز</span>
                    </div>
                    <button
                      onClick={() => setCurrentView('waiter')}
                      className="px-2.5 py-1.5 bg-[#465B3F] hover:bg-[#324235] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود</span>
                    </button>
                  </div>

                  <div className="bg-white border border-[#DBE2D5] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">۳. مانیتور آشپزخانه KDS</span>
                      <span className="text-[11px] text-[#64715E]">مانیتورینگ پخت با کش آفلاین</span>
                    </div>
                    <button
                      onClick={() => setCurrentView('kitchen')}
                      className="px-2.5 py-1.5 bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* LIVE ORDERS STREAM */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg text-[#29372E] font-extrabold">سفارش‌های زنده میزها</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#465B3F]/15 border border-[#465B3F]/30 text-[#465B3F] text-xs font-bold">
                      {orders.length} سفارش در جریان
                    </span>
                  </div>
                  <button 
                    onClick={() => setCurrentView('kitchen')}
                    className="text-xs font-bold text-[#465B3F] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>مشاهده نمایشگر تمام‌صفحه آشپزخانه (KDS)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {orders.slice(0, 4).map((order) => {
                    const isPending = order.status === 'pending_waiter';
                    const isCooking = order.status === 'cooking';
                    const isDelivered = order.deliveryStatus === 'delivered';
                    const isSettled = order.paymentStatus !== 'unpaid';

                    return (
                      <div 
                        key={order.id}
                        className={`bg-[#FFFFFF] rounded-2xl p-4 shadow-sm flex flex-col justify-between border-2 transition-all ${
                          isPending ? 'border-[#465B3F]/80' : isCooking ? 'border-amber-400' : 'border-[#DBE2D5]'
                        }`}
                      >
                        <div>
                          {/* Order Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-[#DBE2D5]">
                            <div className="flex items-center gap-2.5">
                              <span className="px-3 py-1 bg-gradient-to-br from-[#465B3F] to-[#6E9564] text-white rounded-xl text-xs font-black shadow-xs">
                                میز {order.tableNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#29372E]">سفارش {order.orderNumber}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isPending ? 'bg-red-100 text-[#465B3F] animate-pulse' :
                                    isCooking ? 'bg-amber-100 text-amber-900' :
                                    'bg-emerald-100 text-emerald-900'
                                  }`}>
                                    {isPending ? 'در انتظار تأیید گارسون' : isCooking ? 'در حال پخت آشپزخانه' : 'آماده / تحویل'}
                                  </span>
                                </div>
                                <span className="text-xs text-[#506354] font-mono mt-0.5 block">
                                  {new Date(order.createdAt).toLocaleTimeString('fa-IR')}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-[#64715E]">{order.customerName}</span>
                          </div>

                          {/* Items List */}
                          <div className="py-3 space-y-1.5 divide-y divide-[#EEF2E8]">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-[#EEF2E8] text-[#465B3F] font-bold flex items-center justify-center text-xs">
                                    {it.quantity}×
                                  </span>
                                  <div>
                                    <span className="font-bold text-[#29372E]">{it.productName}</span>
                                    {it.selectedOptions && it.selectedOptions.length > 0 && (
                                      <p className="text-[11px] text-[#506354]">
                                        {it.selectedOptions.map(o => o.optionName).join('، ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="font-mono text-[#506354] font-bold">
                                  {it.itemTotal.toLocaleString('fa-IR')} ت
                                </span>
                              </div>
                            ))}

                            {order.customerNotes && (
                              <div className="mt-2 p-2 rounded-xl bg-amber-50 text-amber-950 text-xs border border-dashed border-amber-200">
                                یادداشت مشتری: {order.customerNotes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-[#DBE2D5] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <span className="text-xs text-[#506354] block">جمع فاکتور:</span>
                            <span className="text-base font-extrabold text-[#29372E] font-mono">
                              {order.totalAmount.toLocaleString('fa-IR')} تومان
                            </span>
                            <div className="text-[11px] mt-0.5">
                              <span className={isDelivered ? 'text-emerald-800 font-bold' : 'text-amber-800'}>
                                {isDelivered ? 'تحویل شد ✓' : 'تحویل: در جریان'}
                              </span>
                              <span className="mx-1">|</span>
                              <span className={isSettled ? 'text-emerald-800 font-bold' : 'text-[#465B3F] font-bold'}>
                                {isSettled ? 'تسویه شد ✓' : 'در انتظار تسویه'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-[#506354]">دریافت وجه، ارسال به آشپزخانه و تحویل را گارسون از حساب خودش ثبت می‌کند.</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* VIEW TAB B: THREE DEDICATED APPS & QR PORTALS */}
          {activeTab === 'three_apps_qr' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#465B3F] to-[#B45309] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                  </div>
                  <div>
                    <h3 className="text-base text-[#1C1917] font-black">
                      مرکز مدیریت ۳ اپلیکیشن و کیو‌آر کدهای اختصاصی میزاتو
                    </h3>
                    <p className="text-xs text-[#64715E] mt-0.5">
                      هر سرویس‌پوینت (میز) دارای یک QR کد مستقل است، همچنین اپ گارسون و مانیتور رستوران به تفکیک دارای لینک و QR هستند.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={printAllTableStands}
                    className="px-4 py-2 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>چاپ استند تمام میزها</span>
                  </button>
                </div>
              </div>

              {/* Three Apps Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* 1. CUSTOMER APP (PER TABLE QR) */}
                <div className="bg-[#FFFFFF] border-2 border-[#465B3F]/30 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#465B3F] to-[#51805A]"></div>
                  
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#EEF2E8] text-[#465B3F] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">menu_book</span>
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1C1917]">۱. منوی دیجیتال مشتری</h4>
                          <span className="text-[10px] text-stone-500 font-mono">Customer QR App</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#EEF2E8] text-[#465B3F] border border-[#F2DECC] rounded-full text-[10px] font-bold">
                        میز {selectedHubTable} انتخابی
                      </span>
                    </div>

                    <p className="text-xs text-[#64715E]">
                      مهمان با دوربین گوشی اسکن کرده و بدون لاگین منو را می‌بیند، غذا سفارش می‌دهد و سالن‌دار را صدا می‌زند.
                    </p>

                    {/* Table Selector Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[#1C1917] block">تغییر سرویس‌پوینت (شماره میز):</span>
                      <div className="grid grid-cols-8 gap-1">
                        {servicePoints.map(sp => (
                          <button
                            key={sp.id}
                            onClick={() => setSelectedHubTable(sp.tableNumber)}
                            className={`py-1 rounded-lg text-xs font-bold transition-all ${
                              selectedHubTable === sp.tableNumber
                                ? 'bg-[#465B3F] text-white shadow-xs font-black'
                                : sp.isOccupied
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-[#EEF2E8] text-stone-700 hover:bg-[#DBE2D5]'
                            }`}
                            title={`میز ${sp.tableNumber} - ${sp.isOccupied ? 'اشغال' : 'خالی'}`}
                          >
                            {sp.tableNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Code Preview Box */}
                    <div className="bg-[#F6F7F4] p-4 rounded-2xl border border-[#DBE2D5] flex flex-col items-center justify-center space-y-2">
                      {hubTableQrUrl ? (
                        <img 
                          src={hubTableQrUrl} 
                          alt={`QR میز ${selectedHubTable}`} 
                          className="w-44 h-44 rounded-xl shadow-xs border border-stone-200 bg-white p-2"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-black text-[#465B3F]">
                        استند رومیزی میز {selectedHubTable} • سالن پیچ شمرون
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono break-all text-center">
                        {currentTableUrl}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-[#DBE2D5]">
                    <button
                      onClick={() => {
                        setSelectedTableNumber(selectedHubTable);
                        openSample(null);
                      }}
                      className="w-full py-2.5 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>ورود و تست زنده منوی میز {selectedHubTable}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentTableUrl, `منوی میز ${selectedHubTable}`)}
                        className="py-2 bg-[#F6F7F4] hover:bg-[#EEF2E8] text-[#1C1917] border border-[#DBE2D5] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      <a
                        href={hubTableQrUrl}
                        download={`menuyar-table-${selectedHubTable}-qr.png`}
                        className="py-2 bg-[#F6F7F4] hover:bg-[#EEF2E8] text-[#1C1917] border border-[#DBE2D5] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>دانلود QR</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 2. WAITER APP */}
                <div className="bg-[#FFFFFF] border-2 border-[#465B3F]/30 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#465B3F] to-[#506354]"></div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#EAF2EC] text-[#465B3F] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">person_apron</span>
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1C1917]">۲. اپلیکیشن گارسون و سالن‌دار</h4>
                          <span className="text-[10px] text-stone-500 font-mono">Waiter Floor App</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#EAF2EC] text-[#465B3F] border border-[#D0E5D2] rounded-full text-[10px] font-bold">
                        شیفت فعال
                      </span>
                    </div>

                    <p className="text-xs text-[#64715E]">
                      گارسون سفارشات ثبت‌شده مشتریان را با یک لمس تأیید می‌کند، سفارش حضوری می‌زند و فراخوان‌های میزها را پاسخ می‌دهد.
                    </p>

                    <div className="p-3 bg-[#EEF2E8]/70 rounded-2xl border border-[#DBE2D5] flex items-center justify-around text-center">
                      <div>
                        <span className="text-base font-black text-[#51805A] block">{pendingOrders.length}</span>
                        <span className="text-[10px] text-stone-600">در انتظار تأیید</span>
                      </div>
                      <div className="w-px h-8 bg-stone-300"></div>
                      <div>
                        <span className="text-base font-black text-[#465B3F] block">{readyOrders.length}</span>
                        <span className="text-[10px] text-stone-600">آماده تحویل به میز</span>
                      </div>
                    </div>

                    {/* QR Code Preview Box */}
                    <div className="bg-[#F6F7F4] p-4 rounded-2xl border border-[#DBE2D5] flex flex-col items-center justify-center space-y-2">
                      {hubWaiterQrUrl ? (
                        <img 
                          src={hubWaiterQrUrl} 
                          alt="QR اپلیکیشن گارسون" 
                          className="w-44 h-44 rounded-xl shadow-xs border border-stone-200 bg-white p-2"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-black text-[#465B3F]">
                        کیو‌آر کد پرسنلی ورود سالن‌دار
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono break-all text-center">
                        {currentWaiterUrl}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-[#DBE2D5]">
                    <button
                      onClick={() => setCurrentView('waiter')}
                      className="w-full py-2.5 bg-[#465B3F] hover:bg-[#324235] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود مستقیم به اپلیکیشن گارسون</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentWaiterUrl, 'اپلیکیشن گارسون')}
                        className="py-2 bg-[#F6F7F4] hover:bg-[#EEF2E8] text-[#1C1917] border border-[#DBE2D5] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      <a
                        href={hubWaiterQrUrl}
                        download="menuyar-waiter-qr.png"
                        className="py-2 bg-[#F6F7F4] hover:bg-[#EEF2E8] text-[#1C1917] border border-[#DBE2D5] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>دانلود QR</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3. KITCHEN KDS APP */}
                <div className="bg-[#FFFFFF] border-2 border-[#B45309]/30 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#B45309] to-[#D35400]"></div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">soup_kitchen</span>
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1C1917]">۳. مانیتور عملیات آشپزخانه (KDS)</h4>
                          <span className="text-[10px] text-stone-500 font-mono">Kitchen KDS Monitor</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span>کش پایدار آفلاین</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#64715E]">
                      نمایشگر لمسی سرآشپز با تایمرهای رنگی تاخیر، هشدار صوتی، تفکیک مستقل تحویل از تسویه و پایداری در قطعی وای‌فای.
                    </p>

                    <div className="p-3 bg-[#EEF2E8]/70 rounded-2xl border border-[#DBE2D5] flex items-center justify-around text-center">
                      <div>
                        <span className="text-base font-black text-orange-600 block">{cookingOrders.length}</span>
                        <span className="text-[10px] text-stone-600">در حال پخت</span>
                      </div>
                      <div className="w-px h-8 bg-stone-300"></div>
                      <div>
                        <span className="text-base font-black text-emerald-700 block">{readyOrders.length}</span>
                        <span className="text-[10px] text-stone-600">آماده خط تحویل</span>
                      </div>
                    </div>

                    {/* QR Code Preview Box */}
                    <div className="bg-[#F6F7F4] p-4 rounded-2xl border border-[#DBE2D5] flex flex-col items-center justify-center space-y-2">
                      {hubKitchenQrUrl ? (
                        <img 
                          src={hubKitchenQrUrl} 
                          alt="QR مانیتور آشپزخانه" 
                          className="w-44 h-44 rounded-xl shadow-xs border border-stone-200 bg-white p-2"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-black text-[#B45309]">
                        کیو‌آر کد اتصال تبلت / نمایشگر آشپزخانه
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono break-all text-center">
                        {currentKitchenUrl}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-[#DBE2D5]">
                    <button
                      onClick={() => setCurrentView('kitchen')}
                      className="w-full py-2.5 bg-[#B45309] hover:bg-[#92400e] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود به مانیتور KDS آشپزخانه</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentKitchenUrl, 'مانیتور KDS آشپزخانه')}
                        className="py-2 bg-[#F6F7F4] hover:bg-[#EEF2E8] text-[#1C1917] border border-[#DBE2D5] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      <a
                        href={hubKitchenQrUrl}
                        download="menuyar-kitchen-kds-qr.png"
                        className="py-2 bg-[#F6F7F4] hover:bg-[#EEF2E8] text-[#1C1917] border border-[#DBE2D5] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>دانلود QR</span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>

              {/* Service Points QR Grid (All 16 Tables) */}
              <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DBE2D5] gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1C1917]">
                      گالری کیو‌آر کدهای تمامی ۱۶ سرویس‌پوینت سالن و تراس
                    </h4>
                    <p className="text-xs text-[#64715E]">
                      هر میز کیو‌آر کد پایدار مخصوص به خود دارد؛ انتخاب هر میز پیش‌نمایش QR آن را بالا فعال می‌کند.
                    </p>
                  </div>
                  <button
                    onClick={printAllTableStands}
                    className="px-3.5 py-1.5 bg-[#EEF2E8] hover:bg-[#F2DECC] text-[#465B3F] border border-[#F2DECC] rounded-xl text-xs font-bold"
                  >
                    چاپ دسته‌ای استندهای QR
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {servicePoints.map(sp => {
                    const hasOrder = orders.some(o => o.tableNumber === sp.tableNumber && o.status !== 'delivered');
                    return (
                      <div
                        key={sp.id}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 ${
                          selectedHubTable === sp.tableNumber
                            ? 'border-[#465B3F] bg-[#EEF2E8]/60 shadow-xs'
                            : hasOrder
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-[#DBE2D5] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-[#1C1917]">میز {sp.tableNumber}</span>
                          <span className={`w-2 h-2 rounded-full ${sp.isOccupied ? 'bg-[#465B3F]' : 'bg-emerald-600'}`}></span>
                        </div>
                        <span className="text-[10px] text-stone-500 truncate">{sp.label}</span>

                        <div className="pt-2 border-t border-[#DBE2D5] flex items-center justify-between gap-1">
                          <button
                            onClick={() => setSelectedHubTable(sp.tableNumber)}
                            className={`w-full py-1 rounded-lg text-[10px] font-bold ${
                              selectedHubTable === sp.tableNumber
                                ? 'bg-[#465B3F] text-white'
                                : 'bg-[#F6F7F4] text-stone-700 hover:bg-[#EEF2E8]'
                            }`}
                          >
                            {selectedHubTable === sp.tableNumber ? 'انتخاب شده ✓' : 'مشاهده QR'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB C: MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DBE2D5] gap-3">
                <div>
                  <h3 className="text-base text-[#29372E] font-bold">غذاهای منوی انتخاب‌شده</h3>
                  <p className="text-xs text-[#506354] mt-0.5">
                    هر تغییری بلافاصله در منوی دیجیتال مشتریان و تیکت‌های آشپزخانه اعمال می‌شود.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="جستجوی غذا یا قیمت..."
                    className="h-9 px-3 text-xs rounded-xl border border-[#DBE2D5] bg-[#F6F7F4] text-[#29372E] w-48"
                  />
                  <button 
                    onClick={() => setIsAddDishModalOpen(true)}
                    className="h-9 px-4 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>افزودن غذای جدید</span>
                  </button>
                </div>
              </div>

              <MenusManager/>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#EEF2E8]/60 text-[#506354] text-xs font-semibold border-b border-[#DBE2D5]">
                      <th className="py-2.5 px-3">تصویر و نام غذا</th>
                      <th className="py-2.5 px-3">قیمت فعلی (تومان)</th>
                      <th className="py-2.5 px-3 text-center">وضعیت موجودی</th>
                      <th className="py-2.5 px-3 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DBE2D5]/70 text-xs">
                    {!filteredProducts.length&&<tr><td colSpan={4} className="p-8 text-center">این منو هنوز آیتم ندارد؛ با «افزودن غذای جدید» لیست آن را بساز.</td></tr>}{filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-[#EEF2E8]/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg border border-[#DBE2D5] overflow-hidden flex-shrink-0 bg-stone-100">
                              <img onClick={()=>setEditingImage(prod)} src={localProductImage(prod)} alt={prod.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="font-bold text-[#29372E] block">{prod.name}</span>{menus.length>1&&<select aria-label={'انتقال به منوی دیگر: '+prod.name} value={prod.menuId||'main'} onChange={e=>assignProductMenu(prod.id,e.target.value).catch(err=>showToast(err.message))}>{menus.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>}
                              <span className="text-[11px] text-[#506354] line-clamp-1">{prod.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <ProductPriceEditor product={prod}/>
                            <span className="text-[10px] text-stone-500">تومان</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer relative">
                            <input 
                              type="checkbox" 
                              checked={prod.isAvailable}
                              onChange={(e) => toggleProductAvailability(prod.id, e.target.checked)}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 peer z-10" 
                            />
                            <div className="w-7 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700 relative"></div>
                            <span className={`text-[11px] font-bold ${prod.isAvailable ? 'text-emerald-800' : 'text-[#465B3F]'}`}>
                              {prod.isAvailable ? 'موجود' : 'ناموجود'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3 text-left"><button className="manager-photo-edit" aria-label={'ویرایش عکس '+prod.name} onClick={()=>setEditingImage(prod)}>عکس</button>{!menus.some(m=>m.id===(prod.menuId||'main')&&m.name==='آرشیو آیتم‌های حذف‌شده')&&<button type="button" className="text-xs text-red-700 border border-red-200 rounded-lg px-2 py-1" title="انتقال به آرشیو خصوصی" disabled={archivingId===prod.id} aria-label={'حذف '+prod.name+' از منو'} onClick={()=>removeProductFromMenu(prod)}>{archivingId===prod.id?'در حال حذف…':'حذف'}</button>}
                          <button 
                            onClick={() => {
                              setSelectedTableNumber(4);
                              openSample(null);
                            }}
                            className="p-1 text-[#506354] hover:text-[#465B3F]"
                            title="مشاهده در منوی مشتری"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW TAB D: TABLES MANAGEMENT */}
          {activeTab === 'tables' && (
            <div className="bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#DBE2D5]">
                <div>
                  <h3 className="text-base text-[#29372E] font-bold">میزها و سرویس‌پوینت‌های سالن</h3>
                  <p className="text-xs text-[#506354] mt-0.5">
                    کلیک روی هر میز وضعیت اشغال آن را تغییر می‌دهد.
                  </p>
                </div>
                <button
                  onClick={printAllTableStands}
                  className="px-3.5 py-1.5 bg-[#465B3F] text-white rounded-xl text-xs font-bold hover:bg-[#51805A]"
                >
                  چاپ استند QR میزها
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {servicePoints.map((sp) => {
                  const hasOrder = orders.some(o => o.tableNumber === sp.tableNumber && o.status !== 'delivered');
                  return (
                    <div 
                      key={sp.id}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 ${
                        hasOrder ? 'border-[#465B3F] bg-orange-50/70' :
                        sp.isOccupied ? 'border-amber-400 bg-amber-50/50' :
                        'border-emerald-200 bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[#1C1917]">میز {sp.tableNumber}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${sp.isOccupied ? 'bg-[#465B3F]' : 'bg-emerald-600'}`}></span>
                      </div>
                      <span className="text-[10px] text-[#64715E] truncate">{sp.label}</span>
                      
                      <div className="pt-2 border-t border-[#DBE2D5] flex items-center justify-between">
                        <button
                          onClick={() => toggleTableOccupancy(sp.tableNumber, !sp.isOccupied)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            sp.isOccupied ? 'bg-white text-stone-700' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {sp.isOccupied ? 'آزادسازی' : 'اشغال'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTableNumber(sp.tableNumber);
                            openSample(null);
                          }}
                          className="text-[10px] text-[#465B3F] font-bold"
                          title="تست منوی این میز"
                        >
                          منو
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ALL THREE APPS & QR ACCESS MODAL */}
      <AllQRAccessModal
        isOpen={isAllQrModalOpen}
        onClose={() => setIsAllQrModalOpen(false)}
        defaultTab={allQrModalTab}
      />

      {/* Add Dish Modal */}
      {editingImage&&<EditProductImage product={editingImage} onClose={()=>setEditingImage(null)}/>}
      <AddDishModal 
        isOpen={isAddDishModalOpen}
        onClose={() => setIsAddDishModalOpen(false)}
      />
    </div>
  );
};

