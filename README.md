# Freddy's · Prueba E2E con Playwright + TypeScript + POM

Automatización de un pedido personalizado en el **demo de Freddy's**
(`https://demo.freddys.sundevs.cloud/en`), desde **Menu** hasta **Checkout**, **sin realizar el pago**.

El test no solo navega: **valida el contenido del pedido y calcula los importes esperados a partir de los precios que muestra la UI**.

---

## 1. Escenario automatizado (ESC-01)

| Paso | Qué hace el test | Qué valida |
|------|------------------|------------|
| 1 | Abre la home y hace clic en **Menu** | URL `/en/menu` y título "Explore our menu" |
| 2 | Selecciona el vendor **demo-olo** (provider **OLO**) | Radio marcado y la tarjeta indica "OLO" |
| 3 | Espera el menú del vendor | El menú informa **más de 0 productos** |
| 4 | Abre **Freddy's Original Double** | Precio base del detalle = precio de la tarjeta del menú |
| 5 | Agrega **Bacon** y cambia **American Cheese** a **Extra** | Opciones marcadas; cada extra tiene costo visible; precio unitario = base + extras |
| 6 | Clic una vez en **"+"** (barra inferior, junto a "Summary") | Cantidad = 2 |
| 7 | Lee el importe de **Add to Bag** | Importe = (base + extras) × cantidad (también el "Total" de la barra) |
| 8 | Clic en **Add to Bag** | — |
| 9 | — | Mensaje "Added to your bag." y el icono de Bag indica 2 items |
| 10 | Abre Bag con su **icono** | URL `/en/cart` |
| 11 | Lee la línea del producto en Bag | Extras con su costo, cantidad, precio unitario y total de la línea |
| 12 | Clic en **Continue to checkout** | Página Checkout |
| 13 | Lee el resumen del pedido | Producto, extras y cantidad; subtotal = total de Bag; total = subtotal + taxes + fees − discounts + tip |

El botón **Place Order nunca se pulsa**.

## 2. Cómo se validan los precios

- **Nada de precios fijos en el código.** `data/order.ts` solo dice qué pedir (vendor, producto y extras). Todos los importes se leen de la pantalla durante la ejecución.
- **Centavos enteros.** `utils/money.ts` convierte `"$18.48"` en `1848`. Así las sumas y multiplicaciones son exactas (en JavaScript `0.1 + 0.2 ≠ 0.3`).
- **Costo de cada extra según la UI.** Se lee del propio control: el botón "Add Bacon · +$1.00" o la opción "Extra +$0.75".
- **Precio base antes de personalizar.** El "Estimated item price" del detalle se actualiza en vivo con los extras, por eso se lee al abrir el producto.
- **Checkout con los conceptos que aparecen.** Se suman Subtotal, taxes, fees y tip, y se restan discounts, solo si el checkout los muestra. **No se asume ningún porcentaje de impuesto.** Si aparece un concepto que la fórmula no contempla, el test falla para no ignorarlo.

## 3. Estructura del proyecto (Page Object Model)

```
├── components/Header.ts          # Link "Menu" e icono de Bag (presentes en todas las páginas)
├── pages/
│   ├── MenuPage.ts               # Vendor y listado de productos
│   ├── ProductPage.ts            # Extras, cantidad y "Add to Bag"
│   ├── BagPage.ts                # Línea del carrito y "Continue to checkout"
│   └── CheckoutPage.ts           # Resumen del pedido y totales
├── data/order.ts                 # Qué se pide (sin precios)
├── utils/
│   ├── money.ts                  # Importes en centavos
│   └── evidence.ts               # Recuadro rojo y capturas
├── fixtures/evidence.ts          # Guarda el video de cada ejecución
├── tests/order-to-checkout.spec.ts
├── playwright.config.ts
└── .github/workflows/playwright.yml
```

**Reglas del diseño:**
- Los Page Objects **hacen acciones y leen datos**; todos sus locators están en el constructor (un solo lugar para cambiarlos).
- Las **aserciones de negocio** están en el spec, dentro de `test.step` numerados, para que el test se lea como la historia del pedido.
- **Locators por rol y nombre accesible** (`getByRole`). Se usa CSS solo donde el sitio no ofrece otra opción, y queda comentado.
- **Cero `waitForTimeout`.** Todas las esperas son por estado de la UI: URL, texto visible u oculto, opción marcada, valor del campo.

## 4. Requisitos y ejecución

- Node.js 22 o superior.

```bash
npm ci
npx playwright install chromium
npm test                 # ejecución headless
npm run test:headed      # viendo el navegador
npm run report           # abre el reporte HTML
npm run typecheck        # verificación de tipos
```

## 5. Evidencias

Cada ejecución genera:

| Evidencia | Dónde |
|-----------|-------|
| Capturas con **recuadro rojo** sobre lo validado (01 a 08) | `evidencias/ESC-01/NN_<paso>.png` y adjuntas al reporte |
| Video de la ejecución | `evidencias/ESC-01/video_OK.webm` (o `video_FAIL.webm`) |
| Reporte HTML con pasos, anotaciones y trace | `playwright-report/` |
| Trace (siempre activo, también si el test pasa) | dentro del reporte / `test-results/` |

## 6. CI (GitHub Actions)

`.github/workflows/playwright.yml` se ejecuta en cada push o pull request a `main`, y a mano desde la pestaña **Actions**:
instala dependencias y Chromium, verifica tipos, ejecuta el test y publica dos artifacts: `playwright-report` y `evidencias`.

## 7. Comportamientos del demo que el test contempla

| Situación observada | Cómo la maneja el test |
|---------------------|------------------------|
| El primer clic en "Menu" a veces no navega (la página aún no termina de activarse) | Solo ese clic se reintenta hasta que cambie la URL (`toPass`) |
| El radio del vendor se marca ~1 s después, cuando cambia la URL | `click()` y espera de la URL y del radio marcado |
| El catálogo del vendor cambia (se vieron 16, 8, 3 y 0 productos) | Si hay 0 productos o falta el producto, el test **falla con un mensaje claro** |
| Los totales del checkout cargan de forma asíncrona | Espera a que desaparezca "Confirming your order total…" |
| El Tax cambia solo unos segundos después de abrir el checkout | Valida el total con el valor final y deja una anotación `BUG-001` en el reporte, sin fallar |

## 8. Bugs encontrados y supuestos

Los bugs encontrados (con pasos para reproducir y evidencia) y los supuestos de la prueba están en el
**[documento de entrega en Google Drive](https://drive.google.com/file/d/1yi8lKgt46vAc9usJI1IZsl3bpkdPk08I/view?usp=drivesdk)**.

## 9. Pasos no completados

Ninguno: el flujo de Menu a Checkout se completa sin pagar.
