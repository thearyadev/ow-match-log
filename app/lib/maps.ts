type MapType = 'escort' | 'control' | 'flashpoint' | 'hybrid' | 'push'

interface MapInfo {
    mapType: MapType
}
type MapRecord = Record<string, MapInfo>

export const Maps: MapRecord = {
    Busan: {
        mapType: 'control',
    },
    Ilios: {
        mapType: 'control',
    },
    'Lijiang Tower': {
        mapType: 'control',
    },
    Nepal: {
        mapType: 'control',
    },
    Oasis: {
        mapType: 'control',
    },
    "Circuit Royal": {
        mapType: 'escort',
    },
    Dorado: {
        mapType: 'escort',
    },
    Havana: {
        mapType: 'escort',
    },
    Junkertown: {
        mapType: 'escort',
    },
    Rialto: {
        mapType: 'escort',
    },
    'Route 66': {
        mapType: 'escort',
    },
    'Watchpoint: Gibraltar': {
        mapType: 'escort',
    },
    'Blizzard World': {
        mapType: 'hybrid',
    },
    Eichenwalde: {
        mapType: 'hybrid',
    },
    Hollywood: {
        mapType: 'hybrid',
    },
    "King's Row": {
        mapType: 'hybrid',
    },
    Midtown: {
        mapType: 'hybrid',
    },
    Numbani: {
        mapType: 'hybrid',
    },
    Paraiso: {
        mapType: 'hybrid',
    },
    Colosseo: {
        mapType: 'push',
    },
    Esperanca: {
        mapType: 'push',
    },
    'New Queen Street': {
        mapType: 'push',
    },
    'New Junk City': {
        mapType: 'flashpoint',
    },
    Suravasa: {
        mapType: 'flashpoint',
    },
    "Antarctic Peninsula": {
        mapType: 'control',
    },
    Runasapi: {
        mapType: 'push',
    },
    Samoa: {
        mapType: 'control',
    },
    "Shambali Monastery": {
        mapType: 'escort',
    },
}
