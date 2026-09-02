import {supabase} from './supabase';
import type {Category, Order, Product, Session, TableCard} from './types';

/**
 * Sign in with a store code and a PIN.
 * The code resolves to one of two accounts for that store — waiter or
 * manager — and whichever the PIN belongs to is the one that succeeds.
 */
export async function signInWithPin(
  storeCode: string,
  pin: string,
): Promise<{session?: Session; error?: string}> {
  const {data: candidates, error: lookupError} = await supabase.rpc(
    'staff_login_emails',
    {p_staff_code: storeCode.trim()},
  );

  if (lookupError) return {error: 'Could not reach the server.'};
  if (!candidates?.length) return {error: 'That store code was not recognised.'};

  // Try waiter first, then manager. Only one PIN will match.
  const ordered = [...candidates].sort((a: any) =>
    a.role === 'staff' ? -1 : 1,
  );

  for (const candidate of ordered) {
    const {data, error} = await supabase.auth.signInWithPassword({
      email: candidate.email,
      password: pin.trim(),
    });
    if (!error && data.user) {
      const session = await loadSession(data.user.id);
      if (session) return {session};
      return {error: 'This account is not linked to a store.'};
    }
  }

  return {error: 'That PIN did not work.'};
}

async function loadSession(userId: string): Promise<Session | null> {
  const {data: staff} = await supabase
    .from('staff')
    .select('user_id, role, business_id, businesses(name)')
    .eq('user_id', userId)
    .single();

  if (!staff) return null;

  const {data: store} = await supabase
    .from('stores')
    .select('id, name')
    .eq('business_id', staff.business_id)
    .limit(1)
    .single();

  return {
    userId,
    role: staff.role,
    businessId: staff.business_id,
    businessName: (staff as any).businesses?.name ?? '',
    storeId: store?.id ?? '',
    storeName: store?.name ?? '',
  };
}

export const signOut = () => supabase.auth.signOut();

/** Every table, with its open tab and anything waiting to be verified. */
export async function loadTables(storeId: string): Promise<TableCard[]> {
  const {data: tables} = await supabase
    .from('store_tables')
    .select('id, label')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('label');

  const {data: sessions} = await supabase
    .from('table_sessions')
    .select('id, table_id, opened_at, orders(id, status, submitted_at, order_items(price_at_sale, quantity))')
    .eq('store_id', storeId)
    .neq('status', 'closed');

  const byTable = new Map<string, any>();
  (sessions ?? []).forEach(s => byTable.set(s.table_id, s));

  return (tables ?? []).map(t => {
    const s = byTable.get(t.id);
    if (!s) {
      return {
        tableId: t.id,
        label: t.label,
        sessionId: null,
        openedAt: null,
        total: 0,
        pendingCount: 0,
        oldestPendingAt: null,
      };
    }

    const orders = s.orders ?? [];
    const pending = orders.filter((o: any) => o.status === 'submitted');
    const total = orders
      .filter((o: any) => o.status === 'verified')
      .flatMap((o: any) => o.order_items ?? [])
      .reduce(
        (sum: number, i: any) => sum + Number(i.price_at_sale) * i.quantity,
        0,
      );

    return {
      tableId: t.id,
      label: t.label,
      sessionId: s.id,
      openedAt: s.opened_at,
      total,
      pendingCount: pending.length,
      oldestPendingAt:
        pending.map((o: any) => o.submitted_at).sort()[0] ?? null,
    };
  });
}

export async function loadSessionOrders(sessionId: string): Promise<Order[]> {
  const {data} = await supabase
    .from('orders')
    .select('id, session_id, source, status, submitted_at, verified_at, note, order_items(id, product_id, name_at_sale, price_at_sale, quantity)')
    .eq('session_id', sessionId)
    .neq('status', 'voided')
    .order('submitted_at');
  return (data ?? []) as Order[];
}

export async function loadMenu(businessId: string) {
  const [{data: categories}, {data: products}] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, sort_order')
      .eq('business_id', businessId)
      .order('sort_order'),
    supabase
      .from('products')
      .select('id, name, description, price, category_id, is_available, thumbnail_url')
      .eq('business_id', businessId)
      .order('sort_order'),
  ]);
  return {
    categories: (categories ?? []) as Category[],
    products: (products ?? []) as Product[],
  };
}

/* ---------- editing an order during verification ---------- */

export async function addItemToOrder(orderId: string, product: Product, qty = 1) {
  return supabase.from('order_items').insert({
    order_id: orderId,
    product_id: product.id,
    name_at_sale: product.name,
    price_at_sale: product.price,
    quantity: qty,
  });
}

export async function setItemQuantity(itemId: string, qty: number) {
  if (qty <= 0) return supabase.from('order_items').delete().eq('id', itemId);
  return supabase.from('order_items').update({quantity: qty}).eq('id', itemId);
}

export async function verifyOrder(orderId: string, userId: string) {
  return supabase
    .from('orders')
    .update({status: 'verified', verified_at: new Date().toISOString(), verified_by: userId})
    .eq('id', orderId);
}

export async function voidOrder(orderId: string) {
  return supabase.from('orders').update({status: 'voided'}).eq('id', orderId);
}

/** A round the waiter keys in themselves, already verified. */
export async function createStaffOrder(
  storeId: string,
  tableId: string,
  userId: string,
) {
  let {data: session} = await supabase
    .from('table_sessions')
    .select('id')
    .eq('table_id', tableId)
    .neq('status', 'closed')
    .maybeSingle();

  if (!session) {
    const {data: created, error} = await supabase
      .from('table_sessions')
      .insert({store_id: storeId, table_id: tableId})
      .select('id')
      .single();
    if (error) throw error;
    session = created;
  }

  const {data: order, error: orderError} = await supabase
    .from('orders')
    .insert({
      session_id: session!.id,
      source: 'staff',
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: userId,
    })
    .select('id, session_id')
    .single();
  if (orderError) throw orderError;

  return order;
}

export async function closeTable(sessionId: string) {
  return supabase
    .from('table_sessions')
    .update({status: 'closed', closed_at: new Date().toISOString(), billed_at: new Date().toISOString()})
    .eq('id', sessionId);
}

/* ---------- manager: menu editing ---------- */

export async function saveProduct(
  businessId: string,
  values: Partial<Product> & {name: string; price: string},
  id?: string,
) {
  const row = {
    business_id: businessId,
    name: values.name,
    price: values.price,
    description: values.description || null,
    category_id: values.category_id || null,
    is_available: values.is_available ?? true,
    thumbnail_url: values.thumbnail_url || null,
  };
  return id
    ? supabase.from('products').update(row).eq('id', id)
    : supabase.from('products').insert(row);
}

export async function setProductAvailability(id: string, available: boolean) {
  return supabase.from('products').update({is_available: available}).eq('id', id);
}

/* ---------- manager: transaction history ---------- */

export type HistoryRow = {
  sessionId: string;
  tableLabel: string;
  openedAt: string;
  closedAt: string | null;
  rounds: number;
  items: number;
  total: number;
};

/**
 * Closed tabs, newest first. Only verified rounds count towards a total —
 * a voided or never-confirmed order was never charged for.
 */
export async function loadHistory(
  storeId: string,
  sinceISO: string,
): Promise<HistoryRow[]> {
  const {data} = await supabase
    .from('table_sessions')
    .select(
      'id, opened_at, closed_at, store_tables(label), orders(id, status, order_items(price_at_sale, quantity))',
    )
    .eq('store_id', storeId)
    .eq('status', 'closed')
    .gte('closed_at', sinceISO)
    .order('closed_at', {ascending: false});

  return (data ?? []).map((s: any) => {
    const charged = (s.orders ?? []).filter((o: any) => o.status === 'verified');
    const lines = charged.flatMap((o: any) => o.order_items ?? []);
    return {
      sessionId: s.id,
      tableLabel: s.store_tables?.label ?? '—',
      openedAt: s.opened_at,
      closedAt: s.closed_at,
      rounds: charged.length,
      items: lines.reduce((n: number, i: any) => n + i.quantity, 0),
      total: lines.reduce(
        (sum: number, i: any) => sum + Number(i.price_at_sale) * i.quantity,
        0,
      ),
    };
  });
}

/** Best sellers over the same window, by quantity sold. */
export async function loadTopItems(storeId: string, sinceISO: string) {
  const {data} = await supabase
    .from('table_sessions')
    .select('id, orders(status, order_items(name_at_sale, price_at_sale, quantity))')
    .eq('store_id', storeId)
    .gte('opened_at', sinceISO);

  const tally = new Map<string, {name: string; qty: number; value: number}>();

  (data ?? []).forEach((s: any) =>
    (s.orders ?? [])
      .filter((o: any) => o.status === 'verified')
      .flatMap((o: any) => o.order_items ?? [])
      .forEach((i: any) => {
        const row = tally.get(i.name_at_sale) ?? {
          name: i.name_at_sale,
          qty: 0,
          value: 0,
        };
        row.qty += i.quantity;
        row.value += Number(i.price_at_sale) * i.quantity;
        tally.set(i.name_at_sale, row);
      }),
  );

  return [...tally.values()].sort((a, b) => b.qty - a.qty);
}

/* ---------- manager: tables ---------- */

export type ManagedTable = {
  id: string;
  label: string;
  is_active: boolean;
  sessionCount: number;
  hasOpenTab: boolean;
};

export async function loadManagedTables(storeId: string): Promise<ManagedTable[]> {
  const {data} = await supabase
    .from('store_tables')
    .select('id, label, is_active, table_sessions(id, status)')
    .eq('store_id', storeId)
    .order('label');

  return (data ?? []).map((t: any) => ({
    id: t.id,
    label: t.label,
    is_active: t.is_active,
    sessionCount: (t.table_sessions ?? []).length,
    hasOpenTab: (t.table_sessions ?? []).some((s: any) => s.status !== 'closed'),
  }));
}

export async function addTable(storeId: string, label: string) {
  return supabase.from('store_tables').insert({store_id: storeId, label: label.trim()});
}

export async function renameTable(id: string, label: string) {
  return supabase.from('store_tables').update({label: label.trim()}).eq('id', id);
}

export async function setTableActive(id: string, active: boolean) {
  return supabase.from('store_tables').update({is_active: active}).eq('id', id);
}

/**
 * Only ever deletes a table that has never been sat at.
 *
 * table_sessions cascades from store_tables, so deleting a table that has
 * history would take its sessions, orders and order items with it — wiping
 * those sales out of the books. Anything with history is archived instead.
 */
export async function removeTable(
  table: ManagedTable,
): Promise<{deleted: boolean; error?: string}> {
  if (table.hasOpenTab) {
    return {deleted: false, error: 'That table has an open tab. Close it first.'};
  }

  if (table.sessionCount > 0) {
    const {error} = await setTableActive(table.id, false);
    return {deleted: false, error: error?.message};
  }

  const {error} = await supabase.from('store_tables').delete().eq('id', table.id);
  return {deleted: !error, error: error?.message};
}
