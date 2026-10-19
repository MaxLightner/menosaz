import {catalogImagePath} from '../lib/imagePath';
import {CLOUD_API} from '../services/cloudConfig';
import {addCartItem,type CartItem} from '../lib/cart';
import {viewFromSearch} from '../lib/navigation';
import {orderAlerts,type AlertSnapshot} from '../lib/orderAlerts';
import {ensureGuestSession,savedGuestSession,resetGuestSession} from '../services/guestSession';
import {incomingNotice} from '../lib/notifications';
import {api,BACKEND} from '../services/backend';
import type {MenuDefinition,Category} from '../types';
import {commandBody,type PendingCommand} from '../services/catalog';
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  Business,
  Product,
  ServicePoint,
  Order,

  AppView,
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  OrderItemOption,
  ServiceCall
} from '../types';
import {INITIAL_BUSINESS} from '../services/seedData';


interface AppContextType {
  syncError:string;lastSyncedAt:number|null;refreshWorkspace:()=>void;
  menuMessage:string;guestSessionClosed:boolean;startNewGuestSession:()=>void;
  categories:Category[];
  hasAnyProducts:boolean;
  menus:MenuDefinition[];activeMenuId:string;setActiveMenuId:(id:string)=>void;createMenu:(name:string,kind:string)=>Promise<MenuDefinition>;assignProductMenu:(id:string,menuId:string)=>Promise<void>;
  submitToKitchen:(id:string)=>Promise<void>;
  confirmKitchen:(id:string)=>Promise<void>;
  markDelivered:(id:string)=>Promise<void>;
  removeOrderItem:(id:string,itemId:string)=>Promise<void>;
  setItemWaiterNote:(id:string,itemId:string,note:string)=>Promise<void>;
  setCartNotes:(id:string,note:string)=>void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  business: Business;
  updateBusinessSettings: (partial: Partial<Business>) => Promise<void>;
  products: Product[];
  updateProductImage:(id:string,dataUrl:string)=>Promise<void>;
  updateProductPrice: (productId: string, newPrice: number) => Promise<void>;
  toggleProductAvailability: (productId: string, isAvailable: boolean, reason?: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'businessId' | 'updatedAt'>) => Promise<string>;
  servicePoints: ServicePoint[];
  toggleTableOccupancy: (tableNumber: number, isOccupied: boolean) => Promise<void>;
  orders: Order[];
  createOrder: (tableNumber: number, customerName: string, customerNotes: string, items: CartItem[],businessId?:string) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateDeliveryStatus: (orderId: string, deliveryStatus: DeliveryStatus) => Promise<void>;
  updatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
  selectedTableNumber: number;
  setSelectedTableNumber: (num: number) => void;
  // Customer Cart
  cart: CartItem[];
  addToCart: (product: Product, options?: OrderItemOption[], notes?: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  // B2B Marketplace
  // Table Service Calls (Call waiter, request bill)
  serviceCalls: ServiceCall[];
  createServiceCall: (tableNumber: number, type: 'waiter' | 'bill' | 'napkin' | 'custom', message?: string) => Promise<string>;
  resolveServiceCall: (callId: string) => Promise<void>;
  // Offline Persistence & Network
  isNetworkOnline: boolean;
  // UI Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
  isServerConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories,setCategories]=useState<Category[]>([]);
  const pendingMenu=useRef<PendingCommand>(null);
  const [menus,setMenus]=useState<MenuDefinition[]>([{id:'main',name:'رستوران',kind:'restaurant',published:true}]);
  const [activeMenuId,setMenuId]=useState(new URLSearchParams(window.location.search).get('menu')||'main');
  function setActiveMenuId(id:string){setMenuId(id); }
  async function createMenu(name:string,kind:string){const clean=name.trim();if(!clean)throw Error('نام منو را وارد کن.');const m=await api<MenuDefinition>('/menus',commandBody({name:clean,kind},pendingMenu));pendingMenu.current=null;setMenus(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);setActiveMenuId(m.id);window.dispatchEvent(new Event('workspace-auth'));showToast(`منوی «${m.name}» ساخته شد.`);return m;}
  async function assignProductMenu(id:string,menuId:string){const p=await api<Product>('/products/'+id,{menuId},'PATCH');setProducts(prev=>prev.map(v=>v.id===id?p:v));}
  const [currentView, setViewState] = useState<AppView>(() => {
    const view = new URLSearchParams(window.location.search).get('q')?'customer':new URLSearchParams(window.location.search).get('view') as AppView;
    return ['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen'].includes(view) ? view : 'website';
  });
  const setCurrentView=useCallback((view:AppView)=>{const url=new URL(location.href);const old=url.searchParams.has('q')?'customer':url.searchParams.get('view')||'website';if(old!==view){history.replaceState({...history.state,scrollY:window.scrollY},'',location.href);url.searchParams.set('view',view);url.hash='';if(view!=='customer'){url.searchParams.delete('q');url.searchParams.delete('preview');}history.pushState({scrollY:0},'',url);window.scrollTo({top:0,behavior:'instant'});}setViewState(view);},[]);
  useEffect(()=>{const onSitePop=(event:PopStateEvent)=>{const params=new URLSearchParams(location.search),v=(params.has('q')?'customer':params.get('view')||'website') as AppView;if(['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen'].includes(v)){setViewState(v);requestAnimationFrame(()=>window.scrollTo({top:event.state?.scrollY||0,behavior:'instant'}));}};window.addEventListener('popstate',onSitePop);return()=>window.removeEventListener('popstate',onSitePop);},[]);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(() => {
    const table = Number(new URLSearchParams(window.location.search).get('table'));
    return Number.isInteger(table) && table > 0 ? table : 4;
  });
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);
  const [syncError,setSyncError]=useState(''),[lastSyncedAt,setLastSyncedAt]=useState<number|null>(null);
  const refreshWorkspace=useCallback(()=>window.dispatchEvent(new Event('workspace-auth')),[]);
  const [menuMessage,setMenuMessage]=useState(''),[guestSessionClosed,setGuestSessionClosed]=useState(false);
  const workspaceGeneration=useRef(0);
  const alertSnapshots=useRef(new Map<string,AlertSnapshot>());
  const commandCache=useRef(new Map<string,{signature:string;key:string}>());

  const [business,setBusiness]=useState<Business>(INITIAL_BUSINESS);
  const [products,setProducts]=useState<Product[]>([]);
  const [servicePoints,setServicePoints]=useState<ServicePoint[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [serviceCalls,setServiceCalls]=useState<ServiceCall[]>([]);
  const [cart,setCart]=useState<CartItem[]>([]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  }, []);

  // Online / Offline Network detection
  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      showToast('اتصال اینترنت برقرار است (آنلاین)');
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
      showToast('اینترنت قطع است؛ ثبت سفارش و تغییرات تا اتصال دوباره امکان‌پذیر نیست.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Read URL query params on mount for direct table link testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = (params.has('q')?'customer':params.get('view')) as AppView | null;
    const tableParam = params.get('table');
    if (viewParam && ['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen'].includes(viewParam)) {
      setCurrentView(viewParam);
    }
    if (tableParam) {
      const num = parseInt(tableParam, 10);
      if (!isNaN(num) && num > 0) {
        setSelectedTableNumber(num);
      }
    }
  }, []);

  useEffect(()=>{
    if(!BACKEND)return;let stopped=false,revision=0,fetching=false;
    async function sync(){if(fetching)return;fetching=true;const request=++revision,generation=workspaceGeneration.current;try{
      const publicView=['customer','website','how','terms'].includes(currentView);
      const b=new URLSearchParams(window.location.search).get('business')||business.id;
      const params=new URLSearchParams(window.location.search);
      const fromPoint=currentView==='customer';
      const data=await api(publicView?(fromPoint?'/public/resolve?'+new URLSearchParams({...(params.get('q')?{q:params.get('q')!}:{business:b,table:String(selectedTableNumber)}),tab:activeMenuId}).toString():'/public/menu?business='+encodeURIComponent(b)+'&menu='+encodeURIComponent(activeMenuId)):'/workspace');
      if(publicView&&currentView==='customer'){
        let guest=data.servicePoint?savedGuestSession(data.business.id,data.servicePoint.id):null;
        const scanned=params.has('q')||(params.get('view')==='customer'&&!params.has('preview')&&params.has('business')&&params.has('table'));
        if(scanned&&data.servicePoint&&!guest?.sessionId){try{guest=await ensureGuestSession(data.business.id,data.servicePoint.id,data.servicePoint.tableNumber);}catch(error){if((error as any).code==='SESSION_CLOSED')data.closed=true;else throw error;}}
        if(guest?.sessionId){try{const status=await api('/sessions/status',guest);data.orders=status.orders;data.notices=status.notices;data.closed=status.status==='closed';}catch(error){if((error as any).code==='SESSION_INVALID')data.closed=true;else throw error;}}else{const grants=JSON.parse(sessionStorage.getItem('menosaz-guest-grants')||'[]');if(grants.length)data.orders=await api('/order-status',{grants});}
      }
      if(stopped||request!==revision||generation!==workspaceGeneration.current)return;
      if(data.activeMenuId&&data.activeMenuId!==activeMenuId)setMenuId(data.activeMenuId);
      if(data.servicePoint?.tableNumber&&data.servicePoint.tableNumber!==selectedTableNumber)setSelectedTableNumber(data.servicePoint.tableNumber);
      setMenuMessage(data.message||'');setGuestSessionClosed(data.closed===true);
      const alertScope=currentView+':'+data.business.id+':'+(data.servicePoint?.id||'');
      for(const alert of orderAlerts(currentView,alertSnapshots.current.get(alertScope)||null,data))incomingNotice(alert.id,alert.message);
      alertSnapshots.current.set(alertScope,{orders:data.orders,serviceCalls:data.serviceCalls,servicePoints:data.servicePoints,notices:data.notices});
      setBusiness(data.business);setProducts(data.products);setMenus(data.menus);setCategories(data.categories||[]);
      setOrders(data.orders||[]);setServicePoints(data.servicePoints||[]);setServiceCalls(data.serviceCalls||[]);setIsServerConnected(true);setSyncError('');setLastSyncedAt(Date.now());
      if(!publicView&&data.menus?.length&&!data.menus.some((m:MenuDefinition)=>m.id===activeMenuId))setMenuId(data.menus[0].id);
    }catch(error){if(!stopped&&request===revision&&generation===workspaceGeneration.current){setIsServerConnected(false);setSyncError((error as Error).message||'ارتباط با سرور قطع شد');if(currentView==='customer'){setMenuMessage((error as Error).message);}if((error as any).status===401||(error as any).status===403){setOrders([]);setProducts([]);setMenus([]);setCategories([]);setServicePoints([]);setServiceCalls([]);}}}finally{fetching=false;}}
    const visible=()=>{if(document.visibilityState==='visible')sync();};
    sync();const t=setInterval(sync,2500);window.addEventListener('workspace-auth',sync);window.addEventListener('online',sync);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',visible);
    return()=>{stopped=true;clearInterval(t);window.removeEventListener('workspace-auth',sync);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',visible);};
  },[activeMenuId,currentView,selectedTableNumber]);
  useEffect(()=>{if(!BACKEND)return;const clear=()=>{workspaceGeneration.current++;alertSnapshots.current.clear();setOrders([]);setProducts([]);setMenus([]);setCategories([]);setServicePoints([]);setServiceCalls([]);setCart([]);setIsServerConnected(false);for(const key of ['orders','products','business','servicePoints','serviceCalls'])localStorage.removeItem('menuyar_state_v1_'+key);};window.addEventListener('workspace-clear',clear);return()=>window.removeEventListener('workspace-clear',clear);},[]);
  const pendingGuest=useRef<{signature:string;token:string;key:string}|null>(null);
  async function remoteOrder(id:string,action:string,itemId?:string,note?:string){const current=orders.find(o=>o.id===id);if(!current?.version)throw Error('سفارش را دوباره بارگذاری کن');const body={action,itemId,note,expectedVersion:current.version},signature=JSON.stringify(body);let pending=commandCache.current.get(id);if(pending?.signature!==signature){pending={signature,key:crypto.randomUUID()};commandCache.current.set(id,pending);}const o=await api<Order>('/orders/'+id+'/action',{...body,idempotencyKey:pending.key});commandCache.current.delete(id);setOrders(prev=>prev.map(v=>v.id===id?o:v));}
  // Update business settings
  const updateBusinessSettings = async (partial: Partial<Business>) => {
    if(['menuPalette','menuPaper','menuBackgroundImage'].some(k=>k in partial)){const menu=await api<MenuDefinition>('/menus/'+activeMenuId,{appearance:partial},'PATCH');setMenus(prev=>prev.map(m=>m.id===menu.id?menu:m));}else setBusiness(await api<Business>('/business',partial,'PATCH'));showToast('تنظیمات ذخیره شد');return;
  };
  // All writes are acknowledged by the same Supabase command API.
  async function updateProductImage(id:string,image:string){
    let imageUrl=image,customImage=false;
    if(image.startsWith('data:')){
      const uploaded=await api<{imageUrl:string}>('/product-images',{dataUrl:image});
      imageUrl=uploaded.imageUrl;customImage=true;
    }else if(/^https:\/\//.test(image)){
      const address=new URL(image);
      const storageRoot=new URL(CLOUD_API).origin;
      if(address.origin!==storageRoot || !address.pathname.startsWith('/storage/v1/object/public/menu-images/'))
        throw Error('این تصویر از گالری مجاز نیست.');
      // The server still checks media_assets.business_id for the active restaurant.
      customImage=true;
    }else if(!/^\/(?:media|menu-assets)\/[a-zA-Z0-9._-]+$/.test(image))
      throw Error('عکس انتخاب‌شده معتبر نیست.');
    const p=await api<Product>('/products/'+id,{imageUrl,customImage},'PATCH');
    setProducts(prev=>prev.map(v=>v.id===id?p:v));
    showToast('تصویر آیتم ذخیره شد');
  }
  const updateProductPrice = async (productId: string, newPrice: number) => {
    const p=await api<Product>('/products/'+productId,{price:newPrice},'PATCH');setProducts(prev=>prev.map(v=>v.id===productId?p:v));showToast('قیمت ذخیره شد');return;
  };
  // Toggle availability (out of stock / in stock)
  const toggleProductAvailability = async (productId: string, isAvailable: boolean, reason?: string) => {
    try{const p=await api<Product>('/products/'+productId,{isAvailable,outOfStockReason:reason||''},'PATCH');setProducts(prev=>prev.map(v=>v.id===productId?p:v));showToast('موجودی ذخیره شد');}catch(e){showToast((e as Error).message||'موجودی ذخیره نشد');}return;
  };
  // Add new food item
  const addProduct = async (productData: Omit<Product, 'id' | 'businessId' | 'updatedAt'>): Promise<string> => {
    if(productData.imageUrl.startsWith('data:')){const uploaded=await api<{imageUrl:string}>('/product-images',{dataUrl:productData.imageUrl});productData={...productData,imageUrl:uploaded.imageUrl,customImage:true};}const p=await api<Product>('/products',{...productData,imageUrl:catalogImagePath(productData.imageUrl),menuId:activeMenuId});setProducts(prev=>[p,...prev]);return p.id;
  };
  // Toggle table occupancy
  const toggleTableOccupancy = async (tableNumber: number, isOccupied: boolean) => {
    try{const p=await api<ServicePoint>('/tables/'+tableNumber,{isOccupied},'PATCH');setServicePoints(prev=>prev.map(v=>v.tableNumber===tableNumber?p:v));}catch(e){showToast((e as Error).message);}return;
  };
  // 2. Customer places order (Snapshot pricing, Idempotency, and Real-time Broadcast)
  const createOrder = async (
    tableNumber: number,
    customerName: string,
    customerNotes: string,
    items: CartItem[],
    orderBusinessId:string='pich-shemroon'
  ): Promise<string> => {
    if(orderBusinessId.startsWith('demo-'))throw Error('این منو نمونه است؛ برای دریافت سفارش آن را در حساب خودت بساز.');
const point=servicePoints.find(p=>p.tableNumber===tableNumber);if(!point)throw Error('سرویس‌پوینت پیدا نشد');const guest=await ensureGuestSession(business.id,point.id,tableNumber);const signature=JSON.stringify([guest.sessionId,tableNumber,customerName,customerNotes,items]);if(pendingGuest.current?.signature!==signature)pendingGuest.current={signature,token:guest.guestToken,key:crypto.randomUUID()};const grant=pendingGuest.current;const o=await api<Order>('/orders',{businessId:business.id,sessionId:guest.sessionId,tableNumber,customerName,customerNotes,idempotencyKey:grant.key,guestToken:guest.guestToken,items:items.map(i=>({productId:i.product.id,quantity:i.quantity,notes:i.notes,selectedOptions:i.selectedOptions}))});pendingGuest.current=null;setOrders(prev=>prev.some(x=>x.id===o.id)?prev:[...prev,o]);setCart([]);showToast('سفارش ثبت شد');return o.id;
  };
  // 3. Waiter approves order (pending_waiter -> cooking) or Kitchen sets ready
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await remoteOrder(orderId,status==='cooking'?'send':status==='ready'?'confirm':status==='delivered'?'deliver':'unsupported');return;
  };
  // Service Calls (Call Waiter / Request Bill)
  const createServiceCall = async (
    tableNumber: number,
    type: 'waiter' | 'bill' | 'napkin' | 'custom',
    message?: string
  ): Promise<string> => {
    const point=servicePoints.find(p=>p.tableNumber===tableNumber);if(!point)throw Error('سرویس‌پوینت پیدا نشد');const guest=await ensureGuestSession(business.id,point.id,tableNumber);const call=await api<ServiceCall>('/calls',{...guest,type:type==='bill'?'cashier':type==='napkin'?'utensils':type,message});setServiceCalls(prev=>prev.some(c=>c.id===call.id)?prev:[call,...prev]);showToast('درخواستت برای گارسون ثبت شد');return call.id;
  };
  const resolveServiceCall = async (callId: string) => {
    const c=await api<ServiceCall>('/calls/'+callId,{},'PATCH');setServiceCalls(prev=>prev.map(v=>v.id===callId?c:v));return;
  };
  // Delivery is checked by the server after payment and kitchen approval.
  const updateDeliveryStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
    await remoteOrder(orderId,'deliver');return;
  };
  // 5. Staff marks payment / settlement
  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    showToast('دریافت وجه را همراه ارسال در نسخه گارسون ثبت کن');return;
  };
  // Cart operations
  const addToCart = (product: Product, options?: OrderItemOption[], notes?: string) => {
    setCart(prev=>addCartItem(prev,product,options,notes));
    showToast(`«${product.name}» به سبد سفارش اضافه شد`);
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === cartItemId) {
          const newQ = item.quantity + delta;
          if (newQ <= 0) return null;
          const extraPrice = item.selectedOptions ? item.selectedOptions.reduce((s, o) => s + o.extraPrice, 0) : 0;
          const unitPrice = item.product.price + extraPrice;
          return {
            ...item,
            quantity: newQ,
            itemTotal: newQ * unitPrice,
          };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.id !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + item.itemTotal, 0);

  async function submitToKitchen(id:string){await remoteOrder(id,'send');return;}
  async function confirmKitchen(id:string){await remoteOrder(id,'confirm');return;}
  async function markDelivered(id:string){await remoteOrder(id,'deliver');return;}
  async function removeOrderItem(id:string,itemId:string){await remoteOrder(id,'remove',itemId);return;}
  async function setItemWaiterNote(id:string,itemId:string,note:string){await remoteOrder(id,'note',itemId,note);return;}
  function startNewGuestSession(){const point=servicePoints.find(p=>p.tableNumber===selectedTableNumber);if(!point)return;resetGuestSession(business.id,point.id);try{const old=JSON.parse(sessionStorage.getItem('menosaz-guest-grants')||'[]');sessionStorage.setItem('menosaz-guest-grants',JSON.stringify(old.filter((g:any)=>g.businessId!==business.id)));}catch{}pendingGuest.current=null;setCart([]);setOrders([]);setGuestSessionClosed(false);showToast('می‌توانی سفارش تازه ثبت کنی.');window.dispatchEvent(new Event('workspace-auth'));}
  const setCartNotes=(id:string,note:string)=>setCart(prev=>prev.map(c=>c.id===id?{...c,notes:note.slice(0,500)}:c));

  return (
    <AppContext.Provider
      value={{
        syncError,lastSyncedAt,refreshWorkspace,
        categories:categories.filter(c=>!c.menuId||c.menuId===activeMenuId),
        submitToKitchen,confirmKitchen,markDelivered,removeOrderItem,setItemWaiterNote,setCartNotes,
        currentView,
        setCurrentView,
        business:{...business,...menus.find(m=>m.id===activeMenuId)?.appearance},
        updateBusinessSettings,
        menuMessage,guestSessionClosed,startNewGuestSession,menus,activeMenuId,setActiveMenuId,createMenu,assignProductMenu,
        hasAnyProducts:products.some(p=>(p.menuId||'main')===activeMenuId),
        products:products.filter(p=>(p.menuId||'main')===activeMenuId),
        updateProductImage,updateProductPrice,
        toggleProductAvailability,
        addProduct,
        servicePoints,
        toggleTableOccupancy,
        orders,
        createOrder,
        updateOrderStatus,
        updateDeliveryStatus,
        updatePaymentStatus,
        selectedTableNumber,
        setSelectedTableNumber,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        serviceCalls,
        createServiceCall,
        resolveServiceCall,

        toastMessage,
        showToast,

        isServerConnected,
        isNetworkOnline,

      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

