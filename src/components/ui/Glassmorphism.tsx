import React from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps {
  children?: React.ReactNode;
  className?: string;
  hover?: boolean;
  [key: string]: any;
}

export const GlassCard = ({ className, children, hover = true, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "bg-card-bg backdrop-blur-md border border-border-color rounded-2xl transition-all duration-300 shadow-sm",
        hover && "hover:bg-white/[0.08] dark:hover:bg-white/[0.08] hover:shadow-md transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const NeonButton = ({ 
  className, 
  variant = 'cyan', 
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'cyan' | 'purple' | 'green' | 'white' }) => {
  const variants = {
    cyan: "bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]",
    purple: "bg-purple-500 text-black border-purple-400 hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    green: "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    white: "bg-white/10 text-white border-white/20 hover:bg-white/20",
  };

  return (
    <button
      className={cn(
        "px-6 py-2 border rounded-full transition-all duration-300 font-semibold text-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
