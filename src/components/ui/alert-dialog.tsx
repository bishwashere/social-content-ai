"use client";
/**
 * Alert Dialog component based on Radix UI
 * Provides a modal dialog for important confirmations
 */
import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { cva } from "class-variance-authority";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "lucide-react";
import { createRoot } from "react-dom/client";

type AlertDialogVariants = "default" | "destructive" | "success" | "warning";

/** Context to manage the state of the alert dialog */

type AlertDialogContextProps = {
  variant?: AlertDialogVariants;
};

const AlertDialogContext = React.createContext<AlertDialogContextProps | null>(
  null
);

/** Hook to access the alert dialog context */
function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "useAlertDialogContext must be used within an AlertDialogProvider"
    );
  }
  return context;
}

/** Root component that manages the state of the alert dialog */
function AlertDialog({
  variant = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root> &
  AlertDialogContextProps) {
  return (
    <AlertDialogContext.Provider value={{ variant }}>
      <AlertDialogPrimitive.Root {...props} />
    </AlertDialogContext.Provider>
  );
}

/** Button that triggers the alert dialog */
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

/** Portal component that renders the dialog outside the DOM hierarchy */
const AlertDialogPortal = AlertDialogPrimitive.Portal;

/** Overlay component that covers the page behind the dialog */
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity duration-300 data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      {...props}
    />
  );
}

const alertDialogVariants = cva(
  [
    "bg-background fixed z-50 grid max-h-[90vh] w-full gap-4 border p-6 shadow-lg duration-200 sm:max-w-lg",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
    "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:rounded-t-lg",
    "sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out",
    "sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0",
    "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
    "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg"
  ].join(" "),
  {
    variants: {
      variant: {
        default: "",
        destructive: "border border-destructive",
        success: "border border-success",
        warning: "border border-warning"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

/** Content container for the alert dialog */
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const { variant } = useAlertDialogContext();
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(alertDialogVariants({ variant }), className)}
        {...props}
      />
    </AlertDialogPortal>
  );
}

const alertDialogHeaderVariants = cva(
  ["flex flex-col space-y-2 text-center sm:text-left"].join(" "),
  {
    variants: {
      variant: {
        default: "",
        destructive: "",
        success: "",
        warning: ""
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

/** Header section for the alert dialog */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { variant } = useAlertDialogContext();
  return (
    <div
      className={cn(alertDialogHeaderVariants({ variant }), className)}
      {...props}
    />
  );
}

const alertDialogFooterVariants = cva(
  ["flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"].join(" "),
  {
    variants: {
      variant: {
        default: "",
        destructive: "",
        success: "",
        warning: ""
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

/** Footer section for the alert dialog */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { variant } = useAlertDialogContext();
  return (
    <div
      className={cn(alertDialogFooterVariants({ variant }), className)}
      {...props}
    />
  );
}

const alertDialogTitleVariants = cva(
  ["text-lg font-semibold flex items-center gap-2 max-sm:justify-center"].join(
    " "
  ),
  {
    variants: {
      variant: {
        default: "",
        destructive: "text-destructive",
        success: "text-success",
        warning: "text-warning"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

/** Title component for the alert dialog */
function AlertDialogTitle({
  className,
  hideIcon,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title> & {
  hideIcon?: boolean;
}) {
  const { variant } = useAlertDialogContext();
  const icons = {
    default: InfoIcon,
    destructive: AlertTriangleIcon,
    success: CheckCircleIcon,
    warning: AlertTriangleIcon
  };

  const Icon = icons[variant || "default"];

  return (
    <AlertDialogPrimitive.Title
      className={cn(alertDialogTitleVariants({ variant }), className)}
      {...props}
    >
      {!hideIcon && <Icon className="h-5 w-5" />}
      {children}
    </AlertDialogPrimitive.Title>
  );
}

const alertDialogDescriptionVariants = cva(
  ["text-muted-foreground text-sm whitespace-pre-line"].join(" "),
  {
    variants: {
      variant: {
        default: "",
        destructive: "",
        success: "",
        warning: ""
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

/** Description component for the alert dialog */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  const { variant } = useAlertDialogContext();
  return (
    <AlertDialogPrimitive.Description
      className={cn(alertDialogDescriptionVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Action button for the alert dialog */
function AlertDialogAction({
  variant = "default",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { variant: contextVariant } = useAlertDialogContext();
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button
        variant={contextVariant === "default" ? variant : contextVariant}
        className={cn("min-w-32", className)}
        {...props}
      >
        {children}
      </Button>
    </AlertDialogPrimitive.Action>
  );
}

/** Cancel button for the alert dialog */
function AlertDialogCancel({
  variant = "ghost",
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button variant={variant} {...props}>
        {children}
      </Button>
    </AlertDialogPrimitive.Cancel>
  );
}

type ConfirmOptions = {
  title?: string;
  description: string;
  cancel?: string;
  confirm?: string;
  variant?: AlertDialogVariants;
};

/** Shows a confirmation dialog and returns a promise that resolves with the user's choice */
function confirm({
  cancel = "Cancel",
  confirm = "Yeah, Sure!",
  title = "Are you sure?",
  description,
  variant = "default"
}: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleClose = (confirmed: boolean) => {
      resolve(confirmed);
      root.unmount();
      container.remove();
    };

    root.render(
      <AlertDialog
        open={true}
        onOpenChange={(open) => !open && handleClose(false)}
        variant={variant}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleClose(true)}>
              {confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  });
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  confirm
};
