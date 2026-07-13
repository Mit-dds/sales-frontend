export function normCity(s: string): string {
  const l = (s || '').toLowerCase().trim()
  if (l.indexOf('brabus') >= 0) return 'brabus'
  if (l.indexOf('abu dhabi') >= 0 || l.indexOf('abudhabi') >= 0) return 'abudhabi'
  if (l.indexOf('dubai') >= 0) return 'dubai'
  return l.replace(/\s/g, '')
}

export function lev(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const d: number[][] = []
  for (let i = 0; i <= a.length; i++) { d[i] = [i] }
  for (let j = 1; j <= b.length; j++) { d[0][j] = j }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])
    }
  }
  return d[a.length][b.length]
}

export function fuzzyWordMatch(a: string, b: string): boolean {
  const aw = a.match(/[a-z]+|[0-9]+/g) || []
  const bw = b.match(/[a-z]+|[0-9]+/g) || []
  if (aw.length !== bw.length) return false
  return aw.every((w, i) => {
    const d = lev(w, bw[i])
    if (/^[0-9]+$/.test(w)) return w === bw[i]
    return d === 0 || (d === 1 && w.length >= 4)
  })
}

export function normSuffix(s: string): string {
  s = s.replace(/residences$/, 'residence').replace(/residenc$/, 'residence')
  s = s.replace(/([a-z]{4,})res$/, (_, p: string) => p + 'residence')
  s = s.replace(/towers$/, 'tower').replace(/villas$/, 'villa')
  s = s.replace(/phases$/, 'phase').replace(/blocks$/, 'block')
  if (s.length > 4) s = s.replace(/s$/, '')
  return s
}

export interface ProjectMatch {
  id: string
  name: string
  location: string
}

export function matchProject(
  cityNorm: string,
  projectName: string,
  projects: ProjectMatch[],
): ProjectMatch | null {
  const pNorm = (projectName || '').toLowerCase().replace(/[\s\-.]/g, '')
  return projects.find((p) => {
    const appCity = normCity(p.location)
    const appName = p.name.toLowerCase().replace(/[\s\-.]/g, '')

    const cityMatch = appCity === cityNorm ||
      (cityNorm === 'abudhabi' && (appCity.indexOf('adm') >= 0 || appCity.indexOf('adgm') >= 0 || appCity.indexOf('brabus') >= 0 || appCity.indexOf('abu') >= 0)) ||
      (cityNorm === 'brabus' && (appCity.indexOf('brabus') >= 0 || appCity.indexOf('abu') >= 0)) ||
      (cityNorm === 'dubai' && appCity === 'dubai') ||
      cityNorm === ''

    const appStrip = appName.replace(/[^a-z0-9]/g, '')
    const pStrip = pNorm.replace(/[^a-z0-9]/g, '')

    const appIsTH = appStrip.indexOf('townhouse') >= 0 || appStrip.slice(-2) === 'th' || appStrip.indexOf('villa') >= 0
    const pIsTH = pStrip.indexOf('townhouse') >= 0 || pStrip.slice(-2) === 'th' || pStrip.indexOf('villa') >= 0
    const thConflict = appIsTH !== pIsTH

    const appFuzz = normSuffix(appStrip)
    const pFuzz = normSuffix(pStrip)

    const nameMatch = !thConflict && (
      appStrip === pStrip ||
      appFuzz === pFuzz ||
      fuzzyWordMatch(appFuzz, pFuzz)
    )

    return cityMatch && nameMatch
  }) ?? null
}
