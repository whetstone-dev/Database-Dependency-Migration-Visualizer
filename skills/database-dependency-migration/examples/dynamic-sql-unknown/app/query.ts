// Deliberately dynamic. SQL inside host languages is not resolved in v1.
export const lookup = (column: string) => `SELECT ${column} FROM public.customers`;
