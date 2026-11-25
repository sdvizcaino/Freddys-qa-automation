import { Locator, Page, expect } from '@playwright/test';
import { toCents } from '../utils/money';

/** Un extra elegido y lo que cuesta por unidad, leído de la UI. */
export interface SelectedExtra {
  name: string;
  cents: number;
}

/**
 * Página de detalle (configuración) de un producto:
 * extras, cantidad y botón "Add to Bag".
 */
export class ProductPage {
  readonly page: Page;
  readonly estimatedItemPriceText: Locator;
  readonly moreSection: Locator;
  readonly increaseQuantityButton: Locator;
  readonly quantityInput: Locator;
  readonly selectedTotal: Locator;
  readonly addToBagButton: Locator;
  readonly addedConfirmation: Locator;

  constructor(page: Page) {
    this.page = page;
    // Precio del encabezado: "Estimated item price$7.49". El filtro exige que empiece así
    // para no confundirlo con el del modal Summary ("Estimated item price: $7.49").
    this.estimatedItemPriceText = page
      .locator('p')
      .filter({ hasText: /^Estimated item price\$/ })
      .locator('strong');
    // Sección colapsable de extras con costo ("MORE PLEASE!").
    this.moreSection = page.locator('details').filter({ hasText: 'MORE PLEASE!' });
    // Barra inferior junto al link "Summary" (el modal Summary no tiene "+").
    this.increaseQuantityButton = page.getByRole('button', { name: 'Increase quantity' });
    this.quantityInput = page.getByRole('spinbutton', { name: 'Quantity' });
    this.selectedTotal = page.locator('.menu-selected-price');
    // Nombre accesible real: "Add to Bag Total: $18.48".
    this.addToBagButton = page.getByRole('button', { name: /^Add to Bag/ });
    this.addedConfirmation = page.getByText('Added to your bag.');
  }

  /** Título del producto. */
  heading(productName: string): Locator {
    return this.page.getByRole('heading', { name: productName, level: 1 });
  }

  /** Grupo de opciones de un ingrediente o extra, por ejemplo "American Cheese — TOPPINGS". */
  optionGroup(name: string): Locator {
    return this.page.getByRole('radiogroup', { name: `${name} — ` });
  }

  /** Opción dentro de un grupo: "None", "Regular" o "Extra". */
  option(name: string, optionName: string): Locator {
    return this.optionGroup(name).getByRole('radio', { name: new RegExp(`^${optionName}`) });
  }

  /** Botón "Add" de un extra de MORE PLEASE!. Nombre real: "Add Bacon · +$1.00". */
  addButton(name: string): Locator {
    return this.moreSection.getByRole('button', { name: `Add ${name}` });
  }

  /** Precio unitario estimado actual, en centavos. Se actualiza en vivo con cada extra. */
  async estimatedItemPrice(): Promise<number> {
    return toCents(await this.estimatedItemPriceText.innerText());
  }

  /**
   * Agrega un extra de la sección MORE PLEASE! con su botón "Add".
   * El costo se lee del propio botón antes de hacer clic.
   */
  async addAddOn(name: string): Promise<SelectedExtra> {
    if ((await this.moreSection.getAttribute('open')) === null) {
      await this.moreSection.locator('summary').click();
    }
    const button = this.addButton(name);
    const label = (await button.getAttribute('aria-label')) ?? '';
    const cents = label.includes('$') ? toCents(label) : 0;

    await button.click();
    // Al agregarlo, el sitio lo muestra con la opción "Regular" marcada.
    await expect(this.option(name, 'Regular')).toBeChecked();
    return { name, cents };
  }

  /**
   * Cambia un ingrediente incluido de "Regular" a "Extra".
   * El costo se lee de la etiqueta de la opción, por ejemplo "Extra +$0.75".
   */
  async chooseExtra(name: string): Promise<SelectedExtra> {
    const extraOption = this.option(name, 'Extra');
    const label = await this.optionGroup(name).locator('label').filter({ hasText: /^Extra/ }).innerText();
    const cents = label.includes('$') ? toCents(label) : 0;

    await extraOption.click();
    await expect(extraOption).toBeChecked();
    return { name, cents };
  }

  /** Cantidad actual del producto. */
  async quantity(): Promise<number> {
    return Number(await this.quantityInput.inputValue());
  }

  /** Hace clic en "+" las veces indicadas y espera que la cantidad se actualice. */
  async increaseQuantity(times: number): Promise<void> {
    const expected = (await this.quantity()) + times;
    for (let i = 0; i < times; i++) {
      await this.increaseQuantityButton.click();
    }
    await expect(this.quantityInput).toHaveValue(String(expected));
  }

  /** Importe que muestra el botón "Add to Bag", en centavos. */
  async addToBagAmount(): Promise<number> {
    return toCents(await this.addToBagButton.innerText());
  }

  /** Total que muestra la barra inferior ("Total: $X"), en centavos. */
  async selectedTotalAmount(): Promise<number> {
    return toCents(await this.selectedTotal.innerText());
  }

  /** Hace clic en "Add to Bag" y espera el mensaje de confirmación. */
  async addToBag(): Promise<void> {
    await this.addToBagButton.click();
    await expect(this.addedConfirmation).toBeVisible();
  }
}
