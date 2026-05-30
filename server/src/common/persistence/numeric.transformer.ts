import type { ValueTransformer } from 'typeorm';

/**
 * El driver `pg` devuelve `numeric` como string. Eso es lo que queremos para
 * preservar precisión decimal (no usar `number`).
 * Este transformer asegura que TS también lo trate como string en ambas direcciones.
 *
 * Uso:
 *   @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
 *   salePrice!: string;
 */
export const numericString: ValueTransformer = {
  to: (value: string | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    return String(value);
  },
  from: (value: string | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    return String(value);
  },
};
