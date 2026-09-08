import React, {useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import TablesScreen from './src/screens/TablesScreen';
import TableScreen from './src/screens/TableScreen';
import MenuScreen from './src/screens/MenuScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TableAdminScreen from './src/screens/TableAdminScreen';
import BrandingScreen from './src/screens/BrandingScreen';
import PrinterScreen from './src/screens/PrinterScreen';
import {signOut} from './src/lib/api';
import {theme} from './src/lib/theme';
import type {PrinterDevice} from './src/lib/printer';
import type {Session, TableCard} from './src/lib/types';

type Route =
  | {name: 'tables'}
  | {name: 'table'; table: TableCard}
  | {name: 'menu'}
  | {name: 'history'}
  | {name: 'tableAdmin'}
  | {name: 'branding'}
  | {name: 'printer'};

export default function App(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [route, setRoute] = useState<Route>({name: 'tables'});
  const [printer, setPrinter] = useState<PrinterDevice | null>(null);

  const leave = async () => {
    await signOut();
    setSession(null);
    setRoute({name: 'tables'});
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {!session ? (
        <LoginScreen onSignedIn={setSession} />
      ) : route.name === 'table' ? (
        <TableScreen
          session={session}
          table={route.table}
          printer={printer}
          onBack={() => setRoute({name: 'tables'})}
          onOpenPrinter={() => setRoute({name: 'printer'})}
        />
      ) : route.name === 'menu' ? (
        <MenuScreen session={session} onBack={() => setRoute({name: 'tables'})} />
      ) : route.name === 'history' ? (
        <HistoryScreen session={session} onBack={() => setRoute({name: 'tables'})} />
      ) : route.name === 'tableAdmin' ? (
        <TableAdminScreen session={session} onBack={() => setRoute({name: 'tables'})} />
      ) : route.name === 'branding' ? (
        <BrandingScreen
          session={session}
          onBack={() => setRoute({name: 'tables'})}
          onSaved={(businessName, storeName) =>
            setSession(s => (s ? {...s, businessName, storeName} : s))
          }
        />
      ) : route.name === 'printer' ? (
        <PrinterScreen
          connected={printer}
          onConnected={setPrinter}
          onBack={() => setRoute({name: 'tables'})}
        />
      ) : (
        <TablesScreen
          session={session}
          onOpenTable={table => setRoute({name: 'table', table})}
          onOpenMenu={() => setRoute({name: 'menu'})}
          onOpenHistory={() => setRoute({name: 'history'})}
          onOpenTableAdmin={() => setRoute({name: 'tableAdmin'})}
          onOpenBranding={() => setRoute({name: 'branding'})}
          onOpenPrinter={() => setRoute({name: 'printer'})}
          onSignOut={leave}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: theme.navy},
});
