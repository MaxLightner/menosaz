import {displayImagePath} from '../lib/imagePath';
import type {Product} from '../types';
export const PALETTES=[
 {
  "id": "original",
  "name": "ایرانی گرم",
  "primary": "#AD3F25",
  "secondary": "#345047",
  "surface": "#F6F0E5",
  "ink": "#30291E",
  "tags": [
   "رستوران"
  ]
 },
 {
  "id": "hotel",
  "name": "لاجوردی و طلایی",
  "primary": "#315C9B",
  "secondary": "#92753B",
  "surface": "#F4F7FC",
  "ink": "#202D42",
  "tags": [
   "هتل"
  ]
 },
 {
  "id": "berry",
  "name": "تمشکی و یاسی",
  "primary": "#BA3C78",
  "secondary": "#735CAD",
  "surface": "#FFF5FC",
  "ink": "#463244",
  "tags": [
   "آبمیوه",
   "کافه"
  ]
 },
 {
  "id": "juice",
  "name": "نارنگی و فیروزه‌ای",
  "primary": "#D35A1E",
  "secondary": "#137D80",
  "surface": "#FFF8F0",
  "ink": "#333C38",
  "tags": [
   "آبمیوه"
  ]
 },
 {
  "id": "espresso",
  "name": "قهوه و مسی",
  "primary": "#A65332",
  "secondary": "#69462F",
  "surface": "#FAF3EC",
  "ink": "#38291F",
  "tags": [
   "کافه"
  ]
 },
 {
  "id": "luxury",
  "name": "ذغالی و طلایی",
  "primary": "#795C24",
  "secondary": "#292D34",
  "surface": "#FAF9F5",
  "ink": "#292D34",
  "tags": [
   "هتل",
   "رستوران"
  ]
 },
 {
  "id": "marine",
  "name": "آبی و نعناعی",
  "primary": "#256C9D",
  "secondary": "#318874",
  "surface": "#F0FAFC",
  "ink": "#263F49",
  "tags": [
   "هتل",
   "آبمیوه"
  ]
 },
 {
  "id": "fast",
  "name": "قرمز و خردلی",
  "primary": "#C13931",
  "secondary": "#926B12",
  "surface": "#FFFAEF",
  "ink": "#3A2D26",
  "tags": [
   "رستوران"
  ]
 },
 {
  "id": "autumn",
  "name": "نارنجی پاییز و آلبالویی",
  "primary": "#BF5728",
  "secondary": "#833A45",
  "surface": "#FCF3E8",
  "ink": "#49352D",
  "tags": [
   "مناسبتی",
   "کافه"
  ]
 },
 {
  "id": "yalda",
  "name": "انار و سبز زمردی",
  "primary": "#B62A43",
  "secondary": "#247356",
  "surface": "#FFF4F5",
  "ink": "#482C35",
  "tags": [
   "مناسبتی"
  ]
 },
 {
  "id": "nowruz",
  "name": "سبز بهار و بنفش",
  "primary": "#337C58",
  "secondary": "#8063A2",
  "surface": "#F3FAF5",
  "ink": "#304138",
  "tags": [
   "مناسبتی"
  ]
 },
 {
  "id": "winter",
  "name": "آبی یخی و نقره‌ای",
  "primary": "#427B9B",
  "secondary": "#687E91",
  "surface": "#F1F7FB",
  "ink": "#263E50",
  "tags": [
   "مناسبتی",
   "هتل"
  ]
 },
 {
  "id": "leaf",
  "name": "مرجانی و سبز برگ",
  "primary": "#B94D3C",
  "secondary": "#51805A",
  "surface": "#F6F7F4",
  "ink": "#29372E",
  "tags": [
   "رستوران",
   "کافه"
  ]
 },
 {
  "id": "pistachio",
  "name": "گوجه‌ای و پسته‌ای",
  "primary": "#BC4437",
  "secondary": "#527047",
  "surface": "#F8F8F5",
  "ink": "#30352B",
  "tags": [
   "رستوران"
  ]
 },
 {
  "id": "pomegranate",
  "name": "اناری و مریم‌گلی",
  "primary": "#AC4257",
  "secondary": "#466D57",
  "surface": "#FAF6F6",
  "ink": "#342C32",
  "tags": [
   "مناسبتی",
   "رستوران"
  ]
 }
];
export const SAMPLE_CATEGORIES:Record<string,string>={'cat-kebab':'کباب‌ها','cat-traditional':'غذاهای ایرانی','demo-hot':'نوشیدنی گرم','demo-cafefood':'میان‌وعده','demo-salad':'پیش‌غذا و سالاد','demo-fruitice':'آبمیوه بستنی','demo-special':'معجون','demo-coffee':'قهوه','demo-cold':'نوشیدنی سرد','demo-hookah':'قلیان','demo-dessert':'دسر و بستنی','demo-breakfast':'صبحانه','demo-room':'غذا و روم‌سرویس','demo-juice':'آبمیوه طبیعی','demo-shake':'شیک و گلاسه'};
const item=(id:string,name:string,categoryId:string,price:number,image:string,description:string):Product=>({id:'demo-'+id,businessId:'demo',name,categoryId,price,imageUrl:image,description,isAvailable:true,prepTimeMinutes:7,updatedAt:'2026-10-13T00:00:00Z'});
export const SAMPLES=[
 {id:'restaurant',name:'رستوران نارنج',type:'رستوران ایرانی',headline:'طعم آشنا،\nیک میز صمیمی.',subline:'غذای ایرانی، برای یک دورهمی خوش‌طعم.',image:'/media/iran-1.webp',items:[
 item('narenj-kebab','چلوکباب کوبیده','cat-kebab',320000,'/media/iran-0.webp','دو سیخ کوبیده، برنج زعفرانی و گوجه کبابی.'),
 item('narenj-chicken','چلو جوجه زعفرانی','cat-kebab',350000,'/media/iran-1.webp','جوجه کباب، برنج و گوجه کبابی.'),
 item('narenj-rice','زرشک‌پلو با مرغ','cat-traditional',315000,'/media/iran-6.webp','مرغ و برنج زعفرانی با زرشک.'),
 item('narenj-doogh','دوغ محلی','cat-drink',55000,'/media/iran-14.webp','دوغ محلی با نعناع؛ یک لیوان خنک.')
 ]},
 {id:'cafe',name:'کافه برگ',type:'کافه',headline:'عطر قهوه،\nآرامش یک فنجان.',subline:'قهوه، دسر و یک مکث خوش‌طعم.',image:'/menu-assets/cappuccino.webp',items:[
 item('espresso','اسپرسو دوبل','demo-coffee',95000,'/menu-assets/espresso.webp','دو شات اسپرسو با کرمای طلایی؛ کوچک، غلیظ و با طعم برجسته قهوه.'),
 item('americano','آمریکانو','demo-coffee',105000,'/menu-assets/espresso.webp','اسپرسو و آب داغ؛ نوشیدنی بدون شیر با طعم قهوه و حجم بیشتر.'),
 item('cappuccino','کاپوچینو','demo-coffee',135000,'/menu-assets/cappuccino.webp','اسپرسو، شیر گرم و فوم شیر؛ بافت نرم و طعمی متعادل.'),
 item('latte','کافه لاته','demo-coffee',145000,'/menu-assets/cappuccino.webp','اسپرسو با شیر بیشتر؛ انتخابی ملایم‌تر برای دوست‌داران قهوه شیری.'),
 item('mojito','موهیتو بدون الکل','demo-cold',125000,'/menu-assets/mojito.webp','لیمو، نعناع تازه و یخ؛ خنک، ترش و معطر.'),
 item('hookah-apple','قلیان دو سیب','demo-hookah',280000,'/menu-assets/hookah.webp','سرویس قلیان با طعم دو سیب؛ فقط برای بزرگسالان.'),
 item('hookah-mint','قلیان نعناع','demo-hookah',280000,'/menu-assets/hookah.webp','سرویس قلیان با طعم نعناع؛ فقط برای بزرگسالان.'),
 item('icecream','بستنی سه‌طعم','demo-dessert',120000,'/menu-assets/icecream.webp','سه اسکوپ بستنی وانیلی، شکلاتی و توت‌فرنگی.')
 ]},
 {id:'hotel',name:'هتل سرو',type:'هتل',headline:'صبحی خوش‌طعم،\nاقامتی دلپذیر.',subline:'صبحانه، نوشیدنی و غذا برای لحظه‌های اقامت.',image:'/media/iran-6.webp',items:[
 item('hotel-breakfast','صبحانه ایرانی','demo-breakfast',250000,'/media/iran-10.webp','نان، پنیر، گردو و سبزی؛ همراه چای. تصویر نمونه است.'),
 item('hotel-omelette','املت گوجه','demo-breakfast',185000,'/media/food-7.webp','تخم‌مرغ و گوجه، همراه نان؛ مناسب یک نفر. تصویر نمونه است.'),
 item('hotel-coffee','کاپوچینو','demo-coffee',135000,'/menu-assets/cappuccino.webp','اسپرسو، شیر گرم و فوم شیر.'),
 item('hotel-juice','آب پرتقال تازه','demo-juice',125000,'/menu-assets/orange-juice.webp','یک لیوان آب پرتقال تازه.'),
 item('hotel-chicken','زرشک‌پلو با مرغ','demo-room',385000,'/media/iran-6.webp','یک وعده برنج زعفرانی و مرغ، مناسب روم‌سرویس.'),
 item('hotel-kebab','چلوکباب کوبیده','demo-room',420000,'/media/iran-0.webp','کباب کوبیده، برنج زعفرانی و گوجه کبابی.')
 ]},
 {id:'juice',name:'آبمیوه نارنج',type:'آبمیوه و بستنی',headline:'میوه تازه،\nیک جرعه خوشحالی.',subline:'آبمیوه، شیک و بستنی؛ خنک و رنگارنگ.',image:'/menu-assets/orange-juice.webp',items:[
 item('orange','آب پرتقال طبیعی','demo-juice',120000,'/menu-assets/orange-juice.webp','یک لیوان آب پرتقال تازه، بدون افزودن شکر.'),
 item('carrot','آب هویج','demo-juice',95000,'/menu-assets/orange-juice.webp','آب هویج تازه. تصویر فعلاً نمونه نوشیدنی است.'),
 item('lemonmint','لیموناد نعناع','demo-juice',110000,'/menu-assets/mojito.webp','لیمو، نعناع و یخ؛ خنک و ترش.'),
 item('juice-icecream','بستنی سه‌طعم','demo-dessert',120000,'/menu-assets/icecream.webp','سه اسکوپ بستنی وانیلی، شکلاتی و توت‌فرنگی.'),
 item('carrot-icecream','آب هویج بستنی','demo-fruitice',145000,'/menu-assets/icecream.webp','آب هویج تازه همراه یک اسکوپ بستنی وانیلی. تصویر نمونه است.'),
 item('banana-shake','شیرموز بستنی','demo-fruitice',160000,'/menu-assets/icecream.webp','موز، شیر و بستنی وانیلی. تصویر نمونه است.')
 ]}
];

const extraSamples:Record<string,[string,string,number,string,string][]>={"restaurant": [["چلوکباب برگ", "cat-kebab", 620000, "/media/iran-2.webp", "یک سیخ ۲۰۰ گرمی فیله گوساله، برنج زعفرانی و گوجه؛ نرم و با طعم ملایم گوشت."], ["چلوکباب سلطانی", "cat-kebab", 740000, "/media/iran-2.webp", "یک سیخ برگ و یک سیخ کوبیده با یک پرس برنج؛ وعده‌ای پرحجم برای یک نفر."], ["جوجه کباب با استخوان", "cat-kebab", 390000, "/media/iran-1.webp", "نیم مرغ زعفرانی با استخوان، همراه برنج و گوجه؛ مناسب یک نفر با اشتهای زیاد."], ["باقالی‌پلو با گوشت", "cat-traditional", 580000, "/media/iran-7.webp", "یک تکه گوشت پخته با برنج، باقالی و شوید؛ عطر دارچین و طعم ملایم، یک پرس."], ["خورش قورمه‌سبزی", "cat-traditional", 290000, "/media/iran-8.webp", "یک کاسه خورش سبزی، گوشت و لوبیا همراه برنج؛ کمی ترش با عطر لیموعمانی."], ["خورش قیمه", "cat-traditional", 275000, "/media/iran-9.webp", "خورش گوشت و لپه با سیب‌زمینی و یک پرس برنج؛ طعم متعادل و عطر دارچین."], ["ته‌چین مرغ", "cat-traditional", 330000, "/media/iran-6.webp", "برنج زعفرانی با لایه مرغ و ته‌دیگ طلایی؛ یک برش بزرگ برای یک نفر."], ["سینی کباب دو نفره", "cat-kebab", 830000, "/media/iran-0.webp", "دو سیخ کوبیده، یک سیخ جوجه، دو پرس برنج و گوجه؛ برای دو نفر."], ["سوپ روز", "cat-appetizer", 95000, "/media/iran-10.webp", "یک کاسه سوپ جو و سبزیجات؛ گرم، ملایم و مناسب شروع غذا."], ["سالاد شیرازی", "cat-appetizer", 75000, "/media/iran-10.webp", "یک کاسه خیار، گوجه و پیاز ریز با آبلیمو؛ سبک، ترش و بدون سس خامه‌ای."], ["ماست و خیار", "cat-appetizer", 70000, "/media/iran-11.webp", "یک کاسه ماست، خیار و نعناع؛ خنک و مناسب کنار کباب."], ["زیتون پرورده", "cat-appetizer", 90000, "/media/iran-11.webp", "یک پیاله زیتون با گردو و رب انار؛ مزه ترش و شیرین."], ["نوشابه قوطی", "cat-drink", 45000, "/media/food-14.webp", "یک قوطی ۳۳۰ میلی‌لیتری؛ گازدار و شیرین."], ["آب معدنی", "cat-drink", 25000, "/media/food-14.webp", "یک بطری ۵۰۰ میلی‌لیتری آب آشامیدنی."], ["بستنی سنتی", "demo-dessert", 110000, "/menu-assets/icecream.webp", "سه اسکوپ بستنی زعفرانی با گلاب و خلال پسته؛ شیرین و معطر."], ["چای ایرانی", "demo-hot", 55000, "/media/iran-15.webp", "یک فنجان چای دم‌کشیده همراه قند؛ مناسب بعد از غذا."]], "cafe": [["فلت وایت", "demo-coffee", 140000, "/menu-assets/cappuccino.webp", "دو شات اسپرسو و شیر با فوم کم؛ فنجان ۱۸۰ میلی‌لیتری، قوی‌تر از لاته."], ["موکا", "demo-coffee", 165000, "/menu-assets/cappuccino.webp", "اسپرسو، شیر و شکلات؛ یک فنجان ۲۵۰ میلی‌لیتری با طعم شیرین و شکلاتی."], ["قهوه ترک", "demo-coffee", 110000, "/menu-assets/espresso.webp", "یک فنجان کوچک قهوه با بافت غلیظ؛ میزان شیرینی را در توضیحات سفارش بنویس."], ["هات چاکلت", "demo-hot", 145000, "/menu-assets/cappuccino.webp", "شکلات و شیر گرم؛ یک ماگ ۲۵۰ میلی‌لیتری، شیرین و خامه‌ای."], ["چای دارچین", "demo-hot", 85000, "/media/iran-15.webp", "یک قوری کوچک چای و دارچین برای یک نفر؛ گرم و معطر."], ["دمنوش به‌لیمو", "demo-hot", 95000, "/media/iran-15.webp", "یک قوری کوچک دمنوش به‌لیمو؛ بدون کافئین، با عطر مرکبات."], ["آیس لاته", "demo-cold", 155000, "/menu-assets/cappuccino.webp", "دو شات اسپرسو با شیر سرد و یخ؛ لیوان ۳۰۰ میلی‌لیتری، بدون شکر افزوده."], ["آیس آمریکانو", "demo-cold", 120000, "/menu-assets/espresso.webp", "اسپرسو، آب سرد و یخ؛ لیوان ۳۰۰ میلی‌لیتری با طعم قوی قهوه."], ["لیموناد", "demo-cold", 120000, "/menu-assets/mojito.webp", "آب لیموی تازه، شربت و یخ؛ لیوان ۳۰۰ میلی‌لیتری با مزه ترش و شیرین."], ["شیک شکلات", "demo-shake", 185000, "/menu-assets/icecream.webp", "شیر، بستنی و شکلات؛ لیوان ۳۵۰ میلی‌لیتری، غلیظ و شیرین."], ["چیزکیک", "demo-dessert", 145000, "/menu-assets/icecream.webp", "یک برش چیزکیک با پایه بیسکویت؛ بافت نرم و شیرینی متعادل."], ["براونی شکلات", "demo-dessert", 135000, "/menu-assets/icecream.webp", "یک برش کیک شکلاتی غلیظ؛ مناسب کنار قهوه تلخ."], ["کروسان پنیر", "demo-cafefood", 160000, "/media/food-7.webp", "یک کروسان گرم با پنیر؛ میان‌وعده سبک و شور."], ["ساندویچ مرغ", "demo-cafefood", 245000, "/media/food-2.webp", "مرغ گریل، کاهو و سس در نان؛ یک ساندویچ برای یک نفر."], ["قلیان انگور", "demo-hookah", 290000, "/menu-assets/hookah.webp", "یک سرویس قلیان با طعم انگور؛ مخصوص بزرگسالان."]], "hotel": [["صبحانه انگلیسی", "demo-breakfast", 340000, "/media/food-7.webp", "دو تخم‌مرغ، سوسیس، قارچ و نان تست؛ بشقاب کامل برای یک نفر."], ["نیمرو", "demo-breakfast", 160000, "/media/food-7.webp", "دو تخم‌مرغ همراه نان و کره؛ صبحانه‌ای ساده برای یک نفر."], ["پنکیک عسل", "demo-breakfast", 220000, "/menu-assets/icecream.webp", "سه پنکیک کوچک همراه عسل و میوه؛ صبحانه شیرین برای یک نفر."], ["بشقاب پنیر و گردو", "demo-breakfast", 175000, "/media/iran-11.webp", "پنیر، گردو، خیار و نان؛ یک بشقاب سرد و سبک برای یک نفر."], ["اسپرسو دوبل", "demo-coffee", 105000, "/menu-assets/espresso.webp", "دو شات اسپرسو؛ کوچک و غلیظ، بدون شیر."], ["کافه لاته", "demo-coffee", 155000, "/menu-assets/cappuccino.webp", "یک فنجان ۲۵۰ میلی‌لیتری اسپرسو و شیر؛ ملایم و با فوم کم."], ["چای ایرانی", "demo-hot", 65000, "/media/iran-15.webp", "یک قوری کوچک چای دم‌کشیده همراه قند برای یک نفر."], ["آب معدنی", "demo-cold", 30000, "/media/food-14.webp", "یک بطری ۵۰۰ میلی‌لیتری؛ قابل سفارش همراه غذا یا برای اتاق."], ["لیموناد", "demo-cold", 130000, "/menu-assets/mojito.webp", "یک لیوان ۳۰۰ میلی‌لیتری لیمو و یخ؛ ترش و شیرین."], ["چلو جوجه زعفرانی", "demo-room", 410000, "/media/iran-1.webp", "یک سیخ ۲۵۰ گرمی جوجه با برنج و گوجه؛ یک وعده کامل."], ["پاستا آلفردو", "demo-room", 380000, "/media/food-6.webp", "پاستا با مرغ، قارچ و سس خامه؛ یک بشقاب با طعم ملایم و بافت کرمی."], ["برگر گوشت", "demo-room", 320000, "/media/food-2.webp", "برگر ۱۵۰ گرمی با کاهو، گوجه و سیب‌زمینی؛ یک وعده برای یک نفر."], ["سالاد سزار", "demo-salad", 270000, "/media/iran-10.webp", "کاهو، مرغ گریل، نان تست و پارمزان؛ یک کاسه با سس جدا."], ["سوپ جو", "demo-salad", 115000, "/media/iran-10.webp", "یک کاسه سوپ جو با سبزیجات؛ گرم و ملایم."], ["بستنی سه‌طعم", "demo-dessert", 135000, "/menu-assets/icecream.webp", "سه اسکوپ وانیلی، شکلاتی و توت‌فرنگی؛ دسر خنک برای یک نفر."]], "juice": [["آب سیب طبیعی", "demo-juice", 115000, "/menu-assets/orange-juice.webp", "یک لیوان ۳۰۰ میلی‌لیتری آب سیب تازه؛ بدون شکر افزوده."], ["آب انار", "demo-juice", 165000, "/menu-assets/orange-juice.webp", "یک لیوان ۳۰۰ میلی‌لیتری آب انار؛ ترش و شیرین، بدون شکر افزوده."], ["آب هندوانه", "demo-juice", 105000, "/menu-assets/orange-juice.webp", "یک لیوان ۳۰۰ میلی‌لیتری آب هندوانه؛ سبک و خنک."], ["آب طالبی", "demo-juice", 115000, "/menu-assets/orange-juice.webp", "یک لیوان ۳۰۰ میلی‌لیتری طالبی تازه؛ شیرینی طبیعی میوه."], ["آب کرفس و سیب", "demo-juice", 125000, "/menu-assets/orange-juice.webp", "یک لیوان ۳۰۰ میلی‌لیتری؛ عطر کرفس با شیرینی طبیعی سیب."], ["شیرموز", "demo-shake", 145000, "/menu-assets/icecream.webp", "موز و شیر سرد در لیوان ۳۵۰ میلی‌لیتری؛ غلیظ و بدون بستنی."], ["شیک توت‌فرنگی", "demo-shake", 175000, "/menu-assets/icecream.webp", "شیر، بستنی و توت‌فرنگی؛ لیوان ۳۵۰ میلی‌لیتری با طعم میوه‌ای و شیرین."], ["شیک شکلات", "demo-shake", 170000, "/menu-assets/icecream.webp", "شیر، بستنی و شکلات؛ لیوان ۳۵۰ میلی‌لیتری با بافت غلیظ."], ["شیک موز و بادام‌زمینی", "demo-shake", 190000, "/menu-assets/icecream.webp", "موز، شیر، بستنی و کره بادام‌زمینی؛ لیوان بزرگ و پرحجم، حاوی مغزها."], ["کافه گلاسه", "demo-shake", 180000, "/menu-assets/icecream.webp", "قهوه سرد و بستنی وانیلی؛ لیوان ۳۵۰ میلی‌لیتری با مزه تلخ و شیرین."], ["فالوده شیرازی", "demo-dessert", 115000, "/menu-assets/icecream.webp", "یک کاسه فالوده با گلاب؛ آبلیمو جدا برای تنظیم ترشی."], ["بستنی سنتی", "demo-dessert", 125000, "/menu-assets/icecream.webp", "سه اسکوپ بستنی زعفرانی با پسته و گلاب؛ شیرین و معطر."], ["طالبی بستنی", "demo-fruitice", 155000, "/menu-assets/icecream.webp", "آب طالبی با یک اسکوپ بستنی وانیلی؛ لیوان ۳۵۰ میلی‌لیتری."], ["معجون مخصوص", "demo-special", 230000, "/menu-assets/icecream.webp", "شیر، موز، خرما، بستنی و مخلوط مغزها؛ یک لیوان ۴۰۰ میلی‌لیتری، شیرین و پرحجم."]]};
SAMPLES.forEach(sample=>{extraSamples[sample.id]?.forEach(([name,category,price,image,description],i)=>sample.items.push(item(sample.id+'-extra-'+i,name,category,price,image,description)));sample.items.forEach(p=>{p.businessId='demo-'+sample.id;});});
const cafe=SAMPLES.find(s=>s.id==='cafe')!,iranian=SAMPLES.find(s=>s.id==='restaurant')!;
SAMPLES.push({...cafe,id:'rooftop',name:'کافه بام',headline:'یک فنجان،\nبا منظره شهر.',subline:'قهوه، نوشیدنی و میان‌وعده در کافه بام.',items:cafe.items.filter(p=>p.categoryId!=='demo-hookah').map(p=>({...p,id:p.id+'-rooftop',businessId:'demo-rooftop'}))},{...iranian,id:'garden',name:'رستوران باغ انار',headline:'یک سفره ایرانی،\nدر آرامش باغ.',subline:'کباب، خورش و مخلفات؛ یک سفره ایرانی کامل.',items:iranian.items.map(p=>({...p,id:p.id+'-garden',businessId:'demo-garden'}))});
export function localProductImage(p:Pick<Product,'name'|'imageUrl'|'customImage'>){if(p.imageUrl)return displayImagePath(p.imageUrl);const n=p.name;if(n.includes('دوغ'))return '/media/iran-14.webp';if(n.includes('موهیتو')||n.includes('لیموناد'))return '/menu-assets/mojito.webp';if(n.includes('اسپرسو')||n.includes('آمریکانو'))return '/menu-assets/espresso.webp';if(n.includes('لاته')||n.includes('کاپوچینو'))return '/menu-assets/cappuccino.webp';if(n.includes('بستنی'))return '/menu-assets/icecream.webp';if(n.includes('پرتقال')||n.includes('هویج'))return '/menu-assets/orange-juice.webp';if(n.includes('قلیان'))return '/menu-assets/hookah.webp';if(n.includes('آب معدنی'))return '/media/food-14.webp';if(n.includes('چای'))return '/media/iran-15.webp';if(n.includes('زیتون')||n.includes('ماست'))return '/media/iran-11.webp';if(n.includes('سالاد'))return '/media/iran-10.webp';if(n.includes('سیب‌زمینی'))return '/media/food-11.webp';if(n.includes('پیتزا'))return '/media/food-0.webp';if(n.includes('برگر'))return '/media/food-2.webp';if(n.includes('پاستا'))return '/media/food-6.webp';if(n.includes('شیشلیک')||n.includes('برگ'))return '/media/iran-2.webp';if(n.includes('باقالی'))return '/media/iran-7.webp';if(n.includes('زرشک'))return '/media/iran-6.webp';if(n.includes('جوجه'))return '/media/iran-1.webp';if(n.includes('کوبیده'))return '/media/iran-0.webp';return p.imageUrl;}

export const BACKGROUNDS=[{"id": 0, "name": "کاغذ ساده", "tags": ["رستوران", "کافه", "هتل", "آبمیوه"]}, {"id": 1, "name": "نقش ایرانی", "tags": ["رستوران"]}, {"id": 2, "name": "برگ زیتون", "tags": ["رستوران"]}, {"id": 3, "name": "حاشیه گیاهی", "tags": ["کافه", "رستوران"]}, {"id": 4, "name": "قاب کلاسیک", "tags": ["هتل", "رستوران"]}, {"id": 5, "name": "خط قهوه", "tags": ["کافه"]}, {"id": 6, "name": "قاب آرت‌دکو", "tags": ["هتل"]}, {"id": 7, "name": "کاغذ کرافت", "tags": ["کافه", "رستوران"]}, {"id": 8, "name": "موج مرکبات", "tags": ["آبمیوه"]}, {"id": 9, "name": "خال‌های بستنی", "tags": ["آبمیوه"]}, {"id": 10, "name": "کاشی ایرانی", "tags": ["رستوران"]}, {"id": 11, "name": "برگ‌های پاییزی", "tags": ["مناسبتی"]}, {"id": 12, "name": "انار یلدا", "tags": ["مناسبتی"]}, {"id": 13, "name": "شکوفه نوروز", "tags": ["مناسبتی"]}, {"id": 14, "name": "بلور زمستان", "tags": ["مناسبتی", "هتل"]}, {"id": 15, "name": "خطوط مینیمال", "tags": ["هتل", "کافه"]}];
