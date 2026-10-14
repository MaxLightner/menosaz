import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, PaymentStatus } from '../../types';

export const KitchenKDSApp: React.FC = () => {
  const { 
    business,
    orders, 
    updateOrderStatus, 
    updateDeliveryStatus, 
    updatePaymentStatus,
    isNetworkOnline,
    isSimulatingOffline,
    toggleSimulateOffline,
    playChime,
    showToast 
  } = useApp();

  const [filterStation, setFilterStation] = useState<'all' | 'cooking' | 'ready' | 'delivered'>('all');
  const [settlementModalOrder, setSettlementModalOrder] = useState<Order | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const pendingOrders = orders.filter(o => o.status === 'pending_waiter');
  const readyOrders = orders.filter(o => o.status === 'ready' || (o.status === 'cooking' && o.deliveryStatus === 'pending'));

  const filteredOrders = orders.filter(o => {
    if (filterStation === 'cooking') return o.status === 'cooking';
    if (filterStation === 'ready') return o.status === 'ready';
    if (filterStation === 'delivered') return o.deliveryStatus === 'delivered';
    return true;
  });

  const handleApplySettlement = (paymentStatus: PaymentStatus) => {
    if (!settlementModalOrder) return;
    updatePaymentStatus(settlementModalOrder.id, paymentStatus);
    setSettlementModalOrder(null);
  };

  return (
    <div className="bg-[#1C1917] min-h-screen text-[#FAF7F2] antialiased selection:bg-[#A93226] selection:text-white pb-20">
      
      {/* 1. KDS TOP APP BAR (HIGH CONTRAST KITCHEN THEME) */}
      <header className="sticky top-0 z-30 bg-[#292524] border-b border-stone-800 shadow-md px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9e2016] text-white flex items-center justify-center font-bold shadow-md">
              <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white">مانیتور عملیات آشپزخانه و بار (KDS)</h1>
                <span className={`w-2.5 h-2.5 rounded-full ${isNetworkOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isNetworkOnline 
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' 
                    : 'text-amber-300 bg-amber-950/80 border-amber-700 animate-pulse'
                }`}>
                  <span className="material-symbols-outlined text-[13px]">
                    {isNetworkOnline ? 'wifi' : 'wifi_off'}
                  </span>
                  <span>{isNetworkOnline ? 'آنلاین • کش پایدار فعال' : 'آفلاین • پایداری دیسک (IndexedDB)'}</span>
                </span>
              </div>
              <p className="text-xs text-stone-400">{business.name} • ایستگاه‌های پخت، بار و صندوق تسویه</p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2 text-xs">
            {/* Audio chime button */}
            <button
              onClick={() => playChime('ready')}
              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 flex items-center justify-center border border-stone-700"
              title="تست صدای زنگ آماده‌سازی غذا"
            >
              <span className="material-symbols-outlined text-base">notifications</span>
            </button>

            {/* Fullscreen toggle button */}
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center border border-stone-700"
              title={isFullscreen ? 'خروج از حالت تمام‌صفحه' : 'حالت تمام‌صفحه نمایشگر آشپزخانه'}
            >
              <span className="material-symbols-outlined text-base">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            {/* Wi-Fi Outage Simulation Button */}
            <button
              onClick={toggleSimulateOffline}
              title="تست قطع موقت وای‌فای آشپزخانه برای آزمایش عملکرد آفلاین و کش پایدار Firestore"
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                isSimulatingOffline 
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 border-amber-400 shadow-md' 
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-600'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isSimulatingOffline ? 'wifi_off' : 'cloud_sync'}
              </span>
              <span>{isSimulatingOffline ? 'وای‌فای قطع است' : 'شبیه‌سازی آفلاین'}</span>
            </button>

            <div className="bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700 flex items-center gap-1.5">
              <span className="text-orange-400 font-bold">{cookingOrders.length}</span>
              <span className="text-stone-300">در حال پخت</span>
            </div>
          </div>
        </div>

        {/* Station Filter Tabs */}
        <div className="max-w-6xl mx-auto pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterStation('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterStation === 'all' ? 'bg-[#9e2016] text-white shadow-sm' : 'bg-stone-800 text-stone-300'
            }`}
          >
            همه تیکت‌ها ({orders.length})
          </button>
          <button
            onClick={() => setFilterStation('cooking')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterStation === 'cooking' ? 'bg-[#D35400] text-white shadow-sm' : 'bg-stone-800 text-stone-300'
            }`}
          >
            در حال پخت ({cookingOrders.length})
          </button>
          <button
            onClick={() => setFilterStation('ready')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterStation === 'ready' ? 'bg-amber-500 text-stone-950 shadow-sm font-black' : 'bg-stone-800 text-stone-300'
            }`}
          >
            غذاهای آماده تحویل ({readyOrders.length})
          </button>
          <button
            onClick={() => setFilterStation('delivered')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterStation === 'delivered' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-stone-800 text-stone-300'
            }`}
          >
            تحویل داده شده
          </button>
        </div>
      </header>

      {/* 2. MAIN KDS TICKETS GRID */}
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        
        {/* Offline Resilience Banner (shown when offline) */}
        {(!isNetworkOnline || isSimulatingOffline) && (
          <div className="bg-amber-950/80 border-2 border-amber-500/80 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-200 shadow-lg animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-xl">cloud_off</span>
              <div>
                <span className="font-bold text-white block">حالت کار بدون اینترنت (کش پایدار آفلاین Firestore)</span>
                <span className="text-[11px] text-amber-300">
                  وای‌فای آشپزخانه موقتاً قطع است، اما کلیه تیکت‌های پخت از حافظه پایدار محلی (IndexedDB) بارگذاری شده‌اند و ثبت تحویل بدون اختلال انجام می‌پذیرد.
                </span>
              </div>
            </div>
            <button
              onClick={toggleSimulateOffline}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] shrink-0"
            >
              اتصال مجدد وای‌فای
            </button>
          </div>
        )}

        {/* Notice of Separation */}
        <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-stone-300 gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">info</span>
            <span>
              <strong>قاعده مستقل تحویل و تسویه:</strong> ثبت تحویل غذا به میز، وضعیت تسویه مالی را تغییر نمی‌دهد. تسویه نقدی یا پوز جداگانه انجام می‌گیرد.
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">Real-time KDS • IndexedDB Cache</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center space-y-2">
            <span className="material-symbols-outlined text-5xl text-stone-600">soup_kitchen</span>
            <p className="text-sm text-stone-400">تمام سفارش‌ها در این ایستگاه پردازش شده‌اند.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const minutesAgo = Math.max(1, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000));
              const isUrgent = minutesAgo > 10;
              const isCooking = order.status === 'cooking';
              const isPending = order.status === 'pending_waiter';
              const isDelivered = order.deliveryStatus === 'delivered';
              const isPaid = order.paymentStatus !== 'unpaid';

              return (
                <div 
                  key={order.id}
                  className={`bg-[#292524] border-2 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden transition-all ${
                    isPending ? 'border-red-600/70' :
                    isCooking ? 'border-amber-500/80' :
                    isDelivered ? 'border-emerald-700/60' : 'border-stone-700'
                  }`}
                >
                  {/* Timer Header Stripe */}
                  <div className={`p-3 border-b flex items-center justify-between ${
                    isUrgent ? 'bg-red-950/80 border-red-800' : 'bg-stone-800/90 border-stone-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#9e2016] text-white rounded-lg text-xs font-black">
                        میز {order.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-white">تیکت {order.orderNumber}</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className="material-symbols-outlined text-sm text-amber-400">timer</span>
                      <span className={isUrgent ? 'text-red-400 font-bold animate-pulse' : 'text-stone-300'}>
                        {minutesAgo} دقیقه پیش
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-3 flex-1">
                    {/* Customer Notes */}
                    {order.customerNotes && (
                      <div className="bg-amber-950/60 border border-amber-800 text-amber-300 p-2 rounded-xl text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-400 shrink-0">speaker_notes</span>
                        <span>{order.customerNotes}</span>
                      </div>
                    )}

                    {/* Order Items List */}
                    <div className="space-y-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-stone-700 text-amber-400 font-black flex items-center justify-center text-xs">
                              {it.quantity}×
                            </span>
                            <div>
                              <div className="text-xs font-bold text-white">{it.productName}</div>
                              {it.selectedOptions && it.selectedOptions.length > 0 && (
                                <div className="text-[11px] text-stone-400">
                                  {it.selectedOptions.map(o => o.optionName).join('، ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-stone-400">
                            {it.itemTotal.toLocaleString('fa-IR')} ت
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Badges & Controls Footer */}
                  <div className="p-3 bg-stone-800/60 border-t border-stone-700 space-y-2.5">
                    
                    {/* Status Matrix */}
                    <div className="flex items-center justify-between text-xs">
                      {/* Delivery Status Indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400">تحویل:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isDelivered 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {isDelivered ? '✓ تحویل شده به میز' : 'در حال آماده‌سازی'}
                        </span>
                      </div>

                      {/* Payment Status Indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-400">تسویه:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isPaid 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}>
                          {order.paymentStatus === 'paid_pos' ? 'کارت‌خوان سالن' :
                           order.paymentStatus === 'paid_cash' ? 'وجه نقد' :
                           order.paymentStatus === 'paid_online' ? 'آنلاین' : 'در انتظار تسویه'}
                        </span>
                      </div>
                    </div>

                    {/* Primary Culinary Stage Controls for Kitchen Staff */}
                    {isPending && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cooking')}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">skillet</span>
                        <span>شروع پخت در آشپزخانه</span>
                      </button>
                    )}

                    {isCooking && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>اعلام آماده‌سازی غذا (آماده تحویل به سالن) ✓</span>
                      </button>
                    )}

                    {order.status === 'ready' && !isDelivered && (
                      <div className="w-full py-2 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse">
                        <span className="material-symbols-outlined text-sm">notifications_active</span>
                        <span>غذا در آشپزخانه آماده است • منتظر تحویل سالندار</span>
                      </div>
                    )}

                    {/* Operational Delivery & Financial Settlement Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Delivery Action Button */}
                      <button
                        onClick={() => updateDeliveryStatus(order.id, isDelivered ? 'pending' : 'delivered')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          isDelivered 
                            ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700' 
                            : 'bg-stone-700 hover:bg-stone-600 text-white shadow-xs active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">room_service</span>
                        <span>{isDelivered ? 'تحویل لغو' : 'ثبت تحویل به میز'}</span>
                      </button>

                      {/* Financial Settlement Action Button */}
                      <button
                        onClick={() => setSettlementModalOrder(order)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                          isPaid 
                            ? 'bg-stone-800 text-emerald-400 border-emerald-800' 
                            : 'bg-[#D35400] hover:bg-[#b02d21] text-white border-transparent shadow-xs active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">payments</span>
                        <span>{isPaid ? 'تسویه شده ✓' : 'تسویه فاکتور'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. SETTLEMENT REGISTRATION MODAL */}
      {settlementModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#292524] border border-stone-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-stone-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">point_of_sale</span>
                <h3 className="font-bold text-sm">
                  ثبت تسویه مالی میز {settlementModalOrder.tableNumber}
                </h3>
              </div>
              <button 
                onClick={() => setSettlementModalOrder(null)}
                className="text-stone-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-stone-300 flex justify-between">
                <span>شماره سفارش:</span>
                <span className="font-bold font-mono">{settlementModalOrder.orderNumber}</span>
              </div>
              <div className="text-xs text-stone-300 flex justify-between">
                <span>مبلغ کل صورتحساب:</span>
                <span className="text-amber-400 font-extrabold text-sm font-mono">
                  {settlementModalOrder.totalAmount.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs text-stone-400 block font-bold">انتخاب روش دریافت وجه:</label>
              
              <button
                onClick={() => handleApplySettlement('paid_pos')}
                className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-sm">credit_card</span>
                  <span>دستگاه کارت‌خوان سالن (POS)</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold">تأیید تراکنش</span>
              </button>

              <button
                onClick={() => handleApplySettlement('paid_cash')}
                className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-sm">attach_money</span>
                  <span>دریافت نقدی در صندوق</span>
                </div>
                <span className="text-[11px] text-amber-400 font-bold">تأیید وجه</span>
              </button>

              <button
                onClick={() => handleApplySettlement('paid_online')}
                className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400 text-sm">qr_code</span>
                  <span>پرداخت آنلاین مستقیم میز</span>
                </div>
                <span className="text-[11px] text-blue-400 font-bold">رسید دیجیتال</span>
              </button>

              <button
                onClick={() => handleApplySettlement('unpaid')}
                className="w-full py-2 px-3 bg-red-950/60 hover:bg-red-950 text-red-300 border border-red-800 rounded-xl text-xs font-bold text-center mt-2 transition-colors"
              >
                بازگرداندن به وضعیت «در انتظار تسویه»
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

