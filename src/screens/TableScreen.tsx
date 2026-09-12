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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  addItemsToOrder,
  closeTable,
  setOrderName,
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
  const [draft, setDraft] = useState<Record<string, number>>({}); // productId -> qty
  const [freshOrder, setFreshOrder] = useState<string | null>(null); // void if abandoned
  const [nameEdit, setNameEdit] = useState<{id: string; value: string} | null>(null);
  const [qtyEdit, setQtyEdit] = useState<{
    kind: 'draft' | 'line';
    id: string;
    name: string;
    value: string;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(table.sessionId);
  const insets = useSafeAreaInsets();

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

  /* ----- the basket inside the picker ----- */

  const bump = (productId: string, delta: number) =>
    setDraft(d => {
      const next = (d[productId] ?? 0) + delta;
      if (next <= 0) {
        const rest = {...d};
        delete rest[productId];
        return rest;
      }
      return {...d, [productId]: next};
    });

  const setQty = (productId: string, qty: number) =>
    setDraft(d => {
      if (qty <= 0) {
        const rest = {...d};
        delete rest[productId];
        return rest;
      }
      return {...d, [productId]: Math.min(qty, 999)};
    });

  const applyQtyEdit = async () => {
    if (!qtyEdit) return;
    const parsed = parseInt(qtyEdit.value.replace(/[^0-9]/g, ''), 10);
    const next = Number.isFinite(parsed) ? Math.min(parsed, 999) : 0;
    const edit = qtyEdit;
    setQtyEdit(null);
    if (edit.kind === 'draft') {
      setQty(edit.id, next);
    } else {
      await changeQty(edit.id, next);
    }
  };

  const draftLines = useMemo(
    () =>
      Object.entries(draft)
        .map(([id, qty]) => ({product: products.find(p => p.id === id), qty}))
        .filter((l): l is {product: Product; qty: number} => Boolean(l.product)),
    [draft, products],
  );

  const draftCount = draftLines.reduce((n, l) => n + l.qty, 0);
  const draftTotal = draftLines.reduce(
    (sum, l) => sum + Number(l.product.price) * l.qty,
    0,
  );

  const closePicker = async (opts?: {committed?: boolean}) => {
    // A round the waiter started but then backed out of would otherwise sit
    // on the table as an empty verified order, so drop it.
    if (!opts?.committed && picker && picker === freshOrder) {
      await voidOrder(picker);
    }
    setFreshOrder(null);
    setPicker(null);
    setDraft({});
    setSearch('');
    refresh();
  };

  const commitDraft = async () => {
    if (!picker || draftLines.length === 0) return;
    setBusy(true);
    await addItemsToOrder(picker, draftLines);
    setBusy(false);
    closePicker({committed: true});
  };

  const applyNameEdit = async () => {
    if (!nameEdit) return;
    const edit = nameEdit;
    setNameEdit(null);
    await setOrderName(edit.id, edit.value);
    refresh();
  };

  /** Whose round this is. Tap to set, change or clear it. */
  const nameChip = (order: Order) => {
    const who = order.guest_name?.trim();
    return (
      <Pressable
        hitSlop={6}
        style={[styles.nameChip, who ? styles.nameChipOn : null]}
        onPress={() => setNameEdit({id: order.id, value: who ?? ''})}>
        <Text style={who ? styles.nameChipTextOn : styles.nameChipText}>
          {who ? who : '+ name'}
        </Text>
      </Pressable>
    );
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
      setFreshOrder(order.id);
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
            <View style={styles.nameRow}>{nameChip(order)}</View>

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
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      setQtyEdit({
                        kind: 'line',
                        id: item.id,
                        name: item.name_at_sale,
                        value: String(item.quantity),
                      })
                    }>
                    <Text style={styles.qty}>{item.quantity}</Text>
                  </Pressable>
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
              <Text style={styles.addRowText}>+ Add items</Text>
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
              <View style={styles.roundTitleRow}>
                <Text style={styles.roundTitle}>
                  {order.guest_name?.trim() || `Round ${index + 1}`}
                </Text>
                {nameChip(order)}
              </View>
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
        <View style={[styles.footer, {paddingBottom: 12 + insets.bottom}]}>
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
      <Modal
        visible={Boolean(picker)}
        animationType="slide"
        transparent
        onRequestClose={() => closePicker()}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add items</Text>
              <Pressable onPress={() => closePicker()}>
                <Text style={styles.modalClose}>Cancel</Text>
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
              extraData={draft}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => {
                const qty = draft[item.id] ?? 0;
                return (
                  <Pressable
                    style={[styles.pick, qty > 0 && styles.pickOn]}
                    onPress={() => bump(item.id, 1)}>
                    <View style={{flex: 1}}>
                      <Text style={styles.pickName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.pickDesc} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.pickPrice}>{peso(item.price)}</Text>
                    {qty > 0 ? (
                      <View style={styles.pickStepper}>
                        <Pressable
                          hitSlop={8}
                          style={styles.stepBtn}
                          onPress={() => bump(item.id, -1)}>
                          <Text style={styles.stepText}>−</Text>
                        </Pressable>
                        <Pressable
                          hitSlop={8}
                          onPress={() =>
                            setQtyEdit({
                              kind: 'draft',
                              id: item.id,
                              name: item.name,
                              value: String(qty),
                            })
                          }>
                          <Text style={styles.pickQty}>{qty}</Text>
                        </Pressable>
                        <Pressable
                          hitSlop={8}
                          style={styles.stepBtn}
                          onPress={() => bump(item.id, 1)}>
                          <Text style={styles.stepText}>+</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.pickAdd}>
                        <Text style={styles.pickAddText}>+</Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />

            <View style={[styles.basket, {paddingBottom: 12 + insets.bottom}]}>
              <Text style={styles.basketCount}>
                {draftCount === 0
                  ? 'Tap items to build the round'
                  : `${draftCount} item${draftCount === 1 ? '' : 's'} · ${peso(draftTotal)}`}
              </Text>
              <Pressable
                style={[
                  styles.basketBtn,
                  (draftCount === 0 || busy) && styles.off,
                ]}
                disabled={draftCount === 0 || busy}
                onPress={commitDraft}>
                <Text style={styles.basketBtnText}>
                  {busy ? 'Adding…' : 'Add to order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* whose round is this */}
      <Modal
        visible={Boolean(nameEdit)}
        transparent
        animationType="fade"
        onRequestClose={() => setNameEdit(null)}>
        <View style={styles.qtyWrap}>
          <View style={styles.qtyCard}>
            <Text style={styles.qtyTitle}>Who is this round for?</Text>
            <Text style={styles.qtyHint}>
              Leave it empty to go back to “Round 1”, “Round 2”.
            </Text>
            <TextInput
              value={nameEdit?.value ?? ''}
              onChangeText={t =>
                setNameEdit(n => (n ? {...n, value: t} : n))
              }
              placeholder="e.g. Sai, Kuya Jun, Table 4 left"
              placeholderTextColor={theme.ink3}
              autoFocus
              maxLength={40}
              onSubmitEditing={applyNameEdit}
              style={styles.nameInput}
            />
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyCancel} onPress={() => setNameEdit(null)}>
                <Text style={styles.qtyCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.qtySet} onPress={applyNameEdit}>
                <Text style={styles.qtySetText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* type a quantity instead of tapping + */}
      <Modal
        visible={Boolean(qtyEdit)}
        transparent
        animationType="fade"
        onRequestClose={() => setQtyEdit(null)}>
        <View style={styles.qtyWrap}>
          <View style={styles.qtyCard}>
            <Text style={styles.qtyTitle}>{qtyEdit?.name}</Text>
            <Text style={styles.qtyHint}>How many?</Text>
            <TextInput
              value={qtyEdit?.value ?? ''}
              onChangeText={t =>
                setQtyEdit(q => (q ? {...q, value: t.replace(/[^0-9]/g, '')} : q))
              }
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              maxLength={3}
              onSubmitEditing={applyQtyEdit}
              style={styles.qtyInput}
            />
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyCancel} onPress={() => setQtyEdit(null)}>
                <Text style={styles.qtyCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.qtySet} onPress={applyQtyEdit}>
                <Text style={styles.qtySetText}>Set</Text>
              </Pressable>
            </View>
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
  pickOn: {backgroundColor: theme.surface2},
  pickAdd: {width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.rule, alignItems: 'center', justifyContent: 'center'},
  pickAddText: {fontSize: 19, fontWeight: '700', color: theme.navy, marginTop: -2},
  pickStepper: {flexDirection: 'row', alignItems: 'center', backgroundColor: theme.lime, borderRadius: 999, paddingHorizontal: 2},
  pickQty: {minWidth: 20, textAlign: 'center', fontWeight: '800', color: theme.limeInk},

  basket: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.rule},
  basketCount: {flex: 1, color: theme.ink2, fontSize: 14, fontWeight: '600'},
  basketBtn: {backgroundColor: theme.lime, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center'},
  basketBtnText: {color: theme.limeInk, fontWeight: '800', fontSize: 15},

  nameRow: {flexDirection: 'row', marginTop: 8},
  roundTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  nameChip: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.rule},
  nameChipOn: {backgroundColor: theme.lime, borderColor: theme.lime},
  nameChipText: {fontSize: 12, fontWeight: '700', color: theme.ink2},
  nameChipTextOn: {fontSize: 12, fontWeight: '800', color: theme.limeInk},
  nameInput: {marginTop: 14, backgroundColor: theme.surface2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontWeight: '700', color: theme.ink},

  qtyWrap: {flex: 1, backgroundColor: 'rgba(9,16,44,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32},
  qtyCard: {width: '100%', maxWidth: 320, backgroundColor: theme.surface, borderRadius: 20, padding: 20},
  qtyTitle: {fontSize: 17, fontWeight: '800', color: theme.ink},
  qtyHint: {fontSize: 13, color: theme.ink2, marginTop: 2},
  qtyInput: {marginTop: 14, backgroundColor: theme.surface2, borderRadius: 14, paddingVertical: 14, fontSize: 26, fontWeight: '800', textAlign: 'center', color: theme.ink},
  qtyRow: {flexDirection: 'row', gap: 10, marginTop: 16},
  qtyCancel: {flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: theme.rule, alignItems: 'center'},
  qtyCancelText: {color: theme.ink, fontWeight: '700', fontSize: 15},
  qtySet: {flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: theme.lime, alignItems: 'center'},
  qtySetText: {color: theme.limeInk, fontWeight: '800', fontSize: 15},
});
