import React, { useEffect, useRef, useState } from "react";
import "./Recu.css";

/* =========================================================
   CONVERSION NOMBRE → LETTRES (français)
========================================================= */

const nombreEnLettres = (nombre) => {
    const n = Math.floor(Number(nombre) || 0);

    if (n === 0) return "zéro";

    const unites = [
        "",
        "un",
        "deux",
        "trois",
        "quatre",
        "cinq",
        "six",
        "sept",
        "huit",
        "neuf",
    ];

    const dizainesSpeciales = [
        "dix",
        "onze",
        "douze",
        "treize",
        "quatorze",
        "quinze",
        "seize",
        "dix-sept",
        "dix-huit",
        "dix-neuf",
    ];

    const dizaines = [
        "",
        "",
        "vingt",
        "trente",
        "quarante",
        "cinquante",
        "soixante",
        "soixante",
        "quatre-vingt",
        "quatre-vingt",
    ];

    const convertirDizaine = (n) => {
        if (n < 10) return unites[n];
        if (n < 20) return dizainesSpeciales[n - 10];

        const d = Math.floor(n / 10);
        const u = n % 10;

        if (d === 7) {
            if (u === 1) return "soixante et onze";
            return "soixante-" + dizainesSpeciales[u];
        }

        if (d === 9) {
            return "quatre-vingt-" + dizainesSpeciales[u];
        }

        if (u === 1 && d !== 8) {
            return dizaines[d] + " et un";
        }

        if (u === 1 && d === 8) {
            return dizaines[d] + "-un";
        }

        if (u === 0 && d === 8) {
            return "quatre-vingts";
        }

        if (u === 0) return dizaines[d];

        return dizaines[d] + "-" + unites[u];
    };

    const convertirCentaine = (n) => {
        if (n < 100) return convertirDizaine(n);

        const c = Math.floor(n / 100);
        const reste = n % 100;

        let resultat = "";

        if (c === 1) {
            resultat = "cent";
        } else {
            resultat = unites[c] + " cent";
            if (reste === 0) {
                resultat += "s";
            }
        }

        if (reste === 0) return resultat;

        return resultat + " " + convertirDizaine(reste);
    };

    const convertir = (n) => {
        if (n === 0) return "zéro";

        if (n >= 1000000000) {
            const milliards = Math.floor(n / 1000000000);
            const reste = n % 1000000000;
            let resultat =
                milliards === 1
                    ? "un milliard"
                    : convertirCentaine(milliards) + " milliards";
            if (reste === 0) return resultat;
            return resultat + " " + convertir(reste);
        }

        if (n >= 1000000) {
            const millions = Math.floor(n / 1000000);
            const reste = n % 1000000;
            let resultat =
                millions === 1
                    ? "un million"
                    : convertirCentaine(millions) + " millions";
            if (reste === 0) return resultat;
            return resultat + " " + convertir(reste);
        }

        if (n >= 1000) {
            const milliers = Math.floor(n / 1000);
            const reste = n % 1000;
            let resultat =
                milliers === 1
                    ? "mille"
                    : convertirCentaine(milliers) + " mille";
            if (reste === 0) return resultat;
            return resultat + " " + convertirCentaine(reste);
        }

        return convertirCentaine(n);
    };

    return convertir(n);
};


/* =========================================================
   REÇU TEXTE POUR IMPRIMANTE MATRICIELLE
========================================================= */

const LARGEUR = 72;          // caractères par ligne
const SANS_ACCENTS = true;   // true = plus sûr sur une matricielle

const nettoyer = (t) => {
    let s = String(t ?? "");
    if (SANS_ACCENTS) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s;
};

const gauche = (t, n) => nettoyer(t).substring(0, n).padEnd(n, " ");
const droite = (t, n) => nettoyer(t).substring(0, n).padStart(n, " ");

const centrer = (t) => {
    const s = nettoyer(t);
    return " ".repeat(Math.max(0, Math.floor((LARGEUR - s.length) / 2))) + s;
};

const trait = (c = "-") => c.repeat(LARGEUR);

// Espace normal à la place de l'espace insécable de Intl
const montantTexte = (n) =>
    new Intl.NumberFormat("fr-FR")
        .format(Number(n || 0))
        .replace(/[\u202f\u00a0]/g, " ");

const dateTexte = (date) => {
    const v = String(date || "").split("T")[0].substring(0, 10);
    const p = v.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v;
};

// Coupe une désignation trop longue sur plusieurs lignes
const decouper = (texte, largeur) => {
    const mots = nettoyer(texte).split(" ");
    const lignes = [];
    let courante = "";

    mots.forEach((mot) => {
        if ((courante + " " + mot).trim().length > largeur) {
            if (courante) lignes.push(courante);
            courante = mot;
        } else {
            courante = (courante + " " + mot).trim();
        }
    });

    if (courante) lignes.push(courante);
    return lignes.length ? lignes : [""];
};

const echapper = (t) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const construireTexte = (data, prestations, total) => {
    const L = [];
    const COL_DESIG = 52;
    const COL_MONT = 19;

    L.push(centrer("REPUBLIQUE DU CAMEROUN "));
    L.push(centrer("Paix-Travail-Patrie"));
    L.push(centrer("HOPITAL GENERAL DE YAOUNDE"));
    L.push(centrer("B.P.5408 Yaounde"));
    L.push(centrer(" Tel : (237) 222 21 20 18/222 21 20 20"));
    L.push(trait("="));
    L.push(centrer("PRE-FACTURE ATTESTATION DE SOINS"));
    L.push(trait("="));
    L.push("Je soussigne, Docteur en medecine, certifie que");
    L.push("");
    L.push(`M./Mme    : ${data.nomDefunt || "..............................."}`);
    L.push(`CODE  : ${data.codeDefunt || "..............................."}`);
    L.push("Origine : .......................................");
    L.push("");
    L.push(`CONSULTATION DE : FRAIS DE MORGUE        Date : ${dateTexte(data.date)}`);
    L.push(trait());
    L.push(`${gauche("DESIGNATION", COL_DESIG)} ${droite("MONTANT", COL_MONT)}`);
    L.push(trait());

    if (prestations.length === 0) {
        L.push("Aucune prestation enregistree");
    }

    prestations.forEach((p) => {
        const montant = Number(p.quantite || 0) * Number(p.prixUnitaire || 0);
        const lignes = decouper(p.designation, COL_DESIG);

        lignes.forEach((ligne, i) => {
            L.push(
                `${gauche(ligne, COL_DESIG)} ${
                    i === 0
                        ? droite(montantTexte(montant) + " FCFA", COL_MONT)
                        : ""
                }`.trimEnd()
            );
        });
    });

    L.push(trait());
    L.push("Arrete la presente facture a la somme de :");
    decouper(`${nombreEnLettres(total)} francs CFA`, LARGEUR).forEach((l) =>
        L.push(l)
    );
    L.push("");
    L.push(
        `${gauche("TOTAL A PAYER", 40)} ${droite(montantTexte(total) + " FCFA", 31)}`
    );
    L.push(trait("="));
    L.push("");
    L.push("Signature et cachet du Medecin");
    L.push("");
    L.push("");
    L.push("");

    return L.join("\n");
};

const imprimerTexte = (texte, titre) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${echapper(titre)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  pre {
    margin: 0;
    font-family: "Courier New", Courier, monospace;
    font-size: 12pt;
    line-height: 1.25;
    color: #000;
    white-space: pre;
  }
</style></head>
<body><pre>${echapper(texte)}</pre></body></html>`);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 2000);
    }, 300);
};

/* =========================================================
   COMPOSANT
========================================================= */

const Recu = () => {
    const [recu, setRecu] = useState(null);

    /* =====================================================
       CHARGER LES DONNÉES DEPUIS LOCALSTORAGE
    ===================================================== */

    useEffect(() => {
        try {
            const stored = localStorage.getItem("recu_actuel");

            if (stored) {
                setRecu(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Erreur lecture reçu :", e);
        }
    }, []);

    /* =====================================================
       VALEURS PAR DÉFAUT
    ===================================================== */

    const data = recu || {
        numero: "",
        date: "",
        heure: "",
        etablissement: "HÔPITAL GÉNÉRAL",
        service: "SERVICE DE THANATOPRAXIE",
        nomDefunt: "",
        codeDefunt: "",
        payeur: "",
        telephonePayeur: "",
        lienParente: "",
        prestations: [],
        montantPaye: 0,
    };

    /* =====================================================
       FORMATAGE
    ===================================================== */

    const formatMontant = (montant) => {
        const valeur = Number(montant || 0);
        return new Intl.NumberFormat("fr-FR").format(valeur);
    };

    const formatDate = (date) => {
        if (!date) return "";

        const valeur = String(date);

        if (valeur.includes("T")) {
            const [y, m, d] = valeur.split("T")[0].split("-");
            return `${d}/${m}/${y}`;
        }

        if (valeur.includes("-")) {
            const [y, m, d] = valeur.split("-");
            return `${d}/${m}/${y}`;
        }

        return valeur;
    };

    /* =====================================================
       PRESTATIONS
    ===================================================== */

    const prestations = Array.isArray(data.prestations)
        ? data.prestations
        : [];

    /* =====================================================
       TOTAL
    ===================================================== */

    const total = prestations.reduce((somme, prestation) => {
        const quantite = Number(prestation.quantite || 0);
        const prixUnitaire = Number(prestation.prixUnitaire || 0);
        return somme + quantite * prixUnitaire;
    }, 0);


const dejaImprime = useRef(false);

const lancerImpression = () => {
    imprimerTexte(
        construireTexte(data, prestations, total),
        `Recu ${data.numero || ""}`
    );
};

// Impression automatique à l'ouverture de la page
useEffect(() => {
    if (recu && !dejaImprime.current) {
        dejaImprime.current = true;
        lancerImpression();
    }
}, [recu]);

   
};

export default Recu;