"use client";

// NOTE: This shadcn wrapper is not currently imported anywhere (App.tsx uses
// `<Toaster />` from `sonner` directly). Import specifiers fixed from
// `sonner@2.0.3` / `next-themes@0.4.6` to the unversioned forms in
// fix(02-06) to prevent future dual-instance split (see vite.config.ts).
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
