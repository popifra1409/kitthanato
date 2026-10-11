<?php

namespace Tests\Feature\Api;

use App\Models\Depot;
use App\Models\Historique;
use App\Models\Sortie;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

class TracabiliteTest extends ApiTestCase
{
    public function test_created_by_et_updated_by_sont_renseignes_automatiquement(): void
    {
        $createur = $this->connecter('USER1');

        $id = $this->postJson('/api/depots', $this->depotValide())->assertCreated()->json('depot.id');

        $depot = Depot::find($id);
        $this->assertSame($createur->id, $depot->created_by);
        $this->assertSame($createur->id, $depot->updated_by);

        $modificateur = User::factory()->role('USER2')->create();
        Sanctum::actingAs($modificateur);

        $this->putJson("/api/depots/{$id}", $this->depotValide(['code' => $depot->code, 'nom' => 'SMITH']))->assertOk();

        $depot->refresh();
        $this->assertSame($createur->id, $depot->created_by);
        $this->assertSame($modificateur->id, $depot->updated_by);

        $this->getJson("/api/depots/{$id}")
            ->assertJsonPath('createur.name', $createur->name)
            ->assertJsonPath('modificateur.name', $modificateur->name);
    }

    public function test_created_by_ne_peut_pas_etre_force_par_le_client(): void
    {
        $this->connecter('USER1');
        $autre = User::factory()->role('ADMIN')->create();

        $id = $this->postJson('/api/depots', $this->depotValide(['created_by' => $autre->id]))->json('depot.id');

        $this->assertNotSame($autre->id, Depot::find($id)->created_by);
    }

    public function test_journal_avant_apres_sur_modification(): void
    {
        $this->connecter('ADMIN');
        $depot = Depot::create($this->depotValide(['nom' => 'AVANT']));

        $this->putJson("/api/depots/{$depot->id}", $this->depotValide(['code' => $depot->code, 'nom' => 'APRES']))->assertOk();

        $log = Historique::where('module', 'DEPOTS')->where('action', 'MODIFICATION')->latest('id')->first();
        $this->assertSame('AVANT', $log->details['avant']['nom']);
        $this->assertSame('APRES', $log->details['apres']['nom']);
        $this->assertSame(Depot::class, $log->auditable_type);
        $this->assertSame($depot->id, $log->auditable_id);
    }

    public function test_suppression_journalisee_et_mise_en_corbeille(): void
    {
        $admin = $this->connecter('ADMIN');
        $depot = Depot::create($this->depotValide());

        $this->deleteJson("/api/depots/{$depot->id}", ['raison' => 'Doublon'])->assertOk();

        $this->assertDatabaseHas('corbeille', ['element_type' => 'DEPOT', 'element_id' => $depot->id, 'user_id' => $admin->id, 'raison' => 'Doublon']);
        $this->assertDatabaseHas('audit_logs', ['module' => 'DEPOTS', 'action' => 'SUPPRESSION', 'user_id' => $admin->id]);
    }

    public function test_paiement_trace_l_encaisseur_et_le_montant(): void
    {
        $caissier = $this->connecter('ADMIN');
        $depot = Depot::create($this->depotValide(['date_arrivee' => now()->subDays(2)->toDateString()]));

        $sortieId = $this->postJson('/api/sorties', [
            'depot_id' => $depot->id,
            'date' => now()->toDateString(),
            'heure' => '14:00',
        ])->assertCreated()->json('id');

        $this->postJson("/api/sorties/{$sortieId}/paiement", ['montant_paye' => 5000])->assertOk();

        $log = Historique::where('action', 'PAIEMENT')->first();
        $this->assertSame($caissier->id, $log->user_id);
        $this->assertEquals(5000, $log->details['montant_encaisse']);

        $this->assertSame('SORTI', $depot->fresh()->statut);
        $this->assertSame($caissier->id, $depot->fresh()->updated_by);
        $this->assertSame($caissier->id, Sortie::find($sortieId)->levee->created_by);
    }

    public function test_une_sortie_payee_ne_peut_pas_etre_supprimee(): void
    {
        $this->connecter('ADMIN');
        $depot = Depot::create($this->depotValide(['date_arrivee' => now()->subDays(3)->toDateString()]));
        $sortieId = $this->postJson('/api/sorties', ['depot_id' => $depot->id, 'date' => now()->toDateString(), 'heure' => '14:00'])->json('id');
        $this->postJson("/api/sorties/{$sortieId}/paiement", ['montant_paye' => 1000])->assertOk();

        $this->deleteJson("/api/sorties/{$sortieId}")->assertStatus(422);
    }

    public function test_historique_filtrable_par_utilisateur_module_et_element(): void
    {
        $admin = $this->connecter('ADMIN');
        $depot = Depot::create($this->depotValide());
        $depot->update(['nom' => 'X']);

        $this->getJson("/api/historique?user_id={$admin->id}&module=depots")
            ->assertOk()
            ->assertJsonPath('total', 2);

        $this->getJson("/api/historique?sujet_type=Depot&sujet_id={$depot->id}")
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.user.name', $admin->name);

        $this->getJson('/api/historique/filtres')->assertOk()->assertJsonFragment(['DEPOTS']);
    }
}
