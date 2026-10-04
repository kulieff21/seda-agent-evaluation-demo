import headphonesImage from "../assets/images/seda-m1-headphones.png";
import speakerImage from "../assets/images/seda-r1-speaker.png";
import earbudsImage from "../assets/images/seda-i1-earbuds.png";
import soundbarImage from "../assets/images/seda-s1-soundbar.png";
import turntableImage from "../assets/images/seda-t1-turntable.png";
import dacImage from "../assets/images/seda-d1-dac.png";
import bookshelfImage from "../assets/images/seda-b1-bookshelf.png";
import portableImage from "../assets/images/seda-p1-portable.png";
import {
  catalogProducts,
  productGroups,
  type CatalogProduct,
  type ProductGroup,
} from "../../shared/catalog";

export { productGroups, type ProductGroup };

export type Product = CatalogProduct & {
  image: string;
};

const productImages: Record<string, string> = {
  m1: headphonesImage,
  i1: earbudsImage,
  r1: speakerImage,
  s1: soundbarImage,
  t1: turntableImage,
  d1: dacImage,
  b1: bookshelfImage,
  p1: portableImage,
};

export function hydrateProducts(items: CatalogProduct[]): Product[] {
  return items.map((product) => {
    const image = productImages[product.id];
    if (!image) throw new Error(`Missing local product image for ${product.id}.`);
    return { ...product, image };
  });
}

export const products: Product[] = hydrateProducts(catalogProducts);

export const formatPrice = (price: number) => `${price.toLocaleString("az-AZ")} ₼`;
