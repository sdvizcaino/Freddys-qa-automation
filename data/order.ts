/**
 * Datos del pedido que arma el test.
 * No contiene precios: todos los importes se leen de la UI durante la ejecución.
 */
export const order = {
  /** Tarjeta "Demo Vendor 10" del provider OLO. */
  vendor: { provider: 'OLO', id: 'demo-olo' },
  product: "Freddy's Original Double",
  /** Extras de la sección "MORE PLEASE!" que se agregan con el botón "Add". */
  addOns: ['Bacon'],
  /** Ingredientes incluidos que se cambian de "Regular" a "Extra". */
  extraToppings: ['American Cheese'],
  /** Clics en el botón "+" de la barra inferior (paso 6 del enunciado). */
  quantityClicks: 1,
};
