import { test, expect } from '../fixtures/evidence';
import { Header } from '../components/Header';
import { MenuPage } from '../pages/MenuPage';
import { ProductPage, SelectedExtra } from '../pages/ProductPage';
import { order } from '../data/order';
import { highlight, takeEvidence } from '../utils/evidence';
import { formatCents } from '../utils/money';

test.describe('ESC-01 Pedido personalizado desde Menu hasta Checkout', () => {
  test('Personalizar un producto OLO y llegar al checkout con precios consistentes', async ({ page }, testInfo) => {
    const header = new Header(page);
    const menu = new MenuPage(page);
    const product = new ProductPage(page);

    // Valores leídos de la UI que se reutilizan en los pasos siguientes (en centavos).
    let basePrice = 0;
    let extras: SelectedExtra[] = [];
    let quantity = 0;

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

    await test.step(`4. Seleccionar el producto ${order.product}`, async () => {
      const cardPrice = await menu.productCardPrice(order.product);
      await menu.openProduct(order.product);

      // El precio base se lee ANTES de personalizar: este valor cambia en vivo con los extras.
      basePrice = await product.estimatedItemPrice();
      await expect(product.heading(order.product)).toBeVisible();
      expect(basePrice, 'El precio base del detalle debe coincidir con el de la tarjeta del menú').toBe(cardPrice);

      await highlight(product.heading(order.product));
      await highlight(product.estimatedItemPriceText);
      await takeEvidence(page, testInfo, 'producto_y_precio_base');
    });

    await test.step('5. Personalizar el producto con extras disponibles', async () => {
      for (const name of order.addOns) {
        extras.push(await product.addAddOn(name));
      }
      for (const name of order.extraToppings) {
        extras.push(await product.chooseExtra(name));
      }

      for (const name of order.addOns) {
        await expect(product.option(name, 'Regular'), `${name} debe quedar agregado`).toBeChecked();
      }
      for (const name of order.extraToppings) {
        await expect(product.option(name, 'Extra'), `${name} debe quedar en Extra`).toBeChecked();
      }
      for (const extra of extras) {
        expect(extra.cents, `El extra ${extra.name} debe tener un costo visible`).toBeGreaterThan(0);
      }
      const extrasTotal = extras.reduce((sum, extra) => sum + extra.cents, 0);
      expect(await product.estimatedItemPrice(), 'Precio unitario = base + extras').toBe(basePrice + extrasTotal);

      for (const name of [...order.addOns, ...order.extraToppings]) {
        await highlight(product.optionGroup(name));
      }
      await takeEvidence(page, testInfo, 'extras_seleccionados', true);
    });

    await test.step('6. Hacer clic una vez en "+" para aumentar la cantidad', async () => {
      const initialQuantity = await product.quantity();
      await product.increaseQuantity(order.quantityClicks);
      quantity = await product.quantity();

      expect(quantity, 'Cantidad = inicial + clics en "+"').toBe(initialQuantity + order.quantityClicks);
    });

    await test.step('7. Validar el importe de "Add to Bag" = (base + extras) × cantidad', async () => {
      const extrasTotal = extras.reduce((sum, extra) => sum + extra.cents, 0);
      const expectedAmount = (basePrice + extrasTotal) * quantity;
      const formula = `(${formatCents(basePrice)} + ${formatCents(extrasTotal)}) × ${quantity} = ${formatCents(expectedAmount)}`;

      expect(await product.addToBagAmount(), `Importe de Add to Bag: ${formula}`).toBe(expectedAmount);
      expect(await product.selectedTotalAmount(), `Total de la barra: ${formula}`).toBe(expectedAmount);

      await highlight(product.quantityInput);
      await highlight(product.addToBagButton);
      await takeEvidence(page, testInfo, 'cantidad_e_importe_add_to_bag');
    });

    await test.step('8. Hacer clic en "Add to Bag"', async () => {
      await product.addToBag();
    });

    await test.step('9. Verificar que el producto se agregó a Bag', async () => {
      await expect(product.addedConfirmation).toBeVisible();
      await expect(header.bagIcon).toHaveAccessibleName(`Your bag, ${quantity} items`);

      await product.addedConfirmation.scrollIntoViewIfNeeded();
      await highlight(product.addedConfirmation);
      await highlight(header.bagIcon);
      await takeEvidence(page, testInfo, 'confirmacion_y_contador_bag');
    });
  });
});
