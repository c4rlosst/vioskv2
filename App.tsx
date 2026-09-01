import React, {useEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {BLEPrinter} from 'react-native-thermal-receipt-printer-image-qr';

type PrinterDevice = {
  device_name?: string;
  inner_mac_address?: string;
};

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function buildSampleReceipt(): string {
  const line = '--------------------------------\n';
  const now = new Date().toLocaleString();
  return (
    '<C>\n' +
    '<B>My Store</B>\n' +
    '</C>\n' +
    '123 Main Street\n' +
    'Tel: (555) 123-4567\n' +
    line +
    `Date: ${now}\n` +
    line +
    '<D>2x Coffee            $6.00</D>\n' +
    '<D>1x Sandwich          $8.50</D>\n' +
    '<D>1x Cookie            $2.50</D>\n' +
    line +
    '<C>\n' +
    '<B>Total: $17.00</B>\n' +
    '</C>\n' +
    line +
    '<C>Thank you for your purchase!</C>\n' +
    '\n\n\n'
  );
}

export default function App(): React.JSX.Element {
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [connected, setConnected] = useState<PrinterDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    BLEPrinter.init().catch(() => {
      // ignore, init errors are surfaced when scanning/printing instead
    });
  }, []);

  const scanForPrinters = async () => {
    const ok = await requestBluetoothPermissions();
    if (!ok) {
      Alert.alert(
        'Permission needed',
        'Bluetooth permission is required to find nearby printers.',
      );
      return;
    }

    setScanning(true);
    try {
      const found = await BLEPrinter.getDeviceList();
      setDevices(found ?? []);
      if (!found || found.length === 0) {
        Alert.alert(
          'No printers found',
          'Make sure your thermal printer is paired in Android Bluetooth settings and turned on, then try again.',
        );
      }
    } catch (err: any) {
      Alert.alert('Scan failed', err?.message ?? String(err));
    } finally {
      setScanning(false);
    }
  };

  const connectToPrinter = async (device: PrinterDevice) => {
    setConnecting(true);
    try {
      await BLEPrinter.connectPrinter(device.inner_mac_address ?? '');
      setConnected(device);
      Alert.alert('Connected', `Connected to ${device.device_name ?? 'printer'}`);
    } catch (err: any) {
      Alert.alert('Connection failed', err?.message ?? String(err));
    } finally {
      setConnecting(false);
    }
  };

  const printReceipt = async () => {
    if (!connected) {
      Alert.alert('Not connected', 'Connect to a printer first.');
      return;
    }
    setPrinting(true);
    try {
      await BLEPrinter.printText(buildSampleReceipt());
      Alert.alert('Printed', 'Receipt sent to the printer.');
    } catch (err: any) {
      Alert.alert('Print failed', err?.message ?? String(err));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Receipt Printer</Text>
        <Text style={styles.subtitle}>
          {connected
            ? `Connected: ${connected.device_name ?? connected.inner_mac_address}`
            : 'No printer connected'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={scanForPrinters}
          disabled={scanning}>
          <Text style={styles.buttonText}>
            {scanning ? 'Scanning…' : 'Find Printers'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        data={devices}
        keyExtractor={item => item.inner_mac_address ?? Math.random().toString()}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => connectToPrinter(item)}
            disabled={connecting}>
            <Text style={styles.deviceName}>{item.device_name ?? 'Unknown device'}</Text>
            <Text style={styles.deviceMac}>{item.inner_mac_address}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[
          styles.button,
          styles.printButton,
          (!connected || printing) && styles.buttonDisabled,
        ]}
        onPress={printReceipt}
        disabled={!connected || printing}>
        <Text style={styles.printButtonText}>
          {printing ? 'Printing…' : 'Print Receipt'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#e5e5ea',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  list: {
    flex: 1,
    marginBottom: 12,
  },
  deviceRow: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deviceMac: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  printButton: {
    backgroundColor: '#0a84ff',
  },
  printButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
