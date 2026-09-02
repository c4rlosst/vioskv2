import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {loadTables} from '../lib/api';
import {supabase} from '../lib/supabase';
import {peso, sinceLabel, theme} from '../lib/theme';
import type {Session, TableCard} from '../lib/types';

type Props = {
  session: Session;
  onOpenTable: (table: TableCard) => void;
  onOpenMenu: () => void;
  onOpenHistory: () => void;
  onOpenTableAdmin: () => void;
  onOpenPrinter: () => void;
  onSignOut: () => void;
};

export default function TablesScreen({
  session,
  onOpenTable,
  onOpenMenu,
  onOpenHistory,
  onOpenTableAdmin,
  onOpenPrinter,
  onSignOut,
}: Props) {
  const [tables, setTables] = useState<TableCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);

  const refresh = useCallback(async () => {
    const rows = await loadTables(session.storeId);
    setTables(rows);
    setLoading(false);
  }, [session.storeId]);

  useEffect(() => {
    refresh();

    // Live: any new order or session change repaints the board.
    const channel = supabase
      .channel('floor')
      .on('postgres_changes', {event: '*', schema: 'public', table: 'orders'}, refresh)
      .on('postgres_changes', {event: '*', schema: 'public', table: 'table_sessions'}, refresh)
      .subscribe();

    // Keep the waiting timers honest without refetching.
    const tick = setInterval(() => forceTick(n => n + 1), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [refresh]);

  const waiting = tables.filter(t => t.pendingCount > 0).length;

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
        <View style={{flex: 1}}>
          <Text style={styles.store}>{session.storeName}</Text>
          <Text style={styles.role}>
            {session.role === 'staff' ? 'Floor' : 'Manager'}
            {waiting > 0 ? ` · ${waiting} waiting` : ''}
          </Text>
        </View>

        {session.role !== 'staff' && (
          <>
            <Pressable style={styles.headBtn} onPress={onOpenMenu}>
              <Text style={styles.headBtnText}>Menu</Text>
            </Pressable>
            <Pressable style={styles.headBtn} onPress={onOpenHistory}>
              <Text style={styles.headBtnText}>History</Text>
            </Pressable>
            <Pressable style={styles.headBtn} onPress={onOpenTableAdmin}>
              <Text style={styles.headBtnText}>Tables</Text>
            </Pressable>
          </>
        )}
        <Pressable style={styles.headBtn} onPress={onOpenPrinter}>
          <Text style={styles.headBtnText}>Printer</Text>
        </Pressable>
        <Pressable style={styles.headBtn} onPress={onSignOut}>
          <Text style={styles.headBtnText}>End</Text>
        </Pressable>
      </View>

      <FlatList
        data={tables}
        keyExtractor={t => t.tableId}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
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
        renderItem={({item}) => {
          const open = Boolean(item.sessionId);
          const needsAttention = item.pendingCount > 0;

          return (
            <Pressable
              style={({pressed}) => [
                styles.card,
                open && styles.cardOpen,
                needsAttention && styles.cardWaiting,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onOpenTable(item)}>
              <View style={styles.cardTop}>
                <Text style={[styles.label, needsAttention && styles.labelOn]}>
                  {item.label}
                </Text>
                {needsAttention && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.pendingCount}</Text>
                  </View>
                )}
              </View>

              {needsAttention ? (
                <>
                  <Text style={styles.waitingText}>Waiting to verify</Text>
                  <Text style={styles.waitingSince}>
                    {item.oldestPendingAt ? sinceLabel(item.oldestPendingAt) : ''}
                  </Text>
                </>
              ) : open ? (
                <>
                  <Text style={styles.total}>{peso(item.total)}</Text>
                  <Text style={styles.since}>
                    open {item.openedAt ? sinceLabel(item.openedAt) : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.free}>Free</Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.paper},
  centre: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.paper},

  header: {
    backgroundColor: theme.navy,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  store: {color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.4},
  role: {color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2},
  headBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  headBtnText: {color: '#fff', fontWeight: '700', fontSize: 13},

  grid: {padding: 12},
  row: {gap: 12, marginBottom: 12},

  card: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 15,
    minHeight: 108,
    borderWidth: 1,
    borderColor: theme.rule,
  },
  cardOpen: {borderColor: theme.navy},
  cardWaiting: {backgroundColor: theme.navy, borderColor: theme.navy},
  cardPressed: {opacity: 0.85},

  cardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  label: {fontSize: 19, fontWeight: '800', color: theme.ink, letterSpacing: -0.3},
  labelOn: {color: '#fff'},

  badge: {
    backgroundColor: theme.lime,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {color: theme.limeInk, fontWeight: '800', fontSize: 13},

  waitingText: {color: theme.lime, fontWeight: '700', marginTop: 12, fontSize: 14},
  waitingSince: {color: 'rgba(255,255,255,0.65)', marginTop: 3, fontSize: 13},

  total: {marginTop: 12, fontSize: 19, fontWeight: '800', color: theme.ink, letterSpacing: -0.4},
  since: {color: theme.ink2, marginTop: 3, fontSize: 13},
  free: {color: theme.ink3, marginTop: 14, fontSize: 14},
});
