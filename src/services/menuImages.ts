import {displayImagePath} from '../lib/imagePath';
import type {Product} from '../types';
// Small square WebP thumbnails are generated during the GitHub Pages build.
// When there is no honest visual match, use a labelled neutral illustration,
// rather than displaying a photograph of a different food.
export const IMAGE_CHOICES=[
 ['چلوکباب کوبیده','iran-0'],['جوجه‌کباب زعفرانی','iran-1'],['کباب برگ','iran-2'],['کباب ترکیبی','iran-3'],
 ['قورمه‌سبزی','iran-4'],['خورش قیمه','iran-5'],['زرشک‌پلو با مرغ','iran-6'],
 ['باقالی‌پلو با ماهیچه','iran-7'],['ته‌چین','iran-8'],['ماهی کبابی','iran-9'],
 ['سالاد شیرازی','iran-10'],['ماست و خیار','iran-11'],['کشک بادمجان','iran-12'],
 ['میرزاقاسمی','iran-13'],['دوغ','iran-14'],['بستنی سنتی','iran-15'],
 ['پیتزا پپرونی','food-0'],['پیتزا مارگاریتا','food-1'],['چیزبرگر','food-2'],
 ['دوبل برگر','food-3'],['پاستا آلفردو','food-4'],['سالاد فصل','food-5'],
 ['سیب‌زمینی سرخ‌کرده','food-6'],['استیک','food-7'],['لاته','food-8'],['آب پرتقال','food-9'],
 ['کیک شکلاتی','food-10'],['بستنی اسکوپی','food-11'],['نان سیر','food-12'],
 ['چای ایرانی','food-13'],['آب معدنی','food-14'],['پیتزا سبزیجات','food-15'],
 ['کاپوچینو','cappuccino'],['اسپرسو','espresso'],['قلیان','hookah'],
 ['بستنی سه‌طعم','icecream'],['موهیتو','mojito'],['آبمیوه طبیعی','orange-juice']
] as const;
const catalogTile=(name:string)=>'/menu-tiles/'+name+'.webp';
const normalize=(s:string)=>String(s||'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/‌/g,' ').replace(/\s+/g,' ').trim();
type PhotoRule=[RegExp,string];
const exact:PhotoRule[]=[
 [/قلیان|تعویض زغال|سری قلیان/,'hookah'],
 [/کشک بادمجان/,'iran-12'],[/میرزا ?قاسمی/,'iran-13'],
 [/قرمه|قورمه/,'iran-4'],[/قیمه/,'iran-5'],[/زرشک/,'iran-6'],[/باقالی ?پلو|ماهیچه|گردن/,'iran-7'],[/ته چین/,'iran-8'],[/ماهی (?:کبابی|گریل)|سبزی پلو با ماهی/,'iran-9'],
 [/دوغ/,'iran-14'],[/سالاد شیرازی/,'iran-10'],[/ماست و خیار|ماست موسیر|ماست چکیده|بورانی/,'iran-11'],
 [/سالاد (?:فصل|سبز|یونانی|سزار|کلم|مرغ)/,'food-5'],[/جوجه|مرغ گریل/,'iran-1'],[/کباب (?:کوبیده|لقمه)|چلوکباب کوبیده/,'iran-0'],[/کباب برگ|شیشلیک|چنجه|استیک گوشت|کباب سلطانی/,'iran-2'],
 [/برگر (?:دوبل|دوبل چیز)|دوبل برگر/,'food-3'],[/چیز ?برگر|همبرگر|برگر (?:کلاسیک|ویژه|استیک)|برگر/,'food-2'],
 [/پیتزا (?:مارگاریتا|چهار پنیر)/,'food-1'],[/پیتزا (?:سبزیجات|مخصوص سبزیجات)/,'food-15'],[/پیتزا (?:پپرونی|مخلوط|مخصوص|سوپریم|استیک|آمریکایی|گوشت|مرغ)/,'food-0'],
 [/پاستا (?:آلفردو|پنه)|پنه مرغ/,'food-4'],[/سیب زمینی|فرنچ فرایز/,'food-6'],[/نان سیر/,'food-12'],
 [/کیک شکلات|براونی|کیک کاکائویی/,'food-10'],[/بستنی سنتی|زعفرانی/,'iran-15'],[/بستنی (?:سه طعم|اسکوپی|وانیلی|شکلاتی|میوه ای|توت فرنگی)|بستنی/,'icecream'],
 [/کاپوچینو/,'cappuccino'],[/اسپرسو|آمریکانو|ریسترتو|لانگو|قهوه ترک/,'espresso'],
 [/لاته|فلت وایت|ماکیاتو|موکا|کافه گلاسه|آیس کافی/,'food-8'],
 [/چای (?:ایرانی|سیاه|سبز|زعفران|دارچین)|دمنوش/,'food-13'],
 [/موهیتو|لیموناد|آب لیمو/,'mojito'],
 [/آب پرتقال|آب هویج|آب سیب|آب انار|آبمیوه طبیعی/,'orange-juice'],
 [/شکلات داغ|هات چاکلت|هات نوتلا|وایت چاکلت/,'food-8'],
 [/آب معدنی/,'food-14'],
];
export const CATEGORY_ILLUSTRATIONS={
 food:'/menu-tiles/meal.svg',drinks:'/menu-tiles/drink.svg',
 breakfast:'/menu-tiles/breakfast.svg',service:'/menu-tiles/service.svg',
 supplies:'/menu-tiles/supplies.svg'
};
export function suggestedMenuImage(name:string,category='',kind='restaurant'){
 const n=normalize(name),c=normalize(category);
 // Non-food room or merchandise services must not show unrelated dishes.
 if(/حوله|بالش|پتو|خشکشویی|اتو(?:ی لباس)?|نظافت|تعویض ملحفه|شستشوی/.test(n))return CATEGORY_ILLUSTRATIONS.service;
 if(/ظرف یکبار|بسته بندی|جعبه پیتزا|لیوان کاغذی|کیسه بیرون بر|دستمال|نی کاغذی|کارتنی|کیلوگرم|گوشت خام/.test(n)||kind==='wholesaler')return CATEGORY_ILLUSTRATIONS.supplies;
 for(const [matcher,img] of exact)if(matcher.test(n))return catalogTile(img);
 if(/سالاد|سبزی خوردن|خیار|گوجه/.test(n))return catalogTile('food-5');
 if(/چلو|کباب|پلو|خورش|دیزی|آبگوشت/.test(n))return CATEGORY_ILLUSTRATIONS.food;
 if(/پیتزا/.test(n))return catalogTile('food-15');
 if(/پاستا|لازانیا/.test(n))return catalogTile('food-4');
 if(/استیک|مرغ|ماهی|سوخاری|ساندویچ|هات داگ|رپ/.test(n))return CATEGORY_ILLUSTRATIONS.food;
 if(/کیک|شیرینی|کوکی|کروسان|دسر|تارت|تیرامیسو/.test(n))return CATEGORY_ILLUSTRATIONS.breakfast;
 if(/بستنی|فالوده|معجون/.test(n))return catalogTile('icecream');
 if(/آبمیوه|نوشیدنی|اسموتی|شیک|شیرموز|گلاسه|نوشابه|شربت|ماءالشعیر/.test(n))return CATEGORY_ILLUSTRATIONS.drinks;
 if(/صبحانه|نیمرو|املت|تست|پنکیک|وافل|فرنچ تست|حلیم|عدسی/.test(n))return CATEGORY_ILLUSTRATIONS.breakfast;
 if(/خدمات اتاق|روم سرویس|مینی بار/.test(c)||/سرویس/.test(n))return CATEGORY_ILLUSTRATIONS.service;
 if(/نوشیدنی|قهوه|چای|آبمیوه|شیک|اسموتی/.test(c))return CATEGORY_ILLUSTRATIONS.drinks;
 if(/صبحانه|برانچ/.test(c))return CATEGORY_ILLUSTRATIONS.breakfast;
 if(/دسر|شیرینی/.test(c))return CATEGORY_ILLUSTRATIONS.breakfast;
 return CATEGORY_ILLUSTRATIONS.food;
}
// The catalog API currently accepts only original bundled image paths, not generated tiles.
export function sourcePhotoForItem(name:string,category='',kind='restaurant'){
 const tile=suggestedMenuImage(name,category,kind);
 const match=/^\/menu-tiles\/([a-z0-9-]+)\.webp$/.exec(tile);
 if(!match)return '';
 const file=match[1]+'.webp';
 return /^(iran|food)-\d+$/.test(match[1])?'/media/'+file:'/menu-assets/'+file;
}
export function productDisplayImage(p:Pick<Product,'name'|'imageUrl'|'customImage'>,category=''){
 const url=p.imageUrl||'';
 if(p.customImage && url)return displayImagePath(url);
 // Early builds incorrectly stored the SAME generic image for all products in a menu.
 // Recompute curated bundled artwork using the actual product name.
 if(!url||/^\/?(?:menosaz\/)?(?:media|menu-assets|menu-tiles)\//.test(url))
   return displayImagePath(suggestedMenuImage(p.name,category));
 return displayImagePath(url);
}
