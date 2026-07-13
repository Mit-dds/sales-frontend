import type { Project } from '@/types'

const TOWNHOUSE_POINTS: Record<string, string[]> = {
  default: [
    'Spacious townhouse with private garden and dedicated parking',
    'Family-friendly community with parks and playgrounds',
    'High ROI potential with strong rental demand in the area',
    'Contemporary design with premium fit-out and finishes',
    'Clubhouse, pool, gym, and 24/7 security included',
  ],
  Dubai: [
    'Prime Dubailand location with easy access to major highways',
    'Close to Dubai Hills Estate, Dubai Marina, and Downtown',
    'Community featuring landscaped gardens and running tracks',
    'Expected capital appreciation of 8-12% annually',
    'Flexible payment plan with 80/20 or 70/30 structure',
    'Low service charges compared to similar communities',
  ],
  'Dubai Creek': [
    'Waterfront living along the historic Dubai Creek',
    'Scenic views with promenade and waterfront dining',
    'Strong tourism-driven rental demand year-round',
    'Integrated retail, dining, and leisure facilities',
    'Proximity to Dubai International Airport and Metro',
  ],
  'Business Bay': [
    'Strategic location in the heart of Dubai\'s business district',
    'Walking distance to Burj Khalifa and Dubai Mall',
    'Executive apartments with premium business facilities',
    '24/7 concierge and dedicated business center',
    'High rental yields of 8-10% for studio and 1BR units',
  ],
  'Dubai South': [
    'Master-planned community near Al Maktoum International Airport',
    'Future Expo City district with world-class infrastructure',
    'Affordable pricing with attractive payment plans',
    'Expected capital appreciation linked to airport expansion',
    'Family-oriented community with schools and medical facilities',
  ],
}

function pick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function generateWhyBuyPoints(project: Project): string[] {
  const locationKey = Object.keys(TOWNHOUSE_POINTS).find((k) =>
    project.location.toLowerCase().includes(k.toLowerCase())
  ) || 'default'

  const locationPoints = TOWNHOUSE_POINTS[locationKey] || TOWNHOUSE_POINTS.default

  if (project.type === 'Townhouses') {
    return pick([...TOWNHOUSE_POINTS.default, ...locationPoints], 5)
  }

  const APARTMENT_POINTS = [
    `Prime ${project.location} location with excellent connectivity`,
    ...(locationPoints.filter((p) => !p.toLowerCase().includes('townhouse'))),
    'Panoramic city skyline and landmark views from upper floors',
    'Resort-style amenities: pool, gym, spa, and kids\' play area',
    'Smart home features with integrated automation system',
    '24/7 security with CCTV and access control system',
    'High-quality finishes with branded kitchen and bathroom fittings',
    'Rooftop infinity pool and lounge with city views',
    'Dedicated parking and storage unit included',
    'Low cooling and service charges for efficient living',
  ]

  if (project.completionDate) {
    const compYear = parseInt(project.completionDate.replace(/[^0-9]/g, '').slice(0, 4)) || 0
    if (compYear > 0) {
      APARTMENT_POINTS.push(
        compYear <= 2026
          ? 'Ready to move in — immediate handover available'
          : `Expected completion in ${compYear} with phased handover`
      )
    }
  }

  return pick(APARTMENT_POINTS, 5)
}
