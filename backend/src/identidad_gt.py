"""Normalización y validación de documentos de identidad y teléfonos de Guatemala.

- DPI (Documento Personal de Identificación, CUI): 13 dígitos. Los dígitos 10-11 son el
  código de departamento (01-22) y los 12-13 el de municipio (>= 01). Se aceptan espacios
  o guiones al capturarlo ("2456 78901 0101") y se almacena solo con dígitos.
- Pasaporte (residentes extranjeros): 5-20 caracteres alfanuméricos con al menos una letra.
- Teléfono: 8 dígitos locales (se antepone +502) o número internacional en formato +XXXXXXXX.
"""

import re

CODIGO_PAIS_GT = "+502"
TOTAL_DEPARTAMENTOS_GT = 22

_SEPARADORES = re.compile(r"[\s\-().]")
_DPI = re.compile(r"^\d{13}$")
_PASAPORTE = re.compile(r"^(?=.*[A-Z])[A-Z0-9]{5,20}$")
_TELEFONO_LOCAL_GT = re.compile(r"^[2-7]\d{7}$")
_TELEFONO_INTERNACIONAL = re.compile(r"^\+[1-9]\d{7,14}$")


def _limpiar(valor: str) -> str:
    return _SEPARADORES.sub("", valor or "").upper()


def es_dpi_valido(valor: str) -> bool:
    """Valida la estructura de un DPI/CUI: 13 dígitos, departamento 01-22 y municipio >= 01."""
    dpi = _limpiar(valor)
    if not _DPI.match(dpi):
        return False
    departamento = int(dpi[9:11])
    municipio = int(dpi[11:13])
    return 1 <= departamento <= TOTAL_DEPARTAMENTOS_GT and municipio >= 1


def normalizar_documento_identidad(valor: str) -> str:
    """Devuelve el DPI (solo dígitos) o el pasaporte (mayúsculas) normalizado.

    Lanza ValueError si el valor no es un DPI estructuralmente válido ni un pasaporte.
    """
    limpio = _limpiar(valor)
    if limpio.isdigit():
        if es_dpi_valido(limpio):
            return limpio
        raise ValueError("DPI inválido: debe tener 13 dígitos con departamento (01-22) y municipio válidos.")
    if _PASAPORTE.match(limpio):
        return limpio
    raise ValueError("Documento inválido: ingrese su DPI (13 dígitos) o su número de pasaporte.")


def normalizar_telefono(valor: str) -> str:
    """Normaliza un teléfono a formato internacional (+502XXXXXXXX para Guatemala)."""
    limpio = _limpiar(valor)
    if limpio.startswith("00"):
        limpio = "+" + limpio[2:]
    if limpio.startswith("502") and len(limpio) == 11:
        limpio = "+" + limpio
    if _TELEFONO_LOCAL_GT.match(limpio):
        return CODIGO_PAIS_GT + limpio
    if limpio.startswith(CODIGO_PAIS_GT):
        if _TELEFONO_LOCAL_GT.match(limpio[len(CODIGO_PAIS_GT) :]):
            return limpio
        raise ValueError("Teléfono de Guatemala inválido: debe tener 8 dígitos (ej. 5555 1234).")
    if _TELEFONO_INTERNACIONAL.match(limpio):
        return limpio
    raise ValueError("Teléfono inválido: use 8 dígitos (Guatemala) o formato internacional +código.")
