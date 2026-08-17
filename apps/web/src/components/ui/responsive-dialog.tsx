import * as Predicate from "effect/Predicate";
import type * as React from "react";
import { createContext, isValidElement, use as reactUse, useMemo } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ResponsiveDialogContext = createContext<boolean | undefined>(undefined);

const ResponsiveDialog = ({
  children,
  open,
  onOpenChange,
}: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();
  const contextValue = useMemo(() => isMobile, [isMobile]);

  if (isMobile) {
    const drawerProps = {
      ...(onOpenChange === undefined ? {} : { onOpenChange }),
      ...(open === undefined ? {} : { open }),
    };
    return (
      <ResponsiveDialogContext.Provider value={contextValue}>
        <Drawer {...drawerProps} shouldScaleBackground={false}>
          {children}
        </Drawer>
      </ResponsiveDialogContext.Provider>
    );
  }

  const dialogProps = {
    ...(onOpenChange === undefined ? {} : { onOpenChange }),
    ...(open === undefined ? {} : { open }),
  };

  return (
    <ResponsiveDialogContext.Provider value={contextValue}>
      <Dialog {...dialogProps}>{children}</Dialog>
    </ResponsiveDialogContext.Provider>
  );
};

const useResponsiveDialog = () => {
  const context = reactUse(ResponsiveDialogContext);
  if (context === undefined) {
    throw new Error(
      "Responsive dialog components must be used within a ResponsiveDialog."
    );
  }
  return context;
};

const ResponsiveDialogTrigger = ({
  children,
  className,
  asChild,
  ...props
}: React.ComponentProps<typeof DialogTrigger> & { asChild?: boolean }) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return (
      <DrawerTrigger
        className={Predicate.isString(className) ? className : undefined}
      >
        {children}
      </DrawerTrigger>
    );
  }

  if (asChild) {
    return (
      <DialogTrigger
        render={isValidElement(children) ? children : undefined}
        {...props}
      />
    );
  }

  return (
    <DialogTrigger className={className} {...props}>
      {children}
    </DialogTrigger>
  );
};

type ResponsiveDialogContentProps = Omit<
  React.ComponentProps<typeof DialogContent>,
  "aria-describedby" | "aria-label" | "children" | "title"
> & {
  "aria-describedby"?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
};

const ResponsiveDialogContent = ({
  children,
  className,
  description,
  title,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  ...props
}: ResponsiveDialogContentProps) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return (
      <DrawerContent
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        className={Predicate.isString(className) ? className : undefined}
      >
        <div className="mt-2 flex flex-col gap-1.5 px-4 pb-4 text-center">
          <DrawerTitle className="text-lg leading-none font-semibold tracking-tight">
            {title}
          </DrawerTitle>
          {description !== undefined ? (
            <DrawerDescription>{description}</DrawerDescription>
          ) : null}
        </div>
        <div className="max-h-[85vh] overflow-y-auto px-4 pb-4">{children}</div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      className={className}
      {...props}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description !== undefined ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
    </DialogContent>
  );
};

const ResponsiveDialogHeader = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return (
      <div className="mt-2 flex flex-col gap-1.5 pb-4 text-center" {...props}>
        {children}
      </div>
    );
  }

  return (
    <DialogHeader className={className} {...props}>
      {children}
    </DialogHeader>
  );
};

const ResponsiveDialogFooter = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return (
      <div className="flex flex-col-reverse gap-2 pt-4" {...props}>
        {children}
      </div>
    );
  }

  return (
    <DialogFooter className={className} {...props}>
      {children}
    </DialogFooter>
  );
};

const ResponsiveDialogTitle = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return (
      <DrawerTitle
        className={cn(
          "text-lg leading-none font-semibold tracking-tight",
          className
        )}
      >
        {children}
      </DrawerTitle>
    );
  }

  return (
    <DialogTitle className={className} {...props}>
      {children}
    </DialogTitle>
  );
};

const ResponsiveDialogDescription = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        {children}
      </p>
    );
  }

  return (
    <DialogDescription className={className} {...props}>
      {children}
    </DialogDescription>
  );
};

const ResponsiveDialogClose = ({
  children,
}: React.ComponentProps<typeof DialogClose>) => {
  const isMobile = useResponsiveDialog();

  if (isMobile) {
    return <DrawerClose>{children}</DrawerClose>;
  }

  return <DialogClose>{children}</DialogClose>;
};

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
