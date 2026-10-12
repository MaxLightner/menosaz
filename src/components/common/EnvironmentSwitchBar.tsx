import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppView } from '../../types';

export const EnvironmentSwitchBar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    selectedTableNumber, 
    setSelectedTableNumber, 
    isFirebaseConnected, 
    resetToSeed,
    orders,
    isNetworkOnline,
    isSimulatingOffline
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute live badge counts
  const pendingWaiterOrdersCount = orders.filter(o => o.status === 'pending_waiter').length;
  const cookingOrdersCount = orders.filter(o => o.status === 'cooking').length;
  const readyOrdersCount = orders.filter(o => o.status === 'ready' || (o.status === 'cooking' && o.deliveryStatus === 'pending')).length;

  const views: { id: AppView; label: string; icon: string; badge?: number; description: string }[] = [
    { 
      id: 'website', 
      label: 'سایت اصلی و پرتال رستوران', 
      icon: 'storefront', 
      description: 'معرفی رستوران پیچ شمرون، قالب‌های منوی دیجیتال و مرکز QRها' 
    },
    { 
      id: 'dashboard-desktop', 
      label: 'داشبورد مدیریت (دسکتاپ)', 
      icon: 'dashboard', 
      badge: pendingWaiterOrdersCount > 0 ? pendingWaiterOrdersCount : undefined,
      description: 'مدیریت کامل سالن، سفارشات زنده، ویرایش قیمت و QR میزها' 
    },
    { 
      id: 'dashboard-mobile', 
      label: 'داشبورد مدیریت (موبایل)', 
      icon: 'phone_android', 
      description: 'نسخه سریع و موبایلی مدیریت شیفت و هشدارها' 
    },
    { 
      id: 'customer', 
      label: `اپ مشتری (میز ${selectedTableNumber})`, 
      icon: 'qr_code_scanner', 
      description: 'منوی مستقل بدون لاگین مشتری با اسکن QR' 
    },
    { 
      id: 'waiter', 
      label: 'اپ گارسون', 
      icon: 'person_apron', 
      badge: pendingWaiterOrdersCount > 0 ? pendingWaiterOrdersCount : undefined,
      description: 'تأیید سفارشات، ارسال به آشپزخانه و ثبت تحویل' 
    },
    { 
      id: 'kitchen', 
      label: 'اپ عملیات رستوران (KDS)', 
      icon: 'soup_kitchen', 
      badge: cookingOrdersCount > 0 ? cookingOrdersCount : undefined,
      description: 'مانیتورینگ پخت، تفکیک مستقل تحویل و تسویه' 
    },
    { 
      id: 'test-guide', 
      label: 'راهنمای سناریوی آزمون', 
      icon: 'checklist', 
      description: 'بررسی ۱۱ مرحله سناریوی پذیرش پروژه' 
    },
  ];

  if (isCollapsed) {
    return (
      <aside 
        aria-label="تغییر محیط آزمایش"
        className="fixed bottom-3 left-3 z-50 bg-[#1C1917]/90 text-white rounded-full px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs border border-amber-600/50"
      >
        <button 
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 hover:text-amber-400 font-bold"
        >
          <span className="material-symbols-outlined text-sm">swap_horiz</span>
          <span>تغییر رابط کاربری ({views.find(v => v.id === currentView)?.label})</span>
        </button>
        <span className={`w-2 h-2 rounded-full ${isNetworkOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} title={isNetworkOnline ? 'متصل آنلاین' : 'آفلاین (کش پایدار فعال)'}></span>
      </aside>
    );
  }

  return (
    <aside 
      aria-label="تغییر محیط آزمایش و نقش‌ها"
      className="bg-[#1C1917] text-white text-xs border-b border-amber-900/60 shadow-lg sticky top-0 z-[60] px-3 py-1.5"
    >
      <div className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <span className={`w-2 h-2 rounded-full ${isNetworkOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>آزمایش یکپارچه منویار:</span>
          </div>
          <span className="text-stone-400 hidden xl:inline">
            {isNetworkOnline ? 'اتصال آنلاین به Firestore' : 'حالت آفلاین (کش پایدار IndexedDB فعال)'}
          </span>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-wrap">
          {views.map((v) => {
            const isActive = currentView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setCurrentView(v.id)}
                title={v.description}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium relative whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#9e2016] to-[#A93226] text-white shadow-sm ring-1 ring-amber-400/40 font-bold' 
                    : 'bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{v.icon}</span>
                <span>{v.label}</span>
                {v.badge !== undefined && v.badge > 0 && (
                  <span className="bg-amber-500 text-stone-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {v.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table Selector for Customer & Utility Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-stone-800/90 px-2 py-0.5 rounded border border-stone-700">
            <span className="text-stone-400 text-[11px]">میز فعال:</span>
            <select
              value={selectedTableNumber}
              onChange={(e) => setSelectedTableNumber(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-bold text-[11px] outline-none cursor-pointer"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="bg-stone-900 text-white">
                  میز {num} {num === 4 ? '(میز آزمون اصلی)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetToSeed}
            title="بازنشانی دیتابیس به مقادیر اولیه برای تکرار سناریوی آزمون"
            className="flex items-center gap-1 text-[11px] text-stone-300 hover:text-amber-400 bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-700 transition-colors"
          >
            <span className="material-symbols-outlined text-xs">restart_alt</span>
            <span className="hidden sm:inline">بازنشانی دمو</span>
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            title="کوچک کردن نوار سوییچر"
            className="text-stone-400 hover:text-white p-0.5 rounded"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
