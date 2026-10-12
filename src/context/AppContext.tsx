import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  business: Business;
  updateBusinessSettings: (partial: Partial<Business>) => Promise<void>;
  products: Product[];
  updateProductPrice: (productId: string, newPrice: number) => Promise<void>;
  toggleProductAvailability: (productId: string, isAvailable: boolean, reason?: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'businessId' | 'updatedAt'>) => Promise<string>;
  servicePoints: ServicePoint[];
  toggleTableOccupancy: (tableNumber: number, isOccupied: boolean) => Promise<void>;
  orders: Order[];
  createOrder: (tableNumber: number, customerName: string, customerNotes: string, items: CartItem[]) => Promise<string>;
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

const LOCAL_STORAGE_KEY = 'menuyar_state_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('website');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(4);
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);

  // Core Data States
  const [business, setBusiness] = useState<Business>(() => {
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
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_serviceCalls`, JSON.stringify(serviceCalls));
  }, [serviceCalls]);

  // Save to LocalStorage for persistence across full page reloads
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_business`, JSON.stringify(business));
  }, [business]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_servicePoints`, JSON.stringify(servicePoints));
  }, [servicePoints]);

  useEffect(() => {
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
    const viewParam = params.get('view') as AppView | null;
    const tableParam = params.get('table');
    if (viewParam) {
      setCurrentView(viewParam);
    }
    if (tableParam) {
      const num = parseInt(tableParam, 10);
      if (!isNaN(num) && num > 0) {
        setSelectedTableNumber(num);
      }
    }
  }, []);

  // Initialize and attach Firestore Real-Time Sync
  useEffect(() => {
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
    const updated = { ...business, ...partial, updatedAt: new Date().toISOString() };
    setBusiness(updated);
    try {
      await updateDoc(doc(db, 'businesses', 'pich-shemroon'), updated);
    } catch {
      // fallback handled by local state
    }
    showToast('تنظیمات رستوران با موفقیت به‌روزرسانی شد');
  };

  // 1. Manager edits product price (persists to Firestore & real-time everywhere)
  const updateProductPrice = async (productId: string, newPrice: number) => {
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, price: newPrice, updatedAt: new Date().toISOString() } : p
    );
    setProducts(updatedProducts);

    try {
      await updateDoc(doc(db, 'products', productId), { 
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
      await updateDoc(doc(db, 'products', productId), { 
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
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...productData,
      id: newId,
      businessId: 'narenj',
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);

    try {
      await setDoc(doc(db, 'products', newId), newProduct);
    } catch {
      // local state has it
    }
    showToast(`غذای «${newProduct.name}» به منو اضافه شد`);
    return newId;
  };

  // Toggle table occupancy
  const toggleTableOccupancy = async (tableNumber: number, isOccupied: boolean) => {
    const updatedPoints = servicePoints.map(sp => 
      sp.tableNumber === tableNumber ? { ...sp, isOccupied } : sp
    );
    setServicePoints(updatedPoints);

    try {
      await updateDoc(doc(db, 'servicePoints', `table-${tableNumber}`), { isOccupied });
    } catch {
      // local state has it
    }
  };

  // 2. Customer places order (Snapshot pricing, Idempotency, and Real-time Broadcast)
  const createOrder = async (
    tableNumber: number, 
    customerName: string, 
    customerNotes: string, 
    items: CartItem[]
  ): Promise<string> => {
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
      businessId: 'pich-shemroon',
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
    toggleTableOccupancy(tableNumber, true);
    // Clear cart
    setCart([]);
    // Audio chime for new incoming order
    playChime('order');

    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);
    } catch {
      // local state has it
    }

    showToast(`سفارش جدید ${orderNumberStr} برای میز ${tableNumber} ثبت شد!`);
    return orderId;
  };

  // 3. Waiter approves order (pending_waiter -> cooking) or Kitchen sets ready
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
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
      await updateDoc(doc(db, 'orders', orderId), { 
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
      await setDoc(doc(db, 'serviceCalls', newCall.id), newCall);
    } catch {
      // offline fallback
    }

    showToast(type === 'bill' ? `درخواست صورت‌حساب برای میز ${tableNumber} ثبت شد` : `درخواست حضور سالن‌دار برای میز ${tableNumber} ارسال شد`);
    return newCall.id;
  };

  const resolveServiceCall = async (callId: string) => {
    setServiceCalls(prev => prev.map(c => c.id === callId ? { ...c, status: 'resolved' } : c));
    try {
      await updateDoc(doc(db, 'serviceCalls', callId), { status: 'resolved' });
    } catch {
      // offline fallback
    }
    showToast('درخواست میز با موفقیت انجام و رسیدگی شد');
  };

  // 4. Staff marks delivery (CRITICAL REQUIREMENT: Delivery and Settlement are INDEPENDENT!)
  const updateDeliveryStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
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
      await updateDoc(doc(db, 'orders', orderId), { 
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
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, paymentStatus, updatedAt: new Date().toISOString() } : o
    );
    setOrders(updatedOrders);

    try {
      await updateDoc(doc(db, 'orders', orderId), { 
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

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        business,
        updateBusinessSettings,
        products,
        updateProductPrice,
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
