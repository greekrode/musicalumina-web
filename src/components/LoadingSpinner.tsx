import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

function LoadingSpinner({ fullScreen = false, message = 'Loading...' }: LoadingSpinnerProps) {
  const baseClasses = "flex items-center justify-center bg-[#FFFFF0]/80 backdrop-blur-sm animate-fadeIn";
  const containerClasses = fullScreen 
    ? `fixed inset-0 z-50 ${baseClasses}`
    : `w-full min-h-[200px] ${baseClasses}`;

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#CFB53B] animate-spin mx-auto mb-4" />
        <p className="text-[#808080] font-medium">{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;