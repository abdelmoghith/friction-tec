
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function formatCurrency(amount: number) {
  return `${amount.toFixed(2)} Da`;
}

export function generateRandomData() {
  // Helper to generate random sample data
  return {
    totalBuyers: Math.floor(Math.random() * 100) + 50,
    totalCommission: Math.floor(Math.random() * 5000) + 1000,
    totalClicks: Math.floor(Math.random() * 1000) + 500,
    activeProducts: Math.floor(Math.random() * 20) + 5,
    buyersChange: {
      value: Math.floor(Math.random() * 20) + 1,
      isPositive: Math.random() > 0.3
    },
    commissionChange: {
      value: Math.floor(Math.random() * 25) + 1,
      isPositive: Math.random() > 0.3
    },
    clicksChange: {
      value: Math.floor(Math.random() * 30) + 1,
      isPositive: Math.random() > 0.3
    },
    productsChange: {
      value: Math.floor(Math.random() * 15) + 1,
      isPositive: Math.random() > 0.3
    }
  };
}

export function generateMockProducts() {
  const categories = ['Electronics', 'Fashion', 'Home', 'Beauty', 'Software', 'Fitness', 'Food', 'Travel'];
  const tags = ['New', 'Popular', 'Sale', 'Exclusive', 'Limited', 'Trending', 'Best Seller'];

  const productNames = [
    'Premium Wireless Headphones',
    'Ultra HD Smart Watch',
    'Organic Skincare Set',
    'Professional Camera Kit',
    'Ergonomic Office Chair',
    'Fitness Tracker Pro',
    'Gourmet Coffee Maker',
    'Designer Leather Bag',
    'Smart Home Security System',
    'Portable Power Bank',
    'Luxury Scented Candles',
    'Bluetooth Speaker System'
  ];

  const descriptions = [
    'A high-quality product with amazing features that your audience will love. This premium item combines cutting-edge technology with elegant design to deliver an exceptional user experience.',
    'Premium design meets exceptional performance. Perfect for tech enthusiasts who demand the best in quality and functionality. Built to last with premium materials.',
    'Handcrafted with attention to detail and made from sustainable materials. Each piece is unique and environmentally friendly, making it a perfect gift for eco-conscious consumers.',
    'The ultimate solution for professionals looking for reliability and style. Designed with user feedback to ensure it meets the highest standards of performance.',
    'Innovative technology that simplifies everyday tasks and enhances lifestyle. Smart features make this product intuitive and easy to use for everyone.',
    'Sleek, modern design with cutting-edge features for the discerning customer. Stand out from the crowd with this statement piece that combines form and function.'
  ];

  // Product-specific keywords for more relevant images
  const imageKeywords = [
    'headphones,tech',
    'smartwatch,wearable',
    'skincare,beauty',
    'camera,photography',
    'office,furniture',
    'fitness,tracker',
    'coffee,kitchen',
    'fashion,bag',
    'security,smart home',
    'electronics,gadget',
    'home decor,candle',
    'speaker,audio'
  ];

  // Detailed specifications for each product type
  const specifications = {
    'Premium Wireless Headphones': {
      'Battery Life': '30 hours',
      'Connectivity': 'Bluetooth 5.2',
      'Noise Cancellation': 'Active Noise Cancelling',
      'Driver Size': '40mm',
      'Weight': '250g',
      'Water Resistance': 'IPX4'
    },
    'Ultra HD Smart Watch': {
      'Display': '1.4" AMOLED',
      'Battery Life': '7 days',
      'Water Resistance': '5 ATM',
      'Sensors': 'Heart rate, SpO2, Accelerometer',
      'Connectivity': 'Bluetooth, WiFi',
      'Compatibility': 'iOS, Android'
    },
    'Organic Skincare Set': {
      'Ingredients': '100% Organic',
      'Skin Type': 'All skin types',
      'Package Includes': '5 items',
      'Volume': '50ml each',
      'Cruelty-Free': 'Yes',
      'Shelf Life': '12 months'
    },
    'Professional Camera Kit': {
      'Resolution': '24.2 MP',
      'Sensor': 'Full-frame CMOS',
      'ISO Range': '100-51,200',
      'Video': '4K 60fps',
      'Lens Mount': 'Universal',
      'Weight': '680g'
    },
    'Ergonomic Office Chair': {
      'Material': 'Mesh and premium fabric',
      'Weight Capacity': '300 lbs',
      'Adjustable Height': 'Yes',
      'Lumbar Support': 'Adjustable',
      'Armrests': '4D adjustable',
      'Warranty': '5 years'
    },
    'Fitness Tracker Pro': {
      'Display': '1.1" OLED',
      'Battery Life': '14 days',
      'Water Resistance': '50m',
      'Sensors': 'Heart rate, GPS, Accelerometer',
      'Sleep Tracking': 'Advanced',
      'Weight': '24g'
    },
    'Gourmet Coffee Maker': {
      'Capacity': '12 cups',
      'Brewing Options': 'Multiple',
      'Timer': 'Programmable',
      'Filter Type': 'Permanent',
      'Material': 'Stainless steel',
      'Warranty': '2 years'
    },
    'Designer Leather Bag': {
      'Material': 'Genuine leather',
      'Dimensions': '12" x 16" x 6"',
      'Compartments': '3 main, 5 small',
      'Strap': 'Adjustable, removable',
      'Closure': 'Zipper and magnetic',
      'Colors Available': '5'
    },
    'Smart Home Security System': {
      'Components': 'Camera, sensors, hub',
      'Resolution': '1080p HD',
      'Night Vision': 'Yes',
      'Storage': 'Cloud and local',
      'Connectivity': 'WiFi, Z-Wave',
      'Power': 'Wired with battery backup'
    },
    'Portable Power Bank': {
      'Capacity': '20,000 mAh',
      'Ports': '2 USB-A, 1 USB-C',
      'Fast Charging': 'Yes',
      'Weight': '340g',
      'Size': 'Pocket-sized',
      'Recharge Time': '4 hours'
    },
    'Luxury Scented Candles': {
      'Burn Time': '50 hours',
      'Wax Type': 'Soy blend',
      'Scents': 'Multiple options',
      'Wick': 'Cotton, lead-free',
      'Container': 'Handcrafted glass',
      'Size': '8 oz'
    },
    'Bluetooth Speaker System': {
      'Output Power': '30W',
      'Battery Life': '12 hours',
      'Connectivity': 'Bluetooth 5.0, AUX',
      'Water Resistance': 'IPX7',
      'Frequency Response': '20Hz-20kHz',
      'Size': 'Compact'
    }
  };

  return Array.from({ length: 12 }).map((_, index) => {
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const category = categories[categoryIndex];
    const productNameIndex = index % productNames.length;
    const productName = productNames[productNameIndex];
    const keyword = imageKeywords[index % imageKeywords.length];

    // Generate multiple images for each product
    const mainImage = `https://source.unsplash.com/featured/600x400?${keyword}&sig=${Date.now() + index}`;
    const additionalImages = Array.from({ length: 3 }).map((_, i) =>
      `https://source.unsplash.com/featured/600x400?${keyword}&sig=${Date.now() + index + 100 + i * 50}`
    );

    // Get product-specific specifications
    const specs = specifications[productName as keyof typeof specifications] || {};

    // Generate random rating
    const rating = (Math.random() * 2 + 3).toFixed(1); // Rating between 3.0 and 5.0

    // Generate random stock status
    const inStock = Math.random() > 0.2; // 80% chance of being in stock
    const stockCount = inStock ? Math.floor(Math.random() * 50) + 1 : 0;

    // Generate random shipping info
    const freeShipping = Math.random() > 0.3; // 70% chance of free shipping
    const shippingCost = freeShipping ? 0 : Math.floor(Math.random() * 10) + 5;

    // Generate random related product IDs (excluding current product)
    const relatedProductIds = Array.from({ length: 4 })
      .map(() => Math.floor(Math.random() * 12) + 1)
      .filter(id => id !== index + 1)
      .map(id => `product-${id}`);

    return {
      id: `product-${index + 1}`,
      name: productName,
      // Primary image source with product-specific keywords
      image: mainImage,
      images: [mainImage, ...additionalImages],
      price: Math.floor(Math.random() * 900) + 100,
      commission: Math.floor(Math.random() * 15) + 5,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      longDescription: `${productName} - ${descriptions[Math.floor(Math.random() * descriptions.length)]} This premium product is designed to exceed your expectations with its exceptional quality and innovative features. Perfect for everyday use or as a special gift.`,
      category: category,
      tags: [
        category,
        tags[Math.floor(Math.random() * tags.length)]
      ],
      specifications: specs,
      rating: parseFloat(rating),
      reviews: Math.floor(Math.random() * 100) + 5,
      inStock: inStock,
      stockCount: stockCount,
      freeShipping: freeShipping,
      shippingCost: shippingCost,
      relatedProducts: relatedProductIds,
      sku: `SKU-${category.substring(0, 3).toUpperCase()}-${index + 100}`,
      weight: `${(Math.random() * 2 + 0.5).toFixed(1)} kg`,
      dimensions: `${Math.floor(Math.random() * 20) + 10} × ${Math.floor(Math.random() * 15) + 5} × ${Math.floor(Math.random() * 10) + 2} cm`
    };
  });
}

export function generateMockBuyers(count: number = 5) {
  const statuses = ['pending', 'confirmed', 'paid'];
  const products = ['Premium Widget', 'Deluxe Package', 'Ultimate Solution', 'Pro Membership'];
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Jessica'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Miller', 'Jones', 'Garcia', 'Martinez', 'Williams'];

  return Array.from({ length: count }).map((_, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

    return {
      id: `buyer-${index + 1}`,
      name,
      email,
      product: products[Math.floor(Math.random() * products.length)],
      date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      amount: Math.floor(Math.random() * 900) + 100,
      commission: Math.floor(Math.random() * 90) + 10,
      status: statuses[Math.floor(Math.random() * statuses.length)] as 'pending' | 'confirmed' | 'paid',
    };
  });
}
