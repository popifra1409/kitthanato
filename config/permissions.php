<?php

/*
|--------------------------------------------------------------------------
| Catalogue des permissions
|--------------------------------------------------------------------------
| Source unique de vérité pour les permissions de l'application.
| Après toute modification de ce fichier :
|
|     php artisan permissions:sync
|
| Les permissions sont créées / mises à jour en base. Les rôles existants
| ne sont PAS modifiés (sauf avec --reset-roles), pour ne pas écraser les
| réglages faits depuis l'écran « Rôles & permissions ».
*/

return [

    /* Rôle « super administrateur » : il a toujours toutes les permissions
       et ne peut être ni supprimé ni privé de ses droits. */
    'super_admin_role' => 'ADMIN',

    'modules' => [

        'dashboard' => [
            'libelle' => 'Tableau de bord',
            'permissions' => [
                'view' => 'Voir le tableau de bord',
            ],
        ],

        'depots' => [
            'libelle' => 'Dépôts de corps',
            'permissions' => [
                'view'   => 'Consulter les dépôts',
                'create' => 'Enregistrer un dépôt',
                'update' => 'Modifier un dépôt',
                'delete' => 'Supprimer un dépôt',
            ],
        ],

        'sorties' => [
            'libelle' => 'Sorties',
            'permissions' => [
                'view'   => 'Consulter les sorties',
                'create' => 'Enregistrer une sortie',
                'update' => 'Modifier une sortie',
                'delete' => 'Supprimer une sortie',
                'payer'  => 'Encaisser un paiement',
            ],
        ],

        'transferts' => [
            'libelle' => 'Transferts',
            'permissions' => [
                'view'   => 'Consulter les transferts',
                'create' => 'Enregistrer un transfert',
                'update' => 'Modifier un transfert',
                'delete' => 'Supprimer un transfert',
            ],
        ],

        'levees' => [
            'libelle' => 'Levées',
            'permissions' => [
                'view' => 'Consulter le planning des levées',
            ],
        ],

        'declarations' => [
            'libelle' => 'Déclarations de décès',
            'permissions' => [
                'view'   => 'Consulter les déclarations',
                'create' => 'Créer une déclaration',
                'update' => 'Modifier une déclaration',
                'delete' => 'Supprimer une déclaration',
            ],
        ],

        'statistiques' => [
            'libelle' => 'Statistiques',
            'permissions' => [
                'view' => 'Consulter les statistiques',
            ],
        ],

        'referentiels' => [
            'libelle' => 'Référentiels (prestations, chapelles, services)',
            'permissions' => [
                'manage' => 'Gérer prestations, chapelles et services',
            ],
        ],

        'utilisateurs' => [
            'libelle' => 'Utilisateurs',
            'permissions' => [
                'view'   => 'Consulter les comptes',
                'create' => 'Créer un compte',
                'update' => 'Modifier un compte',
                'delete' => 'Supprimer / désactiver un compte',
            ],
        ],

        'roles' => [
            'libelle' => 'Rôles & permissions',
            'permissions' => [
                'view'   => 'Consulter les rôles',
                'manage' => 'Créer / modifier / supprimer des rôles',
            ],
        ],

        'historique' => [
            'libelle' => 'Historique (journal d\'audit)',
            'permissions' => [
                'view' => 'Consulter l\'historique des actions',
            ],
        ],

        'corbeille' => [
            'libelle' => 'Corbeille',
            'permissions' => [
                'view' => 'Consulter la corbeille',
            ],
        ],
    ],

    /*
    | Dépendances entre permissions : cocher une permission ajoute
    | automatiquement celles dont la page a besoin pour fonctionner.
    | (En plus, toute action d'un module implique « module.view ».)
    */
    'dependances' => [
        'dashboard.view' => ['depots.view', 'sorties.view', 'transferts.view'],
        'sorties.view' => ['depots.view'],
        'transferts.view' => ['depots.view'],
    ],

    /*
    | Rôles par défaut (créés s'ils n'existent pas).
    | Les permissions listées reprennent les accès qui existaient avant
    | (ADMIN : tout ; USER1 : dépôts + levées ; USER2 : dépôts, levées,
    | déclarations).
    */
    'roles' => [
        'ADMIN' => [
            'libelle' => 'Administrateur',
            'description' => 'Accès complet à l\'application.',
            'permissions' => ['*'],
        ],
        'USER1' => [
            'libelle' => 'Thanatopracteur',
            'description' => 'Gestion des dépôts et consultation des levées.',
            'permissions' => [
                'depots.view', 'depots.create', 'depots.update',
                'levees.view',
            ],
        ],
        'USER2' => [
            'libelle' => 'Médecin légiste',
            'description' => 'Déclarations de décès, dépôts et levées.',
            'permissions' => [
                'depots.view', 'depots.create', 'depots.update',
                'levees.view',
                'declarations.view', 'declarations.create',
                'declarations.update', 'declarations.delete',
            ],
        ],
    ],
];
