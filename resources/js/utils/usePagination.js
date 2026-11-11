import { useMemo, useState } from "react";

export const TAILLES_PAGE = [10, 25, 50, 100];

/* Découpe une liste en pages sans effet de bord.
   `resetKey` remet automatiquement à la page 1 quand le filtre change. */
export function usePagination(items, { tailleInitiale = 10, resetKey = "" } = {}) {
    const [etat, setEtat] = useState({
        page: 1,
        taille: tailleInitiale,
        signature: `${resetKey}::${tailleInitiale}`,
    });

    const total = items.length;
    const signature = `${resetKey}::${etat.taille}`;
    const pages = Math.max(1, Math.ceil(total / etat.taille));

    /* Une nouvelle recherche ramène à la première page sans setState en effet. */
    const page = etat.signature === signature ? Math.min(etat.page, pages) : 1;

    const debut = total === 0 ? 0 : (page - 1) * etat.taille;
    const itemsPage = useMemo(
        () => items.slice(debut, debut + etat.taille),
        [items, debut, etat.taille]
    );

    const setPage = (valeur) => {
        const cible = Math.min(Math.max(1, Number(valeur) || 1), pages);
        setEtat((precedent) => ({
            ...precedent,
            page: cible,
            signature,
        }));
    };

    const setTaille = (valeur) => {
        const taille = Number(valeur) || tailleInitiale;
        setEtat((precedent) => ({
            ...precedent,
            page: 1,
            taille,
            signature: `${resetKey}::${taille}`,
        }));
    };

    return {
        items: itemsPage,
        page,
        pages,
        total,
        taille: etat.taille,
        debut,
        fin: Math.min(total, debut + etat.taille),
        setPage,
        setTaille,
    };
}
