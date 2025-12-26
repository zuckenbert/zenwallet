import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'bg-bg-tertiary animate-pulse';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton layouts
export function TokenRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton variant="text" width={60} height={16} />
          <Skeleton variant="text" width={100} height={12} />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton variant="text" width={80} height={16} />
        <Skeleton variant="text" width={60} height={12} />
      </div>
    </div>
  );
}

export function BalanceCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-2xl p-6">
      <div className="text-center mb-6">
        <Skeleton variant="text" width={100} height={14} className="mx-auto mb-2" />
        <Skeleton variant="text" width={200} height={48} className="mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} />
        ))}
      </div>
    </div>
  );
}
