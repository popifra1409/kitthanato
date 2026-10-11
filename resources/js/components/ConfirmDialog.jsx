import React from "react";
import "./ConfirmDialog.css";

function ConfirmDialog({
    open,
    title = "Confirmation",
    message = "Êtes-vous sûr ?",
    confirmLabel = "Confirmer",
    cancelLabel = "Annuler",
    type = "warning", // "warning" | "danger" | "info"
    onConfirm,
    onCancel,
    loading = false,
}) {
    if (!open) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onCancel();
        }
    };

    return (
        <div className="confirm-overlay" onMouseDown={handleOverlayClick}>
            <div className={`confirm-modal confirm-${type}`}>

                <div className="confirm-header">
                    <div className="confirm-icon">
                        {type === "danger" && "⚠"}
                        {type === "warning" && "⚠"}
                        {type === "info" && "ℹ"}
                    </div>

                    <h2>{title}</h2>
                </div>

                <div className="confirm-body">
                    <p>{message}</p>
                </div>

                <div className="confirm-actions">
                    <button
                        type="button"
                        className="confirm-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className={`confirm-confirm confirm-confirm-${type}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Traitement..." : confirmLabel}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ConfirmDialog;