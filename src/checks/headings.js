function checkHeadings($) {
  const headings = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headings.push({
      level: parseInt(el.name.substring(1)),
      text: $(el).text(),
    });
  });

  const issues = [];
  let lastLevel = 0;
  for (const heading of headings) {
    if (heading.level > lastLevel + 1) {
      issues.push({
        error: "Incorrect heading order",
        level: heading.level,
        text: heading.text,
        previousLevel: lastLevel,
      });
    }
    lastLevel = heading.level;
  }

  return issues;
}

module.exports = {
  name: "headings",
  description: "Checks for incorrect heading order.",
  check: checkHeadings,
  headers: [
    { id: "url", title: "URL" },
    { id: "error", title: "Error" },
    { id: "level", title: "Heading Level" },
    { id: "text", title: "Heading Text" },
    { id: "previousLevel", title: "Previous Level" },
  ],
};
