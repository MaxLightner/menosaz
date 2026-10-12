import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { AddDishModal } from '../modals/AddDishModal';
import { AllQRAccessModal } from '../modals/AllQRAccessModal';

export const DesktopDashboard: React.FC = () => {
  const { 
    business, 
    updateBusinessSettings, 
    products, 
    updateProductPrice, 
    toggleProductAvailability,
    orders, 
    updateOrderStatus, 
    updateDeliveryStatus, 
    updatePaymentStatus,
    servicePoints, 
    toggleTableOccupancy,
    setCurrentView, 
    setSelectedTableNumber,
    isNetworkOnline,
    showToast
  } = useApp();

  const [isAllQrModalOpen, setIsAllQrModalOpen] = useState(false);
  const [allQrModalTab, setAllQrModalTab] = useState<'tables' | 'waiter' | 'kitchen'>('tables');
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [selectedHubTable, setSelectedHubTable] = useState<number>(4);
  const [menuSearch, setMenuSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'tables' | 'three_apps_qr'>('overview');

  // Hub QR Codes URLs
  const [hubTableQrUrl, setHubTableQrUrl] = useState<string>('');
  const [hubWaiterQrUrl, setHubWaiterQrUrl] = useState<string>('');
  const [hubKitchenQrUrl, setHubKitchenQrUrl] = useState<string>('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentTableUrl = `${baseUrl}/?view=customer&table=${selectedHubTable}`;
  const currentWaiterUrl = `${baseUrl}/?view=waiter`;
  const currentKitchenUrl = `${baseUrl}/?view=kitchen`;

  useEffect(() => {
    // 1. Table QR
    QRCode.toDataURL(currentTableUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#8d1c13', light: '#FFFDF9' }
    }).then(setHubTableQrUrl).catch(console.error);

    // 2. Waiter QR
    QRCode.toDataURL(currentWaiterUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#3D4F41', light: '#FFFDF9' }
    }).then(setHubWaiterQrUrl).catch(console.error);

    // 3. Kitchen QR
    QRCode.toDataURL(currentKitchenUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#B45309', light: '#FFFDF9' }
    }).then(setHubKitchenQrUrl).catch(console.error);
  }, [currentTableUrl, currentWaiterUrl, currentKitchenUrl, selectedHubTable]);

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

  const copyLink = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    showToast(`لینک مستقیم ${name} با موفقیت کپی شد`);
  };

  return (
    <div className="h-screen bg-[#FBF8F3] text-[#1c1c19] flex overflow-hidden font-sans">
      
      {/* 1. PERSISTENT RTL SIDE NAVIGATION (w-64) */}
      <aside className="w-64 flex-shrink-0 bg-[#FFFDF9] border-l border-[#E8DFD3] flex flex-col justify-between h-full z-30 select-none shadow-sm">
        {/* Top Brand & Venue Header */}
        <div className="p-3.5 border-b border-[#E8DFD3]">
          {/* Platform Brand */}
          <div className="flex items-center justify-between mb-3.5">
            <button 
              onClick={() => setCurrentView('website')}
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8d1c13] via-[#A93226] to-[#c0392b] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[22px]">restaurant</span>
              </div>
              <span className="text-xl text-[#A93226] font-black tracking-tight">منویار</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f0ede9] text-[#3D4F41] text-[11px] border border-[#E8DFD3] font-bold">
              پنل مدیریت
            </span>
          </div>

          {/* Restaurant Active Profile Card */}
          <div className="bg-[#F4EFE6]/60 border border-[#E8DFD3] rounded-xl p-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#FFFDF9] border border-[#E8DFD3] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[#8d1c13] text-[24px]">storefront</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm truncate text-[#3E2723] font-bold">{business.name}</h2>
                <p className="text-xs text-[#506354] truncate">{business.branchName}</p>
              </div>
            </div>

            {/* Online Status Indicator */}
            <div className="mt-2.5 pt-2 border-t border-[#E8DFD3]/70 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span className="text-[11px] text-[#3D4F41] font-semibold">منوی دیجیتال آنلاین است</span>
              </div>
              <button 
                onClick={() => {
                  setSelectedTableNumber(4);
                  setCurrentView('customer');
                }}
                className="text-[#8d1c13] hover:text-[#A93226] text-[11px] flex items-center gap-0.5 font-bold transition-colors"
                title="مشاهده مستقیم منوی مشتری"
              >
                <span>نمایش</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tab Links */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
          {/* 1. Overview */}
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-l from-[#8d1c13]/15 to-transparent border-r-4 border-[#8d1c13] text-[#3E2723]'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#8d1c13]">receipt_long</span>
              <span>سفارش‌های زنده و شاخص‌ها</span>
            </div>
            {orders.length > 0 && (
              <span className="bg-[#8d1c13] text-white text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold">
                {orders.length}
              </span>
            )}
          </button>

          {/* 2. Three Dedicated Apps & QR Portals */}
          <button 
            onClick={() => setActiveTab('three_apps_qr')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'three_apps_qr'
                ? 'bg-gradient-to-l from-[#8d1c13]/15 to-transparent border-r-4 border-[#8d1c13] text-[#3E2723]'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#B45309]">qr_code_2</span>
              <span>مرکز ۳ اپلیکیشن و QRها</span>
            </div>
            <span className="bg-[#FAF0E4] text-[#8d1c13] border border-[#F2DECC] text-[10px] px-2 py-0.5 rounded-full font-bold">
              مشتری • گارسون • رستوران
            </span>
          </button>

          {/* 3. Menu Management */}
          <button 
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              activeTab === 'menu'
                ? 'bg-gradient-to-l from-[#8d1c13]/15 to-transparent border-r-4 border-[#8d1c13] text-[#3E2723] font-bold'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#506354]">restaurant_menu</span>
              <span>مدیریت منو و قیمت‌ها</span>
            </div>
            <span className="text-[11px] text-[#506354] bg-[#F4EFE6] px-2 py-0.5 rounded-full border border-[#E8DFD3]">
              {products.length} آیتم
            </span>
          </button>

          {/* 4. Tables & Service Points */}
          <button 
            onClick={() => setActiveTab('tables')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              activeTab === 'tables'
                ? 'bg-gradient-to-l from-[#8d1c13]/15 to-transparent border-r-4 border-[#8d1c13] text-[#3E2723] font-bold'
                : 'text-[#59413d] hover:bg-[#f6f3ee]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#506354]">table_restaurant</span>
              <span>میزها و نقاط سالن ({servicePoints.length})</span>
            </div>
            <span className="text-[#506354] text-[11px] bg-[#F4EFE6] px-2 py-0.5 rounded-full border border-[#E8DFD3]">
              {occupiedTablesCount} اشغال
            </span>
          </button>

          {/* Direct Role Jumpers */}
          <div className="pt-2 border-t border-[#E8DFD3] space-y-1">
            <div className="px-3 py-1 text-[11px] font-bold text-[#7A6458]">
              ورود سریع به نمای اپ‌ها:
            </div>
            <button 
              onClick={() => setCurrentView('waiter')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[#59413d] hover:bg-[#f6f3ee] text-xs transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#3D4F41]">person_apron</span>
                <span>اپلیکیشن گارسون</span>
              </div>
              {pendingOrders.length > 0 && (
                <span className="bg-[#8d1c13] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
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

        {/* Bottom Actions & Support */}
        <div className="p-3.5 border-t border-[#E8DFD3] space-y-2.5 bg-[#FAF7F2]/50">
          <div className="bg-gradient-to-br from-[#FAF0E4] to-[#F5EFE6] border border-[#E8DFD3] rounded-xl p-3 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#8d1c13] text-[18px]">verified</span>
              <span className="text-xs text-[#3E2723] font-bold">سامانه رستوران پیچ شمرون</span>
            </div>
            <p className="text-[11px] text-[#59413d] leading-tight">شعبه شمرون تجریش • ارتباط زنده و آفلاین ابری</p>
            <button 
              onClick={() => {
                setAllQrModalTab('tables');
                setIsAllQrModalOpen(true);
              }}
              className="mt-2.5 w-full py-1.5 px-2 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-lg text-center text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">qr_code_2</span>
              <span>کیو آر کدهای ۳ اپلیکیشن</span>
            </button>
          </div>
          <div className="flex items-center justify-between pt-1 text-[#506354]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#3D4F41]">support_agent</span>
              <span className="text-[11px] font-medium">پشتیبانی رستوران</span>
            </div>
            <span className="text-[11px] dir-ltr text-[#3E2723] font-bold font-mono">۰۲۱-۲۲۷۴۵۵۶۰</span>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE & DASHBOARD CANVAS */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#FBF8F3]">
        
        {/* 2. TOP APP BAR (HEADER) */}
        <header className="h-14 bg-[#FFFDF9] border-b border-[#E8DFD3] px-5 flex items-center justify-between flex-shrink-0 z-20 shadow-xs">
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

            <div className="hidden lg:flex items-center text-[#506354] text-xs gap-1.5 border-r border-[#E8DFD3] pr-3">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">cloud_done</span>
              <span>اتصال بلادرنگ Firebase برقرار است</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAllQrModalTab('tables');
                setIsAllQrModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF0E4] border border-[#E2D5C3] text-[#8d1c13] rounded-xl text-xs font-bold hover:bg-[#F2DECC] transition-colors"
            >
              <span className="material-symbols-outlined text-base">qr_code_2</span>
              <span>کیو آر کد ۳ اپلیکیشن</span>
            </button>

            <button 
              onClick={() => setIsAddDishModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
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
              <div className="bg-gradient-to-r from-[#FAF0E4] via-[#FFFDF9] to-[#F7F2E9] border border-[#E8DFD3] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#8d1c13] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">
                      مرکز مدیریت ۳ اپلیکیشن اختصاصی و کیو آر کدهای پایدار پیچ شمرون
                    </h2>
                    <p className="text-xs text-[#7A6458] mt-1 leading-relaxed">
                      هر سرویس‌پوینت (میز) دارای یک QR اختصاصی پایدار، اپلیکیشن گارسون یک QR، و اپلیکیشن عملیاتی رستوران (KDS) هم دارای یک QR مستقل است. تمام اپلیکیشن‌ها به بک‌اند و دیتابیس مشترک متصل‌اند.
                    </p>
                  </div>
                </div>
              </div>

              {/* Three Big Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* 1. Customer App Card */}
                <div className="bg-[#FFFDF9] border-2 border-[#E8DFD3] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#8d1c13]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                      <div className="flex items-center gap-2 text-[#8d1c13]">
                        <span className="material-symbols-outlined text-2xl">table_restaurant</span>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">۱. اپلیکیشن مشتری (سر میز)</h3>
                      </div>
                      <span className="bg-[#FAF0E4] text-[#8d1c13] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {servicePoints.length} میز مستقل
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6458] mt-2.5 leading-relaxed">
                      مشتری با اسکن این کیو آر کد، منوی منتشرشده رستوران را مشاهده و سفارش مستقل خود را بدون نیاز به ساخت حساب ثبت می‌کند.
                    </p>

                    {/* Table selector for live QR display */}
                    <div className="mt-3 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8DFD3] space-y-2">
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
                                ? 'bg-[#8d1c13] text-white shadow-xs' 
                                : 'bg-white border border-[#E8DFD3] text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {sp.tableNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Preview Box */}
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8DFD3]">
                      {hubTableQrUrl ? (
                        <img src={hubTableQrUrl} alt={`QR میز ${selectedHubTable}`} className="w-40 h-40 object-contain shadow-xs bg-white p-2 rounded-xl" />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-bold text-[#8d1c13] mt-2">
                        کیو آر کد اختصاصی میز {selectedHubTable} ({business.name})
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono mt-0.5 break-all text-center">
                        /?view=customer&table={selectedHubTable}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
                    <button
                      onClick={() => {
                        setSelectedTableNumber(selectedHubTable);
                        setCurrentView('customer');
                      }}
                      className="w-full py-2.5 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>مشاهده زنده نمای مشتری (میز {selectedHubTable})</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentTableUrl, `منوی میز ${selectedHubTable}`)}
                        className="py-2 bg-[#F4EFE6] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      {hubTableQrUrl && (
                        <a
                          href={hubTableQrUrl}
                          download={`QR-PichShemroon-Table-${selectedHubTable}.png`}
                          className="py-2 bg-[#FAF0E4] hover:bg-[#F2DECC] text-[#8d1c13] border border-[#F2DECC] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>دانلود تصویر QR</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Waiter App Card */}
                <div className="bg-[#FFFDF9] border-2 border-[#E8DFD3] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#3D4F41]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                      <div className="flex items-center gap-2 text-[#3D4F41]">
                        <span className="material-symbols-outlined text-2xl">person_apron</span>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">۲. اپلیکیشن گارسون و سالن‌دار</h3>
                      </div>
                      <span className="bg-[#EAF2EC] text-[#3D4F41] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        شیفت سالن
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6458] mt-2.5 leading-relaxed">
                      گارسون با گوشی سفارش‌های ثبت‌شده میزها را می‌بیند، تایید کرده و تحویل به میز را ثبت می‌نماید. همچنین امکان ثبت سفارش دستی سر میز را دارد.
                    </p>

                    {/* Waiter Status Badge */}
                    <div className="mt-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFD3] flex items-center justify-between text-xs">
                      <span className="text-[#506354]">سفارشات معلق نیاز به تایید:</span>
                      <span className="font-bold text-[#8d1c13] font-mono">{pendingOrders.length} سفارش</span>
                    </div>

                    {/* QR Preview Box */}
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8DFD3]">
                      {hubWaiterQrUrl ? (
                        <img src={hubWaiterQrUrl} alt="QR اپ گارسون" className="w-40 h-40 object-contain shadow-xs bg-white p-2 rounded-xl" />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-bold text-[#3D4F41] mt-2">
                        کیو آر کد اختصاصی ورود گارسون
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono mt-0.5 break-all text-center">
                        /?view=waiter
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
                    <button
                      onClick={() => setCurrentView('waiter')}
                      className="w-full py-2.5 bg-[#3D4F41] hover:bg-[#324235] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود و مشاهده نمای اپلیکیشن گارسون</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentWaiterUrl, 'اپلیکیشن گارسون')}
                        className="py-2 bg-[#F4EFE6] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      {hubWaiterQrUrl && (
                        <a
                          href={hubWaiterQrUrl}
                          download="QR-PichShemroon-Waiter.png"
                          className="py-2 bg-[#EAF2EC] hover:bg-[#D8E8DC] text-[#3D4F41] border border-[#C5E3CE] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>دانلود تصویر QR</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Kitchen KDS Card */}
                <div className="bg-[#FFFDF9] border-2 border-[#E8DFD3] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#B45309]/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                      <div className="flex items-center gap-2 text-[#B45309]">
                        <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">۳. اپلیکیشن رستوران و آشپزخانه (KDS)</h3>
                      </div>
                      <span className="bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        پخت و بار
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6458] mt-2.5 leading-relaxed">
                      مانیتور عملیات آشپزخانه با تایمرهای تاخیر پخت، تفکیک مستقل تحویل از تسویه، و پایداری کامل در زمان قطعی وای‌فای با کش IndexedDB.
                    </p>

                    {/* KDS Status Badge */}
                    <div className="mt-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFD3] flex items-center justify-between text-xs">
                      <span className="text-[#506354]">غذاهای در حال پخت:</span>
                      <span className="font-bold text-[#B45309] font-mono">{cookingOrders.length} تیکت</span>
                    </div>

                    {/* QR Preview Box */}
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8DFD3]">
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
                  <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
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
                        className="py-2 bg-[#F4EFE6] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
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
                <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">فروش امروز</span>
                    <div className="text-xl font-extrabold text-[#3E2723] font-mono mt-1">
                      {todayRevenue.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[#506354]">تومان</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-bold mt-1 inline-block">
                      {orders.filter(o => o.status !== 'cancelled').length} فاکتور ثبت‌شده
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#FAF0E4] text-[#8d1c13] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                </div>

                {/* 2. Table Occupancy */}
                <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">ضریب اشغال میزها</span>
                    <div className="text-xl font-extrabold text-[#3E2723] font-mono mt-1">
                      {occupiedTablesCount} <span className="text-xs font-normal text-[#506354]">از ۱۶ میز</span>
                    </div>
                    <span className="text-[11px] text-[#506354] mt-1 inline-block">
                      {16 - occupiedTablesCount} میز آماده پذیرش مهمان
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#EAF2EC] text-[#3D4F41] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">table_restaurant</span>
                  </div>
                </div>

                {/* 3. Waiter In-Queue */}
                <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#506354] font-medium block">سفارشات در صف تایید</span>
                    <div className="text-xl font-extrabold text-[#8d1c13] font-mono mt-1">
                      {pendingOrders.length} <span className="text-xs font-normal text-[#506354]">سفارش جدید</span>
                    </div>
                    <span className="text-[11px] text-[#8d1c13] font-bold mt-1 inline-block">
                      نیازمند تایید سالن‌دار
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-[#8d1c13] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">notifications_active</span>
                  </div>
                </div>

                {/* 4. Kitchen Cooking */}
                <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
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
              <section className="bg-gradient-to-r from-[#FAF0E4] via-[#FFFDF9] to-[#F7F2E9] border border-[#E2D5C3] rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E8DFD3]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8d1c13] text-xl">qr_code_2</span>
                    <h3 className="text-sm font-extrabold text-[#1C1917]">
                      درگاه‌های اختصاصی ۳ اپلیکیشن پلتفرم (مشتری، گارسون، آشپزخانه)
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('three_apps_qr')}
                    className="text-xs font-bold text-[#8d1c13] hover:underline flex items-center gap-1"
                  >
                    <span>مشاهده مرکز کامل QR کدها</span>
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white border border-[#E8DFD3] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">۱. منوی مشتری (میز {selectedHubTable})</span>
                      <span className="text-[11px] text-[#7A6458]">اسکن QR سر میز بدون لاگین</span>
                    </div>
                    <button
                      onClick={() => { setSelectedTableNumber(selectedHubTable); setCurrentView('customer'); }}
                      className="px-2.5 py-1.5 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود</span>
                    </button>
                  </div>

                  <div className="bg-white border border-[#E8DFD3] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">۲. اپلیکیشن گارسون</span>
                      <span className="text-[11px] text-[#7A6458]">تایید سفارشات و تحویل میز</span>
                    </div>
                    <button
                      onClick={() => setCurrentView('waiter')}
                      className="px-2.5 py-1.5 bg-[#3D4F41] hover:bg-[#324235] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود</span>
                    </button>
                  </div>

                  <div className="bg-white border border-[#E8DFD3] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">۳. مانیتور آشپزخانه KDS</span>
                      <span className="text-[11px] text-[#7A6458]">مانیتورینگ پخت با کش آفلاین</span>
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
                    <h2 className="text-lg text-[#3E2723] font-extrabold">سفارش‌های زنده میزها</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8d1c13]/15 border border-[#8d1c13]/30 text-[#8d1c13] text-xs font-bold">
                      {orders.length} سفارش در جریان
                    </span>
                  </div>
                  <button 
                    onClick={() => setCurrentView('kitchen')}
                    className="text-xs font-bold text-[#8d1c13] hover:underline flex items-center gap-1"
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
                        className={`bg-[#FFFDF9] rounded-2xl p-4 shadow-sm flex flex-col justify-between border-2 transition-all ${
                          isPending ? 'border-[#8d1c13]/80' : isCooking ? 'border-amber-400' : 'border-[#E8DFD3]'
                        }`}
                      >
                        <div>
                          {/* Order Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                            <div className="flex items-center gap-2.5">
                              <span className="px-3 py-1 bg-gradient-to-br from-[#8d1c13] to-[#c0392b] text-white rounded-xl text-xs font-black shadow-xs">
                                میز {order.tableNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#3E2723]">سفارش {order.orderNumber}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isPending ? 'bg-red-100 text-[#8d1c13] animate-pulse' :
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
                            <span className="text-xs font-semibold text-[#7A6458]">{order.customerName}</span>
                          </div>

                          {/* Items List */}
                          <div className="py-3 space-y-1.5 divide-y divide-[#F4EFE6]">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-[#FAF0E4] text-[#8d1c13] font-bold flex items-center justify-center text-xs">
                                    {it.quantity}×
                                  </span>
                                  <div>
                                    <span className="font-bold text-[#3E2723]">{it.productName}</span>
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
                        <div className="pt-3 border-t border-[#E8DFD3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <span className="text-xs text-[#506354] block">جمع فاکتور:</span>
                            <span className="text-base font-extrabold text-[#3E2723] font-mono">
                              {order.totalAmount.toLocaleString('fa-IR')} تومان
                            </span>
                            <div className="text-[11px] mt-0.5">
                              <span className={isDelivered ? 'text-emerald-800 font-bold' : 'text-amber-800'}>
                                {isDelivered ? 'تحویل شد ✓' : 'تحویل: در جریان'}
                              </span>
                              <span className="mx-1">|</span>
                              <span className={isSettled ? 'text-emerald-800 font-bold' : 'text-[#8d1c13] font-bold'}>
                                {isSettled ? 'تسویه شد ✓' : 'در انتظار تسویه'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPending && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'cooking')}
                                className="px-3 py-1.5 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold"
                              >
                                تأیید به آشپزخانه
                              </button>
                            )}

                            <button
                              onClick={() => updateDeliveryStatus(order.id, isDelivered ? 'pending' : 'delivered')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                isDelivered ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-[#3D4F41] text-white'
                              }`}
                            >
                              {isDelivered ? 'تحویل داده شده' : 'ثبت تحویل'}
                            </button>

                            <button
                              onClick={() => updatePaymentStatus(order.id, isSettled ? 'unpaid' : 'paid_pos')}
                              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E8DFD3] text-[#3E2723] rounded-xl text-xs font-bold"
                            >
                              {isSettled ? 'تسویه شد ✓' : 'تسویه فاکتور'}
                            </button>
                          </div>
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
              <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8d1c13] to-[#B45309] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                  </div>
                  <div>
                    <h3 className="text-base text-[#1C1917] font-black">
                      مرکز مدیریت ۳ اپلیکیشن و کیو‌آر کدهای اختصاصی منویار
                    </h3>
                    <p className="text-xs text-[#7A6458] mt-0.5">
                      هر سرویس‌پوینت (میز) دارای یک QR کد مستقل است، همچنین اپ گارسون و مانیتور رستوران به تفکیک دارای لینک و QR هستند.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAllQrModalTab('tables');
                      setIsAllQrModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>چاپ دسته‌ای استند تمامی ۱۶ میز</span>
                  </button>
                </div>
              </div>

              {/* Three Apps Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* 1. CUSTOMER APP (PER TABLE QR) */}
                <div className="bg-[#FFFDF9] border-2 border-[#8d1c13]/30 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#8d1c13] to-[#A93226]"></div>
                  
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8d1c13] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">menu_book</span>
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1C1917]">۱. منوی دیجیتال مشتری</h4>
                          <span className="text-[10px] text-stone-500 font-mono">Customer QR App</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#FAF0E4] text-[#8d1c13] border border-[#F2DECC] rounded-full text-[10px] font-bold">
                        میز {selectedHubTable} انتخابی
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6458]">
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
                                ? 'bg-[#8d1c13] text-white shadow-xs font-black'
                                : sp.isOccupied
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-[#F4EFE6] text-stone-700 hover:bg-[#E8DFD3]'
                            }`}
                            title={`میز ${sp.tableNumber} - ${sp.isOccupied ? 'اشغال' : 'خالی'}`}
                          >
                            {sp.tableNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Code Preview Box */}
                    <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD3] flex flex-col items-center justify-center space-y-2">
                      {hubTableQrUrl ? (
                        <img 
                          src={hubTableQrUrl} 
                          alt={`QR میز ${selectedHubTable}`} 
                          className="w-44 h-44 rounded-xl shadow-xs border border-stone-200 bg-white p-2"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-black text-[#8d1c13]">
                        استند رومیزی میز {selectedHubTable} • سالن پیچ شمرون
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono break-all text-center">
                        {currentTableUrl}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
                    <button
                      onClick={() => {
                        setSelectedTableNumber(selectedHubTable);
                        setCurrentView('customer');
                      }}
                      className="w-full py-2.5 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>ورود و تست زنده منوی میز {selectedHubTable}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentTableUrl, `منوی میز ${selectedHubTable}`)}
                        className="py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#1C1917] border border-[#E8DFD3] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      <a
                        href={hubTableQrUrl}
                        download={`menuyar-table-${selectedHubTable}-qr.png`}
                        className="py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#1C1917] border border-[#E8DFD3] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>دانلود QR</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 2. WAITER APP */}
                <div className="bg-[#FFFDF9] border-2 border-[#3D4F41]/30 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#3D4F41] to-[#506354]"></div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#EAF2EC] text-[#3D4F41] flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">person_apron</span>
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1C1917]">۲. اپلیکیشن گارسون و سالن‌دار</h4>
                          <span className="text-[10px] text-stone-500 font-mono">Waiter Floor App</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#EAF2EC] text-[#3D4F41] border border-[#D0E5D2] rounded-full text-[10px] font-bold">
                        شیفت فعال
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6458]">
                      گارسون سفارشات ثبت‌شده مشتریان را با یک لمس تأیید می‌کند، سفارش حضوری می‌زند و فراخوان‌های میزها را پاسخ می‌دهد.
                    </p>

                    <div className="p-3 bg-[#F4EFE6]/70 rounded-2xl border border-[#E8DFD3] flex items-center justify-around text-center">
                      <div>
                        <span className="text-base font-black text-[#9e2016] block">{pendingOrders.length}</span>
                        <span className="text-[10px] text-stone-600">در انتظار تأیید</span>
                      </div>
                      <div className="w-px h-8 bg-stone-300"></div>
                      <div>
                        <span className="text-base font-black text-[#3D4F41] block">{readyOrders.length}</span>
                        <span className="text-[10px] text-stone-600">آماده تحویل به میز</span>
                      </div>
                    </div>

                    {/* QR Code Preview Box */}
                    <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD3] flex flex-col items-center justify-center space-y-2">
                      {hubWaiterQrUrl ? (
                        <img 
                          src={hubWaiterQrUrl} 
                          alt="QR اپلیکیشن گارسون" 
                          className="w-44 h-44 rounded-xl shadow-xs border border-stone-200 bg-white p-2"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                      )}
                      <span className="text-xs font-black text-[#3D4F41]">
                        کیو‌آر کد پرسنلی ورود سالن‌دار
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono break-all text-center">
                        {currentWaiterUrl}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
                    <button
                      onClick={() => setCurrentView('waiter')}
                      className="w-full py-2.5 bg-[#3D4F41] hover:bg-[#324235] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود مستقیم به اپلیکیشن گارسون</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(currentWaiterUrl, 'اپلیکیشن گارسون')}
                        className="py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#1C1917] border border-[#E8DFD3] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      <a
                        href={hubWaiterQrUrl}
                        download="menuyar-waiter-qr.png"
                        className="py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#1C1917] border border-[#E8DFD3] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>دانلود QR</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3. KITCHEN KDS APP */}
                <div className="bg-[#FFFDF9] border-2 border-[#B45309]/30 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
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

                    <p className="text-xs text-[#7A6458]">
                      نمایشگر لمسی سرآشپز با تایمرهای رنگی تاخیر، هشدار صوتی، تفکیک مستقل تحویل از تسویه و پایداری در قطعی وای‌فای.
                    </p>

                    <div className="p-3 bg-[#F4EFE6]/70 rounded-2xl border border-[#E8DFD3] flex items-center justify-around text-center">
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
                    <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD3] flex flex-col items-center justify-center space-y-2">
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
                  <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
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
                        className="py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#1C1917] border border-[#E8DFD3] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>کپی لینک</span>
                      </button>

                      <a
                        href={hubKitchenQrUrl}
                        download="menuyar-kitchen-kds-qr.png"
                        className="py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#1C1917] border border-[#E8DFD3] rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>دانلود QR</span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>

              {/* Service Points QR Grid (All 16 Tables) */}
              <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DFD3] gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1C1917]">
                      گالری کیو‌آر کدهای تمامی ۱۶ سرویس‌پوینت سالن و تراس
                    </h4>
                    <p className="text-xs text-[#7A6458]">
                      هر میز کیو‌آر کد پایدار مخصوص به خود دارد؛ انتخاب هر میز پیش‌نمایش QR آن را بالا فعال می‌کند.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAllQrModalTab('tables');
                      setIsAllQrModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#FAF0E4] hover:bg-[#F2DECC] text-[#8d1c13] border border-[#F2DECC] rounded-xl text-xs font-bold"
                  >
                    باز کردن پنجره چاپ دسته‌ای
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
                            ? 'border-[#8d1c13] bg-[#FAF0E4]/60 shadow-xs'
                            : hasOrder
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-[#E8DFD3] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-[#1C1917]">میز {sp.tableNumber}</span>
                          <span className={`w-2 h-2 rounded-full ${sp.isOccupied ? 'bg-[#8d1c13]' : 'bg-emerald-600'}`}></span>
                        </div>
                        <span className="text-[10px] text-stone-500 truncate">{sp.label}</span>

                        <div className="pt-2 border-t border-[#E8DFD3] flex items-center justify-between gap-1">
                          <button
                            onClick={() => setSelectedHubTable(sp.tableNumber)}
                            className={`w-full py-1 rounded-lg text-[10px] font-bold ${
                              selectedHubTable === sp.tableNumber
                                ? 'bg-[#8d1c13] text-white'
                                : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F4EFE6]'
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
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DFD3] gap-3">
                <div>
                  <h3 className="text-base text-[#3E2723] font-bold">مدیریت منو و قیمت‌های لحظه‌ای</h3>
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
                    className="h-9 px-3 text-xs rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#3E2723] w-48"
                  />
                  <button 
                    onClick={() => setIsAddDishModalOpen(true)}
                    className="h-9 px-4 bg-[#8d1c13] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>افزودن غذای جدید</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#F4EFE6]/60 text-[#506354] text-xs font-semibold border-b border-[#E8DFD3]">
                      <th className="py-2.5 px-3">تصویر و نام غذا</th>
                      <th className="py-2.5 px-3">قیمت فعلی (تومان)</th>
                      <th className="py-2.5 px-3 text-center">وضعیت موجودی</th>
                      <th className="py-2.5 px-3 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DFD3]/70 text-xs">
                    {filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-[#F4EFE6]/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg border border-[#E8DFD3] overflow-hidden flex-shrink-0 bg-stone-100">
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="font-bold text-[#3E2723] block">{prod.name}</span>
                              <span className="text-[11px] text-[#506354] line-clamp-1">{prod.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              step="5000"
                              value={prod.price}
                              onChange={(e) => updateProductPrice(prod.id, Number(e.target.value))}
                              className="w-28 h-8 text-center font-bold border border-[#E8DFD3] rounded-lg bg-white text-[#3E2723] text-xs font-mono shadow-xs"
                            />
                            <span className="text-[10px] text-stone-500">تومان</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={prod.isAvailable}
                              onChange={(e) => toggleProductAvailability(prod.id, e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-7 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-700 relative"></div>
                            <span className={`text-[11px] font-bold ${prod.isAvailable ? 'text-emerald-800' : 'text-[#8d1c13]'}`}>
                              {prod.isAvailable ? 'موجود' : 'ناموجود'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <button 
                            onClick={() => {
                              setSelectedTableNumber(4);
                              setCurrentView('customer');
                            }}
                            className="p-1 text-[#506354] hover:text-[#8d1c13]"
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
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                <div>
                  <h3 className="text-base text-[#3E2723] font-bold">میزها و سرویس‌پوینت‌های سالن</h3>
                  <p className="text-xs text-[#506354] mt-0.5">
                    کلیک روی هر میز وضعیت اشغال آن را تغییر می‌دهد.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAllQrModalTab('tables');
                    setIsAllQrModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#8d1c13] text-white rounded-xl text-xs font-bold hover:bg-[#A93226]"
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
                        hasOrder ? 'border-[#8d1c13] bg-orange-50/70' :
                        sp.isOccupied ? 'border-amber-400 bg-amber-50/50' :
                        'border-emerald-200 bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[#1C1917]">میز {sp.tableNumber}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${sp.isOccupied ? 'bg-[#8d1c13]' : 'bg-emerald-600'}`}></span>
                      </div>
                      <span className="text-[10px] text-[#7A6458] truncate">{sp.label}</span>
                      
                      <div className="pt-2 border-t border-[#E8DFD3] flex items-center justify-between">
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
                            setCurrentView('customer');
                          }}
                          className="text-[10px] text-[#8d1c13] font-bold"
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
      <AddDishModal 
        isOpen={isAddDishModalOpen}
        onClose={() => setIsAddDishModalOpen(false)}
      />
    </div>
  );
};
