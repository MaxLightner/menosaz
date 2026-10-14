import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, OrderItemOption } from '../../types';

export const CustomerApp: React.FC = () => {
  const { 
    business, 
    products, 
    selectedTableNumber, 
    setSelectedTableNumber,
    servicePoints,
    cart, 
    addToCart, 
    updateCartQuantity, 
    clearCart,
    cartTotal,
    createOrder,
    orders,
    createServiceCall,
    showToast
  } = useApp();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<OrderItemOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'status'>('menu');
  const [isWaiterCalled, setIsWaiterCalled] = useState<boolean>(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState<boolean>(false);

  // Filter orders for this specific table (for live tracking)
  const tableOrders = orders.filter(o => o.tableNumber === selectedTableNumber);
  const activeTableOrder = tableOrders[0]; // most recent order

  const categories = [
    { id: 'all', name: 'همه منو', icon: 'restaurant' },
    { id: 'cat-kebab', name: 'کباب‌های شمرونی', icon: 'kebab_dining' },
    { id: 'cat-traditional', name: 'غذاهای اصیل', icon: 'rice_bowl' },
    { id: 'cat-fastfood', name: 'پیتزا و برگر', icon: 'local_pizza' },
    { id: 'cat-appetizer', name: 'پیش‌غذا و سالاد', icon: 'lunch_dining' },
    { id: 'cat-drink', name: 'نوشیدنی‌ها', icon: 'local_drink' },
    { id: 'cat-cafe', name: 'کافه و دسر', icon: 'coffee' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategoryId === 'all' || p.categoryId === activeCategoryId;
    const matchesSearch = searchQuery.trim() === '' || 
      p.name.includes(searchQuery.trim()) || 
      p.description.includes(searchQuery.trim());
    return matchesCategory && matchesSearch;
  });

  const handleOpenItemModal = (product: Product) => {
    if (!product.isAvailable) {
      showToast('این غذا در حال حاضر ناموجود است.');
      return;
    }
    setSelectedProductForModal(product);
    setSelectedOptions([]);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProductForModal) return;
    addToCart(selectedProductForModal, selectedOptions);
    setSelectedProductForModal(null);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast('سبد سفارش شما خالی است');
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrder(selectedTableNumber, customerName || `مهمان میز ${selectedTableNumber}`, customerNotes, cart);
      setActiveTab('status');
      setCustomerNotes('');
      showToast('سفارش شما با موفقیت ثبت و به سالن‌دار ارسال شد');
    } catch (e) {
      console.error(e);
      showToast('خطا در ثبت سفارش');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallStaff = async (reason: 'waiter' | 'bill') => {
    setIsWaiterCalled(true);
    await createServiceCall(selectedTableNumber, reason);
    setTimeout(() => setIsWaiterCalled(false), 6000);
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen text-[#1C1917] antialiased flex flex-col justify-between selection:bg-[#A93226] selection:text-white pb-24">
      
      {/* 1. RESTAURANT & TABLE BANNER (NO WEBSITE NAV OR MANAGER CONTROLS) */}
      <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DFD3] shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8d1c13] via-[#A93226] to-[#c0392b] text-white flex items-center justify-center font-bold shadow-md">
              <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-base text-[#1C1917] tracking-tight">{business.name}</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" title="منو آنلاین"></span>
              </div>
              <p className="text-xs text-[#7A6458] font-medium">{business.branchName}</p>
            </div>
          </div>

          {/* Table Badge & Call Waiter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCallStaff('waiter')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                isWaiterCalled 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' 
                  : 'bg-[#FAF0E4] hover:bg-[#F2DECC] text-[#9e2016] border-[#F2DECC]'
              }`}
              title="فراخوان سالن‌دار سر میز"
            >
              <span className="material-symbols-outlined text-base">notifications</span>
              <span className="hidden sm:inline">صدا زدن گارسون</span>
            </button>

            {/* Clickable Table Selector */}
            <button
              onClick={() => setIsTablePickerOpen(true)}
              className="px-3 py-1.5 bg-[#9e2016] hover:bg-[#8d1c13] text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 transition-all cursor-pointer"
              title="کلیک برای تغییر شماره میز"
            >
              <span className="material-symbols-outlined text-base">table_restaurant</span>
              <span>میز {selectedTableNumber}</span>
              <span className="material-symbols-outlined text-xs opacity-75">expand_more</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Multi-guest reminder */}
        {activeTab === 'menu' && (
          <div className="max-w-2xl mx-auto px-4 pt-1 pb-2 space-y-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-stone-400 text-lg">search</span>
              <input
                type="text"
                placeholder="جستجو در غذاها، نوشیدنی‌ها و دسرها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-[#F4EFE6]/70 focus:bg-white border border-[#E8DFD3] rounded-xl text-xs focus:outline-none focus:border-[#9e2016] transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="material-symbols-outlined absolute left-3 top-2.5 text-stone-400 hover:text-stone-700 text-base"
                >
                  close
                </button>
              )}
            </div>

            {/* Category Scroll Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {categories.map((c) => {
                const isSelected = activeCategoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategoryId(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-[#9e2016] text-white shadow-sm' 
                        : 'bg-[#F4EFE6] text-[#6D5548] hover:bg-[#ECE4D8]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* 2. BODY CONTENT (BASED ON ACTIVE TAB) */}
      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex-1">
        
        {/* TAB 1: MENU */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            
            {/* Active Table Order Banner (if exists) */}
            {activeTableOrder && (
              <div 
                onClick={() => setActiveTab('status')}
                className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer hover:brightness-95 transition-all shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-[#B45309] animate-ping"></span>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      سفارش فعال {activeTableOrder.orderNumber} در حال آماده‌سازی است
                    </span>
                    <span className="text-[11px] text-[#7A6458]">
                      وضعیت: {
                        activeTableOrder.status === 'pending_waiter' ? 'در انتظار تأیید گارسون' :
                        activeTableOrder.status === 'cooking' ? 'در حال پخت در آشپزخانه' :
                        activeTableOrder.status === 'ready' ? 'غذا آماده تحویل به میز' :
                        'تحویل داده شد به میز'
                      }
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#9e2016] font-bold flex items-center gap-0.5">
                  <span>پیگیری زنده</span>
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </span>
              </div>
            )}

            {/* Food Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find(i => i.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between transition-all ${
                      !product.isAvailable ? 'opacity-65 bg-stone-100' : 'hover:border-[#9e2016]/40 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative h-44 bg-[#FAF0E4] overflow-hidden">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            !product.isAvailable ? 'grayscale' : 'hover:scale-105'
                          }`}
                        />
                        {!product.isAvailable && (
                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-2">
                            <span className="bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                              ناموجود موقت
                            </span>
                          </div>
                        )}
                        {product.isAvailable && product.prepTimeMinutes && (
                          <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-xs text-amber-400">timer</span>
                            <span>{product.prepTimeMinutes} دقیقه</span>
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-[#1C1917]">{product.name}</h3>
                          {product.rating && (
                            <span className="flex items-center text-[#B45309] text-xs font-bold gap-0.5 shrink-0">
                              <span className="material-symbols-outlined text-xs">star</span>
                              <span>{product.rating}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#7A6458] line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    {/* Price and Add to Cart Button */}
                    <div className="p-3.5 pt-0 border-t border-[#F4EFE6] mt-2 flex items-center justify-between">
                      <div className="text-sm font-extrabold text-[#9e2016] font-mono">
                        {product.price.toLocaleString('fa-IR')} <span className="text-[10px] text-[#7A6458] font-normal">تومان</span>
                      </div>

                      {product.isAvailable ? (
                        inCartItem ? (
                          <div className="flex items-center gap-2 bg-[#FAF0E4] rounded-xl p-1 border border-[#F2DECC]">
                            <button
                              onClick={() => updateCartQuantity(inCartItem.id, -1)}
                              className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-[#9e2016] font-bold shadow-xs hover:bg-stone-50"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-[#9e2016] font-mono w-5 text-center">
                              {inCartItem.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(inCartItem.id, 1)}
                              className="w-7 h-7 flex items-center justify-center bg-[#9e2016] text-white rounded-lg font-bold shadow-xs hover:bg-[#8d1c13]"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenItemModal(product)}
                            className="px-3.5 py-1.5 bg-[#9e2016] hover:bg-[#A93226] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                            <span>انتخاب</span>
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-stone-400 font-bold">ناموجود</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CART & CHECKOUT */}
        {activeTab === 'cart' && (
          <div className="space-y-4">
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#9e2016]">shopping_bag</span>
                  <h2 className="font-bold text-sm text-[#1C1917]">سبد سفارشات میز {selectedTableNumber}</h2>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="text-xs text-stone-500 hover:text-red-700"
                  >
                    پاک کردن سبد
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <span className="material-symbols-outlined text-5xl text-stone-300">remove_shopping_cart</span>
                  <p className="text-xs text-[#7A6458]">سبد سفارش شما در حال حاضر خالی است.</p>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-5 py-2.5 bg-[#9e2016] text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    مشاهده منو و انتخاب غذا
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#E8DFD3]/70">
                    {cart.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-[#1C1917] truncate">{item.product.name}</h4>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="text-[11px] text-[#7A6458] truncate">
                              {item.selectedOptions.map(o => o.optionName).join('، ')}
                            </p>
                          )}
                          <div className="text-xs font-mono font-bold text-[#9e2016] mt-0.5">
                            {item.itemTotal.toLocaleString('fa-IR')} تومان
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-[#FAF0E4] rounded-xl p-1 border border-[#F2DECC]">
                          <button
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-[#9e2016] font-bold shadow-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-[#9e2016] font-mono w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-[#9e2016] text-white rounded-lg font-bold shadow-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Information (Optional Name & Kitchen Notes) */}
                  <div className="pt-3 border-t border-[#E8DFD3] space-y-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1917] mb-1">
                        نام سفارش‌دهنده (اختیاری جهت تفکیک هم‌میزی‌ها):
                      </label>
                      <input 
                        type="text" 
                        placeholder="مثال: آقای علوی / سفارش مستقل من" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-xs focus:outline-none focus:border-[#9e2016]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1917] mb-1">
                        یادداشت برای آشپزخانه یا سالن‌دار:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="مثال: کم‌نمک باشد، سس جدا آورده شود..."
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-xs focus:outline-none focus:border-[#9e2016]"
                      />
                    </div>
                  </div>

                  {/* Summary & Submit */}
                  <div className="pt-3 border-t border-[#E8DFD3] space-y-3">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>جمع کل سبد:</span>
                      <span className="text-base text-[#9e2016] font-mono font-black">
                        {cartTotal.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>

                    <button
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#9e2016] hover:bg-[#8d1c13] text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت نهایی سفارش سر میز'}</span>
                    </button>
                    <p className="text-[11px] text-[#7A6458] text-center">
                      بدون نیاز به ساخت حساب؛ سفارش مستقیماً روی مانیتور سالن‌دار و آشپزخانه ثبت می‌شود.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE STATUS TRACKING */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#9e2016]">track_changes</span>
                  <h2 className="font-bold text-sm text-[#1C1917]">پیگیری زنده سفارشات میز {selectedTableNumber}</h2>
                </div>
                <button
                  onClick={() => handleCallStaff('bill')}
                  className="px-2.5 py-1 bg-[#FAF0E4] text-[#9e2016] border border-[#F2DECC] rounded-lg text-xs font-bold hover:bg-[#F4EFE6]"
                >
                  درخواست صورت‌حساب
                </button>
              </div>

              {!activeTableOrder ? (
                <div className="text-center py-8 space-y-2">
                  <span className="material-symbols-outlined text-4xl text-stone-300">hourglass_empty</span>
                  <p className="text-xs text-[#7A6458]">هنوز سفارشی برای این میز ثبت نشده است.</p>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-4 py-2 bg-[#9e2016] text-white rounded-xl text-xs font-bold"
                  >
                    مشاهده منو و انتخاب غذا
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Progress tracker stages */}
                  <div className="p-4 bg-gradient-to-r from-[#FAF0E4] to-[#F5EFE6] rounded-2xl border border-[#E8DFD3] space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#1C1917]">کد رهگیری: {activeTableOrder.orderNumber}</span>
                      <span className="font-mono text-[#7A6458]">
                        ثبت: {new Date(activeTableOrder.createdAt).toLocaleTimeString('fa-IR')}
                      </span>
                    </div>

                    {/* Stepper */}
                    <div className="grid grid-cols-4 gap-1 text-center pt-2">
                      {/* Step 1: Placed */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                          ✓
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800">ثبت اولیه</span>
                      </div>

                      {/* Step 2: Confirmed by Waiter */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                          activeTableOrder.status !== 'pending_waiter' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'
                        }`}>
                          {activeTableOrder.status !== 'pending_waiter' ? '✓' : '۲'}
                        </div>
                        <span className="text-[10px] font-bold text-[#1C1917]">تأیید سالن‌دار</span>
                      </div>

                      {/* Step 3: Cooking */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                          activeTableOrder.status === 'cooking' ? 'bg-orange-600 text-white animate-pulse' :
                          activeTableOrder.status === 'ready' || activeTableOrder.deliveryStatus === 'delivered' ? 'bg-emerald-600 text-white' :
                          'bg-stone-200 text-stone-500'
                        }`}>
                          {activeTableOrder.status === 'ready' || activeTableOrder.deliveryStatus === 'delivered' ? '✓' : '۳'}
                        </div>
                        <span className="text-[10px] font-bold text-[#1C1917]">پخت در آشپزخانه</span>
                      </div>

                      {/* Step 4: Delivered */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                          activeTableOrder.deliveryStatus === 'delivered' ? 'bg-emerald-600 text-white' :
                          activeTableOrder.status === 'ready' ? 'bg-emerald-500 text-white animate-bounce' :
                          'bg-stone-200 text-stone-500'
                        }`}>
                          {activeTableOrder.deliveryStatus === 'delivered' ? '✓' : '۴'}
                        </div>
                        <span className="text-[10px] font-bold text-[#1C1917]">تحویل سر میز</span>
                      </div>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#1C1917]">اقلام سفارش داده شده:</h3>
                    <div className="divide-y divide-[#E8DFD3]/70 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFD3]">
                      {activeTableOrder.items.map((it, idx) => (
                        <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#1C1917]">{it.quantity}× {it.productName}</span>
                            {it.selectedOptions && it.selectedOptions.length > 0 && (
                              <p className="text-[11px] text-[#7A6458]">
                                {it.selectedOptions.map(o => o.optionName).join('، ')}
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-[#7A6458]">
                            {it.itemTotal.toLocaleString('fa-IR')} ت
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#E8DFD3] flex justify-between items-center text-xs font-bold">
                      <span>جمع کل فاکتور:</span>
                      <span className="text-[#9e2016] text-sm font-mono font-black">
                        {activeTableOrder.totalAmount.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-100 text-[11px] text-[#7A6458] flex justify-between items-center">
                      <span>وضعیت تسویه مالی:</span>
                      <span className="font-bold text-stone-800">
                        {activeTableOrder.paymentStatus === 'unpaid' ? 'تسویه سر میز (نقدی / کارتخوان سیار)' : 'تسویه شده ✓'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. PRODUCT CUSTOMIZATION MODAL (Options & Add-ons) */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="relative h-48">
              <img 
                src={selectedProductForModal.imageUrl} 
                alt={selectedProductForModal.name} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setSelectedProductForModal(null)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#1C1917]">{selectedProductForModal.name}</h3>
                <p className="text-xs text-[#7A6458] mt-1 leading-relaxed">{selectedProductForModal.description}</p>
                <div className="text-sm font-black text-[#9e2016] font-mono mt-1.5">
                  {selectedProductForModal.price.toLocaleString('fa-IR')} تومان
                </div>
              </div>

              {/* Options */}
              {selectedProductForModal.optionGroups && selectedProductForModal.optionGroups.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E8DFD3]">
                  {selectedProductForModal.optionGroups.map(og => (
                    <div key={og.id}>
                      <span className="text-xs font-bold text-[#1C1917] block mb-1">{og.title}:</span>
                      <div className="space-y-1">
                        {og.options.map(opt => {
                          const isSelected = selectedOptions.some(o => o.optionName === opt.name);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedOptions(prev => prev.filter(o => o.optionName !== opt.name));
                                } else {
                                  setSelectedOptions(prev => [...prev, {
                                    groupTitle: og.title,
                                    optionName: opt.name,
                                    extraPrice: opt.extraPrice
                                  }]);
                                }
                              }}
                              className={`w-full p-2 rounded-xl border text-xs flex justify-between items-center transition-all ${
                                isSelected ? 'bg-orange-50 border-[#9e2016] text-[#9e2016] font-bold' : 'bg-white border-[#E8DFD3]'
                              }`}
                            >
                              <span>{opt.name}</span>
                              <span className="font-mono text-[11px]">
                                {opt.extraPrice > 0 ? `+${opt.extraPrice.toLocaleString('fa-IR')} تومان` : 'رایگان'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleConfirmAddToCart}
                className="w-full py-2.5 bg-[#9e2016] hover:bg-[#8d1c13] text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1 mt-2"
              >
                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                <span>افزودن به سبد سفارش</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER FIXED BOTTOM BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E8DFD3] shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-around text-xs">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'menu' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#7A6458]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">menu_book</span>
            <span>منوی غذا</span>
          </button>

          <button
            onClick={() => setActiveTab('cart')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'cart' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#7A6458]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">shopping_cart</span>
            {cart.length > 0 && (
              <span className="absolute top-0 right-2 bg-[#9e2016] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
            <span>سبد ({cartTotal > 0 ? `${cartTotal.toLocaleString('fa-IR')} ت` : 'خالی'})</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'status' ? 'text-[#9e2016] font-bold scale-105' : 'text-[#7A6458]'
            }`}
          >
            <span className="material-symbols-outlined text-xl">track_changes</span>
            {activeTableOrder && (
              <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
            <span>پیگیری سفارش</span>
          </button>
        </div>
      </footer>

      {/* Table Picker Modal */}
      {isTablePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9e2016]">table_restaurant</span>
                <h3 className="font-black text-sm text-[#1C1917]">انتخاب یا تغییر شماره میز</h3>
              </div>
              <button
                onClick={() => setIsTablePickerOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-200"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <p className="text-xs text-[#7A6458]">
              لطفاً شماره میزی که در سالن یا تراس پشت آن مستقر هستید را انتخاب کنید:
            </p>
            <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
              {servicePoints.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => {
                    setSelectedTableNumber(sp.tableNumber);
                    setIsTablePickerOpen(false);
                    showToast(`میز شما به میز ${sp.tableNumber} تغییر یافت`);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedTableNumber === sp.tableNumber
                      ? 'bg-[#9e2016] text-white shadow-md font-black'
                      : 'bg-[#FAF0E4] hover:bg-[#F2DECC] text-[#1C1917] border border-[#E8DFD3]'
                  }`}
                >
                  میز {sp.tableNumber}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

