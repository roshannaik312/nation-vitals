import { AnnualData, CountyData } from '@/types';

// Generate realistic mock data for demonstration
// This will be replaced with actual data files

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

const sampleCounties: Array<{ fips: string; name: string }> = [
  { fips: '01001', name: 'Autauga County' },
  { fips: '01003', name: 'Baldwin County' },
  { fips: '01005', name: 'Barbour County' },
  { fips: '06037', name: 'Los Angeles County' },
  { fips: '06073', name: 'San Diego County' },
  { fips: '36061', name: 'New York County' },
  { fips: '48201', name: 'Harris County' },
  { fips: '17031', name: 'Cook County' },
  { fips: '04013', name: 'Maricopa County' },
  { fips: '12086', name: 'Miami-Dade County' },
];

function generateCountyData(fips: string, countyName: string, year: number): CountyData {
  const stateCode = fips.substring(0, 2);
  const stateName = stateNames[stateCode] || 'Unknown';
  
  // Generate somewhat realistic data with regional patterns
  const isEastern = parseInt(stateCode) < 30;
  const isUrban = Math.random() > 0.6;
  const yearOffset = (year - 2018) * 0.5;
  
  const baseOverdose = 15 + Math.random() * 35;
  const baseSuicide = 10 + Math.random() * 20;
  
  return {
    fips,
    county: countyName,
    state: stateName,
    overdose_rate: Math.max(0, baseOverdose + yearOffset + (isEastern ? 5 : -3)),
    suicide_rate: Math.max(0, baseSuicide + yearOffset * 0.3),
    mental_health_days: 3.5 + Math.random() * 2.5,
    poverty_rate: 8 + Math.random() * 20,
    median_income: 35000 + Math.random() * 60000,
    pct_white: 40 + Math.random() * 50,
    pct_black: 5 + Math.random() * 30,
    pct_hispanic: 5 + Math.random() * 40,
    pct_asian: 1 + Math.random() * 15,
    vote_share_rep: 25 + Math.random() * 50,
    vote_share_dem: 0, // Will be calculated
    violent_crime: 100 + Math.random() * 800,
    urban_rural: isUrban ? 'urban' : Math.random() > 0.5 ? 'suburban' : 'rural',
    population: isUrban ? 100000 + Math.random() * 9000000 : 5000 + Math.random() * 100000,
    pct_college: 15 + Math.random() * 40,
  };
}

export function generateMockData(): AnnualData {
  const data: AnnualData = {};
  
  for (const year of [2018, 2019, 2020, 2021, 2022, 2023]) {
    data[year.toString()] = {};
    
    for (const county of sampleCounties) {
      const countyData = generateCountyData(county.fips, county.name, year);
      countyData.vote_share_dem = 100 - countyData.vote_share_rep;
      data[year.toString()][county.fips] = countyData;
    }
  }
  
  return data;
}

export const mockData = generateMockData();
