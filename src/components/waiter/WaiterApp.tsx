import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';

export const WaiterApp: React.FC = () => {
  const { 
    orders, 
    updateOrderStatus, 
    updateDeliveryStatus, 
    updatePaymentStatus,
    servicePoints, 
    products,
    createOrder,
    business,
    serviceCalls,
    resolveServiceCall,
    playChime,
    showToast 
  } = useApp();

  const [filterSection, setFilterSection] = useState<'all' | 'pending' | 'ready' | 'delivered' | 'calls'>('all');
  const [selectedTable, setSelectedTable] = useState<number | 'all'>('all');
  const [isManualOrderOpen, setIsManualOrderOpen] = useState<boolean>(false);

  // Manual Order state
  const [manualTable, setManualTable] = useState<number>(4);
  const [manualNotes, setManualNotes] = useState<string>('سفارش حضوری توسط گارسون');
  const [manualCart, setManualCart] = useState<{ product: Product; quantity: number }[]>([]);

  const pendingCount = orders.filter(o => o.status === 'pending_waiter').length;
  const readyCount = orders.filter(o => o.status === 'ready' || (o.status === 'cooking' && o.deliveryStatus === 'pending')).length;
  const pendingCalls = serviceCalls.filter(c => c.status === 'pending');

  const filteredOrders = orders.filter(o => {
    if (selectedTable !== 'all' && o.tableNumber !== selectedTable) return false;
    if (filterSection === 'pending') return o.status === 'pending_waiter';
    if (filterSection === 'ready') return o.status === 'ready' || (o.status === 'cooking' && o.deliveryStatus === 'pending');
    if (filterSection === 'delivered') return o.deliveryStatus === 'delivered';
    return true;
  });

  const handleAddManualItem = (product: Product) => {
    setManualCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveManualItem = (productId: string) => {
    setManualCart(prev => {
      const existing = prev.find(i => i.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.product.id !== productId);
    });
  };

  const handleSubmitManualOrder = async () => {
    if (manualCart.length === 0) {
      showToast('حداقل یک غذا انتخاب کنید');
      return;
    }
    const cartItems = manualCart.map(i => ({
      id: `man-${Date.now()}-${i.product.id}`,
      product: i.product,
      quantity: i.quantity,
      itemTotal: i.product.price * i.quantity,
    }));

    await createOrder(manualTable, `سفارش گارسون (میز ${manualTable})`, manualNotes, cartItems);
    setIsManualOrderOpen(false);
    setManualCart([]);
    showToast(`سفارش دستی برای میز ${manualTable} با موفقیت ثبت شد`);
  };

  return (
    <div className="bg-[#F8F5F0] min-h-screen text-[#1C1917] antialiased selection:bg-[#A93226] selection:text-white pb-20">
      
      {/* 1. WAITER TOP BAR */}
      <header className="sticky top-0 z-30 bg-[#FFFDF9] border-b border-[#E8DFD3] shadow-xs px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#3D4F41] text-white flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-2xl">person_apron</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm text-[#1C1917]">اپلیکیشن گارسون و سالن‌دار</h1>
                <span className="text-[10px] bg-[#EAF2EC] text-[#3D4F41] border border-[#D0E5D2] px-2 py-0.2 rounded-full font-bold">
                  شیفت فعال
                </span>
                {pendingCalls.length > 0 && (
                  <span className="text-[10px] bg-red-100 text-[#9e2016] border border-red-300 px-2 py-0.2 rounded-full font-black animate-pulse flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">notifications_active</span>
                    <span>{pendingCalls.length} فراخوان میز</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7A6458]">{business.name} • {business.branchName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playChime('call')}
              className="w-8 h-8 rounded-xl bg-[#FAF0E4] hover:bg-[#F2DECC] text-[#9e2016] flex items-center justify-center text-xs"
              title="آزمایش صدای زنگ هشدار"
            >
              <span className="material-symbols-outlined text-base">volume_up</span>
            </button>

            <button
              onClick={() => setIsManualOrderOpen(true)}
              className="px-3 py-1.5 bg-[#9e2016] hover:bg-[#8d1c13] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span className="hidden sm:inline">ثبت سفارش سر میز</span>
            </button>

            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-[#1C1917]">سالن‌دار: محمدرضا کمالی</div>
              <div className="text-[10px] text-[#7A6458] font-mono">{orders.length} کل سفارشات</div>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="max-w-4xl mx-auto pt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterSection('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterSection === 'all' ? 'bg-[#3D4F41] text-white shadow-xs' : 'bg-[#E8DFD3]/50 text-stone-700 hover:bg-[#E8DFD3]'
            }`}
          >
            همه ({orders.length})
          </button>
          <button
            onClick={() => setFilterSection('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all relative ${
              filterSection === 'pending' ? 'bg-[#9e2016] text-white shadow-xs' : 'bg-[#E8DFD3]/50 text-stone-700 hover:bg-[#E8DFD3]'
            }`}
          >
            در انتظار تأیید ({pendingCount})
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setFilterSection('ready')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterSection === 'ready' ? 'bg-[#B45309] text-white shadow-xs' : 'bg-[#E8DFD3]/50 text-stone-700 hover:bg-[#E8DFD3]'
            }`}
          >
            آماده تحویل ({readyCount})
          </button>
          {pendingCalls.length > 0 && (
            <button
              onClick={() => setFilterSection('calls')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                filterSection === 'calls' ? 'bg-[#9e2016] text-white shadow-xs' : 'bg-red-100 text-[#9e2016] border border-red-300'
              }`}
            >
              فراخوان‌های میز ({pendingCalls.length})
            </button>
          )}
          <button
            onClick={() => setFilterSection('delivered')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterSection === 'delivered' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-[#E8DFD3]/50 text-stone-700 hover:bg-[#E8DFD3]'
            }`}
          >
            تحویل شده به میز
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT */}
      <main className="max-w-4xl mx-auto p-4 space-y-4">

        {/* ACTIVE TABLE SERVICE CALLS ALERT WIDGET */}
        {pendingCalls.length > 0 && (
          <section className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#9e2016] text-white flex items-center justify-center font-bold animate-bounce">
                  <span className="material-symbols-outlined text-lg">notifications_active</span>
                </span>
                <div>
                  <h3 className="font-black text-sm text-[#9e2016]">
                    درخواست‌های فراخوان سالن‌دار ({pendingCalls.length} میز)
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    مهمانان زیر از طریق اسکن کیو‌آر کد منو، درخواست حضور یا صورت‌حساب دارند:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {pendingCalls.map(call => (
                <div 
                  key={call.id}
                  className="bg-white border border-red-200 rounded-xl p-3 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-[#9e2016] text-white rounded-lg text-xs font-black">
                      میز {call.tableNumber}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        {call.type === 'bill' ? '💳 درخواست صورت‌حساب' : '🛎️ صدا زدن سالن‌دار'}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {new Date(call.createdAt).toLocaleTimeString('fa-IR')} • {call.message}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => resolveServiceCall(call.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>رسیدگی شد</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Table Selector Quick Bar */}
        <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-[#7A6458] shrink-0">فیلتر میز:</span>
          <button
            onClick={() => setSelectedTable('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
              selectedTable === 'all' ? 'bg-stone-800 text-white' : 'bg-[#F4EFE6] text-stone-700'
            }`}
          >
            همه میزها
          </button>
          {servicePoints.map((sp) => {
            const hasOrder = orders.some(o => o.tableNumber === sp.tableNumber && o.status !== 'delivered');
            return (
              <button
                key={sp.id}
                onClick={() => setSelectedTable(sp.tableNumber)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                  selectedTable === sp.tableNumber 
                    ? 'bg-[#9e2016] text-white shadow-xs' 
                    : hasOrder 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                      : 'bg-[#F4EFE6] text-stone-700'
                }`}
              >
                میز {sp.tableNumber}
              </button>
            );
          })}
        </div>

        {/* Orders Stream */}
        {filteredOrders.length === 0 ? (
          <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-10 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-stone-300">task_alt</span>
            <p className="text-xs text-[#7A6458]">هیچ سفارشی در این وضعیت وجود ندارد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map((order) => {
              const isPending = order.status === 'pending_waiter';
              const isCooking = order.status === 'cooking';
              const isReady = order.status === 'ready';
              const isDelivered = order.deliveryStatus === 'delivered';
              const isPaid = order.paymentStatus !== 'unpaid';

              return (
                <div 
                  key={order.id}
                  className={`bg-[#FFFDF9] border-2 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isPending ? 'border-[#9e2016]' : isCooking ? 'border-amber-400' : isReady ? 'border-emerald-500' : 'border-[#E8DFD3]'
                  }`}
                >
                  {/* Top Header */}
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#E8DFD3]">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#3D4F41] text-white text-xs font-black rounded-lg">
                          میز {order.tableNumber}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-[#1C1917] block">سفارش {order.orderNumber}</span>
                          <span className="text-[11px] text-[#7A6458] font-mono">
                            {new Date(order.createdAt).toLocaleTimeString('fa-IR')}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isPending ? 'bg-red-100 text-[#9e2016] animate-pulse' :
                        isCooking ? 'bg-amber-100 text-amber-900' :
                        isReady ? 'bg-emerald-100 text-emerald-900 animate-bounce' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {isPending ? 'نیاز به تأیید گارسون' :
                         isCooking ? 'در حال پخت آشپزخانه' :
                         isReady ? 'آماده تحویل به میز' :
                         'تحویل داده شد'}
                      </span>
                    </div>

                    {/* Customer Notes */}
                    {order.customerNotes && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-dashed border-amber-200 text-xs text-amber-950 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#B45309]">speaker_notes</span>
                        <span>{order.customerNotes}</span>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="mt-2.5 space-y-1.5 divide-y divide-[#F4EFE6]">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#FAF0E4] text-[#9e2016] font-bold flex items-center justify-center text-xs">
                              {it.quantity}×
                            </span>
                            <div>
                              <span className="font-bold text-[#1C1917]">{it.productName}</span>
                              {it.selectedOptions && it.selectedOptions.length > 0 && (
                                <p className="text-[11px] text-[#7A6458]">
                                  {it.selectedOptions.map(o => o.optionName).join('، ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-[#7A6458]">
                            {it.itemTotal.toLocaleString('fa-IR')} ت
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Strip & Action Buttons */}
                  <div className="pt-2.5 border-t border-[#E8DFD3] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[#7A6458]">مبلغ صورتحساب: </span>
                        <span className="font-bold font-mono text-[#9e2016]">{order.totalAmount.toLocaleString('fa-IR')} تومان</span>
                      </div>
                      <button
                        onClick={() => updatePaymentStatus(order.id, isPaid ? 'unpaid' : 'paid_pos')}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {isPaid ? 'تسویه شده ✓' : 'تسویه با کارتخوان / نقد'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {isPending ? (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cooking')}
                          className="w-full py-2.5 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">check</span>
                          <span>تأیید سفارش و ارسال به آشپزخانه</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateDeliveryStatus(order.id, isDelivered ? 'pending' : 'delivered')}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            isDelivered 
                              ? 'bg-[#EAF2EC] text-[#3D4F41] border border-[#D0E5D2]' 
                              : 'bg-[#3D4F41] hover:bg-[#324235] text-white shadow-sm'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">room_service</span>
                          <span>{isDelivered ? 'تحویل ثبت شده' : 'ثبت تحویل به میز'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => showToast(`پیام فراخوان به آشپزخانه برای تیکت ${order.orderNumber} مخابره شد.`)}
                        className="py-2.5 bg-[#F4EFE6] hover:bg-[#ECE4D8] text-[#1C1917] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">notifications</span>
                        <span>اعلان به آشپزخانه / بار</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MANUAL ORDER MODAL */}
      {isManualOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#E8DFD3] flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9e2016]">add_box</span>
                <h3 className="font-black text-sm text-[#1C1917]">ثبت سریع سفارش دستی سر میز توسط گارسون</h3>
              </div>
              <button 
                onClick={() => setIsManualOrderOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">انتخاب میز:</label>
                <select
                  value={manualTable}
                  onChange={(e) => setManualTable(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-[#E8DFD3] rounded-xl text-xs font-bold"
                >
                  {servicePoints.map(sp => (
                    <option key={sp.id} value={sp.tableNumber}>
                      میز {sp.tableNumber} ({sp.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">انتخاب غذاها از منو:</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-[#FAF7F2] rounded-xl border border-[#E8DFD3]">
                  {products.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddManualItem(p)}
                      className="p-2 bg-white border border-[#E8DFD3] rounded-lg text-right text-xs hover:border-[#9e2016] transition-all flex justify-between items-center"
                    >
                      <span className="font-bold truncate">{p.name}</span>
                      <span className="text-[#9e2016] font-bold text-[10px] shrink-0 font-mono">
                        {p.price.toLocaleString('fa-IR')} ت
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {manualCart.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-[#E8DFD3] space-y-2">
                  <span className="text-xs font-bold text-[#1C1917] block">اقلام انتخابی:</span>
                  <div className="divide-y divide-[#E8DFD3]">
                    {manualCart.map(item => (
                      <div key={item.product.id} className="py-1.5 flex justify-between items-center text-xs">
                        <span>{item.product.name}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleRemoveManualItem(item.product.id)}
                            className="w-5 h-5 bg-stone-200 rounded text-xs font-bold"
                          >-</button>
                          <span className="font-mono font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => handleAddManualItem(item.product)}
                            className="w-5 h-5 bg-[#9e2016] text-white rounded text-xs font-bold"
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">توضیحات سفارش:</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-[#E8DFD3] rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#E8DFD3] flex justify-end gap-2 bg-stone-50">
              <button
                onClick={() => setIsManualOrderOpen(false)}
                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleSubmitManualOrder}
                className="px-5 py-2 bg-[#9e2016] hover:bg-[#8d1c13] text-white rounded-xl text-xs font-bold"
              >
                ثبت و ارسال به آشپزخانه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

