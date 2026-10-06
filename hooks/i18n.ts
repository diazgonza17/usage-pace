export type Language = 'es' | 'en'

export type Strings = {
  used: string
  doingGood: string
  lookOut: (wait: string) => string
  burning: (wait: string) => string
  limit: string
  expected: string
  reset: string
  stale: string
  weekUsed: (reset: string) => string
  weekExpected: string
  weekStale: string
}

export const STRINGS: Record<Language, Strings> = {
  es: {
    used: 'Usado de la sesión de 5 horas',
    doingGood: 'venís bien',
    lookOut: wait => `cuidado (aflojá por ${wait})`,
    burning: wait => `estás quemando tokens! (pisá el freno por ${wait})`,
    limit: 'límite alcanzado',
    expected: 'Lo que correspondería haber usado a esta altura',
    reset: 'Tiempo hasta que se reinicie la sesión',
    stale: 'La sesión se reinició; se actualiza con la próxima respuesta',
    weekUsed: reset => `Usado de la semana, se reinicia en ${reset}`,
    weekExpected: 'Lo que correspondería haber usado esta semana',
    weekStale: 'La semana se reinició; se actualiza con la próxima respuesta',
  },
  en: {
    used: 'Used of the 5-hour session',
    doingGood: 'doing good',
    lookOut: wait => `look out (slow down for ${wait})`,
    burning: wait => `you're burning tokens! (press the brakes for ${wait})`,
    limit: 'limit reached',
    expected: 'What you should have used by now',
    reset: 'Time until the session resets',
    stale: 'The session reset; it updates with the next response',
    weekUsed: reset => `Used this week, resets in ${reset}`,
    weekExpected: 'What you should have used this week by now',
    weekStale: 'The week reset; it updates with the next response',
  },
}

// The `language` option, Spanish when unset or unknown.
export const toLanguage = (value: unknown): Language => (value === 'en' ? 'en' : 'es')
