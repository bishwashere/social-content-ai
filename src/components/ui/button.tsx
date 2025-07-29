import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";
import { Loader2Icon } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center gap-1.5 cursor-pointer justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary/80 to-primary text-primary-foreground hover:from-primary/90 hover:to-primary",
        destructive:
          "bg-gradient-to-r from-destructive/70 to-destructive text-destructive-foreground hover:from-destructive/80 hover:to-destructive",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        "destructive-outline":
          "border border-destructive hover:bg-destructive/10 text-destructive",
        secondary:
          "bg-gradient-to-r from-secondary/70 to-secondary text-secondary-foreground hover:from-secondary/80 hover:to-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline underline-offset-4 hover:text-foreground transition-colors",
        success:
          "bg-gradient-to-r from-success/70 to-success text-success-foreground hover:from-success/80 hover:to-success",
        warning:
          "bg-gradient-to-r from-warning/70 to-warning text-warning-foreground hover:from-warning/80 hover:to-warning"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        xl: "h-12 px-10",
        icon: "h-10 w-10"
      },
      radius: {
        none: "rounded-none",
        default: "rounded-md",
        full: "rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "default"
    }
  }
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      loading,
      disabled,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading ? <Loader2Icon className="animate-spin" /> : children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
