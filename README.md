[![Build Status](https://travis-ci.org/DeveloperLaPoste/okapi-cli.png?branch=master)](https://travis-ci.org/DeveloperLaPoste/okapi-cli)
[![npm](https://img.shields.io/npm/l/express.svg?style=flat-square)]()

<div>
  <a href="https://developer.laposte.fr">
    <img style="display: inline-block" title="Okapi" src="https://github.com/DeveloperLaPoste/okapi-sdk-js/raw/master/assets/img/okapi-logo-200.png">
  </a>
  <a href="https://fr.wikipedia.org/wiki/JavaScript">
    <img style="display: inline-block" title="JavaScript" src="http://i.stack.imgur.com/Mmww2.png"> 
  </a>
  <a href="https://www.laposte.fr/">
    <img style="display: inline-block" title="La Poste" src="https://logorigine.files.wordpress.com/2011/10/logo-la-poste.jpg" height="200"> 
  </a>
</div>

# Le client Okapi en ligne de commande

Ce client en ligne de commande facilite la consommation des [Open APIs de La Poste](https://developer.laposte.fr/), via la plateforme Okapi :

![Developer La Poste](https://github.com/DeveloperLaPoste/okapi-sdk-js/raw/master/assets/img/developer-laposte-fr-screenshot.png)

Pour consommer des APIs de La Poste, vous devez au préalable :
- [Créer votre compte](https://developer.laposte.fr/inscription/)
- Créer une application et noter la clé d'app générée, à utiliser comme appKey dans le SDK
- Souscrire à une API du [store](https://developer.laposte.fr/produit/)

## Installation

```
$ npm install laposte-okapi-cli -g
```

## Utilisation

Obtenir le suivi du colis 1111111111111 :

```
$ oka get suivi/v1/1111111111111 -k 'mon_app_key'
```

Résultat :

```javascript
{
    "code": "1111111111111",
    "date": "25/06/2016",
    "link": "http://www.chronopost.fr/expedier/inputLTNumbersNoJahia.do?lang=fr_FR&listeNumeros=1111111111111",
    "message": "Echec de livraison, en attente d'instructions pour nouvelle livraison",
    "status": "INCONNU",
    "type": "Chronopost"
}
```

Exemple de requête POST sur une API (myapi) avec un payload, le switch --tocurl retourne l'équivalent cURL (la requête n'est pas exécutée) :

```
$ oka post myapi/v1/resource -d 'firstName : "John"' -k 'mon_app_key' --tocurl
```

Commande cURL équivalente :

```
curl -ki -X GET "http://api.recette.okapi.laposte.io//myapi/v1/resource" \
	-H "Content-Type: application/x-www-form-urlencoded" \
	-H "X-Okapi-Key: mon_app_key" \
	-d "firstName="John""
```

## Détails

Toutes les options qui prennent un argument si elles sont appellées sans argument affiche leur valeur:

```
$ oka --env
[ ] production
[ ] preprod
[o] recette
[ ] development
[ ] vm
[ ] local
```

```
$ oka --baseUrl
https://api.laposte.fr
```

## Pour de détails voir l'aide:

```
$ oka -h
Usage: oka [method] uri [options]

Options:
  --env, -e          get/set okapi env                                                             [chaine de caractère]
  --baseurl, -u      get/set okapi base URL                                                        [chaine de caractère]
  --key, -k          get/set okapi application key                                                 [chaine de caractère]
  --save, -s         save settings: application key, baseUrl, ignoreSSL                                        [booléen]
  --data, -d         set request JSON payload, accept : direct data or file                        [chaine de caractère]
  --query, -q        set request query string params (format : key=value&...)                      [chaine de caractère]
  --headers, -H      extra request header                                                          [chaine de caractère]
  --yaml, -Y         display result in pretty YAML format                                                      [booléen]
  --status, -t       display status code                                                                       [booléen]
  --showheaders, -h  display status code                                                                       [booléen]
  --version, -v      show version                                                                              [booléen]
  --reset, -R        reset settings to default                                                                 [booléen]
  --ignoressl, -I    ignore SSL certificate error                                                              [booléen]

Exemples:
  oka post niceapi/v1/niceresource -d 'foo:"bar"'

for more information, contact developer@laposte.io

```
