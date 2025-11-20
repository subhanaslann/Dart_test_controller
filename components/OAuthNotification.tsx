/**
 * OAuthNotification Component
 * 
 * Displays success/error notifications with animations
 */

import React, { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export interface OAuthNotificationProps {
    type: NotificationType;
    message: string;
    isVisible: boolean;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

export const OAuthNotification: React.FC<OAuthNotificationProps> = ({
    type,
    message,
    isVisible,
    onClose,
    autoClose = true,
    duration = 5000
}) => {
    useEffect(() => {
        if (isVisible && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, autoClose, duration, onClose]);

    if (!isVisible) {
        return null;
    }

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-emerald-600/20',
                    border: 'border-emerald-600/50',
                    text: 'text-emerald-400',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            case 'error':
                return {
                    bg: 'bg-red-600/20',
                    border: 'border-red-600/50',
                    text: 'text-red-400',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            case 'info':
                return {
                    bg: 'bg-blue-600/20',
                    border: 'border-blue-600/50',
                    text: 'text-blue-400',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
        }
    };

    const styles = getStyles();

    return (
        <div className="fixed top-4 right-4 z-[100] animate-slideInRight">
            <div
                className={`
          ${styles.bg} ${styles.border} ${styles.text}
          border rounded-lg shadow-2xl p-4 max-w-md
          backdrop-blur-sm
          animate-fadeIn
        `}
                role="alert"
            >
                <div className="flex items-start gap-3">
                    <div className="shrink-0">
                        {styles.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
                        aria-label="Close notification"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress bar for auto-close */}
                {autoClose && (
                    <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-current animate-shrinkWidth"
                            style={{ animationDuration: `${duration}ms` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
