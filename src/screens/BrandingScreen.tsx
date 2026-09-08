import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {loadBranding, saveBranding, type Branding} from '../lib/api';
import {theme} from '../lib/theme';
import type {Session} from '../lib/types';

/** Presets, so a manager isn't forced to know hex codes. */
const PALETTES: {name: string; brand: string; accent: string; accentInk: string}[] = [
  {name: 'Viosk',    brand: '#16265E', accent: '#C9F23F', accentInk: '#1A2707'},
  {name: 'Barako',   brand: '#3A2317', accent: '#E8A33D', accentInk: '#2A1A05'},
  {name: 'Pandan',   brand: '#12604D', accent: '#D9F27E', accentInk: '#14290A'},
  {name: 'Rosas',    brand: '#7A2340', accent: '#F2B8C6', accentInk: '#3A0F1D'},
  {name: 'Dagat',    brand: '#0F4C75', accent: '#7FE3D4', accentInk: '#05302B'},
  {name: 'Gabi',     brand: '#221C3D', accent: '#B9A6FF', accentInk: '#170F35'},
];

const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

export default function BrandingScreen({
  session,
  onBack,
  onSaved,
}: {
  session: Session;
  onBack: () => void;
  onSaved: (businessName: string, storeName: string) => void;
}) {
  const [values, setValues] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranding(session).then(setValues);
  }, [session]);

  if (!values) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={theme.navy} />
      </View>
    );
  }

  const set = (patch: Partial<Branding>) =>
    setValues(v => (v ? {...v, ...patch} : v));

  const save = async () => {
    if (!values.businessName.trim() || !values.storeName.trim()) {
      Alert.alert('Names required', 'Both the business and store need a name.');
      return;
    }
    if (!isHex(values.brand) || !isHex(values.accent)) {
      Alert.alert('Check the colours', 'Colours must be hex, like #16265E.');
      return;
    }

    setSaving(true);
    const {error} = await saveBranding(session, values);
    setSaving(false);

    if (error) {
      Alert.alert('Could not save', error);
      return;
    }
    onSaved(values.businessName.trim(), values.storeName.trim());
    Alert.alert('Saved', 'The guest page will pick this up on its next load.');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Branding</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* live preview of the guest page header */}
        <View style={[styles.preview, {backgroundColor: values.brand}]}>
          {values.logoUrl ? (
            <Image
              source={{uri: values.logoUrl}}
              style={styles.previewLogo}
              resizeMode="contain"
            />
          ) : null}
          <Text style={[styles.previewName, {color: values.accent}]}>
            {values.businessName || 'Business name'}
          </Text>
          <Text style={styles.previewStore}>
            {values.storeName || 'Store'} · T-01
          </Text>
          <View style={[styles.previewPill, {backgroundColor: values.accent}]}>
            <Text style={[styles.previewPillText, {color: values.accentInk}]}>
              View order · 250.00
            </Text>
          </View>
        </View>
        <Text style={styles.caption}>How the guest page will look</Text>

        <Text style={styles.label}>Business name</Text>
        <TextInput
          value={values.businessName}
          onChangeText={t => set({businessName: t})}
          style={styles.input}
          placeholder="Kape Kalye"
          placeholderTextColor={theme.ink3}
        />

        <Text style={styles.label}>Store name</Text>
        <TextInput
          value={values.storeName}
          onChangeText={t => set({storeName: t})}
          style={styles.input}
          placeholder="Katipunan"
          placeholderTextColor={theme.ink3}
        />
        <Text style={styles.hint}>
          The branch or location — guests see it under the business name.
        </Text>

        <Text style={styles.label}>Logo link</Text>
        <TextInput
          value={values.logoUrl}
          onChangeText={t => set({logoUrl: t})}
          style={styles.input}
          autoCapitalize="none"
          placeholder="https://… (optional)"
          placeholderTextColor={theme.ink3}
        />

        <Text style={styles.label}>Colour</Text>
        <View style={styles.palettes}>
          {PALETTES.map(p => {
            const on = values.brand.toLowerCase() === p.brand.toLowerCase();
            return (
              <Pressable
                key={p.name}
                style={[styles.palette, on && styles.paletteOn]}
                onPress={() =>
                  set({brand: p.brand, accent: p.accent, accentInk: p.accentInk})
                }>
                <View style={styles.swatches}>
                  <View style={[styles.swatch, {backgroundColor: p.brand}]} />
                  <View style={[styles.swatch, {backgroundColor: p.accent}]} />
                </View>
                <Text style={[styles.paletteName, on && styles.paletteNameOn]}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.hexRow}>
          <View style={{flex: 1}}>
            <Text style={styles.label}>Main</Text>
            <TextInput
              value={values.brand}
              onChangeText={t => set({brand: t})}
              style={[styles.input, !isHex(values.brand) && styles.inputBad]}
              autoCapitalize="characters"
            />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.label}>Highlight</Text>
            <TextInput
              value={values.accent}
              onChangeText={t => set({accent: t})}
              style={[styles.input, !isHex(values.accent) && styles.inputBad]}
              autoCapitalize="characters"
            />
          </View>
        </View>
        <Text style={styles.hint}>
          Main is the header and buttons. Highlight is the price, badges and
          the order bar — it should be bright enough to read on the main colour.
        </Text>

        <Pressable
          style={[styles.save, saving && styles.off]}
          disabled={saving}
          onPress={save}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save branding'}</Text>
        </Pressable>
      </ScrollView>
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

  body: {padding: 16, paddingBottom: 40},

  preview: {borderRadius: 18, padding: 18, paddingBottom: 20},
  previewLogo: {height: 26, width: 90, marginBottom: 8},
  previewName: {fontSize: 24, fontWeight: '800', letterSpacing: -0.6},
  previewStore: {color: 'rgba(255,255,255,0.62)', marginTop: 4, fontSize: 13},
  previewPill: {alignSelf: 'flex-start', marginTop: 16, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11},
  previewPillText: {fontWeight: '800', fontSize: 14},
  caption: {textAlign: 'center', color: theme.ink3, fontSize: 12, marginTop: 8, marginBottom: 4},

  label: {fontSize: 13, fontWeight: '700', color: theme.ink2, marginTop: 16, marginBottom: 6},
  input: {borderWidth: 1, borderColor: theme.rule, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.ink},
  inputBad: {borderColor: theme.danger},
  hint: {color: theme.ink2, fontSize: 12.5, lineHeight: 18, marginTop: 6},

  palettes: {flexDirection: 'row', flexWrap: 'wrap', gap: 9},
  palette: {borderWidth: 1, borderColor: theme.rule, borderRadius: 13, padding: 9, alignItems: 'center', width: '31%'},
  paletteOn: {borderColor: theme.navy, borderWidth: 2},
  swatches: {flexDirection: 'row', gap: 4, marginBottom: 6},
  swatch: {width: 22, height: 22, borderRadius: 6},
  paletteName: {fontSize: 12, color: theme.ink2, fontWeight: '600'},
  paletteNameOn: {color: theme.ink, fontWeight: '800'},

  hexRow: {flexDirection: 'row', gap: 12},

  save: {backgroundColor: theme.lime, borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 26},
  saveText: {color: theme.limeInk, fontWeight: '800', fontSize: 16},
  off: {opacity: 0.5},
});
