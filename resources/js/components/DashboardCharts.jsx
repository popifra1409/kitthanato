const LARGEUR = 720;
const HAUTEUR = 240;
const MARGES = { haut: 18, droite: 16, bas: 30, gauche: 38 };

const construireChemin = (points, cle, x, y) =>
    points
        .map(
            (point, index) =>
                `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(
                    point[cle]
                ).toFixed(1)}`
        )
        .join(" ");

/* =========================================================
   COURBE ADMISSIONS / SORTIES
========================================================= */

export function CourbeFlux({ points = [] }) {
    if (points.length === 0) {
        return (
            <div className="chart-vide">
                Aucune donnée sur les 14 derniers jours.
            </div>
        );
    }

    const largeurUtile = LARGEUR - MARGES.gauche - MARGES.droite;
    const hauteurUtile = HAUTEUR - MARGES.haut - MARGES.bas;

    const maximum = Math.max(
        1,
        ...points.map((point) => Math.max(point.admissions, point.sorties))
    );
    const pas = Math.max(1, Math.ceil(maximum / 4));
    const echelle = pas * 4;

    const x = (index) =>
        MARGES.gauche +
        (points.length > 1
            ? (index * largeurUtile) / (points.length - 1)
            : largeurUtile / 2);

    const y = (valeur) =>
        MARGES.haut + hauteurUtile - (valeur / echelle) * hauteurUtile;

    const aire = (cle) =>
        `${construireChemin(points, cle, x, y)} L${x(points.length - 1).toFixed(
            1
        )},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

    const graduations = Array.from({ length: 5 }, (_, index) => index * pas);
    const pasLabel = Math.ceil(points.length / 6);

    return (
        <svg
            className="chart-courbe"
            viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
            role="img"
            aria-label="Admissions et sorties des 14 derniers jours"
        >
            {graduations.map((valeur) => (
                <g key={`grad-${valeur}`}>
                    <line
                        className="chart-grille"
                        x1={MARGES.gauche}
                        x2={LARGEUR - MARGES.droite}
                        y1={y(valeur)}
                        y2={y(valeur)}
                    />
                    <text
                        className="chart-axe"
                        x={MARGES.gauche - 8}
                        y={y(valeur)}
                        textAnchor="end"
                        dominantBaseline="middle"
                    >
                        {valeur}
                    </text>
                </g>
            ))}

            {points.map((point, index) =>
                index % pasLabel === 0 ? (
                    <text
                        key={`label-${point.date}`}
                        className="chart-axe"
                        x={x(index)}
                        y={HAUTEUR - 8}
                        textAnchor="middle"
                    >
                        {point.label}
                    </text>
                ) : null
            )}

            <path
                className="chart-aire chart-aire-admission"
                d={aire("admissions")}
            />
            <path
                className="chart-aire chart-aire-sortie"
                d={aire("sorties")}
            />

            <path
                className="chart-ligne chart-ligne-admission"
                d={construireChemin(points, "admissions", x, y)}
            />
            <path
                className="chart-ligne chart-ligne-sortie"
                d={construireChemin(points, "sorties", x, y)}
            />

            {points.map((point, index) => (
                <g key={point.date}>
                    <circle
                        className="chart-point chart-point-admission"
                        cx={x(index)}
                        cy={y(point.admissions)}
                        r="3"
                    >
                        <title>
                            {`${point.label} : ${point.admissions} admission(s)`}
                        </title>
                    </circle>
                    <circle
                        className="chart-point chart-point-sortie"
                        cx={x(index)}
                        cy={y(point.sorties)}
                        r="3"
                    >
                        <title>
                            {`${point.label} : ${point.sorties} sortie(s)`}
                        </title>
                    </circle>
                </g>
            ))}
        </svg>
    );
}

/* =========================================================
   ANNEAU D'OCCUPATION
========================================================= */

export function DonutOccupation({ occupes = 0, actifs = 0, taux = 0 }) {
    const rayon = 54;
    const circonference = 2 * Math.PI * rayon;
    const rempli =
        (Math.min(100, Math.max(0, taux)) / 100) * circonference;

    return (
        <svg
            className="donut"
            viewBox="0 0 140 140"
            role="img"
            aria-label={`${taux} % des caissons actifs occupés`}
        >
            <circle className="donut-fond" cx="70" cy="70" r={rayon} />
            <circle
                className="donut-valeur"
                cx="70"
                cy="70"
                r={rayon}
                strokeDasharray={`${rempli} ${circonference - rempli}`}
                transform="rotate(-90 70 70)"
            />
            <text className="donut-taux" x="70" y="68" textAnchor="middle">
                {taux}%
            </text>
            <text className="donut-legende" x="70" y="88" textAnchor="middle">
                {occupes} / {actifs}
            </text>
        </svg>
    );
}
