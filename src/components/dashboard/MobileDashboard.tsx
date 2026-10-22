import {ProductVariantsEditor} from './ProductVariantsEditor';
import {OrderHistory} from './OrderHistory';
import {RemoveProduct} from './RemoveProduct';
import {PointsPanel} from './PointsPanel';
import {ProductPhotoButton} from '../common/ProductPhotoButton';
import {ProductPriceEditor} from './ProductPriceEditor';
import {EditProductImage} from '../modals/EditProductImage';
import type {Product} from '../../types';
import {localProductImage} from '../../services/menuPresentation';
import {MenusManager} from './MenusManager';
import {usePresentation} from '../../context/PresentationContext';
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {staffOrderStatus} from '../../lib/orderRules';
import { AllQRAccessModal } from '../modals/AllQRAccessModal';
import { AddDishModal } from '../modals/AddDishModal';

export const MobileDashboard: React.FC = () => {
  const { 
    business,menus,assignProductMenu, 
    products, 
    toggleProductAvailability,
    orders, 
    servicePoints,
    setSelectedTableNumber,
    setCurrentView,showToast
  } = useApp();
  const {openSample}=usePresentation();

  const [editingImage,setEditingImage]=useState<Product|null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'tables' | 'menu' | 'settings'>(()=>{try{const saved=sessionStorage.getItem('mizato-mobile-panel');return ["overview","orders","tables","menu","settings"].includes(saved||'')?saved as 'overview' | 'orders' | 'tables' | 'menu' | 'settings':'menu';}catch{return 'menu';}});
  useEffect(()=>{try{sessionStorage.setItem('mizato-mobile-panel',activeTab);}catch{}},[activeTab]);
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
    <div className="bg-[#F6F7F4] min-h-screen flex justify-center text-[#29372E] pb-24 antialiased selection:bg-[#51805A] selection:text-white">
      {/* Mobile Frame Container max-w-md */}
      <div className="w-full max-w-[420px] min-h-screen bg-[#FFFFFF] border-x border-[#DBE2D5] flex flex-col relative shadow-lg">
        
        {/* 1. COMPACT TOP APP BAR */}
        <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md px-4 py-2.5 border-b border-[#DBE2D5] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#465B3F] text-white flex items-center justify-center text-lg font-bold shadow-xs">
              پ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm text-[#29372E] font-bold tracking-tight">{business.name}</h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF0EC] text-[#465B3F] border border-[#D2DDD4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block ml-1 animate-pulse"></span>
                  منوی آنلاین فعال
                </span>
              </div>
              <p className="text-[11px] text-[#506354]">{business.branchName} • شیفت فعال</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" title="بازگشت به صفحه قبل" aria-label="بازگشت" className="p-1.5 rounded-lg text-[#506354]" onClick={()=>window.history.state?.mizatoView?window.history.back():setCurrentView('website')}><span className="material-symbols-outlined text-[20px]">arrow_forward</span></button>
            <button 
              onClick={() => {
                setSelectedQrTable(4);
                setIsQrModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-[#506354] hover:bg-[#EEF2E8]"
              title="QR کدها"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </button>
            <button 
              onClick={() => setIsAddDishModalOpen(true)}
              className="p-1.5 rounded-lg text-[#51805A] hover:bg-[#EEF2E8]"
              title="افزودن غذا"
            >
              <span className="material-symbols-outlined text-[22px]">add_circle</span>
            </button>
          </div>
        </header>

        <div className="px-4 pt-2"><label className="flex items-center gap-2 text-xs text-[#506354]">بخش پنل <select aria-label="انتخاب بخش پنل موبایل" className="flex-1 border border-[#DBE2D5] rounded-lg bg-white p-2" value={activeTab} onChange={e=>setActiveTab(e.target.value as typeof activeTab)}><option value="menu">منو و قیمت‌ها</option><option value="overview">نمای کلی</option><option value="orders">سفارش‌ها</option><option value="tables">میزها</option><option value="settings">تنظیمات</option></select></label></div>

        {/* 2. MAIN MOBILE CONTENT */}
        <main className="flex-1 px-3.5 pt-3 space-y-3.5">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* BENTO 2x2 KPI GRID */}
              <section aria-label="شاخص‌های عملکردی کلیدی">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Revenue */}
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#DBE2D5] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">فروش امروز</span>
                      <span className="p-1 rounded-lg bg-[#EEF2E8] text-[#B45309]">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-[#29372E] font-mono">
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
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#DBE2D5] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">سفارش‌های فعال</span>
                      <span className="p-1 rounded-lg bg-[#FEF3E7] text-[#D35400]">
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#29372E] font-mono">{orders.length}</span>
                        <span className="text-[11px] text-[#506354]">جاری</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center text-[10px] font-bold text-[#51805A] bg-[#ffdad6] px-1 py-0.2 rounded">
                          {pendingOrders.length} نیازمند تأیید
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Table Occupancy */}
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#DBE2D5] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">اشغال میزها</span>
                      <span className="p-1 rounded-lg bg-[#EEF2E8] text-[#506354]">
                        <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#29372E] font-mono">
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
                  <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#DBE2D5] shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[#506354] mb-1">
                      <span className="text-xs font-medium">ناموجود منو</span>
                      <span className="p-1 rounded-lg bg-[#EEF2E8] text-[#51805A]">
                        <span className="material-symbols-outlined text-[16px]">remove_shopping_cart</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#51805A] font-mono">{outOfStockCount}</span>
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
                      <div className="w-8 h-8 rounded-xl bg-[#51805A] text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#51805A] leading-tight">
                          {pendingOrders.length} سفارش معطل تأیید مدیر / گارسون
                        </p>
                        <p className="text-[11px] text-[#59413d] mt-0.5">
                          میز {pendingOrders.map(o => o.tableNumber).join(' و ')} منتظر ارسال به آشپزخانه
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="bg-[#51805A] text-white px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition-transform shrink-0 shadow-xs"
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
                    <h2 className="text-xs font-bold text-[#29372E]">وضعیت زنده سالن و میزها</h2>
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
                            ? 'bg-[#FFF3F1] border-2 border-[#51805A]/50 shadow-xs' 
                            : isOccupied 
                              ? 'bg-[#FFFFFF] border-[#DBE2D5]' 
                              : 'bg-[#EEF2E8]/50 border-dashed border-[#DBE2D5]'
                        }`}
                      >
                        {hasPendingOrder && (
                          <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-[#51805A] text-white text-[9px] font-bold animate-pulse">
                            فوری
                          </span>
                        )}
                        <div className={`text-sm font-bold ${hasPendingOrder ? 'text-[#51805A]' : 'text-[#29372E]'}`}>
                          میز {sp.tableNumber}
                        </div>
                        <div className={`text-[10px] font-semibold my-1 ${
                          hasPendingOrder ? 'text-[#51805A]' : isOccupied ? 'text-[#B45309]' : 'text-emerald-800'
                        }`}>
                          {hasPendingOrder ? 'نیاز به تأیید' : isOccupied ? 'سفارش باز' : 'خالی'}
                        </div>
                        <div className="text-[9px] text-[#506354] bg-[#F6F7F4] py-0.5 rounded">
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
                    <h2 className="text-xs font-bold text-[#29372E]">سفارش‌های نیازمند اقدام فوری</h2>
                  </div>
                  <span className="text-[11px] text-[#51805A] font-bold">
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
                      className="bg-[#FFFFFF] rounded-2xl border border-[#DBE2D5] shadow-xs p-3 space-y-2.5 relative overflow-hidden"
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#EEF2E8]">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-[#51805A] text-white text-xs font-bold rounded-lg">
                            میز {order.tableNumber}
                          </span>
                          <span className="text-[11px] text-[#506354]">سفارش {order.orderNumber}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPending ? 'bg-orange-100 text-[#51805A]' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {staffOrderStatus(order)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 text-xs">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-[#EEF2E8] text-[#29372E] font-bold flex items-center justify-center text-[10px]">
                                {it.quantity}×
                              </span>
                              <span className="font-semibold text-[#29372E]">{it.productName}</span>
                            </div>
                            <span className="text-[#506354] font-mono text-[11px]">
                              {it.itemTotal.toLocaleString('fa-IR')} ت
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Financial & Delivery Status Strip */}
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-xl bg-[#F6F7F4] text-[11px]">
                        <div>
                          <span className="text-[#506354]">تسویه: </span>
                          <span className={isPaid ? 'text-emerald-800 font-bold' : 'text-[#B45309] font-bold'}>
                            {isPaid ? 'پرداخت شده' : 'در انتظار تسویه'}
                          </span>
                        </div>
                        <div className="font-bold text-[#29372E] font-mono">
                          {order.totalAmount.toLocaleString('fa-IR')} تومان
                        </div>
                      </div>

                      {/* Actions */}
                      <p className="text-xs text-[#506354]">دریافت وجه، ارسال به آشپزخانه و تحویل را گارسون از حساب خودش ثبت می‌کند.</p>
                    </div>
                  );
                })}
              </section>
            </>
          )}

          {/* TAB 2: ORDERS LIST */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm text-[#29372E]">سفارش‌های اخیر ({orders.length})</h2>
              {orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(order => (
                <div key={order.id} className="p-3 bg-[#FFFFFF] border border-[#DBE2D5] rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">میز {order.tableNumber} - {order.orderNumber}</span>
                    <span className="text-[#506354]">{new Date(order.createdAt).toLocaleTimeString('fa-IR')}</span>
                  </div>
                  <div className="text-xs text-[#506354]">
                    {order.items.map(i => `${i.productName} (${i.quantity}x)`).join('، ')}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-[#DBE2D5]">
                    <span className="font-bold text-[#51805A]">{order.totalAmount.toLocaleString('fa-IR')} تومان</span>
                    <span className="px-2 py-0.5 rounded bg-[#EEF2E8] text-[10px] font-bold">
                      {order.deliveryStatus === 'delivered' ? 'تحویل شده' : 'در انتظار تحویل'}
                    </span>
                  </div>
                </div>
              ))}
              <OrderHistory/>
            </div>
          )}

          {/* TAB 3: TABLES */}
          {activeTab === 'tables' && <PointsPanel/>}

          {/* TAB 4: MENU & PRICING */}
          {activeTab === 'menu' && (
            <div className="space-y-3"><MenusManager/>
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-sm text-[#29372E]">مدیریت غذاها و قیمت‌ها</h2>
                <button 
                  onClick={() => setIsAddDishModalOpen(true)}
                  className="px-2.5 py-1 bg-[#51805A] text-white rounded text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>افزودن غذا</span>
                </button>
              </div>

              <div className="space-y-2">{!products.length&&<p className="p-4 text-sm">این منو هنوز آیتم ندارد؛ اولین غذا یا نوشیدنی را اضافه کن.</p>}
                {products.map(prod => (
                  <article key={prod.id} className="mizato-mobile-product-card">
                    <div className="mizato-mobile-product-head">
                      <ProductPhotoButton product={prod} onEdit={()=>setEditingImage(prod)} />
                      <div className="mizato-mobile-product-title">
                        <b>{prod.name}</b>
                        {menus.length>1&&<select className="mizato-mobile-product-menu" aria-label={'انتقال به منوی دیگر: '+prod.name}
                          value={prod.menuId||'main'} onChange={e=>assignProductMenu(prod.id,e.target.value).catch(err=>showToast(err.message))}>
                          {menus.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>}
                      </div>
                      <RemoveProduct product={prod}/>
                    </div>

                    <div className="mizato-mobile-product-footer"><ProductPriceEditor product={prod}/><ProductVariantsEditor product={prod}/>
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          aria-label={'موجودی '+prod.name} checked={prod.isAvailable} 
                          onChange={(e) => toggleProductAvailability(prod.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-stone-300 rounded-full peer peer-checked:bg-emerald-700 relative after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 peer-checked:after:-translate-x-3 transition-all"></div>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-4 bg-[#FFFFFF] border border-[#DBE2D5] rounded-2xl space-y-3">
              <h2 className="font-bold text-sm text-[#29372E]">تنظیمات مجموعه</h2>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[#506354] block">نام مجموعه:</label>
                  <div className="font-bold text-[#29372E] mt-0.5">{business.name}</div>
                </div>
                <div>
                  <label className="text-[#506354] block">شعبه:</label>
                  <div className="font-bold text-[#29372E] mt-0.5">{business.branchName}</div>
                </div>
                <div>
                  <label className="text-[#506354] block">آدرس:</label>
                  <div className="text-[#29372E] mt-0.5">{business.address}</div>
                </div>
                <div>
                  <label className="text-[#506354] block">تلفن پشتیبانی:</label>
                  <div className="font-mono text-[#29372E] mt-0.5">{business.phone}</div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* 7. FIXED MOBILE BOTTOM NAVIGATION BAR */}
        <nav 
          aria-label="نویگیشن اصلی موبایل" 
          className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto z-40 bg-[#FFFFFF]/95 backdrop-blur-lg px-2 py-1.5 border-t border-[#DBE2D5] shadow-lg flex items-center justify-around"
        >
          {/* Tab 1: Overview */}
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'overview' ? 'text-[#51805A] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className={`w-8 h-7 flex items-center justify-center rounded-full mb-0.5 ${activeTab === 'overview' ? 'bg-[#51805A]/10' : ''}`}>
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
            </div>
            <span className="text-[10px] leading-tight font-extrabold">نمای کلی</span>
          </button>

          {/* Tab 2: Orders */}
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
              activeTab === 'orders' ? 'text-[#51805A] font-bold scale-105' : 'text-[#506354]'
            }`}
          >
            <div className="w-8 h-7 flex items-center justify-center mb-0.5 relative">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              {pendingOrders.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#51805A]"></span>
              )}
            </div>
            <span className="text-[10px] leading-tight font-medium">سفارش‌ها</span>
          </button>

          {/* Tab 3: Tables */}
          <button 
            onClick={() => setActiveTab('tables')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === 'tables' ? 'text-[#51805A] font-bold scale-105' : 'text-[#506354]'
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
              activeTab === 'menu' ? 'text-[#51805A] font-bold scale-105' : 'text-[#506354]'
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
              activeTab === 'settings' ? 'text-[#51805A] font-bold scale-105' : 'text-[#506354]'
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
          initialTable={selectedQrTable}
          onClose={() => setIsQrModalOpen(false)}
        />

        {/* Add Dish Modal */}
        {editingImage&&<EditProductImage product={editingImage} onClose={()=>setEditingImage(null)}/>}
      <AddDishModal 
          isOpen={isAddDishModalOpen}
          onClose={() => setIsAddDishModalOpen(false)}
        />
      </div>
    </div>
  );
};

