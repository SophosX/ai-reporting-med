/**
 * Utility functions for calculating word counts in radiology reports
 */

/**
 * Count words in a text, handling empty/null values
 * @param {string} text - Text to count words in
 * @returns {number} - Word count
 */
export const countWords = (text) => {
  if (!text || typeof text !== "string") return 0;

  // Remove markdown formatting and extra whitespace, then count words
  const cleanText = text
    .replace(/[#*_`]/g, "") // Remove basic markdown characters
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  if (!cleanText) return 0;

  return cleanText.split(" ").filter((word) => word.length > 0).length;
};

/**
 * Calculate word count metrics for a report
 * @param {Object} report - Report object with input_text, report_text, template_text, and stored metrics
 * @returns {Object} - Object containing totalWords, generatedWords, and savedWords
 */
export const calculateWordMetrics = (report) => {
  if (!report) {
    return { totalWords: 0, generatedWords: 0, savedWords: 0, inputWords: 0 };
  }

  // Check if we have stored metrics from the database
  if (
    typeof report.total_words === "number" &&
    typeof report.generated_words === "number" &&
    typeof report.saved_words === "number" &&
    report.total_words > 0 // Ensure they're not just default zeros
  ) {
    return {
      totalWords: report.total_words,
      generatedWords: report.generated_words,
      savedWords: report.saved_words,
      inputWords: countWords(report.input_text), // Still calculate for display
    };
  }

  // Fallback to calculating if stored values are not available
  const inputWords = countWords(report.input_text);
  const totalWords = countWords(report.report_text);
  const templateWords = countWords(report.template_text);

  // Generated words calculation:
  // If there's a template, generated words = total words - input words
  // If no template, generated words = total words - input words (AI expanded the input)
  const generatedWords = Math.max(0, totalWords - inputWords);

  // Saved words calculation:
  // This represents the words that the radiologist didn't have to write manually
  // In most cases, this equals the generated words
  // If a template was used, it could be considered as the template words + AI additions
  const savedWords =
    templateWords > 0
      ? Math.max(generatedWords, templateWords) // Use the larger value when template is involved
      : generatedWords; // Without template, saved words = generated words

  return {
    totalWords,
    generatedWords,
    savedWords,
    inputWords,
  };
};

/**
 * Format word count for display
 * @param {number} count - Word count number
 * @returns {string} - Formatted word count string
 */
export const formatWordCount = (count) => {
  if (count === 0) return "0";
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
};

/**
 * Calculate efficiency percentage (saved words / total words * 100)
 * @param {number} savedWords - Number of saved words
 * @param {number} totalWords - Total words in report
 * @returns {number} - Efficiency percentage (0-100)
 */
export const calculateEfficiency = (savedWords, totalWords) => {
  if (totalWords === 0) return 0;
  return Math.round((savedWords / totalWords) * 100);
};
