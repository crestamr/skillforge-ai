import * as React from "react"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  className?: string
}

const cn = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(' ')
}

const progressVariants = cva(
  "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        sm: "h-2",
        default: "h-4",
        lg: "h-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 bg-primary transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        danger: "bg-red-500",
        info: "bg-blue-500",
        gradient: "bg-gradient-to-r from-blue-500 to-purple-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "gradient"
  showValue?: boolean
  label?: string
  formatValue?: (value: number) => string
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, size, variant = "default", showValue = false, label, formatValue, ...props }, ref) => {
  const displayValue = formatValue ? formatValue(value) : `${Math.round(value)}%`
  
  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-muted-foreground">{displayValue}</span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(progressIndicatorVariants({ variant }))}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Skill Progress Component
export interface SkillProgressProps {
  skill: string
  level: number
  maxLevel?: number
  showLevel?: boolean
  className?: string
}

const SkillProgress = React.forwardRef<HTMLDivElement, SkillProgressProps>(
  ({ skill, level, maxLevel = 5, showLevel = true, className }, ref) => {
    const percentage = (level / maxLevel) * 100
    
    const getVariant = (percentage: number) => {
      if (percentage >= 80) return "success"
      if (percentage >= 60) return "info"
      if (percentage >= 40) return "warning"
      return "danger"
    }
    
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{skill}</span>
          {showLevel && (
            <span className="text-sm text-muted-foreground">
              {level}/{maxLevel}
            </span>
          )}
        </div>
        <Progress
          value={percentage}
          variant={getVariant(percentage)}
          size="sm"
        />
      </div>
    )
  }
)
SkillProgress.displayName = "SkillProgress"

// Circular Progress Component
export interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger" | "info"
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value, size = 120, strokeWidth = 8, className, children, variant = "default" }, ref) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (value / 100) * circumference
    
    const getColor = (variant: string) => {
      switch (variant) {
        case "success": return "stroke-green-500"
        case "warning": return "stroke-yellow-500"
        case "danger": return "stroke-red-500"
        case "info": return "stroke-blue-500"
        default: return "stroke-primary"
      }
    }
    
    return (
      <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn("transition-all duration-300 ease-in-out", getColor(variant))}
          />
        </svg>
        {children && (
          <div className="absolute inset-0 flex items-center justify-center">
            {children}
          </div>
        )}
      </div>
    )
  }
)
CircularProgress.displayName = "CircularProgress"

export { Progress, SkillProgress, CircularProgress }
