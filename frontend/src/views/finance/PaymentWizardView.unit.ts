import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/apiClient';
import PaymentWizardView from './PaymentWizardView.vue';

const pushMock = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ path: '/finanzas/reportar-pago' }),
}));

describe('PaymentWizardView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    pushMock.mockReset();
    vi.restoreAllMocks();
  });

  it('recorre los 3 pasos validando monto, referencia y enviando pago con Idempotency-Key', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      id: 90,
      recibo_id: 1,
      usuario_id: 2,
      monto: '500.00',
      moneda: 'GTQ',
      monto_gtq: '50.00',
      tasa_cambio: '7.70',
      metodo_pago: 'DEPOSITO',
      numero_referencia: '88776655',
      url_comprobante: null,
      estado: 'EN_REVISION',
    });

    const wrapper = mount(PaymentWizardView);

    expect(wrapper.find('#badge-tipo-cobertura').text()).toContain('PAGO TOTAL');

    // Validar bloqueo con monto 0
    await wrapper.find('#step-1-monto').setValue('0');
    await wrapper.find('#btn-step-1-next').trigger('click');
    expect(wrapper.find('.banner--error').text()).toContain('mayor a cero');

    // Monto válido -> Paso 2
    await wrapper.find('#step-1-monto').setValue('500.00');
    await wrapper.find('#btn-step-1-next').trigger('click');
    expect(wrapper.find('#step-2-metodo').exists()).toBe(true);

    // Referencia vacía -> Bloqueo en Paso 2
    await wrapper.find('#btn-step-2-next').trigger('click');
    expect(wrapper.find('.banner--error').text()).toContain('referencia bancaria es obligatorio');

    // Referencia válida -> Paso 3
    await wrapper.find('#input-referencia').setValue('88776655');
    await wrapper.find('#btn-step-2-next').trigger('click');
    expect(wrapper.find('#idempotency-key-preview').exists()).toBe(true);

    // Confirmar envío
    await wrapper.find('#btn-submit-pago').trigger('click');
    await flushPromises();
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('convierte pagos en USD a quetzales con el tipo de cambio del día', async () => {
    const wrapper = mount(PaymentWizardView);
    // Por defecto: Q500.00 en GTQ cubre el saldo de Q500.00
    expect(wrapper.find('#monto-hint').text()).toContain('500.00 GTQ');
    expect(wrapper.find('#monto-hint').text()).toContain('64.94');

    await wrapper.find('#select-moneda').setValue('USD');
    await wrapper.find('#step-1-monto').setValue('50');
    // US$50 x Q7.70 = Q385.00 < Q500.00 -> abono parcial
    expect(wrapper.find('#monto-hint').text()).toContain('385.00 GTQ');
    expect(wrapper.find('#monto-hint').text()).toContain('50.00');
    expect(wrapper.find('#badge-tipo-cobertura').text()).toContain('ABONO PARCIAL');

    await wrapper.find('#step-1-monto').setValue('70');
    expect(wrapper.find('#badge-tipo-cobertura').text()).toContain('PAGO TOTAL');

    await wrapper.find('#step-1-monto').setValue('-1');
    expect(wrapper.find('#monto-hint').text()).toContain('0.00 GTQ');
  });

  it('rechaza comprobantes que superan la cuota máxima de 2 MB', async () => {
    const wrapper = mount(PaymentWizardView);
    await wrapper.find('#btn-step-1-next').trigger('click');

    const fileInput = wrapper.find('#step-3-comprobante');
    const oversizedFile = new File([new Uint8Array(2 * 1024 * 1024 + 10)], 'grande.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput.element, 'files', {
      value: [oversizedFile],
      configurable: true,
    });
    await fileInput.trigger('change');

    expect(wrapper.find('.banner--error').text()).toContain('2 MB');

    // Archivo válido <= 2 MB y navegación atrás / moneda GTQ / método EFECTIVO / fallo de red
    const validFile = new File([new Uint8Array(1024)], 'comprobante.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput.element, 'files', {
      value: [validFile],
      configurable: true,
    });
    await fileInput.trigger('change');
    expect(wrapper.text()).toContain('Archivo validado: comprobante.png');

    await wrapper.find('#step-2-metodo').setValue('EFECTIVO');
    await wrapper.find('#btn-step-2-back').trigger('click');
    await wrapper.find('#select-moneda').setValue('GTQ');
    await wrapper.find('#step-1-monto').setValue('20.00');
    expect(wrapper.find('#badge-tipo-cobertura').text()).toContain('ABONO PARCIAL');

    await wrapper.find('#btn-step-1-next').trigger('click');
    await wrapper.find('#btn-step-2-next').trigger('click');
    await wrapper.find('#btn-step-3-back').trigger('click');
    await wrapper.find('#btn-step-2-next').trigger('click');

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error'));
    await wrapper.find('#btn-submit-pago').trigger('click');
    await flushPromises();
    expect(wrapper.find('.banner--error').exists()).toBe(true);
  });
});
