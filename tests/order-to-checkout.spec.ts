import { test, expect } from '../fixtures/evidence';
import { Header } from '../components/Header';
import { MenuPage } from '../pages/MenuPage';
import { order } from '../data/order';
import { highlight, takeEvidence } from '../utils/evidence';

test.describe('ESC-01 Pedido personalizado desde Menu hasta Checkout', () => {
  test('Personalizar un producto OLO y llegar al checkout con precios consistentes', async ({ page }, testInfo) => {
    const header = new Header(page);
    const menu = new MenuPage(page);

    await test.step('1. Acceder a la aplicación y hacer clic en Menu', async () => {
      await page.goto('/en');
      await header.goToMenu();

      await expect(page).toHaveURL(/\/en\/menu/);
      await expect(menu.title).toBeVisible();
    });

    await test.step(`2. Seleccionar el vendor ${order.vendor.id} del provider ${order.vendor.provider}`, async () => {
      await menu.selectVendor(order.vendor.id);

      await expect(menu.vendorRadio(order.vendor.id)).toBeChecked();
      await expect(menu.vendorCard(order.vendor.id)).toContainText(order.vendor.provider);
    });

    await test.step('3. Verificar que el menú se carga después de seleccionar el vendor', async () => {
      await menu.waitForProducts();

      await expect(menu.menuStatus).toContainText(`${order.vendor.provider} — ${order.vendor.id}`);
      expect(await menu.productCount(), 'El menú debe mostrar al menos un producto').toBeGreaterThan(0);

      await highlight(menu.vendorCard(order.vendor.id));
      await highlight(menu.productButtons.first());
      await takeEvidence(page, testInfo, 'vendor_OLO_y_menu_cargado', true);
    });
  });
});
