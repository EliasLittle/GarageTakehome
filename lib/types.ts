export interface ListingAttribute {
  id: string;
  createdAt: string;
  updatedAt: string;
  listingId: string;
  categoryAttributeId: string;
  value: string;
}

export interface ListingAddress {
  state?: string;
}

export interface ListingCategory {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  parentCategoryId?: string;
}

export interface Listing {
  id: string;
  secondaryId?: number;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
  listingTitle: string;
  sellingPrice: number;
  estimatedPriceMin?: number | null;
  estimatedPriceMax?: number | null;
  appraisedPrice?: number | null;
  imageUrls: string[];
  itemBrand?: string;
  listingDescription?: string;
  itemAge?: number;
  itemLength?: number;
  itemWidth?: number;
  itemHeight?: number;
  itemWeight?: number;
  deliveryMethod?: string;
  vin?: string | null;
  ListingAttribute?: ListingAttribute[];
  address?: ListingAddress;
  category?: ListingCategory;
}
