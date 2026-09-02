import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {signInWithPin} from '../lib/api';
import {theme} from '../lib/theme';
import type {Session} from '../lib/types';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function LoginScreen({onSignedIn}: {onSignedIn: (s: Session) => void}) {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = (key: string) => {
    setError(null);
    if (key === 'del') setPin(p => p.slice(0, -1));
    else if (key && pin.length < 8) setPin(p => p + key);
  };

  const submit = async () => {
    if (!code.trim() || pin.length < 4) return;
    setBusy(true);
    setError(null);
    const {session, error: err} = await signInWithPin(code, pin);
    setBusy(false);
    if (session) onSignedIn(session);
    else {
      setError(err ?? 'Sign in failed.');
      setPin('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.head}>
        <Text style={styles.brand}>Viosk</Text>
        <Text style={styles.sub}>Sign in to start your shift</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Store code</Text>
        <TextInput
          value={code}
          onChangeText={t => {
            setCode(t.toUpperCase());
            setError(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="KATI"
          placeholderTextColor={theme.ink3}
          style={styles.input}
          maxLength={12}
        />

        <Text style={[styles.label, styles.pinLabel]}>PIN</Text>
        <View style={styles.dots}>
          {Array.from({length: Math.max(6, pin.length)}).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            />
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.pad}>
          {KEYS.map((key, index) =>
            key === '' ? (
              <View key={index} style={styles.key} />
            ) : (
              <Pressable
                key={index}
                style={({pressed}) => [styles.key, pressed && styles.keyDown]}
                onPress={() => press(key)}>
                <Text style={styles.keyText}>{key === 'del' ? '⌫' : key}</Text>
              </Pressable>
            ),
          )}
        </View>

        <Pressable
          style={[
            styles.primary,
            (busy || !code.trim() || pin.length < 4) && styles.primaryOff,
          ]}
          disabled={busy || !code.trim() || pin.length < 4}
          onPress={submit}>
          {busy ? (
            <ActivityIndicator color={theme.limeInk} />
          ) : (
            <Text style={styles.primaryText}>Start shift</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.navy, justifyContent: 'center', padding: 22},
  head: {alignItems: 'center', marginBottom: 22},
  brand: {color: theme.lime, fontSize: 32, fontWeight: '800', letterSpacing: -0.8},
  sub: {color: 'rgba(255,255,255,0.65)', marginTop: 6, fontSize: 15},
  card: {backgroundColor: theme.surface, borderRadius: 20, padding: 20},
  label: {fontSize: 13, fontWeight: '700', color: theme.ink2, marginBottom: 7},
  pinLabel: {marginTop: 18},
  input: {
    borderWidth: 1,
    borderColor: theme.rule,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    color: theme.ink,
  },
  dots: {flexDirection: 'row', gap: 10, marginBottom: 4},
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.rule,
  },
  dotFilled: {backgroundColor: theme.navy, borderColor: theme.navy},
  error: {color: theme.danger, marginTop: 10, fontSize: 14},
  pad: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, marginHorizontal: -5},
  key: {
    width: '33.33%',
    paddingVertical: 13,
    alignItems: 'center',
  },
  keyDown: {opacity: 0.45},
  keyText: {fontSize: 26, fontWeight: '600', color: theme.ink},
  primary: {
    backgroundColor: theme.lime,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryOff: {opacity: 0.45},
  primaryText: {color: theme.limeInk, fontWeight: '800', fontSize: 16},
});
