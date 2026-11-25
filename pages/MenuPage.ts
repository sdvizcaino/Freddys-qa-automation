import { Locator, Page, expect } from '@playwright/test';
import { toCents } from '../utils/money';

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

  /** Tarjeta de un producto del menú (nombre, precio, descripción y botón). */
  productCard(productName: string): Locator {
    return this.page
      .locator('.menu-product-copy')
      .filter({ has: this.page.getByRole('heading', { name: productName, exact: true }) });
  }

  /**
   * Precio que muestra la tarjeta del producto, en centavos.
   * Si el producto no está en el menú, falla rápido con un mensaje claro
   * (el catálogo del demo cambia: se observaron 16, 8, 3 y 0 productos).
   */
  async productCardPrice(productName: string): Promise<number> {
    const card = this.productCard(productName);
    await expect(card, `El producto "${productName}" no está disponible en el menú del vendor`).toBeVisible();
    return toCents(await card.locator('.menu-product-price').innerText());
  }

  /** Abre el detalle del producto con su botón "View details". */
  async openProduct(productName: string): Promise<void> {
    await this.page.getByRole('button', { name: `View details for ${productName}` }).click();
    await expect(this.page.getByRole('heading', { name: productName, level: 1 })).toBeVisible();
  }
}
