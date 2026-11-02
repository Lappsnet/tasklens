/* V6 seeded demo data for role dashboards. Everything here is labelled
   "Demo" in the UI; real jobs from Supabase replace it row by row. Money in
   USD; geography is San Salvador, SV. */

export const DEMO = true;

export const demoSpendYear = [42, 68, 55, 90, 74, 120, 98, 140, 110, 160, 132, 188];

export const demoEarningsWeek = [180, 240, 210, 320, 290, 410, 380];

export const demoEarningsByWeek = { values: [820, 960, 740, 1120], labels: ["W1", "W2", "W3", "W4"] };

export const demoTrust = { value: 0.94, jobs: 132, rating: 4.9, onTime: 0.97 };

export interface RouteStop { id: string; label: string; time: string; lat: number; lng: number }

export const demoRoute: RouteStop[] = [
  { id: "r1", label: "Col. Escalón — faucet", time: "8:30", lat: 13.7056, lng: -89.2421 },
  { id: "r2", label: "Santa Tecla — panel", time: "11:00", lat: 13.6769, lng: -89.2798 },
  { id: "r3", label: "Soyapango — outlet", time: "14:00", lat: 13.7102, lng: -89.1344 },
];

export interface JobRequest { id: string; title: string; price: number; distanceKm: number; photo: string }

export const demoRequests: JobRequest[] = [
  { id: "q1", title: "Tomacorriente derretido", price: 170, distanceKm: 3.2, photo: "/images/showcase/tomacorriente-derretido.webp" },
  { id: "q2", title: "Grifo de cocina dañado", price: 95, distanceKm: 5.8, photo: "/images/showcase/grifo-cocina-danado.webp" },
  { id: "q3", title: "Puerta dañada (chapa)", price: 120, distanceKm: 7.1, photo: "/images/showcase/puerta-chapa-danada.webp" },
];

export interface TeamMember { name: string; trade: string; rating: number; jobs: number; status: string; availability: string }

export const demoTeam: TeamMember[] = [
  { name: "Marta R.", trade: "Electricidad", rating: 4.9, jobs: 61, status: "on_job", availability: "14:00" },
  { name: "José P.", trade: "Fontanería", rating: 4.8, jobs: 44, status: "free", availability: "now" },
  { name: "Ana L.", trade: "Pintura", rating: 4.7, jobs: 38, status: "free", availability: "now" },
  { name: "Carlos M.", trade: "Albañilería", rating: 4.6, jobs: 29, status: "off", availability: "Mon" },
];

export interface Contractor { name: string; jobs: number; rating: number; slaPct: number }

export const demoContractors: Contractor[] = [
  { name: "Cuadrilla Norte", jobs: 18, rating: 4.8, slaPct: 94 },
  { name: "ServiCiudad", jobs: 12, rating: 4.6, slaPct: 88 },
  { name: "Taller Sur", jobs: 7, rating: 4.4, slaPct: 71 },
];

export const demoRevenue = { values: [2400, 3100, 2800, 3600], labels: ["W1", "W2", "W3", "W4"] };

export const demoKpis = {
  earningsWeek: 1280,
  jobsDone: 132,
  rating: 4.9,
  onTime: 0.97,
  openReports: 47,
  overdueSla: 6,
  avgResolveH: 31,
  resolvedMonth: 89,
};
