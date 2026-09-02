import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addTable,
  loadManagedTables,
  removeTable,
  renameTable,
  setTableActive,
  type ManagedTable,
} from '../lib/api';
import {theme} from '../lib/theme';
import type {Session} from '../lib/types';

export default function TableAdminScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack: () => void;
}) {
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const refresh = useCallback(async () => {
    setTables(await loadManagedTables(session.storeId));
    setLoading(false);
  }, [session.storeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const suggestNext = () => {
    const numbers = tables
      .map(t => Number(t.label.replace(/\D/g, '')))
      .filter(n => Number.isFinite(n) && n > 0);
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `T-${String(next).padStart(2, '0')}`;
  };

  const create = async () => {
    const label = (newLabel.trim() || suggestNext()).toUpperCase();
    if (tables.some(t => t.label.toUpperCase() === label)) {
      Alert.alert('Already exists', `There is already a table called ${label}.`);
      return;
    }
    setBusy(true);
    const {error} = await addTable(session.storeId, label);
    setBusy(false);
    if (error) {
      Alert.alert('Could not add', error.message);
      return;
    }
    setNewLabel('');
    refresh();
  };

  const saveRename = async (table: ManagedTable) => {
    const label = editLabel.trim().toUpperCase();
    if (!label || label === table.label.toUpperCase()) {
      setEditingId(null);
      return;
    }
    const {error} = await renameTable(table.id, label);
    setEditingId(null);
    if (error) Alert.alert('Could not rename', error.message);
    refresh();
  };

  const confirmRemove = (table: ManagedTable) => {
    if (table.hasOpenTab) {
      Alert.alert('Table in use', 'Close the open tab before removing this table.');
      return;
    }

    const archiving = table.sessionCount > 0;

    Alert.alert(
      archiving ? `Archive ${table.label}?` : `Delete ${table.label}?`,
      archiving
        ? `${table.label} has ${table.sessionCount} past sitting${
            table.sessionCount === 1 ? '' : 's'
          }. It will be hidden from the floor and from the QR page, but its sales stay in your history.`
        : 'This table has never been used, so it will be deleted completely.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: archiving ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const {error} = await removeTable(table);
            if (error) Alert.alert('Could not remove', error);
            refresh();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={theme.navy} />
      </View>
    );
  }

  const active = tables.filter(t => t.is_active);
  const archived = tables.filter(t => !t.is_active);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Tables</Text>
      </View>

      <View style={styles.addBar}>
        <TextInput
          value={newLabel}
          onChangeText={t => setNewLabel(t.toUpperCase())}
          placeholder={suggestNext()}
          placeholderTextColor={theme.ink3}
          autoCapitalize="characters"
          style={styles.addInput}
          maxLength={10}
        />
        <Pressable
          style={[styles.addBtn, busy && styles.off]}
          disabled={busy}
          onPress={create}>
          <Text style={styles.addBtnText}>Add table</Text>
        </Pressable>
      </View>

      <FlatList
        data={[...active, ...archived]}
        keyExtractor={t => t.id}
        contentContainerStyle={{paddingBottom: 26}}
        ListHeaderComponent={
          <Text style={styles.sectionNote}>
            {active.length} on the floor
            {archived.length ? ` · ${archived.length} archived` : ''}
          </Text>
        }
        renderItem={({item}) => (
          <View style={[styles.row, !item.is_active && styles.rowOff]}>
            {editingId === item.id ? (
              <TextInput
                value={editLabel}
                onChangeText={t => setEditLabel(t.toUpperCase())}
                autoFocus
                autoCapitalize="characters"
                onBlur={() => saveRename(item)}
                onSubmitEditing={() => saveRename(item)}
                style={styles.editInput}
                maxLength={10}
              />
            ) : (
              <Pressable
                style={{flex: 1}}
                onPress={() => {
                  setEditingId(item.id);
                  setEditLabel(item.label);
                }}>
                <Text style={[styles.label, !item.is_active && styles.labelOff]}>
                  {item.label}
                </Text>
                <Text style={styles.meta}>
                  {item.hasOpenTab
                    ? 'open tab right now'
                    : item.sessionCount === 0
                    ? 'never used'
                    : `${item.sessionCount} sitting${item.sessionCount === 1 ? '' : 's'}`}
                  {!item.is_active ? ' · archived' : ''}
                </Text>
              </Pressable>
            )}

            <Switch
              value={item.is_active}
              onValueChange={async v => {
                await setTableActive(item.id, v);
                refresh();
              }}
              trackColor={{true: theme.navy, false: theme.rule}}
              thumbColor="#fff"
            />

            <Pressable style={styles.remove} onPress={() => confirmRemove(item)}>
              <Text style={styles.removeText}>
                {item.sessionCount > 0 ? 'Archive' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        )}
      />

      <Text style={styles.footNote}>
        Tap a name to rename it. Archiving hides a table from the floor and the
        QR page without touching its past sales.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.surface},
  centre: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  header: {backgroundColor: theme.navy, paddingTop: 16, paddingBottom: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10},
  back: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center'},
  backText: {color: '#fff', fontSize: 26, lineHeight: 28, marginTop: -3},
  title: {color: '#fff', fontSize: 20, fontWeight: '800'},

  addBar: {flexDirection: 'row', gap: 10, padding: 14, alignItems: 'center'},
  addInput: {flex: 1, borderWidth: 1, borderColor: theme.rule, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', letterSpacing: 1, color: theme.ink},
  addBtn: {backgroundColor: theme.lime, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14},
  addBtnText: {color: theme.limeInk, fontWeight: '800'},
  off: {opacity: 0.5},

  sectionNote: {color: theme.ink2, fontSize: 13, fontWeight: '600', marginHorizontal: 16, marginBottom: 8},

  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.rule},
  rowOff: {backgroundColor: theme.paper},
  label: {fontSize: 17, fontWeight: '800', color: theme.ink},
  labelOff: {color: theme.ink3},
  meta: {fontSize: 13, color: theme.ink2, marginTop: 2},
  editInput: {flex: 1, borderWidth: 1, borderColor: theme.navy, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 17, fontWeight: '800', color: theme.ink},

  remove: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: theme.rule},
  removeText: {color: theme.danger, fontWeight: '700', fontSize: 13},

  footNote: {color: theme.ink2, fontSize: 12.5, lineHeight: 18, padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.rule},
});
