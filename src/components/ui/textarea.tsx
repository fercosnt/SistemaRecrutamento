import * as React from "react";

import { cn } from "./utils";

/**
 * ⚠ 2026-09-06: era `function Textarea({ className, ...props })` — o padrão shadcn para
 *   React 19, onde `ref` chega como prop. Este projeto está no React 18: o `ref` era
 *   DESCARTADO, então `{...register('observacoes_rh')}` do React Hook Form (modo
 *   uncontrolled, lê o valor pelo ref) nunca prendia e o campo ia ao banco como NULL.
 *   Medido em PROD no agendamento de entrevista: «Observações internas» digitadas,
 *   `observacoes_rh = null`; o `entrevistador`, num `Input` com forwardRef, gravou.
 *   Mesmo idioma do `Input`.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
