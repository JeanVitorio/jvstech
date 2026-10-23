import { describe, expect, it } from "vitest";
import { faqCategories, faqItems } from "@/data/faq";

describe("faq", () => {
  it("usa ids únicos e apenas categorias existentes", () => {
    const ids = faqItems.map((item) => item.id);
    const categories = new Set(faqCategories.map((category) => category.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(faqItems.every((item) => categories.has(item.category))).toBe(true);
  });

  it("possui ao menos uma pergunta em cada categoria", () => {
    for (const category of faqCategories) {
      expect(faqItems.some((item) => item.category === category.id)).toBe(true);
    }
  });
});
