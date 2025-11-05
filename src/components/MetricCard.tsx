import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Glass } from './ui/glass';

type MetricVariant = 'primary' | 'success' | 'warning' | 'neutral';

interface MetricCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  variant?: MetricVariant;
}

const variantStyles: Record<MetricVariant, string> = {
  primary: 'bg-gradient-to-br from-[#00109E] to-[#000860] text-white',
  success: 'bg-gradient-to-br from-green-500 to-green-700 text-white',
  warning: 'bg-gradient-to-br from-orange-500 to-orange-700 text-white',
  neutral: 'bg-neutral-50 text-neutral-900',
};

export function MetricCard({
  icon,
  value,
  label,
  sublabel,
  trend,
  variant = 'neutral',
}: MetricCardProps) {
  const isNeutral = variant === 'neutral';

  return (
    <Glass
      variant="white"
      blur="xl"
      hover
      className={`min-w-[200px] p-6 rounded-2xl transition-all duration-300 ${
        isNeutral ? variantStyles.neutral : ''
      }`}
      style={
        !isNeutral
          ? {
              background: variantStyles[variant].match(/from-\[(.*?)\] to-\[(.*?)\]/)?.[0]
                ? `linear-gradient(to bottom right, ${
                    variantStyles[variant].includes('from-[#00109E]')
                      ? '#00109E, #000860'
                      : variantStyles[variant].includes('from-green')
                      ? '#22c55e, #15803d'
                      : '#f97316, #c2410c'
                  })`
                : undefined,
            }
          : undefined
      }
    >
      <div className="space-y-4">
        {/* Icon */}
        <div className={`text-4xl ${isNeutral ? 'text-neutral-600' : 'text-white'}`}>
          {icon}
        </div>

        {/* Value */}
        <div>
          <div className={`text-5xl ${isNeutral ? 'text-neutral-900' : 'text-white'}`}>
            {value}
          </div>
          <div
            className={`mt-1 ${
              isNeutral ? 'text-neutral-700' : 'text-white/90'
            }`}
          >
            {label}
          </div>
          {sublabel && (
            <div
              className={`text-sm mt-1 ${
                isNeutral ? 'text-neutral-600' : 'text-white/80'
              }`}
            >
              {sublabel}
            </div>
          )}
        </div>

        {/* Trend */}
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs ${
              isNeutral ? 'text-neutral-600' : 'text-white/80'
            }`}
          >
            {trend.direction === 'up' ? (
              <TrendingUp size={14} className="text-green-400" />
            ) : (
              <TrendingDown size={14} className="text-red-400" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </Glass>
  );
}
