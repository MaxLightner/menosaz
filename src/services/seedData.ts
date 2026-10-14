import { Business, Category, Product, ServicePoint, Order, SupplierListing } from '../types';

export const INITIAL_BUSINESS: Business = {
  id: 'pich-shemroon',
  name: 'رستوران پیچ شمرون',
  slug: 'pich-shemroon',
  branchName: 'شعبه شمرون • تجریش',
  branchCode: '۲۰۱',
  phone: '۰۲۱-۲۲۷۴۵۵۶۰',
  address: 'تهران، شمیرانات، میدان تجریش، خیابان باهنر (نیاوران)، پلاک ۱۲۸',
  orderAcceptanceActive: true,
  activeTemplate: 'traditional',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-kebab', name: 'کباب‌های شمرونی', icon: 'kebab_dining', sortOrder: 1 },
  { id: 'cat-traditional', name: 'غذاهای اصیل ایرانی', icon: 'rice_bowl', sortOrder: 2 },
  { id: 'cat-fastfood', name: 'پیتزا و برگر', icon: 'local_pizza', sortOrder: 3 },
  { id: 'cat-appetizer', name: 'پیش‌غذا و سالاد', icon: 'lunch_dining', sortOrder: 4 },
  { id: 'cat-drink', name: 'نوشیدنی‌ها', icon: 'local_drink', sortOrder: 5 },
  { id: 'cat-cafe', name: 'کافه و دسر', icon: 'coffee', sortOrder: 6 },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-koobideh-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-kebab',
    name: 'چلوکباب کوبیده مخصوص پیچ شمرون',
    description: 'دو سیخ ۱۲۰ گرمی گوشت خالص گوسفندی راسته و قلوه‌گاه، برنج اعلا کته زعفرانی، گوجه کبابی و کره محلی سرعین',
    price: 320000,
    isAvailable: true,
    prepTimeMinutes: 15,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMSTbPPryNrokl-eJmXoL3qm-Ym7R6mr05_n3I2RdW5re5iAKDEy72XRJqEBbKEkOPbd8znewj7thObnqtocPB6OCnOe_O81EAvQqy1bbrxQA5TvFlFTBlsujU0mAqNx3EyR4BdrptiuPRR1EWgAUwQGofi5C-FlZRNTLq7WNd6ecB1iYUGAxZ6Ro-O1FF1mgl6BIWcQ7zG_h8lto3MeUtiK2AHj9W_CoKXZifZmFRp3B7hBmS7hC6g',
    optionGroups: [
      {
        id: 'opt-bread',
        title: 'مخلفات اضافه',
        required: false,
        options: [
          { id: 'opt-b1', name: 'نان تافتون تنوری داغ', extraPrice: 15000 },
          { id: 'opt-b2', name: 'کره حیوانی محلی اضافی', extraPrice: 12000 },
          { id: 'opt-b3', name: 'سیخ گوجه کبابی اضافه', extraPrice: 20000 }
        ]
      }
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-barg-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-kebab',
    name: 'چلو کباب برگ شمرونی ممتاز',
    description: 'فیله گوسفندی مرینیت شده با زعفران سرگل قائنات و آب پیاز، بافت فوق‌العاده نرم همراه با کته زعفرانی طارم',
    price: 680000,
    isAvailable: true,
    prepTimeMinutes: 20,
    rating: 5.0,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBChB6TSp8WxgMrDBA0h6cOZNxkthhvHBjtK_3QugTZS3_SXYi_DIXoVK1GBCyl3DW5We6rlLMKuclO6Jp7i2gkXO8LTvVkMcXzcYWY2Vi9XUYOAQvm7dIDudsreA-EYGHHE9rAhCY4J1-yLjpRLzqP04ogSRDnIlv0YsQwltdcE9IPOClxVRFobaSq07NK6y_UQeN7GVcwCkhBn7Ohxl3w1FaXmq0QWwk2nEyaFnoOvq7ujuAVXHRfgw',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-joojeh-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-kebab',
    name: 'چلو جوجه‌کباب بی‌استخوان زعفرانی',
    description: 'فیله و سینه جوجه مرینیت شده در زعفران غلیظ، لیمو شیرازی تازه و کره، همراه کته قالبی و دورچین سبزیجات',
    price: 290000,
    isAvailable: true,
    prepTimeMinutes: 15,
    rating: 4.8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFM8yWOV1jO5Aa4wQny-rHj8laPJYaQzXXZ_0M3s7ThdDvbe92bBXWdM5dJGwnZmVij3uV4NE2PFT4rGr_qWimSZXRoimwwsWkMC1NrRJvNyNF_2RkwgZ5ZtHR8sDvg30SluUYmoWWaoeex3Miv4yqM_QjbWJrIXENr84Tj7dT4LQ5EVRDCZRKAWUjL2k4tNTvhmLWbh1blSXxz3PNMqxnWFcDlAMcC4o1IVfymh6QIF1Pwf2AlFMzyQ',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-shishlik-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-kebab',
    name: 'شیشلیک مخصوص پیچ شمرون (۶ تکه دنده)',
    description: 'راسته دنده‌ای گوسفند نر مرینیت سرآشپز با آب نارنج و زعفران، کته ته‌دیگی قالبی و گوجه و فلفل کبابی',
    price: 740000,
    isAvailable: true,
    prepTimeMinutes: 22,
    rating: 5.0,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBChB6TSp8WxgMrDBA0h6cOZNxkthhvHBjtK_3QugTZS3_SXYi_DIXoVK1GBCyl3DW5We6rlLMKuclO6Jp7i2gkXO8LTvVkMcXzcYWY2Vi9XUYOAQvm7dIDudsreA-EYGHHE9rAhCY4J1-yLjpRLzqP04ogSRDnIlv0YsQwltdcE9IPOClxVRFobaSq07NK6y_UQeN7GVcwCkhBn7Ohxl3w1FaXmq0QWwk2nEyaFnoOvq7ujuAVXHRfgw',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-baghali-polo',
    businessId: 'pich-shemroon',
    categoryId: 'cat-traditional',
    name: 'باقالی‌پلو با ماهیچه مخصوص شمرون',
    description: 'ماهیچه گوسفندی تازه پخته شده به سبک سنتی پیازداغ و زعفران فراوان، باقالی‌پلو با شوید تازه شمال و روغن کرمانشاهی',
    price: 690000,
    isAvailable: true,
    prepTimeMinutes: 10,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMSTbPPryNrokl-eJmXoL3qm-Ym7R6mr05_n3I2RdW5re5iAKDEy72XRJqEBbKEkOPbd8znewj7thObnqtocPB6OCnOe_O81EAvQqy1bbrxQA5TvFlFTBlsujU0mAqNx3EyR4BdrptiuPRR1EWgAUwQGofi5C-FlZRNTLq7WNd6ecB1iYUGAxZ6Ro-O1FF1mgl6BIWcQ7zG_h8lto3MeUtiK2AHj9W_CoKXZifZmFRp3B7hBmS7hC6g',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-zereshk-polo',
    businessId: 'pich-shemroon',
    categoryId: 'cat-traditional',
    name: 'زرشک‌پلو با مرغ مجلسی شمرونی',
    description: 'ران مرغ مجلسی سرخ‌شده در سس کره و عصاره گوجه و هل، برنج زعفرانی معطر با خلال پسته قزوین و زرشک پفکی',
    price: 245000,
    isAvailable: true,
    prepTimeMinutes: 12,
    rating: 4.8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFM8yWOV1jO5Aa4wQny-rHj8laPJYaQzXXZ_0M3s7ThdDvbe92bBXWdM5dJGwnZmVij3uV4NE2PFT4rGr_qWimSZXRoimwwsWkMC1NrRJvNyNF_2RkwgZ5ZtHR8sDvg30SluUYmoWWaoeex3Miv4yqM_QjbWJrIXENr84Tj7dT4LQ5EVRDCZRKAWUjL2k4tNTvhmLWbh1blSXxz3PNMqxnWFcDlAMcC4o1IVfymh6QIF1Pwf2AlFMzyQ',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-pizza-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-fastfood',
    name: 'پیتزا استیک مخصوص پیچ شمرون',
    description: 'راسته گوساله مزه‌دار شده، قارچ صدفی، فلفل دلمه‌ای، پنیر موزارلا درجه یک کشسانی بالا با خمیر دست‌ساز ناپولیتن',
    price: 365000,
    isAvailable: true,
    prepTimeMinutes: 18,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH6rhGdmLXvt-cE-9YJUywKU6lU3L0k8Yxeksra8tFOew89Dc19iU1gzE3e9vVWgWswGfWzqDXNHZCzZp4CETSHewDeu8qECMyJsNLdj-Hgl4dH3Ip50fsHbIZ6JchEHEREZtTUoA5qgWYHQ-ZnaUlWYpSGtsYU8pXOdFVAC5iCmH3_QBmHDPgXc5uCUAphlvaQ6nV9nT7Y6rU54kSvavVZZbooQaUo8KSeJJ579rbeGqkVAbKKmpTWA',
    optionGroups: [
      {
        id: 'opt-cheese',
        title: 'پنیر و سس',
        required: false,
        options: [
          { id: 'opt-c1', name: 'دوبل پنیر موزارلا کشسانی', extraPrice: 40000 },
          { id: 'opt-c2', name: 'سس سیر و خردل دست‌ساز', extraPrice: 18000 }
        ]
      }
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-burger-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-fastfood',
    name: 'بمب برگر دست‌ساز پیچ شمرون',
    description: 'برگر دست‌ساز گوشت تازه ۲۰۰ گرمی، بیکن گوساله، پیاز کاراملی، سس مخصوص و دیپ پنیر چدار مذاب',
    price: 310000,
    isAvailable: true,
    prepTimeMinutes: 15,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRVDaqDrjmsukm7pvI6as033ZEBUOjUogx4bntvq5OMqphxXiR833W_32ibOzsfmHKXBOAbdnbMk1NaFhNw1T42Yka09tEXJkmBAibvL_GUDC60UCX-BW8JLOCbZS-HoJkRrJ1ibhNCNnXgqnqf-0xkINpMFSpIvoC78w0Yv0o2XXoHbbX-RYaWOcngDVK47B-rHJt_XHC5XZf8trIpIsUFJX_kX7YBcBeTVPVHpzrs-ZOxUJ5cr2FkQ',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-pasta-alfredo',
    businessId: 'pich-shemroon',
    categoryId: 'cat-fastfood',
    name: 'پاستا آلفردو پنه با فیله مرغ گریل',
    description: 'پنه ریگاته با سس خامه و سیر تازه، فیله مرغ گریل شده، قارچ اسلایس و پنیر پارمزان ایتالیایی',
    price: 245000,
    isAvailable: true,
    prepTimeMinutes: 14,
    rating: 4.7,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH6rhGdmLXvt-cE-9YJUywKU6lU3L0k8Yxeksra8tFOew89Dc19iU1gzE3e9vVWgWswGfWzqDXNHZCzZp4CETSHewDeu8qECMyJsNLdj-Hgl4dH3Ip50fsHbIZ6JchEHEREZtTUoA5qgWYHQ-ZnaUlWYpSGtsYU8pXOdFVAC5iCmH3_QBmHDPgXc5uCUAphlvaQ6nV9nT7Y6rU54kSvavVZZbooQaUo8KSeJJ579rbeGqkVAbKKmpTWA',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-fries-special',
    businessId: 'pich-shemroon',
    categoryId: 'cat-appetizer',
    name: 'سیب‌زمینی سرخ‌کرده با دیپ پنیر گودا',
    description: 'سیب‌زمینی خلال ضخیم بلژیکی با ادویه کاجون و کاسه دیپ پنیر گودا هلندی مذاب',
    price: 130000,
    isAvailable: false,
    outOfStockReason: 'روغن و پنیر ویژه در حال شارژ مجدد است',
    prepTimeMinutes: 10,
    rating: 4.7,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDA-zaxEVCi_Ml4AlVLvOG6omPcqTDaXkaOozaCM_8c_X7a9BDeWbklWuRiaTljd0OBOGJpcM9FiO3aOeFb_TKnX-3A6w62yCGS711jXY2VBazlO_k-ZocbRqYY10BCmquT_Tho4nT5efourWYcEzbEMdQQCHuGAtYJJtYWjC3CwnJx-altz5zryFZtU4U2pmGq1pCWrWvYebdfQfKmJyosMHDZ26uEzAYjgZSPVWKVWd-UclZcsHJFNw',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-caesar-salad',
    businessId: 'pich-shemroon',
    categoryId: 'cat-appetizer',
    name: 'سالاد سزار اصیل با فیله مرغ گریل',
    description: 'کاهو رسمی پیچ تازه، فیله مرغ گریل اسلایس، نان سیر تست ترد، گوجه گیلاسی و سس سزار دست‌ساز سرآشپز با آنچوی',
    price: 185000,
    isAvailable: true,
    prepTimeMinutes: 8,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFM8yWOV1jO5Aa4wQny-rHj8laPJYaQzXXZ_0M3s7ThdDvbe92bBXWdM5dJGwnZmVij3uV4NE2PFT4rGr_qWimSZXRoimwwsWkMC1NrRJvNyNF_2RkwgZ5ZtHR8sDvg30SluUYmoWWaoeex3Miv4yqM_QjbWJrIXENr84Tj7dT4LQ5EVRDCZRKAWUjL2k4tNTvhmLWbh1blSXxz3PNMqxnWFcDlAMcC4o1IVfymh6QIF1Pwf2AlFMzyQ',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-zeytoon-pich',
    businessId: 'pich-shemroon',
    categoryId: 'cat-appetizer',
    name: 'زیتون پرورده شمرونی و ماست بورانی',
    description: 'زیتون اعلا با مغز گردوی تازه، رب انار ملس ترش و سبزی معطر چوچاق، همراه ماست چکیده بورانی بادمجان کبابی',
    price: 75000,
    isAvailable: true,
    prepTimeMinutes: 4,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMSTbPPryNrokl-eJmXoL3qm-Ym7R6mr05_n3I2RdW5re5iAKDEy72XRJqEBbKEkOPbd8znewj7thObnqtocPB6OCnOe_O81EAvQqy1bbrxQA5TvFlFTBlsujU0mAqNx3EyR4BdrptiuPRR1EWgAUwQGofi5C-FlZRNTLq7WNd6ecB1iYUGAxZ6Ro-O1FF1mgl6BIWcQ7zG_h8lto3MeUtiK2AHj9W_CoKXZifZmFRp3B7hBmS7hC6g',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-dough-shemroon',
    businessId: 'pich-shemroon',
    categoryId: 'cat-drink',
    name: 'دوغ محلی مخصوص پیچ شمرون (پارچی)',
    description: 'دوغ سنتی تهیه شده از ماست گوسفندی با پودر نعنا و گل سرخ کاشان، خنک و گازدار طبیعی',
    price: 35000,
    isAvailable: true,
    prepTimeMinutes: 3,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApY_CSpNvd4Z92HT_D09bvI-TxW4cIOEiBzhGmmtOAYVMR8kDtG6AlZa1LColo6aGUQEIW61f4E-1tGLj_rwaqg_f2s38rCKXyYy3NlPNi9b8s0XTsqKfQ6dH_VU043cY5RxI0xKEbQZUngg-ZQppZnpj178Ck_DMyGntSRaAsmvhb-laSQDnBBswuLD2s0gi1ez_KUJ--x3_ZTi2a-ReoqdAPmtvFp6r0jjO559v-Y7zJzfUKSv420A',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-mojito-fresh',
    businessId: 'pich-shemroon',
    categoryId: 'cat-drink',
    name: 'موهیتو دست‌ساز تازه بار شمرون',
    description: 'لیموترش شیرازی تازه کوبیده شده، برگ‌های نعنا فلفلی تازه، سیروپ نیشکر طبیعی و سودا یخ',
    price: 75000,
    isAvailable: true,
    prepTimeMinutes: 5,
    rating: 4.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ2HiAntzY6XEx9kRtnCK4yTk31uzSnAuapcJZg9V69wxdRgkVgNyZJsWvWkV-8Da6-2OPVkqoy207U9XWGT1kIKCZEuHK84356ZC_shu1wEGGdojFAIGbeETXmYKqRy7NJmFuHmz9iHbfOQJzYjM8wCEgAmINnuHgAwfKt7vQmTjPe2z4_M2zbf7TFQX9pQ7QYinPnyB7P8ZHsnurAbW2t9up4ORZXCsLTwylxrjSpa9ldGbCfh0InA',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-tea-lahijan',
    businessId: 'pich-shemroon',
    categoryId: 'cat-cafe',
    name: 'سرویس چای سنتی لاهیجان با نبات و هل',
    description: 'قوری سرویس چای دم‌کشیده لاهیجان، هل سبز معطر، شاخه نبات زعفرانی، باقلوای تازه شمرون',
    price: 85000,
    isAvailable: true,
    prepTimeMinutes: 4,
    rating: 5.0,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ2HiAntzY6XEx9kRtnCK4yTk31uzSnAuapcJZg9V69wxdRgkVgNyZJsWvWkV-8Da6-2OPVkqoy207U9XWGT1kIKCZEuHK84356ZC_shu1wEGGdojFAIGbeETXmYKqRy7NJmFuHmz9iHbfOQJzYjM8wCEgAmINnuHgAwfKt7vQmTjPe2z4_M2zbf7TFQX9pQ7QYinPnyB7P8ZHsnurAbW2t9up4ORZXCsLTwylxrjSpa9ldGbCfh0InA',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-espresso-double',
    businessId: 'pich-shemroon',
    categoryId: 'cat-cafe',
    name: 'اسپرسو دوبل تخصصی کلمبیا',
    description: '۱۰۰٪ دانه عربیکا سینگل اورجین کلمبیا با نوت‌های شکلاتی تیره و بادام برشته',
    price: 95000,
    isAvailable: true,
    prepTimeMinutes: 4,
    rating: 4.8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ2HiAntzY6XEx9kRtnCK4yTk31uzSnAuapcJZg9V69wxdRgkVgNyZJsWvWkV-8Da6-2OPVkqoy207U9XWGT1kIKCZEuHK84356ZC_shu1wEGGdojFAIGbeETXmYKqRy7NJmFuHmz9iHbfOQJzYjM8wCEgAmINnuHgAwfKt7vQmTjPe2z4_M2zbf7TFQX9pQ7QYinPnyB7P8ZHsnurAbW2t9up4ORZXCsLTwylxrjSpa9ldGbCfh0InA',
    updatedAt: new Date().toISOString(),
  }
];

export const INITIAL_SERVICE_POINTS: ServicePoint[] = Array.from({ length: 16 }, (_, i) => {
  const tableNum = i + 1;
  let section: 'main' | 'balcony' | 'garden' = 'main';
  if (tableNum >= 9 && tableNum <= 12) section = 'balcony';
  if (tableNum >= 13) section = 'garden';

  const isOccupied = [1, 3, 4, 7, 8, 10, 14].includes(tableNum);

  return {
    id: `table-${tableNum}`,
    businessId: 'pich-shemroon',
    tableNumber: tableNum,
    section,
    label: `میز ${tableNum} (${section === 'main' ? 'سالن اصلی' : section === 'balcony' ? 'بالکن شمرون' : 'باغچه اختصاصی'})`,
    isOccupied,
    qrCodeUrl: `/?view=customer&table=${tableNum}`,
  };
});

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    businessId: 'pich-shemroon',
    tableNumber: 4,
    orderNumber: 'PS-101',
    sessionId: 'session-t4-01',
    customerName: 'میز ۴ - سالن اصلی',
    customerNotes: 'لطفاً کباب‌ها کاملاً مغزپخت باشد و کره حیوانی فراموش نشود',
    items: [
      {
        id: 'item-101-1',
        productId: 'prod-koobideh-pich',
        productName: 'چلوکباب کوبیده مخصوص پیچ شمرون',
        unitPriceSnapshot: 320000,
        quantity: 2,
        selectedOptions: [{ groupTitle: 'مخلفات اضافه', optionName: 'کره حیوانی محلی اضافی', extraPrice: 12000 }],
        itemTotal: 664000
      },
      {
        id: 'item-101-2',
        productId: 'prod-dough-shemroon',
        productName: 'دوغ محلی مخصوص پیچ شمرون (پارچی)',
        unitPriceSnapshot: 35000,
        quantity: 2,
        itemTotal: 70000
      },
      {
        id: 'item-101-3',
        productId: 'prod-zeytoon-pich',
        productName: 'زیتون پرورده شمرونی و ماست بورانی',
        unitPriceSnapshot: 75000,
        quantity: 1,
        itemTotal: 75000
      }
    ],
    totalAmount: 809000,
    status: 'cooking',
    deliveryStatus: 'pending',
    paymentStatus: 'paid_online',
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    idempotencyKey: 'idem-ord-101'
  },
  {
    id: 'ord-102',
    businessId: 'pich-shemroon',
    tableNumber: 2,
    orderNumber: 'PS-102',
    sessionId: 'session-t2-01',
    customerName: 'میز ۲ - بالکن شمرون',
    customerNotes: 'پیتزا با پنیر دوبل و سس مخصوص',
    items: [
      {
        id: 'item-102-1',
        productId: 'prod-pizza-pich',
        productName: 'پیتزا استیک مخصوص پیچ شمرون',
        unitPriceSnapshot: 365000,
        quantity: 1,
        selectedOptions: [{ groupTitle: 'پنیر و سس', optionName: 'دوبل پنیر موزارلا کشسانی', extraPrice: 40000 }],
        itemTotal: 405000
      },
      {
        id: 'item-102-2',
        productId: 'prod-mojito-fresh',
        productName: 'موهیتو دست‌ساز تازه بار شمرون',
        unitPriceSnapshot: 75000,
        quantity: 2,
        itemTotal: 150000
      }
    ],
    totalAmount: 555000,
    status: 'ready',
    deliveryStatus: 'pending',
    paymentStatus: 'paid_online',
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    idempotencyKey: 'idem-ord-102'
  },
  {
    id: 'ord-103',
    businessId: 'pich-shemroon',
    tableNumber: 8,
    orderNumber: 'PS-103',
    sessionId: 'session-t8-01',
    customerName: 'میز ۸ - سالن اصلی',
    customerNotes: 'سفارش تازه ثبت شده توسط مهمانان سر میز',
    items: [
      {
        id: 'item-103-1',
        productId: 'prod-shishlik-pich',
        productName: 'شیشلیک مخصوص پیچ شمرون (۶ تکه دنده)',
        unitPriceSnapshot: 740000,
        quantity: 1,
        itemTotal: 740000
      },
      {
        id: 'item-103-2',
        productId: 'prod-caesar-salad',
        productName: 'سالاد سزار اصیل با فیله مرغ گریل',
        unitPriceSnapshot: 185000,
        quantity: 1,
        itemTotal: 185000
      }
    ],
    totalAmount: 925000,
    status: 'pending_waiter',
    deliveryStatus: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    idempotencyKey: 'idem-ord-103'
  },
  {
    id: 'ord-104',
    businessId: 'pich-shemroon',
    tableNumber: 14,
    orderNumber: 'PS-104',
    sessionId: 'session-t14-01',
    customerName: 'میز ۱۴ - باغچه اختصاصی',
    customerNotes: 'چای و دسر عصرانه',
    items: [
      {
        id: 'item-104-1',
        productId: 'prod-tea-lahijan',
        productName: 'سرویس چای سنتی لاهیجان با نبات و هل',
        unitPriceSnapshot: 85000,
        quantity: 2,
        itemTotal: 170000
      }
    ],
    totalAmount: 170000,
    status: 'delivered',
    deliveryStatus: 'delivered',
    paymentStatus: 'paid_pos',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    idempotencyKey: 'idem-ord-104'
  }
];

export const INITIAL_SUPPLIER_LISTINGS: SupplierListing[] = [];

