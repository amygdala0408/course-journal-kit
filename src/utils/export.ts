// Export utilities for Markdown and PDF

import type {
  JournalEntry,
  CoursePack,
  FurtherExplorationArea,
  FinalSynthesis,
  PublishedJournal,
} from '../schemas/types';

// ============================================
// MARKDOWN EXPORT
// ============================================

export function entryToMarkdown(entry: JournalEntry, coursePack?: CoursePack): string {
  const section = coursePack?.sections.find((s) => s.id === entry.sectionId);
  const sectionLabel = coursePack?.sectionLabel || 'Section';

  let md = `# ${entry.title}\n\n`;
  md += `**${sectionLabel}:** ${section?.title || entry.sectionId}\n`;
  md += `**Date:** ${new Date(entry.createdAt).toLocaleDateString()}\n`;

  if (entry.tags.length > 0) {
    md += `**Tags:** ${entry.tags.join(', ')}\n`;
  }

  if (entry.confidenceRating) {
    md += `**Confidence:** ${entry.confidenceRating}/5\n`;
  }

  md += '\n---\n\n';

  if (entry.notes) {
    md += `## Notes\n\n${entry.notes}\n\n`;
  }

  if (entry.summary) {
    md += `## Summary\n\n${entry.summary}\n\n`;
  }

  if (entry.keyConcepts) {
    md += `## Key Concepts\n\n${entry.keyConcepts}\n\n`;
  }

  if (entry.reflection) {
    md += `## Reflection\n\n${entry.reflection}\n\n`;
  }

  if (entry.personalConnection) {
    md += `## Personal Connection\n\n${entry.personalConnection}\n\n`;
  }

  if (entry.professionalApplication) {
    md += `## Professional Application\n\n${entry.professionalApplication}\n\n`;
  }

  if (entry.questions) {
    md += `## Questions\n\n${entry.questions}\n\n`;
  }

  if (entry.ethicalEquityConsiderations) {
    md += `## Ethical & Equity Considerations\n\n${entry.ethicalEquityConsiderations}\n\n`;
  }

  if (entry.keyTakeaways) {
    md += `## Key Takeaways\n\n${entry.keyTakeaways}\n\n`;
  }

  if (entry.resources.length > 0) {
    md += `## Resources\n\n`;
    entry.resources.forEach((r) => {
      md += `- **${r.title}** (${r.type})`;
      if (r.url) md += ` - [Link](${r.url})`;
      if (r.citation) md += `\n  - Citation: ${r.citation}`;
      if (r.notes) md += `\n  - Notes: ${r.notes}`;
      md += '\n';
    });
    md += '\n';
  }

  if (entry.selectedLenses.length > 0) {
    md += `## Reflection Lenses Used\n\n`;
    entry.selectedLenses.forEach((lens) => {
      md += `- ${lens}\n`;
    });
    md += '\n';
  }

  if (entry.aiUseDisclosure) {
    md += `## AI Use Disclosure\n\n${entry.aiUseDisclosure}\n\n`;
  }

  return md;
}

export function journalToMarkdown(
  coursePack: CoursePack,
  entries: JournalEntry[],
  furtherExploration: FurtherExplorationArea[],
  synthesis?: FinalSynthesis,
  studentName?: string
): string {
  let md = `# ${coursePack.title} - Reflection Journal\n\n`;

  if (studentName) {
    md += `**Student:** ${studentName}\n`;
  }

  if (coursePack.code) {
    md += `**Course Code:** ${coursePack.code}\n`;
  }

  if (coursePack.term) {
    md += `**Term:** ${coursePack.term}\n`;
  }

  md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
  md += '---\n\n';

  // Table of Contents
  md += `## Table of Contents\n\n`;
  coursePack.sections.forEach((section) => {
    const sectionEntries = entries.filter((e) => e.sectionId === section.id);
    md += `- **${coursePack.sectionLabel} ${section.number}: ${section.title}** (${sectionEntries.length} entries)\n`;
  });

  if (furtherExploration.length > 0) {
    md += `- **Further Exploration Areas** (${furtherExploration.length})\n`;
  }

  if (synthesis) {
    md += `- **Final Synthesis**\n`;
  }

  md += '\n---\n\n';

  // Entries by section
  coursePack.sections.forEach((section) => {
    const sectionEntries = entries.filter((e) => e.sectionId === section.id);

    md += `# ${coursePack.sectionLabel} ${section.number}: ${section.title}\n\n`;

    if (section.description) {
      md += `*${section.description}*\n\n`;
    }

    if (sectionEntries.length === 0) {
      md += `*No entries for this ${coursePack.sectionLabel.toLowerCase()}.*\n\n`;
    } else {
      sectionEntries.forEach((entry) => {
        md += entryToMarkdown(entry, coursePack);
        md += '---\n\n';
      });
    }
  });

  // Further Exploration
  if (furtherExploration.length > 0) {
    md += `# Further Exploration Areas\n\n`;
    furtherExploration.forEach((area) => {
      md += `## ${area.title}\n\n`;
      md += `${area.description}\n\n`;

      if (area.notes) {
        md += `**Notes:** ${area.notes}\n\n`;
      }

      if (area.resources.length > 0) {
        md += `**Resources:**\n`;
        area.resources.forEach((r) => {
          md += `- ${r.title}`;
          if (r.url) md += ` - [Link](${r.url})`;
          md += '\n';
        });
        md += '\n';
      }
    });
    md += '---\n\n';
  }

  // Final Synthesis
  if (synthesis) {
    md += `# Final Synthesis\n\n`;
    md += `## ${synthesis.title}\n\n`;

    if (synthesis.introduction) {
      md += `### Introduction\n\n${synthesis.introduction}\n\n`;
    }

    synthesis.themeNotes.forEach((theme) => {
      md += `### ${theme.title}\n\n${theme.notes}\n\n`;
    });

    if (synthesis.conclusion) {
      md += `### Conclusion\n\n${synthesis.conclusion}\n\n`;
    }
  }

  return md;
}

export function publishedJournalToMarkdown(
  journal: PublishedJournal,
  coursePack: CoursePack
): string {
  return journalToMarkdown(
    coursePack,
    journal.entries,
    journal.furtherExplorationAreas,
    journal.finalSynthesis,
    journal.studentName
  );
}

// ============================================
// DOWNLOAD HELPERS
// ============================================

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// PDF export will use browser print functionality
export function printToPDF(): void {
  window.print();
}
