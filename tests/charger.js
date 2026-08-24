/* Charge des scripts navigateur dans un contexte isolé, sans DOM.

   Les scripts sont concaténés avant exécution : dans un navigateur, plusieurs
   <script> classiques partagent la même portée globale, si bien qu'un `const`
   déclaré dans l'un est visible depuis les suivants. Les exécuter séparément
   dans le contexte `vm` briserait ce partage. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RACINE = path.join(__dirname, '..');

function chargerScripts(...cheminsRelatifs) {
  const source = cheminsRelatifs
    .map((rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8'))
    .join('\n;\n');

  // Stubs minimaux : les scripts posent des écouteurs au chargement.
  // Les tests ne visent que la logique pure, pas le DOM.
  const contexte = vm.createContext({
    window: {},
    console,
    document: { addEventListener() {} },
    location: { pathname: '/' }
  });
  vm.runInContext(source, contexte, { filename: cheminsRelatifs.join('+') });
  // Les `const` de portée script ne deviennent pas propriétés du contexte :
  // on les récupère via l'objet `window`, que les scripts alimentent eux-mêmes.
  return { ...contexte, ...contexte.window };
}

module.exports = { chargerScripts };
