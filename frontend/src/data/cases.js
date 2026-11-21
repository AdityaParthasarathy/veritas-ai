import recorded from './recorded-results.json'
import { EXAMPLES } from './examples'

// Why each invented case is in the Casebook. The inputs are in examples.js (fabricated, labelled as such).
// The recorded outputs are real responses from the live analysis pipeline (see recorded-results.json).
const WHY = {
  '01-normal-news': 'Sober, in-domain reporting with matching reference passages. It shows the report when everything lines up, and that even then the system has not checked the claims.',
  '02-misleading-sensational': 'A false claim in an urgent, all-caps style. The classifier reads the style strongly. Lexical retrieval finds no passage above its cut-off here, because the text and the passages use different words, which shows what shared-vocabulary matching can miss. Neither reading judges the claim.',
  '03-misleading-sober': 'A false claim written like ordinary news. The classifier resembles-reliable reading is the point: a style classifier cannot see falsehood.',
  '04-out-of-domain': 'Not news at all. It shows the domain check, and why a style label the model still produces is presented as meaningless.',
  '05-insufficient-evidence': 'Plausible local news with nothing related in the reference collection. The passages shown share only a few words with it and fall below the cut-off. An empty evidence result is not a failed analysis; it reflects a small collection.',
  '06-short-headline': 'One headline, far shorter than the articles the classifier was trained on. Caution rises to very high.',
}

export const RECORDED_ON = recorded.recorded_on

export const CASES = EXAMPLES.map((example) => ({ ...example, why: WHY[example.id], recorded: recorded.results[example.id] ?? null }))

export const getCase = (id) => CASES.find((c) => c.id === id)
