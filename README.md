# Groupe L — Site web

Site vitrine de **Groupe L**, cabinet de résolution de problèmes et
d'amélioration continue : fusions et acquisitions, définition de la
stratégie, implantation de systèmes, changement de structure. Des
résultats dans les 30 premiers jours.

## Structure

```
index.html     Page unique (héros, pour qui, le cabinet, 30 jours, services, résultats, contact)
styles.css     Feuille de style — tokens de couleur, panneaux clairs et sombres
script.js      Interactions légères (menu mobile, apparitions, compteurs)
assets/        Logo (blanc et bronze) et favicon
```

Aucune dépendance ni étape de build : ouvrir `index.html` dans un navigateur
ou servir le dossier avec n'importe quel serveur statique.

```bash
npx serve .
```

## Direction visuelle

- Fond blanc pur ; cartes gris clair (`--grey`) et noires en contraste
- Héros : navigation sobre, titre en deux lignes à graisse normale (Inter
  Tight), empennage noir coupé par le bord droit, bandeau de trois
  chiffres avec l'heure de Montréal en direct
- Énoncé en deux tons sur fond noir, encadré de deux bandeaux fins
- Pour qui : cartes empilées à titre en capitales et flèche ↗, visuel
  sombre à droite (déposer `assets/visuel.jpg` pour une photo)
- Le cabinet : duo de cartes gris clair / noire, pastilles de services,
  diagramme de cercles
- 30 jours : titre et paragraphe, trois cartes noires, ligne de chiffres
- Contact : deux panneaux, noir à gauche et formulaire à droite
- Chaque section occupe la fenêtre ; arrêt du défilement de section en
  section (souple sur téléphone)

Les couleurs vivent dans les variables `:root` de `styles.css`.

## Déploiement

Le site est publié avec GitHub Pages depuis la branche `main` (racine).
