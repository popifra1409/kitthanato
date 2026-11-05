import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../services/http";
import api, { asList } from "../services/api";
import "./GenreDeMort.css";

/* Date du jour */
const dateDuJour = () =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

/* Format de date provenant de Laravel */
const formaterDate = (date) => {
  if (!date) return "";

  const valeur = String(date).split("T")[0].split(" ")[0];
  const correspondance = valeur.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (correspondance) {
    return `${correspondance[3]}/${correspondance[2]}/${correspondance[1]}`;
  }

  return valeur;
};

/* Libellé bilingue */
function Label({ fr, en }) {
  return (
    <span className="label">
      <b className="label__fr">{fr}</b>
      <i className="label__en">{en}</i>
    </span>
  );
}

/* Champ de saisie */
function LineField({
  fr,
  en,
  name,
  value,
  onChange,
  className = "",
}) {
  return (
    <div className={`field ${className}`}>
      <Label fr={fr} en={en} />
      <input
        className="dots"
        type="text"
        name={name}
        value={value ?? ""}
        onChange={onChange}
        aria-label={`${fr} ${en}`}
      />
    </div>
  );
}

/* Case à cocher ou bouton radio */
function Box({
  label,
  type = "checkbox",
  name,
  checked,
  onChange,
  className = "",
}) {
  return (
    <label className={`box ${className}`}>
      <span className="box__text">{label}</span>
      <input
        type={type}
        name={name}
        checked={!!checked}
        onChange={onChange}
      />
      <span className="box__square" aria-hidden="true" />
    </label>
  );
}

const GENRES_GAUCHE = [
  { key: "naturelle", label: "Mort naturelle (maladie)" },
  { key: "accident", label: "Accident" },
  { key: "armeFeu", label: "Arme à feu" },
  { key: "empoisonnement", label: "Empoisonnement" },
  { key: "indeterminee", label: "Mort de cause indéterminée" },
];

const GENRES_DROITE = [
  { key: "violente", label: "Mort violente (cause externe)" },
  { key: "armeBlanche", label: "Arme blanche" },
  { key: "noyade", label: "Noyade" },
];

const OUI_NON = [
  { key: "oui", label: "OUI" },
  { key: "non", label: "NON" },
  { key: "inconnu", label: "Inconnu" },
];

const DONNEES_VIDES = {
  ref: "",
  yaounde: "",
  soussigne: "",
  constat: "",
  leOn: "",
  atteste: "",
  sexe: "",
  nele: "",
  decedeLe: "",
  a: "",
  lieu: "",
  heures: "",
  minutes: "",
  autres: "",
  autresPrecision: "",
  contagion: "",
  autopsie: "",
  faitA: "",
  faitLe: "",
  faitHeure: "",
};

function GenreDeMort() {
  const { depotId } = useParams();
  const navigate = useNavigate();

  /* Défunts */
  const [depots, setDepots] = useState([]);
  const [chargementDepots, setChargementDepots] = useState(true);
  const [depotSelectionne, setDepotSelectionne] = useState("");
  const [rechercheDefunt, setRechercheDefunt] = useState("");
  const [listeOuverte, setListeOuverte] = useState(false);

  /* Certificat */
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [certificatId, setCertificatId] = useState(null);
  const [nomsCertificat, setNomsCertificat] = useState([]);
  const [enregistrement, setEnregistrement] = useState(false);

  const [data, setData] = useState({
    ...DONNEES_VIDES,
    yaounde: dateDuJour(),
  });

  const [genres, setGenres] = useState({});

  /* Libellé affiché pour chaque défunt */
  const libelleDepot = (depot) =>
    [
      depot.code || depot.code_defunt,
      depot.nom,
      depot.prenom,
    ]
      .filter(Boolean)
      .join(" - ");

  /* Recherche directement dans le champ de sélection */
  const depotsFiltres = depots.filter((depot) => {
    const recherche = rechercheDefunt.trim().toLowerCase();

    const informations = [
      depot.code,
      depot.code_defunt,
      depot.nom,
      depot.prenom,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return informations.includes(recherche);
  });

  /* Modifier un champ du certificat */
  const set = (e) => {
    const { name, value } = e.target;
    if (!name) return;

    setData((ancienneData) => ({
      ...ancienneData,
      [name]: value,
    }));
  };

  /* Charger les défunts */
  useEffect(() => {
    let actif = true;

    const chargerDepots = async () => {
      try {
        setChargementDepots(true);

        const resultat = await api.depots.list();

        if (actif) {
  setDepots(
    asList(resultat, "depots").filter(
      (depot) =>
        String(depot.statut || "").toUpperCase() === "PRÉSENT" &&
        !depot.scelle
    )
  );
}
      } catch (error) {
        console.error("Erreur de chargement des dépôts :", error);

        if (actif) setDepots([]);
      } finally {
        if (actif) setChargementDepots(false);
      }
    };

    chargerDepots();

    return () => {
      actif = false;
    };
  }, []);

  /* Sélectionner un défunt dans les suggestions */
  const choisirDefunt = (depot) => {
    setDepotSelectionne(String(depot.id));
    setRechercheDefunt(libelleDepot(depot));
    setListeOuverte(false);
    setErreur("");
  };

  /* Cocher ou décocher un genre de mort */
  const toggleGenre = (key) => {
    setGenres((anciensGenres) => ({
      ...anciensGenres,
      [key]: !anciensGenres[key],
    }));
  };

useEffect(() => {
  const fermer = (e) => {
    if (e.type === "keydown") {
      if (e.key === "Escape") setListeOuverte(false);
      return;
    }
    if (!e.target.closest(".gm-autocomplete")) {
      setListeOuverte(false);
    }
  };

  document.addEventListener("mousedown", fermer);
  document.addEventListener("keydown", fermer);

  return () => {
    document.removeEventListener("mousedown", fermer);
    document.removeEventListener("keydown", fermer);
  };
}, []);

  /* Charger le certificat du défunt */
  useEffect(() => {
    let actif = true;

    const chargerDonnees = async () => {
      if (!depotId) {
        setChargement(false);
        setErreur("");
        setMessage("");
        setCertificatId(null);
        setNomsCertificat([]);
        setData({
          ...DONNEES_VIDES,
          yaounde: dateDuJour(),
        });
        setGenres({});
        return;
      }

      try {
        setChargement(true);
        setErreur("");
        setMessage("");

        const [resultat, noms] = await Promise.all([
          get(`/certificats-genre-mort/depot/${depotId}`),
          get("/certificats-genre-mort/noms"),
        ]);

        if (!actif) return;

        setNomsCertificat(Array.isArray(noms) ? noms : []);

        const depot = resultat?.depot || {};
        const certificat = resultat?.certificat || null;

        const donneesDefunt = {
          sexe:
            depot.sexe === "Masculin"
              ? "M"
              : depot.sexe === "Féminin"
                ? "F"
                : depot.sexe === "M" || depot.sexe === "F"
                  ? depot.sexe
                  : "",

          nele: formaterDate(depot.date_naissance),
          decedeLe: formaterDate(depot.date_deces),

          heures: depot.heure_deces
            ? String(depot.heure_deces).split(":")[0]
            : "",

          minutes: depot.heure_deces
            ? String(depot.heure_deces).split(":")[1] || ""
            : "",

          atteste: [depot.nom, depot.prenom]
            .filter(Boolean)
            .join(" "),
        };

        if (certificat) {
          setCertificatId(certificat.id);

          setData({
            ...DONNEES_VIDES,
            ...donneesDefunt,
            ...(certificat.donnees || {}),
            yaounde: dateDuJour(),
          });

          setGenres(certificat.genres || {});
        } else {
          setCertificatId(null);

          setData({
            ...DONNEES_VIDES,
            ...donneesDefunt,
            yaounde: dateDuJour(),
          });

          setGenres({});
        }
      } catch (error) {
        if (!actif) return;

        console.error("Erreur de chargement du certificat :", error);

        setErreur(
          error.message || "Impossible de charger le certificat."
        );
      } finally {
        if (actif) setChargement(false);
      }
    };

    chargerDonnees();

    return () => {
      actif = false;
    };
  }, [depotId]);

  /* Ouvrir le certificat sélectionné */
  const ouvrirCertificat = (e) => {
    e.preventDefault();

    if (!depotSelectionne) {
      setErreur("Veuillez choisir un défunt dans la liste.");
      setListeOuverte(true);
      return;
    }

    setErreur("");
    navigate(`/certificatgenremort/${depotSelectionne}`);
  };

  /* Enregistrer ou modifier le certificat */
  const enregistrerCertificat = async (e) => {
    e.preventDefault();

    if (!depotId) {
      setErreur("Veuillez d'abord sélectionner un défunt.");
      return;
    }

    try {
      setEnregistrement(true);
      setErreur("");
      setMessage("");

      const payload = {
        depot_id: Number(depotId),
        donnees: {
          ...data,
          yaounde: dateDuJour(),
        },
        genres,
      };

      if (certificatId) {
        await put(
          `/certificats-genre-mort/${certificatId}`,
          payload
        );

        setMessage("Certificat modifié avec succès.");
      } else {
        const resultat = await post(
          "/certificats-genre-mort",
          payload
        );

        const nouvelId =
          resultat?.certificat?.id ??
          resultat?.data?.certificat?.id ??
          resultat?.data?.id ??
          resultat?.id;

        if (nouvelId) setCertificatId(nouvelId);

        setMessage("Certificat enregistré avec succès.");
      }
    } catch (error) {
      console.error("Erreur d'enregistrement :", error);

      setErreur(
        error.message || "Impossible d'enregistrer le certificat."
      );
    } finally {
      setEnregistrement(false);
    }
  };

  /* Fenêtre modale de sélection */
  if (!depotId) {
    return (
      <div className="gm-modal-overlay">
        <div
          className="gm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gm-modal-title"
        >
          <div className="gm-modal__header">
            <div className="gm-modal__icon" aria-hidden="true">
              📄
            </div>

            <div>
              <h2 id="gm-modal-title">
                Sélectionner le défunt
              </h2>
              <p>
                Recherchez un défunt par son code, son nom ou
                son prénom.
              </p>
            </div>
          </div>

          {erreur && (
            <p role="alert" className="gm-message gm-message--error">
              {erreur}
            </p>
          )}

          <form
            onSubmit={ouvrirCertificat}
            className="gm-modal__form"
          >
            <label
              className="gm-modal__label"
              htmlFor="gm-depot-selection"
            >
              Défunt <span>*</span>
            </label>

            {/* Un seul champ de recherche et de sélection */}
            <div className="gm-autocomplete">
              <input
                id="gm-depot-selection"
                className="gm-modal__select"
                type="text"
                value={rechercheDefunt}
                placeholder={
                  chargementDepots
                    ? "Chargement des défunts..."
                    : "Choisir un défunt..."
                }
                autoComplete="off"
                disabled={chargementDepots}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={listeOuverte}
                aria-controls="gm-liste-defunts"
                onFocus={() => setListeOuverte(true)}
                onChange={(e) => {
                  setRechercheDefunt(e.target.value);
                  setDepotSelectionne("");
                  setErreur("");
                  setListeOuverte(true);
                }}
              />

              <span className="gm-autocomplete__arrow" aria-hidden="true">
                ▾
              </span>

              {listeOuverte && !chargementDepots && (
                <div
                  id="gm-liste-defunts"
                  className="gm-autocomplete__liste"
                  role="listbox"
                >
                  {depotsFiltres.length > 0 ? (
                    depotsFiltres.map((depot) => (
                      <button
                        key={depot.id}
                        type="button"
                        className={
                          depotSelectionne === String(depot.id)
                            ? "gm-autocomplete__option gm-autocomplete__option--active"
                            : "gm-autocomplete__option"
                        }
                        role="option"
                        aria-selected={
                          depotSelectionne === String(depot.id)
                        }
                        onClick={() => choisirDefunt(depot)}
                      >
                        <span className="gm-autocomplete__nom">
                          {[depot.nom, depot.prenom]
                            .filter(Boolean)
                            .join(" ")}
                        </span>

                        <span className="gm-autocomplete__code">
                          {depot.code || depot.code_defunt || "Sans code"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="gm-autocomplete__vide">
                      {depots.length === 0
                        ? "Aucun dépôt disponible."
                        : "Aucun défunt trouvé pour cette recherche."}
                    </p>
                  )}
                </div>
              )}
            </div>

            {depotSelectionne && (
              <p className="gm-modal__info">
                Défunt sélectionné : {rechercheDefunt}
              </p>
            )}

            <div className="gm-modal__actions">
              <button
                type="button"
                className="gm-modal__btn gm-modal__btn--secondary"
                onClick={() => navigate(-1)}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="gm-modal__btn gm-modal__btn--primary"
                disabled={chargementDepots || !depotSelectionne}
              >
                Ouvrir le certificat →
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* Chargement */
  if (chargement) {
    return <p>Chargement du certificat...</p>;
  }

  return (
    <div className="gm-page">
      {erreur && (
        <p role="alert" className="gm-message gm-message--error">
          {erreur}
        </p>
      )}

      {message && (
        <p role="status" className="gm-message gm-message--success">
          {message}
        </p>
      )}

      {/* En-tête de l'hôpital */}
      <header className="gm-header">
        <div className="gm-header__fr">
          <p>REPUBLIQUE DU CAMEROUN</p>
          <p>Paix-Travail-Patrie</p>
          <span>---------</span>
          <p>MINISTERE DE LA SANTE PUBLIQUE</p>
          <span>-----------</span>
          <p>HOPITAL GENERAL DE YAOUNDE</p>
          <span>------------------</span>
          <span>B.P.5408</span>
          <span>Tel :(237) 222.21.31.81</span>
          <span>Fax :(237) 222.21.20.15</span>
          <span className="lien">
            hopitalgeneraldeyaounde@gmail.com
          </span>
        </div>

        <img
          className="gm-header__emblem"
          src="/logo.png"
          alt="Logo de l'hôpital"
        />

        <div className="gm-header__en">
          <p>REPUBLIC OF CAMEROON</p>
          <p>Peace-Work-Fatherland</p>
          <span>---------</span>
          <p>MINISTRY OF PUBLIC HEALTH</p>
          <span>-----------</span>
          <p>YAOUNDE GENERAL HOSPITAL</p>
          <span>------------------</span>
        </div>
      </header>

      {/* Référence */}
      <div className="ref">
        <strong>N/Ref :</strong>
        <input
          className="dots dots--solid"
          type="text"
          name="ref"
          value={data.ref ?? ""}
          onChange={set}
        />
        <strong>/HGY/DMR/CD</strong>
      </div>

      {/* Date automatique */}
      <div className="gm-top">
        <div className="gm-top__row">
          <span>Yaoundé le</span>
          <input
            className="dots dots--solid"
            type="text"
            value={data.yaounde ?? ""}
            readOnly
            aria-label="Yaoundé le"
          />
        </div>
        <i className="gm-top__en">Yaounde the</i>
      </div>

      <h1 className="gm-title">
        CERTIFICAT DE GENRE DE MORT
      </h1>

      <form className="gm-form" onSubmit={enregistrerCertificat}>
        <LineField
          fr="Je soussigné"
          en="I, the Undersigned"
          name="soussigne"
          value={data.soussigne}
          onChange={set}
        />

        <LineField
          fr="Sur la base du Constat de décès établi par"
          en="Based on the death confirmed by"
          name="constat"
          value={data.constat}
          onChange={set}
        />

        <div className="field field--right">
          <span className="inline-label">Le/on</span>
          <input
            className="dots"
            type="text"
            name="leOn"
            value={data.leOn ?? ""}
            onChange={set}
            aria-label="Le / on"
          />
        </div>

        <LineField
          fr="Atteste que :"
          en="Affirms that"
          name="atteste"
          value={data.atteste}
          onChange={set}
        />

        {/* Sexe */}
        <div className="sexe">
          <b className="sexe__title">Sexe/Sex :</b>

          <Box
            label="Masculin"
            type="radio"
            name="sexe"
            checked={data.sexe === "M"}
            onChange={() =>
              setData((ancienneData) => ({
                ...ancienneData,
                sexe: "M",
              }))
            }
          />

          <Box
            label="Féminin"
            type="radio"
            name="sexe"
            checked={data.sexe === "F"}
            onChange={() =>
              setData((ancienneData) => ({
                ...ancienneData,
                sexe: "F",
              }))
            }
          />
        </div>

        {/* Naissance et décès */}
        <div className="duo">
          <div className="duo__left">
            <LineField
              fr="Né(e) le :"
              en="Born on"
              name="nele"
              value={data.nele}
              onChange={set}
            />
          </div>

          <div className="duo__right">
            <div className="duo__cell">
              <Label fr="est décédé le" en="died on" />

              <input
                className="dots"
                type="text"
                name="decedeLe"
                value={data.decedeLe ?? ""}
                onChange={set}
                aria-label="Est décédé le"
              />

              <span className="inline-label">A</span>

              <input
                className="dots dots--short"
                type="text"
                name="a"
                value={data.a ?? ""}
                onChange={set}
                aria-label="A"
              />
            </div>
          </div>
        </div>

        <div className="field field--right hm">
          <span className="inline-label">heure(s)</span>
          <input
            className="dots dots--short"
            type="text"
            name="heures"
            value={data.heures ?? ""}
            onChange={set}
            aria-label="Heures"
          />

          <span className="inline-label">minute(s)</span>
          <input
            className="dots dots--short"
            type="text"
            name="minutes"
            value={data.minutes ?? ""}
            onChange={set}
            aria-label="Minutes"
          />
        </div>

        <LineField
          fr="Lieu du décès :"
          en="Place of death"
          name="lieu"
          value={data.lieu}
          onChange={set}
        />

        {/* Genre de mort */}
        <div className="genre">
          <Label fr="Genre de mort :" en="Cause of death" />

          <div className="genre__grid">
            <div className="genre__col">
              {GENRES_GAUCHE.map((g) => (
                <Box
                  key={g.key}
                  label={g.label}
                  checked={!!genres[g.key]}
                  onChange={() => toggleGenre(g.key)}
                />
              ))}
            </div>

            <div className="genre__col genre__col--right">
              {GENRES_DROITE.map((g) => (
                <Box
                  key={g.key}
                  label={g.label}
                  checked={!!genres[g.key]}
                  onChange={() => toggleGenre(g.key)}
                />
              ))}

              <div className="autres">
                <span className="autres__label">Autres</span>
                <input
                  className="dots dots--solid"
                  type="text"
                  name="autres"
                  value={data.autres ?? ""}
                  onChange={set}
                  aria-label="Autres"
                />
              </div>

              <div className="autres autres--precision">
                <input
                  className="dots dots--solid"
                  type="text"
                  name="autresPrecision"
                  value={data.autresPrecision ?? ""}
                  onChange={set}
                  aria-label="Autres à préciser"
                />
                <span className="autres__label">(à préciser)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contagiosité */}
        <section className="question">
          <strong className="question__fr">
            La dépouille présente-t-elle un risque de contagiosité particulier ?
          </strong>

          <span className="question__en">
            Is the corpse presenting any risk of contamination?
          </span>

          <div className="choices">
            {OUI_NON.map((o) => (
              <Box
                key={o.key}
                label={o.label}
                type="radio"
                name="contagion"
                checked={data.contagion === o.key}
                onChange={() =>
                  setData((ancienneData) => ({
                    ...ancienneData,
                    contagion: o.key,
                  }))
                }
              />
            ))}
          </div>
        </section>

        {/* Autopsie */}
        <section className="question">
          <strong className="question__fr">
            Une autopsie a-t-elle été réalisée ?
          </strong>

          <span className="question__en">
            Was an autopsy performed?
          </span>

          <div className="choices">
            {OUI_NON.map((o) => (
              <Box
                key={o.key}
                label={o.label}
                type="radio"
                name="autopsie"
                checked={data.autopsie === o.key}
                onChange={() =>
                  setData((ancienneData) => ({
                    ...ancienneData,
                    autopsie: o.key,
                  }))
                }
              />
            ))}
          </div>
        </section>

        {/* Fait à, date et heure */}
        <div className="fait">
          <span className="fait__label">Fait à</span>
          <input
            className="dots"
            type="text"
            name="faitA"
            value={data.faitA ?? ""}
            onChange={set}
            aria-label="Fait à"
          />

          <span className="fait__label">Le</span>
          <input
            className="dots"
            type="text"
            name="faitLe"
            value={data.faitLe ?? ""}
            onChange={set}
            aria-label="Date d'établissement"
          />

          <span className="fait__label">Heure</span>
          <input
            className="dots"
            type="text"
            name="faitHeure"
            value={data.faitHeure ?? ""}
            onChange={set}
            aria-label="Heure d'établissement"
          />
        </div>

        <strong className="signature">
          Signature et Cachet du Praticien
        </strong>

        {/* Noms enregistrés */}
        {nomsCertificat.length > 0 && (
          <div className="gm-noms">
            <strong>Noms enregistrés</strong>
            <ul>
              {nomsCertificat.map((nom, index) => (
                <li key={nom.id ?? index}>
                  {typeof nom === "string"
                    ? nom
                    : nom.nom ?? nom.libelle ?? ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Boutons */}
        <div className="gm-actions">
          <button type="submit" disabled={enregistrement}>
            {enregistrement
              ? "Enregistrement..."
              : certificatId
                ? "Modifier le certificat"
                : "Enregistrer le certificat"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/certificatgenremort")}
            disabled={enregistrement}
          >
            Retour à la sélection
          </button>

          <button
            type="button"
            onClick={() => window.print()}
          >
            Imprimer
          </button>
        </div>
      </form>
    </div>
  );
}

export default GenreDeMort;