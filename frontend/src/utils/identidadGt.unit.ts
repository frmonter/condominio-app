import { describe, expect, it } from 'vitest';
import { isValidDocumentoIdentidad, isValidDpi, isValidTelefono } from './identidadGt';

describe('identidadGt — DPI, pasaporte y teléfono de Guatemala', () => {
  it.each(['2456789010101', '2456 78901 0101', '2456-78901-0101', '1234567892201'])(
    'acepta el DPI %s',
    (dpi) => {
      expect(isValidDpi(dpi)).toBe(true);
      expect(isValidDocumentoIdentidad(dpi)).toBe(true);
    },
  );

  it.each([
    '245678901010',
    '24567890101011',
    '2456789010001',
    '2456789012301',
    '2456789010100',
    '',
  ])('rechaza el DPI %s', (dpi) => {
    expect(isValidDpi(dpi)).toBe(false);
    expect(isValidDocumentoIdentidad(dpi)).toBe(false);
  });

  it('acepta pasaportes y rechaza documentos inválidos', () => {
    expect(isValidDocumentoIdentidad('p1234567')).toBe(true);
    expect(isValidDocumentoIdentidad('AB 12345')).toBe(true);
    expect(isValidDocumentoIdentidad('V-12')).toBe(false);
    expect(isValidDocumentoIdentidad('A'.repeat(21))).toBe(false);
    expect(isValidDocumentoIdentidad('   ')).toBe(false);
  });

  it.each([
    '55551234',
    '5555-1234',
    '+502 5555 1234',
    '502 7777 0000',
    '00502 4444 1111',
    '+1 (305) 555-0100',
  ])('acepta el teléfono %s', (tel) => {
    expect(isValidTelefono(tel)).toBe(true);
  });

  it.each(['', '123', '0414', '5555123', '+5021234567', '+50215551234', '+12345', '18005550100'])(
    'rechaza el teléfono %s',
    (tel) => {
      expect(isValidTelefono(tel)).toBe(false);
    },
  );
});
