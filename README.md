# Kultuuriradar

Telefonis installitav eestikeelne kultuuriürituste veebirakendus (PWA).

## Ava veebis

GitHub Pagesi avaldamise järel: https://gunnarlaak.github.io/Kultuuriradar/

Kui leht veel ei avane, vali GitHubi repositooriumis **Settings → Pages → Build and deployment → Source: GitHub Actions**. Repositooriumis on töövoog `.github/workflows/pages.yml`, mis käivitub uue commit'i puhul või menüüst **Actions → Deploy GitHub Pages → Run workflow**.

## Omadused

- GPS asukoha tuvastamine kasutaja loal; käsitsi linna valimine
- 5–400 km otsinguala
- Kuupäevade ja kategooriate filtrid, tekstiotsing
- Nimekiri ja OpenStreetMap kaart
- Brauserisse salvestatud lemmikud ja kalendrisse lisamine
- Installitav PWA (Androidi Chrome: installi rakendus; iOS Safari: Jaga → Lisa avakuvale)

## Andmeallikad ja piirangud

Praegu proovib rakendus otse avalikku Saaremaa sündmuste API-t (`https://saare.events/api/events`). Brauserist esitatav päring võib CORS piirangu tõttu ebaõnnestuda. Eesti-ülene katvus ei ole veel tagatud. Puuduvaid sündmusi äpp välja ei mõtle.

Töökindlama API ja teiste andmeallikate jaoks on vaja avaldada Cloudflare Worker ja panna selle URL faili `config.js` väljale `apiBase`. API võtmeid ei tohi sinna panna.

**NB:** GitHubi avaldamise töövoog ei avalda Workeri API-t automaatselt. Seni ei pruugi ürituste nimekiri andmeallika piirangute tõttu täituda.

## Paigaldamine

Ava leht HTTPS-aadressil telefoni brauseris. Asukohateenus vajab luba. Uute sündmuste pärimiseks on vaja võrguühendust.

## Arendamine

Kõik veebirakenduse failid asuvad repositooriumi juurkaustas; GitHub Pages ei vaja eraldi build-sammu.
