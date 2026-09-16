import type { Expense } from './expense.model';

export interface CategorySlice {
  name: string;
  color: string;
  total: number;
  pct: number;
}

// Paleta para la gráfica de gastos por categoría. Se asigna por orden de
// mayor a menor monto; las categorías llamadas "Otros" siempre usan el gris.
export const PALETTE = [
  '#3b82f6', '#22d3ee', '#8b5cf6', '#a855f7', '#f4728f',
  '#f5a742', '#34d399', '#f472b6', '#60a5fa', '#c084fc',
];
export const OTHER_COLOR = '#9aa4b2';

/**
 * Agrupa una lista de gastos por nombre de categoría y devuelve el total,
 * el porcentaje sobre el total general y un color estable para cada una.
 * Lo usan tanto la vista de Gastos como el Dashboard para no duplicar lógica.
 */
export function buildCategoryBreakdown(
  expenses: Pick<Expense, 'categoryName' | 'amount'>[],
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.categoryName, (totals.get(expense.categoryName) ?? 0) + Number(expense.amount));
  }
  return buildCategorySlicesFromTotals([...totals.entries()].map(([name, total]) => ({ name, total })));
}

/**
 * Igual que buildCategoryBreakdown, pero a partir de totales ya calculados
 * (por ejemplo, los que devuelve /reports/expenses del backend ya agregados
 * por período) en vez de una lista cruda de gastos.
 */
export function buildCategorySlicesFromTotals(items: { name: string; total: number }[]): CategorySlice[] {
  const grandTotal = items.reduce((acc, item) => acc + item.total, 0);

  let paletteIndex = 0;
  return [...items]
    .sort((a, b) => b.total - a.total)
    .map(({ name, total }) => {
      const isOther = name.trim().toLowerCase().startsWith('otros');
      return {
        name,
        color: isOther ? OTHER_COLOR : PALETTE[paletteIndex++ % PALETTE.length],
        total,
        pct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      };
    });
}

/** Construye el `conic-gradient` de la dona a partir de las porciones. */
export function categoryDonutGradient(slices: CategorySlice[]): string {
  const visible = slices.filter((slice) => slice.pct > 0);
  if (visible.length === 0) {
    return 'conic-gradient(rgba(255,255,255,.12) 0% 100%)';
  }

  let acc = 0;
  const stops = visible.map((slice) => {
    const start = acc;
    acc += slice.pct;
    return `${slice.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

/** Colores constantes por tipo, independientemente del monto o la categoría. */
export function buildExpenseTypeBreakdown(
  expenses: Pick<Expense, 'type' | 'amount'>[],
): CategorySlice[] {
  const types = [
    { type: 'FIXED', name: 'Fijos', color: '#000000' },
    { type: 'VARIABLE', name: 'Variables', color: '#38b6ff' },
    { type: 'EXTRAORDINARY', name: 'Extraordinarios', color: '#ffffff' },
  ] as const;
  const slices = types.map(({ type, name, color }) => ({
    name,
    color,
    total: expenses.filter((expense) => expense.type === type)
      .reduce((sum, expense) => sum + Number(expense.amount), 0),
  }));
  const total = slices.reduce((sum, slice) => sum + slice.total, 0);
  return slices.map((slice) => ({ ...slice, pct: total > 0 ? slice.total / total * 100 : 0 }));
}
