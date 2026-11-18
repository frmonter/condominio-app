"""Moneda base contable GTQ (quetzales) con pagos aceptados en USD

Renombra las columnas monetarias *_usd -> *_gtq y la tasa diaria
tasa_usd_ves -> tasa_usd_gtq (quetzales por 1 USD).

IMPORTANTE: es un renombrado estructural, NO convierte montos. Está pensado para
instalaciones nuevas (Guatemala). Si la base ya tiene datos registrados en USD,
convierta los montos antes de operar con esta versión.

Revision ID: 0010_moneda_base_gtq
Revises: 0009_hito18_tarea_diaria_unica
Create Date: 2026-11-18

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010_moneda_base_gtq"
down_revision: str | None = "0009_hito18_tarea_diaria_unica"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (tabla, columna_anterior, columna_nueva)
RENOMBRES: tuple[tuple[str, str, str], ...] = (
    ("unidades", "cuota_fija_usd", "cuota_fija_gtq"),
    ("unidades", "credito_disponible_usd", "credito_disponible_gtq"),
    ("tasas_cambio", "tasa_usd_ves", "tasa_usd_gtq"),
    ("recibos", "monto_usd", "monto_gtq"),
    ("recibos", "monto_pagado_usd", "monto_pagado_gtq"),
    ("pagos_reportados", "monto_usd", "monto_gtq"),
    ("egresos", "monto_usd", "monto_gtq"),
    ("fondos_condominio", "saldo_actual_usd", "saldo_actual_gtq"),
    ("recibos_items", "monto_usd", "monto_gtq"),
    ("certificados_solvencia", "deuda_verificada_usd", "deuda_verificada_gtq"),
    ("areas_sociales", "costo_uso_usd", "costo_uso_gtq"),
    ("areas_sociales", "deposito_garantia_usd", "deposito_garantia_gtq"),
)


def upgrade() -> None:
    for tabla, anterior, nueva in RENOMBRES:
        with op.batch_alter_table(tabla) as batch_op:
            batch_op.alter_column(anterior, new_column_name=nueva)


def downgrade() -> None:
    for tabla, anterior, nueva in reversed(RENOMBRES):
        with op.batch_alter_table(tabla) as batch_op:
            batch_op.alter_column(nueva, new_column_name=anterior)
