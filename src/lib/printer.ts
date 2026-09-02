import {BLEPrinter} from 'react-native-thermal-receipt-printer-image-qr';
import {amount} from './theme';
import type {Order} from './types';

const WIDTH = 32;

const line = '-'.repeat(WIDTH) + '\n';

/** Right-align an amount against a label inside the 32-character roll. */
const pad = (left: string, right: string) => {
  const room = WIDTH - right.length;
  const text = left.length > room - 1 ? left.slice(0, room - 2) + '…' : left;
  return text + ' '.repeat(Math.max(1, room - text.length)) + right + '\n';
};

const centre = (text: string) => {
  const t = text.slice(0, WIDTH);
  const left = Math.max(0, Math.floor((WIDTH - t.length) / 2));
  return ' '.repeat(left) + t + '\n';
};

export type BillInput = {
  businessName: string;
  storeName: string;
  tableLabel: string;
  orders: Order[];
  total: number;
};

/**
 * A dine-in bill: rounds kept separate, because a table that ordered
 * twice will look for the second round when checking the total.
 */
/**
 * Thermal printers use a single-byte codepage. Characters outside it —
 * the peso sign, curly quotes, accented letters in a dish name — can make
 * the ESC/POS library throw mid-print, which took the whole app down.
 * Everything is reduced to plain ASCII before it reaches the roll.
 */
const ascii = (text: string) =>
  text
    .replace(/\u20B1/g, 'PHP ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x0A\x20-\x7E<>]/g, '');

export function buildBill(input: BillInput): string {
  const now = new Date();
  let out = '';

  out += '<C>\n';
  out += `<B>${input.businessName}</B>\n`;
  out += '</C>\n';
  out += centre(input.storeName);
  out += centre(`Table ${input.tableLabel}`);
  out += line;

  input.orders.forEach((order, index) => {
    const at = new Date(order.verified_at ?? order.submitted_at);
    out += `Round ${index + 1}   ${at.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    })}\n`;

    order.order_items.forEach(item => {
      const money = amount(Number(item.price_at_sale) * item.quantity);
      out += pad(`${item.quantity}x ${item.name_at_sale}`, money);
    });

    if (order.note) out += `  note: ${order.note}\n`;
    out += '\n';
  });

  out += line;
  out += '<C>\n';
  out += `<B>TOTAL  PHP ${amount(input.total)}</B>\n`;
  out += '</C>\n';
  out += line;
  out += centre('Salamat po!');
  out += centre(
    now.toLocaleString('en-PH', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }),
  );
  out += '\n\n\n';

  return ascii(out);
}

export async function printBill(input: BillInput) {
  await BLEPrinter.printText(buildBill(input));
}

export type PrinterDevice = {device_name?: string; inner_mac_address?: string};

export async function initPrinter() {
  try {
    await BLEPrinter.init();
  } catch {
    // surfaced when scanning or printing instead
  }
}

export async function listPrinters(): Promise<PrinterDevice[]> {
  return (await BLEPrinter.getDeviceList()) ?? [];
}

export async function connectPrinter(mac: string) {
  await BLEPrinter.connectPrinter(mac);
}
