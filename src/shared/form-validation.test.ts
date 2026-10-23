import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formFieldsOf, isHoneypotFilled, validateForm } from "./form-validation";

const schema = z.object({ name: z.string().min(1), slug: z.string().regex(/^[a-z]+$/), amount: z.int() });
const labels = { name: "Name", slug: "Name", amount: "Menge" };

describe("validateForm", () => {
  it("returns the parsed value", () => {
    expect(validateForm(schema, { name: "A", slug: "a", amount: 1 }, labels)).toEqual({
      ok: true,
      value: { name: "A", slug: "a", amount: 1 },
    });
  });

  it("says 'bitte ausfüllen' for empty fields, once per label", () => {
    expect(validateForm(schema, { name: "", slug: "", amount: 1 }, labels)).toEqual({ ok: false, error: "Name: bitte ausfüllen" });
  });

  it("explains filled but invalid values instead of calling them missing", () => {
    const result = validateForm(schema, { name: "A", slug: "a", amount: 1.5 }, labels);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/^Menge: /);
    expect(!result.ok && result.error).not.toContain("ausfüllen");
  });
});

describe("formFieldsOf", () => {
  it("keeps text fields and ignores files", () => {
    const formData = new FormData();
    formData.set("name", "Max");
    formData.set("upload", new Blob(["x"]));
    expect(formFieldsOf(formData)).toEqual({ name: "Max" });
  });
});

describe("isHoneypotFilled", () => {
  it("detects bots that fill the hidden field", () => {
    expect(isHoneypotFilled({ website: "https://spam.example" })).toBe(true);
    expect(isHoneypotFilled({ website: " " })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
  });
});
