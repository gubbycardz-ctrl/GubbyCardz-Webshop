// Public interface of the catalog module. Other modules import from here only
// (server code additionally from "./server").
export {
  CatalogError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type CatalogRepository,
} from "./catalog-repository";
export { gameSchema, cardSetSchema, slugSchema, type Game, type CardSet } from "./game";
export { productSchema, type Product, type ProductKind } from "./product";
export { offerSchema, isOfferTypeAllowedFor, type Offer, type OfferType } from "./offer";
export {
  offerInternalsSchema,
  MAX_SKU_LENGTH,
  MAX_STORAGE_LOCATION_LENGTH,
  PURCHASE_ORIGINS,
  type OfferInternals,
  type PurchaseOrigin,
} from "./offer-internals";
export { PRODUCT_KIND_LABELS, describeOffer, describeProductKind } from "./labels";
export {
  parseCardSetForm,
  parseGameForm,
  parseOfferForm,
  parseOfferInternalsForm,
  parseOfferUpdateForm,
  parseProductForm,
  parseProductUpdateForm,
  type FormFields,
  type FormResult,
} from "./admin-forms";
export {
  CARD_LANGUAGES,
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  GRADING_COMPANIES,
  SEALED_CATEGORIES,
  type CardLanguage,
  type CardCondition,
  type GradingCompany,
  type SealedCategory,
} from "./vocabulary";
