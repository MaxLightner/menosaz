import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AllQRAccessModal } from '../modals/AllQRAccessModal';
import { AddDishModal } from '../modals/AddDishModal';

export const MobileDashboard: React.FC = () => {
  const { 
    business, 
    products, 
    updateProductPrice, 
    toggleProductAvailability,
    orders, 
    updateOrderStatus, 
    updateDeliveryStatus, 
    updatePaymentStatus,
    servicePoints,
    setSelectedTableNumber,
    setCurrentView
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'tables' | 'menu' | 'settings'>('overview');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState(4);

  const pendingOrders = orders.filter(o => o.status === 'pending_waiter');
  const occupiedCount = servicePoints.filter(sp => sp.isOccupied).length;
  const outOfStockCount = products.filter(p => !p.isAvailable).length;

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="bg-[#FAF7F2] min-h-screen flex justify-center text-[#1c1c19] pb-24 antialiased selection:bg-[#A93226] selection:text-white">
      {/* Mobile Frame Container max-w-md */}
      <div className="w-full max-w-[420px] min-h-screen bg-[#FFFDF9] border-x border-[#E8DFD3] flex flex-col relative shadow-lg">
        
        {/* 1. COMPACT TOP APP BAR */}
        <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md px-4 py-2.5 border-b border-[#E8DFD3] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8d1c13] text-white flex items-center justify-center text-lg font-bold shadow-xs">
              پ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm text-[#3E2723] font-bold tracking-tight">{business.name}</h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF0EC] text-[#3D4F41] border border-[#D2DDD4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block ml-1 animate-pulse"></span>
                  منوی آنلاین فعال
                </span>
              </div>
              <p className="text-[11px] text-[#506354]">{business.branchName} • شیفت فعال</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                setSelectedQrTable(4);
                setIsQrModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-[#506354] hover:bg-[#F4EFE6]"
              title="QR کدها"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </button>
            <button 
              onClick={() => setIsAddDishModalOpen(true)}
              className="p-1.5 rounded-lg text-[#9e2016] hover:bg-[#FAF0E4]"
              title="افزودن غذا"
            >
              <span className="material-symbols-outlined text-[22px]">add_circle</span>
            </button>
          </div>
        </header>

        {/* 2. MAIN MOBILE CONTENT */}
        <main className="flex-1 px-3.5 pt-3 space-y-3.5">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* BENTO 2x2 KPI GRID */}
              <section aria-label="شاخص‌های عملکردی کلیدی">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Revenue */}
                  <div className="bg-[#FFFDF9] p-3 rounded-2xl border border-[#E8DFD3] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">فروش امروز</span>
                      <span className="p-1 rounded-lg bg-[#F4EFE6] text-[#B45309]">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-[#3E2723] font-mono">
                          {totalRevenue.toLocaleString('fa-IR')}
                        </span>
                        <span className="text-[10px] text-[#506354]">تومان</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-800 font-bold">
                        <span className="material-symbols-outlined text-[12px]">trending_up</span>
                        <span>+۱۸.۴٪ نسبت به دیروز</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Orders */}
                  <div className="bg-[#FFFDF9] p-3 rounded-2xl border border-[#E8DFD3] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">سفارش‌های فعال</span>
                      <span className="p-1 rounded-lg bg-[#FEF3E7] text-[#D35400]">
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#3E2723] font-mono">{orders.length}</span>
                        <span className="text-[11px] text-[#506354]">جاری</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center text-[10px] font-bold text-[#9e2016] bg-[#ffdad6] px-1 py-0.2 rounded">
                          {pendingOrders.length} نیازمند تأیید
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Table Occupancy */}
                  <div className="bg-[#FFFDF9] p-3 rounded-2xl border border-[#E8DFD3] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">اشغال میزها</span>
                      <span className="p-1 rounded-lg bg-[#F4EFE6] text-[#506354]">
                        <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#3E2723] font-mono">
                          {occupiedCount} <span className="text-[#506354] font-normal text-xs">از ۱۶</span>
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          className="bg-[#D35400] h-1.5 rounded-full" 
                          style={{ width: `${(occupiedCount / 16) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#506354] block mt-1">
                        {Math.round((occupiedCount / 16) * 100)}٪ تکمیل ظرفیت
                      </span>
                    </div>
                  </div>

                  {/* Unavailable Items */}
                  <div className="bg-[#FFFDF9] p-3 rounded-2xl border border-[#E8DFD3] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">ناموجود منو</span>
                      <span className="p-1 rounded-lg bg-[#F4EFE6] text-[#A93226]">
                        <span className="material-symbols-outlined text-[16px]">remove_shopping_cart</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#A93226] font-mono">{outOfStockCount}</span>
                        <span className="text-[11px] text-[#506354]">قلم غذا</span>
                      </div>
                      <span className="text-[10px] text-[#506354] block mt-1 truncate">
                        سیب‌زمینی سرخ‌کرده
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* URGENT MANAGER ACTION BANNER */}
              {pendingOrders.length > 0 && (
                <section aria-label="هشدار فوری سفارشات">
                  <div className="bg-[#FFF8F6] border border-[#ffdad6] rounded-2xl p-3 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#9e2016] text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#9e2016] leading-tight">
                          {pendingOrders.length} سفارش معطل تأیید مدیر / گارسون
                        </p>
                        <p className="text-[11px] text-[#59413d] mt-0.5">
                          میز {pendingOrders.map(o => o.tableNumber).join(' و ')} منتظر ارسال به آشپزخانه
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="bg-[#9e2016] text-white px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition-transform shrink-0 shadow-xs"
                    >
                      بررسی سریع
                    </button>
                  </div>
                </section>
              )}

              {/* LIVE HORIZONTAL TABLE SCROLLER */}
              <section aria-label="وضعیت زنده سالن">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#506354] text-[18px]">meeting_room</span>
                    <h2 className="text-xs font-bold text-[#3E2723]">وضعیت زنده سالن و میزها</h2>
                  </div>
                  <span className="text-[11px] text-[#506354] font-medium">
                    {16 - occupiedCount} میز خالی
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3.5 px-3.5">
                  {servicePoints.map((sp) => {
                    const hasPendingOrder = pendingOrders.some(o => o.tableNumber === sp.tableNumber);
                    const isOccupied = sp.isOccupied;

                    return (
                      <div 
                        key={sp.id}
                        onClick={() => {
                          setSelectedQrTable(sp.tableNumber);
                          setIsQrModalOpen(true);
                        }}
                        className={`w-[96px] shrink-0 rounded-xl p-2 text-center relative border transition-all cursor-pointer flex flex-col justify-between ${
                          hasPendingOrder 
                            ? 'bg-[#FFF3F1] border-2 border-[#9e2016]/50 shadow-xs' 
                            : isOccupied 
                              ? 'bg-[#FFFDF9] border-[#E8DFD3]' 
                              : 'bg-[#F4EFE6]/50 border-dashed border-[#E8DFD3]'
                        }`}
                      >
                        {hasPendingOrder && (
                          <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-[#9e2016] text-white text-[9px] font-bold animate-pulse">
                            فوری
                          </span>
                        )}
                        <div className={`text-sm font-bold ${hasPendingOrder ? 'text-[#9e2016]' : 'text-[#3E2723]'}`}>
                          میز {sp.tableNumber}
                        </div>
                        <div className={`text-[10px] font-semibold my-1 ${
                          hasPendingOrder ? 'text-[#A93226]' : isOccupied ? 'text-[#B45309]' : 'text-emerald-800'
                        }`}>
                          {hasPendingOrder ? 'نیاز به تأیید' : isOccupied ? 'سفارش باز' : 'خالی'}
                        </div>
                        <div className="text-[9px] text-[#506354] bg-[#FAF7F2] py-0.5 rounded">
                          {sp.section === 'main' ? 'سالن' : sp.section === 'balcony' ? 'بالکن' : 'تراس'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* LIVE ACTIONABLE TOUCH CARDS */}
              <section aria-label="جریان سفارش‌های جاری" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#506354] text-[18px]">dinner_dining</span>
                    <h2 className="text-xs font-bold text-[#3E2723]">سفارش‌های نیازمند اقدام فوری</h2>
                  </div>
                  <span className="text-[11px] text-[#9e2016] font-bold">
                    {orders.length} سفارش
                  </span>
                </div>

                {orders.map((order) => {
                  const isPending = order.status === 'pending_waiter';
                  const isDelivered = order.deliveryStatus === 'delivered';
                  const isPaid = order.paymentStatus !== 'unpaid';

                  return (
                    <div 
                      key={order.id}
                      className="bg-[#FFFDF9] rounded-2xl border border-[#E8DFD3] shadow-xs p-3 space-y-2.5 relative overflow-hidden"
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#F4EFE6]">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-[#9e2016] text-white text-xs font-bold rounded-lg">
                            میز {order.tableNumber}
                          </span>
                          <span className="text-[11px] text-[#506354]">سفارش {order.orderNumber}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPending ? 'bg-orange-100 text-[#9e2016]' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {isPending ? 'در انتظار تأیید گارسون' : order.status === 'cooking' ? 'در حال پخت آشپزخانه' : 'تحویل به میز'}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 text-xs">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-[#F4EFE6] text-[#3E2723] font-bold flex items-center justify-center text-[10px]">
                                {it.quantity}×
                              </span>
                              <span className="font-semibold text-[#3E2723]">{it.productName}</span>
                            </div>
                            <span className="text-[#506354] font-mono text-[11px]">
                              {it.itemTotal.toLocaleString('fa-IR')} ت
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Financial & Delivery Status Strip */}
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-xl bg-[#FAF7F2] text-[11px]">
                        <div>
                          <span className="text-[#506354]">تسویه: </span>
                          <span className={isPaid ? 'text-emerald-800 font-bold' : 'text-[#B45309] font-bold'}>
                            {isPaid ? 'پرداخت شده' : 'در انتظار تسویه'}
                          </span>
                        </div>
                        <div className="font-bold text-[#3E2723] font-mono">
                          {order.totalAmount.toLocaleString('fa-IR')} تومان
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {isPending ? (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'cooking')}
                            className="w-full bg-[#9e2016] hover:bg-[#A93226] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
                            <span>تأیید و ارسال به آشپزخانه</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => updateDeliveryStatus(order.id, isDelivered ? 'pending' : 'delivered')}
                            className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              isDelivered ? 'bg-[#EAF2EC] text-[#3D4F41]' : 'bg-[#3D4F41] text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">room_service</span>
                            <span>{isDelivered ? 'تحویل شد' : 'ثبت تحویل به میز'}</span>
                          </button>
                        )}

                        <button 
                          onClick={() => updatePaymentStatus(order.id, isPaid ? 'unpaid' : 'paid_pos')}
                          className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                              : 'bg-[#F4EFE6] text-[#3E2723] border-[#E8DFD3]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          <span>{isPaid ? 'تسویه شده' : 'ثبت تسویه وجه'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            </>
          )}

          {/* TAB 2: ORDERS LIST */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm text-[#3E2723]">همه سفارش‌های روز ({orders.length})</h2>
              {orders.map(order => (
                <div key={order.id} className="p-3 bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">میز {order.tableNumber} - {order.orderNumber}</span>
                    <span className="text-[#506354]">{new Date(order.createdAt).toLocaleTimeString('fa-IR')}</span>
                  </div>
                  <div className="text-xs text-[#506354]">
                    {order.items.map(i => `${i.productName} (${i.quantity}x)`).join('، ')}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-[#E8DFD3]">
                    <span className="font-bold text-[#9e2016]">{order.totalAmount.toLocaleString('fa-IR')} تومان</span>
                    <span className="px-2 py-0.5 rounded bg-[#F4EFE6] text-[10px] font-bold">
                      {order.deliveryStatus === 'delivered' ? 'تحویل شده' : 'در انتظار تحویل'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: TABLES */}
          {activeTab === 'tables' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-sm text-[#3E2723]">چیدمان و QR کد میزها</h2>
                <button 
                  onClick={() => { setSelectedQrTable(4); setIsQrModalOpen(true); }}
                  className="px-2.5 py-1 bg-[#9e2016] text-white rounded text-xs font-bold"
                >
                  دریافت QR کدها
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {servicePoints.map(sp => (
                  <div key={sp.id} className="p-2.5 bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl text-center space-y-1">
                    <div className="font-bold text-xs text-[#1c1c19]">{sp.label}</div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      sp.isOccupied ? 'bg-orange-100 text-[#D35400]' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {sp.isOccupied ? 'مشغول' : 'خالی'}
                    </span>
                    <div className="pt-1 flex gap-1">
                      <button 
                        onClick={() => { setSelectedQrTable(sp.tableNumber); setIsQrModalOpen(true); }}
                        className="flex-1 py-1 bg-[#F4EFE6] text-[10px] rounded font-bold"
                      >
                        نمایش QR
                      </button>
                      <button 
                        onClick={() => { setSelectedTableNumber(sp.tableNumber); setCurrentView('customer'); }}
                        className="flex-1 py-1 bg-[#9e2016] text-white text-[10px] rounded font-bold"
                      >
                        ورود
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MENU & PRICING */}
          {activeTab === 'menu' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-sm text-[#3E2723]">مدیریت غذاها و قیمت‌ها</h2>
                <button 
                  onClick={() => setIsAddDishModalOpen(true)}
                  className="px-2.5 py-1 bg-[#9e2016] text-white rounded text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>افزودن غذا</span>
                </button>
              </div>

              <div className="space-y-2">
                {products.map(prod => (
                  <div key={prod.id} className="p-3 bg-[#FFFDF9] border border-[#E8DFD3] rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={prod.imageUrl} alt={prod.name} className="w-11 h-11 object-cover rounded-lg shrink-0 border" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#1c1c19] truncate">{prod.name}</div>
                        <div className="text-[11px] text-[#9e2016] font-bold mt-0.5">
                          {prod.price.toLocaleString('fa-IR')} تومان
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={prod.isAvailable} 
                          onChange={(e) => toggleProductAvailability(prod.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-stone-300 rounded-full peer peer-checked:bg-emerald-700 relative after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 peer-checked:after:-translate-x-3 transition-all"></div>
                      </label>
                      <button 
                        onClick={() => {
                          const newPrice = prompt(`قیمت جدید برای ${prod.name} (تومان):`, prod.price.toString());
                          if (newPrice) updateProductPrice(prod.id, Number(newPrice));
                        }}
                        className="p-1 text-[#506354] hover:text-[#D35400] bg-[#F4EFE6] rounded"
                        title="ویرایش قیمت"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-4 bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl space-y-3">
              <h2 className="font-bold text-sm text-[#3E2723]">تنظیمات مجموعه</h2>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[#506354] block">نام مجموعه:</label>
                  <div className="font-bold text-[#1c1c19] mt-0.5">{business.name}</div>
                </div>
                <div>
                  <label className="text-[#506354] block">شعبه:</label>
                  <div className="font-bold text-[#1c1c19] mt-0.5">{business.branchName}</div>
                </div>
                <div>
                  <label className="text-[#506354] block">آدرس:</label>
                  <div className="text-[#1c1c19] mt-0.5">{business.address}</div>
                </div>
                <div>
                  <label className="text-[#506354] block">تلفن پشتیبانی:</label>
                  <div className="font-mono text-[#1c1c19] mt-0.5">{business.phone}</div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* 7. FIXED MOBILE BOTTOM NAVIGATION BAR */}
        <nav 
          aria-label="نویگیشن اصلی موبایل" 
          className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto z-40 bg-[#FFFDF9]/95 backdrop-blur-lg px-2 py-1.5 border-t border-[#E8DFD3] shadow-lg flex items-center justify-around"
        >
          {/* Tab 1: Overview */}
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'overview' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className={`w-8 h-7 flex items-center justify-center rounded-full mb-0.5 ${activeTab === 'overview' ? 'bg-[#9e2016]/10' : ''}`}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
            </div>
            <span className="text-[10px] leading-tight font-extrabold">نمای کلی</span>
          </button>

          {/* Tab 2: Orders */}
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
              activeTab === 'orders' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className="w-8 h-7 flex items-center justify-center mb-0.5 relative">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              {pendingOrders.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#9e2016]"></span>
              )}
            </div>
            <span className="text-[10px] leading-tight font-medium">سفارش‌ها</span>
          </button>

          {/* Tab 3: Tables */}
          <button 
            onClick={() => setActiveTab('tables')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'tables' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className="w-8 h-7 flex items-center justify-center mb-0.5">
              <span className="material-symbols-outlined text-[20px]">table_restaurant</span>
            </div>
            <span className="text-[10px] leading-tight font-medium">میزها</span>
          </button>

          {/* Tab 4: Menu */}
          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'menu' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className="w-8 h-7 flex items-center justify-center mb-0.5">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <span className="text-[10px] leading-tight font-medium">منو و قیمت‌ها</span>
          </button>

          {/* Tab 5: Settings */}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'settings' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className="w-8 h-7 flex items-center justify-center mb-0.5">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </div>
            <span className="text-[10px] leading-tight font-medium">تنظیمات</span>
          </button>
        </nav>

        {/* QR Modal */}
        <AllQRAccessModal 
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
        />

        {/* Add Dish Modal */}
        <AddDishModal 
          isOpen={isAddDishModalOpen}
          onClose={() => setIsAddDishModalOpen(false)}
        />
      </div>
    </div>
  );
};
