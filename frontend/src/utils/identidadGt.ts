// SPDX-License-Identifier: MIT
// Validación en cliente de DPI, pasaporte y teléfono de Guatemala (espejo de src/identidad_gt.py).

const SEPARADORES = /[\s\-().]/g;
const DPI = /^\d{13}$/;
const PASAPORTE = /^(?=.*[A-Z])[A-Z0-9]{5,20}$/;
const TELEFONO_LOCAL_GT = /^[2-7]\d{7}$/;
const TELEFONO_INTERNACIONAL = /^\+[1-9]\d{7,14}$/;
const TOTAL_DEPARTAMENTOS_GT = 22;

function limpiar(valor: string): string {
  return (valor ?? '').replace(SEPARADORES, '').toUpperCase();
}

/** DPI/CUI: 13 dígitos, departamento 01-22 (dígitos 10-11) y municipio >= 01 (dígitos 12-13). */
export function isValidDpi(valor: string): boolean {
  const dpi = limpiar(valor);
  if (!DPI.test(dpi)) {
    return false;
  }
  const departamento = Number.parseInt(dpi.slice(9, 11), 10);
  const municipio = Number.parseInt(dpi.slice(11, 13), 10);
  return departamento >= 1 && departamento <= TOTAL_DEPARTAMENTOS_GT && municipio >= 1;
}

/** Acepta un DPI válido o un pasaporte (5-20 caracteres alfanuméricos con al menos una letra). */
export function isValidDocumentoIdentidad(valor: string): boolean {
  const limpio = limpiar(valor);
  if (/^\d+$/.test(limpio)) {
    return isValidDpi(limpio);
  }
  return PASAPORTE.test(limpio);
}

/** Acepta 8 dígitos locales, +502 + 8 dígitos o un número internacional +XXXXXXXX. */
export function isValidTelefono(valor: string): boolean {
  let limpio = limpiar(valor);
  if (limpio.startsWith('00')) {
    limpio = `+${limpio.slice(2)}`;
  }
  if (limpio.startsWith('502') && limpio.length === 11) {
    limpio = `+${limpio}`;
  }
  if (TELEFONO_LOCAL_GT.test(limpio)) {
    return true;
  }
  if (limpio.startsWith('+502')) {
    return TELEFONO_LOCAL_GT.test(limpio.slice(4));
  }
  return TELEFONO_INTERNACIONAL.test(limpio);
}
