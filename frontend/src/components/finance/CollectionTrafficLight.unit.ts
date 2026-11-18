import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { EstadoRecibo } from '../../stores/financeStore';
import CollectionTrafficLight from './CollectionTrafficLight.vue';

describe('CollectionTrafficLight.vue', () => {
  it('muestra mensaje vacío cuando no hay recibos emitidos', () => {
    const wrapper = mount(CollectionTrafficLight, {
      props: { items: [], rateUsdGtq: '7.70' },
    });
    expect(wrapper.text()).toContain('No existen recibos emitidos');
  });

  it('ordena la unidad propia primero y calcula el equivalente en USD', () => {
    const wrapper = mount(CollectionTrafficLight, {
      props: {
        rateUsdGtq: '8.00',
        ownUnitId: 5,
        items: [
          { unidad_id: 2, periodo: '2026-10', estado: 'SOLVENTE', saldo_gtq: '0.00' },
          { unidad_id: 5, periodo: '2026-10', estado: 'ABONO_PARCIAL', saldo_gtq: '80.00' },
          { unidad_id: 1, periodo: '2026-10', estado: 'MOROSO', saldo_gtq: '75.00' },
        ],
      },
    });

    const rows = wrapper.findAll('.collection-row');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.text()).toContain('Unidad #5');
    expect(rows[0]?.text()).toContain('(Tu unidad)');
    expect(rows[0]?.text()).toContain('10.00 USD');
    expect(rows[0]?.find('.status-pill__glyph').text()).toBe('◐');
    expect(rows[1]?.text()).toContain('Unidad #1');
    expect(rows[1]?.find('.status-pill__glyph').text()).toBe('✕');
    expect(rows[2]?.text()).toContain('Unidad #2');
    expect(rows[2]?.find('.status-pill__glyph').text()).toBe('✓');

    const fallbackWrapper = mount(CollectionTrafficLight, {
      props: {
        rateUsdGtq: '8.00',
        ownUnitId: 5,
        items: [
          {
            unidad_id: 2,
            periodo: '2026-10',
            estado: 'DESCONOCIDO' as unknown as EstadoRecibo,
            saldo_gtq: '10.00',
          },
          { unidad_id: 1, periodo: '2026-10', estado: 'PENDIENTE', saldo_gtq: '5.00' },
        ],
      },
    });
    const glyphs = fallbackWrapper.findAll('.status-pill__glyph').map((g) => g.text());
    expect(glyphs).toEqual(['!', '•']);
  });
});
