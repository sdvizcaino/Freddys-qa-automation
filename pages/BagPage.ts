import { Locator, Page, expect } from '@playwright/test';
import { toCents } from '../utils/money';

/** Datos de una línea de Bag, leídos de la UI (precios en centavos). */
export interface BagLine {
  modifiersText: string;
  unitPrice: number;
  lineTotal: number;
  quantity: number;
}

/**
 * Página Bag (/en/cart): líneas del carrito y botón para ir al checkout.
 */
export class BagPage {
  readonly page: Page;
  readonly continueToCheckoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // El sitio escribe "Continue to checkout" (c minúscula); se ignoran mayúsculas.
    this.continueToCheckoutButton = page.getByRole('link', { name: /continue to checkout/i });
  }

  /**
   * Línea del carrito de un producto.
   * Se usa CSS porque el <article> de la línea no tiene nombre accesible;
   * se filtra por el título del producto.
   */
  line(productName: string): Locator {
    return this.page
      .locator('article.guest-cart-line')
      .filter({ has: this.page.getByRole('heading', { name: productName, exact: true }) });
  }

  /** Lee modificadores, precio unitario, total y cantidad de la línea del producto. */
  async readLine(productName: string): Promise<BagLine> {
    const line = this.line(productName);
    await expect(line, `El producto "${productName}" no aparece en Bag`).toBeVisible();

    return {
      modifiersText: await line.getByRole('list').first().innerText(),
      unitPrice: toCents(await line.locator('p').filter({ hasText: 'Estimated item price' }).innerText()),
      lineTotal: toCents(await line.locator('p').filter({ hasText: 'Estimated total' }).innerText()),
      quantity: Number(await line.locator('output[aria-label="Quantity"]').innerText()),
    };
  }

  /** Hace clic en "Continue to checkout" y espera la página de checkout. */
  async continueToCheckout(): Promise<void> {
    await this.continueToCheckoutButton.click();
    await expect(this.page).toHaveURL(/\/en\/checkout/);
  }
}
