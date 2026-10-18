import {PointMenus} from '../dashboard/PointMenus';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {printQrStands} from '../../lib/printQrStands';
import {usePresentation} from '../../context/PresentationContext';
import { useApp } from '../../context/AppContext';

interface AllQRAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'tables' | 'waiter' | 'kitchen';
  initialTable?: number;
}

export const AllQRAccessModal: React.FC<AllQRAccessModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'tables',
  initialTable = 4
}) => {
  const { 
    business,activeMenuId, 
    servicePoints, 
    setCurrentView, 
    setSelectedTableNumber, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'tables' | 'waiter' | 'kitchen'>(defaultTab);
  const {openSample}=usePresentation();
  const [selectedTable, setSelectedTable] = useState<number>(4);

  const [tableQrUrl, setTableQrUrl] = useState<string>('');
  const [waiterQrUrl, setWaiterQrUrl] = useState<string>('');
  const [kitchenQrUrl, setKitchenQrUrl] = useState<string>('');

  const baseUrl = (import.meta.env.VITE_PUBLIC_URL||window.location.origin).replace(/\/$/,'');
  const point = servicePoints.find(p=>p.tableNumber===selectedTable);
  const currentTableUrl = point?.qrCodeUrl||`${baseUrl}/?view=customer&business=${business.id}&table=${selectedTable}`;
  const currentWaiterUrl = `${baseUrl}/?view=waiter&business=${encodeURIComponent(business.id)}`;
  const currentKitchenUrl = `${baseUrl}/?view=kitchen`;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSelectedTable(servicePoints.some(p=>p.tableNumber===initialTable)?initialTable:(servicePoints[0]?.tableNumber||initialTable));
    }
  }, [isOpen, defaultTab, initialTable]);

  // Generate QR codes
  useEffect(() => {
    // 1. Table QR
    QRCode.toDataURL(currentTableUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel:'L',
      color: { dark: '#9e2016', light: '#FFFDF9' }
    }).then(setTableQrUrl).catch(console.error);

    // 2. Waiter QR
    QRCode.toDataURL(currentWaiterUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel:'L',
      color: { dark: '#3D4F41', light: '#FFFDF9' }
    }).then(setWaiterQrUrl).catch(console.error);

    // 3. Kitchen QR
    QRCode.toDataURL(currentKitchenUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel:'L',
      color: { dark: '#B45309', light: '#FFFDF9' }
    }).then(setKitchenQrUrl).catch(console.error);
  }, [currentTableUrl, currentWaiterUrl, currentKitchenUrl, selectedTable]);

  if (!isOpen) return null;

  const copyToClipboard = async (url: string, title: string) => {
    try { await navigator.clipboard.writeText(url); showToast(`لینک مستقیم ${title} کپی شد`); }
    catch { showToast('کپی لینک انجام نشد؛ دسترسی کلیپ‌بورد مرورگر را بررسی کن.'); }
  };

  const handleOpenCustomer = () => {
    setSelectedTableNumber(selectedTable);
    openSample(null);
    onClose();
    showToast(`اپلیکیشن مشتری برای میز ${selectedTable} باز شد`);
  };

  const handleOpenWaiter = () => {
    setCurrentView('waiter');
    onClose();
    showToast('اپلیکیشن گارسون باز شد');
  };

  const handleOpenKitchen = () => {
    setCurrentView('kitchen');
    onClose();
    showToast('اپلیکیشن عملیاتی آشپزخانه (KDS) باز شد');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FAF0E4] via-[#FFFDF9] to-[#F7F2E9] p-5 border-b border-[#E8DFD3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#9e2016] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">qr_code_2</span>
            </div>
            <div>
              <h3 className="font-black text-base text-[#1C1917]">
                مرکز کیو آر کدها و دسترسی‌های اختصاصی میزاتو
              </h3>
              <p className="text-xs text-[#7A6458] mt-0.5">
                تولید QR کد پایدار برای هر میز (سرویس‌پوینت)، اپ گارسون و مانیتور رستوران
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#FAF7F2] px-5 pt-3 border-b border-[#E8DFD3] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'tables' 
                ? 'border-[#9e2016] text-[#9e2016]' 
                : 'border-transparent text-[#7A6458] hover:text-[#1C1917]'
            }`}
          >
            <span className="material-symbols-outlined text-base">table_restaurant</span>
            <span>۱. کیو آر کد سرویس‌پوینت‌ها (میزهای ۱ تا ۱۶)</span>
          </button>

          <button
            onClick={() => setActiveTab('waiter')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'waiter' 
                ? 'border-[#3D4F41] text-[#3D4F41]' 
                : 'border-transparent text-[#7A6458] hover:text-[#1C1917]'
            }`}
          >
            <span className="material-symbols-outlined text-base">person_apron</span>
            <span>۲. کیو آر کد اپلیکیشن گارسون</span>
          </button>

          <button
            onClick={() => setActiveTab('kitchen')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'kitchen' 
                ? 'border-[#B45309] text-[#B45309]' 
                : 'border-transparent text-[#7A6458] hover:text-[#1C1917]'
            }`}
          >
            <span className="material-symbols-outlined text-base">soup_kitchen</span>
            <span>۳. کیو آر کد اپلیکیشن رستوران (KDS)</span>
          </button>
        </div>

        {/* Tab 1: Service Points / Tables */}
        {activeTab==='tables'&&<PointMenus key={selectedTable} number={selectedTable}/>}
        {activeTab === 'tables' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD3]">
              <label className="block text-xs font-bold text-[#1C1917] mb-2">
                انتخاب سرویس‌پوینت (شماره میز سالن):
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-xl border border-[#E8DFD3]">
                {servicePoints.map((sp) => {
                  const isSelected = sp.tableNumber === selectedTable;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => setSelectedTable(sp.tableNumber)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected 
                          ? 'bg-[#9e2016] text-white shadow-xs scale-105' 
                          : 'bg-[#F4EFE6] hover:bg-[#ECE4D8] text-[#1C1917]'
                      }`}
                    >
                      میز {sp.tableNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" className="staff-primary" onClick={()=>printQrStands(servicePoints,business.name,baseUrl,showToast)}>
              <span className="material-symbols-outlined" aria-hidden="true">print</span> چاپ استندهای تمام میزها
            </button>

            {/* QR Card */}
            <div className="bg-white border-2 border-dashed border-[#E8DFD3] rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2.5 bg-[#FAF7F2] rounded-2xl shadow-sm border border-[#E8DFD3] shrink-0">
                {tableQrUrl ? (
                  <img src={tableQrUrl} alt={`QR میز ${selectedTable}`} className="w-64 h-64 max-w-full object-contain" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                )}
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-right">
                <div>
                  <span className="bg-[#FAF0E4] text-[#9e2016] text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                    سرویس‌پوینت مشتری
                  </span>
                  <h4 className="text-base font-extrabold text-[#1C1917] mt-1">
                    {business.name} • میز {selectedTable}
                  </h4>
                  <p className="text-xs text-[#7A6458] mt-1">
                    مشتری با اسکن این کیو آر کد، منوی منتشرشده همان رستوران را مشاهده و سفارش مستقل ثبت می‌کند.
                  </p>
                </div>

                <div className="p-2 bg-[#F4EFE6] rounded-xl text-[11px] font-mono text-[#506354] break-all">
                  {currentTableUrl}
                </div>

                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    onClick={handleOpenCustomer}
                    className="px-4 py-2 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>مشاهده مستقیم اپ مشتری</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(currentTableUrl, `منوی میز ${selectedTable}`)}
                    className="px-3 py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E8DFD3] text-[#1C1917] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>کپی لینک میز</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Waiter App QR */}
        {activeTab === 'waiter' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="bg-white border-2 border-dashed border-[#C5E3CE] rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2.5 bg-[#EAF4ED] rounded-2xl shadow-sm border border-[#C5E3CE] shrink-0">
                {waiterQrUrl ? (
                  <img src={waiterQrUrl} alt="QR اپ گارسون" className="w-44 h-44 object-contain" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                )}
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-right">
                <div>
                  <span className="bg-[#EAF4ED] text-[#246A38] text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                    دسترسی اختصاصی گارسون
                  </span>
                  <h4 className="text-base font-extrabold text-[#1C1917] mt-1">
                    اپلیکیشن گارسون و سالن‌دار
                  </h4>
                  <p className="text-xs text-[#7A6458] mt-1">
                    گارسون‌ها با اسکن این کیو آر کد با گوشی خود وارد پنل سفارش‌گیری سالن می‌شوند و سفارشات جدید را تأیید می‌کنند.
                  </p>
                </div>

                <div className="p-2 bg-[#F4EFE6] rounded-xl text-[11px] font-mono text-[#506354] break-all">
                  {currentWaiterUrl}
                </div>

                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    onClick={handleOpenWaiter}
                    className="px-4 py-2 bg-[#3D4F41] hover:bg-[#324235] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>مشاهده مستقیم اپ گارسون</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(currentWaiterUrl, 'اپلیکیشن گارسون')}
                    className="px-3 py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E8DFD3] text-[#1C1917] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>کپی لینک گارسون</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Kitchen KDS QR */}
        {activeTab === 'kitchen' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="bg-white border-2 border-dashed border-[#FDE68A] rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2.5 bg-[#FEF3C7] rounded-2xl shadow-sm border border-[#FDE68A] shrink-0">
                {kitchenQrUrl ? (
                  <img src={kitchenQrUrl} alt="QR اپ رستوران" className="w-44 h-44 object-contain" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">در حال تولید...</div>
                )}
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-right">
                <div>
                  <span className="bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                    دسترسی مانیتور آشپزخانه و صندوق
                  </span>
                  <h4 className="text-base font-extrabold text-[#1C1917] mt-1">
                    اپلیکیشن عملیاتی رستوران (KDS)
                  </h4>
                  <p className="text-xs text-[#7A6458] mt-1">
                    با اسکن این QR بر روی تبلت یا مانیتور آشپزخانه، تیکت‌های زنده پخت، ثبت تحویل و تسویه مستقل نمایش داده می‌شوند.
                  </p>
                </div>

                <div className="p-2 bg-[#F4EFE6] rounded-xl text-[11px] font-mono text-[#506354] break-all">
                  {currentKitchenUrl}
                </div>

                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    onClick={handleOpenKitchen}
                    className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>مشاهده مستقیم مانیتور رستوران (KDS)</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(currentKitchenUrl, 'اپلیکیشن رستوران')}
                    className="px-3 py-2 bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E8DFD3] text-[#1C1917] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>کپی لینک رستوران</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

