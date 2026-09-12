import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {loadHistory, loadSessionOrders, loadTopItems, type HistoryRow} from '../lib/api';
import {amount, peso, theme} from '../lib/theme';
import type {Order, Session} from '../lib/types';

type Range = 'today' | 'week' | 'month';

const RANGES: {key: Range; label: string; days: number}[] = [
  {key: 'today', label: 'Today', days: 0},
  {key: 'week', label: '7 days', days: 7},
  {key: 'month', label: '30 days', days: 30},
];

const startOf = (range: Range) => {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - (range === 'week' ? 7 : 30));
  }
  return d.toISOString();
};

const clock = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})
    : '';

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], {day: 'numeric', month: 'short'}) : '';

export default function HistoryScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack: () => void;
}) {
  const [range, setRange] = useState<Range>('today');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [top, setTop] = useState<{name: string; qty: number; value: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<{row: HistoryRow; orders: Order[]} | null>(null);

  const refresh = useCallback(async () => {
    const since = startOf(range);
    const [history, items] = await Promise.all([
      loadHistory(session.storeId, since),
      loadTopItems(session.storeId, since),
    ]);
    setRows(history);
    setTop(items);
    setLoading(false);
  }, [range, session.storeId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const takings = rows.reduce((sum, r) => sum + r.total, 0);
    const covers = rows.length;
    return {
      takings,
      covers,
      average: covers ? takings / covers : 0,
      items: rows.reduce((n, r) => n + r.items, 0),
    };
  }, [rows]);

  const openDetail = async (row: HistoryRow) => {
    const orders = await loadSessionOrders(row.sessionId);
    setDetail({row, orders: orders.filter(o => o.status === 'verified')});
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
      </View>

      <View style={styles.ranges}>
        {RANGES.map(r => (
          <Pressable
            key={r.key}
            style={[styles.range, range === r.key && styles.rangeOn]}
            onPress={() => setRange(r.key)}>
            <Text style={[styles.rangeText, range === r.key && styles.rangeTextOn]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={theme.navy} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.sessionId}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refresh();
                setRefreshing(false);
              }}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.tiles}>
                <View style={[styles.tile, styles.tileMain]}>
                  <Text style={styles.tileLabelOn}>Takings</Text>
                  <Text style={styles.tileValueOn}>{peso(summary.takings)}</Text>
                </View>
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Tables</Text>
                  <Text style={styles.tileValue}>{summary.covers}</Text>
                </View>
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Average</Text>
                  <Text style={styles.tileValue}>{peso(summary.average)}</Text>
                </View>
                <View style={styles.tile}>
                  <Text style={styles.tileLabel}>Items</Text>
                  <Text style={styles.tileValue}>{summary.items}</Text>
                </View>
              </View>

              {top.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Best sellers</Text>
                  {top.slice(0, 5).map((item, index) => {
                    const most = top[0].qty || 1;
                    return (
                      <View key={item.name} style={styles.topRow}>
                        <Text style={styles.topRank}>{index + 1}</Text>
                        <View style={{flex: 1}}>
                          <Text style={styles.topName}>{item.name}</Text>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {width: `${Math.round((item.qty / most) * 100)}%`},
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.topNumbers}>
                          <Text style={styles.topQty}>{item.qty} sold</Text>
                          <Text style={styles.topValue}>{peso(item.value)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.listTitle}>
                {rows.length} closed table{rows.length === 1 ? '' : 's'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Nothing closed in this period yet.
              </Text>
            </View>
          }
          renderItem={({item}) => (
            <Pressable style={styles.row} onPress={() => openDetail(item)}>
              <View style={styles.rowTable}>
                <Text style={styles.rowTableText}>{item.tableLabel}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.rowWhen}>
                  {day(item.closedAt)} · {clock(item.openedAt)}–{clock(item.closedAt)}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.rounds} round{item.rounds === 1 ? '' : 's'} · {item.items} item
                  {item.items === 1 ? '' : 's'}
                </Text>
              </View>
              <Text style={styles.rowTotal}>{peso(item.total)}</Text>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={Boolean(detail)}
        animationType="slide"
        transparent
        onRequestClose={() => setDetail(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>
                  {detail?.row.tableLabel} · {peso(detail?.row.total ?? 0)}
                </Text>
                <Text style={styles.modalSub}>
                  {day(detail?.row.closedAt ?? null)} · closed{' '}
                  {clock(detail?.row.closedAt ?? null)}
                </Text>
              </View>
              <Pressable onPress={() => setDetail(null)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>

            <ScrollView>
              {detail?.orders.map((order, index) => (
                <View key={order.id} style={styles.detailRound}>
                  <Text style={styles.detailRoundTitle}>
                    Round {index + 1} · {order.source === 'staff' ? 'staff' : 'from the table'}
                  </Text>
                  {order.order_items.map(line => (
                    <View key={line.id} style={styles.detailLine}>
                      <Text style={styles.detailQty}>{line.quantity}×</Text>
                      <Text style={styles.detailName} numberOfLines={1}>
                        {line.name_at_sale}
                      </Text>
                      <Text style={styles.detailAmount}>
                        {amount(Number(line.price_at_sale) * line.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.paper},
  centre: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  header: {backgroundColor: theme.navy, paddingTop: 16, paddingBottom: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10},
  back: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center'},
  backText: {color: '#fff', fontSize: 26, lineHeight: 28, marginTop: -3},
  title: {color: '#fff', fontSize: 20, fontWeight: '800'},

  ranges: {flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4},
  range: {paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: theme.rule, backgroundColor: theme.surface},
  rangeOn: {backgroundColor: theme.navy, borderColor: theme.navy},
  rangeText: {color: theme.ink2, fontWeight: '600', fontSize: 14},
  rangeTextOn: {color: '#fff'},

  tiles: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12},
  tile: {flexGrow: 1, flexBasis: '30%', backgroundColor: theme.surface, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: theme.rule},
  tileMain: {flexBasis: '100%', backgroundColor: theme.navy, borderColor: theme.navy},
  tileLabel: {color: theme.ink2, fontSize: 12, fontWeight: '600'},
  tileLabelOn: {color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600'},
  tileValue: {color: theme.ink, fontSize: 18, fontWeight: '800', marginTop: 4},
  tileValueOn: {color: theme.lime, fontSize: 30, fontWeight: '800', marginTop: 4, letterSpacing: -0.8},

  block: {backgroundColor: theme.surface, borderRadius: 14, margin: 12, marginTop: 2, padding: 14, borderWidth: 1, borderColor: theme.rule},
  blockTitle: {fontWeight: '800', color: theme.ink, fontSize: 15, marginBottom: 10},
  topRow: {flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 7},
  topRank: {width: 18, color: theme.ink3, fontWeight: '800', fontSize: 13},
  topName: {color: theme.ink, fontWeight: '600', fontSize: 14, marginBottom: 5},
  barTrack: {height: 6, borderRadius: 3, backgroundColor: theme.surface2, overflow: 'hidden'},
  barFill: {height: 6, borderRadius: 3, backgroundColor: theme.navy},
  topNumbers: {alignItems: 'flex-end'},
  topQty: {color: theme.ink2, fontSize: 12},
  topValue: {color: theme.ink, fontWeight: '700', fontSize: 13, marginTop: 2},

  listTitle: {marginHorizontal: 12, marginTop: 6, marginBottom: 8, color: theme.ink2, fontWeight: '700', fontSize: 13},

  row: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: theme.rule},
  rowTable: {width: 46, height: 46, borderRadius: 12, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center'},
  rowTableText: {fontWeight: '800', color: theme.ink, fontSize: 14},
  rowWhen: {color: theme.ink, fontWeight: '700', fontSize: 14},
  rowMeta: {color: theme.ink2, fontSize: 13, marginTop: 2},
  rowTotal: {fontWeight: '800', color: theme.ink, fontSize: 16},

  empty: {padding: 40, alignItems: 'center'},
  emptyText: {color: theme.ink2},

  modalWrap: {flex: 1, backgroundColor: 'rgba(9,16,44,0.5)', justifyContent: 'flex-end'},
  modal: {backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82%', padding: 18},
  modalHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12},
  modalTitle: {fontSize: 18, fontWeight: '800', color: theme.ink},
  modalSub: {color: theme.ink2, fontSize: 13, marginTop: 2},
  modalClose: {color: theme.navy, fontWeight: '800', fontSize: 15},
  detailRound: {marginBottom: 14},
  detailRoundTitle: {color: theme.ink2, fontWeight: '700', fontSize: 13, marginBottom: 6},
  detailLine: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5},
  detailQty: {color: theme.ink2, fontWeight: '700', minWidth: 30},
  detailName: {flex: 1, color: theme.ink, fontSize: 15},
  detailAmount: {color: theme.ink, fontWeight: '700', fontSize: 15},
});
