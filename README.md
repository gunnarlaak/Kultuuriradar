# Kultuuriradar

Telefonis installitav eestikeelne kultuuriürituste veebirakendus (PWA).

## Ava veebis

GitHub Pagesi avaldamise järel: https://gunnarlaak.github.io/Kultuuriradar/

Kui leht veel ei avane, vali GitHubi repositooriumis **Settings → Pages → Build and deployment → Source: GitHub Actions**. Repositooriumis on töövoog `.github/workflows/pages.yml`, mis käivitub uue commit'i puhul või menüüst **Actions → Deploy GitHub Pages → Run workflow**.

## Omadused

- GPS asukoha tuvastamine kasutaja loal; käsitsi linna valimine
- 10, 25, 50 või 100 km otsinguala või kogu Eesti
- Kuupäevade ja kategooriate filtrid, tekstiotsing
- Nimekiri ja OpenStreetMap kaart
- Brauserisse salvestatud lemmikud ja kalendrisse lisamine
- Installitav PWA (Androidi Chrome: installi rakendus; iOS Safari: Jaga → Lisa avakuvale)

## Andmeallikad ja piirangud

Põhiallikas on Collectori avalik Cloudflare API, mille aadress on `config.js` väljal `collectorBase`. Brauser loeb kuni 90 päeva sündmusi lehekülgede kaupa ja filtreerib asukohta seadmes. Vigase või puuduva koordinaadi korral kasutatakse tuntud asula keskpunkti, kui see on tuvastatav. Ligikaudse kauguse ees kuvatakse ~.

API tõrke korral kasutatakse viimast edukat koopiat või selle puudumisel Saaremaa varuandmeid. Üleriigiline valik hõlmab kõiki Collectorile teadaolevaid sündmusi. Avalikul lugemisel piisab veebilehe päritolu lisamisest Workeri CORS-i lubatud loendisse, `INGEST_TOKEN` jääb serveripoolele.

## Paigaldamine

Ava leht HTTPS-aadressil telefoni brauseris. Asukohateenus vajab luba. Uute sündmuste pärimiseks on vaja võrguühendust.

## Arendamine

Kõik veebirakenduse failid asuvad repositooriumi juurkaustas; GitHub Pages ei vaja eraldi build-sammu.

Käivita `node --test tests/collector.test.cjs`. Chrome’i kontrolliks käivita `node tests/browser-smoke.cjs <Chrome'i käivitusfail>`.
