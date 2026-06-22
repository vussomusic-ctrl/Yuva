// Azerbaijan phone helpers. The user types the national part after +994; the
// field shows a masked display ("+994 (0XX) XXX XX XX") while auth needs a clean
// E.164 raw value ("+994XXXXXXXXX"). National part = exactly 9 digits.

const CC = "+994";

/** Digits only, drop the 994 country code if kept, drop a leading 0 (050→50),
 *  cap at 9 national digits. */
export function azNationalDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("994")) d = d.slice(3);
  d = d.replace(/^0+/, "");
  return d.slice(0, 9);
}

/** Masked display, progressive: "+994 50 675 27 77" (operator without leading 0). */
export function formatAzPhone(input: string): string {
  const d = azNationalDigits(input);
  if (d.length === 0) return `${CC} `;
  const op = d.slice(0, 2);
  const a = d.slice(2, 5);
  const b = d.slice(5, 7);
  const c = d.slice(7, 9);
  let out = `${CC} ${op}`; // no leading 0
  if (a) out += ` ${a}`;
  if (b) out += ` ${b}`;
  if (c) out += ` ${c}`;
  return out;
}

/** Clean E.164 for auth: "+994XXXXXXXXX" (or "+994" + partial while typing). */
export function azRawPhone(input: string): string {
  return CC + azNationalDigits(input);
}

/** Valid when exactly 9 national digits. */
export function isValidAzPhone(input: string): boolean {
  return azNationalDigits(input).length === 9;
}
