/**
 * Shared marketing-consent strings.
 *
 * The wording here MUST match the equivalent constants in the mobile app
 * (`/app/mobile/src/lib/consents.ts`). When updating one, update both.
 *
 * Both consents are strictly opt-in (off by default) and only authorise
 * communication about events the user has marked as attending.
 */
export const CONSENT_KEYS = ["consent_organizer_messages", "consent_merchant_offers"];

export const CONSENT_TEXTS = {
  fi: {
    section_title: "Viestit osallistumistasi tapahtumista",
    section_help:
      "Saat viestejä vain niistä tapahtumista, joihin olet merkinnyt osallistuvasi. Voit muuttaa valintoja milloin tahansa profiilissa.",
    consent_organizer_messages:
      "Haluan vastaanottaa tapahtumajärjestäjiltä tietoa tapahtumista, joihin olen merkinnyt osallistuvani — push-viesteinä tai sähköpostiin.",
    consent_merchant_offers:
      "Haluan vastaanottaa kauppiailta tarjouksia ja erikoiskampanjoita osallistumistani tapahtumista — push-viesteinä tai sähköpostiin.",
  },
  en: {
    section_title: "Messages about events you attend",
    section_help:
      "You'll only receive messages about events you've marked as attending. You can change these preferences any time in your profile.",
    consent_organizer_messages:
      "I want to receive information from event organizers about events I've marked as attending — by push notification or email.",
    consent_merchant_offers:
      "I want to receive offers and special campaigns from merchants about events I've marked as attending — by push notification or email.",
  },
  sv: {
    section_title: "Meddelanden om evenemang du deltar i",
    section_help:
      "Du får endast meddelanden om evenemang du markerat att du deltar i. Du kan ändra inställningarna när som helst i din profil.",
    consent_organizer_messages:
      "Jag vill ta emot information från evenemangsarrangörer om evenemang jag markerat att jag deltar i — som push-meddelande eller e-post.",
    consent_merchant_offers:
      "Jag vill ta emot erbjudanden och specialkampanjer från handelsmän om evenemang jag markerat att jag deltar i — som push-meddelande eller e-post.",
  },
};

export function getConsentTexts(lang) {
  return CONSENT_TEXTS[lang] || CONSENT_TEXTS.en;
}
