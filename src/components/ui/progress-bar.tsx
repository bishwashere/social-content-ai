interface ProgressBarProps {
  progress: number; // 0-100
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({ 
  progress, 
  size = "sm", 
  showPercentage = false,
  className = "" 
}: ProgressBarProps) {
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3"
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full transition-all duration-300 ${
            clampedProgress === 0 ? 'bg-gray-300' :
            clampedProgress < 30 ? 'bg-red-400' :
            clampedProgress < 70 ? 'bg-yellow-400' :
            'bg-green-400'
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-600 font-medium min-w-[2.5rem]">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
}
