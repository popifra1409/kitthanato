import React, { useMemo } from "react";
import "./DeclarationDeces.css";

/* =========================================================
   NETTOYER LES DATES
========================================================= */
const nettoyerDate = (date) => {
    if (!date) return "";
    const valeur = String(date);
    if (valeur.includes("T")) return valeur.split("T")[0];
    if (valeur.includes(" ")) return valeur.split(" ")[0];
    return valeur;
};

const formatDateFr = (date) => {
    const iso = nettoyerDate(date);
    if (!iso) return "";
    const [a, m, j] = iso.split("-");
    return a && m && j ? `${j}/${m}/${a}` : iso;
};

const heureHm = (v) => (v ? String(v).substring(0, 5) : "");

/* =========================================================
   MAPPING DÉCLARATION → FORM
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
        dateNaissance: formatDateFr(declaration.date_naissance),
        age: declaration.age || "",
        lieuNaissance: declaration.lieu_naissance || "",
        nationalite: declaration.nationalite || "",
        numeroCN: declaration.cni_autre || "",
        profession: declaration.profession || "",
        domicile: declaration.domicile || "",
        statutMatrimonial: declaration.statut_matrimonial || "",

        dateDeces: formatDateFr(declaration.date_deces),
        heureDeces: heureHm(declaration.heure_deces),
        lieuDeces: declaration.lieu_deces || "",
        siteDeces: declaration.site_deces || "",
        circonstancesDeces: declaration.circonstances_deces || "",

        declarantNoms: declaration.declarant_nom || "",
        declarantQualite: declaration.declarant_qualite || "",
        declarantContact: declaration.declarant_contact || "",
        declarantDate: formatDateFr(declaration.declarant_date),

        officierNoms: declaration.officier_nom || "",
        officierQualite: declaration.officier_qualite || "",
        officierCentre: declaration.centre_etat_civil || "",
        officierDateReception: formatDateFr(declaration.date_reception),

        causeA: declaration.cause_a || "",
        causeB: declaration.cause_b || "",
        causeC: declaration.cause_c || "",
        causeD: declaration.cause_d || "",
        autresAffections: declaration.autres_affections || "",

        interventionChirurgicale: declaration.chirurgie_recente || "",
        dateOperation: formatDateFr(declaration.date_chirurgie),
        raisonOperation: declaration.raison_chirurgie || "",
        autopsie: declaration.autopsie || "",
        autopsieCertificat: declaration.resultats_autopsie_utilises || "",

        causesInternes: declaration.cause_mort || "",
        causesExternes: declaration.cause_externe || "",
        causesIndeterminees: declaration.cause_indeterminee || "",
        descriptionCauseExterne: declaration.description_cause_externe || "",
        lieuSurvenance: declaration.lieu_cause_externe || "",
        dateBlessure: formatDateFr(declaration.date_blessure),

        grossesseMultiple: declaration.grossesse_multiple || "",
        mortNe: declaration.mort_ne || "",
        heuresSurvecues: declaration.heures_survecues || "",
        poidsNaissance: declaration.poids_naissance || "",
        semainesGrossesse: declaration.semaines_grossesse || "",
        ageMere: declaration.age_mere || "",
        conditionsMere: declaration.conditions_mere || "",
        femmeEnceinte: declaration.defunte_enceinte || "",
        grossesseContribue: declaration.grossesse_contribue_deces || "",
        momentDeces: declaration.moment_deces || "",

        nomSignataire: declaration.responsable_nom || "",
        qualiteSignataire: declaration.responsable_qualite || "",
        dateSignature: formatDateFr(declaration.responsable_date),
        signature: declaration.responsable_signature || "",
    };
};

/* =========================================================
   CASE À COCHER (affichage imprimé, pas interactif)
========================================================= */
const Case = ({ coche = false }) => (
    <span className={`case ${coche ? "case-coche" : ""}`} aria-hidden="true">
        {coche ? "✕" : ""}
    </span>
);

const Coche = ({ label, actif }) => (
    <span className="coche-line">
        <Case coche={!!actif} />
        <span className="coche-label">{label}</span>
    </span>
);

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */
const DeclarationDeces = ({ declaration = null }) => {
    const data = useMemo(
        () => mapperDepuisDeclaration(declaration),
        [declaration]
    );

    const v = (k) => data[k] || "";

    /* --- Helpers cases (comparaison insensible casse) --- */
    const is = (champ, valeurs) => {
        const val = String(v(champ)).trim().toLowerCase();
        return valeurs.some((x) => x.toLowerCase() === val);
    };

    return (
        <div className="decl-container">
            {/* =====================================================
                PAGE 1
            ===================================================== */}
            <div className="decl-page">
                <header className="decl-entete">
                    <div className="decl-entete-col">
                        <p className="pays">REPUBLIQUE DU CAMEROUN</p>
                        <p className="devise">Paix-Travail-Patrie</p>
                        <p className="sep">-----------</p>
                        <p>Région : {v("region")}</p>
                        <p>Département : {v("departement")}</p>
                        <p>Arrondissement : {v("arrondissement")}</p>
                        <p>District de Santé : {v("districtSante")}</p>
                        <p>Aire de santé : {v("aireSante")}</p>
                        <p>Formation Sanitaire : {v("formationSanitaire")}</p>
                        <p>
                            Ville ou Village ou Quartier : {v("villeVillage")}
                        </p>
                    </div>

                    <div className="decl-entete-logo">
                        <img
                            src="/armoirie.png"
                            alt="Armoiries du Cameroun"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                    </div>

                    <div className="decl-entete-col right">
                        <p className="pays">REPUBLIC OF CAMEROON</p>
                        <p className="devise">Peace-Work-Fatherland</p>
                        <p className="sep">-----------</p>
                        <p>Region : {v("region")}</p>
                        <p>Division : {v("departement")}</p>
                        <p>Subdivision : {v("arrondissement")}</p>
                        <p>Health District : {v("districtSante")}</p>
                        <p>Health Facility : {v("formationSanitaire")}</p>
                        <p>
                            Town or Village or Quarter : {v("villeVillage")}
                        </p>
                    </div>
                </header>

                <div className="decl-titre">
                    DECLARATION DE DECES/DEATH DECLARATION N°
                    {v("numeroDeclaration") || "____"}/20__
                </div>

                <div className="decl-sous-titre">
                    Partie à détacher et à transmettre au centre d'état
                    civil/Section to be detached and transmitted to the civil
                    status registrar
                </div>

                {/* --------- SECTION 1 --------- */}
                <div className="decl-section-titre">
                    Section 1 : INFORMATIONS SUR LE DEFUNT/DECEASED INFORMATION
                    (Instruction n° 1)
                </div>

                <table className="decl-table">
                    <tbody>
                        <tr>
                            <td className="lbl big">*Noms / Name :</td>
                            <td className="val big" colSpan="3">
                                {v("noms")}
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl big">*Prénoms / Surname :</td>
                            <td className="val big" colSpan="3">
                                {v("prenoms")}
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">*Sexe / Sex :</td>
                            <td colSpan="3">
                                <Coche label="Masculin / Male" actif={is("sexe", ["masculin", "m"])} />
                                <Coche label="Féminin / Female" actif={is("sexe", ["féminin", "feminin", "f"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                Date de naissance / Date of birth :{" "}
                                <span className="italic">DD / MM / YYYY</span>
                            </td>
                            <td>
                                <span className="val">{v("dateNaissance")}</span>
                            </td>
                            <td className="lbl">Âge/Age :</td>
                            <td>
                                <span className="val">{v("age")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                Lieu de naissance / Place of birth :
                            </td>
                            <td colSpan="3">
                                <span className="val">{v("lieuNaissance")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">Nationalité /Nationality :</td>
                            <td>
                                <span className="val">{v("nationalite")}</span>
                            </td>
                            <td className="lbl">
                                N°CN ou autres/N°NIC or Others :
                            </td>
                            <td>
                                <span className="val">{v("numeroCN")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">Profession /Profession :</td>
                            <td>
                                <span className="val">{v("profession")}</span>
                            </td>
                            <td className="lbl">Domicile/Domicile :</td>
                            <td>
                                <span className="val">{v("domicile")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                Statut matrimonial / Marital status :
                            </td>
                            <td colSpan="3">
                                <Coche label="Célibataire/Single" actif={is("statutMatrimonial", ["célibataire", "celibataire", "single"])} />
                                <Coche label="Marié(e) / Married" actif={is("statutMatrimonial", ["marié", "marie", "married"])} />
                                <Coche label="Divorcé(e)/Divorced" actif={is("statutMatrimonial", ["divorcé", "divorce", "divorced"])} />
                                <Coche label="Veuf(ve)/Widow" actif={is("statutMatrimonial", ["veuf", "veuve", "widow"])} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* --------- SECTION 2 --------- */}
                <div className="decl-section-titre">
                    Section 2 : INFORMATIONS SUR LE DECES / INFORMATION ON DEATH
                    (Instruction n° 2)
                </div>

                <table className="decl-table">
                    <tbody>
                        <tr>
                            <td className="lbl">
                                *Date de décès / Date of death :{" "}
                                <span className="italic">DD / MM / YYYY</span>
                            </td>
                            <td>
                                <span className="val">{v("dateDeces")}</span>
                            </td>
                            <td className="lbl">
                                Heure du décès / Time of death :{" "}
                                <span className="italic">HH : MM</span>
                            </td>
                            <td>
                                <span className="val">{v("heureDeces")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                *Lieu du décès / place of death :
                            </td>
                            <td colSpan="3">
                                <span className="val">{v("lieuDeces")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">Site du décès/death site :</td>
                            <td colSpan="3">
                                <Coche label="Domicile" actif={is("siteDeces", ["domicile"])} />
                                <Coche label="Hôpital/hospital" actif={is("siteDeces", ["hôpital", "hopital", "hospital"])} />
                                <Coche label="Communauté/community" actif={is("siteDeces", ["communauté", "communaute", "community"])} />
                                <Coche label="Prison" actif={is("siteDeces", ["prison"])} />
                                <Coche label="Voie publique/non place" actif={is("siteDeces", ["voie publique", "voie"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl"></td>
                            <td colSpan="3">
                                <Coche label="Lieu de travail/place of work" actif={is("siteDeces", ["travail", "work"])} />
                                <Coche label="Autre/others" actif={is("siteDeces", ["autre", "others"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                Circonstances du décès / Circumstances of death :
                            </td>
                            <td colSpan="3">
                                <Coche label="Maladie/ illness" actif={is("circonstancesDeces", ["maladie", "illness"])} />
                                <Coche label="Accident/Accident" actif={is("circonstancesDeces", ["accident"])} />
                                <Coche label="Agression physique/Assault" actif={is("circonstancesDeces", ["agression", "assault"])} />
                                <Coche label="Suicide/Suicide" actif={is("circonstancesDeces", ["suicide"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl"></td>
                            <td colSpan="3">
                                <Coche label="Guerre/War" actif={is("circonstancesDeces", ["guerre", "war"])} />
                                <Coche label="catastrophe naturelle/natural disaster" actif={is("circonstancesDeces", ["catastrophe", "disaster"])} />
                                <Coche label="Autre (à préciser)/others (please specify)" actif={is("circonstancesDeces", ["autre", "others"])} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* --------- SECTION 3 --------- */}
                <div className="decl-section-titre">
                    Section 3 : INFORMATIONS SUR LE DECLARANT / NOTIFIER
                    INFORMATION (Instruction n° 3)
                </div>

                <table className="decl-table">
                    <tbody>
                        <tr>
                            <td className="lbl big">
                                *Noms et Prénoms / Name and Surname :
                            </td>
                            <td className="val big" colSpan="3">
                                {v("declarantNoms")}
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl big">*Qualité / Status :</td>
                            <td className="val big" colSpan="3">
                                {v("declarantQualite")}
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl big">Contact / Phone number :</td>
                            <td className="val big" colSpan="3">
                                {v("declarantContact")}
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                Nous attestons que les informations contenues
                                dans ce formulaire sont exactes.
                                <br />
                                <span className="italic">
                                    we testify that the information provided in
                                    this form are valid.
                                </span>
                            </td>
                            <td className="lbl">
                                Signature : (Père / Mère / Enfant/Conjoint/
                                Personne en charge du défunt / Father / Mother /
                                Child/Spouse/Person in charge of the deceased)
                                <br />
                                <br />
                                Signature du déclarant / Notifier signature
                            </td>
                            <td className="lbl" colSpan="2">
                                Date (jj/mm/aaaa- dd/mm/yyyy)
                                <br />
                                <br />
                                <span className="val">{v("declarantDate")}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* --------- SECTION 4 --------- */}
                <div className="decl-section-titre">
                    Section 4 : PARTIE RÉSERVÉE À L'OFFICIER D'ÉTAT CIVIL /
                    RESERVED SECTION OF THE CIVIL STATUS REGISTRAR
                </div>

                <table className="decl-table">
                    <tbody>
                        <tr>
                            <td className="lbl" style={{ width: "55%" }}>
                                <p>
                                    J'atteste avoir reçu cette déclaration de
                                    décès / I testify to have received this
                                    declaration.
                                </p>
                                <p>
                                    Noms et prénom / Name and Surname :{" "}
                                    <span className="val">
                                        {v("officierNoms")}
                                    </span>
                                </p>
                                <p>
                                    Qualité/Status :{" "}
                                    <span className="val">
                                        {v("officierQualite")}
                                    </span>
                                </p>
                                <p>
                                    Centre d'état civil/ Civil Status
                                    Registrar Office :{" "}
                                    <span className="val">
                                        {v("officierCentre")}
                                    </span>
                                </p>
                            </td>
                            <td
                                className="lbl center"
                                style={{ width: "15%" }}
                            >
                                Signature
                            </td>
                            <td
                                className="lbl center"
                                style={{ width: "30%" }}
                            >
                                Date de réception (jj/mm/aaaa)/
                                <br />
                                reception date (dd/mm/yyyy)
                                <br />
                                <br />
                                <span className="val">
                                    {v("officierDateReception")}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="decl-footer">Page 1 sur 3</div>
            </div>

            {/* =====================================================
                PAGE 2 : INSTRUCTIONS
            ===================================================== */}
            <div className="decl-page decl-page-instr">
                <div className="decl-instr">
                    <div className="decl-instr-titre">
                        Déclaration de décès/Death declaration - Instructions
                    </div>

                    <h3>Instructions générales</h3>
                    <p>
                        01. Le présent formulaire est établi conformément au
                        cadre normatif régissant l'état civil au Cameroun
                    </p>
                    <p>
                        02. Le formulaire contient des informations obligatoires
                        et facultatives. <strong>Les informations obligatoires sont
                        celles sans lesquelles la déclaration ne peut être transmise à
                        l'Officier d'état civil.</strong> Les informations
                        facultatives sont celles dont la non-disponibilité ne
                        saurait empêcher la transmission de la déclaration à
                        l'Officier d'état civil. Les informations obligatoires
                        sont marquées par un astérisque.
                    </p>
                    <p>
                        03. Le numéro de la déclaration est formé de deux
                        segments représentant l'ordre de survenance du décès au
                        cours d'une année civile. Ce numéro est automatiquement
                        reporté sur la partie destinée à la formation sanitaire.
                    </p>
                    <p>
                        04. La déclaration d'un décès survenu en milieu
                        hospitalier doit se faire à l'aide de ce formulaire. Le
                        formulaire est rempli par le chef dudit établissement
                        hospitalier ou un responsable habilité. Il est signé par
                        celui-ci et tout proche du défunt ayant eu connaissance
                        du décès. Lorsque le formulaire ne contient pas toutes
                        les informations, les proches sont appelés à les
                        compléter auprès de l'officier d'état civil où la
                        déclaration a été acheminée.
                    </p>
                    <p>
                        05. Pour les décès survenus en communauté (hors
                        formation sanitaire), Toute personne en ayant eu
                        connaissance, accompagné de témoins, déclare le décès à
                        l'officier d'état civil et fournit toutes les
                        informations nécessaires à l'établissement de l'acte de
                        décès.
                    </p>

                    <h3>Informations sur le défunt (instruction No1)</h3>
                    <p>
                        01. Le nom du défunt est celui porté sur les documents
                        officiels ou celui obtenu par tout autre moyen permettant
                        son identification (CNI, Passeport, Carte d'électeur,
                        Permis de conduire...).
                    </p>
                    <p>
                        02. En cas de décès d'un enfant de moins d'un an, le
                        lieu de résidence est celui de la personne ayant la
                        charge de l'enfant.
                    </p>

                    <h3>General instructions</h3>
                    <p>
                        01. This form is drawn up in accordance with the legal
                        framework governing civil registration in Cameroon.
                    </p>
                    <p>
                        02. The form contains compulsory and optional
                        information. The compulsory information is that without
                        which the declaration cannot be transmitted to the Civil
                        Registrar. The optional information is that with which
                        the declaration could be transmitted to the Registrar.
                        Compulsory information is marked by an asterisk.
                    </p>
                    <p>
                        03. The number of the declaration is made up of two
                        segments representing the order of occurrence of the
                        death during a calendar year. This number is
                        automatically transferred to the part intended for the
                        health facility.
                    </p>
                    <p>
                        04. The declaration of a death in the hospital must be
                        made using this form. The form is completed by the head
                        of the hospital or an authorized official. It is signed
                        by the head of the hospital and any relative of the
                        deceased who knows about the death. When the form does
                        not contain all the required information, the relatives
                        are asked to complete it at the civil registry where the
                        declaration was forwarded.
                    </p>
                    <p>
                        05. For deaths occurring in the community (outside of a
                        health facility), any person who knows about the death,
                        accompanied by witnesses, declares the death to the
                        registrar and provides all the information necessary to
                        establish the death certificate.
                    </p>

                    <h3>Deceased Information (Instruction N°. 1)</h3>
                    <p>
                        01. The name of the deceased is the name on the official
                        documents or that obtained by any other means
                        identifying him/her (NIC, Passport, Voter's Card,
                        Driver's License ...).
                    </p>
                    <p>
                        02. In case of death of a child under one year old, the
                        residence is that of the person in charge of the child.
                    </p>
                </div>

                <div className="decl-footer">Page 2 sur 3</div>
            </div>

            {/* =====================================================
                PAGE 3 : SECTION 5
            ===================================================== */}
            <div className="decl-page">
                <div className="decl-s5-banner">
                    Partie destinée à la formation sanitaire/section for Health
                    Facility
                </div>

                <div className="decl-s5-titre">
                    Section 5 : CAUSE DE DECES/CAUSES OF DEATH (Instruction n°
                    5)
                </div>

                <div className="decl-s5-report">
                    RAPPORT DU NUMERO DE LA DECLARATION DE DÉCÈS/ REPORT OF THE
                    DEATH DECLARATION NUMBER : N°
                    {v("numeroDeclaration") || "____"}/20__
                </div>

                {/* Infos administratives */}
                <table className="decl-table s5">
                    <tbody>
                        <tr>
                            <td className="lbl">Région/Region :</td>
                            <td className="val">{v("region")}</td>
                            <td className="lbl">
                                District de santé/Health district :
                            </td>
                            <td className="val">{v("districtSante")}</td>
                        </tr>
                        <tr>
                            <td className="lbl">Aire de santé/Health Area :</td>
                            <td className="val">{v("aireSante")}</td>
                            <td className="lbl">
                                Formation sanitaire/Health facility :
                            </td>
                            <td className="val">{v("formationSanitaire")}</td>
                        </tr>
                        <tr>
                            <td colSpan="4" className="s5-sub">
                                Information sur le défunt / Administrative Data
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">*Sexe/ Sex :</td>
                            <td colSpan="3">
                                <Coche label="Masculin / Male" actif={is("sexe", ["masculin", "m"])} />
                                <Coche label="Féminin / Female" actif={is("sexe", ["féminin", "feminin", "f"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="lbl">
                                *Date de naissance / Date of birth :
                            </td>
                            <td className="val">{v("dateNaissance")}</td>
                            <td className="lbl">
                                *Date de décès / Date of death :
                            </td>
                            <td className="val">{v("dateDeces")}</td>
                        </tr>
                        <tr>
                            <td className="lbl">Heure/Time :</td>
                            <td colSpan="3" className="val">
                                {v("heureDeces")}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Cadre A */}
                <table className="decl-table s5">
                    <tbody>
                        <tr>
                            <td colSpan="4" className="s5-sub">
                                Cadre A: données Médicales: 1ère et 2ème partie
                                / Frame A: Medical data: Part 1 and 2
                            </td>
                        </tr>
                        <tr>
                            <td rowSpan="5" className="s5-cause-text">
                                <p>
                                    <strong>
                                        1 Maladie, ou état morbide ayant
                                        directement provoqué le décès sur la
                                        ligne a / Disease or condition directly
                                        leading to death on line a
                                    </strong>
                                </p>
                                <p className="s5-indent">
                                    Indiquer dans leur ordre de survenance la
                                    chaîne des événements causaux / Report chain
                                    of events in due to order (if applicable)
                                </p>
                                <p className="s5-indent">
                                    Inscrire la cause initiale du décès sur la
                                    dernière ligne / State the underlying cause
                                    on the lowest used line
                                </p>
                            </td>
                            <td rowSpan="5" className="s5-arrow-cell">
                                <div className="s5-arrow">↘</div>
                                <div className="s5-arrow">↘</div>
                                <div className="s5-arrow">↘</div>
                            </td>
                            <td className="s5-cause-head">
                                Cause du décès / Cause of death
                            </td>
                            <td className="s5-interval-head">
                                Intervalle de temps entre l'apparition de
                                maladie et la mort/Time interval from on set to
                                death
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">a</span>{" "}
                                <span className="val">{v("causeA")}</span>
                            </td>
                            <td>
                                <span className="val">{" "}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">b</span>{" "}
                                <em>Due à / Due to:</em>{" "}
                                <span className="val">{v("causeB")}</span>
                            </td>
                            <td>
                                <span className="val">{" "}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">c</span>{" "}
                                <em>Due à / Due to:</em>{" "}
                                <span className="val">{v("causeC")}</span>
                            </td>
                            <td>
                                <span className="val">{" "}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="s5-letter">d</span>{" "}
                                <em>Due à / Due to:</em>{" "}
                                <span className="val">{v("causeD")}</span>
                            </td>
                            <td>
                                <span className="val">{" "}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-cause-text">
                                2 Autres affections importantes contribuant au
                                décès / Other significant conditions
                                contributing to death
                            </td>
                            <td colSpan="2" className="val">
                                {v("autresAffections")}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Cadre B */}
                <table className="decl-table s5">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub">
                                Cadre B : Autres données médicales/ Frame B:
                                Other medical data
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Une intervention chirurgicale a-t-elle été
                                effectuée au cours des 4 dernières semaines? /
                                Was surgery performed within the last 4 weeks?
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("interventionChirurgicale", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("interventionChirurgicale", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("interventionChirurgicale", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Si oui, veuillez préciser la date de l'opération
                                /If yes please specify date of surgery :
                            </td>
                            <td className="s5-check val">{v("dateOperation")}</td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Si oui, veuillez préciser la raison de
                                l'intervention chirurgicale (maladie ou état) :
                                <br />
                                /If yes please specify reason for surgery
                                (disease or condition) :
                            </td>
                            <td className="s5-check val">{v("raisonOperation")}</td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Une autopsie a-t-elle été demandée /Was an
                                autopsy requested?
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("autopsie", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("autopsie", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("autopsie", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Si oui, les résultats ont été utilisés dans
                                l'établissement du certificat de genre de mort
                                /If yes were the findings used in the
                                certificate of causes of death?
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("autopsieCertificat", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("autopsieCertificat", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("autopsieCertificat", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Genre de mort */}
                <table className="decl-table s5">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub">
                                Genre de mort / Manner of death:
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">Causes internes :</td>
                            <td className="s5-check">
                                <Coche label="Maladie/Disease" actif={is("causesInternes", ["maladie", "disease"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Causes externes :<br />
                                /Legal intervention
                            </td>
                            <td className="s5-check">
                                <Coche label="Accident/Accident" actif={is("causesExternes", ["accident"])} />
                                <Coche label="Catastrophe naturelle / Natural disaster" actif={is("causesExternes", ["catastrophe", "disaster"])} />
                                <Coche label="Suicide /Intentional self harm" actif={is("causesExternes", ["suicide"])} />
                                <Coche label="Intervention de la force publique" actif={is("causesExternes", ["force publique"])} />
                                <Coche label="Agression /Assault" actif={is("causesExternes", ["agression", "assault"])} />
                                <Coche label="Guerre /War" actif={is("causesExternes", ["guerre", "war"])} />
                                <Coche label="Empoisonnement / Poisoning" actif={is("causesExternes", ["empoisonnement", "poisoning"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">Causes indéterminées :</td>
                            <td className="s5-check">
                                <Coche label="N'a pu être déterminé /Could not be determined" actif={is("causesIndeterminees", ["pas", "could not", "déterminer"])} />
                                <Coche label="Enquête en cours /Pending investigation" actif={is("causesIndeterminees", ["enquête", "enquete", "pending"])} />
                                <Coche label="Inconnu /Unknown" actif={is("causesIndeterminees", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                En cas de cause externe ou d'empoisonnement :
                                <br />
                                /If external cause or poisoning:
                            </td>
                            <td className="s5-check val">{v("dateBlessure")}</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-q">
                                Veuillez décrire comment la cause externe s'est
                                produite (en cas d'empoisonnement, veuillez
                                préciser l'agent d'empoisonnement)/ Please
                                describe how external cause occurred (if
                                poisoning please specify poisoning agent) :
                                <span className="val">
                                    {" "}
                                    {v("descriptionCauseExterne")}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Lieu de survenance */}
                <table className="decl-table s5">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub">
                                Lieu de survenance de la cause externe /Place
                                of occurrence of the external cause:
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-check" colSpan="2">
                                <Coche label="À domicile/At home" actif={is("lieuSurvenance", ["domicile", "home"])} />
                                <Coche label="Institution résidentielle /Residential institution" actif={is("lieuSurvenance", ["résidentielle", "institution"])} />
                                <Coche label="École, autre institution, secteur administratif public/School, other institution, public administrative area" actif={is("lieuSurvenance", ["école", "ecole", "school", "public"])} />
                                <Coche label="Espace sports et athlétisme/Sports and athletics area" actif={is("lieuSurvenance", ["sport", "athlétisme"])} />
                                <Coche label="Rue et autoroute/Street and highway" actif={is("lieuSurvenance", ["rue", "street", "highway", "autoroute"])} />
                                <Coche label="Secteur commerce et services/Trade and service area" actif={is("lieuSurvenance", ["commerce", "service"])} />
                                <Coche label="Zone industrielle et de construction /Industrial and construction area" actif={is("lieuSurvenance", ["industrielle", "construction"])} />
                                <Coche label="Ferme /Farm" actif={is("lieuSurvenance", ["ferme", "farm"])} />
                                <Coche label="Autre lieu (veuillez préciser) : /Other place (please specify):" actif={is("lieuSurvenance", ["autre", "other"])} />
                                <Coche label="Unknown" actif={is("lieuSurvenance", ["unknown", "inconnu"])} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Mortalité fœtale */}
                <table className="decl-table s5">
                    <tbody>
                        <tr>
                            <td colSpan="2" className="s5-sub">
                                Mortalité fœtale ou infantile /Fetal or infant
                                Death
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Grossesse gémellaire /Multiple pregnancy :
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("grossesseMultiple", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("grossesseMultiple", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("grossesseMultiple", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Mort-né /Stillborn?
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("mortNe", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("mortNe", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("mortNe", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Si le décès survient dans les 24 heures, précisez
                                le nombre d'heures de survie /If death within
                                24h specify number of hours survived
                            </td>
                            <td className="s5-check">
                                <span>
                                    <em>Poids à la naissance (en grammes)/Birth
                                    weight (in grams)</em>
                                </span>
                                <span className="val">{v("poidsNaissance")}</span>
                                <span className="val">{v("heuresSurvecues")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Nombre de semaines de grossesse /Number of
                                completed weeks of pregnancy
                            </td>
                            <td className="s5-check">
                                <span>
                                    <em>Âge de la mère (année)/Age of mother
                                    (years)</em>
                                </span>
                                <span className="val">{v("semainesGrossesse")}</span>
                                <span className="val">{v("ageMere")}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="s5-q">
                                Si le décès a été périnatal, veuillez indiquer
                                les conditions de la mère qui ont affecté le
                                fœtus ou le nouveau-né /If death was perinatal,
                                please state conditions of mother that affected
                                the fetus and new born
                                <span className="val">
                                    {" "}
                                    {v("conditionsMere")}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Pour les femmes, la défunte était-elle enceinte
                                ? /For women, was the deceased pregnant?
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("femmeEnceinte", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("femmeEnceinte", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("femmeEnceinte", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">Si oui</td>
                            <td className="s5-check">
                                <Coche label="Au moment du décès/At time of death" actif={is("momentDeces", ["moment", "time"])} />
                                <Coche label="Dans les 42 jours precedent le deces/Within 42 days before the death" actif={is("momentDeces", ["42", "within"])} />
                                <Coche label="entre 43 jours et dans un délai d'un an avant le décès/Between 43 days up to 1 year before death" actif={is("momentDeces", ["43", "between"])} />
                            </td>
                        </tr>
                        <tr>
                            <td className="s5-q">
                                Did the pregnancy contribute to the death?
                            </td>
                            <td className="s5-check">
                                <Coche label="Oui / Yes" actif={is("grossesseContribue", ["oui", "yes"])} />
                                <Coche label="Non/ No" actif={is("grossesseContribue", ["non", "no"])} />
                                <Coche label="Inconnu /Unknown" actif={is("grossesseContribue", ["inconnu", "unknown"])} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Signatures Section 5 */}
                <table className="decl-table s5-sign">
                    <tbody>
                        <tr>
                            <td className="lbl">
                                * Noms et Prénoms / Name and Surname :
                            </td>
                            <td className="val">{v("nomSignataire")}</td>
                            <td className="lbl">
                                * Date (jj/mm/aaaa- dd/mm/yyyy)
                            </td>
                            <td className="val">{v("dateSignature")}</td>
                        </tr>
                        <tr>
                            <td className="lbl">* Qualité / Status</td>
                            <td className="val">{v("qualiteSignataire")}</td>
                            <td className="lbl">* Signature</td>
                            <td className="val">{v("signature")}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="decl-footer">Page 3 sur 3</div>
            </div>
        </div>
    );
};

export default DeclarationDeces;