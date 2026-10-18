import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {usePresentation} from '../../context/PresentationContext';
import { useApp } from '../../context/AppContext';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTable?: number;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({ isOpen, onClose, initialTable = 4 }) => {
  const { business,activeMenuId,servicePoints, setCurrentView, setSelectedTableNumber, showToast } = useApp();
  const {openSample}=usePresentation();
  const [selectedTable, setSelectedTable] = useState<number>(initialTable);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const currentPoint = servicePoints.find(sp => sp.tableNumber === selectedTable) || servicePoints[0];
  const tableUrl = `${(import.meta.env.VITE_PUBLIC_URL||window.location.origin).replace(/\/$/,'')}/?view=customer&table=${selectedTable}&business=${encodeURIComponent(business.id)}&menu=${encodeURIComponent(activeMenuId)}`;

  useEffect(() => {
    if (isOpen) {
      setSelectedTable(initialTable);
    }
  }, [isOpen, initialTable]);

  useEffect(() => {
    if (selectedTable) {
      QRCode.toDataURL(tableUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#9e2016',
          light: '#FFFDF9',
        },
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
    }
  }, [selectedTable, tableUrl]);

  if (!isOpen) return null;

  const handleOpenAsCustomer = () => {
    setSelectedTableNumber(selectedTable);
    openSample(null);
    onClose();
    showToast(`اپلیکیشن مشتری برای میز ${selectedTable} باز شد`);
  };

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(tableUrl); showToast(`لینک منوی میز ${selectedTable} در کلیپ‌بورد کپی شد`); }
    catch { showToast('کپی لینک انجام نشد؛ دسترسی کلیپ‌بورد مرورگر را بررسی کن.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FAF0E4] to-[#FFFDF9] p-4 border-b border-[#E8DFD3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#9e2016] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-xl">qr_code_2</span>
            </div>
            <div>
              <h3 className="font-bold text-[#1C1917] text-base">QR کد اختصاصی میزهای رستوران</h3>
              <p className="text-xs text-[#7A6458]">اسکن پایدار و نشست سفارش آنلاین مشتری</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Table Selector */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1.5">انتخاب میز سالن:</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#F4EFE6] rounded-xl border border-[#E8DFD3]">
              {servicePoints.map((sp) => {
                const isSelected = sp.tableNumber === selectedTable;
                return (
                  <button
                    key={sp.id}
                    onClick={() => setSelectedTable(sp.tableNumber)}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-[#9e2016] text-white shadow-sm scale-105' 
                        : 'bg-white hover:bg-stone-100 text-[#1C1917] border border-[#E8DFD3]'
                    }`}
                  >
                    میز {sp.tableNumber}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QR Display Card */}
          <div className="bg-[#FAF7F2] border-2 border-dashed border-[#E8DFD3] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-2 bg-[#9e2016] rounded-full mb-3"></div>
            <div className="text-xs font-bold text-[#9e2016] mb-1">کافه رستوران نارنج</div>
            <div className="font-bold text-lg text-[#1C1917] mb-3">
              {currentPoint ? currentPoint.label : `میز ${selectedTable}`}
            </div>

            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl shadow-md border border-[#E8DFD3] mb-3">
                <img 
                  src={qrDataUrl} 
                  alt={`QR کد میز ${selectedTable}`} 
                  className="w-48 h-48 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-stone-400">
                در حال تولید QR کد...
              </div>
            )}

            <div className="text-xs text-[#7A6458] font-mono break-all max-w-sm px-2">
              {tableUrl}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleOpenAsCustomer}
              className="py-2.5 px-4 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span>مشاهده و شبیه‌سازی اپ مشتری</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 bg-[#F4EFE6] hover:bg-[#ECE4D8] border border-[#E8DFD3] text-[#1C1917] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              <span>کپی لینک مستقیم منو</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

