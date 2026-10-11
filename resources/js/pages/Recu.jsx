import React from "react";
import "./Recu.css";

const Recu = ({
    recu = {
        numero: "REC-2026-000125",
        date: "08/10/2026",
        heure: "11:35",

        etablissement: "HÔPITAL GÉNÉRAL",
        service: "SERVICE DE THANATOPRAXIE",
        adresse: "Yaoundé - Cameroun",
        telephone: "+237 6XX XX XX XX",

        nomDefunt: "JEAN DUPONT",
        codeDefunt: "DEP-2026-0015",

        payeur: "MARIE DUPONT",
        telephonePayeur: "6XX XX XX XX",
        lienParente: "Fille",

        prestations: [
            {
                designation: "Conservation du corps",
                quantite: 1,
                prixUnitaire: 50000,
            },
            {
                designation: "Chambre mortuaire",
                quantite: 3,
                prixUnitaire: 20000,
            },
            {
                designation: "Thanatopraxie",
                quantite: 1,
                prixUnitaire: 40000,
            },
        ],

        modePaiement: "Espèces",
        montantPaye: 150000,
        agent: "Agent de caisse",
    },
}) => {

    // =====================================================
    // FORMATAGE DES MONTANTS
    // =====================================================

    const formatMontant = (montant) => {
        const valeur = Number(montant || 0);

        return new Intl.NumberFormat("fr-FR").format(valeur);
    };

    // =====================================================
    // PRESTATIONS
    // =====================================================

    const prestations = Array.isArray(recu.prestations)
        ? recu.prestations
        : [];

    // =====================================================
    // TOTAL
    // =====================================================

    const total = prestations.reduce((somme, prestation) => {
        const quantite = Number(prestation.quantite || 0);
        const prixUnitaire = Number(prestation.prixUnitaire || 0);

        return somme + quantite * prixUnitaire;
    }, 0);

    // =====================================================
    // MONTANT PAYÉ
    // =====================================================

    const montantPaye = Number(recu.montantPaye || 0);

    const reste = Math.max(total - montantPaye, 0);

    // =====================================================
    // IMPRESSION
    // =====================================================

    const handlePrint = () => {
        window.print();
    };

    // =====================================================
    // AFFICHAGE
    // =====================================================

    return (
        <div className="recu-page">

            {/* =================================================
                BARRE D'ACTIONS
            ================================================= */}

            <div className="recu-actions">

                <button
                    type="button"
                    className="btn-recu btn-retour"
                    onClick={() => window.history.back()}
                >
                    ← Retour
                </button>

                <button
                    type="button"
                    className="btn-recu btn-print"
                    onClick={handlePrint}
                >
                    🖨 Imprimer le reçu
                </button>

            </div>


            {/* =================================================
                DOCUMENT
            ================================================= */}

            <div className="recu-container">

                {/* =================================================
                    EN-TÊTE
                ================================================= */}

                <header className="recu-header">

                    {/* GAUCHE : HÔPITAL */}
                    <div className="recu-header-left">
<div className="francais">
                        <h1>
                            {recu.etablissement}
                        </h1>

                        <h2>
                            {recu.service}
                        </h2>
                    </div>


                    {/* CENTRE : LOGO */}

                    <div className="recu-header-center">

                        <div className="logo-circle">
                            LOGO
                        </div>

                    </div>

                    <div className="recu-header-left">

                        <h1>
                            {recu.etablissement}
                        </h1>

                        <h2>
                            {recu.service}
                        </h2>
                    </div>

</div>
                    {/* DROITE : RÉPUBLIQUE */}

                    <div className="recu-header-right">

                        <h1>
                            REPUBLIQUE DU CAMEROUN
                        </h1>

                        <h2>
                            Paix-Travail-Patrie
                        </h2>

                        <h1>
                            REPUBLIC OF CAMEROON
                        </h1>

                        <h2>
                            Peace-Work-Fatherland
                        </h2>

                    </div>

                </header>


                {/* =================================================
                    RÉFÉRENCE
                ================================================= */}


                    <div className="reference-left">

                        <p>
                            <strong>B.P. :</strong> 
                        </p>

                        <p>
                            <strong>Tel :</strong> 
                        </p>

                    </div>

                    <div className="reference-center">

                        <strong>
                            PRE-FACTURE-ATTESTATION DE SOINS
                        </strong>
                    </div>

                    <div className="reference-right">

                        <strong>
                            INVOICE ATTESTATION OF MEDICAL CARE
                        </strong>
                    </div>

                


                {/* =================================================
                    INFORMATIONS
                ================================================= */}

                <section className="recu-informations">

                    <p className="recu-soussigne">

                        Je soussigné, Docteur en médecine, certifie que
                        <br />

                        <span className="mot-italique">
                            I, undersigned, medical Doctor certify that
                        </span>

                    </p>


                    <div className="ligne-information">

                        <strong>
                            M. ........................................................................................
                        </strong>

                        <span className="mot-italique">
                            Mr
                        </span>

                    </div>


                    <div className="ligne-information">

                        <strong>
                            Origine ......................................................................................
                        </strong>

                        <span className="mot-italique">
                            Provenance
                        </span>

                    </div>


                    <div className="ligne-consultation">

                        <div>
                            <strong>
                                CONSULTATION DE :
                                ............................................................
                            </strong>

                            <span className="mot-italique">
                                CODE
                            </span>
                        </div>

                        <div>
                            <strong>
                                Date :
                                ................................
                            </strong>
                        </div>

                    </div>

                </section>


                {/* =================================================
                    TABLEAU DES PRESTATIONS
                ================================================= */}

                <section className="recu-section prestations-section">

                    <table className="recu-table">

                        <thead>

                            <tr>

                                <th className="col-num">
                                    N°
                                </th>

                                <th className="col-designation">
                                    DÉSIGNATION
                                </th>

                                <th className="col-prix">
                                    PRIX UNITAIRE
                                </th>

                                <th className="col-total">
                                    MONTANT
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {prestations.length > 0 ? (

                                prestations.map((prestation, index) => {

                                    const quantite =
                                        Number(prestation.quantite || 0);

                                    const prixUnitaire =
                                        Number(prestation.prixUnitaire || 0);

                                    const montant =
                                        quantite * prixUnitaire;

                                    return (

                                        <tr key={index}>

                                            <td className="text-center">
                                                {index + 1}
                                            </td>

                                            <td>
                                                {prestation.designation}
                                            </td>

                                            <td className="text-right">
                                                {formatMontant(prixUnitaire)}
                                                {" "}FCFA
                                            </td>

                                            <td className="text-right">
                                                {formatMontant(montant)}
                                                {" "}FCFA
                                            </td>

                                        </tr>

                                    );
                                })

                            ) : (

                                <tr>

                                    <td
                                        colSpan="5"
                                        className="empty-row"
                                    >
                                        Aucune prestation enregistrée
                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </section>


                {/* =================================================
                    BAS DU DOCUMENT
                ================================================= */}

                <section className="recu-total-section">

                    {/* RECTANGLE GAUCHE */}

                    <div className="total-box total-box-left">

                        <div className="total-box-title">
                            Arrêté la présente facture à la somme de :
                        </div>

                        <div className="total-box-subtitle">
                            Top of invoice in the amount
                        </div>

                        <div className="montant-lettres">
                            {formatMontant(total)} francs CFA
                        </div>

                    </div>


                    {/* RECTANGLE DROITE */}

                    <div className="total-box total-box-right">

                        <div className="total-box-title">
                            TOTAL À PAYER
                        </div>

                    </div>
                    <div className="signature-cachet">

                            <p>
                                Signature et cachet du Médecin
                            </p>

                            <div className="signature-espace">
                            </div>

                        </div>
                </section>

            </div>

        </div>
    );
};

export default Recu;
