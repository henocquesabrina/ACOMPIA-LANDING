#!/usr/bin/env python3
"""Intègre le design de novembre 2026 dans le site. Rejouable.

Usage : python3 tools/integrer-site-2026-11.py <dossier des maquettes « propositions »>

Le script ne touche ni aux adresses, ni aux <title>, ni aux textes des pages
existantes (hors renvois vers le prédiagnostic, retiré). Il :
  1. extrait le style et le script de l'accueil dans css/ et js/ ;
  2. remplace le corps de /, /outils/ et /offres/ en gardant leur en-tête de référencement ;
  3. pose le nouvel en-tête et le nouveau pied de page sur toutes les autres pages ;
  4. transforme le prédiagnostic en redirection et réoriente ses liens par sujet ;
  5. ajoute les appels à la démo (matrice, simulateur, deux articles).
"""
import glob
import html
import json
import os
import re
import shutil
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
V = '2026-11-11'
CAL = 'https://calendly.com/she-acompia/30min'
MATRICE = '/outils/matrice-controle-rgdu/'
SIMU = '/outils/simulateur-avantage-en-nature-vehicule/'
MARQUE = '<!-- s26 -->'


def lire(chemin):
    with open(chemin, encoding='utf-8') as f:
        return f.read()


def ecrire(chemin, texte):
    os.makedirs(os.path.dirname(chemin) or '.', exist_ok=True)
    with open(chemin, 'w', encoding='utf-8') as f:
        f.write(texte)


def R(rel):
    return os.path.join(RACINE, rel)


# ---------------------------------------------------------------- chemins
def chemins_absolus(texte):
    """Ramène les chemins des maquettes aux chemins du site."""
    rempl = [
        (r'(?:\.\./)+commun/fonts/', '/assets/fonts/'),
        (r'(?:\.\./)+commun/dash_reel\.png', '/assets/site-2026-11/dash_reel.png'),
        (r'(?:\.\./)+commun/icones\.svg', '/assets/site-2026-11/icones.svg'),
        (r'(?:\.\./)+commun/acompia-logo-ruban\.png', '/assets/acompia-logo-ruban.png'),
        (r'(?:\.\./)+commun/sabrina-portrait\.jpg', '/assets/images/sabrina-portrait.jpg'),
        (r'href="(?:\.\./)?index\.html#', 'href="/#'),
        (r'href="(?:\.\./)?index\.html"', 'href="/"'),
        (r'href="(?:\.\./)?offres/index\.html', 'href="/offres/'),
        (r'href="(?:\.\./)?outils/index\.html', 'href="/outils/'),
        (r'href="https://www\.acompia\.com/(outils|ressources|offres|equipe)/', r'href="/\1/'),
        (r'<a href="https://www\.acompia\.com">Mentions légales</a>',
         '<a href="/mentions-legales.html">Mentions légales</a><a href="/politique-confidentialite.html">Confidentialité</a>'),
    ]
    for motif, par in rempl:
        texte = re.sub(motif, par, texte)
    return texte


MESURE_DOUBLON = re.compile(
    r"\s*d\.querySelectorAll\('\[data-cta\]'\)\.forEach\(function\(a\)\{a\.addEventListener\('click',function\(\)\{cap\('cta_clique',\{place:a\.getAttribute\('data-cta'\)\}\)\}\)\}\);"
    r"\s*var seen=\{\};\s*window\.addEventListener\('scroll',function\(\)\{.*?\},\{passive:true\}\);", re.S)


def sans_mesure_en_double(js):
    """js/socle.js émet déjà cta_clique et scroll_atteint sur tout le site."""
    js2, n = MESURE_DOUBLON.subn('\n  /* cta_clique et scroll_atteint : émis par js/socle.js */', js)
    return js2


# ---------------------------------------------------------------- données structurées
def maj_jsonld(tete, corps, retirer_prediag=True, faq=True):
    def traiter(m):
        brut = m.group(1)
        try:
            data = json.loads(brut)
        except Exception:
            return m.group(0)
        change = [False]

        def marche(n):
            if isinstance(n, dict):
                if retirer_prediag and isinstance(n.get('itemListElement'), list):
                    avant = len(n['itemListElement'])
                    n['itemListElement'] = [e for e in n['itemListElement']
                                            if 'prédiagnostic' not in json.dumps(e, ensure_ascii=False).lower() and 'prediagnostic' not in json.dumps(e, ensure_ascii=False).lower()]
                    if len(n['itemListElement']) != avant:
                        change[0] = True
                        for i, e in enumerate(n['itemListElement'], 1):
                            if isinstance(e, dict) and 'position' in e:
                                e['position'] = i
                if faq and n.get('@type') == 'FAQPage':
                    qr = re.findall(r'<details[^>]*>\s*<summary[^>]*>(.*?)</summary>\s*(?:<div[^>]*>)?\s*<p[^>]*>(.*?)</p>', corps, re.S)
                    if qr:
                        net = lambda t: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t))).replace(' ', ' ').strip()
                        n['mainEntity'] = [{'@type': 'Question', 'name': net(q),
                                            'acceptedAnswer': {'@type': 'Answer', 'text': net(r)}} for q, r in qr]
                        change[0] = True
                for v in n.values():
                    marche(v)
            elif isinstance(n, list):
                for v in n:
                    marche(v)
        marche(data)
        if not change[0]:
            return m.group(0)
        return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n  </script>'
    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', traiter, tete, flags=re.S)


def tete_referencement(page_actuelle, feuilles):
    """Garde l'en-tête actuel (titre, description, OG, JSON-LD, mesure) et remplace les feuilles de style."""
    tete = page_actuelle.split('</head>')[0]
    tete = re.sub(r'\s*<link rel="stylesheet"[^>]*>', '', tete)
    liens = ''.join(f'\n<link rel="stylesheet" href="{f}?v={V}">' for f in feuilles)
    return tete.rstrip() + liens + '\n</head>\n'


# ---------------------------------------------------------------- 1 à 3 : pages neuves
def pages_neuves():
    assert SRC, 'chemin des maquettes requis'
    os.makedirs(R('assets/site-2026-11'), exist_ok=True)
    for f in ('icones.svg', 'dash_reel.png'):
        shutil.copyfile(os.path.join(SRC, 'commun', f), R('assets/site-2026-11/' + f))

    def parts(rel):
        s = lire(os.path.join(SRC, 'site', rel))
        style = re.search(r'<style>\n?(.*?)</style>', s, re.S).group(1)
        corps = s.split('<body>', 1)[1].rsplit('</body>', 1)[0]
        return style, corps

    # --- accueil
    style_h, corps_h = parts('index.html')
    ecrire(R('css/site-2026-11.css'), '/* ACOMPIA · socle du site, novembre 2026 (généré par tools/integrer-site-2026-11.py) */\n' + chemins_absolus(style_h).strip() + '\n')
    scripts = list(re.finditer(r'<script>(.*?)</script>', corps_h, re.S))
    principal = scripts[-1]
    ecrire(R('js/site-2026-11.js'), '/* ACOMPIA · accueil, novembre 2026 (généré par tools/integrer-site-2026-11.py) */\n' + sans_mesure_en_double(principal.group(1)).strip() + '\n')
    corps_h = corps_h[:principal.start()] + corps_h[principal.end():]
    corps_h = chemins_absolus(corps_h)
    # ancres historiques des campagnes
    corps_h = corps_h.replace('<section class="final" id="demo">', '<span id="prediag"></span><span id="devis"></span>\n<section class="final" id="demo">', 1)
    corps_h = corps_h.replace('<section id="equipe"', '<span id="team"></span>\n<section id="equipe"', 1)
    corps_h = corps_h.replace('<section class="o2" id="gains">', '<span id="suivi"></span>\n<section class="o2" id="gains">', 1)
    actuelle = lire(R('index.html')) if MARQUE not in lire(R('index.html')) else None
    if actuelle is None:
        actuelle = lire(R('index.html'))
    tete = tete_referencement(actuelle, ['/css/site-2026-11.css'])
    tete = maj_jsonld(tete, corps_h)
    ecrire(R('index.html'), tete + '<body>' + MARQUE + corps_h.rstrip() +
           f'\n<script src="/js/config.js" defer></script>\n<script src="/js/socle.js" defer></script>\n<script src="/js/site-2026-11.js?v={V}" defer></script>\n</body>\n</html>\n')

    # --- outils et offres
    for rel, nom in (('outils/index.html', 'outils'), ('offres/index.html', 'offres')):
        style, corps = parts(rel)
        a, b = style_h.strip(), style.replace('../../commun/', '../commun/').strip()
        extra = b[len(a):] if b.startswith(a) else b
        feuilles = ['/css/site-2026-11.css'] if b.startswith(a) else []
        ecrire(R(f'css/site-2026-11-{nom}.css'), f'/* ACOMPIA · page {nom}, novembre 2026 (généré) */\n' + chemins_absolus(extra.replace('../commun/', '../../commun/')).strip() + '\n')
        feuilles.append(f'/css/site-2026-11-{nom}.css')
        corps = chemins_absolus(corps)
        corps = re.sub(r'<script>(.*?)</script>', lambda m: '<script>' + sans_mesure_en_double(m.group(1)) + '</script>', corps, flags=re.S)
        # scripts réels du site : chargés une seule fois, dans l'ordre
        corps = re.sub(r'\s*<script src="/js/(?:config|socle)\.js"[^>]*></script>', '', corps)
        devis = bool(re.search(r'<script src="/js/accueil/devis\.js', corps))
        corps = re.sub(r'\s*<script src="/js/accueil/devis\.js[^"]*"[^>]*></script>', '', corps)
        actuelle = lire(R(rel))
        tete = tete_referencement(actuelle, feuilles)
        if nom == 'outils':
            tete = tete.replace('Outils gratuits : prédiagnostic URSSAF et simulateur AEN · ACOMPIA', 'Outils gratuits : matrice de contrôle RGDU et simulateur AEN · ACOMPIA')
            tete = tete.replace('Outils gratuits URSSAF : prédiagnostic et simulateur AEN véhicule · ACOMPIA', 'Outils gratuits URSSAF : matrice RGDU et simulateur AEN véhicule · ACOMPIA')
            tete = tete.replace("Des outils gratuits et sans inscription : prédiagnostic d'exposition URSSAF en 3 minutes, simulateur d'avantage en nature véhicule au barème 2026 et matrice de contrôle RGDU (Excel).",
                                "Des outils gratuits et sans inscription : matrice de contrôle RGDU (Excel) et simulateur d'avantage en nature véhicule au barème 2026.")
        tete = maj_jsonld(tete, corps, faq=(nom == 'offres'))
        ecrire(R(rel), tete + '<body>' + MARQUE + corps.rstrip() +
               '\n<script src="/js/config.js" defer></script>\n<script src="/js/socle.js" defer></script>\n'
               + ('<script src="/js/accueil/devis.js?v=2026-10-16" defer></script>\n' if devis else '') + '</body>\n</html>\n')


# ---------------------------------------------------------------- 4 : en-tête et pied de page
ENTETE = f'''<header class="s26-hd" id="s26-hd">{MARQUE}
  <div class="s26-in">
    <a class="s26-logo" href="/" aria-label="ACOMPIA, accueil"><img src="/assets/acompia-logo-ruban.png" alt="ACOMPIA" width="133" height="34"></a>
    <nav class="s26-nav" aria-label="Navigation principale">
      <a href="/#gains">La solution</a>
      <a href="/offres/">Offres</a>
      <div class="s26-dd"><button type="button" aria-haspopup="true">Outils <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="s26-dd-menu">
          <a href="{MATRICE}"><b>Matrice de contrôle RGDU</b><span>Le classeur de contrôle, à télécharger</span></a>
          <a href="{SIMU}"><b>Simulateur avantage en nature véhicule</b><span>Le bon montant, en quelques questions</span></a>
          <a href="/outils/pilotage-flotte-tarifs/"><b>Pilotage de flotte</b><span>Le suivi des véhicules, un par un</span></a>
          <a class="s26-dd-all" href="/outils/">Tous les outils →</a>
        </div>
      </div>
      <a href="/ressources/">Ressources</a>
    </nav>
    <a class="s26-btn s26-btn--sm" href="{CAL}" target="_blank" rel="noopener">Demander une démo</a>
    <details class="s26-m"><summary aria-label="Ouvrir le menu"><i></i><i></i><i></i></summary>
      <div class="s26-m-menu">
        <a href="/#gains">La solution</a><a href="/offres/">Offres</a>
        <a href="{MATRICE}">Matrice de contrôle RGDU</a><a href="{SIMU}">Simulateur avantage en nature véhicule</a>
        <a href="/outils/">Tous les outils</a><a href="/ressources/">Ressources</a>
      </div>
    </details>
  </div>
</header>'''

PIED = f'''<footer class="s26-ft">{MARQUE}
  <div class="s26-in">
    <a href="/" aria-label="ACOMPIA, accueil"><img src="/assets/acompia-logo-ruban.png" alt="ACOMPIA" width="102" height="26"></a>
    <span>ComplyDB SAS</span><span>25 rue de Ponthieu, 75008 Paris</span>
    <a href="mailto:she@acompia.com">she@acompia.com</a>
    <a href="/mentions-legales.html">Mentions légales</a>
    <a href="/politique-confidentialite.html">Confidentialité</a>
  </div>
</footer>
<div class="s26-sticky" id="s26-sticky"><a class="s26-btn" href="{CAL}" target="_blank" rel="noopener">Demander une démo</a></div>'''

PAGES_NEUVES = {'index.html', 'outils/index.html', 'offres/index.html'}
REDIRECTIONS = {'prediagnostic/index.html', 'outils/prediagnostic-urssaf/index.html'}


def pages_existantes():
    return sorted(f for f in [os.path.relpath(x, RACINE) for x in glob.glob(os.path.join(RACINE, '**', '*.html'), recursive=True)]
                  if f not in PAGES_NEUVES and f not in REDIRECTIONS
                  and not f.startswith(('tools/', 'node_modules/', 'docs/', 'outils/comparateur-rgdu-mensuel/', 'outils/delai-remboursement-cotisations/')))


def habiller(s):
    n = 0
    s, k = re.subn(r'<header id="hd" class="current-navbar">.*?</header>|<header class="s26-hd" id="s26-hd">.*?</header>', lambda m: ENTETE, s, count=1, flags=re.S)
    n += k
    s, k = re.subn(r'<footer class="wrap">.*?</footer>|<footer class="s26-ft">.*?</footer>\s*<div class="s26-sticky" id="s26-sticky">.*?</div>', lambda m: PIED, s, count=1, flags=re.S)
    n += k
    s = re.sub(r'\s*<script src="/js/accueil/navbar\.js"[^>]*></script>', '', s)
    if 'site-2026-11-entete.css' not in s:
        s = s.replace('</head>', f'<link rel="stylesheet" href="/css/site-2026-11-entete.css?v={V}">\n</head>', 1)
    if 'site-2026-11-entete.js' not in s:
        s = s.replace('</body>', f'<script src="/js/site-2026-11-entete.js?v={V}" defer></script>\n</body>', 1)
    return s, n


# ---------------------------------------------------------------- 5 : prédiagnostic
SUJET = {
    'ressources/reduction-generale-cotisations-patronales/index.html': 'rgdu',
    'ressources/rgdu-cas-particuliers-calcul/index.html': 'rgdu',
    'ressources/aen-vehicule-urssaf/index.html': 'vehicule',
    'ressources/avantage-nature-vehicule-electrique-urssaf/index.html': 'vehicule',
    'ressources/flotte-automobile-controle-urssaf/index.html': 'vehicule',
    'offres/gestion-de-flotte/index.html': 'vehicule',
}
BLOC = {
    'rgdu': ('Matrice de contrôle RGDU', 'Un classeur gratuit pour rejouer le calcul de la réduction générale et le comparer à votre paie.', 'Ouvrir la matrice', MATRICE),
    'vehicule': ('Simulateur avantage en nature véhicule', "Le montant de l'avantage en nature au barème 2026, en quelques questions.", 'Ouvrir le simulateur', SIMU),
    'autre': ('Les outils gratuits ACOMPIA', "La matrice de contrôle RGDU et le simulateur avantage en nature véhicule, sans inscription.", 'Voir les outils', '/outils/'),
}
PHRASE = {
    'rgdu': f'Rejouez le calcul de la réduction générale avec la <a href="{MATRICE}">matrice de contrôle RGDU</a>, un classeur gratuit à télécharger.',
    'vehicule': f"Vérifiez le montant de l'avantage en nature avec le <a href=\"{SIMU}\">simulateur avantage en nature véhicule</a>, gratuit et sans inscription.",
    'autre': 'Pour vérifier un calcul, la matrice de contrôle RGDU et le simulateur avantage en nature véhicule sont dans les <a href="/outils/">outils gratuits ACOMPIA</a>.',
}
LIEN_PREDIAG = r'href="(?:https://www\.acompia\.com)?/outils/prediagnostic-urssaf/[^"]*"'


def reorienter(rel, s):
    sujet = SUJET.get(rel, 'autre')
    compte = {'rgdu': 0, 'vehicule': 0, 'autre': 0}

    def note(k=sujet):
        compte[k] += 1

    # blocs de fin d'article
    def bloc(m):
        if not re.search(LIEN_PREDIAG, m.group(0)):
            return m.group(0)
        if rel == 'outils/matrice-controle-rgdu/index.html':
            note('autre')
            return ('<div class="article-cta-block">\n          <h4>Aller plus loin qu\'un classeur</h4>\n          <p>ACOMPIA relit toute la paie chaque mois, montre où regarder et prépare la correction.</p>\n'
                    f'          <a href="{CAL}" target="_blank" rel="noopener" class="btn btn-b article-cta-btn">Demander une démo</a>\n        </div>')
        t, p, b, h = BLOC[sujet]
        note()
        return (f'<div class="article-cta-block">\n          <h4>{t}</h4>\n          <p>{p}</p>\n'
                f'          <a href="{h}" class="article-cta-btn article-cta-btn--accent">{b}</a>\n        </div>')
    s = re.sub(r'<div class="article-cta-block">(?:(?!<div class="article-cta-block">).)*?</div>', bloc, s, flags=re.S)

    # encadrés « Outil gratuit »
    def encadre_div(m):
        if not re.search(LIEN_PREDIAG, m.group(0)):
            return m.group(0)
        note()
        return m.group(1) + '<p>' + PHRASE[sujet] + '</p>' + m.group(3)
    s = re.sub(r'(<div class="callout-outil">\s*<div class="callout-outil-label">[^<]*</div>\s*)<p>(.*?)</p>(\s*</div>)', encadre_div, s, flags=re.S)

    def encadre_p(m):
        if not re.search(LIEN_PREDIAG, m.group(0)):
            return m.group(0)
        note()
        return '<p class="callout-outil">' + (m.group(1) or '') + PHRASE[sujet] + '</p>'
    s = re.sub(r'<p class="callout-outil">(<strong>[^<]*</strong>\s*)?(?:(?!</p>).)*?</p>', encadre_p, s, flags=re.S)

    # cas particuliers
    cas = [
        (r'<a class="btn btn-b" href="/outils/prediagnostic-urssaf/">Prédiagnostic gratuit</a>', '<a class="btn btn-b" href="/outils/">Outils gratuits</a>', 'autre'),
        (r'<a href="/outils/prediagnostic-urssaf/" data-cta="prediag-autodiag">lancer le prédiagnostic gratuit</a>', '<a href="/outils/" data-cta="outils-autodiag">voir les outils gratuits</a>', 'autre'),
        (r'Le <a href="/outils/prediagnostic-urssaf/">pr&eacute;diagnostic URSSAF gratuit</a> couvre ce point parmi ses neuf blocs th&eacute;matiques, en trois minutes\.',
         f'Le <a href="{SIMU}">simulateur avantage en nature v&eacute;hicule</a> calcule le montant &agrave; retenir, en quelques questions.', 'vehicule'),
        (r"Pour aller plus loin, le <a href=\"/outils/prediagnostic-urssaf/\">prédiagnostic ACOMPIA</a> permet d'évaluer en trois minutes l'exposition de votre entreprise sur les huit thèmes URSSAF les plus contrôlés en 2026\.",
         'Pour aller plus loin, les <a href="/outils/">outils gratuits ACOMPIA</a> permettent de vérifier un calcul de réduction générale ou d\'avantage en nature véhicule.', 'autre'),
        (r'Vous pouvez aussi commencer par le <a href="/outils/prediagnostic-urssaf/">prédiagnostic gratuit</a>\.', 'Vous pouvez aussi consulter les <a href="/outils/">outils gratuits</a>.', 'autre'),
        (r'Faites d\'abord le prédiagnostic URSSAF gratuit', 'Deux outils gratuits pour vérifier un calcul', None),
        (r'Trois minutes, aucune donnée de paie à transmettre, un premier niveau de risque thème par thème pour savoir quel parcours ouvrir en premier\.',
         'La matrice de contrôle RGDU et le simulateur avantage en nature véhicule, sans inscription.', None),
        (r'<a class="hubC-banner-cta" href="/outils/prediagnostic-urssaf/">Lancer le prédiagnostic ', '<a class="hubC-banner-cta" href="/outils/">Voir les outils ', 'autre'),
    ]
    for motif, par, k in cas:
        s, n = re.subn(motif, lambda m: par, s)
        if n and k:
            compte[k] += n
    # tout lien restant : vers la boîte à outils
    restants = len(re.findall(LIEN_PREDIAG, s))
    if restants:
        s = re.sub(LIEN_PREDIAG, 'href="/outils/"', s)
        compte['autre'] += restants
    return s, compte


def mentions_prediag(s):
    """Retire les renvois de texte vers le prédiagnostic, sans toucher au fond des articles."""
    # puces « à retenir » : la phrase qui renvoie au prédiagnostic disparaît, la puce aussi si elle était seule
    def puce(m):
        corps = m.group(1)
        if not re.search(r'pr(?:é|&eacute;)diagnostic', corps, re.I):
            return m.group(0)
        corps2 = re.sub(r'\s*Pour [^.<]*?(?:<strong>)?pr(?:é|&eacute;)diagnostic gratuit(?:</strong>)?[^.]*\.', '', corps, flags=re.I).strip()
        return '' if not corps2 or corps2 == corps.strip() and False else ('<li>' + corps2 + '</li>' if corps2 else '')
    s = re.sub(r'<li>((?:(?!</?li>).)*?)</li>', puce, s, flags=re.S)
    for motif, par in [
        (r"\s*Le <strong>prédiagnostic</strong> ci-dessous en est le point d'entrée\.", ''),
        (r"\s*Les <strong>huit zones</strong> de cet article correspondent aux huit thèmes du <strong>prédiagnostic</strong> ci-dessous, qui est le moyen le plus rapide de commencer votre auto-évaluation\.", ''),
        (r", et c'est exactement ce que le prédiagnostic ci-dessous permet d'évaluer en quelques minutes\.", '.'),
    ]:
        s = re.sub(motif, par, s)
    return s


def page_redirection(titre):
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{titre}</title>
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="https://www.acompia.com/outils/">
  <meta http-equiv="refresh" content="0; url=/outils/">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <script>location.replace('/outils/' + location.search);</script>
</head>
<body>{MARQUE}
  <p style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 24px">Le prédiagnostic a laissé la place aux outils gratuits ACOMPIA. <a href="/outils/">Voir les outils</a>.</p>
</body>
</html>
'''


# ---------------------------------------------------------------- 6 et 7 : appels à la démo
def bandeau_demo(titre, texte, lieu, lien_plus=''):
    return (f'<aside class="s26-demo" id="s26-demo-{lieu}">{MARQUE}\n  <div>\n    <p class="s26-demo-k">Pour aller plus loin</p>\n    <h2 class="s26-demo-t">{titre}</h2>\n    <p class="s26-demo-p">{texte}</p>\n  </div>\n'
            f'  <div class="s26-demo-a"><a class="s26-btn" href="{CAL}" target="_blank" rel="noopener">Demander une démo</a>{lien_plus}<span>Une vingtaine de minutes, sur un cas concret.</span></div>\n</aside>')


def appels_demo(rel, s):
    if f'id="s26-demo-' in s or 'class="s26-suite"' in s:
        return s
    if rel == 'outils/matrice-controle-rgdu/index.html':
        b = bandeau_demo('Vous voulez contrôler toute votre paie, chaque mois ?',
                         'La matrice rejoue un calcul à la fois. ACOMPIA relit toute la paie, montre où regarder et prépare la correction.',
                         'matrice', '<a class="s26-lien" href="/ressources/rgdu-cas-particuliers-calcul/">Lire le guide RGDU des cas particuliers →</a>')
        # sous le bouton de téléchargement : premier lien vers le classeur
        m = re.search(r'<a\b[^>]*href="[^"]*matrice-controle-rgdu-2026\.xlsx"[^>]*>.*?</a>', s, re.S)
        if m:
            fin = s.find('</div>', m.end())
            fin = fin + len('</div>') if fin > -1 else m.end()
            s = s[:fin] + '\n' + b.replace('class="s26-demo"', 'class="s26-demo s26-demo--col"') + '\n' + s[fin:]
        else:
            s = s.replace('</main>', b + '\n</main>', 1)
    elif rel == 'outils/simulateur-avantage-en-nature-vehicule/index.html':
        b = bandeau_demo('Toute votre flotte, toute votre paie, chaque mois ?',
                         'Le simulateur calcule un véhicule à la fois. ACOMPIA relit toute la paie, montre où regarder et prépare la correction.', 'simulateur')
        s = s.replace('</main>', b + '\n</main>', 1)
    elif rel in ('ressources/recuperer-trop-paye-cotisations-urssaf/index.html', 'ressources/aen-vehicule-urssaf/index.html'):
        b = bandeau_demo('Vous voulez contrôler toute votre paie, chaque mois ?',
                         'ACOMPIA relit toute la paie, montre où regarder et prépare la correction. Votre équipe valide.', 'article')
        s = s.replace('</main>', b + '\n</main>', 1)
        if 'aen-vehicule' in rel:
            suite = (f'<p class="s26-suite"><a href="{SIMU}"><b>Simulateur avantage en nature véhicule</b>'
                     '<span>Calculez le montant de votre véhicule au barème 2026, gratuitement.</span><i aria-hidden="true">→</i></a></p>')
            m = re.search(r'</h1>', s)
            if m:
                # après le chapô s'il existe, sinon juste après le titre
                p = re.compile(r'</p>').search(s, m.end())
                pos = p.end() if p and p.start() - m.end() < 1500 else m.end()
                s = s[:pos] + '\n' + suite + s[pos:]
    return s


# ---------------------------------------------------------------- exécution
def main():
    if SRC:
        pages_neuves()
    total = {'rgdu': 0, 'vehicule': 0, 'autre': 0}
    habillees = 0
    for rel in pages_existantes():
        s0 = lire(R(rel))
        if 'current-navbar' not in s0 and 's26-hd' not in s0:
            continue  # pages de redirection sans en-tête
        s, n = habiller(s0)
        s, c = reorienter(rel, s)
        s = appels_demo(rel, s)
        s = mentions_prediag(s)
        tete, reste = s.split('</head>', 1)
        s = maj_jsonld(tete, '', faq=False) + '</head>' + reste
        for k in total:
            total[k] += c[k]
        if s != s0:
            ecrire(R(rel), s)
        habillees += 1 if n == 2 else 0
        if n != 2:
            print('  en-tête ou pied non trouvé :', rel, n)
    ecrire(R('outils/prediagnostic-urssaf/index.html'), page_redirection('Outils gratuits · ACOMPIA'))
    ecrire(R('prediagnostic/index.html'), page_redirection('Outils gratuits · ACOMPIA'))
    # plan du site et llms.txt
    sm = lire(R('sitemap.xml'))
    sm2 = re.sub(r'\s*<url>\s*<loc>https://www\.acompia\.com/(?:outils/prediagnostic-urssaf|prediagnostic)/</loc>.*?</url>', '', sm, flags=re.S)
    if sm2 != sm:
        ecrire(R('sitemap.xml'), sm2)
    ll = lire(R('llms.txt'))
    ll2 = '\n'.join(l for l in ll.split('\n') if 'prediagnostic' not in l)
    if ll2 != ll:
        ecrire(R('llms.txt'), ll2)
    print('pages habillées :', habillees, '· liens du prédiagnostic réorientés :', total, '· total', sum(total.values()))


if __name__ == '__main__':
    main()
