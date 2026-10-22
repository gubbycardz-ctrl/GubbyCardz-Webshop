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
  CARD_LANGUAGES,
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  GRADING_COMPANIES,
  type CardLanguage,
  type CardCondition,
  type GradingCompany,
} from "./vocabulary";
