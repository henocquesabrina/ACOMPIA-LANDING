const test = require('node:test');
const assert = require('node:assert/strict');
const { abonnementMensuel, auditPrix, libelleNbVehicules } = require('../js/tarifs-flotte.js');

test('abonnement : le minimum mensuel s\'applique aux petites flottes', () => {
  assert.equal(abonnementMensuel(1), 150);
  assert.equal(abonnementMensuel(18), 150); // 18 × 8 € = 144 € < 150 €
});

test('abonnement : le premier palier facture 8 € par véhicule', () => {
  assert.equal(abonnementMensuel(25), 200);
});

test('abonnement : chaque palier ne facture que les véhicules de sa tranche', () => {
  assert.equal(abonnementMensuel(30), 230);    // 25×8 + 5×6
  assert.equal(abonnementMensuel(75), 500);    // 25×8 + 50×6
  assert.equal(abonnementMensuel(150), 837.5); // + 75×4,5
  assert.equal(abonnementMensuel(200), 1012.5); // + 50×3,5
});

test('abonnement : le tarif est dégressif au véhicule', () => {
  const parVehicule = (n) => abonnementMensuel(n) / n;
  assert.ok(parVehicule(200) < parVehicule(150));
  assert.ok(parVehicule(150) < parVehicule(75));
  assert.ok(parVehicule(75) < parVehicule(30));
});

test('audit : forfait par tranche, bornes incluses', () => {
  assert.equal(auditPrix(1), 1500);
  assert.equal(auditPrix(50), 1500);
  assert.equal(auditPrix(51), 2500);
  assert.equal(auditPrix(100), 2500);
  assert.equal(auditPrix(101), 3500);
  assert.equal(auditPrix(200), 3500);
});

test('libellé : la dernière tranche est affichée ouverte', () => {
  assert.equal(libelleNbVehicules(199), '199');
  assert.equal(libelleNbVehicules(200), '200+');
});
