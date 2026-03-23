// Détection automatique du transporteur + appel API 17TRACK

export type Transporteur = {
  code: string
  nom: string
  urlSuivi: (numero: string) => string
}

const TRANSPORTEURS: Transporteur[] = [
  {
    code: 'ups',
    nom: 'UPS',
    urlSuivi: (n) => `https://www.ups.com/track?tracknum=${n}`,
  },
  {
    code: 'dhl',
    nom: 'DHL',
    urlSuivi: (n) => `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`,
  },
  {
    code: 'fedex',
    nom: 'FedEx',
    urlSuivi: (n) => `https://www.fedex.com/apps/fedextrack/?tracknumbers=${n}`,
  },
  {
    code: 'chronopost',
    nom: 'Chronopost',
    urlSuivi: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${n}`,
  },
  {
    code: 'colissimo',
    nom: 'Colissimo',
    urlSuivi: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${n}`,
  },
  {
    code: 'gls',
    nom: 'GLS',
    urlSuivi: (n) => `https://gls-group.com/track/${n}`,
  },
  {
    code: 'mondial_relay',
    nom: 'Mondial Relay',
    urlSuivi: (n) => `https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=${n}`,
  },
  {
    code: 'laposte',
    nom: 'La Poste',
    urlSuivi: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${n}`,
  },
]

export function detecterTransporteur(numero: string): Transporteur {
  const n = numero.trim().toUpperCase()

  // UPS: commence par 1Z + 16 chars alphanumériques
  if (/^1Z[A-Z0-9]{16}$/.test(n)) return TRANSPORTEURS.find(t => t.code === 'ups')!

  // FedEx: 12, 15 ou 20 chiffres
  if (/^\d{12}$/.test(n) || /^\d{15}$/.test(n) || /^\d{20}$/.test(n)) return TRANSPORTEURS.find(t => t.code === 'fedex')!

  // DHL: 10-11 chiffres ou format JD + chiffres
  if (/^JD\d{18}$/.test(n) || /^\d{10}$/.test(n)) return TRANSPORTEURS.find(t => t.code === 'dhl')!

  // Chronopost: XK + 9 chiffres + 2 lettres ou CP + chiffres
  if (/^(XK|CP|CY|CN)\d{9}[A-Z]{2}$/.test(n)) return TRANSPORTEURS.find(t => t.code === 'chronopost')!

  // Colissimo: préfixes La Poste
  if (/^(8[RQ]|6[ABCDLMNOPQRV]|RR|CW|RC|CV|CB|CO|LA|LB|LD|LH|LK|LU|LV|LX|LY|OA|OB|OC|OD|OE|OF|OG|OH|OI|OJ)\d{9}FR$/i.test(n)) {
    return TRANSPORTEURS.find(t => t.code === 'colissimo')!
  }

  // Mondial Relay: 8 chiffres
  if (/^\d{8}$/.test(n)) return TRANSPORTEURS.find(t => t.code === 'mondial_relay')!

  // GLS: 11 chiffres commençant par certains préfixes
  if (/^[0-9]{11}$/.test(n)) return TRANSPORTEURS.find(t => t.code === 'gls')!

  // Par défaut: La Poste / Colissimo
  return TRANSPORTEURS.find(t => t.code === 'laposte')!
}

// --- API 17TRACK ---

export type EtapeTracking = {
  date: string
  lieu: string
  statut: string
}

export type ResultatTracking = {
  transporteur: Transporteur
  statut: string // ex: "En transit", "Livré", "En attente"
  derniereMaj: string | null
  etapes: EtapeTracking[]
  erreur?: string
}

const STATUTS_17TRACK: Record<number, string> = {
  0: 'En attente',
  10: 'Pris en charge',
  20: 'En transit',
  30: 'Livré',
  35: 'Livré (non confirmé)',
  40: 'Retour expéditeur',
  50: 'Problème',
  60: 'Expiré',
}

export async function getTrackingInfo(numero: string): Promise<ResultatTracking> {
  const transporteur = detecterTransporteur(numero)
  const apiKey = process.env.TRACK17_API_KEY

  if (!apiKey) {
    return {
      transporteur,
      statut: 'API non configurée',
      derniereMaj: null,
      etapes: [],
      erreur: 'Clé API 17TRACK manquante (TRACK17_API_KEY)',
    }
  }

  try {
    const res = await fetch('https://api.17track.net/track/v2/gettrackinfo', {
      method: 'POST',
      headers: {
        '17token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ number: numero }]),
      next: { revalidate: 300 }, // cache 5 min
    })

    if (!res.ok) throw new Error(`17TRACK API error: ${res.status}`)

    const data = await res.json()
    const item = data?.data?.accepted?.[0]

    if (!item) {
      return {
        transporteur,
        statut: 'Numéro non trouvé',
        derniereMaj: null,
        etapes: [],
      }
    }

    const trackInfo = item.track
    const statutCode = trackInfo?.e ?? 0
    const etapesRaw = trackInfo?.z1 ?? []

    const etapes: EtapeTracking[] = etapesRaw.slice(0, 8).map((e: { a: string; c: string; z: string }) => ({
      date: e.a ?? '',
      lieu: e.c ?? '',
      statut: e.z ?? '',
    }))

    return {
      transporteur,
      statut: STATUTS_17TRACK[statutCode] ?? 'Inconnu',
      derniereMaj: etapes[0]?.date ?? null,
      etapes,
    }
  } catch {
    return {
      transporteur,
      statut: 'Erreur',
      derniereMaj: null,
      etapes: [],
      erreur: 'Impossible de récupérer le tracking',
    }
  }
}
