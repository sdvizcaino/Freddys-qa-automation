import { Locator, Page, expect } from '@playwright/test';

/**
 * Header del sitio: link "Menu" e icono de Bag.
 * Es un componente porque aparece en todas las páginas.
 */
export class Header {
  readonly page: Page;
  readonly menuLink: Locator;
  readonly bagIcon: Locator;

  constructor(page: Page) {
    this.page = page;
    // Hay varios links "Menu" (footer, banners); se usa el de la navegación principal.
    this.menuLink = page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Menu', exact: true });
    // El nombre accesible del icono incluye el contador: "Your bag, 2 items".
    this.bagIcon = page.getByRole('link', { name: /^Your bag, \d+ items?$/ });
  }

  /**
   * Hace clic en "Menu" y espera la página del menú.
   * Recién cargada la home, el primer clic a veces no navega porque la página
   * todavía no termina de activarse (hidratación de Next.js). Por eso solo este
   * clic se reintenta con toPass() hasta que la URL cambie. No hay pausas fijas.
   */
  async goToMenu(): Promise<void> {
    await expect(async () => {
      await this.menuLink.click();
      await expect(this.page).toHaveURL(/\/en\/menu/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  /** Abre Bag desde su icono del header y espera la página del carrito. */
  async openBag(): Promise<void> {
    await this.bagIcon.click();
    await expect(this.page).toHaveURL(/\/en\/cart/);
  }
}
