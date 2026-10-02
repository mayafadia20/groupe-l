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

- Style « studio » monochrome : héros gris clair avec portrait central
  (déposer `assets/portrait.jpg`, noir et blanc ; sans photo, un fond
  sombre prend sa place), titre en capitales grasses (Inter Tight),
  étiquettes entre parenthèses, pastilles et boutons noirs avec flèche ↗
- Bandeau fin sous le héros, énoncé en deux tons sur fond noir, cartes
  « bento » à bord fin
- Panneaux gris clair et noirs en alternance ; icônes géométriques au
  trait ; anneau des services
- Chaque section occupe la fenêtre, le défilement s'arrête de section en
  section (arrêt souple sur téléphone)

Les couleurs vivent dans les variables `:root` de `styles.css`.

## Déploiement

Le site est publié avec GitHub Pages depuis la branche `main` (racine).
