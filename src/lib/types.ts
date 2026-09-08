export type Role = 'staff' | 'manager' | 'owner';

export type Session = {
  userId: string;
  role: Role;
  businessId: string;
  storeId: string;
  storeName: string;
  businessName: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  category_id: string | null;
  is_available: boolean;
  thumbnail_url: string | null;
};

export type Category = {id: string; name: string; sort_order: number};

export type OrderItem = {
  id: string;
  product_id: string | null;
  name_at_sale: string;
  price_at_sale: string;
  quantity: number;
};

export type Order = {
  id: string;
  session_id: string;
  source: 'guest_qr' | 'staff';
  status: 'submitted' | 'verified' | 'voided';
  submitted_at: string;
  verified_at: string | null;
  note: string | null;
  guest_name: string | null;
  order_items: OrderItem[];
};

export type TableCard = {
  tableId: string;
  label: string;
  sessionId: string | null;
  openedAt: string | null;
  total: number;
  pendingCount: number;
  oldestPendingAt: string | null;
};
