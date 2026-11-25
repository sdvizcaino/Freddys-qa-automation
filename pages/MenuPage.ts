import { Locator, Page, expect } from '@playwright/test';

/**
 * Página del menú: selección del vendor y listado de productos.
 */
export class MenuPage {
  readonly page: Page;
  readonly title: Locator;
  readonly menuStatus: Locator;
  readonly productButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { name: 'Explore our menu' });
    // Mensaje de estado del menú, por ejemplo:
    // "Menu for OLO — demo-olo — showing SANDWICHES & MORE, 16 items."
    // Se usa CSS porque el <output> no tiene un rol accesible útil.
    this.menuStatus = page.locator('output').filter({ hasText: 'Menu for' });
    this.productButtons = page.getByRole('button', { name: /^View details for / });
  }

  /** Radio del vendor. Su nombre accesible es el id del vendor, por ejemplo "demo-olo". */
  vendorRadio(vendorId: string): Locator {
    return this.page.getByRole('radio', { name: vendorId });
  }

  /** Tarjeta completa del vendor (el label que contiene el radio). */
  vendorCard(vendorId: string): Locator {
    return this.page.locator('label').filter({ has: this.vendorRadio(vendorId) });
  }

  /**
   * Selecciona el vendor y espera que la URL y el radio lo reflejen.
   * Se usa click() y no check(): el radio se marca recién cuando la URL
   * cambia (~1 s después), y check() exige que cambie en el mismo instante.
   */
  async selectVendor(vendorId: string): Promise<void> {
    await this.vendorRadio(vendorId).click();
    await expect(this.page).toHaveURL(new RegExp(`location=${vendorId}`));
    await expect(this.vendorRadio(vendorId)).toBeChecked();
  }

  /**
   * Espera a que el menú del vendor muestre al menos un producto.
   * El mensaje "Menu ready to explore." aparece incluso con 0 productos,
   * por eso se valida la cantidad que informa el estado del menú.
   */
  async waitForProducts(): Promise<void> {
    await expect(
      this.menuStatus,
      'El menú del vendor no tiene productos (0 items). Posible indisponibilidad del demo, ver BUG-002.',
    ).toHaveText(/showing .+, [1-9]\d* items?\./);
  }

  /** Cantidad de productos visibles en el menú. */
  async productCount(): Promise<number> {
    return this.productButtons.count();
  }
}
