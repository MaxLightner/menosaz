import {orderAlerts,type AlertSnapshot} from '../lib/orderAlerts';
import {ensureGuestSession,savedGuestSession,resetGuestSession} from '../services/guestSession';
import {incomingNotice} from '../lib/notifications';
import {api,BACKEND} from '../services/backend';
import type {MenuDefinition,Category} from '../types';
import {commandBody,type PendingCommand} from '../services/catalog';
import {canDeliver,canConfirmKitchen} from '../lib/orderRules';
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { 
  Business, 
  Product, 
  ServicePoint, 
  Order, 
  SupplierListing, 
  PurchaseOrder, 
  AppView, 
  OrderStatus, 
  DeliveryStatus, 
  PaymentStatus,
  OrderItem,
  OrderItemOption,
  ServiceCall
} from '../types';
import { 
  INITIAL_BUSINESS, 
  INITIAL_PRODUCTS, 
  INITIAL_SERVICE_POINTS, 
  INITIAL_ORDERS, 
  INITIAL_SUPPLIER_LISTINGS 
} from '../services/seedData';
import { db, handleFirestoreError, OperationType, enableNetwork, disableNetwork } from '../services/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDocs,
  writeBatch
} from 'firebase/firestore';

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions?: OrderItemOption[];
  notes?: string;
  itemTotal: number;
}

interface AppContextType {
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
  supplierListings: SupplierListing[];
  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (listingId: string, quantity: number) => Promise<void>;
  // Table Service Calls (Call waiter, request bill)
  serviceCalls: ServiceCall[];
  createServiceCall: (tableNumber: number, type: 'waiter' | 'bill' | 'napkin' | 'custom', message?: string) => Promise<string>;
  resolveServiceCall: (callId: string) => Promise<void>;
  playChime: (type?: 'order' | 'call' | 'ready') => void;
  // Offline Persistence & Network
  isNetworkOnline: boolean;
  isSimulatingOffline: boolean;
  toggleSimulateOffline: () => Promise<void>;
  // UI Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
  resetToSeed: () => Promise<void>;
  isFirebaseConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_PREVIEW=import.meta.env.VITE_LOCAL_PREVIEW==='true';
const LOCAL_STORAGE_KEY = LOCAL_PREVIEW?'menosaz_local_preview_v2':'menuyar_state_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories,setCategories]=useState<Category[]>([]);
  const pendingMenu=useRef<PendingCommand>(null);
  const [menus,setMenus]=useState<MenuDefinition[]>([{id:'main',name:'رستوران',kind:'restaurant',published:true}]);
  const [activeMenuId,setMenuId]=useState(new URLSearchParams(window.location.search).get('menu')||'main');
  function setActiveMenuId(id:string){setMenuId(id); }
  async function createMenu(name:string,kind:string){const clean=name.trim();if(!clean)throw Error('نام منو را وارد کن.');const m=await api<MenuDefinition>('/menus',commandBody({name:clean,kind},pendingMenu));pendingMenu.current=null;setMenus(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);setActiveMenuId(m.id);window.dispatchEvent(new Event('workspace-auth'));showToast(`منوی «${m.name}» ساخته شد.`);return m;}
  async function assignProductMenu(id:string,menuId:string){const p=await api<Product>('/products/'+id,{menuId},'PATCH');setProducts(prev=>prev.map(v=>v.id===id?p:v));}
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const view = new URLSearchParams(window.location.search).get('q')?'customer':new URLSearchParams(window.location.search).get('view') as AppView;
    return ['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen','test-guide'].includes(view) ? view : 'website';
  });
  useEffect(()=>{const onSitePop=()=>{const v=new URLSearchParams(window.location.search).get('view') as AppView;if(['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen'].includes(v))setCurrentView(v);};window.addEventListener('popstate',onSitePop);return()=>window.removeEventListener('popstate',onSitePop);},[]);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(() => {
    const table = Number(new URLSearchParams(window.location.search).get('table'));
    return Number.isInteger(table) && table > 0 ? table : 4;
  });
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [menuMessage,setMenuMessage]=useState(''),[guestSessionClosed,setGuestSessionClosed]=useState(false);
  const workspaceGeneration=useRef(0);
  const commandCache=useRef(new Map<string,{signature:string;key:string}>());

  // Core Data States
  const [business, setBusiness] = useState<Business>(() => {
    if(BACKEND)return INITIAL_BUSINESS;
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_business`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === 'pich-shemroon') return parsed;
      } catch {}
    }
    return INITIAL_BUSINESS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if(BACKEND)return [];
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_products`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.businessId === 'pich-shemroon') {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_PRODUCTS;
  });

  const [servicePoints, setServicePoints] = useState<ServicePoint[]>(() => {
    if(BACKEND)return [];
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_servicePoints`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.businessId === 'pich-shemroon') {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_SERVICE_POINTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    if(BACKEND)return [];
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_orders`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.businessId === 'pich-shemroon') {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_ORDERS;
  });

  const [supplierListings, setSupplierListings] = useState<SupplierListing[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_supplierListings`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_LISTINGS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Table Service Calls State (Waiters, Bill Requests, Assistance)
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>(() => {
    if(BACKEND)return [];
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_serviceCalls`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [
      {
        id: 'call-sample-1',
        tableNumber: 4,
        type: 'waiter',
        message: 'درخواست حضور سالن‌دار جهت راهنمایی سفارش',
        status: 'pending',
        createdAt: new Date(Date.now() - 3 * 60000).toISOString()
      }
    ];
  });

  const playChime = useCallback((type: 'order' | 'call' | 'ready' = 'order') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'call') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'ready') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  }, []);

  useEffect(() => {
    if(BACKEND)return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_serviceCalls`, JSON.stringify(serviceCalls));
  }, [serviceCalls]);

  // Save to LocalStorage for persistence across full page reloads
  useEffect(() => {
    if(BACKEND)return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_business`, JSON.stringify(business));
  }, [business]);

  useEffect(() => {
    if(BACKEND)return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if(BACKEND)return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_servicePoints`, JSON.stringify(servicePoints));
  }, [servicePoints]);

  useEffect(() => {
    if(BACKEND)return;
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_orders`, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_supplierListings`, JSON.stringify(supplierListings));
  }, [supplierListings]);

  // Online / Offline Network detection
  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      showToast('اتصال اینترنت برقرار است (آنلاین)');
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
      showToast('هشدار: ارتباط شبکه قطع شد؛ کیوسک با کش پایدار آفلاین فعال است.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const toggleSimulateOffline = async () => {
    if(LOCAL_PREVIEW){setIsSimulatingOffline(!isSimulatingOffline);return;}
    try {
      if (isSimulatingOffline) {
        await enableNetwork(db);
        setIsSimulatingOffline(false);
        setIsNetworkOnline(true);
        showToast('اتصال شبکه مجدداً برقرار شد؛ همگام‌سازی بلادرنگ با کلود فعال است.');
      } else {
        await disableNetwork(db);
        setIsSimulatingOffline(true);
        setIsNetworkOnline(false);
        showToast('شبیه‌سازی قطعی وای‌فای آشپزخانه فعال شد (کار کاملاً بر مبنای کش پایدار IndexedDB)');
      }
    } catch (err) {
      console.warn("Error toggling network state:", err);
    }
  };

  // Read URL query params on mount for direct table link testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = (params.has('q')?'customer':params.get('view')) as AppView | null;
    const tableParam = params.get('table');
    if (viewParam && ['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen','test-guide'].includes(viewParam)) {
      setCurrentView(viewParam);
    }
    if (tableParam) {
      const num = parseInt(tableParam, 10);
      if (!isNaN(num) && num > 0) {
        setSelectedTableNumber(num);
      }
    }
  }, []);


  useEffect(()=>{if(BACKEND||!LOCAL_PREVIEW)return;const receive=(e:StorageEvent)=>{if(!e.newValue)return;try{const data=JSON.parse(e.newValue);if(e.key===LOCAL_STORAGE_KEY+'_orders')setOrders(prev=>JSON.stringify(prev)===e.newValue?prev:data);if(e.key===LOCAL_STORAGE_KEY+'_serviceCalls')setServiceCalls(prev=>JSON.stringify(prev)===e.newValue?prev:data);if(e.key===LOCAL_STORAGE_KEY+'_products')setProducts(prev=>JSON.stringify(prev)===e.newValue?prev:data);if(e.key===LOCAL_STORAGE_KEY+'_business')setBusiness(prev=>JSON.stringify(prev)===e.newValue?prev:data);}catch{}};window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);},[]);

  useEffect(()=>{
    if(!BACKEND)return;let stopped=false,revision=0,fetching=false;let previous:AlertSnapshot|null=null;
    async function sync(){if(fetching)return;fetching=true;const request=++revision,generation=workspaceGeneration.current;try{
      const publicView=['customer','website','how','terms'].includes(currentView);
      const b=new URLSearchParams(window.location.search).get('business')||business.id;
      const params=new URLSearchParams(window.location.search);
      const fromPoint=currentView==='customer';
      const data=await api(publicView?(fromPoint?'/public/resolve?'+new URLSearchParams({...(params.get('q')?{q:params.get('q')!}:{business:b,table:String(selectedTableNumber)}),tab:activeMenuId}).toString():'/public/menu?business='+encodeURIComponent(b)+'&menu='+encodeURIComponent(activeMenuId)):'/workspace');
      if(data.activeMenuId&&data.activeMenuId!==activeMenuId)setMenuId(data.activeMenuId);
      if(data.servicePoint?.tableNumber&&data.servicePoint.tableNumber!==selectedTableNumber)setSelectedTableNumber(data.servicePoint.tableNumber);
      if(publicView&&currentView==='customer'){
        const guest=data.servicePoint?savedGuestSession(data.business.id,data.servicePoint.id):null;
        if(guest?.sessionId){try{const status=await api('/sessions/status',guest);data.orders=status.orders;data.notices=status.notices;data.closed=status.status==='closed';}catch(error){if((error as any).code==='SESSION_INVALID')data.closed=true;else throw error;}}else{const grants=JSON.parse(sessionStorage.getItem('menosaz-guest-grants')||'[]');if(grants.length)data.orders=await api('/order-status',{grants});}
      }
      if(stopped||request!==revision||generation!==workspaceGeneration.current)return;
      setMenuMessage(data.message||'');setGuestSessionClosed(data.closed===true);
      for(const alert of orderAlerts(currentView,previous,data))incomingNotice(alert.id,alert.message);
      previous={orders:data.orders,serviceCalls:data.serviceCalls,servicePoints:data.servicePoints,notices:data.notices};
      setBusiness(data.business);setProducts(data.products);setMenus(data.menus);setCategories(data.categories||[]);
      setOrders(data.orders||[]);setServicePoints(data.servicePoints||[]);setServiceCalls(data.serviceCalls||[]);setIsFirebaseConnected(true);
      if(!publicView&&data.menus?.length&&!data.menus.some((m:MenuDefinition)=>m.id===activeMenuId))setMenuId(data.menus[0].id);
    }catch(error){if(!stopped&&request===revision){setIsFirebaseConnected(false);if(currentView==='customer'){setMenuMessage((error as Error).message);setProducts([]);setMenus([]);setCategories([]);}if((error as any).status===401||(error as any).status===403){setOrders([]);setProducts([]);setMenus([]);setCategories([]);setServicePoints([]);setServiceCalls([]);}}}finally{fetching=false;}}
    sync();const t=setInterval(sync,2500);window.addEventListener('workspace-auth',sync);
    return()=>{stopped=true;clearInterval(t);window.removeEventListener('workspace-auth',sync);};
  },[activeMenuId,currentView,selectedTableNumber]);
  useEffect(()=>{if(!BACKEND)return;const clear=()=>{workspaceGeneration.current++;setOrders([]);setProducts([]);setMenus([]);setCategories([]);setServicePoints([]);setServiceCalls([]);setCart([]);setIsFirebaseConnected(false);for(const key of ['orders','products','business','servicePoints','serviceCalls'])localStorage.removeItem(LOCAL_STORAGE_KEY+'_'+key);};window.addEventListener('workspace-clear',clear);return()=>window.removeEventListener('workspace-clear',clear);},[]);
  const pendingGuest=useRef<{signature:string;token:string;key:string}|null>(null);
  async function remoteOrder(id:string,action:string,itemId?:string,note?:string){const current=orders.find(o=>o.id===id);if(!current?.version)throw Error('سفارش را دوباره بارگذاری کن');const body={action,itemId,note,expectedVersion:current.version},signature=JSON.stringify(body);let pending=commandCache.current.get(id);if(pending?.signature!==signature){pending={signature,key:crypto.randomUUID()};commandCache.current.set(id,pending);}const o=await api<Order>('/orders/'+id+'/action',{...body,idempotencyKey:pending.key});commandCache.current.delete(id);setOrders(prev=>prev.map(v=>v.id===id?o:v));}
  // Initialize and attach Firestore Real-Time Sync
  useEffect(() => {
    if(LOCAL_PREVIEW||BACKEND)return;
    let unsubBusiness: (() => void) | null = null;
    let unsubProducts: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubPoints: (() => void) | null = null;

    try {
      // 1. Business Document Listener
      const businessDocRef = doc(db, 'businesses', 'pich-shemroon');
      unsubBusiness = onSnapshot(businessDocRef, (snapshot) => {
        if (snapshot.exists()) {
          setBusiness(snapshot.data() as Business);
          setIsFirebaseConnected(true);
        } else {
          // Initialize in Firestore if doesn't exist
          setDoc(businessDocRef, INITIAL_BUSINESS).catch(() => {});
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'businesses/pich-shemroon');
      });

      // 2. Products Collection Listener
      const productsColRef = collection(db, 'products');
      unsubProducts = onSnapshot(productsColRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Product);
          });
          // sort by category and price
          list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
          setProducts(list);
          setIsFirebaseConnected(true);
        } else {
          // Seed products into Firestore
          INITIAL_PRODUCTS.forEach(p => {
            setDoc(doc(db, 'products', p.id), p).catch(() => {});
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'products');
      });

      // 3. Orders Collection Listener (Real-Time across all devices)
      const ordersColRef = collection(db, 'orders');
      unsubOrders = onSnapshot(ordersColRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: Order[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Order);
          });
          // Sort descending by creation time
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(list);
          setIsFirebaseConnected(true);
        } else {
          // Seed initial orders into Firestore
          INITIAL_ORDERS.forEach(o => {
            setDoc(doc(db, 'orders', o.id), o).catch(() => {});
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'orders');
      });

      // 4. Service Points / Tables Listener
      const pointsColRef = collection(db, 'servicePoints');
      unsubPoints = onSnapshot(pointsColRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: ServicePoint[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as ServicePoint);
          });
          list.sort((a, b) => a.tableNumber - b.tableNumber);
          setServicePoints(list);
        } else {
          INITIAL_SERVICE_POINTS.forEach(sp => {
            setDoc(doc(db, 'servicePoints', sp.id), sp).catch(() => {});
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'servicePoints');
      });

    } catch (e) {
      console.warn("Using high-performance local store as primary sync layer:", e);
    }

    return () => {
      unsubBusiness?.();
      unsubProducts?.();
      unsubOrders?.();
      unsubPoints?.();
    };
  }, []);

  // Update business settings
  const updateBusinessSettings = async (partial: Partial<Business>) => {
    if(BACKEND){if(['menuPalette','menuPaper','menuBackgroundImage'].some(k=>k in partial)){const menu=await api<MenuDefinition>('/menus/'+activeMenuId,{appearance:partial},'PATCH');setMenus(prev=>prev.map(m=>m.id===menu.id?menu:m));}else setBusiness(await api<Business>('/business',partial,'PATCH'));showToast('تنظیمات ذخیره شد');return;}

    const updated = { ...business, ...partial, updatedAt: new Date().toISOString() };
    setBusiness(updated);
    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'businesses', 'pich-shemroon'), updated);
    } catch {
      // fallback handled by local state
    }
    showToast('تنظیمات رستوران با موفقیت به‌روزرسانی شد');
  };

  // 1. Manager edits product price (persists to Firestore & real-time everywhere)
  async function updateProductImage(id:string,dataUrl:string){const uploaded=await api<{imageUrl:string}>('/product-images',{dataUrl});const p=await api<Product>('/products/'+id,{imageUrl:uploaded.imageUrl,customImage:true},'PATCH');setProducts(prev=>prev.map(v=>v.id===id?p:v));showToast('عکس غذا ذخیره شد');}
  const updateProductPrice = async (productId: string, newPrice: number) => {
    if(BACKEND){const p=await api<Product>('/products/'+productId,{price:newPrice},'PATCH');setProducts(prev=>prev.map(v=>v.id===productId?p:v));showToast('قیمت ذخیره شد');return;}
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, price: newPrice, updatedAt: new Date().toISOString() } : p
    );
    setProducts(updatedProducts);

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'products', productId), { 
        price: newPrice, 
        updatedAt: new Date().toISOString() 
      });
    } catch {
      // local state already updated
    }
    showToast(`قیمت با موفقیت به ${newPrice.toLocaleString('fa-IR')} تومان تغییر یافت`);
  };

  // Toggle availability (out of stock / in stock)
  const toggleProductAvailability = async (productId: string, isAvailable: boolean, reason?: string) => {
    if(BACKEND){const p=await api<Product>('/products/'+productId,{isAvailable,outOfStockReason:reason||''},'PATCH');setProducts(prev=>prev.map(v=>v.id===productId?p:v));return;}
    const updatedProducts = products.map(p => 
      p.id === productId ? { 
        ...p, 
        isAvailable, 
        outOfStockReason: isAvailable ? '' : (reason || 'موجودی به اتمام رسیده است'),
        updatedAt: new Date().toISOString() 
      } : p
    );
    setProducts(updatedProducts);

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'products', productId), { 
        isAvailable, 
        outOfStockReason: isAvailable ? '' : (reason || 'موجودی به اتمام رسیده است'),
        updatedAt: new Date().toISOString() 
      });
    } catch {
      // local state already updated
    }
    showToast(isAvailable ? 'غذا در منوی مشتریان موجود شد' : 'غذا به عنوان ناموجود علامت‌گذاری شد');
  };

  // Add new food item
  const addProduct = async (productData: Omit<Product, 'id' | 'businessId' | 'updatedAt'>): Promise<string> => {
    if(BACKEND){if(productData.imageUrl.startsWith('data:')){const uploaded=await api<{imageUrl:string}>('/product-images',{dataUrl:productData.imageUrl});productData={...productData,imageUrl:uploaded.imageUrl,customImage:true};}const p=await api<Product>('/products',{...productData,menuId:activeMenuId});setProducts(prev=>[p,...prev]);return p.id;}
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...productData,
      id: newId,
      businessId: business.id,menuId:activeMenuId,
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await setDoc(doc(db, 'products', newId), newProduct);
    } catch {
      // local state has it
    }
    showToast(`غذای «${newProduct.name}» به منو اضافه شد`);
    return newId;
  };

  // Toggle table occupancy
  const toggleTableOccupancy = async (tableNumber: number, isOccupied: boolean) => {
    if(BACKEND){const p=await api<ServicePoint>('/tables/'+tableNumber,{isOccupied},'PATCH');setServicePoints(prev=>prev.map(v=>v.tableNumber===tableNumber?p:v));return;}
    const updatedPoints = servicePoints.map(sp => 
      sp.tableNumber === tableNumber ? { ...sp, isOccupied } : sp
    );
    setServicePoints(updatedPoints);

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'servicePoints', `table-${tableNumber}`), { isOccupied });
    } catch {
      // local state has it
    }
  };

  // 2. Customer places order (Snapshot pricing, Idempotency, and Real-time Broadcast)
  const createOrder = async (
    tableNumber: number, 
    customerName: string, 
    customerNotes: string, 
    items: CartItem[],
    orderBusinessId:string='pich-shemroon'
  ): Promise<string> => {
    if(BACKEND&&!orderBusinessId.startsWith('demo-')){const point=servicePoints.find(p=>p.tableNumber===tableNumber);if(!point)throw Error('سرویس‌پوینت پیدا نشد');const guest=await ensureGuestSession(business.id,point.id,tableNumber);const signature=JSON.stringify([guest.sessionId,tableNumber,customerName,customerNotes,items]);if(pendingGuest.current?.signature!==signature)pendingGuest.current={signature,token:guest.guestToken,key:crypto.randomUUID()};const grant=pendingGuest.current;const o=await api<Order>('/orders',{businessId:business.id,sessionId:guest.sessionId,tableNumber,customerName,customerNotes,idempotencyKey:grant.key,guestToken:guest.guestToken,items:items.map(i=>({productId:i.product.id,quantity:i.quantity,notes:i.notes,selectedOptions:i.selectedOptions}))});pendingGuest.current=null;setOrders(prev=>prev.some(x=>x.id===o.id)?prev:[...prev,o]);setCart([]);showToast('سفارش ثبت شد');return o.id;}
    const orderNumNumber = Math.floor(1000 + Math.random() * 9000);
    const orderId = `order-${Date.now()}`;
    const orderNumberStr = `#${orderNumNumber}`;

    // Compute verified items with snapshot prices
    const orderItems: OrderItem[] = items.map((ci, idx) => ({
      id: `item-${orderId}-${idx + 1}`,
      productId: ci.product.id,
      productName: ci.product.name,
      unitPriceSnapshot: ci.product.price, // STRICT SNAPSHOT: frozen at order placement
      quantity: ci.quantity,
      selectedOptions: ci.selectedOptions,
      notes: ci.notes,
      itemTotal: ci.itemTotal,
      deliveryStatus: 'pending',
    }));

    const calculatedTotal = orderItems.reduce((acc, curr) => acc + curr.itemTotal, 0);

    const newOrder: Order = {
      id: orderId,
      businessId: orderBusinessId,
      tableNumber,
      orderNumber: orderNumberStr,
      customerName: customerName.trim() || `مشتری میز ${tableNumber}`,
      customerNotes: customerNotes.trim(),
      items: orderItems,
      totalAmount: calculatedTotal,
      status: 'pending_waiter',
      deliveryStatus: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      idempotencyKey: `idem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    // Update local state immediately
    setOrders(prev => [newOrder, ...prev]);
    // Mark table as occupied
    if(!orderBusinessId.startsWith('demo-'))toggleTableOccupancy(tableNumber, true);
    // Clear cart
    setCart([]);
    // Audio chime for new incoming order
    playChime('order');

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!orderBusinessId.startsWith('demo-')) await setDoc(doc(db, 'orders', orderId), newOrder);
    } catch {
      // local state has it
    }

    showToast(`سفارش جدید ${orderNumberStr} برای میز ${tableNumber} ثبت شد!`);
    return orderId;
  };

  // 3. Waiter approves order (pending_waiter -> cooking) or Kitchen sets ready
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if(BACKEND){await remoteOrder(orderId,status==='cooking'?'send':status==='ready'?'confirm':status==='delivered'?'deliver':'unsupported');return;}
    const target=orders.find(o=>o.id===orderId);if(status==='ready'&&(currentView!=='kitchen'||!target||!canConfirmKitchen(target))){showToast('تأیید فقط از نسخه رستوران و پس از پرداخت انجام می‌شود');return;}
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
    );
    setOrders(updatedOrders);

    if (status === 'cooking') {
      playChime('order');
    } else if (status === 'ready') {
      playChime('ready');
    }

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'orders', orderId), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
    } catch {
      // local state
    }

    let statusText = 'وضعیت سفارش به‌روزرسانی شد';
    if (status === 'cooking') statusText = 'سفارش تأیید و جهت آماده‌سازی به آشپزخانه فرستاده شد';
    if (status === 'ready') statusText = 'غذا آماده شد و آماده تحویل به گارسون است';
    if (status === 'delivered') statusText = 'سفارش تحویل داده شد';
    if (status === 'cancelled') statusText = 'سفارش لغو شد';
    showToast(statusText);
  };

  // Service Calls (Call Waiter / Request Bill)
  const createServiceCall = async (
    tableNumber: number, 
    type: 'waiter' | 'bill' | 'napkin' | 'custom', 
    message?: string
  ): Promise<string> => {
    if(BACKEND){const point=servicePoints.find(p=>p.tableNumber===tableNumber);if(!point)throw Error('سرویس‌پوینت پیدا نشد');const guest=await ensureGuestSession(business.id,point.id,tableNumber);const call=await api<ServiceCall>('/calls',{...guest,type:type==='bill'?'cashier':type==='napkin'?'utensils':type,message});setServiceCalls(prev=>[call,...prev]);return call.id;}
    const newCall: ServiceCall = {
      id: `call-${Date.now()}`,
      tableNumber,
      type,
      message: message || (type === 'bill' ? 'درخواست صدور و تسویه صورت‌حساب' : 'فراخوان سالن‌دار سر میز'),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setServiceCalls(prev => [newCall, ...prev]);
    playChime('call');

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await setDoc(doc(db, 'serviceCalls', newCall.id), newCall);
    } catch {
      // offline fallback
    }

    showToast(type === 'bill' ? `درخواست صورت‌حساب برای میز ${tableNumber} ثبت شد` : `درخواست حضور سالن‌دار برای میز ${tableNumber} ارسال شد`);
    return newCall.id;
  };

  const resolveServiceCall = async (callId: string) => {
    if(BACKEND){const c=await api<ServiceCall>('/calls/'+callId,{},'PATCH');setServiceCalls(prev=>prev.map(v=>v.id===callId?c:v));return;}
    setServiceCalls(prev => prev.map(c => c.id === callId ? { ...c, status: 'resolved' } : c));
    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'serviceCalls', callId), { status: 'resolved' });
    } catch {
      // offline fallback
    }
    showToast('درخواست میز با موفقیت انجام و رسیدگی شد');
  };

  // 4. Staff marks delivery (CRITICAL REQUIREMENT: Delivery and Settlement are INDEPENDENT!)
  const updateDeliveryStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
    if(BACKEND){await remoteOrder(orderId,'deliver');return;}
    const target=orders.find(o=>o.id===orderId);if(deliveryStatus==='delivered'&&(!target||!canDeliver(target))){showToast('ابتدا پرداخت و تأیید رستوران لازم است');return;}
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        // Also update items delivery status
        const updatedItems = o.items.map(it => ({ ...it, deliveryStatus }));
        return { 
          ...o, 
          deliveryStatus, 
          items: updatedItems,
          // If all delivered, status becomes delivered, but payment status remains untouched!
          status: deliveryStatus === 'delivered' ? 'delivered' : o.status,
          updatedAt: new Date().toISOString() 
        };
      }
      return o;
    });
    setOrders(updatedOrders);

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'orders', orderId), { 
        deliveryStatus,
        status: deliveryStatus === 'delivered' ? 'delivered' : undefined,
        updatedAt: new Date().toISOString() 
      });
    } catch {
      // local state
    }
    showToast(deliveryStatus === 'delivered' ? 'تحویل به میز ثبت شد (وضعیت تسویه مستقل باقی ماند)' : 'وضعیت تحویل تغییر کرد');
  };

  // 5. Staff marks payment / settlement
  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    if(BACKEND){showToast('دریافت وجه را همراه ارسال در نسخه گارسون ثبت کن');return;}
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, paymentStatus, updatedAt: new Date().toISOString() } : o
    );
    setOrders(updatedOrders);

    try {
      if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND) await updateDoc(doc(db, 'orders', orderId), { 
        paymentStatus, 
        updatedAt: new Date().toISOString() 
      });
    } catch {
      // local state
    }

    let payText = 'وضعیت مالی به‌روزرسانی شد';
    if (paymentStatus === 'paid_pos') payText = 'تسویه با کارت‌خوان ثبت شد';
    if (paymentStatus === 'paid_cash') payText = 'تسویه نقدی ثبت شد';
    if (paymentStatus === 'paid_online') payText = 'پرداخت آنلاین تأیید شد';
    showToast(payText);
  };

  // Cart operations
  const addToCart = (product: Product, options?: OrderItemOption[], notes?: string) => {
    const extraPrice = options ? options.reduce((sum, opt) => sum + opt.extraPrice, 0) : 0;
    const unitPrice = product.price + extraPrice;
    const cartItemId = `${product.id}-${options?.map(o => o.optionName).join('-') || 'plain'}`;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item => item.id === cartItemId ? {
          ...item,
          quantity: item.quantity + 1,
          itemTotal: (item.quantity + 1) * unitPrice,
        } : item);
      }
      return [
        ...prev,
        {
          id: cartItemId,
          product,
          quantity: 1,
          selectedOptions: options,
          notes,
          itemTotal: unitPrice,
        }
      ];
    });
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

  // B2B Purchase Order
  const createPurchaseOrder = async (listingId: string, quantity: number) => {
    const listing = supplierListings.find(l => l.id === listingId);
    if (!listing) return;

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      buyerBusinessId: 'narenj',
      supplierId: listing.id,
      listingId: listing.id,
      itemTitle: listing.title,
      quantity,
      totalPrice: listing.price * quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    showToast(`سفارش خرید عمده برای «${listing.title}» ثبت و برای تامین‌کننده ارسال شد`);
  };

  // Reset database back to seed
  const resetToSeed = async () => {
    setBusiness(INITIAL_BUSINESS);
    setProducts(INITIAL_PRODUCTS);
    setServicePoints(INITIAL_SERVICE_POINTS);
    setOrders(INITIAL_ORDERS);
    setSupplierListings(INITIAL_SUPPLIER_LISTINGS);
    setCart([]);

    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_business`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_products`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_servicePoints`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_orders`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_supplierListings`);

    try {
      if(LOCAL_PREVIEW){showToast("داده‌های پیش‌نمایش بازنشانی شدند");return;}
      const batch = writeBatch(db);
      // Reset business
      batch.set(doc(db, 'businesses', 'pich-shemroon'), INITIAL_BUSINESS);
      // Reset products
      INITIAL_PRODUCTS.forEach(p => batch.set(doc(db, 'products', p.id), p));
      // Reset orders
      INITIAL_ORDERS.forEach(o => batch.set(doc(db, 'orders', o.id), o));
      // Reset points
      INITIAL_SERVICE_POINTS.forEach(sp => batch.set(doc(db, 'servicePoints', sp.id), sp));
      await batch.commit();
    } catch {
      // local state is reset
    }

    showToast('داده‌های آزمایشی به وضعیت اولیه بازگردانده شدند');
  };

  async function patchStaffOrder(id:string,transform:(o:Order)=>Order){const current=orders.find(o=>o.id===id);if(!current)throw Error('Order not found');const next={...transform(current),updatedAt:new Date().toISOString()};if(!LOCAL_PREVIEW&&!BACKEND&&!BACKEND)await updateDoc(doc(db,'orders',id),{...next});setOrders(prev=>prev.map(o=>o.id===id?next:o));}
  async function submitToKitchen(id:string){if(BACKEND){await remoteOrder(id,'send');return;}if(currentView!=='waiter')throw Error('Waiter only');await patchStaffOrder(id,o=>{if(o.status!=='pending_waiter'||!o.items.length)throw Error('Invalid transition');return {...o,status:'cooking',paymentStatus:o.paymentStatus==='unpaid'?'paid_cash':o.paymentStatus,restaurantConfirmed:false};});showToast('دریافت وجه ثبت و سفارش برای رستوران ارسال شد');}
  async function confirmKitchen(id:string){if(BACKEND){await remoteOrder(id,'confirm');return;}if(currentView!=='kitchen')throw Error('Kitchen only');await patchStaffOrder(id,o=>{if(!canConfirmKitchen(o))throw Error('Payment or status invalid');return {...o,status:'ready',restaurantConfirmed:true};});playChime('ready');showToast('تأیید رستوران ثبت شد');}
  async function markDelivered(id:string){if(BACKEND){await remoteOrder(id,'deliver');return;}if(currentView!=='waiter')throw Error('Waiter only');await patchStaffOrder(id,o=>{if(!canDeliver(o))throw Error('Restaurant approval and payment required');return {...o,status:'delivered',deliveryStatus:'delivered',items:o.items.map(i=>({...i,deliveryStatus:'delivered'}))};});showToast('تحویل به مشتری ثبت شد');}
  async function removeOrderItem(id:string,itemId:string){if(BACKEND){await remoteOrder(id,'remove',itemId);return;}if(currentView!=='waiter')throw Error('Waiter only');await patchStaffOrder(id,o=>{if(o.deliveryStatus==='delivered'||o.status==='cancelled')throw Error('Order closed');const items=o.items.filter(i=>i.id!==itemId);if(items.length===o.items.length)throw Error('Item not found');return {...o,items,totalAmount:items.reduce((sum,i)=>sum+i.itemTotal,0),status:items.length?'pending_waiter':'cancelled',restaurantConfirmed:false};});showToast('غذا حذف شد؛ تغییرات نیاز به تأیید و ارسال دارند');}
  async function setItemWaiterNote(id:string,itemId:string,note:string){if(BACKEND){await remoteOrder(id,'note',itemId,note);return;}if(currentView!=='waiter')throw Error('Waiter only');await patchStaffOrder(id,o=>{if(o.deliveryStatus==='delivered'||o.status==='cancelled')throw Error('Order closed');return {...o,items:o.items.map(i=>i.id===itemId?{...i,waiterNotes:note.trim().slice(0,500)}:i),status:'pending_waiter',restaurantConfirmed:false};});showToast('توضیح ذخیره شد؛ تغییرات را برای رستوران ارسال کن');}
  function startNewGuestSession(){const point=servicePoints.find(p=>p.tableNumber===selectedTableNumber);if(!point)return;resetGuestSession(business.id,point.id);try{const old=JSON.parse(sessionStorage.getItem('menosaz-guest-grants')||'[]');sessionStorage.setItem('menosaz-guest-grants',JSON.stringify(old.filter((g:any)=>g.businessId!==business.id)));}catch{}pendingGuest.current=null;setCart([]);setOrders([]);setGuestSessionClosed(false);showToast('می‌توانی سفارش تازه ثبت کنی.');window.dispatchEvent(new Event('workspace-auth'));}
  const setCartNotes=(id:string,note:string)=>setCart(prev=>prev.map(c=>c.id===id?{...c,notes:note.slice(0,500)}:c));

  return (
    <AppContext.Provider
      value={{
        categories:categories.filter(c=>!c.menuId||c.menuId===activeMenuId),
        submitToKitchen,confirmKitchen,markDelivered,removeOrderItem,setItemWaiterNote,setCartNotes,
        currentView,
        setCurrentView,
        business:{...business,...menus.find(m=>m.id===activeMenuId)?.appearance},
        updateBusinessSettings,
        menuMessage,guestSessionClosed,startNewGuestSession,menus,activeMenuId,setActiveMenuId,createMenu,assignProductMenu,
        hasAnyProducts:products.length>0,
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
        playChime,
        supplierListings,
        purchaseOrders,
        createPurchaseOrder,
        toastMessage,
        showToast,
        resetToSeed,
        isFirebaseConnected,
        isNetworkOnline,
        isSimulatingOffline,
        toggleSimulateOffline,
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

