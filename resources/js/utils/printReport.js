/* =====================================================
   IMPRESSION D'UN RAPPORT
===================================================== */

export function printReport({ titre, periode, sections }) {
    const fenetre = window.open("", "_blank", "width=900,height=1000");

    if (!fenetre) {
        alert("La fenêtre d'impression a été bloquée par le navigateur.");
        return;
    }

    const dateImpression = new Date().toLocaleString("fr-FR");

    const sectionsHtml = sections
        .map((section) => {
            if (section.type === "kpis") {
                return `
                    <div class="section">
                        <div class="section-title">${section.titre}</div>
                        <div class="kpis">
                            ${section.items
                                .map(
                                    (item) => `
                                <div class="kpi">
                                    <div class="kpi-label">${item.label}</div>
                                    <div class="kpi-value">${item.value}</div>
                                </div>
                            `
                                )
                                .join("")}
                        </div>
                    </div>
                `;
            }

            if (section.type === "table") {
                const colonnes = section.colonnes
                    .map((c) => `<th>${c}</th>`)
                    .join("");

                const lignes = section.lignes
                    .map(
                        (ligne) => `
                        <tr>
                            ${ligne.map((c) => `<td>${c}</td>`).join("")}
                        </tr>
                    `
                    )
                    .join("");

                return `
                    <div class="section">
                        <div class="section-title">${section.titre}</div>
                        <table>
                            <thead><tr>${colonnes}</tr></thead>
                            <tbody>${lignes}</tbody>
                        </table>
                    </div>
                `;
            }

            return "";
        })
        .join("");

    fenetre.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${titre}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 35px; color: #292235; font-size: 13px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 18px; border-bottom: 3px solid #6d28d9; }
    .header h1 { margin: 0; font-size: 26px; color: #4c1d95; letter-spacing: 1px; }
    .header p { margin: 8px 0 0; color: #777; font-size: 13px; }
    .header .periode { display: inline-block; margin-top: 12px; padding: 6px 14px; background: #f0eafa; color: #5b21b6; border-radius: 20px; font-weight: 700; font-size: 12px; }
    .section { margin-top: 28px; page-break-inside: avoid; }
    .section-title { font-size: 15px; font-weight: 800; color: #4c1d95; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #ddd6fe; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi { padding: 15px; border: 1px solid #ddd6fe; border-radius: 10px; background: #faf8ff; }
    .kpi-label { font-size: 10px; font-weight: 800; color: #7c6a94; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 6px; }
    .kpi-value { font-size: 22px; font-weight: 800; color: #4c1d95; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e5def1; padding: 9px 11px; text-align: left; }
    th { background: #f0eafa; color: #4c1d95; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #fcfbfe; }
    .footer { margin-top: 45px; padding-top: 18px; border-top: 1px solid #ddd6fe; text-align: center; font-size: 11px; color: #888; }
    @media print { body { padding: 15px; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>

<div class="header">
    <h1>THANATOPRAXIE</h1>
    <p>${titre}</p>
    <div class="periode">${periode}</div>
</div>

${sectionsHtml}

<div class="footer">
    Document généré le ${dateImpression}
</div>

<script>
    window.onload = function () {
        setTimeout(function () { window.print(); }, 300);
    };
</script>

</body>
</html>
    `);

    fenetre.document.close();
}