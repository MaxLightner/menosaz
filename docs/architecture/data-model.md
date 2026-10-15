# مدل داده واحد

وضعیت همه ساختارهای زیر: طراحی. جدول‌های موجود OTP و محدودسازی درخواست بازاستفاده می‌شوند؛ تعریف این سند به معنای ساخت دوباره آنها نیست.

## ۱. قراردادهای مشترک

- شناسه کاربر همان UUID در auth.users است؛ کاربران به‌خاطر انتقال schema دوباره ساخته نمی‌شوند.
- شناسه دامنه‌های موجود از نوع text حفظ می‌شود. برای رکورد تازه شناسه تصادفی UUID متنی تولید می‌شود؛ شماره میز، نام و slug کلید اصلی نیستند.
- کلید کسب‌وکار Business.id است. موجودیت‌های متعلق به مجموعه کلید مرکب `(business_id, id)` دارند؛ Category کلید `(business_id, menu_id, id)` دارد. هر FK فرزند تمام دامنه مالکیت را بررسی می‌کند.
- Menu.id=`main` می‌تواند در دو مجموعه وجود داشته باشد. شناسه بدون business_id هرگز مبنای مجوز یا lookup نیست.
- همه زمان‌های رویداد timestamptz و زمان‌بندی محلی بر اساس timezone کسب‌وکار با پیش‌فرض Asia/Tehran است.
- مبلغ داخلی bigint به تومان است، بدون float. مبلغ ریالی درگاه فقط در آداپتور پرداخت، با ضرب دقیق در ۱۰ ساخته می‌شود. مقدار و واحد خام درگاه جدا ثبت می‌شوند.
- قیمت‌های محصول فعلی در کد تومان‌اند؛ مبلغ جدول پرداخت فعلی ریال است. پیش از انتقال، نمونه‌های واقعی و نسبت تبدیل در گزارش تطبیق تأیید می‌شوند؛ هیچ مبلغی از روی بزرگی عدد حدس زده نمی‌شود.
- quantity از نوع numeric(12,3) و unit_code و quantity_step دارد؛ سفارش میز فعلی تعداد صحیح با گام ۱ را می‌پذیرد. این ساختار مانع فروش وزنی آینده نمی‌شود؛ فروش وزنی فعلاً فعال نمی‌شود.
- archive به جای حذف محصول/منو دارای سابقه؛ حذف آبشاری سفارش، پرداخت، Session و سابقه ممنوع است.
- created_at، updated_at و version برای رکوردهای قابل تغییر؛ تغییر با expected_version انجام می‌شود تا تغییر هم‌زمان پنهان بازنویسی نشود.
- FK مرکب علاوه بر business باید مسیر والد را هم کنترل کند: Category همان menu محصول، Option همان گروه و محصول، Guest همان Session سفارش، و Session همان ServicePoint سفارش. uniqueهای لازم روی ترکیب والدها تعریف می‌شوند؛ برابر بودن business به‌تنهایی کافی نیست.

## ۲. حساب و مالکیت

| موجودیت | فیلدهای اصلی | قاعده |
|---|---|---|
| profiles | user_id، display_name، status، profile_completed | تلفن مرجع در Supabase Auth؛ وضعیت blocked مستقل از نوع کسب‌وکار |
| platform_roles | user_id، role | ادمین سیستم جدا از کارکنان مجموعه؛ تخصیص فقط از مسیر مدیریتی ثبت‌شده |
| businesses | id، name، slug، kind_code، timezone، status، order_acceptance_active | انواع restaurant/cafe/hotel/wholesaler/juice؛ slug یکتا؛ وضعیت مجموعه مستقل از مسدودشدن یک کارمند |
| business_memberships | business_id، user_id، role، status | یکتایی business+user؛ نقش owner/manager/waiter/kitchen؛ یک کاربر امکان عضویت در چند مجموعه دارد |
| terms_acceptances | user_id، terms_version، accepted_at | پذیرش نسخه قوانین در ثبت‌نام؛ خواندن اجباری نیست |

هر Business فعال حداقل یک مالک فعال دارد؛ حذف آخرین مالک در تراکنش رد می‌شود. پنل ساده فعلی کسب‌وکار فعال را انتخاب می‌کند؛ سرور عضویت را بررسی می‌کند. UUID کاربر یا شماره تلفنِ داخل درخواست به‌تنهایی مجوز نیست. شماره ادمین قبلی فقط هنگام انتقال نقش موجود به کار می‌رود؛ بعد از آن اعطای نقش ادمین از روی شماره hardcode نمی‌شود.

## ۳. منو، دسته و محصول

| موجودیت | فیلدهای اصلی | رابطه و محدودیت |
|---|---|---|
| menus | business_id، id، title، kind_code، status، sort_order، revision، schedule_mode، timezone | مالک فقط یک Business؛ status=draft/published/archived؛ timezone پیش‌فرض از کسب‌وکار |
| categories | business_id، menu_id، id، title، sort_order، media_id، status | متعلق به همان Menu؛ دسته خالی هم مستقل باقی می‌ماند |
| products | business_id، id، menu_id، category_id، name، summary، description، price_toman، unit_code، quantity_step، is_available، status، sort_order | FK مرکب جلوی دسته یا منوی مجموعه دیگر را می‌گیرد؛ قیمت غیرمنفی |
| product_option_groups | business_id، id، product_id، title، min_select، max_select، sort_order | حد انتخاب روشن؛ required به min_select تبدیل می‌شود |
| product_options | business_id، id، group_id، name، extra_price_toman، is_available، sort_order | انتخاب با شناسه معتبر، نه فقط عنوان تکرارپذیر |
| media_assets | business_id، id، storage_path یا external_url، mime، bytes، width، height، kind، status | یک رکورد برای هر منبع؛ kind=image/model؛ URL قدیمی در مرحله انتقال مجاز است |
| product_media | business_id، product_id، media_id، sort_order، is_primary | مالکیت محصول و فایل یکسان؛ یک تصویر اصلی |
| menu_appearance | business_id، menu_id، palette_key، background_asset_id، paper_key، hero_copy، revision | یک مرجع ظاهر برای هر منو؛ gallery عمومی فقط کاتالوگ قالب است |
| menu_time_windows | business_id، menu_id، weekday، start_minute، end_minute، end_day_offset | روز ISO؛ start از ۰ تا ۱۴۳۹؛ پایان تا ۱۴۴۰؛ offset=۰ یا ۱ برای عبور از نیمه‌شب |

محصول فعلاً متعلق به یک منو است. انتقال محصول به منوی دیگر دسته مقصد معتبر می‌خواهد؛ سفارش قبلی snapshot خودش را نگه می‌دارد. بازارگاه آینده می‌تواند به همین محصولات ارجاع دهد؛ برای آن بانک محصولات جدا ساخته نمی‌شود.

تصویر محصول جدید: مربع، حداکثر ۱ MiB، نوع و ابعاد معتبر در مرورگر و سرور. تصویر پس‌زمینه الزام مربع ندارد و سیاست مستقل دارد. فایل‌های قدیمی ناسازگار گزارش می‌شوند و بدون تأیید حذف یا تولید مجدد نمی‌شوند. فایل سه‌بعدی فقط نوع رسانه پیش‌بینی‌شده است؛ قابلیت AR فعال ساخته نمی‌شود.

## ۴. سرویس‌پوینت و زمان‌بندی

| موجودیت | فیلدهای اصلی | قاعده |
|---|---|---|
| service_points | business_id، id، code، kind، label، section، status، menu_mode | kind=table/room/counter؛ یکتایی code در مجموعه؛ menu_mode=all/selected؛ شماره عددی میز یک ویژگی سازگاری است |
| service_point_menus | business_id، service_point_id، menu_id، sort_order | فقط در حالت selected؛ FKها همگی داخل همان Business |
| qr_links | token، business_id، service_point_id، enabled، created_at | token تصادفی حداقل ۱۲۸ بیت؛ هیچ menu_id ندارد؛ QR مجوز کارکنان یا توکن سفارش نیست |

آدرس هدف GitHub Pages: `https://maxlightner.github.io/menosaz/?q=<token>`. چاپ QR با عرض مناسب و حداقل حاشیه ۴ ماژول؛ اندازه نهایی چاپ با اسکن دستگاه واقعی کنترل می‌شود. تولید شناسه و حاشیه/ابعاد خروجی جدا از سیاست نمایش منوست.

الگوریتم نمایش: کسب‌وکار و نقطه فعال ← all یا selected ← فقط published ← پنجره‌های زمانی مجاز ← ترتیب مشخص. صفر منو: پیام ساعت فعالیت و پشتیبانی؛ یک منو: بدون سربرگ اضافه؛ چند منو: سربرگ بالای دسته‌ها. پایان ساعت، سفارش ثبت‌شده را لغو نمی‌کند؛ ثبت تازه دوباره در سرور بررسی می‌شود.

schedule_mode=always پیش‌فرض است؛ scheduled بدون بازه معتبر قابل انتشار نیست. بازه از شروع شامل و در انتها غیرشامل است؛ بازه شبانه به روز شروع تعلق دارد. در چند دقیقه/روز هم‌پوشان منو فقط یک بار ظاهر می‌شود. رابط ساده فقط «همیشه» یا «روزها و ساعت» را نشان می‌دهد.

## ۵. نشست مهمان و سفارش

| موجودیت | فیلدهای اصلی | قاعده |
|---|---|---|
| service_sessions | business_id، id، service_point_id، status، opened_at، closed_at، expires_at | حداکثر یک نشست باز در هر نقطه با unique شرطی؛ نشست جاری پس از پایان به مهمان بعد منتقل نمی‌شود |
| session_guests | business_id، id، session_id، token_hash، expires_at، revoked_at | مرورگر مهمان بدون حساب؛ توکن خام فقط نزد مهمان؛ QR ثابت این توکن نیست |
| orders | business_id، id، session_id، service_point_id، guest_id، source، status، number، version، total_toman، idempotency_key، request_hash | سفارش فعلی source=onsite؛ FK نشست و نقطه یکسان؛ شماره با شمارنده تراکنشی، نه count+1 |
| order_items | business_id، id، order_id، product_id nullable، menu_id_snapshot، name_snapshot، unit_price_toman، quantity، unit_snapshot، note، waiter_note، line_total_toman، kitchen_status، delivered_quantity | snapshot تاریخی مستقل از ویرایش محصول؛ محصول قدیمی حذف‌شده می‌تواند مرجع null با نام اصلی داشته باشد |
| order_item_options | business_id، id، item_id، option_id nullable، group_snapshot، name_snapshot، extra_price_toman | گزینه و قیمت فقط از منبع معتبر هنگام ثبت گرفته می‌شوند |
| order_events | business_id، id، order_id، sequence، actor_type، actor_id، action، before_version، after_version، data، created_at | append-only؛ بدون OTP، توکن خام یا کل snapshot خصوصی غیرضروری |
| order_payment_entries | business_id، id، order_id، kind، method، amount_toman، actor_id، idempotency_key، created_at | دفتر دریافت/برگشت وجه غذا؛ kind=receipt/refund؛ مستقل از اشتراک سایت |
| service_requests | business_id، id، session_id، service_point_id، guest_id، type، message، status، assigned_user_id، created_at، resolved_at | نوع waiter/cashier/manager/utensils/custom؛ pending/accepted/resolved/cancelled |

ثبت سفارش جدید اتمی است: نشست معتبر، مجوز مهمان، منو/دسته/محصول مجاز، ساعت، گزینه‌ها، تعداد و قیمت بررسی؛ سپس سفارش، اقلام و رویداد با هم ثبت می‌شوند. یک idempotency_key با بدنه متفاوت خطای تعارض می‌دهد؛ با همان بدنه همان نتیجه قبلی را برمی‌گرداند.

مهمان فقط سفارش‌های متعلق به guest_id خودش را می‌بیند. نمایش مشترک همه سفارش‌های میز نیاز به قابلیت اشتراک نشست جداگانه دارد و فعلاً مجاز نیست. نشست بسته توکن تازه نمی‌دهد؛ قطع اینترنت اجازه ثبت قطعی محلی یا پرداخت ساختگی نمی‌دهد.

در بازکردن نشست، سرور زیر قفل همان نقطه نشست باز را پیدا یا ایجاد می‌کند؛ مرورگر تازه مهمان تازه می‌گیرد و سابقه مهمان قبلی را به ارث نمی‌برد. پایان عادی نشست توسط کارکنان بعد از تعیین تکلیف سفارش‌هاست؛ expires_at فقط برای نشست رهاشده و طبق سیاست مجموعه است، نه لغو خودکار سفارش پرداخت‌شده. پیگیری سفارش قبلی با توکن خودش و مهلت مشخص همچنان ممکن است، اما ثبت تازه در نشست بسته ممنوع است.

## ۶. پلتفرم و داده‌های مستقل

- plans + plan_entitlements: شناسه پایدار طرح و قابلیت/سقف آن؛ مقدار null برای نامحدود. پلن کپیِ جداگانه منو یا دیتابیس ایجاد نمی‌کند.
- business_subscriptions: کسب‌وکار، طرح، بازه اعتبار و وضعیت؛ سقف محصول/نقطه روی کل کسب‌وکار اعمال می‌شود. اطلاعات منتشرشده پیشین بالای سقف بی‌صدا حذف نمی‌شوند؛ ایجاد تازه تا ارتقا محدود می‌شود.
- platform_payments: خریدار، business_id، service_code، plan_id اختیاری، amount_toman، authority، gateway_amount_rial، status و request_id یکتا. service_code فعلی فقط subscription؛ افزودن چاپ/تبلیغ آینده بدون یکی‌کردن آن با پرداخت غذا.
- platform_payment_events: درخواست/تأیید/لغو append-only و جلوگیری از اثر دوباره callback.
- business_messages + message_receipts: پیام ادمین و وضعیت خواندن هر گیرنده؛ پیام عمومی برای گیرنده‌های زمان ارسال ثبت می‌شود.
- platform_content: تصاویر صفحه اول و مشخصات نمونه‌ها، جدا از کسب‌وکار پیچ شمرون؛ ویرایش فقط ادمین سیستم. فایل‌های آن در فضای رسانه عمومی پلتفرم با سیاست جداست.
- presence: heartbeat کم‌حجم، visitor و user اختیاری و آخرین زمان؛ آمار فعال پنج‌دقیقه‌ای حفظ می‌شود و با تعداد افراد یکتا اشتباه گرفته نمی‌شود.
- audit_log: ثبت عملیات کارکنان/ادمین، تغییر نقش، انتشار، حذف منطقی و اصلاح مالی؛ append-only و محدود به مجوز خواندن.
- جدول‌های OTP و rate limit موجود بازاستفاده می‌شوند؛ بخشی از داده منو نیستند.

داده‌هایی که هنوز محل انتقال قطعی ندارند در staging خصوصی گزارش می‌شوند؛ نه داخل payload عملیاتی جدید و نه با حذف خاموش.
