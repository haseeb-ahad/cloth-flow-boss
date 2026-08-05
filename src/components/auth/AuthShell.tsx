import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MacbookMockup } from "@/components/MacbookMockup";
import dashboardPreview from "@/assets/dashboard-preview.jpeg";
import invoxaLogo from "@/assets/invoxa-logo.png";

interface AuthShellProps {
  badge?: string;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

/**
 * Modern auth layout: ambient aqua backdrop, floating device preview,
 * and a centered glass card holding the form.
 */
export function AuthShell({ badge, title, subtitle, children, footer, wide }: AuthShellProps) {
  return (
    <div className="landing-midnight relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <motion.div
        className="pointer-events-none absolute -left-40 top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-[140px]"
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-40 bottom-[-12rem] h-[36rem] w-[36rem] rounded-full bg-accent/20 blur-[150px]"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1.05, 1, 1.05] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating device preview (decorative, desktop only) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-[-8%] top-1/2 hidden w-[52%] -translate-y-1/2 opacity-25 blur-[1px] xl:block"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 0.25, y: 0 }}
        transition={{ duration: 1 }}
        style={{ transform: "perspective(1400px) rotateY(-18deg) rotateX(6deg)" }}
      >
        <MacbookMockup>
          <img src={dashboardPreview} alt="" loading="lazy" />
        </MacbookMockup>
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[-14%] top-[8%] hidden w-[42%] opacity-[0.12] blur-[2px] xl:block"
        style={{ transform: "perspective(1400px) rotateY(18deg) rotateX(8deg)" }}
      >
        <MacbookMockup>
          <img src={dashboardPreview} alt="" loading="lazy" />
        </MacbookMockup>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}
        >
          <div className="mb-6 flex justify-center">
            <Link to="/">
              <img src={invoxaLogo} alt="Invoxa" className="h-14 w-auto" />
            </Link>
          </div>

          <div className="relative rounded-[1.75rem] border border-border/70 bg-card/70 p-7 shadow-[0_30px_90px_-40px_hsl(var(--primary)/0.6)] backdrop-blur-xl sm:p-9">
            <div className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

            {badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {badge}
              </span>
            )}

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}

            <div className="mt-7">{children}</div>

            {footer && <div className="mt-7 border-t border-border/60 pt-5 text-center text-sm">{footer}</div>}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Invoices • Inventory • Payments • Credits — all in one control room
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default AuthShell;
