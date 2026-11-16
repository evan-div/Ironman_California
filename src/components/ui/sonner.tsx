"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-line !bg-surface !text-ink !shadow-lift !font-sans",
          description: "!text-muted-ink",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
