// Public interface of the catalog module. Other modules import from here only
// (server code additionally from "./server").
export {
  CatalogError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type CatalogRepository,
} from "./catalog-repository";
export {
  SET_REGIONS,
  SET_STATUSES,
  SET_TYPES,
  cardSetSchema,
  gameSchema,
  slugSchema,
  type CardSet,
  type Game,
} from "./game";
export { describeCardSet, displaySetName, duplicateSetIds, groupSetsByEra, matchesSetSearch } from "./set-labels";
export { isShopVisible, productSchema, type Product, type ProductKind } from "./product";
export { offerSchema, isOfferTypeAllowedFor, type Offer, type OfferType } from "./offer";
export {
  offerInternalsSchema,
  MAX_SKU_LENGTH,
  MAX_STORAGE_LOCATION_LENGTH,
  PURCHASE_ORIGINS,
  type OfferInternals,
  type PurchaseOrigin,
} from "./offer-internals";
export { rarityTier, type RarityTier } from "./rarity";
export { PRODUCT_KIND_LABELS, describeOffer, describeProductKind } from "./labels";
export { IMPORT_COLUMNS, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS } from "./import-rows";
export type { ImportRowResult, ImportRowStatus } from "./import-plan";
export type { SetSyncStatus } from "./set-sync";
export type { ImportOutcome } from "./catalog-import";
export {
  parseCardSetForm,
  parseGameForm,
  parseNewProductForm,
  parseOfferForm,
  parseOfferInternalsForm,
  parseOfferUpdateForm,
  parseProductForm,
  parseProductUpdateForm,
  type FormFields,
  type FormResult,
  type NewProduct,
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
