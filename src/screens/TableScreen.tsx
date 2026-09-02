import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addItemToOrder,
  closeTable,
  createStaffOrder,
  loadMenu,
  loadSessionOrders,
  setItemQuantity,
  verifyOrder,
  voidOrder,
} from '../lib/api';
import {printBill} from '../lib/printer';
import {peso, sinceLabel, theme} from '../lib/theme';
import type {PrinterDevice} from '../lib/printer';
import type {Order, Product, Session, TableCard} from '../lib/types';

type Props = {
  session: Session;
  table: TableCard;
  printer: PrinterDevice | null;
  onBack: () => void;
  onOpenPrinter: () => void;
};

export default function TableScreen({
  session,
  table,
  printer,
  onBack,
  onOpenPrinter,
}: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<string | null>(null); // orderId to add into
  const [search, setSearch] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(table.sessionId);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setOrders(await loadSessionOrders(sessionId));
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
    loadMenu(session.businessId).then(m =>
      setProducts(m.products.filter(p => p.is_available)),
    );
  }, [refresh, session.businessId]);

  const pending = orders.filter(o => o.status === 'submitted');
  const verified = orders.filter(o => o.status === 'verified');

  const total = useMemo(
    () =>
      verified
        .flatMap(o => o.order_items)
        .reduce((sum, i) => sum + Number(i.price_at_sale) * i.quantity, 0),
    [verified],
  );

  const orderTotal = (order: Order) =>
    order.order_items.reduce(
      (sum, i) => sum + Number(i.price_at_sale) * i.quantity,
      0,
    );

  /* ---------- actions ---------- */

  const changeQty = async (itemId: string, qty: number) => {
    await setItemQuantity(itemId, qty);
    refresh();
  };

  const addItem = async (product: Product) => {
    if (!picker) return;
    await addItemToOrder(picker, product);
    setPicker(null);
    setSearch('');
    refresh();
  };

  const confirm = async (order: Order) => {
    if (order.order_items.length === 0) {
      Alert.alert('Nothing to confirm', 'Add at least one item first.');
      return;
    }
    setBusy(true);
    await verifyOrder(order.id, session.userId);
    setBusy(false);
    refresh();
  };

  const discard = (order: Order) =>
    Alert.alert('Void this round?', 'It will not appear on the bill.', [
      {text: 'Keep', style: 'cancel'},
      {
        text: 'Void',
        style: 'destructive',
        onPress: async () => {
          await voidOrder(order.id);
          refresh();
        },
      },
    ]);

  const startStaffRound = async () => {
    setBusy(true);
    try {
      const order = await createStaffOrder(session.storeId, table.tableId, session.userId);
      setSessionId(order.session_id);
      setPicker(order.id);
      const fresh = await loadSessionOrders(order.session_id);
      setOrders(fresh);
    } catch {
      Alert.alert('Could not start an order', 'Please try again.');
    }
    setBusy(false);
  };

  const doPrint = async () => {
    if (verified.length === 0) {
      Alert.alert('Nothing to print', 'No confirmed rounds on this table yet.');
      return;
    }

    // Calling the printer with nothing connected throws inside the native
    // module, which takes the app down rather than returning an error.
    if (!printer) {
      Alert.alert(
        'No printer connected',
        'Connect the Bluetooth printer before printing a bill.',
        [
          {text: 'Not now', style: 'cancel'},
          {text: 'Connect', onPress: onOpenPrinter},
        ],
      );
      return;
    }

    setBusy(true);
    try {
      await printBill({
        businessName: session.businessName,
        storeName: session.storeName,
        tableLabel: table.label,
        orders: verified,
        total,
      });
    } catch (err: any) {
      Alert.alert(
        'Could not print',
        err?.message ??
          'The printer stopped responding. Check it is on and still paired, then reconnect.',
      );
    }
    setBusy(false);
  };

  const doClose = () =>
    Alert.alert(
      `Close ${table.label}?`,
      `${peso(total)} — make sure payment has been taken.`,
      [
        {text: 'Not yet', style: 'cancel'},
        {
          text: 'Close table',
          style: 'destructive',
          onPress: async () => {
            if (sessionId) await closeTable(sessionId);
            onBack();
          },
        },
      ],
    );

  const visibleProducts = products.filter(p =>
    search.trim()
      ? `${p.name} ${p.description ?? ''}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={theme.navy} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{flex: 1}}>
          <Text style={styles.title}>{table.label}</Text>
          <Text style={styles.sub}>
            {sessionId
              ? `open ${table.openedAt ? sinceLabel(table.openedAt) : ''} · ${verified.length} round${verified.length === 1 ? '' : 's'}`
              : 'No open tab'}
          </Text>
        </View>
        <Text style={styles.headTotal}>{peso(total)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {pending.map(order => (
          <View key={order.id} style={styles.pendingCard}>
            <View style={styles.pendingHead}>
              <Text style={styles.pendingTitle}>Sent from the table</Text>
              <Text style={styles.pendingSince}>{sinceLabel(order.submitted_at)}</Text>
            </View>

            {order.note ? <Text style={styles.note}>“{order.note}”</Text> : null}

            {order.order_items.map(item => (
              <View key={item.id} style={styles.line}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {item.name_at_sale}
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => changeQty(item.id, item.quantity - 1)}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => changeQty(item.id, item.quantity + 1)}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.lineTotal}>
                  {peso(Number(item.price_at_sale) * item.quantity)}
                </Text>
              </View>
            ))}

            <Pressable style={styles.addRow} onPress={() => setPicker(order.id)}>
              <Text style={styles.addRowText}>+ Add another item</Text>
            </Pressable>

            <View style={styles.pendingFoot}>
              <Pressable style={styles.void} onPress={() => discard(order)}>
                <Text style={styles.voidText}>Void</Text>
              </Pressable>
              <Pressable
                style={[styles.confirm, busy && styles.off]}
                disabled={busy}
                onPress={() => confirm(order)}>
                <Text style={styles.confirmText}>
                  Confirm · {peso(orderTotal(order))}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {verified.map((order, index) => (
          <View key={order.id} style={styles.roundCard}>
            <View style={styles.roundHead}>
              <Text style={styles.roundTitle}>Round {index + 1}</Text>
              <Text style={styles.roundSource}>
                {order.source === 'staff' ? 'taken by staff' : 'from the table'}
              </Text>
            </View>
            {order.order_items.map(item => (
              <View key={item.id} style={styles.line}>
                <Text style={styles.roundQty}>{item.quantity}×</Text>
                <Text style={styles.lineName} numberOfLines={1}>
                  {item.name_at_sale}
                </Text>
                <Text style={styles.lineTotal}>
                  {peso(Number(item.price_at_sale) * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {pending.length === 0 && verified.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nothing on this table yet.</Text>
          </View>
        )}

        <Pressable
          style={[styles.newRound, busy && styles.off]}
          disabled={busy}
          onPress={startStaffRound}>
          <Text style={styles.newRoundText}>Take an order myself</Text>
        </Pressable>
      </ScrollView>

      {verified.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={[styles.print, busy && styles.off]} disabled={busy} onPress={doPrint}>
            <Text style={styles.printText}>
              {printer ? 'Print bill' : 'Connect printer'}
            </Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={doClose}>
            <Text style={styles.closeText}>Close table</Text>
          </Pressable>
        </View>
      )}

      {/* ---- item picker ---- */}
      <Modal visible={Boolean(picker)} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add an item</Text>
              <Pressable onPress={() => {setPicker(null); setSearch('');}}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search the menu"
              placeholderTextColor={theme.ink3}
              style={styles.search}
            />

            <FlatList
              data={visibleProducts}
              keyExtractor={p => p.id}
              renderItem={({item}) => (
                <Pressable style={styles.pick} onPress={() => addItem(item)}>
                  <View style={{flex: 1}}>
                    <Text style={styles.pickName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.pickDesc} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.pickPrice}>{peso(item.price)}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.paper},
  centre: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.paper},

  header: {
    backgroundColor: theme.navy,
    paddingTop: 16,
    paddingBottom: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  back: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center'},
  backText: {color: '#fff', fontSize: 26, lineHeight: 28, marginTop: -3},
  title: {color: '#fff', fontSize: 20, fontWeight: '800'},
  sub: {color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2},
  headTotal: {color: theme.lime, fontSize: 18, fontWeight: '800'},

  body: {padding: 12, paddingBottom: 30},

  pendingCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.navy,
  },
  pendingHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  pendingTitle: {fontWeight: '800', fontSize: 15, color: theme.ink},
  pendingSince: {color: theme.ink2, fontSize: 13},
  note: {fontStyle: 'italic', color: theme.ink2, marginBottom: 8, fontSize: 14},

  line: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  lineName: {flex: 1, fontSize: 15, color: theme.ink, fontWeight: '600'},
  lineTotal: {fontSize: 15, fontWeight: '700', color: theme.ink, minWidth: 78, textAlign: 'right'},
  roundQty: {color: theme.ink2, fontWeight: '700', minWidth: 30},

  stepper: {flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface2, borderRadius: 999, padding: 3, gap: 2},
  stepBtn: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  stepText: {fontSize: 20, fontWeight: '700', color: theme.ink, marginTop: -2},
  qty: {minWidth: 22, textAlign: 'center', fontWeight: '800', color: theme.ink},

  addRow: {paddingVertical: 11, alignItems: 'center', marginTop: 4},
  addRowText: {color: theme.navy, fontWeight: '700', fontSize: 15},

  pendingFoot: {flexDirection: 'row', gap: 10, marginTop: 6},
  void: {paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: theme.rule},
  voidText: {color: theme.danger, fontWeight: '700'},
  confirm: {flex: 1, backgroundColor: theme.lime, borderRadius: 999, paddingVertical: 14, alignItems: 'center'},
  confirmText: {color: theme.limeInk, fontWeight: '800', fontSize: 15},
  off: {opacity: 0.5},

  roundCard: {backgroundColor: theme.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.rule},
  roundHead: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  roundTitle: {fontWeight: '800', color: theme.ink, fontSize: 15},
  roundSource: {color: theme.ink3, fontSize: 12},

  emptyBox: {padding: 30, alignItems: 'center'},
  emptyText: {color: theme.ink2},

  newRound: {marginTop: 4, paddingVertical: 15, borderRadius: 999, borderWidth: 1, borderColor: theme.navy, alignItems: 'center'},
  newRoundText: {color: theme.navy, fontWeight: '800', fontSize: 15},

  footer: {flexDirection: 'row', gap: 10, padding: 12, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.rule},
  print: {flex: 1, backgroundColor: theme.navy, borderRadius: 999, paddingVertical: 15, alignItems: 'center'},
  printText: {color: '#fff', fontWeight: '800', fontSize: 15},
  closeBtn: {paddingHorizontal: 20, paddingVertical: 15, borderRadius: 999, borderWidth: 1, borderColor: theme.rule},
  closeText: {color: theme.ink, fontWeight: '700'},

  modalWrap: {flex: 1, backgroundColor: 'rgba(9,16,44,0.5)', justifyContent: 'flex-end'},
  modal: {backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 12},
  modalHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16},
  modalTitle: {fontSize: 18, fontWeight: '800', color: theme.ink},
  modalClose: {color: theme.navy, fontWeight: '800', fontSize: 15},
  search: {marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.surface2, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: theme.ink},
  pick: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: theme.rule},
  pickName: {fontSize: 15, fontWeight: '700', color: theme.ink},
  pickDesc: {fontSize: 13, color: theme.ink2, marginTop: 2},
  pickPrice: {fontSize: 15, fontWeight: '700', color: theme.ink},
});
