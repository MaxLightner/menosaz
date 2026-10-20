export type Role = 'admin' | 'manager' | 'waiter' | 'kitchen' | 'customer';

export type AppView = 
  | 'website'
  | 'how'
  | 'terms'
  | 'admin'
  | 'membership'
  | 'checkout'
  | 'dashboard-desktop'
  | 'dashboard-mobile'
  | 'customer'
  | 'waiter'
  | 'kitchen';

export type OrderStatus = 'pending_waiter' | 'cooking' | 'ready' | 'delivered' | 'cancelled';
export type DeliveryStatus = 'pending' | 'delivered';
export type PaymentStatus = 'unpaid' | 'paid_online' | 'paid_pos' | 'paid_cash';

export interface Business {
  menuPalette?:string;
  menuPaper?:number;
  menuBackgroundImage?:string;
  id: string;
  name: string;
  slug: string;
  branchName: string;
  branchCode: string;
  phone: string;
  address: string;
  orderAcceptanceActive: boolean;
  activeTemplate: 'traditional' | 'fastfood' | 'dark' | 'minimal' | 'b2b';
  updatedAt: string;
}

export interface Category {
  menuId?: string;
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
}

export interface ProductOption {
  id: string;
  name: string;
  extraPrice: number;
}

export interface OptionGroup {
  id: string;
  title: string;
  required: boolean;
  options: ProductOption[];
}

export interface MenuDefinition {id:string;name:string;kind:string;published:boolean;version?:number;scheduleMode?:'always'|'scheduled';timezone?:string;windows?:{weekday:number;startMinute:number;endMinute:number;endDayOffset:number}[];appearance?:{menuPalette?:string;menuPaper?:number;menuBackgroundImage?:string};}

export interface Product {
  version?:number;
  customImage?:boolean;
  menuId?:string;
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  outOfStockReason?: string;
  imageUrl: string;
  prepTimeMinutes: number;
  rating?: number;
  optionGroups?: OptionGroup[];
  updatedAt: string;
}

export interface ServicePoint {
  version?:number;
  qrToken?:string;
  menuMode?:'all'|'selected';
  menuIds?:string[];
  activeSession?:{id:string;openedAt:string;durationSeconds:number};
  id: string;
  businessId: string;
  tableNumber: number;
  section: 'main' | 'balcony' | 'garden';
  label: string;
  isOccupied: boolean;
  qrCodeUrl?: string;
  currentOrderId?: string;
}

export interface OrderItemOption {
  groupId?:string;optionId?:string;
  groupTitle: string;
  optionName: string;
  extraPrice: number;
}

export interface OrderItem {
  waiterNotes?:string;
  id: string;
  productId: string;
  productName: string;
  unitPriceSnapshot: number;
  quantity: number;
  selectedOptions?: OrderItemOption[];
  notes?: string;
  itemTotal: number;
  deliveryStatus?: DeliveryStatus;
}

export interface Order {
  kitchenReceivedAt?:string|null;
  deliveredBy?:string|null;
  version?:number;
  menuId?:string;
  restaurantConfirmed?:boolean;
  id: string;
  businessId: string;
  tableNumber: number;
  orderNumber: string;
  sessionId?: string;
  customerName?: string;
  customerNotes?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  idempotencyKey?: string;
}

export interface SupplierListing {
  id: string;
  supplierName: string;
  title: string;
  category: string;
  categoryKey: 'rice' | 'meat' | 'dairy' | 'oil' | 'sauce' | 'packaging' | 'beverage' | 'equipment';
  price: number;
  unit: string;
  minOrder: string;
  location: string;
  imageUrl: string;
  isVerified: boolean;
  isFeatured: boolean;
  phone?: string;
}

export interface PurchaseOrder {
  id: string;
  buyerBusinessId: string;
  supplierId: string;
  listingId: string;
  itemTitle: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'dispatched' | 'completed';
  createdAt: string;
}

export interface ServiceCall {
  id: string;
  tableNumber: number;
  type: 'waiter' | 'bill' | 'napkin' | 'custom';
  message?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

