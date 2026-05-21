import { analyzePayloadReflection } from "../../src/shared/payload-analysis";

describe("analyzePayloadReflection", () => {
  it("marks raw payload echoes as unfiltered", () => {
    const result = analyzePayloadReflection("<script>alert(1)</script>", "<div><script>alert(1)</script></div>");

    expect(result.state).toBe("unfiltered");
    expect(result.displayText).toBe("<script>alert(1)</script>");
  });

  it("marks HTML-escaped echoes as filtered", () => {
    const result = analyzePayloadReflection("<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;");

    expect(result.state).toBe("filtered");
    expect(result.displayText).toBe("scriptalert1/script");
  });

  it("marks URL-encoded echoes as filtered", () => {
    const payload = "{{7*7}}";
    const result = analyzePayloadReflection(payload, encodeURIComponent(payload));

    expect(result.state).toBe("filtered");
    expect(result.displayText).toBe("7*7");
  });

  it("marks stripped dangerous characters as filtered", () => {
    const result = analyzePayloadReflection("&& whoami", "<div>whoami</div>");

    expect(result.state).toBe("filtered");
    expect(result.displayText).toBe("whoami");
  });

  it("drops percent signs from the failed display value", () => {
    const result = analyzePayloadReflection("cat%", "<div>cat</div>");

    expect(result.state).toBe("filtered");
    expect(result.displayText).toBe("cat");
  });

  it("treats missing echoes as filtered", () => {
    const result = analyzePayloadReflection("payload", "<html><body>done</body></html>");

    expect(result.state).toBe("filtered");
    expect(result.displayText).toBe("payload");
  });
});
