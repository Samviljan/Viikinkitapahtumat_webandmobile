import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";

/**
 * Privacy Policy page — static, multilingual.
 *
 * Required by Google Play Store & GDPR.
 * Public URL: https://viikinkitapahtumat.fi/privacy
 *
 * The site/mobile app collects:
 *   - Account data (email, bcrypt password hash, nickname, role, user types,
 *     association, country, optional profile image, optional fighter card &
 *     equipment passport PDFs, consent flags, saved search) — only when the
 *     user voluntarily registers an account.
 *   - Browser/device location (only after explicit user grant; never sent to
 *     a server, used only locally for "near me" sorting).
 *   - Favorites (event IDs in localStorage on the user's device).
 *   - RSVP records (which events the user is attending + notification
 *     preferences) — server-stored.
 *   - Expo push tokens (mobile only, server-stored, used to deliver push
 *     notifications via Expo's push service).
 *   - Message log (audit trail of paid/announcement messages — sender id,
 *     event id, channel, recipient count; never recipients' emails).
 *   - Newsletter subscriber email + language (only if user opts in).
 *   - Server-side: standard request logs (IP, user-agent) for security/abuse
 *     protection, retained 30 days.
 *
 * No analytics, no third-party trackers, no advertising IDs.
 */

const SECTIONS = {
  fi: {
    eyebrow: "TIETOSUOJA",
    title: "Tietosuojakäytäntö",
    sub: "Selkeä yhteenveto siitä, mitä tietoja keräämme ja mihin niitä käytetään.",
    last_updated: "Päivitetty 28.4.2026",
    blocks: [
      {
        h: "1. Rekisterinpitäjä",
        p: [
          "Viikinkitapahtumat-palvelua (verkkosivu ja mobiilisovellus) ylläpitää Sami Viljanen, Suomi.",
          "Yhteydenotot tietosuoja-asioissa: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. Mitä tietoja keräämme",
        p: [
          "Palvelu on suunniteltu kunnioittamaan yksityisyyttäsi. Voit selata tapahtumakalenteria ilman kirjautumista. Käyttäjätiliä tarvitaan vain erikseen valittaviin lisätoimintoihin (RSVP, profiili, viestilähetys, push-muistutukset).",
        ],
        list: [
          "Käyttäjätili (vain rekisteröityessäsi) — sähköpostiosoite, bcrypt-hashattu salasana, nimimerkki, rooli (käyttäjä/admin), käyttäjätyypit (harrastaja, taistelija, kauppias, järjestäjä), valinnaisesti yhdistys/kilta, maa, kauppias-/järjestäjänimi sekä suostumusvalintasi (uutiskirje, järjestäjäviestit, kauppiastarjoukset).",
          "Profiilikuva (valinnainen) — ladattu kuva tallennetaan tietokantaan (GridFS). Voit vaihtaa tai poistaa sen profiilisivultasi milloin tahansa.",
          "SVTL-taistelijapassi ja varustepassi (valinnaiset PDF:t) — voit halutessasi ladata harrastukseesi liittyvät asiakirjat profiiliisi tunnistautumista varten tapahtumissa. Tiedostot näkyvät vain sinulle ja ylläpidolle. Tiedostot tallennetaan tietokantaan, eikä niitä jaeta kolmansille osapuolille.",
          "Tapahtumiin ilmoittautumiset (RSVP) — tallennamme palvelimelle minkä tapahtumien osallistujaksi olet merkinnyt itsesi ja minkä ilmoituskanavien kautta haluat saada muistutuksia (sähköposti, push).",
          "Push-laitetunnukset (vain mobiilisovellus) — kun sallit notifikaatiot, laitteesi rekisteröi anonyymin Expo-push-tokenin palvelimellemme. Käytämme sitä vain push-viestien lähettämiseen Expon push-palvelun kautta. Voit poistaa luvan laitteesi asetuksista, jolloin tokeni mitätöityy.",
          "Viestiloki — kun ylläpitäjä, järjestäjä tai kauppias lähettää viestin tapahtuman osallistujille, tallennamme auditointia varten viestin lähettäjän id:n, kohdetapahtuman, kanavan, viestin aiheen otteen sekä vastaanottajien lukumäärän. Vastaanottajien sähköpostiosoitteita ei tallenneta lokiin.",
          "Sijainti — vain selaimessa/laitteessa. Käyttäjä antaa erillisen luvan, jolloin laite näyttää lähimmät tapahtumat. Sijaintia ei lähetetä palvelimellemme eikä tallenneta.",
          "Suosikit — tallennetaan paikallisesti laitteen muistiin (localStorage / mobiilin oma välimuisti). Ei lähetetä palvelimelle.",
          "Uutiskirjeen tilaus — jos tilaat uutiskirjeen, tallennamme sähköpostiosoitteesi ja kielesi. Voit perua tilauksen milloin tahansa peruutuslinkillä.",
          "Yhteydenotot — jos lähetät viestin yhteydenottolomakkeen tai admin@-osoitteen kautta, viestisi sisältö ja sähköpostiosoitteesi käsitellään vastauksen antamiseksi.",
          "Tekniset lokit — palvelimemme tallentaa standardia HTTP-lokia (IP-osoite, selaintunnus, aika) väärinkäytösten estämiseksi. Lokit poistetaan 30 vuorokauden kuluttua.",
          "Salasanan palautus — kun pyydät salasanan palautuslinkkiä, luomme kertakäyttöisen tokenin, joka vanhenee 60 minuutissa. Tokeni poistetaan käytön jälkeen.",
        ],
      },
      {
        h: "3. Käyttötarkoitus ja oikeusperuste",
        list: [
          "Palvelun toiminnallisuus (tapahtumalistaus, suosikit, sijainti) — käyttäjän suostumus ja oikeutettu etu (palvelun tarjoaminen).",
          "Käyttäjätili, profiili ja RSVP — sopimuksen täytäntöönpano (tarjoamme valitsemiasi toimintoja) ja käyttäjän suostumus.",
          "Push-notifikaatiot ja sähköpostimuistutukset — käyttäjän nimenomainen suostumus, jonka voi peruuttaa milloin tahansa profiilista tai laitteen asetuksista.",
          "Viestit järjestäjiltä/kauppiailta — käyttäjän erillinen suostumus (consent_organizer_messages / consent_merchant_offers).",
          "Uutiskirje — käyttäjän suostumus, joka voidaan peruuttaa milloin tahansa.",
          "Tekniset lokit — oikeutettu etu (tietoturva ja väärinkäytösten estäminen).",
        ],
      },
      {
        h: "4. Kolmannet osapuolet",
        p: [
          "Käytämme seuraavia ulkopuolisia palveluntarjoajia, joilla on omat tietosuojakäytäntönsä:",
        ],
        list: [
          "MongoDB Atlas (tietokanta) — Yhdysvallat / EU. Säilyttää käyttäjätilit, RSVP-tiedot, profiilitiedostot (GridFS), tapahtumat ja uutiskirjetilaukset.",
          "Resend (sähköpostien lähetys) — käytetään uutiskirjeen, tapahtumamuistutusten ja salasananpalautusten toimittamiseen. Vastaanottajien sähköpostiosoitteet välitetään palveluun lähetyshetkellä.",
          "Expo Push Service (push-notifikaatiot, mobiili) — välittää push-viestit laitteellesi. Lähetämme palveluun ainoastaan Expo-push-tokenin sekä viestin sisällön. Expo on Yhdysvalloissa toimiva palvelu (https://expo.dev/privacy).",
          "Anthropic Claude / Google Gemini (kielimallit) — käytetään automaattisten käännösten ja tapahtumakuvien generointiin. Tapahtumatekstejä lähetetään käännöstä varten; käyttäjien yksityistietoja ei.",
          "Google Play / Apple App Store — sovelluskaupat. Hallinnoivat sovelluksen jakelua sekä keräävät omia diagnostiikkatietoja oman tietosuojakäytäntönsä mukaisesti.",
          "Emergent (alusta) — palvelinympäristö ja varmuuskopiointi.",
        ],
        p2: [
          "Emme jaa, myy emmekä vuokraa henkilötietoja kolmansille osapuolille markkinointitarkoituksiin.",
        ],
      },
      {
        h: "5. Säilytysaika",
        list: [
          "Käyttäjätili ja siihen liittyvät tiedot säilytetään niin kauan kuin tili on aktiivinen. Voit poistaa tilisi milloin tahansa profiilisivulta — tällöin sähköposti, salasanahash, profiilikuva, ladatut PDF-asiakirjat, RSVP-tiedot, push-tokenit, uutiskirjetilaus ja muistutusasetukset poistetaan välittömästi. Lähettämäsi viestit jäävät auditointilokiin ilman lähettäjäidentiteettiä (anonyymisoitu \"deleted_user\").",
          "Uutiskirjeen tilaajatiedot säilytetään niin kauan kuin tilaus on voimassa. Peruuttamisen jälkeen poistetaan 30 vuorokauden sisällä.",
          "Yhteydenottoviestit säilytetään korkeintaan 12 kuukautta.",
          "Tekniset lokit säilytetään 30 vuorokautta.",
          "Salasanan palautus-tokenit poistetaan 60 minuutin sisällä luomisesta tai välittömästi käytön jälkeen.",
          "Suosikit ja sijaintilupa säilyvät vain käyttäjän omalla laitteella, ja käyttäjä voi tyhjentää ne milloin tahansa selaimen / sovelluksen asetuksista.",
        ],
      },
      {
        h: "6. Käyttäjän oikeudet (GDPR)",
        list: [
          "Oikeus tarkastaa omat tietosi (näkyvillä profiilisivulla, lisäksi pyydettävissä sähköpostitse).",
          "Oikeus pyytää virheellisten tietojen oikaisua.",
          "Oikeus tietojen poistamiseen (ns. oikeus tulla unohdetuksi) — voit poistaa tilisi itse tai pyytää poistoa sähköpostitse.",
          "Oikeus rajoittaa tai vastustaa käsittelyä.",
          "Oikeus peruuttaa antamasi suostumukset milloin tahansa (uutiskirje, järjestäjäviestit, kauppiastarjoukset, push-notifikaatiot, sähköpostimuistutukset).",
          "Oikeus tehdä valitus tietosuojavaltuutetulle (Suomessa: tietosuoja.fi).",
        ],
        p2: [
          "Pyynnöt voi lähettää sähköpostitse osoitteeseen admin@viikinkitapahtumat.fi.",
        ],
      },
      {
        h: "7. Lasten yksityisyys",
        p: [
          "Palvelu ei ole suunnattu alle 13-vuotiaille emmekä tietoisesti kerää tietoja heistä. Jos huomaat että alaikäinen on lähettänyt henkilötietoja tai rekisteröinyt tilin, ota yhteyttä ja poistamme tiedot viipymättä.",
        ],
      },
      {
        h: "8. Tietoturva",
        p: [
          "Käytämme HTTPS-salausta kaikissa yhteyksissä. Käyttäjien salasanat tallennetaan vahvasti hashattuina (bcrypt) — pelkkää salasanaa ei koskaan tallenneta selväkielisenä. Auth-tokenit kuljetetaan httpOnly-evästeissä. Profiili-PDF-tiedostot ovat saatavilla vain niiden omistajille (ja ylläpidolle) tunnistautumisen jälkeen. Tietokanta ei ole julkisesti saavutettavissa.",
        ],
      },
      {
        h: "9. Muutokset käytäntöön",
        p: [
          "Saatamme päivittää tätä tietosuojakäytäntöä. Merkittävistä muutoksista ilmoitetaan etusivulla ja uutiskirjeessä. Päivityspäivämäärä näkyy sivun yläosassa.",
        ],
      },
    ],
  },

  en: {
    eyebrow: "PRIVACY",
    title: "Privacy Policy",
    sub: "A clear summary of what data we collect and how we use it.",
    last_updated: "Last updated 28 April 2026",
    blocks: [
      {
        h: "1. Controller",
        p: [
          "The Viikinkitapahtumat service (website and mobile app) is operated by Sami Viljanen, Finland.",
          "Privacy contact: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. What we collect",
        p: [
          "The service is designed to respect your privacy. You can browse the event calendar without an account. An account is only required for opt-in features such as RSVP, profile, messaging and push reminders.",
        ],
        list: [
          "Account data (only when you register) — email address, bcrypt-hashed password, nickname, role (user/admin), user types (reenactor, fighter, merchant, organizer), optionally guild/association, country, merchant/organizer name, and your consent choices (newsletter, organizer messages, merchant offers).",
          "Profile picture (optional) — uploaded image is stored in our database (GridFS). You can change or remove it from your profile page at any time.",
          "SVTL Fighter Card and Equipment Passport (optional PDFs) — you may upload hobby-related documents to your profile for identification at events. The files are visible only to you and to admins. Files are stored in our database and never shared with third parties.",
          "Event RSVPs — we store on the server which events you have marked yourself as attending and which notification channels you have opted in to (email, push).",
          "Push device tokens (mobile app only) — when you allow notifications, your device registers an anonymous Expo push token with our server. We use it only to deliver push messages via Expo's push service. Revoking permission in your device settings invalidates the token.",
          "Message log — when an admin, organizer or merchant sends a message to event attendees, we store an audit record (sender id, target event, channel, subject excerpt, recipient count) for accountability. Recipient email addresses are never stored in the log.",
          "Location — only on the device. Used locally to sort events by distance after explicit consent. Never sent to our servers.",
          "Favorites — stored locally on your device (localStorage / app cache). Never sent to our servers.",
          "Newsletter subscription — if you subscribe, we store your email and language. You can unsubscribe at any time via the link in every newsletter.",
          "Contact messages — when you use the contact form or email admin@, your message and email are processed to reply to you.",
          "Technical logs — our server records standard HTTP access logs (IP address, user agent, timestamp) for security and abuse prevention. Logs are deleted after 30 days.",
          "Password reset — when you request a reset link we generate a single-use token that expires in 60 minutes. The token is removed after use.",
        ],
      },
      {
        h: "3. Purposes and legal bases",
        list: [
          "Service functionality (event listing, favorites, location) — user consent and legitimate interest (providing the service).",
          "Account, profile and RSVP — performance of the contract (we provide the features you opted in to) and user consent.",
          "Push notifications and email reminders — explicit user consent, withdrawable at any time from your profile or device settings.",
          "Messages from organizers/merchants — separate user consent (consent_organizer_messages / consent_merchant_offers).",
          "Newsletter — user consent, withdrawable at any time.",
          "Technical logs — legitimate interest (security and abuse prevention).",
        ],
      },
      {
        h: "4. Third-party processors",
        p: ["We use the following external service providers, each with their own privacy policies:"],
        list: [
          "MongoDB Atlas (database) — US / EU. Stores user accounts, RSVP records, profile files (GridFS), events and newsletter subscriptions.",
          "Resend (email delivery) — used to send newsletter, event reminders and password resets. Recipient email addresses are passed at send time.",
          "Expo Push Service (mobile push) — delivers push messages to your device. We pass only the Expo push token and the message content. Expo is operated in the US (https://expo.dev/privacy).",
          "Anthropic Claude / Google Gemini (LLMs) — used to generate automatic translations and event imagery. Event text is sent for translation; no user-private data.",
          "Google Play / Apple App Store — app stores. They distribute the application and collect their own diagnostics under their respective privacy policies.",
          "Emergent (platform) — server hosting and backups.",
        ],
        p2: [
          "We do not sell, rent or share personal data with third parties for marketing purposes.",
        ],
      },
      {
        h: "5. Retention",
        list: [
          "Account data is kept while the account is active. You can delete your account at any time from the profile page — this immediately removes your email, password hash, profile picture, uploaded PDFs, RSVPs, push tokens, newsletter subscription and reminder settings. Messages you have sent remain in the audit log without sender identity (anonymised to \"deleted_user\").",
          "Newsletter subscriber data is kept while the subscription is active and deleted within 30 days of unsubscription.",
          "Contact messages are kept for at most 12 months.",
          "Technical logs are kept for 30 days.",
          "Password reset tokens are deleted within 60 minutes of issuance or immediately after use.",
          "Favorites and location consent live only on your device; you can clear them at any time from your browser or the app settings.",
        ],
      },
      {
        h: "6. Your rights (GDPR)",
        list: [
          "Right to access your data (visible on the profile page, also available by email request).",
          "Right to rectification of inaccurate data.",
          "Right to erasure (\"right to be forgotten\") — you can delete the account yourself or request deletion via email.",
          "Right to restrict or object to processing.",
          "Right to withdraw any consent at any time (newsletter, organizer messages, merchant offers, push notifications, email reminders).",
          "Right to lodge a complaint with the supervisory authority (in Finland: tietosuoja.fi).",
        ],
        p2: ["Requests can be sent to admin@viikinkitapahtumat.fi."],
      },
      {
        h: "7. Children",
        p: [
          "The service is not directed at children under 13 and we do not knowingly collect data about them. If you notice that a minor has submitted personal data or registered an account, please contact us and we will remove it without delay.",
        ],
      },
      {
        h: "8. Security",
        p: [
          "All connections use HTTPS encryption. User passwords are stored as strong hashes (bcrypt) — the plain password is never stored. Auth tokens are carried in httpOnly cookies. Profile PDFs are accessible only to their owners (and admins) after authentication. The database is not publicly accessible.",
        ],
      },
      {
        h: "9. Changes",
        p: [
          "We may update this Privacy Policy. Significant changes will be announced on the homepage and in the newsletter. The update date appears at the top of this page.",
        ],
      },
    ],
  },

  sv: {
    eyebrow: "INTEGRITET",
    title: "Integritetspolicy",
    sub: "En klar sammanfattning av vilka uppgifter vi samlar in och hur vi använder dem.",
    last_updated: "Uppdaterad 28 april 2026",
    blocks: [
      {
        h: "1. Personuppgiftsansvarig",
        p: [
          "Viikinkitapahtumat-tjänsten (webbplats och mobilapp) drivs av Sami Viljanen, Finland.",
          "Integritetskontakt: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. Vilka uppgifter vi samlar in",
        p: [
          "Tjänsten är utformad för att respektera din integritet. Du kan bläddra i evenemangskalendern utan konto. Konto krävs endast för valbara funktioner som RSVP, profil, meddelanden och push-påminnelser.",
        ],
        list: [
          "Kontodata (endast vid registrering) — e-postadress, bcrypt-hashat lösenord, smeknamn, roll (användare/admin), användartyper (återskapare, fightare, handlare, arrangör), eventuellt gille/förening, land, handlar-/arrangörsnamn samt dina samtycken (nyhetsbrev, arrangörsmeddelanden, handlartillbud).",
          "Profilbild (valfri) — uppladdad bild lagras i vår databas (GridFS). Du kan byta eller ta bort den från din profilsida när som helst.",
          "SVTL-fightarkort och utrustningspass (valfria PDF:er) — du kan ladda upp hobbyrelaterade dokument till din profil för identifiering vid evenemang. Filerna syns endast för dig och administratörer. Filerna lagras i vår databas och delas aldrig med tredje part.",
          "RSVP till evenemang — vi lagrar på servern vilka evenemang du anmält dig till och vilka aviseringskanaler (e-post, push) du valt.",
          "Push-enhets-tokens (endast mobilappen) — när du tillåter aviseringar registrerar din enhet en anonym Expo-push-token hos oss. Vi använder den endast för att skicka push-meddelanden via Expos push-tjänst. Återkallar du tillståndet i enhetsinställningarna ogiltigförklaras tokenen.",
          "Meddelandelogg — när en admin, arrangör eller handlare skickar ett meddelande till deltagare lagrar vi en granskningspost (avsändar-id, evenemang, kanal, ämnesutdrag, antal mottagare). Mottagarnas e-postadresser sparas aldrig i loggen.",
          "Plats — endast på enheten. Används lokalt för att sortera evenemang efter avstånd efter uttryckligt samtycke. Skickas aldrig till våra servrar.",
          "Favoriter — lagras lokalt på din enhet (localStorage / appens cache). Skickas aldrig till våra servrar.",
          "Nyhetsbrevsprenumeration — om du prenumererar lagrar vi din e-postadress och språk. Du kan när som helst säga upp prenumerationen via länken i varje nyhetsbrev.",
          "Kontaktmeddelanden — när du använder kontaktformuläret eller mejlar admin@ behandlas ditt meddelande och din e-post för att svara dig.",
          "Tekniska loggar — vår server registrerar standardloggar (IP-adress, useragent, tidsstämpel) för säkerhet. Raderas efter 30 dagar.",
          "Återställning av lösenord — när du begär en återställningslänk genererar vi en engångstoken som löper ut på 60 minuter. Tokenen tas bort efter användning.",
        ],
      },
      {
        h: "3. Syften och rättsliga grunder",
        list: [
          "Tjänstefunktioner (evenemangslistning, favoriter, plats) — användarens samtycke och berättigat intresse.",
          "Konto, profil och RSVP — fullgörande av avtal (vi tillhandahåller funktioner du valt) och användarens samtycke.",
          "Push-aviseringar och e-postpåminnelser — uttryckligt samtycke som kan återkallas när som helst.",
          "Meddelanden från arrangörer/handlare — separat samtycke (consent_organizer_messages / consent_merchant_offers).",
          "Nyhetsbrev — användarens samtycke, kan återkallas när som helst.",
          "Tekniska loggar — berättigat intresse (säkerhet och missbruksskydd).",
        ],
      },
      {
        h: "4. Tredje parter",
        p: ["Vi använder följande externa tjänsteleverantörer, var och en med egna integritetspolicyer:"],
        list: [
          "MongoDB Atlas (databas) — USA / EU. Lagrar användarkonton, RSVP, profilfiler (GridFS), evenemang och nyhetsbrevsprenumerationer.",
          "Resend (e-postleverans) — för nyhetsbrev, påminnelser och lösenordsåterställningar.",
          "Expo Push Service (mobil push) — levererar push-meddelanden till din enhet. Vi skickar endast Expo-push-tokenen och meddelandeinnehållet (https://expo.dev/privacy).",
          "Anthropic Claude / Google Gemini (språkmodeller) — automatiska översättningar och bilder. Endast evenemangstext skickas, inga privata användardata.",
          "Google Play / Apple App Store — appbutiker, distribuerar applikationen och samlar in egen diagnostik enligt sina policyer.",
          "Emergent (plattform) — serverdrift och säkerhetskopior.",
        ],
        p2: [
          "Vi säljer, hyr ut eller delar inte personuppgifter med tredje parter för marknadsföring.",
        ],
      },
      {
        h: "5. Lagringstid",
        list: [
          "Kontodata behålls medan kontot är aktivt. Du kan radera kontot själv från profilsidan — det raderar omedelbart e-post, lösenordshash, profilbild, uppladdade PDF:er, RSVP, push-tokens, nyhetsbrevsprenumeration och påminnelseinställningar. Meddelanden du skickat ligger kvar i granskningsloggen utan avsändaridentitet (anonymiserade till \"deleted_user\").",
          "Nyhetsbrevsprenumerantens uppgifter behålls så länge prenumerationen är aktiv och raderas inom 30 dagar efter avregistrering.",
          "Kontaktmeddelanden behålls i högst 12 månader.",
          "Tekniska loggar behålls i 30 dagar.",
          "Återställningstokens raderas inom 60 minuter eller direkt efter användning.",
          "Favoriter och platssamtycke finns endast på din egen enhet; du kan rensa dem när som helst.",
        ],
      },
      {
        h: "6. Dina rättigheter (GDPR)",
        list: [
          "Rätt att få tillgång till dina uppgifter (synliga på profilsidan, även tillgängliga på begäran).",
          "Rätt till rättelse av felaktiga uppgifter.",
          "Rätt till radering (\"rätten att bli glömd\") — du kan radera kontot själv eller begära radering via e-post.",
          "Rätt att begränsa eller invända mot behandling.",
          "Rätt att återkalla samtycken när som helst (nyhetsbrev, arrangörsmeddelanden, handlartillbud, push, e-postpåminnelser).",
          "Rätt att lämna klagomål till tillsynsmyndigheten (i Finland: tietosuoja.fi).",
        ],
        p2: ["Förfrågningar skickas till admin@viikinkitapahtumat.fi."],
      },
      {
        h: "7. Barns integritet",
        p: [
          "Tjänsten riktar sig inte till barn under 13 år och vi samlar inte medvetet in deras uppgifter. Om du ser att en minderårig har lämnat personuppgifter eller registrerat ett konto, kontakta oss så raderar vi uppgifterna utan dröjsmål.",
        ],
      },
      {
        h: "8. Säkerhet",
        p: [
          "Alla anslutningar använder HTTPS. Användarlösenord lagras starkt hashade (bcrypt) — klartextlösenord lagras aldrig. Auth-tokens transporteras i httpOnly-cookies. Profil-PDF:er är åtkomliga endast för ägaren (och administratörer) efter autentisering. Databasen är inte offentligt tillgänglig.",
        ],
      },
      {
        h: "9. Ändringar",
        p: [
          "Vi kan uppdatera denna policy. Väsentliga ändringar meddelas på startsidan och i nyhetsbrevet. Uppdateringsdatumet visas högst upp på sidan.",
        ],
      },
    ],
  },

  da: {
    eyebrow: "PRIVATLIV",
    title: "Privatlivspolitik",
    sub: "Et klart resumé af, hvilke data vi indsamler, og hvordan vi bruger dem.",
    last_updated: "Senest opdateret 28. april 2026",
    blocks: [
      {
        h: "1. Dataansvarlig",
        p: [
          "Viikinkitapahtumat-tjenesten (websted og mobilapp) drives af Sami Viljanen, Finland.",
          "Privatlivskontakt: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. Hvilke data vi indsamler",
        p: [
          "Tjenesten er designet til at respektere dit privatliv. Du kan gennemse begivenhedskalenderen uden konto. En konto er kun nødvendig for valgfrie funktioner som RSVP, profil, meddelelser og push-påmindelser.",
        ],
        list: [
          "Kontodata (kun ved registrering) — e-mailadresse, bcrypt-hashet adgangskode, kaldenavn, rolle, brugertyper (genskaber, fighter, handlende, arrangør), eventuelt laug/forening, land, handlende-/arrangørnavn samt dine samtykker.",
          "Profilbillede (valgfrit) — uploadet billede gemmes i vores database (GridFS). Du kan udskifte eller fjerne det når som helst.",
          "SVTL-fighterkort og udstyrspas (valgfri PDF'er) — du kan uploade hobbyrelaterede dokumenter til din profil til identifikation. Filerne er kun synlige for dig og administratorer.",
          "RSVP til begivenheder — vi gemmer hvilke begivenheder du har tilmeldt dig, og hvilke notifikationskanaler (e-mail, push) du har valgt.",
          "Push-enheds-tokens (kun mobilapp) — når du tillader notifikationer, registrerer din enhed et anonymt Expo-push-token. Vi bruger det kun til at levere push-beskeder via Expos push-tjeneste.",
          "Meddelelseslog — når en admin, arrangør eller handlende sender en besked, gemmer vi en revisionspost (afsender-id, begivenhed, kanal, emneuddrag, modtagerantal). Modtagernes e-mails gemmes aldrig i loggen.",
          "Lokation — kun på enheden. Bruges lokalt til at sortere begivenheder efter afstand efter udtrykkeligt samtykke. Sendes aldrig til vores servere.",
          "Favoritter — gemmes lokalt på din enhed. Sendes aldrig til vores servere.",
          "Nyhedsbrevsabonnement — hvis du tilmelder dig, gemmer vi din e-mail og dit sprog. Du kan afmelde dig når som helst.",
          "Kontaktmeddelelser — behandles for at besvare dig.",
          "Tekniske logs — IP-adresse, browseragent, tidsstempel. Slettes efter 30 dage.",
          "Adgangskode-nulstilling — engangstoken med 60 minutters udløb.",
        ],
      },
      {
        h: "3. Formål og retsgrundlag",
        list: [
          "Tjenestefunktionalitet — brugerens samtykke og legitim interesse.",
          "Konto, profil og RSVP — opfyldelse af kontrakt og samtykke.",
          "Push og e-mail-påmindelser — udtrykkeligt samtykke, kan tilbagekaldes til enhver tid.",
          "Beskeder fra arrangører/handlende — separat samtykke.",
          "Nyhedsbrev — samtykke, kan tilbagekaldes til enhver tid.",
          "Tekniske logs — legitim interesse (sikkerhed og misbrugsforebyggelse).",
        ],
      },
      {
        h: "4. Tredjeparter",
        p: ["Vi bruger følgende eksterne tjenesteudbydere, hver med deres egne privatlivspolitikker:"],
        list: [
          "MongoDB Atlas (database) — USA / EU.",
          "Resend (e-maillevering) — nyhedsbrev, påmindelser, adgangskode-nulstillinger.",
          "Expo Push Service (mobil push) — vi sender kun Expo-push-tokenet og beskedindholdet (https://expo.dev/privacy).",
          "Anthropic Claude / Google Gemini (sprogmodeller) — automatiske oversættelser og billeder. Kun begivenhedstekst sendes; ingen private brugerdata.",
          "Google Play / Apple App Store — appbutikker.",
          "Emergent (platform) — hosting og backup.",
        ],
        p2: [
          "Vi sælger, udlejer eller deler ikke personoplysninger med tredjeparter til marketingformål.",
        ],
      },
      {
        h: "5. Opbevaring",
        list: [
          "Kontodata opbevares så længe kontoen er aktiv. Du kan slette kontoen selv — alt slettes straks. Sendte beskeder forbliver i revisionsloggen uden afsenderidentitet (\"deleted_user\").",
          "Nyhedsbrevsdata slettes inden for 30 dage efter afmelding.",
          "Kontaktmeddelelser opbevares højst 12 måneder.",
          "Tekniske logs opbevares i 30 dage.",
          "Nulstillingstokens slettes inden for 60 minutter eller umiddelbart efter brug.",
          "Favoritter og lokationssamtykke findes kun på din enhed.",
        ],
      },
      {
        h: "6. Dine rettigheder (GDPR)",
        list: [
          "Ret til at få adgang til dine data.",
          "Ret til berigtigelse af unøjagtige data.",
          "Ret til sletning (\"retten til at blive glemt\").",
          "Ret til at begrænse eller gøre indsigelse mod behandling.",
          "Ret til at tilbagekalde samtykker til enhver tid.",
          "Ret til at indgive klage til tilsynsmyndigheden.",
        ],
        p2: ["Anmodninger kan sendes til admin@viikinkitapahtumat.fi."],
      },
      {
        h: "7. Børn",
        p: [
          "Tjenesten er ikke rettet mod børn under 13 år, og vi indsamler ikke bevidst data om dem.",
        ],
      },
      {
        h: "8. Sikkerhed",
        p: [
          "Alle forbindelser bruger HTTPS. Adgangskoder gemmes stærkt hashede (bcrypt). Profil-PDF'er er kun tilgængelige for ejeren og administratorer efter autentificering.",
        ],
      },
      {
        h: "9. Ændringer",
        p: [
          "Vi kan opdatere denne politik. Væsentlige ændringer annonceres på forsiden og i nyhedsbrevet.",
        ],
      },
    ],
  },

  de: {
    eyebrow: "DATENSCHUTZ",
    title: "Datenschutzerklärung",
    sub: "Eine klare Zusammenfassung darüber, welche Daten wir erheben und wie wir sie verwenden.",
    last_updated: "Zuletzt aktualisiert am 28. April 2026",
    blocks: [
      {
        h: "1. Verantwortlicher",
        p: [
          "Der Dienst Viikinkitapahtumat (Website und mobile App) wird von Sami Viljanen, Finnland, betrieben.",
          "Datenschutz-Kontakt: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. Welche Daten wir erheben",
        p: [
          "Der Dienst respektiert Ihre Privatsphäre. Sie können den Veranstaltungskalender ohne Konto durchsuchen. Ein Konto ist nur für Opt-in-Funktionen wie RSVP, Profil, Nachrichten und Push-Erinnerungen erforderlich.",
        ],
        list: [
          "Kontodaten (nur bei Registrierung) — E-Mail-Adresse, bcrypt-gehashtes Passwort, Spitzname, Rolle, Benutzertypen (Reenactor, Kämpfer, Händler, Veranstalter), optional Gilde/Verein, Land, Händler-/Veranstaltername sowie Ihre Einwilligungen.",
          "Profilbild (optional) — hochgeladenes Bild wird in unserer Datenbank (GridFS) gespeichert. Sie können es jederzeit ändern oder entfernen.",
          "SVTL-Kämpferkarte und Ausrüstungspass (optionale PDFs) — Sie können hobbybezogene Dokumente zur Identifikation hochladen. Die Dateien sind nur für Sie und Administratoren sichtbar.",
          "Veranstaltungs-RSVPs — wir speichern, welche Veranstaltungen Sie besuchen und welche Benachrichtigungskanäle (E-Mail, Push) Sie gewählt haben.",
          "Push-Geräte-Tokens (nur mobile App) — wenn Sie Benachrichtigungen erlauben, registriert Ihr Gerät ein anonymes Expo-Push-Token bei uns. Wir verwenden es nur zur Zustellung von Push-Nachrichten über den Expo-Push-Dienst.",
          "Nachrichtenprotokoll — wenn ein Admin, Veranstalter oder Händler eine Nachricht sendet, speichern wir einen Auditeintrag (Absender-ID, Veranstaltung, Kanal, Betreff-Auszug, Empfängeranzahl). E-Mail-Adressen der Empfänger werden nie im Protokoll gespeichert.",
          "Standort — nur auf dem Gerät. Wird nach ausdrücklicher Einwilligung lokal zur Sortierung nach Entfernung verwendet. Wird nie an unsere Server gesendet.",
          "Favoriten — lokal auf Ihrem Gerät gespeichert. Wird nie an unsere Server gesendet.",
          "Newsletter-Abonnement — wenn Sie abonnieren, speichern wir Ihre E-Mail-Adresse und Sprache. Sie können sich jederzeit abmelden.",
          "Kontaktnachrichten — werden zur Beantwortung verarbeitet.",
          "Technische Logs — IP-Adresse, Useragent, Zeitstempel. Werden nach 30 Tagen gelöscht.",
          "Passwort-Reset — Einmal-Token mit 60 Minuten Gültigkeit.",
        ],
      },
      {
        h: "3. Zwecke und Rechtsgrundlagen",
        list: [
          "Dienstfunktionalität — Einwilligung des Nutzers und berechtigtes Interesse.",
          "Konto, Profil und RSVP — Vertragserfüllung und Einwilligung.",
          "Push-Benachrichtigungen und E-Mail-Erinnerungen — ausdrückliche Einwilligung, jederzeit widerruflich.",
          "Nachrichten von Veranstaltern/Händlern — separate Einwilligung.",
          "Newsletter — Einwilligung, jederzeit widerruflich.",
          "Technische Logs — berechtigtes Interesse (Sicherheit).",
        ],
      },
      {
        h: "4. Drittanbieter",
        p: ["Wir nutzen folgende externe Dienstleister mit jeweils eigenen Datenschutzrichtlinien:"],
        list: [
          "MongoDB Atlas (Datenbank) — USA / EU.",
          "Resend (E-Mail-Versand) — Newsletter, Erinnerungen, Passwort-Resets.",
          "Expo Push Service (mobiler Push) — wir senden nur das Expo-Push-Token und den Nachrichteninhalt (https://expo.dev/privacy).",
          "Anthropic Claude / Google Gemini (Sprachmodelle) — automatische Übersetzungen und Bilder. Nur Veranstaltungstext wird gesendet; keine privaten Nutzerdaten.",
          "Google Play / Apple App Store — App-Stores.",
          "Emergent (Plattform) — Serverbetrieb und Backups.",
        ],
        p2: [
          "Wir verkaufen, vermieten oder teilen personenbezogene Daten nicht zu Marketingzwecken mit Dritten.",
        ],
      },
      {
        h: "5. Aufbewahrung",
        list: [
          "Kontodaten werden gespeichert, solange das Konto aktiv ist. Sie können das Konto jederzeit selbst löschen — alles wird sofort entfernt. Versendete Nachrichten verbleiben ohne Absenderidentität im Auditprotokoll (\"deleted_user\").",
          "Newsletter-Daten werden nach Abmeldung innerhalb von 30 Tagen gelöscht.",
          "Kontaktnachrichten werden höchstens 12 Monate aufbewahrt.",
          "Technische Logs werden 30 Tage aufbewahrt.",
          "Reset-Tokens werden innerhalb von 60 Minuten oder unmittelbar nach Verwendung gelöscht.",
          "Favoriten und Standort-Einwilligung verbleiben nur auf Ihrem Gerät.",
        ],
      },
      {
        h: "6. Ihre Rechte (DSGVO)",
        list: [
          "Recht auf Auskunft.",
          "Recht auf Berichtigung.",
          "Recht auf Löschung (\"Recht auf Vergessenwerden\").",
          "Recht auf Einschränkung oder Widerspruch.",
          "Recht auf Widerruf von Einwilligungen jederzeit.",
          "Recht auf Beschwerde bei der Aufsichtsbehörde.",
        ],
        p2: ["Anfragen an admin@viikinkitapahtumat.fi."],
      },
      {
        h: "7. Kinder",
        p: [
          "Der Dienst richtet sich nicht an Kinder unter 13 Jahren, und wir erheben wissentlich keine Daten von ihnen.",
        ],
      },
      {
        h: "8. Sicherheit",
        p: [
          "Alle Verbindungen verwenden HTTPS. Passwörter werden stark gehasht (bcrypt) gespeichert. Profil-PDFs sind nur für Eigentümer und Administratoren nach Authentifizierung zugänglich.",
        ],
      },
      {
        h: "9. Änderungen",
        p: [
          "Wir können diese Richtlinie aktualisieren. Wesentliche Änderungen werden auf der Startseite und im Newsletter angekündigt.",
        ],
      },
    ],
  },
};

// Estonian + Polish fall back to English (Play Store only requires the country's primary
// language; Estonia/Poland users will still see a complete policy in EN.)
SECTIONS.et = SECTIONS.en;
SECTIONS.pl = SECTIONS.en;

export default function Privacy() {
  const { lang } = useI18n();
  const data = SECTIONS[lang] || SECTIONS.fi;

  return (
    <>
      <PageHero eyebrow={data.eyebrow} title={data.title} sub={data.sub} />
      <section
        className="mx-auto max-w-3xl px-4 sm:px-8 py-12 space-y-8"
        data-testid="privacy-page"
      >
        <p className="text-xs text-viking-stone uppercase tracking-[0.2em]">
          {data.last_updated}
        </p>
        {data.blocks.map((b, i) => (
          <section key={b.h || `block-${i}`} className="space-y-3">
            <h2 className="font-serif text-2xl text-viking-bone">{b.h}</h2>
            {b.p?.map((para, j) => (
              <p
                key={`${b.h}-p-${j}`}
                className="text-base text-viking-stone leading-relaxed"
              >
                {para}
              </p>
            ))}
            {b.list ? (
              <ul className="list-disc pl-6 space-y-1.5 text-base text-viking-stone leading-relaxed marker:text-viking-gold">
                {b.list.map((it, j) => (
                  <li key={`l-${j}`}>{it}</li>
                ))}
              </ul>
            ) : null}
            {b.p2?.map((para, j) => (
              <p
                key={`p2-${j}`}
                className="text-base text-viking-stone leading-relaxed"
              >
                {para}
              </p>
            ))}
          </section>
        ))}
      </section>
    </>
  );
}
