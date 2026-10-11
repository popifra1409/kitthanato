import React, { useState, useEffect } from "react";
import "./DeclarationDeces.css";

/* =========================================================
   NETTOYER LES DATES (enlever T00:00:00)
========================================================= */

const nettoyerDate = (date) => {
    if (!date) return "";

    const valeur = String(date);

    /* Si c'est un format ISO avec T (ex: "2026-10-09T00:00:00.000Z") */
    if (valeur.includes("T")) {
        return valeur.split("T")[0];
    }

    /* Si c'est un format avec espace */
    if (valeur.includes(" ")) {
        return valeur.split(" ")[0];
    }

    return valeur;
};

/* =========================================================
   MAPPING DEPUIS LA DÉCLARATION
========================================================= */

const mapperDepuisDeclaration = (declaration) => {
    if (!declaration) return {};

    return {
        region: declaration.region || "",
        departement: declaration.departement || "",
        arrondissement: declaration.arrondissement || "",
        districtSante: declaration.district_sante || "",
        aireSante: declaration.aire_sante || "",
        formationSanitaire: declaration.formation_sanitaire || "",
        villeVillage: declaration.ville_village_quartier || "",

        numeroDeclaration: declaration.numero_declaration || "",

        noms: declaration.nom || "",
        prenoms: declaration.prenom || "",
        sexe: declaration.sexe || "",
        dateNaissance: nettoyerDate(declaration.date_naissance),
        nationalite: declaration.nationalite || "",
        numeroCN: declaration.cni_autre || "",
        profession: declaration.profession || "",
        domicile: declaration.domicile || "",
        statutMatrimonial: declaration.statut_matrimonial || "",

        dateDeces: nettoyerDate(declaration.date_deces),
        heureDeces: declaration.heure_deces || "",
        lieuDeces: declaration.lieu_deces || "",
        siteDeces: declaration.site_deces || "",
        circonstancesDeces: declaration.circonstances_deces || "",

        declarantNoms: declaration.declarant_nom || "",
        declarantQualite: declaration.declarant_qualite || "",
        declarantContact: declaration.declarant_contact || "",

        officierNoms: declaration.officier_nom || "",
        officierQualite: declaration.officier_qualite || "",
        officierCentre: declaration.centre_etat_civil || "",
        officierDateReception: nettoyerDate(declaration.date_reception),

        causeA: declaration.cause_a || "",
        causeB: declaration.cause_b || "",
        causeC: declaration.cause_c || "",
        causeD: declaration.cause_d || "",
        autresAffections: declaration.autres_affections || "",

        interventionChirurgicale: declaration.chirurgie_recente || "",
        dateOperation: nettoyerDate(declaration.date_chirurgie),
        raisonOperation: declaration.raison_chirurgie || "",
        autopsie: declaration.autopsie || "",
        autopsieCertificat: declaration.resultats_autopsie_utilises || "",

        causesInternes: declaration.cause_mort || "",
        causesExternes: declaration.cause_externe || "",
        causesIndeterminees: declaration.cause_indeterminee || "",
        descriptionCauseExterne: declaration.description_cause_externe || "",
        lieuSurvenance: declaration.lieu_cause_externe || "",
        dateBlessure: nettoyerDate(declaration.date_blessure),

        grossesseMultiple: declaration.grossesse_multiple || "",
        mortNe: declaration.mort_ne || "",
        heuresSurvecues: declaration.heures_survecues || "",
        poidsNaissance: declaration.poids_naissance || "",
        semainesGrossesse: declaration.semaines_grossesse || "",
        ageMere: declaration.age_mere || "",
        conditionsMere: declaration.conditions_mere || "",
        femmeEnceinte: declaration.defunte_enceinte || "",
        grossesseContribue: declaration.grossesse_contribue_deces || "",

        nomSignataire: declaration.responsable_nom || "",
        qualiteSignataire: declaration.responsable_qualite || "",
        dateSignature: nettoyerDate(declaration.responsable_date),
        signature: declaration.responsable_signature || "",
    };
};

/* =========================================================
   COMPOSANT
========================================================= */

const DeclarationDeces = ({ declaration = null }) => {
    const [formData] = useState(() =>
        mapperDepuisDeclaration(declaration)
    );

    useEffect(() => {
        if (declaration) {
            /* On ne peut pas utiliser setFormData ici car on a désactivé
               la modification : la valeur est déjà initialisée */
        }
    }, [declaration]);

    const val = (name) => formData[name] ?? "";

    return (
        <div className="form-container">
            {/* ============================================================
                PAGE 1 : Sections 1, 2, 3, 4
            ============================================================ */}
            <div className="page">
                <header className="header">
                    <div className="header-left">
                        <p>Region: {val("region") || "___________"}</p>
                        <p>
                            Arrondissement:{" "}
                            {val("arrondissement") || "___________"}
                        </p>
                        <p>
                            District de Santé:{" "}
                            {val("districtSante") || "___________"}
                        </p>
                        <p>
                            Aire de santé: {val("aireSante") || "___________"}
                        </p>
                        <p>
                            Formation Sanitaire:{" "}
                            {val("formationSanitaire") || "___________"}
                        </p>
                        <p>
                            Ville ou Village ou Quartier:{" "}
                            {val("villeVillage") || "___________"}
                        </p>
                    </div>

                    <div className="header-center">
                        <img
                            src="/armoirie.png"
                            alt="Armoiries"
                            onError={(e) => {
                                e.target.style.display = "none";
                            }}
                        />
                    </div>

                    <div className="header-right">
                        <p>Region: {val("region") || "___________"}</p>
                        <p>Division: {val("departement") || "___________"}</p>
                        <p>
                            Subdivision: {val("arrondissement") || "___________"}
                        </p>
                        <p>
                            Health District:{" "}
                            {val("districtSante") || "___________"}
                        </p>
                        <p>
                            Health Facility:{" "}
                            {val("formationSanitaire") || "___________"}
                        </p>
                        <p>
                            Town or Village or Quarter:{" "}
                            {val("villeVillage") || "___________"}
                        </p>
                    </div>
                </header>

                <div className="title-box">
                    <h1>
                        DECLARATION DE DECES/DEATH DECLARATION N°
                        {val("numeroDeclaration") || "______"}/20__
                    </h1>
                </div>

                <div className="partie">
                    <p className="title-sub">
                        Partie a detacher et a transmettre au centre d'etat
                        civil/Section to be detached and transmitted to the
                        civil status registrar
                    </p>
                </div>

                {/* Section 1 */}
                <div className="section-title1">
                                Section 1 : INFORMATIONS SUR LE DEFUNT/DECEASE
                                INFORMATION (Instruction n° 1)
                            </div>
                <table className="section-table">
                    <tbody>
                            
                        <tr>
                            <td className="label">*Noms / Name:</td>
                            <td>
                                <span className="print-value">
                                    {val("noms") || " "}
                                </span>
                            </td>
                            <td className="label">*Prenoms / Surname:</td>
                            <td>
                                <span className="print-value">
                                    {val("prenoms") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">*Sexe / Sex:</td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("sexe") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">
                                Date de naissance / Date of birth:
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("dateNaissance") || " "}
                                </span>
                            </td>
                            <td className="label">
                                Nationalité / Nationality:
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("nationalite") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">
                                N° CN ou autres / N° CN or Others:
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("numeroCN") || " "}
                                </span>
                            </td>
                            <td className="label">Profession / Profession:</td>
                            <td>
                                <span className="print-value">
                                    {val("profession") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">Domicile / Domicile:</td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("domicile") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">
                                Statut matrimonial / Marital status:
                            </td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("statutMatrimonial") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Section 2 */}
                
                            <div className="section-title2">
                                Section 2 : INFORMATIONS SUR LE DECES /
                                INFORMATION ON DEATH (Instruction n° 2)
                            </div>
                <table className="section-table">
                    <tbody>
                        <tr>
                            <td className="label">
                                *Date de décès / Date of death:
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("dateDeces") || " "}
                                </span>
                            </td>
                            <td className="label">
                                Heure du décès / Time of death:
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("heureDeces") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">
                                *Lieu du décès / Place of death:
                            </td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("lieuDeces") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">Site du décès/death site:</td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("siteDeces") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">
                                Circonstances du décès / Circumstances of
                                death:
                            </td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("circonstancesDeces") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Section 3 */}
                 <div  className="section-title3">
                                Section 3 : INFORMATIONS SUR LE DECLARANT /
                                NOTIFIER INFORMATION (Instruction n° 3)
                            </div>
                <table className="section-table section3-table">
                    <tbody>
                           
                        <tr>
                            <td className="label">
                                *Noms et Prenoms / Name and Surname:
                            </td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("declarantNoms") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">*Qualité / Status:</td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("declarantQualite") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="label">
                                Contact / Phone number:
                            </td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("declarantContact") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Section 4 */}
                <div className="section-title4">
                                Section 4 : PARTIE RÉSERVÉE À L'OFFICIER D'ÉTAT
                                CIVIL / RESERVED SECTION OF THE CIVIL STATUS
                                REGISTRAR
                            </div>
                <table className="section-table section4-table">
                    
                    <tbody>
                            
                        <tr>
                            <td className="officier-text-cell">
                                <p className="officier-intro">
                                    J'atteste avoir reçu cette déclaration de
                                    décès / I testify to have received this
                                    birth declaration.
                                </p>
                                <p className="officier-line">
                                    Noms et prénom / Name and Surname :{" "}
                                    <span className="dotted-line">
                                        {val("officierNoms")}
                                    </span>
                                </p>
                                <p className="officier-line">
                                    Qualité/Status :{" "}
                                    <span className="dotted-line">
                                        {val("officierQualite")}
                                    </span>
                                </p>
                                <p className="officier-line">
                                    Centre d'état civil/ Civil Status Registrar
                                    Office :{" "}
                                    <span className="dotted-line">
                                        {val("officierCentre")}
                                    </span>
                                </p>
                            </td>
                            <td className="officier-signature-cell">
                                <span>Signature</span>
                            </td>
                            <td className="officier-date-cell">
                                <span>
                                    Date de réception (jj/mm/aaaa)/
                                    <br />
                                    reception date (dd/mm/yyyy)
                                </span>
                                <span className="print-value">
                                    {val("officierDateReception")}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="footer">Page 1 sur 3</div>
            </div>

            {/* ============================================================
                PAGE 2 : INSTRUCTIONS
            ============================================================ */}
             {/* ============================================================
          PAGE 2 : INSTRUCTIONS
      ============================================================ */}
      <div className="page instructions-page">
        <div className="instructions-content">
          <div className="instruction-title">Declaration de décès/Death declaration - Instructions</div>
          <h3>Instructions générales</h3>
          <p>01. Le present formulaire est etabli conformement au cadre normatif regissant I'etat civil au Cameroun</p>
          <p>02. Le formulaire contient des informations obligatoires et facultatives. <strong>Les informations obligatoires sont marquees par un asterisque.</strong></p>
          <p>03. Le numero de la declaration est forme de deux segments representant I'ordre de survenance du decès au cours d'une annee civile.</p>
          <p>04. La declaration d'un decès survenu en milieu hospitalier doit se faire a I'aide de ce formulaire.</p>
          <p>05. Pour les decès survenus en communaute (hors formation sanitaire), Toute personne en ayant eu connaissance declare le decès a I'officier d'etat civil.</p>

          <h3>Informations sur le defunt (instruction No1)</h3>
          <p>01. Le nom du defunt est celui porte sur les documents officiels (CNI, Passeport, Carte d'electeur, Permis de conduire...).</p>
          <p>02. En cas de decès d'un enfant de moins d'un an, le lieu de résidence est celui de la personne ayant la charge de l'enfant.</p>

          <h3>General instructions</h3>
          <p>01. This form is drawn up in accordance with the legal framework governing civil registration in Cameroon.</p>
          <p>02. The form contains compulsory and optional information. Compulsory information is marked by an asterisk.</p>
          <p>03. The number of the declaration is made up of two segments representing the order of occurrence of the death during a calendar year.</p>
          <p>04. The declaration of a death in the hospital must be made using this form.</p>
          <p>05. For deaths occurring in the community, any person who knows about the death declares the death to the registrar.</p>

          <h3>Deceased Information (Instruction No. 1)</h3>
          <p>01. The name of the deceased is the name on the official documents (NIC, Passport, Voter's Card, Driver's License ...).</p>
          <p>02. In case of death of a child under one year old, the residence is that of the person in charge of the child.</p>
        </div>

        
        <div className="footer">Page 2 sur 3</div>
      </div>

            {/* ============================================================
                PAGE 3 : SECTION 5
            ============================================================ */}
            <div className="page section5-page">
                <div className="s5-top-banner">
                    Partie destinée à la formation sanitaire/section for Health
                    Facility
                </div>
                <div className="s5-section-title">
                    Section 5 : CAUSE DE DECES/CAUSES OF DEATH (Instruction n°
                    5)
                </div>
                <div className="s5-report">
                    RAPPORT DU NUMERO DE LA DECLARATION DE DÉCÈS/ REPORT OF THE
                    DEATH DECLARATION NUMBER : N°
                    {val("numeroDeclaration") || "______"}/20__
                </div>

                {/* Infos administratives */}
                <table className="s5-table">
                    <tbody>
                        <tr>
                            <td className="s5-label">Région/Region :</td>
                            <td>
                                <span className="print-value">
                                    {val("region") || " "}
                                </span>
                            </td>
                            <td className="s5-label">
                                District de santé/Health district :
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("districtSante") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-label">
                                Aire de santé/Health Area :
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("aireSante") || " "}
                                </span>
                            </td>
                            <td className="s5-label">
                                Formation sanitaire/Health facility :
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("formationSanitaire") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="4" className="s5-sub-title">
                                Information sur le défunt / Administrative Data
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-label">*Sexe/ Sex :</td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("sexe") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-label">
                                *Date de naissance / Date of birth :
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("dateNaissance") || " "}
                                </span>
                            </td>
                            <td className="s5-label">
                                *Date de décès / Date of death :
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("dateDeces") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-label">Heure/Time :</td>
                            <td colSpan="3">
                                <span className="print-value">
                                    {val("heureDeces") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Cadre A */}
                <table className="s5-table s5-frame">
                    <tbody>
                        <tr>
                            <td colSpan="4" className="s5-sub-title">
                                Cadre A : données Médicales: 1ère et 2ème partie
                                / Frame A: Medical data: Part 1 and 2
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-cause-text" rowSpan="5">
                                <p>
                                    <strong>
                                        1 Maladie, ou état morbide ayant
                                        directement provoqué le décès sur la
                                        ligne a / Disease or condition directly
                                        leading to death on line a
                                    </strong>
                                </p>
                                <br />
                                <p>
                                    Indiquer dans leur ordre de survenue la
                                    chaine des événements causaux / Report chain
                                    of events in due to order (if applicable)
                                </p>
                                <br />
                                <p>
                                    Inscrire la cause initiale du décès sur la
                                    dernière ligne / State the underlying cause
                                    on the lowest used line
                                </p>
                            </td>
                            <td className="s5-arrow-cell" rowSpan="5">
                                <div className="s5-arrows">
                                    {[...Array(3)].map((_, i) => (
                                        <svg
                                            key={i}
                                            className="curved-arrow-icon"
                                            viewBox="0 0 80 120"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M 5 70 Q 5 105 40 110 L 75 110 L 75 90 L 40 90 Q 25 90 25 70 Z"
                                                fill="#d0d0d0"
                                                stroke="#000"
                                                strokeWidth="1.2"
                                            />
                                            <path
                                                d="M 5 70 Q 5 30 40 25 L 65 25 L 65 10 L 80 35 L 65 60 L 65 45 L 40 45 Q 25 45 25 70 Z"
                                                fill="#fff"
                                                stroke="#000"
                                                strokeWidth="1.2"
                                            />
                                        </svg>
                                    ))}
                                </div>
                            </td>
                            <td className="s5-cause-header">
                                Cause du décès / Cause of death
                            </td>
                            <td className="s5-interval-header">
                                Intervalle de temps entre l'apparition de
                                maladie et la mort/Time interval from on set to
                                death
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">a</span>{" "}
                                <span className="print-value">
                                    {val("causeA") || " "}
                                </span>
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("intervalleA") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">b</span>{" "}
                                <span className="s5-due">
                                    Due à / Due to:
                                </span>{" "}
                                <span className="print-value">
                                    {val("causeB") || " "}
                                </span>
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("intervalleB") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">c</span>{" "}
                                <span className="s5-due">
                                    Due à / Due to:
                                </span>{" "}
                                <span className="print-value">
                                    {val("causeC") || " "}
                                </span>
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("intervalleC") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">d</span>{" "}
                                <span className="s5-due">
                                    Due à / Due to:
                                </span>{" "}
                                <span className="print-value">
                                    {val("causeD") || " "}
                                </span>
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("intervalleD") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-cause-text">
                                2 Autres affections importantes contribuant au
                                décès / Other significant conditions
                                contributing to death
                            </td>
                            <td colSpan="2">
                                <span className="print-value">
                                    {val("autresAffections") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Cadre B */}
                <table className="s5-table s5-frame">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub-title">
                                Cadre B : Autres données médicales/ Frame B:
                                Other medical data
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Une intervention chirurgicale a-t-elle été
                                effectuée au cours des 4 dernières semaines? /
                                Was surgery performed within the last 4 weeks?
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("interventionChirurgicale") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Si oui, veuillez préciser la date de l'opération
                                /If yes please specify date of surgery :
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("dateOperation") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Si oui, veuillez préciser la raison de
                                l'intervention chirurgicale (maladie ou état) :
                                <br />
                                /If yes please specify reason for surgery
                                (disease or condition) :
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("raisonOperation") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Une autopsie a-t-elle été demandée /Was an
                                autopsy requested?
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("autopsie") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Si oui, les résultats ont été utilisés dans
                                l'établissement du certificat de genre de mort
                                /If yes were the findings used in the
                                certificate of causes of death?
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("autopsieCertificat") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Genre de mort */}
                <table className="s5-table s5-frame">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub-title">
                                Genre de mort / Manner of death:
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">Causes internes :</td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("causesInternes") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Causes externes :
                                <br />
                                /Legal intervention
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("causesExternes") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Causes indéterminées :
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("causesIndeterminees") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                En cas de cause externe ou d'empoisonnement :
                                <br />
                                /If external cause or poisoning:
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("dateBlessure") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-question">
                                Veuillez décrire comment la cause externe s'est
                                produite / Please describe how external cause
                                occurred
                                <span className="print-value">
                                    {val("descriptionCauseExterne") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Lieu de survenance */}
                <table className="s5-table s5-frame">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub-title">
                                Lieu de survenance de la cause externe /Place
                                of occurrence of the external cause:
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-check">
                                <span className="print-value">
                                    {val("lieuSurvenance") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Mortalité fœtale */}
                <table className="s5-table s5-frame">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub-title">
                                Mortalité fœtale ou infantile /Fetal or infant
                                Death
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Grossesse gémellaire /Multiple pregnancy :
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("grossesseMultiple") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Mort-né /Stillborn?
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("mortNe") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Si le décès survient dans les 24 heures,
                                précisez le nombre d'heures de survie /If death
                                within 24h specify number of hours survived
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("heuresSurvecues") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Nombre de semaines de grossesse /Number of
                                completed weeks of pregnancy
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("semainesGrossesse") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-question">
                                Si le décès a été périnatal, veuillez indiquer
                                les conditions de la mère qui ont affecté le
                                fœtus ou le nouveau-né /If death was perinatal,
                                please state conditions of mother that affected
                                the fetus and new born
                                <span className="print-value">
                                    {val("conditionsMere") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Pour les femmes, la défunte était-elle enceinte
                                ? /For women, was the deceased pregnant?
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("femmeEnceinte") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">Si oui :</td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("momentDeces") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-question">
                                Did the pregnancy contribute to the death?
                            </td>
                            <td className="s5-check">
                                <span className="print-value">
                                    {val("grossesseContribue") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Signatures Section 5 */}
                <table className="s5-table s5-signature">
                    <tbody>
                        <tr>
                            <td className="s5-sig-label">
                                * Noms et Prénoms / Name and Surname
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("nomSignataire") || " "}
                                </span>
                            </td>
                            <td className="s5-sig-label">
                                * Date (jj/mm/aaaa- dd/mm/yyyy)
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("dateSignature") || " "}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-sig-label">
                                * Qualité / Status
                            </td>
                            <td>
                                <span className="print-value">
                                    {val("qualiteSignataire") || " "}
                                </span>
                            </td>
                            <td className="s5-sig-label">* Signature</td>
                            <td>
                                <span className="print-value">
                                    {val("signature") || " "}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="footer">Page 3 sur 3</div>
            </div>
        </div>
    );
};

export default DeclarationDeces;