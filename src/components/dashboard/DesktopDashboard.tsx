import {RemoveProduct} from './RemoveProduct';
import {PointsPanel} from './PointsPanel';
import {BrandLogo} from '../common/BrandLogo';
import {EditProductImage} from '../modals/EditProductImage';
import type {Product} from '../../types';
import {localProductImage} from '../../services/menuPresentation';
import {MenusManager} from './MenusManager';
import {usePresentation} from '../../context/PresentationContext';
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { AddDishModal } from '../modals/AddDishModal';
import { AllQRAccessModal } from '../modals/AllQRAccessModal';

export const DesktopDashboard: React.FC = () => {
  const { 
    business,menus,activeMenuId,assignProductMenu, 
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
  const {openSample}=usePresentation();

  const [isAllQrModalOpen, setIsAllQrModalOpen] = useState(false);
  const [allQrModalTab, setAllQrModalTab] = useState<'tables' | 'waiter' | 'kitchen'>('tables');
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [selectedHubTable, setSelectedHubTable] = useState<number>(4);
  const [menuSearch, setMenuSearch] = useState('');
  const [editingImage,setEditingImage]=useState<Product|null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'tables' | 'three_apps_qr'>('menu');

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
          {activeTab === 'three_apps_qr' && <PointsPanel/>}

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

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPending && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'cooking')}
                                className="px-3 py-1.5 bg-[#465B3F] hover:bg-[#51805A] text-white rounded-xl text-xs font-bold"
                              >
                                تأیید به آشپزخانه
                              </button>
                            )}

                            <button
                              onClick={() => updateDeliveryStatus(order.id, isDelivered ? 'pending' : 'delivered')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                isDelivered ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-[#465B3F] text-white'
                              }`}
                            >
                              {isDelivered ? 'تحویل داده شده' : 'ثبت تحویل'}
                            </button>

                            <button
                              onClick={() => updatePaymentStatus(order.id, isSettled ? 'unpaid' : 'paid_pos')}
                              className="px-3 py-1.5 bg-[#F6F7F4] hover:bg-[#EEF2E8] border border-[#DBE2D5] text-[#29372E] rounded-xl text-xs font-bold"
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
                            <input 
                              type="number"
                              step="5000"
                              value={prod.price}
                              onChange={(e) => updateProductPrice(prod.id, Number(e.target.value))}
                              className="w-28 h-8 text-center font-bold border border-[#DBE2D5] rounded-lg bg-white text-[#29372E] text-xs font-mono shadow-xs"
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
                            <span className={`text-[11px] font-bold ${prod.isAvailable ? 'text-emerald-800' : 'text-[#465B3F]'}`}>
                              {prod.isAvailable ? 'موجود' : 'ناموجود'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3 text-left"><RemoveProduct product={prod}/><button className="manager-photo-edit" aria-label={'ویرایش عکس '+prod.name} onClick={()=>setEditingImage(prod)}>عکس</button>
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
          {activeTab === 'tables' && <PointsPanel/>}

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

