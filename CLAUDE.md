# AMLuxe — App de gestion achat/revente de sacs de luxe

## Objectif
Application web de gestion complète du cycle achat → revente de sacs de luxe
(fournisseur → réception → mise en vente → vente → stats).

## Stack recommandée
- Next.js 14 (App Router)
- Tailwind CSS
- Prisma + SQLite (base de données locale)
- Recharts (graphiques statistiques)
- xlsx (export Excel)

## Fonctionnalités principales
1. Gestion des commandes fournisseurs (statuts : En préparation / En livraison / Reçue)
2. Articles par commande (marque, modèle, prix achat, état, ref fournisseur)
3. Taxes et frais par commande (douane, livraison, autres)
4. Mise en vente des articles (prix, plateforme : Vinted, Leboncoin...)
5. Vente et livraison client (prix réel, frais de vente)
6. Module statistiques (CA, bénéfice, marges, rentabilité par modèle/fournisseur)
7. Export Excel (par commande et global)

## Style UI
- Dashboard pro, épuré, dark mode
- Sidebar navigation
- Tableaux clairs avec filtres et statuts colorés

## Architecture
- /app → pages Next.js
- /components → composants réutilisables
- /lib → logique métier et DB
- /prisma → schéma base de données

## Vision évolutive
L'app est pensée pour évoluer vers l'automatisation :
tracking colis, sync emails, connexion Vinted, stats temps réel.
Prévoir une architecture modulaire et extensible.

## Langue
Français (interface et code)
