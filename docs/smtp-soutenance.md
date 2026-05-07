# Configuration SMTP pour les confirmations RSVP

Ce site envoie les confirmations RSVP avec la Netlify Function `rsvp-soutenance` et `nodemailer`. Les identifiants SMTP ne doivent jamais être commités : ils doivent être définis dans les variables d'environnement Netlify avec le scope **Functions**.

## Variables à créer dans Netlify

Dans Netlify : **Project configuration** → **Environment variables** → **Add a variable**.

Créer les variables suivantes, avec le scope **Functions** :

| Variable | Exemple | Notes |
|---|---|---|
| `SMTP_HOST` | `smtp.example.com` | Serveur SMTP fourni par Polytechnique ou par le prestataire mail. |
| `SMTP_PORT` | `465` ou `587` | `465` utilise généralement TLS direct, `587` STARTTLS. |
| `SMTP_SECURE` | `true` pour 465, `false` pour 587 | Si vide, la Function considère `465` comme sécurisé. |
| `SMTP_USER` | `leo.denis@polytechnique.edu` | Identifiant SMTP. |
| `SMTP_PASS` | mot de passe ou app password | Secret SMTP. Ne pas le mettre dans le repo. |
| `SMTP_FROM` | `leo.denis@polytechnique.edu` | Optionnel si identique à la valeur par défaut. Doit rester en `@polytechnique.edu`. |

Après modification des variables, déclencher un nouveau deploy Netlify : **Deploys** → **Trigger deploy** → **Deploy site**.

## Fonctionnement attendu

1. Le visiteur soumet le formulaire sur `/soutenance/`.
2. Le navigateur appelle `/.netlify/functions/rsvp-soutenance`.
3. La Function valide prénom, nom et email.
4. La Function réserve l'email dans Netlify Blobs pour éviter un doublon simple.
5. `nodemailer` envoie l'email depuis `SMTP_FROM`.
6. L'email inclut les informations pratiques, le lien Zoom et une pièce jointe `.ics`.
7. Après succès, le navigateur enregistre aussi la réponse dans Netlify Forms.

## Test en production ou deploy preview

Ouvrir `/soutenance/` sur l'URL Netlify, puis soumettre un RSVP avec une adresse email contrôlée.

Résultat attendu :

- message de succès sur la page ;
- email reçu avec le sujet `Confirmation RSVP - Soutenance de thèse Léo Denis` ;
- pièce jointe `soutenance-leo-denis.ics` ;
- soumission visible dans l'onglet **Forms** de Netlify ;
- une seconde soumission avec le même email affiche un message de doublon et ne renvoie pas d'email.

## Dépannage

- `Le RSVP n'a pas pu être confirmé par email` : vérifier `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`.
- Aucun email reçu : vérifier les spams, puis les logs de la Function dans Netlify.
- `SMTP_FROM must be an @polytechnique.edu address` : corriger `SMTP_FROM`.
- La soumission n'apparaît pas dans Netlify Forms : vérifier que Form detection est activé dans Netlify, puis redéployer.
- Doublon bloqué à tort pendant les tests : l'anti-doublon utilise l'email normalisé dans Netlify Blobs. Tester avec une autre adresse ou supprimer l'entrée dans le store Netlify Blobs.
