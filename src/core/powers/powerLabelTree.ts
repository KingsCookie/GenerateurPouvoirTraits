// Arbre de libellé §6.4.2 — **reproduit verbatim** depuis rsrc/DescriptionProjet.md (faisant foi,
// Principe IX). Les comportements pouvant sembler « incohérents » (état non repris dans certaines
// branches, {Ka}/{Ke}/{Kp}/{Kaj} absents de certaines feuilles, etc.) sont **volontaires** : ne pas
// « corriger ». Cette fonction est PURE et pilotée uniquement par la présence de chaque type.
//
// Depuis v0.15.0 : certaines feuilles produisent **deux** pouvoirs, notés `"X ; Y"` dans l'arbre.
// `powerLabelFromSublist` renvoie donc un **tableau** de 0, 1 ou 2 gabarits résolus (types présents).

/** Libellés (déjà regroupés « , … et » / « ou ») des types présents dans une sous-liste. */
export interface SublistGroups {
  a?: string; // Action
  e?: string; // Élément
  p?: string; // Partie du corps
  aj?: string; // Ajout
  r?: string; // Remplacement
  et?: string; // État
}

/**
 * Renvoie les **gabarits** de libellé d'une sous-liste selon la présence des types (0, 1 ou 2), ou `[]`.
 * Les jetons `{a} {e} {p} {aj} {r} {et}` des types présents sont substitués par leurs libellés.
 * Les jetons de génération `{Ka} {Ke} {Kp} {Kaj}` (types absents) sont **laissés littéraux** :
 * c'est l'appelant (derivePowersFromTraits) qui tente la génération `K` et les résout.
 */
export function powerLabelFromSublist(groups: SublistGroups): string[] {
  const a = groups.a !== undefined;
  const e = groups.e !== undefined;
  const p = groups.p !== undefined;
  const aj = groups.aj !== undefined;
  const r = groups.r !== undefined;
  const et = groups.et !== undefined;

  const raw = treeTemplate(a, e, p, aj, r, et);
  if (raw === null) return [];
  // Une feuille peut porter deux gabarits séparés par « ; » (§6.4.2, v0.15.0).
  return raw.split(';').map((tmpl) => fillPresent(tmpl.trim(), groups));
}

// Structure if/else EXACTE du §6.4.2 (verbatim). Renvoie le gabarit brut (jetons non substitués),
// éventuellement à **deux** gabarits séparés par « ; », ou `null` (feuille terminale sans pouvoir).
function treeTemplate(
  a: boolean,
  e: boolean,
  p: boolean,
  aj: boolean,
  r: boolean,
  et: boolean,
): string | null {
  if (a) {
    if (e) {
      if (p) {
        if (r) {
          if (aj) {
            if (et)
              return '{a} {e} avec {aj} {et} sur {r} à la place de {p} ; {aj} {et} sur {r} à la place de {p}';
            else
              return '{a} {e} avec {aj} sur {r} à la place de {p} ; {aj} sur {r} à la place de {p}';
          } else {
            if (et) return '{a} {e} avec {r} {et} à la place de {p} ; {r} {et} à la place de {p}';
            else return '{a} {e} avec {r} à la place de {p} ; {r} à la place de {p}';
          }
        } else {
          if (aj) {
            if (et) return '{a} {e} avec {aj} {et} sur {p} ; {aj} {et} sur {p}';
            else return '{a} {e} avec {aj} sur {p} ; {aj} sur {p}';
          } else {
            if (et) return '{a} {e} avec {p} {et} ; {p} {et}';
            else return '{a} {e} avec {p}';
          }
        }
      } else {
        if (r) {
          if (aj) {
            if (et) return '{a} {e} avec {aj} sur {r}';
            else return '{a} {e} avec {aj} sur {r}';
          } else {
            if (et) return '{a} {e} avec {r}';
            else return '{a} {e} avec {r}';
          }
        } else {
          if (aj) {
            if (et) return '{a} {e} avec {aj}';
            else return '{a} {e} avec {aj}';
          } else {
            if (et) return '{a} {e} {et} ; rends {e} {et}';
            else return '{a} {e}';
          }
        }
      }
    } else {
      if (aj) {
        if (et) {
          if (r) {
            if (p) return '{a} {aj} {et} avec {r} à la place de {p} ; rends {aj} {et}';
            else return '{a} {aj} {et} sur {r} ; rends {aj} {et}';
          } else {
            if (p) return '{a} {aj} {et} avec {p} ; rends {aj} {et}';
            else return '{a} {aj} {et} ; rends {aj} {et}';
          }
        } else {
          if (r) {
            if (p) return '{a} {aj} avec {r} à la place de {p}';
            else return '{a} {aj} sur {r}';
          } else {
            if (p) return '{a} {aj} avec {p}';
            else return '{a} {aj}';
          }
        }
      } else {
        if (r) {
          if (et) {
            if (p) return '{a} {r} {et} avec {p} ; rends {r} {et}';
            else return '{a} {r} {et} ; rends {r} {et}';
          } else {
            if (p) return '{a} {r} avec {p}';
            else return '{a} {r}';
          }
        } else {
          if (p) {
            if (et) return '{a} {p} {et} ; rends {p} {et}';
            else return '{a} {p}';
          } else {
            if (et) return '{a} {Ke} {et} ; rends {Ke} {et}';
            else return '{a} {Ke}';
          }
        }
      }
    }
  } else {
    if (p) {
      if (aj) {
        if (r) {
          if (et) {
            if (e) return '{aj} {et} sur {r} en {e} à la place de {p}';
            else return '{aj} {et} sur {r} à la place de {p}';
          } else {
            if (e) return '{aj} en {e} sur {r} à la place de {p}';
            else return '{aj} sur {r} à la place de {p}';
          }
        } else {
          if (et) {
            if (e) return '{aj} {et} en {e} sur {p}';
            else return '{aj} {et} sur {p}';
          } else {
            if (e) return '{aj} en {e} sur {p}';
            else return '{aj} sur {p}';
          }
        }
      } else {
        if (r) {
          if (et) {
            if (e) return '{r} {et} en {e} à la place de {p}';
            else return '{r} {et} à la place de {p}';
          } else {
            if (e) return '{r} en {e} à la place de {p}';
            else return '{r} à la place de {p}';
          }
        } else {
          if (et) {
            if (e) return '{p} {et} en {e}';
            else return '{p} {et}';
          } else {
            if (e) return '{p} en {e}';
            else return '{Kaj} sur {p}';
          }
        }
      }
    } else {
      if (e) {
        if (et) {
          if (aj) {
            if (r)
              return '{Ka} {e} avec {aj} {et} sur {r} à la place de {Kp} ; {aj} {et} sur {r} à la place de {Kp}';
            else return '{Ka} {e} avec {aj} {et} sur {Kp} ; {aj} {et} sur {Kp}';
          } else {
            if (r) return '{Ka} {e} avec {r} {et} à la place de {Kp} ; {r} {et} à la place de {Kp}';
            else return '{Ka} {e} {et} ; rends {e} {et}';
          }
        } else {
          if (aj) {
            if (r)
              return '{Ka} {e} avec {aj} sur {r} à la place de {Kp} ; {aj} sur {r} à la place de {Kp}';
            else return '{Ka} {e} avec {aj} sur {Kp} ; {aj} sur {Kp}';
          } else {
            if (r) return '{Ka} {e} avec {r} à la place de {Kp} ; {r} à la place de {Kp}';
            else return '{Ka} {e}';
          }
        }
      } else {
        if (aj) {
          if (et) {
            if (r) return '{aj} {et} sur {r} à la place de {Kp}';
            else return '{aj} {et} sur {Kp}';
          } else {
            if (r) return '{aj} sur {r} à la place de {Kp}';
            else return '{aj} sur {Kp}';
          }
        } else {
          if (r) {
            if (et) return '{r} {et} à la place de {Kp}';
            else return '{r} à la place de {Kp}';
          } else {
            if (et) return '{Kp} {et}';
            else return null;
          }
        }
      }
    }
  }
}

// Substitue les jetons des types **présents**. Les jetons {Ka}/{Ke}/{Kp}/{Kaj} restent littéraux.
function fillPresent(template: string, groups: SublistGroups): string {
  return template.replace(/\{(a|e|p|aj|r|et)\}/g, (_m, key: keyof SublistGroups) => {
    const v = groups[key];
    return v !== undefined ? v : `{${key}}`;
  });
}
