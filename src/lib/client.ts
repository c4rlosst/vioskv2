import {NativeModules} from 'react-native';

/**
 * Which client this APK was built for.
 *
 * The "akanan" flavour ships with AKANAN's store code baked in, so staff
 * only ever type a PIN. The plain "viosk" build leaves the code empty and
 * asks for it, which is what we use for demos and for a shop that hasn't
 * had its own build cut yet.
 */
export type ClientBrand = {
  clientName: string;
  storeCode: string;
  flavor: string;
};

const fallback: ClientBrand = {clientName: 'Viosk', storeCode: '', flavor: 'viosk'};

// Guarded: an older build, or Metro running against a stale native binary,
// will not have the module and should still reach the login screen.
const native = NativeModules.ClientBrand as Partial<ClientBrand> | undefined;

export const clientBrand: ClientBrand = {
  clientName: native?.clientName || fallback.clientName,
  storeCode: (native?.storeCode || '').toUpperCase(),
  flavor: native?.flavor || fallback.flavor,
};

/** True when this build belongs to one shop and the code is not the user's to change. */
export const isSingleClientBuild = clientBrand.storeCode.length > 0;
