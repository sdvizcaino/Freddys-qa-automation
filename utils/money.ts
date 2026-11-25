/**
 * Utilidades para trabajar con dinero en CENTAVOS ENTEROS.
 *
 * ¿Por qué centavos? En JavaScript 0.1 + 0.2 = 0.30000000000000004.
 * Si convertimos "$7.49" a 749, todas las sumas y multiplicaciones son exactas.
 */

/** Busca el primer importe con formato $X o $X.XX dentro de un texto. */
const MONEY_PATTERN = /\$(\d+)(?:\.(\d{2}))?/;

/**
 * Convierte un texto de la UI a centavos.
 * Ejemplos: "$18.48" -> 1848 · "+$1.00" -> 100 · "Total: $8.49" -> 849
 */
export function toCents(text: string): number {
  const match = text.match(MONEY_PATTERN);
  if (!match) {
    throw new Error(`No se encontró un importe con formato $X.XX en el texto: "${text}"`);
  }
  const dollars = Number(match[1]);
  const cents = Number(match[2] ?? '0');
  return dollars * 100 + cents;
}

/** Convierte centavos a texto legible para mensajes. Ejemplo: 1848 -> "$18.48" */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const rest = String(absolute % 100).padStart(2, '0');
  return `${sign}$${dollars}.${rest}`;
}
