# Google Play Console — Data Safety Form Mapping
**Sovellus**: Viikinkitapahtumat (`fi.viikinkitapahtumat.mobile`)
**Päivitetty**: 28.4.2026 — vastaa Privacy Policy v28.4.2026 ja koodikantaa.

> **Käyttöohje**: Avaa Play Console → **App content → Data safety**. Vastaa kysymyksiin alla olevien valintojen mukaisesti, kopioi "Purpose" ja "Optional"-kuvaukset suoraan vastauksiin.

---

## Section 1 — Data collection and security

| Kysymys | Vastaus |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS kaikkialla) |
| Do you provide a way for users to request that their data be deleted? | **Yes** — käyttäjä poistaa tilinsä `Profiili → Poista tili` -toiminnolla, tai pyytämällä sähköpostitse osoitteesta `admin@viikinkitapahtumat.fi`. Backend-endpoint: `DELETE /api/admin/users/{id}` (cascade-poistaa RSVPt, push-tokenit, uutiskirjetilauksen, reminderit; anonymisoi viestilokin). |

**Privacy policy URL**: https://viikinkitapahtumat.fi/privacy

---

## Section 2 — Data types collected

For each entry: **Collected: Yes/No**, **Shared with third parties: Yes/No**, **Processing: Ephemeral / Persistent**, **Optional / Required**, **Purposes**.

Käytä Play Consolen valikon järjestystä. Vain alla mainitut kategoriat valitaan; muut jätetään tyhjäksi.

### 2.1 Personal info

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Name** | ❌ No | – | – | – | Käytämme vain "nimimerkkiä" (kaldenavn), joka ei ole henkilönnimi — siksi tämä on **Other info** (alla). |
| **Email address** | ✅ Yes | ❌ No | Required (rekisteröitymiseen ja yhteydenottolomakkeeseen) | App functionality, Account management, Communications | Tallennetaan plain MongoDB:hen; käytetään kirjautumiseen, salasanan palautukseen, uutiskirjeisiin ja muistutuksiin. |
| **User IDs** | ✅ Yes | ❌ No | Required (rekisteröityessä) | App functionality, Account management | Sisäinen UUID jokaiselle käyttäjälle. JWT-tokenit kuljetetaan httpOnly-evästeissä. |
| **Address** | ❌ No | – | – | – | Ei kerätä postiosoitetta. |
| **Phone number** | ❌ No | – | – | – | – |
| **Race and ethnicity** | ❌ No | – | – | – | – |
| **Political or religious beliefs** | ❌ No | – | – | – | – |
| **Sexual orientation** | ❌ No | – | – | – | – |
| **Other info** (free text) | ✅ Yes | ❌ No | Optional | App functionality, Personalization | **Sisältää**: nimimerkki (kaldenavn), valittu maa (ISO-2), yhdistys/kilta-nimi, kauppias-/järjestäjänimi, käyttäjätyypit (harrastaja/taistelija/kauppias/järjestäjä), suostumusvalinnat. Kaikki valinnaisia rekisteröitymisen jälkeen. |

### 2.2 Financial info

| Data type | Collected | Notes |
|---|---|---|
| User payment info | ❌ No | Stripe-integraatio on suunnitteilla (P1) — tämä päivitetään silloin "Yes (shared with Stripe)". |
| Purchase history | ❌ No | – |
| Credit score | ❌ No | – |
| Other financial info | ❌ No | – |

### 2.3 Health and fitness

| Data type | Collected | Notes |
|---|---|---|
| Health info | ❌ No | – |
| Fitness info | ❌ No | – |

### 2.4 Messages

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Emails** | ❌ No | – | – | – | Kontaktilomakkeen kautta vastaanotetut viestit kulkevat suoraan ylläpitäjän sähköpostiin Resendin kautta — niitä ei tallenneta tietokantaan eikä loginlukemia tehdä. (Jos tämä muuttuu, valitse "Yes"). |
| **SMS or MMS** | ❌ No | – | – | – | – |
| **Other in-app messages** | ✅ Yes | ❌ No | Optional (vain järjestäjät/kauppiaat/admin lähettävät) | App functionality, Account management | Viestinlähetysjärjestelmän audit-lokitus: lähettäjä-id, tapahtuma-id, kanava (push/email), aiheen ote, vastaanottajamäärä. Vastaanottajien e-mail-osoitteita EI tallenneta lokiin. |

### 2.5 Photos and videos

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Photos** | ✅ Yes | ❌ No | Optional | App functionality, Personalization | Käyttäjä voi ladata profiilikuvan. Tallennettu MongoDB GridFS -bucketissä. Käyttäjä voi vaihtaa/poistaa milloin tahansa. |
| **Videos** | ❌ No | – | – | – | – |

### 2.6 Audio files

| Data type | Collected | Notes |
|---|---|---|
| Voice or sound recordings | ❌ No | – |
| Music files | ❌ No | – |
| Other audio files | ❌ No | – |

### 2.7 Files and docs

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Files and docs** | ✅ Yes | ❌ No | Optional | App functionality | Käyttäjä voi ladata profiilliin valinnaisia PDF-dokumentteja: SVTL-taistelijapassi ja varustepassi (vain harrastajat, jotka käyttävät niitä taisteluleireissä tunnistautumiseen). Vain käyttäjä itse ja ylläpito voivat avata. Tallennettu MongoDB GridFS -bucketissä. Maksimi 8 MB / tiedosto. Käyttäjä voi poistaa milloin tahansa. |

### 2.8 Calendar

| Data type | Collected | Notes |
|---|---|---|
| Calendar events | ❌ No | Sovellus näyttää julkisia tapahtumia, mutta ei lue käyttäjän laitteen kalenteria. |

### 2.9 Contacts

| Data type | Collected | Notes |
|---|---|---|
| Contacts | ❌ No | – |

### 2.10 App activity

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **App interactions** | ✅ Yes | ❌ No | Required (RSVP-toiminnolle) | App functionality, Analytics | RSVP-tallennukset palvelimella: mihin tapahtumiin käyttäjä on ilmoittanut osallistuvansa + ilmoituskanavavalinnat (push/email). Käytetään vain muistutuslähetyksiin ja toiminnan tarjoamiseen. |
| **In-app search history** | ❌ No | – | – | – | Tallennetaan ainoastaan käyttäjän valitsemat oletussuodattimet (kategoriat, maat, säde) profiilin "saved search" -kenttään, jos hän tallentaa ne. **Ei** kyselyhistoriaa. |
| **Installed apps** | ❌ No | – | – | – | – |
| **Other user-generated content** | ✅ Yes | ❌ No | Optional | App functionality | Käyttäjät voivat lähettää julkisia tapahtumailmoituksia (status=pending → admin moderation → status=approved). Sisältää otsikon, kuvauksen, ajan, paikan, valinnaisen kuvan. |
| **Other actions** | ❌ No | – | – | – | – |

### 2.11 Web browsing

| Data type | Collected | Notes |
|---|---|---|
| Web browsing history | ❌ No | – |

### 2.12 App info and performance

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Crash logs** | ✅ Yes | ❌ No | Required | App functionality | Standard HTTP-palvelinlokit (IP, User-Agent, aika) väärinkäytösten estämiseksi. Säilytys 30 vrk. Mobile App ei lähetä erillistä telemetriaa. |
| **Diagnostics** | ❌ No | – | – | – | Sovellus ei käytä Firebase Crashlyticsia, Sentryä tms. |
| **Other app performance data** | ❌ No | – | – | – | – |

### 2.13 Device or other IDs

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Device or other IDs** | ✅ Yes | ✅ Yes (Expo Push Service) | Optional (vain jos käyttäjä sallii notifikaatiot) | App functionality | Expo Push Token: anonyymi laitetunniste, joka tarvitaan push-notifikaatioiden lähettämiseen. Jaettu Expoon (https://expo.dev/privacy) viestin perille toimittamista varten. Käyttäjä voi peruuttaa luvan laitteen asetuksista. |

### 2.14 Location

| Data type | Collected | Shared | Optional? | Purposes | Notes |
|---|---|---|---|---|---|
| **Approximate location** | ❌ No | – | – | – | Käyttäjän laite voi pyytää sijaintia "lähimmät tapahtumat" -näkymää varten, mutta sijaintia EI lähetetä palvelimellemme — kaikki etäisyyslaskenta tehdään laitteella. |
| **Precise location** | ❌ No | – | – | – | Sama: vain laitteella, ei palvelimelle. |

> **Tärkeä**: Vaikka pyydämme `ACCESS_FINE_LOCATION` ja `ACCESS_COARSE_LOCATION` -lupia AndroidManifestissa, sijaintia EI lähetetä eikä tallenneta verkkoon. Voit kertoa Google Playlle "we don't collect location data" — Play Storen Data Safety on käytöstä, ei luvista. Lisää myös selventävä huomautus "Privacy & Security practices" -osioon: *"Location permission is requested only to compute distance-to-event on-device; coordinates are never transmitted."*

---

## Section 3 — Security practices

| Kysymys | Vastaus |
|---|---|
| Is the data encrypted in transit? | **Yes** — kaikki sovellus↔palvelin-yhteydet TLS 1.2+. |
| Do you provide a way for users to delete their data? | **Yes** — `Profiili → Poista tili` mobiilissa ja webissä, sekä admin@viikinkitapahtumat.fi |
| Have you reviewed and committed to the Play Families Policy? | **No** (tämä ei ole lapsille suunnattu sovellus). |
| Is your app compliant with Google Play's Data Safety section? | **Yes** |

### Optional fields (suositellut)

**Independent security review**: Ei (yksittäisen ylläpitäjän sovellus, ei kaupallista vakuutusta).
**Data deletion description** (mille käyttäjille näkyy):
> "Voit poistaa tilisi ja kaikki siihen liittyvät tiedot Profiili-sivun Poista tili -painikkeella. Poisto on välitön. Voit myös pyytää poistoa sähköpostitse osoitteesta admin@viikinkitapahtumat.fi."

**Data deletion URL** (vaihtoehto in-app-poistolle): https://viikinkitapahtumat.fi/profile

---

## Section 4 — Yhteenveto Play Consolen taulukkoon (kopioi suoraan)

```
Personal info → Email addresses ............ Collected, Not shared, Required, [App functionality, Account management, Communications]
Personal info → User IDs ................... Collected, Not shared, Required, [App functionality, Account management]
Personal info → Other info ................. Collected, Not shared, Optional, [App functionality, Personalization]
Messages → Other in-app messages ........... Collected, Not shared, Optional, [App functionality, Account management]
Photos and videos → Photos ................. Collected, Not shared, Optional, [App functionality, Personalization]
Files and docs → Files and docs ............ Collected, Not shared, Optional, [App functionality]
App activity → App interactions ............ Collected, Not shared, Required, [App functionality, Analytics]
App activity → Other user-generated content  Collected, Not shared, Optional, [App functionality]
App info and performance → Crash logs ...... Collected, Not shared, Required, [App functionality]
Device or other IDs → Device or other IDs .. Collected, Shared (with Expo), Optional, [App functionality]
```

**Yhteensä 10 datakohtaa** valitaan "Collected"-listalle. Kaikki muut Play Consolen kysymykset → "No".

---

## Section 5 — Mistä koodista jokainen tiedonkeruu tulee (refrenssi)

| Data type | Backend endpoint | Storage |
|---|---|---|
| Email + password hash | `POST /api/auth/register` | `users` collection |
| User IDs | (auto-generoitu) | `users.id` (UUID) |
| Other info (nimimerkki, käyttäjätyypit, maa, jne.) | `PATCH /api/auth/profile` | `users` collection |
| In-app messages (audit) | `POST /api/messages/send` | `message_log` collection |
| Photos (profiilikuva) | `POST /api/uploads/profile-image` | GridFS bucket `profile_images` |
| Files (Fighter Card, Equipment Passport) | `POST /api/uploads/profile-doc` | GridFS bucket `profile_docs` |
| App interactions (RSVPt) | `POST /api/events/{id}/attend` | `event_attendance` collection |
| User-generated content (tapahtumailmoitukset) | `POST /api/events` | `events` collection |
| Crash logs (HTTP-lokit) | (Uvicorn / Nginx) | Server filesystem, 30-day retention |
| Device IDs (Expo push tokens) | `POST /api/users/me/push-token` | `users.expo_push_tokens[]` |

---

## Section 6 — Päivitysmuistutus

**Päivitä tämä asiakirja jos**:
- Lisäät Stripe-integraation → "Financial info → User payment info" muuttuu **Yes**, jaetaan Stripeen.
- Lisäät analytiikka-SDK:n (Firebase, Sentry) → "Diagnostics" muuttuu **Yes**.
- Pyydät käyttäjältä puhelinnumeron → "Phone number" muuttuu **Yes**.
- Tallennat sijainnin palvelimelle → "Location" muuttuu **Yes**.
- Lisäät kuvaviesti-/äänitiedosto-toiminnon → asianomainen kategoria muuttuu **Yes**.

> **Huom**: Play Consolen Data Safety -lomake on lain mukainen ilmoitus. Jos kerrottu poikkeaa todellisesta tiedonkeruusta, sovellus voidaan poistaa.
