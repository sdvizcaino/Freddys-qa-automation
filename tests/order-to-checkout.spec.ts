import { test, expect } from '../fixtures/evidence';
import { Header } from '../components/Header';
import { MenuPage } from '../pages/MenuPage';
import { ProductPage, SelectedExtra } from '../pages/ProductPage';
import { BagPage } from '../pages/BagPage';
import { CheckoutAmounts, CheckoutPage } from '../pages/CheckoutPage';
import { order } from '../data/order';
import { highlight, takeEvidence } from '../utils/evidence';
import { formatCents } from '../utils/money';

/**
 * Regla del enunciado: total = subtotal + taxes + fees − discounts + tip,
 * usando solo los conceptos que el checkout muestra. No se asume un % de tax.
 * Si aparece un concepto no contemplado, el test falla para no ignorarlo en silencio.
 */
function expectedCheckoutTotal(amounts: CheckoutAmounts): number {
  let total = 0;
  for (const [concept, cents] of Object.entries(amounts)) {
    if (/^Subtotal$/i.test(concept) || /tax/i.test(concept) || /fee/i.test(concept) || /tip/i.test(concept)) {
      total += cents;
    } else if (/discount/i.test(concept)) {
      total -= cents;
    } else if (!/^Order Total$/i.test(concept)) {
      throw new Error(`Concepto del checkout no contemplado en la fórmula: "${concept}"`);
    }
  }
  return total;
}

test.describe('ESC-01 Pedido personalizado desde Menu hasta Checkout', () => {
  test('Personalizar un producto OLO y llegar al checkout con precios consistentes', async ({ page }, testInfo) => {
    const header = new Header(page);
    const menu = new MenuPage(page);
    const product = new ProductPage(page);
    const bag = new BagPage(page);
    const checkout = new CheckoutPage(page);

    // Valores leídos de la UI que se reutilizan en los pasos siguientes (en centavos).
    let basePrice = 0;
    let extras: SelectedExtra[] = [];
    let quantity = 0;
    let bagLineTotal = 0;

    /**
     * Verifica que un texto (Bag o Checkout) muestre los extras elegidos con su costo.
     * - Ingredientes en Extra: texto exacto, por ejemplo "American Cheese — Extra ($0.75)".
     * - Extras agregados con "Add": nombre + costo, sin fijar la palabra que acompaña
     *   ("Add" o "Regular"), porque hoy es inconsistente (BUG-003).
     */
    const expectExtrasIn = (text: string, where: string) => {
      for (const extra of extras) {
        const cost = `(${formatCents(extra.cents)})`;
        if (order.extraToppings.includes(extra.name)) {
          expect(text, `${where}: ${extra.name} en Extra`).toContain(`${extra.name} — Extra ${cost}`);
        } else {
          const extraLine = text.split('\n').find((part) => part.includes(`${extra.name} — `)) ?? '';
          expect(extraLine, `${where}: extra ${extra.name} con su costo`).toContain(cost);
        }
      }
    };

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

    await test.step('10. Abrir Bag mediante su icono', async () => {
      await header.openBag();

      await expect(page).toHaveURL(/\/en\/cart/);
    });

    await test.step('11. Comprobar producto, extras, cantidad y precios en Bag', async () => {
      const line = await bag.readLine(order.product);
      const unitPrice = basePrice + extras.reduce((sum, extra) => sum + extra.cents, 0);
      bagLineTotal = line.lineTotal;

      expectExtrasIn(line.modifiersText, 'Bag');
      expect(line.quantity, 'Bag: cantidad').toBe(quantity);
      expect(line.unitPrice, `Bag: precio unitario = ${formatCents(unitPrice)}`).toBe(unitPrice);
      expect(line.lineTotal, `Bag: total de la línea = ${formatCents(unitPrice)} × ${quantity}`).toBe(unitPrice * quantity);

      await highlight(bag.line(order.product));
      await takeEvidence(page, testInfo, 'bag_producto_extras_cantidad_precio');
    });

    await test.step('12. Hacer clic en "Continue to checkout"', async () => {
      await bag.continueToCheckout();

      await expect(checkout.title).toBeVisible();
    });

    await test.step('13. Validar el pedido y los totales del checkout', async () => {
      await checkout.waitForTotals();
      const initialAmounts = await checkout.amounts();
      await highlight(checkout.amountsList);
      await takeEvidence(page, testInfo, 'checkout_totales_iniciales', true);

      // BUG-001: el Tax puede cambiar solo unos segundos después. Se valida con el valor final.
      await checkout.waitForPaymentReady();
      const amounts = await checkout.amounts();
      if (initialAmounts['Tax'] !== amounts['Tax']) {
        const description =
          `Tax inicial ${formatCents(initialAmounts['Tax'])} → final ${formatCents(amounts['Tax'])} ` +
          `(Order Total ${formatCents(initialAmounts['Order Total'])} → ${formatCents(amounts['Order Total'])})`;
        testInfo.annotations.push({ type: 'BUG-001', description });
        console.log(`BUG-001 observado: ${description}`);
      }

      const summaryText = await checkout.orderSummary.innerText();
      expect(summaryText, 'Checkout: producto').toContain(order.product);
      expectExtrasIn(summaryText, 'Checkout');
      expect(summaryText, 'Checkout: cantidad').toContain(`Quantity: ${quantity}`);

      expect(amounts['Subtotal'], 'Checkout: subtotal = total de la línea en Bag').toBe(bagLineTotal);
      const expectedTotal = expectedCheckoutTotal(amounts);
      expect(amounts['Order Total'], `Checkout: total = subtotal + taxes + fees − discounts + tip = ${formatCents(expectedTotal)}`).toBe(expectedTotal);

      // Se verifica que el botón de pago existe, pero nunca se pulsa.
      await expect(checkout.placeOrderButton).toBeVisible();

      await highlight(checkout.orderSummary);
      await takeEvidence(page, testInfo, 'checkout_pedido_y_totales_finales', true);
    });
  });
});
