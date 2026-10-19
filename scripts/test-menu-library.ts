import assert from 'node:assert/strict';
import {MENU_KINDS,MENU_PRESETS,defaultMenuName,effectiveMenuName,menuKindLabel} from '../src/services/menuTemplates';
import {IMAGE_CHOICES,suggestedMenuImage,sourcePhotoForItem,productDisplayImage} from '../src/services/menuImages';
import {catalogImagePath,displayImagePath} from '../src/lib/imagePath';

let checks=0;
assert.equal(MENU_KINDS.length,9);
assert.equal(new Set(MENU_KINDS.map(x=>x.id)).size,MENU_KINDS.length);checks++;
assert.equal(defaultMenuName('cafe'),'منوی کافه');
assert.equal(defaultMenuName('hotel'),'منوی روم‌سرویس هتل');
assert.equal(effectiveMenuName('منوی اصلی','hookah'),'منوی قلیان و پذیرایی');
assert.equal(effectiveMenuName('منوی ویژه شبانه','restaurant'),'منوی ویژه شبانه');checks++;
assert.equal(menuKindLabel('fastfood'),'فست‌فود و پیتزافروشی');checks++;
let count=0;
for(const {id} of MENU_KINDS){
 const cats=MENU_PRESETS[id];
 assert(cats.length>=5,`At least 5 categories expected for ${id}`);
 assert.equal(new Set(cats.map(c=>c.name)).size,cats.length,`duplicate category in ${id}`);
 for(const c of cats){
  assert(c.name.trim(),'blank category');
  assert(c.items.length>=4,`Too few items in ${id}/${c.name}`);
  assert.equal(new Set(c.items).size,c.items.length,`Duplicate names in ${id}/${c.name}`);
  for(const name of c.items){
   assert(name.trim(),'Blank menu item');
   assert(name.length<=60,`name too long: ${name}`);
   const tile=suggestedMenuImage(name,c.name,id);
   assert(/^\/menu-tiles\/[a-z0-9-]+\.(?:webp|svg)$/.test(tile),`Bad tile ${tile}`);
   const stored=sourcePhotoForItem(name,c.name,id);
   assert(stored===''||/^\/(media|menu-assets)\/[a-z0-9-]+\.webp$/.test(stored),`Backend-incompatible image URL ${stored}`);
   count++;
  }
 }
 checks++;
}
assert(count>=450,`Full catalog too small: ${count}`);checks++;
const available=new Set(IMAGE_CHOICES.map(x=>x[1]));
assert.equal(available.size,38);checks++;
assert.equal(sourcePhotoForItem('چلوکباب کوبیده'),'/media/iran-0.webp');checks++;
assert.equal(sourcePhotoForItem('اسپرسو'),'/menu-assets/espresso.webp');checks++;
assert.equal(suggestedMenuImage('قلیان دو سیب'),'/menu-tiles/hookah.webp');checks++;
assert.equal(suggestedMenuImage('درخواست حوله اضافه'),'/menu-tiles/service.svg');checks++;
assert.equal(suggestedMenuImage('کیک شکلاتی'),'/menu-tiles/food-10.webp');checks++;
assert.equal(suggestedMenuImage('سیب‌زمینی سرخ‌کرده'),'/menu-tiles/food-6.webp');checks++;
assert.equal(productDisplayImage({name:'پیتزا پپرونی',imageUrl:'/media/iran-0.webp'}),'/menu-tiles/food-0.webp');checks++;
assert.equal(productDisplayImage({name:'پیتزا پپرونی',imageUrl:'https://example.com/photo.webp',customImage:true}),'https://example.com/photo.webp');checks++;
assert.equal(displayImagePath('/menu-tiles/food-0.webp','/menosaz/'),'/menosaz/menu-tiles/food-0.webp');checks++;
assert.equal(catalogImagePath('/menosaz/menu-tiles/food-0.webp','/menosaz/'),'/menu-tiles/food-0.webp');checks++;
console.log(`PASS: ${checks} menu types, ${count} curated items, 38 image sources and accurate lightweight fallbacks`);
