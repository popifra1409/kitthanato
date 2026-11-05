/* =========================================================
   EXPORT DES STATISTIQUES — RAPPORTS DÉTAILLÉS (PDF + EXCEL)
   Dépendance Excel : npm install xlsx
========================================================= */

const ENTETE = "HÔPITAL GÉNÉRAL DE YAOUNDÉ";
const SOUS_ENTETE = "Service de thanatopraxie — Statistiques";

/* =========================================================
   FORMATS
========================================================= */

const nb = (n) => Number(n || 0);

const espaces = (t) => String(t).replace(/[\u202f\u00a0]/g, " ");

const fmtNombre = (n) => espaces(nb(n).toLocaleString("fr-FR"));

const fmtDecimal = (n, d = 1) =>
    espaces(
        nb(n).toLocaleString("fr-FR", {
            minimumFractionDigits: d,
            maximumFractionDigits: d,
        })
    );

const fmtMontant = (n) => `${fmtNombre(n)} FCFA`;

const pct = (valeur, total) =>
    !nb(total) ? 0 : Math.round((nb(valeur) / nb(total)) * 1000) / 10;

const dateFr = (iso) => {
    const [a, m, j] = String(iso || "").substring(0, 10).split("-");
    return a && m && j ? `${j}/${m}/${a}` : "";
};

const maintenant = () => {
    const d = new Date();
    return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString(
        "fr-FR",
        { hour: "2-digit", minute: "2-digit" }
    )}`;
};

const echapper = (t) =>
    String(t ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const normaliserCle = (cle) =>
    String(cle || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");

/* =========================================================
   COLONNES
========================================================= */

const COL_TEXTE = (label, opts = {}) => ({ label, type: "texte", ...opts });
const COL_NOMBRE = (label, opts = {}) => ({ label, type: "nombre", ...opts });
const COL_PCT = (label = "Pourcentage", opts = {}) => ({ label, type: "pct", ...opts });
const COL_MONTANT = (label, opts = {}) => ({ label, type: "montant", ...opts });
const COL_HEURES = (label, opts = {}) => ({ label, type: "heures", ...opts });
const COL_JOURS = (label, opts = {}) => ({ label, type: "jours", ...opts });

const formaterCellule = (valeur, type) => {
    switch (type) {
        case "nombre":
            return fmtNombre(valeur);
        case "pct":
            return `${fmtDecimal(valeur)} %`;
        case "montant":
            return `${fmtNombre(valeur)} FCFA`;
        case "heures":
            return `${fmtDecimal(valeur)} h`;
        case "jours":
            return `${fmtDecimal(valeur)} j`;
        default:
            return String(valeur ?? "");
    }
};

const enteteExcel = (col) => {
    switch (col.type) {
        case "pct":
            return `${col.label} (%)`;
        case "montant":
            return `${col.label} (FCFA)`;
        case "heures":
            return `${col.label} (h)`;
        case "jours":
            return `${col.label} (jours)`;
        default:
            return col.label;
    }
};

/* =========================================================
   SECTIONS UTILITAIRES
========================================================= */

const sectionRepartition = (libelle, lignes, cleLabel, totalRef) => {
    const source = lignes || [];
    const data = source.map((r) => [
        r[cleLabel] || "Non précisé",
        nb(r.total),
        pct(r.total, totalRef),
    ]);
    const somme = source.reduce((s, r) => s + nb(r.total), 0);
    return {
        colonnes: [COL_TEXTE(libelle), COL_NOMBRE("Nombre"), COL_PCT()],
        lignes: data,
        total: ["Total", somme, pct(somme, totalRef)],
    };
};

/* Section "Détail des sorties" : une ligne par sortie */
const sectionDetailSorties = (sortiesDetail, options = {}) => {
    const list = sortiesDetail || [];
    const avecFinances = options.avecFinances !== false;

    const colonnes = [
        COL_TEXTE("Date"),
        COL_TEXTE("Heure"),
        COL_TEXTE("Code défunt"),
        COL_TEXTE("Défunt"),
        COL_TEXTE("Récupérateur"),
        COL_JOURS("Jours"),
        COL_MONTANT("Conservation"),
        COL_TEXTE("Chapelle"),
        COL_MONTANT("Chapelle (prix)"),
        COL_MONTANT("Prestations"),
    ];

    if (avecFinances) {
        colonnes.push(COL_MONTANT("Total"));
        colonnes.push(COL_MONTANT("Payé"));
        colonnes.push(COL_MONTANT("Reste"));
    }

    const lignes = list.map((s) => {
        const base = [
            dateFr(s.date),
            String(s.heure || "").substring(0, 5),
            s.code_defunt || "-",
            s.nom_defunt || "-",
            s.recuperateur || "-",
            nb(s.jours),
            nb(s.montant_nuits),
            s.chapelle_nom || "—",
            nb(s.chapelle_prix),
            nb(s.montant_prestations),
        ];

        if (avecFinances) {
            base.push(
                nb(s.montant_total),
                nb(s.montant_paye),
                nb(s.reste_a_payer)
            );
        }

        return base;
    });

    const totalNuits = list.reduce((a, s) => a + nb(s.montant_nuits), 0);
    const totalChap = list.reduce((a, s) => a + nb(s.chapelle_prix), 0);
    const totalPresta = list.reduce(
        (a, s) => a + nb(s.montant_prestations),
        0
    );
    const totalGen = list.reduce((a, s) => a + nb(s.montant_total), 0);
    const totalPaye = list.reduce((a, s) => a + nb(s.montant_paye), 0);
    const totalReste = list.reduce((a, s) => a + nb(s.reste_a_payer), 0);

    const total = [
        "TOTAL",
        "",
        "",
        `${list.length} sortie(s)`,
        "",
        "",
        totalNuits,
        "",
        totalChap,
        totalPresta,
    ];

    if (avecFinances) {
        total.push(totalGen, totalPaye, totalReste);
    }

    return {
        titre: "Détail des sorties de la période",
        colonnes,
        lignes,
        total: lignes.length ? total : null,
    };
};

/* Section "Détail des prestations" : agrégation par prestation */
const sectionDetailPrestations = (sortiesDetail) => {
    const map = new Map();

    (sortiesDetail || []).forEach((s) => {
        (s.prestations || []).forEach((p) => {
            const nom = p.nom || "Prestation";
            const prix = nb(p.prix);
            const existant = map.get(nom) || {
                nom,
                quantite: 0,
                total: 0,
            };
            existant.quantite += 1;
            existant.total += prix;
            map.set(nom, existant);
        });
    });

    const lignes = Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .map((p) => [
            p.nom,
            p.quantite,
            p.quantite > 0 ? Math.round(p.total / p.quantite) : 0,
            p.total,
        ]);

    const totalQ = lignes.reduce((a, l) => a + l[1], 0);
    const totalM = lignes.reduce((a, l) => a + l[3], 0);

    return {
        titre: "Détail des prestations",
        colonnes: [
            COL_TEXTE("Prestation"),
            COL_NOMBRE("Quantité"),
            COL_MONTANT("Prix unitaire moyen"),
            COL_MONTANT("Montant total"),
        ],
        lignes,
        total: lignes.length ? ["TOTAL", totalQ, "", totalM] : null,
    };
};

/* Section "Détail des chapelles" */
const sectionDetailChapelles = (sortiesDetail) => {
    const map = new Map();

    (sortiesDetail || []).forEach((s) => {
        const nom = s.chapelle_nom || "Aucune chapelle";
        const prix = nb(s.chapelle_prix);
        const existant = map.get(nom) || { nom, quantite: 0, total: 0 };
        existant.quantite += 1;
        existant.total += prix;
        map.set(nom, existant);
    });

    const lignes = Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .map((c) => [c.nom, c.quantite, c.quantite ? c.total / c.quantite : 0, c.total]);

    const totalQ = lignes.reduce((a, l) => a + l[1], 0);
    const totalM = lignes.reduce((a, l) => a + l[3], 0);

    return {
        titre: "Détail des chapelles",
        colonnes: [
            COL_TEXTE("Chapelle"),
            COL_NOMBRE("Nombre de levées"),
            COL_MONTANT("Prix unitaire"),
            COL_MONTANT("Montant total"),
        ],
        lignes,
        total: lignes.length ? ["TOTAL", totalQ, "", totalM] : null,
    };
};

/* Section "Détail de la conservation" par sortie */
const sectionDetailConservation = (sortiesDetail) => {
    const list = (sortiesDetail || []).filter((s) => nb(s.montant_nuits) > 0);

    const lignes = list.map((s) => [
        dateFr(s.date),
        s.code_defunt || "-",
        s.nom_defunt || "-",
        s.caisse || "-",
        nb(s.jours),
        nb(s.tarif_jour),
        nb(s.montant_nuits),
    ]);

    const totalJours = lignes.reduce((a, l) => a + l[4], 0);
    const totalMontant = lignes.reduce((a, l) => a + l[6], 0);

    return {
        titre: "Détail de la conservation (nuits facturées)",
        colonnes: [
            COL_TEXTE("Date sortie"),
            COL_TEXTE("Code"),
            COL_TEXTE("Défunt"),
            COL_TEXTE("Caisse"),
            COL_JOURS("Jours"),
            COL_MONTANT("Tarif / jour"),
            COL_MONTANT("Montant"),
        ],
        lignes,
        total: lignes.length
            ? ["TOTAL", "", "", "", totalJours, "", totalMontant]
            : null,
    };
};

/* =========================================================
   CONSTRUCTION DU RAPPORT
========================================================= */

export function construireRapport(cle, stats) {
    const cleNorm = normaliserCle(cle);
    const c = stats?.compteurs || {};
    const totalDepots = nb(c.depots);
    const sortiesDetail = stats?.sorties_detail || [];

    const periode = `${stats?.periode?.libelle || ""} (du ${dateFr(
        stats?.periode?.debut
    )} au ${dateFr(stats?.periode?.fin)})`;

    const base = {
        periode,
        resume: [],
        sections: [],
        notes: [],
    };

    const noteBase =
        "Les pourcentages sont calculés par rapport au nombre total de dépôts de la période.";

    /* Synthèse globale toujours présente */
    const syntheseFinanciere = {
        titre: "Synthèse financière",
        colonnes: [COL_TEXTE("Rubrique"), COL_MONTANT("Montant")],
        lignes: [
            ["Prestations", nb(stats?.finance?.total_prestations)],
            ["Nuits de conservation", nb(stats?.finance?.total_nuits)],
            ["Chapelles", nb(stats?.finance?.total_chapelle)],
        ],
        total: ["Total facturé", nb(stats?.finance?.total_facture)],
    };

    const syntheseEncaissements = {
        titre: "Encaissements",
        colonnes: [COL_TEXTE("Rubrique"), COL_MONTANT("Montant")],
        lignes: [
            ["Total encaissé", nb(stats?.finance?.total_paye)],
            ["Reste à encaisser", nb(stats?.finance?.total_restant)],
            ["Facture moyenne par sortie", nb(stats?.finance?.moyenne_facture)],
        ],
    };

    const syntheseIndicateurs = {
        colonnes: [
            COL_TEXTE("Indicateur"),
            COL_NOMBRE("Valeur"),
            COL_TEXTE("Détail"),
        ],
        lignes: [
            ["Dépôts", nb(c.depots), "Nombre de dépôts enregistrés"],
            ["Sorties", nb(c.sorties), "Sorties effectuées"],
            [
                "Transferts",
                nb(c.transferts),
                `${nb(c.transferts_interne)} interne(s) · ${nb(
                    c.transferts_externe
                )} externe(s)`,
            ],
            [
                "Durée moyenne de conservation (jours)",
                nb(stats?.conservation?.duree_moyenne_jours),
                "Durée moyenne entre l'arrivée et la sortie",
            ],
        ],
    };

    switch (cleNorm) {
        case "indicateurs":
        case "indicateursgeneraux":
            return {
                ...base,
                titre: "Indicateurs généraux",
                feuille: "Indicateurs",
                sections: [syntheseIndicateurs],
                notes: [
                    "Rapport détaillé des indicateurs de la période.",
                ],
            };

        case "provenance":
            return {
                ...base,
                titre: "Répartition par provenance",
                feuille: "Provenance",
                resume: [
                    [
                        "Total des dépôts de la période",
                        fmtNombre(totalDepots),
                    ],
                ],
                sections: [
                    sectionRepartition(
                        "Provenance",
                        stats?.par_provenance,
                        "provenance",
                        totalDepots
                    ),
                    sectionDetailSorties(sortiesDetail, {
                        avecFinances: false,
                    }),
                ],
                notes: [noteBase],
            };

        case "service":
        case "services":
        case "origine":
        case "origines":
            return {
                ...base,
                titre: "Répartition par service d'origine",
                feuille: "Services",
                resume: [
                    [
                        "Total des dépôts de la période",
                        fmtNombre(totalDepots),
                    ],
                ],
                sections: [
                    sectionRepartition(
                        "Service d'origine",
                        stats?.par_service,
                        "service_origine",
                        totalDepots
                    ),
                    sectionDetailSorties(sortiesDetail, {
                        avecFinances: false,
                    }),
                ],
                notes: [
                    "Seuls les dépôts de provenance interne ont un service d'origine.",
                    noteBase,
                ],
            };

        case "motif":
        case "motifs":
            return {
                ...base,
                titre: "Répartition par motif",
                feuille: "Motifs",
                resume: [
                    [
                        "Total des dépôts de la période",
                        fmtNombre(totalDepots),
                    ],
                ],
                sections: [
                    sectionRepartition(
                        "Motif",
                        stats?.par_motif,
                        "motif",
                        totalDepots
                    ),
                    sectionDetailSorties(sortiesDetail, {
                        avecFinances: false,
                    }),
                ],
                notes: [noteBase],
            };

        case "sexe":
        case "sexes":
            return {
                ...base,
                titre: "Répartition par sexe",
                feuille: "Sexe",
                resume: [
                    [
                        "Total des dépôts de la période",
                        fmtNombre(totalDepots),
                    ],
                ],
                sections: [
                    sectionRepartition(
                        "Sexe",
                        stats?.par_sexe,
                        "sexe",
                        totalDepots
                    ),
                    sectionDetailSorties(sortiesDetail, {
                        avecFinances: false,
                    }),
                ],
                notes: [noteBase],
            };

        case "chapelle":
        case "chapelles":
            return {
                ...base,
                titre: "Répartition par chapelle",
                feuille: "Chapelles",
                resume: [
                    [
                        "Total des dépôts de la période",
                        fmtNombre(totalDepots),
                    ],
                ],
                sections: [
                    sectionDetailChapelles(sortiesDetail),
                    sectionRepartition(
                        "Chapelle",
                        stats?.par_chapelle,
                        "chapelle",
                        totalDepots
                    ),
                ],
                notes: [noteBase],
            };

        case "emplacement":
        case "emplacements":
            return {
                ...base,
                titre: "Emplacements les plus utilisés",
                feuille: "Emplacements",
                resume: [
                    [
                        "Total des dépôts de la période",
                        fmtNombre(totalDepots),
                    ],
                ],
                sections: [
                    sectionRepartition(
                        "Emplacement",
                        stats?.top_emplacements,
                        "emplacement",
                        totalDepots
                    ),
                    sectionDetailSorties(sortiesDetail, {
                        avecFinances: false,
                    }),
                ],
                notes: [
                    "Classement des emplacements les plus utilisés.",
                    noteBase,
                ],
            };

        case "transfert":
        case "transferts": {
            const totalT = nb(c.transferts);
            const d = stats?.transferts_delai || {};
            const sommeDelais =
                nb(d.moins_24h) + nb(d.plus_24h) + nb(d.non_calcules);

            return {
                ...base,
                titre: "Analyse des transferts",
                feuille: "Transferts",
                resume: [
                    [
                        "Total des transferts de la période",
                        fmtNombre(totalT),
                    ],
                    [
                        "Délai moyen dépôt → transfert",
                        `${fmtDecimal(d.moyenne_heures)} h`,
                    ],
                ],
                sections: [
                    {
                        titre: "Par type de transfert",
                        colonnes: [
                            COL_TEXTE("Type"),
                            COL_NOMBRE("Nombre"),
                            COL_PCT(),
                        ],
                        lignes: [
                            [
                                "Transferts internes",
                                nb(c.transferts_interne),
                                pct(c.transferts_interne, totalT),
                            ],
                            [
                                "Transferts externes",
                                nb(c.transferts_externe),
                                pct(c.transferts_externe, totalT),
                            ],
                        ],
                        total: [
                            "Total",
                            nb(c.transferts_interne) +
                                nb(c.transferts_externe),
                            pct(
                                nb(c.transferts_interne) +
                                    nb(c.transferts_externe),
                                totalT
                            ),
                        ],
                    },
                    {
                        titre: "Par délai entre le dépôt et le transfert",
                        colonnes: [
                            COL_TEXTE("Délai"),
                            COL_NOMBRE("Nombre"),
                            COL_PCT(),
                        ],
                        lignes: [
                            [
                                "Moins de 24 heures",
                                nb(d.moins_24h),
                                pct(d.moins_24h, totalT),
                            ],
                            [
                                "24 heures et plus",
                                nb(d.plus_24h),
                                pct(d.plus_24h, totalT),
                            ],
                            [
                                "Non classés (date ou heure d'arrivée manquante)",
                                nb(d.non_calcules),
                                pct(d.non_calcules, totalT),
                            ],
                        ],
                        total: [
                            "Total",
                            sommeDelais,
                            pct(sommeDelais, totalT),
                        ],
                    },
                ],
                notes: [
                    "Délai = différence entre la date/heure d'arrivée du dépôt et la date/heure du transfert.",
                ],
            };
        }

        case "conservation":
            return {
                ...base,
                titre: "Durée de conservation",
                feuille: "Conservation",
                resume: [
                    [
                        "Nombre de sorties de la période",
                        fmtNombre(c.sorties),
                    ],
                    [
                        "Durée moyenne de conservation",
                        `${fmtDecimal(
                            stats?.conservation?.duree_moyenne_jours
                        )} jours`,
                    ],
                ],
                sections: [
                    {
                        colonnes: [
                            COL_TEXTE("Indicateur"),
                            COL_JOURS("Valeur"),
                        ],
                        lignes: [
                            [
                                "Durée moyenne entre l'arrivée et la sortie",
                                nb(stats?.conservation?.duree_moyenne_jours),
                            ],
                        ],
                    },
                    sectionDetailConservation(sortiesDetail),
                ],
                notes: [
                    "Le détail ci-dessous liste chaque sortie avec sa durée facturée.",
                ],
            };

        case "finance":
        case "finances":
            return {
                ...base,
                titre: "Synthèse financière détaillée",
                feuille: "Finances",
                resume: [
                    [
                        "Nombre de sorties facturées",
                        fmtNombre(c.sorties),
                    ],
                    [
                        "Taux d'encaissement",
                        `${fmtDecimal(
                            pct(
                                stats?.finance?.total_paye,
                                stats?.finance?.total_facture
                            )
                        )} %`,
                    ],
                ],
                sections: [
                    syntheseFinanciere,
                    syntheseEncaissements,
                    sectionDetailPrestations(sortiesDetail),
                    sectionDetailChapelles(sortiesDetail),
                    sectionDetailConservation(sortiesDetail),
                    sectionDetailSorties(sortiesDetail, {
                        avecFinances: true,
                    }),
                ],
                notes: [
                    "Toutes les prestations, chapelles et nuits de conservation sont détaillées.",
                ],
            };

        /* ---------- FALLBACK : rapport complet ---------- */
        default: {
            const sections = [
                syntheseIndicateurs,
                sectionRepartition(
                    "Provenance",
                    stats?.par_provenance,
                    "provenance",
                    totalDepots
                ),
                sectionRepartition(
                    "Service d'origine",
                    stats?.par_service,
                    "service_origine",
                    totalDepots
                ),
                sectionRepartition(
                    "Motif",
                    stats?.par_motif,
                    "motif",
                    totalDepots
                ),
                sectionRepartition(
                    "Sexe",
                    stats?.par_sexe,
                    "sexe",
                    totalDepots
                ),
                sectionRepartition(
                    "Chapelle",
                    stats?.par_chapelle,
                    "chapelle",
                    totalDepots
                ),
                sectionRepartition(
                    "Emplacement",
                    stats?.top_emplacements,
                    "emplacement",
                    totalDepots
                ),
                syntheseFinanciere,
                syntheseEncaissements,
                sectionDetailPrestations(sortiesDetail),
                sectionDetailChapelles(sortiesDetail),
                sectionDetailConservation(sortiesDetail),
                sectionDetailSorties(sortiesDetail, {
                    avecFinances: true,
                }),
            ].filter((s) => s && (s.lignes?.length || s.total));

            return {
                ...base,
                titre: "Rapport statistique complet",
                feuille: "Statistiques",
                resume: [
                    ["Dépôts", fmtNombre(c.depots)],
                    ["Sorties", fmtNombre(c.sorties)],
                    ["Transferts", fmtNombre(c.transferts)],
                    [
                        "Total facturé",
                        fmtMontant(stats?.finance?.total_facture),
                    ],
                    [
                        "Total encaissé",
                        fmtMontant(stats?.finance?.total_paye),
                    ],
                ],
                sections,
                notes: [noteBase],
            };
        }
    }
}

/* =========================================================
   IMPRESSION / PDF
========================================================= */

const construireHtml = (r) => {
    const tableau = (s) => {
        const entetes = s.colonnes
            .map(
                (col) =>
                    `<th class="${
                        col.type === "texte" ? "g" : "d"
                    }">${echapper(col.label)}</th>`
            )
            .join("");

        const ligne = (valeurs, classe = "") =>
            `<tr class="${classe}">${valeurs
                .map(
                    (v, i) =>
                        `<td class="${
                            s.colonnes[i].type === "texte" ? "g" : "d"
                        }">${echapper(
                            formaterCellule(v, s.colonnes[i].type)
                        )}</td>`
                )
                .join("")}</tr>`;

        const corps = s.lignes.length
            ? s.lignes.map((l) => ligne(l)).join("")
            : `<tr><td colspan="${s.colonnes.length}" class="vide">Aucune donnée sur cette période.</td></tr>`;

        return `
            ${s.titre ? `<h3>${echapper(s.titre)}</h3>` : ""}
            <table>
                <thead><tr>${entetes}</tr></thead>
                <tbody>${corps}</tbody>
                ${
                    s.total && s.lignes.length
                        ? `<tfoot>${ligne(s.total, "total")}</tfoot>`
                        : ""
                }
            </table>`;
    };

    const resume = r.resume.length
        ? `<table class="resume"><tbody>${r.resume
              .map(
                  ([l, v]) =>
                      `<tr><td class="g">${echapper(
                          l
                      )}</td><td class="d"><strong>${echapper(
                          v
                      )}</strong></td></tr>`
              )
              .join("")}</tbody></table>`
        : "";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${echapper(r.titre)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; margin: 0;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .entete { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  .entete strong { display: block; font-size: 15px; }
  .entete span { font-size: 11px; }
  h1 { font-size: 17px; margin: 10px 0 4px; text-align: center; text-transform: uppercase; }
  .periode { text-align: center; margin-bottom: 12px; font-size: 12px; }
  h3 { font-size: 12.5px; margin: 14px 0 5px; color: #222; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th, td { border: 1px solid #444; padding: 5px 6px; }
  th { background: #e5e5e5; font-size: 10.5px; }
  .g { text-align: left; }
  .d { text-align: right; }
  tr.total td { background: #f0f0f0; font-weight: bold; }
  .resume { width: auto; min-width: 55%; margin: 0 0 12px; }
  .resume td { border: 1px solid #999; }
  .vide { text-align: center; padding: 12px; color: #555; font-style: italic; }
  .notes { margin-top: 12px; font-size: 10.5px; color: #333; }
  .notes p { margin: 3px 0; }
  .pied { margin-top: 18px; border-top: 1px solid #000; padding-top: 6px; font-size: 10px;
          display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="entete">
    <strong>${echapper(ENTETE)}</strong>
    <span>${echapper(SOUS_ENTETE)}</span>
  </div>

  <h1>${echapper(r.titre)}</h1>
  <div class="periode"><strong>Période :</strong> ${echapper(r.periode)}</div>

  ${resume}
  ${r.sections.map(tableau).join("")}

  ${
      r.notes.length
          ? `<div class="notes">${r.notes
                .map((n) => `<p>• ${echapper(n)}</p>`)
                .join("")}</div>`
          : ""
  }

  <div class="pied">
    <span>Édité le ${echapper(maintenant())}</span>
    <span>${echapper(r.titre)}</span>
  </div>
</body>
</html>`;
};

export function imprimerRapport(rapport) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(construireHtml(rapport));
    doc.close();

    iframe.contentWindow.onafterprint = () => iframe.remove();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 250);
}

/* =========================================================
   EXPORT EXCEL — multi-feuilles
========================================================= */

const slug = (texte) =>
    String(texte)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const sanitizeFeuille = (nom) =>
    String(nom || "Feuille")
        .replace(/[\\/?*[\]:]/g, " ")
        .substring(0, 31);

export async function exporterExcel(r) {
    const XLSX = await import("xlsx");

    const classeur = XLSX.utils.book_new();

    /* ============ FEUILLE 1 : SYNTHÈSE ============ */

    const synth = [
        [ENTETE],
        [SOUS_ENTETE],
        [],
        [r.titre.toUpperCase()],
        ["Période", r.periode],
        ["Édité le", maintenant()],
        [],
    ];

    if (r.resume.length) {
        synth.push(["Récapitulatif de la période"]);
        r.resume.forEach(([l, v]) => synth.push([l, v]));
        synth.push([]);
    }

    /* Résumé compact des sections */
    r.sections.forEach((s) => {
        if (!s.titre) return;
        synth.push([s.titre]);
        if (s.total) {
            s.total.forEach((v, i) => {
                const col = s.colonnes[i];
                if (col?.type === "texte" && i === 0) return;
                synth.push([`  ${col?.label || ""}`, v]);
            });
        }
        synth.push([]);
    });

    r.notes.forEach((n) => synth.push(["• " + n]));

    const fSynth = XLSX.utils.aoa_to_sheet(synth);
    fSynth["!cols"] = [{ wch: 45 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(classeur, fSynth, "Synthèse");

    /* ============ FEUILLES PAR SECTION ============ */

    r.sections.forEach((s, idx) => {
        if (!s.lignes || s.lignes.length === 0) return;

        const aoa = [];

        aoa.push([ENTETE]);
        aoa.push([SOUS_ENTETE]);
        aoa.push([]);
        aoa.push([r.titre.toUpperCase()]);
        aoa.push(["Période", r.periode]);
        aoa.push([]);
        if (s.titre) aoa.push([s.titre]);
        aoa.push(s.colonnes.map(enteteExcel));

        s.lignes.forEach((l) => aoa.push(l));

        if (s.total) {
            aoa.push([]);
            aoa.push(s.total);
        }

        const feuille = XLSX.utils.aoa_to_sheet(aoa);
        feuille["!cols"] = s.colonnes.map((col) => ({
            wch:
                col.type === "montant" || col.type === "nombre"
                    ? 16
                    : col.type === "pct"
                    ? 12
                    : 26,
        }));

        const nom = sanitizeFeuille(
            s.titre || `${r.feuille || "Section"} ${idx + 1}`
        );
        XLSX.utils.book_append_sheet(classeur, feuille, nom);
    });

    /* ============ ENREGISTREMENT ============ */

    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(classeur, `statistique-${slug(r.titre)}-${date}.xlsx`);
}