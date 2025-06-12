function checkImages($) {
  const issues = [];
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined || alt.trim() === "") {
      issues.push({
        src: $(el).attr("src") || "N/A",
        alt: alt || "",
      });
    }
  });
  return issues;
}

module.exports = {
  name: "images",
  description: "Checks for images with missing or empty alt text.",
  check: checkImages,
  headers: [
    { id: "url", title: "Page URL" },
    { id: "src", title: "Image Source" },
    { id: "alt", title: "Alt Text" },
  ],
};
