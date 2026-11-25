import { Locator, Page, expect } from '@playwright/test';
import { toCents } from '../utils/money';

/** Importes del resumen del checkout, en centavos. Concepto -> valor. */
export type CheckoutAmounts = Record<string, number>;

/**
 * Página Checkout: resumen del pedido y totales.
 * El botón "Place Order" NUNCA se pulsa (el enunciado pide no pagar).
 */
export class CheckoutPage {
  readonly page: Page;
  readonly title: Locator;
  readonly orderSummary: Locator;
  readonly amountsList: Locator;
  readonly amountRows: Locator;
  readonly confirmingTotals: Locator;
  readonly preparingPayment: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { name: 'Checkout', exact: true });
    // Contenedor del resumen "Your Order Summary" (producto, extras, cantidad y totales).
    this.orderSummary = page
      .locator('section, aside')
      .filter({ has: page.getByRole('heading', { name: /Your Order\s*Summary/i }) })
      .filter({ has: page.locator('dl') });
    // Cada fila de importes es <div><dt>Concepto</dt><dd>$X</dd></div>.
    this.amountsList = this.orderSummary.locator('dl');
    this.amountRows = this.amountsList.locator('div');
    this.confirmingTotals = page.getByText('Confirming your order total…');
    this.preparingPayment = page.getByText('Preparing secure payment…');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
  }

  /** Espera a que el checkout termine de calcular y muestre el subtotal. */
  async waitForTotals(): Promise<void> {
    await expect(this.confirmingTotals).toBeHidden();
    await expect(this.amountRows.filter({ hasText: 'Subtotal' }).locator('dd')).toHaveText(/\$\d/);
  }

  /**
   * Espera a que termine "Preparing secure payment…".
   * En ese momento el Tax toma su valor final (ver BUG-001).
   */
  async waitForPaymentReady(): Promise<void> {
    await expect(this.preparingPayment).toBeHidden({ timeout: 30_000 });
  }

  /** Lee todas las filas de importes: { Subtotal: 1848, Tax: 67, "Order Total": 1915 }. */
  async amounts(): Promise<CheckoutAmounts> {
    const result: CheckoutAmounts = {};
    for (const row of await this.amountRows.all()) {
      const concept = (await row.locator('dt').innerText()).trim();
      result[concept] = toCents(await row.locator('dd').innerText());
    }
    return result;
  }
}
