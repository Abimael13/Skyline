"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import Link from "next/link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    href?: string;
    target?: string;
    rel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, href, target, rel, children, ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

        const variants = {
            primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20",
            secondary: "bg-slate-800 text-white hover:bg-slate-700",
            outline: "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white bg-transparent",
            ghost: "text-slate-400 hover:text-white hover:bg-white/5",
        };

        const sizes = {
            sm: "h-9 px-4 text-sm",
            md: "h-11 px-6 text-base",
            lg: "h-14 px-8 text-lg",
        };

        const classes = cn(baseStyles, variants[variant], sizes[size], className);

        const MotionButton = motion.button;
        const MotionLink = motion.create(Link);

        if (href) {
            return (
                <MotionLink
                    href={href}
                    target={target}
                    rel={rel}
                    whileTap={{ scale: 0.98 }}
                    className={classes}
                >
                    {children}
                </MotionLink>
            );
        }

        return (
            <MotionButton
                ref={ref}
                whileTap={{ scale: 0.98 }}
                className={classes}
                {...(props as any)}
            >
                {isLoading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </MotionButton>
        );
    }
);
Button.displayName = "Button";

export { Button, cn };
