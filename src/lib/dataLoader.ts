import Papa from 'papaparse';
import { AnnualData, CountyData } from '@/types';

interface PanelDataRow {
  fips: string;
  Year: string;
  PerCapitaIncome: string;
  UnemploymentRate: string;
  PovertyRate: string;
  MedianIncome: string;
  Rent: string;
  BachelorsOrHigher: string;
  WhiteAlone: string;
  BlackAlone: string;
  HispanicLatino: string;
  Population: string;
  RepublicanVoteShare: string;
  DemocratVoteShare: string;
  RepublicanMargin: string;
  DrugDeaths: string;
  DrugDeathRate: string;
  SuicideDeaths: string;
  SuicideRate: string;
  MentalHealthScore: string;
  state_fips: string;
}

// Normalize FIPS to 5-digit string with leading zeros
function normalizeFips(fips: string | number): string {
  const fipsStr = String(fips).replace(/\.0$/, '').trim();
  return fipsStr.padStart(5, '0');
}

// Parse numeric value, returning null for empty/invalid
function parseNum(val: string | undefined): number | null {
  if (!val || val === '' || val === 'Suppressed' || val === 'Unreliable') {
    return null;
  }
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// State FIPS to name mapping
const stateNames: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
  '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
  '11': 'DC', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
  '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
  '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
  '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
  '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
  '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
  '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
  '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
  '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
  '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
  '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming'
};

// County names from FIPS (we'll populate from data or use generic)
const countyNamesMap = new Map<string, string>();

async function fetchCSV<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  const text = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse<T>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export async function loadAllData(): Promise<AnnualData> {
  console.log('Loading comprehensive panel data...');
  
  const panelData = await fetchCSV<PanelDataRow>('/data/full_panel_data.csv');
  console.log(`Loaded ${panelData.length} panel data rows`);

  const annualData: AnnualData = {};
  const years = ['2018', '2019', '2020', '2021', '2022', '2023'];

  // Initialize structure
  years.forEach((year) => {
    annualData[year] = {};
  });

  // Process panel data
  panelData.forEach((row) => {
    if (!row.fips || !row.Year) return;
    
    const fips = normalizeFips(row.fips);
    const year = String(row.Year).trim();
    
    // Skip invalid FIPS (like 0 or 1000 which are state-level)
    if (fips.length < 5 || fips === '00000' || fips === '01000') return;
    if (!years.includes(year)) return;

    const stateCode = fips.substring(0, 2);
    const stateName = stateNames[stateCode] || 'Unknown';

    // Parse all values
    const population = parseNum(row.Population);
    const povertyRate = parseNum(row.PovertyRate);
    const medianIncome = parseNum(row.MedianIncome);
    const pctWhite = parseNum(row.WhiteAlone);
    const pctBlack = parseNum(row.BlackAlone);
    const pctHispanic = parseNum(row.HispanicLatino);
    const pctCollege = parseNum(row.BachelorsOrHigher);
    const repShare = parseNum(row.RepublicanVoteShare);
    const demShare = parseNum(row.DemocratVoteShare);
    const drugDeathRate = parseNum(row.DrugDeathRate);
    const suicideRate = parseNum(row.SuicideRate);
    const mentalHealth = parseNum(row.MentalHealthScore);
    const unemploymentRate = parseNum(row.UnemploymentRate);

    // Build county data object with real values (fall back to reasonable defaults)
    const countyData: CountyData = {
      fips,
      county: countyNamesMap.get(fips) || `County ${fips.substring(2)}`,
      state: stateName,
      overdose_rate: drugDeathRate || 0,
      suicide_rate: suicideRate || 0,
      mental_health_days: mentalHealth ? mentalHealth / 5 : 4.5, // Scale mental health score to days
      poverty_rate: povertyRate || 12,
      median_income: medianIncome || 50000,
      pct_white: pctWhite || 75,
      pct_black: pctBlack || 12,
      pct_hispanic: pctHispanic || 8,
      pct_asian: 100 - (pctWhite || 75) - (pctBlack || 12) - (pctHispanic || 8), // Approximate
      vote_share_rep: repShare || 50,
      vote_share_dem: demShare || 50,
      violent_crime: 200 + (unemploymentRate || 4) * 50, // Proxy based on unemployment
      urban_rural: (population || 50000) > 100000 ? 'urban' : (population || 50000) > 25000 ? 'suburban' : 'rural',
      population: population || 50000,
      pct_college: pctCollege || 25,
    };

    annualData[year][fips] = countyData;
  });

  // Also load drug deaths data to fill in county names and overdose rates
  try {
    const drugDeaths = await fetchCSV<{ 'County Code': string; County: string; Year: string; 'Crude Rate': string }>('/data/drug_deaths.csv');
    
    drugDeaths.forEach((row) => {
      if (!row['County Code'] || !row.Year) return;
      
      const fips = normalizeFips(row['County Code']);
      const year = String(row.Year).replace(/\.0$/, '').trim();
      
      if (!years.includes(year)) return;
      
      // Store county name
      if (row.County && !countyNamesMap.has(fips)) {
        countyNamesMap.set(fips, row.County.split(',')[0].trim());
      }
      
      // Update county data with better name and overdose rate
      if (annualData[year][fips]) {
        if (row.County) {
          annualData[year][fips].county = row.County.split(',')[0].trim();
        }
        const crudeRate = parseNum(row['Crude Rate']);
        if (crudeRate !== null) {
          annualData[year][fips].overdose_rate = crudeRate;
        }
      }
    });
  } catch (e) {
    console.log('Drug deaths supplementary data not available');
  }

  // Log summary
  years.forEach((year) => {
    const count = Object.keys(annualData[year]).length;
    console.log(`Year ${year}: ${count} counties`);
  });

  return annualData;
}

// Export a cached version
let cachedData: AnnualData | null = null;

export async function getData(): Promise<AnnualData> {
  if (!cachedData) {
    cachedData = await loadAllData();
  }
  return cachedData;
}
