import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const TestGuideView: React.FC = () => {
  const { 
    setCurrentView, 
    setSelectedTableNumber, 
    products, 
    orders, 
    resetToSeed,
    isFirebaseConnected 
  } = useApp();

  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNum: number) => {
    setCheckedSteps(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const steps = [
    {
      num: 1,
      title: 'ورود به حساب مدیر (داشبورد مدیریت)',
      desc: 'با لپ‌تاپ یا مرورگر اصلی وارد داشبورد دسکتاپ مدیریت شوید و شاخص‌های فروش، وضعیت سالن و سفارش‌ها را بررسی کنید.',
      actionLabel: 'باز کردن داشبورد مدیریت دسکتاپ',
      onAction: () => setCurrentView('dashboard-desktop'),
      icon: 'admin_panel_settings',
    },
    {
      num: 2,
      title: 'افزودن غذای جدید به منو',
      desc: 'از دکمه «افزودن غذای جدید» در بالای داشبورد، یک غذای سفارشی (مثلاً: چلوکباب برگ ممتاز یا موهیتو توت‌فرنگی) ثبت کنید. بلافاصله در دیتابیس ذخیره می‌شود.',
      actionLabel: 'ورود به بخش ویرایش منو',
      onAction: () => setCurrentView('dashboard-desktop'),
      icon: 'add_circle',
    },
    {
      num: 3,
      title: 'تولید QR کد اختصاصی برای یکی از میزها',
      desc: 'دکمه «دانلود QR کد میزها» را بزنید و برای میز شماره ۴ یک QR پایدار تولید کنید. لینک منو را کپی کرده یا مستقیماً باز کنید.',
      actionLabel: 'تولید و مشاهده QR میز ۴',
      onAction: () => setCurrentView('dashboard-desktop'),
      icon: 'qr_code_2',
    },
    {
      num: 4,
      title: 'اسکن QR و باز کردن اپلیکیشن مشتری',
      desc: 'لینک تولیدشده را در یک تب یا گوشی دیگر باز کنید. اپلیکیشن مشتری بدون نیاز به لاگین باز می‌شود و هیچ ناوبری مدیر یا تبلیغاتی را نمایش نمی‌دهد.',
      actionLabel: 'ورود به اپ مشتری میز ۴',
      onAction: () => {
        setSelectedTableNumber(4);
        setCurrentView('customer');
      },
      icon: 'phone_iphone',
    },
    {
      num: 5,
      title: 'مشاهده غذای اضافه‌شده و ثبت سفارش',
      desc: 'غذایی که در مرحله ۲ اضافه کردید را در منوی مشتری مشاهده کنید، به سبد اضافه کنید و سفارش نهایی میز ۴ را ثبت کنید.',
      actionLabel: 'رفتن به منوی مشتری',
      onAction: () => {
        setSelectedTableNumber(4);
        setCurrentView('customer');
      },
      icon: 'shopping_cart_checkout',
    },
    {
      num: 6,
      title: 'ورود به اپ گارسون با دستگاه دیگر',
      desc: 'با مرورگر یا تبلت دیگر وارد اپلیکیشن مستقل گارسون شوید. سفارش تازه ثبت‌شده میز ۴ را با جزئیات کامل مشاهده خواهید کرد.',
      actionLabel: 'باز کردن اپلیکیشن گارسون',
      onAction: () => setCurrentView('waiter'),
      icon: 'person_apron',
    },
    {
      num: 7,
      title: 'تأیید سفارش توسط گارسون و ارسال به آشپزخانه',
      desc: 'دکمه «تأیید سفارش و ارسال به آشپزخانه» را در کارت سفارش میز ۴ بزنید. وضعیت سفارش به cooking تغییر می‌کند.',
      actionLabel: 'تأیید در اپ گارسون',
      onAction: () => setCurrentView('waiter'),
      icon: 'check_circle',
    },
    {
      num: 8,
      title: 'ورود به اپ عملیاتی رستوران و آشپزخانه (KDS)',
      desc: 'با یک دستگاه یا مانیتور دیگر وارد اپ رستوران شوید. سفارش فوراً در صف پخت نمایان است.',
      actionLabel: 'ورود به KDS رستوران',
      onAction: () => setCurrentView('kitchen'),
      icon: 'soup_kitchen',
    },
    {
      num: 9,
      title: 'ثبت مستقل تحویل و تسویه سفارش',
      desc: 'دکمه «ثبت تحویل به میز» را بزنید (وضعیت تحویل تغییر می‌کند اما تسویه مستقل می‌ماند). سپس با دکمه «ثبت تسویه مالی»، روش تسویه (کارت‌خوان POS یا نقد) را ثبت کنید.',
      actionLabel: 'عملیات در اپ رستوران',
      onAction: () => setCurrentView('kitchen'),
      icon: 'payments',
    },
    {
      num: 10,
      title: 'بازگشت به داشبورد مدیر و مشاهده تغییرات',
      desc: 'به داشبورد مدیریت بازگردید. افزایش مبلغ فروش روزانه، تغییر وضعیت میز و تغییرات صورتحساب را بلادرنگ ببینید.',
      actionLabel: 'مشاهده داشبورد مدیریت',
      onAction: () => setCurrentView('dashboard-desktop'),
      icon: 'dashboard',
    },
    {
      num: 11,
      title: 'رفرش تمام صفحات و تایید ماندگاری داده‌ها',
      desc: 'صفحه مرورگر را Refresh (F5) کنید. تمام داده‌ها در دیتابیس ذخیره شده و ماندگار هستند.',
      actionLabel: 'تست رفرش صفحه (F5)',
      onAction: () => window.location.reload(),
      icon: 'refresh',
    },
  ];

  const completedCount = Object.values(checkedSteps).filter(Boolean).length;

  return (
    <div className="bg-[#FAF7F2] min-h-screen text-[#1C1917] p-4 md:p-8 antialiased">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#9e2016] to-[#D35400] text-white flex items-center justify-center font-bold shadow-md">
                <span className="material-symbols-outlined text-3xl">fact_check</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#1C1917]">
                  راهنمای آزمایش عملیاتی و معیارهای پذیرش نهایی
                </h1>
                <p className="text-xs text-[#7A6458] mt-0.5">
                  گردش کامل سفارش واقعی میان ۵ رابط کاربری مستقل با پایگاه داده مشترک
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>{isFirebaseConnected ? 'متصل به Cloud Firestore' : 'پایگاه داده محلی فعال'}</span>
              </span>
              <button
                onClick={resetToSeed}
                className="px-3 py-1 bg-[#F4EFE6] border border-[#E8DFD3] hover:bg-[#ECE4D8] rounded-xl text-xs font-bold text-[#1C1917] transition-colors"
              >
                بازنشانی دمو
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="flex justify-between items-center text-xs text-[#7A6458] mb-1 font-bold">
              <span>پیشرفت آزمون پذیرش: {completedCount} از ۱۱ مرحله</span>
              <span className="font-mono">{Math.round((completedCount / 11) * 100)}٪</span>
            </div>
            <div className="w-full bg-[#F4EFE6] rounded-full h-2 overflow-hidden border border-[#E8DFD3]">
              <div 
                className="bg-gradient-to-r from-[#D35400] to-[#9e2016] h-full transition-all duration-300"
                style={{ width: `${(completedCount / 11) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 11 Steps List */}
        <div className="space-y-3">
          {steps.map((st) => {
            const isChecked = !!checkedSteps[st.num];
            return (
              <div
                key={st.num}
                className={`bg-[#FFFDF9] border rounded-2xl p-4 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isChecked ? 'border-emerald-500 bg-emerald-50/20' : 'border-[#E8DFD3]'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleStep(st.num)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-all mt-0.5 ${
                      isChecked 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'border-[#E8DFD3] text-stone-400 hover:border-[#9e2016]'
                    }`}
                  >
                    {isChecked ? '✓' : st.num}
                  </button>

                  <div className="space-y-1">
                    <h3 className={`text-sm font-bold ${isChecked ? 'text-emerald-950 line-through' : 'text-[#1C1917]'}`}>
                      مرحله {st.num}: {st.title}
                    </h3>
                    <p className="text-xs text-[#7A6458] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={st.onAction}
                    className="px-3.5 py-2 bg-[#9e2016] hover:bg-[#A93226] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">{st.icon}</span>
                    <span>{st.actionLabel}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Capabilities Summary Box */}
        <div className="bg-[#FFFDF9] border border-[#E8DFD3] rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-700">verified</span>
            <span>ویژگی‌های پیاده‌سازی‌شده در این نسخه عملیاتی:</span>
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#506354]">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>همگام‌سازی بلادرنگ (Real-time Sync) بدون نیاز به Refresh دستی</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>پایگاه داده ابری Firestore با قوانین امنیتی دسترسی (Security Rules)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>تفکیک کامل و مستقل وضعیت تحویل غذا از وضعیت تسویه مالی</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>ذخیره Snapshot دقیق قیمت غذا در لحظه سفارش مشتری</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>تولید QR کد واقعی برای تمامی ۱۶ میز سالن و تراس</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>دسترسی مستقیم مدیر به ۳ اپلیکیشن اختصاصی با کیو‌آر کدهای مجزا (مشتری، گارسون، آشپزخانه KDS)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
