# Securing a for-sale listings feed

The app's buyer flow currently runs on 8 demo listings. To show real on-sale
properties you need a **data feed**. This doc has (1) where to get one and
(2) ready-to-send outreach templates.

## Where the data lives

Agents push listings to all portals at once via a standard exchange format —
**IDX** (Swiss, SVIT) or **OpenImmo** (DACH XML). Whoever controls that pipe
can give you a feed.

| Route | What it is | Effort | Cost |
|---|---|---|---|
| **Agency IDX/OpenImmo export** | Individual agencies point their CRM's export at your endpoint | Low (email a few agencies) | Usually free |
| **CASASOFT / CASAGATEWAY** | Aggregator that distributes thousands of agencies' listings | Medium (B2B contract) | Paid (quote) |
| **Portals (SMG/Homegate–ImmoScout24, Newhome)** | Direct partner/data programs | High (selective) | Paid |
| **Valuation APIs (PriceHubble, IAZI, Wüest Partner)** | Price estimates & analytics — *not* listings | Medium | Paid |

**Do not scrape the portals** — it breaches their terms and Swiss database /
unfair-competition law.

**Recommended order:** agencies first (free, fast) → CasaGateway (breadth) →
portals later.

## What to nail down in any agreement
- Geography, fields (price, address, rooms, m², year, energy, **photos**, geo-coords)
- Right to **store, display, and redistribute** (photos are copyrighted by the agency/photographer)
- Format (IDX / OpenImmo XML), delivery (pull URL, FTP/S3 push), update frequency
- Pricing tied to volume/usage

---

## Outreach template — agency IDX/OpenImmo partnership (English)

> **Subject:** Free extra exposure for your listings — sustainable-renovation tool
>
> Hi [Name],
>
> I run Sustainable Dwellings (sustainabledwellings.info), a tool that lets
> buyers and owners see how any Swiss property could be renovated to be more
> energy-efficient — with live cost, energy, CO₂ and subsidy figures, using
> official federal data (GWR, sonnendach, the cantonal subsidy programmes).
>
> I'd like to feature your for-sale listings, at no cost to you. It's extra,
> sustainability-focused exposure — especially useful for older properties,
> where the "here's what it could become" view helps buyers see past the
> current energy rating.
>
> Technically it's simple: if your brokerage software exports **IDX or
> OpenImmo**, you'd just add my feed endpoint as an additional target — the
> same way you already publish to Homegate/ImmoScout24. No extra work per
> listing on your side.
>
> Could you point me to whoever manages your listing software, or send a
> sample export so I can confirm the integration? Happy to do a 15-minute call.
>
> Best regards,
> [Your name] · [phone] · sustainabledwellings.info

## Outreach-Vorlage — Makler IDX/OpenImmo-Partnerschaft (Deutsch)

> **Betreff:** Kostenlose Zusatz-Reichweite für Ihre Objekte — Tool für nachhaltige Sanierung
>
> Guten Tag [Name]
>
> Ich betreibe Sustainable Dwellings (sustainabledwellings.info), ein Tool, mit
> dem Käufer und Eigentümer sehen, wie sich eine Schweizer Liegenschaft
> energetisch sanieren liesse — mit Live-Zahlen zu Kosten, Energie, CO₂ und
> Fördergeldern, auf Basis offizieller Daten (GWR, Sonnendach,
> kantonale Förderprogramme).
>
> Ich würde Ihre Verkaufsobjekte gerne kostenlos einbinden. Das ist zusätzliche,
> auf Nachhaltigkeit ausgerichtete Sichtbarkeit — gerade bei älteren Objekten
> hilft die «So könnte es werden»-Ansicht den Käufern.
>
> Technisch ist es einfach: Wenn Ihre Maklersoftware **IDX oder OpenImmo**
> exportiert, fügen Sie einfach meinen Feed-Endpoint als weiteres Ziel hinzu —
> so wie Sie heute schon auf Homegate/ImmoScout24 publizieren. Kein Mehraufwand
> pro Objekt.
>
> Könnten Sie mich an die zuständige Person für Ihre Objektsoftware verweisen
> oder mir einen Beispiel-Export senden, damit ich die Integration prüfen kann?
> Gerne auch ein kurzes Telefonat.
>
> Freundliche Grüsse
> [Ihr Name] · [Telefon] · sustainabledwellings.info

## Outreach template — CASASOFT / aggregator (English)

> **Subject:** Data-feed licensing for a sustainability proptech tool
>
> Hi,
>
> I'm building Sustainable Dwellings, a tool that models energy-renovation
> scenarios for Swiss properties. I'd like to license a feed of for-sale
> listings (CH-wide, standard IDX/OpenImmo fields incl. photos and geo-coords)
> to display alongside the renovation analysis.
>
> Could you share what data-distribution / licensing options you offer for a
> use case like this, a sample feed, and indicative pricing by volume?
>
> Thanks,
> [Your name] · sustainabledwellings.info
