import { forwardRef, useState } from 'react';
import clsx from 'clsx';

type AutoHideScrollBarContainerProps = {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * hover 显示滚动条，默认隐藏。
 */
export const AutoHideScrollBarContainer = forwardRef<HTMLDivElement, AutoHideScrollBarContainerProps>(
  ({ children, className = '', ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        ref={ref}
        className={clsx(
          'auto-hide-scrollbar-container',
          className,
          isHovered && 'scrollbar-visible',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

AutoHideScrollBarContainer.displayName = 'AutoHideScrollBarContainer';
