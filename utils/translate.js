/**
 * Simple translation utility using the free MyMemory API.
 * No API key required. If a request fails, the original text is returned.
 */
export async function translateText(text, targetLang) {
  // Return original text for empty strings or when target language is English (default)
  if (!text || targetLang === "en") return text;

  const encoded = encodeURIComponent(text);
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${targetLang}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) {
      console.warn("MyMemory translation returned empty result", data);
      return text;
    }
    return decodeHtml(translated);
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}