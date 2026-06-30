# Plan — Migration GitHub Pages → Netlify + gate hard sur le rapport FundArchitecture

## Contexte

Le site académique Hugo est actuellement déployé via **GitHub Pages** (`.github/workflows/publish.yaml`), qui est un hébergement purement statique — aucune fonction serveur n'est possible. L'ancien gate sur le rapport `FundArchitecture` passait par un popup + Google Apps Script, setup fragile qui renvoie une page blanche après soumission (`gated-downloads.js` attend un `postMessage` jamais émis par l'Apps Script).

L'utilisateur veut un **vrai gate** (URL PDF non devinable, token signé, expiration) sans coût. Il a un nom de domaine personnel `www.leo-denis.eu` à repointer.

La solution technique (Netlify Functions + JWT + webhook Apps Script) a déjà été écrite dans le repo — voir section "État actuel du code". Il reste à **migrer l'hébergement vers Netlify** pour que ce code puisse s'exécuter, puis configurer le tout.

## Choix de l'utilisateur

- **Hébergement** : migration vers Netlify (plan gratuit).
- **Domaine** : `www.leo-denis.eu` à repointer vers Netlify.
- **GitHub Pages** : désactivé immédiatement après bascule validée.
- **Secrets** : gérés via l'interface web Netlify.
- **Logging Sheet** : Apps Script déployé manuellement par l'utilisateur.

## État actuel du code dans le repo

Déjà écrit et prêt à fonctionner dès qu'un hébergeur supportant les Functions prendra le relais :

- `netlify/functions/request-report.mjs` — valide le form, POST au webhook Sheet, émet un JWT (15 min), redirige vers la page de remerciement.
- `netlify/functions/download-report.mjs` — vérifie le JWT, stream le rapport complet PDF.
- `netlify/functions/_jwt.mjs` — helpers HMAC-SHA256 (sans dépendance).
- `netlify/functions/assets/Exec_Summary_{FR,EN}.pdf` — résumés exécutifs PDF conservés hors `static/`.
- `netlify/functions/assets/fund-architecture-report-{fr,en}.pdf` — rapports complets bundlés hors `static/` et servis par la fonction de téléchargement.
- `layouts/_default/report-access.html` — formulaire inline (Tailwind).
- `layouts/_default/report-thanks.html` + `content/fund-architecture-thanks/` — page de remerciement avec liens de téléchargement porteurs du token.
- `google-apps-script/NetlifyFormWebhook.gs` — webhook minimal pour Sheet.
- `netlify.toml` — bloc `[functions]` configuré avec `included_files` pour bundler les PDFs.

Aucune modification du code applicatif n'est nécessaire dans ce plan. Le travail qui reste est exclusivement **infrastructure et configuration**.

## Étapes de migration

### 1. Création du compte et du site Netlify

1. Aller sur https://app.netlify.com, cliquer **Sign up**, choisir **GitHub** (OAuth).
2. Autoriser Netlify à lire les repos.
3. Dashboard → **Add new site** → **Import from Git** → GitHub → sélectionner `LSD-98/lsd-98.github.io`.
4. Netlify détecte `netlify.toml` automatiquement. Build command et publish directory pré-remplis. Cliquer **Deploy**.
5. Le premier build prend ~2-3 min. Une URL provisoire type `https://random-name-12345.netlify.app` est générée.

### 2. Renommer le site (optionnel mais propre)

1. Dashboard du site → **Site configuration** → **General** → **Site details** → **Change site name**.
2. Choisir `leo-denis` (ou équivalent) → URL devient `https://leo-denis.netlify.app`.

### 3. Configuration des variables d'environnement

Dashboard du site → **Site configuration** → **Environment variables** → **Add a variable** (répéter pour chaque) :

| Key | Value | Scopes |
|---|---|---|
| `JWT_SECRET` | sortie de `openssl rand -hex 32` (64 caractères hex aléatoires) | All scopes |
| `SHEETS_WEBHOOK_URL` | URL obtenue à l'étape 5 (Apps Script) | All scopes |

Cocher "Same value for all deploy contexts". **Ne jamais commiter ces valeurs dans le repo.**

### 4. Configuration du domaine `www.leo-denis.eu`

1. Dashboard → **Domain management** → **Add a domain** → entrer `www.leo-denis.eu`.
2. Netlify fournit l'enregistrement DNS à ajouter chez le registrar (OVH, Gandi, etc.).
3. Options DNS :
   - **CNAME** sur `www` → `leo-denis.netlify.app` (simple, recommandé).
   - Pour `leo-denis.eu` (apex), soit un enregistrement ALIAS/ANAME si le registrar le supporte, soit les 4 enregistrements A de Netlify (75.2.60.5 etc. — valeurs exactes données par Netlify au moment de la config).
4. Propagation DNS : 5 min à quelques heures.
5. Netlify provisionne automatiquement un certificat Let's Encrypt (HTTPS) une fois le DNS propagé.
6. Activer **Force HTTPS** dans Domain management.

### 5. Déploiement de l'Apps Script webhook

1. Ouvrir la Google Sheet existante (`1mq7NBLO2Yx12ELAXVicKQysRHbtmfVbXpYxr6ZSATNQ`).
2. **Extensions** → **Apps Script**. Dans l'éditeur, supprimer le contenu par défaut.
3. Copier-coller le contenu de `google-apps-script/NetlifyFormWebhook.gs`.
4. Cliquer **Deploy** (en haut à droite) → **New deployment** → icône engrenage → **Web app**.
5. Paramètres : **Execute as: Me**, **Who has access: Anyone** → **Deploy**.
6. Autoriser l'accès au Sheet (premier run seulement, Google demande confirmation).
7. Copier l'URL fournie (format `https://script.google.com/macros/s/AKfyc.../exec`).
8. Retourner à l'étape 3 du plan, coller cette URL dans la var `SHEETS_WEBHOOK_URL` sur Netlify.
9. Redéployer le site Netlify pour que la nouvelle var soit prise en compte : **Deploys** → **Trigger deploy** → **Deploy site**.

### 6. Désactivation de GitHub Pages

Une fois Netlify confirmé fonctionnel sur `www.leo-denis.eu` (test bout en bout, étape 7) :

1. GitHub repo → **Settings** → **Pages** → **Source** → **None** → Save.
2. Supprimer (ou désactiver) `.github/workflows/publish.yaml` pour couper les builds inutiles :
   - Option propre : supprimer le fichier et commit.
   - Option conservatrice : le renommer en `publish.yaml.disabled` (plus facile à réactiver en cas de pépin).

## Fichiers du repo à modifier pour cette migration

- `.github/workflows/publish.yaml` — supprimer ou renommer en `.disabled` après validation de Netlify.

Aucun autre changement de code. Tout le reste (functions, layouts, contenu) est déjà en place.

## Vérification end-to-end

Étapes à exécuter dans l'ordre après que la DNS a propagé :

1. Ouvrir `https://www.leo-denis.eu/` → le site s'affiche identique à la version GitHub Pages.
2. Ouvrir `https://www.leo-denis.eu/fund-architecture-report-access/` → le formulaire s'affiche avec les styles Tailwind corrects.
3. Soumettre le formulaire avec des données de test :
   - Attendre la redirection vers `/fund-architecture-thanks/?token=...`.
   - Cliquer sur le bouton English → le rapport complet PDF se télécharge, s'ouvre dans un lecteur.
   - Recharger la page thanks, cliquer sur Français → même résultat.
4. Ouvrir la Google Sheet → une nouvelle ligne contient les données de test.
5. Tester le gate :
   - `curl -I https://www.leo-denis.eu/files/fund-architecture-report-fr.pdf` → **404** (PDF absent de `static/`).
   - `curl -I https://www.leo-denis.eu/.netlify/functions/download-report?lang=fr` → **401** (pas de token).
   - Copier un token valide, attendre 16 min, recliquer → **401** (token expiré).
6. Tester le honeypot : ouvrir devtools, remplir `bot-field` avec une valeur, soumettre → la function retourne un 302 vers thanks mais sans logger dans la Sheet (comportement attendu côté `request-report.mjs`).
7. Vérifier que l'ancien site GH Pages ne capte plus le trafic (`lsd-98.github.io` répond 404 une fois GH Pages désactivé).
8. Faire un `git push` de test (un changement mineur dans un fichier markdown) pour confirmer que Netlify déclenche bien un rebuild et que la modification apparaît sur `www.leo-denis.eu` sous 2 min.

## Risques et points d'attention

- **Propagation DNS** : si le TTL actuel du domaine est élevé, la bascule peut prendre plusieurs heures. Prévoir une fenêtre de tolérance.
- **Certificat HTTPS** : Netlify le provisionne automatiquement, mais seulement après que le DNS pointe correctement. Attendre la validation avant de tester.
- **Quota Netlify Free** : 100 Go bande passante/mois, 125 000 invocations functions/mois, 300 min de build/mois. Largement au-delà d'un usage académique normal.
- **Fichier `publish.yaml`** recommandé en renommage plutôt qu'en suppression les premiers jours, pour pouvoir revenir en arrière rapidement.
