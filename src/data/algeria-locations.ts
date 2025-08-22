// Algeria wilayas and cities data

export interface City {
  name: string;
  id: number;
}

export interface Wilaya {
  id: number;
  name: string;
  cities: City[];
  homeDeliveryPrice: number;
  deskDeliveryPrice: number;
}

export const algeriaWilayas: Wilaya[] = [
  {
    id: 1,
    name: "Adrar",
    homeDeliveryPrice: 800,
    deskDeliveryPrice: 600,
    cities: [
      { id: 1, name: "Adrar" },
      { id: 2, name: "Reggane" },
      { id: 3, name: "Timimoun" }
    ]
  },
  {
    id: 2,
    name: "Chlef",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Chlef" },
      { id: 2, name: "Ténès" },
      { id: 3, name: "Boukadir" }
    ]
  },
  {
    id: 3,
    name: "Laghouat",
    homeDeliveryPrice: 700,
    deskDeliveryPrice: 500,
    cities: [
      { id: 1, name: "Laghouat" },
      { id: 2, name: "Aflou" },
      { id: 3, name: "Hassi R'Mel" }
    ]
  },
  {
    id: 4,
    name: "Oum El Bouaghi",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Oum El Bouaghi" },
      { id: 2, name: "Aïn Beïda" },
      { id: 3, name: "Aïn M'lila" }
    ]
  },
  {
    id: 5,
    name: "Batna",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Batna" },
      { id: 2, name: "Barika" },
      { id: 3, name: "Arris" }
    ]
  },
  {
    id: 6,
    name: "Béjaïa",
    homeDeliveryPrice: 550,
    deskDeliveryPrice: 350,
    cities: [
      { id: 1, name: "Béjaïa" },
      { id: 2, name: "Akbou" },
      { id: 3, name: "Souk El Ténine" }
    ]
  },
  {
    id: 7,
    name: "Biskra",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Biskra" },
      { id: 2, name: "Ouled Djellal" },
      { id: 3, name: "Tolga" }
    ]
  },
  {
    id: 8,
    name: "Béchar",
    homeDeliveryPrice: 800,
    deskDeliveryPrice: 600,
    cities: [
      { id: 1, name: "Béchar" },
      { id: 2, name: "Abadla" },
      { id: 3, name: "Beni Abbès" }
    ]
  },
  {
    id: 9,
    name: "Blida",
    homeDeliveryPrice: 500,
    deskDeliveryPrice: 300,
    cities: [
      { id: 1, name: "Blida" },
      { id: 2, name: "Boufarik" },
      { id: 3, name: "Mouzaïa" }
    ]
  },
  {
    id: 10,
    name: "Bouira",
    homeDeliveryPrice: 550,
    deskDeliveryPrice: 350,
    cities: [
      { id: 1, name: "Bouira" },
      { id: 2, name: "Lakhdaria" },
      { id: 3, name: "Sour El-Ghozlane" }
    ]
  },
  {
    id: 16,
    name: "Alger",
    homeDeliveryPrice: 500,
    deskDeliveryPrice: 300,
    cities: [
      { id: 1, name: "Alger Centre" },
      { id: 2, name: "Bab Ezzouar" },
      { id: 3, name: "Bir Mourad Raïs" },
      { id: 4, name: "El Harrach" },
      { id: 5, name: "Dar El Beïda" },
      { id: 6, name: "Hussein Dey" }
    ]
  },
  {
    id: 31,
    name: "Oran",
    homeDeliveryPrice: 550,
    deskDeliveryPrice: 350,
    cities: [
      { id: 1, name: "Oran" },
      { id: 2, name: "Arzew" },
      { id: 3, name: "Bir El Djir" },
      { id: 4, name: "Es Senia" }
    ]
  },
  {
    id: 23,
    name: "Annaba",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Annaba" },
      { id: 2, name: "El Bouni" },
      { id: 3, name: "Berrahal" }
    ]
  },
  {
    id: 25,
    name: "Constantine",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Constantine" },
      { id: 2, name: "El Khroub" },
      { id: 3, name: "Hamma Bouziane" }
    ]
  },
  {
    id: 11,
    name: "Tamanrasset",
    homeDeliveryPrice: 1000,
    deskDeliveryPrice: 800,
    cities: [
      { id: 1, name: "Tamanrasset" },
      { id: 2, name: "In Guezzam" }
    ]
  },
  {
    id: 12,
    name: "Tébessa",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Tébessa" },
      { id: 2, name: "Cheria" }
    ]
  },
  {
    id: 13,
    name: "Tlemcen",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Tlemcen" },
      { id: 2, name: "Maghnia" }
    ]
  },
  {
    id: 14,
    name: "Tiaret",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Tiaret" },
      { id: 2, name: "Sougueur" }
    ]
  },
  {
    id: 15,
    name: "Tizi Ouzou",
    homeDeliveryPrice: 550,
    deskDeliveryPrice: 350,
    cities: [
      { id: 1, name: "Tizi Ouzou" },
      { id: 2, name: "Azazga" }
    ]
  },
  {
    id: 17,
    name: "Djelfa",
    homeDeliveryPrice: 700,
    deskDeliveryPrice: 500,
    cities: [
      { id: 1, name: "Djelfa" },
      { id: 2, name: "Messaad" }
    ]
  },
  {
    id: 18,
    name: "Jijel",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Jijel" },
      { id: 2, name: "Taher" }
    ]
  },
  {
    id: 19,
    name: "Sétif",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Sétif" },
      { id: 2, name: "El Eulma" }
    ]
  },
  {
    id: 20,
    name: "Saïda",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Saïda" },
      { id: 2, name: "Ouled Brahim" }
    ]
  },
  {
    id: 21,
    name: "Skikda",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Skikda" },
      { id: 2, name: "Collo" }
    ]
  },
  {
    id: 22,
    name: "Sidi Bel Abbès",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Sidi Bel Abbès" },
      { id: 2, name: "Telagh" }
    ]
  },
  {
    id: 24,
    name: "Guelma",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Guelma" },
      { id: 2, name: "Bouchegouf" }
    ]
  },
  {
    id: 26,
    name: "Médéa",
    homeDeliveryPrice: 550,
    deskDeliveryPrice: 350,
    cities: [
      { id: 1, name: "Médéa" },
      { id: 2, name: "Berrouaghia" }
    ]
  },
  {
    id: 27,
    name: "Mostaganem",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Mostaganem" },
      { id: 2, name: "Sidi Ali" }
    ]
  },
  {
    id: 28,
    name: "M'Sila",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "M'Sila" },
      { id: 2, name: "Bou Saâda" }
    ]
  },
  {
    id: 29,
    name: "Mascara",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Mascara" },
      { id: 2, name: "Sig" }
    ]
  },
  {
    id: 30,
    name: "Ouargla",
    homeDeliveryPrice: 800,
    deskDeliveryPrice: 600,
    cities: [
      { id: 1, name: "Ouargla" },
      { id: 2, name: "Hassi Messaoud" }
    ]
  },
  {
    id: 32,
    name: "El Bayadh",
    homeDeliveryPrice: 700,
    deskDeliveryPrice: 500,
    cities: [
      { id: 1, name: "El Bayadh" },
      { id: 2, name: "Rogassa" }
    ]
  },
  {
    id: 33,
    name: "Illizi",
    homeDeliveryPrice: 1000,
    deskDeliveryPrice: 800,
    cities: [
      { id: 1, name: "Illizi" },
      { id: 2, name: "Djanet" }
    ]
  },
  {
    id: 34,
    name: "Bordj Bou Arréridj",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Bordj Bou Arréridj" },
      { id: 2, name: "Ras El Oued" }
    ]
  },
  {
    id: 35,
    name: "Boumerdès",
    homeDeliveryPrice: 500,
    deskDeliveryPrice: 300,
    cities: [
      { id: 1, name: "Boumerdès" },
      { id: 2, name: "Dellys" }
    ]
  },
  {
    id: 36,
    name: "El Tarf",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "El Tarf" },
      { id: 2, name: "El Kala" }
    ]
  },
  {
    id: 37,
    name: "Tindouf",
    homeDeliveryPrice: 1000,
    deskDeliveryPrice: 800,
    cities: [
      { id: 1, name: "Tindouf" }
    ]
  },
  {
    id: 38,
    name: "Tissemsilt",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Tissemsilt" },
      { id: 2, name: "Khemisti" }
    ]
  },
  {
    id: 39,
    name: "El Oued",
    homeDeliveryPrice: 750,
    deskDeliveryPrice: 550,
    cities: [
      { id: 1, name: "El Oued" },
      { id: 2, name: "Robbah" }
    ]
  },
  {
    id: 40,
    name: "Khenchela",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Khenchela" },
      { id: 2, name: "Babar" }
    ]
  },
  {
    id: 41,
    name: "Souk Ahras",
    homeDeliveryPrice: 650,
    deskDeliveryPrice: 450,
    cities: [
      { id: 1, name: "Souk Ahras" },
      { id: 2, name: "Sedrata" }
    ]
  },
  {
    id: 42,
    name: "Tipaza",
    homeDeliveryPrice: 500,
    deskDeliveryPrice: 300,
    cities: [
      { id: 1, name: "Tipaza" },
      { id: 2, name: "Cherchell" }
    ]
  },
  {
    id: 43,
    name: "Mila",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Mila" },
      { id: 2, name: "Ferdjioua" }
    ]
  },
  {
    id: 44,
    name: "Aïn Defla",
    homeDeliveryPrice: 550,
    deskDeliveryPrice: 350,
    cities: [
      { id: 1, name: "Aïn Defla" },
      { id: 2, name: "Khemis Miliana" }
    ]
  },
  {
    id: 45,
    name: "Naâma",
    homeDeliveryPrice: 750,
    deskDeliveryPrice: 550,
    cities: [
      { id: 1, name: "Naâma" },
      { id: 2, name: "Mécheria" }
    ]
  },
  {
    id: 46,
    name: "Aïn Témouchent",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Aïn Témouchent" },
      { id: 2, name: "Hammam Bou Hadjar" }
    ]
  },
  {
    id: 47,
    name: "Ghardaïa",
    homeDeliveryPrice: 750,
    deskDeliveryPrice: 550,
    cities: [
      { id: 1, name: "Ghardaïa" },
      { id: 2, name: "Metlili" }
    ]
  },
  {
    id: 48,
    name: "Relizane",
    homeDeliveryPrice: 600,
    deskDeliveryPrice: 400,
    cities: [
      { id: 1, name: "Relizane" },
      { id: 2, name: "Oued Rhiou" }
    ]
  },
  {
    id: 49,
    name: "Timimoun",
    homeDeliveryPrice: 850,
    deskDeliveryPrice: 650,
    cities: [
      { id: 1, name: "Timimoun" },
      { id: 2, name: "Ouled Saïd" }
    ]
  },
  {
    id: 50,
    name: "Bordj Badji Mokhtar",
    homeDeliveryPrice: 1100,
    deskDeliveryPrice: 900,
    cities: [
      { id: 1, name: "Bordj Badji Mokhtar" }
    ]
  },
  {
    id: 51,
    name: "Ouled Djellal",
    homeDeliveryPrice: 700,
    deskDeliveryPrice: 500,
    cities: [
      { id: 1, name: "Ouled Djellal" },
      { id: 2, name: "Sidi Khaled" }
    ]
  },
  {
    id: 52,
    name: "Béni Abbès",
    homeDeliveryPrice: 900,
    deskDeliveryPrice: 700,
    cities: [
      { id: 1, name: "Béni Abbès" },
      { id: 2, name: "El Ouata" }
    ]
  },
  {
    id: 53,
    name: "In Salah",
    homeDeliveryPrice: 950,
    deskDeliveryPrice: 750,
    cities: [
      { id: 1, name: "In Salah" },
      { id: 2, name: "Foggaret Ezzoua" }
    ]
  },
  {
    id: 54,
    name: "In Guezzam",
    homeDeliveryPrice: 1200,
    deskDeliveryPrice: 1000,
    cities: [
      { id: 1, name: "In Guezzam" }
    ]
  },
  {
    id: 55,
    name: "Touggourt",
    homeDeliveryPrice: 750,
    deskDeliveryPrice: 550,
    cities: [
      { id: 1, name: "Touggourt" },
      { id: 2, name: "Nezla" }
    ]
  },
  {
    id: 56,
    name: "Djanet",
    homeDeliveryPrice: 1100,
    deskDeliveryPrice: 900,
    cities: [
      { id: 1, name: "Djanet" },
      { id: 2, name: "Bordj El Haoues" }
    ]
  },
  {
    id: 57,
    name: "El M'Ghair",
    homeDeliveryPrice: 800,
    deskDeliveryPrice: 600,
    cities: [
      { id: 1, name: "El M'Ghair" },
      { id: 2, name: "Djamaa" }
    ]
  },
  {
    id: 58,
    name: "El Meniaa",
    homeDeliveryPrice: 850,
    deskDeliveryPrice: 650,
    cities: [
      { id: 1, name: "El Meniaa" },
      { id: 2, name: "Hassi Gara" }
    ]
  }
];

// Helper function to get cities by wilaya ID
export const getCitiesByWilayaId = (wilayaId: number): City[] => {
  const wilaya = algeriaWilayas.find(w => w.id === wilayaId);
  return wilaya ? wilaya.cities : [];
};

// Helper function to get delivery prices by wilaya ID
export const getDeliveryPricesByWilayaId = (wilayaId: number): { home: number, desk: number } => {
  const wilaya = algeriaWilayas.find(w => w.id === wilayaId);
  return wilaya 
    ? { home: wilaya.homeDeliveryPrice, desk: wilaya.deskDeliveryPrice }
    : { home: 0, desk: 0 };
};
