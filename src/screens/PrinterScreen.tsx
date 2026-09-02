import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {connectPrinter, initPrinter, listPrinters, type PrinterDevice} from '../lib/printer';
import {requestBluetoothPermissions} from '../lib/permissions';
import {theme} from '../lib/theme';

export default function PrinterScreen({
  connected,
  onConnected,
  onBack,
}: {
  connected: PrinterDevice | null;
  onConnected: (d: PrinterDevice) => void;
  onBack: () => void;
}) {
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    initPrinter();
  }, []);

  const scan = async () => {
    const ok = await requestBluetoothPermissions();
    if (!ok) {
      Alert.alert('Permission needed', 'Bluetooth access is required to find the printer.');
      return;
    }
    setScanning(true);
    try {
      setDevices(await listPrinters());
    } catch (err: any) {
      Alert.alert('Scan failed', err?.message ?? 'Try again.');
    }
    setScanning(false);
  };

  const connect = async (device: PrinterDevice) => {
    try {
      await connectPrinter(device.inner_mac_address ?? '');
      onConnected(device);
      Alert.alert('Connected', device.device_name ?? 'Printer ready.');
    } catch (err: any) {
      Alert.alert('Could not connect', err?.message ?? 'Try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Printer</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.status}>
          {connected
            ? `Connected to ${connected.device_name ?? connected.inner_mac_address}`
            : 'No printer connected'}
        </Text>
        <Text style={styles.hint}>
          Pair the printer in Android Bluetooth settings first, then find it here.
        </Text>

        <Pressable style={styles.scan} onPress={scan} disabled={scanning}>
          {scanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanText}>Find printers</Text>
          )}
        </Pressable>

        <FlatList
          data={devices}
          keyExtractor={(d, i) => d.inner_mac_address ?? String(i)}
          ListEmptyComponent={
            scanning ? undefined : (
              <Text style={styles.empty}>No printers found yet.</Text>
            )
          }
          renderItem={({item}) => (
            <Pressable style={styles.device} onPress={() => connect(item)}>
              <Text style={styles.deviceName}>{item.device_name ?? 'Unknown device'}</Text>
              <Text style={styles.deviceMac}>{item.inner_mac_address}</Text>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: theme.paper},
  header: {backgroundColor: theme.navy, paddingTop: 16, paddingBottom: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10},
  back: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center'},
  backText: {color: '#fff', fontSize: 26, lineHeight: 28, marginTop: -3},
  title: {color: '#fff', fontSize: 20, fontWeight: '800'},

  body: {flex: 1, padding: 16},
  status: {fontSize: 16, fontWeight: '700', color: theme.ink},
  hint: {color: theme.ink2, marginTop: 6, marginBottom: 16, fontSize: 14, lineHeight: 20},
  scan: {backgroundColor: theme.navy, borderRadius: 999, paddingVertical: 15, alignItems: 'center', marginBottom: 16},
  scanText: {color: '#fff', fontWeight: '800', fontSize: 15},
  empty: {color: theme.ink2, textAlign: 'center', marginTop: 20},
  device: {backgroundColor: theme.surface, borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: theme.rule},
  deviceName: {fontSize: 16, fontWeight: '700', color: theme.ink},
  deviceMac: {fontSize: 12, color: theme.ink3, marginTop: 3},
});
