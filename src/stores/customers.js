import { writable, derived } from 'svelte/store';
import customerService from '../services/customer.service.js';

export const customers = writable([]);
export const customersLoading = writable(false);

export const customerCount = derived(customers, $customers => $customers.length);

// Load customers from API
export async function loadCustomers() {
  customersLoading.set(true);
  try {
    const result = await customerService.getAll();
    if (result && result.data) {
      customers.set(result.data);
    }
  } catch (error) {
    console.error('Error loading customers:', error);
  } finally {
    customersLoading.set(false);
  }
}

export async function addCustomer(customer) {
  const result = await customerService.create(customer);
  if (result) {
    customers.update(list => [...list, result]);
  }
  return result;
}

export async function updateCustomer(id, data) {
  const result = await customerService.update(id, data);
  if (result) {
    customers.update(list =>
      list.map(c => c.id === id ? result : c)
    );
  }
  return result;
}

export async function deleteCustomer(id) {
  const result = await customerService.delete(id);
  if (result) {
    customers.update(list => list.filter(c => c.id !== id));
  }
  return result;
}

export function getCustomerById(id) {
  let found = null;
  customers.subscribe(list => {
    found = list.find(c => c.id === id);
  })();
  return found;
}
