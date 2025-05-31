import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, getInitials } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  name?: string
  status?: "online" | "offline" | "away" | "busy"
  showStatus?: boolean
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, name, status, showStatus = false, ...props }, ref) => {
  const initials = name ? getInitials(name) : fallback || "?"
  
  return (
    <div className="relative">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <AvatarImage src={src} alt={alt || name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </AvatarPrimitive.Root>
      {showStatus && status && (
        <div
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            {
              "bg-green-500": status === "online",
              "bg-gray-500": status === "offline",
              "bg-yellow-500": status === "away",
              "bg-red-500": status === "busy",
            }
          )}
        />
      )}
    </div>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Avatar Group Component
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string
    alt?: string
    name?: string
    fallback?: string
  }>
  max?: number
  size?: "sm" | "default" | "lg" | "xl" | "2xl"
  className?: string
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ avatars, max = 5, size = "default", className }, ref) => {
    const displayAvatars = avatars.slice(0, max)
    const remainingCount = avatars.length - max
    
    return (
      <div ref={ref} className={cn("flex -space-x-2", className)}>
        {displayAvatars.map((avatar, index) => (
          <Avatar
            key={index}
            size={size}
            src={avatar.src}
            alt={avatar.alt}
            name={avatar.name}
            fallback={avatar.fallback}
            className="border-2 border-background"
          />
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              avatarVariants({ size }),
              "flex items-center justify-center border-2 border-background bg-muted text-xs font-medium"
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = "AvatarGroup"

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup }
