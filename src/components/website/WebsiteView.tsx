import React from 'react';
import { useApp } from '../../context/AppContext';

export const WebsiteView: React.FC = () => {
  const { 
    setCurrentView, 
    products, 
    business, 
    orders,
    servicePoints,
    setSelectedTableNumber,
  } = useApp();

  const liveOrdersCount = orders.filter(o => o.status === 'pending_waiter' || o.status === 'cooking').length;

  return (
    <div className="bg-[#FAF7F2] text-[#1C1917] min-h-screen">
      {/* 1. HEADER (TopNavBar Shared Component Execution - Warm Culinary Guild) */}
      <header className="bg-[#FFFDF9]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#E8DFD3] shadow-sm">
        <div className="w-full max-w-[1440px] px-4 md:px-6 mx-auto flex items-center justify-between h-16">
          {/* Brand & Search cluster */}
          <div className="flex items-center gap-4 lg:gap-8">
            <a href="#" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9e2016] to-[#A93226] flex items-center justify-center text-white shadow-md shadow-[#9e2016]/20">
                <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl text-[#9e2016] tracking-tight font-black leading-none">منویار</span>
                <span className="text-[11px] text-[#7A6458] font-medium mt-0.5">سامانه منوی دیجیتال و سفارش‌گیر یکپارچه</span>
              </div>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 h-full text-xs font-semibold">
            <a href="#my-menu-section" className="border-b-2 border-[#9e2016] text-[#9e2016] pb-1 flex items-center gap-1.5 h-full pt-1 font-bold">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>منوی من</span>
            </a>
            <a href="#qr-access-section" className="text-[#6D5548] hover:text-[#9e2016] pb-1 transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">qr_code_2</span>
              <span>دسترسی‌ها و QR کدها</span>
            </a>
            <a href="#templates-section" className="text-[#6D5548] hover:text-[#9e2016] pb-1 transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">style</span>
              <span>قالب‌های منو</span>
            </a>
            <button 
              onClick={() => setCurrentView('test-guide')}
              className="text-[#6D5548] hover:text-[#9e2016] pb-1 transition-colors flex items-center gap-1.5 font-bold"
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              <span>راهنمای آزمون ۱۱ مرحله</span>
            </button>
          </nav>

          {/* Trailing Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentView('dashboard-desktop')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>ورود به داشبورد مدیریت</span>
            </button>

            <button
              onClick={() => {
                setSelectedTableNumber(4);
                setCurrentView('customer');
              }}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-[#FAF0E4] border border-[#E2D5C3] text-[#9e2016] rounded-lg text-xs font-bold hover:bg-[#F2DECC]"
            >
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              <span>تست منوی میز ۴</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-8">
        
        {/* Operational Banner / Quick Metric Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-[#FFFDF9] border border-[#E8DFD3] p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#FAF0E4] text-[#9e2016] flex items-center justify-center shrink-0 border border-[#F2DECC]">
              <span className="material-symbols-outlined text-xl">qr_code_2</span>
            </div>
            <div>
              <div className="text-base font-bold text-[#1C1917]">۱۲,۸۴۰+</div>
              <div className="text-xs text-[#7A6458]">منوی فعال کافه و رستوران</div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border border-[#E8DFD3] p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#EAF4ED] text-[#246A38] flex items-center justify-center shrink-0 border border-[#C5E3CE]">
              <span className="material-symbols-outlined text-xl">table_restaurant</span>
            </div>
            <div>
              <div className="text-base font-bold text-[#1C1917]">{servicePoints.length} میز آنلاین</div>
              <div className="text-xs text-[#7A6458]">سرویس‌پوینت متصل با QR</div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border border-[#E8DFD3] p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#FAF0E4] text-[#D35400] flex items-center justify-center shrink-0 border border-[#F6D5BD]">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <div>
              <div className="text-base font-bold text-[#1C1917]">زیر ۳۰ ثانیه</div>
              <div className="text-xs text-[#7A6458]">ویرایش و اعمال قیمت لحظه‌ای</div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border border-[#E8DFD3] p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 border border-[#FDE68A]">
              <span className="material-symbols-outlined text-xl">soup_kitchen</span>
            </div>
            <div>
              <div className="text-base font-bold text-[#1C1917]">۱۰۰٪ هماهنگ</div>
              <div className="text-xs text-[#7A6458]">ارتباط زنده میز، گارسون و آشپزخانه</div>
            </div>
          </div>
        </div>

        {/* 2. بخش اول — «منوی من» (اولویت اول عملیاتی) */}
        <section className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl p-5 md:p-6 shadow-sm space-y-6" id="my-menu-section">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E8DFD3] gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-6 bg-gradient-to-b from-[#9e2016] to-[#D35400] rounded-full inline-block"></span>
                <h1 className="text-xl md:text-2xl text-[#1C1917] font-extrabold tracking-tight">منوی من</h1>
                <span className="bg-[#FAF0E4] border border-[#F2DECC] text-[#9e2016] px-2.5 py-0.5 rounded-full text-xs font-bold">مرکز فرماندهی منو</span>
              </div>
              <p className="text-sm text-[#7A6458] mt-1.5">
                منوی کسب‌وکارت رو بساز، ویرایش کن و با مشتری‌هات به اشتراک بذار.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setCurrentView('dashboard-desktop')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9e2016] text-white rounded-lg text-xs hover:bg-[#A93226] transition-all shadow-sm font-bold"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>ورود به پنل مدیریت</span>
              </button>
              <a 
                href="#templates-section"
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#F4EFE6] border border-[#E8DFD3] text-[#1C1917] rounded-lg text-xs hover:bg-[#ECE4D8] transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-base text-[#7A6458]">view_quilt</span>
                <span>مشاهده قالب‌های آماده</span>
              </a>
            </div>
          </div>

          {/* Live Manager Widget */}
          <div className="bg-gradient-to-r from-[#F7F2E9] via-[#FAF6EE] to-[#F5EFE6] border border-[#E2D5C3] rounded-xl p-4 md:p-5 shadow-inner" id="admin-panel">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-[#FFFDF9] border border-[#E2D5C3] flex items-center justify-center text-[#9e2016] font-bold text-2xl shadow-sm overflow-hidden">
                    <span className="material-symbols-outlined text-3xl">soup_kitchen</span>
                  </div>
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-600 border-2 border-white rounded-full" title="منو آنلاین و فعال است"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg text-[#1C1917] font-bold">{business.name}</h2>
                    <span className="inline-flex items-center gap-1 bg-[#EAF4ED] border border-[#C5E3CE] text-[#246A38] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      منو فعال است
                    </span>
                    <span className="bg-[#FFFDF9] border border-[#E2D5C3] text-[#7A6458] px-2.5 py-0.5 rounded-md text-xs font-mono">
                      {business.branchName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[#7A6458]">
                    <span className="flex items-center gap-1 font-mono text-[#9e2016] font-bold">
                      <span className="material-symbols-outlined text-sm">link</span>
                      menuyar.ir/{business.slug}
                    </span>
                    <span>•</span>
                    <span>تعداد آیتم‌ها: <strong className="text-[#1C1917]">{products.length} غذا و نوشیدنی</strong></span>
                    <span>•</span>
                    <span>سفارش‌های زنده: <strong className="text-[#9e2016] font-bold">{liveOrdersCount} مورد</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons for Owner */}
              <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
                <button 
                  onClick={() => setCurrentView('dashboard-desktop')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#FFFDF9] border border-[#D7C7B5] text-[#1C1917] rounded-lg text-xs hover:border-[#9e2016] hover:text-[#9e2016] transition-all shadow-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-base text-[#9e2016]">edit_note</span>
                  <span>ویرایش قیمت‌ها و منو</span>
                </button>

                <button 
                  onClick={() => setCurrentView('kitchen')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#9e2016] text-white rounded-lg text-xs hover:bg-[#A93226] transition-all active:scale-95 shadow-sm font-bold"
                >
                  <span className="material-symbols-outlined text-base">notifications_active</span>
                  <span>مدیریت سفارش‌های زنده</span>
                  {liveOrdersCount > 0 && (
                    <span className="bg-white text-[#9e2016] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {liveOrdersCount} فعال
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => {
                    setSelectedTableNumber(4);
                    setCurrentView('customer');
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#FFFDF9] border border-[#D7C7B5] text-[#1C1917] rounded-lg text-xs hover:bg-[#F4EFE6] transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-base text-[#6D5548]">qr_code</span>
                  <span>مشاهده منوی میز مشتری</span>
                </button>
              </div>
            </div>

            {/* Inline Live Orders Quick Strip */}
            <div className="mt-4 pt-3 border-t border-[#E8DFD3] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                <span className="font-bold text-[#1C1917] shrink-0">آخرین وضعیت سفارش‌ها:</span>
                {orders.slice(0, 3).map((o) => (
                  <span key={o.id} className="bg-[#FFFDF9] px-2.5 py-1 rounded-md border border-[#E2D5C3] shrink-0 flex items-center gap-1.5">
                    <span>میز {o.tableNumber}: {o.items[0]?.productName} ({o.items.length} آیتم)</span>
                    <span className={`font-bold ${
                      o.status === 'pending_waiter' ? 'text-[#B45309]' :
                      o.status === 'cooking' ? 'text-amber-800' :
                      'text-emerald-800'
                    }`}>
                      ({o.status === 'pending_waiter' ? 'در انتظار تأیید گارسون' :
                        o.status === 'cooking' ? 'در حال پخت آشپزخانه' :
                        'تحویل شده'})
                    </span>
                  </span>
                ))}
              </div>
              <button 
                onClick={() => setCurrentView('kitchen')}
                className="text-[#9e2016] hover:text-[#A93226] font-bold text-xs shrink-0 mr-2 flex items-center gap-0.5"
              >
                مانیتور آشپزخانه (KDS) ←
              </button>
            </div>
          </div>

          {/* ۳ کارت نمونه فعال و جذاب */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base text-[#1C1917] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#B45309] text-lg">auto_awesome</span>
                <span>نمونه‌های فعال و پیاده‌سازی‌شده با منویار</span>
              </h3>
              <span className="text-xs text-[#7A6458]">روی هر کدام کلیک کنید تا منوی مشتری را ببینید</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sample Card 1 */}
              <div 
                onClick={() => {
                  setSelectedTableNumber(4);
                  setCurrentView('customer');
                }}
                className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-[#FAF0E4]">
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBChB6TSp8WxgMrDBA0h6cOZNxkthhvHBjtK_3QugTZS3_SXYi_DIXoVK1GBCyl3DW5We6rlLMKuclO6Jp7i2gkXO8LTvVkMcXzcYWY2Vi9XUYOAQvm7dIDudsreA-EYGHHE9rAhCY4J1-yLjpRLzqP04ogSRDnIlv0YsQwltdcE9IPOClxVRFobaSq07NK6y_UQeN7GVcwCkhBn7Ohxl3w1FaXmq0QWwk2nEyaFnoOvq7ujuAVXHRfgw"
                    alt="کافه رستوران سنتی نارنج"
                  />
                  <span className="absolute top-2.5 right-2.5 bg-[#FFFDF9]/95 backdrop-blur-sm text-[#9e2016] font-bold text-xs px-2.5 py-1 rounded-md border border-[#E8DFD3] shadow-sm">
                    رستوران سنتی و اصیل
                  </span>
                  <span className="absolute bottom-2.5 left-2.5 bg-[#1C1917]/85 backdrop-blur-sm text-[#FFFDF9] font-mono text-xs px-2 py-0.5 rounded">
                    {products.length} آیتم فعال
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base text-[#1C1917] font-bold">کافه رستوران سنتی نارنج</h4>
                      <div className="flex items-center text-[#B45309] text-xs font-bold gap-0.5">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span>۴.۹</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#7A6458] mt-1">چلوکباب کوبیده زعفرانی، زرشک‌پلو با مرغ مجلسی، شربت‌های سنتی شیراز</p>
                    
                    <div className="mt-3 space-y-1.5 bg-[#F7F2E9] border border-[#E8DFD3] p-2.5 rounded-lg text-xs">
                      <div className="flex justify-between items-center text-[#1C1917]">
                        <span className="text-[#6D5548]">چلوکباب کوبیده مخصوص:</span>
                        <span className="text-[#9e2016] font-bold">۲۸۰,۰۰۰ تومان</span>
                      </div>
                      <div className="flex justify-between items-center text-[#1C1917]">
                        <span className="text-[#6D5548]">زرشک‌پلو با ران مرغ و زعفران:</span>
                        <span className="text-[#9e2016] font-bold">۲۱۵,۰۰۰ تومان</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#E8DFD3] flex items-center justify-between">
                    <span className="text-xs text-[#7A6458] font-mono">menuyar.ir/narenj</span>
                    <span className="inline-flex items-center gap-1 text-[#9e2016] font-bold text-xs">
                      <span>مشاهده منوی مشتری</span>
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample Card 2 */}
              <div 
                onClick={() => {
                  setSelectedTableNumber(9);
                  setCurrentView('customer');
                }}
                className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-[#FAF0E4]">
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRVDaqDrjmsukm7pvI6as033ZEBUOjUogx4bntvq5OMqphxXiR833W_32ibOzsfmHKXBOAbdnbMk1NaFhNw1T42Yka09tEXJkmBAibvL_GUDC60UCX-BW8JLOCbZS-HoJkRrJ1ibhNCNnXgqnqf-0xkINpMFSpIvoC78w0Yv0o2XXoHbbX-RYaWOcngDVK47B-rHJt_XHC5XZf8trIpIsUFJX_kX7YBcBeTVPVHpzrs-ZOxUJ5cr2FkQ"
                    alt="فست‌فود بمب برگر"
                  />
                  <span className="absolute top-2.5 right-2.5 bg-[#FFFDF9]/95 backdrop-blur-sm text-[#D35400] font-bold text-xs px-2.5 py-1 rounded-md border border-[#E8DFD3] shadow-sm">
                    فست‌فود و برگر بار
                  </span>
                  <span className="absolute bottom-2.5 left-2.5 bg-[#1C1917]/85 backdrop-blur-sm text-[#FFFDF9] font-mono text-xs px-2 py-0.5 rounded">
                    ۳۸ آیتم فعال
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base text-[#1C1917] font-bold">فست‌فود بمب برگر</h4>
                      <div className="flex items-center text-[#B45309] text-xs font-bold gap-0.5">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span>۴.۸</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#7A6458] mt-1">دابل چیزبرگر ذغالی، پیتزا مخصوص ایتالیایی، سیب‌زمینی با دیپ پنیر چدار</p>
                    
                    <div className="mt-3 space-y-1.5 bg-[#F7F2E9] border border-[#E8DFD3] p-2.5 rounded-lg text-xs">
                      <div className="flex justify-between items-center text-[#1C1917]">
                        <span className="text-[#6D5548]">پیتزا مخصوص آمریکایی:</span>
                        <span className="text-[#9e2016] font-bold">۳۴۰,۰۰۰ تومان</span>
                      </div>
                      <div className="flex justify-between items-center text-[#1C1917]">
                        <span className="text-[#6D5548]">بمب برگر با دیپ پنیر:</span>
                        <span className="text-[#9e2016] font-bold">۲۹۵,۰۰۰ تومان</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#E8DFD3] flex items-center justify-between">
                    <span className="text-xs text-[#7A6458] font-mono">menuyar.ir/bomb-burger</span>
                    <span className="inline-flex items-center gap-1 text-[#9e2016] font-bold text-xs">
                      <span>مشاهده نمونه منو</span>
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample Card 3 */}
              <div 
                onClick={() => {
                  setSelectedTableNumber(2);
                  setCurrentView('customer');
                }}
                className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-[#FAF0E4]">
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZ2HiAntzY6XEx9kRtnCK4yTk31uzSnAuapcJZg9V69wxdRgkVgNyZJsWvWkV-8Da6-2OPVkqoy207U9XWGT1kIKCZEuHK84356ZC_shu1wEGGdojFAIGbeETXmYKqRy7NJmFuHmz9iHbfOQJzYjM8wCEgAmINnuHgAwfKt7vQmTjPe2z4_M2zbf7TFQX9pQ7QYinPnyB7P8ZHsnurAbW2t9up4ORZXCsLTwylxrjSpa9ldGbCfh0InA"
                    alt="کافه لاته مدرن"
                  />
                  <span className="absolute top-2.5 right-2.5 bg-[#FFFDF9]/95 backdrop-blur-sm text-[#3E2723] font-bold text-xs px-2.5 py-1 rounded-md border border-[#E8DFD3] shadow-sm">
                    کافه تخصصی و قنادی
                  </span>
                  <span className="absolute bottom-2.5 left-2.5 bg-[#1C1917]/85 backdrop-blur-sm text-[#FFFDF9] font-mono text-xs px-2 py-0.5 rounded">
                    ۵۲ آیتم فعال
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base text-[#1C1917] font-bold">کافه لاته مدرن</h4>
                      <div className="flex items-center text-[#B45309] text-xs font-bold gap-0.5">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span>۴.۹</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#7A6458] mt-1">اسپرسو سینگل اورجین، فلت وایت، چیزکیک سن‌سباستین و کیک هویج تازه</p>
                    
                    <div className="mt-3 space-y-1.5 bg-[#F7F2E9] border border-[#E8DFD3] p-2.5 rounded-lg text-xs">
                      <div className="flex justify-between items-center text-[#1C1917]">
                        <span className="text-[#6D5548]">اسپرسو دوبل تخصصی کلمبیا:</span>
                        <span className="text-[#9e2016] font-bold">۹۵,۰۰۰ تومان</span>
                      </div>
                      <div className="flex justify-between items-center text-[#1C1917]">
                        <span className="text-[#6D5548]">کیک هویج و گردو روز با کارامل:</span>
                        <span className="text-[#9e2016] font-bold">۱۴۵,۰۰۰ تومان</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#E8DFD3] flex items-center justify-between">
                    <span className="text-xs text-[#7A6458] font-mono">menuyar.ir/latte-modern</span>
                    <span className="inline-flex items-center gap-1 text-[#9e2016] font-bold text-xs">
                      <span>مشاهده نمونه منو</span>
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. بخش دسترسی و کیو آر کدهای ۳ بخش عملیاتی */}
        <section className="bg-gradient-to-r from-[#FAF0E4] via-[#FFFDF9] to-[#F7F2E9] border border-[#E2D5C3] rounded-2xl p-5 shadow-sm space-y-4" id="qr-access-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8DFD3]">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9e2016] text-2xl">qr_code_2</span>
                <h2 className="text-lg text-[#1C1917] font-extrabold">مرکز کیو آر کدها و دسترسی‌های ۳ بخش پلتفرم</h2>
              </div>
              <p className="text-xs text-[#7A6458] mt-0.5">
                هر سرویس‌پوینت یک QR پایدار، اپ گارسون یک QR، و مانیتور رستوران هم یک QR مستقل دارد.
              </p>
            </div>
            <button
              onClick={() => setCurrentView('dashboard-desktop')}
              className="px-3.5 py-1.5 bg-[#9e2016] text-white rounded-lg text-xs font-bold hover:bg-[#A93226]"
            >
              مدیریت در داشبورد
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Service Points / Tables */}
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                  <span className="flex items-center gap-1.5 text-[#9e2016]">
                    <span className="material-symbols-outlined text-base">table_restaurant</span>
                    <span>سرویس‌پوینت‌ها (میز ۱ تا ۱۶)</span>
                  </span>
                  <span className="bg-[#FAF0E4] text-[#9e2016] text-[10px] px-2 py-0.5 rounded font-bold">۱۶ میز</span>
                </div>
                <p className="text-xs text-[#7A6458] mt-1.5 leading-relaxed">
                  مشتری با اسکن QR روی میز، منو را مشاهده و سفارش مستقل خود را بدون نیاز به ساخت حساب ثبت می‌کند.
                </p>
              </div>
              <button
                onClick={() => { setSelectedTableNumber(4); setCurrentView('customer'); }}
                className="w-full py-2 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>ورود به اپ مشتری (میز ۴)</span>
              </button>
            </div>

            {/* Card 2: Waiter App */}
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                  <span className="flex items-center gap-1.5 text-[#3D4F41]">
                    <span className="material-symbols-outlined text-base">person_apron</span>
                    <span>اپلیکیشن گارسون</span>
                  </span>
                  <span className="bg-[#EAF4ED] text-[#246A38] text-[10px] px-2 py-0.5 rounded font-bold">۱ QR اختصاصی</span>
                </div>
                <p className="text-xs text-[#7A6458] mt-1.5 leading-relaxed">
                  گارسون با گوشی سفارشات ثبت‌شده میزها را می‌بیند، تأیید کرده و تحویل به میز را ثبت می‌نماید.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('waiter')}
                className="w-full py-2 bg-[#3D4F41] hover:bg-[#324235] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>ورود به اپلیکیشن گارسون</span>
              </button>
            </div>

            {/* Card 3: Restaurant Operations / Kitchen KDS */}
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                  <span className="flex items-center gap-1.5 text-[#B45309]">
                    <span className="material-symbols-outlined text-base">soup_kitchen</span>
                    <span>اپلیکیشن رستوران (KDS)</span>
                  </span>
                  <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] px-2 py-0.5 rounded font-bold">۱ QR اختصاصی</span>
                </div>
                <p className="text-xs text-[#7A6458] mt-1.5 leading-relaxed">
                  مانیتور آشپزخانه جهت تیکت‌های زنده پخت، ثبت تحویل و تسویه کاملاً مستقل بدون رفرش دستی.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('kitchen')}
                className="w-full py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>ورود به اپ رستوران (KDS)</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4. بخش قالب‌های منو */}
        <section className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl p-5 md:p-6 shadow-sm space-y-5" id="templates-section">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[#E8DFD3] gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-6 bg-[#B45309] rounded-full inline-block"></span>
                <h2 className="text-xl text-[#1C1917] font-extrabold tracking-tight">قالب‌های منو</h2>
                <span className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold px-2.5 py-0.5 rounded-full">سبک‌های استاندارد صنعت غذا</span>
              </div>
              <p className="text-xs text-[#7A6458] mt-1.5">
                با یک کلیک قالب متناسب با هویت بصری، نوع خدمات و سرعت سفارش‌گیری رستورانت رو فعال کن.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Template 1 */}
            <div className="border border-[#E8DFD3] rounded-xl overflow-hidden bg-[#FFFDF9] hover:border-[#9e2016] transition-all flex flex-col group shadow-sm p-3.5 space-y-2">
              <div className="h-28 bg-[#FAF4EB] rounded-lg p-2.5 flex flex-col justify-between border border-[#E9D7C2]">
                <div className="text-[11px] font-bold text-amber-950">قالب رستوران سنتی</div>
                <div className="text-[10px] text-[#8d4b00]">پالت زرکوب و فونت‌های اصیل ایرانی</div>
              </div>
              <button 
                onClick={() => { setSelectedTableNumber(4); setCurrentView('customer'); }}
                className="w-full py-2 bg-[#9e2016] text-white rounded-lg text-xs font-bold"
              >
                پیش‌نمایش در اپ مشتری
              </button>
            </div>

            {/* Template 2 */}
            <div className="border border-[#E8DFD3] rounded-xl overflow-hidden bg-[#FFFDF9] hover:border-[#9e2016] transition-all flex flex-col group shadow-sm p-3.5 space-y-2">
              <div className="h-28 bg-[#FFF7F4] rounded-lg p-2.5 flex flex-col justify-between border border-[#F4D1C7]">
                <div className="text-[11px] font-bold text-[#A93226]">قالب فست‌فود تصویری</div>
                <div className="text-[10px] text-[#9e2016]">کارت‌های تصویری درشت و تاپینگ‌ها</div>
              </div>
              <button 
                onClick={() => { setSelectedTableNumber(9); setCurrentView('customer'); }}
                className="w-full py-2 bg-[#9e2016] text-white rounded-lg text-xs font-bold"
              >
                پیش‌نمایش در اپ مشتری
              </button>
            </div>

            {/* Template 3 */}
            <div className="border border-[#E8DFD3] rounded-xl overflow-hidden bg-[#FFFDF9] hover:border-[#9e2016] transition-all flex flex-col group shadow-sm p-3.5 space-y-2">
              <div className="h-28 bg-[#1C1917] rounded-lg p-2.5 flex flex-col justify-between border border-[#3E2723] text-white">
                <div className="text-[11px] font-bold text-amber-400">کافه مدرن دارک</div>
                <div className="text-[10px] text-stone-300">دارک مود لوکس با پروفایل طعمی</div>
              </div>
              <button 
                onClick={() => { setSelectedTableNumber(2); setCurrentView('customer'); }}
                className="w-full py-2 bg-[#9e2016] text-white rounded-lg text-xs font-bold"
              >
                پیش‌نمایش در اپ مشتری
              </button>
            </div>

            {/* Template 4 */}
            <div className="border border-[#E8DFD3] rounded-xl overflow-hidden bg-[#FFFDF9] hover:border-[#9e2016] transition-all flex flex-col group shadow-sm p-3.5 space-y-2">
              <div className="h-28 bg-[#FAF7F2] rounded-lg p-2.5 flex flex-col justify-between border border-[#E8DFD3]">
                <div className="text-[11px] font-bold text-[#1C1917]">منوی متنی مینیمال</div>
                <div className="text-[10px] text-[#506354]">بارگذاری فوق‌سریع و کم‌مصرف</div>
              </div>
              <button 
                onClick={() => { setSelectedTableNumber(12); setCurrentView('customer'); }}
                className="w-full py-2 bg-[#9e2016] text-white rounded-lg text-xs font-bold"
              >
                پیش‌نمایش در اپ مشتری
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 5. FOOTER */}
      <footer className="bg-[#FAF6EE] border-t border-[#E8DFD3] mt-12 pt-8 pb-6 text-[#1C1917]">
        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#9e2016] flex items-center justify-center text-white font-bold shadow-sm">
                <span className="material-symbols-outlined text-xl">restaurant</span>
              </div>
              <span className="text-xl text-[#9e2016] font-black">منویار</span>
            </div>
            <div className="text-xs text-[#7A6458]">
              پلتفرم یکپارچه مدیریت رستوران، منوی دیجیتال با QR، اپلیکیشن گارسون و مانیتور آشپزخانه
            </div>
          </div>
          <div className="pt-4 border-t border-[#E8DFD3] text-center text-xs text-[#7A6458]">
            کلیه حقوق مادی و معنوی متعلق به سامانه «منویار» است. © ۱۴۰۳
          </div>
        </div>
      </footer>
    </div>
  );
};

