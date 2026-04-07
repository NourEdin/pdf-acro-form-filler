export type Branch = 'local' | 'international'

export type VisibleWhen = 'always' | 'local' | 'international'

/** Canonical AcroForm field names follow Salalah Beach [international] order */
export type FormValues = Record<string, string>
