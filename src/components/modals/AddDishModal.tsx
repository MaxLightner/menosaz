import {readProductImage} from '../../lib/productImage';
import {SAMPLE_CATEGORIES} from '../../services/menuPresentation';
import {INITIAL_CATEGORIES} from '../../services/seedData';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddDishModal: React.FC<AddDishModalProps> = ({ isOpen, onClose }) => {
  const { addProduct, showToast } = useApp();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('cat-kebab');
  const [price, setPrice] = useState<number>(290000);
  const [description, setDescription] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Curated food images
  const sampleImages = [{"label": "کباب برگ", "url": "/media/iran-2.webp"}, {"label": "برگر", "url": "/media/food-2.webp"}, {"label": "پیتزا", "url": "/media/food-0.webp"}, {"label": "اسپرسو", "url": "/menu-assets/espresso.webp"}, {"label": "کاپوچینو", "url": "/menu-assets/cappuccino.webp"}, {"label": "آبمیوه", "url": "/menu-assets/orange-juice.webp"}, {"label": "بستنی", "url": "/menu-assets/icecream.webp"}];

  const [selectedImage, setSelectedImage] = useState<string>(sampleImages[0].url);

  async function selectFile(file:File){try{setSelectedImage(await readProductImage(file));}catch(e){showToast((e as Error).message);}}
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('لطفا نام غذا را وارد کنید');
      return;
    }
    if (price <= 0) {
      showToast('لطفا قیمت معتبر وارد کنید');
      return;
    }

    setIsSubmitting(true);
    try {
      await addProduct({
        name: name.trim(),
        categoryId,
        price,
        description: description.trim() || 'تهیه شده از مواد اولیه تازه و باکیفیت روز',
        isAvailable: true,
        prepTimeMinutes: prepTimeMinutes || 15,
        imageUrl: selectedImage,
        rating: 5.0,
      });

      // reset form
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('خطا در ثبت غذا در پایگاه داده');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-dish-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FAF0E4] to-[#FFFDF9] p-4 border-b border-[#E8DFD3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#9e2016] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-xl">restaurant</span>
            </div>
            <div>
              <h3 id="add-dish-title" className="font-bold text-[#1C1917] text-base">افزودن غذای جدید به منو</h3>
              <p className="text-xs text-[#7A6458]">ذخیره فوری در پایگاه داده و انتشار برای مشتریان</p>
            </div>
          </div>
          <button 
            aria-label="بستن پنجره" onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">نام غذا یا نوشیدنی *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: چلوکباب برگ ممتاز یا موهیتو توت‌فرنگی"
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-sm focus:outline-none focus:border-[#9e2016]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">دسته‌بندی منو</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-sm focus:outline-none focus:border-[#9e2016]"
              >
                {Array.from(new Map([...INITIAL_CATEGORIES.map(c=>[c.id,c.name]),...Object.entries(SAMPLE_CATEGORIES)] as [string,string][])).map(([id,label])=><option key={id} value={id}>{label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">قیمت فروش (تومان) *</label>
              <input 
                type="number" 
                required
                step="5000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-sm focus:outline-none focus:border-[#9e2016] font-bold text-[#9e2016]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">توضیحات و ترکیبات غذا</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مواد اولیه، دورچین، وزن تقریبی گوشت یا نحوه سرو..."
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-sm focus:outline-none focus:border-[#9e2016]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">زمان آماده‌سازی (دقیقه)</label>
              <input 
                type="number" 
                min="1"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-sm focus:outline-none focus:border-[#9e2016]"
              />
            </div>
          </div>

          {/* Picture preset picker */}
          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1.5">انتخاب تصویر غذا:</label><label className="manager-upload">عکس مربع حداکثر ۱ مگابایت<input aria-label="عکس غذای جدید" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>e.target.files?.[0]&&selectFile(e.target.files[0])}/></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sampleImages.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedImage(img.url)}
                  className={`border-2 rounded-xl overflow-hidden relative group p-1 transition-all ${
                    selectedImage === img.url ? 'border-[#9e2016] ring-2 ring-[#9e2016]/20' : 'border-[#E8DFD3]'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-16 object-cover rounded-lg" />
                  <div className="text-[10px] text-center font-bold text-stone-700 truncate mt-1">
                    {img.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFD3]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F4EFE6] text-stone-700 rounded-xl text-xs font-bold hover:bg-[#ECE4D8]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت و انتشار در منو'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

