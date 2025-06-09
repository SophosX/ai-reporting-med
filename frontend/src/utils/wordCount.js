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
 * Calculate comprehensive word count metrics for a report following the new specification
 * @param {Object} report - Report object with all word count fields
 * @returns {Object} - Object containing all word count metrics
 */
export const calculateWordMetrics = (report) => {
  if (!report) {
    return {
      inputWords: 0,
      aiGeneratedWords: 0,
      finalWords: 0,
      savedWords: 0,
      savedWordsInitial: 0,
      editDelta: 0,
      efficiency: 0,
    };
  }

  // Use stored database values if available, otherwise calculate
  const inputWords = report.input_words ?? countWords(report.input_text);
  const aiGeneratedWords = report.generated_words ?? 0;
  const finalWords = report.total_words ?? countWords(report.report_text);
  const savedWords = report.saved_words ?? Math.max(0, finalWords - inputWords);

  // Calculate additional metrics
  const savedWordsInitial = Math.max(0, aiGeneratedWords - inputWords); // AI - Input
  const editDelta = finalWords - aiGeneratedWords; // Final - AI (positive = added, negative = removed)
  // Don't calculate efficiency percentage as it can be misleading with short inputs
  const efficiency = 0;

  return {
    inputWords,
    aiGeneratedWords,
    finalWords,
    savedWords,
    savedWordsInitial,
    editDelta,
    efficiency,
  };
};

/**
 * Get user-friendly descriptions for the word count metrics
 * @param {Object} metrics - Metrics object from calculateWordMetrics
 * @returns {Object} - Object with user-friendly descriptions
 */
export const getWordCountDescriptions = (metrics) => {
  const editDescription =
    metrics.editDelta === 0
      ? "No edits made"
      : metrics.editDelta > 0
      ? `Added ${metrics.editDelta} words`
      : `Removed ${Math.abs(metrics.editDelta)} words`;

  return {
    savedWordsText: `You saved ${metrics.savedWords} words in this report`,
    editDeltaText: `You ${editDescription.toLowerCase()} from the AI output`,
    efficiencyText: `${metrics.efficiency}% efficiency vs manual typing`,
    initialSavingsText: `AI initially saved you ${metrics.savedWordsInitial} words`,
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
 * Calculate efficiency percentage (saved words / input words * 100)
 * @param {number} savedWords - Number of saved words
 * @param {number} inputWords - Input words from radiologist
 * @returns {number} - Efficiency percentage (0-100)
 */
export const calculateEfficiency = (savedWords, inputWords) => {
  if (inputWords === 0) return 0;
  return Math.round((savedWords / inputWords) * 100);
};

/**
 * Get efficiency color based on percentage
 * @param {number} efficiency - Efficiency percentage
 * @returns {string} - CSS color class
 */
export const getEfficiencyColor = (efficiency) => {
  if (efficiency >= 80) return "text-green-400";
  if (efficiency >= 60) return "text-yellow-400";
  if (efficiency >= 40) return "text-orange-400";
  return "text-red-400";
};

/**
 * Calculate aggregate statistics from multiple reports
 * @param {Array} reports - Array of report objects
 * @returns {Object} - Aggregate statistics
 */
export const calculateAggregateStats = (reports) => {
  if (!reports || reports.length === 0) {
    return {
      totalReports: 0,
      totalInputWords: 0,
      totalAiGeneratedWords: 0,
      totalFinalWords: 0,
      totalSavedWords: 0,
      totalSavedWordsInitial: 0,
      totalEditDelta: 0,
      averageInputWords: 0,
      averageSavedWords: 0,
      overallEfficiency: 0,
    };
  }

  const totals = reports.reduce(
    (acc, report) => {
      const metrics = calculateWordMetrics(report);
      acc.totalInputWords += metrics.inputWords;
      acc.totalAiGeneratedWords += metrics.aiGeneratedWords;
      acc.totalFinalWords += metrics.finalWords;
      acc.totalSavedWords += metrics.savedWords;
      acc.totalSavedWordsInitial += metrics.savedWordsInitial;
      acc.totalEditDelta += metrics.editDelta;
      return acc;
    },
    {
      totalInputWords: 0,
      totalAiGeneratedWords: 0,
      totalFinalWords: 0,
      totalSavedWords: 0,
      totalSavedWordsInitial: 0,
      totalEditDelta: 0,
    }
  );

  const reportCount = reports.length;
  const averageInputWords = Math.round(totals.totalInputWords / reportCount);
  const averageSavedWords = Math.round(totals.totalSavedWords / reportCount);

  return {
    totalReports: reportCount,
    ...totals,
    averageInputWords,
    averageSavedWords,
  };
};
