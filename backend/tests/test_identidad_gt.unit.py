"""Pruebas de normalización de DPI, pasaporte y teléfonos de Guatemala."""

from typing import Any

import pytest
from pydantic import ValidationError

from src.identidad_gt import es_dpi_valido, normalizar_documento_identidad, normalizar_telefono
from src.schemas import UsuarioCreate, UsuarioResponse


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("2456789010101", "2456789010101"),
        ("2456 78901 0101", "2456789010101"),
        ("2456-78901-0101", "2456789010101"),
        ("1234567892201", "1234567892201"),  # departamento 22 (Jutiapa), límite superior
    ],
)
def test_normaliza_dpi_valido(entrada: str, esperado: str) -> None:
    assert es_dpi_valido(entrada) is True
    assert normalizar_documento_identidad(entrada) == esperado


@pytest.mark.parametrize(
    "entrada",
    [
        "245678901010",  # 12 dígitos
        "24567890101011",  # 14 dígitos
        "2456789010001",  # departamento 00
        "2456789012301",  # departamento 23
        "2456789010100",  # municipio 00
    ],
)
def test_rechaza_dpi_estructuralmente_invalido(entrada: str) -> None:
    assert es_dpi_valido(entrada) is False
    with pytest.raises(ValueError, match="DPI inválido"):
        normalizar_documento_identidad(entrada)


def test_es_dpi_valido_rechaza_texto() -> None:
    assert es_dpi_valido("ABCDEFGHIJKLM") is False
    assert es_dpi_valido("") is False


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [("p1234567", "P1234567"), ("AB 12345", "AB12345"), ("x1234", "X1234")],
)
def test_acepta_pasaporte_extranjero(entrada: str, esperado: str) -> None:
    assert normalizar_documento_identidad(entrada) == esperado


@pytest.mark.parametrize("entrada", ["", "   ", "V-12", "AB1", "A" * 21, "ÑANDU123"])
def test_rechaza_documento_invalido(entrada: str) -> None:
    with pytest.raises(ValueError, match="Documento inválido"):
        normalizar_documento_identidad(entrada)


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("55551234", "+50255551234"),
        ("5555-1234", "+50255551234"),
        ("2222 3333", "+50222223333"),
        ("+502 5555 1234", "+50255551234"),
        ("502 7777 0000", "+50277770000"),
        ("00502 4444 1111", "+50244441111"),
        ("+1 (305) 555-0100", "+13055550100"),
        ("+34612345678", "+34612345678"),
    ],
)
def test_normaliza_telefono(entrada: str, esperado: str) -> None:
    assert normalizar_telefono(entrada) == esperado


@pytest.mark.parametrize("entrada", ["+5021234567", "+50215551234", "+502555512345"])
def test_rechaza_telefono_guatemala_invalido(entrada: str) -> None:
    with pytest.raises(ValueError, match="Teléfono de Guatemala inválido"):
        normalizar_telefono(entrada)


@pytest.mark.parametrize("entrada", ["", "123", "0414", "5555123", "+12345", "abc", "18005550100"])
def test_rechaza_telefono_invalido(entrada: str) -> None:
    with pytest.raises(ValueError, match="Teléfono"):
        normalizar_telefono(entrada)


def _registro(**cambios: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "nombre": "Ana López",
        "cedula": "2456 78901 0101",
        "correo": "ana@example.com",
        "telefono": "5555 1234",
        "password": "ClaveSegura123!",
        "unidad_solicitada_id": 1,
        "tipo_ocupante_solicitado": "PROPIETARIO",
    }
    base.update(cambios)
    return base


def test_registro_normaliza_dpi_y_telefono() -> None:
    usuario = UsuarioCreate(**_registro())
    assert usuario.cedula == "2456789010101"
    assert usuario.telefono == "+50255551234"


def test_registro_rechaza_dpi_incompleto_y_telefono_corto() -> None:
    with pytest.raises(ValidationError) as exc:
        UsuarioCreate(**_registro(cedula="12345678", telefono="0414"))
    campos = {err["loc"][0] for err in exc.value.errors()}
    assert campos == {"cedula", "telefono"}


def test_respuesta_no_revalida_datos_historicos() -> None:
    """Los usuarios existentes con documentos antiguos se siguen pudiendo serializar."""
    respuesta = UsuarioResponse(
        id=1,
        nombre="Histórico",
        cedula="V-12345678",
        correo="historico@example.com",
        telefono="0414",
        es_activo=True,
        rol="PROPIETARIO",
    )
    assert respuesta.cedula == "V-12345678"
