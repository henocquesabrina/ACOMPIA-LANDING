#!/usr/bin/env python3
# Relie les deux nouveaux outils au site : menu commun, indexation, plan du site, liens croisés.
# Rejouable : chaque étape est idempotente. Lancer depuis la racine du dépôt.
import glob,re,sys,json
RGDU='/outils/comparateur-rgdu-mensuel/'; DELAI='/outils/delai-remboursement-cotisations/'
ENTREES=[('/outils/matrice-controle-rgdu/','Matrice de contrôle RGDU','Le classeur de contrôle, à télécharger'),
 (RGDU,'Comparateur RGDU mensuel','Recalculez un mois et comparez à votre paie'),
 ('/outils/simulateur-avantage-en-nature-vehicule/','Simulateur avantage en nature véhicule','Le bon montant, en quelques questions'),
 (DELAI,"Délai de remboursement d'un trop-payé",'Jusqu\'à quand demander le remboursement'),
 ('/outils/pilotage-flotte-tarifs/','Pilotage de flotte','Le suivi des véhicules, un par un')]
def menu(prefixe,page,indent):
    l=[]
    for u,n,d in ENTREES:
        cur=' aria-current="page"' if page.endswith(u.strip('/')+'/index.html') else ''
        l.append(f'{indent}<a href="{u}"{cur}><b>{n}</b><span>{d}</span></a>')
    l.append(f'{indent}<a class="{prefixe}dd-all" href="/outils/">Tous les outils →</a>')
    return '\n'.join(l)
def mobile(indent):
    a='<a href="/#gains">La solution</a><a href="/offres/">Offres</a>'
    b=''.join(f'<a href="{u}">{n}</a>' for u,n,d in ENTREES)
    c='<a href="/outils/">Tous les outils</a><a href="/ressources/">Ressources</a>'
    return f'\n{indent}{a}\n{indent}{b}\n{indent}{c}\n{indent[:-2]}'
stats={'menu':0,'mobile':0}
for f in sorted(glob.glob('**/*.html',recursive=True)):
    if f.startswith('tools/'): continue
    t=open(f,encoding='utf-8').read(); o=t
    def r1(m):
        stats['menu']+=1; pre='s26-' if 's26-dd-menu' in m.group(1) else ''
        return m.group(1)+'\n'+menu(pre,f,m.group(2)+'  ')+'\n'+m.group(2)+'</div>'
    t=re.sub(r'(<div class="(?:s26-)?dd-menu">)\s*?\n(?:\s*<a [^\n]*\n)+?(\s*)</div>',r1,t)
    def r2(m):
        stats['mobile']+=1; return m.group(1)+mobile(m.group(2)+'  ')+'</div>'
    t=re.sub(r'(<div class="s26-m-menu">)\s*\n(\s*)<a [\s\S]*?</div>',lambda m:r2(m),t)
    if t!=o: open(f,'w',encoding='utf-8').write(t)
print('menus déroulants mis à jour :',stats['menu'],'| menus téléphone :',stats['mobile'])
