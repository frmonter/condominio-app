import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RegisterView from './RegisterView.vue';
import { useAuthStore } from '../../stores/authStore';
import * as apiClient from '../../services/apiClient';

const pushMock = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ path: '/register' }),
}));

describe('RegisterView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    pushMock.mockReset();
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it('carga unidades al montar, valida campos obligatorios y envía registro idempotente hacia /espera-aprobacion', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce([
      { id: 5, identificador: 'B-202', estructura_id: 1 },
    ]);

    const store = useAuthStore();
    const regSpy = vi.spyOn(store, 'register').mockResolvedValueOnce({
      id: 10,
      nombre: 'Laura Díaz',
      cedula: '2456789010101',
      correo: 'laura@test.com',
      telefono: '+50255551122',
      es_activo: false,
      rol: 'FANTASMA',
    });

    const wrapper = mount(RegisterView);
    await flushPromises();
    expect(wrapper.find('#reg-unidad').text()).toContain('B-202');

    // Envío vacío -> muestra error
    await wrapper.find('#register-form').trigger('submit.prevent');
    expect(wrapper.find('.banner--error').text()).toContain('Complete todos los campos');

    // Completar formulario y enviar
    await wrapper.find('#reg-nombre').setValue('Laura Díaz');
    await wrapper.find('#reg-nombre').trigger('change');
    await wrapper.find('#reg-cedula').setValue('2456 78901 0101');
    await wrapper.find('#reg-correo').setValue('laura@test.com');
    await wrapper.find('#reg-telefono').setValue('5555 1122');
    await wrapper.find('#reg-password').setValue('Password123!');
    await wrapper.find('#reg-tipo-ocupante').setValue('INQUILINO');

    await wrapper.find('#register-form').trigger('submit.prevent');
    await flushPromises();

    expect(regSpy).toHaveBeenCalledOnce();
    expect(pushMock).toHaveBeenCalledWith('/espera-aprobacion');
  });

  it('valida DPI y teléfono de Guatemala antes de enviar el registro', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce([]);
    const store = useAuthStore();
    const regSpy = vi.spyOn(store, 'register');

    const wrapper = mount(RegisterView);
    await flushPromises();

    await wrapper.find('#reg-nombre').setValue('Carlos');
    await wrapper.find('#reg-cedula').setValue('V-12');
    await wrapper.find('#reg-correo').setValue('carlos@test.com');
    await wrapper.find('#reg-telefono').setValue('55551234');
    await wrapper.find('#reg-password').setValue('Password123!');
    await wrapper.find('#register-form').trigger('submit.prevent');
    expect(wrapper.find('.banner--error').text()).toContain('DPI válido');

    await wrapper.find('#reg-cedula').setValue('2456 78901 0101');
    await wrapper.find('#reg-telefono').setValue('0414');
    await wrapper.find('#register-form').trigger('submit.prevent');
    expect(wrapper.find('.banner--error').text()).toContain('teléfono válido');
    expect(regSpy).not.toHaveBeenCalled();
  });

  it('muestra banner de error cuando falla el registro en el backend', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockRejectedValueOnce(new Error('offline'));
    const store = useAuthStore();
    store.errorMessage = 'La cédula o el correo ya están registrados.';
    vi.spyOn(store, 'register').mockRejectedValueOnce(new Error('Conflict'));

    const wrapper = mount(RegisterView);
    await flushPromises();

    await wrapper.find('#reg-nombre').setValue('Pedro');
    await wrapper.find('#reg-cedula').setValue('1111111110101');
    await wrapper.find('#reg-correo').setValue('pedro@test.com');
    await wrapper.find('#reg-telefono').setValue('55550414');
    await wrapper.find('#reg-password').setValue('Password123!');
    await wrapper.find('#register-form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('.banner--error').text()).toContain('ya están registrados');
  });

  it('abre y cierra el diálogo de ayuda contextual en el registro', async () => {
    const wrapper = mount(RegisterView);
    await flushPromises();

    const btnHelp = wrapper.find('#btn-contextual-help');
    expect(btnHelp.exists()).toBe(true);
    expect(wrapper.find('#dialog-contextual-help').exists()).toBe(false);

    await btnHelp.trigger('click');
    expect(wrapper.find('#dialog-contextual-help').exists()).toBe(true);
    expect(wrapper.find('#help-screen-title').text()).toBe('Registro de Nuevo Residente');

    await wrapper.find('#btn-close-help').trigger('click');
    expect(wrapper.find('#dialog-contextual-help').exists()).toBe(false);
  });
});
