"""Pruebas del rol ADMINISTRADOR: hereda los permisos de la Presidencia (incluida Tesorería)."""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.database import get_db
from src.dependencies import (
    ROLES_PRESIDENCIA,
    es_presidencia,
    get_current_user,
    roles_efectivos,
    verificar_roles,
)
from src.main import app
from src.models import TasaCambio
from src.redis_client import get_redis_client


def _usuario(rol: str, activo: bool = True) -> Any:
    return SimpleNamespace(id=7, correo=f"{rol.lower()}@test.com", rol=rol, es_activo=activo)


def test_roles_efectivos_agrega_administrador_donde_hay_presidente() -> None:
    assert roles_efectivos(("TESORERO", "PRESIDENTE")) == frozenset({"TESORERO", "PRESIDENTE", "ADMINISTRADOR"})
    assert roles_efectivos(frozenset({"PRESIDENTE"})) == frozenset({"PRESIDENTE", "ADMINISTRADOR"})


def test_roles_efectivos_no_agrega_administrador_sin_presidente() -> None:
    assert roles_efectivos(("CONSERJE", "VOCERO")) == frozenset({"CONSERJE", "VOCERO"})
    assert roles_efectivos(()) == frozenset()


def test_es_presidencia() -> None:
    assert ROLES_PRESIDENCIA == frozenset({"PRESIDENTE", "ADMINISTRADOR"})
    assert es_presidencia(_usuario("ADMINISTRADOR")) is True
    assert es_presidencia(_usuario("PRESIDENTE")) is True
    assert es_presidencia(_usuario("TESORERO")) is False
    assert es_presidencia(SimpleNamespace()) is False


def test_verificar_roles_administrador_hereda_presidencia() -> None:
    verificar_roles(_usuario("ADMINISTRADOR"), ("PRESIDENTE",))
    verificar_roles(_usuario("ADMINISTRADOR"), ("TESORERO", "PRESIDENTE"))


def test_verificar_roles_administrador_sin_presidencia_es_403() -> None:
    with pytest.raises(HTTPException) as exc:
        verificar_roles(_usuario("ADMINISTRADOR"), ("CONSERJE", "VOCERO"))
    assert exc.value.status_code == 403


def test_verificar_roles_administrador_inactivo_es_403() -> None:
    with pytest.raises(HTTPException) as exc:
        verificar_roles(_usuario("ADMINISTRADOR", activo=False), ("PRESIDENTE",))
    assert exc.value.status_code == 403
    assert "pendiente de aprobación" in exc.value.detail


def _setup(session: AsyncMock, rol: str) -> None:
    mock_redis = AsyncMock()
    mock_redis.set.return_value = True
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_redis_client] = lambda: mock_redis
    app.dependency_overrides[get_current_user] = lambda: _usuario(rol)


def _session_sin_tasa() -> AsyncMock:
    session = AsyncMock()
    result = MagicMock()
    result.scalars().first.return_value = None
    session.execute.side_effect = [result]
    session.add = MagicMock()

    async def refresh(instance: Any, *args: object, **kwargs: object) -> None:
        instance.id = 1

    session.refresh = refresh
    return session


@pytest.mark.parametrize(("rol", "esperado"), [("ADMINISTRADOR", 201), ("PRESIDENTE", 201), ("VOCERO", 403)])
def test_registrar_tipo_de_cambio_por_rol(client: TestClient, rol: str, esperado: int) -> None:
    _setup(_session_sin_tasa(), rol)
    try:
        response = client.post("/api/finanzas/tasa", json={"tasa_usd_gtq": "7.7000"})
        assert response.status_code == esperado
    finally:
        app.dependency_overrides = {}


def test_administrador_consulta_tasa_del_dia(client: TestClient) -> None:
    session = AsyncMock()
    result = MagicMock()
    result.scalars().first.return_value = TasaCambio(id=1, fecha=date.today(), tasa_usd_gtq=Decimal("7.7000"))
    session.execute.side_effect = [result]
    _setup(session, "ADMINISTRADOR")
    try:
        response = client.get("/api/finanzas/tasa")
        assert response.status_code == 200
        assert response.json()["tasa_usd_gtq"] == "7.7000"
    finally:
        app.dependency_overrides = {}
