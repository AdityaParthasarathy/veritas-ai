import { ChevronRight } from 'lucide-react'

/**
 * Plain-language definitions of the terms a report uses, collapsed by default. Every definition restates what the
 * implementation measures and what it does not; the relevance threshold comes from the result itself.
 */
export default function Glossary({ evidence }) {
  const threshold = evidence?.relevance_threshold
  const terms = [
    ['Model probability', 'The classifier’s output: how strongly the wording matches patterns in training articles from sources labelled unreliable. It is not the probability that the text is false, and a low value does not mean it is true.'],
    ['Resembles reliable / unreliable sources', 'The training labels describe the source an article came from, not a fact-check of the article. The reading says which group the writing style resembles.'],
    ['Similarity score', `Closeness in meaning between a sentence of the text and a reference passage, from 0 to 1 (cosine similarity of sentence embeddings).${threshold != null ? ` Passages scoring ${threshold.toFixed(2)} or higher are called related.` : ''} It shows topical overlap only. It does not show support or contradiction.`],
    ['Related passage', 'A reference passage on the same subject. The system does not judge whether it agrees with the text. No related passage means the small collection does not cover the topic.'],
    ['Outside the training domain', 'The text uses very different vocabulary from the training articles (mostly US political news from 2016–2017), or is too short to compare. The style label is then not meaningful.'],
    ['Caution level', 'How far to trust this analysis: moderate, high or very high. Short text, text outside the domain, an undecided model, a page that is not an article, or missing related passages each raise it. It is never “low”, and a confident model never lowers it.'],
  ]
  return (
    <details className="panel group p-5 sm:p-6">
      <summary className="flex cursor-pointer items-center gap-2 text-[0.9375rem] font-semibold text-paper">
        <ChevronRight className="h-4 w-4 text-violet transition-transform duration-fast group-open:rotate-90" aria-hidden="true" />
        Terms used in this report
      </summary>
      <dl className="mt-4 grid gap-x-12 gap-y-4 text-sm lg:grid-cols-2">
        {terms.map(([term, definition]) => (
          <div key={term}>
            <dt className="font-medium text-paper">{term}</dt>
            <dd className="t-body mt-1 text-[0.875rem]">{definition}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
