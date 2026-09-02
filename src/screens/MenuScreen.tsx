import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {loadMenu, saveProduct, setProductAvailability} from '../lib/api';
import {peso, theme} from '../lib/theme';
import type {Category, Product, Session} from '../lib/types';

/** Manager-only. Waiters never reach this screen, and the database
 *  refuses their writes even if they did. */
export default function MenuScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const menu = await loadMenu(session.businessId);
    setProducts(menu.products);
    setCategories(menu.categories);
    setLoading(false);
  }, [session.businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async (product: Product) => {
    await setProductAvailability(product.id, !product.is_available);
    refresh();
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      Alert.alert('Name required', 'Give the item a name.');
      return;
    }
    const price = String(editing.price ?? '').trim();
    if (!price || Number.isNaN(Number(price))) {
      Alert.alert('Price required', 'Enter a number, like 120 or 120.50.');
      return;
    }

    setSaving(true);
    const {error} = await saveProduct(
      session.businessId,
      {...editing, name: editing.name.trim(), price},
      editing.id,
    );
    setSaving(false);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setEditing(null);
    refresh();
  };

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={theme.navy} />
      </View>
    );
  }

  const categoryName = (id: string | null | undefined) =>
    categories.find(c => c.id === id)?.name ?? 'No section';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Menu</Text>
        <Pressable
          style={styles.add}
          onPress={() =>
            setEditing({name: '', price: '', is_available: true, category_id: categories[0]?.id})
          }>
          <Text style={styles.addText}>New item</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        keyExtractor={p => p.id}
        contentContainerStyle={{paddingBottom: 24}}
        renderItem={({item}) => (
          <Pressable style={styles.row} onPress={() => setEditing(item)}>
            <View style={{flex: 1}}>
              <Text style={[styles.name, !item.is_available && styles.nameOff]}>
                {item.name}
              </Text>
              <Text style={styles.meta}>
                {categoryName(item.category_id)}
                {!item.is_available ? ' · sold out' : ''}
              </Text>
            </View>
            <Text style={styles.price}>{peso(item.price)}</Text>
            <Switch
              value={item.is_available}
              onValueChange={() => toggle(item)}
              trackColor={{true: theme.navy, false: theme.rule}}
              thumbColor="#fff"
            />
          </Pressable>
        )}
      />

      <Modal visible={Boolean(editing)} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {editing?.id ? 'Edit item' : 'New item'}
              </Text>
              <Pressable onPress={() => setEditing(null)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={editing?.name ?? ''}
              onChangeText={t => setEditing(e => ({...e, name: t}))}
              placeholder="Barako Black"
              placeholderTextColor={theme.ink3}
              style={styles.input}
            />

            <Text style={styles.label}>Price</Text>
            <TextInput
              value={String(editing?.price ?? '')}
              onChangeText={t => setEditing(e => ({...e, price: t}))}
              placeholder="90.00"
              placeholderTextColor={theme.ink3}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={editing?.description ?? ''}
              onChangeText={t => setEditing(e => ({...e, description: t}))}
              placeholder="Optional — shown under the name"
              placeholderTextColor={theme.ink3}
              multiline
              style={[styles.input, styles.multiline]}
            />

            <Text style={styles.label}>Section</Text>
            <View style={styles.chips}>
              {categories.map(c => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.chip,
                    editing?.category_id === c.id && styles.chipOn,
                  ]}
                  onPress={() => setEditing(e => ({...e, category_id: c.id}))}>
                  <Text
                    style={[
                      styles.chipText,
                      editing?.category_id === c.id && styles.chipTextOn,
                    ]}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Photo link</Text>
            <TextInput
              value={editing?.thumbnail_url ?? ''}
              onChangeText={t => setEditing(e => ({...e, thumbnail_url: t}))}
              placeholder="https://…"
              placeholderTextColor={theme.ink3}
              autoCapitalize="none"
              style={styles.input}
            />

            <Pressable
              style={[styles.save, saving && styles.off]}
              disabled={saving}
              onPress={save}>
              <Text style={styles.saveText}>
                {saving ? 'Saving…' : editing?.id ? 'Save changes' : 'Add to menu'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.surface},
  centre: {flex: 1, alignItems: 'center', justifyContent: 'center'},

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
  title: {flex: 1, color: '#fff', fontSize: 20, fontWeight: '800'},
  add: {backgroundColor: theme.lime, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999},
  addText: {color: theme.limeInk, fontWeight: '800', fontSize: 14},

  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.rule},
  name: {fontSize: 16, fontWeight: '700', color: theme.ink},
  nameOff: {color: theme.ink3, textDecorationLine: 'line-through'},
  meta: {fontSize: 13, color: theme.ink2, marginTop: 2},
  price: {fontSize: 15, fontWeight: '700', color: theme.ink},

  modalWrap: {flex: 1, backgroundColor: 'rgba(9,16,44,0.5)', justifyContent: 'flex-end'},
  modal: {backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 26},
  modalHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  modalTitle: {fontSize: 18, fontWeight: '800', color: theme.ink},
  cancel: {color: theme.ink2, fontWeight: '700'},

  label: {fontSize: 13, fontWeight: '700', color: theme.ink2, marginTop: 12, marginBottom: 6},
  input: {borderWidth: 1, borderColor: theme.rule, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.ink},
  multiline: {height: 74, textAlignVertical: 'top'},

  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {borderWidth: 1, borderColor: theme.rule, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9},
  chipOn: {backgroundColor: theme.navy, borderColor: theme.navy},
  chipText: {color: theme.ink2, fontWeight: '600'},
  chipTextOn: {color: '#fff'},

  save: {backgroundColor: theme.lime, borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 20},
  saveText: {color: theme.limeInk, fontWeight: '800', fontSize: 16},
  off: {opacity: 0.5},
});
