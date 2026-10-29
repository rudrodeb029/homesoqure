/**
 * USA Phone Number formatting and validation utilities.
 * Enforces standard USA format: (XXX) XXX-XXXX
 */

export function formatUSPhone(value: string): string {
  if (!value) return "";

  // Strip all non-digit characters
  let digits = value.replace(/\D/g, "");

  // If user includes country code +1, handle gracefully
  if (digits.startsWith("1") && digits.length > 10) {
    digits = digits.slice(1);
  }

  // Cap at 10 digits (standard USA area code + exchange + number)
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function isValidUSPhone(value: string): boolean {
  if (!value) return false;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) {
    digits = digits.slice(1);
  }
  // Standard USA phone number must be exactly 10 digits with valid area code (first digit 2-9)
  return digits.length === 10 && digits[0] >= "2";
}
