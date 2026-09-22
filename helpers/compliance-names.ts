/**
 * Names of the bodies the compliance surfaces must point players at.
 *
 * Every name here comes from the active jurisdiction profile in the app
 * (`packages/jurisdiction/src/<id>.ts`), so it changes with the build: the
 * licensed Swedish build names Stödlinjen and Spelpaus, the bot legislation
 * build scrubs them to "DEMO Helpline" and "DEMO Self-Exclusion". Tests match
 * either rather than one build's copy — and when a profile is renamed again,
 * this file is the only place to update.
 */

/** The gambling helpline: SE "Stödlinjen" / 020-819 100, bot "DEMO Helpline". */
export const HELPLINE_NAME = /stödlinjen|020.819|demo helpline/i;

/** The self-exclusion register: SE "Spelpaus", bot "DEMO Self-Exclusion". */
export const SELF_EXCLUSION_NAME = /spelpaus|demo self-exclusion/i;

/**
 * The open-ended exclusion period. The label carries the re-registration
 * minimum when the profile sets one ("Until further notice (minimum 12
 * months)"), and drops it when the profile does not (bot).
 */
export const INDEFINITE_PERIOD = /indefinite|permanent|tills vidare|until further notice/i;
