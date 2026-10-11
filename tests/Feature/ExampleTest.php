<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_la_spa_react_est_servie_sur_toutes_les_routes_web(): void
    {
        $this->withoutVite();

        $this->get('/')->assertOk()->assertSee('<div id="root"></div>', false);
        $this->get('/DepotCorps')->assertOk()->assertSee('<div id="root"></div>', false);
        $this->get('/Parametres?section=roles')->assertOk();
    }

    public function test_les_routes_api_inconnues_ne_renvoient_pas_la_spa(): void
    {
        $this->getJson('/api/inexistant')->assertNotFound();
    }
}
