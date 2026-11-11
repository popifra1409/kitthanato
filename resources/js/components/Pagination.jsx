import { TAILLES_PAGE } from "../utils/usePagination";
import "./Pagination.css";

/* Numéros affichés : toujours la première et la dernière, plus le voisinage. */
const numerosVisibles = (page, pages) => {
    if (pages <= 7) {
        return Array.from({ length: pages }, (_, i) => i + 1);
    }

    const numeros = new Set([1, pages, page]);
    if (page > 2) numeros.add(page - 1);
    if (page < pages - 1) numeros.add(page + 1);
    if (page <= 3) [2, 3, 4].forEach((n) => numeros.add(n));
    if (page >= pages - 2) {
        [pages - 3, pages - 2, pages - 1].forEach((n) => numeros.add(n));
    }

    return [...numeros]
        .filter((n) => n >= 1 && n <= pages)
        .sort((a, b) => a - b);
};

export default function Pagination({
    page,
    pages,
    total,
    taille,
    onPage,
    onTaille,
    element = "résultat",
    tailles = TAILLES_PAGE,
    className = "",
}) {
    const numeros = numerosVisibles(page, pages);
    const debut = (page - 1) * taille + 1;
    const fin = Math.min(total, page * taille);

    return (
        <nav
            className={`pagination ${className}`.trim()}
            aria-label="Pagination des résultats"
        >
            <div className="pagination-info">
                <span className="pagination-compte">
                    <strong>
                        {debut}–{fin}
                    </strong>{" "}
                    sur <strong>{total}</strong> {element}
                    {total !== 1 ? "s" : ""}
                </span>

                <label className="pagination-taille">
                    Lignes
                    <select
                        value={taille}
                        onChange={(e) => onTaille(Number(e.target.value))}
                        aria-label="Nombre de résultats par page"
                    >
                        {tailles.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="pagination-pages">
                <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => onPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Page précédente"
                >
                    ‹
                </button>

                {numeros.map((numero, index) => {
                    const precedent = numeros[index - 1];
                    const ecart = precedent && numero - precedent > 1;

                    return (
                        <span className="pagination-item" key={numero}>
                            {ecart && (
                                <span className="pagination-ellipse">…</span>
                            )}
                            <button
                                type="button"
                                className={`pagination-btn ${
                                    numero === page ? "actif" : ""
                                }`}
                                onClick={() => onPage(numero)}
                                aria-current={numero === page ? "page" : undefined}
                            >
                                {numero}
                            </button>
                        </span>
                    );
                })}

                <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => onPage(page + 1)}
                    disabled={page >= pages}
                    aria-label="Page suivante"
                >
                    ›
                </button>
            </div>
        </nav>
    );
}
