/** Reads JSON from a URL – injected, so an adapter never touches the network itself. */
export type GetJson = (url: string) => Promise<unknown>;

/** Reads a web page as text, for sources that only publish HTML. */
export type GetText = (url: string) => Promise<string>;

export type Fetchers = { getJson: GetJson; getText: GetText };
