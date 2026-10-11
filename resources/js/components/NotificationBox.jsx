import React, { useEffect } from "react";
import "./NotificationBox.css";

function NotificationBox({
    open,
    type = "success",   // "success" | "error"
    title,
    message,
    duration = 2000,    // auto-fermeture en ms (2000 = 2s)
    onClose,
}) {
    /* Auto-fermeture */
    useEffect(() => {
        if (!open) return;

        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [open, duration, onClose]);

    if (!open) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    const defaultTitles = {
        success: "Succès",
        error:   "Erreur",
    };

    const defaultIcons = {
        success: "✓",
        error:   "✕",
    };

    return (
        <div className="notif-overlay" onMouseDown={handleOverlayClick}>
            <div className={`notif-modal notif-${type}`}>

                <div className="notif-icon">
                    {defaultIcons[type] || "•"}
                </div>

                <h2 className="notif-title">
                    {title || defaultTitles[type] || "Notification"}
                </h2>

                {message && (
                    <p className="notif-message">
                        {message}
                    </p>
                )}

                <div className="notif-progress">
                    <div
                        className="notif-progress-bar"
                        style={{
                            animationDuration: `${duration}ms`,
                        }}
                    />
                </div>

            </div>
        </div>
    );
}

export default NotificationBox;